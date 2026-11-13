// S-01: límite de intentos de login por clave (correo normalizado + IP). Con 5 contraseñas fallidas en 15 minutos
// el login responde 429 sin verificar la contraseña. Los intentos bloqueados no cuentan como fallos.
import { evaluarBloqueoPorFallos, type EvaluacionBloqueoCheckin } from "./bloqueoCheckin";

export const MAX_FALLOS_LOGIN = 5;
export const VENTANA_FALLOS_LOGIN_MS = 15 * 60_000;

export function evaluarBloqueoLogin(fallos: readonly Date[], ahora: Date): EvaluacionBloqueoCheckin {
  return evaluarBloqueoPorFallos(fallos, ahora, { maximo: MAX_FALLOS_LOGIN, ventanaMs: VENTANA_FALLOS_LOGIN_MS });
}

/** Clave del límite: el correo en minúsculas y sin espacios, junto con la IP de quien intenta. */
export function claveIntentoLogin(email: string, ip: string): string {
  return `${email.trim().toLowerCase()}|${ip}`;
}
