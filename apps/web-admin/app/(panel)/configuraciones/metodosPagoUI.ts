import type { MetodoPago, TipoMetodoPago } from "@gym-app/domain/entities/MetodoPago";

// Metadata puramente visual derivada del tipo — el Badge es automático,
// no un campo editable (ver diseño acordado).
export const ETIQUETA_TIPO_METODO_PAGO: Record<TipoMetodoPago, string> = {
  EFECTIVO: "Efectivo",
  BILLETERA_DIGITAL: "Billetera digital",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Depósito",
};

export const TONO_TIPO_METODO_PAGO: Record<TipoMetodoPago, "verde" | "gris" | "ambar" | "rojo"> = {
  EFECTIVO: "verde",
  BILLETERA_DIGITAL: "gris",
  TARJETA: "rojo",
  TRANSFERENCIA: "ambar",
  DEPOSITO: "gris",
};

// Tipos que admiten varias instancias (Yape y Plin, varios bancos) — EFECTIVO es único, sin nombre de banco.
export const TIPOS_MULTI_INSTANCIA: TipoMetodoPago[] = ["BILLETERA_DIGITAL", "TARJETA", "TRANSFERENCIA", "DEPOSITO"];

// El snapshot legible que se guarda en Pago.metodo/Egreso.metodo. Debe coincidir exactamente con METODO_EFECTIVO
// de ObtenerResumenTurno para el efectivo ("Efectivo"), que es el que cuadra la caja.
export function construirNombreMetodo(metodo: MetodoPago): string {
  return `${ETIQUETA_TIPO_METODO_PAGO[metodo.tipo]}${metodo.nombreBanco ? ` - ${metodo.nombreBanco}` : ""}`;
}
