import { useEffect, useState } from "react";

const formatoHora = () => new Date().toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" });

// "" hasta montar: el export estático se prerenderiza en Node y la hora real no debe quedar
// horneada en el HTML.
export function useHoraActual(): string {
  const [hora, setHora] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reloj: se lee tras el montaje (SSR-safe)
    setHora(formatoHora());
    const temporizador = setInterval(() => setHora(formatoHora()), 15_000);
    return () => clearInterval(temporizador);
  }, []);

  return hora;
}

const formatoFecha = () => new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" });

// "" hasta montar (mismo motivo que la hora). Se refresca cada minuto para que cambie sola a medianoche.
export function useFechaActual(): string {
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reloj: se lee tras el montaje (SSR-safe)
    setFecha(formatoFecha());
    const temporizador = setInterval(() => setFecha(formatoFecha()), 60_000);
    return () => clearInterval(temporizador);
  }, []);

  return fecha;
}
