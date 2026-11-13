import { afterEach, describe, expect, test, vi } from "vitest";
import { registrarCheckIn, MiembroNoEncontradoError } from "./RegistrarCheckIn";
import type { Miembro } from "../entities/Miembro";

function crearDeps(miembro: Partial<Miembro>) {
  return {
    miembros: {
      buscarPorDocumento: async () => ({
        id: "m1",
        nombre: "Camila Ledezma Barrios",
        fotoUrl: null,
        entrenadorNombre: null,
        fechaVencimiento: null,
        sucursalId: null,
        fechaNacimiento: null,
        ...miembro,
      }),
    },
    // Un check-in reciente existente corta antes de validar el vencimiento.
    checkIns: { buscarRecientePorMiembroYSucursal: async () => ({ estadoAlMomento: "activo" }) },
    sucursales: { buscarPorId: async () => ({ nombre: "Sede Principal", direccion: null }) },
  } as unknown as Parameters<typeof registrarCheckIn>[0];
}

const input = { organizacionId: "org", sucursalId: "s1", identificador: "12345678" };

afterEach(() => vi.useRealTimers());

describe("registrarCheckIn — cumpleaños", () => {
  test("esCumpleanos es true el día del cumpleaños en Lima", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T15:00:00Z"));
    const resultado = await registrarCheckIn(crearDeps({ fechaNacimiento: new Date(1990, 9, 8) }), input);
    expect(resultado.esCumpleanos).toBe(true);
  });

  test("esCumpleanos es false otro día o sin fecha de nacimiento", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T15:00:00Z"));
    expect((await registrarCheckIn(crearDeps({ fechaNacimiento: new Date(1990, 9, 9) }), input)).esCumpleanos).toBe(false);
    expect((await registrarCheckIn(crearDeps({ fechaNacimiento: null }), input)).esCumpleanos).toBe(false);
  });
});

describe("registrarCheckIn — identificador (S-06)", () => {
  test("cuatro dígitos busca por código de socio; otro texto, por documento normalizado", async () => {
    const consultas: string[] = [];
    const miembro = { id: "m1", nombre: "Ana", fotoUrl: null, entrenadorNombre: null, fechaVencimiento: null, sucursalId: null, fechaNacimiento: null };
    const deps = {
      miembros: {
        buscarPorCodigoSocio: async (c: string) => (consultas.push("codigo:" + c), miembro),
        buscarPorDocumento: async (n: string) => (consultas.push("doc:" + n), miembro),
      },
      checkIns: { buscarRecientePorMiembroYSucursal: async () => ({ estadoAlMomento: "activo" }) },
      sucursales: { buscarPorId: async () => ({ nombre: "Sede", direccion: null }) },
    } as unknown as Parameters<typeof registrarCheckIn>[0];
    await registrarCheckIn(deps, { ...input, identificador: " 0042 " });
    await registrarCheckIn(deps, { ...input, identificador: "ab-123 456" });
    expect(consultas).toEqual(["codigo:0042", "doc:AB123456"]);
  });

  test("si no es de ningún miembro lanza MiembroNoEncontradoError", async () => {
    const deps = { miembros: { buscarPorDocumento: async () => null } } as unknown as Parameters<typeof registrarCheckIn>[0];
    await expect(registrarCheckIn(deps, input)).rejects.toBeInstanceOf(MiembroNoEncontradoError);
  });
});

describe("registrarCheckIn — estado de acceso (sin días de gracia)", () => {
  // 08/10/2026 10:00 en Lima; el vencimiento es el inicio del día de Lima (05:00Z).
  const AHORA = new Date("2026-10-08T15:00:00Z");
  const HOY = new Date("2026-10-08T05:00:00Z");
  const DIA = 24 * 60 * 60 * 1000;

  function depsConVencimiento(fechaVencimiento: Date | null, sucursalDelMiembro: string | null = null) {
    const creados: { estadoAlMomento: string }[] = [];
    const deps = {
      miembros: {
        buscarPorDocumento: async () => ({
          id: "m1",
          nombre: "Ana Pérez",
          fotoUrl: null,
          entrenadorNombre: null,
          fechaVencimiento,
          sucursalId: sucursalDelMiembro,
          fechaNacimiento: null,
        }),
      },
      checkIns: {
        buscarRecientePorMiembroYSucursal: async () => null,
        crear: async (datos: { estadoAlMomento: string }) => {
          creados.push(datos);
        },
      },
      sucursales: { buscarPorId: async () => ({ nombre: "Sede Principal", direccion: null }) },
    } as unknown as Parameters<typeof registrarCheckIn>[0];
    return { deps, creados };
  }

  test("vencimiento futuro: activo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    const resultado = await registrarCheckIn(depsConVencimiento(new Date(HOY.getTime() + 5 * DIA)).deps, input);
    expect(resultado.estado).toBe("activo");
  });

  test("el día del vencimiento todavía es activo (último día con acceso, inclusive)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    const { deps, creados } = depsConVencimiento(HOY);
    expect((await registrarCheckIn(deps, input)).estado).toBe("activo");
    expect(creados[0].estadoAlMomento).toBe("activo");
  });

  test("vencido ayer: vencido, sin período de gracia", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    const resultado = await registrarCheckIn(depsConVencimiento(new Date(HOY.getTime() - DIA)).deps, input);
    expect(resultado.estado).toBe("vencido");
  });

  test("sin vencimiento registrado: vencido", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    expect((await registrarCheckIn(depsConVencimiento(null).deps, input)).estado).toBe("vencido");
  });

  test("socio de otra sede: sucursal_incorrecta aunque esté al día", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    const resultado = await registrarCheckIn(depsConVencimiento(new Date(HOY.getTime() + 5 * DIA), "otra").deps, input);
    expect(resultado.estado).toBe("sucursal_incorrecta");
  });
});
