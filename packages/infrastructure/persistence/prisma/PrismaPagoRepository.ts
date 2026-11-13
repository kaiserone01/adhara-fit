import type { PrismaClientOrTx } from "./PrismaClientOrTx";
import type { IPagoRepository } from "@gym-app/domain/ports/IPagoRepository";
import type { Pago, DatosNuevoPago } from "@gym-app/domain/entities/Pago";

type FilaPago = {
  id: string;
  miembroId: string | null;
  sucursalId: string;
  registradoPorId: string;
  monto: { toNumber(): number };
  metodo: string;
  metodoPagoId: string | null;
  numeroOperacion: string | null;
  creadoEn: Date;
  fechaPago: Date;
  fechaInicioCiclo: Date | null;
  fechaFinCiclo: Date | null;
  anuladoEn: Date | null;
  anuladoPorId: string | null;
  motivoAnulacion: string | null;
  grupoPagoId: string | null;
  cobroId: string | null;
  vencimientoAnterior: Date | null;
  productoId: string | null;
  productoNombre: string | null;
  cantidad: number | null;
};

function mapear(pago: FilaPago): Pago {
  return {
    id: pago.id,
    miembroId: pago.miembroId,
    sucursalId: pago.sucursalId,
    registradoPorId: pago.registradoPorId,
    monto: pago.monto.toNumber(),
    metodo: pago.metodo,
    metodoPagoId: pago.metodoPagoId,
    numeroOperacion: pago.numeroOperacion,
    creadoEn: pago.creadoEn,
    fechaPago: pago.fechaPago,
    fechaInicioCiclo: pago.fechaInicioCiclo,
    fechaFinCiclo: pago.fechaFinCiclo,
    anuladoEn: pago.anuladoEn,
    anuladoPorId: pago.anuladoPorId,
    motivoAnulacion: pago.motivoAnulacion,
    grupoPagoId: pago.grupoPagoId,
    cobroId: pago.cobroId,
    vencimientoAnterior: pago.vencimientoAnterior,
    productoId: pago.productoId,
    productoNombre: pago.productoNombre,
    cantidad: pago.cantidad,
  };
}

export class PrismaPagoRepository implements IPagoRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async crear(datos: DatosNuevoPago): Promise<Pago> {
    const pago = await this.prisma.pago.create({
      data: {
        miembroId: datos.miembroId,
        sucursalId: datos.sucursalId,
        registradoPorId: datos.registradoPorId,
        monto: datos.monto,
        metodo: datos.metodo,
        metodoPagoId: datos.metodoPagoId,
        numeroOperacion: datos.numeroOperacion,
        fechaInicioCiclo: datos.fechaInicioCiclo,
        fechaFinCiclo: datos.fechaFinCiclo,
        grupoPagoId: datos.grupoPagoId,
        cobroId: datos.cobroId ?? null,
        vencimientoAnterior: datos.vencimientoAnterior ?? null,
        ...(datos.fechaPago ? { fechaPago: datos.fechaPago } : {}),
        productoId: datos.productoId ?? null,
        productoNombre: datos.productoNombre ?? null,
        cantidad: datos.cantidad ?? null,
      },
    });
    return mapear(pago);
  }

  async buscarPorCobroId(cobroId: string): Promise<Pago | null> {
    const pago = await this.prisma.pago.findUnique({ where: { cobroId } });
    return pago ? mapear(pago) : null;
  }

  async listarPorMiembro(miembroId: string): Promise<Pago[]> {
    const pagos = await this.prisma.pago.findMany({
      where: { miembroId },
      include: { registradoPor: { select: { nombre: true } } },
      orderBy: { fechaPago: "desc" },
    });
    return pagos.map((pago) => ({ ...mapear(pago), registradoPorNombre: pago.registradoPor.nombre }));
  }

  async listarPorOrganizacion(organizacionId: string): Promise<Pago[]> {
    const pagos = await this.prisma.pago.findMany({
      where: { sucursal: { organizacionId } },
      include: { miembro: { select: { nombre: true } }, registradoPor: { select: { nombre: true } } },
      orderBy: { fechaPago: "desc" },
    });
    return pagos.map((pago) => ({
      ...mapear(pago),
      miembroNombre: pago.miembro?.nombre,
      registradoPorNombre: pago.registradoPor.nombre,
    }));
  }

  async listarPorOrganizacionYRango(organizacionId: string, desde: Date, hasta: Date): Promise<Pago[]> {
    const pagos = await this.prisma.pago.findMany({
      where: { sucursal: { organizacionId }, fechaPago: { gte: desde, lte: hasta } },
      include: {
        miembro: { select: { nombre: true, precioPlan: true } },
        registradoPor: { select: { nombre: true } },
        cambioPlanAuditoria: { select: { id: true }, take: 1 },
      },
      orderBy: { fechaPago: "asc" },
    });
    return pagos.map((pago) => ({
      ...mapear(pago),
      esCambioPlan: pago.cambioPlanAuditoria.length > 0,
      miembroNombre: pago.miembro?.nombre,
      miembroPrecioPlan: pago.miembro?.precioPlan.toNumber(),
      registradoPorNombre: pago.registradoPor.nombre,
    }));
  }

  async listarFechasConPagos(organizacionId: string): Promise<Date[]> {
    // La columna se guarda en UTC: se pasa al reloj de Lima y se piden año, mes y día como enteros. El Date se arma
    // con el constructor local (el proceso corre con TZ=America/Lima, igual que el navegador): devolver el timestamp
    // sin zona correría el día al etiquetarlo como UTC.
    const filas = await this.prisma.$queryRaw<{ anio: number; mes: number; dia: number }[]>`
      SELECT DISTINCT
        EXTRACT(YEAR FROM (p."fechaPago" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima'))::int AS anio,
        EXTRACT(MONTH FROM (p."fechaPago" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima'))::int AS mes,
        EXTRACT(DAY FROM (p."fechaPago" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima'))::int AS dia
      FROM "Pago" p
      JOIN "Sucursal" s ON s."id" = p."sucursalId"
      WHERE s."organizacionId" = ${organizacionId}
      ORDER BY anio ASC, mes ASC, dia ASC
    `;
    return filas.map((fila) => new Date(fila.anio, fila.mes - 1, fila.dia));
  }

  async buscarPorId(organizacionId: string, id: string): Promise<Pago | null> {
    const pago = await this.prisma.pago.findFirst({
      where: { id, sucursal: { organizacionId } },
      include: { miembro: { select: { nombre: true } } },
    });
    return pago ? { ...mapear(pago), miembroNombre: pago.miembro?.nombre } : null;
  }

  async contarVigentesPorGrupo(organizacionId: string, grupoPagoId: string): Promise<number> {
    return this.prisma.pago.count({
      where: { grupoPagoId, anuladoEn: null, sucursal: { organizacionId } },
    });
  }

  async anular(organizacionId: string, id: string, anuladoPorId: string, motivo: string, anuladoEn: Date): Promise<Pago> {
    const existente = await this.prisma.pago.findFirst({ where: { id, sucursal: { organizacionId } } });
    if (!existente) {
      throw new Error("No se encontró el pago.");
    }
    const pago = await this.prisma.pago.update({
      where: { id },
      data: { anuladoEn, anuladoPorId, motivoAnulacion: motivo },
    });
    return mapear(pago);
  }
}
