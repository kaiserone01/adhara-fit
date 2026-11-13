import { test } from "node:test";
import assert from "node:assert/strict";
import { sembrarDatosIniciales, PLANES_INICIALES, METODOS_INICIALES, ENTRENADORES_INICIALES } from "./sembrar-datos-iniciales.mjs";

function clienteFalso({ organizacion = { id: "o1" }, filas = {} } = {}) {
  const tablas = { Plan: filas.Plan ?? 0, MetodoPago: filas.MetodoPago ?? 0, Entrenador: filas.Entrenador ?? 0 };
  const creados = { planes: [], metodos: [], entrenadores: [] };
  return {
    creados,
    async transaccion(fn) {
      return fn({
        primeraOrganizacion: async () => organizacion,
        contar: async (t) => tablas[t],
        crearPlan: async (d) => creados.planes.push(d),
        crearMetodoPago: async (d) => creados.metodos.push(d),
        crearEntrenador: async (d) => creados.entrenadores.push(d),
      });
    },
  };
}

test("crea planes, métodos de pago y entrenadores en tablas vacías", async () => {
  const cliente = clienteFalso();
  const r = await sembrarDatosIniciales(cliente);
  assert.deepEqual(r, { planes: 3, metodosPago: 3, entrenadores: 4 });
  assert.deepEqual(cliente.creados.planes.map((p) => [p.nombre, p.diasCiclo, p.precio]), [["1 mes", 30, "120.00"], ["2 meses", 60, "200.00"], ["3 meses", 90, "280.00"]]);
  assert.equal(cliente.creados.planes.length, PLANES_INICIALES.length);
  assert.equal(cliente.creados.metodos.length, METODOS_INICIALES.length);
  assert.equal(cliente.creados.entrenadores.length, ENTRENADORES_INICIALES.length);
});

test("no toca una tabla que ya tiene filas", async () => {
  const cliente = clienteFalso({ filas: { Plan: 2, Entrenador: 1 } });
  const r = await sembrarDatosIniciales(cliente);
  assert.deepEqual(r, { planes: 0, metodosPago: 3, entrenadores: 0 });
  assert.equal(cliente.creados.planes.length, 0);
  assert.equal(cliente.creados.entrenadores.length, 0);
});

test("sin organización no crea nada", async () => {
  const cliente = clienteFalso({ organizacion: null });
  const r = await sembrarDatosIniciales(cliente);
  assert.ok(r.omitido);
  assert.equal(cliente.creados.planes.length, 0);
});

test("ejecutarlo dos veces no duplica (la segunda ve las tablas con filas)", async () => {
  const r = await sembrarDatosIniciales(clienteFalso({ filas: { Plan: 3, MetodoPago: 3, Entrenador: 4 } }));
  assert.deepEqual(r, { planes: 0, metodosPago: 0, entrenadores: 0 });
});
