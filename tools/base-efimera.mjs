// Helper de pruebas de integración (S-00, REQ-S00-014 y REQ-S00-019, ADR-016):
// crea una base PostgreSQL de nombre único "adhara_test_*" y la destruye al terminar.
import { randomBytes } from "node:crypto";

export const PREFIJO_BASE = "adhara_test_";
const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "postgres"]);

export class ErrorBaseEfimera extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = "ErrorBaseEfimera";
    this.codigo = codigo;
  }
}

/** Valida DATABASE_URL antes de abrir cualquier conexión. Devuelve la URL ya analizada. */
export function validarDatabaseUrl(valor) {
  if (valor === undefined || valor === null) throw new ErrorBaseEfimera("AUSENTE", "DATABASE_URL está ausente: las pruebas de integración necesitan una base local");
  if (String(valor).trim() === "") throw new ErrorBaseEfimera("VACIA", "DATABASE_URL está vacía: las pruebas de integración necesitan una base local");
  let url;
  try { url = new URL(valor); } catch { throw new ErrorBaseEfimera("INVALIDA", "DATABASE_URL no es una URL válida"); }
  if (!HOSTS_LOCALES.has(url.hostname)) {
    throw new ErrorBaseEfimera("HOST_NO_LOCAL", `El host "${url.hostname}" no es localhost, 127.0.0.1 ni postgres: se aborta antes de conectar`);
  }
  return url;
}

export function nombreUnico() {
  return `${PREFIJO_BASE}${process.pid}_${randomBytes(6).toString("hex")}`;
}

async function clientePorDefecto(cadena) {
  const { default: pg } = await import("pg");
  return new pg.Client({ connectionString: cadena });
}

/**
 * Crea una base efímera. `crearCliente(cadena)` permite inyectar un cliente simulado en pruebas.
 * Devuelve { nombre, url, destruir }.
 */
export async function crearBaseEfimera({ databaseUrl = process.env.DATABASE_URL, crearCliente = clientePorDefecto } = {}) {
  const base = validarDatabaseUrl(databaseUrl);
  const nombre = nombreUnico();
  const admin = await crearCliente(base.toString());
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${nombre}"`);
  } finally {
    await admin.end();
  }
  const destino = new URL(base.toString());
  destino.pathname = `/${nombre}`;
  let destruida = false;
  return {
    nombre,
    url: destino.toString(),
    async destruir() {
      if (destruida) return;
      if (!nombre.startsWith(PREFIJO_BASE)) throw new ErrorBaseEfimera("NOMBRE", `Se niega a borrar "${nombre}": no empieza por ${PREFIJO_BASE}`);
      const c = await crearCliente(base.toString());
      await c.connect();
      try {
        await c.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`);
        destruida = true;
      } finally {
        await c.end();
      }
    },
  };
}
