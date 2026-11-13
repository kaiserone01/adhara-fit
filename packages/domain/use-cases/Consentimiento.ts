// S-13: publicar textos legales y registrar o revocar el consentimiento de un socio.
import type { IConsentimientoRepository, ITextoLegalRepository } from "../ports/IConsentimientoRepository";
import type { IMemberRepository } from "../ports/IMemberRepository";
import {
  MAX_CARACTERES_TEXTO_LEGAL,
  MIN_CARACTERES_TEXTO_LEGAL,
  type ConsentimientoMiembro,
  type MedioConsentimiento,
  type TextoLegal,
  type TipoTextoLegal,
} from "../entities/Consentimiento";

export class TextoLegalInvalidoError extends Error {
  constructor() {
    super(`El texto debe tener entre ${MIN_CARACTERES_TEXTO_LEGAL} y ${MAX_CARACTERES_TEXTO_LEGAL} caracteres.`);
  }
}

export class SinTextoDeConsentimientoError extends Error {
  constructor() {
    super("Todavía no hay un texto de consentimiento publicado: publícalo en Configuraciones → Textos legales.");
  }
}

export class MedioInvalidoError extends Error {
  constructor() {
    super("Indica si el consentimiento se aceptó en pantalla o en papel.");
  }
}

export class MotivoRevocacionRequeridoError extends Error {
  constructor() {
    super("El motivo de la revocación es requerido.");
  }
}

export class ConsentimientoNoVigenteError extends Error {
  constructor() {
    super("El socio no tiene un consentimiento vigente que revocar.");
  }
}

export class MiembroDelConsentimientoNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el socio, o está eliminado.");
  }
}

export async function publicarTextoLegal(
  deps: { textos: ITextoLegalRepository },
  input: { organizacionId: string; tipo: TipoTextoLegal; contenido: string; cambioSustancial: boolean; publicadoPorId: string }
): Promise<TextoLegal> {
  const contenido = input.contenido.trim();
  if (contenido.length < MIN_CARACTERES_TEXTO_LEGAL || contenido.length > MAX_CARACTERES_TEXTO_LEGAL) throw new TextoLegalInvalidoError();
  return deps.textos.publicar({ ...input, contenido });
}

/** Registra la aceptación de la versión vigente del consentimiento (la que el socio acaba de leer). */
export async function registrarConsentimiento(
  deps: { textos: ITextoLegalRepository; consentimientos: IConsentimientoRepository; miembros: IMemberRepository },
  input: { organizacionId: string; miembroId: string; medio: string; registradoPorId: string }
): Promise<ConsentimientoMiembro> {
  if (input.medio !== "PANTALLA" && input.medio !== "PAPEL") throw new MedioInvalidoError();

  const texto = await deps.textos.vigente(input.organizacionId, "CONSENTIMIENTO");
  if (!texto) throw new SinTextoDeConsentimientoError();

  const miembro = await deps.miembros.buscarPorId(input.organizacionId, input.miembroId);
  if (!miembro || miembro.estado === "BAJA") throw new MiembroDelConsentimientoNoEncontradoError();

  return deps.consentimientos.registrar({
    miembroId: input.miembroId,
    version: texto.version,
    medio: input.medio as MedioConsentimiento,
    registradoPorId: input.registradoPorId,
  });
}

/** Revoca el consentimiento: no borra ni anonimiza datos; el socio queda «Revocado» hasta que acepte de nuevo. */
export async function revocarConsentimiento(
  deps: { consentimientos: IConsentimientoRepository; miembros: IMemberRepository },
  input: { organizacionId: string; miembroId: string; motivo: string; revocadoPorId: string }
): Promise<void> {
  const motivo = input.motivo.trim();
  if (!motivo) throw new MotivoRevocacionRequeridoError();

  const miembro = await deps.miembros.buscarPorId(input.organizacionId, input.miembroId);
  if (!miembro) throw new MiembroDelConsentimientoNoEncontradoError();

  const revocado = await deps.consentimientos.revocar({ miembroId: input.miembroId, revocadoPorId: input.revocadoPorId, motivo });
  if (!revocado) throw new ConsentimientoNoVigenteError();
}
