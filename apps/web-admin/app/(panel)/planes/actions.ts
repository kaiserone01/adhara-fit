"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaPlanRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPlanRepository";
import { crearPlan, PlanInvalidoError } from "@gym-app/domain/use-cases/CrearPlan";
import { actualizarPlan, PlanNoEncontradoError, DiasCicloInmutablesError } from "@gym-app/domain/use-cases/ActualizarPlan";
import { eliminarPlan } from "@gym-app/domain/use-cases/EliminarPlan";
import { conMensajeOk } from "../redirectConMensaje";

export interface EstadoFormularioPlan {
  error?: string;
}

function esErrorDePlan(error: unknown): error is Error {
  return error instanceof PlanInvalidoError || error instanceof PlanNoEncontradoError || error instanceof DiasCicloInmutablesError;
}

export async function crearPlanAction(
  _estadoPrevio: EstadoFormularioPlan,
  formData: FormData
): Promise<EstadoFormularioPlan> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const nombre = formData.get("nombre")?.toString().trim();
  const diasCiclo = Number(formData.get("diasCiclo"));
  const precioUSD = Number(formData.get("precioUSD"));

  if (!nombre || Number.isNaN(precioUSD)) {
    return { error: "Nombre, duración y precio son requeridos." };
  }

  try {
    await crearPlan(
      { planes: new PrismaPlanRepository(prisma) },
      { organizacionId: usuario.organizacionId, nombre, diasCiclo, precioUSD, multisede: false }
    );
  } catch (error) {
    if (esErrorDePlan(error)) return { error: error.message };
    throw error;
  }

  revalidatePath("/planes");
  redirect(conMensajeOk("/planes", "Plan creado."));
}

export async function actualizarPlanAction(
  id: string,
  _estadoPrevio: EstadoFormularioPlan,
  formData: FormData
): Promise<EstadoFormularioPlan> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const nombre = formData.get("nombre")?.toString().trim();
  const precioUSD = Number(formData.get("precioUSD"));

  if (!nombre || Number.isNaN(precioUSD)) {
    return { error: "Nombre y precio son requeridos." };
  }

  try {
    await actualizarPlan(
      { planes: new PrismaPlanRepository(prisma) },
      { organizacionId: usuario.organizacionId, id, cambios: { nombre, precioUSD } }
    );
  } catch (error) {
    if (esErrorDePlan(error)) return { error: error.message };
    throw error;
  }

  revalidatePath("/planes");
  redirect(conMensajeOk("/planes", "Cambios guardados."));
}

// Sin redirect adentro a propósito: se llama desde la papelera en la
// lista de planes (cliente), no desde un <form action>, así que el error
// de dominio (mensaje en español, ya legible) se deja propagar para que
// el cliente lo muestre con useFeedback en vez de navegar.
export async function eliminarPlanAction(id: string): Promise<void> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  await eliminarPlan(
    { planes: new PrismaPlanRepository(prisma) },
    { organizacionId: usuario.organizacionId, id, usuarioIdSolicitante: usuario.id }
  );

  revalidatePath("/planes");
}
