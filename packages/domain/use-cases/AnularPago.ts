import type { IUnidadDeTrabajo } from "../ports/IUnidadDeTrabajo";
import type { Pago } from "../entities/Pago";
import { fijarVencimiento } from "./FijarVencimiento";
import { diaLima } from "../utils/vencimiento";

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

// Solo se anula el cobro vigente más reciente del socio: para anular uno anterior hay que anular antes los posteriores.
export class SoloUltimoCobroError extends Error {
  constructor() {
    super("Solo se puede anular el último cobro vigente del socio: anula primero los posteriores.");
  }
}

export interface DatosAnularPago {
  organizacionId: string;
  pagoId: string;
  anuladoPorId: string;
  motivo: string;
}

/**
 * Anula un cobro completo. Si era un cobro de membresía (guarda el vencimiento anterior), debe ser el último
 * vigente del socio y la anulación restaura el vencimiento y la fecha del último pago. Los pagos sin vencimiento
 * anterior (cambio de plan, ventas) se anulan sin tocar el vencimiento. Todo en una transacción.
 */
export async function anularPago(deps: { unidad: IUnidadDeTrabajo }, input: DatosAnularPago): Promise<Pago> {
  const motivo = input.motivo.trim();
  if (!motivo) throw new MotivoRequeridoError();

  return deps.unidad.ejecutar(async (repos) => {
    const previo = await repos.pagos.buscarPorId(input.organizacionId, input.pagoId);
    if (!previo) throw new PagoNoEncontradoError();

    if (previo.miembroId) await repos.miembros.bloquearPorId(previo.miembroId);

    // Releer tras el bloqueo: otro cobro o anulación pudo cambiar el estado.
    const pago = await repos.pagos.buscarPorId(input.organizacionId, input.pagoId);
    if (!pago) throw new PagoNoEncontradoError();
    if (pago.anuladoEn) throw new PagoYaAnuladoError();

    const revierteVencimiento = pago.miembroId !== null && pago.vencimientoAnterior !== null;
    let otrosVigentes: Pago[] = [];
    if (revierteVencimiento) {
      const delMiembro = await repos.pagos.listarPorMiembro(pago.miembroId as string);
      otrosVigentes = delMiembro.filter((p) => p.id !== pago.id && !p.anuladoEn);
      const hayPosterior = otrosVigentes.some(
        (p) => p.vencimientoAnterior !== null && (p.fechaFinCiclo?.getTime() ?? 0) > (pago.fechaFinCiclo?.getTime() ?? 0)
      );
      if (hayPosterior) throw new SoloUltimoCobroError();
    }

    const anulado = await repos.pagos.anular(input.organizacionId, input.pagoId, input.anuladoPorId, motivo, new Date());

    if (revierteVencimiento) {
      // Fecha del último pago que queda: el más reciente de los cobros de membresía vigentes (null si no queda ninguno).
      const ultimoQueQueda = otrosVigentes
        .filter((p) => p.vencimientoAnterior !== null)
        .sort((a, b) => b.fechaPago.getTime() - a.fechaPago.getTime())[0];
      await fijarVencimiento(repos, {
        miembroId: pago.miembroId as string,
        inicio: null,
        fin: pago.vencimientoAnterior as Date,
        fechaUltimoPago: ultimoQueQueda ? diaLima(ultimoQueQueda.fechaPago) : null,
      });
    }

    return anulado;
  });
}
