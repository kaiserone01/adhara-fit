#!/usr/bin/env node
// Alta PROVISIONAL del primer administrador (adelanto de S-15, SUP-S15-003 y SUP-S15-004).
// Escribe con SQL (paquete `pg`) sobre el esquema actual de Prisma: Organizacion, Sucursal y UsuarioAdmin con rol SOCIO.
// Vive en tools/ porque la lista cerrada de S-00 no admite archivos nuevos en packages/db. Lo reemplaza `db:sembrar`
// de S-15. Uso: DATABASE_URL, ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_CONTRASENA_INICIAL (opcional) en el entorno.
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

const SALT_ROUNDS = 10; // igual que packages/infrastructure/auth/BcryptPasswordHasher.ts
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

const limpia = (v) => (v?.trim() ? v.trim() : undefined);

export function leerVariablesAdmin(env) {
  const nombre = limpia(env.ADMIN_NOMBRE);
  if (!nombre) throw new Error("Falta ADMIN_NOMBRE: se necesita el nombre del primer administrador.");
  const correo = limpia(env.ADMIN_CORREO)?.toLowerCase();
  if (!correo) throw new Error("Falta ADMIN_CORREO: se necesita el correo del primer administrador.");
  if (correo.length > 254 || !CORREO.test(correo)) {
    throw new Error("ADMIN_CORREO no tiene la forma usuario@dominio.tld o supera 254 caracteres.");
  }
  // La contraseña no se recorta: los espacios cuentan. Vacía equivale a ausente.
  const contrasena = env.ADMIN_CONTRASENA_INICIAL ? env.ADMIN_CONTRASENA_INICIAL : undefined;
  if (contrasena !== undefined && (contrasena.length < 8 || contrasena.length > 128)) {
    throw new Error("ADMIN_CONTRASENA_INICIAL debe tener entre 8 y 128 caracteres.");
  }
  return { nombre, correo, contrasena };
}

export function generarContrasena() {
  let salida = "";
  for (const b of randomBytes(20)) salida += ALFABETO[b % ALFABETO.length];
  return salida;
}

/** `cliente.transaccion(fn)` entrega un `tx` con las seis operaciones que usa el alta. */
export async function asegurarAdministrador(cliente, env) {
  return cliente.transaccion(async (tx) => {
    if ((await tx.contarAdministradores()) > 0) return { creado: false };

    const { nombre, correo, contrasena } = leerVariablesAdmin(env);
    const contrasenaGenerada = contrasena ? undefined : generarContrasena();
    const passwordHash = await bcrypt.hash(contrasena ?? contrasenaGenerada, SALT_ROUNDS);

    const organizacion = (await tx.primeraOrganizacion()) ?? (await tx.crearOrganizacion({ nombre: "Adhara Fit", slug: "adhara-fit" }));
    const sucursal = (await tx.primeraSucursal()) ?? (await tx.crearSucursal({ nombre: "Local", organizacionId: organizacion.id }));
    await tx.crearAdministrador({ nombre, email: correo, passwordHash, rol: "SOCIO", organizacionId: organizacion.id, sucursalId: sucursal.id });
    return contrasenaGenerada ? { creado: true, contrasenaGenerada } : { creado: true };
  });
}

/** Adaptador: un `Pool` de pg (solo se usa `connect`) → cliente con transacción y SQL sobre las tablas de Prisma. */
export function clientePg(pool) {
  return {
    async transaccion(fn) {
      const c = await pool.connect();
      const uno = async (sql, valores) => (await c.query(sql, valores)).rows[0] ?? null;
      const tx = {
        contarAdministradores: async () => Number((await uno('SELECT count(*) AS n FROM "UsuarioAdmin"')).n),
        primeraOrganizacion: () => uno('SELECT id FROM "Organizacion" ORDER BY "createdAt" LIMIT 1'),
        crearOrganizacion: (d) => uno('INSERT INTO "Organizacion" (id, nombre, slug) VALUES ($1, $2, $3) RETURNING id', [randomUUID(), d.nombre, d.slug]),
        primeraSucursal: () => uno('SELECT id FROM "Sucursal" ORDER BY "createdAt" LIMIT 1'),
        crearSucursal: (d) => uno('INSERT INTO "Sucursal" (id, "organizacionId", nombre, "apiKey") VALUES ($1, $2, $3, $4) RETURNING id', [randomUUID(), d.organizacionId, d.nombre, randomUUID()]),
        crearAdministrador: (d) =>
          uno(
            'INSERT INTO "UsuarioAdmin" (id, "organizacionId", "sucursalId", nombre, rol, email, "passwordHash") VALUES ($1, $2, $3, $4, $5::"RolUsuario", $6, $7) RETURNING id',
            [randomUUID(), d.organizacionId, d.sucursalId, d.nombre, d.rol, d.email, d.passwordHash]
          ),
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
    console.error("crear-administrador: falta DATABASE_URL.");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  try {
    const r = await asegurarAdministrador(clientePg(pool), {
      ADMIN_NOMBRE: process.env.ADMIN_NOMBRE,
      ADMIN_CORREO: process.env.ADMIN_CORREO,
      ADMIN_CONTRASENA_INICIAL: process.env.ADMIN_CONTRASENA_INICIAL,
    });
    if (!r.creado) console.log("crear-administrador: ya existe un administrador; no se cambió nada.");
    else if (r.contrasenaGenerada) console.log(`crear-administrador: administrador creado. Contraseña inicial (se muestra una sola vez): ${r.contrasenaGenerada}`);
    else console.log("crear-administrador: administrador creado con la contraseña de ADMIN_CONTRASENA_INICIAL.");
  } catch (e) {
    console.error(`crear-administrador: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
