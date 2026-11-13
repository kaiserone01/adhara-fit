// S-07: cálculo del cambio de plan a mitad de ciclo. Función pura (sin reloj ni base de datos), compartida por el
// servidor (`cambiarPlan`) y la vista previa del formulario. Los importes se calculan en céntimos enteros y se
// redondean una sola vez, half-up; las fechas son días de calendario de Lima.
import { aCentavos, diaLima, sumarDiasCalendario } from "../utils/vencimiento";

const MS_DIA = 86_400_000;

export interface DatosCambioPlan {
  /** Hoy: el día de Lima tomado del servidor (nunca el reloj del navegador). */
  hoy: Date;
  /** Vencimiento actual del socio (último día con acceso). */
  vencimientoActual: Date;
  /** Precio acordado vigente del socio (Miembro.precioPlan). */
  precioActual: number;
  diasCicloActual: number;
  /** Precio de catálogo del plan nuevo. */
  precioNuevo: number;
  diasCicloNuevo: number;
}

export interface ResultadoCambioPlan {
  /** Días de Lima desde hoy hasta el vencimiento: 0 el día del vencimiento, nunca negativo. */
  diasRestantes: number;
  /** Lo que queda sin consumir del plan actual, en céntimos. */
  valorNoConsumidoCentavos: number;
  precioNuevoCentavos: number;
  /** Días extra que el excedente agrega al ciclo del plan nuevo (0 si hay que cobrar). */
  diasNuevos: number;
  /** Diferencia a cobrar, en céntimos (0 si el valor no consumido cubre el plan nuevo). */
  montoCobrarCentavos: number;
  nuevoVencimiento: Date;
}

export class DatosCambioPlanInvalidosError extends Error {
  constructor() {
    super("Los precios y las duraciones de los planes deben ser positivos.");
  }
}

// Entero cercano a (numerador / denominador), con los .5 hacia arriba. Todo en enteros: sin punto flotante.
function divisionHalfUp(numerador: number, denominador: number): number {
  return Math.floor((2 * numerador + denominador) / (2 * denominador));
}

export function calcularCambioPlan(datos: DatosCambioPlan): ResultadoCambioPlan {
  const precioActualCentavos = aCentavos(datos.precioActual);
  const precioNuevoCentavos = aCentavos(datos.precioNuevo);
  if (
    precioActualCentavos <= 0 ||
    precioNuevoCentavos <= 0 ||
    !Number.isInteger(datos.diasCicloActual) ||
    !Number.isInteger(datos.diasCicloNuevo) ||
    datos.diasCicloActual < 1 ||
    datos.diasCicloNuevo < 1
  ) {
    throw new DatosCambioPlanInvalidosError();
  }

  const hoy = diaLima(datos.hoy);
  const diasRestantes = Math.max(0, Math.round((diaLima(datos.vencimientoActual).getTime() - hoy.getTime()) / MS_DIA));

  const valorNoConsumidoCentavos = divisionHalfUp(precioActualCentavos * diasRestantes, datos.diasCicloActual);

  let montoCobrarCentavos = 0;
  let diasNuevos = 0;
  if (valorNoConsumidoCentavos < precioNuevoCentavos) {
    montoCobrarCentavos = precioNuevoCentavos - valorNoConsumidoCentavos;
  } else if (valorNoConsumidoCentavos > precioNuevoCentavos) {
    const excedente = valorNoConsumidoCentavos - precioNuevoCentavos;
    diasNuevos = divisionHalfUp(excedente * datos.diasCicloNuevo, precioNuevoCentavos);
  }

  return {
    diasRestantes,
    valorNoConsumidoCentavos,
    precioNuevoCentavos,
    diasNuevos,
    montoCobrarCentavos,
    nuevoVencimiento: sumarDiasCalendario(hoy, datos.diasCicloNuevo + diasNuevos),
  };
}
