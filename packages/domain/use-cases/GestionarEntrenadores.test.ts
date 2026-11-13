import { describe, expect, it } from "vitest";
import type { IEntrenadorRepository } from "../ports/IEntrenadorRepository";
import type { Entrenador } from "../entities/Entrenador";
import {
  actualizarEntrenador,
  cambiarEstadoEntrenador,
  crearEntrenador,
  EntrenadorInactivoError,
  EntrenadorNoEncontradoError,
  NombreEntrenadorInvalidoError,
  validarEntrenadorAsignable,
} from "./GestionarEntrenadores";

function repoEnMemoria(inicial: Entrenador[] = []): IEntrenadorRepository {
  const datos = new Map(inicial.map((e) => [e.id, e]));
  let n = 0;
  return {
    listarTodos: async () => [...datos.values()],
    listarActivos: async () => [...datos.values()].filter((e) => e.activo).map(({ id, nombre }) => ({ id, nombre })),
    buscarPorId: async (id) => datos.get(id) ?? null,
    crear: async (d) => {
      const e = { id: `e${++n}`, activo: true, ...d };
      datos.set(e.id, e);
      return e;
    },
    actualizar: async (id, d) => {
      const e = { ...datos.get(id)!, ...d };
      datos.set(id, e);
      return e;
    },
  };
}

const ana: Entrenador = { id: "a", nombre: "Ana", telefono: null, fotoUrl: null, activo: true };
const luis: Entrenador = { id: "l", nombre: "Luis", telefono: null, fotoUrl: null, activo: false };

describe("entrenadores (S-18)", () => {
  it("crea con el nombre recortado y rechaza nombre vacío", async () => {
    const deps = { entrenadores: repoEnMemoria() };
    const e = await crearEntrenador(deps, { nombre: "  Marta  ", telefono: " " });
    expect(e).toMatchObject({ nombre: "Marta", telefono: null, activo: true });
    await expect(crearEntrenador(deps, { nombre: "   " })).rejects.toBeInstanceOf(NombreEntrenadorInvalidoError);
  });

  it("actualizar y cambiar estado exigen que exista", async () => {
    const deps = { entrenadores: repoEnMemoria([ana]) };
    await expect(actualizarEntrenador(deps, "x", { nombre: "Z" })).rejects.toBeInstanceOf(EntrenadorNoEncontradoError);
    await expect(cambiarEstadoEntrenador(deps, "x", false)).rejects.toBeInstanceOf(EntrenadorNoEncontradoError);
    expect((await cambiarEstadoEntrenador(deps, "a", false)).activo).toBe(false);
  });

  it("asignación: sin id es válido, inexistente falla, inactivo falla salvo que ya lo tuviera", async () => {
    const deps = { entrenadores: repoEnMemoria([ana, luis]) };
    expect(await validarEntrenadorAsignable(deps, null)).toBeNull();
    expect(await validarEntrenadorAsignable(deps, "a")).toBe("a");
    await expect(validarEntrenadorAsignable(deps, "x")).rejects.toBeInstanceOf(EntrenadorNoEncontradoError);
    await expect(validarEntrenadorAsignable(deps, "l")).rejects.toBeInstanceOf(EntrenadorInactivoError);
    expect(await validarEntrenadorAsignable(deps, "l", "l")).toBe("l");
  });
});
