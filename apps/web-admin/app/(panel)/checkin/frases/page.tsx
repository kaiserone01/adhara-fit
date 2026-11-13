import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { Card } from "@gym-app/ui/components/Card";
import { FormularioFrases } from "./FormularioFrases";

export default async function PaginaFrasesCheckin() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const sucursal = await new PrismaSucursalRepository(prisma).buscarPorId(usuario.organizacionId, sucursalActivaId);

  return (
    <Card className="max-w-2xl">
      <p className="mb-4 text-sm" style={{ color: "var(--gx-muted)" }}>
        Se muestran una a una en la ficha en reposo del checkin de esta sucursal. Si no hay ninguna, el checkin usa sus frases
        predeterminadas. Los cambios llegan al checkin en menos de 30 segundos.
      </p>
      {/* La key reinicia el formulario con las frases ya normalizadas que quedaron guardadas. */}
      <FormularioFrases key={(sucursal?.reposoFrases ?? []).join("\u0000")} frasesIniciales={sucursal?.reposoFrases ?? []} />
    </Card>
  );
}
