import { describe, expect, test } from "vitest";
import {
  actualizarUsuarioAdmin,
  AutoDesactivacionError,
  UltimoAdministradorError,
  UsuarioNoEncontradoError,
} from "./ActualizarUsuarioAdmin";
import { crearUsuarioAdmin, CorreoDuplicadoError } from "./CrearUsuarioAdmin";
import { iniciarSesion, CredencialesInvalidasError } from "./IniciarSesion";
import { validarSesion } from "./ValidarSesion";
import type { UsuarioAdmin } from "../entities/UsuarioAdmin";
import type { IUsuarioAdminRepository } from "../ports/IUsuarioAdminRepository";

function admin(id: string, activo = true): UsuarioAdmin {
  return { id, organizacionId: "org", sucursalId: null, nombre: id, telefono: null, fotoUrl: null, email: `${id}@ejemplo.pe`, activo };
}

// Repositorio en memoria con la misma regla que el real: no se desactiva al último activo.
function crearRepo(usuarios: UsuarioAdmin[]) {
  const escrituras: string[] = [];
  const repo = {
    crear: async (datos: { email: string; nombre: string }) => {
      escrituras.push("crear");
      const nuevo = { ...admin(datos.nombre), email: datos.email };
      usuarios.push(nuevo);
      return nuevo;
    },
    buscarPorId: async (_org: string, id: string) => usuarios.find((u) => u.id === id) ?? null,
    buscarPorIdSinOrganizacion: async (id: string) => usuarios.find((u) => u.id === id) ?? null,
    buscarCredencialesPorEmail: async (email: string) => {
      const usuario = usuarios.find((u) => u.email === email);
      return usuario ? { usuario, passwordHash: "hash" } : null;
    },
    actualizar: async (_org: string, id: string, cambios: Partial<UsuarioAdmin>) => {
      const usuario = usuarios.find((u) => u.id === id);
      if (!usuario) return null;
      escrituras.push("actualizar");
      Object.assign(usuario, cambios);
      return usuario;
    },
    desactivarConservandoUnoActivo: async (_org: string, id: string) => {
      const usuario = usuarios.find((u) => u.id === id);
      if (!usuario) return null;
      if (!usuario.activo) return usuario;
      if (!usuarios.some((u) => u.activo && u.id !== id)) return "ULTIMO_ADMINISTRADOR" as const;
      escrituras.push("desactivar");
      usuario.activo = false;
      return usuario;
    },
  } as unknown as IUsuarioAdminRepository;
  return { repo, escrituras };
}

const cambio = (id: string, usuarioIdSolicitante: string, activo: boolean) => ({
  organizacionId: "org",
  usuarioIdSolicitante,
  id,
  cambios: { activo },
});

describe("actualizarUsuarioAdmin", () => {
  test("desactiva y reactiva a otro administrador", async () => {
    const { repo } = crearRepo([admin("a"), admin("b")]);
    expect((await actualizarUsuarioAdmin({ usuarios: repo }, cambio("b", "a", false))).activo).toBe(false);
    expect((await actualizarUsuarioAdmin({ usuarios: repo }, cambio("b", "a", true))).activo).toBe(true);
  });

  test("nadie se desactiva a sí mismo, ni siquiera el único activo", async () => {
    const { repo, escrituras } = crearRepo([admin("a"), admin("b")]);
    await expect(actualizarUsuarioAdmin({ usuarios: repo }, cambio("a", "a", false))).rejects.toBeInstanceOf(AutoDesactivacionError);
    const solo = crearRepo([admin("a")]);
    await expect(actualizarUsuarioAdmin({ usuarios: solo.repo }, cambio("a", "a", false))).rejects.toBeInstanceOf(AutoDesactivacionError);
    expect(escrituras).toEqual([]);
    expect(solo.escrituras).toEqual([]);
  });

  test("no deja el sistema sin administradores activos", async () => {
    const { repo, escrituras } = crearRepo([admin("a"), admin("b", false)]);
    await expect(actualizarUsuarioAdmin({ usuarios: repo }, cambio("a", "b", false))).rejects.toBeInstanceOf(UltimoAdministradorError);
    expect(escrituras).toEqual([]);
  });

  test("desactivar a uno ya inactivo no escribe; uno inexistente da UsuarioNoEncontradoError", async () => {
    const { repo, escrituras } = crearRepo([admin("a"), admin("b", false)]);
    await actualizarUsuarioAdmin({ usuarios: repo }, cambio("b", "a", false));
    expect(escrituras).toEqual([]);
    await expect(actualizarUsuarioAdmin({ usuarios: repo }, cambio("zzz", "a", false))).rejects.toBeInstanceOf(UsuarioNoEncontradoError);
  });
});

describe("crearUsuarioAdmin", () => {
  test("crea un administrador y rechaza un correo repetido sin escribir", async () => {
    const { repo, escrituras } = crearRepo([admin("socio")]);
    const base = { organizacionId: "org", sucursalId: null, nombre: "Nuevo", passwordHash: "x" };
    await crearUsuarioAdmin({ usuarios: repo }, { ...base, email: "nuevo@ejemplo.pe" });
    expect(escrituras).toEqual(["crear"]);
    await expect(crearUsuarioAdmin({ usuarios: repo }, { ...base, email: "socio@ejemplo.pe" })).rejects.toBeInstanceOf(CorreoDuplicadoError);
    expect(escrituras).toEqual(["crear"]);
  });
});

describe("administrador desactivado", () => {
  test("no puede iniciar sesión", async () => {
    const { repo } = crearRepo([admin("a", false)]);
    const deps = {
      usuarios: repo,
      hasher: { comparar: async () => true },
      sesiones: { crear: async () => undefined },
    } as unknown as Parameters<typeof iniciarSesion>[0];
    await expect(iniciarSesion(deps, { email: "a@ejemplo.pe", password: "x", sucursalActivaId: "s1" })).rejects.toBeInstanceOf(CredencialesInvalidasError);
  });

  test("su sesión vigente deja de valer", async () => {
    const { repo } = crearRepo([admin("a", false)]);
    const eliminadas: string[] = [];
    const deps = {
      usuarios: repo,
      sesiones: {
        buscarPorToken: async () => ({ usuarioId: "a", sucursalActivaId: "s1", expiraEn: new Date(Date.now() + 60_000) }),
        eliminarPorToken: async (token: string) => {
          eliminadas.push(token);
        },
      },
    } as unknown as Parameters<typeof validarSesion>[0];
    expect(await validarSesion(deps, "token")).toBeNull();
    // La sesión de una cuenta desactivada se elimina (S-01).
    expect(eliminadas).toEqual(["token"]);
  });
});
