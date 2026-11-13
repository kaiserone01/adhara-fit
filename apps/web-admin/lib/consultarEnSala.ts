import { prisma } from "@/lib/prisma";
import { PrismaCheckInRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaCheckInRepository";
import { listarEnSala } from "@gym-app/domain/use-cases/ListarEnSala";

export function consultarEnSala(organizacionId: string, sucursalId: string) {
  return listarEnSala(
    { checkIns: new PrismaCheckInRepository(prisma) },
    { organizacionId, sucursalId }
  );
}
