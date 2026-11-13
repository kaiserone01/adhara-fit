import { describe, it, expect } from "vitest";
import {
  publicarTextoLegal,
  registrarConsentimiento,
  revocarConsentimiento,
  TextoLegalInvalidoError,
  SinTextoDeConsentimientoError,
  MedioInvalidoError,
  MotivoRevocacionRequeridoError,
  ConsentimientoNoVigenteError,
  MiembroDelConsentimientoNoEncontradoError,
} from "./Consentimiento";
import { estadoConsentimiento, type ConsentimientoMiembro, type TextoLegal, type TipoTextoLegal } from "../entities/Consentimiento";
import type { IConsentimientoRepository, ITextoLegalRepository } from "../ports/IConsentimientoRepository";
import type { IMemberRepository } from "../ports/IMemberRepository";

function repos(estadoMiembro: "ACTIVO" | "BAJA" | null = "ACTIVO") {
  const textos: TextoLegal[] = [];
  const consentimientos: ConsentimientoMiembro[] = [];
  const repoTextos: ITextoLegalRepository = {
    async vigente(_o, tipo) {
      return [...textos].filter((t) => t.tipo === tipo).sort((a, b) => b.version - a.version)[0] ?? null;
    },
    async listar(_o, tipo) {
      return textos.filter((t) => t.tipo === tipo).sort((a, b) => b.version - a.version);
    },
    async versionSustancialMaxima(_o, tipo) {
      return Math.max(0, ...textos.filter((t) => t.tipo === tipo && t.cambioSustancial).map((t) => t.version));
    },
    async publicar(d) {
      const version = Math.max(0, ...textos.filter((t) => t.tipo === d.tipo).map((t) => t.version)) + 1;
      const t: TextoLegal = {
        id: `t${textos.length + 1}`,
        organizacionId: d.organizacionId,
        tipo: d.tipo as TipoTextoLegal,
        version,
        contenido: d.contenido,
        cambioSustancial: version === 1 ? true : d.cambioSustancial,
        publicadoEn: new Date(),
      };
      textos.push(t);
      return t;
    },
  };
  const repoConsent: IConsentimientoRepository = {
    async registrar(d) {
      const c: ConsentimientoMiembro = { id: `c${consentimientos.length + 1}`, miembroId: d.miembroId, version: d.version, medio: d.medio, aceptadoEn: new Date(), revocadoEn: null, revocadoMotivo: null };
      consentimientos.push(c);
      return c;
    },
    async ultimoDeMiembro(m) {
      return consentimientos.filter((c) => c.miembroId === m).at(-1) ?? null;
    },
    async ultimosPorMiembro() {
      return new Map(consentimientos.map((c) => [c.miembroId, c]));
    },
    async revocar(d) {
      const c = [...consentimientos].reverse().find((x) => x.miembroId === d.miembroId && !x.revocadoEn);
      if (!c) return false;
      c.revocadoEn = new Date();
      c.revocadoMotivo = d.motivo;
      return true;
    },
  };
  const miembros = {
    async buscarPorId() {
      return estadoMiembro ? ({ id: "m1", estado: estadoMiembro } as never) : null;
    },
  } as unknown as IMemberRepository;
  return { textos, consentimientos, repoTextos, repoConsent, miembros };
}

const TEXTO = "Autorizo el tratamiento de mis datos personales para la gestión de mi membresía.";

describe("Textos legales", () => {
  it("rechaza textos demasiado cortos o largos y recorta espacios", async () => {
    const r = repos();
    await expect(publicarTextoLegal({ textos: r.repoTextos }, { organizacionId: "o", tipo: "CONSENTIMIENTO", contenido: "  corto  ", cambioSustancial: true, publicadoPorId: "a" })).rejects.toBeInstanceOf(TextoLegalInvalidoError);
    await expect(publicarTextoLegal({ textos: r.repoTextos }, { organizacionId: "o", tipo: "CONSENTIMIENTO", contenido: "x".repeat(20_001), cambioSustancial: true, publicadoPorId: "a" })).rejects.toBeInstanceOf(TextoLegalInvalidoError);
    const t = await publicarTextoLegal({ textos: r.repoTextos }, { organizacionId: "o", tipo: "CONSENTIMIENTO", contenido: `  ${TEXTO}  `, cambioSustancial: false, publicadoPorId: "a" });
    expect(t.contenido).toBe(TEXTO);
    expect(t.version).toBe(1);
    expect(t.cambioSustancial).toBe(true); // la primera versión siempre es sustancial
  });

  it("numera versiones por tipo sin mezclar", async () => {
    const r = repos();
    const base = { organizacionId: "o", contenido: TEXTO, cambioSustancial: false, publicadoPorId: "a" };
    await publicarTextoLegal({ textos: r.repoTextos }, { ...base, tipo: "CONSENTIMIENTO" });
    const v2 = await publicarTextoLegal({ textos: r.repoTextos }, { ...base, tipo: "CONSENTIMIENTO" });
    const p1 = await publicarTextoLegal({ textos: r.repoTextos }, { ...base, tipo: "POLITICA_PRIVACIDAD" });
    expect(v2.version).toBe(2);
    expect(v2.cambioSustancial).toBe(false);
    expect(p1.version).toBe(1);
  });
});

describe("Consentimiento del socio", () => {
  it("no registra sin texto publicado ni con medio inválido", async () => {
    const r = repos();
    const deps = { textos: r.repoTextos, consentimientos: r.repoConsent, miembros: r.miembros };
    await expect(registrarConsentimiento(deps, { organizacionId: "o", miembroId: "m1", medio: "PAPEL", registradoPorId: "a" })).rejects.toBeInstanceOf(SinTextoDeConsentimientoError);
    await publicarTextoLegal({ textos: r.repoTextos }, { organizacionId: "o", tipo: "CONSENTIMIENTO", contenido: TEXTO, cambioSustancial: true, publicadoPorId: "a" });
    await expect(registrarConsentimiento(deps, { organizacionId: "o", miembroId: "m1", medio: "VOZ", registradoPorId: "a" })).rejects.toBeInstanceOf(MedioInvalidoError);
  });

  it("registra la versión vigente y no acepta socios eliminados o inexistentes", async () => {
    const r = repos();
    const deps = { textos: r.repoTextos, consentimientos: r.repoConsent, miembros: r.miembros };
    await publicarTextoLegal({ textos: r.repoTextos }, { organizacionId: "o", tipo: "CONSENTIMIENTO", contenido: TEXTO, cambioSustancial: true, publicadoPorId: "a" });
    const c = await registrarConsentimiento(deps, { organizacionId: "o", miembroId: "m1", medio: "PANTALLA", registradoPorId: "a" });
    expect(c.version).toBe(1);
    expect(c.medio).toBe("PANTALLA");

    for (const estado of ["BAJA", null] as const) {
      const x = repos(estado);
      await publicarTextoLegal({ textos: x.repoTextos }, { organizacionId: "o", tipo: "CONSENTIMIENTO", contenido: TEXTO, cambioSustancial: true, publicadoPorId: "a" });
      await expect(registrarConsentimiento({ textos: x.repoTextos, consentimientos: x.repoConsent, miembros: x.miembros }, { organizacionId: "o", miembroId: "m1", medio: "PAPEL", registradoPorId: "a" })).rejects.toBeInstanceOf(MiembroDelConsentimientoNoEncontradoError);
    }
  });

  it("revoca solo con motivo y solo si hay consentimiento vigente", async () => {
    const r = repos();
    const deps = { textos: r.repoTextos, consentimientos: r.repoConsent, miembros: r.miembros };
    await publicarTextoLegal({ textos: r.repoTextos }, { organizacionId: "o", tipo: "CONSENTIMIENTO", contenido: TEXTO, cambioSustancial: true, publicadoPorId: "a" });
    await expect(revocarConsentimiento(deps, { organizacionId: "o", miembroId: "m1", motivo: "  ", revocadoPorId: "a" })).rejects.toBeInstanceOf(MotivoRevocacionRequeridoError);
    await expect(revocarConsentimiento(deps, { organizacionId: "o", miembroId: "m1", motivo: "lo pidió", revocadoPorId: "a" })).rejects.toBeInstanceOf(ConsentimientoNoVigenteError);
    await registrarConsentimiento(deps, { organizacionId: "o", miembroId: "m1", medio: "PAPEL", registradoPorId: "a" });
    await revocarConsentimiento(deps, { organizacionId: "o", miembroId: "m1", motivo: "lo pidió", revocadoPorId: "a" });
    expect(r.consentimientos[0].revocadoEn).not.toBeNull();
    await expect(revocarConsentimiento(deps, { organizacionId: "o", miembroId: "m1", motivo: "otra vez", revocadoPorId: "a" })).rejects.toBeInstanceOf(ConsentimientoNoVigenteError);
  });
});

describe("estadoConsentimiento", () => {
  it("clasifica sin consentimiento, vigente, desactualizado y revocado", () => {
    expect(estadoConsentimiento(null, 1)).toBe("SIN_CONSENTIMIENTO");
    expect(estadoConsentimiento({ version: 1, revocadoEn: null }, 1)).toBe("VIGENTE");
    expect(estadoConsentimiento({ version: 1, revocadoEn: null }, 3)).toBe("DESACTUALIZADO");
    expect(estadoConsentimiento({ version: 3, revocadoEn: null }, 3)).toBe("VIGENTE");
    expect(estadoConsentimiento({ version: 3, revocadoEn: new Date() }, 3)).toBe("REVOCADO");
  });
});
