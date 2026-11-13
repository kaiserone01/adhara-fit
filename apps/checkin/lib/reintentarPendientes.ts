import { registrarCheckIn, ErrorCheckIn } from "./api";
import { listarPendientes, quitarPendiente } from "./colaPendientes";

// Reintenta cada pendiente en orden de encolado. Si uno falla de nuevo por
// red, se corta ahí mismo — la red probablemente sigue caída, no tiene
// sentido seguir intentando los siguientes en esta pasada (se reintentará
// en el próximo evento "online"). Si el servidor SÍ responde (aunque sea
// con un error, ej. identificador que ya no existe), se descarta igual: ya
// obtuvo una respuesta real, reintentar no la va a cambiar. Excepciones: 401 y 429, que se conservan.
export function reintentarPendientes(apiKey: string): Promise<void> {
  // Una sola pasada a la vez: el temporizador y el evento "online" pueden coincidir y reenviarían la misma identificador dos veces.
  enCurso ??= pasada(apiKey).finally(() => {
    enCurso = null;
  });
  return enCurso;
}

let enCurso: Promise<void> | null = null;

async function pasada(apiKey: string): Promise<void> {
  const pendientes = await listarPendientes();

  for (const pendiente of pendientes) {
    try {
      await registrarCheckIn(apiKey, pendiente.identificador);
      await quitarPendiente(pendiente.id);
    } catch (error) {
      if (error instanceof ErrorCheckIn) {
        // 401 (clave mal configurada) y 429 (bloqueo por intentos): el pendiente no se pierde, se reintenta luego.
        if (error.status === 401 || error.status === 429) return;
        await quitarPendiente(pendiente.id);
        continue;
      }
      return;
    }
  }
}
