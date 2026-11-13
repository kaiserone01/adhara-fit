import type { IUnidadDeTrabajo } from "../ports/IUnidadDeTrabajo";
import { MiembroFueraDeSucursalError } from "./ObtenerMiembro";
import { MiembroNoEncontradoError } from "./ActualizarMiembro";

export { MiembroNoEncontradoError };

export interface DatosEliminarMiembro {
  organizacionId: string;
  id: string;
  sucursalActivaId: string;
  usuarioId: string;
  /**
   * `false`: se borran el socio, sus asistencias, su plan y sus datos, y sus pagos quedan en caja e ingresos como
   * «Socio eliminado». `true`: se borran también todos sus pagos (los ingresos pasados bajan). Es irreversible.
   */
  conPagos: boolean;
}

/**
 * Elimina a un socio de forma definitiva y en un solo paso (no hay bandeja de eliminados ni restauración). Todo ocurre
 * en una transacción y queda un registro de auditoría sin datos personales.
 */
export async function eliminarMiembro(deps: { unidad: IUnidadDeTrabajo }, input: DatosEliminarMiembro): Promise<void> {
  await deps.unidad.ejecutar(async (repos) => {
    await repos.miembros.bloquearPorId(input.id);
    const miembro = await repos.miembros.buscarPorId(input.organizacionId, input.id);
    if (!miembro) throw new MiembroNoEncontradoError();
    if (miembro.sucursalId !== null && miembro.sucursalId !== input.sucursalActivaId) {
      throw new MiembroFueraDeSucursalError("otra sucursal");
    }

    await repos.miembros.eliminarDefinitivamente(input.id, input.conPagos);
    await repos.auditoria.registrar({
      entidad: "Miembro",
      entidadId: input.id,
      campo: "eliminado",
      valorAnterior: "ACTIVO",
      valorNuevo: input.conPagos ? "ELIMINADO_CON_PAGOS" : "ELIMINADO_CONSERVANDO_PAGOS",
      motivo: "eliminación definitiva",
      usuarioId: input.usuarioId,
    });
  });
}
