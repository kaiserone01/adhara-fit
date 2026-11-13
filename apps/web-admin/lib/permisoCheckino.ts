// Quién puede configurar la ficha en reposo del checkin (menú Checkino).
export function puedeEditarCheckino(rol: string): boolean {
  return rol === "SOCIO" || rol === "GERENTE";
}
