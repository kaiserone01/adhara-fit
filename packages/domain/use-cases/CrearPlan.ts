import { IPlanRepository } from "../ports/IPlanRepository";
import { Plan, DatosNuevoPlan, MAX_DIAS_CICLO, MIN_DIAS_CICLO } from "../entities/Plan";
import { aCentavos } from "../utils/vencimiento";

export class PlanInvalidoError extends Error {}

/** Valida un precio de plan: mayor que S/ 0.00 (no hay planes gratuitos ni cortesías). */
export function validarPrecioPlan(precio: number): void {
  if (!Number.isFinite(precio) || aCentavos(precio) <= 0) {
    throw new PlanInvalidoError("El precio del plan debe ser mayor a S/ 0.00.");
  }
}

export async function crearPlan(deps: { planes: IPlanRepository }, input: DatosNuevoPlan): Promise<Plan> {
  if (!input.nombre.trim()) throw new PlanInvalidoError("El nombre del plan es requerido.");
  validarPrecioPlan(input.precioUSD);
  if (!Number.isInteger(input.diasCiclo) || input.diasCiclo < MIN_DIAS_CICLO || input.diasCiclo > MAX_DIAS_CICLO) {
    throw new PlanInvalidoError(`La duración del plan debe ser un número entero de días entre ${MIN_DIAS_CICLO} y ${MAX_DIAS_CICLO}.`);
  }
  return deps.planes.crear({ ...input, nombre: input.nombre.trim() });
}
