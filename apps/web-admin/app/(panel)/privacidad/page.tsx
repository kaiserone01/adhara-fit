import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaTextoLegalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaConsentimientoRepository";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { EncabezadoImpresion } from "../reportes/EncabezadoImpresion";

export default async function PaginaPrivacidad() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const texto = await new PrismaTextoLegalRepository(prisma).vigente(usuario.organizacionId, "POLITICA_PRIVACIDAD");

  return (
    <div className="max-w-3xl p-6 lg:p-8">
      <EncabezadoImpresion organizacionId={usuario.organizacionId} titulo="Política de privacidad" />
      <div className="mb-4 print:hidden">
        <PageHeader>Política de privacidad</PageHeader>
      </div>
      {texto ? (
        <>
          <p className="mb-3 text-xs print:hidden" style={{ color: "var(--gx-muted)" }}>
            Versión {texto.version}
          </p>
          <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--gx-ink)" }}>
            {texto.contenido}
          </p>
        </>
      ) : (
        <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
          Todavía no se publicó la política de privacidad. Publícala en{" "}
          <Link href="/configuraciones/textos-legales" className="underline">
            Configuraciones → Textos legales
          </Link>
          .
        </p>
      )}
    </div>
  );
}
