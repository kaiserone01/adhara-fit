"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Franjas diagonales amarillas/negras en las esquinas, contorno del isotipo
 * «A» y destellos que recorren las líneas. Decorativo: opacidad baja para no
 * saturar el fondo. El SVG usa coordenadas porcentuales (0–100).
 */
export function DiagonalAccents() {
  const reducir = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      initial={reducir ? false : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Esquina superior derecha */}
        <polygon points="88,0 100,0 100,27 79,27" fill="var(--gx-accent)" opacity="0.92" />
        <polygon points="80,0 86,0 70,27 64,27" fill="var(--gx-accent)" opacity="0.3" />
        <polygon points="92,27 100,27 100,45 83,45" fill="var(--gx-accent)" opacity="0.14" className="hidden md:block" />
        {/* Esquina superior izquierda */}
        <polygon points="0,0 9,0 0,19" fill="var(--gx-accent)" opacity="0.9" />
        <polygon points="11,0 14,0 0,29" fill="var(--gx-accent)" opacity="0.35" />
        {/* Esquina inferior izquierda */}
        <polygon points="0,64 5,57 5,66 0,80" fill="var(--gx-accent)" opacity="0.55" className="hidden md:block" />
        <line
          x1="0"
          y1="96"
          x2="14"
          y2="74"
          stroke="var(--gx-accent)"
          strokeWidth="1"
          opacity="0.5"
          vectorEffect="non-scaling-stroke"
          className="hidden md:block"
        />
      </svg>

      {/* Contorno del isotipo (una «A» de líneas finas) */}
      <svg
        className="absolute right-[6%] top-[4%] hidden h-[46vh] w-auto opacity-25 md:block"
        viewBox="0 0 100 100"
        fill="none"
        stroke="var(--gx-accent)"
        strokeWidth="1"
      >
        <path d="M50 6 L94 94 H72 L50 50 L28 94 H6 Z" pathLength={1} className="login-contorno" vectorEffect="non-scaling-stroke" />
        <path d="M34 66 H66" pathLength={1} className="login-contorno" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Destellos que recorren las diagonales */}
      <span className="login-destello" style={{ right: "6%", top: "12%" }} />
      <span className="login-destello hidden md:block" style={{ right: "18%", top: "6%", animationDelay: "3.2s" }} />
      <span className="login-destello hidden md:block" style={{ left: "2%", top: "10%", animationDelay: "5s" }} />
    </motion.div>
  );
}
