/**
 * Manifiesto de actualización: `latest.json` que el workflow `apk` sube junto al zip de la interfaz.
 * Funciones puras (sin Capacitor ni red) para poder probarlas.
 */
export interface ManifiestoOta {
  app: string;
  /** Mismo número que el versionCode del APK (número de corrida de GitHub): solo sube. */
  versionCode: number;
  versionName: string;
  /** Ruta del zip relativa a la URL base de actualizaciones. */
  zip: string;
  /** SHA-256 del zip en hexadecimal. */
  sha256: string;
}

const HEX_SHA256 = /^[0-9a-f]{64}$/;

export function validarManifiesto(crudo: unknown): ManifiestoOta | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const m = crudo as Record<string, unknown>;
  const { app, versionCode, versionName, zip, sha256 } = m;
  if (typeof app !== "string" || !app) return null;
  if (typeof versionCode !== "number" || !Number.isInteger(versionCode) || versionCode < 1) return null;
  if (typeof versionName !== "string" || !versionName) return null;
  // Solo un nombre de archivo simple: nada de rutas ni esquemas que lleven a otro servidor.
  if (typeof zip !== "string" || !/^[A-Za-z0-9._-]+\.zip$/.test(zip)) return null;
  if (typeof sha256 !== "string" || !HEX_SHA256.test(sha256.toLowerCase())) return null;
  return { app, versionCode, versionName, zip, sha256: sha256.toLowerCase() };
}

/** Hay actualización solo si la versión publicada es estrictamente mayor que la que corre. */
export function hayVersionNueva(actual: number, publicada: number): boolean {
  return Number.isInteger(publicada) && publicada > (Number.isInteger(actual) ? actual : 0);
}

/** `versionName` de un bundle es `1.0.<versionCode>`; «builtin» es la interfaz que trae el APK. */
export function versionDeBundle(nombre: string, versionDelApk: number): number {
  const m = /^(?:\d+\.\d+\.)?(\d+)$/.exec(nombre);
  return m ? Number(m[1]) : versionDelApk;
}

export function urlDelZip(base: string, zip: string): string {
  return `${base.replace(/\/+$/, "")}/${zip}`;
}

/** Solo https (o http en localhost para pruebas). */
export function urlBaseValida(base: unknown): base is string {
  if (typeof base !== "string") return false;
  try {
    const u = new URL(base);
    return u.protocol === "https:" || (u.protocol === "http:" && u.hostname === "localhost");
  } catch {
    return false;
  }
}

export const MAX_INTENTOS_POR_VERSION = 3;

/** Evita un bucle de descarga/reinicio si una versión falla una y otra vez. */
export function puedeIntentar(intentos: number): boolean {
  return intentos < MAX_INTENTOS_POR_VERSION;
}

export interface ConfigActualizaciones {
  /** URL base (https) donde están `latest.json` y los zip de esta app. */
  url: string;
  /** versionCode del APK instalado: la versión que se conoce mientras no haya ningún bundle descargado. */
  versionCode: number;
}

/** Lee el bloque `actualizaciones` de checkin-config.json / vitrina-config.json; null si falta o no es válido. */
export function leerActualizaciones(configuracion: unknown): ConfigActualizaciones | null {
  if (typeof configuracion !== "object" || configuracion === null) return null;
  const bloque = (configuracion as Record<string, unknown>).actualizaciones;
  if (typeof bloque !== "object" || bloque === null) return null;
  const { url, versionCode } = bloque as Record<string, unknown>;
  if (!urlBaseValida(url)) return null;
  if (typeof versionCode !== "number" || !Number.isInteger(versionCode) || versionCode < 0) return null;
  return { url: url.replace(/\/+$/, ""), versionCode };
}
