import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { FormularioSucursal } from "../FormularioSucursal";
import { actualizarSucursalAction, darDeBajaSucursalAction, reactivarSucursalAction } from "../actions";
import { Button } from "@gym-app/ui/components/Button";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { AvisoError } from "../../AvisoError";

export default async function PaginaEditarSucursal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const { id } = await params;
  const { error: errorMensaje } = await searchParams;
  const sucursal = await new PrismaSucursalRepository(prisma).buscarPorId(usuario.organizacionId, id);
  if (!sucursal) notFound();

  const accion = actualizarSucursalAction.bind(null, id);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <PageHeader>Editar sucursal</PageHeader>
      </div>

      <div className="mb-4">
        <AvisoError mensaje={errorMensaje} />
      </div>

      <FormularioSucursal
        accion={accion}
        valoresIniciales={{
          nombre: sucursal.nombre,
          direccion: sucursal.direccion,
          diasGracia: sucursal.diasGracia,
        }}
      />

      <form action={sucursal.activo ? darDeBajaSucursalAction.bind(null, id) : reactivarSucursalAction.bind(null, id)} className="mt-4">
        <Button type="submit">{sucursal.activo ? "Dar de baja" : "Reactivar"}</Button>
      </form>
    </div>
  );
}
