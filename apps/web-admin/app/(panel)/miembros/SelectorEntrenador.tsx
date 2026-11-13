"use client";

import { useState } from "react";
import { Avatar } from "@gym-app/ui/components/Avatar";
import type { EntrenadorResumen } from "@gym-app/domain/entities/EntrenadorResumen";

const ESTILO_SELECCIONADO = {
  borderColor: "var(--gx-accent)",
  background: "color-mix(in srgb, var(--gx-accent) 12%, transparent)",
};

/**
 * Selector visual del entrenador (opcional): una tarjeta con avatar y nombre por entrenador. Al elegir uno, las demás se
 * ocultan y la elegida crece; desde ahí se puede cambiar (vuelven todas) o quitar (queda sin entrenador).
 */
export function SelectorEntrenador({
  entrenadores,
  valor,
  onCambio,
}: {
  entrenadores: EntrenadorResumen[];
  valor: string;
  onCambio: (id: string) => void;
}) {
  const [eligiendo, setEligiendo] = useState(false);
  const elegido = entrenadores.find((e) => e.id === valor) ?? null;
  const mostrarElegido = elegido !== null && !eligiendo;

  function elegir(id: string) {
    onCambio(id);
    setEligiendo(false);
  }

  return (
    <div className="mt-4 flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
      <input type="hidden" name="entrenadorId" value={valor} />
      <span>Entrenador (opcional)</span>

      {mostrarElegido ? (
        <div
          className="flex items-center gap-4 rounded-lg border-2 p-4"
          style={ESTILO_SELECCIONADO}
          aria-live="polite"
        >
          <Avatar fotoUrl={elegido.fotoUrl} nombre={elegido.nombre} tamano={72} />
          <span className="min-w-0 flex-1 text-lg font-semibold" style={{ color: "var(--gx-ink)" }}>
            {elegido.nombre}
          </span>
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={() => setEligiendo(true)}
              className="min-h-9 rounded-lg px-3 text-sm font-medium transition-colors active:scale-95"
              style={{ background: "var(--gx-surface-2)", color: "var(--gx-ink)" }}
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={() => elegir("")}
              className="min-h-9 rounded-lg px-3 text-sm font-medium transition-colors active:scale-95"
              style={{ color: "var(--gx-muted)" }}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : entrenadores.length === 0 ? (
        <span style={{ color: "var(--gx-muted-dim)" }}>No hay entrenadores activos.</span>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entrenadores.map((entrenador) => {
            const seleccionado = entrenador.id === valor;
            return (
              <button
                key={entrenador.id}
                type="button"
                onClick={() => elegir(seleccionado ? "" : entrenador.id)}
                aria-pressed={seleccionado}
                className="flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-colors duration-150 active:scale-[0.98]"
                style={seleccionado ? ESTILO_SELECCIONADO : { borderColor: "var(--gx-edge)" }}
              >
                <Avatar fotoUrl={entrenador.fotoUrl} nombre={entrenador.nombre} tamano={48} />
                <span className="text-sm font-medium leading-tight" style={{ color: "var(--gx-ink)" }}>
                  {entrenador.nombre}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
