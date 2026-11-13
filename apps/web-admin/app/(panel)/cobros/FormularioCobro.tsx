"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { diaLima, estaVigente, sumarDiasCalendario } from "@gym-app/domain/utils/vencimiento";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { Button } from "@gym-app/ui/components/Button";
import { InputFecha } from "@gym-app/ui/components/InputFecha";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { SelectorMetodoPago } from "../pagos/SelectorMetodoPago";
import { cambiarPlanAction, type EstadoFormularioPago } from "../pagos/actions";
import { FormularioCambiarPlan } from "../miembros/FormularioCambiarPlan";
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
 * Cobro de una membresía (S-04): un solo pago completo de un mes, con un solo método. El plan es el que el socio ya
 * tiene asignado (con «Cambiar plan» se le cambia); el resumen muestra el total y el nuevo vencimiento (el último día
 * con acceso).
 */
export function FormularioCobro({
  miembro,
  planes,
  metodosPago,
  accion,
  origen,
  onRegistrado,
  hoy,
  onPlanCambiado,
}: {
  miembro: MiembroConPlan;
  planes: PlanParaModal[];
  metodosPago: MetodoPago[];
  accion: (estado: EstadoFormularioPago, formData: FormData) => Promise<EstadoFormularioPago>;
  origen: "caja" | "miembro";
  onRegistrado?: (fechaFinCiclo?: string) => void;
  // Hoy según el servidor: con él, un socio vigente puede cambiar de plan a mitad de ciclo desde aquí (S-07).
  hoy?: Date;
  // El cambio de plan ya cobró la diferencia: quien usa el formulario cierra o recarga.
  onPlanCambiado?: () => void;
}) {
  const { mostrarError, mostrarExito } = useFeedback();
  const [estado, enviar, enviando] = useActionState(accion, {});
  // El mismo cobroId se reenvía si hay un error o un doble clic: el servidor no duplica el cobro.
  const [cobroId] = useState(() => crypto.randomUUID());
  const hoyISO = fechaALocalISO(new Date());
  const [fecha, setFecha] = useState(hoyISO);
  const meses = 1;
  const [planElegidoId, setPlanElegidoId] = useState<string>(miembro.plan?.id ?? planes[0]?.id ?? "");
  const [seleccion, setSeleccion] = useState<SeleccionMetodo>(SIN_METODO);
  // Sin plan asignado hay que elegir uno; con plan, «Cambiar plan» abre la lista.
  const [eligiendoPlan, setEligiendoPlan] = useState(!miembro.plan);
  const [cambiandoPlanVigente, setCambiandoPlanVigente] = useState(false);

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
  const puedeCambiarPlanAqui = !!hoy && !!miembro.plan && !!miembro.fechaVencimiento;

  return (
    <>
      <form action={enviar} className="flex flex-col gap-4 text-base">
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4" style={{ background: "var(--gx-surface-2)" }}>
          <div className="min-w-0">
            <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
              Total a cobrar · {plan?.nombre ?? "Sin plan"}
              {vigente && miembro.fechaVencimiento ? ` (vigente hasta el ${FORMATO_FECHA.format(miembro.fechaVencimiento)})` : ""}
            </p>
            <p className="text-3xl font-semibold" style={{ color: "var(--gx-ink)" }}>
              {formatearSoles(total)}
            </p>
            {nuevoVencimiento && (
              <p className="mt-0.5 text-sm" style={{ color: "var(--gx-muted)" }}>
                Tendrá acceso hasta el <strong style={{ color: "var(--gx-ink)" }}>{FORMATO_FECHA.format(nuevoVencimiento)}</strong> (inclusive).
              </p>
            )}
          </div>
          {vigente ? (
            puedeCambiarPlanAqui ? (
              <Button type="button" variant="secundario" onClick={() => setCambiandoPlanVigente(true)}>
                Cambiar plan
              </Button>
            ) : (
              <Link
                href={`/miembros/${miembro.id}`}
                className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium"
                style={{ background: "var(--gx-surface)", color: "var(--gx-ink)" }}
              >
                Cambiar plan
              </Link>
            )
          ) : (
            <Button type="button" variant="secundario" onClick={() => setEligiendoPlan((v) => !v)}>
              {eligiendoPlan && miembro.plan ? "Listo" : "Cambiar plan"}
            </Button>
          )}
        </div>

        {!vigente && eligiendoPlan && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Plan">
            {planes.map((p) => {
              const seleccionado = plan?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={seleccionado}
                  onClick={() => {
                    setPlanElegidoId(p.id);
                    setEligiendoPlan(false);
                  }}
                  className="flex flex-col items-start rounded-lg border-2 px-3 py-2 text-left transition-colors duration-150 active:scale-[0.98]"
                  style={
                    seleccionado
                      ? { borderColor: "var(--gx-accent)", background: "color-mix(in srgb, var(--gx-accent) 12%, transparent)" }
                      : { borderColor: "var(--gx-field-edge)" }
                  }
                >
                  <span className="text-sm font-medium" style={{ color: "var(--gx-muted)" }}>
                    {p.nombre}
                  </span>
                  <span className="text-lg font-semibold" style={{ color: "var(--gx-ink)" }}>
                    {formatearSoles(p.id === miembro.planId ? miembro.precioPlan : p.precioUSD)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="max-w-xs">
          <InputFecha label="Fecha del pago" value={fecha} max={hoyISO} onChange={(f) => setFecha(f || hoyISO)} />
        </div>

        <SelectorMetodoPago metodos={metodosPago} onCambio={setSeleccion} enFila />

        <Button type="submit" disabled={!puedeEnviar || enviando}>
          {enviando ? "Registrando..." : `Registrar pago de ${formatearSoles(total)}`}
        </Button>
      </form>

      {cambiandoPlanVigente && puedeCambiarPlanAqui && hoy && miembro.plan && miembro.fechaVencimiento && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, black 60%, transparent)" }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 p-6"
            style={{ borderColor: "var(--gx-accent)", background: "var(--gx-surface)" }}
          >
            <h3 className="mb-4 text-lg font-bold" style={{ color: "var(--gx-ink)" }}>
              Cambiar de plan
            </h3>
            <FormularioCambiarPlan
              accion={cambiarPlanAction}
              miembroId={miembro.id}
              planes={planes}
              planActualId={miembro.planId}
              precioActual={miembro.precioPlan}
              diasCicloActual={miembro.plan.diasCiclo}
              vencimientoActual={miembro.fechaVencimiento}
              hoy={hoy}
              metodosPago={metodosPago}
              onCambiado={() => {
                setCambiandoPlanVigente(false);
                onPlanCambiado?.();
              }}
            />
            <Button type="button" variant="secundario" className="mt-3 w-full" onClick={() => setCambiandoPlanVigente(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
