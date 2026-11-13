import { describe, expect, test } from "vitest";
import { anularPago } from "./AnularPago";
import type { Pago } from "../entities/Pago";

function crearDeps() {
  const pago = { id: "p1", grupoPagoId: null, anuladoEn: null } as unknown as Pago;
  const anuladas: { id: string; motivo: string }[] = [];

  const deps = {
    pagos: {
      buscarPorId: async () => pago,
      anular: async (_org: string, id: string, _por: string, motivo: string) => {
        anuladas.push({ id, motivo });
        return pago;
      },
    },
  } as unknown as Parameters<typeof anularPago>[0];

  return { deps, anuladas };
}

const input = { organizacionId: "org", pagoId: "p1", anuladoPorId: "u1", motivo: "método equivocado" };

describe("anularPago", () => {
  test("anula el pago con el motivo sin espacios sobrantes", async () => {
    const { deps, anuladas } = crearDeps();
    await anularPago(deps, { ...input, motivo: "  método equivocado " });
    expect(anuladas).toEqual([{ id: "p1", motivo: "método equivocado" }]);
  });

  test("sin motivo se rechaza", async () => {
    const { deps, anuladas } = crearDeps();
    await expect(anularPago(deps, { ...input, motivo: "   " })).rejects.toThrow(/motivo/i);
    expect(anuladas).toEqual([]);
  });

});
