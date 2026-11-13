import type { PrismaClient } from "@gym-app/db/generated/prisma/client";
import type { DatosEntrenador, IEntrenadorRepository } from "@gym-app/domain/ports/IEntrenadorRepository";
import type { Entrenador } from "@gym-app/domain/entities/Entrenador";
import type { EntrenadorResumen } from "@gym-app/domain/entities/EntrenadorResumen";

const SELECCION = { id: true, nombre: true, telefono: true, fotoUrl: true, activo: true } as const;

export class PrismaEntrenadorRepository implements IEntrenadorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listarTodos(): Promise<Entrenador[]> {
    return this.prisma.entrenador.findMany({ select: SELECCION, orderBy: [{ activo: "desc" }, { nombre: "asc" }] });
  }

  listarActivos(): Promise<EntrenadorResumen[]> {
    return this.prisma.entrenador.findMany({ where: { activo: true }, select: { id: true, nombre: true, fotoUrl: true }, orderBy: { nombre: "asc" } });
  }

  buscarPorId(id: string): Promise<Entrenador | null> {
    return this.prisma.entrenador.findUnique({ where: { id }, select: SELECCION });
  }

  crear(datos: DatosEntrenador): Promise<Entrenador> {
    return this.prisma.entrenador.create({ data: datos, select: SELECCION });
  }

  actualizar(id: string, datos: Partial<DatosEntrenador> & { activo?: boolean }): Promise<Entrenador> {
    return this.prisma.entrenador.update({ where: { id }, data: datos, select: SELECCION });
  }
}
