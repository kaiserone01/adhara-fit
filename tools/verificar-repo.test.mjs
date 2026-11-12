import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { FRASE_LICENCIA, PATRONES_GITIGNORE, verificarRepo } from "./verificar-repo.mjs";

function escribir(raiz, ruta, contenido = "") {
  mkdirSync(dirname(join(raiz, ruta)), { recursive: true });
  writeFileSync(join(raiz, ruta), contenido);
}
const pkg = (name, deps = {}, scripts = {}) => JSON.stringify({ name, dependencies: deps, scripts });

function arbolBase() {
  const raiz = mkdtempSync(join(tmpdir(), "verificar-repo-"));
  escribir(raiz, "LICENSE", `${FRASE_LICENCIA}\n`);
  for (const f of ["README.md", ".env.example", "CLAUDE.md", "handoff.md"]) escribir(raiz, f, "x");
  escribir(raiz, ".gitignore", PATRONES_GITIGNORE.join("\n") + "\n!.env.example\n");
  escribir(raiz, "docker-compose.yml", "services:\n  postgres:\n    image: postgres:16.4\n");
  escribir(raiz, ".github/workflows/ci.yml", "services:\n  postgres:\n    image: postgres:16.4\n");
  escribir(raiz, "apps/web-admin/package.json", pkg("@gym-app/web-admin", { "@gym-app/db": "*", "@gym-app/ui": "*" }));
  escribir(raiz, "apps/kiosk/package.json", pkg("@gym-app/kiosk", { "@gym-app/domain": "*" }));
  escribir(raiz, "apps/vitrina/package.json", pkg("@gym-app/vitrina", { "@gym-app/theming": "*" }));
  escribir(raiz, "apps/kiosk-tv/capacitor/package.json", pkg("kiosk-tv"));
  escribir(raiz, "apps/vitrina-tv/capacitor/package.json", pkg("vitrina-tv"));
  escribir(raiz, "packages/db/package.json", pkg("@gym-app/db", { "@gym-app/domain": "*" }));
  escribir(raiz, "packages/db/prisma/schema.prisma", "x");
  escribir(raiz, "packages/db/prisma7.config.ts", "x");
  escribir(raiz, "packages/db/prisma7.local.config.ts", "x");
  escribir(raiz, "packages/domain/package.json", pkg("@gym-app/domain"));
  escribir(raiz, "packages/ui/package.json", pkg("@gym-app/ui"));
  escribir(raiz, "packages/theming/package.json", pkg("@gym-app/theming"));
  escribir(raiz, "packages/config/package.json", pkg("@gym-app/config"));
  escribir(raiz, "packages/design-system/package.json", pkg("@gym-app/design-system"));
  return raiz;
}
const verificar = (raiz, op) => verificarRepo(raiz, op);
const con = (fn) => { const r = arbolBase(); try { fn(r); } finally { rmSync(r, { recursive: true, force: true }); } };

test("un árbol limpio no tiene hallazgos", () => con((r) => assert.deepEqual(verificar(r), [])));

test("detecta Cookies.txt con mayúsculas y fuera de la raíz sin git add (BEH-S00-004)", () => con((r) => {
  escribir(r, "apps/kiosk/Cookies.txt", "x");
  const e = verificar(r);
  assert.ok(e.some((x) => x.includes("apps/kiosk/Cookies.txt")));
}));

test("detecta cada exclusión de la lista cerrada", () => {
  const rutas = [
    "handoff.md", "apps/kiosk/handoff.md", "a/b.keystore", "a/b.jks", "a/b.p12", "a/b.pfx", "a/keystore.properties", "a/b.pem",
    "apps/web-admin/.env.local", "x/reset-vencimientos-log-1.json", ".windsurf/a", ".agents/a", "skills-lock.json",
    "docs/xls/a.xlsm", "packages/db/migracion-excel/a.ts", "apps/web-admin/ZipGym.ts", "a/zip-gym.md",
    "packages/db/prisma/migrations/migration_lock.toml", "packages/db/prisma/seed.ts", "apps/worker/package.json",
    "apps/kiosk-host/a.cs", ".github/workflows/apk-kiosco.yml", ".github/workflows/verificar-vitrina.yml",
  ];
  for (const ruta of rutas) {
    if (ruta === "handoff.md") continue; // el de la raíz es obligatorio
    con((r) => {
      escribir(r, ruta, "x");
      assert.ok(verificar(r).some((x) => x.includes(ruta)), `no detectó ${ruta}`);
    });
  }
});

test(".env.example no es una exclusión", () => con((r) => assert.deepEqual(verificar(r), [])));

test("detecta contraseñas del Repo A bajo packages (BEH-S00-020)", () => con((r) => {
  escribir(r, "packages/domain/a.ts", "const p = 'admin1234'");
  assert.ok(verificar(r).some((x) => x.includes("packages/domain/a.ts")));
}));

test("packages/db solo admite su lista de permitidos", () => con((r) => {
  escribir(r, "packages/db/Dockerfile.migrate", "x");
  assert.ok(verificar(r).some((x) => x.includes("Dockerfile.migrate")));
}));

test("apps y workspaces (BEH-S00-026)", () => {
  con((r) => { rmSync(join(r, "apps/kiosk-tv"), { recursive: true }); assert.ok(verificar(r).some((x) => x.includes("falta apps/kiosk-tv"))); });
  con((r) => { escribir(r, "apps/worker/x.txt", "x"); assert.ok(verificar(r).some((x) => x.includes("sobra apps/worker"))); });
  con((r) => { rmSync(join(r, "packages/ui"), { recursive: true }); assert.ok(verificar(r).some((x) => x.includes("falta packages/ui"))); });
  con((r) => { escribir(r, "packages/domain-custom/x.txt", "x"); assert.ok(verificar(r).some((x) => x.includes("sobra packages/domain-custom"))); });
});

test("migraciones: corte 20261016000000 (AC-S00-004)", () => {
  con((r) => { escribir(r, "packages/db/prisma/migrations/20261016000000_vitrina_sonido/migration.sql", "x"); assert.ok(verificar(r).some((x) => x.includes("migración heredada"))); });
  con((r) => { escribir(r, "packages/db/prisma/migrations/20270101000000_nueva/migration.sql", "x"); assert.deepEqual(verificar(r), []); });
});

test("archivos obligatorios y LICENSE (AC-S00-010, BEH-S00-010)", () => {
  con((r) => { rmSync(join(r, "LICENSE")); assert.ok(verificar(r).some((x) => x.includes("LICENSE"))); });
  con((r) => { writeFileSync(join(r, "LICENSE"), "Copyright"); assert.ok(verificar(r).some((x) => x.includes("sin la frase"))); });
  con((r) => { rmSync(join(r, "README.md")); assert.ok(verificar(r).some((x) => x.includes("README.md"))); });
});

test(".gitignore completo y sin *.keystore (BEH-S00-019)", () => con((r) => {
  writeFileSync(join(r, ".gitignore"), PATRONES_GITIGNORE.filter((p) => p !== "*.keystore").join("\n") + "\n!.env.example\n");
  assert.ok(verificar(r).some((x) => x.includes("*.keystore")));
}));

test("versiones fijadas (AC-S00-021, BEH-S00-022)", () => {
  con((r) => { writeFileSync(join(r, "docker-compose.yml"), "image: postgres:latest\n"); assert.ok(verificar(r).some((x) => x.includes("latest"))); });
  con((r) => { writeFileSync(join(r, "docker-compose.yml"), "image: postgres:15.8\n"); assert.ok(verificar(r).some((x) => x.includes("versión mayor"))); });
  con((r) => { writeFileSync(join(r, ".github/workflows/ci.yml"), "uses: x/gitleaks-action@latest\n gitleaks latest\n"); assert.ok(verificar(r).some((x) => x.includes("gitleaks"))); });
});

test("referencias rotas en scripts (AC-S00-023, BEH-S00-024)", () => {
  con((r) => {
    escribir(r, "tools/hola.mjs", "x");
    escribir(r, "package.json", pkg("raiz", {}, { ok: "node tools/hola.mjs" }));
    assert.deepEqual(verificar(r), []);
  });
  con((r) => {
    escribir(r, "package.json", pkg("raiz", {}, { malo: "node apps/worker/src/index.ts" }));
    const e = verificar(r);
    assert.ok(e.some((x) => x.includes('script "malo"') && x.includes("apps/worker")));
  });
});

test("historia: una raíz, importación de un padre y sin el SHA del Repo A (AC-S00-001)", () => {
  const origen = mkdtempSync(join(tmpdir(), "repo-a-"));
  const destino = arbolBase();
  try {
    const g = (cwd, ...a) => execFileSync("git", ["-C", cwd, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).trim();
    g(origen, "init", "-q");
    for (const i of [1, 2, 3]) { writeFileSync(join(origen, "f.txt"), String(i)); g(origen, "add", "."); g(origen, "commit", "-qm", `a${i}`); }
    const shaA = g(origen, "rev-parse", "HEAD");
    writeFileSync(join(destino, "docs-linea-base.tmp"), "");
    mkdirSync(join(destino, "docs"), { recursive: true });
    writeFileSync(join(destino, "docs/linea-base-tests.md"), `commit ${shaA}\n`);
    rmSync(join(destino, "docs-linea-base.tmp"));
    g(destino, "init", "-q");
    g(destino, "add", ".");
    g(destino, "commit", "-qm", "Prepara el arnés");
    writeFileSync(join(destino, "x.txt"), "x");
    g(destino, "add", ".");
    g(destino, "commit", "-qm", "Importa el Repo A sin historia");
    assert.deepEqual(verificar(destino, { historia: true }), []);
    // el SHA del Repo A existe en el repositorio destino
    g(destino, "fetch", "-q", origen, "HEAD");
    assert.ok(verificar(destino, { historia: true }).some((x) => x.includes("existe en el repositorio")));
  } finally {
    rmSync(origen, { recursive: true, force: true });
    rmSync(destino, { recursive: true, force: true });
  }
});
