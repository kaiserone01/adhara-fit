// S-06: errores de documento y código de socio. Ningún mensaje incluye el número de documento.
export class DocumentoInvalidoError extends Error {
  constructor() {
    super("El número de documento no es válido para el tipo elegido.");
  }
}

export class CelularInvalidoError extends Error {
  constructor() {
    super("El celular debe tener 9 dígitos y empezar con 9.");
  }
}

export class CorreoInvalidoError extends Error {
  constructor() {
    super("El correo electrónico no es válido.");
  }
}

export class DocumentoDuplicadoError extends Error {
  constructor(eliminado = false) {
    super(
      eliminado
        ? "Ese número de documento pertenece a un socio eliminado antes de este cambio y sigue reservado: pide que lo depuren."
        : "Ya existe un socio con ese número de documento."
    );
  }
}

// S-09 (heredado): un socio en estado BAJA ya no se crea, pero los que quedaron se tratan como inexistentes.
export class MiembroEliminadoError extends Error {
  constructor() {
    super("El socio está eliminado: ya no se le puede cobrar, cambiar de plan ni editar.");
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
