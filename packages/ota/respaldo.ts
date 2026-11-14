/**
 * Lee un JSON de configuración empaquetado en el APK (checkin-config.json / vitrina-config.json) y guarda una copia en
 * localStorage. Cuando la interfaz se actualiza por OTA, el bundle nuevo no trae ese archivo (lleva la clave y no se
 * publica), así que se usa la copia guardada. El origen del WebView es el mismo antes y después de actualizar.
 */
const PREFIJO = "adhara-config:";

function guardar(ruta: string, texto: string): void {
  try {
    localStorage.setItem(PREFIJO + ruta, texto);
  } catch {
    // Sin almacenamiento: se seguirá leyendo el archivo del bundle.
  }
}

function leerGuardado(ruta: string): string | null {
  try {
    return localStorage.getItem(PREFIJO + ruta);
  } catch {
    return null;
  }
}

export async function cargarJsonConRespaldo(ruta: string): Promise<unknown> {
  try {
    const respuesta = await fetch(ruta, { cache: "no-store" });
    if (respuesta.ok) {
      const texto = await respuesta.text();
      const datos: unknown = JSON.parse(texto);
      guardar(ruta, texto);
      return datos;
    }
  } catch {
    // Cae a la copia guardada.
  }
  const copia = leerGuardado(ruta);
  if (copia === null) throw new Error(`Falta ${ruta} en el bundle.`);
  return JSON.parse(copia);
}
