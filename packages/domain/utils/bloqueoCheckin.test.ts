import { describe, it, expect } from "vitest";
import { evaluarBloqueoCheckin } from "./bloqueoCheckin";

const AHORA = new Date("2026-11-13T15:00:00.000Z");
const haceSegundos = (s: number) => new Date(AHORA.getTime() - s * 1000);

describe("evaluarBloqueoCheckin", () => {
  it("no bloquea con menos de 5 fallos vigentes", () => {
    expect(evaluarBloqueoCheckin([], AHORA)).toEqual({ bloqueado: false });
    expect(evaluarBloqueoCheckin([1, 2, 3, 4].map(haceSegundos), AHORA)).toEqual({ bloqueado: false });
  });

  it("bloquea con 5 fallos vigentes y calcula el tiempo hasta que el más antiguo salga de la ventana", () => {
    const r = evaluarBloqueoCheckin([10, 20, 30, 40, 100].map(haceSegundos), AHORA);
    expect(r).toEqual({ bloqueado: true, reintentarEnSegundos: 200 });
  });

  it("borde: a los 299 s el fallo aún cuenta (queda 1 s) y a los 300 s ya no", () => {
    expect(evaluarBloqueoCheckin([1, 2, 3, 4, 299].map(haceSegundos), AHORA)).toEqual({ bloqueado: true, reintentarEnSegundos: 1 });
    expect(evaluarBloqueoCheckin([1, 2, 3, 4, 300].map(haceSegundos), AHORA)).toEqual({ bloqueado: false });
  });

  it("redondea hacia arriba y el mínimo es 1 s", () => {
    const casi = new Date(AHORA.getTime() - 299_900);
    const r = evaluarBloqueoCheckin([casi, haceSegundos(1), haceSegundos(2), haceSegundos(3), haceSegundos(4)], AHORA);
    expect(r).toEqual({ bloqueado: true, reintentarEnSegundos: 1 });
  });
});
