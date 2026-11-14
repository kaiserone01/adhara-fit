// Configuración del Check-in Module. No hay servicio web propio: la interfaz va empaquetada en el APK y habla con web-admin.
// La URL de web-admin y la clave (CHECKIN_CLAVE) las escribe apps/checkin-tv/capacitor/scripts/preparar.mjs en
// checkin-config.json dentro del bundle del APK. Mismo esquema que la vitrina (apps/vitrina/lib/config.ts).
import { cargarJsonConRespaldo } from "@gym-app/ota/respaldo";

export interface ConfigCheckin {
  apiUrl: string;
  clave: string;
}

const HOST_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?(\/|$)/;

export function validarConfig(datos: unknown): ConfigCheckin {
  const { apiUrl, clave } = (datos ?? {}) as Partial<Record<keyof ConfigCheckin, unknown>>;
  if (typeof apiUrl !== "string" || !apiUrl) throw new Error("checkin-config.json no tiene apiUrl.");
  if (typeof clave !== "string" || !clave) throw new Error("checkin-config.json no tiene clave.");
  // La clave viaja en cada petición: https salvo en una red local de desarrollo.
  if (!apiUrl.startsWith("https://") && !HOST_LOCAL.test(apiUrl)) {
    throw new Error("apiUrl debe empezar por https:// (http:// solo se admite en una red local de desarrollo).");
  }
  return { apiUrl: apiUrl.replace(/\/+$/, ""), clave };
}

export const RUTA_CONFIG = "/checkin-config.json";

// Tras una actualización OTA el bundle nuevo no trae el archivo: cargarJsonConRespaldo usa la copia guardada.
export async function cargarConfig(): Promise<ConfigCheckin> {
  return validarConfig(await cargarJsonConRespaldo(RUTA_CONFIG));
}
