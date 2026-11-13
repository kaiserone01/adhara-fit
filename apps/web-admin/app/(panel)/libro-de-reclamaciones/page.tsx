import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaTextoLegalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaConsentimientoRepository";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { EncabezadoImpresion } from "../reportes/EncabezadoImpresion";

export default async function PaginaLibroDeReclamaciones() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const [texto, organizacion] = await Promise.all([
    new PrismaTextoLegalRepository(prisma).vigente(usuario.organizacionId, "AVISO_RECLAMACIONES"),
    prisma.organizacion.findUnique({
      where: { id: usuario.organizacionId },
      select: { nombre: true, razonSocial: true, ruc: true, direccion: true },
    }),
  ]);

  return (
    <div className="max-w-3xl p-6 lg:p-8">
      <EncabezadoImpresion organizacionId={usuario.organizacionId} titulo="Libro de Reclamaciones" />
      <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
        <PageHeader>Libro de Reclamaciones</PageHeader>
      </div>

      <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" style={{ color: "var(--gx-ink)" }}>
        <dt className="font-medium">Razón social</dt>
        <dd>{organizacion?.razonSocial ?? organizacion?.nombre ?? "—"}</dd>
        <dt className="font-medium">RUC</dt>
        <dd>{organizacion?.ruc ?? "—"}</dd>
        <dt className="font-medium">Dirección</dt>
        <dd>{organizacion?.direccion ?? "—"}</dd>
      </dl>

      {texto ? (
        <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--gx-ink)" }}>
          {texto.contenido}
        </p>
      ) : (
        <p className="text-sm print:hidden" style={{ color: "var(--gx-muted)" }}>
          Todavía no se publicó el aviso. Publícalo en{" "}
          <Link href="/configuraciones/textos-legales" className="underline">
            Configuraciones → Textos legales
          </Link>
          .
        </p>
      )}
      <p className="mt-6 text-xs print:hidden" style={{ color: "var(--gx-muted)" }}>
        Usa Ctrl+P para imprimir el aviso en A4.
      </p>
    </div>
  );
}
