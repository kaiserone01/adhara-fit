import type { PrismaClientOrTx } from "./PrismaClientOrTx";
import type { IMemberRepository } from "@gym-app/domain/ports/IMemberRepository";
import type { Miembro, DatosNuevoMiembro, CambiosMiembro } from "@gym-app/domain/entities/Miembro";
import { CodigoSocioEnConflictoError, DocumentoDuplicadoError } from "@gym-app/domain/entities/ErroresMiembro";
import type { TipoDocumento } from "@gym-app/domain/utils/documento";
import type { MiembroParaReporte } from "@gym-app/domain/entities/ReporteVencimientos";

// Traduce la violación de unicidad de Prisma (P2002) al error de dominio según la columna.
function traducirUnicidad(error: unknown): never {
  if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
    const detalle = JSON.stringify((error as { meta?: unknown }).meta ?? {}).toLowerCase();
    if (detalle.includes("codigosocio")) throw new CodigoSocioEnConflictoError();
    if (detalle.includes("numerodocumento")) throw new DocumentoDuplicadoError();
  }
  throw error;
}

type FilaMiembro = {
  id: string;
  organizacionId: string;
  sucursalId: string | null;
  nombre: string;
  tipoDocumento: TipoDocumento | "PASAPORTE"; // PASAPORTE: valor heredado del enum, sin uso
  numeroDocumento: string;
  codigoSocio: string | null;
  fechaInscripcion: Date | null;
  fechaNacimiento: Date | null;
  celular: string | null;
  correo: string | null;
  fotoUrl: string | null;
  entrenadorId: string | null;
  entrenador?: { nombre: string } | null;
  planId: string | null;
  precioPlan: { toNumber(): number };
  fechaUltimoPago: Date | null;
  fechaVencimiento: Date | null;
  estado: "ACTIVO" | "BAJA";
  bajaEn: Date | null;
  bajaPorId: string | null;
  bajaMotivo: string | null;
  createdAt: Date;
};

function mapear(miembro: FilaMiembro): Miembro {
  return {
    id: miembro.id,
    organizacionId: miembro.organizacionId,
    sucursalId: miembro.sucursalId,
    nombre: miembro.nombre,
    tipoDocumento: miembro.tipoDocumento === "PASAPORTE" ? "CE" : miembro.tipoDocumento,
    numeroDocumento: miembro.numeroDocumento,
    codigoSocio: miembro.codigoSocio,
    fechaInscripcion: miembro.fechaInscripcion,
    fechaNacimiento: miembro.fechaNacimiento,
    celular: miembro.celular,
    correo: miembro.correo,
    fotoUrl: miembro.fotoUrl,
    entrenadorId: miembro.entrenadorId,
    entrenadorNombre: miembro.entrenador?.nombre ?? null,
    planId: miembro.planId,
    precioPlan: miembro.precioPlan.toNumber(),
    fechaUltimoPago: miembro.fechaUltimoPago,
    fechaVencimiento: miembro.fechaVencimiento,
    estado: miembro.estado,
    bajaEn: miembro.bajaEn,
    bajaPorId: miembro.bajaPorId,
    bajaMotivo: miembro.bajaMotivo,
    createdAt: miembro.createdAt,
  };
}

export class PrismaMemberRepository implements IMemberRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async buscarPorDocumento(numeroDocumento: string): Promise<Miembro | null> {
    const miembro = await this.prisma.miembro.findUnique({
      where: { numeroDocumento },
      include: { entrenador: true },
    });

    return miembro ? mapear(miembro) : null;
  }

  async buscarPorCodigoSocio(codigoSocio: string): Promise<Miembro | null> {
    const miembro = await this.prisma.miembro.findUnique({
      where: { codigoSocio },
      include: { entrenador: true },
    });

    return miembro ? mapear(miembro) : null;
  }

  async maximoCodigoSocio(): Promise<number> {
    // Los códigos tienen ancho fijo (4 dígitos), así que el orden de texto es el numérico.
    const ultimo = await this.prisma.miembro.findFirst({
      where: { codigoSocio: { not: null } },
      orderBy: { codigoSocio: "desc" },
      select: { codigoSocio: true },
    });

    return ultimo?.codigoSocio ? Number(ultimo.codigoSocio) : 0;
  }

  async buscarPorId(organizacionId: string, id: string): Promise<Miembro | null> {
    const miembro = await this.prisma.miembro.findUnique({
      where: { id },
      include: { entrenador: true },
    });

    if (!miembro || miembro.organizacionId !== organizacionId) return null;

    return mapear(miembro);
  }

  async listarPorOrganizacion(organizacionId: string): Promise<Miembro[]> {
    const miembros = await this.prisma.miembro.findMany({
      where: { organizacionId },
      include: { entrenador: true },
      orderBy: { nombre: "asc" },
    });

    return miembros.map(mapear);
  }

  async listarActivosParaReporte(organizacionId: string): Promise<MiembroParaReporte[]> {
    const miembros = await this.prisma.miembro.findMany({
      where: { organizacionId, estado: "ACTIVO" },
      select: {
        id: true,
        nombre: true,
        codigoSocio: true,
        numeroDocumento: true,
        celular: true,
        precioPlan: true,
        fechaVencimiento: true,
        plan: { select: { nombre: true } },
        // Último cobro: el no anulado de mayor orden de registro (creadoEn).
        pagos: { where: { anuladoEn: null }, orderBy: [{ creadoEn: "desc" }, { id: "desc" }], take: 1, select: { fechaPago: true, monto: true } },
      },
    });

    return miembros.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      codigoSocio: m.codigoSocio,
      numeroDocumento: m.numeroDocumento,
      celular: m.celular,
      planNombre: m.plan?.nombre ?? null,
      precioPlan: m.precioPlan.toNumber(),
      fechaVencimiento: m.fechaVencimiento,
      ultimoCobro: m.pagos[0] ? { fecha: m.pagos[0].fechaPago, monto: m.pagos[0].monto.toNumber() } : null,
    }));
  }

  async crear(datos: DatosNuevoMiembro): Promise<Miembro> {
    const miembro = await this.prisma.miembro
      .create({ data: datos, include: { entrenador: true } })
      .catch(traducirUnicidad);

    return mapear(miembro);
  }

  async actualizar(organizacionId: string, id: string, cambios: CambiosMiembro): Promise<Miembro | null> {
    const actual = await this.prisma.miembro.findUnique({ where: { id } });

    if (!actual || actual.organizacionId !== organizacionId) {
      return null;
    }

    const miembro = await this.prisma.miembro
      .update({ where: { id }, data: cambios, include: { entrenador: true } })
      .catch(traducirUnicidad);

    return mapear(miembro);
  }

  async bloquearPorId(id: string): Promise<void> {
    // Solo tiene efecto dentro de una transacción (PrismaUnidadDeTrabajo): serializa cobros y anulaciones del mismo socio.
    await this.prisma.$queryRaw`SELECT "id" FROM "Miembro" WHERE "id" = ${id} FOR UPDATE`;
  }

  async eliminarDefinitivamente(id: string, conPagos: boolean): Promise<void> {
    if (conPagos) {
      const pagos = await this.prisma.pago.findMany({ where: { miembroId: id }, select: { id: true } });
      // El registro de un cambio de plan puede apuntar a un pago: se borra antes que él.
      await this.prisma.cambioPlanAuditoria.deleteMany({
        where: { OR: [{ miembroId: id }, { pagoId: { in: pagos.map((p) => p.id) } }] },
      });
      await this.prisma.pago.deleteMany({ where: { miembroId: id } });
    } else {
      await this.prisma.cambioPlanAuditoria.deleteMany({ where: { miembroId: id } });
      await this.prisma.pago.updateMany({ where: { miembroId: id }, data: { miembroId: null } });
    }
    await this.prisma.checkIn.deleteMany({ where: { miembroId: id } });
    await this.prisma.suscripcion.deleteMany({ where: { miembroId: id } });
    await this.prisma.deudaProducto.deleteMany({ where: { miembroId: id } });
    await this.prisma.consentimientoMiembro.deleteMany({ where: { miembroId: id } });
    await this.prisma.miembro.delete({ where: { id } });
  }

  async actualizarFechasPago(id: string, fechaUltimoPago: Date | null, fechaVencimiento: Date): Promise<void> {
    await this.prisma.miembro.update({
      where: { id },
      data: { fechaUltimoPago, fechaVencimiento },
    });
  }
}
