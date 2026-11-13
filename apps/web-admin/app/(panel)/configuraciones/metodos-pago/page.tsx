import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaMetodoPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMetodoPagoRepository";
import { listarMetodosPago } from "@gym-app/domain/use-cases/ListarMetodosPago";
import { Card } from "@gym-app/ui/components/Card";
import { Button } from "@gym-app/ui/components/Button";
import { ETIQUETA_DISCRETA_TIPO_METODO_PAGO, nombreVisibleMetodo } from "../metodosPagoUI";
import { LogoMetodo } from "../LogoMetodo";
import { ToggleActivoMetodoPago } from "./ToggleActivoMetodoPago";

export default async function PaginaMetodosPago() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;

  const metodos = await listarMetodosPago({ metodosPago: new PrismaMetodoPagoRepository(prisma) }, usuario.organizacionId);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Link href="/configuraciones/metodos-pago/nuevo">
          <Button>Nuevo método de pago</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metodos.map((metodo) => (
          <Card key={metodo.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <LogoMetodo metodo={metodo} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold" style={{ color: "var(--gx-ink)" }}>
                    {nombreVisibleMetodo(metodo)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--gx-muted-dim)" }}>
                    {ETIQUETA_DISCRETA_TIPO_METODO_PAGO[metodo.tipo]}
                  </p>
                </div>
              </div>
              <ToggleActivoMetodoPago id={metodo.id} activo={metodo.activo} />
            </div>

            <Link
              href={`/configuraciones/metodos-pago/${metodo.id}`}
              className="text-sm font-medium hover:underline"
              style={{ color: "var(--gx-accent)" }}
            >
              Editar
            </Link>
          </Card>
        ))}

        {metodos.length === 0 && (
          <Card>
            <p className="text-center" style={{ color: "var(--gx-muted)" }}>
              Todavía no hay métodos de pago configurados.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
