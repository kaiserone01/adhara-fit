import { describe, expect, test } from "vitest";
import { listarMorosos, listarPorVencer, MAX_FILAS_REPORTE } from "./ListarVencimientos";
import { obtenerIngresosPorPeriodo } from "./ObtenerIngresosPorPeriodo";
import { ParametroInvalidoError, RangoInvalidoError } from "../entities/ErroresReporte";
import { enmascararDocumento } from "../utils/documento";
import type { MiembroParaReporte } from "../entities/ReporteVencimientos";
import type { Pago } from "../entities/Pago";

const dia = (iso: string) => new Date(`${iso}T05:00:00.000Z`);
const HOY = dia("2026-11-13");

function socio(id: string, vence: string | null, extra: Partial<MiembroParaReporte> = {}): MiembroParaReporte {
  return {
    id,
    nombre: `Socio ${id}`,
    codigoSocio: null,
    numeroDocumento: "12345678",
    celular: null,
    planNombre: "Mensual",
    precioPlan: 100,
    fechaVencimiento: vence ? dia(vence) : null,
    ultimoCobro: null,
    ...extra,
  };
}

const conSocios = (lista: MiembroParaReporte[]) => ({ miembros: { listarActivosParaReporte: async () => lista } }) as unknown as Parameters<typeof listarMorosos>[0];

describe("enmascararDocumento", () => {
  test("5 puntos y los últimos 3 caracteres; solo puntos si es muy corto", () => {
    expect(enmascararDocumento("12345678")).toBe("•••••678");
    expect(enmascararDocumento("ab")).toBe("•••••");
  });
});

describe("listarMorosos", () => {
  test("moroso = vencimiento anterior a hoy (quien vence hoy no lo es), con días de atraso y orden por atraso", async () => {
    const r = await listarMorosos(conSocios([socio("a", "2026-11-12"), socio("b", "2026-11-13"), socio("c", "2026-10-30"), socio("d", "2026-11-20")]), { organizacionId: "org", hoy: HOY });
    expect(r.morosos.filas.map((f) => [f.miembroId, f.dias])).toEqual([["c", 14], ["a", 1]]);
    expect(r.morosos.renovacionEstimada).toBe(200);
  });

  test("los que nunca tuvieron un cobro van aparte y no son morosos", async () => {
    const r = await listarMorosos(conSocios([socio("a", null), socio("b", "2026-11-01")]), { organizacionId: "org", hoy: HOY });
    expect(r.sinPrimerCobro.filas.map((f) => f.miembroId)).toEqual(["a"]);
    expect(r.morosos.filas.map((f) => f.miembroId)).toEqual(["b"]);
  });

  test("a igualdad de atraso, por nombre; el documento sale enmascarado", async () => {
    const r = await listarMorosos(conSocios([socio("z", "2026-11-01"), socio("a", "2026-11-01")]), { organizacionId: "org", hoy: HOY });
    expect(r.morosos.filas.map((f) => f.miembroId)).toEqual(["a", "z"]);
    expect(r.morosos.filas[0].documentoEnmascarado).toBe("•••••678");
  });

  test("tope de 500 filas con hayMas, y la renovación estimada suma todos", async () => {
    const muchos = Array.from({ length: MAX_FILAS_REPORTE + 5 }, (_, i) => socio(`s${i}`, "2026-11-01"));
    const r = await listarMorosos(conSocios(muchos), { organizacionId: "org", hoy: HOY });
    expect(r.morosos.filas).toHaveLength(MAX_FILAS_REPORTE);
    expect(r.morosos.hayMas).toBe(true);
    expect(r.morosos.renovacionEstimada).toBe((MAX_FILAS_REPORTE + 5) * 100);
  });
});

describe("listarPorVencer", () => {
  test("entre hoy y hoy + N, ambos inclusive; N = 7 por defecto; orden por vencimiento", async () => {
    const lista = [socio("hoy", "2026-11-13"), socio("limite", "2026-11-20"), socio("fuera", "2026-11-21"), socio("ayer", "2026-11-12"), socio("pronto", "2026-11-15")];
    const r = await listarPorVencer(conSocios(lista), { organizacionId: "org", hoy: HOY });
    expect(r.filas.map((f) => [f.miembroId, f.dias])).toEqual([["hoy", 0], ["pronto", 2], ["limite", 7]]);
    const tres = await listarPorVencer(conSocios(lista), { organizacionId: "org", hoy: HOY, dias: 3 });
    expect(tres.filas.map((f) => f.miembroId)).toEqual(["hoy", "pronto"]);
  });

  test("N fuera de 1 a 30 o no entero se rechaza sin consultar", async () => {
    let consultas = 0;
    const deps = { miembros: { listarActivosParaReporte: async () => (consultas++, []) } } as unknown as Parameters<typeof listarPorVencer>[0];
    for (const dias of [0, 31, 2.5, Number.NaN]) {
      await expect(listarPorVencer(deps, { organizacionId: "org", hoy: HOY, dias })).rejects.toBeInstanceOf(ParametroInvalidoError);
    }
    expect(consultas).toBe(0);
  });
});

function pago(id: string, fecha: string, monto: number, extra: Partial<Pago> = {}): Pago {
  return {
    id, miembroId: "m1", sucursalId: "s", registradoPorId: "u", monto, metodo: "Yape", metodoPagoId: null, numeroOperacion: null,
    fechaPago: new Date(fecha), fechaInicioCiclo: null, fechaFinCiclo: null, anuladoEn: null, anuladoPorId: null, motivoAnulacion: null, grupoPagoId: null,
    ...extra,
  };
}

describe("obtenerIngresosPorPeriodo", () => {
  const pagos = [
    pago("1", "2026-11-12T15:00:00Z", 100),
    pago("2", "2026-11-12T16:00:00Z", 50.5, { metodo: "Efectivo", esCambioPlan: true }),
    pago("3", "2026-11-13T04:30:00Z", 30, { productoNombre: "Agua", cantidad: 3, miembroId: null }), // 23:30 del 12 en Lima
    pago("4", "2026-11-13T15:00:00Z", 999, { anuladoEn: new Date() }),
    pago("5", "2026-11-14T15:00:00Z", 20, { productoNombre: "Agua", cantidad: 1, miembroId: null, metodo: "Efectivo" }),
  ];
  const deps = { pagos: { listarPorOrganizacionYRango: async () => pagos } } as unknown as Parameters<typeof obtenerIngresosPorPeriodo>[0];
  const entrada = { organizacionId: "org", desde: "2026-11-01", hasta: "2026-11-30" } as const;

  test("agrupa por el día de Lima, no suma anulados y deja el día con solo anulados en 0", async () => {
    const r = await obtenerIngresosPorPeriodo(deps, { ...entrada, agrupacion: "dia" });
    expect(r.periodos.map((p) => [p.periodo, p.total])).toEqual([["2026-11-12", 180.5], ["2026-11-13", 0], ["2026-11-14", 20]]);
    expect(r.total).toBe(200.5);
  });

  test("totales por método y por concepto (membresía, cambio de plan, producto)", async () => {
    const r = await obtenerIngresosPorPeriodo(deps, { ...entrada, agrupacion: "mes" });
    expect(r.periodos).toHaveLength(1);
    expect(Object.fromEntries(r.porMetodo.map((m) => [m.clave, m.total]))).toEqual({ Yape: 130, Efectivo: 70.5 });
    expect(Object.fromEntries(r.porConcepto.map((m) => [m.clave, m.total]))).toEqual({ Membresía: 100, "Cambio de plan": 50.5, Producto: 50 });
  });

  test("ventas por producto con unidades y monto", async () => {
    const r = await obtenerIngresosPorPeriodo(deps, { ...entrada, agrupacion: "dia" });
    expect(r.ventasPorProducto).toEqual([{ nombre: "Agua", unidades: 4, monto: 50 }]);
  });

  test("rango: desde posterior a hasta, más de 366 días o 36 meses se rechaza; 366 días justos pasan", async () => {
    const mal = (desde: string, hasta: string, agrupacion: "dia" | "mes") => obtenerIngresosPorPeriodo(deps, { organizacionId: "org", desde, hasta, agrupacion });
    await expect(mal("2026-11-02", "2026-11-01", "dia")).rejects.toBeInstanceOf(RangoInvalidoError);
    await expect(mal("2025-01-01", "2026-01-02", "dia")).rejects.toBeInstanceOf(RangoInvalidoError);
    await expect(mal("2023-01-01", "2026-01-31", "mes")).rejects.toBeInstanceOf(RangoInvalidoError);
    await expect(mal("2025-11-13", "2026-11-13", "dia")).resolves.toBeDefined();
    await expect(mal("2023-11-01", "2026-10-31", "mes")).resolves.toBeDefined();
  });
});
