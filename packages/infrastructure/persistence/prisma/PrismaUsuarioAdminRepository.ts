import type { PrismaClient } from "@gym-app/db/generated/prisma/client";
import type { IUsuarioAdminRepository } from "@gym-app/domain/ports/IUsuarioAdminRepository";
import type { UsuarioAdmin, CambiosUsuarioAdmin } from "@gym-app/domain/entities/UsuarioAdmin";

function mapear(usuario: {
  id: string;
  organizacionId: string;
  sucursalId: string | null;
  nombre: string;
  telefono: string | null;
  fotoUrl: string | null;
  email: string;
  activo: boolean;
}): UsuarioAdmin {
  return {
    id: usuario.id,
    organizacionId: usuario.organizacionId,
    sucursalId: usuario.sucursalId,
    nombre: usuario.nombre,
    telefono: usuario.telefono,
    fotoUrl: usuario.fotoUrl,
    email: usuario.email,
    activo: usuario.activo,
  };
}

export class PrismaUsuarioAdminRepository implements IUsuarioAdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(datos: {
    organizacionId: string;
    sucursalId: string | null;
    nombre: string;
    email: string;
    passwordHash: string;
    telefono?: string | null;
    fotoUrl?: string | null;
  }): Promise<UsuarioAdmin> {
    const usuario = await this.prisma.usuarioAdmin.create({ data: datos });
    return mapear(usuario);
  }

  async buscarPorId(organizacionId: string, id: string): Promise<UsuarioAdmin | null> {
    const usuario = await this.prisma.usuarioAdmin.findFirst({ where: { id, organizacionId } });
    return usuario ? mapear(usuario) : null;
  }

  async buscarPorIdSinOrganizacion(id: string): Promise<UsuarioAdmin | null> {
    const usuario = await this.prisma.usuarioAdmin.findUnique({ where: { id } });
    return usuario ? mapear(usuario) : null;
  }

  async buscarCredencialesPorEmail(
    email: string
  ): Promise<{ usuario: UsuarioAdmin; passwordHash: string } | null> {
    // Los entrenadores heredados (rol ENTRENADOR) son filas sin acceso: nunca inician sesión.
    const usuario = await this.prisma.usuarioAdmin.findFirst({ where: { email, rol: { not: "ENTRENADOR" } } });
    if (!usuario) return null;
    return { usuario: mapear(usuario), passwordHash: usuario.passwordHash };
  }

  async listarPorOrganizacion(organizacionId: string): Promise<UsuarioAdmin[]> {
    const usuarios = await this.prisma.usuarioAdmin.findMany({
      where: { organizacionId, rol: { not: "ENTRENADOR" } },
      orderBy: { nombre: "asc" },
    });
    return usuarios.map(mapear);
  }

  async actualizar(organizacionId: string, id: string, cambios: CambiosUsuarioAdmin): Promise<UsuarioAdmin | null> {
    const existente = await this.prisma.usuarioAdmin.findFirst({ where: { id, organizacionId } });
    if (!existente) return null;

    const usuario = await this.prisma.usuarioAdmin.update({ where: { id }, data: cambios });
    return mapear(usuario);
  }

  async desactivarConservandoUnoActivo(
    organizacionId: string,
    id: string
  ): Promise<UsuarioAdmin | "ULTIMO_ADMINISTRADOR" | null> {
    return this.prisma.$transaction(async (tx) => {
      // Bloquea las filas de los administradores activos: otra desactivación simultánea espera y relee.
      const activos = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "UsuarioAdmin" WHERE "organizacionId" = ${organizacionId} AND "activo" = true AND "rol" <> 'ENTRENADOR' FOR UPDATE
      `;
      const existente = await tx.usuarioAdmin.findFirst({ where: { id, organizacionId } });
      if (!existente) return null;
      if (!existente.activo) return mapear(existente);
      if (!activos.some((fila) => fila.id !== id)) return "ULTIMO_ADMINISTRADOR";
      return mapear(await tx.usuarioAdmin.update({ where: { id }, data: { activo: false } }));
    });
  }

  async buscarPasswordHashPorId(id: string): Promise<string | null> {
    const usuario = await this.prisma.usuarioAdmin.findUnique({
      where: { id },
      select: { passwordHash: true },
    });
    return usuario?.passwordHash ?? null;
  }

  async actualizarPassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.usuarioAdmin.update({ where: { id }, data: { passwordHash } });
  }
}
