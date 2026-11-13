"use client";

import { useEffect, useState } from "react";

// Reloj en vivo con la hora de Lima (America/Lima, formato es-PE). Es solo informativo: la hora que usa el
// sistema la fija el servidor (TZ=America/Lima).
// - Por defecto es una píldora flotante en la esquina superior de la pantalla (así se usa en mobile).
// - Con `integrado` se dibuja en el flujo normal, como una etiqueta (así se usa en el encabezado del sidebar).
export function RelojLima({ integrado = false }: { integrado?: boolean }) {
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    setAhora(new Date());
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const texto = ahora?.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Lima" });

  if (integrado) {
    // Antes del primer render en el cliente `ahora` es null (evita mismatch de hidratación): se reserva la
    // altura de la etiqueta con un espacio para que el sidebar no salte.
    return (
      <div
        className="mt-1 rounded px-2 py-1 text-xs font-medium print:hidden"
        style={{ background: "var(--gx-surface-2)", color: "var(--gx-ink)" }}
      >
        {texto ?? " "}
      </div>
    );
  }

  // Antes del primer render en el cliente `ahora` es null (evita mismatch de hidratación).
  if (!ahora) return null;

  return (
    <div
      className="fixed right-4 top-4 z-40 flex lg:left-1/2 lg:right-auto lg:-translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2 text-xs font-medium shadow-sm print:hidden"
      style={{ background: "var(--gx-surface)", borderColor: "var(--gx-edge)", color: "var(--gx-ink)" }}
    >
      <span>{texto}</span>
    </div>
  );
}
