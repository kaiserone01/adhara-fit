import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaTextoLegalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaConsentimientoRepository";
import { Card } from "@gym-app/ui/components/Card";
import { Badge } from "@gym-app/ui/components/Badge";
import { ETIQUETA_TIPO_TEXTO_LEGAL, TIPOS_TEXTO_LEGAL } from "@gym-app/domain/entities/Consentimiento";
import { publicarTextoLegalAction } from "./actions";
import { FormularioTextoLegal } from "./FormularioTextoLegal";
import { FormularioDatosNegocio } from "./FormularioDatosNegocio";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const ENLACE_POR_TIPO = {
  CONSENTIMIENTO: null,
  POLITICA_PRIVACIDAD: { href: "/privacidad", texto: "Ver política de privacidad" },
  AVISO_RECLAMACIONES: { href: "/libro-de-reclamaciones", texto: "Ver aviso imprimible" },
} as const;

export default async function PaginaTextosLegales() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const repo = new PrismaTextoLegalRepository(prisma);
  const [organizacion, ...versiones] = await Promise.all([
    prisma.organizacion.findUnique({
      where: { id: usuario.organizacionId },
      select: { razonSocial: true, ruc: true, direccion: true },
    }),
    ...TIPOS_TEXTO_LEGAL.map((tipo) => repo.listar(usuario.organizacionId, tipo)),
  ]);

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
        Publica aquí los textos que revisó tu abogado. Cada publicación crea una versión nueva; las anteriores se conservan y no se editan.
      </p>

      <Card>
        <h2 className="font-semibold" style={{ color: "var(--gx-ink)" }}>
          Datos del negocio
        </h2>
        <p className="text-xs" style={{ color: "var(--gx-muted)" }}>
          Salen en el aviso del Libro de Reclamaciones.
        </p>
        <FormularioDatosNegocio
          valores={{ razonSocial: organizacion?.razonSocial ?? null, ruc: organizacion?.ruc ?? null, direccion: organizacion?.direccion ?? null }}
        />
      </Card>

      {TIPOS_TEXTO_LEGAL.map((tipo, i) => {
        const lista = versiones[i];
        const vigente = lista[0] ?? null;
        const enlace = ENLACE_POR_TIPO[tipo];
        return (
          <Card key={tipo}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold" style={{ color: "var(--gx-ink)" }}>
                {ETIQUETA_TIPO_TEXTO_LEGAL[tipo]}
              </h2>
              {vigente ? (
                <Badge tono="verde">Versión {vigente.version} vigente</Badge>
              ) : (
                <Badge tono="ambar">Sin publicar</Badge>
              )}
            </div>
            {vigente && (
              <p className="mt-1 text-xs" style={{ color: "var(--gx-muted)" }}>
                Publicada el {FORMATO_FECHA.format(vigente.publicadoEn)}
                {enlace && (
                  <>
                    {" · "}
                    <Link href={enlace.href} className="underline">
                      {enlace.texto}
                    </Link>
                  </>
                )}
              </p>
            )}
            <FormularioTextoLegal
              accion={publicarTextoLegalAction.bind(null, tipo)}
              contenidoInicial={vigente?.contenido ?? ""}
              hayVersion={!!vigente}
            />
            {lista.length > 1 && (
              <details className="mt-3 text-sm" style={{ color: "var(--gx-muted)" }}>
                <summary className="cursor-pointer">Versiones anteriores ({lista.length - 1})</summary>
                <ul className="mt-2 flex flex-col gap-3">
                  {lista.slice(1).map((t) => (
                    <li key={t.id}>
                      <p className="font-medium">
                        Versión {t.version} · {FORMATO_FECHA.format(t.publicadoEn)}
                        {t.cambioSustancial ? " · cambio sustancial" : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{t.contenido}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        );
      })}
    </div>
  );
}
