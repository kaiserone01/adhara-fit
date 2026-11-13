"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Miembro } from "@gym-app/domain/entities/Miembro";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { Button } from "@gym-app/ui/components/Button";
import { ModalRegistrarPagoCaja } from "./ModalRegistrarPagoCaja";
import type { PlanParaModal } from "./SelectorMiembroModal";

export function BotonRegistrarPagoCaja({
  miembros,
  planes,
  metodosPago,
  miembroInicialId,
  hoy,
}: {
  miembros: Miembro[];
  planes: PlanParaModal[];
  metodosPago: MetodoPago[];
  // Viene de /cobros?cobrar=<id> («Cobrar ahora» en En sala): abre el cobro con ese socio ya elegido.
  miembroInicialId?: string;
  hoy?: Date;
}) {
  const router = useRouter();
  const [modalAbierta, setModalAbierta] = useState(!!miembroInicialId);

  return (
    <>
      <Button onClick={() => setModalAbierta(true)}>Registrar pago</Button>
      {modalAbierta && (
        <ModalRegistrarPagoCaja
          miembros={miembros}
          planes={planes}
          metodosPago={metodosPago}
          miembroInicialId={miembroInicialId}
          hoy={hoy}
          onCerrar={() => {
            setModalAbierta(false);
            // Quita ?cobrar para que recargar la página no reabra el wizard.
            if (miembroInicialId) router.replace("/cobros");
          }}
        />
      )}
    </>
  );
}
