import type { IMemberRepository } from "./IMemberRepository";
import type { ISuscripcionRepository } from "./ISuscripcionRepository";
import type { IPagoRepository } from "./IPagoRepository";
import type { IPlanRepository } from "./IPlanRepository";
import type { ICambioPlanAuditoriaRepository } from "./ICambioPlanAuditoriaRepository";

export interface RepositoriosTransaccionales {
  miembros: IMemberRepository;
  suscripciones: ISuscripcionRepository;
  pagos: IPagoRepository;
  planes: IPlanRepository;
  auditoriaCambioPlan: ICambioPlanAuditoriaRepository;
}

/**
 * Abre una transacción propia del caso de uso: si `operacion` lanza, no se guarda nada.
 * Los repositorios recibidos trabajan dentro de esa transacción.
 */
export interface IUnidadDeTrabajo {
  ejecutar<T>(operacion: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T>;
}
