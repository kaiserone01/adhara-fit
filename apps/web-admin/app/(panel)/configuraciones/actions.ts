"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaMetodoPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMetodoPagoRepository";
import { storageR2 } from "@/lib/storageR2";
import { crearMetodoPago } from "@gym-app/domain/use-cases/CrearMetodoPago";
import { actualizarMetodoPago, MetodoPagoNoEncontradoError } from "@gym-app/domain/use-cases/ActualizarMetodoPago";
import type { TipoMetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { conMensajeOk } from "../redirectConMensaje";

export interface EstadoFormularioMetodoPago {
  error?: string;
}


async function guardarLogo(archivo: FormDataEntryValue | null): Promise<string | null> {
  if (!(archivo instanceof File) || archivo.size === 0) return null;

  const extension = archivo.name.split(".").pop()?.toLowerCase() || "png";
  const nombreArchivo = `${randomUUID()}.${extension}`;
  const contenido = Buffer.from(await archivo.arrayBuffer());

  return storageR2().subir("logos-pagos", nombreArchivo, contenido, archivo.type || "image/png");
}

async function guardarQr(archivo: FormDataEntryValue | null): Promise<string | null> {
  if (!(archivo instanceof File) || archivo.size === 0) return null;

  const extension = archivo.name.split(".").pop()?.toLowerCase() || "png";
  const nombreArchivo = `${randomUUID()}.${extension}`;
  const contenido = Buffer.from(await archivo.arrayBuffer());

  return storageR2().subir("qr-pagos", nombreArchivo, contenido, archivo.type || "image/png");
}

function leerCoordenadas(formData: FormData) {
  return {
    telefono: formData.get("telefono")?.toString().trim() || null,
    numeroCuenta: formData.get("numeroCuenta")?.toString().trim() || null,
    beneficiario: formData.get("beneficiario")?.toString().trim() || null,
  };
}

export async function crearMetodoPagoAction(
  _estadoPrevio: EstadoFormularioMetodoPago,
  formData: FormData
): Promise<EstadoFormularioMetodoPago> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const tipo = formData.get("tipo")?.toString() as TipoMetodoPago | undefined;
  const nombreBanco = formData.get("nombreBanco")?.toString().trim() || null;

  if (!tipo) {
    return { error: "El tipo es requerido." };
  }

  const logoExistenteUrl = formData.get("logoUrl")?.toString() || null;
  const logoUrl = (await guardarLogo(formData.get("logo"))) ?? logoExistenteUrl;
  const qrExistenteUrl = formData.get("qrUrl")?.toString() || null;
  const qrUrl = (await guardarQr(formData.get("qr"))) ?? qrExistenteUrl;

  await crearMetodoPago(
    { metodosPago: new PrismaMetodoPagoRepository(prisma) },
    {
      organizacionId: usuario.organizacionId,
      tipo,
      nombreBanco,
      logoUrl,
      qrUrl,
      ...leerCoordenadas(formData),
    }
  );

  revalidatePath("/configuraciones/metodos-pago");
  redirect(conMensajeOk("/configuraciones/metodos-pago", "Método de pago creado."));
}

export async function actualizarMetodoPagoAction(
  id: string,
  _estadoPrevio: EstadoFormularioMetodoPago,
  formData: FormData
): Promise<EstadoFormularioMetodoPago> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const nombreBanco = formData.get("nombreBanco")?.toString().trim() || null;

  const logoExistenteUrl = formData.get("logoUrl")?.toString() || null;
  const logoUrl = (await guardarLogo(formData.get("logo"))) ?? logoExistenteUrl;
  const qrExistenteUrl = formData.get("qrUrl")?.toString() || null;
  const qrUrl = (await guardarQr(formData.get("qr"))) ?? qrExistenteUrl;

  try {
    await actualizarMetodoPago(
      { metodosPago: new PrismaMetodoPagoRepository(prisma) },
      {
        organizacionId: usuario.organizacionId,
        id,
        cambios: {
          nombreBanco,
          logoUrl,
          qrUrl,
          ...leerCoordenadas(formData),
        },
      }
    );
  } catch (error) {
    if (error instanceof MetodoPagoNoEncontradoError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/configuraciones/metodos-pago");
  redirect(conMensajeOk("/configuraciones/metodos-pago", "Cambios guardados."));
}

export async function alternarActivoMetodoPagoAction(id: string, activo: boolean): Promise<void> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  await actualizarMetodoPago(
    { metodosPago: new PrismaMetodoPagoRepository(prisma) },
    { organizacionId: usuario.organizacionId, id, cambios: { activo } }
  ).catch(() => null);

  revalidatePath("/configuraciones/metodos-pago");
}
