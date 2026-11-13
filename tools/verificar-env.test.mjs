import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { verificarEnv } from "./verificar-env.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "verificar-env.mjs");

function caso(codigo, envExample) {
  const raiz = mkdtempSync(join(tmpdir(), "verificar-env-"));
  mkdirSync(join(raiz, "apps/a"), { recursive: true });
  writeFileSync(join(raiz, "apps/a/index.ts"), codigo);
  writeFileSync(join(raiz, ".env.example"), envExample);
  return raiz;
}
const con = (codigo, env, fn) => { const r = caso(codigo, env); try { fn(r); } finally { rmSync(r, { recursive: true, force: true }); } };

test("variable ausente en notación de punto (BEH-S00-005)", () =>
  con("const a = process.env.NUEVA;\nconst b = process.env.DATABASE_URL;", "DATABASE_URL=\n", (r) => {
    const e = verificarEnv(r);
    assert.equal(e.length, 1);
    assert.match(e[0], /NUEVA/);
  }));

test("lee las variables de tools/crear-administrador.mjs (alta provisional del administrador)", () =>
  con("const a = process.env.DATABASE_URL;", "DATABASE_URL=\nADMIN_CORREO=\n", (r) => {
    mkdirSync(join(r, "tools"), { recursive: true });
    writeFileSync(join(r, "tools/crear-administrador.mjs"), "const c = process.env.ADMIN_CORREO;");
    writeFileSync(join(r, "tools/otra-herramienta.mjs"), "const x = process.env.SOLO_DE_TOOLS;");
    assert.deepEqual(verificarEnv(r), []);
  }));

test("variable ausente en notación de corchetes", () =>
  con('const a = process.env["OTRA"]; const b = process.env[\'DATABASE_URL\'];', "DATABASE_URL=\n", (r) => {
    assert.match(verificarEnv(r).join("\n"), /OTRA/);
  }));

test("consistente, con variables en Solo Compose", () =>
  con("const a = process.env.DATABASE_URL;", "DATABASE_URL=\n\n# --- Solo Compose (solo local) ---\nPOSTGRES_PASSWORD=adhara_local\n", (r) => {
    assert.deepEqual(verificarEnv(r), []);
  }));

test("las variables de Solo Compose no se exigen al código", () =>
  con("const a = 1;", "# Solo Compose (solo local)\nPOSTGRES_DB=adhara\n", (r) => assert.deepEqual(verificarEnv(r), [])));

test("valor no marcado como solo local", () =>
  con("const a = process.env.DATABASE_URL;", "DATABASE_URL=\n# Solo Compose\nPOSTGRES_PASSWORD=algo\n", (r) => {
    assert.match(verificarEnv(r).join("\n"), /POSTGRES_PASSWORD/);
  }));

test("valor de secreto fuera de Solo Compose", () =>
  con("const a = process.env.KIOSCO_CLAVE;", "KIOSCO_CLAVE=abc123\n", (r) => {
    assert.match(verificarEnv(r).join("\n"), /KIOSCO_CLAVE/);
  }));

test("variable de .env.example que nadie lee", () =>
  con("const a = 1;", "SOBRA=\n", (r) => assert.match(verificarEnv(r).join("\n"), /SOBRA/)));

test("el comando termina con código 1 y 0", () => {
  const malo = caso("process.env.NUEVA", "");
  const bueno = caso("process.env.NODE_ENV", "NODE_ENV=production\n");
  try {
    assert.equal(spawnSync("node", [SCRIPT, malo]).status, 1);
    assert.equal(spawnSync("node", [SCRIPT, bueno]).status, 0);
  } finally {
    rmSync(malo, { recursive: true, force: true });
    rmSync(bueno, { recursive: true, force: true });
  }
});
