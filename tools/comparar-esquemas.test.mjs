import { test } from "node:test";
import assert from "node:assert/strict";
import { compararCatalogos, leerCatalogo } from "./comparar-esquemas.mjs";

const base = () => ({
  enums: { Rol: ["A", "B"] },
  tablas: {
    Miembro: {
      columnas: { id: { tipo: "text", noNulo: true, predeterminado: null }, nota: { tipo: "text", noNulo: false, predeterminado: null } },
      indices: ["CREATE UNIQUE INDEX ON public.\"Miembro\" USING btree (id)"],
      restricciones: ["p:PRIMARY KEY (id)", "f:FOREIGN KEY (\"sedeId\") REFERENCES \"Sede\"(id) ON UPDATE CASCADE ON DELETE RESTRICT"],
    },
  },
});
const copia = () => JSON.parse(JSON.stringify(base()));

test("dos catálogos iguales no tienen diferencias", () => assert.deepEqual(compararCatalogos(base(), copia()), []));

test("detecta la nulabilidad, un valor de enum, una acción de clave foránea y un índice (AC-S22-002)", () => {
  const b = copia();
  b.tablas.Miembro.columnas.nota.noNulo = true;
  b.enums.Rol.push("C");
  b.tablas.Miembro.restricciones[1] = b.tablas.Miembro.restricciones[1].replace("ON DELETE RESTRICT", "ON DELETE CASCADE");
  b.tablas.Miembro.indices.push("CREATE INDEX ON public.\"Miembro\" USING btree (nota)");
  const dif = compararCatalogos(base(), b);
  assert.ok(dif.some((d) => d.includes("Miembro.nota") && d.includes("nulabilidad")));
  assert.ok(dif.some((d) => d.includes("enum Rol")));
  assert.ok(dif.some((d) => d.includes("ON DELETE")));
  assert.ok(dif.some((d) => d.includes("índice en Miembro")));
});

test("detecta tipo, valor predeterminado, tabla y columna ausentes", () => {
  const b = copia();
  b.tablas.Miembro.columnas.id.tipo = "uuid";
  b.tablas.Miembro.columnas.nota.predeterminado = "''::text";
  delete b.tablas.Miembro.columnas.nota;
  b.tablas.Otra = { columnas: {}, indices: [], restricciones: [] };
  const dif = compararCatalogos(base(), b);
  assert.ok(dif.some((d) => d.includes("Miembro.id") && d.includes("tipo")));
  assert.ok(dif.some((d) => d.includes("Miembro.nota") && d.includes("solo en A")));
  assert.ok(dif.some((d) => d.includes("tabla Otra")));
});

test("leerCatalogo arma el catálogo y quita el nombre de los índices", async () => {
  const filas = {
    enum: [{ nombre: "Rol", etiqueta: "B", orden: 2 }, { nombre: "Rol", etiqueta: "A", orden: 1 }],
    pg_attribute: [{ tabla: "T", columna: "id", tipo: "text", no_nulo: true, predeterminado: null }],
    pg_indexes: [{ tabla: "T", definicion: "CREATE UNIQUE INDEX \"T_pkey\" ON public.\"T\" USING btree (id)" }],
    pg_constraint: [{ tabla: "T", tipo: "p", definicion: "PRIMARY KEY (id)" }],
  };
  const cliente = { query: async (sql) => ({ rows: filas[Object.keys(filas).find((k) => sql.includes(k))] }) };
  const c = await leerCatalogo(cliente);
  assert.deepEqual(c.enums.Rol, ["B", "A"]);
  assert.deepEqual(c.tablas.T.indices, ["CREATE UNIQUE INDEX ON public.\"T\" USING btree (id)"]);
  assert.deepEqual(c.tablas.T.restricciones, ["p:PRIMARY KEY (id)"]);
});
