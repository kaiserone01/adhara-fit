import { ISucursalRepository } from "../ports/ISucursalRepository";
import { Sucursal, CambiosSucursal } from "../entities/Sucursal";

export class SucursalNoEncontradaError extends Error {
  constructor() {
    super("No se encontró la sucursal.");
  }
}

export async function actualizarSucursal(
  deps: { sucursales: ISucursalRepository },
  input: { organizacionId: string; usuarioIdSolicitante: string; id: string; cambios: CambiosSucursal }
): Promise<Sucursal> {
  const actualizada = await deps.sucursales.actualizar(input.organizacionId, input.id, input.cambios);
  if (!actualizada) {
    throw new SucursalNoEncontradaError();
  }

  return actualizada;
}
