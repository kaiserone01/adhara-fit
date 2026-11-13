#!/usr/bin/env node
// pre-commit: identidad y firma (avisos), archivos y secretos prohibidos.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { checkStagedFiles, checkAddedLines, format } from '../commit-policy.mjs';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const gitSafe = (...a) => { try { return git(...a); } catch { return ''; } };

const emailOf = (ident) => (ident.match(/<([^>]*)>/) ?? [])[1] ?? '';

/**
 * Evalúa identidad y firma. Devuelve { errors, warnings }.
 * ownerEmail = valor de `adhara.ownerEmail` (lo configura el propietario, nunca el agente).
 */
export function checkIdentity({ ownerEmail, authorIdent, committerIdent, gpgsign, strict }) {
  // Desde 2026-11-12 el propietario anuló las reglas 1 y 2 (firma e identidad del propietario): por defecto
  // son avisos. Con ADHARA_STRICT=1 vuelven a ser errores (sesión local con identidad y firma del propietario).
  const errors = [];
  const warnings = [];
  const sink = strict ? errors : warnings;
  if (gpgsign !== 'true') sink.push('commit.gpgsign no es "true": el commit no irá firmado');
  if (!ownerEmail) {
    sink.push('adhara.ownerEmail no está definido: no se puede verificar que autor y committer sean el propietario');
  } else {
    if (emailOf(authorIdent) !== ownerEmail) sink.push('el autor del commit no es el propietario (adhara.ownerEmail)');
    if (emailOf(committerIdent) !== ownerEmail) sink.push('el committer del commit no es el propietario (adhara.ownerEmail)');
  }
  return { errors, warnings };
}

function main() {
  const errors = [];

  const ident = checkIdentity({
    ownerEmail: gitSafe('config', '--get', 'adhara.ownerEmail'),
    authorIdent: gitSafe('var', 'GIT_AUTHOR_IDENT'),
    committerIdent: gitSafe('var', 'GIT_COMMITTER_IDENT'),
    gpgsign: gitSafe('config', '--get', 'commit.gpgsign'),
    strict: process.env.ADHARA_STRICT === '1',
  });
  errors.push(...ident.errors.map((m) => `  - [identidad] ${m}`));
  for (const w of ident.warnings) console.error(`pre-commit: AVISO ${w}`);

  const staged = gitSafe('diff', '--cached', '--name-only', '--diff-filter=ACMR').split('\n').filter(Boolean);
  const files = checkStagedFiles(staged);
  if (files.length) errors.push(format(files, 'archivo'));

  const added = gitSafe('diff', '--cached', '-U0', '--no-color')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
  const secrets = checkAddedLines(added);
  if (secrets.length) errors.push(format(secrets, 'secreto'));

  // Modo ágil (2026-11-13): spec-lint ya no bloquea el commit; se corre a mano con `node tools/spec-lint.mjs`.
  if (errors.length) {
    console.error(`pre-commit: commit rechazado\n${errors.join('\n')}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
