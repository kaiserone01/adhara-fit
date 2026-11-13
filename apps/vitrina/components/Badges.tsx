import type { VitrinaItem } from "@gym-app/domain/entities/Vitrina";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { descuentoMostrado } from "@gym-app/domain/utils/vitrinaBadges";

const PASTILLA = "rgba(35, 31, 32, 0.78)";

// Etiqueta, descuento, precio (tachado si hay oferta) y oferta, cada uno según sus banderas. Descuento y etiqueta
// llevan texto ("-20 %", "NUEVO"), no solo color.
export function Badges({ item }: { item: VitrinaItem }) {
  const etiqueta = item.mostrarEtiqueta ? item.etiqueta : null;
  const descuentoCalculado = descuentoMostrado(item);
  const descuento = descuentoCalculado !== null && Number.isFinite(descuentoCalculado) && descuentoCalculado > 0 ? descuentoCalculado : null;
  const oferta = item.mostrarOferta ? item.ofertaUSD : null;
  const precio = item.mostrarPrecio ? item.precioUSD : null;
  if (!etiqueta && descuento === null && oferta === null && precio === null) return null;

  return (
    <div className="absolute bottom-[3rem] left-[3rem] flex flex-col items-start gap-[0.6rem] tabular-nums max-w-[calc(100%-6rem)]">
      <div className="flex flex-wrap gap-[0.6rem]">
        {etiqueta && (
          <span className="titulo rounded-[0.5rem] px-[1.2rem] py-[0.3rem] text-[2.4rem]" style={{ background: "var(--gx-accent)", color: "var(--gx-accent-ink)" }}>
            {etiqueta}
          </span>
        )}
        {descuento !== null && (
          <span className="titulo rounded-[0.5rem] px-[1.2rem] py-[0.3rem] text-[2.4rem]" style={{ background: "var(--gx-warn)", color: "var(--gx-warn-ink)" }}>
            -{descuento} %
          </span>
        )}
      </div>
      {(oferta !== null || precio !== null) && (
        <div className="flex items-baseline gap-[1.2rem] rounded-[0.8rem] px-[1.6rem] py-[0.6rem]" style={{ background: PASTILLA }}>
          {oferta !== null ? (
            <>
              {precio !== null && (
                <span className="text-[2.2rem] line-through" style={{ color: "var(--gx-muted)" }}>
                  {formatearSoles(precio)}
                </span>
              )}
              <span className="titulo text-[5rem]" style={{ color: "var(--gx-accent)" }}>
                {formatearSoles(oferta)}
              </span>
            </>
          ) : (
            <span className="titulo text-[5rem]" style={{ color: "var(--gx-ink)" }}>
              {formatearSoles(precio as number)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
