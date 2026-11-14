import { HandPointing } from "@phosphor-icons/react/dist/ssr";

// Píldora inferior: indica cómo ingresar (Enter del numpad). También se puede tocar para enviar lo tecleado.
// Solo habilita el envío cuando hay un documento escrito; vacía no hace nada.
export function IndicadorIngreso({ habilitado, alTocar }: { habilitado: boolean; alTocar: () => void }) {
  return (
    <button
      type="button"
      onClick={habilitado ? alTocar : undefined}
      // El foco debe quedarse en el campo (o en el teclado global): la píldora no lo roba al tocarla.
      onMouseDown={(evento) => evento.preventDefault()}
      tabIndex={-1}
      className={`indicador-ingreso ${habilitado ? "indicador-ingreso-listo" : ""}`}
    >
      <HandPointing size={40} weight="fill" aria-hidden="true" />
      <span>Presiona Enter para ingresar</span>
    </button>
  );
}
