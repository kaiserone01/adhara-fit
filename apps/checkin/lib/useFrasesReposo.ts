import { useMemo } from "react";
import type { InfoCheckin } from "./api";
import { claveDeFrases, frasesDesdeClave } from "./frasesReposo";

// Frases del reposo: las de la sucursal si hay, si no las predeterminadas. La referencia solo cambia si
// cambia el contenido.
export function useFrasesReposo(reposo: InfoCheckin["reposo"]): readonly string[] {
  const clave = claveDeFrases(reposo?.frases);
  return useMemo(() => frasesDesdeClave(clave), [clave]);
}
