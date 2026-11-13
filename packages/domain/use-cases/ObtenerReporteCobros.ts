import { IPagoRepository } from "../ports/IPagoRepository";
import { Pago } from "../entities/Pago";

export interface TotalReporte {
  clave: string;
  total: number;
}

export interface ReporteCobros {
  // Todos los cobros del rango (incluidos los anulados, que se marcan en pantalla), del más reciente al más antiguo.
  pagos: Pago[];
  // Suma de los cobros vigentes (sin anular).
  totalCobrado: number;
  // Totales de los cobros vigentes: por día de Lima (AAAA-MM-DD, del más reciente al más antiguo), por método y por quien cobró.
  porDia: TotalReporte[];
  porMetodo: TotalReporte[];
  porUsuario: TotalReporte[];
}

const formatoDiaLima = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function sumarPor(pagos: Pago[], clave: (pago: Pago) => string): TotalReporte[] {
  const centavos = new Map<string, number>();
  for (const pago of pagos) {
    const k = clave(pago);
    centavos.set(k, (centavos.get(k) ?? 0) + Math.round(pago.monto * 100));
  }
  return [...centavos].map(([k, c]) => ({ clave: k, total: c / 100 }));
}

// Reporte de cobros del rango: reemplaza al arqueo como control del dinero (no hay turnos ni caja).
export async function obtenerReporteCobros(
  deps: { pagos: IPagoRepository },
  input: { organizacionId: string; desde: Date; hasta: Date }
): Promise<ReporteCobros> {
  const todos = await deps.pagos.listarPorOrganizacionYRango(input.organizacionId, input.desde, input.hasta);
  const pagos = [...todos].sort((a, b) => b.fechaPago.getTime() - a.fechaPago.getTime());
  const vigentes = pagos.filter((p) => !p.anuladoEn);

  return {
    pagos,
    totalCobrado: vigentes.reduce((suma, p) => suma + Math.round(p.monto * 100), 0) / 100,
    porDia: sumarPor(vigentes, (p) => formatoDiaLima.format(p.fechaPago)),
    porMetodo: sumarPor(vigentes, (p) => p.metodo).sort((a, b) => b.total - a.total),
    porUsuario: sumarPor(vigentes, (p) => p.registradoPorNombre ?? "—").sort((a, b) => b.total - a.total),
  };
}
