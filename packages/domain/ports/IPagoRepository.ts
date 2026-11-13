import { Pago, DatosNuevoPago } from "../entities/Pago";

export interface IPagoRepository {
  crear(datos: DatosNuevoPago): Promise<Pago>;
  listarPorMiembro(miembroId: string): Promise<Pago[]>;
  // S-04: el mismo cobroId no se registra dos veces.
  buscarPorCobroId(cobroId: string): Promise<Pago | null>;
  listarPorOrganizacion(organizacionId: string): Promise<Pago[]>;
  listarPorOrganizacionYRango(organizacionId: string, desde: Date, hasta: Date): Promise<Pago[]>;
  // Días (medianoche UTC de la fecha de Lima) con al menos un cobro en la organización, para el calendario del historial.
  listarFechasConPagos(organizacionId: string): Promise<Date[]>;
  buscarPorId(organizacionId: string, id: string): Promise<Pago | null>;
  // Filas de un mismo cobro (mismo grupoPagoId) que siguen sin anular.
  contarVigentesPorGrupo(organizacionId: string, grupoPagoId: string): Promise<number>;
  anular(organizacionId: string, id: string, anuladoPorId: string, motivo: string, anuladoEn: Date): Promise<Pago>;
}
