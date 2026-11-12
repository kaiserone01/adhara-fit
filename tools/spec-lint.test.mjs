// Tests de spec-lint. Ejecutar: node --test tools/spec-lint.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ejecutar, cargarAdrs, ADJETIVOS_VAGOS } from './spec-lint.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const fx = (n) => readFileSync(join(AQUI, 'fixtures/spec-lint', n), 'utf8');
const BUENA = fx('buena-aprobada.md');

const ADR_ACEPTADO = 'Estado: **aceptado** (confirmado por el propietario, 2026-01-10)\n';
const ADR_PROPUESTO = 'Estado: **propuesto** (2026-11-12)\n';

/** Crea una raíz temporal con ADRs y specs. specs: { 'S-99-x.md': texto } */
function armar(specs, adrs = { 'ADR-001-base.md': ADR_ACEPTADO, 'ADR-002-otro.md': ADR_PROPUESTO }) {
  const root = mkdtempSync(join(tmpdir(), 'spec-lint-'));
  mkdirSync(join(root, 'docs/adr'), { recursive: true });
  mkdirSync(join(root, 'docs/superpowers/specs'), { recursive: true });
  for (const [f, t] of Object.entries(adrs)) writeFileSync(join(root, 'docs/adr', f), t);
  for (const [f, t] of Object.entries(specs)) writeFileSync(join(root, 'docs/superpowers/specs', f), t);
  return root;
}
function lint(texto, { archivo = 'S-99-ejemplo.md', ...resto } = {}) {
  const root = armar({ [archivo]: texto });
  // write: true evita el ruido de la trazabilidad ausente; la trazabilidad se prueba aparte.
  try { return { ...ejecutar({ root, write: true, ...resto }), root }; } finally { rmSync(root, { recursive: true, force: true }); }
}
const reglas = (r, nivel = 'error') => r.diag.filter((x) => x.nivel === nivel).map((x) => x.regla);
function sustituir(texto, de, a = '') {
  assert.ok(texto.includes(de), `el texto base no contiene: ${de}`);
  return texto.replace(de, a);
}
const enRevision = (t) => sustituir(sustituir(t, 'estado: aprobada', 'estado: en-revision'), 'aprobada_por: propietario\nfecha_aprobacion: 2026-01-15', 'aprobada_por:\nfecha_aprobacion:');
const borrador = (t) => sustituir(enRevision(t), 'estado: en-revision', 'estado: borrador');

// ------------------------------------------------------------ specs buenas
test('spec buena aprobada: sin errores ni avisos', () => {
  const r = lint(BUENA);
  assert.deepEqual(r.diag, []);
  assert.equal(r.specs, 1);
});
test('spec buena como en-revision y como borrador: sin errores', () => {
  assert.deepEqual(lint(enRevision(BUENA)).errores, []);
  assert.deepEqual(lint(borrador(BUENA)).errores, []);
});

// ------------------------------------------------------------ specs malas (archivos)
test('borrador incompleto: avisa pero no falla', () => {
  const r = lint(fx('mala-borrador-incompleto.md'), { archivo: 'S-98-borrador.md' });
  assert.equal(r.errores.length, 0);
  const avisos = reglas(r, 'aviso');
  for (const esperado of ['A02', 'C01', 'C02', 'C03', 'E05', 'T03', 'T04', 'C04']) assert.ok(avisos.includes(esperado), `falta el aviso ${esperado}: ${avisos}`);
});
test('el mismo borrador falla con --strict (los avisos pasan a errores)', () => {
  const r = lint(fx('mala-borrador-incompleto.md'), { archivo: 'S-98-borrador.md', strict: true });
  assert.ok(r.errores.length > 0);
});
test('en-revision sin cobertura: falla con REQ sin BEH, MUST sin AC e INV sin AC', () => {
  const r = lint(fx('mala-sin-cobertura.md'), { archivo: 'S-97-sin-cobertura.md' });
  const e = reglas(r);
  for (const esperado of ['C01', 'C02', 'C03', 'C04']) assert.ok(e.includes(esperado), `falta ${esperado}: ${e}`);
});

// ------------------------------------------------------------ cabecera
test('cabecera: ausente, campos, id, estado y aprobación', () => {
  assert.ok(reglas(lint(BUENA.replace(/^---[\s\S]*?---\n/, ''))).includes('H01'));
  assert.ok(reglas(lint(sustituir(BUENA, 'depende_de: ninguna\n'))).includes('H02'));
  assert.ok(reglas(lint(sustituir(BUENA, 'id: S-99', 'id: S-98'))).includes('H03'));
  assert.ok(reglas(lint(sustituir(BUENA, 'estado: aprobada', 'estado: terminada'))).includes('H04'));
  assert.ok(reglas(lint(sustituir(BUENA, 'aprobada_por: propietario', 'aprobada_por:'))).includes('H05'));
  assert.ok(reglas(lint(sustituir(BUENA, 'fecha_aprobacion: 2026-01-15', 'fecha_aprobacion: 15/01/2026'))).includes('H05'));
  assert.ok(reglas(lint(sustituir(BUENA, 'estado: aprobada', 'estado: en-revision'))).includes('H05'), 'en-revision con aprobada_por');
  assert.ok(reglas(lint(sustituir(borrador(BUENA), 'aprobada_por:', 'aprobada_por: propietario')), 'aviso').includes('H05'), 'el borrador solo avisa');
  assert.ok(reglas(lint(BUENA, { archivo: 'S-99-Mal_Nombre.md' })).includes('N01'));
});

// ------------------------------------------------------------ estructura
test('estructura: secciones y subsecciones obligatorias', () => {
  assert.ok(reglas(lint(sustituir(BUENA, '## 3. Invariantes', '## 3. Cosas'))).includes('S02'));
  assert.ok(reglas(lint(sustituir(BUENA, '### 0.3 Fuera de alcance', '### 0.3 Otra cosa'))).includes('S03'));
  assert.ok(reglas(lint(sustituir(BUENA, '# S-99 — Ejemplo de spec válida\n'))).includes('S01'));
});

// ------------------------------------------------------------ IDs y referencias
test('IDs: formato, duplicados, otra spec y ubicación', () => {
  assert.ok(reglas(lint(sustituir(BUENA, '### REQ-S99-005', '### REQ-S99-5'))).includes('I01'));
  assert.ok(reglas(lint(sustituir(BUENA, '### REQ-S99-005', '### REQ-S98-005'))).includes('I01'), 'ID de otra spec');
  assert.ok(reglas(lint(sustituir(BUENA, '### REQ-S99-005', '### REQ-S99-004'))).includes('I02'));
  assert.ok(reglas(lint(sustituir(BUENA, '### INV-S99-001', '### REQ-S99-009'))).includes('I03'), 'REQ fuera de la sección 1');
});
test('referencias: cubre, protege, enlaza y depende_de', () => {
  assert.ok(reglas(lint(sustituir(BUENA, 'cubre: REQ-S99-003', 'cubre: REQ-S99-099'))).includes('R01'));
  assert.ok(reglas(lint(sustituir(BUENA, 'protege: REQ-S99-001', 'protege: BEH-S99-001'))).includes('R01'));
  assert.ok(reglas(lint(sustituir(BUENA, 'enlaza: INV-S99-001', 'enlaza: INV-S99-077'))).includes('R01'));
  assert.ok(reglas(lint(sustituir(BUENA, 'depende_de: ninguna', 'depende_de: S-42'))).includes('R02'));
  assert.ok(reglas(lint(sustituir(BUENA, 'depende_de: ninguna', 'depende_de: S-99'))).includes('H06'));
});

// ------------------------------------------------------------ campos y EARS
test('REQ: tipo, prioridad, origen, plantilla EARS y una sola obligación', () => {
  assert.ok(reglas(lint(sustituir(BUENA, 'tipo: cuando', 'tipo: siempre'))).includes('E01'));
  assert.ok(reglas(lint(sustituir(BUENA, 'prioridad: MUST', 'prioridad: DEBE'))).includes('E01'));
  assert.ok(reglas(lint(sustituir(BUENA, 'origen: ADR-001\n- texto: Cuando', 'origen:\n- texto: Cuando'))).includes('E01'));
  assert.ok(reglas(lint(sustituir(BUENA, 'texto: Cuando se registra', 'texto: Al registrar'))).includes('E02'));
  assert.ok(reglas(lint(sustituir(BUENA, 'texto: Si el registro llega con una fecha futura entonces', 'texto: Si el registro llega con una fecha futura,'))).includes('E02'));
  assert.ok(reglas(lint(sustituir(BUENA, 'tipo: ubicuo', 'tipo: ubicuo\n- x: y').replace('texto: El sistema deberá responder', 'texto: Cuando sea necesario, el sistema deberá responder'))).includes('E02'));
  assert.ok(reglas(lint(sustituir(BUENA, 'incrementar el total del día en 1.', 'incrementar el total del día en 1 y deberá notificar.'))).includes('E03'));
  assert.ok(reglas(lint(sustituir(BUENA, 'el sistema deberá incrementar', 'el sistema incrementará'))).includes('E03'));
  // El plural "deberán" cuenta como una obligación (sujeto plural), pero dos obligaciones siguen fallando.
  assert.ok(!reglas(lint(sustituir(BUENA, 'El sistema deberá responder la consulta', 'Las consultas deberán responder'))).includes('E03'));
  assert.ok(reglas(lint(sustituir(BUENA, 'El sistema deberá responder la consulta', 'Las consultas deberán responder y deberán registrarse'))).includes('E03'));
});
test('BEH, INV y AC: campos obligatorios y valores permitidos', () => {
  assert.ok(reglas(lint(sustituir(BUENA, 'categoria: borde', 'categoria: raro'))).includes('E04'));
  assert.ok(reglas(lint(sustituir(BUENA, '- entonces: el total del día es 1\n'))).includes('E04'));
  assert.ok(reglas(lint(sustituir(BUENA, 'mecanismo: restriccion-bd', 'mecanismo: confianza'))).includes('E05'));
  assert.ok(reglas(lint(sustituir(BUENA, '- deteccion: una consulta SQL que cuenta las filas con total menor que 0 debe devolver 0\n'))).includes('E05'));
  assert.ok(reglas(lint(sustituir(BUENA, '- propiedad: el total del día nunca es negativo\n'))).includes('E05'));
  assert.ok(reglas(lint(sustituir(BUENA, 'adrs: ADR-001', 'adrs:'))).includes('H06'), 'adrs vacío (debe decir ninguno)');
  assert.ok(reglas(lint(sustituir(BUENA, 'metodo: sql', 'metodo: intuicion'))).includes('E06'));
  assert.ok(reglas(lint(sustituir(BUENA, '- esperado: el resultado es 0\n'))).includes('E06'));
});

// ------------------------------------------------------------ cobertura
test('cobertura: REQ→BEH, REQ MUST→AC (directo o vía BEH), INV→mecanismo y AC', () => {
  assert.ok(reglas(lint(sustituir(BUENA, 'cubre: REQ-S99-004, REQ-S99-005', 'cubre: REQ-S99-004'))).includes('C01'), 'REQ-005 sin BEH');
  // MUST sin AC: el AC de REQ-003 se reapunta a otro requisito y a su BEH.
  const sinAcReq3 = sustituir(BUENA, 'enlaza: REQ-S99-003, BEH-S99-003', 'enlaza: REQ-S99-001');
  assert.ok(reglas(lint(sinAcReq3)).includes('C02'));
  // Un AC que enlaza solo el BEH que cubre el MUST sí cuenta (cobertura transitiva).
  assert.ok(!reglas(lint(sustituir(BUENA, 'enlaza: REQ-S99-003, BEH-S99-003', 'enlaza: BEH-S99-003'))).includes('C02'));
  assert.ok(reglas(lint(sustituir(BUENA, 'enlaza: INV-S99-001', 'enlaza: REQ-S99-001'))).includes('C03'));
});
test('cobertura: categorías de BEH o no_aplica con motivo', () => {
  const sinConcurrencia = sustituir(BUENA, 'categoria: concurrencia', 'categoria: borde');
  assert.ok(reglas(lint(sinConcurrencia)).includes('C04'));
  const conNoAplica = sustituir(sinConcurrencia, '## 2. Comportamiento\n', '## 2. Comportamiento\n\n- no_aplica: concurrencia — el ejemplo es de un solo usuario\n');
  assert.ok(!reglas(lint(conNoAplica)).includes('C04'));
  const sinMotivo = sustituir(sinConcurrencia, '## 2. Comportamiento\n', '## 2. Comportamiento\n\n- no_aplica: concurrencia\n');
  assert.ok(reglas(lint(sinMotivo)).includes('C04'));
});

// ------------------------------------------------------------ ADRs
test('ADRs: inexistente, propuesto y consistencia con el origen', () => {
  assert.ok(reglas(lint(sustituir(BUENA, 'adrs: ADR-001', 'adrs: ADR-077'))).includes('A01'));
  const prop = lint(sustituir(BUENA, 'adrs: ADR-001', 'adrs: ADR-002'));
  assert.ok(reglas(prop).includes('A02'), 'aprobada con ADR propuesto');
  assert.ok(reglas(lint(sustituir(enRevision(BUENA), 'adrs: ADR-001', 'adrs: ADR-002'))).includes('A02'), 'en-revision con ADR propuesto');
  assert.ok(!reglas(lint(sustituir(borrador(BUENA), 'adrs: ADR-001', 'adrs: ADR-002'))).includes('A02'), 'borrador: solo aviso');
  assert.ok(reglas(lint(sustituir(borrador(BUENA), 'adrs: ADR-001', 'adrs: ADR-002')), 'aviso').includes('A02'));
  assert.ok(reglas(lint(sustituir(BUENA, 'origen: ADR-001\n- texto: Cuando', 'origen: ADR-001, ADR-002\n- texto: Cuando'))).includes('A03'));
  assert.ok(!reglas(lint(sustituir(BUENA, 'adrs: ADR-001', 'adrs: ninguno').replace(/origen: ADR-001/g, 'origen: RF-01'))).some((x) => x.startsWith('A')));
});
test('cargarAdrs: solo "aceptado (confirmado por el propietario, AAAA-MM-DD)" cuenta como aceptado', () => {
  const casos = {
    'ADR-001-a.md': 'Estado: aceptado (confirmado por el propietario, 2026-02-03)\n',
    'ADR-002-b.md': 'Estado: **aceptado** (confirmado por el propietario, 2026-02-03)\n',
    'ADR-003-c.md': 'Estado: **propuesto** (2026-11-12)\n',
    'ADR-004-d.md': 'Estado: aceptado\n',
    'ADR-005-e.md': 'Estado: aceptado (confirmado por Claude, 2026-02-03)\n',
    'ADR-006-f.md': '# sin estado\n',
  };
  const root = armar({}, casos);
  try {
    const m = cargarAdrs(join(root, 'docs/adr'));
    assert.deepEqual([...m].map(([k, v]) => [k, v.aceptado]), [['ADR-001', true], ['ADR-002', true], ['ADR-003', false], ['ADR-004', false], ['ADR-005', false], ['ADR-006', false]]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ------------------------------------------------------------ calidad del contenido
test('aprobada: TBD, "por definir" y "etc." fallan; fuera de aprobada y en la revisión no', () => {
  for (const [malo, regla] of [['TBD', 'T01'], ['por definir', 'T01'], ['etc.', 'T01'], ['por determinar', 'T01']]) {
    const t = sustituir(BUENA, '- Reportes históricos.', `- Reportes históricos ${malo}`);
    assert.ok(reglas(lint(t)).includes(regla), malo);
    assert.ok(!reglas(lint(enRevision(t))).includes(regla), `${malo} en en-revision no es error de T01`);
  }
  assert.ok(!reglas(lint(BUENA)).includes('T01'), 'la sección de revisión puede decir "etc."');
  assert.ok(!reglas(lint(sustituir(BUENA, '- Reportes históricos.', '- Reportes históricos y etcétera'))).includes('T01'), '"etcétera" no es "etc."');
});
test('aprobada: adjetivos sin medida fallan, con cifra en la línea pasan', () => {
  assert.ok(ADJETIVOS_VAGOS.includes('rápido'));
  assert.ok(reglas(lint(sustituir(BUENA, 'en menos de 200 ms.', 'de forma rápida.'))).includes('T02'));
  assert.ok(!reglas(lint(sustituir(BUENA, 'en menos de 200 ms.', 'de forma rápida, en menos de 200 ms.'))).includes('T02'));
  assert.ok(!reglas(lint(sustituir(enRevision(BUENA), 'en menos de 200 ms.', 'de forma rápida.'))).includes('T02'), 'solo aplica a aprobada');
});
test('supuestos, comportamiento actual y preguntas abiertas', () => {
  assert.ok(reglas(lint(sustituir(BUENA, 'Default: se usa la hora local de Lima; asumido, por validar.', 'Se usa la hora local.'))).includes('T03'));
  assert.ok(reglas(lint(sustituir(BUENA, 'Default: no se cuentan.', 'Pendiente.'))).includes('T03'));
  assert.ok(reglas(lint(sustituir(BUENA, '(`packages/domain/visitas.ts:12`)', ''))).includes('T04'));
  // Un hecho de existencia o de conteo se acepta con evidencia explícita, pero no con un «verificado» a secas.
  assert.ok(!reglas(lint(sustituir(BUENA, '(`packages/domain/visitas.ts:12`)', '(verificado con `ls packages`)'))).includes('T04'));
  assert.ok(reglas(lint(sustituir(BUENA, '(`packages/domain/visitas.ts:12`)', '(verificado)'))).includes('T04'));
});
test('aprobada exige el bloque "Revisión independiente"', () => {
  assert.ok(reglas(lint(BUENA.replace(/## Revisión independiente[\s\S]*$/, ''))).includes('T05'));
  assert.ok(!reglas(lint(enRevision(BUENA.replace(/## Revisión independiente[\s\S]*$/, '')))).includes('T05'));
});
test('los encabezados dentro de bloques de código se ignoran', () => {
  const t = sustituir(BUENA, '### 5.1 Plan de pruebas\n', '### 5.1 Plan de pruebas\n```\n### REQ-S99-777\n- tipo: nada\n```\n');
  assert.deepEqual(lint(t).diag, []);
});

// ------------------------------------------------------------ trazabilidad
test('trazabilidad: --write la genera y la cadena REQ→BEH→INV→AC→test es correcta', () => {
  const root = armar({ 'S-99-ejemplo.md': BUENA });
  try {
    const w = ejecutar({ root, write: true });
    assert.equal(w.trazabilidad, 'escrita');
    const t = readFileSync(join(root, 'docs/superpowers/TRAZABILIDAD.md'), 'utf8');
    const fila = t.split('\n').find((l) => l.startsWith('| REQ-S99-001 '));
    for (const x of ['MUST', 'BEH-S99-001, BEH-S99-002, BEH-S99-004', 'INV-S99-001', 'AC-S99-001 (integracion), AC-S99-003 (sql)', 'visitas.integracion.test.ts']) assert.ok(fila.includes(x), `${x} ∉ ${fila}`);
    const f4 = t.split('\n').find((l) => l.startsWith('| REQ-S99-004 '));
    assert.ok(f4.includes('| — | — | —'), 'un SHOULD sin INV/AC/test muestra "—"');
    assert.equal(ejecutar({ root }).trazabilidad, 'al día');
    assert.deepEqual(ejecutar({ root }).errores, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('trazabilidad: desactualizada o ausente es un error (Z01)', () => {
  const root = armar({ 'S-99-ejemplo.md': BUENA });
  try {
    assert.ok(ejecutar({ root }).errores.some((e) => e.regla === 'Z01'), 'ausente');
    ejecutar({ root, write: true });
    writeFileSync(join(root, 'docs/superpowers/specs/S-99-ejemplo.md'), sustituir(BUENA, 'test: visitas.test.ts', 'test: otro.test.ts'));
    assert.ok(ejecutar({ root }).errores.some((e) => e.regla === 'Z01'), 'desactualizada');
    // Un cambio de texto que no aparece en la trazabilidad no la deja desactualizada.
    writeFileSync(join(root, 'docs/superpowers/specs/S-99-ejemplo.md'), sustituir(BUENA, 'incrementar el total del día en 1.', 'incrementar el total del día en 2.'));
    assert.ok(!ejecutar({ root }).errores.some((e) => e.regla === 'Z01'), 'sigue al día');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('trazabilidad: con errores de spec no se escribe', () => {
  const root = armar({ 'S-99-ejemplo.md': sustituir(BUENA, 'depende_de: ninguna\n') });
  try {
    const r = ejecutar({ root, write: true });
    assert.ok(r.errores.length > 0);
    assert.equal(existsSync(join(root, 'docs/superpowers/TRAZABILIDAD.md')), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('trazabilidad: es determinista', () => {
  const root = armar({ 'S-99-ejemplo.md': BUENA });
  try {
    assert.equal(ejecutar({ root }).esperado, ejecutar({ root }).esperado);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ------------------------------------------------------------ CLI
test('CLI: códigos de salida 0, 1 y 2', () => {
  const run = (root, ...args) => spawnSync('node', [join(AQUI, 'spec-lint.mjs'), '--root', root, ...args], { encoding: 'utf8' });
  const bueno = armar({ 'S-99-ejemplo.md': BUENA });
  const malo = armar({ 'S-97-sin-cobertura.md': fx('mala-sin-cobertura.md') });
  const borr = armar({ 'S-98-borrador.md': fx('mala-borrador-incompleto.md') });
  try {
    assert.equal(run(bueno, '--write').status, 0);
    assert.equal(run(bueno).status, 0);
    const m = run(malo, '--write');
    assert.equal(m.status, 1);
    assert.match(m.stderr, /error \[C01\]/);
    const b = run(borr, '--write');
    assert.equal(b.status, 0, b.stderr);
    assert.match(b.stderr, /aviso/);
    assert.equal(run(borr, '--strict').status, 1);
    assert.equal(run(bueno, '--opcion-rara').status, 2);
  } finally { for (const r of [bueno, malo, borr]) rmSync(r, { recursive: true, force: true }); }
});

// ------------------------------------------------------------ repositorio real
test('la plantilla de spec, instanciada como borrador, no tiene errores', () => {
  const p = join(RAIZ, 'docs/superpowers/specs/_plantilla-spec.md');
  assert.ok(existsSync(p), 'falta docs/superpowers/specs/_plantilla-spec.md');
  const inst = readFileSync(p, 'utf8').replaceAll('S-xx', 'S-96').replaceAll('Sxx', 'S96').replaceAll('ADR-nnn', 'ADR-001');
  const r = lint(inst, { archivo: 'S-96-plantilla.md' });
  assert.deepEqual(r.errores, [], JSON.stringify(r.errores, null, 1));
  assert.match(inst, /estado: borrador/);
});
test('el repositorio real pasa spec-lint (y TRAZABILIDAD.md está al día)', () => {
  const r = ejecutar({ root: RAIZ });
  assert.deepEqual(r.errores, [], JSON.stringify(r.errores, null, 1));
  assert.ok(existsSync(join(RAIZ, 'docs/superpowers/TRAZABILIDAD.md')));
});
