import { redirect } from "next/navigation";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { FormularioSucursal } from "../FormularioSucursal";
import { crearSucursalAction } from "../actions";
import { PageHeader } from "@gym-app/ui/components/PageHeader";

export default async function PaginaNuevaSucursal() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <PageHeader>Nueva sucursal</PageHeader>
      </div>
      <FormularioSucursal accion={crearSucursalAction} />
    </div>
  );
}
