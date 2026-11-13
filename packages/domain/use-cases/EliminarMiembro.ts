import type { IUnidadDeTrabajo } from "../ports/IUnidadDeTrabajo";
import type { Miembro } from "../entities/Miembro";
import {
  MiembroYaEliminadoError,
  MiembroNoEliminadoError,
  MotivoBajaInvalidoError,
} from "../entities/ErroresMiembro";
import { MiembroFueraDeSucursalError } from "./ObtenerMiembro";
import { MiembroNoEncontradoError } from "./ActualizarMiembro";

export { MiembroYaEliminadoError, MiembroNoEliminadoError, MotivoBajaInvalidoError, MiembroNoEncontradoError };

const MAX_MOTIVO = 200;

export interface DatosCambioEstadoMiembro {
  organizacionId: string;
  id: string;
  sucursalActivaId: string;
  usuarioId: string;
  motivo?: string | null;
  ahora?: Date;
}

// Motivo opcional, recortado y de hasta 200 caracteres; la auditoría guarda «sin motivo» si no hay.
function normalizarMotivo(motivo: string | null | undefined): string | null {
  const texto = (motivo ?? "").trim();
  if (texto.length > MAX_MOTIVO) throw new MotivoBajaInvalidoError();
  return texto || null;
}

async function cambiarEstado(
  deps: { unidad: IUnidadDeTrabajo },
  input: DatosCambioEstadoMiembro,
  de: Miembro["estado"],
  a: Miembro["estado"]
): Promise<void> {
  const motivo = normalizarMotivo(input.motivo);

  await deps.unidad.ejecutar(async (repos) => {
    await repos.miembros.bloquearPorId(input.id);
    // Se relee tras el bloqueo: otra eliminación o restauración pudo cambiar el estado.
    const miembro = await repos.miembros.buscarPorId(input.organizacionId, input.id);
    if (!miembro) throw new MiembroNoEncontradoError();
    if (miembro.sucursalId !== null && miembro.sucursalId !== input.sucursalActivaId) {
      throw new MiembroFueraDeSucursalError("otra sucursal");
    }
    if (miembro.estado !== de) throw de === "ACTIVO" ? new MiembroYaEliminadoError() : new MiembroNoEliminadoError();

    // Solo cambia el estado y los datos de baja: pagos, suscripciones, check-ins y datos del socio no se tocan.
    await repos.miembros.actualizar(
      input.organizacionId,
      input.id,
      a === "BAJA"
        ? { estado: "BAJA", bajaEn: input.ahora ?? new Date(), bajaPorId: input.usuarioId, bajaMotivo: motivo }
        : { estado: "ACTIVO", bajaEn: null, bajaPorId: null, bajaMotivo: null }
    );
    await repos.auditoria.registrar({
      entidad: "Miembro",
      entidadId: input.id,
      campo: "estado",
      valorAnterior: de,
      valorNuevo: a,
      motivo: motivo ?? "sin motivo",
      usuarioId: input.usuarioId,
    });
  });
}

/** Elimina a un socio (baja lógica y reversible, S-09): deja de aparecer y conserva todos sus pagos y datos. */
export function eliminarMiembro(deps: { unidad: IUnidadDeTrabajo }, input: DatosCambioEstadoMiembro): Promise<void> {
  return cambiarEstado(deps, input, "ACTIVO", "BAJA");
}

/** Restaura a un socio eliminado: vuelve a estar activo con sus datos, plan y vencimiento tal como estaban. */
export function restaurarMiembro(deps: { unidad: IUnidadDeTrabajo }, input: DatosCambioEstadoMiembro): Promise<void> {
  return cambiarEstado(deps, input, "BAJA", "ACTIVO");
}
