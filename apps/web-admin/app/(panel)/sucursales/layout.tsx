import { TabsConfiguraciones } from "../configuraciones/TabsConfiguraciones";
import { TABS_CONFIGURACIONES } from "../configuraciones/tabs";

// Sucursales vive en su propia ruta (fuera de /configuraciones) pero
// comparte la misma barra de tabs — ver diseño acordado.
export default function LayoutSucursales({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-6 pt-6 lg:px-8 lg:pt-8">
        <TabsConfiguraciones tabs={TABS_CONFIGURACIONES} />
      </div>
      {children}
    </>
  );
}
