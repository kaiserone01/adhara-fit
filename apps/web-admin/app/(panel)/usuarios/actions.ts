"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaUsuarioAdminRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaUsuarioAdminRepository";
import { BcryptPasswordHasher } from "@gym-app/infrastructure/auth/BcryptPasswordHasher";
import { storageR2 } from "@/lib/storageR2";
import { crearUsuarioAdmin, CorreoDuplicadoError } from "@gym-app/domain/use-cases/CrearUsuarioAdmin";
import {
  actualizarUsuarioAdmin,
  UsuarioNoEncontradoError,
  AutoDesactivacionError,
  UltimoAdministradorError,
} from "@gym-app/domain/use-cases/ActualizarUsuarioAdmin";
import { conMensajeOk } from "../redirectConMensaje";

export interface EstadoFormularioUsuario {
  error?: string;
  // Solo se completa cuando la acción NO redirige (actualizarUsuarioAction
  // se queda en la misma página) — ver mismo patrón en pagos/actions.ts.
  ok?: string;
}

const LARGO_MINIMO_CLAVE = 8;

// Sube la foto al bucket "gym-app" en Cloudflare R2 (carpeta "usuarios") y
// devuelve la URL pública. Mismo patrón que la foto de Miembro.
async function guardarFoto(archivo: FormDataEntryValue | null): Promise<string | null> {
  if (!(archivo instanceof File) || archivo.size === 0) return null;

  const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const nombreArchivo = `${randomUUID()}.${extension}`;
  const contenido = Buffer.from(await archivo.arrayBuffer());

  return storageR2().subir("usuarios", nombreArchivo, contenido, archivo.type || "application/octet-stream");
}

export async function crearUsuarioAction(
  _estadoPrevio: EstadoFormularioUsuario,
  formData: FormData
): Promise<EstadoFormularioUsuario> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const nombre = formData.get("nombre")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const clave = formData.get("password")?.toString();

  if (!nombre || !email || !clave) {
    return { error: "Nombre, correo y contraseña son requeridos." };
  }
  if (clave.length < LARGO_MINIMO_CLAVE) {
    return { error: "La contraseña debe tener al menos " + LARGO_MINIMO_CLAVE + " caracteres." };
  }

  const telefono = formData.get("telefono")?.toString().trim() || null;
  const fotoUrl = await guardarFoto(formData.get("foto"));

  try {
    const passwordHash = await new BcryptPasswordHasher().hash(clave);
    await crearUsuarioAdmin(
      { usuarios: new PrismaUsuarioAdminRepository(prisma) },
      {
        organizacionId: usuario.organizacionId,
        sucursalId: null,
        nombre,
        email,
        passwordHash,
        telefono,
        fotoUrl,
      }
    );
  } catch (error) {
    if (error instanceof CorreoDuplicadoError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/usuarios");
  redirect(conMensajeOk("/usuarios", "Administrador creado."));
}

export async function actualizarUsuarioAction(
  id: string,
  _estadoPrevio: EstadoFormularioUsuario,
  formData: FormData
): Promise<EstadoFormularioUsuario> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const nombre = formData.get("nombre")?.toString().trim();
  if (!nombre) {
    return { error: "El nombre es requerido." };
  }

  const telefono = formData.get("telefono")?.toString().trim() || null;
  const fotoUrl = await guardarFoto(formData.get("foto"));

  try {
    await actualizarUsuarioAdmin(
      { usuarios: new PrismaUsuarioAdminRepository(prisma) },
      {
        organizacionId: usuario.organizacionId,
        usuarioIdSolicitante: usuario.id,
        id,
        cambios: { nombre, telefono, ...(fotoUrl ? { fotoUrl } : {}) },
      }
    );
  } catch (error) {
    if (error instanceof UsuarioNoEncontradoError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/usuarios/${id}`);
  return { ok: "Cambios guardados." };
}

// Sin redirect adentro a propósito: se llama desde un botón en el cliente (tarjeta del administrador).
// Los errores de dominio se devuelven como valor (en producción Next oculta el mensaje de un error
// lanzado desde una Server Action) para que el cliente los muestre con useFeedback.
export async function cambiarEstadoUsuarioAction(id: string, activo: boolean): Promise<{ error?: string }> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  try {
    await actualizarUsuarioAdmin(
      { usuarios: new PrismaUsuarioAdminRepository(prisma) },
      { organizacionId: usuario.organizacionId, usuarioIdSolicitante: usuario.id, id, cambios: { activo } }
    );
  } catch (error) {
    if (
      error instanceof UsuarioNoEncontradoError ||
      error instanceof AutoDesactivacionError ||
      error instanceof UltimoAdministradorError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/usuarios");
  return {};
}
