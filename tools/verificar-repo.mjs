#!/usr/bin/env node
// Verificaciones de fundaciones del repositorio (S-00): exclusiones, apps y workspaces,
// migraciones, archivos obligatorios, .gitignore, versiones fijadas, referencias rotas e historia.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CORTE_MIGRACIONES = "20261016000000";
export const APPS_PERMITIDAS = ["web-admin", "kiosk", "kiosk-tv", "vitrina", "vitrina-tv"];
export const WORKSPACES_VACIOS = ["config", "design-system"];
export const RAICES_CIERRE = ["web-admin", "kiosk", "vitrina"];
export const OBLIGATORIOS = ["LICENSE", "README.md", ".env.example", "CLAUDE.md", "handoff.md"];
export const FRASE_LICENCIA = "Copyright (c) 2026 Adhara Fit. Todos los derechos reservados.";
export const PATRONES_GITIGNORE = [
  "*.keystore", "*.jks", "*.p12", "*.pfx", "keystore.properties", "cookies.txt",
  ".env*", "*.pem", "node_modules", ".next", ".turbo", "coverage", ".claude/settings.local.json",
];
export const PERMITIDOS_DB = [
  "packages/db/package.json",
  "packages/db/prisma/schema.prisma",
  "packages/db/prisma7.config.ts",
  "packages/db/prisma7.local.config.ts",
];
const CONTRASENAS = ["admin1234", "entrenador1234"];
const IGNORADOS_RECORRIDO = new Set([".git", "node_modules", ".next", ".turbo", "coverage", "dist", "out"]);

/** Lista archivos relativos (con "/") del árbol: git (versionados + nuevos no ignorados) o recorrido. */
export function listarArchivos(raiz) {
  if (existsSync(join(raiz, ".git"))) {
    try {
      const salida = (args) =>
        execFileSync("git", ["-C", raiz, ...args], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);
      const todos = new Set([...salida(["ls-files", "-z"]), ...salida(["ls-files", "-z", "--others", "--exclude-standard"])]);
      return [...todos].filter((r) => existsSync(join(raiz, r))).sort();
    } catch { /* cae al recorrido */ }
  }
  const res = [];
  const recorrer = (rel) => {
    for (const nombre of readdirSync(join(raiz, rel))) {
      if (IGNORADOS_RECORRIDO.has(nombre)) continue;
      const r = rel ? `${rel}/${nombre}` : nombre;
      if (statSync(join(raiz, r)).isDirectory()) recorrer(r);
      else res.push(r);
    }
  };
  recorrer("");
  return res.sort();
}

const leer = (raiz, r) => readFileSync(join(raiz, r), "utf8");
const json = (raiz, r) => { try { return JSON.parse(leer(raiz, r)); } catch { return null; } };

/** Devuelve el motivo de exclusión de una ruta (minúsculas), o null. */
export function motivoExclusion(ruta) {
  const r = ruta.toLowerCase();
  const partes = r.split("/");
  const nombre = partes[partes.length - 1];
  if (nombre === "cookies.txt") return "cookies.txt";
  if (nombre === "handoff.md" && partes.length > 1) return "handoff.md fuera de la raíz";
  if (/\.(keystore|jks|p12|pfx|pem)$/.test(nombre) || nombre === "keystore.properties") return "credencial de firma";
  if (nombre.startsWith(".env") && nombre !== ".env.example") return "archivo .env";
  if (/^reset-vencimientos-log-.*\.json$/.test(nombre)) return "log de reset de vencimientos";
  if (partes.includes(".windsurf") || partes.includes(".agents")) return "directorio de agentes del Repo A";
  if (nombre === "skills-lock.json") return "skills-lock.json";
  if (r.startsWith("docs/xls/")) return "docs/xls/";
  if (r.startsWith("packages/db/migracion-excel/")) return "packages/db/migracion-excel/";
  if (nombre.includes("zipgym") || nombre.includes("zip-gym")) return "archivo del cliente anterior (zipgym)";
  if (nombre === "migration_lock.toml") return "migration_lock.toml";
  if (/(^|\/)prisma\/seed\.ts$/.test(r)) return "seed del Repo A";
  if (r.startsWith("apps/worker/") || r.startsWith("apps/kiosk-host/")) return "app omitida";
  if (/^\.github\/workflows\/(apk-[^/]*\.yml|verificar-vitrina\.yml)$/.test(r)) return "workflow omitido";
  return null;
}

export function verificarExclusiones(raiz, archivos) {
  const errores = [];
  for (const a of archivos) {
    const m = motivoExclusion(a);
    if (m) errores.push(`exclusión: ${a} (${m})`);
    if (a.toLowerCase().startsWith("packages/db/") && !PERMITIDOS_DB.includes(a.toLowerCase()) && !/^packages\/db\/prisma\/migrations\/\d{14}_/i.test(a)) {
      errores.push(`exclusión: ${a} (packages/db solo admite ${PERMITIDOS_DB.join(", ")})`);
    }
  }
  for (const a of archivos) {
    if (!/^(apps|packages)\//.test(a) || /\.(png|jpe?g|webp|mp4|woff2?|ttf|ico|zip|jar|apk)$/i.test(a)) continue;
    const t = leer(raiz, a).toLowerCase();
    for (const c of CONTRASENAS) if (t.includes(c)) errores.push(`contraseña ${c}: ${a}`);
  }
  return errores;
}

function nombresWorkspaces(raiz) {
  const mapa = new Map();
  if (!existsSync(join(raiz, "packages"))) return mapa;
  for (const d of readdirSync(join(raiz, "packages"))) {
    const p = json(raiz, `packages/${d}/package.json`);
    if (p?.name) mapa.set(p.name, d);
  }
  return mapa;
}

export function verificarApps(raiz) {
  const errores = [];
  const apps = existsSync(join(raiz, "apps")) ? readdirSync(join(raiz, "apps")).filter((d) => statSync(join(raiz, "apps", d)).isDirectory()) : [];
  for (const a of APPS_PERMITIDAS) if (!apps.includes(a)) errores.push(`apps: falta apps/${a}`);
  for (const a of apps) if (!APPS_PERMITIDAS.includes(a)) errores.push(`apps: sobra apps/${a}`);
  const mapa = nombresWorkspaces(raiz);
  const requeridos = new Set(WORKSPACES_VACIOS);
  const pendientes = RAICES_CIERRE.map((a) => `apps/${a}/package.json`);
  const vistos = new Set();
  while (pendientes.length) {
    const ruta = pendientes.pop();
    if (vistos.has(ruta) || !existsSync(join(raiz, ruta))) continue;
    vistos.add(ruta);
    const p = json(raiz, ruta);
    for (const dep of Object.keys({ ...p?.dependencies, ...p?.devDependencies })) {
      const dir = mapa.get(dep);
      if (dir) { requeridos.add(dir); pendientes.push(`packages/${dir}/package.json`); }
      else if (dep.startsWith("@gym-app/")) errores.push(`workspaces: falta packages/${dep.slice("@gym-app/".length)} (requerido por ${ruta})`);
    }
  }
  const presentes = existsSync(join(raiz, "packages")) ? readdirSync(join(raiz, "packages")).filter((d) => statSync(join(raiz, "packages", d)).isDirectory()) : [];
  for (const d of requeridos) if (!presentes.includes(d)) errores.push(`workspaces: falta packages/${d}`);
  for (const d of presentes) if (!requeridos.has(d)) errores.push(`workspaces: sobra packages/${d}`);
  return errores;
}

export function verificarMigraciones(archivos) {
  const errores = [];
  for (const a of archivos) {
    const m = /^packages\/db\/prisma\/migrations\/(\d{14})_/.exec(a);
    if (m && m[1] <= CORTE_MIGRACIONES) errores.push(`migración heredada: ${a}`);
  }
  return errores;
}

export function verificarObligatorios(raiz) {
  const errores = [];
  for (const f of OBLIGATORIOS) if (!existsSync(join(raiz, f))) errores.push(`obligatorio ausente: ${f}`);
  if (existsSync(join(raiz, "LICENSE")) && !leer(raiz, "LICENSE").includes(FRASE_LICENCIA)) {
    errores.push(`LICENSE sin la frase "${FRASE_LICENCIA}"`);
  }
  return errores;
}

export function verificarGitignore(raiz) {
  if (!existsSync(join(raiz, ".gitignore"))) return ["obligatorio ausente: .gitignore"];
  const lineas = new Set(leer(raiz, ".gitignore").split(/\r?\n/).map((l) => l.trim().replace(/\/$/, "")));
  const errores = [];
  for (const p of PATRONES_GITIGNORE) if (!lineas.has(p)) errores.push(`.gitignore sin el patrón ${p}`);
  if (!lineas.has("!.env.example")) errores.push(".gitignore sin la excepción !.env.example");
  return errores;
}

const mayorPostgres = (texto) => [...texto.matchAll(/postgres:(\d+)(?:[.\-\w]*)/g)].map((m) => m[1]);

export function verificarVersiones(raiz) {
  const errores = [];
  const compose = existsSync(join(raiz, "docker-compose.yml")) ? leer(raiz, "docker-compose.yml") : null;
  const ci = existsSync(join(raiz, ".github/workflows/ci.yml")) ? leer(raiz, ".github/workflows/ci.yml") : null;
  if (compose === null) errores.push("obligatorio ausente: docker-compose.yml");
  if (ci === null) errores.push("obligatorio ausente: .github/workflows/ci.yml");
  for (const [nombre, t] of [["docker-compose.yml", compose], [".github/workflows/ci.yml", ci]]) {
    if (t === null) continue;
    if (/postgres:latest\b/.test(t)) errores.push(`${nombre}: etiqueta latest en la imagen de PostgreSQL`);
    if (/gitleaks[^\n]*\blatest\b/i.test(t)) errores.push(`${nombre}: etiqueta latest en gitleaks`);
  }
  if (compose !== null && ci !== null) {
    const a = mayorPostgres(compose), b = mayorPostgres(ci);
    if (!a.length) errores.push("docker-compose.yml: la imagen de PostgreSQL no fija versión");
    if (!b.length) errores.push(".github/workflows/ci.yml: la imagen de PostgreSQL no fija versión");
    if (a.length && b.length && !b.every((v) => v === a[0])) errores.push(`versión mayor de PostgreSQL distinta (compose ${a[0]}, ci ${[...new Set(b)].join(",")})`);
  }
  return errores;
}

/** Scripts de package.json y COPY de Dockerfile que apuntan a rutas inexistentes. */
export function verificarReferencias(raiz, archivos) {
  const errores = [];
  for (const a of archivos.filter((f) => f.endsWith("package.json") && !f.includes("node_modules"))) {
    const p = json(raiz, a);
    const dir = posix.dirname(a);
    for (const [nombre, cmd] of Object.entries(p?.scripts ?? {})) {
      for (const m of String(cmd).matchAll(/(?:^|[\s"'=])((?:\.{1,2}\/|apps\/|packages\/)?[\w@.\-/]+\.(?:mjs|cjs|js|ts|tsx|sh|prisma))(?=$|[\s"'])/g)) {
        const ref = m[1];
        if (/^(https?:|-)/.test(ref) || /[*$]/.test(ref) || /^(next|tsx|turbo|vitest|tsc|prisma|node|npm)\.\w+$/.test(ref)) continue;
        const candidatos = [posix.normalize(posix.join(dir, ref)), posix.normalize(ref)];
        if (!candidatos.some((c) => existsSync(join(raiz, c)))) errores.push(`referencia rota: script "${nombre}" de ${a} apunta a ${ref}`);
      }
      for (const m of String(cmd).matchAll(/(?:^|\s)(apps\/[\w-]+|packages\/[\w-]+)(?=$|\s|\/)/g)) {
        if (!existsSync(join(raiz, m[1]))) errores.push(`referencia rota: script "${nombre}" de ${a} apunta a ${m[1]}`);
      }
    }
  }
  if (existsSync(join(raiz, "Dockerfile"))) {
    for (const [i, l] of leer(raiz, "Dockerfile").split(/\r?\n/).entries()) {
      const m = /^COPY\s+(?!--from)(?:--\S+\s+)*(\S+)\s+\S+/.exec(l.trim());
      if (m && !/[*$]/.test(m[1]) && !existsSync(join(raiz, m[1]))) errores.push(`referencia rota: Dockerfile:${i + 1} copia ${m[1]}`);
    }
  }
  return errores;
}

export function verificarHistoria(raiz) {
  const git = (...a) => execFileSync("git", ["-C", raiz, ...a], { encoding: "utf8" }).trim();
  const errores = [];
  const raices = git("rev-list", "--max-parents=0", "HEAD").split("\n").filter(Boolean);
  if (raices.length !== 1) errores.push(`historia: se esperaba 1 commit raíz y hay ${raices.length}`);
  const importacion = git("log", "--format=%H", "--grep=^Importa el Repo A").split("\n").filter(Boolean);
  if (importacion.length !== 1) errores.push(`historia: se esperaba 1 commit de importación y hay ${importacion.length}`);
  else if (git("rev-list", "--parents", "-n", "1", importacion[0]).split(" ").length - 1 > 1) errores.push("historia: el commit de importación tiene más de un padre");
  const base = join(raiz, "docs/linea-base-tests.md");
  const sha = existsSync(base) ? /\b([0-9a-f]{40})\b/.exec(readFileSync(base, "utf8"))?.[1] : null;
  if (!sha) errores.push("historia: docs/linea-base-tests.md no registra el SHA completo del Repo A");
  else {
    try { git("cat-file", "-e", `${sha}^{commit}`); errores.push(`historia: el SHA del Repo A ${sha} existe en el repositorio`); } catch { /* correcto */ }
  }
  return errores;
}

export function verificarRepo(raiz, { historia = false, archivos } = {}) {
  const lista = archivos ?? listarArchivos(raiz);
  return [
    ...verificarExclusiones(raiz, lista), ...verificarApps(raiz), ...verificarMigraciones(lista),
    ...verificarObligatorios(raiz), ...verificarGitignore(raiz), ...verificarVersiones(raiz),
    ...verificarReferencias(raiz, lista), ...(historia ? verificarHistoria(raiz) : []),
  ];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errores = verificarRepo(raiz, { historia: process.argv.includes("--historia") });
  if (errores.length) { console.error(errores.map((e) => `verificar-repo: ${e}`).join("\n")); process.exit(1); }
  console.log("verificar-repo: sin hallazgos");
}
