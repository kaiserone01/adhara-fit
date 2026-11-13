import { describe, expect, it } from "vitest";
import { validarConfig } from "./config";

describe("validarConfig", () => {
  it("acepta apiUrl https y clave, y quita las barras finales", () => {
    expect(validarConfig({ apiUrl: "https://admin.test///", clave: "abc" })).toEqual({ apiUrl: "https://admin.test", clave: "abc" });
  });

  it("acepta http solo en un host local de desarrollo", () => {
    expect(validarConfig({ apiUrl: "http://192.168.1.10:3000", clave: "k" }).apiUrl).toBe("http://192.168.1.10:3000");
    expect(validarConfig({ apiUrl: "http://localhost:3000", clave: "k" }).apiUrl).toBe("http://localhost:3000");
    expect(() => validarConfig({ apiUrl: "http://admin.test", clave: "k" })).toThrow(/https/);
  });

  it.each([
    ["sin objeto", undefined],
    ["sin apiUrl", { clave: "k" }],
    ["apiUrl vacía", { apiUrl: "", clave: "k" }],
    ["apiUrl sin esquema", { apiUrl: "admin.test", clave: "k" }],
    ["sin clave", { apiUrl: "https://admin.test" }],
    ["clave vacía", { apiUrl: "https://admin.test", clave: "" }],
    ["clave que no es texto", { apiUrl: "https://admin.test", clave: 123 }],
  ])("rechaza %s", (_caso, datos) => {
    expect(() => validarConfig(datos)).toThrow();
  });
});
