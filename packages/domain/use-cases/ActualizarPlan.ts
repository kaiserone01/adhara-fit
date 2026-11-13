import { IPlanRepository } from "../ports/IPlanRepository";
import { Plan, CambiosPlan } from "../entities/Plan";
import { validarPrecioPlan } from "./CrearPlan";

export class PlanNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el plan.");
  }
}

// La duración de un plan no se edita después de crearlo (S-07): para otra duración se crea otro plan.
export class DiasCicloInmutablesError extends Error {
  constructor() {
    super("La duración de un plan no se puede cambiar: crea otro plan y desactiva este.");
  }
}

export async function actualizarPlan(
  deps: { planes: IPlanRepository },
  input: { organizacionId: string; id: string; cambios: CambiosPlan & { diasCiclo?: number } }
): Promise<Plan> {
  const { diasCiclo, ...cambios } = input.cambios;

  if (diasCiclo !== undefined) {
    const actual = await deps.planes.buscarPorId(input.organizacionId, input.id);
    if (!actual) throw new PlanNoEncontradoError();
    if (actual.diasCiclo !== diasCiclo) throw new DiasCicloInmutablesError();
  }
  if (cambios.precioUSD !== undefined) validarPrecioPlan(cambios.precioUSD);

  const actualizado = await deps.planes.actualizar(input.organizacionId, input.id, cambios);

  if (!actualizado) {
    throw new PlanNoEncontradoError();
  }

  return actualizado;
}
