import { describe, expect, it } from "vitest";
import { CLAVE_CHECKIN_MIN_LARGO, claveCheckinValida } from "./claveCheckin";

const CLAVE = "a".repeat(CLAVE_CHECKIN_MIN_LARGO);

describe("claveCheckinValida", () => {
  it("acepta la clave idéntica", () => {
    expect(claveCheckinValida(CLAVE, CLAVE)).toBe(true);
  });

  it("rechaza una clave distinta, más corta o más larga", () => {
    expect(claveCheckinValida(`${CLAVE.slice(0, -1)}b`, CLAVE)).toBe(false);
    expect(claveCheckinValida(CLAVE.slice(0, -1), CLAVE)).toBe(false);
    expect(claveCheckinValida(`${CLAVE}a`, CLAVE)).toBe(false);
  });

  it("rechaza si no se envía clave", () => {
    expect(claveCheckinValida(undefined, CLAVE)).toBe(false);
    expect(claveCheckinValida("", CLAVE)).toBe(false);
  });

  it("falla cerrado si la variable no está definida, está vacía o es demasiado corta", () => {
    expect(claveCheckinValida("", "")).toBe(false);
    expect(claveCheckinValida("abc", "abc")).toBe(false);
    expect(claveCheckinValida(CLAVE, undefined)).toBe(false);
    const corta = "x".repeat(CLAVE_CHECKIN_MIN_LARGO - 1);
    expect(claveCheckinValida(corta, corta)).toBe(false);
  });

  it("distingue mayúsculas y no recorta espacios", () => {
    const k = "Clave-Secreta-Del-Check-in-2026";
    expect(claveCheckinValida(k.toLowerCase(), k)).toBe(false);
    expect(claveCheckinValida(` ${k}`, k)).toBe(false);
  });
});
