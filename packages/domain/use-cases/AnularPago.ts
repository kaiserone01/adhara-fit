import { IPagoRepository } from "../ports/IPagoRepository";
import { Pago } from "../entities/Pago";

export class PagoNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el pago.");
  }
}

export class PagoYaAnuladoError extends Error {
  constructor() {
    super("Este pago ya fue anulado.");
  }
}

export class MotivoRequeridoError extends Error {
  constructor() {
    super("El motivo de la anulación es requerido.");
  }
}

export interface DatosAnularPago {
  organizacionId: string;
  pagoId: string;
  anuladoPorId: string;
  motivo: string;
}

export async function anularPago(
  deps: { pagos: IPagoRepository },
  input: DatosAnularPago
): Promise<Pago> {
  if (!input.motivo.trim()) {
    throw new MotivoRequeridoError();
  }

  const pago = await deps.pagos.buscarPorId(input.organizacionId, input.pagoId);
  if (!pago) {
    throw new PagoNoEncontradoError();
  }
  if (pago.anuladoEn) {
    throw new PagoYaAnuladoError();
  }

  const anulado = await deps.pagos.anular(input.organizacionId, input.pagoId, input.anuladoPorId, input.motivo.trim(), new Date());

  return anulado;
}
