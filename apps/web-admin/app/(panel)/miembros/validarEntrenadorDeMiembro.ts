import { prisma } from "@/lib/prisma";
import { PrismaEntrenadorRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaEntrenadorRepository";
import {
  EntrenadorInactivoError,
  EntrenadorNoEncontradoError,
  validarEntrenadorAsignable,
} from "@gym-app/domain/use-cases/GestionarEntrenadores";

/**
 * S-18: el entrenador elegido debe existir y estar activo. Un socio que ya lo tenía puede conservarlo
 * aunque se haya desactivado. Devuelve el mensaje de error, o null si es válido (o no hay entrenador).
 */
export async function validarEntrenadorDeMiembro(entrenadorId: string | null, miembroId?: string): Promise<string | null> {
  if (!entrenadorId) return null;
  const actual = miembroId
    ? (await prisma.miembro.findUnique({ where: { id: miembroId }, select: { entrenadorId: true } }))?.entrenadorId
    : null;
  try {
    await validarEntrenadorAsignable({ entrenadores: new PrismaEntrenadorRepository(prisma) }, entrenadorId, actual);
    return null;
  } catch (error) {
    if (error instanceof EntrenadorNoEncontradoError || error instanceof EntrenadorInactivoError) return error.message;
    throw error;
  }
}
