import type { PrismaClientOrTx } from "./PrismaClientOrTx";
import type { IAuditoriaRepository, DatosRegistroAuditoria } from "@gym-app/domain/ports/IAuditoriaRepository";

export class PrismaAuditoriaRepository implements IAuditoriaRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async registrar(datos: DatosRegistroAuditoria): Promise<void> {
    await this.prisma.registroAuditoria.create({ data: datos });
  }
}
