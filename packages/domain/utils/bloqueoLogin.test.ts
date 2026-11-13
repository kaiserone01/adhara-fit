import { describe, it, expect } from "vitest";
import { claveIntentoLogin, evaluarBloqueoLogin } from "./bloqueoLogin";

const AHORA = new Date("2026-11-13T15:00:00.000Z");
const haceMin = (m: number) => new Date(AHORA.getTime() - m * 60_000);

describe("evaluarBloqueoLogin", () => {
  it("permite hasta 4 fallos en 15 minutos", () => {
    expect(evaluarBloqueoLogin([1, 2, 3, 4].map(haceMin), AHORA)).toEqual({ bloqueado: false });
  });

  it("bloquea al 5.º fallo hasta que el más antiguo cumpla 15 minutos", () => {
    expect(evaluarBloqueoLogin([1, 2, 3, 4, 10].map(haceMin), AHORA)).toEqual({ bloqueado: true, reintentarEnSegundos: 300 });
  });

  it("los fallos de hace 15 minutos o más ya no cuentan", () => {
    expect(evaluarBloqueoLogin([1, 2, 3, 4, 15].map(haceMin), AHORA)).toEqual({ bloqueado: false });
    expect(evaluarBloqueoLogin([1, 2, 3, 4, 20].map(haceMin), AHORA)).toEqual({ bloqueado: false });
  });
});

describe("claveIntentoLogin", () => {
  it("normaliza el correo y separa por IP", () => {
    expect(claveIntentoLogin("  Admin@Gym.PE ", "1.2.3.4")).toBe("admin@gym.pe|1.2.3.4");
    expect(claveIntentoLogin("a@b.c", "1.1.1.1")).not.toBe(claveIntentoLogin("a@b.c", "2.2.2.2"));
  });
});
