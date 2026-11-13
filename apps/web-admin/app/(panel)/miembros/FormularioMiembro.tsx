"use client";

import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { InputFecha } from "@gym-app/ui/components/InputFecha";
import { MAX_MESES_POR_PAGO } from "@gym-app/domain/entities/Pago";
import { Card } from "@gym-app/ui/components/Card";
import { Badge } from "@gym-app/ui/components/Badge";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { actualizarFotoMiembroAction, type EstadoFormularioMiembro } from "./actions";
import { SelectorMetodoPago } from "../pagos/SelectorMetodoPago";
import { FormularioCambiarPlan, type PlanParaCambio } from "./FormularioCambiarPlan";
import { cambiarPlanAction } from "../pagos/actions";
import { SelectorFotoPerfil } from "./SelectorFotoPerfil";
import type { EntrenadorResumen } from "@gym-app/domain/entities/EntrenadorResumen";
import type { SucursalResumen } from "@gym-app/domain/entities/SucursalResumen";
import type { Plan } from "@gym-app/domain/entities/Plan";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import {
  descripcionDocumento,
  ETIQUETA_TIPO_DOCUMENTO,
  TIPOS_DOCUMENTO,
  type TipoDocumento,
} from "@gym-app/domain/utils/documento";

export interface ValoresFormularioMiembro {
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  codigoSocio: string | null;
  celular: string;
  fechaInscripcion: string; // yyyy-mm-dd, solo informativa (no se envía al guardar)
  fechaVencimiento?: string; // yyyy-mm-dd, "" si no tiene
  fechaUltimoPago?: string; // yyyy-mm-dd, "" si no tiene
  sucursalId: string | null; // null = "Ambas"
  planId: string | null;
  precioPlan: number;
  entrenadorId: string | null;
  fotoUrl: string | null;
}

const ID_AMBAS_SEDES = "__ambas__";

// OJO: nunca usar fecha.toISOString() acá — convierte a UTC primero, y de
// noche (pasadas las 8pm en Venezuela, UTC-5) eso salta al día siguiente.
function hoyISO(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fechaISO: string): string {
  if (!fechaISO) return "—";
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
}

function formatearFechaCorta(fecha: Date): string {
  return new Date(fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: "var(--gx-muted)" }}>{label}</dt>
      <dd className="text-right font-medium" style={{ color: "var(--gx-ink)" }}>
        {valor}
      </dd>
    </div>
  );
}

export function FormularioMiembro({
  accion,
  entrenadores: entrenadoresActivos,
  sucursales,
  sucursalActivaNombre,
  sucursalIdDefault,
  planes,
  metodosPago,
  miembroId,
  ultimosCiclos,
  totalPagos,
  valoresIniciales,
  cambioPlan,
  consentimiento,
}: {
  accion: (estado: EstadoFormularioMiembro, formData: FormData) => Promise<EstadoFormularioMiembro>;
  // Entrenadores activos (S-18: un solo gimnasio, sin filtro por sede).
  entrenadores: EntrenadorResumen[];
  // Se sigue usando para resolver entrenadoresDeLaSede y para mostrar el
  // nombre cuando sucursalId === ID_AMBAS_SEDES; ya NO se usa para poblar
  // un <select> de sedes.
  sucursales: SucursalResumen[];
  // Nombre de la sucursal activa de la sesión — solo se muestra en el ticket
  // de confirmación (crear/editar un miembro siempre lo asigna a la sede
  // activa, salvo "Ambas").
  sucursalActivaNombre: string;
  sucursalIdDefault: string | null;
  planes: Plan[];
  metodosPago: MetodoPago[];
  // null solo en modo creación (no hay ficha de ciclos que enlazar
  // todavía). En modo edición siempre es el id real del miembro.
  miembroId: string | null;
  // Últimos 3-5 pagos del miembro que tienen datos de ciclo (pagos
  // previos a esta funcionalidad no tienen fechaInicioCiclo/
  // fechaFinCiclo y no aparecen aquí) — solo se usa en modo edición.
  ultimosCiclos: { id: string; fechaInicioCiclo: Date | null; fechaFinCiclo: Date | null }[];
  // Cantidad total de pagos del miembro — solo para el contador del link
  // "Ver historial de pagos". Undefined en modo creación.
  totalPagos?: number;
  valoresIniciales?: ValoresFormularioMiembro;
  // Solo en edición: datos para el cambio de plan a mitad de ciclo (S-07). null si el socio no tiene una
  // membresía vigente (entonces corresponde un cobro normal, no un cambio de plan).
  cambioPlan?: {
    hoy: Date;
    vencimiento: Date;
    diasCicloActual: number;
    planes: PlanParaCambio[];
  } | null;
  // Solo en el alta (S-13): texto de consentimiento vigente, o null si todavía no se publicó ninguno.
  consentimiento?: { version: number; contenido: string } | null;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const esEdicion = !!valoresIniciales;
  const formRef = useRef<HTMLFormElement>(null);
  const { mostrarError, mostrarExito } = useFeedback();

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error, no a mostrarError
  }, [estado.error]);

  const [nombre, setNombre] = useState(valoresIniciales?.nombre ?? "");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>(valoresIniciales?.tipoDocumento ?? "DNI");
  const [numeroDocumento, setNumeroDocumento] = useState(valoresIniciales?.numeroDocumento ?? "");
  const codigoSocioActual = valoresIniciales?.codigoSocio ?? null;
  const [celular, setCelular] = useState(valoresIniciales?.celular ?? "");
  // Solo informativa: en Nuevo miembro se puede poner una fecha pasada (por defecto hoy) y en la ficha no se edita ni se envía.
  const [fechaInscripcion, setFechaInscripcion] = useState(valoresIniciales?.fechaInscripcion ?? hoyISO());
  const [fechaUltimoPago, setFechaUltimoPago] = useState(valoresIniciales?.fechaUltimoPago ?? "");
  const [fechaVencimiento, setFechaVencimiento] = useState(valoresIniciales?.fechaVencimiento ?? "");
  // Fechas de pago y vencimiento: editables para cualquier miembro (p. ej. para corregir un error).
  const editaFechas = esEdicion;
  const [sucursalId, setSucursalId] = useState(
    valoresIniciales ? (valoresIniciales.sucursalId ?? ID_AMBAS_SEDES) : sucursalIdDefault ?? ""
  );
  const [entrenadorId, setEntrenadorId] = useState(valoresIniciales?.entrenadorId ?? "");
  const [fotoPreview, setFotoPreview] = useState<string | null>(valoresIniciales?.fotoUrl ?? null);

  // Si la sucursal o el plan actuales del miembro ya no están entre las
  // opciones visibles (p. ej. un plan que se dio de baja, o una sucursal
  // fuera del alcance del usuario que edita), se agregan igual a la lista
  // para no perder el dato al mostrar el formulario.
  const sucursalesConActual =
    valoresIniciales && valoresIniciales.sucursalId && !sucursales.some((s) => s.id === valoresIniciales.sucursalId)
      ? [...sucursales, { id: valoresIniciales.sucursalId, nombre: "(sede actual)", direccion: null, activo: true }]
      : sucursales;

  const planesActivos = planes.filter(
    (plan) => plan.activo || (valoresIniciales && plan.id === valoresIniciales.planId)
  );

  // Si el entrenador ya asignado está desactivado, se agrega igual para no perder el dato al editar.
  const entrenadores =
    valoresIniciales?.entrenadorId && !entrenadoresActivos.some((e) => e.id === valoresIniciales.entrenadorId)
      ? [...entrenadoresActivos, { id: valoresIniciales.entrenadorId, nombre: "(entrenador actual)" }]
      : entrenadoresActivos;

  const [planId, setPlanId] = useState<string>(() => {
    if (!valoresIniciales) return planesActivos[0]?.id ?? "";
    return valoresIniciales.planId ?? "";
  });
  const [precio, setPrecio] = useState<string>(String(valoresIniciales?.precioPlan ?? planesActivos[0]?.precioUSD ?? ""));
  const [seleccionMetodo, setSeleccionMetodo] = useState<{
    metodoPagoId: string | null;
    metodo: string;
    numeroOperacion: string;
  }>({ metodoPagoId: null, metodo: "", numeroOperacion: "" });
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const router = useRouter();
  // El cambio de plan (S-07) es un formulario aparte, en un modal fuera del formulario de la ficha.
  const [cambiandoPlan, setCambiandoPlan] = useState(false);

  const planSeleccionado = planesActivos.find((p) => p.id === planId);

  const precioActual = Number(precio) || 0;
  // Meses que cubre el primer pago (1 a MAX_MESES_POR_PAGO): el total y la duración del ciclo se multiplican.
  // El pago es único, completo y con un solo método (S-04).
  const [meses, setMeses] = useState(1);
  const precioCiclo = Math.round(precioActual * meses * 100) / 100;
  const montoAPagar = precioCiclo;
  const [errorMontoHoy, setErrorMontoHoy] = useState<string | null>(null);
  // En pantallas angostas el resumen y los avisos del pago quedan lejos del botón Guardar: se lleva la vista hasta ellos.
  const ticketRef = useRef<HTMLDivElement>(null);
  const errorPagoRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (mostrarTicket) ticketRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [mostrarTicket]);
  useEffect(() => {
    if (errorMontoHoy) errorPagoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errorMontoHoy]);
  const nombrePlanActual = planSeleccionado?.nombre ?? "—";
  const nombreEntrenadorActual = entrenadores.find((e) => e.id === entrenadorId)?.nombre ?? null;
  const nombreMetodoPagoActual = seleccionMetodo.metodo || null;
  // El ciclo más reciente (por fechaFinCiclo) entre los que tienen datos
  // de ciclo — su fechaInicioCiclo es la "última fecha de renovación", y
  // su fechaFinCiclo es la fecha de vencimiento vigente (próximo cobro).
  const cicloMasReciente = ultimosCiclos.find((c) => c.fechaInicioCiclo && c.fechaFinCiclo) ?? null;
  // Días hasta el próximo cobro — negativo si ya venció. Se redondea con
  // ceil sobre el delta en horas para no perder un día por horas sueltas
  // (p. ej. faltan 23h50m -> "falta 1 día", no "0 días").
  const diasHastaProximoCobro = cicloMasReciente?.fechaFinCiclo
    // eslint-disable-next-line react-hooks/purity -- los dias hasta el cobro se calculan con la hora actual en cada render; congelarlos cambiaria el comportamiento
    ? Math.ceil((new Date(cicloMasReciente.fechaFinCiclo).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // El cambio de plan recarga los datos del socio: si hay cambios de Datos personales sin guardar se perderían,
  // así que se avisa antes de abrirlo.
  const hayCambiosSinGuardar =
    esEdicion &&
    !!valoresIniciales &&
    (nombre !== valoresIniciales.nombre ||
      celular !== valoresIniciales.celular ||
      (editaFechas && fechaUltimoPago !== (valoresIniciales.fechaUltimoPago ?? "")) ||
      (editaFechas && fechaVencimiento !== (valoresIniciales.fechaVencimiento ?? "")) ||
      sucursalId !== (valoresIniciales.sucursalId ?? ID_AMBAS_SEDES) ||
      entrenadorId !== (valoresIniciales.entrenadorId ?? "") ||
      fotoPreview !== (valoresIniciales.fotoUrl ?? null));

  function manejarCambioPlan(nuevoId: string) {
    setPlanId(nuevoId);
    const plan = planesActivos.find((p) => p.id === nuevoId);
    const permiteMultisede = plan?.multisede ?? false;
    if (plan) setPrecio(String(plan.precioUSD));
    // Si el nuevo plan no permite multisede y había quedado "Ambas"
    // seleccionado, se cae a la primera sede visible en vez de dejar un
    // valor que ya no es válido para este plan.
    if (!permiteMultisede && sucursalId === ID_AMBAS_SEDES) {
      setSucursalId(sucursalIdDefault ?? "");
    }
  }


  function manejarClickGuardar() {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;

    if (!esEdicion && precioActual > 0 && !seleccionMetodo.metodoPagoId) {
      setErrorMontoHoy("Elige el método de pago.");
      return;
    }
    setErrorMontoHoy(null);
    // Al editar se guarda directo (el aviso de "Cambios guardados" sale tras el redirect); el resumen es solo del alta.
    if (esEdicion) form.requestSubmit();
    else setMostrarTicket(true);
  }

  function manejarCambioFoto(archivo: File) {
    if (fotoPreview?.startsWith("blob:")) URL.revokeObjectURL(fotoPreview);
    setFotoPreview(URL.createObjectURL(archivo));
  }

  async function guardarAjusteFoto(archivo: File) {
    if (!miembroId) return;
    const datos = new FormData();
    datos.set("foto", archivo);
    try {
      const resultado = await actualizarFotoMiembroAction(miembroId, datos);
      if (!resultado.fotoUrl) throw new Error(resultado.error ?? "No se pudo guardar el encuadre.");
      if (fotoPreview?.startsWith("blob:")) URL.revokeObjectURL(fotoPreview);
      setFotoPreview(resultado.fotoUrl);
      mostrarExito("Encuadre guardado.");
    } catch (error) {
      mostrarError(error instanceof Error ? error.message : "No se pudo guardar el encuadre.");
      throw error;
    }
  }

  const idFormulario = "formulario-miembro";

  return (
    <>
    {estado.error && (
      <p
        className="mb-6 rounded-lg px-3 py-2 text-sm"
        style={{ background: "color-mix(in srgb, var(--gx-bad) 15%, transparent)", color: "var(--gx-bad)" }}
      >
        {estado.error}
      </p>
    )}

    <div className={`grid grid-cols-1 gap-6 ${esEdicion ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
      {/* display: contents — Datos personales y Plan de membresía quedan como
          celdas independientes de la grilla de 3 columnas, pero sus campos
          (incluidos los de la card de Plan) siguen siendo hijos reales de
          este <form> en el DOM, nunca se desmontan aparte (a diferencia del
          intento anterior con form={idFormulario}, que sí se rompía). */}
      <form ref={formRef} id={idFormulario} action={enviar} style={{ display: "contents" }}>
        <input type="hidden" name="planId" value={planId} />
        <input type="hidden" name="precioPlan" value={precioActual} />
        <input type="hidden" name="planNombre" value={nombrePlanActual} />
        {!esEdicion && (
          <>
            <input type="hidden" name="montoInicial" value={montoAPagar} />
            {meses > 1 && <input type="hidden" name="meses" value={meses} />}
            <input type="hidden" name="metodo" value={seleccionMetodo.metodo} />
            <input type="hidden" name="metodoPagoId" value={seleccionMetodo.metodoPagoId ?? ""} />
            <input type="hidden" name="numeroOperacion" value={seleccionMetodo.numeroOperacion} />
          </>
        )}

        <Card className="lg:col-start-1 lg:row-start-1">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--gx-muted)" }}>
            Datos personales
          </h2>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold"
                style={{ background: "var(--gx-surface-2)", color: "var(--gx-muted)" }}
              >
                {fotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo elegido en el cliente, no un asset del proyecto
                  <img src={fotoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  iniciales(nombre || "?")
                )}
              </div>

              <SelectorFotoPerfil tieneFoto={!!fotoPreview} fotoActualUrl={fotoPreview} alGuardarAjuste={esEdicion ? guardarAjusteFoto : undefined} onCambio={manejarCambioFoto} />
            </div>

            <Input
              name="nombre"
              label="Nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
                  Tipo de documento
                  <select
                    name="tipoDocumento"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
                    className="rounded-lg border px-3 py-2"
                    style={{ borderColor: "var(--gx-edge)", background: "var(--gx-surface)", color: "var(--gx-ink)" }}
                  >
                    {TIPOS_DOCUMENTO.map((t) => (
                      <option key={t} value={t}>
                        {ETIQUETA_TIPO_DOCUMENTO[t]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Input
                name="numeroDocumento"
                label="Número de documento"
                required
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
              />
            </div>
            {codigoSocioActual && (
              <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
                Código de socio (para registrar su asistencia): <strong style={{ color: "var(--gx-ink)" }}>{codigoSocioActual}</strong>
              </p>
            )}
            {!codigoSocioActual && tipoDocumento !== "DNI" && (
              <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
                Se le asignará un código de socio de 4 dígitos al guardar.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="celular"
                label="Celular"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
              />
            </div>

            {(
              esEdicion ? (
                // Fija e informativa: sin name (no viaja) y sin calendario (un InputFecha deshabilitado
                // igual dejaría abrir el calendario).
                <InputFecha label="Fecha de inscripción" value={fechaInscripcion} disabled sinCalendario />
              ) : (
                <InputFecha
                  name="fechaInscripcion"
                  label="Fecha de inscripción"
                  value={fechaInscripcion}
                  onChange={setFechaInscripcion}
                  max={hoyISO()}
                  required
                />
              )
            )}
          </div>

          <Button type="button" className="mt-6 w-full" onClick={manejarClickGuardar} disabled={enviando}>
            Guardar
          </Button>
          <span className="mt-2 block text-xs" style={{ color: "var(--gx-muted-dim)" }}>
            Guarda estos datos junto con el entrenador y el plan del cuadro de al lado.
          </span>
        </Card>

        <Card className="lg:col-start-2 lg:row-start-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--gx-muted)" }}>
              Plan de membresía
            </h2>
            <div className="flex gap-2">
              {esEdicion && cambioPlan && (
                <Button
                  type="button"
                  variant="secundario"
                  onClick={() => {
                    if (
                      hayCambiosSinGuardar &&
                      !window.confirm("Tienes cambios sin guardar en Datos personales: se perderán al cambiar de plan. ¿Continuar?")
                    ) {
                      return;
                    }
                    setCambiandoPlan(true);
                  }}
                >
                  Cambiar plan
                </Button>
              )}
            </div>
          </div>

          {/* La sede única es un metadato: no se muestra, solo viaja en el formulario. */}
          <input type="hidden" name="sucursalId" value={sucursalId} />

          {/* Editables para todos; Se envía solo si cambia. */}
          {editaFechas && (
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="fechaUltimoPagoOriginal" value={valoresIniciales?.fechaUltimoPago ?? ""} />
              <InputFecha name="fechaUltimoPago" label="Fecha de pago" value={fechaUltimoPago} onChange={setFechaUltimoPago} />
              <input type="hidden" name="fechaVencimientoOriginal" value={valoresIniciales?.fechaVencimiento ?? ""} />
              <InputFecha
                id="campo-fecha-vencimiento"
                name="fechaVencimiento"
                label="Fecha de vencimiento"
                value={fechaVencimiento}
                onChange={setFechaVencimiento}
              />
            </div>
          )}

          {esEdicion && (
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--gx-edge)" }}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--gx-muted)" }}>
                  {nombrePlanActual}
                </span>
                <span className="text-2xl font-semibold" style={{ color: "var(--gx-ink)" }}>
                  {formatearSoles(precioActual)}
                  {planSeleccionado && (
                    <span className="text-sm font-normal" style={{ color: "var(--gx-muted)" }}>
                      /{planSeleccionado.diasCiclo} días
                    </span>
                  )}
                </span>
              </div>
              {!cambioPlan && (
                <p className="mt-2 text-xs" style={{ color: "var(--gx-muted)" }}>
                  La membresía no está vigente: para renovar o elegir otro plan registra un cobro desde Caja.
                </p>
              )}
            </div>
          )}

          {!esEdicion && (
          <div className="grid grid-cols-2 gap-3">
            {planesActivos.map((plan) => {
              const seleccionado = planId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => manejarCambioPlan(plan.id)}
                  className="flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-colors duration-150 active:scale-[0.98]"
                  style={
                    seleccionado
                      ? {
                          borderColor: "var(--gx-accent)",
                          background: "color-mix(in srgb, var(--gx-accent) 12%, transparent)",
                        }
                      : { borderColor: "var(--gx-edge)" }
                  }
                >
                  <span className="text-sm font-medium" style={{ color: "var(--gx-muted)" }}>
                    {plan.nombre}
                  </span>
                  <span className="text-2xl font-semibold" style={{ color: "var(--gx-ink)" }}>
                    {formatearSoles(plan.precioUSD)}
                    <span className="text-sm font-normal" style={{ color: "var(--gx-muted)" }}>
                      /{plan.diasCiclo} días
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          )}

          {!esEdicion && consentimiento === null && (
            <p className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }}>
              Falta publicar el texto de consentimiento de datos personales (Configuraciones → Textos legales). El socio se creará sin consentimiento registrado.
            </p>
          )}
          {!esEdicion && consentimiento && (
            <fieldset className="mt-4 flex flex-col gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }}>
              <legend className="px-1 font-medium" style={{ color: "var(--gx-ink)" }}>
                Consentimiento de datos personales (versión {consentimiento.version})
              </legend>
              <details>
                <summary className="cursor-pointer">Leer el texto</summary>
                <p className="mt-2 whitespace-pre-wrap">{consentimiento.contenido}</p>
              </details>
              <label className="flex items-start gap-2">
                <input type="checkbox" name="consentimientoAceptado" required className="mt-1" />
                <span>El socio leyó y aceptó el tratamiento de sus datos personales.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                Cómo lo aceptó
                <select name="consentimientoMedio" defaultValue="PANTALLA" className="min-h-11 rounded-lg border px-3 gx-campo">
                  <option value="PANTALLA">En pantalla</option>
                  <option value="PAPEL">En papel firmado</option>
                </select>
              </label>
            </fieldset>
          )}

          <label className="mt-4 flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
            Entrenador (opcional)
            <select
              name="entrenadorId"
              value={entrenadorId}
              onChange={(e) => setEntrenadorId(e.target.value)}
              className="min-h-11 rounded-lg border px-3 gx-campo"
            >
              <option value="">Sin entrenador</option>
              {entrenadores.map((entrenador) => (
                <option key={entrenador.id} value={entrenador.id}>
                  {entrenador.nombre}
                </option>
              ))}
            </select>
          </label>

          {esEdicion && (
            <div className="mt-4 flex flex-col gap-3">
              {miembroId && (
                <Link
                  href={`/miembros/${miembroId}/pagos`}
                  className="block min-h-11 content-center rounded-lg px-4 text-center text-sm font-medium transition-colors duration-150 active:scale-95"
                  style={{ background: "var(--gx-surface-2)", color: "var(--gx-ink)" }}
                >
                  Ver historial de pagos ({totalPagos ?? 0})
                </Link>
              )}
            </div>
          )}
        </Card>
      </form>

      {/* Primer pago (solo al crear un miembro) / ticket de confirmación —
          formulario propio, fuera de "formulario-miembro" a propósito (no se
          pueden anidar <form>). En edición no hay columna acá salvo mientras
          se confirma el ticket — los pagos se registran desde Caja. */}
      {!esEdicion && (
      <div className="lg:col-start-3 lg:row-start-1">
        {!mostrarTicket ? (
            <Card>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--gx-muted)" }}>
                Primer pago
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--gx-muted)" }}>
                Se registra en el mismo paso que creás al miembro, así queda activo desde hoy sin
                tener que entrar después a &quot;Registrar pago&quot;.
              </p>

              {precioActual > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-semibold" style={{ color: "var(--gx-ink)" }}>
                    Meses a pagar
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: MAX_MESES_POR_PAGO }, (_, i) => i + 1).map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={meses === n ? "primario" : "secundario"}
                        onClick={() => {
                          setMeses(n);
                          setErrorMontoHoy(null);
                        }}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                  {meses > 1 && (
                    <p className="mt-2 text-sm font-bold" style={{ color: "var(--gx-ink)" }}>
                      Total de {meses} meses: {formatearSoles(precioCiclo)}. Se paga completo.
                    </p>
                  )}
                </div>
              )}

              {precioActual > 0 ? (
                <>
                  <p className="mb-4 text-sm font-bold" style={{ color: "var(--gx-ink)" }}>
                    Total a pagar: {formatearSoles(precioCiclo)}. Se paga completo con un solo método.
                  </p>
                  <SelectorMetodoPago metodos={metodosPago} onCambio={setSeleccionMetodo} idFormulario={idFormulario} />
                  {errorMontoHoy && (
                    <p ref={errorPagoRef} className="mt-2 text-sm" style={{ color: "var(--gx-bad)" }}>
                      {errorMontoHoy}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
                  Este plan no tiene costo — no hace falta elegir método de pago.
                </p>
              )}
            </Card>
        ) : (
          <div
            ref={ticketRef}
            className="resplandor-confirmacion rounded-2xl border-2 border-dashed p-5"
            style={{ borderColor: "var(--gx-edge)", background: "var(--gx-surface)" }}
          >
            <p
              className="text-center text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--gx-muted)" }}
            >
              Resumen del nuevo miembro
            </p>

            <div className="my-3 flex justify-center">
              <div
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-lg font-semibold"
                style={{ background: "var(--gx-surface-2)", color: "var(--gx-muted)" }}
              >
                {fotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo elegido en el cliente, no un asset del proyecto
                  <img src={fotoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  iniciales(nombre || "?")
                )}
              </div>
            </div>

            <div className="my-3 border-t border-dashed" style={{ borderColor: "var(--gx-edge)" }} />

            <dl className="flex flex-col gap-2 text-sm">
              <Fila label="Nombre" valor={nombre || "—"} />
              <Fila label="Documento" valor={numeroDocumento ? descripcionDocumento(tipoDocumento, numeroDocumento) : "—"} />
              {codigoSocioActual && <Fila label="Código de socio" valor={codigoSocioActual} />}
              <Fila label="Celular" valor={celular || "—"} />
              <Fila label="Inscripción" valor={formatearFecha(fechaInscripcion)} />
              <Fila label="Plan" valor={meses > 1 ? `${nombrePlanActual} · ${meses} meses` : nombrePlanActual} />
              <Fila label="Entrenador" valor={nombreEntrenadorActual ?? "Sin entrenador"} />
              <Fila label="Método de pago" valor={nombreMetodoPagoActual ?? "—"} />
            </dl>

            <div className="my-3 border-t border-dashed" style={{ borderColor: "var(--gx-edge)" }} />

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--gx-muted)" }}>
                Total
              </span>
              <span className="text-2xl font-bold" style={{ color: "var(--gx-ink)" }}>
                {formatearSoles(montoAPagar)}
              </span>
            </div>

            <p className="mt-5 text-center text-sm font-medium" style={{ color: "var(--gx-muted)" }}>
              ¿Está seguro de la información suministrada?
            </p>

            <div className="mt-3 flex gap-3">
              <Button
                type="button"
                variant="secundario"
                className="flex-1"
                onClick={() => setMostrarTicket(false)}
              >
                No, editar
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={enviando}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {enviando ? "Guardando..." : "Sí, guardar"}
              </Button>
            </div>
          </div>
        )}
      </div>
      )}

      {esEdicion && ultimosCiclos.length > 0 && (
        <Card className={`lg:col-start-1 lg:row-start-2 lg:col-span-2`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--gx-muted)" }}>
              Ciclos
            </h2>
            {diasHastaProximoCobro !== null && (
              <Badge tono={diasHastaProximoCobro < 0 ? "rojo" : diasHastaProximoCobro <= 3 ? "ambar" : "verde"}>
                {diasHastaProximoCobro < 0
                  ? `Vencido hace ${Math.abs(diasHastaProximoCobro)} día${Math.abs(diasHastaProximoCobro) === 1 ? "" : "s"}`
                  : diasHastaProximoCobro === 0
                    ? "Vence hoy"
                    : `${diasHastaProximoCobro} día${diasHastaProximoCobro === 1 ? "" : "s"} para el próximo cobro`}
              </Badge>
            )}
          </div>
          <div className="flex flex-col">
            {ultimosCiclos.map((ciclo, indice) => (
              <div
                key={ciclo.id}
                className="flex items-center justify-between border-b py-2 text-sm last:border-b-0"
                style={{ borderColor: "var(--gx-edge)" }}
              >
                <span style={{ color: "var(--gx-ink)" }}>
                  {ciclo.fechaInicioCiclo && ciclo.fechaFinCiclo
                    ? `${formatearFechaCorta(ciclo.fechaInicioCiclo)} → ${formatearFechaCorta(ciclo.fechaFinCiclo)}`
                    : "—"}
                </span>
                <Badge tono={indice === 0 ? "verde" : "gris"}>{indice === 0 ? "VIGENTE" : "VENCIDO"}</Badge>
              </div>
            ))}
          </div>
          {miembroId && (
            <Link
              href={`/miembros/${miembroId}/pagos`}
              className="mt-3 inline-block text-sm font-medium hover:underline"
              style={{ color: "var(--gx-accent)" }}
            >
              Ver todos los ciclos
            </Link>
          )}
        </Card>
      )}
    </div>

    {esEdicion && cambiandoPlan && cambioPlan && miembroId && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
            miembroId={miembroId}
            planes={cambioPlan.planes}
            planActualId={valoresIniciales?.planId ?? null}
            precioActual={valoresIniciales?.precioPlan ?? 0}
            diasCicloActual={cambioPlan.diasCicloActual}
            vencimientoActual={cambioPlan.vencimiento}
            hoy={cambioPlan.hoy}
            metodosPago={metodosPago}
            onCambiado={() => {
              setCambiandoPlan(false);
              router.refresh();
            }}
          />
          <Button type="button" variant="secundario" className="mt-3 w-full" onClick={() => setCambiandoPlan(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    )}
    </>
  );
}
