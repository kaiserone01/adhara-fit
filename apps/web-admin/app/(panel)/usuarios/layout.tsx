import Link from "next/link";
import { Button } from "@gym-app/ui/components/Button";
import { TabsConfiguraciones } from "../configuraciones/TabsConfiguraciones";
import { TABS_CONFIGURACIONES } from "../configuraciones/tabs";

// Administradores vive en su propia ruta (fuera de /configuraciones) pero comparte la misma barra de tabs.
// El botón "Nuevo administrador" sube a la misma fila que las tabs.
export default function LayoutUsuarios({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-6 pt-6 lg:px-8 lg:pt-8">
        <TabsConfiguraciones
          tabs={TABS_CONFIGURACIONES}
          accion={
            <Link href="/usuarios/nuevo">
              <Button>Nuevo administrador</Button>
            </Link>
          }
        />
      </div>
      {children}
    </>
  );
}
