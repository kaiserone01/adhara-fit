// S-18: registro propio de entrenador, sin credenciales ni acceso al sistema.
export interface Entrenador {
  id: string;
  nombre: string;
  telefono: string | null;
  fotoUrl: string | null;
  activo: boolean;
}
