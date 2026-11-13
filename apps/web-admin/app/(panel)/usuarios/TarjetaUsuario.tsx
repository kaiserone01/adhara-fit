"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card } from "@gym-app/ui/components/Card";
import { Avatar } from "@gym-app/ui/components/Avatar";
import { Badge } from "@gym-app/ui/components/Badge";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { UsuarioAdmin } from "@gym-app/domain/entities/UsuarioAdmin";
import { cambiarEstadoUsuarioAction } from "./actions";

export function TarjetaUsuario({ usuario, esPropio }: { usuario: UsuarioAdmin; esPropio: boolean }) {
  const [cambiando, iniciarTransicion] = useTransition();
  const { mostrarError } = useFeedback();

  function cambiarEstado(evento: React.MouseEvent) {
    // El botón vive dentro de una card que es un <Link> a la ficha: sin esto el clic también navegaría.
    evento.preventDefault();
    evento.stopPropagation();

    if (usuario.activo && !window.confirm(`¿Desactivar a ${usuario.nombre || usuario.email}? Ya no podrá iniciar sesión.`)) {
      return;
    }

    iniciarTransicion(async () => {
      try {
        const { error } = await cambiarEstadoUsuarioAction(usuario.id, !usuario.activo);
        if (error) mostrarError(error);
      } catch {
        mostrarError("No se pudo cambiar el estado del administrador.");
      }
    });
  }

  return (
    <Link href={`/usuarios/${usuario.id}`}>
      <Card className="transition-transform active:scale-[0.98]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar fotoUrl={usuario.fotoUrl} nombre={usuario.nombre || usuario.email} tamano={36} />
            <span className="font-medium" style={{ color: "var(--gx-ink)" }}>
              {usuario.nombre || usuario.email}
            </span>
            <Badge tono={usuario.activo ? "verde" : "gris"}>{usuario.activo ? "Activo" : "Inactivo"}</Badge>
          </div>
          {!esPropio && (
            <button
              type="button"
              onClick={cambiarEstado}
              disabled={cambiando}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
              style={{ color: usuario.activo ? "var(--gx-bad)" : "var(--gx-good)" }}
            >
              {usuario.activo ? "Desactivar" : "Reactivar"}
            </button>
          )}
        </div>
        <div className="mt-2 text-sm" style={{ color: "var(--gx-muted)" }}>
          {usuario.email}
        </div>
      </Card>
    </Link>
  );
}
