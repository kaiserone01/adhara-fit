import { IProductoRepository } from "../ports/IProductoRepository";
import { Producto, CambiosProducto } from "../entities/Producto";
import { ProductoInvalidoError } from "./CrearProducto";

export class ProductoNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el producto.");
  }
}

export async function actualizarProducto(
  deps: { productos: IProductoRepository },
  input: { organizacionId: string; id: string; cambios: CambiosProducto; usuarioIdSolicitante: string }
): Promise<Producto> {

  const { nombre, costoUSD } = input.cambios;
  if ((nombre !== undefined && !nombre.trim()) || (costoUSD !== undefined && !(costoUSD > 0))) {
    throw new ProductoInvalidoError();
  }

  const actualizado = await deps.productos.actualizar(input.organizacionId, input.id, {
    ...input.cambios,
    ...(nombre !== undefined ? { nombre: nombre.trim() } : {}),
  });
  if (!actualizado) {
    throw new ProductoNoEncontradoError();
  }
  return actualizado;
}
