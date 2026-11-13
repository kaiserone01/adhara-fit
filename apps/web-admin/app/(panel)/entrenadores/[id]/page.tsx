import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaEntrenadorRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaEntrenadorRepository";
import { obtenerEntrenador, EntrenadorNoEncontradoError } from "@gym-app/domain/use-cases/GestionarEntrenadores";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { FormularioEntrenador } from "../FormularioEntrenador";
import { actualizarEntrenadorAction } from "../actions";

export default async function PaginaEditarEntrenador({ params }: { params: Promise<{ id: string }> }) {
  if (!(await obtenerUsuarioDeSesionActual())) redirect("/login");

  const { id } = await params;
  let entrenador;
  try {
    entrenador = await obtenerEntrenador({ entrenadores: new PrismaEntrenadorRepository(prisma) }, id);
  } catch (error) {
    if (error instanceof EntrenadorNoEncontradoError) notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <PageHeader>Editar entrenador</PageHeader>
      <FormularioEntrenador
        accion={actualizarEntrenadorAction.bind(null, id)}
        inicial={{ nombre: entrenador.nombre, telefono: entrenador.telefono, fotoUrl: entrenador.fotoUrl }}
      />
    </div>
  );
}
