"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Miembro } from "@gym-app/domain/entities/Miembro";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { Avatar } from "@gym-app/ui/components/Avatar";
import { Button } from "@gym-app/ui/components/Button";
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
  onCerrar,
}: {
  miembros: Miembro[];
  planes: PlanParaModal[];
  metodosPago: MetodoPago[];
  // Viene de /cobros?cobrar=<id> («Cobrar ahora» en En sala): abre el cobro con ese socio ya elegido.
  miembroInicialId?: string;
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
          <>
            <div className="flex items-center gap-4 rounded-xl p-4" style={{ background: "var(--gx-surface-2)" }}>
              <Avatar fotoUrl={elegido.fotoUrl} nombre={elegido.nombre} tamano={64} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold" style={{ color: "var(--gx-ink)" }}>
                  {elegido.nombre}
                </p>
                <p style={{ color: "var(--gx-muted)" }}>{elegido.documento}</p>
              </div>
              {!miembroInicialId && (
                <Button type="button" variant="secundario" onClick={() => setElegido(null)}>
                  Cambiar socio
                </Button>
              )}
            </div>

            <FormularioCobro
              key={elegido.id}
              miembro={elegido}
              planes={planes}
              metodosPago={metodosPago}
              accion={registrarPagoAction}
              origen="caja"
              onRegistrado={alRegistrar}
            />
          </>
        )}
      </ColumnaPrincipal>
    </MarcoAsistente>
  );
}
