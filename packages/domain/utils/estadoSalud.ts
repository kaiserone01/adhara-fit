// S-17: estado de salud del sistema para /api/salud. Función pura: recibe lo medido y decide el estado.
export const MAX_MINUTOS_SIN_RESPALDO = 1_560; // 26 horas
export const MAX_HORAS_SIN_RESPALDO_AL_ARRANCAR = 26;
export const MAX_DIAS_SIN_RESTAURACION = 35;

export type EstadoSalud = "ok" | "degradado" | "caido";

export interface RespuestaSalud {
  estado: EstadoSalud;
  db: boolean;
  ultimoRespaldoHoras: number | null;
  ultimaRestauracionDias: number | null;
  version: string;
}

export interface EntradaSalud {
  /** La consulta de prueba a la base respondió a tiempo. */
  dbOk: boolean;
  /** Si hay un trabajo de respaldo configurado (archivo de estado). Sin él, los controles de respaldo no se aplican. */
  respaldosConfigurados: boolean;
  ultimoRespaldo: Date | null;
  ultimaRestauracion: Date | null;
  /** Instante en que arrancó el proceso (para el plazo de gracia del primer respaldo). */
  procesoIniciado: Date;
  ahora: Date;
  version: string;
}

const MS_MINUTO = 60_000;
const MS_HORA = 60 * MS_MINUTO;
const MS_DIA = 24 * MS_HORA;

export function evaluarSalud(e: EntradaSalud): { codigoHttp: 200 | 503; cuerpo: RespuestaSalud } {
  const respaldoHoras = e.ultimoRespaldo ? Math.max(0, Math.floor((e.ahora.getTime() - e.ultimoRespaldo.getTime()) / MS_HORA)) : null;
  const restauracionDias = e.ultimaRestauracion
    ? Math.max(0, Math.floor((e.ahora.getTime() - e.ultimaRestauracion.getTime()) / MS_DIA))
    : null;

  let estado: EstadoSalud = "ok";

  if (!e.dbOk) {
    estado = "caido";
  } else if (e.respaldosConfigurados) {
    const minutosSinRespaldo = e.ultimoRespaldo ? (e.ahora.getTime() - e.ultimoRespaldo.getTime()) / MS_MINUTO : null;
    const horasEnMarcha = (e.ahora.getTime() - e.procesoIniciado.getTime()) / MS_HORA;

    if (minutosSinRespaldo !== null && minutosSinRespaldo > MAX_MINUTOS_SIN_RESPALDO) estado = "caido";
    else if (minutosSinRespaldo === null && horasEnMarcha > MAX_HORAS_SIN_RESPALDO_AL_ARRANCAR) estado = "caido";
    else if (restauracionDias === null || restauracionDias > MAX_DIAS_SIN_RESTAURACION) estado = "degradado";
  }

  return {
    codigoHttp: estado === "caido" ? 503 : 200,
    cuerpo: { estado, db: e.dbOk, ultimoRespaldoHoras: respaldoHoras, ultimaRestauracionDias: restauracionDias, version: e.version },
  };
}

/**
 * Lee el archivo de estado del respaldo ({ "ultimoRespaldo": ISO, "ultimaRestauracion": ISO }). Ausente, ilegible o
 * corrupto equivale a «nunca»: devuelve null en cada campo y no lanza.
 */
export function leerEstadoRespaldo(contenido: string | null): { ultimoRespaldo: Date | null; ultimaRestauracion: Date | null } {
  const vacio = { ultimoRespaldo: null, ultimaRestauracion: null };
  if (!contenido) return vacio;
  try {
    const datos: unknown = JSON.parse(contenido);
    if (typeof datos !== "object" || datos === null) return vacio;
    const fecha = (valor: unknown): Date | null => {
      if (typeof valor !== "string") return null;
      const d = new Date(valor);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const r = datos as Record<string, unknown>;
    return { ultimoRespaldo: fecha(r.ultimoRespaldo), ultimaRestauracion: fecha(r.ultimaRestauracion) };
  } catch {
    return vacio;
  }
}
