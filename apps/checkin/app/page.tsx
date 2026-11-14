"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { cargarConfig } from "@/lib/config";
import { registrarCheckIn, fijarUrlApi, ErrorCheckIn } from "@/lib/api";
import { encolar, listarPendientes } from "@/lib/colaPendientes";
import { reintentarPendientes } from "@/lib/reintentarPendientes";
import { useEntradaIdentificador } from "@/lib/useEntradaIdentificador";
import { estadoInicial, reducirPantalla, type Ficha, type FichaActiva } from "@/lib/estadoPantalla";
import { caraDeResultado, tonoDeCara, type Tono } from "@/lib/cara";
import { precargarFoto } from "@/lib/precargarFoto";
import { textoSaludo } from "@/lib/saludo";
import { useFraseRotativa } from "@/lib/useFraseRotativa";
import { useFrasesReposo } from "@/lib/useFrasesReposo";
import { useFechaActual, useHoraActual } from "@/lib/useHoraActual";
import { useInfoCheckin } from "@/lib/useInfoCheckin";
import { ESPERA_POR_DEFECTO_SEGUNDOS } from "@/lib/esperaBloqueo";
import { AccessCard } from "@/components/AccessCard";
import { FichaAviso } from "@/components/FichaAviso";
import { FichaGiratoria } from "@/components/FichaGiratoria";
import { FichaReposo } from "@/components/FichaReposo";
import { CampoIdentificador } from "@/components/CampoIdentificador";
import { FondoAmbiental } from "@/components/FondoAmbiental";
import { IndicadorIngreso } from "@/components/IndicadorIngreso";
import { FondoVideo, type Reaccion } from "@/components/FondoVideo";

// Cuánto tiempo se queda la ficha real en pantalla antes de volver al reposo.
const DURACION_FICHA_MS = 30_000;
const REINTENTO_PENDIENTES_MS = 30_000;
// Tope de espera por la foto antes de voltear la ficha (si falla, sale con iniciales).
const ESPERA_FOTO_MS = 1_500;

function contenidoFicha(ficha: FichaActiva) {
  switch (ficha.tipo) {
    case "resultado":
      return (
        <AccessCard
          resultado={ficha.resultado}
          hora={ficha.hora}
          cara={ficha.cara}
          diasParaVencer={ficha.diasParaVencer}
          fotoOk={ficha.fotoOk}
          saludo={ficha.saludo}
          duracionMs={DURACION_FICHA_MS}
        />
      );
    case "pendiente":
      return (
        <FichaAviso
          tono="ambar"
          titulo="Sin conexión"
          detalle="Tu entrada se guardó y se enviará sola cuando vuelva la red."
          duracionMs={DURACION_FICHA_MS}
        />
      );
    case "error":
      return <FichaAviso tono="rojo" titulo="No se pudo registrar" detalle={ficha.mensaje} duracionMs={DURACION_FICHA_MS} />;
  }
}

export default function PaginaCheckIn() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [errorConfig, setErrorConfig] = useState<string | null>(null);
  const [pantalla, despachar] = useReducer(reducirPantalla, estadoInicial);
  const [reaccion, setReaccion] = useState<Reaccion | null>(null);
  const [pendientes, setPendientes] = useState(0);
  // Instante hasta el que el servidor pidió no enviar más (429); 0 si no hay bloqueo.
  const [bloqueadoHasta, setBloqueadoHasta] = useState(0);
  const [ahoraMs, setAhoraMs] = useState(() => Date.now());
  const { identificador, limpiar, sinInput, propsInput, enviarActual } = useEntradaIdentificador({ alEnviar: enviar });
  const info = useInfoCheckin(apiKey);
  const { frase, saliendo } = useFraseRotativa(useFrasesReposo(info?.reposo));
  const hora = useHoraActual();
  const fecha = useFechaActual();
  const bloqueado = bloqueadoHasta > ahoraMs;

  // Mientras dura el bloqueo se refresca cada segundo para mostrar la cuenta regresiva.
  useEffect(() => {
    if (bloqueadoHasta <= Date.now()) return;
    const intervalo = setInterval(() => setAhoraMs(Date.now()), 1_000);
    return () => clearInterval(intervalo);
  }, [bloqueadoHasta]);

  useEffect(() => {
    let activo = true;
    cargarConfig()
      .then((config) => {
        if (!activo) return;
        fijarUrlApi(config.apiUrl);
        setApiKey(config.clave);
      })
      .catch((error) => {
        if (activo) setErrorConfig(error instanceof Error ? error.message : "No se pudo leer la configuración.");
      });
    return () => {
      activo = false;
    };
  }, []);

  const actualizarPendientes = useCallback(() => {
    listarPendientes().then((lista) => setPendientes(lista.length));
  }, []);

  useEffect(() => {
    if (!apiKey) return;

    actualizarPendientes();
    reintentarPendientes(apiKey).then(actualizarPendientes);

    const alReconectar = () => {
      reintentarPendientes(apiKey).then(actualizarPendientes);
    };
    window.addEventListener("online", alReconectar);
    // "online" no se dispara si la red nunca cayó y solo falló el servidor (timeout, reinicio): sin este reintento periódico la cola quedaba pegada por días.
    const intervalo = setInterval(alReconectar, REINTENTO_PENDIENTES_MS);
    return () => {
      window.removeEventListener("online", alReconectar);
      clearInterval(intervalo);
    };
  }, [apiKey, actualizarPendientes]);

  // La ficha real vuelve sola al reposo a los 30 s; una respuesta nueva la reemplaza antes y su id
  // distinto reinicia el conteo (el temporizador de la anterior se cancela al cambiar el id).
  const fichaId = pantalla.ficha?.id;
  useEffect(() => {
    if (fichaId === undefined) return;
    const temporizador = setTimeout(() => despachar({ tipo: "vencio", id: fichaId }), DURACION_FICHA_MS);
    return () => clearTimeout(temporizador);
  }, [fichaId]);

  async function mostrar(ficha: Ficha, tono: Tono) {
    // La foto se baja ANTES de voltear para que la ficha no aparezca a medio cargar.
    if (ficha.tipo === "resultado") {
      ficha = { ...ficha, fotoOk: ficha.resultado.fotoUrl ? await precargarFoto(ficha.resultado.fotoUrl, ESPERA_FOTO_MS) : false };
    }
    despachar({ tipo: "respuesta", ficha });
    setReaccion((previa) => ({ id: (previa?.id ?? 0) + 1, tono }));
  }

  async function enviar(identificador: string) {
    if (!apiKey || !identificador || pantalla.procesando) return;
    // Bloqueado por intentos: no se envía ni se encola (el servidor ya dijo que no).
    if (bloqueadoHasta > Date.now()) return;

    despachar({ tipo: "enviar" });

    // Primero se resuelve qué mostrar y recién después se muestra: un fallo al mostrar no debe
    // confundirse con una red caída (que encolaría el identificador por error).
    let salida: { ficha: Ficha; tono: Tono };
    try {
      const resultado = await registrarCheckIn(apiKey, identificador);
      const ahora = new Date();
      const { cara, diasParaVencer } = caraDeResultado(resultado, ahora);
      salida = {
        ficha: {
          tipo: "resultado",
          resultado,
          hora: ahora.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" }),
          cara,
          diasParaVencer,
          fotoOk: false,
          saludo: textoSaludo(resultado.esCumpleanos),
        },
        tono: tonoDeCara(cara),
      };
    } catch (error) {
      if (error instanceof ErrorCheckIn) {
        if (error.status === 429) {
          const espera = error.reintentarEnSegundos ?? ESPERA_POR_DEFECTO_SEGUNDOS;
          setBloqueadoHasta(Date.now() + espera * 1_000);
          setAhoraMs(Date.now());
        }
        salida = { ficha: { tipo: "error", mensaje: error.message }, tono: "rojo" };
      } else {
        try {
          await encolar(identificador);
          actualizarPendientes();
          salida = { ficha: { tipo: "pendiente" }, tono: "ambar" };
        } catch {
          salida = { ficha: { tipo: "error", mensaje: "No se pudo guardar tu entrada. Acércate a recepción." }, tono: "rojo" };
        }
      }
    }

    try {
      await mostrar(salida.ficha, salida.tono);
    } finally {
      limpiar();
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 px-[5vmin] pb-[4vmin] pt-[3vmin]" style={{ color: "var(--gx-ink)" }}>
      <FondoVideo reaccion={reaccion} />
      <FondoAmbiental />

      {/* Franja superior: aviso de pendientes a la izquierda; logo y lema a la derecha (dentro del margen de overscan). */}
      <div className="entrada-1 flex w-full items-start justify-between">
        <div>
          {pendientes > 0 && (
            <div className="rounded px-3 py-1 text-xl" style={{ background: "var(--gx-bad)", color: "var(--gx-bad-ink)" }}>
              {pendientes} pendiente{pendientes === 1 ? "" : "s"} por sincronizar
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- output: "export" no soporta el optimizador de next/image */}
          <img src="/branding/logo-negativo.png" alt="Adhara Fit" className="h-16 w-auto object-contain" />
          <p className="text-lg font-bold uppercase" style={{ letterSpacing: "0.3em", color: "var(--gx-accent)" }}>
            Entrena · Supérate · Vive mejor
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <h1 className="titular-checkin text-center">
          Ingresa tu <span>DNI</span> o <span>Carné de Extranjería</span>
        </h1>

        <CampoIdentificador
          longitud={identificador.length}
          sinInput={sinInput}
          propsInput={propsInput}
          procesando={pantalla.procesando}
          bloqueado={bloqueado}
        />

        <p aria-live="polite" className="min-h-[2.5rem] text-3xl" style={{ color: errorConfig ? "var(--gx-bad)" : "var(--gx-muted)" }}>
          {errorConfig ??
            (bloqueado
              ? `Demasiados intentos. Espera ${Math.ceil((bloqueadoHasta - ahoraMs) / 1_000)} s.`
              : pantalla.procesando
                ? "Verificando…"
                : "")}
        </p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center">
        <FichaGiratoria
          ficha={pantalla.ficha}
          renderReposo={() => (
            <FichaReposo
              frase={frase}
              saliendo={saliendo}
              hora={hora}
              fecha={fecha}
              imagenUrl={info?.reposo?.imagenUrl ?? null}
              opacidad={info?.reposo?.opacidad}
            />
          )}
          renderFicha={contenidoFicha}
        />
      </div>

      <IndicadorIngreso habilitado={identificador.length > 0 && !pantalla.procesando && !bloqueado} alTocar={enviarActual} />
    </main>
  );
}
