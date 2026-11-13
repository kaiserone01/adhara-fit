#!/usr/bin/env node
// Falla si `npm audit` encuentra avisos high o critical que no figuran en docs/linea-base-audit.json (S-00, REQ-S00-016).
// Uso: node tools/auditar-npm.mjs [--entrada audit.json]   (sin --entrada ejecuta `npm audit --json`)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SEVERIDADES = new Set(["high", "critical"]);

/** Identificadores (source) de los avisos de un paquete: los `via` que son objetos. */
function idsDe(vuln) {
  return (vuln.via ?? []).filter((v) => typeof v === "object" && v.source !== undefined).map((v) => String(v.source));
}

/** Devuelve los avisos high/critical nuevos: [{ paquete, severidad, ids }]. */
export function avisosNuevos(audit, baseline) {
  const conocidos = new Map((baseline.avisos_high_critical ?? []).map((a) => [a.paquete, new Set((a.ids ?? []).map(String))]));
  const nuevos = [];
  for (const [paquete, v] of Object.entries(audit.vulnerabilities ?? {})) {
    if (!SEVERIDADES.has(v.severity)) continue;
    if (!conocidos.has(paquete)) { nuevos.push({ paquete, severidad: v.severity, ids: idsDe(v) }); continue; }
    const base = conocidos.get(paquete);
    const extra = idsDe(v).filter((id) => !base.has(id));
    if (extra.length) nuevos.push({ paquete, severidad: v.severity, ids: extra });
  }
  return nuevos;
}

/**
 * Ejecuta `npm audit --json` y devuelve su stdout. `npm audit` sale con código 1 cuando hay
 * vulnerabilidades y aun así imprime JSON válido: eso NO es un error. Solo falla si no hay salida.
 * En Windows npm es `npm.cmd`, que Node no lanza sin shell; con shell se pasa el comando como una
 * sola cadena (con args y shell Node 24 avisa DEP0190). `spawn` y `plataforma` son inyectables.
 */
export function ejecutarAuditoria(raiz, { spawn = spawnSync, plataforma = process.platform } = {}) {
  const opciones = { cwd: raiz, encoding: "utf8", maxBuffer: 1 << 28, shell: plataforma === "win32" };
  const r = plataforma === "win32" ? spawn("npm audit --json", [], opciones) : spawn("npm", ["audit", "--json"], opciones);
  if (r.error || typeof r.stdout !== "string" || r.stdout.trim() === "") {
    const motivo = r.error ? r.error.message : `sin salida (código ${r.status ?? "desconocido"})`;
    throw new Error(`auditar-npm: no se pudo ejecutar «npm audit --json»: ${motivo}. Revise que npm esté en el PATH y que haya red.`);
  }
  return r.stdout;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const i = process.argv.indexOf("--entrada");
  let nuevos;
  try {
    const crudo = i > 0 ? readFileSync(process.argv[i + 1], "utf8") : ejecutarAuditoria(raiz);
    const baseline = JSON.parse(readFileSync(join(raiz, "docs/linea-base-audit.json"), "utf8"));
    nuevos = avisosNuevos(JSON.parse(crudo), baseline);
  } catch (e) {
    console.error(e.message.startsWith("auditar-npm:") ? e.message : `auditar-npm: ${e.message}`);
    process.exit(2);
  }
  if (nuevos.length) {
    console.error(nuevos.map((n) => `auditar-npm: aviso ${n.severidad} nuevo en ${n.paquete} (${n.ids.join(", ") || "sin identificador"})`).join("\n"));
    process.exit(1);
  }
  console.log("auditar-npm: sin avisos high o critical fuera de la línea base");
}
