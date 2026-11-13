"use client";

import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { InputFecha } from "@gym-app/ui/components/InputFecha";
import { Card } from "@gym-app/ui/components/Card";
import { Badge } from "@gym-app/ui/components/Badge";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { actualizarFotoMiembroAction, type EstadoFormularioMiembro } from "./actions";
import { FormularioCambiarPlan, type PlanParaCambio } from "./FormularioCambiarPlan";
import { cambiarPlanAction } from "../pagos/actions";
import { SelectorFotoPerfil } from "./SelectorFotoPerfil";
import type { EntrenadorResumen } from "@gym-app/domain/entities/EntrenadorResumen";
import type { SucursalResumen } from "@gym-app/domain/entities/SucursalResumen";
import type { Plan } from "@gym-app/domain/entities/Plan";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import {
  aplicarMascaraDocumento,
  ETIQUETA_TIPO_DOCUMENTO,
  LARGO_MAXIMO_DOCUMENTO,
  PATRON_DOCUMENTO,
  TIPOS_DOCUMENTO,
  type TipoDocumento,
} from "@gym-app/domain/utils/documento";
import {
  aplicarMascaraCelular,
  LARGO_MAXIMO_CORREO,
  PATRON_CELULAR_MASCARA,
  validarCelular,
} from "@gym-app/domain/utils/contacto";
import { SelectorEntrenador } from "./SelectorEntrenador";

export interface ValoresFormularioMiembro {
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  codigoSocio: string | null;
  celular: string;
  correo: string;
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
  const sinTocarDocumento =
    !!valoresIniciales && tipoDocumento === valoresIniciales.tipoDocumento && numeroDocumento === valoresIniciales.numeroDocumento;
  // El celular guardado se muestra con la máscara si es válido; uno anterior a las validaciones se muestra tal cual.
  const celularInicial = valoresIniciales?.celular ?? "";
  const celularInicialMostrado = validarCelular(celularInicial) ? aplicarMascaraCelular(celularInicial) : celularInicial;
  const [celular, setCelular] = useState(celularInicialMostrado);
  const [correo, setCorreo] = useState(valoresIniciales?.correo ?? "");
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
      ? [...entrenadoresActivos, { id: valoresIniciales.entrenadorId, nombre: "(entrenador actual)", fotoUrl: null }]
      : entrenadoresActivos;

  const [planId, setPlanId] = useState<string>(() => {
    if (!valoresIniciales) return planesActivos[0]?.id ?? "";
    return valoresIniciales.planId ?? "";
  });
  const [precio, setPrecio] = useState<string>(String(valoresIniciales?.precioPlan ?? planesActivos[0]?.precioUSD ?? ""));
  const router = useRouter();
  // El cambio de plan (S-07) es un formulario aparte, en un modal fuera del formulario de la ficha.
  const [cambiandoPlan, setCambiandoPlan] = useState(false);

  const planSeleccionado = planesActivos.find((p) => p.id === planId);

  const precioActual = Number(precio) || 0;
  const nombrePlanActual = planSeleccionado?.nombre ?? "—";
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
      celular !== celularInicialMostrado ||
      correo !== valoresIniciales.correo ||
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

    <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2`}>
      {/* display: contents — Datos personales y Plan de membresía quedan como
          celdas independientes de la grilla de 3 columnas, pero sus campos
          (incluidos los de la card de Plan) siguen siendo hijos reales de
          este <form> en el DOM, nunca se desmontan aparte (a diferencia del
          intento anterior con form={idFormulario}, que sí se rompía). */}
      <form ref={formRef} id={idFormulario} action={enviar} style={{ display: "contents" }}>
        <input type="hidden" name="planId" value={planId} />
        <input type="hidden" name="precioPlan" value={precioActual} />
        <input type="hidden" name="planNombre" value={nombrePlanActual} />
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
              <div className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }} role="group" aria-label="Tipo de documento">
                Tipo de documento
                <input type="hidden" name="tipoDocumento" value={tipoDocumento} />
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_DOCUMENTO.map((tipo) => {
                    const seleccionado = tipoDocumento === tipo;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        aria-pressed={seleccionado}
                        onClick={() => {
                          setTipoDocumento(tipo);
                          setNumeroDocumento((actual) => aplicarMascaraDocumento(tipo, actual));
                        }}
                        className="min-h-11 rounded-lg border-2 px-3 text-sm font-semibold transition-colors duration-150 active:scale-[0.98]"
                        style={
                          seleccionado
                            ? {
                                borderColor: "var(--gx-accent)",
                                background: "color-mix(in srgb, var(--gx-accent) 12%, transparent)",
                                color: "var(--gx-ink)",
                              }
                            : { borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }
                        }
                      >
                        {ETIQUETA_TIPO_DOCUMENTO[tipo]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Input
                name="numeroDocumento"
                label="Número de documento"
                required
                inputMode="numeric"
                autoComplete="off"
                maxLength={LARGO_MAXIMO_DOCUMENTO[tipoDocumento]}
                placeholder={tipoDocumento === "DNI" ? "12345678" : "123456789"}
                // Un documento anterior a las validaciones no bloquea guardar mientras no se toque.
                pattern={sinTocarDocumento ? undefined : PATRON_DOCUMENTO[tipoDocumento]}
                title={tipoDocumento === "DNI" ? "8 dígitos" : "Entre 9 y 12 dígitos"}
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(aplicarMascaraDocumento(tipoDocumento, e.target.value))}
              />
            </div>
            {codigoSocioActual && (
              <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
                Código de socio (para registrar su asistencia): <strong style={{ color: "var(--gx-ink)" }}>{codigoSocioActual}</strong>
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                name="celular"
                label="Celular (opcional)"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={11}
                placeholder="987 654 321"
                pattern={celular === celularInicialMostrado ? undefined : PATRON_CELULAR_MASCARA}
                title="9 dígitos, empieza con 9"
                value={celular}
                onChange={(e) => setCelular(aplicarMascaraCelular(e.target.value))}
              />
              <Input
                name="correo"
                label="Correo (opcional)"
                type="email"
                inputMode="email"
                autoComplete="off"
                maxLength={LARGO_MAXIMO_CORREO}
                placeholder="nombre@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value.replace(/\s/g, ""))}
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

          <SelectorEntrenador entrenadores={entrenadores} valor={entrenadorId} onCambio={setEntrenadorId} />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button type="submit" name="despues" value="listo" variant="secundario" className="flex-1" disabled={enviando}>
                {enviando ? "Guardando..." : "Guardar"}
              </Button>
              <Button type="submit" name="despues" value="cobrar" className="flex-1" disabled={enviando || precioActual <= 0}>
                Guardar y cobrar
              </Button>
            </div>

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
