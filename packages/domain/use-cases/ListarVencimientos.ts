// S-14: reportes de morosos y por vencer. Funciones sin reloj: reciben «hoy» (el día de Lima) como argumento.
import type { IMemberRepository } from "../ports/IMemberRepository";
import type { MiembroParaReporte } from "../entities/ReporteVencimientos";
import { ParametroInvalidoError } from "../entities/ErroresReporte";
import { enmascararDocumento } from "../utils/documento";
import { aCentavos, diaLima } from "../utils/vencimiento";

export const MAX_FILAS_REPORTE = 500;
export const MIN_DIAS_POR_VENCER = 1;
export const MAX_DIAS_POR_VENCER = 30;
export const DIAS_POR_VENCER_POR_DEFECTO = 7;

const MS_DIA = 86_400_000;

export interface FilaVencimiento {
  miembroId: string;
  nombre: string;
  codigoSocio: string | null;
  documentoEnmascarado: string;
  celular: string | null;
  planNombre: string | null;
  fechaVencimiento: Date | null;
  /** Morosos: días de atraso. Por vencer: días que faltan (0 = vence hoy). Sin primer cobro: 0. */
  dias: number;
  ultimoCobro: { fecha: Date; monto: number } | null;
}

export interface ListaVencimientos {
  filas: FilaVencimiento[];
  hayMas: boolean;
  /** Suma del precio del plan de TODAS las filas que cumplen la definición (aunque `hayMas`): estimación, no deuda. */
  renovacionEstimada: number;
}

export interface ReporteMorosos {
  morosos: ListaVencimientos;
  /** Socios sin ningún vencimiento (nunca cobrados): no son morosos. */
  sinPrimerCobro: ListaVencimientos;
}

function aFila(m: MiembroParaReporte, dias: number): FilaVencimiento {
  return {
    miembroId: m.id,
    nombre: m.nombre,
    codigoSocio: m.codigoSocio,
    documentoEnmascarado: enmascararDocumento(m.numeroDocumento),
    celular: m.celular,
    planNombre: m.planNombre,
    fechaVencimiento: m.fechaVencimiento,
    dias,
    ultimoCobro: m.ultimoCobro,
  };
}

function recortar(filas: FilaVencimiento[], precios: number[]): ListaVencimientos {
  return {
    filas: filas.slice(0, MAX_FILAS_REPORTE),
    hayMas: filas.length > MAX_FILAS_REPORTE,
    renovacionEstimada: precios.reduce((suma, p) => suma + aCentavos(p), 0) / 100,
  };
}

const porNombre = (a: FilaVencimiento, b: FilaVencimiento) => a.nombre.localeCompare(b.nombre, "es");
const diasEntre = (desde: Date, hasta: Date) => Math.round((diaLima(hasta).getTime() - diaLima(desde).getTime()) / MS_DIA);

/** Socios no eliminados con el vencimiento anterior a hoy, más los que nunca tuvieron un cobro (aparte). */
export async function listarMorosos(
  deps: { miembros: IMemberRepository },
  input: { organizacionId: string; hoy: Date }
): Promise<ReporteMorosos> {
  const miembros = await deps.miembros.listarActivosParaReporte(input.organizacionId);

  const vencidos = miembros.filter((m) => m.fechaVencimiento && diasEntre(m.fechaVencimiento, input.hoy) > 0);
  const filas = vencidos
    .map((m) => aFila(m, diasEntre(m.fechaVencimiento as Date, input.hoy)))
    .sort((a, b) => b.dias - a.dias || porNombre(a, b));

  const sinCobro = miembros.filter((m) => !m.fechaVencimiento);
  const filasSinCobro = sinCobro.map((m) => aFila(m, 0)).sort(porNombre);

  return {
    morosos: recortar(filas, vencidos.map((m) => m.precioPlan)),
    sinPrimerCobro: recortar(filasSinCobro, sinCobro.map((m) => m.precioPlan)),
  };
}

/** Socios no eliminados que vencen entre hoy y hoy + N días (ambos inclusive); N de 1 a 30, 7 por defecto. */
export async function listarPorVencer(
  deps: { miembros: IMemberRepository },
  input: { organizacionId: string; hoy: Date; dias?: number }
): Promise<ListaVencimientos> {
  const n = input.dias ?? DIAS_POR_VENCER_POR_DEFECTO;
  if (!Number.isInteger(n) || n < MIN_DIAS_POR_VENCER || n > MAX_DIAS_POR_VENCER) throw new ParametroInvalidoError();

  const miembros = await deps.miembros.listarActivosParaReporte(input.organizacionId);
  const proximos = miembros.filter((m) => {
    if (!m.fechaVencimiento) return false;
    const restantes = diasEntre(input.hoy, m.fechaVencimiento);
    return restantes >= 0 && restantes <= n;
  });

  const filas = proximos
    .map((m) => aFila(m, diasEntre(input.hoy, m.fechaVencimiento as Date)))
    .sort((a, b) => (a.fechaVencimiento as Date).getTime() - (b.fechaVencimiento as Date).getTime() || porNombre(a, b));

  return recortar(filas, proximos.map((m) => m.precioPlan));
}
