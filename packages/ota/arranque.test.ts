import { describe, expect, it } from "vitest";
import { mensajeArranque, msMensajeFinal, porcentajeSeguro, textoVersion } from "./arranque";

describe("porcentajeSeguro", () => {
  it("redondea y limita a 0–100", () => {
    expect(porcentajeSeguro(45.6)).toBe(46);
    expect(porcentajeSeguro(-5)).toBe(0);
    expect(porcentajeSeguro(140)).toBe(100);
  });
  it("lo que no es un número finito es 0", () => {
    expect(porcentajeSeguro(Number.NaN)).toBe(0);
    expect(porcentajeSeguro(undefined)).toBe(0);
    expect(porcentajeSeguro("50")).toBe(0);
  });
});

describe("mensajeArranque", () => {
  it("dice qué está haciendo en cada fase", () => {
    expect(mensajeArranque({ fase: "buscando" })).toBe("Buscando actualizaciones…");
    expect(mensajeArranque({ fase: "descargando", version: "1.0.7", porcentaje: 45 })).toBe("Descargando actualización 1.0.7 · 45 %");
    expect(mensajeArranque({ fase: "instalando", version: "1.0.7" })).toBe("Instalando actualización 1.0.7…");
    expect(mensajeArranque({ fase: "al-dia" })).toBe("Está actualizado");
    expect(mensajeArranque({ fase: "listo" })).toBe("");
  });
  it("los fallos avisan y arrancan igual", () => {
    expect(mensajeArranque({ fase: "sin-conexion" })).toMatch(/iniciando/);
    expect(mensajeArranque({ fase: "error-instalar", version: "1.0.7" })).toMatch(/1\.0\.7/);
  });
});

describe("msMensajeFinal", () => {
  it("deja leer el resultado y no retrasa los estados intermedios", () => {
    expect(msMensajeFinal({ fase: "al-dia" })).toBe(1200);
    expect(msMensajeFinal({ fase: "sin-conexion" })).toBe(2000);
    expect(msMensajeFinal({ fase: "buscando" })).toBe(0);
  });
});

describe("textoVersion", () => {
  it("antepone «Versión» o queda vacío", () => {
    expect(textoVersion("1.0.6")).toBe("Versión 1.0.6");
    expect(textoVersion("")).toBe("");
  });
});
