"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@gym-app/ui/components/Button";
import { Badge } from "@gym-app/ui/components/Badge";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { ETIQUETA_ESTADO_CONSENTIMIENTO, type EstadoConsentimiento } from "@gym-app/domain/entities/Consentimiento";
import { registrarConsentimientoAction, revocarConsentimientoAction } from "./consentimientoActions";

const TONO: Record<EstadoConsentimiento, "verde" | "gris" | "ambar" | "rojo"> = {
  SIN_CONSENTIMIENTO: "ambar",
  VIGENTE: "verde",
  DESACTUALIZADO: "ambar",
  REVOCADO: "rojo",
};

/** Estado del consentimiento de datos personales del socio y acciones para registrarlo o revocarlo (S-13). */
export function PanelConsentimiento({
  miembroId,
  estado,
  hayTexto,
  detalle,
}: {
  miembroId: string;
  estado: EstadoConsentimiento;
  hayTexto: boolean;
  detalle: string | null;
}) {
  const router = useRouter();
  const { mostrarError } = useFeedback();
  const [enviando, iniciarTransicion] = useTransition();
  const [medio, setMedio] = useState("PANTALLA");
  const [revocando, setRevocando] = useState(false);
  const [motivo, setMotivo] = useState("");

  function ejecutar(tarea: () => Promise<{ error?: string }>) {
    iniciarTransicion(async () => {
      const r = await tarea();
      if (r.error) {
        mostrarError(r.error);
        return;
      }
      setRevocando(false);
      setMotivo("");
      router.refresh();
    });
  }

  const puedeRevocar = estado === "VIGENTE" || estado === "DESACTUALIZADO";
  const puedeRegistrar = hayTexto && estado !== "VIGENTE";

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--gx-edge)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium" style={{ color: "var(--gx-ink)" }}>
          Consentimiento de datos
        </span>
        <Badge tono={TONO[estado]}>{ETIQUETA_ESTADO_CONSENTIMIENTO[estado]}</Badge>
        {detalle && (
          <span className="text-xs" style={{ color: "var(--gx-muted)" }}>
            {detalle}
          </span>
        )}
      </div>

      {!hayTexto && estado !== "VIGENTE" && (
        <p className="text-xs" style={{ color: "var(--gx-muted)" }}>
          Todavía no hay un texto de consentimiento publicado (Configuraciones → Textos legales).
        </p>
      )}

      {puedeRegistrar && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            className="min-h-11 rounded-lg border px-3 gx-campo"
            aria-label="Cómo aceptó"
          >
            <option value="PANTALLA">En pantalla</option>
            <option value="PAPEL">En papel firmado</option>
          </select>
          <Button type="button" disabled={enviando} onClick={() => ejecutar(() => registrarConsentimientoAction(miembroId, medio))}>
            {enviando ? "Guardando..." : "Registrar aceptación"}
          </Button>
        </div>
      )}

      {puedeRevocar && !revocando && (
        <div>
          <Button type="button" variant="secundario" onClick={() => setRevocando(true)}>
            Revocar consentimiento
          </Button>
        </div>
      )}

      {revocando && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5" style={{ color: "var(--gx-muted)" }}>
            Motivo de la revocación
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={200}
              rows={2}
              className="rounded-lg border px-3 py-2 gx-campo"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="secundario" onClick={() => setRevocando(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="button" variant="peligro" disabled={enviando} onClick={() => ejecutar(() => revocarConsentimientoAction(miembroId, motivo))}>
              {enviando ? "Guardando..." : "Confirmar revocación"}
            </Button>
          </div>
          <p className="text-xs" style={{ color: "var(--gx-muted)" }}>
            Revocar no borra los datos del socio; solo deja constancia de que ya no hay consentimiento.
          </p>
        </div>
      )}
    </div>
  );
}
