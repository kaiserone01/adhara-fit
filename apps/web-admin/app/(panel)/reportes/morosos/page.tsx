import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { listarMorosos, MAX_FILAS_REPORTE } from "@gym-app/domain/use-cases/ListarVencimientos";
import { diaLima } from "@gym-app/domain/utils/vencimiento";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { Card } from "@gym-app/ui/components/Card";
import { BotonImprimir } from "../../BotonImprimir";
import { EncabezadoImpresion } from "../EncabezadoImpresion";
import { TablaVencimientos } from "../TablaVencimientos";

export default async function PaginaMorosos() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const hoy = diaLima(new Date());
  const reporte = await listarMorosos({ miembros: new PrismaMemberRepository(prisma) }, { organizacionId: usuario.organizacionId, hoy });
  const { morosos, sinPrimerCobro } = reporte;

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:p-8 lg:pb-8">
      <EncabezadoImpresion organizacionId={usuario.organizacionId} titulo="Morosos" rango="Socios con la membresía vencida" />
      <div className="flex items-center justify-between print:hidden">
        <PageHeader>Morosos</PageHeader>
        <BotonImprimir />
      </div>

      <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
        {morosos.filas.length} {morosos.filas.length === 1 ? "socio vencido" : "socios vencidos"} · Renovación estimada:{" "}
        <strong style={{ color: "var(--gx-ink)" }}>{formatearSoles(morosos.renovacionEstimada)}</strong> (lo que se cobraría si renuevan; no es una deuda)
      </p>
      <TablaVencimientos filas={morosos.filas} columnaDias="Días de atraso" vacio="No hay socios vencidos." />
      {morosos.hayMas && (
        <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
          Se muestran los primeros {MAX_FILAS_REPORTE}: hay más socios vencidos.
        </p>
      )}

      {sinPrimerCobro.filas.length > 0 && (
        <Card className="print:border-0 print:p-0">
          <h2 className="mb-1 font-semibold" style={{ color: "var(--gx-ink)" }}>
            Sin primer cobro
          </h2>
          <p className="mb-3 text-sm" style={{ color: "var(--gx-muted)" }}>
            Socios que todavía no tienen ningún cobro: no cuentan como morosos.
          </p>
          <TablaVencimientos filas={sinPrimerCobro.filas} columnaDias={null} vacio="" />
          {sinPrimerCobro.hayMas && (
            <p className="mt-2 text-sm" style={{ color: "var(--gx-muted)" }}>
              Se muestran los primeros {MAX_FILAS_REPORTE}.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
