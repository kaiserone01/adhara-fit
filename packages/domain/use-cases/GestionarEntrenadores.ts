import type { IEntrenadorRepository } from "../ports/IEntrenadorRepository";
import type { Entrenador } from "../entities/Entrenador";

export class EntrenadorNoEncontradoError extends Error {
  constructor() {
    super("El entrenador no existe.");
  }
}

export class EntrenadorInactivoError extends Error {
  constructor() {
    super("El entrenador está desactivado.");
  }
}

export class NombreEntrenadorInvalidoError extends Error {
  constructor() {
    super("El nombre del entrenador es obligatorio.");
  }
}

type Deps = { entrenadores: IEntrenadorRepository };

export interface EntradaEntrenador {
  nombre: string;
  telefono?: string | null;
  fotoUrl?: string | null;
}

function limpiar(entrada: EntradaEntrenador) {
  const nombre = entrada.nombre.trim();
  if (!nombre) throw new NombreEntrenadorInvalidoError();
  return {
    nombre,
    telefono: entrada.telefono?.trim() || null,
    fotoUrl: entrada.fotoUrl?.trim() || null,
  };
}

export function listarTodosLosEntrenadores(deps: Deps): Promise<Entrenador[]> {
  return deps.entrenadores.listarTodos();
}

export async function obtenerEntrenador(deps: Deps, id: string): Promise<Entrenador> {
  const e = await deps.entrenadores.buscarPorId(id);
  if (!e) throw new EntrenadorNoEncontradoError();
  return e;
}

export async function crearEntrenador(deps: Deps, entrada: EntradaEntrenador): Promise<Entrenador> {
  return deps.entrenadores.crear(limpiar(entrada));
}

export async function actualizarEntrenador(deps: Deps, id: string, entrada: EntradaEntrenador): Promise<Entrenador> {
  await obtenerEntrenador(deps, id);
  return deps.entrenadores.actualizar(id, limpiar(entrada));
}

export async function cambiarEstadoEntrenador(deps: Deps, id: string, activo: boolean): Promise<Entrenador> {
  await obtenerEntrenador(deps, id);
  return deps.entrenadores.actualizar(id, { activo });
}

/**
 * Valida el entrenador elegido al crear o editar un socio.
 * Sin id → sin entrenador. Con id debe existir y estar activo; a un socio que ya lo tenía
 * se le permite conservarlo aunque se haya desactivado (`actualId`).
 */
export async function validarEntrenadorAsignable(deps: Deps, id: string | null | undefined, actualId?: string | null): Promise<string | null> {
  if (!id) return null;
  const e = await deps.entrenadores.buscarPorId(id);
  if (!e) throw new EntrenadorNoEncontradoError();
  if (!e.activo && id !== actualId) throw new EntrenadorInactivoError();
  return id;
}
