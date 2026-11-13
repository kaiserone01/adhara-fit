import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaEntrenadorRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaEntrenadorRepository";
import { Card } from "@gym-app/ui/components/Card";
import { FormularioVitrinaItem } from "../../FormularioVitrinaItem";
import { tipoDeSlug } from "../../slugs";

export default async function PaginaNuevoVitrina({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo: slug } = await params;
  const tipo = tipoDeSlug(slug);
  if (!tipo) notFound();
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");

  const entrenadores =
    tipo === "ENTRENADOR"
      ? await new PrismaEntrenadorRepository(prisma).listarActivos()
      : [];

  return (
    <Card className="max-w-3xl">
      <FormularioVitrinaItem tipo={tipo} entrenadores={entrenadores} />
    </Card>
  );
}
