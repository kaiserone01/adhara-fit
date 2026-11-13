"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Miembro } from "@gym-app/domain/entities/Miembro";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { Button } from "@gym-app/ui/components/Button";
import { DURACION_MS } from "@gym-app/ui/components/FeedbackOverlay";
import { registrarPagoAction } from "./actions";
import { FormularioCobro } from "../cobros/FormularioCobro";
import { BuscadorMiembro, type MiembroConPlan, type PlanParaModal } from "../cobros/SelectorMiembroModal";

/**
 * Pantalla «Registrar pago» fuera de Caja (S-04): elegir al socio y cobrar su membresía con el mismo formulario
 * de cobro único (un pago completo, un solo método).
 */
export function FormularioPago({
  miembros,
  planes,
  metodosPago,
}: {
  miembros: Miembro[];
  planes: PlanParaModal[];
  metodosPago: MetodoPago[];
}) {
  const router = useRouter();
  const [elegido, setElegido] = useState<MiembroConPlan | null>(null);

  if (!elegido) {
    return <BuscadorMiembro miembros={miembros} planes={planes} onSeleccionar={setElegido} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl p-4" style={{ background: "var(--gx-surface-2)" }}>
        <div className="min-w-0">
          <p className="truncate font-semibold" style={{ color: "var(--gx-ink)" }}>
            {elegido.nombre}
          </p>
          <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
            {elegido.documento}
          </p>
        </div>
        <Button type="button" variant="secundario" onClick={() => setElegido(null)}>
          Cambiar socio
        </Button>
      </div>

      <FormularioCobro
        key={elegido.id}
        miembro={elegido}
        planes={planes}
        metodosPago={metodosPago}
        accion={registrarPagoAction}
        origen="miembro"
        onRegistrado={() => setTimeout(() => router.push(`/miembros/${elegido.id}`), DURACION_MS)}
      />
    </div>
  );
}
