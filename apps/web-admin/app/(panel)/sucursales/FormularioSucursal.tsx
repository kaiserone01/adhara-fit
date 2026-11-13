"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { EstadoFormularioSucursal } from "./actions";

export interface ValoresFormularioSucursal {
  nombre: string;
  direccion: string | null;
  diasGracia: number;
}

export function FormularioSucursal({
  accion,
  valoresIniciales,
  puedeGuardar = true,
}: {
  accion: (estado: EstadoFormularioSucursal, formData: FormData) => Promise<EstadoFormularioSucursal>;
  valoresIniciales?: ValoresFormularioSucursal;
  /** Sin permiso SUCURSALES/EDITAR el formulario se muestra en solo lectura. */
  puedeGuardar?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
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

      <Input
        name="nombre"
        label="Nombre"
        required
        defaultValue={valoresIniciales?.nombre}
        readOnly={!puedeGuardar}
      />
      <Input
        name="direccion"
        label="Dirección"
        defaultValue={valoresIniciales?.direccion ?? ""}
        readOnly={!puedeGuardar}
      />
      <Input
        name="diasGracia"
        label="Días de gracia (solo planes mensuales)"
        type="number"
        required
        defaultValue={valoresIniciales?.diasGracia ?? 0}
        readOnly={!puedeGuardar}
      />

      {puedeGuardar && (
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar"}
        </Button>
      )}
    </form>
  );
}
