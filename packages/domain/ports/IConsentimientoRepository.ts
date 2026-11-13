import type { ConsentimientoMiembro, MedioConsentimiento, TextoLegal, TipoTextoLegal } from "../entities/Consentimiento";

export interface ITextoLegalRepository {
  /** Versión vigente (la mayor) de un tipo, o null si todavía no se publicó ninguna. */
  vigente(organizacionId: string, tipo: TipoTextoLegal): Promise<TextoLegal | null>;
  /** Todas las versiones de un tipo, de la más reciente a la más antigua. */
  listar(organizacionId: string, tipo: TipoTextoLegal): Promise<TextoLegal[]>;
  /** Mayor versión publicada como cambio sustancial (0 si no hay). */
  versionSustancialMaxima(organizacionId: string, tipo: TipoTextoLegal): Promise<number>;
  /** Publica la versión siguiente (1 si es la primera, siempre sustancial). */
  publicar(datos: { organizacionId: string; tipo: TipoTextoLegal; contenido: string; cambioSustancial: boolean; publicadoPorId: string }): Promise<TextoLegal>;
}

export interface IConsentimientoRepository {
  registrar(datos: { miembroId: string; version: number; medio: MedioConsentimiento; registradoPorId: string }): Promise<ConsentimientoMiembro>;
  /** Última aceptación (revocada o no) de un socio. */
  ultimoDeMiembro(miembroId: string): Promise<ConsentimientoMiembro | null>;
  /** Última aceptación de cada socio de la organización, por id de socio. */
  ultimosPorMiembro(organizacionId: string): Promise<Map<string, ConsentimientoMiembro>>;
  /** Revoca la aceptación vigente del socio; false si no tiene una sin revocar. */
  revocar(datos: { miembroId: string; revocadoPorId: string; motivo: string }): Promise<boolean>;
}
