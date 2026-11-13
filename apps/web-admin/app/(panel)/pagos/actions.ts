"use server";

import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPagoRepository";
import { PrismaSuscripcionRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSuscripcionRepository";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaPlanRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPlanRepository";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { PrismaUnidadDeTrabajo } from "@gym-app/infrastructure/persistence/prisma/PrismaUnidadDeTrabajo";
import { PrismaCambioPlanAuditoriaRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaCambioPlanAuditoriaRepository";
import { conMensajeOk } from "../redirectConMensaje";
import {
  registrarPago,
  MiembroFueraDeSucursalError,
  MiembroNoEncontradoError,
  PlanNoEncontradoError,
  PlanInactivoError,
  MontoInvalidoError,
  MontoDistintoDelPrecioError,
  FechaPagoFuturaError,
  PlanDistintoConVencimientoVigenteError,
  MesesInvalidosError,
} from "@gym-app/domain/use-cases/RegistrarPago";
import {
  cambiarPlanConPago,
  MiembroNoEncontradoError as MiembroNoEncontradoErrorCambio,
  PlanNoEncontradoError as PlanNoEncontradoErrorCambio,
  PlanInactivoError as PlanInactivoErrorCambio,
  SinCicloVigenteError,
  MetodoPagoRequeridoError,
  EntrenadorRequeridoError,
  PlanCortesiaConTiempoRestanteError,
  LineasDePagoInvalidasError as LineasDePagoInvalidasErrorCambio,
  MontoLineasNoCubreObjetivoError,
} from "@gym-app/domain/use-cases/CambiarPlanConPago";

export interface EstadoFormularioPago {
  error?: string;
  // Solo se completa cuando la acción NO redirige (origen "miembro" o "caja"): el formulario sigue montado en la
  // misma página, así que el éxito viaja por acá en vez de por ?ok= en la URL.
  ok?: string;
  // Vencimiento tras el pago (ISO); solo junto con `ok`.
  fechaFinCiclo?: string;
}

// Un cobro de membresía (S-04): un solo pago completo con un solo método. La pantalla manda un `cobroId` (UUID)
// para que reenviar el mismo cobro no lo duplique.
export async function registrarPagoAction(
  _estadoPrevio: EstadoFormularioPago,
  formData: FormData
): Promise<EstadoFormularioPago> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const miembroId = formData.get("miembroId")?.toString();
  const planId = formData.get("planId")?.toString();
  const cobroId = formData.get("cobroId")?.toString();
  const lineasRaw = formData.get("lineas")?.toString();
  const origen = formData.get("origen")?.toString();
  // Fecha del pago (yyyy-mm-dd), de cualquier antigüedad pero nunca futura. Vacía = ahora. Se toma al mediodía de
  // Lima para no caer en el día anterior por zona horaria.
  const fechaPagoTexto = formData.get("fechaPago")?.toString();
  const sucursalIdPago = formData.get("sucursalIdPago")?.toString() || sucursalActivaId;

  if (!miembroId || !planId || !lineasRaw || !cobroId) {
    return { error: "Socio, plan, método de pago e identificador del cobro son requeridos." };
  }
  if (!sucursalIdPago) {
    return { error: "No se pudo determinar en qué sucursal se registra el pago." };
  }

  let lineas: unknown;
  try {
    lineas = JSON.parse(lineasRaw);
  } catch {
    return { error: "No se pudo interpretar la información del pago." };
  }
  if (!Array.isArray(lineas) || lineas.length !== 1) {
    return { error: "El cobro es un solo pago con un solo método." };
  }
  const linea = lineas[0] as { monto: number; metodo: string; metodoPagoId: string | null; numeroOperacion: string | null };
  if (!(linea.monto > 0) || !linea.metodo || !linea.metodoPagoId) {
    return { error: "El pago necesita un monto mayor a S/ 0 y un método." };
  }

  let pago;
  try {
    pago = await registrarPago(
      { unidad: new PrismaUnidadDeTrabajo(prisma) },
      {
        organizacionId: usuario.organizacionId,
        miembroId,
        planId,
        linea: {
          monto: linea.monto,
          metodo: linea.metodo,
          metodoPagoId: linea.metodoPagoId,
          numeroOperacion: linea.numeroOperacion ?? null,
        },
        sucursalId: sucursalIdPago,
        registradoPorId: usuario.id,
        cobroId,
        ...(fechaPagoTexto ? { fechaPago: new Date(`${fechaPagoTexto}T12:00:00-05:00`) } : {}),
        meses: Number(formData.get("meses")?.toString() || 1),
      }
    );
  } catch (error) {
    if (
      error instanceof MiembroNoEncontradoError ||
      error instanceof PlanNoEncontradoError ||
      error instanceof PlanInactivoError ||
      error instanceof MontoInvalidoError ||
      error instanceof MontoDistintoDelPrecioError ||
      error instanceof FechaPagoFuturaError ||
      error instanceof PlanDistintoConVencimientoVigenteError ||
      error instanceof MesesInvalidosError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/pagos");
  revalidatePath(`/miembros/${miembroId}`);
  revalidatePath(`/miembros/${miembroId}/pagos`);
  revalidatePath("/cobros");

  if (origen !== "miembro" && origen !== "caja") {
    redirect(conMensajeOk(`/miembros/${miembroId}`, "Pago registrado."));
  }

  return { ok: "Pago registrado.", fechaFinCiclo: pago.fechaFinCiclo?.toISOString() };
}

export interface EstadoCambioPlan {
  error?: string;
  // Presente solo cuando origen === "caja" (ver más abajo) — el wizard de
  // Caja usa esto para cerrar el modal sin navegar, en vez del redirect a
  // /miembros que usa el origen por defecto (ficha del miembro).
  ok?: string;
  diferencia?: number;
  saldoAFavorGenerado?: number;
}

export async function cambiarPlanAction(
  _estadoPrevio: EstadoCambioPlan,
  formData: FormData
): Promise<EstadoCambioPlan> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const miembroId = formData.get("miembroId")?.toString();
  const planNuevoId = formData.get("planNuevoId")?.toString();
  const lineasRaw = formData.get("lineas")?.toString();
  const sucursalIdPago = formData.get("sucursalIdPago")?.toString() || sucursalActivaId;
  const entrenadorId = formData.get("entrenadorId")?.toString() || null;
  // "caja": viene del wizard de Caja (Paso 2), dentro de un modal — se
  // queda en /caja en vez de navegar a /miembros (ver diseño acordado, igual
  // criterio que origen en registrarPagoAction).
  const origen = formData.get("origen")?.toString();

  if (!miembroId || !planNuevoId) {
    return { error: "Miembro y plan nuevo son requeridos." };
  }
  if (!sucursalIdPago) {
    return { error: "No se pudo determinar en qué sucursal se registra el cambio." };
  }

  let lineas: Array<{
    monto: number;
    metodo: string;
    metodoPagoId: string | null;
    numeroOperacion: string | null;
  }> = [];
  if (lineasRaw) {
    try {
      lineas = JSON.parse(lineasRaw);
    } catch {
      return { error: "No se pudo interpretar la información del pago." };
    }
    if (!Array.isArray(lineas)) {
      return { error: "No se pudo interpretar la información del pago." };
    }
  }

  let resultado;
  try {
    // Guardado atómico (regla 11 del diseño acordado): plan, vencimiento,
    // pago y el registro de auditoría se escriben en una sola transacción
    // Prisma — todos los repos reciben `tx` (compatible con la misma
    // interfaz que PrismaClient) en vez del cliente global, así que si
    // cualquier paso falla, ninguno de los otros queda a medio escribir.
    resultado = await prisma.$transaction((tx) =>
      cambiarPlanConPago(
        {
          pagos: new PrismaPagoRepository(tx),
          suscripciones: new PrismaSuscripcionRepository(tx),
          miembros: new PrismaMemberRepository(tx),
          planes: new PrismaPlanRepository(tx),
          sucursales: new PrismaSucursalRepository(tx),
          auditoria: new PrismaCambioPlanAuditoriaRepository(tx),
        },
        {
          organizacionId: usuario.organizacionId,
          miembroId,
          planNuevoId,
          origen: origen === "caja" ? "CAJA" : "FICHA_MIEMBRO",
          lineas: lineas,
          sucursalId: sucursalIdPago,
          registradoPorId: usuario.id,
          entrenadorId,
        }
      )
    );
  } catch (error) {
    if (
      error instanceof MiembroNoEncontradoErrorCambio ||
      error instanceof MiembroFueraDeSucursalError ||
      error instanceof PlanNoEncontradoErrorCambio ||
      error instanceof PlanInactivoErrorCambio ||
      error instanceof SinCicloVigenteError ||
      error instanceof MetodoPagoRequeridoError ||
      error instanceof EntrenadorRequeridoError ||
      error instanceof PlanCortesiaConTiempoRestanteError ||
      error instanceof LineasDePagoInvalidasErrorCambio ||
      error instanceof MontoLineasNoCubreObjetivoError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/pagos");
  revalidatePath("/miembros");
  revalidatePath(`/miembros/${miembroId}`);
  revalidatePath(`/miembros/${miembroId}/pagos`);
  revalidatePath("/cobros");

  // CambiarPlanConPago ya no genera saldo a favor (ver regla 5 del diseño
  // acordado: el valor no consumido se convierte en días, nunca en
  // crédito) — resultado.diferencia siempre es >= 0.
  const mensaje =
    resultado.diferencia > 0
      ? `Plan cambiado — se cobró ${formatearSoles(resultado.diferencia)}.`
      : "Plan cambiado, sin costo adicional.";

  // Desde el wizard de Caja: se queda en /caja y cierra el modal (ver
  // diseño acordado), igual criterio que registrarPagoAction con
  // origen "caja" — no tiene sentido navegar afuera del modal que sigue
  // abierto. Desde la ficha del miembro (sin origen), se redirige a la
  // lista — evita el "¿para qué es Guardar?" de volver a tocar otro botón
  // en la misma pantalla.
  if (origen === "caja") {
    return { ok: mensaje, diferencia: resultado.diferencia, saldoAFavorGenerado: resultado.saldoAFavorGenerado };
  }

  redirect(conMensajeOk("/miembros", mensaje));
}
