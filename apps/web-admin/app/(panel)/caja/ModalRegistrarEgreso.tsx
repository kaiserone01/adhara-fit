"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { CurrencyInput } from "@gym-app/ui/components/CurrencyInput";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { EstadoRegistrarEgreso } from "./actions";

// Los "value" deben coincidir exactamente con el snapshot que construirNombreMetodo() genera para
// MetodoPago.tipo === "EFECTIVO" (ver configuraciones/metodosPagoUI.ts) — es el mismo formato que usan los
// Pagos en efectivo, así un retiro de caja resta de la misma línea del arqueo donde se suman esos pagos
// (ver ObtenerResumenTurno).
const METODOS_EGRESO = [{ value: "Efectivo", label: "Efectivo" }];

// Antes vivía siempre visible como un formulario grande en la pantalla de
// Caja (ver diseño acordado: "Registrar egreso" ocupaba mucho espacio). Se
// convierte en modal, mismo patrón que ModalRegistrarPagoCaja — un botón
// chico en la barra de acciones lo abre.
export function ModalRegistrarEgreso({
  accion,
  turnoId,
  onCerrar,
}: {
  accion: (estado: EstadoRegistrarEgreso, formData: FormData) => Promise<EstadoRegistrarEgreso>;
  turnoId: string;
  onCerrar: () => void;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const { mostrarExito, mostrarError } = useFeedback();

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error, no a mostrarError
  }, [estado.error]);

  useEffect(() => {
    if (estado.ok) {
      mostrarExito(estado.ok);
      onCerrar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.ok, no a mostrarExito/onCerrar
  }, [estado.ok]);

  const [metodo, setMetodo] = useState(METODOS_EGRESO[0].value);
  const [monto, setMonto] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, black 60%, transparent)" }}
      onClick={onCerrar}
    >
      <div
        className="marca-agua-modal flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl border-2 p-6"
        style={{ borderColor: "var(--gx-accent)", background: "var(--gx-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold" style={{ color: "var(--gx-ink)" }}>
          Registrar egreso
        </h3>

        <form action={enviar} className="mt-4 flex flex-col gap-3">
          {estado.error && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: "color-mix(in srgb, var(--gx-bad) 15%, transparent)", color: "var(--gx-bad)" }}
            >
              {estado.error}
            </p>
          )}

          <input type="hidden" name="turnoId" value={turnoId} />

          <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
            Método
            <select
              name="metodo"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="min-h-11 rounded-lg border px-3 gx-campo"
            >
              {METODOS_EGRESO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <CurrencyInput name="monto" label="Monto" required value={monto} onChange={setMonto} />
          <Input name="motivo" label="Motivo" required />

          <div className="mt-2 flex gap-3">
            <Button type="button" variant="secundario" className="flex-1" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="peligro" type="submit" className="flex-1" disabled={enviando}>
              {enviando ? "Registrando..." : "Registrar egreso"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
