import type { IUnidadDeTrabajo } from "../ports/IUnidadDeTrabajo";
import type { Pago } from "../entities/Pago";
import { MAX_MESES_POR_PAGO } from "../entities/Pago";
import { aCentavos, diaLima, estaVigente, sumarDiasCalendario } from "../utils/vencimiento";
import { fijarVencimiento } from "./FijarVencimiento";
import { MiembroFueraDeSucursalError } from "./ObtenerMiembro";

import { MiembroEliminadoError } from "../entities/ErroresMiembro";

export { MiembroFueraDeSucursalError, MiembroEliminadoError };

export class MiembroNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el miembro.");
  }
}

export class PlanNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el plan.");
  }
}

export class PlanInactivoError extends Error {
  constructor() {
    super("No se puede registrar un pago contra un plan inactivo.");
  }
}

export class MesesInvalidosError extends Error {
  constructor() {
    super(`Los meses a pagar deben ser un número entero entre 1 y ${MAX_MESES_POR_PAGO}.`);
  }
}

export class MontoInvalidoError extends Error {
  constructor() {
    super("El monto debe ser mayor a S/ 0 y llevar un método de pago.");
  }
}

// El cobro es un solo pago completo: el monto debe ser exactamente el precio acordado por los meses pagados.
export class MontoDistintoDelPrecioError extends Error {
  constructor(precioTotal: number) {
    super(`El monto debe ser exactamente S/ ${precioTotal.toFixed(2)}: el cobro es un solo pago completo.`);
  }
}

export class FechaPagoFuturaError extends Error {
  constructor() {
    super("La fecha del pago no puede ser posterior a hoy.");
  }
}

// Mientras haya un vencimiento vigente, cobrar otro plan es un cambio de plan (S-07), no un cobro.
export class PlanDistintoConVencimientoVigenteError extends Error {
  constructor() {
    super("El socio tiene un vencimiento vigente con otro plan: usa «Cambiar de plan» en su ficha.");
  }
}

export interface DatosLineaPago {
  monto: number;
  metodo: string;
  metodoPagoId: string | null;
  numeroOperacion: string | null;
}

export interface DatosRegistrarPago {
  organizacionId: string;
  miembroId: string;
  planId: string;
  /** Un solo método de pago, por el monto completo. */
  linea: DatosLineaPago;
  sucursalId: string;
  registradoPorId: string;
  /** Identificador del cobro (UUID generado por la pantalla): reenviar el mismo cobro no lo duplica. */
  cobroId: string;
  /** Fecha del pago, de cualquier antigüedad pero nunca futura. Por defecto, ahora. */
  fechaPago?: Date;
  /** Meses que cubre el pago (1 a 6, por defecto 1). */
  meses?: number;
  ahora?: Date;
}

/**
 * Registra el cobro de una membresía: un solo pago, completo, atómico. Bloquea la fila del miembro, relee tras el
 * bloqueo y escribe pago, suscripción y vencimiento (una sola fecha, vía `fijarVencimiento`) en una transacción.
 * El mismo `cobroId` devuelve el pago ya registrado en vez de duplicarlo.
 */
export async function registrarPago(deps: { unidad: IUnidadDeTrabajo }, input: DatosRegistrarPago): Promise<Pago> {
  const meses = input.meses ?? 1;
  if (!Number.isInteger(meses) || meses < 1 || meses > MAX_MESES_POR_PAGO) throw new MesesInvalidosError();
  if (!(input.linea.monto > 0) || !input.linea.metodo) throw new MontoInvalidoError();

  const ahora = input.ahora ?? new Date();
  const fechaPago = input.fechaPago ?? ahora;
  if (diaLima(fechaPago).getTime() > diaLima(ahora).getTime()) throw new FechaPagoFuturaError();

  return deps.unidad.ejecutar(async (repos) => {
    await repos.miembros.bloquearPorId(input.miembroId);

    const yaRegistrado = await repos.pagos.buscarPorCobroId(input.cobroId);
    if (yaRegistrado) return yaRegistrado;

    const miembro = await repos.miembros.buscarPorId(input.organizacionId, input.miembroId);
    if (!miembro) throw new MiembroNoEncontradoError();
    // Un cobro ya registrado se devolvió arriba; un miembro eliminado (S-09) no recibe cobros nuevos.
    if (miembro.estado === "BAJA") throw new MiembroEliminadoError();

    const plan = await repos.planes.buscarPorId(input.organizacionId, input.planId);
    if (!plan) throw new PlanNoEncontradoError();
    if (!plan.activo) throw new PlanInactivoError();

    const diaPago = diaLima(fechaPago);
    const vigente = estaVigente(miembro.fechaVencimiento, diaPago);
    const mismoPlan = miembro.planId === input.planId;
    if (vigente && !mismoPlan) throw new PlanDistintoConVencimientoVigenteError();

    // El precio acordado del socio solo rige para su plan actual; otro plan (sin vencimiento vigente) cuesta su precio de lista.
    const precioMes = mismoPlan ? miembro.precioPlan : plan.precioUSD;
    const precioTotal = Math.round(precioMes * meses * 100) / 100;
    if (aCentavos(input.linea.monto) !== aCentavos(precioTotal)) throw new MontoDistintoDelPrecioError(precioTotal);

    // Si sigue vigente, el tiempo se suma al vencimiento actual; si no, cuenta desde el día del pago.
    const base = vigente && miembro.fechaVencimiento ? diaLima(miembro.fechaVencimiento) : diaPago;
    const fin = sumarDiasCalendario(base, plan.diasCiclo * meses);
    const vencimientoAnterior = miembro.fechaVencimiento ? diaLima(miembro.fechaVencimiento) : sumarDiasCalendario(diaPago, -1);

    const pago = await repos.pagos.crear({
      miembroId: input.miembroId,
      sucursalId: input.sucursalId,
      registradoPorId: input.registradoPorId,
      monto: input.linea.monto,
      metodo: input.linea.metodo,
      metodoPagoId: input.linea.metodoPagoId,
      numeroOperacion: input.linea.numeroOperacion,
      fechaInicioCiclo: base,
      fechaFinCiclo: fin,
      grupoPagoId: null,
      fechaPago,
      cobroId: input.cobroId,
      vencimientoAnterior,
    });

    await fijarVencimiento(repos, {
      miembroId: input.miembroId,
      planId: input.planId,
      inicio: vigente ? null : diaPago,
      fin,
      fechaUltimoPago: diaPago,
    });

    // Con otro plan (sin vencimiento vigente) el socio pasa a su precio de lista; con el mismo se conserva el acordado.
    if (!mismoPlan) {
      await repos.miembros.actualizar(input.organizacionId, input.miembroId, { planId: input.planId, precioPlan: plan.precioUSD });
    }

    return pago;
  });
}
