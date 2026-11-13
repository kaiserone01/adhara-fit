import { RelojLima } from "@gym-app/ui/components/RelojLima";

// Mismo esquema visual del nombre del gym que la pantalla de login
// (ver apps/web-admin/app/login/page.tsx) — acá en tamaño reducido, arriba
// del menú del sidebar, con la fecha y hora de Lima en vivo debajo.
// Logo horizontal del kit de marca para fondo oscuro (S-19).
export function EncabezadoSidebar() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático del kit de marca */}
        <img src="/branding/logo-negativo.png" alt="Adhara Fit" className="mx-auto h-9 w-auto" />
        <div
          className="mt-2 text-[10px] uppercase"
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "var(--gx-muted-dim)",
          }}
        >
          Gym · Panel de administración
        </div>
      </div>
      <RelojLima integrado />
    </div>
  );
}
