import { describe, expect, it } from "vitest";
import {
  esCodigoSocio,
  formatearCodigoSocio,
  normalizarDocumento,
  requiereCodigoSocio,
  validarDocumento,
} from "./documento";

describe("documento (S-06)", () => {
  it("normaliza: recorta, mayúsculas, sin espacios ni guiones", () => {
    expect(normalizarDocumento("  ab-12 3 4–5—6 ")).toBe("AB123456");
  });

  it("DNI: exactamente 8 dígitos ASCII", () => {
    expect(validarDocumento("DNI", "12345678")).toBe(true);
    expect(validarDocumento("DNI", "1234567")).toBe(false);
    expect(validarDocumento("DNI", "123456789")).toBe(false);
    expect(validarDocumento("DNI", "1234567A")).toBe(false);
    expect(validarDocumento("DNI", "１２３４５６７８")).toBe(false); // dígitos de ancho completo
    expect(validarDocumento("DNI", "1234-5678")).toBe(true); // el guion se normaliza
  });

  it("CE: 9 a 12 alfanuméricos", () => {
    expect(validarDocumento("CE", "001234567")).toBe(true);
    expect(validarDocumento("CE", "123456789012")).toBe(true);
    expect(validarDocumento("CE", "12345678")).toBe(false);
    expect(validarDocumento("CE", "1234567890123")).toBe(false);
    expect(validarDocumento("CE", "ABC123456")).toBe(false); // con letras no se puede teclear en el check-in
    expect(validarDocumento("CE", "12345678*")).toBe(false);
  });

  it("código de socio: exactamente cuatro dígitos; ya no se asigna a ningún tipo", () => {
    expect(esCodigoSocio(" 0042 ")).toBe(true);
    expect(esCodigoSocio("42")).toBe(false);
    expect(esCodigoSocio("12345")).toBe(false);
    expect(esCodigoSocio("12A4")).toBe(false);
    expect(requiereCodigoSocio("DNI")).toBe(false);
    expect(requiereCodigoSocio("CE")).toBe(false);
    expect(formatearCodigoSocio(7)).toBe("0007");
  });
});
