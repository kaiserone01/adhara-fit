import Link from "next/link";
import { Card } from "@gym-app/ui/components/Card";
import { Badge } from "@gym-app/ui/components/Badge";
import { descripcionDocumento } from "@gym-app/domain/utils/documento";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import type { Miembro } from "@gym-app/domain/entities/Miembro";
import { BotonBajaMiembro } from "../BotonBajaMiembro";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" });
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: "var(--gx-muted)" }}>{etiqueta}</dt>
      <dd className="text-right font-medium" style={{ color: "var(--gx-ink)" }}>
        {valor}
      </dd>
    </div>
  );
}

/** Ficha de solo lectura de un socio eliminado (S-09): sin edición, cobro ni cambio de plan; solo «Restaurar». */
export function FichaMiembroEliminado({
  miembro,
  nombrePlan,
  totalPagos,
}: {
  miembro: Miembro;
  nombrePlan: string | null;
  totalPagos: number;
}) {
  return (
    <div className="max-w-lg p-6 lg:p-8">
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold" style={{ color: "var(--gx-ink)" }}>
            {miembro.nombre}
          </h1>
          <Badge tono="rojo">Eliminado</Badge>
        </div>

        <dl className="flex flex-col gap-2 text-sm">
          <Fila etiqueta="Documento" valor={descripcionDocumento(miembro.tipoDocumento, miembro.numeroDocumento)} />
          {miembro.codigoSocio && <Fila etiqueta="Código de socio" valor={miembro.codigoSocio} />}
          <Fila etiqueta="Celular" valor={miembro.celular ?? "—"} />
          <Fila etiqueta="Plan" valor={nombrePlan ? `${nombrePlan} · ${formatearSoles(miembro.precioPlan)}` : "Sin plan"} />
          <Fila etiqueta="Vencimiento" valor={miembro.fechaVencimiento ? FORMATO_FECHA.format(miembro.fechaVencimiento) : "—"} />
          <Fila etiqueta="Eliminado el" valor={miembro.bajaEn ? FORMATO_FECHA_HORA.format(miembro.bajaEn) : "—"} />
          <Fila etiqueta="Motivo" valor={miembro.bajaMotivo ?? "Sin motivo"} />
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <BotonBajaMiembro id={miembro.id} nombre={miembro.nombre} accion="restaurar" />
          <Link
            href={`/miembros/${miembro.id}/pagos`}
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--gx-accent)" }}
          >
            Ver historial de pagos ({totalPagos})
          </Link>
          <Link href="/miembros?estado=eliminados" className="text-sm hover:underline" style={{ color: "var(--gx-muted)" }}>
            Volver a eliminados
          </Link>
        </div>
      </Card>
    </div>
  );
}
