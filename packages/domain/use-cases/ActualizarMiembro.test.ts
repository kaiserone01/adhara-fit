import { describe, expect, test } from "vitest";
import { actualizarMiembro, CedulaDuplicadaError, FechasIncoherentesError } from "./ActualizarMiembro";
import type { CambiosMiembro } from "../entities/Miembro";

type OpcionesMiembro = {
  planId?: string | null;
  fechaUltimoPago?: Date | null;
  fechaVencimiento?: Date | null;
};

function crearDeps(cedulaOcupadaPor: string | null = null, miembro: OpcionesMiembro = {}, tieneSuscripcion = true) {
  const cambiosGuardados: CambiosMiembro[] = [];
  const ciclos: { inicio: Date; fin: Date }[] = [];
  const extensiones: Date[] = [];
  const cambiosDePlan: string[] = [];
  const creadas: { miembroId: string; planId: string; inicio: Date; fin: Date; fechaLimiteAbono: Date | null }[] = [];
  const planesDelCiclo: (string | undefined)[] = [];
  const ciclosDePagosMovidos: { anterior: Date; nuevo: Date }[] = [];
  const deps = {
    miembros: {
      buscarPorId: async () => ({
        id: "m1", sucursalId: null, planId: "p1", cedula: "111",
        fechaUltimoPago: null, fechaVencimiento: null, ...miembro,
      }),
      buscarPorOrganizacionYCedula: async () => (cedulaOcupadaPor ? { id: cedulaOcupadaPor } : null),
      actualizar: async (_org: string, _id: string, cambios: CambiosMiembro) => {
        cambiosGuardados.push(cambios);
        return { id: "m1" };
      },
    },
    planes: { buscarPorId: async () => ({ diasCiclo: 30 }) },
    suscripciones: {
      ajustarCicloMasReciente: async (_id: string, inicio: Date, fin: Date, planId?: string) => {
        ciclos.push({ inicio, fin });
        planesDelCiclo.push(planId);
        return tieneSuscripcion;
      },
      crear: async (datos: (typeof creadas)[number]) => {
        creadas.push(datos);
        return datos;
      },
      buscarActivaVigentePorMiembroYPlan: async () => ({ id: "s1", inicio: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }),
      extenderFin: async (_id: string, fin: Date) => {
        extensiones.push(fin);
      },
      cambiarPlan: async (_id: string, planId: string) => {
        cambiosDePlan.push(planId);
      },
    },
    pagos: {
      moverFinCiclo: async (_miembroId: string, anterior: Date, nuevo: Date) => {
        ciclosDePagosMovidos.push({ anterior, nuevo });
      },
    },
    sucursales: {},
  } as unknown as Parameters<typeof actualizarMiembro>[0];
  return { deps, cambiosGuardados, ciclos, extensiones, cambiosDePlan, creadas, planesDelCiclo, ciclosDePagosMovidos };
}

const base = { organizacionId: "org", id: "m1", sucursalActivaId: "s1" };
const DIA = 24 * 60 * 60 * 1000;

describe("actualizarMiembro — ajuste manual de fechas", () => {
  const pago = new Date("2026-10-01T00:00:00.000Z");
  const venc = new Date("2026-11-15T00:00:00.000Z");

  test("guarda la fecha y sincroniza la suscripción (fin y inicio = fin - días del plan)", async () => {
    const { deps, cambiosGuardados, ciclos } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(cambiosGuardados[0]).toEqual({ fechaVencimiento: venc });
    expect(ciclos).toEqual([{ inicio: new Date(venc.getTime() - 30 * DIA), fin: venc }]);
  });

  test("ajusta el pago y el vencimiento y sincroniza el ciclo", async () => {
    const { deps, cambiosGuardados, ciclos } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago, fechaVencimiento: venc } });
    expect(cambiosGuardados[0]).toEqual({ fechaUltimoPago: pago, fechaVencimiento: venc });
    expect(ciclos).toEqual([{ inicio: pago, fin: venc }]);
  });

  test("al cambiar el vencimiento, el fin del ciclo de sus pagos se mueve con él (si no, el saldo y los abonos se desfasan)", async () => {
    const anterior = new Date("2026-10-28T04:00:00.000Z");
    const { deps, ciclosDePagosMovidos } = crearDeps(null, { fechaVencimiento: anterior });
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(ciclosDePagosMovidos).toEqual([{ anterior, nuevo: venc }]);
  });

  test("si el vencimiento no cambia, o no tenía uno, no se tocan los pagos", async () => {
    const igual = crearDeps(null, { fechaVencimiento: venc });
    await actualizarMiembro(igual.deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(igual.ciclosDePagosMovidos).toEqual([]);

    const sinVencimiento = crearDeps();
    await actualizarMiembro(sinVencimiento.deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(sinVencimiento.ciclosDePagosMovidos).toEqual([]);

    const soloPago = crearDeps(null, { fechaVencimiento: venc });
    await actualizarMiembro(soloPago.deps, { ...base, cambios: { fechaUltimoPago: pago } });
    expect(soloPago.ciclosDePagosMovidos).toEqual([]);
  });

  test("la fecha de pago posterior al vencimiento es incoherente", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await expect(
      actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: venc, fechaVencimiento: pago } })
    ).rejects.toBeInstanceOf(FechasIncoherentesError);
    expect(cambiosGuardados).toEqual([]);
  });

  test("valida contra la fecha actual del miembro cuando solo cambia una", async () => {
    const { deps } = crearDeps(null, { fechaVencimiento: pago });
    await expect(actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: venc } })).rejects.toBeInstanceOf(FechasIncoherentesError);
  });

  test("guardar solo la fecha de pago", async () => {
    const { deps, cambiosGuardados } = crearDeps(null, { fechaVencimiento: venc });
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago } });
    expect(cambiosGuardados[0]).toEqual({ fechaUltimoPago: pago });
  });

  test("ciclo [pago, vencimiento] cuando cambian ambas fechas", async () => {
    const { deps, ciclos } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago, fechaVencimiento: venc } });
    expect(ciclos).toEqual([{ inicio: pago, fin: venc }]);
  });

  test("solo cambia el pago: el fin es el vencimiento actual del miembro", async () => {
    const { deps, ciclos } = crearDeps(null, { fechaVencimiento: venc });
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago } });
    expect(ciclos).toEqual([{ inicio: pago, fin: venc }]);
  });

  test("solo cambia el vencimiento: el inicio es la fecha de pago actual si existe", async () => {
    const { deps, ciclos } = crearDeps(null, { fechaUltimoPago: pago });
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(ciclos).toEqual([{ inicio: pago, fin: venc }]);
  });

  test("sin fecha de pago el inicio es fin - días del plan", async () => {
    const { deps, ciclos } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(ciclos).toEqual([{ inicio: new Date(venc.getTime() - 30 * DIA), fin: venc }]);
  });

  test("solo cambia el pago y no hay vencimiento: guarda pero no sincroniza la suscripción", async () => {
    const { deps, cambiosGuardados, ciclos } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago } });
    expect(cambiosGuardados[0]).toEqual({ fechaUltimoPago: pago });
    expect(ciclos).toEqual([]);
  });

  test("fechaUltimoPago null se guarda (vaciar la fecha de pago)", async () => {
    const { deps, cambiosGuardados, ciclos } = crearDeps(null, { fechaUltimoPago: pago, fechaVencimiento: venc });
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: null } });
    expect(cambiosGuardados[0]).toEqual({ fechaUltimoPago: null });
    expect(ciclos).toEqual([{ inicio: new Date(venc.getTime() - 30 * DIA), fin: venc }]);
  });

  test("sin cambio de fecha no toca la suscripción", async () => {
    const { deps, cambiosGuardados, ciclos } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { nombre: "Otro" } });
    expect(cambiosGuardados[0]).toEqual({ nombre: "Otro" });
    expect(ciclos).toEqual([]);
  });
});

describe("actualizarMiembro — suscripción al ajustar fechas", () => {
  const pago = new Date("2026-10-01T00:00:00.000Z");
  const venc = new Date("2026-11-15T00:00:00.000Z");

  test("sin suscripción y con plan: la crea con el ciclo [pago, vencimiento]", async () => {
    const { deps, creadas } = crearDeps(null, {}, false);
    await actualizarMiembro(deps, { ...base, cambios: { fechaUltimoPago: pago, fechaVencimiento: venc } });
    expect(creadas).toEqual([{ miembroId: "m1", planId: "p1", inicio: pago, fin: venc, fechaLimiteAbono: null }]);
  });

  test("sin suscripción y con plan nuevo en el mismo guardado: la crea con el plan nuevo", async () => {
    const { deps, creadas } = crearDeps(null, { planId: null }, false);
    await actualizarMiembro(deps, { ...base, cambios: { planId: "p2", fechaVencimiento: venc } });
    expect(creadas.map((c) => c.planId)).toEqual(["p2"]);
  });

  test("sin suscripción y sin plan: no crea nada", async () => {
    const { deps, creadas } = crearDeps(null, { planId: null }, false);
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(creadas).toEqual([]);
  });

  test("con suscripción: no crea otra", async () => {
    const { deps, creadas } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(creadas).toEqual([]);
  });

  test("plan y fechas a la vez: el ciclo recibe el plan nuevo; sin cambio de plan, ninguno", async () => {
    const conPlan = crearDeps();
    await actualizarMiembro(conPlan.deps, { ...base, cambios: { planId: "p2", fechaVencimiento: venc } });
    expect(conPlan.planesDelCiclo).toEqual(["p2"]);
    const sinPlan = crearDeps();
    await actualizarMiembro(sinPlan.deps, { ...base, cambios: { fechaVencimiento: venc } });
    expect(sinPlan.planesDelCiclo).toEqual([undefined]);
  });
});

describe("actualizarMiembro — cambio de plan", () => {
  test("miembro normal: prorratea el vencimiento y cambia el plan de la suscripción", async () => {
    const { deps, extensiones, cambiosDePlan } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { planId: "p2" } });
    expect(extensiones).toHaveLength(1);
    expect(cambiosDePlan).toEqual(["p2"]);
  });

});

describe("actualizarMiembro — cédula", () => {
  test("permite cambiar la cédula si nadie más la tiene", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { cedula: "222" } });
    expect(cambiosGuardados[0]).toEqual({ cedula: "222" });
  });

  test("rechaza una cédula que ya tiene otro miembro", async () => {
    const { deps, cambiosGuardados } = crearDeps("otro");
    await expect(actualizarMiembro(deps, { ...base, cambios: { cedula: "222" } })).rejects.toBeInstanceOf(CedulaDuplicadaError);
    expect(cambiosGuardados).toEqual([]);
  });

  test("guardar con la misma cédula no consulta duplicados", async () => {
    const { deps, cambiosGuardados } = crearDeps("otro");
    await actualizarMiembro(deps, { ...base, cambios: { cedula: "111" } });
    expect(cambiosGuardados).toHaveLength(1);
  });
});

describe("actualizarMiembro — fecha de nacimiento", () => {
  test("pasa fechaNacimiento null al repositorio (vaciar un valor no se ignora)", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    await actualizarMiembro(deps, { ...base, cambios: { fechaNacimiento: null } });
    expect(cambiosGuardados[0]).toEqual({ fechaNacimiento: null });
  });

  test("pasa una fecha de nacimiento definida", async () => {
    const { deps, cambiosGuardados } = crearDeps();
    const nacimiento = new Date(1990, 9, 8);
    await actualizarMiembro(deps, { ...base, cambios: { fechaNacimiento: nacimiento } });
    expect(cambiosGuardados[0]).toEqual({ fechaNacimiento: nacimiento });
  });
});
