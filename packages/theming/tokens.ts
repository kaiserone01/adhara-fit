export interface Tema {
  ground: string;
  surface: string;
  surface2: string;
  surfaceElevada: string;
  edge: string;
  fieldBg: string;
  fieldEdge: string;
  fieldEdgeHover: string;
  ink: string;
  muted: string;
  mutedDim: string;
  accent: string;
  accentInk: string;
  good: string;
  goodInk: string;
  warn: string;
  warnInk: string;
  bad: string;
  badInk: string;
  scrim: string;
}

// Paleta de marca de Adhara Fit: carbón #231F20, amarillo #FFCB04 y blanco #FFFFFF (kit en
// docs/ADHARA_FIT_Logo_Kit). Las superficies son escalones de carbón; verde, naranja y rojo solo
// comunican estado (bien, aviso, error) y no compiten con el amarillo de marca.
// Tema fijo: la resolución dinámica por Organización (TemaOrganizacion) queda para un plan aparte.
export const temaAdhara: Tema = {
  ground: "#231f20",
  surface: "#2c2728",
  surface2: "#363031",
  surfaceElevada: "#413a3b",
  edge: "#4d4546",
  fieldBg: "#1b1819",
  fieldEdge: "#7d7576",
  fieldEdgeHover: "#a79fa0",
  ink: "#ffffff",
  muted: "#bdb5b6",
  mutedDim: "#948c8d",
  accent: "#ffcb04",
  accentInk: "#231f20",
  good: "#4ade80",
  goodInk: "#06240f",
  warn: "#ff8a3d",
  warnInk: "#2a1100",
  bad: "#ff4d5e",
  badInk: "#2a0609",
  scrim: "rgba(18, 15, 16, 0.65)",
};
