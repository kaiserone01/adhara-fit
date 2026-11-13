// S-04: el vencimiento es un día de calendario de Lima guardado como el inicio de ese día (05:00 UTC).
// El último día con acceso es el día del vencimiento (inclusive); no hay días de gracia.
import { inicioDelDiaLima } from "./fechaLima";

const MS_DIA = 86_400_000;

export type EstadoAcceso = "activo" | "vencido";

/** Día de calendario de Lima de un instante, como su inicio (05:00 UTC). */
export function diaLima(fecha: Date): Date {
  return inicioDelDiaLima(fecha);
}

/** Suma días corridos a un día de calendario (Lima no tiene horario de verano). */
export function sumarDiasCalendario(dia: Date, dias: number): Date {
  return new Date(diaLima(dia).getTime() + dias * MS_DIA);
}

/** ¿El vencimiento sigue vigente hoy? Vigente hasta el día del vencimiento, inclusive. */
export function estaVigente(vencimiento: Date | null, ahora: Date): boolean {
  return vencimiento !== null && diaLima(vencimiento).getTime() >= diaLima(ahora).getTime();
}

/** Función única del estado de acceso: activo hasta el día de vencimiento inclusive, vencido después (o sin vencimiento). */
export function estadoAcceso(vencimiento: Date | null, ahora: Date): EstadoAcceso {
  return estaVigente(vencimiento, ahora) ? "activo" : "vencido";
}

/** Redondea a centavos para comparar montos. */
export function aCentavos(monto: number): number {
  return Math.round(monto * 100);
}
