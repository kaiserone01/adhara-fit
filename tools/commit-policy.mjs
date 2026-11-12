#!/usr/bin/env node
// Política de commits de Adhara Fit — ÚNICA fuente de los patrones prohibidos.
// La usan: .githooks/*, .claude/hooks/guard-bash.mjs, el CI (politica.yml) y el autotest.
// Sin dependencias. Texto de reglas: CLAUDE.md §1 y docs/adr/ADR-014 (propuesto).

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const MAX_SUBJECT = 100;

// Patrones prohibidos en cualquier texto publicado (commits, PRs, comentarios, mensajes).
export const FORBIDDEN_TEXT = [
  { id: 'coautor-ia', re: /co-authored-by\s*:[^\n]*(claude|anthropic)/i, msg: 'trailer Co-authored-by con Claude/Anthropic' },
  { id: 'correo-anthropic', re: /noreply@anthropic\.com/i, msg: 'correo noreply de Anthropic' },
  { id: 'claude-session', re: /claude-session\s*:/i, msg: 'trailer Claude-Session' },
  { id: 'generado-con', re: /generated\s+with\s+\[?\s*claude/i, msg: 'leyenda "Generated with Claude Code"' },
  { id: 'robot', re: /\u{1F916}/u, msg: 'emoji de robot' },
  { id: 'url-sesion', re: /claude\.ai\/code\/(session|artifact)\S*/i, msg: 'URL de sesión de Claude' },
  { id: 'id-sesion', re: /\bsession_[0-9A-Za-z]{10,}\b/, msg: 'ID de sesión' },
];

// Adicional solo para mensajes de commit: ningún trailer de coautoría ni firma de tercero.
export const FORBIDDEN_COMMIT_ONLY = [
  { id: 'coautor-cualquiera', re: /^\s*co-authored-by\s*:/im, msg: 'trailer Co-authored-by (los commits no llevan trailers)' },
  { id: 'signed-off-by', re: /^\s*signed-off-by\s*:/im, msg: 'trailer Signed-off-by (los commits no llevan trailers)' },
];

// Secretos en líneas añadidas (pre-commit). Se construyen sin que el fuente se auto-detecte.
export const SECRET_PATTERNS = [
  { id: 'token-github', re: /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/, msg: 'token de GitHub' },
  { id: 'clave-privada', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, msg: 'clave privada' },
  { id: 'aws', re: /\bAKIA[0-9A-Z]{16}\b/, msg: 'clave de acceso AWS' },
];

// Archivos que nunca se versionan (ADR-005).
export const FORBIDDEN_FILES = [
  { id: 'keystore', re: /(^|\/)[^/]*\.keystore$/i, msg: '*.keystore' },
  { id: 'cookies', re: /(^|\/)cookies\.txt$/i, msg: 'cookies.txt' },
  { id: 'env', re: /(^|\/)\.env(\.(?!example$)[^/]*)?$/i, msg: '.env (solo .env.example)' },
  { id: 'pem', re: /(^|\/)[^/]*\.pem$/i, msg: '*.pem' },
  { id: 'settings-local', re: /(^|\/)\.claude\/settings\.local\.json$/i, msg: '.claude/settings.local.json' },
];

function scan(text, list) {
  const out = [];
  for (const { id, re, msg } of list) if (re.test(text)) out.push({ id, msg });
  return out;
}

/** Texto libre (PR, comentario, mensaje): solo patrones de §1. */
export function checkText(text) {
  return scan(String(text ?? ''), FORBIDDEN_TEXT);
}

/** Mensaje de commit: una sola línea, ≤ 100, sin trailers ni patrones prohibidos. */
export function checkCommitMessage(raw) {
  const violations = [];
  const lines = String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => !l.startsWith('#')); // comentarios de la plantilla de git
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  while (lines.length && lines[0].trim() === '') lines.shift();

  if (lines.length === 0) violations.push({ id: 'vacio', msg: 'mensaje vacío' });
  if (lines.length > 1) {
    violations.push({ id: 'multilinea', msg: `el mensaje debe ser UNA línea (tiene ${lines.length}; sin cuerpo, sin líneas en blanco, sin trailers)` });
  }
  const subject = lines[0] ?? '';
  const len = [...subject].length;
  if (len > MAX_SUBJECT) violations.push({ id: 'largo', msg: `la línea mide ${len} caracteres (máximo ${MAX_SUBJECT})` });

  const body = lines.join('\n');
  violations.push(...scan(body, FORBIDDEN_TEXT), ...scan(body, FORBIDDEN_COMMIT_ONLY));
  return dedupe(violations);
}

export function checkStagedFiles(paths) {
  const out = [];
  for (const p of paths) for (const { id, re, msg } of FORBIDDEN_FILES) if (re.test(p)) out.push({ id, msg: `${p}: no se versiona ${msg}` });
  return out;
}

export function checkAddedLines(text) {
  return scan(text, SECRET_PATTERNS);
}

function dedupe(v) {
  const seen = new Set();
  return v.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
}

export function format(violations, prefix = 'commit-policy') {
  return violations.map((v) => `  - [${prefix}:${v.id}] ${v.msg}`).join('\n');
}

// ---------- CLI ----------
function main(argv) {
  const [flag, value] = argv;
  let bad = 0;
  if (flag === '--message-file') {
    const v = checkCommitMessage(readFileSync(value, 'utf8'));
    if (v.length) { console.error(`Mensaje de commit rechazado:\n${format(v)}`); bad = 1; }
  } else if (flag === '--text-file') {
    const v = checkText(readFileSync(value === '-' ? 0 : value, 'utf8'));
    if (v.length) { console.error(`Texto rechazado:\n${format(v)}`); bad = 1; }
  } else if (flag === '--range') {
    const raw = execFileSync('git', ['log', '--no-merges', '--format=%H%x1f%B%x1e', value], { encoding: 'utf8' });
    for (const rec of raw.split('\x1e').map((r) => r.trim()).filter(Boolean)) {
      const [sha, msg] = rec.split('\x1f');
      const v = checkCommitMessage(msg);
      if (v.length) { console.error(`Commit ${sha.slice(0, 10)} rechazado:\n${format(v)}`); bad = 1; }
    }
  } else {
    console.error('Uso: commit-policy.mjs --message-file <f> | --text-file <f|-> | --range <rev-range>');
    return 2;
  }
  if (!bad) console.log('commit-policy: OK');
  return bad;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main(process.argv.slice(2)));
