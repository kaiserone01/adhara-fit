// AC-S00-006: gitleaks con .gitleaks.toml detecta la cadena de prueba, no da falsos positivos y respeta la allowlist.
// Requiere el binario gitleaks; se omite si no está instalado (el CI lo instala con versión fija).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG = join(dirname(fileURLToPath(import.meta.url)), "..", ".gitleaks.toml");
const instalado = spawnSync("gitleaks", ["version"]).status === 0;
const SECRETO = "ADHARA_TEST_SECRET_" + "AbCd1234EfGh5678"; // prefijo + 16 alfanuméricos

function detectar(archivos, config = CONFIG) {
  const dir = mkdtempSync(join(tmpdir(), "gitleaks-"));
  try {
    for (const [n, c] of Object.entries(archivos)) writeFileSync(join(dir, n), c);
    return spawnSync("gitleaks", ["detect", "--no-git", "--source", dir, "--config", config, "--redact"], { encoding: "utf8" }).status;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("detecta la cadena de prueba y falla (BEH-S00-006)", { skip: !instalado && "gitleaks no está instalado" }, () => {
  assert.equal(detectar({ "a.txt": `valor = ${SECRETO}\n` }), 1);
});

test("un directorio sin la cadena pasa", { skip: !instalado && "gitleaks no está instalado" }, () => {
  assert.equal(detectar({ "a.txt": "nada que ver\n" }), 0);
});

test("la allowlist con motivo suprime el hallazgo (BEH-S00-014)", { skip: !instalado && "gitleaks no está instalado" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "gitleaks-cfg-"));
  try {
    const cfg = join(dir, "g.toml");
    writeFileSync(cfg, `[extend]\npath = ${JSON.stringify(CONFIG)}\n\n[allowlist]\ndescription = "falso positivo revisado"\npaths = ['''a\\.txt''']\n`);
    assert.equal(detectar({ "a.txt": SECRETO + "\n" }, cfg), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
