import type { PrismaClient } from "@gym-app/db/generated/prisma/client";
import type { IMetodoPagoRepository } from "@gym-app/domain/ports/IMetodoPagoRepository";
import type { MetodoPago, DatosNuevoMetodoPago, CambiosMetodoPago } from "@gym-app/domain/entities/MetodoPago";

type FilaMetodoPago = {
  id: string;
  organizacionId: string;
  tipo: string;
  nombreBanco: string | null;
  logoUrl: string | null;
  activo: boolean;
  orden: number;
  telefono: string | null;
  numeroCuenta: string | null;
  beneficiario: string | null;
  qrUrl: string | null;
  createdAt: Date;
};

function mapear(fila: FilaMetodoPago): MetodoPago {
  return {
    id: fila.id,
    organizacionId: fila.organizacionId,
    tipo: fila.tipo as MetodoPago["tipo"],
    nombreBanco: fila.nombreBanco,
    logoUrl: fila.logoUrl,
    activo: fila.activo,
    orden: fila.orden,
    telefono: fila.telefono,
    numeroCuenta: fila.numeroCuenta,
    beneficiario: fila.beneficiario,
    qrUrl: fila.qrUrl,
    createdAt: fila.createdAt,
  };
}

export class PrismaMetodoPagoRepository implements IMetodoPagoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listarPorOrganizacion(organizacionId: string): Promise<MetodoPago[]> {
    const filas = await this.prisma.metodoPago.findMany({
      where: { organizacionId },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    });

    return filas.map(mapear);
  }

  async listarActivosPorOrganizacion(organizacionId: string): Promise<MetodoPago[]> {
    const filas = await this.prisma.metodoPago.findMany({
      where: { organizacionId, activo: true },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    });

    return filas.map(mapear);
  }

  async buscarPorId(organizacionId: string, id: string): Promise<MetodoPago | null> {
    const fila = await this.prisma.metodoPago.findUnique({ where: { id } });

    if (!fila || fila.organizacionId !== organizacionId) return null;

    return mapear(fila);
  }

  async crear(datos: DatosNuevoMetodoPago): Promise<MetodoPago> {
    const fila = await this.prisma.metodoPago.create({
      data: {
        organizacionId: datos.organizacionId,
        tipo: datos.tipo,
        nombreBanco: datos.nombreBanco,
        logoUrl: datos.logoUrl,
        orden: datos.orden ?? 0,
        telefono: datos.telefono ?? null,
        numeroCuenta: datos.numeroCuenta ?? null,
        beneficiario: datos.beneficiario ?? null,
        qrUrl: datos.qrUrl ?? null,
      },
    });

    return mapear(fila);
  }

  async actualizar(organizacionId: string, id: string, cambios: CambiosMetodoPago): Promise<MetodoPago | null> {
    const actual = await this.prisma.metodoPago.findUnique({ where: { id } });

    if (!actual || actual.organizacionId !== organizacionId) {
      return null;
    }

    const fila = await this.prisma.metodoPago.update({ where: { id }, data: cambios });

    return mapear(fila);
  }
}
