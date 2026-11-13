"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Miembro } from "@gym-app/domain/entities/Miembro";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { Avatar } from "@gym-app/ui/components/Avatar";
import { DURACION_MS } from "@gym-app/ui/components/FeedbackOverlay";
import { registrarPagoAction } from "../pagos/actions";
import { FormularioCobro } from "./FormularioCobro";
import { ColumnaPrincipal, MarcoAsistente } from "./MarcoAsistente";
import { aMiembroConPlan, BuscadorMiembro, type MiembroConPlan, type PlanParaModal } from "./SelectorMiembroModal";

/**
 * Cobro de una membresía desde Caja (S-04): elegir al socio y cobrar un pago único con un solo método.
 * El cambio de plan a mitad de ciclo se hace desde la ficha del socio (S-07).
 */
export function ModalRegistrarPagoCaja({
  miembros,
  planes,
  metodosPago,
  miembroInicialId,
  hoy,
  onCerrar,
}: {
  miembros: Miembro[];
  planes: PlanParaModal[];
  metodosPago: MetodoPago[];
  // Viene de /cobros?cobrar=<id> («Cobrar ahora» en En sala): abre el cobro con ese socio ya elegido.
  miembroInicialId?: string;
  // Hoy según el servidor (para el cambio de plan a mitad de ciclo).
  hoy?: Date;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const planesPorId = useMemo(() => new Map(planes.map((p) => [p.id, p])), [planes]);
  const [elegido, setElegido] = useState<MiembroConPlan | null>(() => {
    const inicial = miembroInicialId ? miembros.find((m) => m.id === miembroInicialId) : undefined;
    return inicial ? aMiembroConPlan(inicial, planesPorId) : null;
  });

  function alRegistrar() {
    // Deja ver el aviso de éxito un momento y recarga la caja (el cobro de hoy cambia).
    setTimeout(() => {
      router.refresh();
      onCerrar();
    }, DURACION_MS);
  }

  return (
    <MarcoAsistente titulo={elegido ? "Cobrar membresía" : "Elige un socio"} onCerrar={onCerrar}>
      <ColumnaPrincipal>
        {!elegido && <BuscadorMiembro miembros={miembros} planes={planes} onSeleccionar={setElegido} grande />}

        {elegido && (
            <FormularioCobro
              key={elegido.id}
              miembro={elegido}
              planes={planes}
              metodosPago={metodosPago}
              accion={registrarPagoAction}
              origen="caja"
              onRegistrado={alRegistrar}
              hoy={hoy}
              onPlanCambiado={alRegistrar}
              cabecera={
              <div className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: "var(--gx-surface-2)" }}>
                <Avatar fotoUrl={elegido.fotoUrl} nombre={elegido.nombre} tamano={40} />
                <p className="min-w-0 flex-1 truncate">
                  <span className="font-semibold" style={{ color: "var(--gx-ink)" }}>
                    {elegido.nombre}
                  </span>
                  <span className="text-sm" style={{ color: "var(--gx-muted)" }}>
                    {" · "}
                    {elegido.documento}
                  </span>
                </p>
                {!miembroInicialId && (
                  <button
                    type="button"
                    onClick={() => setElegido(null)}
                    className="shrink-0 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-[var(--gx-surface)]"
                    style={{ color: "var(--gx-accent)" }}
                  >
                    Cambiar socio
                  </button>
                )}
              </div>
              }
            />
        )}
      </ColumnaPrincipal>
    </MarcoAsistente>
  );
}
