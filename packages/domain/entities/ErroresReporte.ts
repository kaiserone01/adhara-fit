// S-14: errores de los reportes.
export class RangoInvalidoError extends Error {
  constructor() {
    super("El rango de fechas no es válido: la fecha inicial debe ser anterior a la final y el rango, de hasta 366 días (36 meses por mes).");
  }
}

export class ParametroInvalidoError extends Error {
  constructor() {
    super("Los días deben ser un número entero de 1 a 30.");
  }
}
