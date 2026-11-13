"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Tarjeta central de cristal: identidad a la izquierda y autenticación a la
 * derecha (en mobile, una sobre otra). Entra desde abajo con escala y un único
 * desenfoque inicial (no se anima el blur de forma continua).
 */
export function LoginCard({ children }: { children: ReactNode }) {
  const reducir = useReducedMotion();

  return (
    <motion.div
      className="login-tarjeta grid w-full max-w-[1030px] overflow-hidden rounded-3xl will-change-transform md:grid-cols-2"
      initial={reducir ? false : { opacity: 0, y: 35, scale: 0.96, filter: "blur(12px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
