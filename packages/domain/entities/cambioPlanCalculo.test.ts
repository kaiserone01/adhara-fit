import { describe, expect, test } from "vitest";
import { calcularCambioPlan, DatosCambioPlanInvalidosError } from "./cambioPlanCalculo";

// Todas las fechas son el inicio del día de Lima (05:00Z). Hoy = 12/11/2026.
const dia = (iso: string) => new Date(`${iso}T05:00:00.000Z`);
const HOY = new Date("2026-11-12T15:00:00Z");
const masDias = (n: number) => new Date(dia("2026-11-12").getTime() + n * 86_400_000);

const plan1Mes = { precio: 120, dias: 30 };
const plan3Meses = { precio: 280, dias: 90 };

describe("calcularCambioPlan", () => {
  test("sube de plan: cobra la diferencia y el vencimiento es hoy más los días del plan nuevo (BEH-S07-001)", () => {
    const r = calcularCambioPlan({
      hoy: HOY, vencimientoActual: masDias(15), precioActual: plan1Mes.precio, diasCicloActual: plan1Mes.dias,
      precioNuevo: plan3Meses.precio, diasCicloNuevo: plan3Meses.dias,
    });
    expect(r.diasRestantes).toBe(15);
    expect(r.valorNoConsumidoCentavos).toBe(6000);
    expect(r.montoCobrarCentavos).toBe(22000);
    expect(r.diasNuevos).toBe(0);
    expect(r.nuevoVencimiento).toEqual(masDias(90));
  });

  test("baja de plan: no cobra nada y el excedente se convierte en días (BEH-S07-002)", () => {
    const r = calcularCambioPlan({
      hoy: HOY, vencimientoActual: masDias(80), precioActual: plan3Meses.precio, diasCicloActual: plan3Meses.dias,
      precioNuevo: plan1Mes.precio, diasCicloNuevo: plan1Mes.dias,
    });
    expect(r.valorNoConsumidoCentavos).toBe(24889);
    expect(r.montoCobrarCentavos).toBe(0);
    expect(r.diasNuevos).toBe(32);
    expect(r.nuevoVencimiento).toEqual(masDias(62));
  });

  test("el valor no consumido igual al precio nuevo: monto 0 y sin días extra (BEH-S07-003)", () => {
    const r = calcularCambioPlan({
      hoy: HOY, vencimientoActual: masDias(20), precioActual: 90, diasCicloActual: 30, precioNuevo: 60, diasCicloNuevo: 60,
    });
    expect(r.valorNoConsumidoCentavos).toBe(6000);
    expect(r.montoCobrarCentavos).toBe(0);
    expect(r.diasNuevos).toBe(0);
    expect(r.nuevoVencimiento).toEqual(masDias(60));
  });

  test("el día del vencimiento quedan 0 días y se cobra el plan nuevo completo (BEH-S07-004)", () => {
    const r = calcularCambioPlan({
      hoy: HOY, vencimientoActual: dia("2026-11-12"), precioActual: 120, diasCicloActual: 30, precioNuevo: 200, diasCicloNuevo: 60,
    });
    expect(r.diasRestantes).toBe(0);
    expect(r.valorNoConsumidoCentavos).toBe(0);
    expect(r.montoCobrarCentavos).toBe(20000);
  });

  test("un vencimiento pasado nunca da días negativos", () => {
    const r = calcularCambioPlan({
      hoy: HOY, vencimientoActual: masDias(-3), precioActual: 120, diasCicloActual: 30, precioNuevo: 200, diasCicloNuevo: 60,
    });
    expect(r.diasRestantes).toBe(0);
  });

  test("redondea half-up una sola vez al céntimo (BEH-S07-005)", () => {
    const base = { hoy: HOY, diasCicloActual: 30, precioNuevo: 500, diasCicloNuevo: 30 };
    expect(calcularCambioPlan({ ...base, vencimientoActual: masDias(15), precioActual: 10.05 }).valorNoConsumidoCentavos).toBe(503);
    expect(calcularCambioPlan({ ...base, vencimientoActual: masDias(1), precioActual: 100 }).valorNoConsumidoCentavos).toBe(333);
    expect(calcularCambioPlan({ ...base, vencimientoActual: masDias(2), precioActual: 100 }).valorNoConsumidoCentavos).toBe(667);
  });

  test("el día de Lima no depende de la hora: a las 23:30 de Lima sigue siendo el mismo día", () => {
    const tarde = new Date("2026-11-13T04:30:00Z"); // 23:30 del 12/11 en Lima
    const r = calcularCambioPlan({
      hoy: tarde, vencimientoActual: masDias(15), precioActual: 120, diasCicloActual: 30, precioNuevo: 280, diasCicloNuevo: 90,
    });
    expect(r.diasRestantes).toBe(15);
    expect(r.nuevoVencimiento).toEqual(masDias(90));
  });

  test("rechaza precios o duraciones que no sean positivos", () => {
    const ok = { hoy: HOY, vencimientoActual: masDias(5), precioActual: 120, diasCicloActual: 30, precioNuevo: 200, diasCicloNuevo: 60 };
    expect(() => calcularCambioPlan({ ...ok, precioNuevo: 0 })).toThrow(DatosCambioPlanInvalidosError);
    expect(() => calcularCambioPlan({ ...ok, precioActual: 0 })).toThrow(DatosCambioPlanInvalidosError);
    expect(() => calcularCambioPlan({ ...ok, diasCicloActual: 0 })).toThrow(DatosCambioPlanInvalidosError);
    expect(() => calcularCambioPlan({ ...ok, diasCicloNuevo: 1.5 })).toThrow(DatosCambioPlanInvalidosError);
  });
});
