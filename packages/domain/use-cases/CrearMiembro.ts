import { IMemberRepository } from "../ports/IMemberRepository";
import { Miembro, DatosNuevoMiembro } from "../entities/Miembro";
import {
  CodigoSocioEnConflictoError,
  CodigosSocioAgotadosError,
  DocumentoDuplicadoError,
  DocumentoInvalidoError,
} from "../entities/ErroresMiembro";
import { normalizarDocumento, requiereCodigoSocio, validarDocumento } from "../utils/documento";
import { conCodigoSocio } from "./AsignarCodigoSocio";

export { CodigoSocioEnConflictoError, CodigosSocioAgotadosError, DocumentoDuplicadoError, DocumentoInvalidoError };

export async function crearMiembro(
  deps: { miembros: IMemberRepository },
  input: Omit<DatosNuevoMiembro, "codigoSocio">
): Promise<Miembro> {
  const numeroDocumento = normalizarDocumento(input.numeroDocumento);
  if (!validarDocumento(input.tipoDocumento, numeroDocumento)) {
    throw new DocumentoInvalidoError();
  }

  if (await deps.miembros.buscarPorDocumento(numeroDocumento)) {
    throw new DocumentoDuplicadoError();
  }

  const datos = { ...input, numeroDocumento };

  // Quien no puede teclear su documento (CE) recibe un código de socio de 4 dígitos.
  if (requiereCodigoSocio(input.tipoDocumento)) {
    return conCodigoSocio(deps.miembros, (codigoSocio) => deps.miembros.crear({ ...datos, codigoSocio }));
  }

  return deps.miembros.crear({ ...datos, codigoSocio: null });
}
