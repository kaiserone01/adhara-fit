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

// «Más reciente» por orden de registro (creadoEn) y, a igualdad, por identificador (S-07): un cambio de plan puede
// terminar antes que el cobro anterior, así que el fin de ciclo no sirve para ordenar.
function esPosterior(a: Pago, b: Pago): boolean {
  const ta = a.creadoEn?.getTime() ?? 0;
  const tb = b.creadoEn?.getTime() ?? 0;
  return ta !== tb ? ta > tb : a.id > b.id;
}

/**
 * Anula un cobro completo. Si era un cobro de membresía o de cambio de plan (guarda el vencimiento anterior), debe ser
 * el último vigente del socio y la anulación restaura el vencimiento y la fecha del último pago; si además fue un
 * cambio de plan, restaura también el plan y el precio anteriores (desde su auditoría). Los pagos sin vencimiento
 * anterior (ventas) se anulan sin tocar el socio. Todo en una transacción.
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
      if (otrosVigentes.some((p) => p.vencimientoAnterior !== null && esPosterior(p, pago))) throw new SoloUltimoCobroError();
    }

    const anulado = await repos.pagos.anular(input.organizacionId, input.pagoId, input.anuladoPorId, motivo, new Date());

    if (revierteVencimiento) {
      // Fecha del último pago que queda: el más reciente de los cobros vigentes del socio (null si no queda ninguno).
      const ultimoQueQueda = otrosVigentes
        .filter((p) => p.vencimientoAnterior !== null)
        .sort((a, b) => b.fechaPago.getTime() - a.fechaPago.getTime())[0];

      // Si fue un cambio de plan, el plan y el precio anteriores vuelven junto con el vencimiento.
      const cambioDePlan = await repos.auditoriaCambioPlan.buscarPorPagoId(pago.id);
      if (cambioDePlan) {
        await repos.miembros.actualizar(input.organizacionId, pago.miembroId as string, {
          planId: cambioDePlan.planAnteriorId,
          precioPlan: cambioDePlan.precioAnteriorCentavos / 100,
        });
      }

      await fijarVencimiento(repos, {
        miembroId: pago.miembroId as string,
        planId: cambioDePlan ? cambioDePlan.planAnteriorId : undefined,
        inicio: null,
        fin: pago.vencimientoAnterior as Date,
        fechaUltimoPago: ultimoQueQueda ? diaLima(ultimoQueQueda.fechaPago) : null,
      });
    }

    return anulado;
  });
}
