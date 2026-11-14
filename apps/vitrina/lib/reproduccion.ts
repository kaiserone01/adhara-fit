// Tiempos y cola de los videos de la TV. Todo es puro: los componentes solo leen el reloj y los eventos del <video>.
export const ESTANCADO_MS = 20_000; // sin avanzar el currentTime durante este tiempo, el video se salta
export const TOPE_VIDEO_MS = 10 * 60_000; // tope absoluto por video

// Red de seguridad: pase lo que pase con los eventos, una diapositiva con video no dura más que esto.
export function techoDiapositivaMs(duracionSeg: number): number {
  return TOPE_VIDEO_MS + duracionSeg * 1000;
}

// Cuánto falta (ms) para pasar a la siguiente diapositiva, o null si hay que esperar al fin de sus videos.
//  - sin video (imagen): `duracionSeg`;
//  - con video: al terminar el video; si falló (se muestra el póster), `duracionSeg`.
export function msParaAvanzar(e: {
  conVideo: boolean;
  videosTerminados: boolean;
  huboFallo: boolean;
  transcurridoMs: number;
  duracionSeg: number;
}): number | null {
  const faltaMinimo = Math.max(0, e.duracionSeg * 1000 - e.transcurridoMs);
  if (!e.conVideo) return faltaMinimo;
  if (!e.videosTerminados) return null;
  return e.huboFallo ? faltaMinimo : 0;
}

// Si el currentTime cambió, ahora es el último avance; si no, se conserva el anterior.
export function ultimoAvance(tiempoPrevio: number, tiempo: number, ahoraMs: number, avancePrevioMs: number): number {
  return tiempo !== tiempoPrevio ? ahoraMs : avancePrevioMs;
}

export type VeredictoVideo = "SEGUIR" | "ESTANCADO" | "TOPE";

// `conTope` es false cuando el video va en bucle (diapositiva única): ahí no hay un "fin" que vigilar.
export function evaluarVideo(e: { ahoraMs: number; inicioMs: number; ultimoAvanceMs: number; conTope: boolean }): VeredictoVideo {
  if (e.conTope && e.ahoraMs - e.inicioMs >= TOPE_VIDEO_MS) return "TOPE";
  if (e.ahoraMs - e.ultimoAvanceMs >= ESTANCADO_MS) return "ESTANCADO";
  return "SEGUIR";
}
