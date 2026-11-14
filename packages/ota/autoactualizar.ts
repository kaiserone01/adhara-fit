import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import {
  hayVersionNueva,
  puedeIntentar,
  urlDelZip,
  validarManifiesto,
  versionDeBundle,
  type ConfigActualizaciones,
} from "./manifiesto";

const CADA_MS = 30 * 60 * 1000;
const PRIMERA_REVISION_MS = 15 * 1000;
// No se reinicia la interfaz mientras alguien la está usando.
const INACTIVIDAD_MS = 20 * 1000;
const CLAVE_INTENTOS = "adhara-ota-intentos:";
// Último estado de la autoactualización, para que la etiqueta de versión lo muestre si algo falla (EtiquetaVersion).
export const CLAVE_ESTADO = "adhara-ota-estado";
export const EVENTO_ESTADO = "adhara-ota-estado";

export function anotarEstado(texto: string): void {
  try {
    localStorage.setItem(CLAVE_ESTADO, texto.slice(0, 60));
    window.dispatchEvent(new Event(EVENTO_ESTADO));
  } catch {
    // Sin almacenamiento: solo se pierde el aviso.
  }
}

function intentosDe(versionCode: number): number {
  try {
    return Number(localStorage.getItem(CLAVE_INTENTOS + versionCode)) || 0;
  } catch {
    return 0;
  }
}

function sumarIntento(versionCode: number): void {
  try {
    localStorage.setItem(CLAVE_INTENTOS + versionCode, String(intentosDe(versionCode) + 1));
  } catch {
    // Sin almacenamiento no se puede limitar: el plugin igual vuelve atrás si el bundle no arranca.
  }
}

function esperarInactividad(): Promise<void> {
  return new Promise((resolver) => {
    let ultima = Date.now();
    const marcar = () => {
      ultima = Date.now();
    };
    const eventos = ["keydown", "pointerdown", "touchstart"] as const;
    for (const e of eventos) window.addEventListener(e, marcar, true);
    const timer = setInterval(() => {
      if (Date.now() - ultima < INACTIVIDAD_MS) return;
      clearInterval(timer);
      for (const e of eventos) window.removeEventListener(e, marcar, true);
      resolver();
    }, 2000);
  });
}

async function leerManifiesto(base: string) {
  const respuesta = await CapacitorHttp.get({ url: `${base}/latest.json?t=${Date.now()}`, connectTimeout: 10000, readTimeout: 10000 });
  if (respuesta.status !== 200) return null;
  const datos: unknown = typeof respuesta.data === "string" ? JSON.parse(respuesta.data) : respuesta.data;
  return validarManifiesto(datos);
}

async function limpiarBundlesViejos(idActual: string): Promise<void> {
  const { bundles } = await CapacitorUpdater.list();
  for (const b of bundles) {
    if (b.id !== idActual && b.id !== "builtin") await CapacitorUpdater.delete({ id: b.id }).catch(() => undefined);
  }
}

async function revisar(config: ConfigActualizaciones): Promise<void> {
  const { bundle } = await CapacitorUpdater.current();
  const actual = versionDeBundle(bundle.version, config.versionCode);
  const manifiesto = await leerManifiesto(config.url);
  if (!manifiesto) {
    anotarEstado("sin manifiesto");
    return;
  }
  if (!hayVersionNueva(actual, manifiesto.versionCode)) {
    anotarEstado("al día");
    return;
  }
  if (!puedeIntentar(intentosDe(manifiesto.versionCode))) {
    anotarEstado(`falló ${manifiesto.versionName}`);
    return;
  }
  sumarIntento(manifiesto.versionCode);
  anotarEstado(`descargando ${manifiesto.versionName}`);
  const descargado = await CapacitorUpdater.download({
    url: urlDelZip(config.url, manifiesto.zip),
    version: manifiesto.versionName,
    checksum: manifiesto.sha256,
  });
  anotarEstado(`lista ${manifiesto.versionName}`);
  await esperarInactividad();
  // Recarga la interfaz con el bundle nuevo. Si no arranca, el plugin vuelve solo al anterior.
  await CapacitorUpdater.set({ id: descargado.id });
}

/**
 * Autoactualización de la interfaz del APK (Capgo en modo manual, sin su nube). Se llama una vez al arrancar la app.
 * Devuelve la función que detiene las revisiones. En el navegador no hace nada.
 */
export function iniciarActualizador(config: ConfigActualizaciones): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  let detenido = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const ciclo = async () => {
    if (detenido) return;
    try {
      await revisar(config);
    } catch (causa) {
      // Sin internet o servidor caído: se reintenta en el siguiente ciclo y la app sigue como está.
      anotarEstado(`error: ${causa instanceof Error ? causa.message : "desconocido"}`);
    }
    if (!detenido) timer = setTimeout(ciclo, CADA_MS);
  };

  void (async () => {
    // Confirma que este bundle arrancó bien; sin esto el plugin lo da por malo y vuelve al anterior.
    try {
      const { bundle } = await CapacitorUpdater.notifyAppReady();
      await limpiarBundlesViejos(bundle.id);
    } catch {
      // El plugin no está disponible: nada que actualizar.
      anotarEstado("sin plugin");
      return;
    }
    anotarEstado("iniciada");
    if (!detenido) timer = setTimeout(ciclo, PRIMERA_REVISION_MS);
  })();

  return () => {
    detenido = true;
    if (timer) clearTimeout(timer);
  };
}
