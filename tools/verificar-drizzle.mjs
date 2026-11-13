#!/usr/bin/env node
// Comprobaciones automáticas de S-22 (capa de datos con Drizzle): sql.raw, cadena prisma, lockfile,
// versiones fijadas, importaciones prohibidas en el dominio, código ejecutable del dominio y guarda de drizzle-kit.
// Uso: node tools/verificar-drizzle.mjs [--final] [--dominio-diff <rango-git>]
//   Sin --final se omiten las comprobaciones que solo valen "al terminar la spec" (cadena prisma y lockfile).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const IGNORADOS = new Set(["node_modules", ".next", ".turbo", "coverage", "dist", "out", ".git"]);
export const VERSIONES = { "drizzle-orm": "0.45.4", "drizzle-kit": "0.31.11", pg: "8.23.0" };

function recorrer(dir, filtro, salida = []) {
  if (!existsSync(dir)) return salida;
  for (const n of readdirSync(dir)) {
    if (IGNORADOS.has(n) || n === "tsconfig.tsbuildinfo") continue;
    const r = join(dir, n);
    if (statSync(r).isDirectory()) recorrer(r, filtro, salida);
    else if (filtro(r)) salida.push(r);
  }
  return salida;
}
const rel = (raiz, f) => relative(raiz, f).split("\\").join("/");
const texto = (f) => readFileSync(f, "utf8");
const esCodigo = (f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f);
const lineaDe = (t, idx) => t.slice(0, idx).split("\n").length;

/** REQ-S22-014: ninguna llamada a sql.raw en el código fuente. */
export function verificarSqlRaw(raiz) {
  const errores = [];
  for (const base of ["apps", "packages"]) {
    for (const f of recorrer(join(raiz, base), esCodigo)) {
      const t = texto(f);
      for (const m of t.matchAll(/\bsql\s*\.\s*raw\s*\(/g)) errores.push(`sql.raw en ${rel(raiz, f)}:${lineaDe(t, m.index)}`);
    }
  }
  return errores;
}

/** REQ-S22-015: la cadena "prisma" no aparece en el código ni en la configuración. */
export function verificarCadenaPrisma(raiz) {
  const archivos = [];
  for (const base of ["apps", "packages", ".github"]) archivos.push(...recorrer(join(raiz, base), () => true));
  for (const n of ["package.json", "Dockerfile", "docker-compose.yml", "docker-entrypoint.sh", "turbo.json", ".dockerignore", ".gitignore"]) {
    if (existsSync(join(raiz, n))) archivos.push(join(raiz, n));
  }
  const errores = [];
  for (const f of archivos) {
    if (/\.(png|jpe?g|webp|ico|mp4|woff2?|ttf|jar|keystore|apk|zip)$/i.test(f)) continue;
    const t = texto(f);
    const m = /prisma/i.exec(t);
    if (m) errores.push(`cadena prisma en ${rel(raiz, f)}:${lineaDe(t, m.index)}`);
  }
  return errores;
}

/** REQ-S22-027: ninguna ruta del lockfile contiene prisma (los peerDependencies opcionales de drizzle-orm no cuentan). */
export function verificarLockfile(raiz) {
  const f = join(raiz, "package-lock.json");
  if (!existsSync(f)) return ["falta package-lock.json"];
  const paquetes = Object.keys(JSON.parse(texto(f)).packages ?? {});
  return paquetes.filter((p) => /prisma/i.test(p)).map((p) => `lockfile con la ruta ${p}`);
}

/** REQ-S22-021: versiones exactas, sin prefijo de rango. */
export function verificarVersiones(raiz) {
  const errores = [];
  const manifiestos = ["package.json", ...recorrer(join(raiz, "apps"), (f) => f.endsWith("package.json")).map((f) => rel(raiz, f)),
    ...recorrer(join(raiz, "packages"), (f) => f.endsWith("package.json")).map((f) => rel(raiz, f))];
  for (const m of new Set(manifiestos)) {
    if (!existsSync(join(raiz, m))) continue;
    const p = JSON.parse(texto(join(raiz, m)));
    for (const seccion of ["dependencies", "devDependencies"]) {
      for (const [nombre, esperado] of Object.entries(VERSIONES)) {
        const v = p[seccion]?.[nombre];
        if (v !== undefined && v !== esperado) errores.push(`${m}: ${nombre} es "${v}" y debe ser exactamente "${esperado}"`);
      }
    }
  }
  return errores;
}

/** REQ-S22-023: el dominio no importa drizzle-orm, pg ni @gym-app/db. */
export function verificarDominio(raiz) {
  const errores = [];
  for (const f of recorrer(join(raiz, "packages/domain"), esCodigo)) {
    const t = texto(f);
    for (const m of t.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](drizzle-orm[^"']*|pg|@gym-app\/db[^"']*)["']/g)) {
      errores.push(`el dominio importa ${m[1]} en ${rel(raiz, f)}:${lineaDe(t, m.index)}`);
    }
  }
  return errores;
}

/** REQ-S22-022: todo script que invoca drizzle-kit pasa antes por la guarda de base local. */
export function verificarGuardaDrizzleKit(raiz) {
  const errores = [];
  const manifiestos = ["package.json", ...recorrer(join(raiz, "apps"), (f) => f.endsWith("package.json")).map((f) => rel(raiz, f)),
    ...recorrer(join(raiz, "packages"), (f) => f.endsWith("package.json")).map((f) => rel(raiz, f))];
  for (const m of new Set(manifiestos)) {
    if (!existsSync(join(raiz, m))) continue;
    for (const [nombre, cmd] of Object.entries(JSON.parse(texto(join(raiz, m))).scripts ?? {})) {
      if (/drizzle-kit/.test(cmd) && !/guardia-db-local/.test(cmd)) errores.push(`${m}: el script ${nombre} invoca drizzle-kit sin tools/guardia-db-local.mjs`);
    }
  }
  return errores;
}

const sinComentarios = (l) => l.replace(/\/\*.*?\*\//g, "").replace(/(^|\s)\/\/.*$/, "").replace(/^\s*\*.*$/, "").trim();

/** REQ-S22-025: un diff unificado cambia solo comentarios si las líneas ejecutables quitadas y añadidas coinciden. */
export function soloComentarios(diff) {
  const quitadas = [], agregadas = [];
  for (const l of diff.split("\n")) {
    if (l.startsWith("+++") || l.startsWith("---")) continue;
    if (l.startsWith("+")) agregadas.push(sinComentarios(l.slice(1)));
    else if (l.startsWith("-")) quitadas.push(sinComentarios(l.slice(1)));
  }
  const f = (xs) => xs.filter(Boolean).join("\n");
  return f(quitadas) === f(agregadas);
}

export function verificarDiffDominio(raiz, rango) {
  const diff = execFileSync("git", ["-C", raiz, "diff", "-U0", rango, "--", "packages/domain"], { encoding: "utf8", maxBuffer: 1 << 28 });
  return soloComentarios(diff) ? [] : [`el diff ${rango} cambia código ejecutable de packages/domain`];
}

export function verificarDrizzle(raiz, { final = false, rangoDominio = null } = {}) {
  return [
    ...verificarSqlRaw(raiz), ...verificarVersiones(raiz), ...verificarDominio(raiz), ...verificarGuardaDrizzleKit(raiz),
    ...(final ? [...verificarCadenaPrisma(raiz), ...verificarLockfile(raiz)] : []),
    ...(rangoDominio ? verificarDiffDominio(raiz, rangoDominio) : []),
  ];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = resolve(fileURLToPath(import.meta.url), "../..");
  const i = process.argv.indexOf("--dominio-diff");
  const errores = verificarDrizzle(raiz, { final: process.argv.includes("--final"), rangoDominio: i > 0 ? process.argv[i + 1] : null });
  if (errores.length) { console.error(errores.map((e) => `verificar-drizzle: ${e}`).join("\n")); process.exit(1); }
  console.log("verificar-drizzle: sin hallazgos");
}
