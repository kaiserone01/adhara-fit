import { describe, expect, test } from "vitest";
import {
  eliminarMiembro,
  restaurarMiembro,
  MiembroNoEncontradoError,
  MiembroYaEliminadoError,
  MiembroNoEliminadoError,
  MotivoBajaInvalidoError,
} from "./EliminarMiembro";
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

const AHORA = new Date("2026-11-13T15:00:00Z");
const dia = (iso: string) => new Date(`${iso}T05:00:00.000Z`);
const BASE = { organizacionId: "org", id: "m1", sucursalActivaId: "s1", usuarioId: "u1", ahora: AHORA };

function preparar(parcial: Partial<EstadoMemoria> = {}) {
  const estado = crearEstadoMemoria({
    miembro: { id: "m1", planId: "mensual", precioPlan: 100, fechaVencimiento: dia("2026-11-20"), fechaUltimoPago: dia("2026-10-21"), estado: "ACTIVO" },
    suscripcion: { planId: "mensual", inicio: dia("2026-10-21"), fin: dia("2026-11-20") },
    ...parcial,
  });
  return { estado, deps: { unidad: crearUnidadEnMemoria(estado) } };
}

describe("eliminarMiembro / restaurarMiembro (S-09)", () => {
  test("eliminar deja el socio en BAJA con instante, usuario y motivo, y audita en la misma operación", async () => {
    const { estado, deps } = preparar();
    await eliminarMiembro(deps, { ...BASE, motivo: "  se mudó  " });

    expect(estado.miembro).toMatchObject({ estado: "BAJA", bajaEn: AHORA, bajaPorId: "u1", bajaMotivo: "se mudó" });
    expect(estado.registrosAuditoria).toEqual([
      { entidad: "Miembro", entidadId: "m1", campo: "estado", valorAnterior: "ACTIVO", valorNuevo: "BAJA", motivo: "se mudó", usuarioId: "u1" },
    ]);
  });

  test("eliminar no toca el plan, el precio, el vencimiento ni la suscripción", async () => {
    const { estado, deps } = preparar();
    await eliminarMiembro(deps, BASE);

    expect(estado.miembro).toMatchObject({ planId: "mensual", precioPlan: 100, fechaVencimiento: dia("2026-11-20"), fechaUltimoPago: dia("2026-10-21") });
    expect(estado.suscripcion).toEqual({ planId: "mensual", inicio: dia("2026-10-21"), fin: dia("2026-11-20") });
  });

  test("el motivo es opcional (la auditoría guarda «sin motivo»), de hasta 200 caracteres", async () => {
    for (const motivo of [undefined, "   "]) {
      const { estado, deps } = preparar();
      await eliminarMiembro(deps, { ...BASE, motivo });
      expect(estado.miembro.bajaMotivo).toBeNull();
      expect(estado.registrosAuditoria[0].motivo).toBe("sin motivo");
    }
    const { estado, deps } = preparar();
    await eliminarMiembro(deps, { ...BASE, motivo: "x".repeat(200) });
    expect(estado.miembro.bajaMotivo).toHaveLength(200);
  });

  test("un motivo de 201 caracteres se rechaza sin escribir nada", async () => {
    const { estado, deps } = preparar();
    await expect(eliminarMiembro(deps, { ...BASE, motivo: "x".repeat(201) })).rejects.toBeInstanceOf(MotivoBajaInvalidoError);
    expect(estado.miembro.estado).toBe("ACTIVO");
    expect(estado.registrosAuditoria).toHaveLength(0);
  });

  test("eliminar a un socio ya eliminado se rechaza y no audita de nuevo", async () => {
    const { estado, deps } = preparar();
    await eliminarMiembro(deps, BASE);
    await expect(eliminarMiembro(deps, BASE)).rejects.toBeInstanceOf(MiembroYaEliminadoError);
    expect(estado.registrosAuditoria).toHaveLength(1);
  });

  test("restaurar vuelve a ACTIVO, vacía los datos de baja y conserva el vencimiento vencido", async () => {
    const { estado, deps } = preparar({
      miembro: { id: "m1", planId: "mensual", precioPlan: 100, fechaVencimiento: dia("2026-10-01"), fechaUltimoPago: null, estado: "BAJA", bajaEn: AHORA, bajaPorId: "u1", bajaMotivo: "x" },
    });
    await restaurarMiembro(deps, { ...BASE, motivo: "volvió" });

    expect(estado.miembro).toMatchObject({ estado: "ACTIVO", bajaEn: null, bajaPorId: null, bajaMotivo: null, fechaVencimiento: dia("2026-10-01") });
    expect(estado.registrosAuditoria[0]).toMatchObject({ valorAnterior: "BAJA", valorNuevo: "ACTIVO", motivo: "volvió" });
  });

  test("restaurar a un socio activo se rechaza", async () => {
    const { deps } = preparar();
    await expect(restaurarMiembro(deps, BASE)).rejects.toBeInstanceOf(MiembroNoEliminadoError);
  });

  test("un socio que no está en la sede activa no se elimina", async () => {
    const { estado, deps } = preparar();
    estado.miembro.sucursalId = "otra";
    await expect(eliminarMiembro(deps, BASE)).rejects.toThrow();
    expect(estado.miembro.estado).toBe("ACTIVO");
  });

  test("eliminar a un socio inexistente lanza MiembroNoEncontradoError", async () => {
    const unidad = crearUnidadEnMemoria(crearEstadoMemoria());
    const sinMiembro = {
      ejecutar: (op: Parameters<typeof unidad.ejecutar>[0]) =>
        unidad.ejecutar((repos) => op({ ...repos, miembros: { ...repos.miembros, buscarPorId: async () => null } })),
    } as typeof unidad;
    await expect(eliminarMiembro({ unidad: sinMiembro }, BASE)).rejects.toBeInstanceOf(MiembroNoEncontradoError);
  });
});

describe("un socio eliminado en el resto del sistema (S-09)", () => {
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
    await eliminarMiembro(deps, BASE);

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
    await eliminarMiembro(deps, BASE);
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
    await eliminarMiembro(deps, BASE);
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
