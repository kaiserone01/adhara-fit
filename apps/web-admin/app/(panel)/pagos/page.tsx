import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaTurnoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaTurnoRepository";
import { PrismaPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPagoRepository";
import { PrismaEgresoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaEgresoRepository";
import { PrismaArqueoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaArqueoRepository";
import { obtenerReporteCaja } from "@gym-app/domain/use-cases/ObtenerReporteCaja";
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

  const turnoRepo = new PrismaTurnoRepository(prisma);

  const [reporte, diasConActividad] = await Promise.all([
    obtenerReporteCaja(
      {
        turnos: turnoRepo,
        pagos: new PrismaPagoRepository(prisma),
        egresos: new PrismaEgresoRepository(prisma),
        arqueo: new PrismaArqueoRepository(prisma),
      },
      { organizacionId: usuario.organizacionId, desde, hasta }
    ),
    obtenerDiasConActividad({ turnos: turnoRepo }, usuario.organizacionId),
  ]);

  const pagosOrdenados = [...reporte.turnos.flatMap((fila) => fila.pagos), ...reporte.ajustesFueraDeTurno]
    .filter((p) => !p.anuladoEn)
    .sort((a, b) => b.fechaPago.getTime() - a.fechaPago.getTime());

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
          Total: {formatearSoles(reporte.totalUSD)}
        </span>
      </div>

      {/* Lista de pagos — vista plana del período, es lo único que se imprime. */}
      <div>
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-black">Histórico de pagos</h1>
          <div className="text-xs text-black">
            {desde.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })} – {hasta.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })} · {pagosOrdenados.length}{" "}
            {pagosOrdenados.length === 1 ? "pago" : "pagos"} · Total: {formatearSoles(reporte.totalUSD)}
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

      {/* Detalle por turno (apertura/cierre, egresos, arqueo) — no se imprime. Los pagos solo van en la lista de arriba, no se repiten aquí. */}
      <div className="flex flex-col gap-6 print:hidden">
      {reporte.turnos.map((fila) => {
        return (
        <Card key={fila.turno.id} className="text-sm">
          <div className="mb-2 flex justify-between font-medium" style={{ color: "var(--gx-ink)" }}>
            <span>Turno {fila.turno.abiertoEn.toLocaleString("es-PE")}</span>
            <span>Neto: {formatearSoles(fila.netoUSD)}</span>
          </div>
          <div className="mb-2 flex justify-between text-xs" style={{ color: "var(--gx-muted)" }}>
            <span>
              Apertura: {fila.turno.abiertoEn.toLocaleTimeString("es-PE")} · Cierre:{" "}
              {fila.turno.cerradoEn ? fila.turno.cerradoEn.toLocaleTimeString("es-PE") : "turno abierto"}
            </span>
            <span>{fila.turno.usuarioNombre ?? "—"}</span>
          </div>
          <div className="mb-2 flex justify-between" style={{ color: "var(--gx-muted)" }}>
            <span>Cobrado: {formatearSoles(fila.totalPagosUSD)}</span>
            {fila.totalEgresosUSD > 0 && <span>Egresos: -{formatearSoles(fila.totalEgresosUSD)}</span>}
          </div>
          {fila.egresos.length > 0 && (
            <div className="mb-2 flex flex-col gap-1 border-b pb-2" style={{ borderColor: "var(--gx-edge)" }}>
              {fila.egresos.map((egreso) => (
                <div key={egreso.id} className="flex justify-between" style={{ color: "var(--gx-muted)" }}>
                  <span>{egreso.motivo}</span>
                  <span>
                    -{formatearSoles(egreso.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {fila.arqueo.map((linea) => {
            const montoContadoTexto = formatearSoles(linea.montoContado);
            const diferenciaTexto = formatearSoles(linea.diferencia);

            return (
              <div key={linea.metodo} className="flex justify-between" style={{ color: "var(--gx-muted)" }}>
                <span>{nombreMetodo(linea.metodo)}</span>
                <span>
                  {montoContadoTexto} contado ({linea.diferencia === 0 ? "sin diferencia" : `dif. ${diferenciaTexto}`})
                </span>
              </div>
            );
          })}
        </Card>
        );
      })}

      {reporte.ajustesFueraDeTurno.length > 0 && (
        <div
          className="rounded-2xl border p-5 text-sm"
          style={{ borderColor: "var(--gx-warn)", background: "color-mix(in srgb, var(--gx-warn) 12%, transparent)" }}
        >
          <h2 className="mb-3 font-semibold" style={{ color: "var(--gx-warn)" }}>
            Ajustes fuera de turno
          </h2>
          {reporte.ajustesFueraDeTurno.map((pago) => (
            <div
              key={pago.id}
              className="flex justify-between border-b py-2"
              style={{ borderColor: "color-mix(in srgb, var(--gx-warn) 30%, transparent)" }}
            >
              <span style={{ color: "var(--gx-ink)" }}>
                {conceptoPago(pago)} — {nombreMetodo(pago.metodo)}
              </span>
              <span className="flex gap-3" style={{ color: "var(--gx-ink)" }}>
                <span>{formatearSoles(pago.monto)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {reporte.turnos.length === 0 && reporte.ajustesFueraDeTurno.length === 0 && (
        <p style={{ color: "var(--gx-muted)" }}>Sin turnos en este período.</p>
      )}
      </div>
    </div>
  );
}
