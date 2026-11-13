// S-14: lo que el repositorio entrega para los reportes de morosos y por vencer (una consulta, sin una por socio).
export interface MiembroParaReporte {
  id: string;
  nombre: string;
  codigoSocio: string | null;
  numeroDocumento: string;
  celular: string | null;
  planNombre: string | null;
  precioPlan: number;
  fechaVencimiento: Date | null;
  /** Cobro no anulado de mayor `creadoEn`; null si no tiene. */
  ultimoCobro: { fecha: Date; monto: number } | null;
}
