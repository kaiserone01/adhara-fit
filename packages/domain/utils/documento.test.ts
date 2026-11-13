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
    expect(validarDocumento("CE", "abc123456")).toBe(true);
    expect(validarDocumento("CE", "ABC12345")).toBe(false);
    expect(validarDocumento("CE", "ABC1234567890")).toBe(false);
    expect(validarDocumento("CE", "ABC12345*")).toBe(false);
  });

  it("código de socio: exactamente cuatro dígitos; solo CE lo recibe", () => {
    expect(esCodigoSocio(" 0042 ")).toBe(true);
    expect(esCodigoSocio("42")).toBe(false);
    expect(esCodigoSocio("12345")).toBe(false);
    expect(esCodigoSocio("12A4")).toBe(false);
    expect(requiereCodigoSocio("DNI")).toBe(false);
    expect(requiereCodigoSocio("CE")).toBe(true);
    expect(formatearCodigoSocio(7)).toBe("0007");
  });
});
