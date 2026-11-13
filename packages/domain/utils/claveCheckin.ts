// Clave única del Check-in Module (variable de entorno CHECKIN_CLAVE). Es un solo gimnasio y un solo APK, así que no hay
// claves por sede ni revocables desde el panel: rotarla es cambiar la variable y recompilar el APK.

/** Una clave más corta que esto se trata como no configurada (falla cerrado). */
export const CLAVE_CHECKIN_MIN_LARGO = 16;

/**
 * Compara la clave recibida con la configurada sin cortar en el primer carácter distinto (tiempo constante respecto
 * al contenido). Devuelve false si la configurada falta o es demasiado corta, o si no se recibió clave.
 */
export function claveCheckinValida(recibida: string | undefined, configurada: string | undefined): boolean {
  if (!configurada || configurada.length < CLAVE_CHECKIN_MIN_LARGO) return false;
  if (!recibida) return false;
  let diferencia = recibida.length ^ configurada.length;
  const largo = Math.max(recibida.length, configurada.length);
  for (let i = 0; i < largo; i++) {
    diferencia |= (recibida.charCodeAt(i) || 0) ^ (configurada.charCodeAt(i) || 0);
  }
  return diferencia === 0;
}
