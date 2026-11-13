// app/api/checkin/route.ts
// Endpoint de check-in: el checkin se autentica con su apiKey de Sucursal (ver lib/checkin.ts). Este
// handler solo valida entrada/salida HTTP; toda la lógica de negocio vive en el caso de uso
// RegistrarCheckIn (packages/domain).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonCheckin, opcionesCheckin, sucursalDeCheckin } from "@/lib/checkin";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaCheckInRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaCheckInRepository";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { registrarCheckIn, MiembroNoEncontradoError } from "@gym-app/domain/use-cases/RegistrarCheckIn";

export async function OPTIONS() {
  return opcionesCheckin();
}

export async function POST(req: NextRequest) {
  try {
    const sucursal = await sucursalDeCheckin(req);
    if (sucursal instanceof NextResponse) return sucursal;

    // El cuerpo es solo { identificador }: texto no vacío de hasta 20 caracteres (código de socio o documento).
    const cuerpo: unknown = await req.json().catch(() => null);
    const claves = cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo) ? Object.keys(cuerpo) : [];
    const identificador = claves.length === 1 && claves[0] === "identificador" ? (cuerpo as { identificador: unknown }).identificador : null;

    if (typeof identificador !== "string" || identificador.trim().length === 0 || identificador.length > 20) {
      return jsonCheckin({ error: "Identificador es requerido (documento o código de socio, hasta 20 caracteres)." }, 400);
    }

    const resultado = await registrarCheckIn(
      {
        miembros: new PrismaMemberRepository(prisma),
        checkIns: new PrismaCheckInRepository(prisma),
        sucursales: new PrismaSucursalRepository(prisma),
      },
      { organizacionId: sucursal.organizacionId, sucursalId: sucursal.id, identificador }
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
        esCumpleanos: resultado.esCumpleanos,
      },
      200
    );
  } catch (error) {
    if (error instanceof MiembroNoEncontradoError) {
      return jsonCheckin({ error: error.message }, 404);
    }
    // Solo el tipo de error: el mensaje podría arrastrar datos del socio (el documento no se registra).
    console.error("Error en check-in:", error instanceof Error ? error.name : "desconocido");
    return jsonCheckin({ error: "Error interno al procesar el check-in." }, 500);
  }
}
