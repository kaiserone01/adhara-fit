export interface UsuarioAdmin {
  id: string;
  organizacionId: string;
  sucursalId: string | null;
  nombre: string;
  telefono: string | null;
  fotoUrl: string | null;
  email: string;
  activo: boolean;
}

export interface CambiosUsuarioAdmin {
  nombre?: string;
  telefono?: string | null;
  fotoUrl?: string | null;
  activo?: boolean;
}
