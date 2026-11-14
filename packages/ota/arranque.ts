/**
 * Pantalla de arranque con búsqueda de actualizaciones: estados y mensajes. Funciones puras (sin Capacitor).
 */
export type EstadoArranque =
  | { fase: "buscando" }
  | { fase: "descargando"; version: string; porcentaje: number }
  | { fase: "instalando"; version: string }
  | { fase: "al-dia" }
  | { fase: "sin-conexion" }
  | { fase: "error-instalar"; version: string }
  | { fase: "listo" };

/** Porcentaje entero entre 0 y 100; cualquier valor que no sea un número finito cuenta como 0. */
export function porcentajeSeguro(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return 0;
  return Math.min(100, Math.max(0, Math.round(valor)));
}

export function mensajeArranque(estado: EstadoArranque): string {
  switch (estado.fase) {
    case "buscando":
      return "Buscando actualizaciones…";
    case "descargando":
      return `Descargando actualización ${estado.version} · ${estado.porcentaje} %`;
    case "instalando":
      return `Instalando actualización ${estado.version}…`;
    case "al-dia":
      return "Está actualizado";
    case "sin-conexion":
      return "No se pudo buscar actualizaciones · iniciando…";
    case "error-instalar":
      return `No se pudo instalar ${estado.version} · iniciando con la versión actual…`;
    case "listo":
      return "";
  }
}

/** Cuánto se deja leído el mensaje final antes de abrir la app. */
export function msMensajeFinal(estado: EstadoArranque): number {
  if (estado.fase === "al-dia") return 1200;
  if (estado.fase === "sin-conexion" || estado.fase === "error-instalar") return 2000;
  return 0;
}

/** El mensaje de «versión actual» que acompaña a «Está actualizado». */
export function textoVersion(version: string): string {
  return version ? `Versión ${version}` : "";
}
