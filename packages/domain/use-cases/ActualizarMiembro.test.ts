import { describe, expect, test } from "vitest";
import { actualizarMiembro, DocumentoDuplicadoError, FechasIncoherentesError } from "./ActualizarMiembro";
import { CelularInvalidoError, CorreoInvalidoError, DocumentoInvalidoError } from "../entities/ErroresMiembro";
import type { CambiosMiembro } from "../entities/Miembro";

type OpcionesMiembro = {
  planId?: string | null;
  celular?: string | null;
  correo?: string | null;
  fechaUltimoPago?: Date | null;
  fechaVencimiento?: Date | null;
};

function crearDeps(documentoOcupadoPor: string | null = null, miembro: OpcionesMiembro = {}, tieneSuscripcion = true) {
  const cambiosGuardados: CambiosMiembro[] = [];
  const ciclos: { inicio: Date | null; fin: Date }[] = [];
  const planesDelCiclo: (string | undefined)[] = [];
  const creadas: { miembroId: string; planId: string; inicio: Date; fin: Date }[] = [];
  const fechasEscritas: { pago: Date | null; vencimiento: Date }[] = [];
  const deps = {
    miembros: {
      buscarPorId: async () => ({
        id: "m1", sucursalId: null, planId: "p1", tipoDocumento: "DNI", numeroDocumento: "11111111", codigoSocio: null,
        celular: null, correo: null, fechaUltimoPago: null, fechaVencimiento: null, ...miembro,
      }),
      buscarPorDocumento: async () => (documentoOcupadoPor ? { id: documentoOcupadoPor } : null),
      maximoCodigoSocio: async () => 41,
      actualizar: async (_org: string, _id: string, cambios: CambiosMiembro) => {
        cambiosGuardados.push(cambios);
        return { id: "m1" };
      },
      actualizarFechasPago: async (_id: string, pago: Date | null, vencimiento: Date) => {
        fechasEscritas.push({ pago, vencimiento });
      },
    },
    planes: { buscarPorId: async () => ({ diasCiclo: 30 }) },
    suscripciones: {
      ajustarCicloMasReciente: async (_id: string, inicio: Date | null, fin: Date, planId?: string) => {
        ciclos.push({ inicio, fin });
        planesDelCiclo.push(planId);
        return tieneSuscripcion;
      },
      crear: async (datos: (typeof creadas)[number]) => {
        creadas.push(datos);
        return datos;
      },
    },
    sucursales: {},
  } as unknown as Parameters<typeof actualizarMiembro>[0];
  return { deps, cambiosGuardados, ciclos, creadas, planesDelCiclo, fechasEscritas };
}

const base = { organizacionId: "org", id: "m1", sucursalActivaId: "s1" };

// Fechas guardadas como inicio de día de Lima (05:00Z), como las escribe el cobro.
describe("actualizarMiembro — ajuste manual de fechas", () => {
  const pago = new Date("2026-10-01T05:00:00.000Z");
  const venc = new Date("2026-11-15T05:00:00.000Z");

  test("guarda el vencimiento y lo fija en la suscripción y en el miembro (una sola fecha)", async () => {
    const { deps, cambiosGuardados, ciclos, fechasEscritas } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(cambiosGuardados[0]).toEqual({ fechaVencimiento: venc });
    expect(ciclos).toEqual([{ inicio: null, fin: venc }]);
    expect(fechasEscritas).toEqual([{ pago: null, vencimiento: venc }]);
  });

  test("ajusta el pago y el vencimiento: el ciclo va de uno al otro", async () => {
    const { deps, cambiosGuardados, ciclos, fechasEscritas } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago, fechaVencimiento: venc } });
    expect(cambiosGuardados[0]).toEqual({ fechaUltimoPago: pago, fechaVencimiento: venc });
    expect(ciclos).toEqual([{ inicio: pago, fin: venc }]);
    expect(fechasEscritas).toEqual([{ pago, vencimiento: venc }]);
  });

  test("normaliza al inicio del día de Lima aunque la fecha traiga otra hora", async () => {
    const { deps, fechasEscritas } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: new Date("2026-11-15T18:30:00.000Z") } });
    expect(fechasEscritas[0].vencimiento).toEqual(venc);
  });

  test("la fecha de pago posterior al vencimiento es incoherente", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await expect(
      actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: venc, fechaVencimiento: pago } })
    ).rejects.toBeInstanceOf(FechasIncoherentesError);
    expect(cambiosGuardados).toEqual([]);
  });

  test("valida contra la fecha actual del miembro cuando solo cambia una", async () => {
    const { deps } = crearDeps(null, { fechaVencimiento: pago });
    await expect(actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: venc } })).rejects.toBeInstanceOf(FechasIncoherentesError);
  });

  test("solo cambia el pago: el fin es el vencimiento actual del miembro", async () => {
    const { deps, cambiosGuardados, ciclos } = crearDeps(null, { fechaVencimiento: venc });
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago } });
    expect(cambiosGuardados[0]).toEqual({ fechaUltimoPago: pago });
    expect(ciclos).toEqual([{ inicio: pago, fin: venc }]);
  });

  test("solo cambia el vencimiento: el inicio es la fecha de pago actual si existe", async () => {
    const { deps, ciclos } = crearDeps(null, { fechaUltimoPago: pago });
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(ciclos).toEqual([{ inicio: pago, fin: venc }]);
  });

  test("fechaUltimoPago null se guarda (vaciar la fecha de pago)", async () => {
    const { deps, cambiosGuardados, fechasEscritas } = crearDeps(null, { fechaUltimoPago: pago, fechaVencimiento: venc });
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: null } });
    expect(cambiosGuardados[0]).toEqual({ fechaUltimoPago: null });
    expect(fechasEscritas).toEqual([{ pago: null, vencimiento: venc }]);
  });

  test("solo cambia el pago y no hay vencimiento: guarda pero no sincroniza la suscripción", async () => {
    const { deps, cambiosGuardados, ciclos, fechasEscritas } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago } });
    expect(cambiosGuardados[0]).toEqual({ fechaUltimoPago: pago });
    expect(ciclos).toEqual([]);
    expect(fechasEscritas).toEqual([]);
  });

  test("sin cambio de fecha ni de plan no toca la suscripción", async () => {
    const { deps, cambiosGuardados, ciclos } = crearDeps(null, { fechaVencimiento: venc });
    await actualizarMiembro(deps, { ...base, cambios: { nombre: "Otro" } });
    expect(cambiosGuardados[0]).toEqual({ nombre: "Otro" });
    expect(ciclos).toEqual([]);
  });
});

describe("actualizarMiembro — suscripción al ajustar fechas", () => {
  const pago = new Date("2026-10-01T05:00:00.000Z");
  const venc = new Date("2026-11-15T05:00:00.000Z");

  test("sin suscripción y con plan: la crea con el ciclo [pago, vencimiento]", async () => {
    const { deps, creadas } = crearDeps(null, {}, false);
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago, fechaVencimiento: venc } });
    expect(creadas).toEqual([{ miembroId: "m1", planId: "p1", inicio: pago, fin: venc }]);
  });

  test("sin suscripción y sin plan: no crea nada", async () => {
    const { deps, creadas } = crearDeps(null, { planId: null }, false);
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(creadas).toEqual([]);
  });

  test("con suscripción: no crea otra", async () => {
    const { deps, creadas } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(creadas).toEqual([]);
  });
});

describe("actualizarMiembro — documento (S-06)", () => {
  test("permite cambiar el documento si nadie más lo tiene (se guarda normalizado)", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { numeroDocumento: "2222-2222" } });
    expect(cambiosGuardados[0]).toEqual({ numeroDocumento: "22222222", tipoDocumento: "DNI" });
  });

  test("rechaza un documento que ya tiene otro miembro", async () => {
    const { deps, cambiosGuardados } = crearDeps("otro");
    await expect(actualizarMiembro(deps, { ...base, cambios: { numeroDocumento: "22222222" } })).rejects.toBeInstanceOf(DocumentoDuplicadoError);
    expect(cambiosGuardados).toEqual([]);
  });

  test("rechaza un documento con formato inválido para el tipo", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await expect(actualizarMiembro(deps, { ...base, cambios: { numeroDocumento: "123" } })).rejects.toBeInstanceOf(DocumentoInvalidoError);
    expect(cambiosGuardados).toEqual([]);
  });

  test("guardar con el mismo documento no valida ni consulta duplicados", async () => {
    const { deps, cambiosGuardados } = crearDeps("otro");
    await actualizarMiembro(deps, { ...base, cambios: { numeroDocumento: "11111111" } });
    expect(cambiosGuardados).toHaveLength(1);
  });

  test("pasar de DNI a CE no asigna código de socio", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { tipoDocumento: "CE", numeroDocumento: "012345678" } });
    expect(cambiosGuardados[0]).toMatchObject({ tipoDocumento: "CE", numeroDocumento: "012345678" });
    expect(cambiosGuardados[0]).not.toHaveProperty("codigoSocio");
  });
});

describe("actualizarMiembro — fecha de nacimiento", () => {
  test("pasa fechaNacimiento null al repositorio (vaciar un valor no se ignora)", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaNacimiento: null } });
    expect(cambiosGuardados[0]).toEqual({ fechaNacimiento: null });
  });

  test("pasa una fecha de nacimiento definida", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    const nacimiento = new Date(1990, 9, 8);
    await actualizarMiembro(deps, { ...base, cambios: { fechaNacimiento: nacimiento } });
    expect(cambiosGuardados[0]).toEqual({ fechaNacimiento: nacimiento });
  });
});

describe("actualizarMiembro — celular y correo", () => {
  test("un celular o correo nuevo se valida y se guarda normalizado; vacío lo borra", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { celular: "+51 987 654 321", correo: "Ana@Correo.com" } });
    await actualizarMiembro(deps, { ...base, cambios: { celular: "", correo: "" } });
    expect(cambiosGuardados[0]).toMatchObject({ celular: "987654321", correo: "ana@correo.com" });
    expect(cambiosGuardados[1]).toMatchObject({ celular: null, correo: null });
  });

  test("rechaza un celular o un correo inválido", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await expect(actualizarMiembro(deps, { ...base, cambios: { celular: "123" } })).rejects.toBeInstanceOf(CelularInvalidoError);
    await expect(actualizarMiembro(deps, { ...base, cambios: { correo: "x@y" } })).rejects.toBeInstanceOf(CorreoInvalidoError);
    expect(cambiosGuardados.length).toBe(0);
  });

  test("un celular anterior a las validaciones no bloquea guardar mientras no se cambie", async () => {
    const { deps, cambiosGuardados } = crearDeps(null, { celular: "01-234567" });
    await actualizarMiembro(deps, { ...base, cambios: { nombre: "Ana", celular: "01-234567" } });
    expect(cambiosGuardados[0]).toMatchObject({ celular: "01-234567" });
  });
});
