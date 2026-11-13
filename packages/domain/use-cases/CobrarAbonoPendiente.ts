import { IMemberRepository } from "../ports/IMemberRepository";
import { IPlanRepository } from "../ports/IPlanRepository";
import { Pago } from "../entities/Pago";
import { RolUsuario } from "../entities/UsuarioAdmin";
import { calcularAbonosPendientes } from "./ListarAbonosPendientes";
import { registrarPago, RegistrarPagoDeps } from "./RegistrarPago";
import { MiembroNoEncontradoError } from "./ActualizarMiembro";
import { DatosLineaPago } from "./RegistrarPago";

export class SinAbonoPendienteError extends Error {
  constructor() {
    super("Este miembro no tiene saldo de membresía pendiente.");
  }
}

export class MontoNoCoincideConLoPendienteError extends Error {
  constructor(esperadoUSD: number) {
    super(`El pago debe ser exactamente $${esperadoUSD.toFixed(2)} (el saldo pendiente de la membresía).`);
  }
}

// Cobra el saldo pendiente de la membresía del miembro en UN solo pago.
// El saldo lo calcula el servidor; el cliente solo manda las líneas, que deben sumar exactamente lo pendiente.
// Debe correr dentro de una transacción (ver cobrarAbonoAction).
export async function cobrarAbonoPendiente(
  deps: RegistrarPagoDeps & { miembros: IMemberRepository; planes: IPlanRepository },
  input: {
    organizacionId: string;
    miembroId: string;
    lineas: DatosLineaPago[];
    sucursalId: string;
    registradoPorId: string;
    rolUsuario: RolUsuario;
    // Cobro que ya se hizo en un día pasado y no se anotó (hasta 90 días).
    fechaCobro?: Date;
  }
): Promise<Pago[]> {
  const miembro = await deps.miembros.buscarPorId(input.organizacionId, input.miembroId);
  if (!miembro) throw new MiembroNoEncontradoError();
  const plan = miembro.planId ? await deps.planes.buscarPorId(input.organizacionId, miembro.planId) : null;
  if (!miembro.planId || !plan) throw new SinAbonoPendienteError();

  const ahora = new Date();
  const pagosDelMiembro = (await deps.pagos.listarPorMiembro(input.miembroId)).filter(
    (p) => p.fechaFinCiclo !== null && p.fechaFinCiclo > ahora
  );
  const [abono] = calcularAbonosPendientes([miembro], [plan], pagosDelMiembro, ahora);
  if (!abono) throw new SinAbonoPendienteError();

  const esperado = Math.round(abono.saldoUSD * 100) / 100;
  if (Math.abs(input.lineas.reduce((suma, linea) => suma + linea.monto, 0) - esperado) >= 0.01) {
    throw new MontoNoCoincideConLoPendienteError(esperado);
  }

  return registrarPago(deps, {
    organizacionId: input.organizacionId,
    miembroId: input.miembroId,
    planId: miembro.planId,
    lineas: input.lineas,
    sucursalId: input.sucursalId,
    registradoPorId: input.registradoPorId,
    rolUsuario: input.rolUsuario,
    ...(input.fechaCobro ? { fechaPago: input.fechaCobro, completarCicloAbierto: true } : {}),
  });
}
