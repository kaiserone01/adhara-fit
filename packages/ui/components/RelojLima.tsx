"use client";

import { useEffect, useState } from "react";

// Reloj en vivo con la hora de Lima (America/Lima, formato es-PE), visible en una esquina de todo el panel
// administrativo. Es solo informativo: la hora que usa el sistema la fija el servidor (TZ=America/Lima).
export function RelojLima() {
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    setAhora(new Date());
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  // Antes del primer render en el cliente `ahora` es null (evita mismatch de hidratación).
  if (!ahora) return null;

  return (
    <div
      className="fixed right-4 top-4 z-40 flex lg:left-1/2 lg:right-auto lg:-translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2 text-xs font-medium shadow-sm print:hidden"
      style={{ background: "var(--gx-surface)", borderColor: "var(--gx-edge)", color: "var(--gx-ink)" }}
    >
      <span>{ahora.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Lima" })}</span>
    </div>
  );
}
