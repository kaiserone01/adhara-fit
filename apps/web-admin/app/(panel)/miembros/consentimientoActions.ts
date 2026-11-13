"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import {
  PrismaConsentimientoRepository,
  PrismaTextoLegalRepository,
} from "@gym-app/infrastructure/persistence/prisma/PrismaConsentimientoRepository";
import {
  registrarConsentimiento,
  revocarConsentimiento,
  SinTextoDeConsentimientoError,
  MedioInvalidoError,
  MotivoRevocacionRequeridoError,
  ConsentimientoNoVigenteError,
  MiembroDelConsentimientoNoEncontradoError,
} from "@gym-app/domain/use-cases/Consentimiento";

export interface ResultadoConsentimiento {
  error?: string;
}

function mensajeDeConsentimiento(error: unknown): string | null {
  if (
    error instanceof SinTextoDeConsentimientoError ||
    error instanceof MedioInvalidoError ||
    error instanceof MotivoRevocacionRequeridoError ||
    error instanceof ConsentimientoNoVigenteError ||
    error instanceof MiembroDelConsentimientoNoEncontradoError
  ) {
    return error.message;
  }
  return null;
}

/** Registra que el socio aceptó la versión vigente del consentimiento (desde la ficha). */
export async function registrarConsentimientoAction(miembroId: string, medio: string): Promise<ResultadoConsentimiento> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  try {
    await registrarConsentimiento(
      {
        textos: new PrismaTextoLegalRepository(prisma),
        consentimientos: new PrismaConsentimientoRepository(prisma),
        miembros: new PrismaMemberRepository(prisma),
      },
      { organizacionId: usuario.organizacionId, miembroId, medio, registradoPorId: usuario.id }
    );
  } catch (error) {
    const mensaje = mensajeDeConsentimiento(error);
    if (mensaje) return { error: mensaje };
    throw error;
  }

  revalidatePath("/miembros");
  revalidatePath(`/miembros/${miembroId}`);
  return {};
}

export async function revocarConsentimientoAction(miembroId: string, motivo: string): Promise<ResultadoConsentimiento> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  try {
    await revocarConsentimiento(
      { consentimientos: new PrismaConsentimientoRepository(prisma), miembros: new PrismaMemberRepository(prisma) },
      { organizacionId: usuario.organizacionId, miembroId, motivo, revocadoPorId: usuario.id }
    );
  } catch (error) {
    const mensaje = mensajeDeConsentimiento(error);
    if (mensaje) return { error: mensaje };
    throw error;
  }

  revalidatePath("/miembros");
  revalidatePath(`/miembros/${miembroId}`);
  return {};
}
