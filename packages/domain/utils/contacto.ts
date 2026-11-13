// Celular y correo del socio: ambos opcionales. Se guardan normalizados (celular: 9 dígitos; correo: en minúsculas).
import { CelularInvalidoError, CorreoInvalidoError } from "../entities/ErroresMiembro";

export const LARGO_CELULAR = 9;
export const LARGO_MAXIMO_CORREO = 254;

// Móvil peruano: 9 dígitos que empiezan con 9 (el +51 es opcional al escribirlo).
const FORMATO_CELULAR = /^9[0-9]{8}$/;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Patrón HTML del campo con máscara («987 654 321»). */
export const PATRON_CELULAR_MASCARA = "9[0-9]{2} [0-9]{3} [0-9]{3}";

function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Solo dígitos, sin el prefijo +51 y como máximo 9: lo que queda guardado. */
export function normalizarCelular(texto: string): string {
  const digitos = soloDigitos(texto);
  const sinPrefijo = digitos.length > LARGO_CELULAR && digitos.startsWith("51") ? digitos.slice(2) : digitos;
  return sinPrefijo.slice(0, LARGO_CELULAR);
}

/** Máscara de entrada «987 654 321»: se aplica mientras se teclea o se pega. */
export function aplicarMascaraCelular(texto: string): string {
  return normalizarCelular(texto).replace(/(\d{3})(?=\d)/g, "$1 ");
}

export function validarCelular(texto: string): boolean {
  return FORMATO_CELULAR.test(normalizarCelular(texto));
}

export function normalizarCorreo(texto: string): string {
  return texto.trim().toLowerCase();
}

export function validarCorreo(texto: string): boolean {
  const correo = normalizarCorreo(texto);
  return correo.length <= LARGO_MAXIMO_CORREO && FORMATO_CORREO.test(correo);
}

/** Vacío o ausente → null (es opcional); con texto, debe ser un celular válido y se devuelve normalizado. */
export function prepararCelular(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== "string") throw new CelularInvalidoError();
  if (valor.trim() === "") return null;
  if (!validarCelular(valor)) throw new CelularInvalidoError();
  return normalizarCelular(valor);
}

/** Vacío o ausente → null (es opcional); con texto, debe ser un correo válido y se devuelve en minúsculas. */
export function prepararCorreo(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== "string") throw new CorreoInvalidoError();
  if (valor.trim() === "") return null;
  if (!validarCorreo(valor)) throw new CorreoInvalidoError();
  return normalizarCorreo(valor);
}
