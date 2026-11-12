#!/usr/bin/env node
// pre-push: todos los commits del rango con firma válida, mensajes conformes y handoff.md modificado.
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
export function checkRange(commits, { ownerEmail = '' } = {}) {
  const errors = [];
  if (commits.length === 0) return errors;
  for (const c of commits) {
    const id = c.sha.slice(0, 10);
    if (!['G', 'U'].includes(c.sig)) errors.push(`commit ${id}: firma no válida (%G?=${c.sig}); ver docs/ops/firma-commits.md`);
    const v = checkCommitMessage(c.message);
    if (v.length) errors.push(`commit ${id}: mensaje rechazado\n${format(v)}`);
    if (ownerEmail && (c.authorEmail !== ownerEmail || c.committerEmail !== ownerEmail)) {
      errors.push(`commit ${id}: autor o committer distinto del propietario (adhara.ownerEmail)`);
    }
  }
  if (!commits.some((c) => c.files.includes('handoff.md'))) {
    errors.push('handoff.md no fue modificado en el rango que se sube (protocolo de cierre, CLAUDE.md §Cierre)');
  }
  return errors;
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
  const lines = readFileSync(0, 'utf8').split('\n').filter(Boolean);
  const errors = [];
  for (const line of lines) {
    const [, localSha, remoteRef, remoteSha] = line.split(' ');
    if (ZERO.test(localSha)) continue; // borrado de rama remota: nada que revisar
    const revs = ZERO.test(remoteSha) ? [localSha, '--not', '--remotes'] : [`${remoteSha}..${localSha}`];
    errors.push(...checkRange(readCommits(revs), { ownerEmail }).map((e) => `${remoteRef}: ${e}`));
  }
  if (errors.length) {
    console.error(`pre-push: push rechazado\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
