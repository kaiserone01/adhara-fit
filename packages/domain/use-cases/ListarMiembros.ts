import { IMemberRepository } from "../ports/IMemberRepository";
import { Miembro, EstadoMiembro } from "../entities/Miembro";

export async function listarMiembros(
  deps: { miembros: IMemberRepository },
  organizacionId: string,
  sucursalActivaId: string,
  estado: EstadoMiembro = "ACTIVO"
): Promise<Miembro[]> {
  const todos = await deps.miembros.listarPorOrganizacion(organizacionId);
  return todos.filter((m) => m.estado === estado && (m.sucursalId === null || m.sucursalId === sucursalActivaId));
}
