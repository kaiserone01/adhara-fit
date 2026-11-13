import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaUsuarioAdminRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaUsuarioAdminRepository";
import { listarUsuariosAdmin } from "@gym-app/domain/use-cases/ListarUsuariosAdmin";
import { Card } from "@gym-app/ui/components/Card";
import { AvisoError } from "../AvisoError";
import { TarjetaUsuario } from "./TarjetaUsuario";

export default async function PaginaUsuarios({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const { error: errorMensaje } = await searchParams;
  const administradores = await listarUsuariosAdmin(
    { usuarios: new PrismaUsuarioAdminRepository(prisma) },
    usuario.organizacionId
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-4">
        <AvisoError mensaje={errorMensaje} />
      </div>

      <div className="flex max-w-2xl flex-col gap-3">
        {administradores.map((u) => (
          <TarjetaUsuario key={u.id} usuario={u} esPropio={u.id === usuario.id} />
        ))}
        {administradores.length === 0 && (
          <Card>
            <p className="text-center" style={{ color: "var(--gx-muted)" }}>
              Todavía no hay administradores.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
