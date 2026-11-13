#!/usr/bin/env node
// S-07 (plan simplificado y cambio de plan único): falla si en apps/ o packages/ reaparece algún término del
// modelo anterior (frecuencia de pago, entrenador incluido en el plan, prorrateo, cambio de plan con varios pagos).
// Uso: node tools/verificar-plan.mjs
// Exención: packages/db/ conserva columnas y valores de enum antiguos (sin usar) hasta la limpieza de la base (S-15),
// porque el arranque del contenedor usa `prisma db push` sin --accept-data-loss y no puede eliminarlos.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const IGNORADOS = new Set(["node_modules", ".next", ".turbo", "coverage", "dist", "out", ".git", "generated", "android"]);
const PREFIJOS_EXENTOS = ["packages/db/"];
export const TERMINOS = [
  "incluyeEntrenador",
  "FrecuenciaPago",
  "planFrecuencia",
  "ActualizarFrecuenciaPlan",
  "ContarImpactoCambioPlan",
  "prorratearVencimiento",
  "CambiarPlanConPago",
  "EntrenadorRequeridoError",
  "PlanCortesiaConTiempoRestanteError",
  "OrigenCambioPlan",
  "ModoCambioPlan",
];
const PATRON = new RegExp(TERMINOS.join("|"));

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

/** Devuelve «archivo:línea» por cada aparición de un término antiguo fuera de la exención. */
export function verificarPlan(raiz) {
  const errores = [];
  for (const base of ["apps", "packages"]) {
    for (const archivo of recorrer(join(raiz, base))) {
      const ruta = relative(raiz, archivo).split("\\").join("/");
      if (PREFIJOS_EXENTOS.some((p) => ruta.startsWith(p))) continue;
      readFileSync(archivo, "utf8")
        .split("\n")
        .forEach((linea, i) => {
          if (PATRON.test(linea)) errores.push(`${ruta}:${i + 1}`);
        });
    }
  }
  return errores;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errores = verificarPlan(resolve(fileURLToPath(import.meta.url), "..", ".."));
  if (errores.length > 0) {
    console.error("verificar-plan: quedan términos del plan anterior (S-07):\n" + errores.map((e) => "  " + e).join("\n"));
    process.exit(1);
  }
  console.log("verificar-plan: OK");
}
