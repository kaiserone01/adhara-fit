import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaUsuarioAdminRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaUsuarioAdminRepository";
import { obtenerUsuarioAdmin, UsuarioNoEncontradoError } from "@gym-app/domain/use-cases/ObtenerUsuarioAdmin";
import { FormularioEditarUsuario } from "../FormularioUsuario";
import { actualizarUsuarioAction } from "../actions";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { AvisoError } from "../../AvisoError";

export default async function PaginaEditarUsuario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario: usuarioSesion } = sesion;

  const { id } = await params;
  const { error: errorMensaje } = await searchParams;

  let administrador;
  try {
    administrador = await obtenerUsuarioAdmin(
      { usuarios: new PrismaUsuarioAdminRepository(prisma) },
      { organizacionId: usuarioSesion.organizacionId, id }
    );
  } catch (error) {
    if (error instanceof UsuarioNoEncontradoError) notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <PageHeader>Editar administrador</PageHeader>

      <AvisoError mensaje={errorMensaje} />

      <FormularioEditarUsuario
        accion={actualizarUsuarioAction.bind(null, id)}
        nombreInicial={administrador.nombre}
        email={administrador.email}
        telefonoInicial={administrador.telefono}
        fotoUrlActual={administrador.fotoUrl}
      />
    </div>
  );
}
