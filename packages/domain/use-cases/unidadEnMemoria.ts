// Unidad de trabajo en memoria SOLO para pruebas de cobro, cambio de plan y anulación: mismo contrato que
// PrismaUnidadDeTrabajo (si la operación lanza, el estado vuelve a como estaba), sin base de datos.
import type { IUnidadDeTrabajo } from "../ports/IUnidadDeTrabajo";
import type { Pago, DatosNuevoPago } from "../entities/Pago";
import type { CambioPlanAuditoria, DatosNuevoCambioPlanAuditoria } from "../entities/CambioPlanAuditoria";
import type { DatosRegistroAuditoria } from "../ports/IAuditoriaRepository";

export interface MiembroMemoria {
  id: string;
  planId: string | null;
  precioPlan: number;
  fechaVencimiento: Date | null;
  fechaUltimoPago: Date | null;
  sucursalId?: string | null;
  estado?: "ACTIVO" | "BAJA";
  bajaEn?: Date | null;
  bajaPorId?: string | null;
  bajaMotivo?: string | null;
}

export interface PlanMemoria {
  id: string;
  activo: boolean;
  precioUSD: number;
  diasCiclo: number;
}

export interface SuscripcionMemoria {
  planId: string;
  inicio: Date;
  fin: Date;
}

export interface EstadoMemoria {
  miembro: MiembroMemoria;
  planes: PlanMemoria[];
  pagos: Pago[];
  suscripcion: SuscripcionMemoria | null;
  auditorias: CambioPlanAuditoria[];
  registrosAuditoria: DatosRegistroAuditoria[];
}

export function crearEstadoMemoria(parcial: Partial<EstadoMemoria> = {}): EstadoMemoria {
  return {
    miembro: { id: "m1", planId: "mensual", precioPlan: 100, fechaVencimiento: null, fechaUltimoPago: null, estado: "ACTIVO" },
    planes: [{ id: "mensual", activo: true, precioUSD: 100, diasCiclo: 30 }],
    pagos: [],
    suscripcion: null,
    auditorias: [],
    registrosAuditoria: [],
    ...parcial,
  };
}

export function crearUnidadEnMemoria(estado: EstadoMemoria): IUnidadDeTrabajo {
  let secuencia = estado.pagos.length;
  return {
    async ejecutar(operacion) {
      const copia = structuredClone(estado);
      const repos = {
        miembros: {
          bloquearPorId: async () => undefined,
          buscarPorId: async () => ({ sucursalId: null, ...estado.miembro }),
          actualizar: async (_org: string, _id: string, cambios: Partial<MiembroMemoria>) => {
            Object.assign(estado.miembro, cambios);
            return { ...estado.miembro };
          },
          actualizarFechasPago: async (_id: string, pago: Date | null, vencimiento: Date) => {
            estado.miembro.fechaUltimoPago = pago;
            estado.miembro.fechaVencimiento = vencimiento;
          },
        },
        planes: {
          buscarPorId: async (_org: string, id: string) => estado.planes.find((p) => p.id === id) ?? null,
        },
        suscripciones: {
          ajustarCicloMasReciente: async (_id: string, inicio: Date | null, fin: Date, planId?: string) => {
            if (!estado.suscripcion) return false;
            if (inicio) estado.suscripcion.inicio = inicio;
            estado.suscripcion.fin = fin;
            if (planId) estado.suscripcion.planId = planId;
            return true;
          },
          crear: async (datos: SuscripcionMemoria) => {
            estado.suscripcion = { planId: datos.planId, inicio: datos.inicio, fin: datos.fin };
            return datos;
          },
        },
        pagos: {
          buscarPorCobroId: async (cobroId: string) => estado.pagos.find((p) => p.cobroId === cobroId) ?? null,
          buscarPorId: async (_org: string, id: string) => estado.pagos.find((p) => p.id === id) ?? null,
          listarPorMiembro: async () => [...estado.pagos],
          crear: async (datos: DatosNuevoPago) => {
            secuencia += 1;
            const pago = {
              id: `pago-${String(secuencia).padStart(4, "0")}`,
              // Un milisegundo más que el anterior: el orden de registro es estricto, como en la base.
              creadoEn: new Date(Date.UTC(2026, 0, 1) + secuencia),
              anuladoEn: null,
              anuladoPorId: null,
              motivoAnulacion: null,
              fechaPago: new Date(),
              ...datos,
            } as Pago;
            estado.pagos.push(pago);
            return pago;
          },
          anular: async (_org: string, id: string, por: string, motivo: string, cuando: Date) => {
            const pago = estado.pagos.find((p) => p.id === id) as Pago;
            pago.anuladoEn = cuando;
            pago.anuladoPorId = por;
            pago.motivoAnulacion = motivo;
            return pago;
          },
        },
        auditoria: {
          registrar: async (datos: DatosRegistroAuditoria) => {
            estado.registrosAuditoria.push(datos);
          },
        },
        auditoriaCambioPlan: {
          crear: async (datos: DatosNuevoCambioPlanAuditoria) => {
            const registro: CambioPlanAuditoria = { id: `aud-${estado.auditorias.length + 1}`, fecha: new Date(), ...datos };
            estado.auditorias.push(registro);
            return registro;
          },
          buscarPorPagoId: async (pagoId: string) => estado.auditorias.find((a) => a.pagoId === pagoId) ?? null,
        },
      };
      try {
        return await operacion(repos as unknown as Parameters<typeof operacion>[0]);
      } catch (error) {
        Object.assign(estado, copia);
        throw error;
      }
    },
  };
}
