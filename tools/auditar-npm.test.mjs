import { test } from "node:test";
import assert from "node:assert/strict";
import { avisosNuevos } from "./auditar-npm.mjs";

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
