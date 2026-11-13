import { IMemberRepository } from "../ports/IMemberRepository";
import { ICheckInRepository } from "../ports/ICheckInRepository";
import { ISucursalRepository } from "../ports/ISucursalRepository";
import { EstadoCheckIn } from "../entities/CheckIn";
import { validarAccesoSucursal } from "./ValidarAccesoSucursalPorPlan";
import type { Miembro } from "../entities/Miembro";
import { esCumpleanos } from "../utils/fechaLima";
import { esCodigoSocio, normalizarDocumento } from "../utils/documento";

const VENTANA_IDEMPOTENCIA_MINUTOS = 2;

export interface RegistrarCheckInDeps {
  miembros: IMemberRepository;
  checkIns: ICheckInRepository;
  sucursales: ISucursalRepository;
}

export interface RegistrarCheckInInput {
  organizacionId: string;
  sucursalId: string;
  // Lo que tecleó el socio, sin interpretar: un código de socio (4 dígitos) o un documento.
  identificador: string;
}

export interface RegistrarCheckInResultado {
  nombre: string;
  fotoUrl: string | null;
  entrenadorNombre: string | null;
  // Vencimiento del plan del miembro — el checkin lo muestra en la tarjeta de acceso.
  fechaVencimiento: Date | null;
  estado: EstadoCheckIn;
  // Sede asignada al miembro — se informa siempre, pero cobra sentido en
  // el checkin cuando estado === "sucursal_incorrecta" ("Acceso denegado,
  // tu sede es X en Y").
  sucursalAsignadaNombre: string;
  sucursalAsignadaDireccion: string | null;
  // Si hoy (día de Lima) es su cumpleaños. La fecha de
  // nacimiento nunca sale del servidor: el checkin solo recibe este booleano.
  esCumpleanos: boolean;
}

export class MiembroNoEncontradoError extends Error {
  constructor() {
    super("No se encontró ningún socio con ese documento o código.");
  }
}

export async function registrarCheckIn(
  deps: RegistrarCheckInDeps,
  input: RegistrarCheckInInput
): Promise<RegistrarCheckInResultado> {
  const identificador = input.identificador.trim();
  const miembro = esCodigoSocio(identificador)
    ? await deps.miembros.buscarPorCodigoSocio(identificador)
    : await deps.miembros.buscarPorDocumento(normalizarDocumento(identificador));

  // Un miembro eliminado (S-09) no registra acceso: para el kiosco es como si no existiera.
  if (!miembro || miembro.estado === "BAJA") {
    throw new MiembroNoEncontradoError();
  }

  const sucursalAsignada = miembro.sucursalId
    ? await deps.sucursales.buscarPorId(input.organizacionId, miembro.sucursalId)
    : null;

  const base = {
    nombre: miembro.nombre,
    fotoUrl: miembro.fotoUrl,
    entrenadorNombre: miembro.entrenadorNombre,
    fechaVencimiento: miembro.fechaVencimiento,
    // Sin sucursalId (miembro "Ambas") no hay una sede única que informar
    // en un eventual mensaje de acceso denegado — de hecho nunca se
    // deniega por sede a este miembro, ver validarAccesoSucursal.
    sucursalAsignadaNombre: miembro.sucursalId ? sucursalAsignada?.nombre ?? "" : "Ambas",
    sucursalAsignadaDireccion: sucursalAsignada?.direccion ?? null,
    esCumpleanos: esCumpleanos(miembro.fechaNacimiento, new Date()),
  };

  const desde = new Date(Date.now() - VENTANA_IDEMPOTENCIA_MINUTOS * 60_000);
  const existente = await deps.checkIns.buscarRecientePorMiembroYSucursal(
    miembro.id,
    input.sucursalId,
    desde
  );

  if (existente) {
    return { ...base, estado: existente.estadoAlMomento };
  }

  const ahora = new Date();
  const estado = validarAccesoSucursal(miembro.sucursalId, input.sucursalId, miembro.fechaVencimiento, ahora);

  await deps.checkIns.crear({
    sucursalId: input.sucursalId,
    miembroId: miembro.id,
    estadoAlMomento: estado,
  });

  return { ...base, estado };
}
