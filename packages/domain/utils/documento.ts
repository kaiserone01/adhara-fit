// S-06: documento de identidad (DNI o CE, carné de extranjería) y código de socio.
export const TIPOS_DOCUMENTO = ["DNI", "CE"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ETIQUETA_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  DNI: "DNI",
  CE: "CE",
};

// Longitudes por tipo (asumido, por validar): DNI 8 dígitos; CE 9–12 alfanuméricos.
const FORMATOS: Record<TipoDocumento, RegExp> = {
  DNI: /^[0-9]{8}$/,
  CE: /^[A-Z0-9]{9,12}$/,
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

/** Los tipos que no se pueden digitar en el teclado numérico reciben un código de socio. */
export function requiereCodigoSocio(tipo: TipoDocumento): boolean {
  return tipo !== "DNI";
}

export function formatearCodigoSocio(numero: number): string {
  return String(numero).padStart(LARGO_CODIGO_SOCIO, "0");
}
