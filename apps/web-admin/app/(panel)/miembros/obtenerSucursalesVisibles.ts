import { prisma } from "@/lib/prisma";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { obtenerSucursalesVisiblesParaUsuario } from "@gym-app/domain/use-cases/ObtenerSucursalesVisiblesParaUsuario";
import type { SucursalResumen } from "@gym-app/domain/entities/SucursalResumen";
import type { UsuarioAdmin } from "@gym-app/domain/entities/UsuarioAdmin";

// Wrapper fino sobre ObtenerSucursalesVisiblesParaUsuario (todas las sedes de la organización).
export async function obtenerSucursalesVisiblesParaMiembro(usuario: UsuarioAdmin): Promise<SucursalResumen[]> {
  return obtenerSucursalesVisiblesParaUsuario(
    { sucursales: new PrismaSucursalRepository(prisma) },
    usuario
  );
}
