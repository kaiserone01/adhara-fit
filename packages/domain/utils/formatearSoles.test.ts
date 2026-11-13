import { describe, expect, it } from "vitest";
import { formatearSoles } from "./formatearSoles";

describe("formatearSoles", () => {
  it("muestra dos decimales y coma para los miles", () => {
    expect(formatearSoles(120)).toBe("S/ 120.00");
    expect(formatearSoles(1234.5)).toBe("S/ 1,234.50");
    expect(formatearSoles(0)).toBe("S/ 0.00");
  });

  it("redondea al céntimo", () => {
    expect(formatearSoles(10.005)).toBe("S/ 10.01");
    expect(formatearSoles(0.1 + 0.2)).toBe("S/ 0.30");
  });

  it("pone el signo menos delante de S/", () => {
    expect(formatearSoles(-45.9)).toBe("-S/ 45.90");
  });
});
