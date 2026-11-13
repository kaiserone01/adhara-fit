import type { IMemberRepository } from "../ports/IMemberRepository";
import type { ISuscripcionRepository } from "../ports/ISuscripcionRepository";

/**
 * Única función que escribe el vencimiento: `Miembro.fechaVencimiento` y `Suscripcion.fin` quedan siempre
 * iguales. La usan el cobro, la anulación y la edición de la ficha del miembro.
 * Si el miembro no tiene ninguna suscripción y se da `planId`, se crea una.
 */
export async function fijarVencimiento(
  deps: { miembros: IMemberRepository; suscripciones: ISuscripcionRepository },
  datos: {
    miembroId: string;
    planId?: string | null;
    /** Inicio del ciclo; null = no tocar el de la suscripción existente (se suma tiempo a un ciclo vigente). */
    inicio: Date | null;
    fin: Date;
    fechaUltimoPago: Date | null;
  }
): Promise<void> {
  const ajustada = await deps.suscripciones.ajustarCicloMasReciente(
    datos.miembroId,
    datos.inicio,
    datos.fin,
    datos.planId ?? undefined
  );
  if (!ajustada && datos.planId) {
    await deps.suscripciones.crear({ miembroId: datos.miembroId, planId: datos.planId, inicio: datos.inicio ?? datos.fechaUltimoPago ?? datos.fin, fin: datos.fin });
  }
  await deps.miembros.actualizarFechasPago(datos.miembroId, datos.fechaUltimoPago, datos.fin);
}
