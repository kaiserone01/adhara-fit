import type { PrismaClient } from "@gym-app/db/generated/prisma/client";
import type { ICheckinAuthValidator } from "@gym-app/domain/ports/ICheckinAuthValidator";
import type { Sucursal } from "@gym-app/domain/entities/Sucursal";
import { claveCheckinValida } from "@gym-app/domain/utils/claveCheckin";

// Un solo gimnasio y un solo Check-in Module: la clave es la variable de entorno CHECKIN_CLAVE (se la pasa quien
// construye el validador) y la sede es la única que existe, no una buscada por clave.
export class CheckinTokenValidator implements ICheckinAuthValidator {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly claveConfigurada: string | undefined
  ) {}

  async validar(apiKey: string): Promise<Sucursal | null> {
    if (!claveCheckinValida(apiKey, this.claveConfigurada)) return null;

    const sucursal = await this.prisma.sucursal.findFirst({ orderBy: { createdAt: "asc" } });
    if (!sucursal) return null;

    return {
      id: sucursal.id,
      organizacionId: sucursal.organizacionId,
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      activo: sucursal.activo,
      apiKey: sucursal.apiKey,
      reposoFrases: sucursal.reposoFrases,
      reposoImagenUrl: sucursal.reposoImagenUrl,
      reposoOpacidad: sucursal.reposoOpacidad,
    };
  }
}
