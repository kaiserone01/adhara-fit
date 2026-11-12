// AC-S00-019: requiere PostgreSQL (servicio del CI) y el paquete pg; se omite si no están.
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearBaseEfimera } from "./base-efimera.mjs";

let pg = null;
try { ({ default: pg } = await import("pg")); } catch { /* sin pg */ }
const sinEntorno = !pg || !process.env.DATABASE_URL;

test("dos ejecuciones simultáneas no se ven entre sí y se destruyen", { skip: sinEntorno && "requiere pg y DATABASE_URL" }, async () => {
  const [a, b] = await Promise.all([crearBaseEfimera(), crearBaseEfimera()]);
  const abrir = async (url) => { const c = new pg.Client({ connectionString: url }); await c.connect(); return c; };
  const [ca, cb] = [await abrir(a.url), await abrir(b.url)];
  await ca.query("CREATE TABLE t (v int)"); await ca.query("INSERT INTO t VALUES (1)");
  await cb.query("CREATE TABLE t (v int)"); await cb.query("INSERT INTO t VALUES (2)");
  assert.deepEqual((await ca.query("SELECT v FROM t")).rows, [{ v: 1 }]);
  assert.deepEqual((await cb.query("SELECT v FROM t")).rows, [{ v: 2 }]);
  await ca.end(); await cb.end();
  await Promise.all([a.destruir(), b.destruir()]);
  const admin = new pg.Client({ connectionString: process.env.DATABASE_URL }); await admin.connect();
  const { rows } = await admin.query("SELECT datname FROM pg_database WHERE datname = ANY($1)", [[a.nombre, b.nombre]]);
  await admin.end();
  assert.deepEqual(rows, []);
});
