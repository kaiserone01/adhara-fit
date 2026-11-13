import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPagoRepository";
import { obtenerIngresosPorPeriodo, type AgrupacionIngresos, type ReporteIngresos, type TotalIngreso } from "@gym-app/domain/use-cases/ObtenerIngresosPorPeriodo";
import { RangoInvalidoError } from "@gym-app/domain/entities/ErroresReporte";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { Card } from "@gym-app/ui/components/Card";
import { Button } from "@gym-app/ui/components/Button";
import { BotonImprimir } from "../../BotonImprimir";
import { EncabezadoImpresion } from "../EncabezadoImpresion";

const DIA_LIMA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" });

function Totales({ titulo, filas }: { titulo: string; filas: TotalIngreso[] }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="mb-1 font-semibold" style={{ color: "var(--gx-ink)" }}>
        {titulo}
      </h2>
      {filas.length === 0 && <span style={{ color: "var(--gx-muted)" }}>—</span>}
      {filas.map((f) => (
        <div key={f.clave} className="flex justify-between" style={{ color: "var(--gx-muted)" }}>
          <span>{f.clave}</span>
          <span>{formatearSoles(f.total)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function PaginaIngresos({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; agrupar?: string }>;
}) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const params = await searchParams;
  const hoy = DIA_LIMA.format(new Date());
  const desde = params.desde || `${hoy.slice(0, 7)}-01`;
  const hasta = params.hasta || hoy;
  const agrupacion: AgrupacionIngresos = params.agrupar === "mes" ? "mes" : "dia";

  let reporte: ReporteIngresos | null = null;
  let error: string | null = null;
  try {
    reporte = await obtenerIngresosPorPeriodo(
      { pagos: new PrismaPagoRepository(prisma) },
      { organizacionId: usuario.organizacionId, desde, hasta, agrupacion }
    );
  } catch (e) {
    if (!(e instanceof RangoInvalidoError)) throw e;
    error = e.message;
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:p-8 lg:pb-8">
      <EncabezadoImpresion
        organizacionId={usuario.organizacionId}
        titulo="Ingresos por período"
        rango={`Del ${desde} al ${hasta}, por ${agrupacion === "dia" ? "día" : "mes"}`}
      />
      <div className="flex items-center justify-between print:hidden">
        <PageHeader>Ingresos</PageHeader>
        <BotonImprimir />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm print:hidden" style={{ color: "var(--gx-muted)" }}>
        <label className="flex flex-col gap-1">
          Desde
          <input type="date" name="desde" defaultValue={desde} className="min-h-11 rounded-lg border px-3 gx-campo" />
        </label>
        <label className="flex flex-col gap-1">
          Hasta
          <input type="date" name="hasta" defaultValue={hasta} className="min-h-11 rounded-lg border px-3 gx-campo" />
        </label>
        <label className="flex flex-col gap-1">
          Agrupar por
          <select name="agrupar" defaultValue={agrupacion} className="min-h-11 rounded-lg border px-3 gx-campo">
            <option value="dia">Día</option>
            <option value="mes">Mes</option>
          </select>
        </label>
        <Button type="submit">Ver</Button>
      </form>

      {error && <p style={{ color: "var(--gx-bad)" }}>{error}</p>}

      {reporte && (
        <>
          <p className="text-base font-semibold" style={{ color: "var(--gx-ink)" }}>
            Total cobrado: {formatearSoles(reporte.total)}
          </p>

          <Card className="text-sm print:border-0 print:p-0">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Totales titulo="Por método" filas={reporte.porMetodo} />
              <Totales titulo="Por concepto" filas={reporte.porConcepto} />
            </div>
          </Card>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-xs print:border-b-2 print:border-black" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }}>
                  <th className="py-2 print:text-black">{agrupacion === "dia" ? "Día" : "Mes"}</th>
                  <th className="py-2 print:text-black">Por método</th>
                  <th className="py-2 print:text-black">Por concepto</th>
                  <th className="py-2 text-right print:text-black">Total</th>
                </tr>
              </thead>
              <tbody>
                {reporte.periodos.map((p) => (
                  <tr key={p.periodo} className="border-b align-top print:border-gray-400" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-ink)" }}>
                    <td className="py-1.5 print:text-black">{p.periodo}</td>
                    <td className="py-1.5 print:text-black">{p.porMetodo.map((m) => `${m.clave} ${formatearSoles(m.total)}`).join(" · ") || "—"}</td>
                    <td className="py-1.5 print:text-black">{p.porConcepto.map((m) => `${m.clave} ${formatearSoles(m.total)}`).join(" · ") || "—"}</td>
                    <td className="py-1.5 text-right font-semibold print:text-black">{formatearSoles(p.total)}</td>
                  </tr>
                ))}
                {reporte.periodos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center" style={{ color: "var(--gx-muted)" }}>
                      Sin cobros en este rango.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {reporte.ventasPorProducto.length > 0 && (
            <Card className="text-sm print:border-0 print:p-0">
              <h2 className="mb-2 font-semibold" style={{ color: "var(--gx-ink)" }}>
                Ventas por producto
              </h2>
              {reporte.ventasPorProducto.map((v) => (
                <div key={v.nombre} className="flex justify-between" style={{ color: "var(--gx-muted)" }}>
                  <span>
                    {v.nombre} × {v.unidades}
                  </span>
                  <span>{formatearSoles(v.monto)}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
