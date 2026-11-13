import { UsuarioAdmin, CambiosUsuarioAdmin } from "../entities/UsuarioAdmin";

export interface IUsuarioAdminRepository {
  crear(datos: {
    organizacionId: string;
    sucursalId: string | null;
    nombre: string;
    email: string;
    passwordHash: string;
    telefono?: string | null;
    fotoUrl?: string | null;
  }): Promise<UsuarioAdmin>;
  buscarPorId(organizacionId: string, id: string): Promise<UsuarioAdmin | null>;
  buscarPorIdSinOrganizacion(id: string): Promise<UsuarioAdmin | null>;
  buscarCredencialesPorEmail(
    email: string
  ): Promise<{ usuario: UsuarioAdmin; passwordHash: string } | null>;
  listarPorOrganizacion(organizacionId: string): Promise<UsuarioAdmin[]>;
  actualizar(organizacionId: string, id: string, cambios: CambiosUsuarioAdmin): Promise<UsuarioAdmin | null>;
  /**
   * Desactiva al administrador solo si queda al menos otro activo; la lectura y la
   * escritura van en una transacción que bloquea las filas activas, así dos
   * desactivaciones simultáneas no pueden dejar el sistema sin administradores.
   * Si ya estaba inactivo no escribe. null = no existe en la organización.
   */
  desactivarConservandoUnoActivo(organizacionId: string, id: string): Promise<UsuarioAdmin | "ULTIMO_ADMINISTRADOR" | null>;
  buscarPasswordHashPorId(id: string): Promise<string | null>;
  actualizarPassword(id: string, passwordHash: string): Promise<void>;
}
