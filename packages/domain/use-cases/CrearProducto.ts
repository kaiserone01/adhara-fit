import { IProductoRepository } from "../ports/IProductoRepository";
import { Producto, DatosNuevoProducto } from "../entities/Producto";

export class ProductoInvalidoError extends Error {
  constructor() {
    super("El producto necesita un nombre y un costo mayor a $0.");
  }
}

export async function crearProducto(
  deps: { productos: IProductoRepository },
  input: DatosNuevoProducto & { usuarioIdSolicitante: string }
): Promise<Producto> {

  const { usuarioIdSolicitante: _omitido, ...datos } = input;
  if (!datos.nombre.trim() || !(datos.costoUSD > 0)) {
    throw new ProductoInvalidoError();
  }

  return deps.productos.crear({ ...datos, nombre: datos.nombre.trim() });
}
