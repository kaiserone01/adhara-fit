"use client";

import { useEffect, useState } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { CampoNumeroOperacion } from "./CampoNumeroOperacion";
import type { MetodoPago, TipoMetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { ETIQUETA_TIPO_METODO_PAGO, construirNombreMetodo } from "../configuraciones/metodosPagoUI";

// Íconos SVG inline por tipo — sin depender de PNGs ni emojis (ver diseño
// acordado).
function IconoBillete() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 9v0M19 15v0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconoTelefono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <rect x="6" y="2" width="12" height="20" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconoBanco() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M3 10l9-6 9 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9M10 10v9M14 10v9M19 10v9M3 19h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconoTarjeta() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const ICONO_TIPO: Record<TipoMetodoPago, () => React.ReactElement> = {
  EFECTIVO: IconoBillete,
  BILLETERA_DIGITAL: IconoTelefono,
  TARJETA: IconoTarjeta,
  TRANSFERENCIA: IconoBanco,
  DEPOSITO: IconoBanco,
};

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
  const [tipoAbierto, setTipoAbierto] = useState<TipoMetodoPago | null>(null);
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

  const tiposDisponibles = Array.from(new Set(metodos.map((m) => m.tipo)));
  const metodo = metodos.find((m) => m.id === metodoId) ?? null;
  // EFECTIVO nunca abre el grid de "instancias" (tarjetas con nombre de banco); el resto de los tipos con más de
  // una instancia sí usa ese grid.
  const instanciasDelTipo = tipoAbierto && tipoAbierto !== "EFECTIVO" ? metodos.filter((m) => m.tipo === tipoAbierto) : [];
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

  function elegirTipo(tipo: TipoMetodoPago) {
    setTipoAbierto(tipo);
    const instancias = metodos.filter((m) => m.tipo === tipo);
    if (instancias.length === 1 || (tipo === "EFECTIVO" && instancias.length > 0)) {
      setMetodoId(instancias[0].id);
    } else {
      setMetodoId(null);
    }
  }

  const textoTipo = grande ? "text-sm" : "text-xs";
  const textoInstancia = grande ? "text-base" : "text-sm";

  return (
    <div className="flex flex-col gap-4">
      <div className={compacto ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "grid grid-cols-3 gap-2"}>
        {tiposDisponibles.map((tipo) => {
          const Icono = ICONO_TIPO[tipo];
          const seleccionado = tipoAbierto === tipo;
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => elegirTipo(tipo)}
              className={`flex items-center rounded-lg border-2 transition-colors duration-150 active:scale-95 ${compacto ? "min-h-12 flex-row gap-2.5 px-3 py-1.5 [&_svg]:h-5 [&_svg]:w-5" : "flex-col gap-1.5 p-3"}`}
              style={
                seleccionado
                  ? { borderColor: "var(--gx-accent)", background: "color-mix(in srgb, var(--gx-accent) 12%, transparent)" }
                  : { borderColor: "var(--gx-field-edge)" }
              }
            >
              <span style={{ color: seleccionado ? "var(--gx-accent)" : "var(--gx-muted)" }}>
                <Icono />
              </span>
              <span className={`${textoTipo} font-medium ${compacto ? "text-left leading-tight" : "text-center"}`} style={{ color: "var(--gx-ink)" }}>
                {ETIQUETA_TIPO_METODO_PAGO[tipo]}
              </span>
            </button>
          );
        })}
      </div>

      {tipoAbierto && instanciasDelTipo.length > 1 && (
        <div className={compacto ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "grid grid-cols-2 gap-2"}>
          {instanciasDelTipo.map((instancia) => (
            <button
              key={instancia.id}
              type="button"
              onClick={() => setMetodoId(instancia.id)}
              className={`flex items-center gap-2 rounded-lg border-2 text-left transition-colors duration-150 active:scale-95 ${compacto ? "p-1.5" : "p-2.5"}`}
              style={
                metodoId === instancia.id
                  ? { borderColor: "var(--gx-accent)", background: "color-mix(in srgb, var(--gx-accent) 12%, transparent)" }
                  : { borderColor: "var(--gx-field-edge)" }
              }
            >
              {instancia.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo servido desde R2
                <img src={instancia.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded-full" style={{ background: "var(--gx-surface-2)" }} />
              )}
              <span className={`${textoInstancia} font-medium`} style={{ color: "var(--gx-ink)" }}>
                {instancia.nombreBanco}
              </span>
            </button>
          ))}
        </div>
      )}

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
          {metodo.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- logo servido desde R2
            <img src={metodo.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          )}
          <h3 className="text-lg font-bold" style={{ color: "var(--gx-ink)" }}>
            {ETIQUETA_TIPO_METODO_PAGO[metodo.tipo]}
            {metodo.nombreBanco ? ` - ${metodo.nombreBanco}` : ""}
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
