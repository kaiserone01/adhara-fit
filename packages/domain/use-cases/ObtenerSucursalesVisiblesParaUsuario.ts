import { ISucursalRepository } from "../ports/ISucursalRepository";
import { SucursalResumen } from "../entities/SucursalResumen";
import { UsuarioAdmin } from "../entities/UsuarioAdmin";

// Todo administrador ve y opera todas las sedes de la organización (S-23: no hay asignación por usuario).
export async function obtenerSucursalesVisiblesParaUsuario(
  deps: { sucursales: ISucursalRepository },
  usuario: UsuarioAdmin
): Promise<SucursalResumen[]> {
  return deps.sucursales.listarPorOrganizacion(usuario.organizacionId);
}
