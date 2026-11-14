import type { ComponentProps } from "react";
import { IdentificationCard } from "@phosphor-icons/react/dist/ssr";

const PLACEHOLDER = "N.º de DNI o Carné de Extranjería";

// Campo del documento. Estados: reposo, foco/escribiendo (brillo más fuerte), enviando (aro girando) y bloqueado.
// El identificador nunca se muestra (ADR-004): solo un punto por dígito. Con teclado físico (APK de TV) no hay
// <input> y la caja es informativa; en un navegador se usa el <input> real, enfocado siempre.
export function CampoIdentificador({
  longitud,
  sinInput,
  propsInput,
  procesando,
  bloqueado,
}: {
  longitud: number;
  sinInput: boolean;
  propsInput: ComponentProps<"input">;
  procesando: boolean;
  bloqueado: boolean;
}) {
  const activo = longitud > 0 || procesando;

  return (
    <div
      className={`campo-id ${activo ? "campo-id-activo" : ""} ${bloqueado ? "campo-id-bloqueado" : ""}`}
      aria-busy={procesando}
    >
      <IdentificationCard size={56} weight="duotone" aria-hidden="true" className="campo-id-icono" />

      {sinInput ? (
        <div
          role="textbox"
          aria-readonly="true"
          aria-label="Número de documento (oculto)"
          className="campo-id-texto"
          style={{ color: longitud ? "var(--gx-ink)" : "var(--gx-muted)" }}
        >
          {longitud ? "•".repeat(longitud) : PLACEHOLDER}
        </div>
      ) : (
        <input
          {...propsInput}
          aria-label="Número de DNI o Carné de Extranjería"
          placeholder={PLACEHOLDER}
          disabled={bloqueado}
          className="campo-id-texto campo-id-input"
        />
      )}

      <span className={`campo-id-giro ${procesando ? "campo-id-giro-visible" : ""}`} aria-hidden="true" />
    </div>
  );
}
