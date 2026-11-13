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

// Nombre con el que se ve un método en todo el sistema: su propio nombre («Yape», «BCP»), no el tipo. Solo el efectivo,
// que no tiene nombre propio, se llama «Efectivo».
export function nombreVisibleMetodo(metodo: Pick<MetodoPago, "nombreBanco" | "tipo">): string {
  return metodo.nombreBanco?.trim() || ETIQUETA_TIPO_METODO_PAGO[metodo.tipo];
}

// Etiqueta discreta del tipo, que acompaña al nombre sin competir con él.
export const ETIQUETA_DISCRETA_TIPO_METODO_PAGO: Record<TipoMetodoPago, string> = {
  EFECTIVO: "efectivo",
  BILLETERA_DIGITAL: "billetera",
  TARJETA: "tarjeta",
  TRANSFERENCIA: "transferencia",
  DEPOSITO: "depósito",
};

// El snapshot legible que se guarda en Pago.metodo. Debe coincidir exactamente con METODO_EFECTIVO para el efectivo
// («Efectivo»). Los cobros anteriores conservan su texto antiguo («Billetera digital - Yape»).
export function construirNombreMetodo(metodo: MetodoPago): string {
  return nombreVisibleMetodo(metodo);
}
