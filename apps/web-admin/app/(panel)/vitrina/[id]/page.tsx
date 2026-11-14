import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaVitrinaRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaVitrinaRepository";
import { Card } from "@gym-app/ui/components/Card";
import { BotonEliminarItem } from "../BotonEliminarItem";
import { FormularioVitrinaItem } from "../FormularioVitrinaItem";

export default async function PaginaEditarPieza({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");

  const item = await new PrismaVitrinaRepository(prisma).buscar(sesion.sucursalActivaId, id);
  if (!item) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card>
        <FormularioVitrinaItem key={item.id} item={item} />
      </Card>
      <BotonEliminarItem id={item.id} />
    </div>
  );
}
