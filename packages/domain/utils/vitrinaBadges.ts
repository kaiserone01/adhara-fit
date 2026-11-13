import type { VitrinaItem } from "../entities/Vitrina";

// El precio que la TV considera "vigente": la oferta si está activa; si no, el precio solo si se muestra
// (con el precio oculto no se calcula un equivalente que lo delataría).
export function precioVigenteUSD(item: VitrinaItem): number | null {
  if (item.mostrarOferta && item.ofertaUSD !== null) return item.ofertaUSD;
  return item.mostrarPrecio ? item.precioUSD : null;
}

export function descuentoMostrado(item: VitrinaItem): number | null {
  if (!item.mostrarDescuento) return null;
  if (item.descuentoPct !== null) return item.descuentoPct;
  if (item.precioUSD !== null && item.ofertaUSD !== null && item.precioUSD > 0 && item.ofertaUSD < item.precioUSD) {
    return Math.round((1 - item.ofertaUSD / item.precioUSD) * 100);
  }
  return null;
}
