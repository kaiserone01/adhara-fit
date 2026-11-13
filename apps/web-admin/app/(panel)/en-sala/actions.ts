"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaCheckInRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaCheckInRepository";
import { marcarSalidaCheckIn } from "@gym-app/domain/use-cases/MarcarSalidaCheckIn";

export async function marcarSalidaAction(miembroId: string): Promise<void> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");

  await marcarSalidaCheckIn(
    { checkIns: new PrismaCheckInRepository(prisma) },
    { sucursalId: sesion.sucursalActivaId, miembroId }
  );
}
