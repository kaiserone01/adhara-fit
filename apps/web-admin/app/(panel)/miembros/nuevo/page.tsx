import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaPlanRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPlanRepository";
import { PrismaMetodoPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMetodoPagoRepository";
import { listarPlanes } from "@gym-app/domain/use-cases/ListarPlanes";
import { listarMetodosPagoActivos } from "@gym-app/domain/use-cases/ListarMetodosPago";
import { obtenerSucursalesVisiblesParaMiembro } from "../obtenerSucursalesVisibles";
import { obtenerEntrenadoresActivos } from "../obtenerEntrenadoresActivos";
import { FormularioMiembro } from "../FormularioMiembro";
import { crearMiembroAction } from "../actions";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { PrismaTextoLegalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaConsentimientoRepository";

export default async function PaginaNuevoMiembro() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const [planes, sucursales, metodosPago] = await Promise.all([
    listarPlanes({ planes: new PrismaPlanRepository(prisma) }, usuario.organizacionId),
    obtenerSucursalesVisiblesParaMiembro(usuario),
    listarMetodosPagoActivos({ metodosPago: new PrismaMetodoPagoRepository(prisma) }, usuario.organizacionId),
  ]);
  const entrenadores = await obtenerEntrenadoresActivos();
  const textoConsentimiento = await new PrismaTextoLegalRepository(prisma).vigente(usuario.organizacionId, "CONSENTIMIENTO");
  const sucursalActiva = sucursales.find((s) => s.id === sucursalActivaId);

  return (
    <div className="max-w-7xl p-6 lg:px-8 lg:py-6">
      <div className="mb-4">
        <PageHeader>Nuevo miembro</PageHeader>
      </div>
      <FormularioMiembro
        accion={crearMiembroAction}
        entrenadores={entrenadores}
        planes={planes}
        sucursales={sucursales}
        sucursalActivaNombre={sucursalActiva?.nombre ?? "—"}
        sucursalIdDefault={sucursalActivaId}
        metodosPago={metodosPago}
        miembroId={null}
        ultimosCiclos={[]}
        consentimiento={textoConsentimiento ? { version: textoConsentimiento.version, contenido: textoConsentimiento.contenido } : null}
      />
    </div>
  );
}
