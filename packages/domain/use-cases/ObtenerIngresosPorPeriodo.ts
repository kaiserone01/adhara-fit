// S-14: ingresos por día o por mes de Lima, por método y por concepto, y ventas por producto.
import type { IPagoRepository } from "../ports/IPagoRepository";
import type { Pago } from "../entities/Pago";
import { RangoInvalidoError } from "../entities/ErroresReporte";
import { rangoDiaLima } from "../utils/fechaLima";

export const MAX_DIAS_INGRESOS = 366;
export const MAX_MESES_INGRESOS = 36;

export type AgrupacionIngresos = "dia" | "mes";
export type ConceptoIngreso = "Membresía" | "Cambio de plan" | "Producto";

export interface TotalIngreso {
  clave: string;
  total: number;
}

export interface IngresosPeriodo {
  /** «AAAA-MM-DD» o «AAAA-MM». */
  periodo: string;
  total: number;
  porMetodo: TotalIngreso[];
  porConcepto: TotalIngreso[];
}

export interface VentaProducto {
  nombre: string;
  unidades: number;
  monto: number;
}

export interface ReporteIngresos {
  agrupacion: AgrupacionIngresos;
  /** Un período por cada día o mes con al menos un cobro (aunque todos estén anulados), del más antiguo al más reciente. */
  periodos: IngresosPeriodo[];
  total: number;
  porMetodo: TotalIngreso[];
  porConcepto: TotalIngreso[];
  ventasPorProducto: VentaProducto[];
}

const formatoDiaLima = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" });

function conceptoDe(pago: Pago): ConceptoIngreso {
  if (pago.productoId || pago.productoNombre) return "Producto";
  return pago.esCambioPlan ? "Cambio de plan" : "Membresía";
}

function sumar(pagos: Pago[], clave: (p: Pago) => string): TotalIngreso[] {
  const centavos = new Map<string, number>();
  for (const p of pagos) centavos.set(clave(p), (centavos.get(clave(p)) ?? 0) + Math.round(p.monto * 100));
  return [...centavos].map(([k, c]) => ({ clave: k, total: c / 100 })).sort((a, b) => b.total - a.total || a.clave.localeCompare(b.clave, "es"));
}

const total = (pagos: Pago[]) => pagos.reduce((s, p) => s + Math.round(p.monto * 100), 0) / 100;

function validarRango(desde: string, hasta: string, agrupacion: AgrupacionIngresos): void {
  const patron = /^\d{4}-\d{2}-\d{2}$/;
  if (!patron.test(desde) || !patron.test(hasta)) throw new RangoInvalidoError();
  const d = Date.parse(`${desde}T00:00:00Z`);
  const h = Date.parse(`${hasta}T00:00:00Z`);
  if (Number.isNaN(d) || Number.isNaN(h) || d > h) throw new RangoInvalidoError();
  // Ambos extremos cuentan: del 1 al 1 es un día.
  const dias = Math.round((h - d) / 86_400_000) + 1;
  const meses = (Number(hasta.slice(0, 4)) - Number(desde.slice(0, 4))) * 12 + Number(hasta.slice(5, 7)) - Number(desde.slice(5, 7)) + 1;
  if (agrupacion === "dia" ? dias > MAX_DIAS_INGRESOS : meses > MAX_MESES_INGRESOS) throw new RangoInvalidoError();
}

/** Ingresos del rango (fechas de Lima «AAAA-MM-DD», ambas incluidas). No suma anulados; incluye cobros de socios eliminados. */
export async function obtenerIngresosPorPeriodo(
  deps: { pagos: IPagoRepository },
  input: { organizacionId: string; desde: string; hasta: string; agrupacion: AgrupacionIngresos }
): Promise<ReporteIngresos> {
  validarRango(input.desde, input.hasta, input.agrupacion);

  const todos = await deps.pagos.listarPorOrganizacionYRango(
    input.organizacionId,
    rangoDiaLima(input.desde).inicio,
    rangoDiaLima(input.hasta).fin
  );

  const claveDe = (p: Pago) => {
    const dia = formatoDiaLima.format(p.fechaPago);
    return input.agrupacion === "dia" ? dia : dia.slice(0, 7);
  };

  const porPeriodo = new Map<string, Pago[]>();
  for (const p of todos) porPeriodo.set(claveDe(p), [...(porPeriodo.get(claveDe(p)) ?? []), p]);

  const vigentes = (pagos: Pago[]) => pagos.filter((p) => !p.anuladoEn);
  const periodos: IngresosPeriodo[] = [...porPeriodo]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, pagos]) => ({
      periodo,
      total: total(vigentes(pagos)),
      porMetodo: sumar(vigentes(pagos), (p) => p.metodo),
      porConcepto: sumar(vigentes(pagos), conceptoDe),
    }));

  const vivos = vigentes(todos);
  const productos = new Map<string, { unidades: number; centavos: number }>();
  for (const p of vivos.filter((x) => conceptoDe(x) === "Producto")) {
    const nombre = p.productoNombre ?? "Producto";
    const actual = productos.get(nombre) ?? { unidades: 0, centavos: 0 };
    productos.set(nombre, { unidades: actual.unidades + (p.cantidad ?? 1), centavos: actual.centavos + Math.round(p.monto * 100) });
  }

  return {
    agrupacion: input.agrupacion,
    periodos,
    total: total(vivos),
    porMetodo: sumar(vivos, (p) => p.metodo),
    porConcepto: sumar(vivos, conceptoDe),
    ventasPorProducto: [...productos]
      .map(([nombre, v]) => ({ nombre, unidades: v.unidades, monto: v.centavos / 100 }))
      .sort((a, b) => b.monto - a.monto || a.nombre.localeCompare(b.nombre, "es")),
  };
}
