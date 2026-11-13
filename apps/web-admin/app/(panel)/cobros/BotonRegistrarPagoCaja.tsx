"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Miembro } from "@gym-app/domain/entities/Miembro";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import type { ReglaAbonoPorFrecuencia } from "@gym-app/domain/entities/ReglaAbono";
import type { EntrenadorResumen } from "@gym-app/domain/entities/EntrenadorResumen";
import type { AbonoPendiente } from "@gym-app/domain/use-cases/ListarAbonosPendientes";
import { Button } from "@gym-app/ui/components/Button";
import { ModalRegistrarPagoCaja } from "./ModalRegistrarPagoCaja";
import type { PlanParaModal } from "./SelectorMiembroModal";
import type { EstadoCambioPlan } from "../pagos/actions";

export function BotonRegistrarPagoCaja({
  miembros,
  planes,
  metodosPago,
  reglasAbono,
  entrenadores,
  accionCambiarPlan,
  miembroInicialId,
  abonos,
}: {
  miembros: Miembro[];
  planes: PlanParaModal[];
  metodosPago: MetodoPago[];
  reglasAbono: ReglaAbonoPorFrecuencia[];
  // Entrenadores de la sucursal activa — para "Cambiar plan" en el Paso 2
  // (ver diseño acordado), solo se muestra el selector si el plan nuevo
  // elegido incluye entrenador.
  entrenadores: EntrenadorResumen[];
  accionCambiarPlan: (estado: EstadoCambioPlan, formData: FormData) => Promise<EstadoCambioPlan>;
  // Viene de /cobros?cobrar=<id> ("Cobrar ahora" en En sala): abre el wizard con ese miembro ya elegido.
  miembroInicialId?: string;
  // Saldos de abonos de membresía pendientes: el cobro de un miembro con abono previo completa su ciclo.
  abonos: AbonoPendiente[];
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
          reglasAbono={reglasAbono}
          entrenadores={entrenadores}
          accionCambiarPlan={accionCambiarPlan}
          miembroInicialId={miembroInicialId}
          abonos={abonos}
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
