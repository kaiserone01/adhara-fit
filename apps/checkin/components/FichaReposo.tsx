import { CalendarBlank, Clock } from "@phosphor-icons/react/dist/ssr";
import { MarcoFicha } from "./MarcoFicha";

// Ficha en reposo: nunca muestra datos de una persona. Sin verde ni ✓ de "acceso permitido".
// Solo muestra la hora y la fecha reales del dispositivo (Lima) y la frase configurable; sin sede.
export function FichaReposo({
  frase,
  saliendo,
  hora,
  fecha,
  imagenUrl,
  opacidad,
}: {
  frase: string;
  saliendo: boolean;
  hora: string;
  fecha: string;
  // Imagen y opacidad configuradas en el panel (menú Checkin); sin ellas, el placeholder y 100 %.
  imagenUrl?: string | null;
  opacidad?: number;
}) {
  const datos = [
    { etiqueta: "Hora", valor: hora || "—", Icono: Clock },
    { etiqueta: "Fecha", valor: fecha || "—", Icono: CalendarBlank },
  ];

  return (
    <MarcoFicha color="var(--gx-accent)" brillo="rgba(255, 203, 4, 0.35)" opacidadFondo={opacidad} reposo>
      <div className="grid grid-cols-[auto_1fr] items-center gap-12 p-6">
        <div className="avatar-aro h-64 w-64 shrink-0 overflow-hidden rounded-full" style={{ background: "var(--gx-surface-2)" }}>
          {/* El placeholder trae un aro claro en el borde: se amplía para que el recorte circular lo deje fuera.
              La imagen subida desde el panel ya viene encuadrada, así que no se amplía. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- output: "export" no soporta el optimizador de next/image */}
          <img
            src={imagenUrl ?? "/branding/placeholder-profile.jpg"}
            alt=""
            className={`h-full w-full object-cover${imagenUrl ? "" : " scale-[1.25]"}`}
          />
        </div>

        <div className="flex flex-col gap-6">
          <p
            key={frase}
            className={`min-h-[7rem] text-6xl leading-none ${saliendo ? "frase-salida" : "frase-entrada"}`}
            style={{ fontFamily: '"Bebas Neue", sans-serif', color: "var(--gx-ink)" }}
          >
            {frase}
          </p>

          <div className="h-1.5 w-40 rounded-full" style={{ background: "var(--gx-accent)", boxShadow: "0 0 1.5rem rgba(255,203,4,0.6)" }} />

          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            {datos.map(({ etiqueta, valor, Icono }) => (
              <div key={etiqueta} className="flex items-center gap-4">
                <Icono size={52} weight="duotone" aria-hidden="true" style={{ color: "var(--gx-accent)" }} />
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-bold uppercase" style={{ letterSpacing: "0.1em", color: "var(--gx-muted-dim)" }}>
                    {etiqueta}
                  </span>
                  <span className="whitespace-nowrap text-4xl font-semibold" style={{ color: "var(--gx-ink)" }}>
                    {valor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarcoFicha>
  );
}
