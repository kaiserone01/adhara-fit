import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { porcentajeSeguro, type EstadoArranque } from "./arranque";
import {
  hayVersionNueva,
  puedeIntentar,
  urlDelZip,
  validarManifiesto,
  versionDeBundle,
  type ConfigActualizaciones,
} from "./manifiesto";

// Se busca una sola vez, al abrir la app. Tiempos máximos para que una red lenta no deje la TV esperando.
const LIMITE_BUSCAR_MS = 8_000;
const LIMITE_DESCARGAR_MS = 120_000;
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

function conLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const timer = setTimeout(() => rechazar(new Error("tiempo agotado")), ms);
    promesa.then(
      (valor) => {
        clearTimeout(timer);
        resolver(valor);
      },
      (error: unknown) => {
        clearTimeout(timer);
        rechazar(error);
      }
    );
  });
}

async function leerManifiesto(base: string) {
  const respuesta = await CapacitorHttp.get({ url: `${base}/latest.json?t=${Date.now()}`, connectTimeout: 6000, readTimeout: 6000 });
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

/**
 * Confirma al plugin que este bundle arrancó bien (sin esto, a los 10 s lo da por malo y vuelve al anterior) y borra
 * los bundles viejos. Devuelve false si el plugin no está disponible (navegador).
 */
export async function confirmarArranque(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { bundle } = await CapacitorUpdater.notifyAppReady();
    await limpiarBundlesViejos(bundle.id);
    return true;
  } catch {
    anotarEstado("sin plugin");
    return false;
  }
}

/**
 * Busca una actualización de la interfaz al abrir la app y, si hay, la descarga y la instala mostrando el progreso por
 * `alEstado`. Termina (resuelve) cuando la app puede arrancar: ya está actualizada, no se pudo buscar o falló la
 * instalación. Si instala, el plugin recarga la interfaz y esta promesa no vuelve a resolverse. Plugin Capgo en modo
 * manual, sin su nube.
 */
export async function buscarEInstalar(config: ConfigActualizaciones, alEstado: (estado: EstadoArranque) => void): Promise<void> {
  alEstado({ fase: "buscando" });
  let manifiesto;
  let actual: number;
  try {
    const { bundle } = await CapacitorUpdater.current();
    actual = versionDeBundle(bundle.version, config.versionCode);
    manifiesto = await conLimite(leerManifiesto(config.url), LIMITE_BUSCAR_MS);
  } catch (causa) {
    anotarEstado(`error: ${causa instanceof Error ? causa.message : "desconocido"}`);
    alEstado({ fase: "sin-conexion" });
    return;
  }
  if (!manifiesto) {
    anotarEstado("sin manifiesto");
    alEstado({ fase: "sin-conexion" });
    return;
  }
  if (!hayVersionNueva(actual, manifiesto.versionCode)) {
    anotarEstado("al día");
    alEstado({ fase: "al-dia" });
    return;
  }
  const version = manifiesto.versionName;
  if (!puedeIntentar(intentosDe(manifiesto.versionCode))) {
    anotarEstado(`falló ${version}`);
    alEstado({ fase: "error-instalar", version });
    return;
  }

  sumarIntento(manifiesto.versionCode);
  alEstado({ fase: "descargando", version, porcentaje: 0 });
  try {
    const escucha = await CapacitorUpdater.addListener("updaterEvent", (evento) => {
      if (evento.type === "download") alEstado({ fase: "descargando", version, porcentaje: porcentajeSeguro(evento.data.percent) });
    });
    let descargado;
    try {
      descargado = await conLimite(
        CapacitorUpdater.download({ url: urlDelZip(config.url, manifiesto.zip), version, checksum: manifiesto.sha256 }),
        LIMITE_DESCARGAR_MS
      );
    } finally {
      await escucha.remove();
    }
    anotarEstado(`instalando ${version}`);
    alEstado({ fase: "instalando", version });
    // Recarga la interfaz con el bundle nuevo. Si no arranca, el plugin vuelve solo al anterior.
    await CapacitorUpdater.set({ id: descargado.id });
  } catch (causa) {
    anotarEstado(`error: ${causa instanceof Error ? causa.message : "desconocido"}`);
    alEstado({ fase: "error-instalar", version });
  }
}
