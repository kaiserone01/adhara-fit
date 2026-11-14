import { cargarJsonConRespaldo } from "@gym-app/ota/respaldo";

export interface ConfigVitrina {
  apiUrl: string;
  clave: string;
}

// Clave de la sede en el fragmento de la URL (`#clave=<codificada>`): solo para la vista previa en navegador, donde la
// imagen estática no lleva clave. El fragmento no llega al servidor ni a sus logs.
export function claveDeFragmento(hash: string): string {
  return new URLSearchParams(hash.replace(/^#/, "")).get("clave")?.trim() ?? "";
}

// La URL de web-admin y la clave de la sede las escribe apps/vitrina-tv/capacitor/scripts/preparar.mjs en
// vitrina-config.json dentro del bundle del APK. En la vista previa (apps/vitrina/Dockerfile) el contenedor escribe el
// archivo al arrancar con VITRINA_API_URL y clave vacía, y la clave se toma del fragmento.
export const RUTA_CONFIG = "/vitrina-config.json";

export async function cargarConfig(): Promise<ConfigVitrina> {
  // Tras una actualización OTA el bundle nuevo no trae el archivo: se usa la copia guardada.
  const datos = await cargarJsonConRespaldo(RUTA_CONFIG);
  const { apiUrl, clave } = (datos ?? {}) as Partial<ConfigVitrina>;
  if (typeof apiUrl !== "string" || !apiUrl || typeof clave !== "string") throw new Error("vitrina-config.json no es válido.");
  return { apiUrl: apiUrl.replace(/\/+$/, ""), clave: clave || claveDeFragmento(window.location.hash) };
}
