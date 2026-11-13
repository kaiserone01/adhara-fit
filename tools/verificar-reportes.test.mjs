import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { verificarReportes, TERMINOS } from "./verificar-reportes.mjs";

const escribir = (raiz, ruta, c) => {
  mkdirSync(dirname(join(raiz, ruta)), { recursive: true });
  writeFileSync(join(raiz, ruta), c);
};
const con = (fn) => {
  const r = mkdtempSync(join(tmpdir(), "verificar-reportes-"));
  try {
    fn(r);
  } finally {
    rmSync(r, { recursive: true, force: true });
  }
};

test("un árbol limpio pasa", () => con((r) => {
  escribir(r, "apps/a/x.ts", "export const planFiltro = 1;\n");
  assert.deepEqual(verificarReportes(r), []);
}));

test("detecta cada término con archivo, línea y término", () => con((r) => {
  TERMINOS.forEach((t, i) => escribir(r, `apps/a/t${i}.ts`, `const a = 1;\nconst ${t} = 2;\n`));
  const errores = verificarReportes(r);
  assert.equal(errores.length, TERMINOS.length);
  for (const t of TERMINOS) assert.ok(errores.some((e) => e.endsWith(`:2 ${t}`)), t);
}));

test("las carpetas generadas están exentas", () => con((r) => {
  escribir(r, "apps/a/.next/y.js", "venceHasta\n");
  assert.deepEqual(verificarReportes(r), []);
}));
