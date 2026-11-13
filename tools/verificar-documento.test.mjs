import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { verificarDocumento } from "./verificar-documento.mjs";

const escribir = (raiz, ruta, c) => {
  mkdirSync(dirname(join(raiz, ruta)), { recursive: true });
  writeFileSync(join(raiz, ruta), c);
};
const con = (fn) => {
  const r = mkdtempSync(join(tmpdir(), "verificar-documento-"));
  try {
    fn(r);
  } finally {
    rmSync(r, { recursive: true, force: true });
  }
};

test("un árbol limpio pasa", () => con((r) => {
  escribir(r, "apps/a/x.ts", "export const documento = 1;\n");
  assert.deepEqual(verificarDocumento(r), []);
}));

test("detecta cedula y cédula, sin distinguir mayúsculas, con archivo y línea", () => con((r) => {
  escribir(r, "apps/a/x.ts", "const a = 1;\nconst cedula = 2;\n");
  escribir(r, "packages/p/y.tsx", "// Cédula\n");
  assert.deepEqual(verificarDocumento(r).sort(), ["apps/a/x.ts:2", "packages/p/y.tsx:1"]);
}));

test("packages/db y el código generado quedan fuera", () => con((r) => {
  escribir(r, "packages/db/schema.prisma.ts", "cedula");
  escribir(r, "apps/a/generated/y.ts", "cedula");
  assert.deepEqual(verificarDocumento(r), []);
}));

test("la exención de api/miembros tiene tope de dos líneas", () => con((r) => {
  const ruta = "apps/web-admin/app/api/miembros/route.ts";
  escribir(r, ruta, "cedula\ncedula\n");
  assert.deepEqual(verificarDocumento(r), []);
  escribir(r, ruta, "cedula\ncedula\ncedula\n");
  assert.deepEqual(verificarDocumento(r), [ruta + ":3"]);
}));
