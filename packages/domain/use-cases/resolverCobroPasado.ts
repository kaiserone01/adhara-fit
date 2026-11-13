import { MAX_DIAS_ATRAS_PAGO_FECHADO } from "../entities/Pago";
import { FechaPagoInvalidaError } from "./RegistrarPago";

export interface CobroPasado {
  fecha: Date;
}

// Un cobro que ya se hizo en un día pasado y no se anotó (hasta MAX_DIAS_ATRAS_PAGO_FECHADO): queda fuera de turno.
// Devuelve null si la fecha falta o es de hoy (cobro normal).
export function resolverCobroPasado(fecha: Date | undefined): CobroPasado | null {
  const inicioDeHoy = new Date();
  inicioDeHoy.setHours(0, 0, 0, 0);
  if (!fecha || fecha >= inicioDeHoy) return null;

  const limite = new Date();
  limite.setDate(limite.getDate() - MAX_DIAS_ATRAS_PAGO_FECHADO);
  if (fecha < limite) throw new FechaPagoInvalidaError(MAX_DIAS_ATRAS_PAGO_FECHADO);

  return { fecha };
}
