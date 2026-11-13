import { describe, expect, test } from "vitest";
import { listarEnSala, listarHistorialSala, requiereCobro } from "./ListarEnSala";
import type { ICheckInRepository } from "../ports/ICheckInRepository";
import type { CheckInEnSala } from "../entities/CheckIn";

// 29/09/2026 10:00 en Lima.
const AHORA = new Date("2026-09-29T15:00:00Z");
const DIA = 86_400_000;
// Inicio del día de Lima de AHORA (05:00Z): el último día con acceso es el del vencimiento, inclusive.
const HOY = new Date("2026-09-29T05:00:00Z");

function checkIn(id: string, miembroId: string, minutosAtras: number, fechaVencimiento: Date | null, salidaAt: Date | null = null): CheckInEnSala {
  return {
    id,
    miembroId,
    fechaHora: new Date(AHORA.getTime() - minutosAtras * 60_000),
    salidaAt,
    miembro: { nombre: `Miembro ${miembroId}`, fotoUrl: null, sucursalId: null, fechaVencimiento, planNombre: null },
  };
}

function deps(abiertos: CheckInEnSala[]) {
  const checkIns = { listarEnSala: async () => abiertos, listarDesde: async () => abiertos } as unknown as ICheckInRepository;
  return { checkIns };
}

describe("requiereCobro", () => {
  test("alerta solo en vencido", () => {
    expect(requiereCobro("vencido")).toBe(true);
    expect(requiereCobro("activo")).toBe(false);
    expect(requiereCobro("sucursal_incorrecta")).toBe(false);
  });
});

describe("listarEnSala", () => {
  const input = { organizacionId: "org", sucursalId: "suc", ahora: AHORA };

  test("pone primero a quienes hay que cobrar y recalcula el estado en vivo", async () => {
    const vencido = new Date(HOY.getTime() - 30 * DIA);
    const vigente = new Date(HOY.getTime() + 10 * DIA);
    const personas = await listarEnSala(deps([checkIn("c1", "vigente", 5, vigente), checkIn("c2", "moroso", 20, vencido)]), input);
    expect(personas.map((p) => [p.miembroId, p.estado, p.requiereCobro])).toEqual([
      ["moroso", "vencido", true],
      ["vigente", "activo", false],
    ]);
  });

  test("el día del vencimiento todavía tiene acceso; al día siguiente está vencido (sin días de gracia)", async () => {
    const [venceHoy] = await listarEnSala(deps([checkIn("c1", "m1", 5, HOY)]), input);
    expect(venceHoy.estado).toBe("activo");
    expect(venceHoy.requiereCobro).toBe(false);

    const [venciAyer] = await listarEnSala(deps([checkIn("c1", "m1", 5, new Date(HOY.getTime() - DIA))]), input);
    expect(venciAyer.estado).toBe("vencido");
    expect(venciAyer.requiereCobro).toBe(true);
  });

  test("sin vencimiento registrado se considera vencido", async () => {
    const [persona] = await listarEnSala(deps([checkIn("c1", "m1", 5, null)]), input);
    expect(persona.estado).toBe("vencido");
  });

  test("un miembro con dos check-ins abiertos aparece una sola vez (el más reciente)", async () => {
    const vigente = new Date(HOY.getTime() + 10 * DIA);
    const personas = await listarEnSala(deps([checkIn("nuevo", "m1", 5, vigente), checkIn("viejo", "m1", 90, vigente)]), input);
    expect(personas.map((p) => p.checkInId)).toEqual(["nuevo"]);
  });

  test("sin check-ins abiertos devuelve lista vacía", async () => {
    expect(await listarEnSala(deps([]), input)).toEqual([]);
  });
});

describe("listarHistorialSala", () => {
  const base = { organizacionId: "org", sucursalId: "suc", ahora: AHORA };
  const vigente = new Date(HOY.getTime() + 10 * DIA);

  test("incluye a quien ya salió, con su hora de salida, y mantiene el orden por entrada", async () => {
    const salida = new Date(AHORA.getTime() - 10 * 60_000);
    const personas = await listarHistorialSala(
      deps([checkIn("c1", "m1", 5, vigente), checkIn("c2", "m2", 120, vigente, salida)]),
      { ...base, rango: "24h" }
    );
    expect(personas.map((p) => [p.miembroId, p.salidaAt])).toEqual([
      ["m1", null],
      ["m2", salida],
    ]);
  });

  test("una fila por persona (la entrada más reciente) y estado de pago recalculado hoy", async () => {
    const personas = await listarHistorialSala(
      deps([checkIn("nuevo", "m1", 5, vigente), checkIn("viejo", "m1", 600, vigente)]),
      { ...base, rango: "hoy" }
    );
    expect(personas.map((p) => [p.checkInId, p.estado])).toEqual([["nuevo", "activo"]]);
  });

  test("pide al repositorio desde las últimas 24 horas o desde el inicio del día de Lima", async () => {
    const desdes: Date[] = [];
    const d = deps([]);
    d.checkIns = { listarDesde: async (_s: string, desde: Date) => (desdes.push(desde), []) } as unknown as ICheckInRepository;
    await listarHistorialSala(d, { ...base, rango: "24h" });
    await listarHistorialSala(d, { ...base, rango: "hoy" });
    expect(desdes[0]).toEqual(new Date(AHORA.getTime() - 24 * 3_600_000));
    expect(desdes[1]).toEqual(new Date("2026-09-29T05:00:00Z"));
  });
});
