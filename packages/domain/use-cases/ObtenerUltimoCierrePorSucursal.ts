import { ITurnoRepository } from "../ports/ITurnoRepository";
import { IArqueoRepository } from "../ports/IArqueoRepository";
import { METODO_EFECTIVO } from "./ObtenerResumenTurno";

export interface UltimoCierre {
  turnoId: string;
  cerradoEn: Date;
  // Solo el efectivo físico contado al cerrar — es lo único relevante para sugerir el fondo inicial del próximo
  // turno. null si esa línea no existe en el arqueo anterior.
  efectivoContado: number | null;
}

// El último turno CERRADO de una sucursal, con lo que quedó contado en efectivo — para que quien abre el siguiente
// turno sepa cuánto fondo inicial poner sin tener que preguntarle a quien cerró la caja antes (ver diseño acordado:
// "Último cierre" en la pantalla de Abrir turno).
export async function obtenerUltimoCierrePorSucursal(
  deps: { turnos: ITurnoRepository; arqueo: IArqueoRepository },
  input: { sucursalId: string }
): Promise<UltimoCierre | null> {
  const turno = await deps.turnos.buscarUltimoCerradoPorSucursal(input.sucursalId);
  if (!turno || !turno.cerradoEn) return null;

  const lineas = await deps.arqueo.listarPorTurno(turno.id);
  const linea = lineas.find((l) => l.metodo === METODO_EFECTIVO);

  return { turnoId: turno.id, cerradoEn: turno.cerradoEn, efectivoContado: linea?.montoContado ?? null };
}
