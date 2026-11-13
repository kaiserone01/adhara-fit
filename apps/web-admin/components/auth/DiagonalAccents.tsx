"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Franjas diagonales amarillas, contorno del isotipo «A» y destellos que
 * recorren las líneas, en la esquina inferior derecha y detrás de todo el
 * contenido (también del pie con la firma). Decorativo: opacidad baja para no
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
        <polygon points="88,100 100,100 100,73 79,73" fill="var(--gx-accent)" opacity="0.92" />
        <polygon points="80,100 86,100 70,73 64,73" fill="var(--gx-accent)" opacity="0.3" />
        <polygon points="92,73 100,73 100,55 83,55" fill="var(--gx-accent)" opacity="0.14" className="hidden md:block" />
      </svg>

      {/* Contorno del isotipo (una «A» de líneas finas) */}
      <svg
        className="absolute bottom-[3%] right-[6%] hidden h-[42vh] w-auto opacity-25 md:block"
        viewBox="0 0 100 100"
        fill="none"
        stroke="var(--gx-accent)"
        strokeWidth="1"
      >
        <path d="M50 6 L94 94 H72 L50 50 L28 94 H6 Z" pathLength={1} className="login-contorno" vectorEffect="non-scaling-stroke" />
        <path d="M34 66 H66" pathLength={1} className="login-contorno" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Destellos que recorren las diagonales */}
      <span className="login-destello" style={{ right: "6%", bottom: "12%" }} />
      <span className="login-destello hidden md:block" style={{ right: "18%", bottom: "6%", animationDelay: "3.2s" }} />
    </motion.div>
  );
}
