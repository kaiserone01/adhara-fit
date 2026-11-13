import { BotonQuitarMiembro } from "../BotonQuitarMiembro";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPagoRepository";
import { PrismaPlanRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPlanRepository";
import { PrismaMetodoPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMetodoPagoRepository";
import { obtenerMiembro, MiembroNoEncontradoError, MiembroFueraDeSucursalError } from "@gym-app/domain/use-cases/ObtenerMiembro";
import { listarPagos } from "@gym-app/domain/use-cases/ListarPagos";
import { estaVigente } from "@gym-app/domain/utils/vencimiento";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { listarPlanes } from "@gym-app/domain/use-cases/ListarPlanes";
import { listarMetodosPagoActivos } from "@gym-app/domain/use-cases/ListarMetodosPago";
import { obtenerSucursalesVisiblesParaMiembro } from "../obtenerSucursalesVisibles";
import { obtenerEntrenadoresActivos } from "../obtenerEntrenadoresActivos";
import { MiembroFueraDeSucursal } from "./MiembroFueraDeSucursal";
import { FormularioMiembro } from "../FormularioMiembro";
import { actualizarMiembroAction } from "../actions";
import { PageHeader } from "@gym-app/ui/components/PageHeader";

// OJO: nunca usar fecha.toISOString() acá — convierte a UTC primero, y de
// noche (pasadas las 8pm en Venezuela, UTC-4) eso salta al día siguiente.
function formatearFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export default async function PaginaEditarMiembro({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const { id } = await params;

  let miembro;
  try {
    miembro = await obtenerMiembro(
      { miembros: new PrismaMemberRepository(prisma), sucursales: new PrismaSucursalRepository(prisma) },
      { organizacionId: usuario.organizacionId, id, sucursalActivaId }
    );
  } catch (error) {
    if (error instanceof MiembroNoEncontradoError) notFound();
    if (error instanceof MiembroFueraDeSucursalError) {
      return <MiembroFueraDeSucursal mensaje={error.message} />;
    }
    throw error;
  }

  const [pagos, planes, sucursales, metodosPago] = await Promise.all([
    listarPagos(
      { pagos: new PrismaPagoRepository(prisma), miembros: new PrismaMemberRepository(prisma) },
      { organizacionId: usuario.organizacionId, miembroId: id }
    ),
    listarPlanes({ planes: new PrismaPlanRepository(prisma) }, usuario.organizacionId),
    obtenerSucursalesVisiblesParaMiembro(usuario),
    listarMetodosPagoActivos({ metodosPago: new PrismaMetodoPagoRepository(prisma) }, usuario.organizacionId),
  ]);
  const entrenadores = await obtenerEntrenadoresActivos();

  // Con la membresía vigente, el plan no se cambia gratis desde la ficha (el cambio de plan es S-07).
  const tieneCicloVigente = estaVigente(miembro.fechaVencimiento, new Date());


  // Últimos 5 ciclos con datos de rango — listarPagos ya devuelve los
  // pagos ordenados por fechaPago desc (ver PrismaPagoRepository), así
  // que basta filtrar y tomar los primeros 5.
  const ultimosCiclos = pagos
    .filter((pago) => pago.fechaInicioCiclo !== null && pago.fechaFinCiclo !== null)
    .slice(0, 5)
    .map((pago) => ({ id: pago.id, fechaInicioCiclo: pago.fechaInicioCiclo, fechaFinCiclo: pago.fechaFinCiclo }));

  return (
    <div className="max-w-7xl p-6 lg:px-8 lg:py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <PageHeader>Editar miembro</PageHeader>
        <BotonQuitarMiembro id={id} nombre={miembro.nombre} totalPagos={pagos.length} />
      </div>

      <FormularioMiembro
        accion={actualizarMiembroAction.bind(null, id)}
        entrenadores={entrenadores}
        planes={planes}
        sucursales={sucursales}
        sucursalActivaNombre={sucursales.find((s) => s.id === sucursalActivaId)?.nombre ?? "—"}
        sucursalIdDefault={sucursalActivaId}
        metodosPago={metodosPago}
        miembroId={id}
        ultimosCiclos={ultimosCiclos}
        tieneCicloVigente={tieneCicloVigente}
        totalPagos={pagos.length}
        valoresIniciales={{
          nombre: miembro.nombre,
          tipoDocumento: miembro.tipoDocumento,
          numeroDocumento: miembro.numeroDocumento,
          codigoSocio: miembro.codigoSocio,
          celular: miembro.celular ?? "",
          fechaInscripcion: formatearFechaISO(miembro.fechaInscripcion ?? miembro.createdAt),
          fechaVencimiento: miembro.fechaVencimiento ? formatearFechaISO(miembro.fechaVencimiento) : "",
          fechaUltimoPago: miembro.fechaUltimoPago ? formatearFechaISO(miembro.fechaUltimoPago) : "",
          sucursalId: miembro.sucursalId,
          planId: miembro.planId,
          precioPlan: miembro.precioPlan,
          entrenadorId: miembro.entrenadorId,
          fotoUrl: miembro.fotoUrl,
        }}
      />
    </div>
  );
}
