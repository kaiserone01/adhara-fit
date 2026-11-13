import type { TipoDocumento } from "../utils/documento";

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
  saldoAFavorUSD: number;
  fechaUltimoPago: Date | null;
  fechaVencimiento: Date | null;
  activo: boolean;
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
  saldoAFavorUSD?: number;
  fechaUltimoPago?: Date | null;
  fechaVencimiento?: Date | null;
  activo?: boolean;
}
