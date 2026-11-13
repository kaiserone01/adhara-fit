"use client";

import { useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@gym-app/ui/components/Button";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { eliminarMiembroAction } from "./actions";

const PALABRA_CONFIRMACION = "eliminar";

/**
 * Eliminación definitiva de un socio en un solo paso: se elige qué pasa con sus pagos y, para confirmar, se escribe la
 * palabra «eliminar». No hay bandeja de eliminados ni forma de deshacerlo.
 */
export function BotonBajaMiembro({ id, nombre }: { id: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [conPagos, setConPagos] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, iniciarTransicion] = useTransition();
  const { mostrarError } = useFeedback();
  const confirmado = texto.trim().toLowerCase() === PALABRA_CONFIRMACION;

  function cerrar() {
    setAbierto(false);
    setConPagos(false);
    setTexto("");
  }

  function confirmar() {
    if (!confirmado) return;
    iniciarTransicion(async () => {
      // Si sale bien, la acción redirige; si no, devuelve el mensaje de error.
      const resultado = await eliminarMiembroAction(id, conPagos, texto);
      if (resultado?.error) mostrarError(resultado.error);
    });
  }

  const opciones = [
    {
      conPagos: false,
      titulo: "Eliminar solo al socio",
      detalle: "Se borran sus datos, asistencias y plan. Sus pagos se conservan en caja e ingresos como «Socio eliminado».",
    },
    {
      conPagos: true,
      titulo: "Eliminar al socio y sus pagos",
      detalle: "Se borran también todos sus cobros: los ingresos de esas fechas bajarán y no podrás recuperarlos.",
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
        style={{ color: "var(--gx-bad)", borderColor: "var(--gx-bad)" }}
      >
        <Trash size={16} weight="bold" />
        Eliminar
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, black 60%, transparent)" }}
        >
          <div
            className="max-h-full w-full max-w-md overflow-auto rounded-2xl border-2 p-6"
            style={{ borderColor: "var(--gx-bad)", background: "var(--gx-surface)" }}
          >
            <h3 className="text-lg font-bold" style={{ color: "var(--gx-ink)" }}>
              ¿Eliminar a {nombre}?
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--gx-muted)" }}>
              Es definitivo: no hay forma de recuperarlo.
            </p>

            <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Qué se elimina">
              {opciones.map((opcion) => {
                const seleccionada = conPagos === opcion.conPagos;
                return (
                  <button
                    key={opcion.titulo}
                    type="button"
                    role="radio"
                    aria-checked={seleccionada}
                    onClick={() => setConPagos(opcion.conPagos)}
                    className="rounded-lg border-2 p-3 text-left transition-colors duration-150"
                    style={
                      seleccionada
                        ? { borderColor: "var(--gx-bad)", background: "color-mix(in srgb, var(--gx-bad) 12%, transparent)" }
                        : { borderColor: "var(--gx-edge)" }
                    }
                  >
                    <span className="block text-sm font-semibold" style={{ color: "var(--gx-ink)" }}>
                      {opcion.titulo}
                    </span>
                    <span className="mt-0.5 block text-xs" style={{ color: "var(--gx-muted)" }}>
                      {opcion.detalle}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-4 flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
              Escribe «{PALABRA_CONFIRMACION}» para confirmar
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="min-h-11 rounded-lg border px-3 gx-campo"
              />
            </label>

            <div className="mt-4 flex gap-3">
              <Button type="button" variant="secundario" className="flex-1" onClick={cerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="button" variant="peligro" className="flex-1" onClick={confirmar} disabled={enviando || !confirmado}>
                {enviando ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
