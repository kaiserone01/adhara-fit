import { describe, expect, test } from "vitest";
import { eliminarMiembro } from "./EliminarMiembro";
import { MiembroNoEncontradoError } from "./ActualizarMiembro";
import { MiembroFueraDeSucursalError } from "./ObtenerMiembro";

function crearDeps(opciones: { miembro?: { sucursalId: string | null } | null } = {}) {
  const { miembro = { sucursalId: "s1" } } = opciones;
  const eliminados: string[] = [];
  const deps = {
    miembros: {
      buscarPorId: async () => miembro,
      eliminarConHistorial: async (_org: string, id: string) => {
        eliminados.push(id);
      },
    },
    sucursales: { buscarPorId: async () => ({ nombre: "Tipuro" }) },
  } as unknown as Parameters<typeof eliminarMiembro>[0];
  return { deps, eliminados };
}

const input = { organizacionId: "org", id: "m1", sucursalActivaId: "s1", usuarioIdSolicitante: "u1" };

describe("eliminarMiembro", () => {
  test("en su sucursal, borra al miembro con su historial", async () => {
    const { deps, eliminados } = crearDeps();
    await eliminarMiembro(deps, input);
    expect(eliminados).toEqual(["m1"]);
  });

  test("un miembro de sucursal 'Ambas' (null) se puede eliminar desde cualquier sucursal", async () => {
    const { deps, eliminados } = crearDeps({ miembro: { sucursalId: null } });
    await eliminarMiembro(deps, input);
    expect(eliminados).toEqual(["m1"]);
  });

  test("miembro inexistente → MiembroNoEncontradoError", async () => {
    const { deps } = crearDeps({ miembro: null });
    await expect(eliminarMiembro(deps, input)).rejects.toBeInstanceOf(MiembroNoEncontradoError);
  });

  test("miembro de otra sucursal → MiembroFueraDeSucursalError y no borra", async () => {
    const { deps, eliminados } = crearDeps({ miembro: { sucursalId: "s2" } });
    await expect(eliminarMiembro(deps, input)).rejects.toBeInstanceOf(MiembroFueraDeSucursalError);
    expect(eliminados).toEqual([]);
  });
});
