import { describe, expect, test } from "vitest";
import { esCumpleanos, medianocheLimaDeFechaUtc, rangoDiaLima } from "./fechaLima";

// fechaNacimiento se guarda como fecha local a las 00:00 (igual que fechaInscripcion): se crea con el
// constructor local para que el test no dependa de la zona horaria de la máquina.
const nacio = (mes: number, dia: number) => new Date(1990, mes - 1, dia);

describe("esCumpleanos", () => {
  test("sin fecha de nacimiento no es cumpleaños", () => {
    expect(esCumpleanos(null, new Date("2026-10-08T15:00:00Z"))).toBe(false);
  });

  test("true el día del cumpleaños en Lima", () => {
    expect(esCumpleanos(nacio(10, 8), new Date("2026-10-08T15:00:00Z"))).toBe(true);
  });

  test("false otro día", () => {
    expect(esCumpleanos(nacio(10, 9), new Date("2026-10-08T15:00:00Z"))).toBe(false);
    expect(esCumpleanos(nacio(11, 8), new Date("2026-10-08T15:00:00Z"))).toBe(false);
  });

  test("de noche en Lima (ya es el día siguiente en UTC) cuenta el día de Lima", () => {
    // 22:00 del 8 de octubre en Lima = 03:00 UTC del 9.
    const ahora = new Date("2026-10-09T03:00:00Z");
    expect(esCumpleanos(nacio(10, 8), ahora)).toBe(true);
    expect(esCumpleanos(nacio(10, 9), ahora)).toBe(false);
  });

  test("de madrugada en UTC todavía es el día anterior en Lima", () => {
    // 23:00 del 7 de octubre en Lima = 04:00 UTC del 8.
    const ahora = new Date("2026-10-08T04:00:00Z");
    expect(esCumpleanos(nacio(10, 7), ahora)).toBe(true);
    expect(esCumpleanos(nacio(10, 8), ahora)).toBe(false);
  });
});

describe("medianocheLimaDeFechaUtc", () => {
  test("conserva el día calendario y lo pone a las 00:00 de Lima", () => {
    expect(medianocheLimaDeFechaUtc(new Date("2026-10-01T00:00:00Z")).toISOString()).toBe("2026-10-01T05:00:00.000Z");
    expect(medianocheLimaDeFechaUtc(new Date("2026-12-31T00:00:00Z")).toISOString()).toBe("2026-12-31T05:00:00.000Z");
    expect(medianocheLimaDeFechaUtc(new Date("2027-01-01T00:00:00Z")).toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });
});

describe("rangoDiaLima", () => {
  test("va de las 00:00 a las 23:59:59.999 de Lima (UTC-5)", () => {
    const { inicio, fin } = rangoDiaLima("2026-10-20");
    expect(inicio.toISOString()).toBe("2026-10-20T05:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-10-21T04:59:59.999Z");
  });
});
