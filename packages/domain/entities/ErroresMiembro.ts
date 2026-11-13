// S-06: errores de documento y código de socio. Ningún mensaje incluye el número de documento.
export class DocumentoInvalidoError extends Error {
  constructor() {
    super("El número de documento no es válido para el tipo elegido.");
  }
}

export class DocumentoDuplicadoError extends Error {
  constructor() {
    super("Ya existe un socio con ese número de documento.");
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
