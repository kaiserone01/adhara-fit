import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { nombreVisibleMetodo } from "./metodosPagoUI";

// Monograma cuando el método todavía no tiene logo: «BCP» entero si es corto, o las dos primeras letras.
function monograma(nombre: string): string {
  const limpio = nombre.trim().toUpperCase();
  return limpio.length <= 4 ? limpio : limpio.slice(0, 2);
}

/** Logo del método de pago (subido en Configuraciones → Métodos de pago) o, sin logo, un monograma con su nombre. */
export function LogoMetodo({
  metodo,
  className = "h-10 w-10",
}: {
  metodo: Pick<MetodoPago, "logoUrl" | "nombreBanco" | "tipo">;
  className?: string;
}) {
  if (metodo.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo servido desde R2, dominio externo
      <img src={metodo.logoUrl} alt="" className={`${className} shrink-0 rounded-full object-cover`} />
    );
  }
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full text-xs font-bold`}
      style={{ background: "var(--gx-surface-2)", color: "var(--gx-muted)" }}
      aria-hidden
    >
      {monograma(nombreVisibleMetodo(metodo))}
    </div>
  );
}
