import { IProductoRepository } from "../ports/IProductoRepository";
import { Producto } from "../entities/Producto";

export class ProductoNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el producto.");
  }
}

export class ProductoInactivoError extends Error {
  constructor() {
    super("No se puede vender un producto inactivo.");
  }
}

export class CantidadInvalidaError extends Error {
  constructor() {
    super("La cantidad tiene que ser un número entero mayor a 0.");
  }
}

export class SinProductosError extends Error {
  constructor() {
    super("Elige al menos un producto.");
  }
}

export interface ItemCarrito {
  productoId: string;
  cantidad: number;
}

export interface ItemResuelto {
  producto: Producto;
  cantidad: number;
}

// Valida el carrito de una venta (o de un fiado) y lo resuelve contra el
// catálogo de la organización. Un mismo producto repetido se suma en una sola
// línea. No escribe nada: si algún producto es inválido, falla antes de crear
// pagos o deudas.
export async function resolverItemsVenta(
  productos: IProductoRepository,
  organizacionId: string,
  items: ItemCarrito[]
): Promise<ItemResuelto[]> {
  if (items.length === 0) {
    throw new SinProductosError();
  }

  const cantidades = new Map<string, number>();
  for (const item of items) {
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1) {
      throw new CantidadInvalidaError();
    }
    cantidades.set(item.productoId, (cantidades.get(item.productoId) ?? 0) + item.cantidad);
  }

  const resueltos: ItemResuelto[] = [];
  for (const [productoId, cantidad] of cantidades) {
    const producto = await productos.buscarPorId(organizacionId, productoId);
    if (!producto) {
      throw new ProductoNoEncontradoError();
    }
    if (!producto.activo) {
      throw new ProductoInactivoError();
    }
    resueltos.push({ producto, cantidad });
  }

  return resueltos;
}

interface RenglonVenta {
  productoNombre: string;
  cantidad: number;
  precioUnitarioUSD: number;
}

// Total de una venta, en centavos para no acumular error de punto flotante.
export function totalRenglones(renglones: Pick<RenglonVenta, "precioUnitarioUSD" | "cantidad">[]): number {
  return renglones.reduce((suma, d) => suma + Math.round(d.precioUnitarioUSD * d.cantidad * 100), 0) / 100;
}

// Texto que queda como concepto del Pago: "Agua × 2, Gatorade".
export function conceptoRenglones(renglones: Pick<RenglonVenta, "productoNombre" | "cantidad">[]): string {
  return renglones.map((d) => (d.cantidad > 1 ? `${d.productoNombre} × ${d.cantidad}` : d.productoNombre)).join(", ");
}
