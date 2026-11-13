export interface Egreso {
  id: string;
  turnoId: string;
  // En soles (PEN).
  monto: number;
  metodo: string;
  motivo: string;
  registradoEn: Date;
}

export interface DatosNuevoEgreso {
  turnoId: string;
  monto: number;
  metodo: string;
  motivo: string;
}
