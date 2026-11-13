import { prisma } from "@/lib/prisma";

const FORMATO_IMPRESION = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Encabezado que solo aparece al imprimir (A4): negocio, título, rango y fecha y hora de impresión (Lima). */
export async function EncabezadoImpresion({
  organizacionId,
  titulo,
  rango,
}: {
  organizacionId: string;
  titulo: string;
  rango?: string;
}) {
  const organizacion = await prisma.organizacion.findUnique({ where: { id: organizacionId }, select: { nombre: true } });
  return (
    <div className="mb-4 hidden text-black print:block">
      <p className="text-sm font-semibold">{organizacion?.nombre ?? "Adhara Fit"}</p>
      <h1 className="text-xl font-bold">{titulo}</h1>
      <p className="text-xs">
        {rango ? `${rango} · ` : ""}Impreso el {FORMATO_IMPRESION.format(new Date())}
      </p>
    </div>
  );
}
