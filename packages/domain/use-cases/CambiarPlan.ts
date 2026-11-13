import type { IUnidadDeTrabajo } from "../ports/IUnidadDeTrabajo";
import type { Pago } from "../entities/Pago";
import type { CambioPlanAuditoria } from "../entities/CambioPlanAuditoria";
import { calcularCambioPlan, type ResultadoCambioPlan } from "../entities/cambioPlanCalculo";
import { aCentavos, diaLima, estaVigente } from "../utils/vencimiento";
import { fijarVencimiento } from "./FijarVencimiento";
import {
  MiembroNoEncontradoError,
  PlanNoEncontradoError,
  PlanInactivoError,
  MiembroFueraDeSucursalError,
} from "./RegistrarPago";

export { MiembroNoEncontradoError, PlanNoEncontradoError, PlanInactivoError, MiembroFueraDeSucursalError };

export class PlanIgualError extends Error {
  constructor() {
    super("El socio ya tiene ese plan.");
  }
}

export class SinCicloVigenteError extends Error {
  constructor() {
    super("El socio no tiene una membresía vigente: corresponde un cobro normal, no un cambio de plan.");
  }
}

export class MiembroSinPlanError extends Error {
  constructor() {
    super("El socio no tiene un plan asignado: registra un cobro normal con el plan elegido.");
  }
}

// El cliente calculó su vista previa con otros datos (p. ej. pasó la medianoche de Lima o cambió el precio).
export class CambioDesactualizadoError extends Error {
  constructor() {
    super("El cálculo cambió desde que lo viste: revisa el monto y el nuevo vencimiento e inténtalo de nuevo.");
  }
}

export class MetodoPagoRequeridoError extends Error {
  constructor() {
    super("Elige el método de pago.");
  }
}

// El cobroId ya existe con otro socio, otro plan, otro importe, o es un cobro que no es un cambio de plan.
export class CobroEnConflictoError extends Error {
  constructor() {
    super("Este identificador de cobro ya se usó en otra operación. Vuelve a abrir el cambio de plan.");
  }
}

export class CobroAnuladoError extends Error {
  constructor() {
    super("Este cobro ya fue anulado: abre el cambio de plan de nuevo.");
  }
}

export class CobroDuplicadoError extends Error {
  constructor() {
    super("Este cobro ya se registró: recarga la ficha del socio para verlo.");
  }
}

export interface DatosCambiarPlan {
  organizacionId: string;
  miembroId: string;
  planNuevoId: string;
  /** Lo que el cliente vio en la vista previa: se rechaza si el servidor calcula otra cosa. */
  montoEsperado: number;
  vencimientoEsperado: Date;
  /** Un solo método de pago; solo hace falta si hay algo que cobrar. */
  linea: { metodo: string; metodoPagoId: string | null; numeroOperacion: string | null } | null;
  sucursalId: string;
  registradoPorId: string;
  /** Obligatorio cuando hay algo que cobrar: reenviar el mismo cobro no lo duplica. */
  cobroId: string | null;
  ahora?: Date;
}

export interface ResultadoCambiarPlan {
  calculo: ResultadoCambioPlan;
  pago: Pago | null;
  auditoria: CambioPlanAuditoria;
}

function esViolacionDeUnicidad(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

/**
 * Cambia el plan de un socio con vencimiento vigente: valora lo no consumido del plan actual, cobra la diferencia
 * (un solo pago, un solo método) o agrega días si sobra, y escribe todo en una transacción con el socio bloqueado.
 * El nuevo vencimiento pasa por `fijarVencimiento`, igual que el cobro y la anulación.
 */
export async function cambiarPlan(deps: { unidad: IUnidadDeTrabajo }, input: DatosCambiarPlan): Promise<ResultadoCambiarPlan> {
  const ahora = input.ahora ?? new Date();

  try {
    return await deps.unidad.ejecutar(async (repos) => {
      await repos.miembros.bloquearPorId(input.miembroId);

      // Mismo cobro reenviado (doble clic o reintento): devuelve el resultado original sin tocar nada.
      if (input.cobroId) {
        const previo = await repos.pagos.buscarPorCobroId(input.cobroId);
        if (previo) {
          const auditoriaPrevia = await repos.auditoriaCambioPlan.buscarPorPagoId(previo.id);
          const mismo =
            auditoriaPrevia !== null &&
            previo.miembroId === input.miembroId &&
            auditoriaPrevia.planNuevoId === input.planNuevoId &&
            aCentavos(previo.monto) === aCentavos(input.montoEsperado);
          if (!mismo || !auditoriaPrevia) throw new CobroEnConflictoError();
          if (previo.anuladoEn) throw new CobroAnuladoError();
          return { calculo: calculoDeAuditoria(auditoriaPrevia), pago: previo, auditoria: auditoriaPrevia };
        }
      }

      const miembro = await repos.miembros.buscarPorId(input.organizacionId, input.miembroId);
      if (!miembro) throw new MiembroNoEncontradoError();

      const planNuevo = await repos.planes.buscarPorId(input.organizacionId, input.planNuevoId);
      if (!planNuevo) throw new PlanNoEncontradoError();
      if (!planNuevo.activo) throw new PlanInactivoError();

      if (miembro.planId === input.planNuevoId) throw new PlanIgualError();

      if (!estaVigente(miembro.fechaVencimiento, ahora) || !miembro.fechaVencimiento) throw new SinCicloVigenteError();
      if (!miembro.planId) throw new MiembroSinPlanError();
      const planActual = await repos.planes.buscarPorId(input.organizacionId, miembro.planId);
      if (!planActual) throw new PlanNoEncontradoError();

      const calculo = calcularCambioPlan({
        hoy: ahora,
        vencimientoActual: miembro.fechaVencimiento,
        precioActual: miembro.precioPlan,
        diasCicloActual: planActual.diasCiclo,
        precioNuevo: planNuevo.precioUSD,
        diasCicloNuevo: planNuevo.diasCiclo,
      });

      if (
        aCentavos(input.montoEsperado) !== calculo.montoCobrarCentavos ||
        diaLima(input.vencimientoEsperado).getTime() !== calculo.nuevoVencimiento.getTime()
      ) {
        throw new CambioDesactualizadoError();
      }

      const hayCobro = calculo.montoCobrarCentavos > 0;
      if (hayCobro) {
        if (!input.cobroId) throw new CobroEnConflictoError();
        if (!input.linea || !input.linea.metodo) throw new MetodoPagoRequeridoError();
      }

      const hoy = diaLima(ahora);
      const vencimientoAnterior = diaLima(miembro.fechaVencimiento);

      let pago: Pago | null = null;
      if (hayCobro && input.linea) {
        pago = await repos.pagos.crear({
          miembroId: input.miembroId,
          sucursalId: input.sucursalId,
          registradoPorId: input.registradoPorId,
          monto: calculo.montoCobrarCentavos / 100,
          metodo: input.linea.metodo,
          metodoPagoId: input.linea.metodoPagoId,
          numeroOperacion: input.linea.numeroOperacion,
          fechaInicioCiclo: hoy,
          fechaFinCiclo: calculo.nuevoVencimiento,
          grupoPagoId: null,
          fechaPago: ahora,
          cobroId: input.cobroId,
          // La anulación del cobro devuelve el vencimiento (y, por la auditoría, el plan y el precio).
          vencimientoAnterior,
        });
      }

      await fijarVencimiento(repos, {
        miembroId: input.miembroId,
        planId: input.planNuevoId,
        inicio: hoy,
        fin: calculo.nuevoVencimiento,
        // Sin pago no se toca la fecha del último pago.
        fechaUltimoPago: pago ? hoy : miembro.fechaUltimoPago,
      });
      // El precio acordado del socio pasa a ser el de catálogo del plan nuevo.
      await repos.miembros.actualizar(input.organizacionId, input.miembroId, { planId: input.planNuevoId, precioPlan: planNuevo.precioUSD });

      const auditoria = await repos.auditoriaCambioPlan.crear({
        organizacionId: input.organizacionId,
        miembroId: input.miembroId,
        planAnteriorId: planActual.id,
        planNuevoId: planNuevo.id,
        vencimientoAnterior,
        vencimientoNuevo: calculo.nuevoVencimiento,
        diasRestantes: calculo.diasRestantes,
        valorNoConsumidoCentavos: calculo.valorNoConsumidoCentavos,
        precioAnteriorCentavos: aCentavos(miembro.precioPlan),
        diasCicloAnterior: planActual.diasCiclo,
        precioNuevoCentavos: calculo.precioNuevoCentavos,
        diasCicloNuevo: planNuevo.diasCiclo,
        diasNuevos: calculo.diasNuevos,
        montoCobradoCentavos: calculo.montoCobrarCentavos,
        pagoId: pago ? pago.id : null,
        registradoPorId: input.registradoPorId,
      });

      return { calculo, pago, auditoria };
    });
  } catch (error) {
    // Dos cobros simultáneos con el mismo cobroId: la base rechaza el segundo; se devuelve el error de dominio.
    if (esViolacionDeUnicidad(error)) throw new CobroDuplicadoError();
    throw error;
  }
}

function calculoDeAuditoria(a: CambioPlanAuditoria): ResultadoCambioPlan {
  return {
    diasRestantes: a.diasRestantes,
    valorNoConsumidoCentavos: a.valorNoConsumidoCentavos,
    precioNuevoCentavos: a.precioNuevoCentavos,
    diasNuevos: a.diasNuevos,
    montoCobrarCentavos: a.montoCobradoCentavos,
    nuevoVencimiento: a.vencimientoNuevo,
  };
}
