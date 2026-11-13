import { describe, expect, it } from "vitest";
import { CelularInvalidoError, CorreoInvalidoError } from "../entities/ErroresMiembro";
import {
  aplicarMascaraCelular,
  normalizarCelular,
  normalizarCorreo,
  prepararCelular,
  prepararCorreo,
  validarCelular,
  validarCorreo,
} from "./contacto";

describe("celular", () => {
  it("normaliza: solo dígitos, sin +51 y como máximo 9", () => {
    expect(normalizarCelular("987 654 321")).toBe("987654321");
    expect(normalizarCelular("+51 987-654-321")).toBe("987654321");
    expect(normalizarCelular("98765432100")).toBe("987654321");
  });

  it("máscara «987 654 321» al teclear o pegar", () => {
    expect(aplicarMascaraCelular("9")).toBe("9");
    expect(aplicarMascaraCelular("9876")).toBe("987 6");
    expect(aplicarMascaraCelular("987654321")).toBe("987 654 321");
    expect(aplicarMascaraCelular("+51987654321")).toBe("987 654 321");
    expect(aplicarMascaraCelular("987 654 321 999")).toBe("987 654 321");
  });

  it("válido: 9 dígitos que empiezan con 9", () => {
    expect(validarCelular("987 654 321")).toBe(true);
    expect(validarCelular("+51 987654321")).toBe(true);
    expect(validarCelular("887654321")).toBe(false);
    expect(validarCelular("98765432")).toBe(false);
    expect(validarCelular("abc")).toBe(false);
  });

  it("opcional: vacío o ausente es null; con texto, se valida y se guarda normalizado", () => {
    expect(prepararCelular(undefined)).toBeNull();
    expect(prepararCelular(null)).toBeNull();
    expect(prepararCelular("  ")).toBeNull();
    expect(prepararCelular("987 654 321")).toBe("987654321");
    expect(() => prepararCelular("12345")).toThrow(CelularInvalidoError);
    expect(() => prepararCelular(987654321)).toThrow(CelularInvalidoError);
  });
});

describe("correo", () => {
  it("normaliza a minúsculas y sin espacios en los bordes", () => {
    expect(normalizarCorreo("  Ana@Correo.COM ")).toBe("ana@correo.com");
  });

  it("válido: usuario@dominio.extensión, sin espacios", () => {
    expect(validarCorreo("ana@correo.com")).toBe(true);
    expect(validarCorreo("ana.perez+gym@mail.com.pe")).toBe(true);
    expect(validarCorreo("ana@correo")).toBe(false);
    expect(validarCorreo("ana correo@x.com")).toBe(false);
    expect(validarCorreo("@correo.com")).toBe(false);
    expect(validarCorreo(`${"a".repeat(250)}@x.com`)).toBe(false);
  });

  it("opcional: vacío es null; con texto, se valida y se guarda en minúsculas", () => {
    expect(prepararCorreo("")).toBeNull();
    expect(prepararCorreo("Ana@Correo.com")).toBe("ana@correo.com");
    expect(() => prepararCorreo("sin-arroba")).toThrow(CorreoInvalidoError);
    expect(() => prepararCorreo(5)).toThrow(CorreoInvalidoError);
  });
});
