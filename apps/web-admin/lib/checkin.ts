// Utilidades de las rutas que consume el checkin (/api/checkin, /api/checkin/*).
//
// CORS: apps/checkin se sirve desde su propio origen, distinto al de apps/web-admin — el navegador
// del checkin hace peticiones cross-origin con un header custom (X-Checkin-Api-Key), lo que dispara un
// preflight OPTIONS. Es seguro permitir cualquier origen acá porque la autenticación real es el
// apiKey (un header que el navegador nunca adjunta automáticamente, a diferencia de una cookie) —
// sin conocerlo, ningún origen puede hacer nada.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CheckinTokenValidator } from "@gym-app/infrastructure/auth/CheckinTokenValidator";
import type { Sucursal } from "@gym-app/domain/entities/Sucursal";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Checkin-Api-Key",
  "Access-Control-Expose-Headers": "Retry-After",
};

export function jsonCheckin(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function opcionesCheckin() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// La sede única, si el header X-Checkin-Api-Key trae la clave CHECKIN_CLAVE del entorno (el sucursalId NO viaja
// en el body), o la respuesta 401 que la ruta debe devolver tal cual.
export async function sucursalDeCheckin(req: NextRequest): Promise<Sucursal | NextResponse> {
  const apiKey = req.headers.get("x-checkin-api-key");
  if (!apiKey) return jsonCheckin({ error: "Falta el header X-Checkin-Api-Key." }, 401);

  const sucursal = await new CheckinTokenValidator(prisma, process.env.CHECKIN_CLAVE).validar(apiKey);
  if (!sucursal) return jsonCheckin({ error: "Clave del check-in inválida." }, 401);

  return sucursal;
}
