// GET /api/checkin/estado — lo que el reposo del checkin muestra: sede, última tasa BCV y la configuración
// del reposo (frases, imagen y opacidad) hecha desde el menú Checkin del panel.
// Autenticado con la apiKey de la sucursal (ver lib/checkin.ts).
import { NextRequest, NextResponse } from "next/server";
import { jsonCheckin, opcionesCheckin, sucursalDeCheckin, tasaBcvParaCheckin } from "@/lib/checkin";

export async function OPTIONS() {
  return opcionesCheckin();
}

export async function GET(req: NextRequest) {
  try {
    const sucursal = await sucursalDeCheckin(req);
    if (sucursal instanceof NextResponse) return sucursal;

    return jsonCheckin(
      {
        sucursalNombre: sucursal.nombre,
        tasaBcv: await tasaBcvParaCheckin(),
        reposo: { frases: sucursal.reposoFrases, imagenUrl: sucursal.reposoImagenUrl, opacidad: sucursal.reposoOpacidad },
      },
      200
    );
  } catch (error) {
    console.error("Error en el estado del checkin:", error);
    return jsonCheckin({ error: "Error interno al leer el estado del checkin." }, 500);
  }
}
