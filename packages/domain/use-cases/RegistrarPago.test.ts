import { describe, expect, test } from "vitest";
import {
  registrarPago,
  FechaPagoFuturaError,
  MesesInvalidosError,
  MontoDistintoDelPrecioError,
  MontoInvalidoError,
  PlanDistintoConVencimientoVigenteError,
  PlanInactivoError,
  PlanNoEncontradoError,
  type DatosRegistrarPago,
} from "./RegistrarPago";
import { crearEstadoMemoria, crearUnidadEnMemoria, type EstadoMemoria } from "./unidadEnMemoria";

// 13/11/2026 10:00 en Lima. Todos los vencimientos son el inicio del día de Lima (05:00Z).
const AHORA = new Date("2026-11-13T15:00:00Z");
const dia = (iso: string) => new Date(`${iso}T05:00:00.000Z`);

function preparar(parcial: Parameters<typeof crearEstadoMemoria>[0] = {}) {
  const estado = crearEstadoMemoria(parcial);
  const deps = { unidad: crearUnidadEnMemoria(estado) };
  let n = 0;
  const cobrar = (extra: Partial<DatosRegistrarPago> = {}) =>
    registrarPago(deps, {
      organizacionId: "org",
      miembroId: "m1",
      planId: "mensual",
      linea: { monto: 100, metodo: "Efectivo", metodoPagoId: "mp1", numeroOperacion: null },
      sucursalId: "s1",
      registradoPorId: "u1",
      cobroId: `cobro-${++n}`,
      ahora: AHORA,
      ...extra,
    });
  return { estado, cobrar };
}

function conMiembro(cambios: Partial<EstadoMemoria["miembro"]>): Parameters<typeof crearEstadoMemoria>[0] {
  return { miembro: { id: "m1", planId: "mensual", precioPlan: 100, fechaVencimiento: null, fechaUltimoPago: null, ...cambios } };
}

describe("registrarPago — vencimiento", () => {
  test("socio sin vencimiento: cuenta desde el día del pago y crea la suscripción", async () => {
    const { estado, cobrar } = preparar();
    const pago = await cobrar();
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-13"));
    expect(estado.miembro.fechaUltimoPago).toEqual(dia("2026-11-13"));
    expect(estado.suscripcion).toEqual({ planId: "mensual", inicio: dia("2026-11-13"), fin: dia("2026-12-13") });
    expect(pago.vencimientoAnterior).toEqual(dia("2026-11-12"));
    expect(Miembro_y_suscripcion_iguales(estado)).toBe(true);
  });

  test("vencimiento vigente: el tiempo se suma al vencimiento actual, no al día del pago", async () => {
    const { estado, cobrar } = preparar({
      ...conMiembro({ fechaVencimiento: dia("2026-11-20") }),
      suscripcion: { planId: "mensual", inicio: dia("2026-10-21"), fin: dia("2026-11-20") },
    });
    const pago = await cobrar();
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-20"));
    expect(estado.suscripcion?.inicio).toEqual(dia("2026-10-21"));
    expect(pago.vencimientoAnterior).toEqual(dia("2026-11-20"));
    expect(Miembro_y_suscripcion_iguales(estado)).toBe(true);
  });

  test("vence hoy: todavía está vigente (último día inclusive), se suma al vencimiento", async () => {
    const { estado, cobrar } = preparar(conMiembro({ fechaVencimiento: dia("2026-11-13") }));
    await cobrar();
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-13"));
  });

  test("venció ayer: cuenta desde el día del pago", async () => {
    const { estado, cobrar } = preparar(conMiembro({ fechaVencimiento: dia("2026-11-12") }));
    await cobrar();
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-13"));
  });

  test("varios meses: precio y duración se multiplican", async () => {
    const { estado, cobrar } = preparar();
    await cobrar({ meses: 3, linea: { monto: 300, metodo: "Yape", metodoPagoId: "mp2", numeroOperacion: "123" } });
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2027-02-11"));
  });

  test("fecha de pago pasada, de cualquier antigüedad: el ciclo cuenta desde ese día", async () => {
    const { estado, cobrar } = preparar();
    await cobrar({ fechaPago: new Date("2026-11-01T17:00:00Z") });
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-01"));
    expect(estado.miembro.fechaUltimoPago).toEqual(dia("2026-11-01"));

    const antiguo = preparar();
    await antiguo.cobrar({ fechaPago: new Date("2025-01-10T17:00:00Z") });
    expect(antiguo.estado.miembro.fechaVencimiento).toEqual(dia("2025-02-09"));
  });

  test("la fecha de pago de hoy (aunque sea mediodía de Lima) es válida; mañana no", async () => {
    const hoy = preparar();
    await expect(hoy.cobrar({ fechaPago: new Date("2026-11-13T17:00:00Z") })).resolves.toBeTruthy();

    const manana = preparar();
    await expect(manana.cobrar({ fechaPago: new Date("2026-11-14T17:00:00Z") })).rejects.toBeInstanceOf(FechaPagoFuturaError);
    expect(manana.estado.pagos).toEqual([]);
  });
});

describe("registrarPago — monto exacto", () => {
  test("el monto debe ser exactamente el precio por los meses; si no, no se guarda nada", async () => {
    const { estado, cobrar } = preparar();
    await expect(cobrar({ linea: { monto: 99.99, metodo: "Efectivo", metodoPagoId: "mp1", numeroOperacion: null } })).rejects.toBeInstanceOf(
      MontoDistintoDelPrecioError
    );
    await expect(cobrar({ linea: { monto: 150, metodo: "Efectivo", metodoPagoId: "mp1", numeroOperacion: null } })).rejects.toBeInstanceOf(
      MontoDistintoDelPrecioError
    );
    await expect(cobrar({ meses: 2 })).rejects.toBeInstanceOf(MontoDistintoDelPrecioError);
    expect(estado.pagos).toEqual([]);
    expect(estado.miembro.fechaVencimiento).toBeNull();
    expect(estado.suscripcion).toBeNull();
  });

  test("rige el precio acordado del socio, no el de lista, mientras sea su mismo plan", async () => {
    const { estado, cobrar } = preparar(conMiembro({ precioPlan: 80 }));
    await expect(cobrar()).rejects.toBeInstanceOf(MontoDistintoDelPrecioError);
    await cobrar({ linea: { monto: 80, metodo: "Efectivo", metodoPagoId: "mp1", numeroOperacion: null } });
    expect(estado.pagos).toHaveLength(1);
  });

  test("los centavos no se pierden por punto flotante (33.33 × 3)", async () => {
    const { cobrar } = preparar({
      ...conMiembro({ precioPlan: 33.33 }),
      planes: [{ id: "mensual", activo: true, precioUSD: 33.33, diasCiclo: 30 }],
    });
    await expect(cobrar({ meses: 3, linea: { monto: 99.99, metodo: "Efectivo", metodoPagoId: "mp1", numeroOperacion: null } })).resolves.toBeTruthy();
  });

  test("sin cortesías: monto 0 o sin método se rechaza", async () => {
    const { cobrar } = preparar();
    await expect(cobrar({ linea: { monto: 0, metodo: "Efectivo", metodoPagoId: null, numeroOperacion: null } })).rejects.toBeInstanceOf(MontoInvalidoError);
    await expect(cobrar({ linea: { monto: 100, metodo: "", metodoPagoId: null, numeroOperacion: null } })).rejects.toBeInstanceOf(MontoInvalidoError);
  });

  test("los meses deben ser un entero de 1 a 6", async () => {
    const { cobrar } = preparar();
    for (const meses of [0, 7, 1.5, -1]) {
      await expect(cobrar({ meses })).rejects.toBeInstanceOf(MesesInvalidosError);
    }
  });
});

describe("registrarPago — plan", () => {
  const otroPlan = { id: "premium", activo: true, precioUSD: 150, diasCiclo: 30 };
  const premium = (monto = 150) => ({ planId: "premium", linea: { monto, metodo: "Efectivo", metodoPagoId: "mp1", numeroOperacion: null } });

  test("otro plan con vencimiento vigente es un cambio de plan, no un cobro", async () => {
    const { estado, cobrar } = preparar({
      ...conMiembro({ fechaVencimiento: dia("2026-11-20") }),
      planes: [{ id: "mensual", activo: true, precioUSD: 100, diasCiclo: 30 }, otroPlan],
    });
    await expect(cobrar(premium())).rejects.toBeInstanceOf(PlanDistintoConVencimientoVigenteError);
    expect(estado.pagos).toEqual([]);
  });

  test("otro plan sin vencimiento vigente: cobra el precio de lista y el socio pasa a ese plan", async () => {
    const { estado, cobrar } = preparar({
      ...conMiembro({ fechaVencimiento: dia("2026-11-01") }),
      planes: [{ id: "mensual", activo: true, precioUSD: 100, diasCiclo: 30 }, otroPlan],
    });
    await expect(cobrar(premium(100))).rejects.toBeInstanceOf(MontoDistintoDelPrecioError);
    await cobrar(premium());
    expect(estado.miembro.planId).toBe("premium");
    expect(estado.miembro.precioPlan).toBe(150);
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-13"));
  });

  test("plan inexistente o inactivo se rechaza", async () => {
    const inexistente = preparar();
    await expect(inexistente.cobrar({ planId: "nada" })).rejects.toBeInstanceOf(PlanNoEncontradoError);

    const inactivo = preparar({ planes: [{ id: "mensual", activo: false, precioUSD: 100, diasCiclo: 30 }] });
    await expect(inactivo.cobrar()).rejects.toBeInstanceOf(PlanInactivoError);
  });
});

describe("registrarPago — idempotencia", () => {
  test("reenviar el mismo cobroId no duplica el pago ni suma el tiempo dos veces", async () => {
    const { estado, cobrar } = preparar();
    const primero = await cobrar({ cobroId: "uuid-fijo" });
    const segundo = await cobrar({ cobroId: "uuid-fijo" });
    expect(segundo.id).toBe(primero.id);
    expect(estado.pagos).toHaveLength(1);
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2026-12-13"));
  });

  test("cobros distintos sí se suman (renovación sobre una renovación)", async () => {
    const { estado, cobrar } = preparar();
    await cobrar();
    await cobrar();
    expect(estado.pagos).toHaveLength(2);
    expect(estado.miembro.fechaVencimiento).toEqual(dia("2027-01-12"));
  });
});

function Miembro_y_suscripcion_iguales(estado: EstadoMemoria): boolean {
  return estado.suscripcion !== null && estado.suscripcion.fin.getTime() === estado.miembro.fechaVencimiento?.getTime();
}
