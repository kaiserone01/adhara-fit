"use client";

import { useEffect, useRef, useState } from "react";

// Monto en soles: coma para los miles y punto decimal ("1,234.56"). El valor real (numérico, con punto
// decimal, sin comas) viaja en un <input type="hidden"> con el `name` del campo, así los Server Actions
// leen FormData.get(name) como string numérico plano.
function formatearVisual(valorNumerico: string): string {
  if (valorNumerico === "" || valorNumerico === "-") return valorNumerico;
  const numero = Number(valorNumerico);
  if (Number.isNaN(numero)) return valorNumerico;

  const [enteroStr, decimalStr] = valorNumerico.split(".");
  const enteroFormateado = new Intl.NumberFormat("en-US").format(Number(enteroStr || "0"));
  return decimalStr !== undefined ? `${enteroFormateado}.${decimalStr}` : enteroFormateado;
}

// Del texto que el usuario tipea (con comas de miles y punto decimal) al string numérico plano que usa el
// resto del sistema.
function aValorNumerico(textoVisual: string): string {
  const limpio = textoVisual.replace(/,/g, "");
  if (!/^-?\d*\.?\d*$/.test(limpio)) return "";
  return limpio;
}

export function CurrencyInput({
  name,
  label,
  required,
  defaultValue = "",
  value,
  onChange,
  className = "",
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  /** Modo controlado (opcional) — string numérico plano, igual al que se envía en el hidden input. */
  value?: string;
  onChange?: (valorNumerico: string) => void;
  className?: string;
}) {
  const [interno, setInterno] = useState(() => formatearVisual(String(value ?? defaultValue ?? "")));
  // El último valor numérico que ESTE input emitió hacia el padre vía
  // onChange — permite distinguir "el padre me devolvió el mismo valor
  // que yo le mandé" (no tocar `interno`, para no pisar lo que el
  // usuario está tipeando) de "el padre cambió el valor por su cuenta"
  // (ej. precarga desde un fetch, otro control que resetea el monto —
  // ahí sí hay que resincronizar `interno`). Sin esto, cada tecleo podía
  // rebotar: setInterno(texto) local, el padre re-renderiza con el mismo
  // valor, y el useEffect de abajo pisaba `interno` de vuelta.
  const ultimoEmitido = useRef<string | undefined>(value);

  useEffect(() => {
    if (value !== undefined && value !== ultimoEmitido.current) {
      setInterno(formatearVisual(value));
      ultimoEmitido.current = value;
    }
  }, [value]);

  function manejarCambio(texto: string) {
    const numerico = aValorNumerico(texto);
    setInterno(texto);
    ultimoEmitido.current = numerico;
    onChange?.(numerico);
  }

  const valorNumericoActual = value !== undefined ? value : aValorNumerico(interno);

  return (
    <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
      {label}
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          required={required}
          value={interno}
          onChange={(e) => manejarCambio(e.target.value)}
          onBlur={() => setInterno(formatearVisual(valorNumericoActual))}
          placeholder="0.00"
          className={`min-h-11 w-full rounded-lg border pl-11 pr-3 ${className} gx-campo`}
        />
        <span className="pointer-events-none absolute left-3 text-lg font-bold" style={{ color: "var(--gx-accent)" }}>
          S/
        </span>
      </div>
      <input type="hidden" name={name} value={valorNumericoActual} />
    </label>
  );
}
