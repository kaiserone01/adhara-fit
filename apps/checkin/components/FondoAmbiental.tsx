// Capa decorativa sobre el video de fondo: velo oscuro, luces amarillas desenfocadas, partículas, rayas diagonales
// en las esquinas y la barra inferior. Todo es CSS (transform/opacity) para que el TV de 2 GB no sufra; sin JS ni
// WebGL. Las animaciones se apagan con prefers-reduced-motion (globals.css). No recibe eventos.

// Posición (%), tamaño (rem), duración y retraso (s) de cada partícula. Fijos para que servidor y cliente coincidan.
const PARTICULAS = [
  { x: 6, t: 0.5, d: 16, r: 0 },
  { x: 13, t: 0.35, d: 21, r: 4 },
  { x: 21, t: 0.6, d: 18, r: 9 },
  { x: 29, t: 0.3, d: 24, r: 2 },
  { x: 38, t: 0.45, d: 19, r: 12 },
  { x: 46, t: 0.55, d: 22, r: 6 },
  { x: 54, t: 0.3, d: 17, r: 14 },
  { x: 62, t: 0.5, d: 25, r: 1 },
  { x: 70, t: 0.4, d: 20, r: 8 },
  { x: 77, t: 0.6, d: 23, r: 11 },
  { x: 84, t: 0.35, d: 18, r: 5 },
  { x: 90, t: 0.5, d: 26, r: 13 },
  { x: 95, t: 0.3, d: 21, r: 3 },
  { x: 33, t: 0.4, d: 27, r: 16 },
];

export function FondoAmbiental() {
  return (
    <div aria-hidden="true" className="ambiente">
      <div className="ambiente-velo" />
      <div className="ambiente-luz ambiente-luz-a" />
      <div className="ambiente-luz ambiente-luz-b" />
      <div className="ambiente-trazo" />
      {PARTICULAS.map((p) => (
        <span
          key={p.x}
          className="ambiente-particula"
          style={{ left: `${p.x}%`, width: `${p.t}rem`, height: `${p.t}rem`, animationDuration: `${p.d}s`, animationDelay: `-${p.r}s` }}
        />
      ))}
      <div className="ambiente-rayas ambiente-rayas-sup" />
      <div className="ambiente-rayas ambiente-rayas-inf" />
      <div className="ambiente-barra" />
    </div>
  );
}
