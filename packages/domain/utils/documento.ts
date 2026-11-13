// S-06: documento de identidad (DNI o CE, carné de extranjería) y código de socio.
export const TIPOS_DOCUMENTO = ["DNI", "CE"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ETIQUETA_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  DNI: "DNI",
  CE: "CE",
};

// Longitudes por tipo (asumido, por validar): DNI 8 dígitos; CE 9–12 dígitos (solo números: el socio lo teclea en el
// teclado numérico del check-in, así que un CE con letras no podría entrar).
const FORMATOS: Record<TipoDocumento, RegExp> = {
  DNI: /^[0-9]{8}$/,
  CE: /^[0-9]{9,12}$/,
};

// Máximo de caracteres que admite la máscara de entrada de cada tipo. El DNI son 8 dígitos (el dígito verificador
// que lleva el carné tras el guion no forma parte del número); el CE admite hasta 12 (asumido, por validar).
export const LARGO_MAXIMO_DOCUMENTO: Record<TipoDocumento, number> = { DNI: 8, CE: 12 };

/** Máscara de entrada: solo dígitos y el largo máximo del tipo. Sirve al teclear, pegar o cambiar de tipo. */
export function aplicarMascaraDocumento(tipo: TipoDocumento, texto: string): string {
  return texto.replace(/\D/g, "").slice(0, LARGO_MAXIMO_DOCUMENTO[tipo]);
}

/** Patrón HTML (`pattern`) del número del tipo, para que el navegador avise antes de enviar. */
export const PATRON_DOCUMENTO: Record<TipoDocumento, string> = {
  DNI: "[0-9]{8}",
  CE: "[0-9]{9,12}",
};

/** Documento para los reportes: 5 puntos y los últimos 3 caracteres («•••••678»); solo puntos si tiene menos de 3. */
export function enmascararDocumento(numero: string): string {
  const puntos = "•••••";
  return numero.length < 3 ? puntos : puntos + numero.slice(-3);
}

/** «DNI 12345678», «CE 001234567». */
export function descripcionDocumento(tipo: TipoDocumento, numero: string): string {
  return `${tipo} ${numero}`;
}

export const LARGO_CODIGO_SOCIO = 4;
export const MAXIMO_CODIGO_SOCIO = 9999;

export function esTipoDocumento(valor: unknown): valor is TipoDocumento {
  return typeof valor === "string" && (TIPOS_DOCUMENTO as readonly string[]).includes(valor);
}

/** Recorta, pasa a mayúsculas y quita espacios (incluido el de no separación) y guiones (incluidas raya y raya larga). */
export function normalizarDocumento(texto: string): string {
  return texto.trim().toUpperCase().replace(/[\s \-‐-―]/g, "");
}

/** Verdadero solo si el número (normalizado) cumple el formato del tipo. No calcula dígito verificador. */
export function validarDocumento(tipo: TipoDocumento, numero: string): boolean {
  return FORMATOS[tipo].test(normalizarDocumento(numero));
}

/** Un identificador de exactamente cuatro dígitos es un código de socio; cualquier otro texto, un documento. */
export function esCodigoSocio(identificador: string): boolean {
  return /^[0-9]{4}$/.test(identificador.trim());
}

/**
 * Ningún tipo recibe ya un código de socio nuevo: el socio entra con su DNI o su carné de extranjería (decisión del
 * propietario, 2026-11-13). Los códigos ya asignados siguen sirviendo para registrar asistencia.
 */
export function requiereCodigoSocio(_tipo: TipoDocumento): boolean {
  return false;
}

export function formatearCodigoSocio(numero: number): string {
  return String(numero).padStart(LARGO_CODIGO_SOCIO, "0");
}
