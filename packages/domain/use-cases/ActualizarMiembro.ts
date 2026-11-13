import { IMemberRepository } from "../ports/IMemberRepository";
import { ISuscripcionRepository } from "../ports/ISuscripcionRepository";
import { ISucursalRepository } from "../ports/ISucursalRepository";
import { Miembro, CambiosMiembro } from "../entities/Miembro";
import { fijarVencimiento } from "./FijarVencimiento";
import { diaLima } from "../utils/vencimiento";
import { MiembroFueraDeSucursalError } from "./ObtenerMiembro";
import {
  CelularInvalidoError,
  CorreoInvalidoError,
  DocumentoDuplicadoError,
  DocumentoInvalidoError,
  MiembroEliminadoError,
} from "../entities/ErroresMiembro";
import { normalizarDocumento, requiereCodigoSocio, validarDocumento } from "../utils/documento";
import { prepararCelular, prepararCorreo } from "../utils/contacto";
import { conCodigoSocio } from "./AsignarCodigoSocio";

export {
  MiembroFueraDeSucursalError,
  CelularInvalidoError,
  CorreoInvalidoError,
  DocumentoDuplicadoError,
  DocumentoInvalidoError,
  MiembroEliminadoError,
};

// El plan no se cambia desde la ficha (S-07): lo hace `cambiarPlan`, que valora lo no consumido y cobra la diferencia.
export type CambiosMiembroFicha = Omit<CambiosMiembro, "planId">;

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

export class FechasIncoherentesError extends Error {
  constructor() {
    super("La fecha de pago no puede ser posterior a la de vencimiento.");
  }
}

export async function actualizarMiembro(
  deps: {
    miembros: IMemberRepository;
    suscripciones: ISuscripcionRepository;
    sucursales: ISucursalRepository;
  },
  input: { organizacionId: string; id: string; sucursalActivaId: string; cambios: CambiosMiembroFicha }
): Promise<Miembro> {
  const antes = await deps.miembros.buscarPorId(input.organizacionId, input.id);
  if (!antes) {
    throw new MiembroNoEncontradoError();
  }

  if (antes.estado === "BAJA") throw new MiembroEliminadoError();

  if (antes.sucursalId !== null && antes.sucursalId !== input.sucursalActivaId) {
    const sucursal = await deps.sucursales.buscarPorId(input.organizacionId, antes.sucursalId);
    throw new MiembroFueraDeSucursalError(sucursal?.nombre ?? "otra sucursal");
  }

  // Documento (S-06): si cambia el tipo o el número, debe cumplir el formato y no ser el de otro miembro.
  const cambios: CambiosMiembro = { ...input.cambios };
  const tipoFinal = cambios.tipoDocumento ?? antes.tipoDocumento;
  const numeroFinal = normalizarDocumento(cambios.numeroDocumento ?? antes.numeroDocumento);
  const cambiaDocumento = tipoFinal !== antes.tipoDocumento || numeroFinal !== antes.numeroDocumento;
  if (cambiaDocumento) {
    if (!validarDocumento(tipoFinal, numeroFinal)) {
      throw new DocumentoInvalidoError();
    }
    const existente = await deps.miembros.buscarPorDocumento(numeroFinal);
    if (existente && existente.id !== input.id) {
      throw new DocumentoDuplicadoError(existente.estado === "BAJA");
    }
    cambios.tipoDocumento = tipoFinal;
    cambios.numeroDocumento = numeroFinal;
  }
  // Celular y correo (opcionales): solo se validan si cambian respecto a lo guardado, para no bloquear la edición de un
  // socio cuyo dato viene de antes de las validaciones.
  if (cambios.celular !== undefined && cambios.celular !== antes.celular) cambios.celular = prepararCelular(cambios.celular);
  if (cambios.correo !== undefined && cambios.correo !== antes.correo) cambios.correo = prepararCorreo(cambios.correo);
  // El código de socio ya asignado no cambia nunca; solo se asigna uno si el miembro pasa a CE sin tenerlo.
  delete cambios.codigoSocio;
  const necesitaCodigo = cambiaDocumento && requiereCodigoSocio(tipoFinal) && antes.codigoSocio === null;

  // Ajuste manual de las fechas de pago y vencimiento (cualquier miembro, p. ej. para corregir un error): se mantiene en
  // sync con la Suscripcion y con el fin del ciclo de sus pagos (nunca por separado) y apaga el aviso "Por regularizar".
  // fechaUltimoPago null = vaciarla; fechaVencimiento ausente/null = sin cambio (un vencimiento no se vacía).
  const nuevoPago = input.cambios.fechaUltimoPago;
  const nuevoVencimiento = input.cambios.fechaVencimiento ?? null;
  const cambiaFechas = nuevoPago !== undefined || nuevoVencimiento !== null;
  const pagoFinal = nuevoPago !== undefined ? nuevoPago : antes.fechaUltimoPago;
  const vencimientoFinal = nuevoVencimiento ?? antes.fechaVencimiento;
  if (cambiaFechas && pagoFinal && vencimientoFinal && pagoFinal.getTime() > vencimientoFinal.getTime()) {
    throw new FechasIncoherentesError();
  }

  const actualizado = necesitaCodigo
    ? await conCodigoSocio(deps.miembros, (codigoSocio) =>
        deps.miembros.actualizar(input.organizacionId, input.id, { ...cambios, codigoSocio })
      )
    : await deps.miembros.actualizar(input.organizacionId, input.id, cambios);
  if (!actualizado) {
    throw new MiembroNoEncontradoError();
  }

  // Ajuste manual de las fechas desde la ficha: pasa por fijarVencimiento, igual que el cobro y la anulación, para que
  // Miembro.fechaVencimiento y Suscripcion.fin sigan siendo siempre la misma fecha.
  if (cambiaFechas && vencimientoFinal) {
    const dia = (f: Date) => diaLima(f);
    const inicio = pagoFinal && pagoFinal.getTime() < vencimientoFinal.getTime() ? dia(pagoFinal) : null;
    await fijarVencimiento(deps, {
      miembroId: input.id,
      planId: antes.planId,
      inicio,
      fin: dia(vencimientoFinal),
      fechaUltimoPago: pagoFinal ? dia(pagoFinal) : null,
    });
  }

  return actualizado;
}
