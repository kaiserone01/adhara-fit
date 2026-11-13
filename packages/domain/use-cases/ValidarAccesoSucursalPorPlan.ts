import { EstadoCheckIn } from "../entities/CheckIn";
import { estadoAcceso } from "../utils/vencimiento";

// Estado de acceso al hacer check-in (S-04): `sucursal_incorrecta` si no es su sede; si no, `activo` hasta el día de
// vencimiento inclusive y `vencido` después (o sin vencimiento). No hay días de gracia. El vencimiento es la única
// fecha del socio (Miembro.fechaVencimiento).
export function validarAccesoSucursal(
  sucursalIdDelMiembro: string | null,
  sucursalIdDelCheckIn: string,
  fechaVencimientoMiembro: Date | null,
  ahora: Date = new Date()
): EstadoCheckIn {
  // sucursalIdDelMiembro === null significa "Ambas" (plan multisede): pasa la validación de sede.
  if (sucursalIdDelMiembro !== null && sucursalIdDelMiembro !== sucursalIdDelCheckIn) {
    return "sucursal_incorrecta";
  }

  return estadoAcceso(fechaVencimientoMiembro, ahora);
}
