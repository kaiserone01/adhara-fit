import { Miembro, DatosNuevoMiembro, CambiosMiembro } from "../entities/Miembro";

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
  crear(datos: DatosNuevoMiembro): Promise<Miembro>;
  actualizar(organizacionId: string, id: string, cambios: CambiosMiembro): Promise<Miembro | null>;
  // Fecha del último pago (null = ninguno) y vencimiento; ver fijarVencimiento.
  actualizarFechasPago(id: string, fechaUltimoPago: Date | null, fechaVencimiento: Date): Promise<void>;
  // Bloquea la fila del miembro hasta el fin de la transacción en curso (cobros y anulaciones concurrentes).
  bloquearPorId(id: string): Promise<void>;
}
