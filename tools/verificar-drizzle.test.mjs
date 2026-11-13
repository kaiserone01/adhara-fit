import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  soloComentarios, verificarCadenaPrisma, verificarDominio, verificarDrizzle, verificarGuardaDrizzleKit, verificarLockfile, verificarSqlRaw, verificarVersiones,
} from "./verificar-drizzle.mjs";
import { verificarPackagesDbDrizzle } from "./verificar-repo.mjs";

const escribir = (raiz, ruta, c = "x") => { mkdirSync(dirname(join(raiz, ruta)), { recursive: true }); writeFileSync(join(raiz, ruta), c); };
const con = (fn) => { const r = mkdtempSync(join(tmpdir(), "verificar-drizzle-")); try { fn(r); } finally { rmSync(r, { recursive: true, force: true }); } };
const GUARDIA = join(dirname(fileURLToPath(import.meta.url)), "guardia-db-local.mjs");

test("sql.raw se detecta con archivo y línea (REQ-S22-014)", () => con((r) => {
  escribir(r, "apps/a/x.ts", "const a = 1;\nsql.raw('x');\n");
  escribir(r, "apps/a/y.ts", "const sqlraw = 1;");
  assert.deepEqual(verificarSqlRaw(r), ["sql.raw en apps/a/x.ts:2"]);
}));

test("la cadena prisma se detecta sin distinguir mayúsculas y respeta exclusiones (REQ-S22-015)", () => con((r) => {
  escribir(r, "apps/a/node_modules/p/x.js", "prisma");
  escribir(r, "packages/db/tsconfig.tsbuildinfo", "prisma");
  assert.deepEqual(verificarCadenaPrisma(r), []);
  escribir(r, "Dockerfile", "RUN npx PrismA generate");
  escribir(r, ".github/workflows/ci.yml", "run: prisma");
  const e = verificarCadenaPrisma(r);
  assert.equal(e.length, 2);
  assert.ok(e.some((x) => x.includes("Dockerfile:1")));
}));

test("lockfile: prisma solo en peerDependencies no cuenta; la entrada node_modules/prisma sí (AC de REQ-S22-027)", () => con((r) => {
  escribir(r, "package-lock.json", JSON.stringify({ packages: { "": {}, "node_modules/drizzle-orm": { peerDependencies: { prisma: "*" }, peerDependenciesMeta: { prisma: { optional: true } } } } }));
  assert.deepEqual(verificarLockfile(r), []);
  escribir(r, "package-lock.json", JSON.stringify({ packages: { "node_modules/prisma": {}, "node_modules/@prisma/client": {} } }));
  assert.equal(verificarLockfile(r).length, 2);
}));

test("versiones fijadas exactas (REQ-S22-021)", () => con((r) => {
  escribir(r, "packages/db/package.json", JSON.stringify({ dependencies: { "drizzle-orm": "0.45.4", pg: "8.23.0" }, devDependencies: { "drizzle-kit": "0.31.11" } }));
  assert.deepEqual(verificarVersiones(r), []);
  escribir(r, "packages/db/package.json", JSON.stringify({ dependencies: { "drizzle-orm": "^0.45.4", pg: "~8.23.0" } }));
  assert.equal(verificarVersiones(r).length, 2);
}));

test("el dominio no importa drizzle-orm, pg ni @gym-app/db (REQ-S22-023)", () => con((r) => {
  escribir(r, "packages/domain/ok.ts", "import { x } from './y';\nimport { z } from '@gym-app/domain';");
  assert.deepEqual(verificarDominio(r), []);
  escribir(r, "packages/domain/a.ts", "import { eq } from 'drizzle-orm';");
  escribir(r, "packages/domain/b.ts", "import pg from \"pg\";");
  escribir(r, "packages/domain/c.ts", "import { db } from '@gym-app/db';");
  assert.equal(verificarDominio(r).length, 3);
}));

test("drizzle-kit solo se invoca tras la guarda local (REQ-S22-022)", () => con((r) => {
  escribir(r, "packages/db/package.json", JSON.stringify({ scripts: { "db:push": "node ../../tools/guardia-db-local.mjs && drizzle-kit push", "db:malo": "drizzle-kit drop" } }));
  const e = verificarGuardaDrizzleKit(r);
  assert.equal(e.length, 1);
  assert.match(e[0], /db:malo/);
}));

test("la guarda aborta antes de conectar con URL ausente, vacía o ajena", () => {
  const correr = (url) => spawnSync(process.execPath, [GUARDIA], { env: url === undefined ? {} : { DATABASE_URL: url }, encoding: "utf8" });
  assert.equal(correr(undefined).status, 1);
  assert.equal(correr("").status, 1);
  assert.equal(correr("postgresql://u:p@db.ejemplo.com:5432/x").status, 1);
  assert.equal(correr("postgresql://u:p@localhost:5432/x").status, 0);
  assert.equal(correr("postgresql://u:p@postgres:5432/x").status, 0);
});

test("soloComentarios distingue comentarios de código ejecutable (REQ-S22-025)", () => {
  const soloComentario = "--- a/x.ts\n+++ b/x.ts\n@@ -1 +1 @@\n-// Prisma devuelve Decimal\n+// Drizzle devuelve cadena\n";
  assert.equal(soloComentarios(soloComentario), true);
  const codigo = "--- a/x.ts\n+++ b/x.ts\n@@ -1 +1 @@\n-const a = 1;\n+const a = 2;\n";
  assert.equal(soloComentarios(codigo), false);
  const mezcla = "-const a = 1; // viejo\n+const a = 1; // nuevo\n";
  assert.equal(soloComentarios(mezcla), true);
});

test("con Drizzle, packages/db solo admite package.json, drizzle.config.ts y src/ (REQ-S22-029)", () => {
  assert.deepEqual(verificarPackagesDbDrizzle(["packages/db/package.json", "packages/db/drizzle.config.ts", "packages/db/src/schema/miembro.ts", "apps/a/x.ts"]), []);
  assert.equal(verificarPackagesDbDrizzle(["packages/db/prisma/schema.prisma", "packages/db/otro.ts"]).length, 2);
});

test("verificarDrizzle sin --final no exige la cadena prisma", () => con((r) => {
  escribir(r, "Dockerfile", "prisma");
  escribir(r, "package-lock.json", JSON.stringify({ packages: { "node_modules/prisma": {} } }));
  assert.deepEqual(verificarDrizzle(r), []);
  assert.equal(verificarDrizzle(r, { final: true }).length, 2);
}));
