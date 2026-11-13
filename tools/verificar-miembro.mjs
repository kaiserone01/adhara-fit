#!/usr/bin/env node
// S-09 (eliminar miembro): falla si en apps/ o packages/ reaparece algún término del borrado físico y de la baja
// antigua de miembros. Uso: node tools/verificar-miembro.mjs
// Exención: packages/db/ (el esquema conserva la columna `activo` sin uso hasta la limpieza de la base, S-15).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const IGNORADOS = new Set(["node_modules", ".next", ".turbo", "coverage", "dist", "out", ".git", "generated", "android"]);
const PREFIJOS_EXENTOS = ["packages/db/"];
export const TERMINOS = [
  "eliminarConHistorial",
  "BotonQuitarMiembro",
  "darDeBajaAction",
  "reactivarAction",
  "EstadoToggle",
  "Quitar del sistema",
  "Miembro dado de baja",
  "Miembro reactivado",
];

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

/** Devuelve «archivo:línea término» por cada aparición de un término retirado fuera de la exención. */
export function verificarMiembro(raiz) {
  const errores = [];
  for (const base of ["apps", "packages"]) {
    for (const archivo of recorrer(join(raiz, base))) {
      const ruta = relative(raiz, archivo).split("\\").join("/");
      if (PREFIJOS_EXENTOS.some((p) => ruta.startsWith(p))) continue;
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
  const errores = verificarMiembro(resolve(fileURLToPath(import.meta.url), "..", ".."));
  if (errores.length > 0) {
    console.error("verificar-miembro: quedan términos retirados de la baja de miembros (S-09):\n" + errores.map((e) => "  " + e).join("\n"));
    process.exit(1);
  }
  console.log("verificar-miembro: OK");
}
