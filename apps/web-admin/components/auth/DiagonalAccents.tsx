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
        {/* Las esquinas izquierdas e inferior derecha ya vienen pintadas en la foto de fondo. */}
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
    </motion.div>
  );
}
