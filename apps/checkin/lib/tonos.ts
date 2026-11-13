import type { Tono } from "./cara";

// El brillo usa rgba fijo (los mismos colores de temaAdhara) porque el WebView del TV
// puede no soportar color-mix(). «verde» es el tono de éxito (--gx-good), no el amarillo de marca.
export const COLOR_TONO: Record<Tono, { color: string; tinta: string; brillo: string }> = {
  verde: { color: "var(--gx-good)", tinta: "var(--gx-good-ink)", brillo: "rgba(74, 222, 128, 0.4)" },
  ambar: { color: "var(--gx-warn)", tinta: "var(--gx-warn-ink)", brillo: "rgba(255, 138, 61, 0.4)" },
  rojo: { color: "var(--gx-bad)", tinta: "var(--gx-bad-ink)", brillo: "rgba(255, 77, 94, 0.4)" },
};

// Fondo de la ficha: con menos de 100 % de opacidad deja ver el video. rgba fijo (el `surface` de
// temaAdhara, #2c2728) por la misma razón que arriba: sin color-mix().
export function fondoFicha(opacidad?: number): string {
  if (opacidad === undefined || opacidad >= 100) return "var(--gx-surface)";
  return `rgba(44, 39, 40, ${opacidad / 100})`;
}
