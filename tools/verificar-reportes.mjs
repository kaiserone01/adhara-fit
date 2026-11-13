#!/usr/bin/env node
// S-14 (reportes): falla si en apps/ o packages/ reaparece algún filtro de fechas del navegador en la lista de
// miembros (los reemplazan los reportes de morosos y por vencer). Uso: node tools/verificar-reportes.mjs
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const IGNORADOS = new Set(["node_modules", ".next", ".turbo", "coverage", "dist", "out", ".git", "generated", "android"]);
export const TERMINOS = ["proximoCobroFiltro", "OPCIONES_PROXIMO_COBRO", "venceHasta", "inscritoDesde"];

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

/** Devuelve «archivo:línea término» por cada aparición de un término retirado. */
export function verificarReportes(raiz) {
  const errores = [];
  for (const base of ["apps", "packages"]) {
    for (const archivo of recorrer(join(raiz, base))) {
      const ruta = relative(raiz, archivo).split("\\").join("/");
      readFileSync(archivo, "utf8")
        .split("\n")
        .forEach((linea, i) => {
          for (const termino of TERMINOS) if (linea.includes(termino)) errores.push(`${ruta}:${i + 1} ${termino}`);
        });
    }
  }
  return errores;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errores = verificarReportes(resolve(fileURLToPath(import.meta.url), "..", ".."));
  if (errores.length > 0) {
    console.error("verificar-reportes: quedan filtros de fechas del navegador retirados (S-14):\n" + errores.map((e) => "  " + e).join("\n"));
    process.exit(1);
  }
  console.log("verificar-reportes: OK");
}
