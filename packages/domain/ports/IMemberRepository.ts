import { Miembro, DatosNuevoMiembro, CambiosMiembro } from "../entities/Miembro";
import type { MiembroParaReporte } from "../entities/ReporteVencimientos";

export interface IMemberRepository {
  // S-06: el documento (normalizado) y el código de socio son únicos en todo el sistema.
  buscarPorDocumento(numeroDocumento: string): Promise<Miembro | null>;
  buscarPorCodigoSocio(codigoSocio: string): Promise<Miembro | null>;
  /** Mayor código de socio asignado como número (0 si no hay ninguno). */
  maximoCodigoSocio(): Promise<number>;
  buscarPorId(organizacionId: string, id: string): Promise<Miembro | null>;
  // Todos los miembros de la organización, con su estado (S-09): quien llama filtra por estado.
  listarPorOrganizacion(organizacionId: string): Promise<Miembro[]>;
  // Lanzan DocumentoDuplicadoError o CodigoSocioEnConflictoError si la base rechaza la unicidad.
  // S-14: socios no eliminados con su plan y su último cobro no anulado, en una sola consulta.
  listarActivosParaReporte(organizacionId: string): Promise<MiembroParaReporte[]>;
  crear(datos: DatosNuevoMiembro): Promise<Miembro>;
  actualizar(organizacionId: string, id: string, cambios: CambiosMiembro): Promise<Miembro | null>;
  // Fecha del último pago (null = ninguno) y vencimiento; ver fijarVencimiento.
  actualizarFechasPago(id: string, fechaUltimoPago: Date | null, fechaVencimiento: Date): Promise<void>;
  // Bloquea la fila del miembro hasta el fin de la transacción en curso (cobros y anulaciones concurrentes).
  bloquearPorId(id: string): Promise<void>;
  /**
   * Borra al miembro y lo que cuelga de él (asistencias, suscripciones, cambios de plan, deudas). Con `conPagos` borra
   * también sus pagos; sin él, los pagos quedan sin socio. Pensado para ejecutarse dentro de una transacción.
   */
  eliminarDefinitivamente(id: string, conPagos: boolean): Promise<void>;
}
