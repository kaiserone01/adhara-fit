"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { guardarDatosNegocioAction } from "./actions";

export function FormularioDatosNegocio({
  valores,
}: {
  valores: { razonSocial: string | null; ruc: string | null; direccion: string | null };
}) {
  const [estado, enviar, enviando] = useActionState(guardarDatosNegocioAction, {});
  const { mostrarError } = useFeedback();

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error
  }, [estado.error]);

  return (
    <form action={enviar} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
      <Input name="razonSocial" label="Razón social" defaultValue={valores.razonSocial ?? ""} maxLength={200} />
      <Input name="ruc" label="RUC" defaultValue={valores.ruc ?? ""} inputMode="numeric" maxLength={11} />
      <Input name="direccion" label="Dirección del local" defaultValue={valores.direccion ?? ""} maxLength={300} />
      <div className="md:col-span-3">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar datos"}
        </Button>
      </div>
    </form>
  );
}
