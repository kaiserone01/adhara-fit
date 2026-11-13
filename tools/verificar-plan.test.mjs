import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { verificarPlan } from "./verificar-plan.mjs";

const escribir = (raiz, ruta, c) => {
  mkdirSync(dirname(join(raiz, ruta)), { recursive: true });
  writeFileSync(join(raiz, ruta), c);
};
const con = (fn) => {
  const r = mkdtempSync(join(tmpdir(), "verificar-plan-"));
  try {
    fn(r);
  } finally {
    rmSync(r, { recursive: true, force: true });
  }
};

test("un árbol limpio pasa", () => con((r) => {
  escribir(r, "apps/a/x.ts", "export const diasCiclo = 30;\n");
  assert.deepEqual(verificarPlan(r), []);
}));

test("detecta los términos antiguos con archivo y línea", () => con((r) => {
  escribir(r, "apps/a/x.ts", "const a = 1;\nconst incluyeEntrenador = true;\n");
  escribir(r, "packages/p/y.tsx", "import { FrecuenciaPago } from 'x';\n");
  escribir(r, "packages/p/z.ts", "// ver CambiarPlanConPago\n");
  assert.deepEqual(verificarPlan(r).sort(), ["apps/a/x.ts:2", "packages/p/y.tsx:1", "packages/p/z.ts:1"]);
}));

test("packages/db y las carpetas generadas están exentas", () => con((r) => {
  escribir(r, "packages/db/prisma/schema.ts", "incluyeEntrenador\n");
  escribir(r, "packages/db/generated/x.ts", "FrecuenciaPago\n");
  escribir(r, "apps/a/.next/y.js", "ModoCambioPlan\n");
  assert.deepEqual(verificarPlan(r), []);
}));
