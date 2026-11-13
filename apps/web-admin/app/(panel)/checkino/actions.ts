"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { puedeEditarCheckino } from "@/lib/permisoCheckino";
import { storageR2 } from "@/lib/storageR2";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { extensionDeImagen } from "@gym-app/domain/utils/imagenSubida";
import { limitarOpacidad, normalizarFrasesReposo } from "@gym-app/domain/utils/reposoCheckino";
import type { CambiosSucursal } from "@gym-app/domain/entities/Sucursal";
import { conMensajeOk } from "../redirectConMensaje";

export interface EstadoFormularioCheckino {
  error?: string;
}

const SIN_PERMISO = "Solo el socio o el gerente pueden configurar el checkino.";

// Sesión válida con permiso de checkino; si falta la sesión redirige al login, si falta el permiso devuelve null.
async function sesionConPermiso() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  return puedeEditarCheckino(sesion.usuario.rol) ? sesion : null;
}

// Guarda los cambios de reposo en la sucursal activa (siempre dentro de la organización del usuario).
async function actualizarReposo(sesion: NonNullable<Awaited<ReturnType<typeof sesionConPermiso>>>, cambios: CambiosSucursal) {
  const { usuario, sucursalActivaId } = sesion;
  return new PrismaSucursalRepository(prisma).actualizar(usuario.organizacionId, sucursalActivaId, cambios);
}

export async function guardarFrasesAction(
  _estadoPrevio: EstadoFormularioCheckino,
  formData: FormData
): Promise<EstadoFormularioCheckino> {
  const sesion = await sesionConPermiso();
  if (!sesion) return { error: SIN_PERMISO };

  const frases = normalizarFrasesReposo(formData.getAll("frase").map((valor) => valor.toString()));
  const sucursal = await actualizarReposo(sesion, { reposoFrases: frases });
  if (!sucursal) return { error: "No se encontró la sucursal activa." };

  revalidatePath("/checkino/frases");
  redirect(
    conMensajeOk("/checkino/frases", frases.length ? "Frases guardadas." : "Frases quitadas: el checkin usará las predeterminadas.")
  );
}

// Sube la imagen a la carpeta "checkino" del bucket R2 y devuelve su URL pública. Solo JPEG/PNG/WebP de hasta
// 5 MB; la extensión sale del tipo, no del nombre que manda el cliente.
async function guardarImagen(archivo: FormDataEntryValue | null): Promise<string | null> {
  if (!(archivo instanceof File) || archivo.size === 0) return null;

  const extension = extensionDeImagen(archivo.type, archivo.size);
  if (!extension) throw new ImagenNoValidaError();

  const nombreArchivo = `${randomUUID()}.${extension}`;
  const contenido = Buffer.from(await archivo.arrayBuffer());

  return storageR2().subir("checkino", nombreArchivo, contenido, archivo.type);
}

class ImagenNoValidaError extends Error {
  constructor() {
    super("La imagen debe ser JPG, PNG o WebP de hasta 5 MB.");
  }
}

export async function guardarImagenReposoAction(
  _estadoPrevio: EstadoFormularioCheckino,
  formData: FormData
): Promise<EstadoFormularioCheckino> {
  const sesion = await sesionConPermiso();
  if (!sesion) return { error: SIN_PERMISO };

  let imagenUrl: string | null;
  try {
    imagenUrl = await guardarImagen(formData.get("foto"));
  } catch (error) {
    if (error instanceof ImagenNoValidaError) return { error: error.message };
    throw error;
  }
  const cambios: CambiosSucursal = { reposoOpacidad: limitarOpacidad(formData.get("opacidad")) };
  if (imagenUrl) cambios.reposoImagenUrl = imagenUrl;

  const sucursal = await actualizarReposo(sesion, cambios);
  if (!sucursal) return { error: "No se encontró la sucursal activa." };

  revalidatePath("/checkino/imagen");
  redirect(conMensajeOk("/checkino/imagen", "Cambios guardados."));
}

// "Ajustar encuadre": guarda solo la imagen, al instante, sin esperar al "Guardar" del formulario.
export async function actualizarImagenReposoAction(formData: FormData): Promise<{ imagenUrl?: string; error?: string }> {
  const sesion = await sesionConPermiso();
  if (!sesion) return { error: SIN_PERMISO };

  let imagenUrl: string | null;
  try {
    imagenUrl = await guardarImagen(formData.get("foto"));
  } catch (error) {
    if (error instanceof ImagenNoValidaError) return { error: error.message };
    throw error;
  }
  if (!imagenUrl) return { error: "No se recibió la imagen." };

  const sucursal = await actualizarReposo(sesion, { reposoImagenUrl: imagenUrl });
  if (!sucursal) return { error: "No se encontró la sucursal activa." };

  revalidatePath("/checkino/imagen");
  return { imagenUrl };
}

export async function restablecerImagenReposoAction(): Promise<void> {
  const sesion = await sesionConPermiso();
  if (!sesion) redirect("/miembros");

  await actualizarReposo(sesion, { reposoImagenUrl: null });
  revalidatePath("/checkino/imagen");
  redirect(conMensajeOk("/checkino/imagen", "Imagen original restablecida."));
}
