import { describe, expect, it } from "vitest";
import { hayVersionNueva, leerActualizaciones, puedeIntentar, urlBaseValida, urlDelZip, validarManifiesto, versionDeBundle } from "./manifiesto";

const SHA = "a".repeat(64);
const valido = { app: "checkin", versionCode: 12, versionName: "1.0.12", zip: "12.zip", sha256: SHA };

describe("validarManifiesto", () => {
  it("acepta un manifiesto correcto", () => {
    expect(validarManifiesto(valido)).toEqual(valido);
  });
  it("normaliza el sha256 a minúsculas", () => {
    expect(validarManifiesto({ ...valido, sha256: SHA.toUpperCase() })?.sha256).toBe(SHA);
  });
  it.each([
    ["no objeto", "x"],
    ["nulo", null],
    ["versión 0", { ...valido, versionCode: 0 }],
    ["versión decimal", { ...valido, versionCode: 1.5 }],
    ["versión texto", { ...valido, versionCode: "12" }],
    ["zip con ruta", { ...valido, zip: "../12.zip" }],
    ["zip con esquema", { ...valido, zip: "https://malo.example/12.zip" }],
    ["zip sin extensión", { ...valido, zip: "12" }],
    ["sha corto", { ...valido, sha256: "abc" }],
    ["sin app", { ...valido, app: "" }],
  ])("rechaza %s", (_n, entrada) => {
    expect(validarManifiesto(entrada)).toBeNull();
  });
});

describe("hayVersionNueva", () => {
  it("solo si la publicada es mayor", () => {
    expect(hayVersionNueva(5, 6)).toBe(true);
    expect(hayVersionNueva(6, 6)).toBe(false);
    expect(hayVersionNueva(7, 6)).toBe(false);
  });
  it("trata una versión actual inválida como 0", () => {
    expect(hayVersionNueva(Number.NaN, 1)).toBe(true);
  });
});

describe("versionDeBundle", () => {
  it("lee el número de 1.0.N y de N", () => {
    expect(versionDeBundle("1.0.12", 3)).toBe(12);
    expect(versionDeBundle("12", 3)).toBe(12);
  });
  it("usa la del APK con «builtin»", () => {
    expect(versionDeBundle("builtin", 3)).toBe(3);
  });
});

describe("urlDelZip / urlBaseValida / puedeIntentar", () => {
  it("une sin barras dobles", () => {
    expect(urlDelZip("https://x.test/ota/checkin/", "12.zip")).toBe("https://x.test/ota/checkin/12.zip");
  });
  it("exige https", () => {
    expect(urlBaseValida("https://media.adhara.fit/ota/checkin")).toBe(true);
    expect(urlBaseValida("http://media.adhara.fit/x")).toBe(false);
    expect(urlBaseValida("http://localhost:3000/x")).toBe(true);
    expect(urlBaseValida("no es url")).toBe(false);
    expect(urlBaseValida(undefined)).toBe(false);
  });
  it("limita los intentos por versión", () => {
    expect(puedeIntentar(0)).toBe(true);
    expect(puedeIntentar(3)).toBe(false);
  });
});

describe("leerActualizaciones", () => {
  it("lee el bloque válido y recorta la barra final", () => {
    expect(leerActualizaciones({ apiUrl: "x", actualizaciones: { url: "https://m.test/ota/checkin/", versionCode: 4 } })).toEqual({
      url: "https://m.test/ota/checkin",
      versionCode: 4,
    });
  });
  it("devuelve null si falta, es http o la versión es inválida", () => {
    expect(leerActualizaciones({})).toBeNull();
    expect(leerActualizaciones(null)).toBeNull();
    expect(leerActualizaciones({ actualizaciones: { url: "http://m.test/x", versionCode: 1 } })).toBeNull();
    expect(leerActualizaciones({ actualizaciones: { url: "https://m.test/x", versionCode: "1" } })).toBeNull();
  });
});
