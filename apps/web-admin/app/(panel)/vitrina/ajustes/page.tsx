import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { puedeEditarCheckino } from "@/lib/permisoCheckino";
import { PrismaVitrinaRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaVitrinaRepository";
import { Card } from "@gym-app/ui/components/Card";
import { FormularioAjustesVitrina } from "./FormularioAjustesVitrina";

export default async function PaginaAjustesVitrina() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  if (!puedeEditarCheckino(sesion.usuario.rol)) redirect("/miembros");

  const ajustes = await new PrismaVitrinaRepository(prisma).obtenerAjustes(sesion.sucursalActivaId);
  return (
    <Card className="max-w-2xl">
      <FormularioAjustesVitrina key={`${ajustes.duracionSeg}|${ajustes.transicion}`} ajustes={ajustes} />
    </Card>
  );
}
