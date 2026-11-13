import { redirect } from "next/navigation";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { FormularioEntrenador } from "../FormularioEntrenador";
import { crearEntrenadorAction } from "../actions";

export default async function PaginaNuevoEntrenador() {
  if (!(await obtenerUsuarioDeSesionActual())) redirect("/login");

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <PageHeader>Nuevo entrenador</PageHeader>
      </div>
      <FormularioEntrenador accion={crearEntrenadorAction} />
    </div>
  );
}
