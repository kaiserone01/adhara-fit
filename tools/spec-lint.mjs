#!/usr/bin/env node
// spec-lint — valida las specs SDD (cuatro pilares), la cobertura y los ADRs citados, y genera
// docs/superpowers/TRAZABILIDAD.md (REQ → BEH → INV → AC → test). Sin dependencias.
//
// Uso:
//   node tools/spec-lint.mjs            valida y comprueba que TRAZABILIDAD.md está al día
//   node tools/spec-lint.mjs --write    valida y (re)genera TRAZABILIDAD.md
//   opciones: --root <dir> (raíz del repo), --strict (los avisos también fallan)
// Código de salida: 0 sin errores · 1 con errores · 2 uso incorrecto.
// Un borrador solo avisa; una spec en-revision o aprobada falla con código ≠ 0.
// Formato de spec: docs/superpowers/specs/_plantilla-spec.md · reglas: ADR-015 y docs/constitution.md.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ESTADOS = ['borrador', 'en-revision', 'aprobada'];
export const TIPOS_REQ = ['ubicuo', 'cuando', 'mientras', 'si-entonces', 'donde'];
export const PRIORIDADES = ['MUST', 'SHOULD'];
export const CATEGORIAS = ['feliz', 'borde', 'error', 'concurrencia'];
export const MECANISMOS = ['restriccion-bd', 'asercion-dominio', 'transaccion', 'test-propiedad', 'lint'];
export const METODOS = ['unitario', 'integracion', 'e2e', 'sql', 'manual'];
export const CLAVES_CABECERA = ['id', 'estado', 'adrs', 'depende_de', 'aprobada_por', 'fecha_aprobacion'];

// Subsecciones obligatorias (número → texto que debe empezar el encabezado `###`).
const SUBSECCIONES = [
  ['0.1', 'Problema'], ['0.2', 'Dentro de alcance'], ['0.3', 'Fuera de alcance'],
  ['0.4', 'Comportamiento actual verificado'], ['0.5', 'Supuestos'],
  ['5.1', 'Plan de pruebas'], ['5.2', 'Migración'], ['5.3', 'Riesgos'], ['5.4', 'Preguntas abiertas'],
];
const SECCIONES = [
  [0, 'Contexto y alcance'], [1, 'Requisitos'], [2, 'Comportamiento'], [3, 'Invariantes'],
  [4, 'Criterios de aceptación'], [5, 'Plan de pruebas, migración, riesgos y preguntas abiertas'],
];
const SECCION_DE = { REQ: 1, BEH: 2, INV: 3, AC: 4 };

// Texto prohibido en una spec aprobada.
const PROHIBIDO_APROBADA = [
  { id: 'T01', re: /\bTBD\b/i, msg: '"TBD"' },
  { id: 'T01', re: /por definir/i, msg: '"por definir"' },
  { id: 'T01', re: /por determinar/i, msg: '"por determinar"' },
  { id: 'T01', re: /\betc(?![\p{L}])/iu, msg: '"etc."' },
];
// Adjetivos que no son una medida: se aceptan solo si la misma línea trae una cifra.
export const ADJETIVOS_VAGOS = [
  'rápido', 'rápida', 'rápidos', 'rápidas', 'rápidamente', 'lento', 'lenta', 'eficiente', 'eficientes', 'robusto', 'robusta',
  'escalable', 'fácil', 'fáciles', 'sencillo', 'sencilla', 'intuitivo', 'intuitiva', 'amigable', 'adecuado', 'adecuada',
  'razonable', 'razonables', 'suficiente', 'suficientes', 'óptimo', 'óptima', 'flexible', 'flexibles', 'apropiado', 'apropiada', 'simple',
];
const RE_VAGO = new RegExp(`(?<![\\p{L}])(${ADJETIVOS_VAGOS.join('|')})(?![\\p{L}])`, 'iu');
const RE_ARCHIVO_LINEA = /[\w./-]+\.(ts|tsx|js|mjs|prisma|sql|json|md|yml|yaml|cs|kt|sh):\d+/;
const RE_NO_VERIFICADO = /no (re-)?verificado/i;

// ---------------------------------------------------------------- análisis
function marcarFences(lines) {
  let dentro = false;
  return lines.map((l) => {
    if (/^\s*```/.test(l)) { dentro = !dentro; return true; }
    return dentro;
  });
}

function parsearCampos(lines, desde, hasta, fence) {
  const campos = new Map();
  let ultimo = null;
  for (let k = desde; k < hasta; k++) {
    if (fence[k]) continue;
    const m = lines[k].match(/^-\s+([a-z_]+):\s*(.*)$/);
    if (m) {
      ultimo = { v: m[2].trim(), line: k + 1 };
      if (!campos.has(m[1])) campos.set(m[1], []);
      campos.get(m[1]).push(ultimo);
    } else if (ultimo && /^\s{2,}\S/.test(lines[k])) {
      ultimo.v = `${ultimo.v} ${lines[k].trim()}`.trim();
    } else if (lines[k].trim() !== '') {
      ultimo = null;
    }
  }
  return campos;
}

export function parsearSpec(texto) {
  const lines = texto.split('\n');
  const fence = marcarFences(lines);
  const spec = { lines, fence, fm: {}, fmLine: {}, hayFm: false, titulo: '', headings: [], elementos: [], seccion2Campos: new Map(), revision: null };

  let inicio = 0;
  if (lines[0]?.trim() === '---') {
    const fin = lines.findIndex((l, k) => k > 0 && l.trim() === '---');
    if (fin > 0) {
      spec.hayFm = true;
      for (let k = 1; k < fin; k++) {
        const m = lines[k].match(/^([a-z_]+):\s*(.*)$/);
        if (m) { spec.fm[m[1]] = m[2].trim(); spec.fmLine[m[1]] = k + 1; }
      }
      inicio = fin + 1;
    }
  }
  for (let k = inicio; k < lines.length; k++) {
    if (fence[k]) continue;
    const m = lines[k].match(/^(#{1,3}) (.*?)\s*$/);
    if (m) spec.headings.push({ nivel: m[1].length, texto: m[2], line: k + 1, idx: k });
  }
  spec.titulo = spec.headings.find((h) => h.nivel === 1)?.texto ?? '';

  let seccionActual = null;
  spec.headings.forEach((h, j) => {
    const fin = j + 1 < spec.headings.length ? spec.headings[j + 1].idx : lines.length;
    h.fin = fin;
    if (h.nivel === 2) {
      const m = h.texto.match(/^(\d)\. /);
      seccionActual = m ? Number(m[1]) : null;
      h.seccion = seccionActual;
      if (seccionActual === 2) spec.seccion2Campos = parsearCampos(lines, h.idx + 1, fin, fence);
      if (/^Revisión independiente\b/.test(h.texto)) {
        const sig = spec.headings.slice(j + 1).find((x) => x.nivel <= 2);
        spec.revision = { desde: h.idx, hasta: sig ? sig.idx : lines.length, line: h.line };
        seccionActual = null;
      }
    }
    if (h.nivel === 3 && /^(REQ|BEH|INV|AC)-/.test(h.texto)) {
      spec.elementos.push({
        id: h.texto.split(/\s/)[0], prefijo: h.texto.split('-')[0], line: h.line,
        seccion: seccionActual, campos: parsearCampos(lines, h.idx + 1, fin, fence),
      });
    }
  });
  return spec;
}

const campo = (el, k) => el.campos.get(k)?.[0]?.v ?? '';
const lineaDe = (el, k) => el.campos.get(k)?.[0]?.line ?? el.line;
const lista = (v) => v.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);

/** Índice de ADRs: 'ADR-001' → { aceptado, estado }. */
export function cargarAdrs(dirAdr) {
  const idx = new Map();
  if (!existsSync(dirAdr)) return idx;
  for (const f of readdirSync(dirAdr)) {
    const m = f.match(/^(ADR-\d{3})-.*\.md$/);
    if (!m) continue;
    const estado = (readFileSync(join(dirAdr, f), 'utf8').split('\n').find((l) => l.startsWith('Estado:')) ?? '').replace(/^Estado:\s*/, '');
    idx.set(m[1], { aceptado: /^\**aceptado\**\s*\(confirmado por el propietario,\s*\d{4}-\d{2}-\d{2}\)/i.test(estado), estado });
  }
  return idx;
}

// ---------------------------------------------------------------- validación
export function validarSpec(spec, { archivo, adrs, specIds }) {
  const out = [];
  const fm = spec.fm;
  const estadoValido = ESTADOS.includes(fm.estado);
  const blando = estadoValido && fm.estado === 'borrador';
  const d = (regla, linea, msg, fatal = false) => out.push({ nivel: fatal || !blando ? 'error' : 'aviso', regla, linea: linea ?? 1, msg, archivo });

  // --- cabecera
  const idArchivo = archivo.match(/^(S-\d{2})-/)?.[1];
  if (!spec.hayFm) { d('H01', 1, 'falta la cabecera (bloque --- … --- al inicio)', true); return out; }
  for (const k of CLAVES_CABECERA) if (!(k in fm)) d('H02', 1, `falta el campo de cabecera "${k}"`);
  if (!/^S-\d{2}$/.test(fm.id ?? '') || fm.id !== idArchivo) d('H03', spec.fmLine.id, `id "${fm.id ?? ''}" inválido o distinto del nombre del archivo (${idArchivo ?? 'S-NN-slug.md'})`, true);
  if (!estadoValido) d('H04', spec.fmLine.estado, `estado "${fm.estado ?? ''}" inválido (borrador | en-revision | aprobada)`, true);
  const id = fm.id ?? '';
  const sufijo = id.replace('-', ''); // S-00 → S00

  const listaAdrs = /^ninguno$/i.test(fm.adrs ?? '') ? [] : lista(fm.adrs ?? '');
  if (!(fm.adrs ?? '').trim()) d('H06', spec.fmLine.adrs, 'adrs vacío (usa "ninguno" si no depende de ninguno)');
  for (const a of listaAdrs) {
    if (!/^ADR-\d{3}$/.test(a)) { d('H06', spec.fmLine.adrs, `ADR "${a}" con formato inválido (ADR-NNN)`); continue; }
    const info = adrs.get(a);
    if (!info) d('A01', spec.fmLine.adrs, `${a} no existe en docs/adr`);
    else if (!info.aceptado) d('A02', spec.fmLine.adrs, `${a} sigue "propuesto": una spec en-revision o aprobada solo puede citar ADRs aceptados (confirmados por el propietario); un borrador solo avisa`);
  }
  const listaDeps = /^ningun[ao]$/i.test(fm.depende_de ?? '') ? [] : lista(fm.depende_de ?? '');
  if (!(fm.depende_de ?? '').trim()) d('H06', spec.fmLine.depende_de, 'depende_de vacío (usa "ninguna")');
  for (const s of listaDeps) {
    if (!/^S-\d{2}$/.test(s)) d('H06', spec.fmLine.depende_de, `dependencia "${s}" con formato inválido (S-NN)`);
    else if (s === id) d('H06', spec.fmLine.depende_de, 'una spec no puede depender de sí misma');
    else if (!specIds.has(s)) d('R02', spec.fmLine.depende_de, `depende de ${s}, que no existe en docs/superpowers/specs`);
  }
  const fecha = fm.fecha_aprobacion ?? '';
  if (fm.estado === 'aprobada') {
    if (!(fm.aprobada_por ?? '').trim()) d('H05', spec.fmLine.aprobada_por, 'una spec aprobada exige aprobada_por (lo registra el propietario)');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) d('H05', spec.fmLine.fecha_aprobacion, 'una spec aprobada exige fecha_aprobacion AAAA-MM-DD');
  } else if (estadoValido && ((fm.aprobada_por ?? '').trim() || fecha.trim())) {
    d('H05', spec.fmLine.aprobada_por ?? spec.fmLine.fecha_aprobacion, `aprobada_por y fecha_aprobacion deben estar vacíos mientras la spec esté ${fm.estado}`);
  }

  // --- estructura
  if (!spec.titulo) d('S01', 1, 'falta el título (# S-NN — …)');
  const numeradas = spec.headings.filter((h) => h.nivel === 2 && h.seccion != null);
  SECCIONES.forEach(([n, nombre], pos) => {
    const h = numeradas.find((x) => x.seccion === n);
    if (!h || !h.texto.startsWith(`${n}. ${nombre}`)) d('S02', h?.line ?? 1, `falta la sección "## ${n}. ${nombre}"`);
    else if (numeradas[pos] !== h) d('S02', h.line, `la sección ${n} está fuera de orden`);
  });
  for (const [num, nombre] of SUBSECCIONES) {
    if (!spec.headings.some((h) => h.nivel === 3 && h.texto.startsWith(`${num} ${nombre}`))) d('S03', 1, `falta la subsección "### ${num} ${nombre}"`);
  }

  // --- elementos: formato, ubicación, unicidad
  const porId = new Map();
  for (const el of spec.elementos) {
    const esperado = new RegExp(`^${el.prefijo}-${sufijo}-\\d{3}$`);
    if (!/^(REQ|BEH|INV|AC)-S\d{2}-\d{3}$/.test(el.id)) d('I01', el.line, `ID "${el.id}" con formato inválido (p. ej. REQ-S00-001)`);
    else if (!esperado.test(el.id)) d('I01', el.line, `${el.id} no pertenece a esta spec (${id}): las referencias entre specs van en depende_de`);
    if (porId.has(el.id)) d('I02', el.line, `ID duplicado: ${el.id} (también en la línea ${porId.get(el.id).line})`);
    else porId.set(el.id, el);
    if (el.seccion !== SECCION_DE[el.prefijo]) d('I03', el.line, `${el.id} debe estar en la sección ${SECCION_DE[el.prefijo]}`);
  }
  const reqs = spec.elementos.filter((e) => e.prefijo === 'REQ');
  const behs = spec.elementos.filter((e) => e.prefijo === 'BEH');
  const invs = spec.elementos.filter((e) => e.prefijo === 'INV');
  const acs = spec.elementos.filter((e) => e.prefijo === 'AC');
  if (!reqs.length) d('C00', 1, 'la spec no tiene ningún REQ');

  const existe = (ref) => porId.has(ref);
  const prefijoOk = (ref, ...ps) => ps.includes(ref.split('-')[0]);

  // --- campos por tipo
  for (const r of reqs) {
    const tipo = campo(r, 'tipo'); const prio = campo(r, 'prioridad'); const texto = campo(r, 'texto'); const origen = campo(r, 'origen');
    if (!TIPOS_REQ.includes(tipo)) d('E01', lineaDe(r, 'tipo'), `${r.id}: tipo "${tipo}" inválido (${TIPOS_REQ.join(' | ')})`);
    if (!PRIORIDADES.includes(prio)) d('E01', lineaDe(r, 'prioridad'), `${r.id}: prioridad "${prio}" inválida (MUST | SHOULD)`);
    if (!origen) d('E01', r.line, `${r.id}: falta el origen (RF, ADR, DI-/H-)`);
    if (!texto) { d('E01', r.line, `${r.id}: falta el texto`); continue; }
    const ln = lineaDe(r, 'texto');
    const prefijos = { cuando: /^Cuando\s/, mientras: /^Mientras\s/, donde: /^Donde\s/, 'si-entonces': /^Si\s.+\sentonces\s/ };
    if (tipo === 'ubicuo' && /^(Cuando|Mientras|Donde|Si)\s/.test(texto)) d('E02', ln, `${r.id}: es de tipo ubicuo pero empieza con una palabra clave EARS`);
    if (prefijos[tipo] && !prefijos[tipo].test(texto)) d('E02', ln, `${r.id}: no sigue la plantilla EARS "${tipo}" (${{ cuando: 'Cuando …, el sistema deberá …', mientras: 'Mientras …, el sistema deberá …', donde: 'Donde …, el sistema deberá …', 'si-entonces': 'Si … entonces el sistema deberá …' }[tipo]})`);
    const n = (texto.match(/(?<![\p{L}])deberá(?![\p{L}])/giu) ?? []).length; // \b no sirve con "á"
    if (n !== 1) d('E03', ln, `${r.id}: debe expresar UNA sola obligación con "deberá" (tiene ${n})`);
    for (const a of (origen.match(/ADR-\d{3}/g) ?? [])) if (!listaAdrs.includes(a)) d('A03', lineaDe(r, 'origen'), `${r.id}: cita ${a} en su origen pero la cabecera "adrs" no lo incluye`);
  }
  for (const b of behs) {
    const cubre = lista(campo(b, 'cubre'));
    if (!cubre.length) d('E04', b.line, `${b.id}: falta "cubre" (al menos un REQ)`);
    for (const ref of cubre) if (!existe(ref) || !prefijoOk(ref, 'REQ')) d('R01', lineaDe(b, 'cubre'), `${b.id}: cubre ${ref}, que no es un REQ de esta spec`);
    if (!CATEGORIAS.includes(campo(b, 'categoria'))) d('E04', lineaDe(b, 'categoria'), `${b.id}: categoria "${campo(b, 'categoria')}" inválida (${CATEGORIAS.join(' | ')})`);
    for (const k of ['dado', 'cuando', 'entonces']) if (!campo(b, k)) d('E04', b.line, `${b.id}: falta "${k}" (Dado / Cuando / Entonces)`);
  }
  for (const v of invs) {
    if (!campo(v, 'propiedad')) d('E05', v.line, `${v.id}: falta la propiedad`);
    if (!MECANISMOS.includes(campo(v, 'mecanismo'))) d('E05', lineaDe(v, 'mecanismo'), `${v.id}: mecanismo "${campo(v, 'mecanismo')}" inválido (${MECANISMOS.join(' | ')})`);
    if (!campo(v, 'deteccion')) d('E05', v.line, `${v.id}: falta "deteccion" (cómo se detecta una violación)`);
    const protege = lista(campo(v, 'protege'));
    if (!protege.length) d('E05', v.line, `${v.id}: falta "protege" (al menos un REQ)`);
    for (const ref of protege) if (!existe(ref) || !prefijoOk(ref, 'REQ')) d('R01', lineaDe(v, 'protege'), `${v.id}: protege ${ref}, que no es un REQ de esta spec`);
  }
  for (const a of acs) {
    const enlaza = lista(campo(a, 'enlaza'));
    if (!enlaza.length) d('E06', a.line, `${a.id}: falta "enlaza" (REQ, BEH o INV)`);
    for (const ref of enlaza) if (!existe(ref) || prefijoOk(ref, 'AC')) d('R01', lineaDe(a, 'enlaza'), `${a.id}: enlaza ${ref}, que no es un REQ/BEH/INV de esta spec`);
    if (!METODOS.includes(campo(a, 'metodo'))) d('E06', lineaDe(a, 'metodo'), `${a.id}: metodo "${campo(a, 'metodo')}" inválido (${METODOS.join(' | ')})`);
    for (const k of ['procedimiento', 'esperado']) if (!campo(a, k)) d('E06', a.line, `${a.id}: falta "${k}"`);
  }

  // --- cobertura
  const behsDe = new Map(reqs.map((r) => [r.id, behs.filter((b) => lista(campo(b, 'cubre')).includes(r.id))]));
  const invsDe = new Map(reqs.map((r) => [r.id, invs.filter((v) => lista(campo(v, 'protege')).includes(r.id))]));
  const enlazados = (a) => new Set(lista(campo(a, 'enlaza')));
  for (const r of reqs) {
    const bs = behsDe.get(r.id);
    if (!bs.length) d('C01', r.line, `${r.id} no está cubierto por ningún BEH`);
    if (campo(r, 'prioridad') === 'MUST') {
      const viaBeh = bs.map((b) => b.id);
      if (!acs.some((a) => { const e = enlazados(a); return e.has(r.id) || viaBeh.some((x) => e.has(x)); })) d('C02', r.line, `${r.id} es MUST y no tiene ningún AC (directo o a través de un BEH que lo cubra)`);
    }
  }
  for (const v of invs) if (!acs.some((a) => enlazados(a).has(v.id))) d('C03', v.line, `${v.id} no tiene ningún AC que lo enlace`);
  const declaradas = new Set((spec.seccion2Campos.get('no_aplica') ?? []).filter((x) => /^(feliz|borde|error|concurrencia)\s*[—–-]\s*\S+/.test(x.v)).map((x) => x.v.split(/\s*[—–-]\s*/)[0]));
  for (const c of CATEGORIAS) {
    if (!behs.some((b) => campo(b, 'categoria') === c) && !declaradas.has(c)) d('C04', 1, `ningún BEH de categoría "${c}" (añade uno o declara "- no_aplica: ${c} — motivo" en la sección 2)`);
  }

  // --- calidad del contenido (supuestos, comportamiento actual, preguntas abiertas)
  const sub = (num) => spec.headings.find((h) => h.nivel === 3 && h.texto.startsWith(`${num} `));
  const items = (h) => (h ? spec.lines.slice(h.idx + 1, h.fin).map((l, k) => ({ l, line: h.idx + 2 + k })).filter((x) => /^-\s+\S/.test(x.l) && !spec.fence[x.line - 1]) : []);
  for (const it of items(sub('0.4'))) {
    if (!RE_ARCHIVO_LINEA.test(it.l) && !RE_NO_VERIFICADO.test(it.l)) d('T04', it.line, 'comportamiento actual sin archivo:línea ni "no verificado"');
  }
  for (const it of items(sub('0.5'))) {
    if (!/default\s*:/i.test(it.l) || !/asumido, por validar/i.test(it.l)) d('T03', it.line, 'un supuesto debe traer "default:" y la marca "asumido, por validar"');
  }
  for (const it of items(sub('5.4'))) {
    if (!/default\s*:/i.test(it.l)) d('T03', it.line, 'una pregunta abierta debe traer su "default:"');
  }

  // --- aprobada: texto sin ambigüedad
  if (fm.estado === 'aprobada') {
    if (!spec.revision) d('T05', 1, 'una spec aprobada exige el bloque "## Revisión independiente" con el veredicto del revisor');
    spec.lines.forEach((l, k) => {
      if (spec.revision && k >= spec.revision.desde && k < spec.revision.hasta) return;
      if (spec.fence[k]) return;
      for (const p of PROHIBIDO_APROBADA) if (p.re.test(l)) d(p.id, k + 1, `texto no permitido en una spec aprobada: ${p.msg}`);
      const m = l.match(RE_VAGO);
      if (m && !/\d/.test(l)) d('T02', k + 1, `adjetivo sin medida ("${m[1]}"): exprésalo con una cifra o criterio comprobable`);
    });
  }
  return out;
}

// ---------------------------------------------------------------- trazabilidad
export function generarTrazabilidad(specs) {
  const L = ['# Trazabilidad de specs', '',
    '<!-- Generado por `node tools/spec-lint.mjs --write`. No editar a mano. -->', '',
    'Cadena: **REQ → BEH → INV → AC → test**. Una celda "—" indica que no hay elemento enlazado.', ''];
  if (!specs.length) L.push('_Todavía no hay specs en `docs/superpowers/specs/`._', '');
  for (const { spec, archivo } of [...specs].sort((a, b) => a.archivo.localeCompare(b.archivo))) {
    const reqs = spec.elementos.filter((e) => e.prefijo === 'REQ').sort((a, b) => a.id.localeCompare(b.id));
    const behs = spec.elementos.filter((e) => e.prefijo === 'BEH');
    const invs = spec.elementos.filter((e) => e.prefijo === 'INV');
    const acs = spec.elementos.filter((e) => e.prefijo === 'AC');
    L.push(`## ${spec.fm.id ?? archivo} — ${spec.titulo.replace(/^S-\d{2}\s*[—–-]\s*/, '') || archivo} (${spec.fm.estado ?? '?'})`, '',
      `Archivo: \`${archivo}\` · REQ: ${reqs.length} · BEH: ${behs.length} · INV: ${invs.length} · AC: ${acs.length}`, '',
      '| REQ | Prioridad | BEH | INV | AC (método) | Test |', '|---|---|---|---|---|---|');
    for (const r of reqs) {
      const bs = behs.filter((b) => lista(campo(b, 'cubre')).includes(r.id)).map((b) => b.id).sort();
      const vs = invs.filter((v) => lista(campo(v, 'protege')).includes(r.id)).map((v) => v.id).sort();
      const alcance = new Set([r.id, ...bs, ...vs]);
      const as = acs.filter((a) => lista(campo(a, 'enlaza')).some((x) => alcance.has(x))).sort((a, b) => a.id.localeCompare(b.id));
      const tests = [...new Set(as.map((a) => campo(a, 'test')).filter(Boolean))];
      L.push(`| ${r.id} | ${campo(r, 'prioridad') || '—'} | ${bs.join(', ') || '—'} | ${vs.join(', ') || '—'} | ${as.map((a) => `${a.id} (${campo(a, 'metodo') || '?'})`).join(', ') || '—'} | ${tests.join('; ') || '—'} |`);
    }
    L.push('');
  }
  return `${L.join('\n').replace(/\n+$/, '')}\n`;
}

// ---------------------------------------------------------------- ejecución
export function ejecutar({ root, write = false, strict = false }) {
  const dirSpecs = join(root, 'docs/superpowers/specs');
  const dirAdr = join(root, 'docs/adr');
  const fTraz = join(root, 'docs/superpowers/TRAZABILIDAD.md');
  const adrs = cargarAdrs(dirAdr);
  const archivos = existsSync(dirSpecs) ? readdirSync(dirSpecs).filter((f) => /^S-.*\.md$/.test(f)).sort() : [];
  const diag = [];
  const validos = archivos.filter((f) => /^S-\d{2}-[a-z0-9]+(-[a-z0-9]+)*\.md$/.test(f));
  for (const f of archivos.filter((x) => !validos.includes(x))) diag.push({ nivel: 'error', regla: 'N01', archivo: f, linea: 1, msg: 'nombre inválido (S-NN-slug.md, minúsculas y guiones)' });
  const specIds = new Set(validos.map((f) => f.slice(0, 4)));
  const specs = validos.map((archivo) => {
    const spec = parsearSpec(readFileSync(join(dirSpecs, archivo), 'utf8'));
    diag.push(...validarSpec(spec, { archivo, adrs, specIds }));
    return { spec, archivo };
  });
  if (strict) for (const x of diag) x.nivel = 'error';
  const errores = diag.filter((x) => x.nivel === 'error');

  const esperado = generarTrazabilidad(specs);
  let trazabilidad = 'omitida';
  if (write) {
    if (!errores.length) { mkdirSync(dirname(fTraz), { recursive: true }); writeFileSync(fTraz, esperado); trazabilidad = 'escrita'; }
  } else if (specs.length || existsSync(fTraz)) {
    const actual = existsSync(fTraz) ? readFileSync(fTraz, 'utf8') : null;
    if (actual !== esperado) {
      diag.push({ nivel: 'error', regla: 'Z01', archivo: 'docs/superpowers/TRAZABILIDAD.md', linea: 1, msg: 'desactualizado o ausente: ejecuta `node tools/spec-lint.mjs --write` y añade el archivo al commit' });
      trazabilidad = 'desactualizada';
    } else trazabilidad = 'al día';
  }
  return { diag, errores: diag.filter((x) => x.nivel === 'error'), avisos: diag.filter((x) => x.nivel === 'aviso'), specs: specs.length, trazabilidad, esperado };
}

function main(argv) {
  const opts = { root: process.cwd(), write: false, strict: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--write') opts.write = true;
    else if (argv[i] === '--strict') opts.strict = true;
    else if (argv[i] === '--root' && argv[i + 1]) opts.root = argv[++i];
    else { console.error('Uso: spec-lint.mjs [--write] [--strict] [--root <dir>]'); return 2; }
  }
  const r = ejecutar(opts);
  for (const x of r.diag) console.error(`${x.archivo}:${x.linea}: ${x.nivel} [${x.regla}] ${x.msg}`);
  console.log(`spec-lint: ${r.specs} spec(s) · ${r.errores.length} error(es) · ${r.avisos.length} aviso(s) · trazabilidad ${r.trazabilidad}`);
  return r.errores.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main(process.argv.slice(2)));
