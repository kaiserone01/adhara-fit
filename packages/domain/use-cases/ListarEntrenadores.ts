import type { IEntrenadorRepository } from "../ports/IEntrenadorRepository";
import type { EntrenadorResumen } from "../entities/EntrenadorResumen";

/** Entrenadores activos para los selectores (gimnasio de una sola sede). */
export async function listarEntrenadores(deps: { entrenadores: IEntrenadorRepository }): Promise<EntrenadorResumen[]> {
  return deps.entrenadores.listarActivos();
}
