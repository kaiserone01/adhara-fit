import { ISucursalRepository } from "../ports/ISucursalRepository";
import { Sucursal } from "../entities/Sucursal";

export interface DatosCrearSucursal {
  organizacionId: string;
  usuarioIdSolicitante: string;
  nombre: string;
  direccion: string | null;
  diasGracia: number;
}

export async function crearSucursal(
  deps: { sucursales: ISucursalRepository },
  input: DatosCrearSucursal
): Promise<Sucursal> {

  return deps.sucursales.crear({
    organizacionId: input.organizacionId,
    nombre: input.nombre,
    direccion: input.direccion,
    diasGracia: input.diasGracia,
  });
}
