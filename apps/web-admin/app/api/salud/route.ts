// GET /api/salud — estado del sistema, público y sin sesión (para el monitor y el healthcheck del despliegue, S-17).
// Responde solo cinco campos: estado, db, ultimoRespaldoHoras, ultimaRestauracionDias y version.
// Los controles de respaldo solo se aplican si RESPALDO_ESTADO_ARCHIVO apunta al archivo que escribe el trabajo
// de respaldo; sin él, el respaldo se trata como «no configurado» y no puede tirar el estado.
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluarSalud, leerEstadoRespaldo } from "@gym-app/domain/utils/estadoSalud";

export const dynamic = "force-dynamic";

const ESPERA_DB_MS = 2_000;
const INICIO_PROCESO = new Date(Date.now() - process.uptime() * 1000);

async function baseResponde(): Promise<boolean> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("tiempo agotado")), ESPERA_DB_MS)),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function leerArchivoEstado(ruta: string): Promise<string | null> {
  try {
    return await readFile(ruta, "utf8");
  } catch {
    return null;
  }
}

export async function GET() {
  const archivo = process.env.RESPALDO_ESTADO_ARCHIVO?.trim();
  const [dbOk, contenido] = await Promise.all([baseResponde(), archivo ? leerArchivoEstado(archivo) : Promise.resolve(null)]);
  const { ultimoRespaldo, ultimaRestauracion } = leerEstadoRespaldo(contenido);

  const { codigoHttp, cuerpo } = evaluarSalud({
    dbOk,
    respaldosConfigurados: !!archivo,
    ultimoRespaldo,
    ultimaRestauracion,
    procesoIniciado: INICIO_PROCESO,
    ahora: new Date(),
    version: process.env.APP_VERSION?.trim() || "desconocida",
  });

  return NextResponse.json(cuerpo, { status: codigoHttp, headers: { "Cache-Control": "no-store" } });
}
