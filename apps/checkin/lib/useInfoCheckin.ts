import { useEffect, useState } from "react";
import { obtenerInfoCheckin, type InfoCheckin } from "./api";

const CLAVE_STORAGE = "checkin_info";
const REFRESCO_MS = 30_000;

// Sede, tasa y configuración del reposo (frases, imagen, opacidad). Se guarda la última respuesta en localStorage para que el reposo se vea
// completo aunque el checkin arranque sin red; si no hay nada guardado devuelve null y el reposo
// muestra "—".
export function useInfoCheckin(apiKey: string | null): InfoCheckin | null {
  const [info, setInfo] = useState<InfoCheckin | null>(null);

  useEffect(() => {
    if (!apiKey) return;

    try {
      const guardada = window.localStorage.getItem(CLAVE_STORAGE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lee localStorage tras el montaje (SSR-safe, export estático)
      if (guardada) setInfo(JSON.parse(guardada) as InfoCheckin);
    } catch {
      // localStorage bloqueado o JSON dañado: se ignora y se espera a la red.
    }

    let activo = true;
    const refrescar = () => {
      obtenerInfoCheckin(apiKey)
        .then((nueva) => {
          if (!activo) return;
          setInfo(nueva);
          try {
            window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(nueva));
          } catch {
            // sin almacenamiento: solo se pierde el respaldo sin red.
          }
        })
        .catch(() => {
          // sin red o API vieja: se conserva lo que ya hay.
        });
    };

    refrescar();
    const temporizador = setInterval(refrescar, REFRESCO_MS);
    return () => {
      activo = false;
      clearInterval(temporizador);
    };
  }, [apiKey]);

  return info;
}
