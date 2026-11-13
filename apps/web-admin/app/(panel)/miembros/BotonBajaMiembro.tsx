"use client";

import { useState, useTransition } from "react";
import { Trash, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@gym-app/ui/components/Button";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { eliminarMiembroAction, restaurarMiembroAction } from "./actions";

const MAX_MOTIVO = 200;

/**
 * «Eliminar» (baja lógica, S-09) y «Restaurar» de un socio, con una confirmación y un motivo opcional.
 * Eliminar no borra nada: el socio deja de aparecer y sus pagos y datos se conservan.
 */
export function BotonBajaMiembro({ id, nombre, accion }: { id: string; nombre: string; accion: "eliminar" | "restaurar" }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, iniciarTransicion] = useTransition();
  const { mostrarError } = useFeedback();
  const eliminar = accion === "eliminar";

  function confirmar() {
    iniciarTransicion(async () => {
      // Si sale bien, la acción redirige; si no, devuelve el mensaje de error.
      const resultado = await (eliminar ? eliminarMiembroAction(id, motivo) : restaurarMiembroAction(id, motivo));
      if (resultado?.error) mostrarError(resultado.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
        style={eliminar ? { color: "var(--gx-bad)", borderColor: "var(--gx-bad)" } : { color: "var(--gx-accent)", borderColor: "var(--gx-accent)" }}
      >
        {eliminar ? <Trash size={16} weight="bold" /> : <ArrowCounterClockwise size={16} weight="bold" />}
        {eliminar ? "Eliminar" : "Restaurar"}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, black 60%, transparent)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 p-6"
            style={{ borderColor: eliminar ? "var(--gx-bad)" : "var(--gx-accent)", background: "var(--gx-surface)" }}
          >
            <h3 className="text-lg font-bold" style={{ color: "var(--gx-ink)" }}>
              {eliminar ? `¿Eliminar a ${nombre}?` : `¿Restaurar a ${nombre}?`}
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--gx-muted)" }}>
              {eliminar
                ? "El socio dejará de aparecer en los listados, en los cobros y en el kiosco. Sus pagos y sus datos se conservan, y podrás restaurarlo desde «Eliminados»."
                : "El socio volverá a aparecer en los listados y podrá registrar su asistencia. Conserva su plan y su vencimiento tal como estaban."}
            </p>
            <label className="mt-4 flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
              Motivo (opcional)
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={MAX_MOTIVO}
                rows={2}
                className="rounded-lg border px-3 py-2 gx-campo"
              />
            </label>
            <div className="mt-4 flex gap-3">
              <Button type="button" variant="secundario" className="flex-1" onClick={() => setAbierto(false)} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="button" variant={eliminar ? "peligro" : "primario"} className="flex-1" onClick={confirmar} disabled={enviando}>
                {enviando ? "Guardando..." : eliminar ? "Sí, eliminar" : "Sí, restaurar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
