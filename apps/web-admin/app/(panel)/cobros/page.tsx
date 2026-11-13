import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPagoRepository";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaPlanRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPlanRepository";
import { PrismaProductoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaProductoRepository";
import { PrismaMetodoPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMetodoPagoRepository";
import { obtenerReporteCobros } from "@gym-app/domain/use-cases/ObtenerReporteCobros";
import { listarMiembros } from "@gym-app/domain/use-cases/ListarMiembros";
import { listarPlanes } from "@gym-app/domain/use-cases/ListarPlanes";
import { listarProductos } from "@gym-app/domain/use-cases/ListarProductos";
import { listarMetodosPagoActivos } from "@gym-app/domain/use-cases/ListarMetodosPago";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { Card } from "@gym-app/ui/components/Card";
import { Badge } from "@gym-app/ui/components/Badge";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { EnlaceHistoricoPagos } from "./EnlaceHistoricoPagos";
import { BotonRegistrarPagoCaja } from "./BotonRegistrarPagoCaja";
import { BotonVenderProducto } from "./BotonVenderProducto";
import { BotonAnularCobro } from "./BotonAnularCobro";
import { conceptoPago } from "../pagos/conceptoPago";
import { inicioDelDia, finDelDia } from "../fechas";
import { venderProductoAction } from "./actions";

export default async function PaginaCobros({ searchParams }: { searchParams: Promise<{ cobrar?: string }> }) {
  const { cobrar } = await searchParams;
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const hoy = new Date();
  const [reporte, miembros, planes, productos, metodosPago] = await Promise.all([
    obtenerReporteCobros(
      { pagos: new PrismaPagoRepository(prisma) },
      { organizacionId: usuario.organizacionId, desde: inicioDelDia(hoy), hasta: finDelDia(hoy) }
    ),
    listarMiembros({ miembros: new PrismaMemberRepository(prisma) }, usuario.organizacionId, sucursalActivaId),
    listarPlanes({ planes: new PrismaPlanRepository(prisma) }, usuario.organizacionId),
    listarProductos({ productos: new PrismaProductoRepository(prisma) }, usuario.organizacionId),
    listarMetodosPagoActivos({ metodosPago: new PrismaMetodoPagoRepository(prisma) }, usuario.organizacionId),
  ]);

  const miembrosActivos = miembros.filter((m) => m.activo);
  const planesActivos = planes.filter((p) => p.activo);

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:p-8 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader>Cobros</PageHeader>
        <div className="flex flex-wrap gap-2">
          <BotonRegistrarPagoCaja
            miembros={miembrosActivos}
            planes={planesActivos}
            metodosPago={metodosPago}
            miembroInicialId={cobrar}
          />
          <BotonVenderProducto accion={venderProductoAction} productos={productos.filter((p) => p.activo)} metodosPago={metodosPago} />
          <EnlaceHistoricoPagos />
        </div>
      </div>

      <Card className="text-sm">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold" style={{ color: "var(--gx-ink)" }}>
            Cobrado hoy
          </h2>
          <span className="text-lg font-bold" style={{ color: "var(--gx-accent)" }}>
            {formatearSoles(reporte.totalCobrado)}
          </span>
        </div>
        {reporte.porMetodo.length === 0 ? (
          <p style={{ color: "var(--gx-muted)" }}>Todavía no hay cobros hoy.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reporte.porMetodo.map((fila) => (
              <div key={fila.clave} className="flex justify-between gap-3 rounded-lg px-3 py-2.5" style={{ background: "var(--gx-surface-2)" }}>
                <span style={{ color: "var(--gx-muted)" }}>{fila.clave}</span>
                <span className="font-medium" style={{ color: "var(--gx-ink)" }}>
                  {formatearSoles(fila.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {reporte.pagos.length > 0 && (
        <Card className="text-sm">
          <h2 className="mb-3 font-semibold" style={{ color: "var(--gx-ink)" }}>
            Cobros de hoy
          </h2>
          <div className="max-h-96 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b text-xs" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }}>
                  <th className="py-2">Hora</th>
                  <th className="py-2">Concepto</th>
                  <th className="py-2">Método</th>
                  <th className="py-2">Cobró</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {reporte.pagos.map((pago) => (
                  <tr key={pago.id} className="border-b" style={{ borderColor: "var(--gx-edge)", opacity: pago.anuladoEn ? 0.6 : 1 }}>
                    <td className="py-2" style={{ color: "var(--gx-muted)" }}>
                      {pago.fechaPago.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}
                    </td>
                    <td className="py-2" style={{ color: "var(--gx-ink)" }}>
                      {conceptoPago(pago)}
                    </td>
                    <td className="py-2" style={{ color: "var(--gx-ink)" }}>
                      {pago.metodo}
                    </td>
                    <td className="py-2" style={{ color: "var(--gx-muted)" }}>
                      {pago.registradoPorNombre ?? "—"}
                    </td>
                    <td className="py-2" style={{ color: "var(--gx-ink)", textDecoration: pago.anuladoEn ? "line-through" : "none" }}>
                      {formatearSoles(pago.monto)}
                    </td>
                    <td className="py-2 text-right">
                      {pago.anuladoEn ? <Badge tono="gris">Anulado</Badge> : <BotonAnularCobro pagoId={pago.id} descripcion={conceptoPago(pago)} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
