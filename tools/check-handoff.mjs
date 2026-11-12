#!/usr/bin/env node
// Valida handoff.md: 5 secciones exactas, sin datos personales y con la sección 4 "solo añadir".
// Uso: node tools/check-handoff.mjs [ruta]   (por defecto handoff.md en la raíz del repo)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const HEADINGS = [
  '# Handoff — Adhara Fit',
  '## 1. Objetivo',
  '## 2. Estado actual',
  '## 3. Archivos y cambios',
  '## 4. Intentos fallidos',
  '## 5. Próximos pasos',
];

const PROHIBIDO = [
  { id: 'correo', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, msg: 'contiene un correo' },
  { id: 'token', re: /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/, msg: 'contiene un token' },
  { id: 'url-sesion', re: /claude\.ai\/code\/\S+|\bsession_[0-9A-Za-z]{10,}\b/i, msg: 'contiene una URL o ID de sesión' },
  { id: 'ruta-home', re: /(^|[\s`'"(])(\/home\/[^\s/]+|\/root\b|\/Users\/[^\s/]+|C:\\Users\\[^\s\\]+|~\/\.)/, msg: 'contiene una ruta del directorio personal' },
];

/** Devuelve el texto de la sección que empieza en `heading` (sin el encabezado). */
export function section(text, heading) {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.trim() === heading);
  if (i < 0) return null;
  let j = i + 1;
  while (j < lines.length && !/^#{1,2} /.test(lines[j])) j++;
  return lines.slice(i + 1, j);
}

/** Todas las líneas no vacías de `antes` deben seguir en `despues`, en el mismo orden (solo se añade). */
export function esSoloAnadir(antes, despues) {
  const a = antes.filter((l) => l.trim() !== '');
  const d = despues.filter((l) => l.trim() !== '');
  let k = 0;
  for (const l of d) if (k < a.length && l === a[k]) k++;
  return k === a.length ? [] : [a[k]];
}

export function check(text, previo = null) {
  const errors = [];
  const heads = text.split('\n').map((l) => l.trim()).filter((l) => /^#{1,2} /.test(l));
  if (JSON.stringify(heads) !== JSON.stringify(HEADINGS)) {
    errors.push(`las secciones deben ser exactamente, en orden: ${HEADINGS.join(' | ')} (hay: ${heads.join(' | ') || 'ninguna'})`);
  }
  for (const { id, re, msg } of PROHIBIDO) if (re.test(text)) errors.push(`${id}: el handoff ${msg}`);
  const s5 = section(text, HEADINGS[5]);
  if (s5) {
    const first = s5.find((l) => l.trim() !== '') ?? '';
    if (!/^1\.\s+leer handoff\.md y ejecutar \/preflight\b/i.test(first.trim())) errors.push('el ítem 1 de "Próximos pasos" debe ser "leer handoff.md y ejecutar /preflight"');
  }
  if (previo !== null) {
    const antes = section(previo, HEADINGS[4]);
    const despues = section(text, HEADINGS[4]);
    if (antes && despues) {
      const faltan = esSoloAnadir(antes, despues);
      if (faltan.length) errors.push(`la sección 4 es solo-añadir: se perdió o cambió la línea «${faltan[0].slice(0, 80)}»`);
    }
  }
  return errors;
}

function main() {
  const path = process.argv[2] ?? 'handoff.md';
  let text;
  try { text = readFileSync(path, 'utf8'); } catch { console.error(`check-handoff: no existe ${path}`); return 1; }
  let previo = null;
  try { previo = execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { /* sin HEAD o archivo nuevo */ }
  const errors = check(text, previo);
  if (errors.length) { console.error(`check-handoff: FALLA\n${errors.map((e) => `  - ${e}`).join('\n')}`); return 1; }
  console.log(`check-handoff: OK (${previo === null ? 'sin versión previa en HEAD' : 'sección 4 conserva HEAD'})`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main());
