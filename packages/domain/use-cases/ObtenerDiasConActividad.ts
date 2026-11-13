import { IPagoRepository } from "../ports/IPagoRepository";

// Días con al menos un cobro, para marcar el calendario del historial de pagos.
export async function obtenerDiasConActividad(deps: { pagos: IPagoRepository }, organizacionId: string): Promise<Date[]> {
  return deps.pagos.listarFechasConPagos(organizacionId);
}
