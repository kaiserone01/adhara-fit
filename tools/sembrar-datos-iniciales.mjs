#!/usr/bin/env node
// Datos iniciales PROVISIONALES (adelanto de db:sembrar de S-15, sin Drizzle): planes de 1, 2 y 3 meses, métodos de
// pago y entrenadores del gimnasio. Cada bloque se crea solo si su tabla está vacía y nunca modifica ni borra filas
// existentes, así que es seguro ejecutarlo en cada arranque. Valores por defecto «asumidos, por validar»: el
// propietario los edita desde el panel. Uso: DATABASE_URL en el entorno.
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import pg from "pg";

export const PLANES_INICIALES = [
  { nombre: "1 mes", diasCiclo: 30, precio: "120.00" },
  { nombre: "2 meses", diasCiclo: 60, precio: "200.00" },
  { nombre: "3 meses", diasCiclo: 90, precio: "280.00" },
];

export const METODOS_INICIALES = [
  { tipo: "BILLETERA_DIGITAL", nombreBanco: "Yape", orden: 1 },
  { tipo: "TRANSFERENCIA", nombreBanco: "BCP", orden: 2 },
  { tipo: "EFECTIVO", nombreBanco: null, orden: 3 },
];

export const ENTRENADORES_INICIALES = ["María Aguilera", "José Montesino", "Joa Bonillo", "Jesús Bonillo"];

/** `cliente.transaccion(fn)` entrega un `tx` con las operaciones que usa la siembra. */
export async function sembrarDatosIniciales(cliente) {
  return cliente.transaccion(async (tx) => {
    const organizacion = await tx.primeraOrganizacion();
    if (!organizacion) return { omitido: "no hay organización (primero se crea el administrador inicial)" };

    const resumen = { planes: 0, metodosPago: 0, entrenadores: 0 };

    if ((await tx.contar("Plan")) === 0) {
      for (const p of PLANES_INICIALES) await tx.crearPlan({ organizacionId: organizacion.id, ...p });
      resumen.planes = PLANES_INICIALES.length;
    }
    if ((await tx.contar("MetodoPago")) === 0) {
      for (const m of METODOS_INICIALES) await tx.crearMetodoPago({ organizacionId: organizacion.id, ...m });
      resumen.metodosPago = METODOS_INICIALES.length;
    }
    if ((await tx.contar("Entrenador")) === 0) {
      for (const nombre of ENTRENADORES_INICIALES) await tx.crearEntrenador({ nombre });
      resumen.entrenadores = ENTRENADORES_INICIALES.length;
    }
    return resumen;
  });
}

const TABLAS = new Set(["Plan", "MetodoPago", "Entrenador"]);

/** Adaptador: un `Pool` de pg → cliente con transacción y SQL sobre las tablas de Prisma. */
export function clientePg(pool) {
  return {
    async transaccion(fn) {
      const c = await pool.connect();
      const uno = async (sql, valores) => (await c.query(sql, valores)).rows[0] ?? null;
      const tx = {
        primeraOrganizacion: () => uno('SELECT id FROM "Organizacion" ORDER BY "createdAt" LIMIT 1'),
        contar: async (tabla) => {
          if (!TABLAS.has(tabla)) throw new Error(`Tabla no permitida: ${tabla}`);
          return Number((await uno(`SELECT count(*) AS n FROM "${tabla}"`)).n);
        },
        crearPlan: (d) =>
          uno('INSERT INTO "Plan" (id, "organizacionId", nombre, "diasCiclo", "precioUSD", activo) VALUES ($1, $2, $3, $4, $5, true)', [
            randomUUID(),
            d.organizacionId,
            d.nombre,
            d.diasCiclo,
            d.precio,
          ]),
        crearMetodoPago: (d) =>
          uno(
            'INSERT INTO "MetodoPago" (id, "organizacionId", tipo, "nombreBanco", orden, activo) VALUES ($1, $2, $3::"TipoMetodoPago", $4, $5, true)',
            [randomUUID(), d.organizacionId, d.tipo, d.nombreBanco, d.orden]
          ),
        crearEntrenador: (d) =>
          uno('INSERT INTO "Entrenador" (id, nombre, activo, "updatedAt") VALUES ($1, $2, true, now())', [randomUUID(), d.nombre]),
      };
      try {
        await c.query("BEGIN");
        const r = await fn(tx);
        await c.query("COMMIT");
        return r;
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("sembrar-datos-iniciales: falta DATABASE_URL.");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  try {
    const r = await sembrarDatosIniciales(clientePg(pool));
    if (r.omitido) console.log(`sembrar-datos-iniciales: omitido, ${r.omitido}.`);
    else console.log(`sembrar-datos-iniciales: planes creados ${r.planes}, métodos de pago ${r.metodosPago}, entrenadores ${r.entrenadores}.`);
  } catch (e) {
    console.error(`sembrar-datos-iniciales: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
