// S-06: errores de documento y código de socio. Ningún mensaje incluye el número de documento.
export class DocumentoInvalidoError extends Error {
  constructor() {
    super("El número de documento no es válido para el tipo elegido.");
  }
}

export class DocumentoDuplicadoError extends Error {
  constructor(eliminado = false) {
    super(
      eliminado
        ? "Existe un socio eliminado con ese número de documento: restáuralo desde el filtro «Eliminados» en vez de crear otro."
        : "Ya existe un socio con ese número de documento."
    );
  }
}

// S-09: eliminar y restaurar miembros (baja lógica).
export class MiembroYaEliminadoError extends Error {
  constructor() {
    super("El socio ya está eliminado.");
  }
}

export class MiembroNoEliminadoError extends Error {
  constructor() {
    super("El socio no está eliminado.");
  }
}

export class MiembroEliminadoError extends Error {
  constructor() {
    super("El socio está eliminado: restáuralo para cobrarle, cambiarle el plan o editar su ficha.");
  }
}

export class MotivoBajaInvalidoError extends Error {
  constructor() {
    super("El motivo puede tener como máximo 200 caracteres.");
  }
}

export class CodigosSocioAgotadosError extends Error {
  constructor() {
    super("Se agotaron los códigos de socio (0001 a 9999).");
  }
}

export class CodigoSocioEnConflictoError extends Error {
  constructor() {
    super("No se pudo asignar el código de socio; vuelve a intentarlo.");
  }
}
