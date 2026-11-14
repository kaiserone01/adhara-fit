import type { VitrinaItem } from "../entities/Vitrina";

// Cartelera: cada pieza (imagen o video) es una diapositiva, una por una y en el orden de la lista.
export type Diapositiva = { clave: string; tipo: "CARTEL"; item: VitrinaItem; duracionSeg: number };

export function estaVencido(item: VitrinaItem, ahora: Date): boolean {
  return item.fin !== null && item.fin.getTime() < ahora.getTime();
}

export function estaVisible(item: VitrinaItem, ahora: Date): boolean {
  if (!item.activo || estaVencido(item, ahora)) return false;
  return item.inicio === null || item.inicio.getTime() <= ahora.getTime();
}

export type EstadoVisibilidad = "INACTIVO" | "VENCIDO" | "PROGRAMADO" | "EN_PANTALLA";

export function estadoVisibilidad(item: VitrinaItem, ahora: Date): EstadoVisibilidad {
  if (!item.activo) return "INACTIVO";
  if (estaVencido(item, ahora)) return "VENCIDO";
  if (item.inicio !== null && item.inicio.getTime() > ahora.getTime()) return "PROGRAMADO";
  return "EN_PANTALLA";
}

// La secuencia que muestra la TV en `ahora`: las piezas visibles, ordenadas, una por diapositiva.
export function construirSecuencia(items: VitrinaItem[], ahora: Date, duracionPorDefectoSeg: number): Diapositiva[] {
  return items
    .filter((item) => estaVisible(item, ahora))
    .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id))
    .map((item) => ({ clave: item.id, tipo: "CARTEL" as const, item, duracionSeg: item.duracionSeg ?? duracionPorDefectoSeg }));
}

// id de la pieza → número (1, 2, 3…) de la diapositiva en que sale; el panel lo muestra en la lista de la cartelera.
export function numeroDeDiapositiva(secuencia: Diapositiva[]): Map<string, number> {
  return new Map(secuencia.map((diapositiva, indice) => [diapositiva.item.id, indice + 1]));
}
