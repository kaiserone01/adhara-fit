import { prisma } from "@/lib/prisma";
import { PrismaEntrenadorRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaEntrenadorRepository";
import { listarEntrenadores } from "@gym-app/domain/use-cases/ListarEntrenadores";

// S-18: un solo gimnasio — el selector de entrenador lista a todos los activos.
export function obtenerEntrenadoresActivos() {
  return listarEntrenadores({ entrenadores: new PrismaEntrenadorRepository(prisma) });
}
