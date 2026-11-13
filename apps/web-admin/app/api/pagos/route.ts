// POST /api/pagos            — registra el cobro de una membresía (un solo pago completo; S-04). Cuerpo: miembroId, planId,
//                              monto, metodo, cobroId (UUID; reenviarlo no duplica el cobro) y, opcionales, metodoPagoId,
//                              numeroOperacion, meses (1 a 6) y fechaPago (yyyy-mm-dd, nunca futura).
// GET  /api/pagos            — lista todos los pagos de la organización (más reciente primero).
// GET  /api/pagos?miembroId= — lista el historial de pagos de ese miembro.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesion } from "@/lib/sesion";
import { PrismaPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPagoRepository";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaUnidadDeTrabajo } from "@gym-app/infrastructure/persistence/prisma/PrismaUnidadDeTrabajo";
import {
  registrarPago,
  MiembroNoEncontradoError as RegistrarPagoMiembroNoEncontradoError,
  PlanNoEncontradoError as RegistrarPagoPlanNoEncontradoError,
  PlanInactivoError,
  MontoInvalidoError,
  MontoDistintoDelPrecioError,
  FechaPagoFuturaError,
  PlanDistintoConVencimientoVigenteError,
  MesesInvalidosError,
} from "@gym-app/domain/use-cases/RegistrarPago";
import {
  listarPagos,
  MiembroNoEncontradoError as ListarPagosMiembroNoEncontradoError,
} from "@gym-app/domain/use-cases/ListarPagos";

export async function GET(req: NextRequest) {
  const sesion = await obtenerUsuarioDeSesion(req);

  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const { usuario } = sesion;

  const miembroId = req.nextUrl.searchParams.get("miembroId") ?? undefined;

  try {
    const pagos = await listarPagos(
      { pagos: new PrismaPagoRepository(prisma), miembros: new PrismaMemberRepository(prisma) },
      { organizacionId: usuario.organizacionId, miembroId }
    );

    return NextResponse.json({ pagos });
  } catch (error) {
    if (error instanceof ListarPagosMiembroNoEncontradoError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error al listar pagos:", error);
    return NextResponse.json({ error: "Error interno al listar los pagos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sesion = await obtenerUsuarioDeSesion(req);

    if (!sesion) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const { usuario, sucursalActivaId } = sesion;

    const body = await req.json();

    if (!body.miembroId || !body.planId || body.monto === undefined || !body.metodo || !body.cobroId) {
      return NextResponse.json(
        { error: "miembroId, planId, monto, metodo y cobroId son requeridos." },
        { status: 400 }
      );
    }

    // sucursalActivaId siempre existe para una sesión válida (garantizado
    // por Sesion.sucursalActivaId, ver plan de selección de sucursal al
    // iniciar sesión) — este chequeo queda como guardia defensiva de tipos,
    // no debería ser alcanzable en la práctica.
    if (!sucursalActivaId) {
      return NextResponse.json(
        { error: "El usuario no tiene una sucursal asignada para registrar pagos." },
        { status: 400 }
      );
    }

    const pago = await registrarPago(
      { unidad: new PrismaUnidadDeTrabajo(prisma) },
      {
        organizacionId: usuario.organizacionId,
        miembroId: body.miembroId,
        planId: body.planId,
        linea: {
          monto: body.monto,
          metodo: body.metodo,
          metodoPagoId: body.metodoPagoId ?? null,
          numeroOperacion: body.numeroOperacion ?? null,
        },
        sucursalId: sucursalActivaId,
        registradoPorId: usuario.id,
        cobroId: String(body.cobroId),
        ...(body.fechaPago ? { fechaPago: new Date(`${body.fechaPago}T12:00:00-05:00`) } : {}),
        ...(body.meses !== undefined ? { meses: Number(body.meses) } : {}),
      }
    );

    return NextResponse.json(pago, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrarPagoMiembroNoEncontradoError || error instanceof RegistrarPagoPlanNoEncontradoError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PlanDistintoConVencimientoVigenteError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof PlanInactivoError ||
      error instanceof MontoInvalidoError ||
      error instanceof MontoDistintoDelPrecioError ||
      error instanceof FechaPagoFuturaError ||
      error instanceof MesesInvalidosError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error al registrar pago:", error);
    return NextResponse.json({ error: "Error interno al registrar el pago." }, { status: 500 });
  }
}
