"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { CurrencyInput } from "@gym-app/ui/components/CurrencyInput";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { EstadoFormularioPlan } from "./actions";

export interface ValoresFormularioPlan {
  nombre: string;
  diasCiclo: number;
  precioUSD: number;
}

export function FormularioPlan({
  accion,
  valoresIniciales,
}: {
  accion: (estado: EstadoFormularioPlan, formData: FormData) => Promise<EstadoFormularioPlan>;
  valoresIniciales?: ValoresFormularioPlan;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const esEdicion = !!valoresIniciales;
  const { mostrarError } = useFeedback();

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error, no a mostrarError
  }, [estado.error]);

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

      <Input name="nombre" label="Nombre" required defaultValue={valoresIniciales?.nombre} />

      {esEdicion ? (
        <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--gx-edge)" }}>
          <div className="flex justify-between">
            <span style={{ color: "var(--gx-muted)" }}>Duración</span>
            <span style={{ color: "var(--gx-ink)" }}>{valoresIniciales.diasCiclo} días</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--gx-muted)" }}>
            La duración no se puede cambiar. Para otra duración crea un plan nuevo y desactiva este.
          </p>
        </div>
      ) : (
        <Input name="diasCiclo" label="Duración (días, de 1 a 365)" type="number" min={1} max={365} step={1} required />
      )}

      <CurrencyInput
        name="precioUSD"
        label="Precio"
        required
        defaultValue={valoresIniciales?.precioUSD !== undefined ? String(valoresIniciales.precioUSD) : ""}
      />

      <Button type="submit" disabled={enviando}>
        {enviando ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
