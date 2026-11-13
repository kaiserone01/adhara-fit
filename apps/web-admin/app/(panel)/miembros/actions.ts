"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaSuscripcionRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSuscripcionRepository";
import { esTipoDocumento, type TipoDocumento } from "@gym-app/domain/utils/documento";
import { validarEntrenadorDeMiembro } from "./validarEntrenadorDeMiembro";
import {
  crearMiembro,
  CodigoSocioEnConflictoError,
  CodigosSocioAgotadosError,
  DocumentoDuplicadoError,
  DocumentoInvalidoError,
} from "@gym-app/domain/use-cases/CrearMiembro";
import {
  actualizarMiembro,
  MiembroNoEncontradoError,
  MiembroFueraDeSucursalError,
  MiembroEliminadoError,
  PlanNoEncontradoError as ActualizarPlanNoEncontradoError,
  FechasIncoherentesError,
} from "@gym-app/domain/use-cases/ActualizarMiembro";
import { calcularCambiosFechas } from "@gym-app/domain/utils/cambiosFechasFicha";
import { inicioDelDiaLima } from "@gym-app/domain/utils/fechaLima";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { PrismaUnidadDeTrabajo } from "@gym-app/infrastructure/persistence/prisma/PrismaUnidadDeTrabajo";
import { storageR2 } from "@/lib/storageR2";
import {
  eliminarMiembro,
  restaurarMiembro,
  MiembroNoEncontradoError as BajaMiembroNoEncontradoError,
  MiembroYaEliminadoError,
  MiembroNoEliminadoError,
  MotivoBajaInvalidoError,
} from "@gym-app/domain/use-cases/EliminarMiembro";
import { MiembroFueraDeSucursalError as BajaMiembroFueraDeSucursalError } from "@gym-app/domain/use-cases/ObtenerMiembro";
import { conMensajeOk } from "../redirectConMensaje";

export interface EstadoFormularioMiembro {
  error?: string;
}

const ID_AMBAS_SEDES = "__ambas__";

// "Ambas" en el selector de sede se traduce a null (sin restricción de
// sucursal) — ver diseño acordado del checkbox Plan.multisede.
function resolverSucursalId(valor: string | undefined): string | null {
  if (!valor || valor === ID_AMBAS_SEDES) return null;
  return valor;
}

function resolverPlanId(formData: FormData): string | null {
  return formData.get("planId")?.toString() || null;
}

// "yyyy-mm-dd" del <input type="date"> → fecha local a las 00:00; vacío o inválido → null.
function leerFecha(valor: FormDataEntryValue | null): Date | null {
  const texto = valor?.toString();
  if (!texto) return null;
  const fecha = new Date(`${texto}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Sube la foto al bucket "gym-app" en Cloudflare R2 (carpeta "miembros") y
// devuelve la URL pública (dominio R2.dev configurado en R2_PUBLIC_URL).
async function guardarFoto(archivo: FormDataEntryValue | null): Promise<string | null> {
  if (!(archivo instanceof File) || archivo.size === 0) return null;

  const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const nombreArchivo = `${randomUUID()}.${extension}`;
  const contenido = Buffer.from(await archivo.arrayBuffer());

  return storageR2().subir("miembros", nombreArchivo, contenido, archivo.type || "application/octet-stream");
}

// S-06: tipo y número de documento del formulario (el tipo por defecto es DNI; el dominio valida el formato).
function leerDocumento(formData: FormData): { tipoDocumento: TipoDocumento; numeroDocumento: string } {
  const tipo = formData.get("tipoDocumento")?.toString();
  return {
    tipoDocumento: esTipoDocumento(tipo) ? tipo : "DNI",
    numeroDocumento: formData.get("numeroDocumento")?.toString().trim() ?? "",
  };
}

function esErrorDeDocumento(error: unknown): error is Error {
  return (
    error instanceof DocumentoInvalidoError ||
    error instanceof DocumentoDuplicadoError ||
    error instanceof CodigosSocioAgotadosError ||
    error instanceof CodigoSocioEnConflictoError
  );
}

// El alta solo registra al socio y su plan elegido. El primer cobro se hace desde Cobros: «Guardar y cobrar» lleva
// allí con el socio ya elegido (el cobro es siempre el mismo flujo, con su método, idempotencia y vencimiento).
export async function crearMiembroAction(
  _estadoPrevio: EstadoFormularioMiembro,
  formData: FormData
): Promise<EstadoFormularioMiembro> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const nombre = formData.get("nombre")?.toString().trim();
  const documento = leerDocumento(formData);
  const sucursalId = formData.get("sucursalId")?.toString();
  const precioPlan = Number(formData.get("precioPlan"));
  const cobrarDespues = formData.get("despues")?.toString() === "cobrar";

  if (!nombre || !documento.numeroDocumento || !sucursalId || Number.isNaN(precioPlan)) {
    return { error: "Nombre, documento y sede son requeridos." };
  }

  const planId = resolverPlanId(formData);
  if (!planId) {
    return { error: "Elige un plan para el miembro." };
  }

  const errorEntrenador = await validarEntrenadorDeMiembro(formData.get("entrenadorId")?.toString() || null);
  if (errorEntrenador) return { error: errorEntrenador };

  const fotoUrl = await guardarFoto(formData.get("foto"));

  let miembro;
  try {
    miembro = await crearMiembro(
      { miembros: new PrismaMemberRepository(prisma) },
      {
        organizacionId: usuario.organizacionId,
        sucursalId: resolverSucursalId(sucursalId),
        nombre,
        tipoDocumento: documento.tipoDocumento,
        numeroDocumento: documento.numeroDocumento,
        // Viene del formulario (puede ser pasada: miembros anotados en cuaderno); si falta, hoy: el instante en
        // que empieza el día calendario de Lima.
        fechaInscripcion: leerFecha(formData.get("fechaInscripcion")) ?? inicioDelDiaLima(new Date()),
        fechaNacimiento: null,
        celular: formData.get("celular")?.toString() || null,
        fotoUrl,
        entrenadorId: formData.get("entrenadorId")?.toString() || null,
        planId,
        precioPlan,
      }
    );
  } catch (error) {
    if (esErrorDeDocumento(error)) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/miembros");
  // Un plan sin costo no tiene nada que cobrar: aunque se pida cobrar, el socio queda guardado y se vuelve a la lista.
  if (cobrarDespues && precioPlan > 0) {
    redirect(`/cobros?cobrar=${encodeURIComponent(miembro.id)}`);
  }
  redirect(conMensajeOk("/miembros", "Miembro creado."));
}

export async function actualizarMiembroAction(
  id: string,
  _estadoPrevio: EstadoFormularioMiembro,
  formData: FormData
): Promise<EstadoFormularioMiembro> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const nombre = formData.get("nombre")?.toString().trim();
  const documento = leerDocumento(formData);
  const sucursalId = formData.get("sucursalId")?.toString();
  const precioPlan = Number(formData.get("precioPlan"));

  if (!nombre || !documento.numeroDocumento || !sucursalId || Number.isNaN(precioPlan)) {
    return { error: "Nombre, documento, sede y precio del plan son requeridos." };
  }

  // null = el campo no se envió (el miembro no puede ajustar esa fecha); "" = el campo se vació.
  const leerTexto = (campo: string) => (formData.has(campo) ? (formData.get(campo)?.toString() ?? "") : null);
  // Solo las fechas que el socio cambió (distintas a las que cargó el formulario): así no se reescribe
  // la hora guardada ni se apaga el aviso en cada guardado.
  const cambiosFechas = calcularCambiosFechas({
    vencimiento: leerTexto("fechaVencimiento"),
    vencimientoOriginal: leerTexto("fechaVencimientoOriginal"),
    pago: leerTexto("fechaUltimoPago"),
    pagoOriginal: leerTexto("fechaUltimoPagoOriginal"),
  });

  const errorEntrenador = await validarEntrenadorDeMiembro(formData.get("entrenadorId")?.toString() || null, id);
  if (errorEntrenador) return { error: errorEntrenador };
  const fotoUrl = await guardarFoto(formData.get("foto"));

  try {
    await actualizarMiembro(
      {
        miembros: new PrismaMemberRepository(prisma),
        suscripciones: new PrismaSuscripcionRepository(prisma),
        sucursales: new PrismaSucursalRepository(prisma),
      },
      {
        organizacionId: usuario.organizacionId,
        id,
        sucursalActivaId,
        cambios: {
          nombre,
          tipoDocumento: documento.tipoDocumento,
          numeroDocumento: documento.numeroDocumento,
          sucursalId: resolverSucursalId(sucursalId),
          celular: formData.get("celular")?.toString() || null,
          entrenadorId: formData.get("entrenadorId")?.toString() || null,
          precioPlan,
          ...(fotoUrl ? { fotoUrl } : {}),
          ...cambiosFechas,
        },
      }
    );
  } catch (error) {
    if (
      esErrorDeDocumento(error) ||
      error instanceof FechasIncoherentesError ||
      error instanceof MiembroNoEncontradoError ||
      error instanceof MiembroEliminadoError ||
      error instanceof MiembroFueraDeSucursalError ||
      error instanceof ActualizarPlanNoEncontradoError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/miembros");
  // Sin esto, el redirect de abajo puede servir la versión en caché de esta
  // misma página (Router Cache) — el formulario de "Registrar pago" de al
  // lado seguiría mostrando el plan/monto viejos aunque el cambio ya esté
  // guardado en la base (ver diseño acordado, bug real reportado).
  revalidatePath(`/miembros/${id}`);
  redirect(conMensajeOk(`/miembros/${id}`, "Cambios guardados."));
}

// Guarda solo la foto (sin tocar el resto de la ficha) y devuelve su URL pública.
// Lo usa "Ajustar encuadre" para persistir el recorte al instante.
export async function actualizarFotoMiembroAction(
  id: string,
  formData: FormData
): Promise<{ fotoUrl?: string; error?: string }> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const fotoUrl = await guardarFoto(formData.get("foto"));
  if (!fotoUrl) return { error: "No se recibió la foto." };

  try {
    await actualizarMiembro(
      {
        miembros: new PrismaMemberRepository(prisma),
        suscripciones: new PrismaSuscripcionRepository(prisma),
        sucursales: new PrismaSucursalRepository(prisma),
      },
      { organizacionId: usuario.organizacionId, id, sucursalActivaId, cambios: { fotoUrl } }
    );
  } catch (error) {
    if (error instanceof MiembroNoEncontradoError || error instanceof MiembroEliminadoError || error instanceof MiembroFueraDeSucursalError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/miembros");
  revalidatePath(`/miembros/${id}`);
  return { fotoUrl };
}

export interface ResultadoBajaMiembro {
  error?: string;
}

function mensajeDeBaja(error: unknown): string | null {
  return error instanceof BajaMiembroNoEncontradoError ||
    error instanceof BajaMiembroFueraDeSucursalError ||
    error instanceof MiembroYaEliminadoError ||
    error instanceof MiembroNoEliminadoError ||
    error instanceof MotivoBajaInvalidoError
    ? error.message
    : null;
}

// Elimina al socio (baja lógica y reversible, S-09): deja de aparecer y sus pagos y datos se conservan.
// Devuelve el error de dominio como mensaje (en producción Next oculta el texto de los errores lanzados).
export async function eliminarMiembroAction(id: string, motivo: string): Promise<ResultadoBajaMiembro> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  try {
    await eliminarMiembro(
      { unidad: new PrismaUnidadDeTrabajo(prisma) },
      { organizacionId: usuario.organizacionId, id, sucursalActivaId, usuarioId: usuario.id, motivo }
    );
  } catch (error) {
    const mensaje = mensajeDeBaja(error);
    if (mensaje) return { error: mensaje };
    throw error;
  }

  revalidatePath("/miembros");
  revalidatePath(`/miembros/${id}`);
  redirect(conMensajeOk("/miembros", "Socio eliminado. Sus pagos se conservan; puedes restaurarlo desde «Eliminados»."));
}

export async function restaurarMiembroAction(id: string, motivo: string): Promise<ResultadoBajaMiembro> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  try {
    await restaurarMiembro(
      { unidad: new PrismaUnidadDeTrabajo(prisma) },
      { organizacionId: usuario.organizacionId, id, sucursalActivaId, usuarioId: usuario.id, motivo }
    );
  } catch (error) {
    const mensaje = mensajeDeBaja(error);
    if (mensaje) return { error: mensaje };
    throw error;
  }

  revalidatePath("/miembros");
  revalidatePath(`/miembros/${id}`);
  redirect(conMensajeOk(`/miembros/${id}`, "Socio restaurado."));
}
