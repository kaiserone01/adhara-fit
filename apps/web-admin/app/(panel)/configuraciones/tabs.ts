// Compartido entre /configuraciones y los layouts de /planes,
// /usuarios, /checkin y /vitrina — esas rutas viven fuera de /configuraciones
// pero muestran la misma barra de tabs (ver diseño acordado).
export const TABS_CONFIGURACIONES = [
  { href: "/configuraciones/metodos-pago", label: "Métodos de pago" },
  { href: "/planes", label: "Planes" },
  { href: "/usuarios", label: "Administradores" },
  { href: "/entrenadores", label: "Entrenadores" },
  { href: "/checkin", label: "Checkin" },
  { href: "/vitrina", label: "Vitrina" },
  { href: "/configuraciones/aplicaciones", label: "Aplicaciones" },
];
