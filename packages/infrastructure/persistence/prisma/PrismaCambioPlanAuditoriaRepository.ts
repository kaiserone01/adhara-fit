import type { PrismaClientOrTx } from "./PrismaClientOrTx";
import type { ICambioPlanAuditoriaRepository } from "@gym-app/domain/ports/ICambioPlanAuditoriaRepository";
import type {
  CambioPlanAuditoria,
  DatosNuevoCambioPlanAuditoria,
} from "@gym-app/domain/entities/CambioPlanAuditoria";

type FilaCambioPlanAuditoria = CambioPlanAuditoria & { modo?: unknown; origen?: unknown };

function mapear(fila: FilaCambioPlanAuditoria): CambioPlanAuditoria {
  return {
    id: fila.id,
    organizacionId: fila.organizacionId,
    miembroId: fila.miembroId,
    planAnteriorId: fila.planAnteriorId,
    planNuevoId: fila.planNuevoId,
    vencimientoAnterior: fila.vencimientoAnterior,
    vencimientoNuevo: fila.vencimientoNuevo,
    diasRestantes: fila.diasRestantes,
    valorNoConsumidoCentavos: fila.valorNoConsumidoCentavos,
    precioAnteriorCentavos: fila.precioAnteriorCentavos,
    diasCicloAnterior: fila.diasCicloAnterior,
    precioNuevoCentavos: fila.precioNuevoCentavos,
    diasCicloNuevo: fila.diasCicloNuevo,
    diasNuevos: fila.diasNuevos,
    montoCobradoCentavos: fila.montoCobradoCentavos,
    pagoId: fila.pagoId,
    registradoPorId: fila.registradoPorId,
    fecha: fila.fecha,
  };
}

export class PrismaCambioPlanAuditoriaRepository implements ICambioPlanAuditoriaRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async crear(datos: DatosNuevoCambioPlanAuditoria): Promise<CambioPlanAuditoria> {
    // modo y origen quedan con su valor por defecto de la base (columnas heredadas, sin uso).
    const registro = await this.prisma.cambioPlanAuditoria.create({ data: { ...datos } });
    return mapear(registro);
  }

  async buscarPorPagoId(pagoId: string): Promise<CambioPlanAuditoria | null> {
    const registro = await this.prisma.cambioPlanAuditoria.findFirst({ where: { pagoId } });
    return registro ? mapear(registro) : null;
  }
}
