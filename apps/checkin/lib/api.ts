import { segundosDeEspera } from "./esperaBloqueo";

const TIMEOUT_CHECKIN_MS = 10_000;

// URL base de web-admin: la fija la pantalla al arrancar con la de checkin-config.json (ver lib/config.ts).
let urlApi = "";
export function fijarUrlApi(url: string): void {
  urlApi = url;
}

export type EstadoCheckIn = "activo" | "vencido" | "sucursal_incorrecta";

export interface ResultadoCheckIn {
  nombre: string;
  fotoUrl: string | null;
  entrenador: string | null;
  // ISO 8601 (viaja como JSON); null si el miembro no tiene vencimiento registrado.
  fechaVencimiento: string | null;
  estado: EstadoCheckIn;
  sucursalAsignadaNombre: string;
  sucursalAsignadaDireccion: string | null;
  // Opcional: un API viejo no lo envía (el checkin lo trata como "no es cumpleaños").
  esCumpleanos?: boolean;
}

// Se lanza cuando el servidor SÍ respondió, pero con un error (401/400/404/500).
// Reintentar esto no cambia nada — nunca se encola en la cola offline.
export class ErrorCheckIn extends Error {
  constructor(
    message: string,
    public status: number,
    // Solo en un 429: segundos que el servidor pide esperar (Retry-After).
    public reintentarEnSegundos?: number
  ) {
    super(message);
  }
}

// Si la red falla del todo, fetch nativo lanza un TypeError (no llega a
// haber respuesta) — eso es lo que distingue "sin conexión, reintentar
// después" (no se lanza ErrorCheckIn) de "el servidor respondió que no"
// (se lanza ErrorCheckIn, no es reintentable).
export async function registrarCheckIn(apiKey: string, identificador: string): Promise<ResultadoCheckIn> {
  if (!urlApi) {
    throw new ErrorCheckIn("La URL del servidor no está configurada en este APK.", 0);
  }

  // Sin respuesta en 10 s se aborta: el AbortError no es ErrorCheckIn, así que cuenta como "sin conexión".
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_CHECKIN_MS);
  let respuesta: Response;
  let datos: { error?: string };
  try {
    respuesta = await fetch(`${urlApi}/api/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Checkin-Api-Key": apiKey,
      },
      body: JSON.stringify({ identificador }),
      signal: controlador.signal,
    });
    datos = await respuesta.json().catch(() => ({}));
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    const espera = respuesta.status === 429 ? segundosDeEspera(respuesta.headers.get("Retry-After")) : undefined;
    throw new ErrorCheckIn(datos.error ?? `Error ${respuesta.status} al registrar el check-in.`, respuesta.status, espera);
  }

  return datos as ResultadoCheckIn;
}

// Sede y configuración del reposo (GET /api/checkin/estado).
export interface InfoCheckin {
  sucursalNombre: string;
  // Configuración hecha desde el menú Checkin del panel; ausente en un API viejo.
  reposo?: { frases: string[]; imagenUrl: string | null; opacidad: number };
}

export async function obtenerInfoCheckin(apiKey: string): Promise<InfoCheckin> {
  if (!urlApi) {
    throw new ErrorCheckIn("La URL del servidor no está configurada en este APK.", 0);
  }

  const respuesta = await fetch(`${urlApi}/api/checkin/estado`, { headers: { "X-Checkin-Api-Key": apiKey } });
  if (!respuesta.ok) {
    throw new ErrorCheckIn(`Error ${respuesta.status} al leer el estado del checkin.`, respuesta.status);
  }

  return (await respuesta.json()) as InfoCheckin;
}
