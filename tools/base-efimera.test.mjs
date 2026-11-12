import { test } from "node:test";
import assert from "node:assert/strict";
import { PREFIJO_BASE, crearBaseEfimera, ErrorBaseEfimera, validarDatabaseUrl } from "./base-efimera.mjs";

function clienteSimulado(registro) {
  return async (cadena) => ({
    async connect() { registro.push(["connect", cadena]); },
    async query(sql) { registro.push(["query", sql]); },
    async end() { registro.push(["end"]); },
  });
}

test("aborta antes de conectar con DATABASE_URL ausente, vacía o ajena (AC-S00-012, BEH-S00-008, BEH-S00-018)", async () => {
  for (const [valor, codigo] of [[undefined, "AUSENTE"], ["", "VACIA"], ["postgresql://u:p@db.ejemplo.com:5432/x", "HOST_NO_LOCAL"], ["no es url", "INVALIDA"]]) {
    const registro = [];
    await assert.rejects(
      crearBaseEfimera({ databaseUrl: valor, crearCliente: clienteSimulado(registro) }),
      (e) => e instanceof ErrorBaseEfimera && e.codigo === codigo,
    );
    assert.deepEqual(registro, [], `no debe abrir conexión (${codigo})`);
  }
});

test("acepta localhost, 127.0.0.1 y postgres", () => {
  for (const h of ["localhost", "127.0.0.1", "postgres"]) assert.equal(validarDatabaseUrl(`postgresql://u:p@${h}:5432/x`).hostname, h);
});

test("crea una base con prefijo, apunta la URL a ella y la destruye", async () => {
  const registro = [];
  const b = await crearBaseEfimera({ databaseUrl: "postgresql://u:p@localhost:5432/postgres", crearCliente: clienteSimulado(registro) });
  assert.ok(b.nombre.startsWith(PREFIJO_BASE));
  assert.ok(b.url.endsWith(`/${b.nombre}`));
  assert.ok(registro.some(([t, s]) => t === "query" && s.startsWith("CREATE DATABASE")));
  await b.destruir();
  await b.destruir(); // idempotente
  assert.equal(registro.filter(([t, s]) => t === "query" && s.startsWith("DROP DATABASE")).length, 1);
});

test("dos ejecuciones usan nombres distintos (BEH-S00-015)", async () => {
  const url = "postgresql://u:p@localhost:5432/postgres";
  const [a, b] = await Promise.all([crearBaseEfimera({ databaseUrl: url, crearCliente: clienteSimulado([]) }), crearBaseEfimera({ databaseUrl: url, crearCliente: clienteSimulado([]) })]);
  assert.notEqual(a.nombre, b.nombre);
});
