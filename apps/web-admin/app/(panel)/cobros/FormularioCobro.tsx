"use client";

import { useActionState, useEffect, useState } from "react";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { MAX_MESES_POR_PAGO } from "@gym-app/domain/entities/Pago";
import { diaLima, estaVigente, sumarDiasCalendario } from "@gym-app/domain/utils/vencimiento";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { Button } from "@gym-app/ui/components/Button";
import { InputFecha } from "@gym-app/ui/components/InputFecha";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { SelectorMetodoPago } from "../pagos/SelectorMetodoPago";
import type { EstadoFormularioPago } from "../pagos/actions";
import { fechaALocalISO } from "./CampoFechaCobro";
import type { MiembroConPlan, PlanParaModal } from "./SelectorMiembroModal";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" });

interface SeleccionMetodo {
  metodoPagoId: string | null;
  metodo: string;
  numeroOperacion: string;
  requiereNumeroOperacion: boolean;
}

const SIN_METODO: SeleccionMetodo = { metodoPagoId: null, metodo: "", numeroOperacion: "", requiereNumeroOperacion: false };

/**
 * Cobro de una membresía (S-04): un solo pago completo, con un solo método. El monto es el precio acordado por los
 * meses elegidos; la vista previa muestra el total y el nuevo vencimiento (el último día con acceso).
 */
export function FormularioCobro({
  miembro,
  planes,
  metodosPago,
  accion,
  origen,
  onRegistrado,
}: {
  miembro: MiembroConPlan;
  planes: PlanParaModal[];
  metodosPago: MetodoPago[];
  accion: (estado: EstadoFormularioPago, formData: FormData) => Promise<EstadoFormularioPago>;
  origen: "caja" | "miembro";
  onRegistrado?: (fechaFinCiclo?: string) => void;
}) {
  const { mostrarError, mostrarExito } = useFeedback();
  const [estado, enviar, enviando] = useActionState(accion, {});
  // El mismo cobroId se reenvía si hay un error o un doble clic: el servidor no duplica el cobro.
  const [cobroId] = useState(() => crypto.randomUUID());
  const hoyISO = fechaALocalISO(new Date());
  const [fecha, setFecha] = useState(hoyISO);
  const [meses, setMeses] = useState(1);
  const [planElegidoId, setPlanElegidoId] = useState<string>(miembro.plan?.id ?? planes[0]?.id ?? "");
  const [seleccion, setSeleccion] = useState<SeleccionMetodo>(SIN_METODO);

  const diaPago = diaLima(new Date(`${fecha || hoyISO}T12:00:00-05:00`));
  const vigente = estaVigente(miembro.fechaVencimiento, diaPago);
  // Con un vencimiento vigente solo se cobra su plan; otro plan es un cambio de plan.
  const plan = vigente && miembro.plan ? miembro.plan : (planes.find((p) => p.id === planElegidoId) ?? miembro.plan);
  const mismoPlan = plan !== undefined && plan.id === miembro.planId;
  const precioMes = plan ? (mismoPlan ? miembro.precioPlan : plan.precioUSD) : 0;
  const total = Math.round(precioMes * meses * 100) / 100;
  const base = vigente && miembro.fechaVencimiento ? diaLima(miembro.fechaVencimiento) : diaPago;
  const nuevoVencimiento = plan ? sumarDiasCalendario(base, plan.diasCiclo * meses) : null;

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error
  }, [estado.error]);

  useEffect(() => {
    if (!estado.ok) return;
    mostrarExito(estado.ok);
    onRegistrado?.(estado.fechaFinCiclo);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.ok
  }, [estado.ok]);

  const puedeEnviar = !!plan && total > 0 && !!seleccion.metodoPagoId && (!seleccion.requiereNumeroOperacion || !!seleccion.numeroOperacion.trim());

  return (
    <form action={enviar} className="flex flex-col gap-5 text-base">
      <input type="hidden" name="miembroId" value={miembro.id} />
      <input type="hidden" name="planId" value={plan?.id ?? ""} />
      <input type="hidden" name="origen" value={origen} />
      <input type="hidden" name="cobroId" value={cobroId} />
      <input type="hidden" name="meses" value={meses} />
      {fecha !== hoyISO && <input type="hidden" name="fechaPago" value={fecha} />}
      <input
        type="hidden"
        name="lineas"
        value={JSON.stringify([
          { monto: total, metodo: seleccion.metodo, metodoPagoId: seleccion.metodoPagoId, numeroOperacion: seleccion.numeroOperacion.trim() || null },
        ])}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
          Plan
          {vigente ? (
            <span className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-ink)" }}>
              {plan?.nombre ?? "Sin plan"} — vigente hasta el {miembro.fechaVencimiento ? FORMATO_FECHA.format(miembro.fechaVencimiento) : "—"}
            </span>
          ) : (
            <select
              value={planElegidoId}
              onChange={(e) => setPlanElegidoId(e.target.value)}
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--gx-edge)", background: "var(--gx-surface)", color: "var(--gx-ink)" }}
            >
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {formatearSoles(p.id === miembro.planId ? miembro.precioPlan : p.precioUSD)}
                </option>
              ))}
            </select>
          )}
        </label>
        <InputFecha label="Fecha del pago" value={fecha} max={hoyISO} onChange={(f) => setFecha(f || hoyISO)} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm" style={{ color: "var(--gx-muted)" }}>
          Meses a pagar
        </span>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: MAX_MESES_POR_PAGO }, (_, i) => i + 1).map((n) => (
            <Button key={n} type="button" variant={meses === n ? "primario" : "secundario"} onClick={() => setMeses(n)}>
              {n}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "var(--gx-surface-2)" }}>
        <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
          Total a cobrar ({meses} {meses === 1 ? "mes" : "meses"})
        </p>
        <p className="text-3xl font-semibold" style={{ color: "var(--gx-ink)" }}>
          {formatearSoles(total)}
        </p>
        {nuevoVencimiento && (
          <p className="mt-1 text-sm" style={{ color: "var(--gx-muted)" }}>
            Tendrá acceso hasta el <strong style={{ color: "var(--gx-ink)" }}>{FORMATO_FECHA.format(nuevoVencimiento)}</strong> (inclusive).
          </p>
        )}
      </div>

      <SelectorMetodoPago metodos={metodosPago} onCambio={setSeleccion} />

      <Button type="submit" disabled={!puedeEnviar || enviando}>
        {enviando ? "Registrando..." : `Registrar pago de ${formatearSoles(total)}`}
      </Button>
    </form>
  );
}
