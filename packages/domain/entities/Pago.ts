export interface Pago {
  id: string;
  // Null en ventas de producto (ver productoId).
  miembroId: string | null;
  miembroNombre?: string;
  miembroPrecioPlan?: number;
  sucursalId: string;
  registradoPorId: string;
  registradoPorNombre?: string;
  monto: number;
  metodo: string;
  metodoPagoId: string | null;
  numeroOperacion: string | null;
  fechaPago: Date;
  fechaInicioCiclo: Date | null;
  fechaFinCiclo: Date | null;
  anuladoEn: Date | null;
  anuladoPorId: string | null;
  motivoAnulacion: string | null;
  // Correlaciona las N filas de un mismo pago combinado (ver
  // registrarPago) — null en pagos de una sola línea.
  grupoPagoId: string | null;
  // S-04: identificador del cobro y vencimiento previo (la anulación lo restaura); null en pagos que no son cobros de membresía.
  cobroId?: string | null;
  vencimientoAnterior?: Date | null;
  // Venta de producto: cada Pago es una línea de método de la venta.
  productoId?: string | null;
  productoNombre?: string | null;
  cantidad?: number | null;
}

// Meses que puede cubrir un solo pago adelantado (el precio y la duración del ciclo se multiplican).
export const MAX_MESES_POR_PAGO = 6;

export interface DatosNuevoPago {
  miembroId: string | null;
  sucursalId: string;
  registradoPorId: string;
  monto: number;
  metodo: string;
  metodoPagoId: string | null;
  numeroOperacion: string | null;
  fechaInicioCiclo: Date | null;
  fechaFinCiclo: Date | null;
  grupoPagoId: string | null;
  fechaPago?: Date; // fecha del pago (puede ser pasada); por defecto, ahora
  cobroId?: string | null;
  vencimientoAnterior?: Date | null;
  productoId?: string | null;
  productoNombre?: string | null;
  cantidad?: number | null;
}

export interface DatosLineaPago {
  monto: number;
  metodo: string;
  metodoPagoId: string | null;
  numeroOperacion: string | null;
}

// Un pago combinado sin líneas, o con alguna línea en $0/negativo o sin
// método, no tiene forma de saber a qué método imputar cada monto — se
// rechaza acá, no solo en la UI, porque un FormData armado a mano podría
// saltarse la validación del cliente. Única excepción: una sola línea en
// $0 (pago de cortesía), que cada caller valida contra su propio precio
// antes de llegar acá.
export class LineasDePagoInvalidasError extends Error {
  constructor() {
    super("Cada línea del pago necesita un monto mayor a S/ 0 y un método.");
  }
}

// Modo "exacto" (CambiarPlanConPago): la diferencia de un cambio de plan
// se paga completa, aunque combinando varios métodos — no existe abono
// parcial sobre esa diferencia (ver diseño acordado). Si la suma de las
// líneas no coincide exactamente con el monto a cobrar, se rechaza.
export class MontoLineasNoCubreObjetivoError extends Error {
  constructor() {
    super("La suma de las líneas de pago no coincide con el monto a cobrar.");
  }
}

// Única fuente de verdad para validar líneas de un pago (una o varias,
// según la modalidad). Dos modos:
// - "conAbono": acepta cualquier suma positiva (ventas de producto).
// - "exacto" (CambiarPlanConPago.ts): exige que la suma coincida
//   exactamente con `montoObjetivo` — no hay abono parcial sobre la
//   diferencia de un cambio de plan.
export function validarLineasDePago(
  lineas: DatosLineaPago[],
  modo: "conAbono" | "exacto",
  montoObjetivo?: number
): void {
  const esCortesia = lineas.length === 1 && lineas[0].monto <= 0;

  if (!esCortesia) {
    if (lineas.length === 0 || lineas.some((linea) => linea.monto <= 0 || !linea.metodo)) {
      throw new LineasDePagoInvalidasError();
    }
  }

  if (modo === "exacto" && montoObjetivo !== undefined) {
    const suma = lineas.reduce((total, linea) => total + linea.monto, 0);
    if (Math.abs(suma - montoObjetivo) >= 0.01) {
      throw new MontoLineasNoCubreObjetivoError();
    }
  }
}

