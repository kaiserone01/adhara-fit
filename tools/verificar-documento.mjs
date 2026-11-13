#!/usr/bin/env node
// S-06 (documento de identidad): falla si en apps/ o packages/ reaparece la palabra «cedula» / «cédula».
// Uso: node tools/verificar-documento.mjs
// Exenciones cerradas, cada una con su tope de líneas:
//  - packages/db/: el esquema conserva la tabla del padrón (MiembroReferencia) hasta S-10/S-15.
//  - apps/web-admin/app/api/miembros/route.ts: rechaza explícitamente el campo antiguo «cedula» (REQ-S06-039).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const IGNORADOS = new Set(["node_modules", ".next", ".turbo", "coverage", "dist", "out", ".git", "generated", "android"]);
const PREFIJOS_EXENTOS = ["packages/db/"];
export const TOPES = { "apps/web-admin/app/api/miembros/route.ts": 2 };

function recorrer(dir, salida = []) {
  if (!existsSync(dir)) return salida;
  for (const n of readdirSync(dir)) {
    if (IGNORADOS.has(n)) continue;
    const r = join(dir, n);
    if (statSync(r).isDirectory()) recorrer(r, salida);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|css)$/.test(r)) salida.push(r);
  }
  return salida;
}

/** Devuelve «archivo:línea» por cada aparición fuera de las exenciones o por encima del tope de una exención. */
export function verificarDocumento(raiz) {
  const errores = [];
  for (const base of ["apps", "packages"]) {
    for (const archivo of recorrer(join(raiz, base))) {
      const ruta = relative(raiz, archivo).split("\\").join("/");
      if (PREFIJOS_EXENTOS.some((p) => ruta.startsWith(p))) continue;
      const tope = TOPES[ruta] ?? 0;
      let cuenta = 0;
      readFileSync(archivo, "utf8")
        .split("\n")
        .forEach((linea, i) => {
          if (/c[eé]dula/i.test(linea) && ++cuenta > tope) errores.push(`${ruta}:${i + 1}`);
        });
    }
  }
  return errores;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errores = verificarDocumento(resolve(fileURLToPath(import.meta.url), "..", ".."));
  if (errores.length > 0) {
    console.error("verificar-documento: quedan menciones de cédula (S-06):\n" + errores.map((e) => "  " + e).join("\n"));
    process.exit(1);
  }
  console.log("verificar-documento: OK");
}
