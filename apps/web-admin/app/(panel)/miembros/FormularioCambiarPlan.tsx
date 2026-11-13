"use client";

import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { calcularCambioPlan } from "@gym-app/domain/entities/cambioPlanCalculo";
import type { EstadoCambioPlan } from "../pagos/actions";
import { SelectorMetodoPago } from "../pagos/SelectorMetodoPago";

export interface PlanParaCambio {
  id: string;
  nombre: string;
  precioUSD: number;
  diasCiclo: number;
}

interface SeleccionMetodo {
  metodoPagoId: string | null;
  metodo: string;
  numeroOperacion: string;
  requiereNumeroOperacion: boolean;
}

const SIN_METODO: SeleccionMetodo = { metodoPagoId: null, metodo: "", numeroOperacion: "", requiereNumeroOperacion: false };

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" });

// Día de Lima (inicio del día, 05:00Z) → «AAAA-MM-DD», el formato que valida el servidor.
function fechaISOLima(dia: Date): string {
  return new Date(dia.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Cambio de plan a mitad de ciclo (S-07): valora lo no consumido del plan actual, cobra la diferencia con un solo
 * método de pago o agrega días si sobra. La vista previa usa la misma función pura que el servidor; el servidor rechaza
 * el cambio si calcula otro monto o vencimiento. Nunca redirige: quien lo usa decide qué hacer en `onCambiado`.
 */
export function FormularioCambiarPlan({
  accion,
  miembroId,
  planes,
  planActualId,
  precioActual,
  diasCicloActual,
  vencimientoActual,
  hoy,
  metodosPago,
  onCambiado,
}: {
  accion: (estado: EstadoCambioPlan, formData: FormData) => Promise<EstadoCambioPlan>;
  miembroId: string;
  planes: PlanParaCambio[];
  planActualId: string | null;
  /** Precio acordado vigente del socio y duración del plan actual. */
  precioActual: number;
  diasCicloActual: number;
  vencimientoActual: Date;
  /** Hoy según el servidor (nunca el reloj del navegador). */
  hoy: Date;
  metodosPago: MetodoPago[];
  onCambiado?: () => void;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const { mostrarError, mostrarExito } = useFeedback();
  // El mismo cobroId se reenvía ante un error o un doble clic: el servidor no duplica el cobro.
  const [cobroId] = useState(() => crypto.randomUUID());
  const [planNuevoId, setPlanNuevoId] = useState("");
  const [seleccion, setSeleccion] = useState<SeleccionMetodo>(SIN_METODO);

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error
  }, [estado.error]);

  useEffect(() => {
    if (!estado.ok) return;
    mostrarExito(estado.ok);
    onCambiado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.ok
  }, [estado.ok]);

  const planNuevo = planes.find((p) => p.id === planNuevoId) ?? null;
  const calculo = planNuevo
    ? calcularCambioPlan({
        hoy,
        vencimientoActual,
        precioActual,
        diasCicloActual,
        precioNuevo: planNuevo.precioUSD,
        diasCicloNuevo: planNuevo.diasCiclo,
      })
    : null;
  const monto = calculo ? calculo.montoCobrarCentavos / 100 : 0;
  const hayCobro = monto > 0;
  const metodoListo = !hayCobro || (!!seleccion.metodoPagoId && (!seleccion.requiereNumeroOperacion || !!seleccion.numeroOperacion.trim()));

  return (
    <form action={enviar} className="flex flex-col gap-4">
      {estado.error && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: "color-mix(in srgb, var(--gx-bad) 15%, transparent)", color: "var(--gx-bad)" }}
        >
          {estado.error}
        </p>
      )}

      <input type="hidden" name="miembroId" value={miembroId} />
      <input type="hidden" name="planNuevoId" value={planNuevoId} />
      <input type="hidden" name="montoEsperado" value={monto.toFixed(2)} />
      <input type="hidden" name="vencimientoEsperado" value={calculo ? fechaISOLima(calculo.nuevoVencimiento) : ""} />
      {hayCobro && <input type="hidden" name="cobroId" value={cobroId} />}
      {hayCobro && <input type="hidden" name="metodo" value={seleccion.metodo} />}
      {hayCobro && <input type="hidden" name="metodoPagoId" value={seleccion.metodoPagoId ?? ""} />}
      {hayCobro && <input type="hidden" name="numeroOperacion" value={seleccion.numeroOperacion} />}

      <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
        Plan nuevo
        <select
          value={planNuevoId}
          onChange={(e) => {
            setPlanNuevoId(e.target.value);
            setSeleccion(SIN_METODO);
          }}
          className="min-h-11 rounded-lg border px-3 gx-campo"
        >
          <option value="">Selecciona un plan</option>
          {planes.map((plan) => (
            <option key={plan.id} value={plan.id} disabled={plan.id === planActualId}>
              {plan.nombre} — {formatearSoles(plan.precioUSD)} ({plan.diasCiclo} días)
              {plan.id === planActualId ? " — plan actual" : ""}
            </option>
          ))}
        </select>
      </label>

      {calculo && planNuevo && (
        <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--gx-edge)" }}>
          <div className="flex justify-between">
            <span style={{ color: "var(--gx-muted)" }}>Días que le quedan</span>
            <span style={{ color: "var(--gx-ink)" }}>{calculo.diasRestantes}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--gx-muted)" }}>Valor no consumido</span>
            <span style={{ color: "var(--gx-ink)" }}>{formatearSoles(calculo.valorNoConsumidoCentavos / 100)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--gx-muted)" }}>Precio del plan nuevo</span>
            <span style={{ color: "var(--gx-ink)" }}>{formatearSoles(planNuevo.precioUSD)}</span>
          </div>
          {hayCobro ? (
            <div className="flex justify-between font-semibold">
              <span style={{ color: "var(--gx-muted)" }}>A cobrar</span>
              <span style={{ color: "var(--gx-ink)" }}>{formatearSoles(monto)}</span>
            </div>
          ) : (
            <div className="flex justify-between font-semibold">
              <span style={{ color: "var(--gx-muted)" }}>Días agregados</span>
              <span style={{ color: "var(--gx-ink)" }}>{calculo.diasNuevos}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span style={{ color: "var(--gx-muted)" }}>Nuevo vencimiento</span>
            <span style={{ color: "var(--gx-ink)" }}>{FORMATO_FECHA.format(calculo.nuevoVencimiento)}</span>
          </div>
        </div>
      )}

      {calculo && hayCobro && <SelectorMetodoPago metodos={metodosPago} onCambio={setSeleccion} />}

      {calculo && (
        <Button type="submit" disabled={enviando || !metodoListo}>
          {enviando ? "Guardando..." : hayCobro ? `Cambiar de plan y cobrar ${formatearSoles(monto)}` : "Cambiar de plan sin costo adicional"}
        </Button>
      )}
    </form>
  );
}
