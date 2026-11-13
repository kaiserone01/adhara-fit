"use client";

import { useTransition } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { anularPagoAction } from "./actions";

export function BotonAnularCobro({ pagoId, descripcion }: { pagoId: string; descripcion: string }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const { mostrarExito, mostrarError } = useFeedback();

  function anular() {
    const motivo = window.prompt(`Motivo para anular el cobro de ${descripcion}:`);
    if (motivo === null) return;
    const datos = new FormData();
    datos.set("pagoId", pagoId);
    datos.set("motivo", motivo);
    iniciarTransicion(async () => {
      const resultado = await anularPagoAction({}, datos);
      if (resultado.error) mostrarError(resultado.error);
      else if (resultado.ok) mostrarExito(resultado.ok);
    });
  }

  return (
    <Button type="button" variant="peligro" className="min-h-9 px-3 py-1.5 text-xs" disabled={pendiente} onClick={anular}>
      {pendiente ? "Anulando..." : "Anular"}
    </Button>
  );
}
