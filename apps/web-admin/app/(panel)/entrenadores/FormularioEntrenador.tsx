"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import { CampoFoto } from "../usuarios/FormularioUsuario";
import type { EstadoFormularioEntrenador } from "./actions";

export function FormularioEntrenador({
  accion,
  inicial,
}: {
  accion: (estado: EstadoFormularioEntrenador, formData: FormData) => Promise<EstadoFormularioEntrenador>;
  inicial?: { nombre: string; telefono: string | null; fotoUrl: string | null };
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const { mostrarExito, mostrarError } = useFeedback();

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error
  }, [estado.error]);

  useEffect(() => {
    if (estado.ok) mostrarExito(estado.ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.ok
  }, [estado.ok]);

  return (
    <form action={enviar} className="flex max-w-md flex-col gap-4">
      <CampoFoto nombreActual={inicial?.nombre ?? ""} fotoUrlActual={inicial?.fotoUrl} />
      <Input name="nombre" label="Nombre" required defaultValue={inicial?.nombre ?? ""} />
      <Input name="telefono" label="Teléfono (opcional)" type="tel" defaultValue={inicial?.telefono ?? ""} />
      <Button type="submit" disabled={enviando}>
        {enviando ? "Guardando..." : inicial ? "Guardar" : "Crear entrenador"}
      </Button>
    </form>
  );
}
