import type { Entrenador } from "../entities/Entrenador";
import type { EntrenadorResumen } from "../entities/EntrenadorResumen";

export interface DatosEntrenador {
  nombre: string;
  telefono: string | null;
  fotoUrl: string | null;
}

export interface IEntrenadorRepository {
  /** Todos los entrenadores (activos e inactivos), por nombre. */
  listarTodos(): Promise<Entrenador[]>;
  /** Solo activos, para los selectores. */
  listarActivos(): Promise<EntrenadorResumen[]>;
  buscarPorId(id: string): Promise<Entrenador | null>;
  crear(datos: DatosEntrenador): Promise<Entrenador>;
  actualizar(id: string, datos: Partial<DatosEntrenador> & { activo?: boolean }): Promise<Entrenador>;
}
