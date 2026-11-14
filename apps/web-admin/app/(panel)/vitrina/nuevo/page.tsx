import { redirect } from "next/navigation";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { Card } from "@gym-app/ui/components/Card";
import { FormularioVitrinaItem } from "../FormularioVitrinaItem";

export default async function PaginaNuevaPieza() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");

  return (
    <Card className="max-w-3xl">
      <FormularioVitrinaItem />
    </Card>
  );
}
