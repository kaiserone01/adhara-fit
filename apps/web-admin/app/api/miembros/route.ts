// GET  /api/miembros — lista los miembros de la organización del usuario en sesión.
// POST /api/miembros — crea un miembro nuevo en esa misma organización.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesion } from "@/lib/sesion";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { listarMiembros } from "@gym-app/domain/use-cases/ListarMiembros";
import { esTipoDocumento } from "@gym-app/domain/utils/documento";
import { validarEntrenadorDeMiembro } from "@/app/(panel)/miembros/validarEntrenadorDeMiembro";
import {
  crearMiembro,
  CelularInvalidoError,
  CodigoSocioEnConflictoError,
  CodigosSocioAgotadosError,
  CorreoInvalidoError,
  DocumentoDuplicadoError,
  DocumentoInvalidoError,
} from "@gym-app/domain/use-cases/CrearMiembro";

export async function GET(req: NextRequest) {
  const sesion = await obtenerUsuarioDeSesion(req);

  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const { usuario, sucursalActivaId } = sesion;

  const miembros = await listarMiembros(
    { miembros: new PrismaMemberRepository(prisma) },
    usuario.organizacionId,
    sucursalActivaId
  );

  return NextResponse.json({ miembros });
}

export async function POST(req: NextRequest) {
  try {
    const sesion = await obtenerUsuarioDeSesion(req);

    if (!sesion) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const { usuario } = sesion;

    const body = await req.json();

    if ("cedula" in body) {
      return NextResponse.json({ error: "El campo cedula ya no existe: usa tipoDocumento y numeroDocumento." }, { status: 400 });
    }
    const tipoDocumento = body.tipoDocumento ?? "DNI";
    if (!esTipoDocumento(tipoDocumento)) {
      return NextResponse.json({ error: "tipoDocumento debe ser DNI o CE." }, { status: 400 });
    }
    if (!body.nombre || typeof body.numeroDocumento !== "string" || !body.sucursalId || body.precioPlan === undefined) {
      return NextResponse.json(
        { error: "nombre, numeroDocumento, sucursalId y precioPlan son requeridos." },
        { status: 400 }
      );
    }

    const errorEntrenador = await validarEntrenadorDeMiembro(body.entrenadorId ?? null);
    if (errorEntrenador) return NextResponse.json({ error: errorEntrenador }, { status: 400 });

    const miembro = await crearMiembro(
      { miembros: new PrismaMemberRepository(prisma) },
      {
        organizacionId: usuario.organizacionId,
        sucursalId: body.sucursalId,
        nombre: body.nombre,
        tipoDocumento,
        numeroDocumento: body.numeroDocumento,
        fechaInscripcion: body.fechaInscripcion ? new Date(body.fechaInscripcion) : null,
        fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
        celular: body.celular ?? null,
        correo: body.correo ?? null,
        fotoUrl: body.fotoUrl ?? null,
        entrenadorId: body.entrenadorId ?? null,
        planId: body.planId ?? null,
        precioPlan: body.precioPlan,
      }
    );

    return NextResponse.json(miembro, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentoInvalidoError || error instanceof CelularInvalidoError || error instanceof CorreoInvalidoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      error instanceof DocumentoDuplicadoError ||
      error instanceof CodigosSocioAgotadosError ||
      error instanceof CodigoSocioEnConflictoError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // Solo el tipo de error: el mensaje podría arrastrar el documento del socio.
    console.error("Error al crear miembro:", error instanceof Error ? error.name : "desconocido");
    return NextResponse.json(
      { error: "Error interno al crear el miembro." },
      { status: 500 }
    );
  }
}
