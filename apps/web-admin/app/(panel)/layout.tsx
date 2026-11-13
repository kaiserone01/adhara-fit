import { Suspense } from "react";
import { redirect } from "next/navigation";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { Sidebar } from "@gym-app/ui/components/Sidebar";
import { FeedbackProvider } from "@gym-app/ui/components/FeedbackOverlay";
import { FeedbackDesdeUrl } from "@gym-app/ui/components/FeedbackDesdeUrl";
import { RelojLima } from "@gym-app/ui/components/RelojLima";
import { BarraUsuario } from "./BarraUsuario";
import { EncabezadoSidebar } from "./EncabezadoSidebar";
import { NavegacionMobile } from "./NavegacionMobile";
import { ProveedorEnSala, ContadorEnSala, AvisoCobros } from "./en-sala/ContextoEnSala";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerUsuarioDeSesionActual();

  if (!sesion) {
    redirect("/login");
  }
  const { usuario } = sesion;

  return (
    <FeedbackProvider>
      <Suspense fallback={null}>
        <FeedbackDesdeUrl />
      </Suspense>
      {/* En escritorio el reloj vive en el encabezado del sidebar; el flotante solo se usa en mobile. */}
      <div className="lg:hidden">
        <RelojLima />
      </div>
      <ProveedorEnSala>
      <div className="marca-agua-pagina flex min-h-dvh flex-col lg:flex-row" style={{ background: "var(--gx-ground)" }}>
        <AvisoCobros />
        <div className="hidden lg:block print:hidden">
          <Sidebar
            encabezado={<EncabezadoSidebar />}
            items={[
              { href: "/en-sala", label: "En sala", extra: <ContadorEnSala /> },
              { href: "/miembros", label: "Miembros" },
              { href: "/cobros", label: "Cobros" },
              { href: "/productos", label: "Productos" },
              { href: "/reportes", label: "Reportes" },
              // Planes y Administradores se administran desde las tabs de Configuraciones.
              { href: "/configuraciones", label: "Configuraciones" },
            ]}
            pie={<BarraUsuario nombre={usuario.nombre} email={usuario.email} fotoUrl={usuario.fotoUrl} />}
          />
        </div>
        {/* pt-16 reserva el espacio del reloj (fixed,
            arriba a la derecha) — sin esto tapaba controles de página
            que también viven en esa esquina (ej. "Nuevo miembro" en
            /miembros). Se aplica acá, una sola vez, en vez de que cada
            página tenga que acordarse de dejarle margen. */}
        <main className="flex-1 pt-16 pb-16 lg:pb-0">{children}</main>
        <div className="print:hidden">
          <NavegacionMobile nombre={usuario.nombre} email={usuario.email} />
        </div>
      </div>
      </ProveedorEnSala>
    </FeedbackProvider>
  );
}
