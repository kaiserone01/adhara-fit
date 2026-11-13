import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { listarPorVencer, MAX_FILAS_REPORTE, DIAS_POR_VENCER_POR_DEFECTO } from "@gym-app/domain/use-cases/ListarVencimientos";
import { ParametroInvalidoError } from "@gym-app/domain/entities/ErroresReporte";
import { diaLima } from "@gym-app/domain/utils/vencimiento";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { BotonImprimir } from "../../BotonImprimir";
import { EncabezadoImpresion } from "../EncabezadoImpresion";
import { TablaVencimientos } from "../TablaVencimientos";

const OPCIONES = [3, 7, 15, 30];

export default async function PaginaPorVencer({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const { dias: diasTexto } = await searchParams;
  const dias = diasTexto === undefined ? DIAS_POR_VENCER_POR_DEFECTO : Number(diasTexto);

  let lista;
  let error: string | null = null;
  try {
    lista = await listarPorVencer(
      { miembros: new PrismaMemberRepository(prisma) },
      { organizacionId: usuario.organizacionId, hoy: diaLima(new Date()), dias }
    );
  } catch (e) {
    if (!(e instanceof ParametroInvalidoError)) throw e;
    error = e.message;
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:p-8 lg:pb-8">
      <EncabezadoImpresion organizacionId={usuario.organizacionId} titulo="Por vencer" rango={`Vencen en los próximos ${dias} días`} />
      <div className="flex items-center justify-between print:hidden">
        <PageHeader>Por vencer</PageHeader>
        <BotonImprimir />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm print:hidden" style={{ color: "var(--gx-muted)" }}>
        Vencen en los próximos:
        {OPCIONES.map((n) => (
          <Link
            key={n}
            href={`/reportes/por-vencer?dias=${n}`}
            className="rounded-lg border px-3 py-1"
            style={{ borderColor: n === dias ? "var(--gx-accent)" : "var(--gx-edge)", color: "var(--gx-ink)" }}
          >
            {n} días
          </Link>
        ))}
      </div>

      {error && <p style={{ color: "var(--gx-bad)" }}>{error}</p>}
      {lista && (
        <>
          <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
            {lista.filas.length} {lista.filas.length === 1 ? "socio" : "socios"} · Renovación estimada:{" "}
            <strong style={{ color: "var(--gx-ink)" }}>{formatearSoles(lista.renovacionEstimada)}</strong> (lo que se cobraría si renuevan; no es una deuda)
          </p>
          <TablaVencimientos filas={lista.filas} columnaDias="Días que faltan" vacio="Nadie vence en ese plazo." />
          {lista.hayMas && (
            <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
              Se muestran los primeros {MAX_FILAS_REPORTE}: hay más socios por vencer.
            </p>
          )}
        </>
      )}
    </div>
  );
}
