import { IUsuarioAdminRepository } from "../ports/IUsuarioAdminRepository";
import { UsuarioAdmin } from "../entities/UsuarioAdmin";

export class UsuarioNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el administrador.");
  }
}

export async function obtenerUsuarioAdmin(
  deps: { usuarios: IUsuarioAdminRepository },
  input: { organizacionId: string; id: string }
): Promise<UsuarioAdmin> {
  const usuario = await deps.usuarios.buscarPorId(input.organizacionId, input.id);
  if (!usuario) {
    throw new UsuarioNoEncontradoError();
  }
  return usuario;
}
