import { CambioPlanAuditoria, DatosNuevoCambioPlanAuditoria } from "../entities/CambioPlanAuditoria";

export interface ICambioPlanAuditoriaRepository {
  crear(datos: DatosNuevoCambioPlanAuditoria): Promise<CambioPlanAuditoria>;
  /** El registro de cambio de plan asociado a un pago, o null si el pago no fue un cambio de plan. */
  buscarPorPagoId(pagoId: string): Promise<CambioPlanAuditoria | null>;
}
