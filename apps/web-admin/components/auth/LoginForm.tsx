"use client";

import { useState, type FocusEvent } from "react";
import { Envelope, Eye, EyeSlash, LockSimple, SignIn } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { useLoginFlow } from "./useLoginFlow";

type Flujo = ReturnType<typeof useLoginFlow>;

const FUENTE_TITULO = { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: "0.02em" } as const;

function Titulo({ texto }: { texto: string }) {
  return (
    <div>
      <h1 className="text-4xl leading-none" style={FUENTE_TITULO}>
        {texto}
      </h1>
      <span aria-hidden="true" className="mt-2 block h-[3px] w-14 rounded-full" style={{ background: "var(--gx-accent)" }} />
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

function CheckAnimado() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <motion.path d="M5 12.5 L10 17.5 L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: "easeOut" }} />
    </svg>
  );
}

type CampoId = "email" | "password";

export function LoginForm({ flujo }: { flujo: Flujo }) {
  const reducir = useReducedMotion();
  const { estado, error, errorVez, cargando } = flujo;

  // Foco visual: el campo donde se escribe manda; si no hay ninguno enfocado,
  // manda el que tiene el cursor encima. El otro se encoge para dar foco.
  const [enfocado, setEnfocado] = useState<CampoId | null>(null);
  const [encima, setEncima] = useState<CampoId | null>(null);
  const activo = enfocado ?? encima;
  const estadoCampo = (id: CampoId) => (activo === null ? "neutro" : activo === id ? "activo" : "inactivo");
  const eventosCampo = (id: CampoId) => ({
    onFocus: () => setEnfocado(id),
    onBlur: (e: FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setEnfocado(null);
    },
    onPointerEnter: () => setEncima(id),
    onPointerLeave: () => setEncima((actual) => (actual === id ? null : actual)),
  });

  // El botón solo se habilita con email y contraseña llenos.
  const incompleto = flujo.email.trim() === "" || flujo.password === "";
  const ocupado = estado === "cargando" || estado === "exito";

  // Entrada escalonada: título, campos y botón (1,0 – 1,6 s).
  const aparece = (orden: number) => ({
    initial: reducir ? (false as const) : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 1 + orden * 0.12, ease: "easeOut" as const },
  });

  const mensajeError = error && (
    <p
      role="alert"
      className="rounded-lg px-3 py-2 text-sm"
      style={{ background: "color-mix(in srgb, var(--gx-bad) 16%, transparent)", color: "var(--gx-bad)" }}
    >
      {error}
    </p>
  );

  // Vibración horizontal al fallar (se reinicia con `errorVez`).
  const vibra = {
    key: errorVez,
    animate: !reducir && errorVez > 0 ? { x: [0, -9, 9, -6, 6, -3, 0] } : { x: 0 },
    transition: { duration: 0.45 },
  };

  if (flujo.sucursalesParaElegir !== null) {
    return (
      <div className="login-panel-form flex flex-col justify-center gap-5 px-6 py-8 md:px-12 md:py-14">
        <motion.div {...aparece(0)}>
          <Titulo texto="Elige una sucursal" />
        </motion.div>

        <div className="flex flex-col gap-3">
          {flujo.sucursalesParaElegir.map((sucursal, i) => (
            <motion.button
              key={sucursal.id}
              type="button"
              disabled={cargando || estado === "exito"}
              onClick={() => flujo.elegirSucursal(sucursal.id)}
              {...aparece(i + 1)}
              className="flex min-h-12 flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors duration-150 hover:border-[var(--gx-accent)] focus-visible:border-[var(--gx-accent)] focus-visible:outline-none disabled:opacity-50"
              style={{ borderColor: "var(--gx-edge)", background: "color-mix(in srgb, var(--gx-surface-2) 70%, transparent)", color: "var(--gx-ink)" }}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold">{sucursal.nombre}</span>
                {sucursal.cajaAbiertaPorMi && (
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gx-good)" }}>
                    Entrar para continuar
                  </span>
                )}
              </span>
              {sucursal.cajaAbiertaPor && (
                <span
                  className="flex items-center gap-2 rounded px-2 py-1 text-xs"
                  style={{
                    background: sucursal.cajaAbiertaPorMi
                      ? "color-mix(in srgb, var(--gx-good) 15%, transparent)"
                      : "color-mix(in srgb, var(--gx-warn) 15%, transparent)",
                    color: sucursal.cajaAbiertaPorMi ? "var(--gx-good)" : "var(--gx-warn)",
                    width: "fit-content",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="10" width="18" height="10" rx="1" />
                    <path d="M7 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
                    <path d="M3 14h18" />
                    <path d="M9 14v2" />
                    <path d="M15 14v2" />
                  </svg>
                  {sucursal.cajaAbiertaPorMi ? "Ya tienes una caja abierta y activa" : `Caja abierta por ${sucursal.cajaAbiertaPor}`}
                  {sucursal.cajaAbiertaPorMi && (
                    <span className="ml-auto inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--gx-good)" }} aria-hidden="true" />
                  )}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        <motion.div {...vibra}>{mensajeError}</motion.div>

        <button
          type="button"
          onClick={flujo.volverACredenciales}
          className="w-fit cursor-pointer text-sm font-medium hover:underline"
          style={{ color: "var(--gx-muted)" }}
        >
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={flujo.manejarSubmitCredenciales} className="login-panel-form flex flex-col justify-center gap-5 px-6 py-8 md:px-12 md:py-14">
      <motion.div {...aparece(0)}>
        <Titulo texto="Iniciar sesión" />
      </motion.div>

      <motion.label
        {...aparece(1)}
        {...eventosCampo("email")}
        className="flex flex-col gap-1.5 text-sm font-medium"
        style={{ color: "var(--gx-muted)" }}
      >
        Email
        <span className="login-campo relative block" data-foco={estadoCampo("email")}>
          <Envelope size={20} aria-hidden="true" className="login-icono pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            placeholder="correo@ejemplo.com"
            value={flujo.email}
            onChange={(e) => flujo.setEmail(e.target.value)}
            className="gx-campo min-h-12 w-full rounded-xl border pl-11 pr-3"
          />
        </span>
      </motion.label>

      <motion.label
        {...aparece(2)}
        {...eventosCampo("password")}
        className="flex flex-col gap-1.5 text-sm font-medium"
        style={{ color: "var(--gx-muted)" }}
      >
        Contraseña
        <span className="login-campo relative block" data-foco={estadoCampo("password")}>
          <LockSimple size={20} aria-hidden="true" className="login-icono pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type={flujo.verPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            value={flujo.password}
            onChange={(e) => flujo.setPassword(e.target.value)}
            className="gx-campo min-h-12 w-full rounded-xl border pl-11 pr-12"
          />
          <button
            type="button"
            onClick={flujo.alternarVerPassword}
            aria-label={flujo.verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 hover:text-[var(--gx-accent)]"
            style={{ color: "var(--gx-muted)" }}
          >
            {flujo.verPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        </span>
      </motion.label>

      <motion.div {...aparece(3)}>
        <motion.div {...vibra} className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={ocupado || incompleto}
            data-ocupado={ocupado ? "" : undefined}
            className="login-boton flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl px-5 text-lg font-bold disabled:cursor-not-allowed"
            style={{ background: "var(--gx-accent)", color: "var(--gx-accent-ink)" }}
          >
            {estado === "cargando" ? (
              <>
                <Spinner />
                Ingresando...
              </>
            ) : estado === "exito" ? (
              <>
                <CheckAnimado />
                Listo
              </>
            ) : (
              <>
                <SignIn size={22} weight="bold" aria-hidden="true" className="login-boton-icono" />
                Ingresar
              </>
            )}
          </button>
          {mensajeError}
        </motion.div>
      </motion.div>
    </form>
  );
}
