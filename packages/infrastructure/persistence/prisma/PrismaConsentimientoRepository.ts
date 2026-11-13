import type { PrismaClientOrTx } from "./PrismaClientOrTx";
import type { IConsentimientoRepository, ITextoLegalRepository } from "@gym-app/domain/ports/IConsentimientoRepository";
import type { ConsentimientoMiembro, TextoLegal, TipoTextoLegal } from "@gym-app/domain/entities/Consentimiento";

type FilaTexto = {
  id: string;
  organizacionId: string;
  tipo: TipoTextoLegal;
  version: number;
  contenido: string;
  cambioSustancial: boolean;
  publicadoEn: Date;
};

type FilaConsentimiento = {
  id: string;
  miembroId: string;
  version: number;
  medio: "PANTALLA" | "PAPEL";
  aceptadoEn: Date;
  revocadoEn: Date | null;
  revocadoMotivo: string | null;
};

function aTexto(f: FilaTexto): TextoLegal {
  return {
    id: f.id,
    organizacionId: f.organizacionId,
    tipo: f.tipo,
    version: f.version,
    contenido: f.contenido,
    cambioSustancial: f.cambioSustancial,
    publicadoEn: f.publicadoEn,
  };
}

function aConsentimiento(f: FilaConsentimiento): ConsentimientoMiembro {
  return {
    id: f.id,
    miembroId: f.miembroId,
    version: f.version,
    medio: f.medio,
    aceptadoEn: f.aceptadoEn,
    revocadoEn: f.revocadoEn,
    revocadoMotivo: f.revocadoMotivo,
  };
}

export class PrismaTextoLegalRepository implements ITextoLegalRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async vigente(organizacionId: string, tipo: TipoTextoLegal): Promise<TextoLegal | null> {
    const fila = await this.prisma.textoLegal.findFirst({ where: { organizacionId, tipo }, orderBy: { version: "desc" } });
    return fila ? aTexto(fila) : null;
  }

  async listar(organizacionId: string, tipo: TipoTextoLegal): Promise<TextoLegal[]> {
    const filas = await this.prisma.textoLegal.findMany({ where: { organizacionId, tipo }, orderBy: { version: "desc" } });
    return filas.map(aTexto);
  }

  async versionSustancialMaxima(organizacionId: string, tipo: TipoTextoLegal): Promise<number> {
    const r = await this.prisma.textoLegal.aggregate({
      where: { organizacionId, tipo, cambioSustancial: true },
      _max: { version: true },
    });
    return r._max.version ?? 0;
  }

  async publicar(datos: {
    organizacionId: string;
    tipo: TipoTextoLegal;
    contenido: string;
    cambioSustancial: boolean;
    publicadoPorId: string;
  }): Promise<TextoLegal> {
    const ultima = await this.prisma.textoLegal.aggregate({
      where: { organizacionId: datos.organizacionId, tipo: datos.tipo },
      _max: { version: true },
    });
    const version = (ultima._max.version ?? 0) + 1;
    // La versión 1 siempre es sustancial: sin ella nadie podría quedar «aceptado».
    const fila = await this.prisma.textoLegal.create({
      data: {
        organizacionId: datos.organizacionId,
        tipo: datos.tipo,
        version,
        contenido: datos.contenido,
        cambioSustancial: version === 1 ? true : datos.cambioSustancial,
        publicadoPorId: datos.publicadoPorId,
      },
    });
    return aTexto(fila);
  }
}

export class PrismaConsentimientoRepository implements IConsentimientoRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async registrar(datos: {
    miembroId: string;
    version: number;
    medio: "PANTALLA" | "PAPEL";
    registradoPorId: string;
  }): Promise<ConsentimientoMiembro> {
    const fila = await this.prisma.consentimientoMiembro.create({ data: datos });
    return aConsentimiento(fila);
  }

  async ultimoDeMiembro(miembroId: string): Promise<ConsentimientoMiembro | null> {
    const fila = await this.prisma.consentimientoMiembro.findFirst({ where: { miembroId }, orderBy: { aceptadoEn: "desc" } });
    return fila ? aConsentimiento(fila) : null;
  }

  async ultimosPorMiembro(organizacionId: string): Promise<Map<string, ConsentimientoMiembro>> {
    const filas = await this.prisma.consentimientoMiembro.findMany({
      where: { miembro: { organizacionId } },
      orderBy: { aceptadoEn: "asc" },
    });
    const mapa = new Map<string, ConsentimientoMiembro>();
    // Orden ascendente: la última fila de cada socio sobrescribe a las anteriores.
    for (const f of filas) mapa.set(f.miembroId, aConsentimiento(f));
    return mapa;
  }

  async revocar(datos: { miembroId: string; revocadoPorId: string; motivo: string }): Promise<boolean> {
    const vigente = await this.prisma.consentimientoMiembro.findFirst({
      where: { miembroId: datos.miembroId, revocadoEn: null },
      orderBy: { aceptadoEn: "desc" },
    });
    if (!vigente) return false;
    await this.prisma.consentimientoMiembro.update({
      where: { id: vigente.id },
      data: { revocadoEn: new Date(), revocadoPorId: datos.revocadoPorId, revocadoMotivo: datos.motivo },
    });
    return true;
  }
}
