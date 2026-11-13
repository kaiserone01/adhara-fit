// S-13: textos legales versionados y consentimiento de datos personales de los socios.
export const TIPOS_TEXTO_LEGAL = ["CONSENTIMIENTO", "POLITICA_PRIVACIDAD", "AVISO_RECLAMACIONES"] as const;
export type TipoTextoLegal = (typeof TIPOS_TEXTO_LEGAL)[number];

export const ETIQUETA_TIPO_TEXTO_LEGAL: Record<TipoTextoLegal, string> = {
  CONSENTIMIENTO: "Consentimiento de datos personales",
  POLITICA_PRIVACIDAD: "Política de privacidad",
  AVISO_RECLAMACIONES: "Aviso del Libro de Reclamaciones",
};

export const MIN_CARACTERES_TEXTO_LEGAL = 20;
export const MAX_CARACTERES_TEXTO_LEGAL = 20_000;

export interface TextoLegal {
  id: string;
  organizacionId: string;
  tipo: TipoTextoLegal;
  version: number;
  contenido: string;
  cambioSustancial: boolean;
  publicadoEn: Date;
}

export type MedioConsentimiento = "PANTALLA" | "PAPEL";

export interface ConsentimientoMiembro {
  id: string;
  miembroId: string;
  version: number;
  medio: MedioConsentimiento;
  aceptadoEn: Date;
  revocadoEn: Date | null;
  revocadoMotivo: string | null;
}

export type EstadoConsentimiento = "SIN_CONSENTIMIENTO" | "VIGENTE" | "DESACTUALIZADO" | "REVOCADO";

export const ETIQUETA_ESTADO_CONSENTIMIENTO: Record<EstadoConsentimiento, string> = {
  SIN_CONSENTIMIENTO: "Pendiente",
  VIGENTE: "Aceptado",
  DESACTUALIZADO: "Desactualizado",
  REVOCADO: "Revocado",
};

/**
 * Estado del consentimiento de un socio a partir de su última aceptación y de la mayor versión del texto publicada como
 * cambio sustancial (0 si no hay): quien aceptó una versión anterior a esa debe volver a aceptar.
 */
export function estadoConsentimiento(
  ultimo: Pick<ConsentimientoMiembro, "version" | "revocadoEn"> | null,
  versionSustancialMaxima: number
): EstadoConsentimiento {
  if (!ultimo) return "SIN_CONSENTIMIENTO";
  if (ultimo.revocadoEn) return "REVOCADO";
  return ultimo.version < versionSustancialMaxima ? "DESACTUALIZADO" : "VIGENTE";
}
