#!/usr/bin/env node
// pre-push: mensajes conformes en todos los commits del rango (firma y handoff.md solo avisan).
// Firmas SSH: ver docs/ops/firma-commits.md (git necesita gpg.ssh.allowedSignersFile para dar "G").
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { checkCommitMessage, format } from '../commit-policy.mjs';

const ZERO = /^0+$/;
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();

/**
 * commits: [{ sha, sig, subject, message, files, authorEmail, committerEmail }]
 * Devuelve la lista de errores (vacía = OK).
 */
export function checkRange(commits, { ownerEmail = '', strict = false } = {}) {
  const errors = [];
  if (commits.length === 0) return errors;
  for (const c of commits) {
    const id = c.sha.slice(0, 10);
    const v = checkCommitMessage(c.message);
    if (v.length) errors.push(`commit ${id}: mensaje rechazado\n${format(v)}`);
    if (strict) errors.push(...avisosCommit(c, ownerEmail));
  }
  return errors;
}

/** Modo ágil (2026-11-13): que handoff.md no cambie en el rango es solo un aviso, no bloquea el push. */
export function avisoHandoff(commits) {
  return commits.length > 0 && !commits.some((c) => c.files.includes('handoff.md'))
    ? ['handoff.md no cambió en lo que se sube: anota qué funcionó y qué no al cerrar la sesión']
    : [];
}

/** Firma e identidad: desde 2026-11-12 (reglas 1 y 2 anuladas por el propietario) son avisos; con ADHARA_STRICT=1 son errores. */
function avisosCommit(c, ownerEmail) {
  const out = [];
  const id = c.sha.slice(0, 10);
  if (!['G', 'U'].includes(c.sig)) out.push(`commit ${id}: firma no válida (%G?=${c.sig}); ver docs/ops/firma-commits.md`);
  if (ownerEmail && (c.authorEmail !== ownerEmail || c.committerEmail !== ownerEmail)) {
    out.push(`commit ${id}: autor o committer distinto del propietario (adhara.ownerEmail)`);
  }
  return out;
}

export function avisosRange(commits, { ownerEmail = '' } = {}) {
  return commits.flatMap((c) => avisosCommit(c, ownerEmail));
}

function readCommits(revs) {
  const raw = git('log', '--no-merges', '--format=%H%x1f%G?%x1f%ae%x1f%ce%x1f%B%x1e', ...revs);
  return raw.split('\x1e').map((r) => r.trim()).filter(Boolean).map((rec) => {
    const [sha, sig, authorEmail, committerEmail, message] = rec.split('\x1f');
    const files = git('diff-tree', '--no-commit-id', '--name-only', '-r', '--root', sha).split('\n').filter(Boolean);
    return { sha, sig, authorEmail, committerEmail, message, files };
  });
}

function main() {
  const ownerEmail = (() => { try { return git('config', '--get', 'adhara.ownerEmail'); } catch { return ''; } })();
  const strict = process.env.ADHARA_STRICT === '1';
  const lines = readFileSync(0, 'utf8').split('\n').filter(Boolean);
  const errors = [];
  for (const line of lines) {
    const [, localSha, remoteRef, remoteSha] = line.split(' ');
    if (ZERO.test(localSha)) continue; // borrado de rama remota: nada que revisar
    const revs = ZERO.test(remoteSha) ? [localSha, '--not', '--remotes'] : [`${remoteSha}..${localSha}`];
    const commits = readCommits(revs);
    errors.push(...checkRange(commits, { ownerEmail, strict }).map((e) => `${remoteRef}: ${e}`));
    if (!strict) for (const w of avisosRange(commits, { ownerEmail })) console.error(`pre-push: AVISO ${w}`);
    for (const w of avisoHandoff(commits)) console.error(`pre-push: AVISO ${w}`);
  }
  if (errors.length) {
    console.error(`pre-push: push rechazado\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
