#!/usr/bin/env node
// Compara las variables leídas con process.env contra .env.example (S-00, REQ-S00-006 y REQ-S00-018).
// Uso: node tools/verificar-env.mjs [raíz]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXTENSIONES = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const IGNORADOS = new Set(["node_modules", ".next", ".turbo", "coverage", "dist", "out", "generated", "build"]);
/** Variables con valor admitido fuera de Solo Compose (no son secretos). */
const VALOR_LIBRE = new Set(["NODE_ENV"]);
export const MARCA_SOLO_COMPOSE = /^#.*solo compose/i;
const MARCA_SOLO_LOCAL = /solo local/i;

function recorrer(dir, salida) {
  if (!existsSync(dir)) return;
  for (const n of readdirSync(dir)) {
    if (IGNORADOS.has(n)) continue;
    const r = join(dir, n);
    if (statSync(r).isDirectory()) recorrer(r, salida);
    else if (EXTENSIONES.test(n) && !/\.(test|spec)\.[a-z]+$/.test(n)) salida.push(r);
  }
}

/** Nombres leídos con process.env.X o process.env["X"] / ['X']. */
export function variablesLeidas(raiz) {
  const archivos = [];
  for (const base of ["apps", "packages"]) recorrer(join(raiz, base), archivos);
  // Alta provisional del administrador (adelanto de S-15): lee ADMIN_* fuera de apps y packages.
  const alta = join(raiz, "tools/crear-administrador.mjs");
  if (existsSync(alta)) archivos.push(alta);
  const vistas = new Map();
  for (const a of archivos) {
    const t = readFileSync(a, "utf8");
    for (const m of t.matchAll(/process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\])/g)) {
      const nombre = m[1] ?? m[2];
      if (!vistas.has(nombre)) vistas.set(nombre, a);
    }
  }
  return vistas;
}

/** Lee .env.example: variables generales y de la sección Solo Compose, con sus valores. */
export function leerEnvExample(texto) {
  const general = new Map(), compose = new Map();
  let enCompose = false, marcadoLocal = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (MARCA_SOLO_COMPOSE.test(linea.trim())) { enCompose = true; marcadoLocal = MARCA_SOLO_LOCAL.test(linea); continue; }
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(linea.trim());
    if (!m) continue;
    (enCompose ? compose : general).set(m[1], { valor: m[2], marcadoLocal });
  }
  return { general, compose };
}

export function verificarEnv(raiz) {
  const errores = [];
  const ruta = join(raiz, ".env.example");
  if (!existsSync(ruta)) return ["falta .env.example"];
  const { general, compose } = leerEnvExample(readFileSync(ruta, "utf8"));
  const leidas = variablesLeidas(raiz);
  for (const [nombre, archivo] of leidas) {
    if (!general.has(nombre) && !compose.has(nombre)) errores.push(`variable ${nombre} leída en ${archivo.slice(raiz.length + 1)} y ausente de .env.example`);
  }
  for (const nombre of general.keys()) if (!leidas.has(nombre)) errores.push(`variable ${nombre} de .env.example que ningún código lee`);
  for (const [nombre, { valor }] of general) {
    if (valor !== "" && !VALOR_LIBRE.has(nombre)) errores.push(`variable ${nombre} con valor no permitido fuera de Solo Compose`);
  }
  for (const [nombre, { valor, marcadoLocal }] of compose) {
    if (valor !== "" && !marcadoLocal) errores.push(`variable ${nombre} de Solo Compose con valor no marcado como solo local`);
  }
  return errores;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = resolve(process.argv[2] ?? join(fileURLToPath(import.meta.url), "../.."));
  const errores = verificarEnv(raiz);
  if (errores.length) { console.error(errores.map((e) => `verificar-env: ${e}`).join("\n")); process.exit(1); }
  console.log("verificar-env: sin hallazgos");
}
