import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaPlanRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPlanRepository";
import { FormularioPlan } from "../FormularioPlan";
import { actualizarPlanAction } from "../actions";
import { PageHeader } from "@gym-app/ui/components/PageHeader";

export default async function PaginaEditarPlan({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const { id } = await params;

  const plan = await new PrismaPlanRepository(prisma).buscarPorId(usuario.organizacionId, id);
  if (!plan) notFound();

  return (
    <div className="max-w-lg p-6 lg:p-8">
      <div className="mb-6">
        <PageHeader>Editar plan</PageHeader>
      </div>

      <FormularioPlan
        accion={actualizarPlanAction.bind(null, id)}
        valoresIniciales={{
          nombre: plan.nombre,
          diasCiclo: plan.diasCiclo,
          precioUSD: plan.precioUSD,
        }}
      />
    </div>
  );
}
