import { describe, expect, it } from "vitest";
import { ESTANCADO_MS, evaluarVideo, msParaAvanzar, techoDiapositivaMs, TOPE_VIDEO_MS, ultimoAvance } from "./reproduccion";

describe("msParaAvanzar", () => {
  const base = { conVideo: true, videosTerminados: false, huboFallo: false, transcurridoMs: 0, duracionSeg: 10 };
  it("sin video usa la duración", () => {
    expect(msParaAvanzar({ ...base, conVideo: false, transcurridoMs: 4000 })).toBe(6000);
    expect(msParaAvanzar({ ...base, conVideo: false, transcurridoMs: 12000 })).toBe(0);
  });
  it("cartel con video espera al fin del video, aunque pase la duración", () => {
    expect(msParaAvanzar({ ...base, transcurridoMs: 90_000 })).toBeNull();
  });
  it("cartel: un video corto avanza al terminar, sin esperar la duración", () => {
    expect(msParaAvanzar({ ...base, videosTerminados: true, transcurridoMs: 3000 })).toBe(0);
  });
  it("cartel cuyo video falló muestra el póster hasta cumplir la duración", () => {
    expect(msParaAvanzar({ ...base, videosTerminados: true, huboFallo: true, transcurridoMs: 2000 })).toBe(8000);
  });
});

describe("evaluarVideo", () => {
  const base = { ahoraMs: 1000, inicioMs: 0, ultimoAvanceMs: 0, conTope: true };
  it("sigue mientras avanza", () => {
    expect(evaluarVideo(base)).toBe("SEGUIR");
  });
  it("se salta si el currentTime no avanza durante 20 s", () => {
    expect(evaluarVideo({ ...base, ahoraMs: ESTANCADO_MS - 1 })).toBe("SEGUIR");
    expect(evaluarVideo({ ...base, ahoraMs: ESTANCADO_MS })).toBe("ESTANCADO");
  });
  it("tope absoluto de 10 min aunque avance", () => {
    expect(evaluarVideo({ ...base, ahoraMs: TOPE_VIDEO_MS, ultimoAvanceMs: TOPE_VIDEO_MS - 500 })).toBe("TOPE");
  });
  it("en bucle no hay tope", () => {
    expect(evaluarVideo({ ...base, conTope: false, ahoraMs: TOPE_VIDEO_MS, ultimoAvanceMs: TOPE_VIDEO_MS - 500 })).toBe("SEGUIR");
  });
});

describe("ultimoAvance", () => {
  it("se actualiza solo si el tiempo cambió", () => {
    expect(ultimoAvance(1, 2, 5000, 1000)).toBe(5000);
    expect(ultimoAvance(2, 2, 5000, 1000)).toBe(1000);
  });
});

describe("techoDiapositivaMs", () => {
  it("un video más la duración de la pieza", () => {
    expect(techoDiapositivaMs(10)).toBe(TOPE_VIDEO_MS + 10_000);
  });
});
