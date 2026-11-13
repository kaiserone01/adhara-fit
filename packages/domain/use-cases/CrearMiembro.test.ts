import { describe, expect, it } from "vitest";
import { crearMiembro } from "./CrearMiembro";
import { conCodigoSocio } from "./AsignarCodigoSocio";
import {
  CodigoSocioEnConflictoError,
  CodigosSocioAgotadosError,
  DocumentoDuplicadoError,
  DocumentoInvalidoError,
} from "../entities/ErroresMiembro";
import type { IMemberRepository } from "../ports/IMemberRepository";
import type { DatosNuevoMiembro } from "../entities/Miembro";

const base: Omit<DatosNuevoMiembro, "codigoSocio"> = {
  organizacionId: "org",
  sucursalId: null,
  nombre: "Ana",
  tipoDocumento: "DNI",
  numeroDocumento: "12345678",
  fechaInscripcion: null,
  fechaNacimiento: null,
  celular: null,
  fotoUrl: null,
  entrenadorId: null,
  planId: null,
  precioPlan: 0,
};

function repo(opciones: { existente?: boolean; maximo?: number; conflictos?: number } = {}) {
  const creados: DatosNuevoMiembro[] = [];
  let conflictos = opciones.conflictos ?? 0;
  const miembros = {
    buscarPorDocumento: async () => (opciones.existente ? { id: "otro" } : null),
    maximoCodigoSocio: async () => opciones.maximo ?? 0,
    crear: async (datos: DatosNuevoMiembro) => {
      if (datos.codigoSocio && conflictos > 0) {
        conflictos--;
        throw new CodigoSocioEnConflictoError();
      }
      creados.push(datos);
      return { id: "m1", ...datos };
    },
  } as unknown as IMemberRepository;
  return { miembros, creados };
}

describe("crearMiembro (S-06)", () => {
  it("DNI válido se crea sin código de socio y con el número normalizado", async () => {
    const { miembros, creados } = repo();
    await crearMiembro({ miembros }, { ...base, numeroDocumento: " 1234-5678 " });
    expect(creados[0]).toMatchObject({ numeroDocumento: "12345678", codigoSocio: null });
  });

  it("rechaza formato inválido y documento duplicado sin crear", async () => {
    const a = repo();
    await expect(crearMiembro({ miembros: a.miembros }, { ...base, numeroDocumento: "123" })).rejects.toBeInstanceOf(DocumentoInvalidoError);
    const b = repo({ existente: true });
    await expect(crearMiembro({ miembros: b.miembros }, base)).rejects.toBeInstanceOf(DocumentoDuplicadoError);
    expect(a.creados.length + b.creados.length).toBe(0);
  });

  it("CE y pasaporte reciben el siguiente código de 4 dígitos", async () => {
    const { miembros, creados } = repo({ maximo: 9 });
    await crearMiembro({ miembros }, { ...base, tipoDocumento: "CE", numeroDocumento: "abc123456" });
    expect(creados[0]).toMatchObject({ numeroDocumento: "ABC123456", codigoSocio: "0010" });
  });
});

describe("conCodigoSocio (S-06)", () => {
  it("reintenta ante un choque y se rinde tras tres", async () => {
    const intentos: string[] = [];
    const guardar = async (c: string) => {
      intentos.push(c);
      if (intentos.length < 3) throw new CodigoSocioEnConflictoError();
      return c;
    };
    expect(await conCodigoSocio({ maximoCodigoSocio: async () => 5 }, guardar)).toBe("0006");
    expect(intentos).toHaveLength(3);

    await expect(
      conCodigoSocio({ maximoCodigoSocio: async () => 5 }, async () => {
        throw new CodigoSocioEnConflictoError();
      })
    ).rejects.toBeInstanceOf(CodigoSocioEnConflictoError);
  });

  it("con el 9999 ocupado lanza CodigosSocioAgotadosError sin guardar", async () => {
    let guardado = false;
    await expect(
      conCodigoSocio({ maximoCodigoSocio: async () => 9999 }, async () => {
        guardado = true;
      })
    ).rejects.toBeInstanceOf(CodigosSocioAgotadosError);
    expect(guardado).toBe(false);
  });
});
