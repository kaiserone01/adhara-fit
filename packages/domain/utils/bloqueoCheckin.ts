// S-21: límite de intentos fallidos del check-in (el código de socio son 4 dígitos y se podría enumerar).
// Un fallo cuenta mientras hayan pasado menos de 300 s; con 5 fallos vigentes el check-in se bloquea hasta
// que el más antiguo de ellos salga de la ventana. Los envíos bloqueados no cuentan como fallos.
export const MAX_FALLOS_CHECKIN = 5;
export const VENTANA_FALLOS_CHECKIN_MS = 300_000;

export type EvaluacionBloqueoCheckin = { bloqueado: false } | { bloqueado: true; reintentarEnSegundos: number };

export function evaluarBloqueoCheckin(fallos: readonly Date[], ahora: Date): EvaluacionBloqueoCheckin {
  const vigentes = fallos
    .map((f) => f.getTime())
    .filter((t) => ahora.getTime() - t < VENTANA_FALLOS_CHECKIN_MS)
    .sort((a, b) => a - b);

  if (vigentes.length < MAX_FALLOS_CHECKIN) return { bloqueado: false };

  // Se desbloquea cuando los fallos vigentes bajan de 5: el que debe vencer es el (n-5)-ésimo más antiguo.
  const quedaPorVencer = vigentes[vigentes.length - MAX_FALLOS_CHECKIN] + VENTANA_FALLOS_CHECKIN_MS - ahora.getTime();
  return { bloqueado: true, reintentarEnSegundos: Math.max(1, Math.ceil(quedaPorVencer / 1000)) };
}
