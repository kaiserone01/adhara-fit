import { Plan, DatosNuevoPlan, CambiosPlan } from "../entities/Plan";

export interface IPlanRepository {
  listarPorOrganizacion(organizacionId: string): Promise<Plan[]>;
  buscarPorId(organizacionId: string, id: string): Promise<Plan | null>;
  crear(datos: DatosNuevoPlan): Promise<Plan>;
  actualizar(organizacionId: string, id: string, cambios: CambiosPlan): Promise<Plan | null>;
  /**
   * Borrado físico. Sin onDelete: Cascade en Miembro.planId/Suscripcion.planId
   * — falla si algún miembro o suscripción sigue usando este plan; ver
   * EliminarPlan.ts, que traduce eso a un error de dominio legible.
   */
  eliminar(id: string): Promise<void>;
}
