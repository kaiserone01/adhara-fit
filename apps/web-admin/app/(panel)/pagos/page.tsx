import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPagoRepository";
import { obtenerReporteCobros } from "@gym-app/domain/use-cases/ObtenerReporteCobros";
import { obtenerDiasConActividad } from "@gym-app/domain/use-cases/ObtenerDiasConActividad";
import { Card } from "@gym-app/ui/components/Card";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { conceptoPago } from "./conceptoPago";
import { inicioDelDia, finDelDia } from "../fechas";
import { FiltroFechasHistorico } from "./FiltroFechasHistorico";
import { BotonImprimir } from "../BotonImprimir";

// El método se guarda como snapshot legible ("Pago Móvil - Banesco")
// directo en Pago.metodo — no hay catálogo estático que traducir.
function nombreMetodo(valor: string): string {
  return valor;
}

// OJO: nunca usar fecha.toISOString() para pasar diasConActividad al
// cliente — convierte a UTC primero, así que una fecha "sin hora" (medianoche
// local) puede terminar representando el día anterior en la zona del
// navegador (bug real encontrado en la verificación manual de este plan).
// Se pasa como YYYY-MM-DD (sin componente de zona) y FiltroFechasHistorico
// la reconstruye agregándole T00:00:00, igual que se hace un poco más abajo
// con desdeTexto/hastaTexto.
function formatearFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export default async function PaginaHistoricoPagos({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const { desde: desdeTexto, hasta: hastaTexto } = await searchParams;
  const hoy = new Date();
  const desde = desdeTexto ? inicioDelDia(new Date(`${desdeTexto}T00:00:00`)) : inicioDelDia(hoy);
  const hasta = hastaTexto ? finDelDia(new Date(`${hastaTexto}T00:00:00`)) : finDelDia(hoy);

  const pagosRepo = new PrismaPagoRepository(prisma);
  const [reporte, diasConActividad] = await Promise.all([
    obtenerReporteCobros({ pagos: pagosRepo }, { organizacionId: usuario.organizacionId, desde, hasta }),
    obtenerDiasConActividad({ pagos: pagosRepo }, usuario.organizacionId),
  ]);

  const pagosOrdenados = reporte.pagos.filter((p) => !p.anuladoEn);

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:p-8 lg:pb-8">
      <div className="flex items-center justify-between print:hidden">
        <PageHeader>Histórico de Pagos</PageHeader>
        <BotonImprimir />
      </div>

      <div className="print:hidden">
        <FiltroFechasHistorico
          desde={desde}
          hasta={hasta}
          diasConActividadISO={diasConActividad.map((d) => formatearFechaISO(d))}
        />
      </div>

      <div className="flex items-center gap-3 text-sm print:hidden" style={{ color: "var(--gx-muted)" }}>
        <span className="ml-auto text-base font-semibold" style={{ color: "var(--gx-ink)" }}>
          Total: {formatearSoles(reporte.totalCobrado)}
        </span>
      </div>

      {/* Lista de pagos — vista plana del período, es lo único que se imprime. */}
      <div>
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-black">Histórico de pagos</h1>
          <div className="text-xs text-black">
            {desde.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })} – {hasta.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })} · {pagosOrdenados.length}{" "}
            {pagosOrdenados.length === 1 ? "pago" : "pagos"} · Total: {formatearSoles(reporte.totalCobrado)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr
                className="border-b text-xs print:border-b-2 print:border-black"
                style={{ borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }}
              >
                <th className="py-2 print:text-black">Fecha</th>
                <th className="py-2 print:text-black">Miembro</th>
                <th className="py-2 print:text-black">Método</th>
                <th className="py-2 print:text-black">Monto</th>
              </tr>
            </thead>
            <tbody>
              {pagosOrdenados.map((pago) => (
                <tr key={pago.id} className="border-b print:border-gray-400" style={{ borderColor: "var(--gx-edge)" }}>
                  <td className="py-1.5 print:text-black" style={{ color: "var(--gx-ink)" }}>
                    {pago.fechaPago.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="py-1.5 print:text-black" style={{ color: "var(--gx-ink)" }}>
                    {conceptoPago(pago)}
                  </td>
                  <td className="py-1.5 print:text-black" style={{ color: "var(--gx-ink)" }}>
                    {nombreMetodo(pago.metodo)}
                  </td>
                  <td className="py-1.5 print:text-black" style={{ color: "var(--gx-ink)" }}>
                    {formatearSoles(pago.monto)}
                  </td>
                </tr>
              ))}

              {pagosOrdenados.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center print:text-black" style={{ color: "var(--gx-muted)" }}>
                    Sin pagos en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales del período por método y por quien cobró — no se imprimen. */}
      {pagosOrdenados.length > 0 && (
        <Card className="text-sm print:hidden">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <h2 className="mb-1 font-semibold" style={{ color: "var(--gx-ink)" }}>Por método</h2>
            {reporte.porMetodo.map((fila) => (
              <div key={fila.clave} className="flex justify-between" style={{ color: "var(--gx-muted)" }}>
                <span>{fila.clave}</span>
                <span>{formatearSoles(fila.total)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="mb-1 font-semibold" style={{ color: "var(--gx-ink)" }}>Por quien cobró</h2>
            {reporte.porUsuario.map((fila) => (
              <div key={fila.clave} className="flex justify-between" style={{ color: "var(--gx-muted)" }}>
                <span>{fila.clave}</span>
                <span>{formatearSoles(fila.total)}</span>
              </div>
            ))}
          </div>
          </div>
        </Card>
      )}
    </div>
  );
}
