import { ICheckInRepository } from "../ports/ICheckInRepository";
import { CheckInEnSala, EstadoCheckIn } from "../entities/CheckIn";
import { inicioDelDiaLima } from "../utils/fechaLima";
import { validarAccesoSucursal } from "./ValidarAccesoSucursalPorPlan";

export interface ListarEnSalaDeps {
  checkIns: ICheckInRepository;
}

export interface PersonaEnSala {
  checkInId: string;
  miembroId: string;
  nombre: string;
  fotoUrl: string | null;
  planNombre: string | null;
  fechaHora: Date;
  salidaAt: Date | null;
  fechaVencimiento: Date | null;
  // Estado recalculado ahora (no el snapshot del check-in): si el miembro paga
  // estando en sala, la alerta se apaga sola.
  estado: EstadoCheckIn;
  requiereCobro: boolean;
}

export function requiereCobro(estado: EstadoCheckIn): boolean {
  return estado === "vencido";
}

export async function listarEnSala(
  deps: ListarEnSalaDeps,
  input: { organizacionId: string; sucursalId: string; ahora?: Date }
): Promise<PersonaEnSala[]> {
  const ahora = input.ahora ?? new Date();
  const abiertos = await deps.checkIns.listarEnSala(input.sucursalId, inicioDelDiaLima(ahora));
  // Los que hay que cobrar primero; dentro de cada grupo, el más reciente arriba.
  return armarPersonas(deps, input, abiertos, ahora).sort((a, b) => Number(b.requiereCobro) - Number(a.requiereCobro));
}

export type RangoHistorialSala = "hoy" | "24h";

// Quién pasó por la sala hoy (desde las 00:00 de Lima) o en las últimas 24 horas, haya salido o no.
// El estado de pago se recalcula ahora, igual que en "En sala". Una fila por persona, la entrada más reciente.
export async function listarHistorialSala(
  deps: ListarEnSalaDeps,
  input: { organizacionId: string; sucursalId: string; rango: RangoHistorialSala; ahora?: Date }
): Promise<PersonaEnSala[]> {
  const ahora = input.ahora ?? new Date();
  const desde = input.rango === "hoy" ? inicioDelDiaLima(ahora) : new Date(ahora.getTime() - 24 * 3_600_000);
  return armarPersonas(deps, input, await deps.checkIns.listarDesde(input.sucursalId, desde), ahora);
}

function armarPersonas(
  _deps: ListarEnSalaDeps,
  input: { organizacionId: string; sucursalId: string },
  abiertos: CheckInEnSala[],
  ahora: Date
): PersonaEnSala[] {
  if (abiertos.length === 0) return [];

  // Un miembro puede tener varios check-ins en el rango: se muestra solo el más reciente.
  const vistos = new Set<string>();
  const unicos = abiertos.filter((c) => !vistos.has(c.miembroId) && vistos.add(c.miembroId));

  return unicos.map((c): PersonaEnSala => {
      const estado = validarAccesoSucursal(c.miembro.sucursalId, input.sucursalId, c.miembro.fechaVencimiento, ahora);
      return {
        checkInId: c.id,
        miembroId: c.miembroId,
        nombre: c.miembro.nombre,
        fotoUrl: c.miembro.fotoUrl,
        planNombre: c.miembro.planNombre,
        fechaHora: c.fechaHora,
        salidaAt: c.salidaAt,
        fechaVencimiento: c.miembro.fechaVencimiento,
        estado,
        requiereCobro: requiereCobro(estado),
      };
    });
}
