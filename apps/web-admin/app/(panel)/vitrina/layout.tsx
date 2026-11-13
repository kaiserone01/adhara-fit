import { redirect } from "next/navigation";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { puedeEditarCheckino } from "@/lib/permisoCheckino";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { TabsConfiguraciones } from "../configuraciones/TabsConfiguraciones";
import { TABS_VITRINA } from "./tabs";
import { tabsConfiguracionesPara } from "../configuraciones/tabs";

export default async function LayoutVitrina({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  if (!puedeEditarCheckino(sesion.usuario.rol)) redirect("/miembros");

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <PageHeader>Configuraciones</PageHeader>
      </div>

      <TabsConfiguraciones tabs={tabsConfiguracionesPara(sesion.usuario.rol)} />
      <TabsConfiguraciones tabs={TABS_VITRINA} />

      {children}
    </div>
  );
}
