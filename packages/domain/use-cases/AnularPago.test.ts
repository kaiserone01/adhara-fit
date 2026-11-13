import { describe, expect, test } from "vitest";
import { anularPago, MotivoRequeridoError, PagoNoEncontradoError, PagoYaAnuladoError, SoloUltimoCobroError } from "./AnularPago";
import { registrarPago, type DatosRegistrarPago } from "./RegistrarPago";
import { crearEstadoMemoria, crearUnidadEnMemoria } from "./unidadEnMemoria";
import type { Pago } from "../entities/Pago";

// 13/11/2026 10:00 en Lima.
const AHORA = new Date("2026-11-13T15:00:00Z");
const dia = (iso: string) => new Date(`${iso}T05:00:00.000Z`);

function preparar() {
  const estado = crearEstadoMemoria();
  const deps = { unidad: crearUnidadEnMemoria(estado) };
  let n = 0;
  const cobrar = (extra: Partial<DatosRegistrarPago> = {}) =>
    registrarPago(deps, {
      organizacionId: "org",
      miembroId: "m1",
      planId: "mensual",
      linea: { monto: 100, metodo: "Efectivo", metodoPagoId: "mp1", numeroOperacion: null },
      sucursalId: "s1",
      registradoPorId: "u1",
      cobroId: `cobro-${++n}`,
      ahora: AHORA,
      ...extra,
    });
  const anular = (pagoId: string, motivo = "método equivocado") =>
    anularPago(deps, { organizacionId: "org", pagoId, anuladoPorId: "u1", motivo });
  return { estado, cobrar, anular };
}

describe("anularPago", () => {
  test("anula el único cobro: el socio vuelve a su vencimiento y fecha de pago anteriores", async () => {
    const { estado, cobrar, anular } = preparar();
    const pago = await cobrar();
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-13"));

    const anulado = await anular(pago.id, "  método equivocado ");
    expect(anulado.anuladoEn).not.toBeNull();
    expect(anulado.motivoAnulacion).toBe("método equivocado");
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-11-12"));
    expect(estado.miembro.fechaUltimoPago).toBeNull();
    expect(estado.suscripcion?.fin).toEqual(dia("2026-11-12"));
  });

  test("con dos cobros, anular el último restaura el vencimiento y la fecha de pago del anterior", async () => {
    const { estado, cobrar, anular } = preparar();
    await cobrar({ fechaPago: new Date("2026-11-01T17:00:00Z") });
    const segundo = await cobrar();
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-31"));

    await anular(segundo.id);
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-01"));
    expect(estado.miembro.fechaUltimoPago).toEqual(dia("2026-11-01"));
  });

  test("solo se anula el último cobro vigente: uno anterior se rechaza hasta anular los posteriores", async () => {
    const { estado, cobrar, anular } = preparar();
    const primero = await cobrar({ fechaPago: new Date("2026-11-01T17:00:00Z") });
    const segundo = await cobrar();

    await expect(anular(primero.id)).rejects.toBeInstanceOf(SoloUltimoCobroError);
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-31"));

    await anular(segundo.id);
    await anular(primero.id);
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-10-31"));
    expect(estado.miembro.fechaUltimoPago).toBeNull();
  });

  test("un pago sin vencimiento anterior (venta, cambio de plan) se anula sin tocar el vencimiento", async () => {
    const { estado, cobrar, anular } = preparar();
    await cobrar();
    const venta = {
      id: "venta-1", miembroId: "m1", vencimientoAnterior: null, anuladoEn: null, fechaPago: AHORA, fechaFinCiclo: null,
    } as unknown as Pago;
    estado.pagos.push(venta);

    await anular("venta-1");
    expect(estado.pagos.find((p) => p.id === "venta-1")?.anuladoEn).not.toBeNull();
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-13"));
  });

  test("un pago ya anulado no se anula otra vez", async () => {
    const { cobrar, anular } = preparar();
    const pago = await cobrar();
    await anular(pago.id);
    await expect(anular(pago.id)).rejects.toBeInstanceOf(PagoYaAnuladoError);
  });

  test("sin motivo se rechaza y no se toca nada", async () => {
    const { estado, cobrar, anular } = preparar();
    const pago = await cobrar();
    await expect(anular(pago.id, "   ")).rejects.toBeInstanceOf(MotivoRequeridoError);
    expect(estado.pagos[0].anuladoEn).toBeNull();
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-13"));
  });

  test("un pago que no existe se rechaza", async () => {
    const { anular } = preparar();
    await expect(anular("no-existe")).rejects.toBeInstanceOf(PagoNoEncontradoError);
  });
});
