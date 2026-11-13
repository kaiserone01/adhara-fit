"use client";

import { motion, useReducedMotion } from "motion/react";
import { AnimatedBackground } from "./AnimatedBackground";
import { BrandPanel } from "./BrandPanel";
import { DiagonalAccents } from "./DiagonalAccents";
import { LoginCard } from "./LoginCard";
import { LoginForm } from "./LoginForm";
import { SecurityIndicator } from "./SecurityIndicator";
import { useLoginFlow } from "./useLoginFlow";
import "./login.css";

/**
 * Pantalla de acceso: tres capas (fondo, geometrías, tarjeta). Secuencia de
 * entrada: fondo 0–0,3 s → geometrías 0,2–0,7 → tarjeta 0,4–1,3 → identidad
 * 0,8–1,4 → formulario 1,0–1,6; después solo quedan los efectos ambientales.
 * Nada bloquea la interacción mientras corre.
 */
export function LoginExperience() {
  const flujo = useLoginFlow();
  const reducir = useReducedMotion();

  return (
    <main
      className="relative isolate flex min-h-dvh flex-col overflow-hidden"
      style={{ color: "var(--gx-ink)", background: "var(--gx-ground)" }}
    >
      <AnimatedBackground />
      <DiagonalAccents />

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-4 pt-10 md:px-10 md:pt-12">
        <LoginCard>
          <BrandPanel />
          <LoginForm flujo={flujo} />
        </LoginCard>
      </div>

      <footer className="relative z-10 flex flex-col items-center gap-5 px-6 pb-8 pt-2 md:flex-row md:items-end md:justify-between md:px-16 md:pb-10">
        <motion.p
          className="text-center uppercase md:text-left"
          initial={reducir ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3, ease: "easeOut" }}
        >
          <span
            className="block text-lg tracking-[0.22em] md:text-2xl"
            style={{ fontWeight: 500, color: "color-mix(in srgb, var(--gx-ink) 85%, transparent)" }}
          >
            Disciplina hoy,
          </span>
          <span
            className="block text-lg italic tracking-[0.18em] md:text-2xl"
            style={{ fontWeight: 700, color: "var(--gx-accent)" }}
          >
            Resultados siempre.
          </span>
          <svg aria-hidden="true" viewBox="0 0 240 12" className="mx-auto mt-1 h-3 w-48 md:mx-0 md:w-60" fill="none">
            <path d="M2 10 C 70 3, 150 3, 238 2" stroke="var(--gx-accent)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.p>

        <SecurityIndicator />
      </footer>
    </main>
  );
}
