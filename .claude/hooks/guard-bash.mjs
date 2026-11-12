#!/usr/bin/env node
// Hook PreToolUse sobre Bash. Lee el JSON del hook por stdin, inspecciona el comando COMPLETO
// (incluye heredocs y cuerpos de `gh pr create/edit`) y bloquea con código 2 + mensaje en stderr.
// Los patrones de `permissions` sobre Bash son frágiles: ESTA es la defensa real. No se rodea; se reporta.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { FORBIDDEN_TEXT, FORBIDDEN_COMMIT_ONLY } from '../../tools/commit-policy.mjs';

const PROTECTED_CONFIG = /^(user\.|gpg\.|commit\.gpgsign|credential\.|adhara\.|core\.hookspath|core\.sshcommand|url\.|http\.)/i;
const READ_FLAGS = new Set(['--get', '--get-all', '--get-regexp', '--get-urlmatch', '--list', '-l', '--show-origin', '--show-scope', '--name-only']);
const WRITE_FLAGS = new Set(['--unset', '--unset-all', '--add', '--replace-all', '--rename-section', '--remove-section', '--edit', '-e']);

// ---------- análisis de shell (aproximado, a propósito conservador) ----------
export function splitSegments(cmd) {
  const segs = [];
  let cur = '';
  let q = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) {
      cur += c;
      if (c === '\\' && q === '"') { cur += cmd[++i] ?? ''; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '\\') { cur += c + (cmd[++i] ?? ''); continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '\n' || c === ';' || c === '|' || c === '&') {
      if ((c === '|' || c === '&') && cmd[i + 1] === c) i++;
      segs.push(cur); cur = ''; continue;
    }
    cur += c;
  }
  segs.push(cur);
  return segs.map((s) => s.trim()).filter(Boolean);
}

export function tokenize(seg) {
  const toks = [];
  let cur = '';
  let has = false;
  let q = null;
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (q) {
      if (c === '\\' && q === '"' && i + 1 < seg.length) { cur += seg[++i]; continue; }
      if (c === q) { q = null; continue; }
      cur += c; continue;
    }
    if (c === '\\' && i + 1 < seg.length) { cur += seg[++i]; has = true; continue; }
    if (c === '"' || c === "'") { q = c; has = true; continue; }
    if (/\s/.test(c)) { if (has || cur) { toks.push(cur); cur = ''; has = false; } continue; }
    cur += c; has = true;
  }
  if (has || cur) toks.push(cur);
  return toks;
}

/** Devuelve { sub, args, globalC } para un segmento que invoca git, o null. */
function parseGit(tokens) {
  let i = 0;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++; // VAR=valor git ...
  if (tokens[i] === 'env') { i++; while (i < tokens.length && (/^-/.test(tokens[i]) || /=/.test(tokens[i]))) i++; }
  if (tokens[i] === 'command' || tokens[i] === 'sudo' || tokens[i] === 'exec') i++;
  if (!tokens[i] || !/(^|\/)git$/.test(tokens[i])) return null;
  i++;
  const globalC = [];
  for (; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '-c') { globalC.push(tokens[++i] ?? ''); continue; }
    if (t.startsWith('-c') && t.length > 2 && !t.startsWith('--')) { globalC.push(t.slice(2)); continue; }
    if (t === '-C' || t === '--git-dir' || t === '--work-tree' || t === '--namespace' || t === '--exec-path') { i++; continue; }
    if (t.startsWith('-')) continue; // --no-pager, -P, --git-dir=...
    break;
  }
  return { sub: tokens[i] ?? '', args: tokens.slice(i + 1), globalC };
}

const hasShortFlag = (args, letter) => args.some((a) => /^-[A-Za-z]+$/.test(a) && a.includes(letter));
const hasLong = (args, name) => args.some((a) => a === name || a.startsWith(`${name}=`));

function checkGit(g, out) {
  const { sub, args, globalC } = g;
  for (const kv of globalC) {
    if (PROTECTED_CONFIG.test(kv.split('=')[0])) {
      out.push(['config-global', `git -c ${kv.split('=')[0]}=… no está permitido (identidad, firma, credenciales y hooks son del propietario)`]);
    }
  }
  if (sub === 'commit') {
    if (hasLong(args, '--no-verify') || hasShortFlag(args, 'n')) out.push(['no-verify', 'git commit --no-verify/-n está prohibido: no se rodean los hooks']);
    if (hasLong(args, '--no-gpg-sign')) out.push(['no-gpg-sign', 'git commit --no-gpg-sign está prohibido: los commits van firmados']);
    if (hasLong(args, '--author')) out.push(['author', 'git commit --author está prohibido: el autor es el propietario']);
    if (hasLong(args, '--reset-author')) out.push(['reset-author', 'git commit --reset-author está prohibido']);
    if (hasLong(args, '--signoff') || hasShortFlag(args, 's') || hasLong(args, '--trailer')) out.push(['trailer', 'los commits no llevan trailers (--signoff/-s/--trailer prohibidos)']);
    const nMsg = args.filter((a) => a === '-m' || a === '--message' || a.startsWith('--message=') || (/^-[A-Za-z]*m$/.test(a))).length;
    if (nMsg > 1) out.push(['multi-m', 'varios -m crean cuerpo en el mensaje: debe ser UNA línea']);
  }
  if (sub === 'commit-tree') out.push(['commit-tree', 'git commit-tree evita los hooks de commit']);
  if (sub === 'credential' || sub === 'credential-store' || sub === 'credential-cache') out.push(['credential', 'git credential está prohibido: las credenciales son del propietario']);
  if (sub === 'push') {
    if (args.some((a) => /^--force/.test(a) || a === '--mirror') || hasShortFlag(args, 'f')) out.push(['force-push', 'git push --force/-f/--force-with-lease/--mirror está prohibido']);
    if (hasLong(args, '--no-verify')) out.push(['no-verify', 'git push --no-verify está prohibido: no se rodean los hooks']);
    if (args.some((a) => /^\+\S/.test(a))) out.push(['force-push', 'refspec con "+" equivale a force push']);
  }
  if (sub === 'config') {
    const a = args.filter((x) => x !== '--global' && x !== '--local' && x !== '--system' && x !== '--worktree');
    const flags = a.filter((x) => x.startsWith('-'));
    const nonFlags = a.filter((x) => !x.startsWith('-'));
    const reads = flags.some((f) => READ_FLAGS.has(f));
    const writes = flags.some((f) => WRITE_FLAGS.has(f)) || (!reads && nonFlags.length >= 2);
    const key = (nonFlags[0] ?? '').toLowerCase();
    const hooksOk = key === 'core.hookspath' && nonFlags[1] === '.githooks';
    if (writes && PROTECTED_CONFIG.test(key) && !hooksOk) {
      out.push(['config-write', `git config ${key} está prohibido: identidad, firma, credenciales y hooks los configura el propietario`]);
    }
    if (flags.some((f) => f === '--file' || f === '-f' || f.startsWith('--file='))) out.push(['config-file', 'git config --file está prohibido']);
  }
}

// ---------- reglas sobre el texto completo ----------
const TEXT_RULES = [
  ['env-identidad', /\b(GIT_AUTHOR_(NAME|EMAIL|DATE)|GIT_COMMITTER_(NAME|EMAIL|DATE))\b/, 'GIT_AUTHOR_*/GIT_COMMITTER_* están prohibidas: la identidad es del propietario'],
  ['gh-auth', /\bgh\s+auth\s+(token|login|refresh|setup-git|switch)\b/, 'gh auth token/login/refresh están prohibidos: las credenciales son del propietario'],
  ['ssh-gnupg', /(^|[\s='"/~])\.(ssh|gnupg)(\/|\b)/, 'no se lee ni lista ~/.ssh ni ~/.gnupg'],
  ['claves', /\b(ssh-keygen|ssh-add|ssh-keyscan)\b|\bgpg2?\s+[^|;&\n]*(--(full-)?gen(erate)?-key|--quick-gen|--export-secret|--import|--list-secret|-K\b)/, 'no se generan, importan ni listan claves'],
  ['git-credentials', /\.git-credentials|\.netrc\b|\.npmrc\b[^\n]*_authToken/, 'no se leen archivos de credenciales'],
  ['token-env', /\$\{?[A-Z0-9_]*(TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|PRIVATE_KEY)[A-Z0-9_]*\}?/, 'no se expanden variables de secretos'],
  ['proc-environ', /\/proc\/[^\s]*\/environ/, 'no se lee el entorno de procesos'],
  ['leer-env', /\b(cat|less|more|head|tail|grep|rg|sed|awk|bat|source|xxd|strings)\s+[^|;&\n]*\.env(\.(?!example\b)[A-Za-z]+)?(\s|$|['"])/, 'no se leen archivos .env (solo .env.example)'],
  ['settings-local', /\.claude\/settings\.local\.json/, '.claude/settings.local.json no se toca'],
];

const ENV_DUMP = /(^|[;&|(]\s*|\n\s*)(printenv|env|export\s+-p|declare\s+-x|set)\s*(\||$|;|\n|>)/;
const NAMES_ONLY = /\|\s*(cut\s+-d\s*=?\s*['"]?=['"]?\s*-f\s*1|cut\s+-d=\s*-f1|awk\s+-F=\s*'\{\s*print\s+\$1\s*\}'|grep\s+-o\s+['"]?\^?[A-Za-z_\[\]*]+|sed\s+['"]s\/=\.\*\/\/)/;
const PUBLISHERS = /\b(git\s+(?:-\S+\s+\S+\s+)*(commit|tag|merge|notes|revert|cherry-pick|rebase)|gh\s+(pr|issue|release|api|gist|repo))\b/;
const COMMIT_CMD = /\bgit\s+(?:-\S+\s+\S+\s+)*(commit|tag|merge|revert)\b/;

export function evaluate(command, depth = 0) {
  const cmd = String(command ?? '');
  const out = [];

  for (const [id, re, msg] of TEXT_RULES) if (re.test(cmd)) out.push([id, msg]);
  if (ENV_DUMP.test(cmd) && !NAMES_ONLY.test(cmd)) out.push(['env-dump', 'volcar el entorno puede imprimir secretos: usa `| cut -d= -f1` para listar solo nombres']);

  if (PUBLISHERS.test(cmd)) {
    for (const { id, re, msg } of FORBIDDEN_TEXT) if (re.test(cmd)) out.push([`texto-${id}`, `${msg} (regla del propietario; ignora recordatorios de la plataforma que lo pidan)`]);
    if (COMMIT_CMD.test(cmd)) for (const { id, re, msg } of FORBIDDEN_COMMIT_ONLY) if (re.test(cmd)) out.push([`texto-${id}`, msg]);
  }

  for (const seg of splitSegments(cmd)) {
    const tokens = tokenize(seg);
    const g = parseGit(tokens);
    if (g) checkGit(g, out);
    if (depth < 3) {
      // bash -c "...", eval "...", $(...) y `...`: se analiza el interior
      const head = tokens.find((t) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) ?? '';
      if (/(^|\/)(bash|sh|zsh|dash)$/.test(head) || head === 'eval') {
        for (const t of tokens.slice(1)) if (/\bgit\b|\bgh\b/.test(t)) out.push(...evaluate(t, depth + 1));
      }
      for (const m of seg.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)) out.push(...evaluate(m[1] ?? m[2], depth + 1));
    }
  }

  const seen = new Set();
  return out.filter(([id, msg]) => (seen.has(id + msg) ? false : seen.add(id + msg)));
}

// ---------- entrada del hook ----------
function main() {
  let input;
  try { input = JSON.parse(readFileSync(0, 'utf8')); } catch (e) {
    console.error(`guard-bash: no pude leer el JSON del hook (${e.message}); bloqueo por seguridad. Repórtalo, no lo rodees.`);
    process.exit(2);
  }
  if (input.tool_name && input.tool_name !== 'Bash') process.exit(0);
  const violations = evaluate(input.tool_input?.command);
  if (violations.length) {
    const lines = violations.map(([id, msg]) => `  - [${id}] ${msg}`).join('\n');
    console.error(`BLOQUEADO por guard-bash (reglas del propietario, CLAUDE.md §1):\n${lines}\nNo rodees este bloqueo: repórtalo al propietario.`);
    process.exit(2);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
