"use client";

import { useState } from "react";
import { Button } from "@gym-app/ui/components/Button";

export function BotonCopiarEnlace({ enlace }: { enlace: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso del portapapeles: el enlace queda visible para copiarlo a mano.
    }
  }

  return (
    <Button type="button" variant="secundario" onClick={copiar}>
      {copiado ? "Copiado" : "Copiar enlace"}
    </Button>
  );
}
