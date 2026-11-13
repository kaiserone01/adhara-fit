import { redirect } from "next/navigation";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { FormularioUsuario } from "../FormularioUsuario";
import { crearUsuarioAction } from "../actions";
import { PageHeader } from "@gym-app/ui/components/PageHeader";

export default async function PaginaNuevoUsuario() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <PageHeader>Nuevo administrador</PageHeader>
      </div>
      <FormularioUsuario accion={crearUsuarioAction} />
    </div>
  );
}
