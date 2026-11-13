import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaEntrenadorRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaEntrenadorRepository";
import { listarTodosLosEntrenadores } from "@gym-app/domain/use-cases/GestionarEntrenadores";
import { Card } from "@gym-app/ui/components/Card";
import { AvisoError } from "../AvisoError";
import { TarjetaEntrenador } from "./TarjetaEntrenador";

export default async function PaginaEntrenadores({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await obtenerUsuarioDeSesionActual())) redirect("/login");

  const { error: errorMensaje } = await searchParams;
  const entrenadores = await listarTodosLosEntrenadores({ entrenadores: new PrismaEntrenadorRepository(prisma) });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-4">
        <AvisoError mensaje={errorMensaje} />
      </div>

      <div className="flex max-w-2xl flex-col gap-3">
        {entrenadores.map((e) => (
          <TarjetaEntrenador key={e.id} entrenador={e} />
        ))}
        {entrenadores.length === 0 && (
          <Card>
            <p className="text-center" style={{ color: "var(--gx-muted)" }}>
              Todavía no hay entrenadores.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
