import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { PrismaTurnoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaTurnoRepository";
import { PrismaPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPagoRepository";
import { PrismaEgresoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaEgresoRepository";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaPlanRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaPlanRepository";
import { obtenerResumenTurno } from "@gym-app/domain/use-cases/ObtenerResumenTurno";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { obtenerUltimoCierrePorSucursal } from "@gym-app/domain/use-cases/ObtenerUltimoCierrePorSucursal";
import { PrismaArqueoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaArqueoRepository";
import { listarMiembros } from "@gym-app/domain/use-cases/ListarMiembros";
import { listarPlanes } from "@gym-app/domain/use-cases/ListarPlanes";
import { PrismaProductoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaProductoRepository";
import { listarProductos } from "@gym-app/domain/use-cases/ListarProductos";
import { PrismaDeudaProductoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaDeudaProductoRepository";
import { listarDeudasPendientes } from "@gym-app/domain/use-cases/ListarDeudasPendientes";
import { Card } from "@gym-app/ui/components/Card";
import { PageHeader } from "@gym-app/ui/components/PageHeader";
import { EnlaceHistoricoPagos } from "./EnlaceHistoricoPagos";
import { PrismaMetodoPagoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMetodoPagoRepository";
import { listarMetodosPagoActivos } from "@gym-app/domain/use-cases/ListarMetodosPago";
import { PrismaReglaAbonoRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaReglaAbonoRepository";
import { listarReglasAbono } from "@gym-app/domain/use-cases/ListarReglasAbono";
import { listarEntrenadores } from "@gym-app/domain/use-cases/ListarEntrenadores";
import { PrismaEntrenadorRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaEntrenadorRepository";
import { obtenerTurnoAbiertoParaUsuario } from "./obtenerTurnoAbiertoParaUsuario";
import { AvisoCajaAjena } from "./AvisoCajaAjena";
import { BotonRegistrarPagoCaja } from "./BotonRegistrarPagoCaja";
import { BotonRegistrarEgreso } from "./BotonRegistrarEgreso";
import { BotonVenderProducto } from "./BotonVenderProducto";
import { BotonCobrarDeudas } from "./BotonCobrarDeudas";
import { listarAbonosPendientes } from "@gym-app/domain/use-cases/ListarAbonosPendientes";
import { cambiarPlanAction } from "../pagos/actions";

// El método ahora se guarda como snapshot legible ("Pago Móvil - Banesco")
// directo en Pago.metodo, ya no como código a traducir contra un catálogo
// estático — se mantiene esta función identidad para no tocar cada
// llamado existente.
function nombreMetodo(valor: string): string {
  return valor;
}

import { conceptoPago } from "../pagos/conceptoPago";
import { inicioDelDia, finDelDia, inicioDeSemana, finDeSemana, inicioDeMes, finDeMes, formatearFechaISO } from "../fechas";
import { FormularioAbrirTurno } from "./FormularioAbrirTurno";
import { FormularioArqueo } from "./FormularioArqueo";
import { abrirTurnoAction, registrarEgresoAction, cerrarTurnoAction, venderProductoAction, fiarProductoAction, cobrarDeudasAction, anularDeudaAction } from "./actions";

export default async function PaginaCaja({ searchParams }: { searchParams: Promise<{ cobrar?: string }> }) {
  const { cobrar } = await searchParams;
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  const { usuario, sucursalActivaId } = sesion;

  const turnoRepo = new PrismaTurnoRepository(prisma);
  const turnoAbierto = await obtenerTurnoAbiertoParaUsuario(sucursalActivaId, usuario.id);

  // La sucursal activa de esta sesión (elegida al loguearse) — ya no hace
  // falta distinguir "la del turno" vs "la fija del usuario": son siempre
  // la misma, porque el turno que se busca es justamente el de
  // sucursalActivaId (ver obtenerTurnoAbiertoParaUsuario).
  const sucursalId = sucursalActivaId;

  if (turnoAbierto) {
    const esPropio = turnoAbierto.esPropio;
    const [resumen, miembros, planes, productos, deudasPendientes, metodosPago, reglasAbono, entrenadores] = await Promise.all([
      obtenerResumenTurno(
        {
          turnos: turnoRepo,
          pagos: new PrismaPagoRepository(prisma),
          egresos: new PrismaEgresoRepository(prisma),
        },
        { organizacionId: usuario.organizacionId, turnoId: turnoAbierto.turno.id }
      ),
      listarMiembros({ miembros: new PrismaMemberRepository(prisma) }, usuario.organizacionId, sucursalActivaId),
      listarPlanes({ planes: new PrismaPlanRepository(prisma) }, usuario.organizacionId),
      listarProductos({ productos: new PrismaProductoRepository(prisma) }, usuario.organizacionId),
      listarDeudasPendientes({ deudas: new PrismaDeudaProductoRepository(prisma) }, usuario.organizacionId, sucursalActivaId),
      listarMetodosPagoActivos({ metodosPago: new PrismaMetodoPagoRepository(prisma) }, usuario.organizacionId),
      listarReglasAbono({ reglasAbono: new PrismaReglaAbonoRepository(prisma) }, usuario.organizacionId),
      // Solo para "Cambiar plan" en el Paso 2 del wizard — el selector de
      // entrenador se filtra por la sucursal del miembro elegido, pero
      // Caja opera dentro de una única sucursal activa (no hay selector de
      // sede como en la ficha del miembro).
      listarEntrenadores({ entrenadores: new PrismaEntrenadorRepository(prisma) }, usuario.organizacionId, sucursalActivaId),
    ]);

    const miembrosActivos = miembros.filter((m) => m.activo);
    const planesActivos = planes.filter((p) => p.activo);
    // Saldos de membresía (abonos pendientes) de los miembros de esta sucursal: cuentas por cobrar junto a los productos fiados.
    const abonosPendientes = await listarAbonosPendientes({ pagos: new PrismaPagoRepository(prisma) }, miembros, planes);

    return (
      <div className="flex flex-col gap-6 p-6 pb-24 lg:p-8 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeader>Turno activo</PageHeader>
          <div className="flex flex-wrap gap-2">
          {esPropio && (
            <>
              <BotonRegistrarPagoCaja
                miembros={miembrosActivos}
                planes={planesActivos}
                metodosPago={metodosPago}
                reglasAbono={reglasAbono}
                entrenadores={entrenadores}
                accionCambiarPlan={cambiarPlanAction}
                miembroInicialId={cobrar}
                deudas={deudasPendientes}
                abonos={abonosPendientes}
              />
              <BotonVenderProducto
                accion={venderProductoAction}
                accionFiar={fiarProductoAction}
                productos={productos.filter((p) => p.activo)}
                metodosPago={metodosPago}
                miembros={miembrosActivos}
                planes={planesActivos}
              />
              <BotonCobrarDeudas
                grupos={deudasPendientes}
                abonos={abonosPendientes}
                metodosPago={metodosPago}
                accionCobrar={cobrarDeudasAction}
                accionAnular={anularDeudaAction}
              />
              <BotonRegistrarEgreso accion={registrarEgresoAction} turnoId={resumen.turno.id} />
            </>
          )}
          <EnlaceHistoricoPagos />
          </div>
        </div>

        {/* Layout compacto: cuadro chico con el estado del turno (no
            necesita todo el ancho para mostrar dos montos, ver diseño
            acordado — los botones se movieron arriba, junto al título),
            resumen por método en grilla densa, pagos y egresos lado a lado
            con scroll interno propio, arqueo al final. Objetivo: que todo
            entre sin scroll excesivo. En mobile se apila igual que antes. */}
        <div className="flex flex-col gap-4">
          {esPropio ? (
            <Card className="flex w-fit flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs" style={{ color: "var(--gx-muted)" }}>
                  Abierto desde
                </p>
                <p className="font-medium" style={{ color: "var(--gx-ink)" }}>
                  {resumen.turno.abiertoEn.toLocaleString("es-PE", { timeZone: "America/Lima" })}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--gx-muted)" }}>
                  Fondo inicial en efectivo
                </p>
                <p className="font-medium" style={{ color: "var(--gx-ink)" }}>
                  {formatearSoles(resumen.turno.fondoInicialEfectivoUSD)}
                </p>
              </div>
            </Card>
          ) : (
            <AvisoCajaAjena
              usuarioNombre={turnoAbierto.turno.usuarioNombre ?? "otro usuario"}
              abiertoEn={turnoAbierto.turno.abiertoEn}
            />
          )}

          <Card className="text-sm">
            <h2 className="mb-3 font-semibold" style={{ color: "var(--gx-ink)" }}>
              Resumen por método
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {resumen.lineas.map((linea) => {
                return (
                  <div
                    key={linea.metodo}
                    className="flex justify-between gap-3 rounded-lg px-3 py-2.5"
                    style={{ background: "var(--gx-surface-2)" }}
                  >
                    <span style={{ color: "var(--gx-muted)" }}>{nombreMetodo(linea.metodo)}</span>
                    <span className="font-medium" style={{ color: "var(--gx-ink)" }}>
                      {formatearSoles(linea.montoEsperado)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {(resumen.pagos.length > 0 || resumen.egresos.length > 0) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {resumen.pagos.length > 0 && (
                <Card className="text-sm">
                  <h2 className="mb-3 font-semibold" style={{ color: "var(--gx-ink)" }}>
                    Pagos del turno
                  </h2>
                  <div className="max-h-80 overflow-y-auto overflow-x-auto">
                    <table className="w-full min-w-[420px] border-collapse text-left">
                      <thead>
                        <tr className="border-b text-xs" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }}>
                          <th className="py-2">Miembro</th>
                          <th className="py-2">Método</th>
                          <th className="py-2">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.pagos
                          .filter((pago) => !pago.anuladoEn)
                          .map((pago) => (
                            <tr key={pago.id} className="border-b" style={{ borderColor: "var(--gx-edge)" }}>
                              <td className="py-2" style={{ color: "var(--gx-ink)" }}>
                                {conceptoPago(pago)}
                              </td>
                              <td className="py-2" style={{ color: "var(--gx-ink)" }}>
                                {nombreMetodo(pago.metodo)}
                              </td>
                              <td className="py-2" style={{ color: "var(--gx-ink)" }}>
                                {formatearSoles(pago.monto)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {resumen.egresos.length > 0 && (
                <Card className="text-sm">
                  <h2 className="mb-3 font-semibold" style={{ color: "var(--gx-ink)" }}>
                    Egresos del turno
                  </h2>
                  <div className="max-h-80 overflow-y-auto">
                    {resumen.egresos.map((egreso) => (
                      <div
                        key={egreso.id}
                        className="flex justify-between border-b py-2"
                        style={{ borderColor: "var(--gx-edge)" }}
                      >
                        <span style={{ color: "var(--gx-muted)" }}>{egreso.motivo}</span>
                        <span style={{ color: "var(--gx-ink)" }}>
                          {formatearSoles(egreso.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {esPropio && (
            <FormularioArqueo
              accion={cerrarTurnoAction}
              turnoId={resumen.turno.id}
              lineas={resumen.lineas.map((linea) => ({
                metodo: linea.metodo,
                montoEsperado: linea.montoEsperado,
              }))}
            />
          )}
        </div>
      </div>
    );
  }

  // sucursalActivaId siempre está resuelta desde el login (ver plan de
  // selección de sucursal) — ya no hace falta preguntar la sucursal acá
  // ni consultar sucursalesVisibles: el operador ya la eligió (o era la
  // única) al iniciar sesión, antes de llegar a esta pantalla.
  const ultimoCierre = await obtenerUltimoCierrePorSucursal(
    { turnos: turnoRepo, arqueo: new PrismaArqueoRepository(prisma) },
    { sucursalId: sucursalActivaId }
  );

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:p-8 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader>Abrir turno</PageHeader>
        <EnlaceHistoricoPagos />
      </div>

      <FormularioAbrirTurno
        accion={abrirTurnoAction}
        requiereSucursal={false}
        sucursales={[]}
        ultimoCierre={ultimoCierre ? { ...ultimoCierre, cerradoEn: ultimoCierre.cerradoEn.toISOString() } : null}
      />
    </div>
  );
}
