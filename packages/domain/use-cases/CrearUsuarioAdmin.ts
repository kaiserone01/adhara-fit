import { IUsuarioAdminRepository } from "../ports/IUsuarioAdminRepository";
import { UsuarioAdmin } from "../entities/UsuarioAdmin";

export interface CrearUsuarioAdminInput {
  organizacionId: string;
  sucursalId: string | null;
  nombre: string;
  email: string;
  passwordHash: string;
  telefono?: string | null;
  fotoUrl?: string | null;
}

export class CorreoDuplicadoError extends Error {
  constructor() {
    super("Ya existe un administrador con ese correo.");
  }
}

export async function crearUsuarioAdmin(
  deps: { usuarios: IUsuarioAdminRepository },
  input: CrearUsuarioAdminInput
): Promise<UsuarioAdmin> {
  if (await deps.usuarios.buscarCredencialesPorEmail(input.email)) {
    throw new CorreoDuplicadoError();
  }

  return deps.usuarios.crear({
    organizacionId: input.organizacionId,
    sucursalId: input.sucursalId,
    nombre: input.nombre,
    email: input.email,
    passwordHash: input.passwordHash,
    telefono: input.telefono ?? null,
    fotoUrl: input.fotoUrl ?? null,
  });
}
