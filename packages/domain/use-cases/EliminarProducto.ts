import { IProductoRepository } from "../ports/IProductoRepository";
import { ProductoNoEncontradoError } from "./ActualizarProducto";

// Con ventas registradas se desactiva (baja lógica) para conservar el
// historial; sin ventas se borra físicamente. Devuelve qué pasó.
export async function eliminarProducto(
  deps: { productos: IProductoRepository },
  input: { organizacionId: string; id: string; usuarioIdSolicitante: string }
): Promise<"ELIMINADO" | "DESACTIVADO"> {

  const existente = await deps.productos.buscarPorId(input.organizacionId, input.id);
  if (!existente) {
    throw new ProductoNoEncontradoError();
  }

  if ((await deps.productos.contarVentas(input.id)) > 0) {
    await deps.productos.actualizar(input.organizacionId, input.id, { activo: false });
    return "DESACTIVADO";
  }

  await deps.productos.eliminar(input.id);
  return "ELIMINADO";
}
