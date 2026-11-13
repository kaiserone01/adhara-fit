// Registro de auditoría general (tabla RegistroAuditoria): qué cambió, de qué a qué, por qué y quién.
export interface DatosRegistroAuditoria {
  entidad: string; // p. ej. "Miembro"
  entidadId: string;
  campo: string; // p. ej. "estado"
  valorAnterior: string;
  valorNuevo: string;
  motivo: string;
  usuarioId: string;
}

export interface IAuditoriaRepository {
  registrar(datos: DatosRegistroAuditoria): Promise<void>;
}
