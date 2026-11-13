import type { IMemberRepository } from "../ports/IMemberRepository";
import { CodigoSocioEnConflictoError, CodigosSocioAgotadosError } from "../entities/ErroresMiembro";
import { formatearCodigoSocio, MAXIMO_CODIGO_SOCIO } from "../utils/documento";

const INTENTOS = 3;

/**
 * Calcula el siguiente código de socio (máximo existente + 1, cuatro dígitos) y ejecuta `guardar` con él.
 * Si dos altas simultáneas chocan en el mismo código, `guardar` lanza CodigoSocioEnConflictoError y se
 * recalcula; tras tres choques se propaga el conflicto sin haber guardado nada.
 */
export async function conCodigoSocio<T>(
  miembros: Pick<IMemberRepository, "maximoCodigoSocio">,
  guardar: (codigo: string) => Promise<T>
): Promise<T> {
  for (let intento = 0; intento < INTENTOS; intento++) {
    const maximo = await miembros.maximoCodigoSocio();
    if (maximo >= MAXIMO_CODIGO_SOCIO) throw new CodigosSocioAgotadosError();
    try {
      return await guardar(formatearCodigoSocio(maximo + 1));
    } catch (error) {
      if (error instanceof CodigoSocioEnConflictoError) continue;
      throw error;
    }
  }
  throw new CodigoSocioEnConflictoError();
}
