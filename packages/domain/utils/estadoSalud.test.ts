import { describe, it, expect } from "vitest";
import { evaluarSalud, leerEstadoRespaldo, type EntradaSalud } from "./estadoSalud";

const AHORA = new Date("2026-11-13T15:00:00.000Z");
const haceMin = (m: number) => new Date(AHORA.getTime() - m * 60_000);
const haceHoras = (h: number) => haceMin(h * 60);
const haceDias = (d: number) => haceHoras(d * 24);

function entrada(parcial: Partial<EntradaSalud> = {}): EntradaSalud {
  return {
    dbOk: true,
    respaldosConfigurados: true,
    ultimoRespaldo: haceHoras(5),
    ultimaRestauracion: haceDias(10),
    procesoIniciado: haceDias(3),
    ahora: AHORA,
    version: "1.0.0",
    ...parcial,
  };
}

describe("evaluarSalud", () => {
  it("todo en orden: 200 ok con los cinco campos", () => {
    const r = evaluarSalud(entrada());
    expect(r.codigoHttp).toBe(200);
    expect(r.cuerpo).toEqual({ estado: "ok", db: true, ultimoRespaldoHoras: 5, ultimaRestauracionDias: 10, version: "1.0.0" });
  });

  it("base caída: 503 caido", () => {
    const r = evaluarSalud(entrada({ dbOk: false }));
    expect(r.codigoHttp).toBe(503);
    expect(r.cuerpo.estado).toBe("caido");
    expect(r.cuerpo.db).toBe(false);
  });

  it("respaldo de más de 1 560 minutos: 503; de exactamente 1 560: 200", () => {
    expect(evaluarSalud(entrada({ ultimoRespaldo: haceMin(1_561) })).codigoHttp).toBe(503);
    expect(evaluarSalud(entrada({ ultimoRespaldo: haceMin(1_560) })).codigoHttp).toBe(200);
  });

  it("sin ningún respaldo: 503 solo si el proceso lleva más de 26 horas", () => {
    expect(evaluarSalud(entrada({ ultimoRespaldo: null, procesoIniciado: haceHoras(27) })).codigoHttp).toBe(503);
    const gracia = evaluarSalud(entrada({ ultimoRespaldo: null, procesoIniciado: haceHoras(2) }));
    expect(gracia.codigoHttp).toBe(200);
    expect(gracia.cuerpo.ultimoRespaldoHoras).toBeNull();
  });

  it("restauración de prueba ausente o de más de 35 días: 200 degradado", () => {
    expect(evaluarSalud(entrada({ ultimaRestauracion: null })).cuerpo.estado).toBe("degradado");
    expect(evaluarSalud(entrada({ ultimaRestauracion: haceDias(36) })).cuerpo.estado).toBe("degradado");
    expect(evaluarSalud(entrada({ ultimaRestauracion: haceDias(35) })).cuerpo.estado).toBe("ok");
    expect(evaluarSalud(entrada({ ultimaRestauracion: null })).codigoHttp).toBe(200);
  });

  it("sin respaldos configurados no se evalúan: nunca cae por falta de respaldo", () => {
    const r = evaluarSalud(entrada({ respaldosConfigurados: false, ultimoRespaldo: null, ultimaRestauracion: null, procesoIniciado: haceDias(30) }));
    expect(r.codigoHttp).toBe(200);
    expect(r.cuerpo.estado).toBe("ok");
  });

  it("horas y días se redondean hacia abajo", () => {
    const r = evaluarSalud(entrada({ ultimoRespaldo: haceMin(179), ultimaRestauracion: haceHoras(47) }));
    expect(r.cuerpo.ultimoRespaldoHoras).toBe(2);
    expect(r.cuerpo.ultimaRestauracionDias).toBe(1);
  });
});

describe("leerEstadoRespaldo", () => {
  it("lee las dos fechas", () => {
    const r = leerEstadoRespaldo(JSON.stringify({ ultimoRespaldo: "2026-11-13T08:00:00.000Z", ultimaRestauracion: "2026-11-01T08:00:00.000Z" }));
    expect(r.ultimoRespaldo?.toISOString()).toBe("2026-11-13T08:00:00.000Z");
    expect(r.ultimaRestauracion?.toISOString()).toBe("2026-11-01T08:00:00.000Z");
  });

  it("ausente, corrupto o con valores inválidos: null sin lanzar", () => {
    for (const malo of [null, "", "{no es json", "[]", "null", JSON.stringify({ ultimoRespaldo: "ayer", ultimaRestauracion: 5 })]) {
      expect(leerEstadoRespaldo(malo)).toEqual({ ultimoRespaldo: null, ultimaRestauracion: null });
    }
  });
});
