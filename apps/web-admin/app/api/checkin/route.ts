// app/api/checkin/route.ts
// Endpoint de check-in: el checkin se autentica con su apiKey de Sucursal (ver lib/checkin.ts). Este
// handler solo valida entrada/salida HTTP; toda la lógica de negocio vive en el caso de uso
// RegistrarCheckIn (packages/domain).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonCheckin, opcionesCheckin, sucursalDeCheckin } from "@/lib/checkin";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaCheckInRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaCheckInRepository";
import { PrismaSuscripcionRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSuscripcionRepository";
import { PrismaPlanRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPlanRepository";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { activarMiembroEnTransaccion } from "@/lib/activacion";
import { registrarCheckIn, MiembroNoEncontradoError } from "@gym-app/domain/use-cases/RegistrarCheckIn";

export async function OPTIONS() {
  return opcionesCheckin();
}

export async function POST(req: NextRequest) {
  try {
    const sucursal = await sucursalDeCheckin(req);
    if (sucursal instanceof NextResponse) return sucursal;

    const { cedula } = await req.json();

    if (!cedula) {
      return jsonCheckin({ error: "Cédula es requerida." }, 400);
    }

    const resultado = await registrarCheckIn(
      {
        miembros: new PrismaMemberRepository(prisma),
        checkIns: new PrismaCheckInRepository(prisma),
        suscripciones: new PrismaSuscripcionRepository(prisma),
        sucursales: new PrismaSucursalRepository(prisma),
        planes: new PrismaPlanRepository(prisma),
        activarDesdePadron: activarMiembroEnTransaccion,
      },
      { organizacionId: sucursal.organizacionId, sucursalId: sucursal.id, cedula }
    );

    return jsonCheckin(
      {
        nombre: resultado.nombre,
        fotoUrl: resultado.fotoUrl,
        entrenador: resultado.entrenadorNombre,
        fechaVencimiento: resultado.fechaVencimiento,
        estado: resultado.estado,
        sucursalAsignadaNombre: resultado.sucursalAsignadaNombre,
        sucursalAsignadaDireccion: resultado.sucursalAsignadaDireccion,
        diasGraciaRestantes: resultado.diasGraciaRestantes,
        tieneGraciaConfigurada: resultado.tieneGraciaConfigurada,
        esCumpleanos: resultado.esCumpleanos,
      },
      200
    );
  } catch (error) {
    if (error instanceof MiembroNoEncontradoError) {
      return jsonCheckin({ error: error.message }, 404);
    }
    console.error("Error en check-in:", error);
    return jsonCheckin({ error: "Error interno al procesar el check-in." }, 500);
  }
}
