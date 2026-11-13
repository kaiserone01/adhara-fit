import { IUsuarioAdminRepository } from "../ports/IUsuarioAdminRepository";
import { UsuarioAdmin, CambiosUsuarioAdmin } from "../entities/UsuarioAdmin";

export class UsuarioNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el administrador.");
  }
}

export class AutoDesactivacionError extends Error {
  constructor() {
    super("No puedes desactivar tu propia cuenta.");
  }
}

export class UltimoAdministradorError extends Error {
  constructor() {
    super("Debe quedar al menos un administrador activo.");
  }
}

export async function actualizarUsuarioAdmin(
  deps: { usuarios: IUsuarioAdminRepository },
  input: {
    organizacionId: string;
    usuarioIdSolicitante: string;
    id: string;
    cambios: CambiosUsuarioAdmin;
  }
): Promise<UsuarioAdmin> {
  // Evita el lockout irreversible: nadie puede desactivar su propia cuenta.
  if (input.cambios.activo === false && input.id === input.usuarioIdSolicitante) {
    throw new AutoDesactivacionError();
  }

  if (input.cambios.activo === false) {
    const { activo: _activo, ...resto } = input.cambios;
    const resultado = await deps.usuarios.desactivarConservandoUnoActivo(input.organizacionId, input.id);
    if (resultado === "ULTIMO_ADMINISTRADOR") throw new UltimoAdministradorError();
    if (!resultado) throw new UsuarioNoEncontradoError();
    if (Object.keys(resto).length === 0) return resultado;
    const actualizado = await deps.usuarios.actualizar(input.organizacionId, input.id, resto);
    if (!actualizado) throw new UsuarioNoEncontradoError();
    return actualizado;
  }

  const actualizado = await deps.usuarios.actualizar(input.organizacionId, input.id, input.cambios);
  if (!actualizado) {
    throw new UsuarioNoEncontradoError();
  }

  return actualizado;
}
