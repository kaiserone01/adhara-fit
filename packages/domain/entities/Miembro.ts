import type { TipoDocumento } from "../utils/documento";

export type EstadoMiembro = "ACTIVO" | "BAJA";

export interface Miembro {
  id: string;
  organizacionId: string;
  sucursalId: string | null; // null = "Ambas" (todas las sedes de la organización), solo si plan.multisede
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  codigoSocio: string | null;
  fechaInscripcion: Date | null;
  fechaNacimiento: Date | null;
  celular: string | null;
  fotoUrl: string | null;
  entrenadorId: string | null;
  entrenadorNombre: string | null;
  planId: string | null;
  precioPlan: number;
  fechaUltimoPago: Date | null;
  fechaVencimiento: Date | null;
  // S-09: BAJA se muestra como «Eliminado». Un miembro eliminado conserva todos sus datos y pagos.
  estado: EstadoMiembro;
  bajaEn: Date | null;
  bajaPorId: string | null;
  bajaMotivo: string | null;
  createdAt: Date;
}

export interface DatosNuevoMiembro {
  organizacionId: string;
  sucursalId: string | null;
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  codigoSocio: string | null;
  fechaInscripcion: Date | null;
  fechaNacimiento: Date | null;
  celular: string | null;
  fotoUrl: string | null;
  entrenadorId: string | null;
  planId: string | null;
  precioPlan: number;
  fechaUltimoPago?: Date | null;
  fechaVencimiento?: Date | null;
}

export interface CambiosMiembro {
  nombre?: string;
  tipoDocumento?: TipoDocumento;
  numeroDocumento?: string;
  codigoSocio?: string | null;
  sucursalId?: string | null;
  fechaInscripcion?: Date | null;
  fechaNacimiento?: Date | null;
  celular?: string | null;
  fotoUrl?: string | null;
  entrenadorId?: string | null;
  planId?: string | null;
  precioPlan?: number;
  fechaUltimoPago?: Date | null;
  fechaVencimiento?: Date | null;
  estado?: EstadoMiembro;
  bajaEn?: Date | null;
  bajaPorId?: string | null;
  bajaMotivo?: string | null;
}
