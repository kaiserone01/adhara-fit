import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaPlanRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPlanRepository";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { listarMiembros } from "@gym-app/domain/use-cases/ListarMiembros";
import { listarPlanes } from "@gym-app/domain/use-cases/ListarPlanes";
import { listarSucursales } from "@gym-app/domain/use-cases/ListarSucursales";
import { Button } from "@gym-app/ui/components/Button";
import { ListaMiembros } from "./ListaMiembros";

export default async function PaginaMiembros({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const { estado } = await searchParams;
  const verEliminados = estado === "eliminados";

  const [miembros, planes, sucursales] = await Promise.all([
    listarMiembros(
      { miembros: new PrismaMemberRepository(prisma) },
      usuario.organizacionId,
      sucursalActivaId,
      verEliminados ? "BAJA" : "ACTIVO"
    ),
    listarPlanes({ planes: new PrismaPlanRepository(prisma) }, usuario.organizacionId),
    listarSucursales({ sucursales: new PrismaSucursalRepository(prisma) }, usuario.organizacionId),
  ]);

  // Se renderiza dentro de ListaMiembros, junto al título y el toggle Cards/Lista.
  const acciones = (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={verEliminados ? "/miembros" : "/miembros?estado=eliminados"}>
        <Button variant="secundario">{verEliminados ? "Ver activos" : "Ver eliminados"}</Button>
      </Link>
      <Link href="/miembros/nuevo">
        <Button>Nuevo miembro</Button>
      </Link>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      {verEliminados && (
        <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--gx-surface-2)", color: "var(--gx-muted)" }}>
          Socios eliminados: no aparecen en cobros, listados ni kiosco. Abre uno para restaurarlo; sus pagos se conservan.
        </p>
      )}
      <ListaMiembros miembros={miembros} planes={planes} sucursales={sucursales} accionesHeader={acciones} />
    </div>
  );
}
