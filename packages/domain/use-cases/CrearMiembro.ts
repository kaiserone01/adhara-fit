import { IMemberRepository } from "../ports/IMemberRepository";
import { Miembro, DatosNuevoMiembro } from "../entities/Miembro";
import {
  CelularInvalidoError,
  CodigoSocioEnConflictoError,
  CodigosSocioAgotadosError,
  CorreoInvalidoError,
  DocumentoDuplicadoError,
  DocumentoInvalidoError,
} from "../entities/ErroresMiembro";
import { normalizarDocumento, requiereCodigoSocio, validarDocumento } from "../utils/documento";
import { prepararCelular, prepararCorreo } from "../utils/contacto";
import { conCodigoSocio } from "./AsignarCodigoSocio";

export {
  CelularInvalidoError,
  CodigoSocioEnConflictoError,
  CodigosSocioAgotadosError,
  CorreoInvalidoError,
  DocumentoDuplicadoError,
  DocumentoInvalidoError,
};

export async function crearMiembro(
  deps: { miembros: IMemberRepository },
  input: Omit<DatosNuevoMiembro, "codigoSocio">
): Promise<Miembro> {
  const numeroDocumento = normalizarDocumento(input.numeroDocumento);
  if (!validarDocumento(input.tipoDocumento, numeroDocumento)) {
    throw new DocumentoInvalidoError();
  }

  // Celular y correo son opcionales: vacío = sin dato; con texto, deben tener formato válido.
  const celular = prepararCelular(input.celular);
  const correo = prepararCorreo(input.correo);

  const existente = await deps.miembros.buscarPorDocumento(numeroDocumento);
  if (existente) {
    throw new DocumentoDuplicadoError(existente.estado === "BAJA");
  }

  const datos = { ...input, numeroDocumento, celular, correo };

  // Quien no puede teclear su documento (CE) recibe un código de socio de 4 dígitos.
  if (requiereCodigoSocio(input.tipoDocumento)) {
    return conCodigoSocio(deps.miembros, (codigoSocio) => deps.miembros.crear({ ...datos, codigoSocio }));
  }

  return deps.miembros.crear({ ...datos, codigoSocio: null });
}
