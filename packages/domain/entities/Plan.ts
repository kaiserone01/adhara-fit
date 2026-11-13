export const MIN_DIAS_CICLO = 1;
export const MAX_DIAS_CICLO = 365;

export interface Plan {
  id: string;
  organizacionId: string;
  nombre: string;
  // Duración del ciclo en días (entero de 1 a 365), fijada al crear el plan y no editable después (S-07).
  diasCiclo: number;
  precioUSD: number;
  multisede: boolean;
  activo: boolean;
}

export interface DatosNuevoPlan {
  organizacionId: string;
  nombre: string;
  diasCiclo: number;
  precioUSD: number;
  multisede: boolean;
}

export interface CambiosPlan {
  nombre?: string;
  precioUSD?: number;
  multisede?: boolean;
  activo?: boolean;
}
