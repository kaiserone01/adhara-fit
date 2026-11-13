import { describe, it, expect } from "vitest";
import { segundosDeEspera, ESPERA_POR_DEFECTO_SEGUNDOS } from "./esperaBloqueo";

describe("segundosDeEspera", () => {
  it("usa el Retry-After numérico", () => {
    expect(segundosDeEspera("42")).toBe(42);
    expect(segundosDeEspera(" 7 ")).toBe(7);
  });

  it("cae a 300 s si falta, no es numérico o es cero", () => {
    expect(segundosDeEspera(null)).toBe(ESPERA_POR_DEFECTO_SEGUNDOS);
    expect(segundosDeEspera("")).toBe(ESPERA_POR_DEFECTO_SEGUNDOS);
    expect(segundosDeEspera("pronto")).toBe(ESPERA_POR_DEFECTO_SEGUNDOS);
    expect(segundosDeEspera("-5")).toBe(ESPERA_POR_DEFECTO_SEGUNDOS);
    expect(segundosDeEspera("0")).toBe(ESPERA_POR_DEFECTO_SEGUNDOS);
  });
});
