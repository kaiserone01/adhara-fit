import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaVitrinaRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaVitrinaRepository";
import { Card } from "@gym-app/ui/components/Card";
import { construirSecuencia, numeroDeDiapositiva } from "@gym-app/domain/services/secuenciaVitrina";
import { FilaVitrina } from "./FilaVitrina";
import { FormularioAjustesVitrina } from "./FormularioAjustesVitrina";

// Cartelera de la TV: una sola pantalla con todas las piezas (una por diapositiva) y los ajustes generales.
export default async function PaginaCartelera() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");

  const repositorio = new PrismaVitrinaRepository(prisma);
  const [items, ajustes] = await Promise.all([
    repositorio.listar(sesion.sucursalActivaId),
    repositorio.obtenerAjustes(sesion.sucursalActivaId),
  ]);
  const ahora = new Date();
  const numeros = numeroDeDiapositiva(construirSecuencia(items, ahora, ajustes.duracionSeg));

  const nueva = (
    <Link
      href="/vitrina/nuevo"
      className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-4 text-sm font-semibold hover:opacity-90"
      style={{ background: "var(--gx-accent)", color: "var(--gx-accent-ink)" }}
    >
      Nueva pieza
    </Link>
  );

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <section className="flex flex-col gap-3">
        <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
          Cartelera informativa de la TV. Cada pieza (imagen o video horizontal 16:9, ideal 1920×1080) ocupa una diapositiva completa, en el
          orden de esta lista. Las piezas nuevas nacen inactivas; los cambios llegan a la TV en segundos.
        </p>

        {items.length === 0 ? (
          <Card className="flex flex-col items-start gap-3">
            <p style={{ color: "var(--gx-muted)" }}>Aún no hay piezas en la cartelera. Sube la primera para empezar.</p>
            {nueva}
          </Card>
        ) : (
          <>
            <div>{nueva}</div>
            {items.map((item, i) => (
              <FilaVitrina
                key={item.id}
                item={item}
                ahora={ahora}
                numeroDiapositiva={numeros.get(item.id)}
                posicion={i + 1}
                mover={{ puedeSubir: i > 0, puedeBajar: i < items.length - 1 }}
              />
            ))}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold" style={{ color: "var(--gx-ink)" }}>
          Ajustes de la cartelera
        </h2>
        <Card className="max-w-2xl">
          <FormularioAjustesVitrina key={`${ajustes.duracionSeg}|${ajustes.transicion}`} ajustes={ajustes} />
        </Card>
      </section>
    </div>
  );
}
