"use server";

import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaUnidadDeTrabajo } from "@gym-app/infrastructure/persistence/prisma/PrismaUnidadDeTrabajo";
import { conMensajeOk } from "../redirectConMensaje";
import {
  registrarPago,
  MiembroEliminadoError,
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
  cambiarPlan,
  MiembroNoEncontradoError as MiembroNoEncontradoErrorCambio,
  PlanNoEncontradoError as PlanNoEncontradoErrorCambio,
  PlanInactivoError as PlanInactivoErrorCambio,
  PlanIgualError,
  SinCicloVigenteError,
  MiembroSinPlanError,
  CambioDesactualizadoError,
  MetodoPagoRequeridoError,
  CobroEnConflictoError,
  CobroAnuladoError,
  CobroDuplicadoError,
} from "@gym-app/domain/use-cases/CambiarPlan";

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
      error instanceof MiembroEliminadoError ||
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
  // Éxito: el formulario sigue montado y quien lo usa decide cómo seguir (cambiarPlanAction nunca redirige).
  ok?: string;
  // Nuevo vencimiento (ISO); solo junto con `ok`.
  vencimiento?: string;
}

// Los únicos campos que acepta el cambio de plan (S-07); cualquier otro se rechaza.
const CAMPOS_CAMBIO_PLAN = new Set([
  "miembroId",
  "planNuevoId",
  "montoEsperado",
  "vencimientoEsperado",
  "metodo",
  "metodoPagoId",
  "numeroOperacion",
  "cobroId",
]);

// Importe «123.45» → número; cualquier otra cosa → null.
function leerImporte(valor: FormDataEntryValue | null): number | null {
  const texto = valor?.toString().trim() ?? "";
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(texto)) return null;
  return Number(texto);
}

export async function cambiarPlanAction(
  _estadoPrevio: EstadoCambioPlan,
  formData: FormData
): Promise<EstadoCambioPlan> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  // Next agrega campos internos `$ACTION_*` al formulario; el resto debe ser exactamente el contrato.
  for (const campo of formData.keys()) {
    if (!campo.startsWith("$ACTION") && !CAMPOS_CAMBIO_PLAN.has(campo)) {
      return { error: "El formulario de cambio de plan no es válido." };
    }
  }

  const miembroId = formData.get("miembroId")?.toString();
  const planNuevoId = formData.get("planNuevoId")?.toString();
  const montoEsperado = leerImporte(formData.get("montoEsperado"));
  const textoVencimiento = formData.get("vencimientoEsperado")?.toString() ?? "";
  const vencimientoEsperado = /^\d{4}-\d{2}-\d{2}$/.test(textoVencimiento) ? new Date(`${textoVencimiento}T05:00:00.000Z`) : null;
  const metodo = formData.get("metodo")?.toString() ?? "";
  const cobroId = formData.get("cobroId")?.toString() || null;

  if (!miembroId || !planNuevoId) return { error: "Miembro y plan nuevo son requeridos." };
  if (montoEsperado === null || !vencimientoEsperado || Number.isNaN(vencimientoEsperado.getTime())) {
    return { error: "El monto y el vencimiento esperados no son válidos." };
  }
  if (!sucursalActivaId) return { error: "No se pudo determinar en qué sucursal se registra el cambio." };

  let resultado;
  try {
    resultado = await cambiarPlan(
      { unidad: new PrismaUnidadDeTrabajo(prisma) },
      {
        organizacionId: usuario.organizacionId,
        miembroId,
        planNuevoId,
        montoEsperado,
        vencimientoEsperado,
        linea: metodo
          ? {
              metodo,
              metodoPagoId: formData.get("metodoPagoId")?.toString() || null,
              numeroOperacion: formData.get("numeroOperacion")?.toString().trim() || null,
            }
          : null,
        sucursalId: sucursalActivaId,
        registradoPorId: usuario.id,
        cobroId,
      }
    );
  } catch (error) {
    if (
      error instanceof MiembroNoEncontradoErrorCambio ||
      error instanceof MiembroEliminadoError ||
      error instanceof MiembroFueraDeSucursalError ||
      error instanceof PlanNoEncontradoErrorCambio ||
      error instanceof PlanInactivoErrorCambio ||
      error instanceof PlanIgualError ||
      error instanceof SinCicloVigenteError ||
      error instanceof MiembroSinPlanError ||
      error instanceof CambioDesactualizadoError ||
      error instanceof MetodoPagoRequeridoError ||
      error instanceof CobroEnConflictoError ||
      error instanceof CobroAnuladoError ||
      error instanceof CobroDuplicadoError
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

  const cobrado = resultado.calculo.montoCobrarCentavos / 100;
  return {
    ok: cobrado > 0 ? `Plan cambiado — se cobró ${formatearSoles(cobrado)}.` : "Plan cambiado, sin costo adicional.",
    vencimiento: resultado.calculo.nuevoVencimiento.toISOString(),
  };
}
