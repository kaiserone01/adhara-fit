// Registro de cada cambio de plan (S-07): guarda los datos exactos del cálculo y el pago asociado (null si no hubo
// nada que cobrar). Los importes van en céntimos enteros. La anulación del pago usa este registro para restaurar el
// plan y el precio anteriores.
export interface CambioPlanAuditoria {
  id: string;
  organizacionId: string;
  miembroId: string;
  planAnteriorId: string;
  planNuevoId: string;
  vencimientoAnterior: Date;
  vencimientoNuevo: Date;
  diasRestantes: number;
  valorNoConsumidoCentavos: number;
  precioAnteriorCentavos: number;
  diasCicloAnterior: number;
  precioNuevoCentavos: number;
  diasCicloNuevo: number;
  diasNuevos: number;
  montoCobradoCentavos: number;
  pagoId: string | null;
  registradoPorId: string;
  fecha: Date;
}

export type DatosNuevoCambioPlanAuditoria = Omit<CambioPlanAuditoria, "id" | "fecha">;
