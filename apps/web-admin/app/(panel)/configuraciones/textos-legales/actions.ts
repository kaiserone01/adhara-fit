"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaTextoLegalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaConsentimientoRepository";
import { publicarTextoLegal, TextoLegalInvalidoError } from "@gym-app/domain/use-cases/Consentimiento";
import { TIPOS_TEXTO_LEGAL, type TipoTextoLegal } from "@gym-app/domain/entities/Consentimiento";
import { conMensajeOk } from "../../redirectConMensaje";

export interface EstadoFormularioTextoLegal {
  error?: string;
}

export async function publicarTextoLegalAction(
  tipo: TipoTextoLegal,
  _estadoPrevio: EstadoFormularioTextoLegal,
  formData: FormData
): Promise<EstadoFormularioTextoLegal> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  if (!TIPOS_TEXTO_LEGAL.includes(tipo)) return { error: "Tipo de texto no válido." };

  try {
    await publicarTextoLegal(
      { textos: new PrismaTextoLegalRepository(prisma) },
      {
        organizacionId: usuario.organizacionId,
        tipo,
        contenido: formData.get("contenido")?.toString() ?? "",
        cambioSustancial: formData.get("cambioSustancial") === "on",
        publicadoPorId: usuario.id,
      }
    );
  } catch (error) {
    if (error instanceof TextoLegalInvalidoError) return { error: error.message };
    throw error;
  }

  revalidatePath("/configuraciones/textos-legales");
  revalidatePath("/privacidad");
  revalidatePath("/libro-de-reclamaciones");
  revalidatePath("/miembros");
  redirect(conMensajeOk("/configuraciones/textos-legales", "Texto publicado."));
}

export async function guardarDatosNegocioAction(
  _estadoPrevio: EstadoFormularioTextoLegal,
  formData: FormData
): Promise<EstadoFormularioTextoLegal> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const limpiar = (campo: string, max: number) => (formData.get(campo)?.toString().trim() || "").slice(0, max) || null;
  const ruc = limpiar("ruc", 11);
  if (ruc && !/^\d{11}$/.test(ruc)) return { error: "El RUC debe tener 11 dígitos." };

  await prisma.organizacion.update({
    where: { id: usuario.organizacionId },
    data: { razonSocial: limpiar("razonSocial", 200), ruc, direccion: limpiar("direccion", 300) },
  });

  revalidatePath("/configuraciones/textos-legales");
  revalidatePath("/libro-de-reclamaciones");
  redirect(conMensajeOk("/configuraciones/textos-legales", "Datos del negocio guardados."));
}
