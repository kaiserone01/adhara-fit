"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPagoRepository";
import { PrismaProductoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaProductoRepository";
import {
  venderProducto,
  ProductoNoEncontradoError,
  ProductoInactivoError,
  CantidadInvalidaError,
  SinProductosError,
} from "@gym-app/domain/use-cases/VenderProducto";
import { LineasDePagoInvalidasError, MontoLineasNoCubreObjetivoError } from "@gym-app/domain/entities/Pago";
import {
  anularPago,
  PagoNoEncontradoError,
  PagoYaAnuladoError,
  MotivoRequeridoError as MotivoRequeridoAnular,
} from "@gym-app/domain/use-cases/AnularPago";

export interface EstadoAnularPago {
  error?: string;
  ok?: string;
}

export async function anularPagoAction(
  _estadoPrevio: EstadoAnularPago,
  formData: FormData
): Promise<EstadoAnularPago> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const pagoId = formData.get("pagoId")?.toString();
  const motivo = formData.get("motivo")?.toString() ?? "";
  if (!pagoId) {
    return { error: "Pago inválido." };
  }

  try {
    await anularPago(
      {
        pagos: new PrismaPagoRepository(prisma),
      },
      { organizacionId: usuario.organizacionId, pagoId, anuladoPorId: usuario.id, motivo }
    );
  } catch (error) {
    if (
      error instanceof PagoNoEncontradoError ||
      error instanceof PagoYaAnuladoError ||
      error instanceof MotivoRequeridoAnular
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/cobros");
  revalidatePath("/pagos");
  return { ok: "Cobro anulado." };
}

export interface EstadoVenderProducto {
  error?: string;
  ok?: string;
}

// El carrito viaja como JSON en el campo "items": [{ productoId, cantidad }].
function leerItemsCarrito(formData: FormData): Array<{ productoId: string; cantidad: number }> | null {
  try {
    const items = JSON.parse(formData.get("items")?.toString() ?? "");
    if (
      !Array.isArray(items) ||
      items.some((i) => typeof i?.productoId !== "string" || typeof i?.cantidad !== "number")
    ) {
      return null;
    }
    return items;
  } catch {
    return null;
  }
}

export async function venderProductoAction(
  _estadoPrevio: EstadoVenderProducto,
  formData: FormData
): Promise<EstadoVenderProducto> {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const items = leerItemsCarrito(formData);
  const lineasRaw = formData.get("lineas")?.toString();
  if (!items || items.length === 0 || !lineasRaw) {
    return { error: "Elige al menos un producto y un método de pago." };
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
  if (!Array.isArray(lineas) || lineas.length === 0 || lineas.some((linea) => !linea.metodoPagoId)) {
    return { error: "Cada línea del pago necesita un monto y un método." };
  }

  try {
    await venderProducto(
      {
        pagos: new PrismaPagoRepository(prisma),
        productos: new PrismaProductoRepository(prisma),
      },
      {
        organizacionId: usuario.organizacionId,
        items,
        lineas,
        sucursalId: sucursalActivaId,
        registradoPorId: usuario.id,
      }
    );
  } catch (error) {
    if (
      error instanceof ProductoNoEncontradoError ||
      error instanceof ProductoInactivoError ||
      error instanceof CantidadInvalidaError ||
      error instanceof SinProductosError ||
      error instanceof LineasDePagoInvalidasError ||
      error instanceof MontoLineasNoCubreObjetivoError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/cobros");
  revalidatePath("/pagos");
  return { ok: "Venta registrada." };
}
