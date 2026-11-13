import type { PrismaClient } from "@gym-app/db/generated/prisma/client";
import type { IUnidadDeTrabajo, RepositoriosTransaccionales } from "@gym-app/domain/ports/IUnidadDeTrabajo";
import { PrismaMemberRepository } from "./PrismaMemberRepository";
import { PrismaSuscripcionRepository } from "./PrismaSuscripcionRepository";
import { PrismaPagoRepository } from "./PrismaPagoRepository";
import { PrismaPlanRepository } from "./PrismaPlanRepository";
import { PrismaCambioPlanAuditoriaRepository } from "./PrismaCambioPlanAuditoriaRepository";

// Tiempo límite de la transacción y de espera del bloqueo (S-04, SUP-S04-012).
const TIEMPO_LIMITE_MS = 20_000;
const ESPERA_MAXIMA_MS = 5_000;

export class PrismaUnidadDeTrabajo implements IUnidadDeTrabajo {
  constructor(private readonly prisma: PrismaClient) {}

  ejecutar<T>(operacion: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      (tx) =>
        operacion({
          miembros: new PrismaMemberRepository(tx),
          suscripciones: new PrismaSuscripcionRepository(tx),
          pagos: new PrismaPagoRepository(tx),
          planes: new PrismaPlanRepository(tx),
          auditoriaCambioPlan: new PrismaCambioPlanAuditoriaRepository(tx),
        }),
      { timeout: TIEMPO_LIMITE_MS, maxWait: ESPERA_MAXIMA_MS }
    );
  }
}
