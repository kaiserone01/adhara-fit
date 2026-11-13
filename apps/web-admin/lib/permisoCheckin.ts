// Quién puede configurar la ficha en reposo del checkin (menú Checkin).
export function puedeEditarCheckin(rol: string): boolean {
  return rol === "SOCIO" || rol === "GERENTE";
}
