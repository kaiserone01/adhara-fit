import { describe, expect, test } from "vitest";
import {
  cambiarPlan,
  CambioDesactualizadoError,
  CobroAnuladoError,
  CobroDuplicadoError,
  CobroEnConflictoError,
  MetodoPagoRequeridoError,
  PlanIgualError,
  PlanInactivoError,
  PlanNoEncontradoError,
  SinCicloVigenteError,
  type DatosCambiarPlan,
} from "./CambiarPlan";
import { anularPago, SoloUltimoCobroError } from "./AnularPago";
import { registrarPago } from "./RegistrarPago";
import { crearEstadoMemoria, crearUnidadEnMemoria, type EstadoMemoria } from "./unidadEnMemoria";
import type { IUnidadDeTrabajo } from "../ports/IUnidadDeTrabajo";

// 12/11/2026 10:00 en Lima. Vencimientos: inicio del día de Lima (05:00Z).
const AHORA = new Date("2026-11-12T15:00:00Z");
const dia = (iso: string) => new Date(`${iso}T05:00:00.000Z`);
const masDias = (n: number) => new Date(dia("2026-11-12").getTime() + n * 86_400_000);

const PLANES = [
  { id: "mensual", activo: true, precioUSD: 120, diasCiclo: 30 },
  { id: "trimestral", activo: true, precioUSD: 280, diasCiclo: 90 },
  { id: "viejo", activo: false, precioUSD: 50, diasCiclo: 30 },
];

const YAPE = { metodo: "Yape", metodoPagoId: "mp1", numeroOperacion: "123" };

function preparar(parcial: Partial<EstadoMemoria> = {}) {
  const estado = crearEstadoMemoria({
    miembro: { id: "m1", planId: "mensual", precioPlan: 120, fechaVencimiento: masDias(15), fechaUltimoPago: dia("2026-10-28") },
    planes: structuredClone(PLANES),
    suscripcion: { planId: "mensual", inicio: dia("2026-10-28"), fin: masDias(15) },
    ...parcial,
  });
  const unidad = crearUnidadEnMemoria(estado);
  let n = 0;
  const cambiar = (extra: Partial<DatosCambiarPlan> = {}) =>
    cambiarPlan({ unidad }, {
      organizacionId: "org",
      miembroId: "m1",
      planNuevoId: "trimestral",
      montoEsperado: 220,
      vencimientoEsperado: masDias(90),
      linea: YAPE,
      sucursalId: "s1",
      registradoPorId: "u1",
      cobroId: `c-${++n}`,
      ahora: AHORA,
      ...extra,
    });
  return { estado, unidad, cambiar };
}

describe("cambiarPlan — con cobro", () => {
  test("sube de plan: un pago por la diferencia, nuevo plan/precio/vencimiento y auditoría (BEH-S07-008)", async () => {
    const { estado, cambiar } = preparar();
    const r = await cambiar();

    expect(r.pago?.monto).toBe(220);
    expect(r.pago?.metodo).toBe("Yape");
    expect(r.pago?.fechaFinCiclo).toEqual(masDias(90));
    expect(r.pago?.vencimientoAnterior).toEqual(masDias(15));
    expect(estado.pagos).toHaveLength(1);

    expect(estado.miembro.planId).toBe("trimestral");
    expect(estado.miembro.precioPlan).toBe(280);
    expect(estado.miembro.fechaVencimiento).toEqual(masDias(90));
    expect(estado.miembro.fechaUltimoPago).toEqual(dia("2026-11-12"));
    expect(estado.suscripcion).toMatchObject({ planId: "trimestral", fin: masDias(90) });

    expect(estado.auditorias).toHaveLength(1);
    expect(estado.auditorias[0]).toMatchObject({
      planAnteriorId: "mensual", planNuevoId: "trimestral", precioAnteriorCentavos: 12000, valorNoConsumidoCentavos: 6000,
      montoCobradoCentavos: 22000, diasRestantes: 15, diasNuevos: 0, pagoId: r.pago?.id,
    });
  });

  test("reenviar el mismo cobro devuelve el original sin otro pago ni mover el vencimiento (BEH-S07-016)", async () => {
    const { estado, cambiar } = preparar();
    const primero = await cambiar({ cobroId: "C1" });
    const segundo = await cambiar({ cobroId: "C1" });
    expect(segundo.pago?.id).toBe(primero.pago?.id);
    expect(estado.pagos).toHaveLength(1);
    expect(estado.auditorias).toHaveLength(1);
    expect(estado.miembro.fechaVencimiento).toEqual(masDias(90));
  });

  test("un cobroId usado por otro socio, otro plan, otro importe o un cobro de membresía es un conflicto (BEH-S07-017)", async () => {
    const { estado, cambiar, unidad } = preparar();
    await cambiar({ cobroId: "C1" });
    await expect(cambiar({ cobroId: "C1", planNuevoId: "mensual" })).rejects.toBeInstanceOf(CobroEnConflictoError);
    await expect(cambiar({ cobroId: "C1", montoEsperado: 100 })).rejects.toBeInstanceOf(CobroEnConflictoError);

    // Un cobro de membresía (sin auditoría de cambio de plan) con otro cobroId.
    estado.pagos.push({ id: "pago-x", miembroId: "m1", cobroId: "MEMBRESIA", monto: 120, anuladoEn: null } as never);
    await expect(cambiar({ cobroId: "MEMBRESIA" })).rejects.toBeInstanceOf(CobroEnConflictoError);

    // Sin cobroId cuando hay algo que cobrar.
    const otro = preparar();
    await expect(otro.cambiar({ cobroId: null })).rejects.toBeInstanceOf(CobroEnConflictoError);
    expect(otro.estado.pagos).toEqual([]);
    expect(unidad).toBeTruthy();
  });

  test("un cobro anulado no se devuelve como resultado (BEH-S07-018)", async () => {
    const { cambiar, unidad } = preparar();
    const r = await cambiar({ cobroId: "C1" });
    await anularPago({ unidad }, { organizacionId: "org", pagoId: r.pago?.id as string, anuladoPorId: "u1", motivo: "error" });
    await expect(cambiar({ cobroId: "C1" })).rejects.toBeInstanceOf(CobroAnuladoError);
  });

  test("si la base rechaza el cobroId por la restricción única, devuelve el error de dominio (BEH-S07-019)", async () => {
    const { estado } = preparar();
    const unidad: IUnidadDeTrabajo = {
      ejecutar: async () => {
        throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      },
    };
    await expect(
      cambiarPlan({ unidad }, {
        organizacionId: "org", miembroId: "m1", planNuevoId: "trimestral", montoEsperado: 220, vencimientoEsperado: masDias(90),
        linea: YAPE, sucursalId: "s1", registradoPorId: "u1", cobroId: "c", ahora: AHORA,
      })
    ).rejects.toBeInstanceOf(CobroDuplicadoError);
    expect(estado.pagos).toEqual([]);
  });
});

describe("cambiarPlan — sin cobro", () => {
  test("baja de plan: agrega días, no crea pago y no toca la fecha del último pago (BEH-S07-009)", async () => {
    const { estado, cambiar } = preparar({
      miembro: { id: "m1", planId: "trimestral", precioPlan: 280, fechaVencimiento: masDias(80), fechaUltimoPago: dia("2026-10-01") },
    });
    const r = await cambiar({ planNuevoId: "mensual", montoEsperado: 0, vencimientoEsperado: masDias(62), linea: null, cobroId: null });

    expect(r.pago).toBeNull();
    expect(estado.pagos).toEqual([]);
    expect(estado.miembro.planId).toBe("mensual");
    expect(estado.miembro.precioPlan).toBe(120);
    expect(estado.miembro.fechaVencimiento).toEqual(masDias(62));
    expect(estado.miembro.fechaUltimoPago).toEqual(dia("2026-10-01"));
    expect(estado.auditorias[0]).toMatchObject({ montoCobradoCentavos: 0, diasNuevos: 32, pagoId: null });
  });

  test("repetir un cambio sin pago ya hecho da PlanIgualError (doble clic)", async () => {
    const { estado, cambiar } = preparar({
      miembro: { id: "m1", planId: "trimestral", precioPlan: 280, fechaVencimiento: masDias(80), fechaUltimoPago: null },
    });
    const datos = { planNuevoId: "mensual", montoEsperado: 0, vencimientoEsperado: masDias(62), linea: null, cobroId: null };
    await cambiar(datos);
    await expect(cambiar(datos)).rejects.toBeInstanceOf(PlanIgualError);
    expect(estado.auditorias).toHaveLength(1);
  });
});

describe("cambiarPlan — rechazos (no escribe nada)", () => {
  test("plan nuevo inexistente o inactivo", async () => {
    const b = preparar();
    await expect(b.cambiar({ planNuevoId: "no-existe" })).rejects.toBeInstanceOf(PlanNoEncontradoError);
    await expect(b.cambiar({ planNuevoId: "viejo" })).rejects.toBeInstanceOf(PlanInactivoError);
    expect(b.estado.pagos).toEqual([]);
  });

  test("mismo plan", async () => {
    const { cambiar } = preparar();
    await expect(cambiar({ planNuevoId: "mensual" })).rejects.toBeInstanceOf(PlanIgualError);
  });

  test("sin vencimiento vigente: corresponde un cobro normal (BEH-S07-013)", async () => {
    for (const fechaVencimiento of [masDias(-1), null]) {
      const { estado, cambiar } = preparar({ miembro: { id: "m1", planId: "mensual", precioPlan: 120, fechaVencimiento, fechaUltimoPago: null } });
      await expect(cambiar()).rejects.toBeInstanceOf(SinCicloVigenteError);
      expect(estado.pagos).toEqual([]);
    }
  });

  test("el vencimiento del socio hoy mismo todavía permite cambiar (último día inclusive)", async () => {
    const { cambiar } = preparar({ miembro: { id: "m1", planId: "mensual", precioPlan: 120, fechaVencimiento: masDias(0), fechaUltimoPago: null } });
    await expect(cambiar({ montoEsperado: 280, vencimientoEsperado: masDias(90) })).resolves.toBeTruthy();
  });

  test("monto o vencimiento distintos de los que calcula el servidor (BEH-S07-014)", async () => {
    const { estado, cambiar } = preparar();
    await expect(cambiar({ montoEsperado: 200 })).rejects.toBeInstanceOf(CambioDesactualizadoError);
    await expect(cambiar({ vencimientoEsperado: masDias(89) })).rejects.toBeInstanceOf(CambioDesactualizadoError);
    expect(estado.pagos).toEqual([]);
    expect(estado.miembro.planId).toBe("mensual");

    const sinPago = preparar({
      miembro: { id: "m1", planId: "trimestral", precioPlan: 280, fechaVencimiento: masDias(80), fechaUltimoPago: null },
    });
    await expect(
      sinPago.cambiar({ planNuevoId: "mensual", montoEsperado: 0, vencimientoEsperado: masDias(61), linea: null, cobroId: null })
    ).rejects.toBeInstanceOf(CambioDesactualizadoError);
  });

  test("con algo que cobrar, el método de pago es obligatorio (BEH-S07-015)", async () => {
    const { estado, cambiar } = preparar();
    await expect(cambiar({ linea: null })).rejects.toBeInstanceOf(MetodoPagoRequeridoError);
    await expect(cambiar({ linea: { metodo: "", metodoPagoId: null, numeroOperacion: null } })).rejects.toBeInstanceOf(MetodoPagoRequeridoError);
    expect(estado.pagos).toEqual([]);
    expect(estado.auditorias).toEqual([]);
  });
});

describe("anular un cambio de plan", () => {
  test("restaura plan, precio acordado, plan de la suscripción, vencimiento y fecha del último pago (SUP-S07-012)", async () => {
    const { estado, cambiar, unidad } = preparar({
      miembro: { id: "m1", planId: "mensual", precioPlan: 100, fechaVencimiento: masDias(15), fechaUltimoPago: dia("2026-10-28") },
    });
    // Con un precio acordado de 100 (descuento): valor no consumido 50.00, a cobrar 230.00.
    const r = await cambiar({ montoEsperado: 230 });
    expect(estado.miembro.precioPlan).toBe(280);

    await anularPago({ unidad }, { organizacionId: "org", pagoId: r.pago?.id as string, anuladoPorId: "u1", motivo: "error de plan" });
    expect(estado.miembro.planId).toBe("mensual");
    expect(estado.miembro.precioPlan).toBe(100);
    expect(estado.miembro.fechaVencimiento).toEqual(masDias(15));
    expect(estado.suscripcion?.planId).toBe("mensual");
    expect(estado.pagos[0].anuladoEn).not.toBeNull();
  });

  test("el último cobro es el de mayor orden de registro, no el de mayor fin de ciclo (SUP-S07-011)", async () => {
    // Cobro de membresía trimestral (fin hoy + 90) y luego un cambio a un plan corto y caro que SÍ cobra y termina antes.
    const estado = crearEstadoMemoria({
      miembro: { id: "m1", planId: "trimestral", precioPlan: 280, fechaVencimiento: null, fechaUltimoPago: null },
      planes: [...structuredClone(PLANES), { id: "express", activo: true, precioUSD: 400, diasCiclo: 20 }],
    });
    const unidad = crearUnidadEnMemoria(estado);
    const cobro = await registrarPago({ unidad }, {
      organizacionId: "org", miembroId: "m1", planId: "trimestral", linea: { monto: 280, metodo: "Efectivo", metodoPagoId: "mp", numeroOperacion: null },
      sucursalId: "s1", registradoPorId: "u1", cobroId: "k1", ahora: AHORA,
    });
    const cambio = await cambiarPlan({ unidad }, {
      organizacionId: "org", miembroId: "m1", planNuevoId: "express", montoEsperado: 120, vencimientoEsperado: masDias(20),
      linea: YAPE, sucursalId: "s1", registradoPorId: "u1", cobroId: "k2", ahora: AHORA,
    });
    expect(cambio.pago?.fechaFinCiclo).toEqual(masDias(20));
    expect(cobro.fechaFinCiclo).toEqual(masDias(90));

    // El cobro anterior termina más tarde, pero el cambio de plan es el último registrado: solo ese se puede anular.
    await expect(
      anularPago({ unidad }, { organizacionId: "org", pagoId: cobro.id, anuladoPorId: "u1", motivo: "x" })
    ).rejects.toBeInstanceOf(SoloUltimoCobroError);
    await anularPago({ unidad }, { organizacionId: "org", pagoId: cambio.pago?.id as string, anuladoPorId: "u1", motivo: "x" });
    expect(estado.miembro.planId).toBe("trimestral");
    expect(estado.miembro.precioPlan).toBe(280);
    expect(estado.miembro.fechaVencimiento).toEqual(masDias(90));
  });
});
