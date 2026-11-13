// Límite de intentos fallidos (S-21 check-in, S-01 login). Un fallo cuenta mientras haya pasado menos que la ventana;
// con `maximo` fallos vigentes se bloquea hasta que el más antiguo de ellos salga de la ventana. Los envíos
// bloqueados no cuentan como fallos.
export type EvaluacionBloqueoCheckin = { bloqueado: false } | { bloqueado: true; reintentarEnSegundos: number };

export function evaluarBloqueoPorFallos(
  fallos: readonly Date[],
  ahora: Date,
  { maximo, ventanaMs }: { maximo: number; ventanaMs: number }
): EvaluacionBloqueoCheckin {
  const vigentes = fallos
    .map((f) => f.getTime())
    .filter((t) => ahora.getTime() - t < ventanaMs)
    .sort((a, b) => a - b);

  if (vigentes.length < maximo) return { bloqueado: false };

  // Se desbloquea cuando los fallos vigentes bajan del máximo: el que debe vencer es el (n-máximo)-ésimo más antiguo.
  const quedaPorVencer = vigentes[vigentes.length - maximo] + ventanaMs - ahora.getTime();
  return { bloqueado: true, reintentarEnSegundos: Math.max(1, Math.ceil(quedaPorVencer / 1000)) };
}

// S-21: el código de socio son 4 dígitos y se podría enumerar: 5 fallos en 5 minutos.
export const MAX_FALLOS_CHECKIN = 5;
export const VENTANA_FALLOS_CHECKIN_MS = 300_000;

export function evaluarBloqueoCheckin(fallos: readonly Date[], ahora: Date): EvaluacionBloqueoCheckin {
  return evaluarBloqueoPorFallos(fallos, ahora, { maximo: MAX_FALLOS_CHECKIN, ventanaMs: VENTANA_FALLOS_CHECKIN_MS });
}
