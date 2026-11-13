"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { EstadoFormularioMetodoPago } from "../actions";
import type { TipoMetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { ETIQUETA_TIPO_METODO_PAGO, TIPOS_MULTI_INSTANCIA } from "../metodosPagoUI";

export interface ValoresFormularioMetodoPago {
  tipo: TipoMetodoPago;
  nombreBanco: string | null;
  logoUrl: string | null;
  qrUrl: string | null;
  telefono: string | null;
  numeroCuenta: string | null;
  beneficiario: string | null;
}

const TIPOS: TipoMetodoPago[] = ["EFECTIVO", "BILLETERA_DIGITAL", "TARJETA", "TRANSFERENCIA", "DEPOSITO"];

const ETIQUETA_NOMBRE: Partial<Record<TipoMetodoPago, string>> = {
  BILLETERA_DIGITAL: "Billetera (Yape, Plin…)",
  TARJETA: "Terminal o banco (Niubiz, Izipay…)",
};

export function FormularioMetodoPago({
  accion,
  valoresIniciales,
}: {
  accion: (estado: EstadoFormularioMetodoPago, formData: FormData) => Promise<EstadoFormularioMetodoPago>;
  valoresIniciales?: ValoresFormularioMetodoPago;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const esEdicion = !!valoresIniciales;
  const { mostrarError } = useFeedback();

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error, no a mostrarError
  }, [estado.error]);

  const [tipo, setTipo] = useState<TipoMetodoPago>(valoresIniciales?.tipo ?? "BILLETERA_DIGITAL");
  const [logoPreview, setLogoPreview] = useState<string | null>(valoresIniciales?.logoUrl ?? null);
  const [qrPreview, setQrPreview] = useState<string | null>(valoresIniciales?.qrUrl ?? null);

  const admiteBanco = TIPOS_MULTI_INSTANCIA.includes(tipo);
  const esBilletera = tipo === "BILLETERA_DIGITAL";
  const conCuenta = tipo === "TRANSFERENCIA" || tipo === "DEPOSITO";

  function manejarCambioLogo(archivo: File | undefined) {
    if (!archivo) return;
    setLogoPreview(URL.createObjectURL(archivo));
  }

  function manejarCambioQr(archivo: File | undefined) {
    if (!archivo) return;
    setQrPreview(URL.createObjectURL(archivo));
  }

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

      <input type="hidden" name="logoUrl" value={valoresIniciales?.logoUrl ?? ""} />
      <input type="hidden" name="qrUrl" value={valoresIniciales?.qrUrl ?? ""} />

      {!esEdicion && (
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
          Tipo
          <select
            name="tipo"
            required
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMetodoPago)}
            className="min-h-11 rounded-lg border px-3 gx-campo"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_METODO_PAGO[t]}
              </option>
            ))}
          </select>
        </label>
      )}

      {admiteBanco && (
        <Input
          name="nombreBanco"
          label={ETIQUETA_NOMBRE[tipo] ?? "Banco"}
          required
          defaultValue={valoresIniciales?.nombreBanco ?? ""}
        />
      )}

      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{ background: "var(--gx-surface-2)" }}
        >
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo elegido en el cliente
            <img src={logoPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs" style={{ color: "var(--gx-muted)" }}>
              Sin logo
            </span>
          )}
        </div>
        <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--gx-muted)" }}>
          Logo
          <input
            type="file"
            name="logo"
            accept="image/*"
            onChange={(e) => manejarCambioLogo(e.target.files?.[0])}
            className="gx-archivo"
          />
        </label>
      </div>

      {esBilletera && (
        <>
          <Input name="telefono" label="Número de celular" defaultValue={valoresIniciales?.telefono ?? ""} />

          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg"
              style={{ background: "var(--gx-surface-2)" }}
            >
              {qrPreview ? (
                // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo elegido en el cliente
                <img src={qrPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs" style={{ color: "var(--gx-muted)" }}>
                  Sin QR
                </span>
              )}
            </div>
            <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--gx-muted)" }}>
              QR (opcional)
              <input
                type="file"
                name="qr"
                accept="image/*"
                onChange={(e) => manejarCambioQr(e.target.files?.[0])}
                className="gx-archivo"
              />
            </label>
          </div>
        </>
      )}

      {conCuenta && (
        <>
          <Input name="beneficiario" label="Nombre del beneficiario" defaultValue={valoresIniciales?.beneficiario ?? ""} />
          <Input name="numeroCuenta" label="Número de cuenta" defaultValue={valoresIniciales?.numeroCuenta ?? ""} />
        </>
      )}

      <Button type="submit" disabled={enviando}>
        {enviando ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
