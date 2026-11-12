#!/usr/bin/env node
// Procedimiento de importación del Repo A (S-00, REQ-S00-001/002/011/015/021/023/025/028/030/031).
// Deja el árbol listo en el repositorio y propone el mensaje de commit; NO crea el commit.
//
// Uso: node tools/importar-repo-a.mjs --repo-a <ruta> [--sha b4352a0] [--destino <dir>]
//        [--comprobar-privacidad owner/repo] [--verificar] [--omitir-gitleaks] [--sin-lockfile]
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PERMITIDOS_DB, listarArchivos, motivoExclusion, scriptsRotos, verificarApps } from "./verificar-repo.mjs";

export const SHA_REPO_A = "b4352a0";
export const MENSAJE_COMMIT = "Importa el Repo A sin historia (b4352a0) con las exclusiones de S-00";
const PROPIOS = ["README.md", "CLAUDE.md", "handoff.md", "docs", ".github", ".claude", ".githooks", "tools", "scripts", ".editorconfig", ".gitattributes"];
const OMITIR_DIRECTORIOS = ["apps/worker", "apps/kiosk-host", "packages/domain-custom"];
const CONTRASENAS = ["admin1234", "entrenador1234"];
/** Línea base medida el 2026-11-12 (docs/linea-base-tests.md): errores de tipos por app. */
export const BASE_TSC = { "web-admin": 1, kiosk: 0, vitrina: 0 };

export class ErrorImportacion extends Error {}

const sh = (cmd, args, op = {}) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...op });

/** Comprueba la copia local y la línea base; no escribe nada. */
export function comprobarPrecondiciones({ repoA, destino, sha }) {
  const faltas = [];
  if (!repoA || !existsSync(join(repoA, ".git"))) faltas.push("la copia local del Repo A (opción --repo-a)");
  else if (sh("git", ["-C", repoA, "cat-file", "-e", `${sha}^{commit}`]).status !== 0) faltas.push(`el commit ${sha} en la copia local del Repo A`);
  for (const f of ["docs/linea-base-tests.md", "docs/linea-base-audit.json"]) {
    if (!existsSync(join(destino, f))) faltas.push(`la línea base ${f}`);
  }
  if (faltas.length) throw new ErrorImportacion(`Falta ${faltas.join(", ")}. No se creó ningún archivo.`);
}

/** REQ-S00-023: el remoto debe ser privado. `cliente({owner, repo})` devuelve { private }. */
export async function comprobarPrivacidad(slug, cliente) {
  const [owner, repo] = slug.split("/");
  const r = await cliente({ owner, repo });
  if (r?.private !== true) throw new ErrorImportacion(`El repositorio ${slug} es público: hazlo privado antes de empujar el commit de importación.`);
}

export const clienteGhPorDefecto = async ({ owner, repo }) => {
  const r = sh("gh", ["api", `repos/${owner}/${repo}`, "--jq", ".private"]);
  if (r.status !== 0) throw new ErrorImportacion("No se pudo consultar la visibilidad con gh.");
  return { private: r.stdout.trim() === "true" };
};

function exportar(repoA, sha, staging) {
  const tar = execFileSync("git", ["-C", repoA, "archive", sha], { maxBuffer: 1 << 30 });
  const r = sh("tar", ["-x", "-C", staging], { input: tar, encoding: "buffer" });
  if (r.status !== 0) throw new ErrorImportacion("No se pudo extraer el árbol con git archive.");
}

const texto = (p) => readFileSync(p, "utf8");
const jsonDe = (p) => JSON.parse(texto(p));
const guardarJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

/** Aplica la lista cerrada de exclusión y las reglas de colisión. Devuelve { excluidos: [{ruta, motivo}] }. */
export function aplicarExclusiones(staging, destino) {
  const excluidos = [];
  const quitar = (ruta, motivo) => { rmSync(join(staging, ruta), { recursive: true, force: true }); excluidos.push({ ruta, motivo }); };
  for (const d of OMITIR_DIRECTORIOS) if (existsSync(join(staging, d))) quitar(d, "app o workspace omitido");
  for (const p of PROPIOS) if (existsSync(join(staging, p))) quitar(p, "colisiona con este repositorio: prevalece el propio");
  const permitidosDb = new Set(PERMITIDOS_DB);
  for (const ruta of listarArchivos(staging)) {
    if (!existsSync(join(staging, ruta))) continue;
    const motivo = motivoExclusion(ruta);
    if (motivo) { quitar(ruta, motivo); continue; }
    if (ruta.toLowerCase().startsWith("packages/db/") && !permitidosDb.has(ruta)) { quitar(ruta, "packages/db fuera de la lista de permitidos"); continue; }
    if (/^(apps|packages)\//.test(ruta) && !/\.(png|jpe?g|webp|mp4|woff2?|ttf|ico|zip|jar|apk|keystore)$/i.test(ruta)) {
      const t = texto(join(staging, ruta)).toLowerCase();
      if (CONTRASENAS.some((c) => t.includes(c))) quitar(ruta, "contiene contraseñas del Repo A");
    }
  }
  // .gitignore: se fusiona sin quitar reglas propias
  const propio = existsSync(join(destino, ".gitignore")) ? texto(join(destino, ".gitignore")).split(/\r?\n/) : [];
  const importado = existsSync(join(staging, ".gitignore")) ? texto(join(staging, ".gitignore")).split(/\r?\n/) : [];
  const vistas = new Set(propio.map((l) => l.trim()));
  const nuevas = importado.filter((l) => l.trim() !== "" && !l.trim().startsWith("#") && !vistas.has(l.trim()));
  const fusion = [...propio.filter((l, i) => !(l === "" && i === propio.length - 1)), "", "# Reglas importadas del Repo A", ...nuevas, ""].join("\n");
  writeFileSync(join(staging, ".gitignore"), fusion);
  return { excluidos };
}

/** Cambios de configuración (nunca código de src/): REQ-S00-030, SUP-S00-009 y SUP-S00-015. */
export function corregirConfiguracion(staging) {
  const cambios = [];
  const raizPkg = join(staging, "package.json");
  if (existsSync(raizPkg)) {
    const p = jsonDe(raizPkg);
    p.name = "adhara-fit";
    p.scripts = { ...p.scripts, typecheck: "turbo run typecheck", test: "turbo run test" };
    delete p.scripts["actualizar-tasa"];
    guardarJson(raizPkg, p);
    cambios.push("package.json raíz: se renombra a adhara-fit, se quita actualizar-tasa y se añaden typecheck y test");
  }
  const turbo = join(staging, "turbo.json");
  if (existsSync(turbo)) {
    const t = jsonDe(turbo);
    t.tasks.typecheck = { dependsOn: ["^build"] };
    guardarJson(turbo, t);
    cambios.push("turbo.json: tarea typecheck");
  }
  for (const app of ["web-admin", "kiosk", "vitrina"]) {
    const f = join(staging, "apps", app, "package.json");
    if (existsSync(f)) {
      const p = jsonDe(f);
      p.scripts = { ...p.scripts, typecheck: "tsc --noEmit" };
      guardarJson(f, p);
      cambios.push(`apps/${app}/package.json: script typecheck (tsc --noEmit)`);
    }
  }
  const db = join(staging, "packages/db/package.json");
  if (existsSync(db)) {
    const p = jsonDe(db);
    delete p.scripts["db:seed"];
    p.scripts.test = "vitest run --passWithNoTests";
    guardarJson(db, p);
    cambios.push("packages/db/package.json: se quita db:seed y test pasa a vitest run --passWithNoTests");
  }
  const cfg = join(staging, "packages/db/prisma7.config.ts");
  if (existsSync(cfg)) {
    const antes = texto(cfg);
    const despues = antes.replace(/^\s*seed:\s*"[^"]*",?\r?\n/m, "");
    if (antes !== despues) { writeFileSync(cfg, despues); cambios.push("packages/db/prisma7.config.ts: se quita la referencia a prisma/seed.ts"); }
  }
  // Scripts que aún apuntan a archivos o apps excluidos
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    const rotos = scriptsRotos(staging, listarArchivos(staging));
    if (!rotos.length) break;
    for (const { archivo, script, ref } of rotos) {
      const f = join(staging, archivo);
      const p = jsonDe(f);
      if (p.scripts?.[script] === undefined) continue;
      delete p.scripts[script];
      guardarJson(f, p);
      cambios.push(`${archivo}: se quita el script ${script} (apuntaba a ${ref})`);
    }
  }
  return cambios;
}

function paquetesDelLock(raiz) {
  const f = join(raiz, "package-lock.json");
  return existsSync(f) ? Object.keys(jsonDe(f).packages ?? {}) : [];
}

export function regenerarLockfile(staging, ejecutar = sh) {
  const antes = new Set(paquetesDelLock(staging));
  const r = ejecutar("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: staging });
  if (r.status !== 0) throw new ErrorImportacion(`npm install --package-lock-only falló: ${(r.stderr || r.stdout || "").slice(0, 400)}`);
  const despues = new Set(paquetesDelLock(staging));
  return { quitados: [...antes].filter((x) => !despues.has(x)), agregados: [...despues].filter((x) => !antes.has(x)) };
}

export function ejecutarGitleaks(staging, destino, ejecutar = sh) {
  const config = join(destino, ".gitleaks.toml");
  const args = ["detect", "--no-git", "--source", staging, "--redact", "--exit-code", "1"];
  if (existsSync(config)) args.push("--config", config);
  const r = ejecutar("gitleaks", args);
  if (r.error?.code === "ENOENT") return { estado: "no-instalado", detalle: "gitleaks no está instalado" };
  return r.status === 0 ? { estado: "limpio" } : { estado: "hallazgos", detalle: (r.stdout || r.stderr || "").slice(0, 2000) };
}

const EXT_DATOS = /\.(csv|xlsx?|xlsm|sql|txt|json|tsv)$/i;
const NO_DATOS = /(^|\/)(package(-lock)?|tsconfig[^/]*|turbo|components|capacitor\.config|manifest|\.eslintrc[^/]*)\.json$/i;

export function archivosDeDatos(staging) {
  return listarArchivos(staging).filter((f) => /^(apps|packages)\//.test(f) && EXT_DATOS.test(f) && !NO_DATOS.test(f) && !/\/(assets|public)\//.test(f));
}

/** Verificación de REQ-S00-015: npm ci, tipos y build frente a la línea base. */
export function verificarConstruccion(staging, ejecutar = sh) {
  const resultados = [];
  const ci = ejecutar("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: staging });
  resultados.push({ paso: "npm ci", ok: ci.status === 0, detalle: ci.status === 0 ? "" : (ci.stderr || "").slice(-600) });
  if (ci.status !== 0) return resultados;
  const gen = ejecutar("npx", ["prisma", "generate", "--config", "prisma7.config.ts"], { cwd: join(staging, "packages/db"), env: { ...process.env, DATABASE_URL: "postgresql://u:p@localhost:5432/x" } });
  resultados.push({ paso: "prisma generate", ok: gen.status === 0, detalle: gen.status === 0 ? "" : (gen.stderr || gen.stdout || "").slice(-600) });
  for (const [app, base] of Object.entries(BASE_TSC)) {
    const r = ejecutar("npx", ["tsc", "--noEmit"], { cwd: join(staging, "apps", app) });
    const n = ((r.stdout || "") + (r.stderr || "")).split("\n").filter((l) => /error TS\d+/.test(l)).length;
    resultados.push({ paso: `tsc --noEmit (${app})`, ok: n <= base, detalle: `${n} errores (línea base ${base})` });
  }
  for (const app of ["web-admin", "kiosk"]) {
    const r = ejecutar("npx", ["turbo", "run", "build", `--filter=${app}`], { cwd: staging });
    resultados.push({ paso: `build (${app})`, ok: r.status === 0, detalle: r.status === 0 ? "" : ((r.stdout || "") + (r.stderr || "")).slice(-600) });
  }
  return resultados;
}

export function escribirInforme(ruta, d) {
  const lista = (xs, vacio = "- ninguno") => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : vacio);
  const porMotivo = new Map();
  for (const { ruta: r, motivo } of d.excluidos) porMotivo.set(motivo, (porMotivo.get(motivo) ?? 0) + 1);
  const t = `# Informe de importación del Repo A

Fecha: ${d.fecha}. Origen: \`${d.sha}\` del Repo A, exportado con \`git archive\` (sin historia).
Estado: **${d.error ? "FALLÓ" : "listo para el commit de importación"}**.
${d.error ? `\n## Error\n\n${d.error}\n` : ""}
## 1. Exclusiones aplicadas
${lista([...porMotivo].map(([m, n]) => `${m}: ${n}`))}

## 2. Archivos de datos conservados (el propietario revisa esta lista)
${lista(d.datos)}

## 3. Lista de permitidos de packages/db
${lista(PERMITIDOS_DB)}

## 4. Cambios de configuración
${lista(d.cambios)}

## 5. Cambios al lockfile
- Paquetes quitados: ${d.lock.quitados.length}
- Paquetes agregados: ${d.lock.agregados.length}
${lista(d.lock.quitados.slice(0, 40).map((x) => `quitado: ${x}`), "")}

## 6. gitleaks
${d.gitleaks.estado}${d.gitleaks.detalle ? `: ${d.gitleaks.detalle}` : ""}

## 7. Verificación de construcción
${lista(d.verificacion.map((v) => `${v.ok ? "OK" : "FALLA"} — ${v.paso}${v.detalle ? ` — ${v.detalle.replace(/\n/g, " ").slice(0, 300)}` : ""}`), "- no ejecutada")}
`;
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, t);
}

function copiarAlDestino(staging, destino) {
  const copiados = [];
  const recorrer = (rel) => {
    for (const n of readdirSync(join(staging, rel))) {
      const r = rel ? `${rel}/${n}` : n;
      if (statSync(join(staging, r)).isDirectory()) { recorrer(r); continue; }
      if (r === ".gitignore") { cpSync(join(staging, r), join(destino, r)); copiados.push(r); continue; }
      if (PROPIOS.includes(r.split("/")[0]) && r.split("/")[0] !== "docs") continue;
      mkdirSync(dirname(join(destino, r)), { recursive: true });
      cpSync(join(staging, r), join(destino, r));
      copiados.push(r);
    }
  };
  recorrer("");
  return copiados;
}

export async function importar(op) {
  const { repoA, destino = process.cwd(), sha = SHA_REPO_A, privacidad = null, clientePrivacidad = clienteGhPorDefecto,
    verificar = false, omitirGitleaks = false, sinLockfile = false, ejecutar = sh, log = console.log } = op;
  comprobarPrecondiciones({ repoA, destino, sha });
  if (privacidad) await comprobarPrivacidad(privacidad, clientePrivacidad);
  const staging = mkdtempSync(join(tmpdir(), "importar-repo-a-"));
  const informe = { fecha: new Date().toISOString().slice(0, 10), sha, excluidos: [], datos: [], cambios: [], lock: { quitados: [], agregados: [] }, gitleaks: { estado: "no ejecutado" }, verificacion: [], error: null };
  const rutaInforme = join(destino, "docs/informe-importacion.md");
  try {
    exportar(repoA, sha, staging);
    informe.excluidos = aplicarExclusiones(staging, destino).excluidos;
    informe.cambios = corregirConfiguracion(staging);
    const errApps = verificarApps(staging);
    if (errApps.length) throw new ErrorImportacion(`El árbol recortado no coincide con apps y workspaces: ${errApps.join("; ")}`);
    if (!sinLockfile) informe.lock = regenerarLockfile(staging, ejecutar);
    informe.datos = archivosDeDatos(staging);
    informe.gitleaks = omitirGitleaks ? { estado: "omitido por --omitir-gitleaks" } : ejecutarGitleaks(staging, destino, ejecutar);
    if (informe.gitleaks.estado === "hallazgos") throw new ErrorImportacion("gitleaks detectó secretos en el árbol; se detiene la importación.");
    if (informe.gitleaks.estado === "no-instalado") throw new ErrorImportacion("gitleaks no está instalado: instálalo o usa --omitir-gitleaks (solo en pruebas).");
    if (verificar) {
      informe.verificacion = verificarConstruccion(staging, ejecutar);
      const fallos = informe.verificacion.filter((v) => !v.ok);
      if (fallos.length) throw new ErrorImportacion(`La verificación de construcción falló en: ${fallos.map((f) => f.paso).join(", ")}`);
    }
    escribirInforme(rutaInforme, informe);
    const copiados = copiarAlDestino(staging, destino);
    log(`Importación lista: ${copiados.length} archivos copiados. Informe: docs/informe-importacion.md`);
    log(`Mensaje propuesto: ${MENSAJE_COMMIT}`);
    return { copiados, informe };
  } catch (e) {
    informe.error = e.message;
    try { escribirInforme(rutaInforme, informe); } catch { throw new ErrorImportacion(`${e.message} Además no se pudo escribir docs/informe-importacion.md.`); }
    throw e;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

function argumentos(argv) {
  const op = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo-a") op.repoA = resolve(argv[++i]);
    else if (a === "--sha") op.sha = argv[++i];
    else if (a === "--destino") op.destino = resolve(argv[++i]);
    else if (a === "--comprobar-privacidad") op.privacidad = argv[++i];
    else if (a === "--verificar") op.verificar = true;
    else if (a === "--omitir-gitleaks") op.omitirGitleaks = true;
    else if (a === "--sin-lockfile") op.sinLockfile = true;
    else throw new ErrorImportacion(`Opción desconocida: ${a}`);
  }
  return op;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  importar(argumentos(process.argv.slice(2))).catch((e) => { console.error(`importar-repo-a: ${e.message}`); process.exit(1); });
}
