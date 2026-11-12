#!/usr/bin/env node
// commit-msg: una sola línea, ≤ 100 caracteres, sin trailers ni patrones prohibidos.
import { readFileSync } from 'node:fs';
import { checkCommitMessage, format } from '../commit-policy.mjs';

const file = process.argv[2];
if (!file) { console.error('commit-msg: falta el archivo de mensaje'); process.exit(2); }
const v = checkCommitMessage(readFileSync(file, 'utf8'));
if (v.length) {
  console.error(`commit-msg: mensaje rechazado\n${format(v)}\nFormato: español, una línea, imperativo, ≤ 100 caracteres, sin trailers.`);
  process.exit(1);
}
