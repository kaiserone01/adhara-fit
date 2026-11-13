import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { TERMINOS, verificarRol } from "./verificar-rol.mjs";

const escribir = (raiz, ruta, c) => {
  mkdirSync(dirname(join(raiz, ruta)), { recursive: true });
  writeFileSync(join(raiz, ruta), c);
};
const con = (fn) => {
  const r = mkdtempSync(join(tmpdir(), "verificar-rol-"));
  try {
    fn(r);
  } finally {
    rmSync(r, { recursive: true, force: true });
  }
};

test("un árbol limpio pasa", () => con((r) => {
  escribir(r, "apps/a/x.ts", "export const ok = 1;\n");
  assert.deepEqual(verificarRol(r), []);
}));

test("cada término se detecta con archivo y línea, sin distinguir mayúsculas", () => con((r) => {
  for (const [i, termino] of TERMINOS.entries()) escribir(r, `packages/p/f${i}.ts`, `const a = 1;\n// ${i % 3 === 0 ? termino.toUpperCase() : termino}\n`);
  const errores = verificarRol(r);
  assert.equal(errores.length, TERMINOS.length);
  assert.ok(errores.includes("packages/p/f0.ts:2 " + TERMINOS[0]));
}));

test("packages/db y el código generado quedan fuera", () => con((r) => {
  escribir(r, "packages/db/x.ts", "RolUsuario");
  escribir(r, "apps/a/generated/y.ts", "tienePermiso");
  assert.deepEqual(verificarRol(r), []);
}));
