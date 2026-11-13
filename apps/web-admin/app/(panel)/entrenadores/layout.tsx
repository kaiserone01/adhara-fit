import Link from "next/link";
import { Button } from "@gym-app/ui/components/Button";
import { TabsConfiguraciones } from "../configuraciones/TabsConfiguraciones";
import { TABS_CONFIGURACIONES } from "../configuraciones/tabs";

// Entrenadores vive en su propia ruta pero comparte la barra de tabs de Configuraciones.
export default function LayoutEntrenadores({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-6 pt-6 lg:px-8 lg:pt-8">
        <TabsConfiguraciones
          tabs={TABS_CONFIGURACIONES}
          accion={
            <Link href="/entrenadores/nuevo">
              <Button>Nuevo entrenador</Button>
            </Link>
          }
        />
      </div>
      {children}
    </>
  );
}
