"use client";

import { useEffect, useState } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { CampoNumeroOperacion } from "./CampoNumeroOperacion";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { ETIQUETA_DISCRETA_TIPO_METODO_PAGO, construirNombreMetodo, nombreVisibleMetodo } from "../configuraciones/metodosPagoUI";
import { LogoMetodo } from "../configuraciones/LogoMetodo";

export function SelectorMetodoPago({
  metodos,
  onCambio,
  idFormulario,
  grande = false,
  ocultarNumeroOperacion = false,
  compacto = false,
  numeroOperacion: numeroOperacionProp,
  onCambioNumeroOperacion: onCambioNumeroOperacionProp,
}: {
  metodos: MetodoPago[];
  onCambio: (seleccion: {
    metodoPagoId: string | null;
    metodo: string;
    numeroOperacion: string;
    // Si el método elegido pide número de operación (todos menos
    // Efectivo) — expuesto para que un padre con ocultarNumeroOperacion=true
    // sepa si debe pedir ese campo por su cuenta.
    requiereNumeroOperacion: boolean;
  }) => void;
  // El <Input> de "número de operación" vive dentro de este selector pero
  // el submit final es el <form> del padre — se enlaza con el atributo form=.
  idFormulario?: string;
  // Solo el wizard de Caja (ModalRegistrarPagoCaja) lo pide — el uso en
  // /miembros/[id] y /pagos/nuevo se queda con su tamaño actual.
  grande?: boolean;
  // El wizard de Caja en modalidad Abono necesita el campo "Número de
  // operación" DESPUÉS del monto a abonar (ver diseño acordado). Con esto
  // en true, este componente deja de renderizarlo y de guardar su propio
  // estado — el padre pasa numeroOperacion/onCambioNumeroOperacion y
  // renderiza su propio <Input>, en el lugar que le convenga.
  ocultarNumeroOperacion?: boolean;
  // Íconos y espaciados más chicos (mismo tamaño de texto) para que el asistente de Caja no haga scroll.
  compacto?: boolean;
  numeroOperacion?: string;
  onCambioNumeroOperacion?: (valor: string) => void;
}) {
  const [metodoId, setMetodoId] = useState<string | null>(null);
  const [numeroOperacionInterno, setNumeroOperacionInterno] = useState("");
  // Controlado solo cuando el padre oculta el campo propio y toma el
  // control (ver ocultarNumeroOperacion) — el resto de los usos (Caja en
  // Total/Combinado, /miembros, /pagos/nuevo) siguen con el estado interno
  // de siempre, sin cambios de comportamiento.
  const numeroOperacion = ocultarNumeroOperacion ? (numeroOperacionProp ?? "") : numeroOperacionInterno;
  const setNumeroOperacion = ocultarNumeroOperacion
    ? (valor: string) => onCambioNumeroOperacionProp?.(valor)
    : setNumeroOperacionInterno;
  const [mostrarDatos, setMostrarDatos] = useState(false);

  const metodo = metodos.find((m) => m.id === metodoId) ?? null;
  const requiereNumeroOperacion = metodo ? metodo.tipo !== "EFECTIVO" : false;

  useEffect(() => {
    onCambio({
      metodoPagoId: metodo?.id ?? null,
      metodo: metodo ? construirNombreMetodo(metodo) : "",
      requiereNumeroOperacion,
      numeroOperacion,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCambio se reconstruye cada render en el padre, no debe disparar el efecto
  }, [metodo, numeroOperacion]);

  const textoNombre = grande ? "text-base" : "text-sm";

  return (
    <div className="flex flex-col gap-4">
      <div className={compacto ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
        {metodos.map((m) => {
          const seleccionado = metodoId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetodoId(m.id)}
              className={`flex items-center gap-2.5 rounded-lg border-2 text-left transition-colors duration-150 active:scale-95 ${compacto ? "min-h-12 px-2.5 py-1.5" : "min-h-14 px-3 py-2"}`}
              style={
                seleccionado
                  ? { borderColor: "var(--gx-accent)", background: "color-mix(in srgb, var(--gx-accent) 12%, transparent)" }
                  : { borderColor: "var(--gx-field-edge)" }
              }
            >
              <LogoMetodo metodo={m} className={compacto ? "h-8 w-8" : "h-10 w-10"} />
              <span className="flex min-w-0 flex-col">
                <span className={`${textoNombre} truncate font-semibold`} style={{ color: "var(--gx-ink)" }}>
                  {nombreVisibleMetodo(m)}
                </span>
                <span className="text-[0.65rem] leading-tight" style={{ color: "var(--gx-muted-dim)" }}>
                  {ETIQUETA_DISCRETA_TIPO_METODO_PAGO[m.tipo]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {metodo && metodo.tipo !== "EFECTIVO" && (
        <Button type="button" variant="secundario" className="self-start" onClick={() => setMostrarDatos(true)}>
          Ver datos para el pago
        </Button>
      )}

      {requiereNumeroOperacion && !ocultarNumeroOperacion && (
        <CampoNumeroOperacion form={idFormulario} value={numeroOperacion} onChange={setNumeroOperacion} />
      )}

      {mostrarDatos && metodo && <ModalDatosPago metodo={metodo} onCerrar={() => setMostrarDatos(false)} />}

    </div>
  );
}

function ModalDatosPago({ metodo, onCerrar }: { metodo: MetodoPago; onCerrar: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, black 60%, transparent)" }}
    >
      <div className="marca-agua-modal w-full max-w-sm rounded-2xl border-2 p-6" style={{ borderColor: "var(--gx-accent)", background: "var(--gx-surface)" }}>
        <div className="flex items-center gap-3">
          <LogoMetodo metodo={metodo} />
          <h3 className="text-lg font-bold" style={{ color: "var(--gx-ink)" }}>
            {nombreVisibleMetodo(metodo)}
          </h3>
        </div>

        <dl className="mt-4 flex flex-col gap-2 text-sm">
          {metodo.telefono && <Dato label="Celular" valor={metodo.telefono} />}
          {metodo.beneficiario && <Dato label="Beneficiario" valor={metodo.beneficiario} />}
          {metodo.numeroCuenta && <Dato label="Cuenta" valor={metodo.numeroCuenta} />}
        </dl>

        {metodo.qrUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- QR servido desde R2
          <img src={metodo.qrUrl} alt="Código QR" className="mx-auto mt-4 h-40 w-40" />
        )}

        <Button type="button" className="mt-5 w-full" onClick={onCerrar}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: "var(--gx-muted)" }}>{label}</dt>
      <dd className="font-medium" style={{ color: "var(--gx-ink)" }}>
        {valor}
      </dd>
    </div>
  );
}
