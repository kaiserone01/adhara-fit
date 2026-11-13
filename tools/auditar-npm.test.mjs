import { test } from "node:test";
import assert from "node:assert/strict";
import { avisosNuevos, ejecutarAuditoria } from "./auditar-npm.mjs";

const baseline = { avisos_high_critical: [{ paquete: "next", severidad: "critical", ids: ["1", "2"] }, { paquete: "prisma", severidad: "high", ids: [] }] };
const vuln = (severity, ...ids) => ({ severity, via: ids.map((source) => ({ source })) });

test("los avisos de la línea base no fallan (BEH-S00-011)", () => {
  assert.deepEqual(avisosNuevos({ vulnerabilities: { next: vuln("critical", 1, 2), prisma: vuln("high") } }, baseline), []);
});

test("un aviso high nuevo falla solo por él", () => {
  const n = avisosNuevos({ vulnerabilities: { next: vuln("critical", 1), lodash: vuln("high", 99) } }, baseline);
  assert.deepEqual(n, [{ paquete: "lodash", severidad: "high", ids: ["99"] }]);
});

test("un identificador nuevo en un paquete conocido falla", () => {
  assert.deepEqual(avisosNuevos({ vulnerabilities: { next: vuln("critical", 1, 3) } }, baseline), [{ paquete: "next", severidad: "critical", ids: ["3"] }]);
});

test("moderate y low se ignoran", () => {
  assert.deepEqual(avisosNuevos({ vulnerabilities: { x: vuln("moderate", 5), y: vuln("low", 6) } }, baseline), []);
});

// ejecutarAuditoria: se inyecta un `spawn` falso; nunca se ejecuta npm real ni se usa la red.
const falso = (resultado) => {
  const llamadas = [];
  const spawn = (...args) => { llamadas.push(args); return resultado; };
  return { spawn, llamadas };
};

test("npm audit con vulnerabilidades (status 1) y JSON en stdout no es un error", () => {
  const { spawn } = falso({ status: 1, stdout: '{"vulnerabilities":{}}', error: undefined });
  assert.equal(ejecutarAuditoria("/raiz", { spawn, plataforma: "linux" }), '{"vulnerabilities":{}}');
});

test("sin stdout falla con un mensaje claro en español", () => {
  const { spawn } = falso({ status: null, stdout: undefined });
  assert.throws(() => ejecutarAuditoria("/raiz", { spawn, plataforma: "linux" }), /auditar-npm: .*npm audit.*salida/);
});

test("si spawn informa un error, el mensaje lo incluye", () => {
  const { spawn } = falso({ status: null, stdout: "", error: new Error("spawn npm ENOENT") });
  assert.throws(() => ejecutarAuditoria("/raiz", { spawn, plataforma: "linux" }), /auditar-npm: .*spawn npm ENOENT/);
});

test("stdout vacío con status 0 también falla", () => {
  const { spawn } = falso({ status: 0, stdout: "  \n" });
  assert.throws(() => ejecutarAuditoria("/raiz", { spawn, plataforma: "linux" }), /auditar-npm: /);
});

test("en win32 se ejecuta con shell; en otras plataformas no", () => {
  const w = falso({ status: 0, stdout: "{}" });
  ejecutarAuditoria("C:/raiz", { spawn: w.spawn, plataforma: "win32" });
  assert.equal(w.llamadas[0][2].shell, true);
  assert.equal(w.llamadas[0][2].cwd, "C:/raiz");
  assert.equal([w.llamadas[0][0], ...w.llamadas[0][1]].join(" "), "npm audit --json");
  const l = falso({ status: 0, stdout: "{}" });
  ejecutarAuditoria("/raiz", { spawn: l.spawn, plataforma: "linux" });
  assert.equal(l.llamadas[0][2].shell, false);
});

test("se invoca `npm audit --json`", () => {
  const { spawn, llamadas } = falso({ status: 0, stdout: "{}" });
  ejecutarAuditoria("/raiz", { spawn, plataforma: "linux" });
  assert.equal(llamadas[0][0], "npm");
  assert.deepEqual(llamadas[0][1], ["audit", "--json"]);
});
