import { describe, expect, test } from "vitest";
import { aCentavos, diaLima, estaVigente, estadoAcceso, sumarDiasCalendario } from "./vencimiento";

const dia = (iso: string) => new Date(`${iso}T05:00:00.000Z`);

describe("diaLima", () => {
  test("devuelve el inicio del día de Lima (05:00Z)", () => {
    expect(diaLima(new Date("2026-11-13T15:00:00Z"))).toEqual(dia("2026-11-13"));
  });

  test("de noche en Lima (después de las 19:00) sigue siendo el mismo día aunque en UTC ya sea el siguiente", () => {
    expect(diaLima(new Date("2026-11-14T03:30:00Z"))).toEqual(dia("2026-11-13"));
  });

  test("justo a las 00:00 de Lima empieza el día nuevo", () => {
    expect(diaLima(new Date("2026-11-13T05:00:00Z"))).toEqual(dia("2026-11-13"));
    expect(diaLima(new Date("2026-11-13T04:59:59Z"))).toEqual(dia("2026-11-12"));
  });
});

describe("estaVigente / estadoAcceso", () => {
  const ahora = new Date("2026-11-13T15:00:00Z");

  test("el día del vencimiento todavía hay acceso (inclusive), incluso a las 23:59 de Lima", () => {
    expect(estaVigente(dia("2026-11-13"), ahora)).toBe(true);
    expect(estaVigente(dia("2026-11-13"), new Date("2026-11-14T04:59:00Z"))).toBe(true);
  });

  test("al día siguiente ya no hay acceso (sin días de gracia)", () => {
    expect(estaVigente(dia("2026-11-12"), ahora)).toBe(false);
    expect(estaVigente(dia("2026-11-13"), new Date("2026-11-14T05:00:00Z"))).toBe(false);
  });

  test("sin vencimiento no hay acceso", () => {
    expect(estaVigente(null, ahora)).toBe(false);
    expect(estadoAcceso(null, ahora)).toBe("vencido");
  });

  test("estadoAcceso es activo o vencido", () => {
    expect(estadoAcceso(dia("2026-12-01"), ahora)).toBe("activo");
    expect(estadoAcceso(dia("2026-11-01"), ahora)).toBe("vencido");
  });
});

describe("sumarDiasCalendario / aCentavos", () => {
  test("suma días corridos sobre el día de calendario", () => {
    expect(sumarDiasCalendario(dia("2026-11-13"), 30)).toEqual(dia("2026-12-13"));
    expect(sumarDiasCalendario(new Date("2026-11-13T15:00:00Z"), 1)).toEqual(dia("2026-11-14"));
    expect(sumarDiasCalendario(dia("2026-11-13"), -1)).toEqual(dia("2026-11-12"));
  });

  test("redondea a centavos sin errores de punto flotante", () => {
    expect(aCentavos(0.1 + 0.2)).toBe(30);
    expect(aCentavos(99.99)).toBe(9999);
    expect(aCentavos(33.33 * 3)).toBe(9999);
  });
});
