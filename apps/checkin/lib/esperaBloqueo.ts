// S-21: segundos que el kiosco debe esperar tras un 429. Si falta la cabecera Retry-After o no es un número,
// se bloquean los envíos 300 s (la ventana completa del servidor).
export const ESPERA_POR_DEFECTO_SEGUNDOS = 300;

export function segundosDeEspera(retryAfter: string | null): number {
  if (retryAfter === null || !/^\d+$/.test(retryAfter.trim())) return ESPERA_POR_DEFECTO_SEGUNDOS;
  const segundos = Number(retryAfter.trim());
  return segundos >= 1 ? segundos : ESPERA_POR_DEFECTO_SEGUNDOS;
}
