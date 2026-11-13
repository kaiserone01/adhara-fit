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
import { PrismaReglaAbonoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaReglaAbonoRepository";
import type { PrismaClientOrTx } from "@gym-app/infrastructure/persistence/prisma/PrismaClientOrTx";
import { PrismaCambioPlanAuditoriaRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaCambioPlanAuditoriaRepository";
import { conMensajeOk } from "../redirectConMensaje";
import {
  registrarPago,
  MiembroNoEncontradoError,
  MiembroFueraDeSucursalError,
  PlanNoEncontradoError,
  PlanInactivoError,
  MontoInvalidoError,
  LineasDePagoInvalidasError,
  AbonoNoPermitidoError,
  AbonoMenorAlMinimoError,
  FechaPagoInvalidaError,
  MesesInvalidosError,
  MesesRequierenPagoCompletoError,
  MesesNoDisponiblesError,
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
  // Solo se completa cuando la acción NO redirige (origen "miembro" o
  // "caja", ver más abajo) — el formulario sigue montado en la misma
  // página, así que el éxito viaja por acá en vez de por ?ok= en la URL.
  ok?: string;
  // Fecha real de fin de ciclo tras el pago (ISO) — solo presente junto
  // con `ok`. La usa el Paso 4 del modal de Caja para mostrar la fecha de
  // vencimiento resultante sin recalcularla en el cliente.
  fechaFinCiclo?: string;
}

export async function registrarPagoAction(
  _estadoPrevio: EstadoFormularioPago,
  formData: FormData
): Promise<EstadoFormularioPago> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const miembroId = formData.get("miembroId")?.toString();
  const planId = formData.get("planId")?.toString();
  const lineasRaw = formData.get("lineas")?.toString();
  const origen = formData.get("origen")?.toString();
  // Fecha del pago (yyyy-mm-dd), para registrar un pago con fecha pasada.
  // Vacía = hoy. Se toma al mediodía para no caer en el día anterior por zona horaria.
  const fechaPagoTexto = formData.get("fechaPago")?.toString();
  // Sede elegida en el selector "Sede del pago" (ver SelectorMetodoPago);
  // si no vino (formularios viejos o sin selector visible), se cae a la
  // sede activa de la sesión.
  const sucursalIdPago = formData.get("sucursalIdPago")?.toString() || sucursalActivaId;

  if (!miembroId || !planId || !lineasRaw) {
    return { error: "Miembro, plan y al menos un método de pago son requeridos." };
  }
  if (!sucursalIdPago) {
    return { error: "No se pudo determinar en qué sucursal se registra el pago." };
  }

  let lineas: Array<{
    monto: number;
    metodo: string;
    metodoPagoId: string | null;
    numeroOperacion: string | null;
  }>;
  try {
    lineas = JSON.parse(lineasRaw);
  } catch {
    return { error: "No se pudo interpretar la información del pago." };
  }
  if (!Array.isArray(lineas) || lineas.length === 0) {
    return { error: "Agrega al menos una línea de pago." };
  }
  // Un plan de cortesía (S/ 0) no tiene nada que cobrar — el método de pago
  // solo es obligatorio cuando hay un monto real de por medio (ver diseño
  // acordado, membresías con beneficio que no pagan en el gym). Se permite
  // la única excepción de una sola línea en $0 (pago de cortesía); toda
  // otra línea necesita monto > 0 y método elegido.
  const esCortesia = lineas.length === 1 && lineas[0].monto === 0;
  if (!esCortesia && lineas.some((linea) => linea.monto <= 0 || !linea.metodo || !linea.metodoPagoId)) {
    return { error: "Cada línea del pago necesita un monto mayor a S/ 0 y un método." };
  }

  // Pago combinado (más de una línea): el cliente gatea el envío en que la
  // suma coincida con el monto objetivo, pero el servidor nunca recibía ese
  // objetivo — un FormData armado a mano podía mandar líneas que no suman lo
  // acordado. Solo aplica cuando montoObjetivo viene en el POST (combinado);
  // total/abono siguen sin mandarlo... salvo que el campo del wizard ya lo
  // postea siempre, así que esto también protege esos flujos sin cambiar su
  // comportamiento (la única línea ya suma exactamente montoObjetivo).
  const montoObjetivoRaw = formData.get("montoObjetivo")?.toString();
  if (lineas.length > 1 && montoObjetivoRaw) {
    const montoObjetivo = Number(montoObjetivoRaw);
    const sumaLineas = lineas.reduce((suma, linea) => suma + linea.monto, 0);
    if (!Number.isNaN(montoObjetivo) && Math.abs(sumaLineas - montoObjetivo) >= 0.01) {
      return { error: "La suma de las líneas no coincide con el monto a pagar." };
    }
  }

  let pagos;
  try {
    const dependencias = (cliente: PrismaClientOrTx) => ({
      pagos: new PrismaPagoRepository(cliente),
      suscripciones: new PrismaSuscripcionRepository(cliente),
      miembros: new PrismaMemberRepository(cliente),
      planes: new PrismaPlanRepository(cliente),
      sucursales: new PrismaSucursalRepository(cliente),
      reglasAbono: new PrismaReglaAbonoRepository(prisma),
    });
    const datosPago = {
      organizacionId: usuario.organizacionId,
      miembroId,
      planId,
      lineas: lineas.map((linea) => ({ ...linea, metodo: linea.metodo || "Cortesía" })),
      sucursalId: sucursalIdPago,
      registradoPorId: usuario.id,
      ...(fechaPagoTexto ? { fechaPago: new Date(`${fechaPagoTexto}T12:00:00`) } : {}),
      // Si pagó de más: guardar el sobrante como saldo a favor (si no, es de otro cobro y solo queda registrado).
      excedenteASaldoAFavor: formData.get("excedenteSaldo")?.toString() === "1",
      // Meses que cubre el pago (1 a 6); el dominio valida el rango.
      meses: Number(formData.get("meses")?.toString() || 1),
    };

    pagos = await registrarPago(dependencias(prisma), datosPago);
  } catch (error) {
    if (
      error instanceof MiembroNoEncontradoError ||
      error instanceof MiembroFueraDeSucursalError ||
      error instanceof PlanNoEncontradoError ||
      error instanceof PlanInactivoError ||
      error instanceof MontoInvalidoError ||
      error instanceof LineasDePagoInvalidasError ||
      error instanceof AbonoNoPermitidoError ||
      error instanceof AbonoMenorAlMinimoError ||
      error instanceof FechaPagoInvalidaError ||
      error instanceof MesesInvalidosError ||
      error instanceof MesesRequierenPagoCompletoError ||
      error instanceof MesesNoDisponiblesError
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

  // Todas las líneas de un mismo envío comparten fechaFinCiclo — cualquiera
  // sirve para mostrarla en el Paso 4 del wizard.
  return { ok: "Pago registrado.", fechaFinCiclo: pagos[0]?.fechaFinCiclo?.toISOString() };
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
