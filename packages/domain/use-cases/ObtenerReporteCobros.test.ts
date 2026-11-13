import { describe, expect, test } from "vitest";
import { obtenerReporteCobros } from "./ObtenerReporteCobros";
import type { Pago } from "../entities/Pago";

function pago(extra: Partial<Pago>): Pago {
  return {
    id: "p", miembroId: "m1", sucursalId: "s1", registradoPorId: "u1", registradoPorNombre: "Ana", monto: 10, metodo: "Efectivo",
    metodoPagoId: null, numeroOperacion: null, fechaPago: new Date("2026-10-20T15:00:00Z"), fechaInicioCiclo: null, fechaFinCiclo: null,
    anuladoEn: null, anuladoPorId: null, motivoAnulacion: null, grupoPagoId: null, ...extra,
  };
}

const deps = (pagos: Pago[]) => ({ pagos: { listarPorOrganizacionYRango: async () => pagos } as never });
const rango = { organizacionId: "org", desde: new Date("2026-10-01T00:00:00Z"), hasta: new Date("2026-11-01T00:00:00Z") };

describe("obtenerReporteCobros", () => {
  test("suma por método y por usuario sin contar los anulados, y los deja marcados en la lista", async () => {
    const reporte = await obtenerReporteCobros(
      deps([
        pago({ id: "1", monto: 25.1, metodo: "Efectivo" }),
        pago({ id: "2", monto: 0.2, metodo: "Efectivo", registradoPorNombre: "Luis" }),
        pago({ id: "3", monto: 40, metodo: "Billetera digital - Yape" }),
        pago({ id: "4", monto: 99, metodo: "Efectivo", anuladoEn: new Date("2026-10-21T00:00:00Z") }),
      ]),
      rango
    );
    expect(reporte.pagos).toHaveLength(4);
    expect(reporte.totalCobrado).toBe(65.3);
    expect(reporte.porMetodo).toEqual([
      { clave: "Billetera digital - Yape", total: 40 },
      { clave: "Efectivo", total: 25.3 },
    ]);
    expect(reporte.porUsuario).toEqual([
      { clave: "Ana", total: 65.1 },
      { clave: "Luis", total: 0.2 },
    ]);
  });

  test("agrupa por día de Lima: las 22:00 de Lima ya son el día siguiente en UTC", async () => {
    const reporte = await obtenerReporteCobros(
      deps([
        pago({ id: "1", monto: 10, fechaPago: new Date("2026-10-21T03:00:00Z") }), // 20/10 22:00 en Lima
        pago({ id: "2", monto: 5, fechaPago: new Date("2026-10-21T04:59:00Z") }), // 20/10 23:59 en Lima
        pago({ id: "3", monto: 7, fechaPago: new Date("2026-10-21T05:00:00Z") }), // 21/10 00:00 en Lima
      ]),
      rango
    );
    expect(reporte.porDia).toEqual([
      { clave: "2026-10-21", total: 7 },
      { clave: "2026-10-20", total: 15 },
    ]);
  });
});
