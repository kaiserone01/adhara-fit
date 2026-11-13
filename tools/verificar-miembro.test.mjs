import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { verificarMiembro, TERMINOS } from "./verificar-miembro.mjs";

const escribir = (raiz, ruta, c) => {
  mkdirSync(dirname(join(raiz, ruta)), { recursive: true });
  writeFileSync(join(raiz, ruta), c);
};
const con = (fn) => {
  const r = mkdtempSync(join(tmpdir(), "verificar-miembro-"));
  try {
    fn(r);
  } finally {
    rmSync(r, { recursive: true, force: true });
  }
};

test("un árbol limpio pasa", () => con((r) => {
  escribir(r, "apps/a/x.ts", "export const eliminarMiembro = 1;\n");
  assert.deepEqual(verificarMiembro(r), []);
}));

test("detecta cada uno de los ocho términos con archivo, línea y término", () => con((r) => {
  TERMINOS.forEach((t, i) => escribir(r, `apps/a/t${i}.ts`, `const a = 1;\n// ${t}\n`));
  const errores = verificarMiembro(r).sort();
  assert.equal(errores.length, TERMINOS.length);
  for (const t of TERMINOS) assert.ok(errores.some((e) => e.endsWith(`:2 ${t}`)), t);
}));

test("packages/db y las carpetas generadas están exentas", () => con((r) => {
  escribir(r, "packages/db/prisma/x.ts", "eliminarConHistorial\n");
  escribir(r, "apps/a/.next/y.js", "EstadoToggle\n");
  assert.deepEqual(verificarMiembro(r), []);
}));
