import Link from "next/link";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import type { FilaVencimiento } from "@gym-app/domain/use-cases/ListarVencimientos";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" });

/** Tabla de socios de los reportes de morosos y por vencer. `columnaDias` rotula la columna de días. */
export function TablaVencimientos({
  filas,
  columnaDias,
  vacio,
}: {
  filas: FilaVencimiento[];
  columnaDias: string | null;
  vacio: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b text-xs print:border-b-2 print:border-black" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }}>
            <th className="py-2 pr-2 print:text-black">Socio</th>
            <th className="py-2 pr-2 print:text-black">Documento</th>
            <th className="py-2 pr-2 print:text-black">Celular</th>
            <th className="py-2 pr-2 print:text-black">Plan</th>
            <th className="py-2 pr-2 print:text-black">Vence</th>
            {columnaDias && <th className="py-2 pr-2 print:text-black">{columnaDias}</th>}
            <th className="py-2 print:text-black">Último cobro</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.miembroId} className="border-b print:border-gray-400" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-ink)" }}>
              <td className="py-1.5 pr-2 print:text-black">
                <Link href={`/miembros/${f.miembroId}`} className="font-medium hover:underline print:no-underline">
                  {f.nombre}
                </Link>
                {f.codigoSocio && <span className="ml-1 text-xs">#{f.codigoSocio}</span>}
              </td>
              <td className="py-1.5 pr-2 print:text-black">{f.documentoEnmascarado}</td>
              <td className="py-1.5 pr-2 print:text-black">{f.celular ?? "—"}</td>
              <td className="py-1.5 pr-2 print:text-black">{f.planNombre ?? "Sin plan"}</td>
              <td className="py-1.5 pr-2 print:text-black">{f.fechaVencimiento ? FORMATO_FECHA.format(f.fechaVencimiento) : "—"}</td>
              {columnaDias && <td className="py-1.5 pr-2 font-semibold print:text-black">{f.dias}</td>}
              <td className="py-1.5 print:text-black">
                {f.ultimoCobro ? `${FORMATO_FECHA.format(f.ultimoCobro.fecha)} · ${formatearSoles(f.ultimoCobro.monto)}` : "—"}
              </td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center print:text-black" style={{ color: "var(--gx-muted)" }}>
                {vacio}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
