// Lima es UTC-5 todo el año (Perú no usa horario de verano).
const DESFASE_LIMA_MS = 5 * 3_600_000;

// Día calendario en America/Lima, normalizado a medianoche UTC.
export function diaCalendarioLima(ahora: Date): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora); // "2026-09-26"
  return new Date(`${iso}T00:00:00Z`);
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * 86_400_000);
}

// Instante real en que empieza el día calendario de Lima.
export function inicioDelDiaLima(ahora: Date): Date {
  return new Date(diaCalendarioLima(ahora).getTime() + DESFASE_LIMA_MS);
}

// "2026-10-20" → de las 00:00 a las 23:59:59.999 de ese día en Lima.
export function rangoDiaLima(fechaIso: string): { inicio: Date; fin: Date } {
  const inicio = inicioDelDiaLima(new Date(`${fechaIso}T12:00:00Z`));
  return { inicio, fin: new Date(inicio.getTime() + 86_400_000 - 1) };
}

// ¿Hoy (día calendario de Lima) es el cumpleaños? fechaNacimiento se guarda como fecha local a las
// 00:00, igual que fechaInscripcion, y se lee con getters locales. Quien nació un 29 de febrero solo
// cumple los años bisiestos.
export function esCumpleanos(fechaNacimiento: Date | null, ahora: Date): boolean {
  if (!fechaNacimiento) return false;
  const hoy = diaCalendarioLima(ahora);
  return fechaNacimiento.getMonth() === hoy.getUTCMonth() && fechaNacimiento.getDate() === hoy.getUTCDate();
}

// Recibe una fecha guardada a medianoche UTC y devuelve ese mismo día calendario a las 00:00 de Lima.
export function medianocheLimaDeFechaUtc(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()) + DESFASE_LIMA_MS);
}
