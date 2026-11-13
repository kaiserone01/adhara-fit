"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card } from "@gym-app/ui/components/Card";
import { Avatar } from "@gym-app/ui/components/Avatar";
import { Badge } from "@gym-app/ui/components/Badge";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { Entrenador } from "@gym-app/domain/entities/Entrenador";
import { cambiarEstadoEntrenadorAction } from "./actions";

export function TarjetaEntrenador({ entrenador }: { entrenador: Entrenador }) {
  const [cambiando, iniciarTransicion] = useTransition();
  const { mostrarError } = useFeedback();

  function cambiarEstado(evento: React.MouseEvent) {
    // El botón vive dentro de una card que es un <Link> a la ficha.
    evento.preventDefault();
    evento.stopPropagation();

    if (entrenador.activo && !window.confirm(`¿Desactivar a ${entrenador.nombre}? Ya no aparecerá al asignar entrenador.`)) return;

    iniciarTransicion(async () => {
      try {
        const { error } = await cambiarEstadoEntrenadorAction(entrenador.id, !entrenador.activo);
        if (error) mostrarError(error);
      } catch {
        mostrarError("No se pudo cambiar el estado del entrenador.");
      }
    });
  }

  return (
    <Link href={`/entrenadores/${entrenador.id}`}>
      <Card className="transition-transform active:scale-[0.98]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar fotoUrl={entrenador.fotoUrl} nombre={entrenador.nombre} tamano={36} />
            <span className="font-medium" style={{ color: "var(--gx-ink)" }}>
              {entrenador.nombre}
            </span>
            <Badge tono={entrenador.activo ? "verde" : "gris"}>{entrenador.activo ? "Activo" : "Inactivo"}</Badge>
          </div>
          <button
            type="button"
            onClick={cambiarEstado}
            disabled={cambiando}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ color: entrenador.activo ? "var(--gx-bad)" : "var(--gx-good)" }}
          >
            {entrenador.activo ? "Desactivar" : "Reactivar"}
          </button>
        </div>
        {entrenador.telefono && (
          <div className="mt-2 text-sm" style={{ color: "var(--gx-muted)" }}>
            {entrenador.telefono}
          </div>
        )}
      </Card>
    </Link>
  );
}
