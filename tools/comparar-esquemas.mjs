#!/usr/bin/env node
// Compara dos bases PostgreSQL (S-22, REQ-S22-003): tablas, columnas, tipos, nulabilidad, valores
// predeterminados, índices y unicidades, claves foráneas con sus acciones, claves primarias y enums.
// Los nombres de índices y restricciones se ignoran: dos ORM los nombran distinto.
// Uso: node tools/comparar-esquemas.mjs <url-base-A> <url-base-B>
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validarDatabaseUrl } from "./base-efimera.mjs";

const CONSULTAS = {
  enums: `select t.typname as nombre, e.enumlabel as etiqueta, e.enumsortorder as orden
          from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
          where n.nspname = 'public' order by t.typname, e.enumsortorder`,
  columnas: `select c.relname as tabla, a.attname as columna, format_type(a.atttypid, a.atttypmod) as tipo,
                    a.attnotnull as no_nulo, pg_get_expr(d.adbin, d.adrelid) as predeterminado
             from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
             left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
             where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
             order by c.relname, a.attname`,
  indices: `select tablename as tabla, indexdef as definicion from pg_indexes where schemaname = 'public' order by tablename, indexdef`,
  restricciones: `select c.relname as tabla, k.contype as tipo, pg_get_constraintdef(k.oid) as definicion
                  from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and k.contype in ('f', 'p', 'u', 'c') order by c.relname, k.contype, pg_get_constraintdef(k.oid)`,
};

/** Quita el nombre del índice: "CREATE UNIQUE INDEX nombre ON public.t USING ..." -> "CREATE UNIQUE INDEX ON public.t USING ...". */
const sinNombreIndice = (def) => def.replace(/^(CREATE (?:UNIQUE )?INDEX) \S+ ON/, "$1 ON");

/** Lee el catálogo de una base con un cliente que tenga query(sql) -> { rows }. */
export async function leerCatalogo(cliente) {
  const [enums, columnas, indices, restricciones] = await Promise.all(
    ["enums", "columnas", "indices", "restricciones"].map(async (k) => (await cliente.query(CONSULTAS[k])).rows),
  );
  const catalogo = { enums: {}, tablas: {} };
  for (const e of enums) (catalogo.enums[e.nombre] ??= []).push(e.etiqueta);
  const tabla = (n) => (catalogo.tablas[n] ??= { columnas: {}, indices: [], restricciones: [] });
  for (const c of columnas) tabla(c.tabla).columnas[c.columna] = { tipo: c.tipo, noNulo: c.no_nulo, predeterminado: c.predeterminado };
  for (const i of indices) tabla(i.tabla).indices.push(sinNombreIndice(i.definicion));
  for (const r of restricciones) tabla(r.tabla).restricciones.push(`${r.tipo}:${r.definicion}`);
  for (const t of Object.values(catalogo.tablas)) { t.indices.sort(); t.restricciones.sort(); }
  return catalogo;
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Devuelve la lista de diferencias entre dos catálogos (vacía si son equivalentes). */
export function compararCatalogos(a, b, nombres = ["A", "B"]) {
  const dif = [];
  const [na, nb] = nombres;
  for (const e of new Set([...Object.keys(a.enums), ...Object.keys(b.enums)])) {
    if (!a.enums[e]) dif.push(`enum ${e}: solo en ${nb}`);
    else if (!b.enums[e]) dif.push(`enum ${e}: solo en ${na}`);
    else if (!igual([...a.enums[e]].sort(), [...b.enums[e]].sort())) dif.push(`enum ${e}: valores distintos (${na}: ${a.enums[e].join(",")}; ${nb}: ${b.enums[e].join(",")})`);
  }
  for (const t of new Set([...Object.keys(a.tablas), ...Object.keys(b.tablas)])) {
    const ta = a.tablas[t], tb = b.tablas[t];
    if (!ta) { dif.push(`tabla ${t}: solo en ${nb}`); continue; }
    if (!tb) { dif.push(`tabla ${t}: solo en ${na}`); continue; }
    for (const c of new Set([...Object.keys(ta.columnas), ...Object.keys(tb.columnas)])) {
      const ca = ta.columnas[c], cb = tb.columnas[c];
      if (!ca) { dif.push(`columna ${t}.${c}: solo en ${nb}`); continue; }
      if (!cb) { dif.push(`columna ${t}.${c}: solo en ${na}`); continue; }
      if (ca.tipo !== cb.tipo) dif.push(`columna ${t}.${c}: tipo ${na}=${ca.tipo} ${nb}=${cb.tipo}`);
      if (ca.noNulo !== cb.noNulo) dif.push(`columna ${t}.${c}: nulabilidad ${na}=${ca.noNulo ? "NOT NULL" : "NULL"} ${nb}=${cb.noNulo ? "NOT NULL" : "NULL"}`);
      if ((ca.predeterminado ?? null) !== (cb.predeterminado ?? null)) dif.push(`columna ${t}.${c}: valor predeterminado ${na}=${ca.predeterminado} ${nb}=${cb.predeterminado}`);
    }
    for (const i of new Set([...ta.indices, ...tb.indices])) {
      if (!ta.indices.includes(i)) dif.push(`índice en ${t}: solo en ${nb}: ${i}`);
      else if (!tb.indices.includes(i)) dif.push(`índice en ${t}: solo en ${na}: ${i}`);
    }
    for (const r of new Set([...ta.restricciones, ...tb.restricciones])) {
      if (!ta.restricciones.includes(r)) dif.push(`restricción en ${t}: solo en ${nb}: ${r}`);
      else if (!tb.restricciones.includes(r)) dif.push(`restricción en ${t}: solo en ${na}: ${r}`);
    }
  }
  return dif;
}

export async function compararBases(urlA, urlB, crearCliente) {
  validarDatabaseUrl(urlA); validarDatabaseUrl(urlB);
  const abrir = async (url) => { const c = await crearCliente(url); await c.connect(); return c; };
  const [ca, cb] = [await abrir(urlA), await abrir(urlB)];
  try {
    return compararCatalogos(await leerCatalogo(ca), await leerCatalogo(cb));
  } finally {
    await ca.end(); await cb.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [urlA, urlB] = process.argv.slice(2);
  if (!urlA || !urlB) { console.error("uso: node tools/comparar-esquemas.mjs <url-base-A> <url-base-B>"); process.exit(2); }
  const { default: pg } = await import("pg");
  try {
    const dif = await compararBases(urlA, urlB, (u) => new pg.Client({ connectionString: u }));
    if (dif.length) { console.error(dif.map((d) => `comparar-esquemas: ${d}`).join("\n")); process.exit(1); }
    console.log("comparar-esquemas: las bases son equivalentes");
  } catch (e) {
    console.error(`comparar-esquemas: ${e.message}`);
    process.exit(2);
  }
}
