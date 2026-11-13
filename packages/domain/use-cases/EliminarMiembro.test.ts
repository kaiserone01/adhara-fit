import { describe, expect, test } from "vitest";
import { eliminarMiembro, MiembroNoEncontradoError } from "./EliminarMiembro";
import { registrarPago } from "./RegistrarPago";
import { cambiarPlan } from "./CambiarPlan";
import { anularPago } from "./AnularPago";
import { listarMiembros } from "./ListarMiembros";
import { crearMiembro } from "./CrearMiembro";
import { registrarCheckIn, MiembroNoEncontradoError as CheckInNoEncontradoError } from "./RegistrarCheckIn";
import { actualizarMiembro } from "./ActualizarMiembro";
import { DocumentoDuplicadoError, MiembroEliminadoError } from "../entities/ErroresMiembro";
import { crearEstadoMemoria, crearUnidadEnMemoria, type EstadoMemoria } from "./unidadEnMemoria";
import type { Miembro } from "../entities/Miembro";
import type { Pago } from "../entities/Pago";

const AHORA = new Date("2026-11-13T15:00:00Z");
const dia = (iso: string) => new Date(`${iso}T05:00:00.000Z`);
const BASE = { organizacionId: "org", id: "m1", sucursalActivaId: "s1", usuarioId: "u1" };

function preparar(parcial: Partial<EstadoMemoria> = {}) {
  const estado = crearEstadoMemoria({
    miembro: { id: "m1", planId: "mensual", precioPlan: 100, fechaVencimiento: dia("2026-11-20"), fechaUltimoPago: dia("2026-10-21"), estado: "ACTIVO" },
    suscripcion: { planId: "mensual", inicio: dia("2026-10-21"), fin: dia("2026-11-20") },
    ...parcial,
  });
  return { estado, deps: { unidad: crearUnidadEnMemoria(estado) } };
}

describe("eliminarMiembro: borrado definitivo en un paso", () => {
  const pagoDe = (id: string) => ({ id, miembroId: "m1", monto: 100 }) as unknown as Pago;

  test("sin pagos: borra al socio y su plan, y los pagos quedan sin socio (se verán como «Socio eliminado»)", async () => {
    const { estado, deps } = preparar({ pagos: [pagoDe("p1"), pagoDe("p2")] });
    await eliminarMiembro(deps, { ...BASE, conPagos: false });

    expect(estado.miembroEliminado).toBe(true);
    expect(estado.suscripcion).toBeNull();
    expect(estado.pagos.map((p) => p.miembroId)).toEqual([null, null]);
  });

  test("con pagos: borra también todos sus pagos", async () => {
    const { estado, deps } = preparar({ pagos: [pagoDe("p1"), pagoDe("p2")] });
    await eliminarMiembro(deps, { ...BASE, conPagos: true });

    expect(estado.miembroEliminado).toBe(true);
    expect(estado.pagos).toHaveLength(0);
  });

  test("deja un registro de auditoría sin datos personales que dice qué se borró", async () => {
    const a = preparar();
    await eliminarMiembro(a.deps, { ...BASE, conPagos: false });
    const b = preparar();
    await eliminarMiembro(b.deps, { ...BASE, conPagos: true });

    expect(a.estado.registrosAuditoria).toEqual([
      { entidad: "Miembro", entidadId: "m1", campo: "eliminado", valorAnterior: "ACTIVO", valorNuevo: "ELIMINADO_CONSERVANDO_PAGOS", motivo: "eliminación definitiva", usuarioId: "u1" },
    ]);
    expect(b.estado.registrosAuditoria[0].valorNuevo).toBe("ELIMINADO_CON_PAGOS");
  });

  test("un socio que no está en la sede activa no se elimina", async () => {
    const { estado, deps } = preparar();
    estado.miembro.sucursalId = "otra";
    await expect(eliminarMiembro(deps, { ...BASE, conPagos: true })).rejects.toThrow();
    expect(estado.miembroEliminado).toBeUndefined();
    expect(estado.registrosAuditoria).toHaveLength(0);
  });

  test("eliminar a un socio inexistente lanza MiembroNoEncontradoError", async () => {
    const unidad = crearUnidadEnMemoria(crearEstadoMemoria());
    const sinMiembro = {
      ejecutar: (op: Parameters<typeof unidad.ejecutar>[0]) =>
        unidad.ejecutar((repos) => op({ ...repos, miembros: { ...repos.miembros, buscarPorId: async () => null } })),
    } as typeof unidad;
    await expect(eliminarMiembro({ unidad: sinMiembro }, { ...BASE, conPagos: false })).rejects.toBeInstanceOf(MiembroNoEncontradoError);
  });
});

// Socios en estado BAJA heredados de la baja lógica anterior (S-09): ya no se crean, pero el código los sigue tratando como inexistentes.
describe("un socio en BAJA heredado en el resto del sistema", () => {
  const cobro = {
    organizacionId: "org",
    miembroId: "m1",
    planId: "mensual",
    linea: { monto: 100, metodo: "Efectivo", metodoPagoId: "mp1", numeroOperacion: null },
    sucursalId: "s1",
    registradoPorId: "u1",
    ahora: AHORA,
  };

  test("no recibe cobros nuevos, pero repetir un cobro ya registrado devuelve el original", async () => {
    const { estado, deps } = preparar();
    const original = await registrarPago(deps, { ...cobro, cobroId: "C1" });
    estado.miembro.estado = "BAJA";

    await expect(registrarPago(deps, { ...cobro, cobroId: "C2" })).rejects.toBeInstanceOf(MiembroEliminadoError);
    expect(estado.pagos).toHaveLength(1);
    expect((await registrarPago(deps, { ...cobro, cobroId: "C1" })).id).toBe(original.id);
    expect(estado.pagos).toHaveLength(1);
  });

  test("no cambia de plan", async () => {
    const { estado, deps } = preparar({
      planes: [
        { id: "mensual", activo: true, precioUSD: 100, diasCiclo: 30 },
        { id: "trimestral", activo: true, precioUSD: 250, diasCiclo: 90 },
      ],
    });
    estado.miembro.estado = "BAJA";
    await expect(
      cambiarPlan(deps, {
        organizacionId: "org",
        miembroId: "m1",
        planNuevoId: "trimestral",
        montoEsperado: 0,
        vencimientoEsperado: dia("2026-11-20"),
        linea: null,
        sucursalId: "s1",
        registradoPorId: "u1",
        cobroId: null,
        ahora: AHORA,
      })
    ).rejects.toBeInstanceOf(MiembroEliminadoError);
    expect(estado.pagos).toHaveLength(0);
    expect(estado.miembro.planId).toBe("mensual");
  });

  test("sus pagos se pueden anular (corrección contable)", async () => {
    const { estado, deps } = preparar();
    const pago = await registrarPago(deps, { ...cobro, cobroId: "C1" });
    estado.miembro.estado = "BAJA";
    const anulado = await anularPago(deps, { organizacionId: "org", pagoId: pago.id, anuladoPorId: "u1", motivo: "error" });
    expect(anulado.anuladoEn).not.toBeNull();
    expect(estado.pagos).toHaveLength(1);
  });

  test("no se edita su ficha", async () => {
    const deps = {
      miembros: { buscarPorId: async () => ({ id: "m1", estado: "BAJA", sucursalId: null }) },
    } as unknown as Parameters<typeof actualizarMiembro>[0];
    await expect(
      actualizarMiembro(deps, { organizacionId: "org", id: "m1", sucursalActivaId: "s1", cambios: { nombre: "Otro" } })
    ).rejects.toBeInstanceOf(MiembroEliminadoError);
  });

  test("no registra asistencia: para el kiosco no existe", async () => {
    const eliminado = { id: "m1", estado: "BAJA", nombre: "Ana", sucursalId: null, fechaVencimiento: null, fechaNacimiento: null };
    const deps = {
      miembros: { buscarPorDocumento: async () => eliminado, buscarPorCodigoSocio: async () => eliminado },
      checkIns: { buscarRecientePorMiembroYSucursal: async () => null, crear: async () => { throw new Error("no debe registrar"); } },
      sucursales: { buscarPorId: async () => null },
    } as unknown as Parameters<typeof registrarCheckIn>[0];
    const entrada = { organizacionId: "org", sucursalId: "s1" };
    await expect(registrarCheckIn(deps, { ...entrada, identificador: "12345678" })).rejects.toBeInstanceOf(CheckInNoEncontradoError);
    await expect(registrarCheckIn(deps, { ...entrada, identificador: "0007" })).rejects.toBeInstanceOf(CheckInNoEncontradoError);
  });

  test("su documento sigue ocupado, con un mensaje que dice que existe un socio eliminado", async () => {
    const deps = { miembros: { buscarPorDocumento: async () => ({ id: "m1", estado: "BAJA" }) } } as unknown as Parameters<typeof crearMiembro>[0];
    const error = await crearMiembro(deps, {
      organizacionId: "org", sucursalId: null, nombre: "Ana", tipoDocumento: "DNI", numeroDocumento: "12345678",
      fechaInscripcion: null, fechaNacimiento: null, celular: null, correo: null, fotoUrl: null, entrenadorId: null, planId: null, precioPlan: 0,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(DocumentoDuplicadoError);
    expect(error.message).toMatch(/eliminado/);
  });

  test("listarMiembros devuelve solo los activos por defecto y solo los eliminados con BAJA", async () => {
    const m = (id: string, estado: Miembro["estado"]) => ({ id, estado, sucursalId: null }) as unknown as Miembro;
    const deps = { miembros: { listarPorOrganizacion: async () => [m("a", "ACTIVO"), m("b", "BAJA")] } } as unknown as Parameters<typeof listarMiembros>[0];
    expect((await listarMiembros(deps, "org", "s1")).map((x) => x.id)).toEqual(["a"]);
    expect((await listarMiembros(deps, "org", "s1", "BAJA")).map((x) => x.id)).toEqual(["b"]);
  });
});
