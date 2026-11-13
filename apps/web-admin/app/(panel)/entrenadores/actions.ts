"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { storageR2 } from "@/lib/storageR2";
import { PrismaEntrenadorRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaEntrenadorRepository";
import {
  actualizarEntrenador,
  cambiarEstadoEntrenador,
  crearEntrenador,
  EntrenadorNoEncontradoError,
  NombreEntrenadorInvalidoError,
} from "@gym-app/domain/use-cases/GestionarEntrenadores";
import { conMensajeOk } from "../redirectConMensaje";

export interface EstadoFormularioEntrenador {
  error?: string;
  ok?: string;
}

const deps = () => ({ entrenadores: new PrismaEntrenadorRepository(prisma) });

async function guardarFoto(archivo: FormDataEntryValue | null): Promise<string | null> {
  if (!(archivo instanceof File) || archivo.size === 0) return null;
  const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const contenido = Buffer.from(await archivo.arrayBuffer());
  return storageR2().subir("entrenadores", `${randomUUID()}.${extension}`, contenido, archivo.type || "application/octet-stream");
}

export async function crearEntrenadorAction(
  _previo: EstadoFormularioEntrenador,
  formData: FormData
): Promise<EstadoFormularioEntrenador> {
  if (!(await obtenerUsuarioDeSesionActual())) redirect("/login");

  try {
    await crearEntrenador(deps(), {
      nombre: formData.get("nombre")?.toString() ?? "",
      telefono: formData.get("telefono")?.toString(),
      fotoUrl: await guardarFoto(formData.get("foto")),
    });
  } catch (error) {
    if (error instanceof NombreEntrenadorInvalidoError) return { error: error.message };
    throw error;
  }

  revalidatePath("/entrenadores");
  redirect(conMensajeOk("/entrenadores", "Entrenador creado."));
}

export async function actualizarEntrenadorAction(
  id: string,
  _previo: EstadoFormularioEntrenador,
  formData: FormData
): Promise<EstadoFormularioEntrenador> {
  if (!(await obtenerUsuarioDeSesionActual())) redirect("/login");

  try {
    const fotoNueva = await guardarFoto(formData.get("foto"));
    const actual = fotoNueva ? null : await new PrismaEntrenadorRepository(prisma).buscarPorId(id);
    await actualizarEntrenador(deps(), id, {
      nombre: formData.get("nombre")?.toString() ?? "",
      telefono: formData.get("telefono")?.toString(),
      fotoUrl: fotoNueva ?? actual?.fotoUrl ?? null,
    });
  } catch (error) {
    if (error instanceof NombreEntrenadorInvalidoError || error instanceof EntrenadorNoEncontradoError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/entrenadores");
  revalidatePath(`/entrenadores/${id}`);
  return { ok: "Cambios guardados." };
}

// Sin redirect: se llama desde un botón del cliente; los errores de dominio se devuelven como valor.
export async function cambiarEstadoEntrenadorAction(id: string, activo: boolean): Promise<{ error?: string }> {
  if (!(await obtenerUsuarioDeSesionActual())) redirect("/login");

  try {
    await cambiarEstadoEntrenador(deps(), id, activo);
  } catch (error) {
    if (error instanceof EntrenadorNoEncontradoError) return { error: error.message };
    throw error;
  }

  revalidatePath("/entrenadores");
  return {};
}
