import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { comprobarPrivacidad, ErrorImportacion, importar } from "./importar-repo-a.mjs";
import { PATRONES_GITIGNORE, listarArchivos, verificarRepo } from "./verificar-repo.mjs";

const escribir = (raiz, ruta, c = "x") => { mkdirSync(dirname(join(raiz, ruta)), { recursive: true }); writeFileSync(join(raiz, ruta), c); };
const pkg = (name, deps = {}, scripts = {}) => JSON.stringify({ name, dependencies: deps, scripts }, null, 2);
const git = (cwd, ...a) => execFileSync("git", ["-C", cwd, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).trim();

/** Repo A ficticio con archivos de la lista de exclusión y colisiones. */
function repoAFicticio(extra = {}) {
  const r = mkdtempSync(join(tmpdir(), "repo-a-ficticio-"));
  git(r, "init", "-q");
  escribir(r, "package.json", pkg("gym-app", {}, { build: "turbo run build", "actualizar-tasa": "npm run actualizar-tasa --workspace apps/worker" }));
  escribir(r, "turbo.json", JSON.stringify({ tasks: { build: {} } }));
  escribir(r, "apps/web-admin/package.json", pkg("@gym-app/web-admin", { "@gym-app/db": "*", "@gym-app/ui": "*" }));
  escribir(r, "apps/kiosk/package.json", pkg("@gym-app/kiosk", { "@gym-app/domain": "*" }));
  escribir(r, "apps/vitrina/package.json", pkg("@gym-app/vitrina", { "@gym-app/theming": "*" }));
  escribir(r, "apps/kiosk-tv/capacitor/package.json", pkg("kiosk-tv"));
  escribir(r, "apps/vitrina-tv/capacitor/package.json", pkg("vitrina-tv"));
  escribir(r, "apps/vitrina-tv/capacitor/android/app/debug.keystore", "binario");
  escribir(r, "apps/worker/package.json", pkg("worker"));
  escribir(r, "apps/kiosk-host/main.cs", "x");
  escribir(r, "packages/db/package.json", pkg("@gym-app/db", { "@gym-app/domain": "*" }, { "db:seed": "prisma db seed", "db:limpiar": "tsx limpiarMiembros.ts", generate: "prisma generate", test: "vitest run" }));
  escribir(r, "packages/db/prisma/schema.prisma", "model A {}");
  escribir(r, "packages/db/prisma/seed.ts", "const p = 'admin1234'");
  escribir(r, "packages/db/prisma/migrations/20260913024831_inicial/migration.sql", "x");
  escribir(r, "packages/db/prisma/migrations/migration_lock.toml", "x");
  escribir(r, "packages/db/prisma7.config.ts", 'export default { migrations: {\n    path: "prisma/migrations",\n    seed: "tsx prisma/seed.ts",\n  } };\n');
  escribir(r, "packages/db/prisma7.local.config.ts", "x");
  escribir(r, "packages/db/limpiarMiembros.ts", "x");
  escribir(r, "packages/db/Dockerfile.migrate", "CMD rm -rf prisma/migrations/*");
  escribir(r, "packages/domain/package.json", pkg("@gym-app/domain"));
  escribir(r, "packages/ui/package.json", pkg("@gym-app/ui"));
  escribir(r, "packages/theming/package.json", pkg("@gym-app/theming"));
  escribir(r, "packages/config/package.json", pkg("@gym-app/config"));
  escribir(r, "packages/design-system/package.json", pkg("@gym-app/design-system"));
  escribir(r, "packages/domain-custom/.gitkeep", "");
  escribir(r, "packages/domain/ejemplo.ts", "export const x = 1;");
  escribir(r, "cookies.txt", "sesion");
  escribir(r, "skills-lock.json", "{}");
  escribir(r, "README.md", "readme del Repo A");
  escribir(r, "CLAUDE.md", "claude del Repo A");
  escribir(r, "handoff.md", "handoff del Repo A");
  escribir(r, "docs/adr/ADR-001-gym-app-sesion.md", "x");
  escribir(r, ".github/workflows/apk-kiosco.yml", "x");
  escribir(r, ".claude/settings.json", "{}");
  escribir(r, ".gitignore", "node_modules\n.env*\n**/out/\n");
  for (const [ruta, c] of Object.entries(extra)) escribir(r, ruta, c);
  git(r, "add", ".");
  git(r, "commit", "-qm", "a1");
  return r;
}

/** Repositorio destino con archivos propios y línea base. */
function destinoPropio() {
  const d = mkdtempSync(join(tmpdir(), "destino-"));
  escribir(d, "README.md", "readme propio");
  escribir(d, "CLAUDE.md", "claude propio");
  escribir(d, "handoff.md", "handoff propio");
  escribir(d, "LICENSE", "Copyright (c) 2026 Adhara Fit. Todos los derechos reservados.\n");
  escribir(d, ".env.example", "");
  escribir(d, "docs/00-indice.md", "indice propio");
  escribir(d, "docs/linea-base-tests.md", "base");
  escribir(d, "docs/linea-base-audit.json", "{}");
  escribir(d, ".github/workflows/politica.yml", "propia");
  escribir(d, ".claude/settings.json", "{\"propio\":true}");
  escribir(d, ".gitignore", PATRONES_GITIGNORE.join("\n") + "\n!.env.example\n");
  escribir(d, "docker-compose.yml", "image: postgres:16.4\n");
  escribir(d, ".github/workflows/ci.yml", "image: postgres:16.4\n");
  return d;
}
const limpiar = (...rs) => rs.forEach((r) => rmSync(r, { recursive: true, force: true }));
const base = { sha: "HEAD", omitirGitleaks: true, sinLockfile: true, log: () => {} };

test("importación feliz: excluye, conserva lo propio y escribe el informe (BEH-S00-001, AC-S00-020)", async () => {
  const a = repoAFicticio(), d = destinoPropio();
  try {
    await importar({ ...base, repoA: a, destino: d });
    const archivos = listarArchivos(d);
    for (const prohibido of ["cookies.txt", "skills-lock.json", "apps/worker/package.json", "apps/kiosk-host/main.cs",
      "apps/vitrina-tv/capacitor/android/app/debug.keystore", "packages/db/prisma/seed.ts", "packages/db/limpiarMiembros.ts",
      "packages/db/Dockerfile.migrate", "packages/db/prisma/migrations/migration_lock.toml", "docs/adr/ADR-001-gym-app-sesion.md",
      ".github/workflows/apk-kiosco.yml", "packages/domain-custom/.gitkeep"]) {
      assert.ok(!archivos.includes(prohibido), `no debía importarse ${prohibido}`);
    }
    assert.ok(!archivos.some((f) => f.includes("migrations/20260913024831")));
    // lo propio prevalece
    assert.equal(readFileSync(join(d, "README.md"), "utf8"), "readme propio");
    assert.equal(readFileSync(join(d, "CLAUDE.md"), "utf8"), "claude propio");
    assert.equal(readFileSync(join(d, "handoff.md"), "utf8"), "handoff propio");
    assert.equal(readFileSync(join(d, ".claude/settings.json"), "utf8"), "{\"propio\":true}");
    assert.equal(readFileSync(join(d, "docs/00-indice.md"), "utf8"), "indice propio");
    // el código sí entra
    assert.ok(archivos.includes("packages/domain/ejemplo.ts"));
    assert.ok(existsSync(join(d, "docs/informe-importacion.md")));
    // configuración corregida
    const raizPkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"));
    assert.equal(raizPkg.scripts["actualizar-tasa"], undefined);
    assert.ok(raizPkg.scripts.typecheck && raizPkg.scripts.test);
    const dbPkg = JSON.parse(readFileSync(join(d, "packages/db/package.json"), "utf8"));
    assert.equal(dbPkg.scripts["db:seed"], undefined);
    assert.equal(dbPkg.scripts["db:limpiar"], undefined);
    assert.equal(dbPkg.scripts.test, "vitest run --passWithNoTests");
    assert.ok(!readFileSync(join(d, "packages/db/prisma7.config.ts"), "utf8").includes("seed"));
    // .gitignore fusionado sin perder reglas propias
    const gi = readFileSync(join(d, ".gitignore"), "utf8");
    assert.ok(gi.includes("*.keystore") && gi.includes("!.env.example") && gi.includes("node_modules"));
    // el árbol resultante pasa la verificación del repo; la importación conserva los nombres del Repo A
    // (kiosk, kiosk-tv) y Adhara los renombró a checkin y checkin-tv (2026-11-13), por eso se ignora solo esa diferencia
    assert.deepEqual(verificarRepo(d).filter((e) => !/^apps: (falta|sobra) apps\/(checkin|checkin-tv|kiosk|kiosk-tv)$/.test(e)), []);
  } finally { limpiar(a, d); }
});

test("sin copia local o sin línea base no crea nada (BEH-S00-007)", async () => {
  const d = destinoPropio();
  const a = repoAFicticio();
  try {
    await assert.rejects(importar({ ...base, repoA: join(d, "no-existe"), destino: d }), ErrorImportacion);
    rmSync(join(d, "docs/linea-base-audit.json"));
    const antes = listarArchivos(d);
    await assert.rejects(importar({ ...base, repoA: a, destino: d }), /línea base/);
    assert.deepEqual(listarArchivos(d), antes);
    assert.ok(!existsSync(join(d, "docs/informe-importacion.md")));
  } finally { limpiar(a, d); }
});

test("un workspace que importa una app omitida detiene la importación y deja el error en el informe (BEH-S00-009)", async () => {
  const a = repoAFicticio();
  const d = destinoPropio();
  try {
    // simula un build fallido de la verificación
    const ejecutar = (cmd, args) => ({ status: cmd === "npm" && args[0] === "ci" ? 1 : 0, stdout: "", stderr: "ERESOLVE" });
    await assert.rejects(importar({ ...base, repoA: a, destino: d, verificar: true, ejecutar }), /verificación de construcción/);
    const informe = readFileSync(join(d, "docs/informe-importacion.md"), "utf8");
    assert.match(informe, /FALLÓ/);
    assert.match(informe, /npm ci/);
    assert.ok(!existsSync(join(d, "packages/domain/ejemplo.ts")), "no debe dejar el árbol listo");
  } finally { limpiar(a, d); }
});

test("gitleaks con hallazgos o ausente detiene la importación", async () => {
  const a = repoAFicticio(), d = destinoPropio();
  try {
    await assert.rejects(importar({ ...base, omitirGitleaks: false, repoA: a, destino: d, ejecutar: () => ({ status: 1, stdout: "leak" }) }), /secretos/);
    await assert.rejects(importar({ ...base, omitirGitleaks: false, repoA: a, destino: d, ejecutar: () => ({ error: { code: "ENOENT" } }) }), /no está instalado/);
  } finally { limpiar(a, d); }
});

test("comprobación de privacidad (AC-S00-016, BEH-S00-016)", async () => {
  await assert.rejects(comprobarPrivacidad("o/r", async () => ({ private: false })), /público/);
  await comprobarPrivacidad("o/r", async () => ({ private: true }));
});

test("el informe se escribe aunque la importación falle (BEH-S00-025)", async () => {
  const a = repoAFicticio(), d = destinoPropio();
  try {
    await assert.rejects(importar({ ...base, omitirGitleaks: false, repoA: a, destino: d, ejecutar: () => ({ status: 1, stdout: "x" }) }));
    assert.ok(existsSync(join(d, "docs/informe-importacion.md")));
  } finally { limpiar(a, d); }
});
