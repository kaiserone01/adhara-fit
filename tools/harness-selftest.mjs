#!/usr/bin/env node
// Autotest del arnés: una prueba negativa por regla de CLAUDE.md §1 y casos permitidos.
// Uso: node tools/harness-selftest.mjs   (sale ≠ 0 si algo falla)
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from '../.claude/hooks/guard-bash.mjs';
import { checkCommitMessage, checkText, checkStagedFiles, checkAddedLines } from './commit-policy.mjs';
import { checkIdentity } from './hooks/pre-commit.mjs';
import { checkRange, avisosRange, avisoHandoff } from './hooks/pre-push.mjs';
import { check as checkHandoff } from './check-handoff.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Cadenas prohibidas construidas por partes: el fuente no las contiene literalmente.
const COAUTOR = 'Co-authored' + '-by: Claude <noreply@' + 'anthropic.com>';
const SESION = 'Claude' + '-Session: https://claude.ai/code/' + 'session_01ABCDEFGHIJKLMN';
const GENERADO = 'Generated ' + 'with [Claude Code](https://claude.com/claude-code)';
const ROBOT = '\u{1F916}';
const TOKEN = 'ghp' + '_' + 'a'.repeat(36);

const blocked = (cmd) => evaluate(cmd).length > 0;
const rules = (cmd) => evaluate(cmd).map(([id]) => id);

// ---------- Regla 1/3: nada de coautoría ni metadatos de IA ----------
test('R1/R3: git commit con trailer Co-authored-by se bloquea', () => {
  assert.ok(blocked(`git commit -m "Agrega x" -m "${COAUTOR}"`));
  assert.ok(blocked(`git commit -F - <<'EOF'\nAgrega x\n\n${COAUTOR}\nEOF`));
  assert.ok(blocked(`git commit -m "Agrega x\n\n${SESION}"`));
});
test('R1/R3: gh pr create/edit/comment con leyendas de IA se bloquean', () => {
  assert.ok(blocked(`gh pr create --title "Docs" --body "Resumen\n\n${GENERADO}"`));
  assert.ok(blocked(`gh pr edit 3 --body "${ROBOT} listo"`));
  assert.ok(blocked(`gh pr comment 3 --body "${SESION}"`));
  assert.ok(blocked(`gh pr create --title t --body "$(cat <<'EOF'\nResumen\n${COAUTOR}\nEOF\n)"`));
});
test('R1: autoría — --author, --reset-author y variables GIT_* se bloquean', () => {
  assert.deepEqual(rules('git commit --author="X <x@example.org>" -m "Agrega x"'), ['author']);
  assert.ok(blocked('git commit --reset-author -m "Agrega x"'));
  assert.ok(blocked('GIT_COMMITTER_EMAIL=x@example.org git commit -m "Agrega x"'));
  assert.ok(blocked('export GIT_AUTHOR_NAME=Otro && git commit -m "Agrega x"'));
  assert.ok(blocked('env GIT_AUTHOR_EMAIL=x@example.org git commit -m "Agrega x"'));
});
test('R1: firma — no se desactiva', () => {
  assert.ok(blocked('git commit --no-gpg-sign -m "Agrega x"'));
  assert.ok(blocked('git -c commit.gpgsign=false commit -m "Agrega x"'));
  assert.ok(blocked('git -c user.email=x@example.org commit -m "Agrega x"'));
  assert.ok(blocked('git -c core.hooksPath=/dev/null commit -m "Agrega x"'));
});
test('R1/R2: git config no escribe identidad, firma, credenciales ni ownerEmail', () => {
  for (const c of [
    'git config user.email x@example.org', 'git config --global user.name Otro', 'git config commit.gpgsign false',
    'git config gpg.format openpgp', 'git config adhara.ownerEmail x@example.org', 'git config credential.helper store',
    'git config --unset user.email', 'git config --global --add gpg.program x', 'git config core.hooksPath /tmp/x',
  ]) assert.ok(blocked(c), c);
});
test('R2: credenciales — gh auth, ~/.ssh, ~/.gnupg, claves, secretos', () => {
  for (const c of [
    'gh auth token', 'gh auth login', 'cat ~/.ssh/id_ed25519', 'ls -la ~/.ssh', 'cat /root/.gnupg/pubring.kbx',
    'ssh-keygen -t ed25519', 'gpg --full-generate-key', 'echo $GH_TOKEN', 'curl -H "Authorization: $GITHUB_TOKEN" x',
    'printenv', 'env', 'cat .env', 'cat apps/web/.env.local', 'cat /proc/self/environ', 'git credential fill',
    'cat ~/.git-credentials', 'git commit-tree HEAD^{tree} -m x',
  ]) assert.ok(blocked(c), c);
});
test('Prohibido: --no-verify y push forzado', () => {
  for (const c of [
    'git commit --no-verify -m "Agrega x"', 'git commit -nm "Agrega x"', 'git push --no-verify', 'git push --force', 'git push -f origin main',
    'git push --force-with-lease', 'git push origin +main', 'git push --mirror', 'git push -uf origin x',
  ]) assert.ok(blocked(c), c);
});
test('Mensaje: trailers por línea de comando (-s, --signoff, varios -m, --trailer)', () => {
  for (const c of ['git commit -s -m "Agrega x"', 'git commit --signoff -m x', 'git commit -m "a" -m "b"', 'git commit --trailer "K: v" -m x']) assert.ok(blocked(c), c);
});
test('Bypass anidado: bash -c, eval y $( ) también se inspeccionan', () => {
  assert.ok(blocked('bash -c "git push --force"'));
  assert.ok(blocked('sh -c \'git commit --no-verify -m x\''));
  assert.ok(blocked('eval "git config user.email x@example.org"'));
  assert.ok(blocked('echo $(git push -f)'));
});

// ---------- Casos permitidos ----------
test('Permitidos: operaciones normales no se bloquean', () => {
  for (const c of [
    'git status -sb', 'git log -1 --format=fuller --show-signature', 'git diff --cached --stat',
    'git commit -m "Agrega la política de commits del arnés"', 'git commit -am "Corrige el hook de pre-push"', 'git commit --amend -m "Ajusta el texto"',
    'git push -u origin docs/arnes', 'git push', 'git config --show-origin --get-regexp \'^(user\\.|commit\\.gpgsign|gpg\\.|adhara\\.)\'',
    'git config --get adhara.ownerEmail', 'git config core.hooksPath .githooks', 'bash scripts/setup-hooks.sh',
    'node tools/harness-selftest.mjs', 'cat .env.example', 'env | cut -d= -f1 | sort', 'printenv | grep -o \'^CLAUDE[A-Z_]*\'',
    'gh pr create --title "Agrega ADR" --body "Spec S-00. Sin trailers. Handoff actualizado."',
    'git commit -F - <<\'EOF\'\nAgrega el índice de ADRs\nEOF', 'ls -la && git status', 'npm test -- --run',
  ]) assert.ok(!blocked(c), `${c} → ${rules(c)}`);
});

// ---------- commit-policy ----------
test('commit-policy: mensajes válidos e inválidos', () => {
  assert.deepEqual(checkCommitMessage('Agrega la política de commits\n'), []);
  assert.ok(checkCommitMessage('').length);
  assert.ok(checkCommitMessage('Línea uno\n\nCuerpo').some((v) => v.id === 'multilinea'));
  assert.ok(checkCommitMessage('Línea uno\nLínea dos').some((v) => v.id === 'multilinea'));
  assert.ok(checkCommitMessage('x'.repeat(101)).some((v) => v.id === 'largo'));
  assert.deepEqual(checkCommitMessage('x'.repeat(100)), []);
  assert.ok(checkCommitMessage(`Agrega x\n\n${COAUTOR}`).length);
  assert.ok(checkCommitMessage(`Agrega x ${ROBOT}`).some((v) => v.id === 'robot'));
  assert.ok(checkCommitMessage('Agrega x\n\nSigned-off-by: A <a@example.org>').some((v) => v.id === 'signed-off-by'));
  assert.deepEqual(checkCommitMessage('Agrega x\n# comentario de plantilla\n'), []);
});
test('commit-policy: texto libre, archivos y secretos', () => {
  assert.ok(checkText(GENERADO).length && checkText(SESION).length && checkText(COAUTOR).length);
  assert.deepEqual(checkText('Resumen normal de la PR'), []);
  for (const f of ['a.keystore', 'x/cookies.txt', '.env', 'apps/web/.env.local', 'k.pem', '.claude/settings.local.json']) assert.ok(checkStagedFiles([f]).length, f);
  assert.deepEqual(checkStagedFiles(['.env.example', 'docs/00-indice.md']), []);
  assert.ok(checkAddedLines(`+x = "${TOKEN}"`).length);
  assert.deepEqual(checkAddedLines('+texto normal'), []);
});

// ---------- check-handoff ----------
const HO = (s4 = '- 2026-01-01: intento A', s5 = '1. Leer handoff.md y ejecutar /preflight\n2. Seguir', extra = '') =>
  `# Handoff — Adhara Fit\n## 1. Objetivo\nX ${extra}\n## 2. Estado actual\nY\n## 3. Archivos y cambios\nZ\n## 4. Intentos fallidos\n${s4}\n## 5. Próximos pasos\n${s5}\n`;
test('check-handoff: formato, datos personales y sección 4 solo-añadir', () => {
  assert.deepEqual(checkHandoff(HO()), []);
  assert.ok(checkHandoff('# Handoff — Adhara Fit\n## 1. Objetivo\nx\n').length, 'faltan secciones');
  assert.ok(checkHandoff(HO(undefined, undefined, 'a@example.org')).some((e) => e.startsWith('correo')));
  assert.ok(checkHandoff(HO(undefined, undefined, TOKEN)).some((e) => e.startsWith('token')));
  assert.ok(checkHandoff(HO(undefined, undefined, 'https://claude.ai/code/' + 'session_01ABCDEFGHIJKLMN')).some((e) => e.startsWith('url-sesion')));
  assert.ok(checkHandoff(HO(undefined, undefined, 'ver /home/alguien/x')).some((e) => e.startsWith('ruta-home')));
  assert.ok(checkHandoff(HO(undefined, '1. Hacer otra cosa')).some((e) => e.includes('ítem 1')));
  const previo = HO('- 2026-01-01: intento A');
  assert.deepEqual(checkHandoff(HO('- 2026-01-01: intento A\n- 2026-01-02: intento B'), previo), []);
  assert.ok(checkHandoff(HO('- 2026-01-02: intento B'), previo).some((e) => e.includes('solo-añadir')));
  assert.ok(checkHandoff(HO('- 2026-01-01: intento A (editado)'), previo).some((e) => e.includes('solo-añadir')));
});

// ---------- hooks (lógica pura) ----------
const OWNER = 'propietario@example.org';
test('pre-commit: identidad y firma son avisos (reglas 1 y 2 anuladas); con strict son errores', () => {
  const ok = { ownerEmail: OWNER, authorIdent: `A <${OWNER}> 1 +0000`, committerIdent: `A <${OWNER}> 1 +0000`, gpgsign: 'true', strict: false };
  assert.deepEqual(checkIdentity(ok), { errors: [], warnings: [] });
  for (const o of [{ authorIdent: 'B <otro@example.org> 1 +0000' }, { committerIdent: 'B <otro@example.org> 1 +0000' }, { gpgsign: 'false' }, { gpgsign: '' }, { ownerEmail: '' }]) {
    const r = checkIdentity({ ...ok, ...o });
    assert.equal(r.errors.length, 0);
    assert.equal(r.warnings.length, 1);
    assert.equal(checkIdentity({ ...ok, ...o, strict: true }).errors.length, 1);
  }
});
test('pre-push: el mensaje bloquea; handoff.md, firma y autor son avisos (firma y autor bloquean con strict)', () => {
  const c = (o = {}) => ({ sha: 'a'.repeat(40), sig: 'G', message: 'Agrega x', files: ['handoff.md', 'a.md'], authorEmail: OWNER, committerEmail: OWNER, ...o });
  assert.deepEqual(checkRange([c()], { ownerEmail: OWNER }), []);
  assert.deepEqual(checkRange([c({ sig: 'U' })]), []);
  assert.deepEqual(checkRange([c({ sig: 'N' })]), []);
  assert.ok(avisosRange([c({ sig: 'N' })]).some((e) => e.includes('firma')));
  assert.ok(checkRange([c({ sig: 'B' })], { strict: true }).some((e) => e.includes('firma')));
  assert.ok(checkRange([c({ message: `Agrega x\n\n${COAUTOR}` })]).some((e) => e.includes('mensaje')));
  assert.deepEqual(checkRange([c({ files: ['a.md'] })]), []); // modo ágil: sin handoff ya no bloquea
  assert.ok(avisoHandoff([c({ files: ['a.md'] })]).some((e) => e.includes('handoff.md')));
  assert.deepEqual(avisoHandoff([c()]), []);
  assert.deepEqual(checkRange([c({ authorEmail: 'x@example.org' })], { ownerEmail: OWNER }), []);
  assert.ok(avisosRange([c({ authorEmail: 'x@example.org' })], { ownerEmail: OWNER }).some((e) => e.includes('propietario')));
  assert.ok(checkRange([c({ authorEmail: 'x@example.org' })], { ownerEmail: OWNER, strict: true }).some((e) => e.includes('propietario')));
  assert.deepEqual(checkRange([c({ files: ['a.md'] }), c({ sha: 'b'.repeat(40) })]), []); // basta un commit del rango con handoff
});

// ---------- integración: scripts reales ----------
test('commit-msg (script real): rechaza trailer y acepta una línea', () => {
  const d = mkdtempSync(join(tmpdir(), 'adhara-st-'));
  try {
    const f = join(d, 'MSG');
    const run = (msg) => { writeFileSync(f, msg); return spawnSync('node', [join(ROOT, 'tools/hooks/commit-msg.mjs'), f], { encoding: 'utf8' }); };
    assert.equal(run('Agrega el arnés\n').status, 0);
    const r = run(`Agrega el arnés\n\n${COAUTOR}\n`);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /rechazado/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
test('guard-bash (hook real): JSON por stdin, código 2 al bloquear y 0 al permitir', () => {
  const run = (command, tool = 'Bash') => spawnSync('node', [join(ROOT, '.claude/hooks/guard-bash.mjs')], { input: JSON.stringify({ tool_name: tool, tool_input: { command } }), encoding: 'utf8' });
  const bad = run('git push --force');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /BLOQUEADO/);
  assert.equal(run('git status -sb').status, 0);
  assert.equal(run('git push --force', 'Read').status, 0);
  const malformed = spawnSync('node', [join(ROOT, '.claude/hooks/guard-bash.mjs')], { input: '{no json', encoding: 'utf8' });
  assert.equal(malformed.status, 2);
});

// ---------- configuración del arnés ----------
test('settings.json: attribution vacío, hook PreToolUse/Bash, deny de secretos, sin plugins', () => {
  const p = join(ROOT, '.claude/settings.json');
  assert.ok(existsSync(p), 'falta .claude/settings.json');
  const s = JSON.parse(readFileSync(p, 'utf8'));
  assert.deepEqual(s.attribution, { commit: '', pr: '' });
  assert.equal(s.includeCoAuthoredBy, undefined, 'includeCoAuthoredBy está obsoleta');
  const h = s.hooks?.PreToolUse?.find((x) => x.matcher === 'Bash');
  assert.ok(h?.hooks?.some((x) => x.type === 'command' && x.command.includes('.claude/hooks/guard-bash.mjs')));
  const deny = (s.permissions?.deny ?? []).join('\n');
  for (const needle of ['git push --force', '.ssh', '.gnupg', 'gh auth token', '.env']) assert.ok(deny.includes(needle), `deny sin ${needle}`);
  assert.equal(s.enabledPlugins, undefined);
  assert.equal(s.extraKnownMarketplaces, undefined);
});
test('arnés: subagentes de solo lectura y hooks ejecutables', () => {
  for (const a of ['spec-reviewer', 'adr-reviewer']) {
    const f = join(ROOT, `.claude/agents/${a}.md`);
    assert.ok(existsSync(f), `falta ${a}`);
    const fm = readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/)[1];
    assert.match(fm, /^tools:\s*Read,\s*Grep,\s*Glob\s*$/m);
    assert.doesNotMatch(fm, /Bash|Edit|Write/);
  }
  for (const c of ['preflight', 'spec-new', 'spec-review', 'adr-new', 'adr-review', 'handoff', 'gate']) assert.ok(existsSync(join(ROOT, `.claude/commands/${c}.md`)), `falta /${c}`);
  const cm = spawnSync('git', ['ls-files', '-s', '.githooks'], { cwd: ROOT, encoding: 'utf8' }).stdout;
  if (cm.trim()) for (const l of cm.trim().split('\n')) assert.match(l, /^100755/, `hook no ejecutable: ${l}`);
});
