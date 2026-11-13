"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { EstadoFormularioTextoLegal } from "./actions";

export function FormularioTextoLegal({
  accion,
  contenidoInicial,
  hayVersion,
}: {
  accion: (estado: EstadoFormularioTextoLegal, formData: FormData) => Promise<EstadoFormularioTextoLegal>;
  contenidoInicial: string;
  hayVersion: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const { mostrarError } = useFeedback();

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error
  }, [estado.error]);

  return (
    <form action={enviar} className="mt-3 flex flex-col gap-3">
      <textarea
        name="contenido"
        defaultValue={contenidoInicial}
        rows={10}
        required
        className="rounded-lg border p-3 text-sm gx-campo"
        placeholder="Pega aquí el texto que revisó tu abogado."
      />
      {hayVersion && (
        <label className="flex items-start gap-2 text-sm" style={{ color: "var(--gx-muted)" }}>
          <input type="checkbox" name="cambioSustancial" className="mt-1" />
          <span>Cambio sustancial: los socios que ya aceptaron deberán aceptar de nuevo.</span>
        </label>
      )}
      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Publicando..." : hayVersion ? "Publicar nueva versión" : "Publicar versión 1"}
        </Button>
      </div>
    </form>
  );
}
