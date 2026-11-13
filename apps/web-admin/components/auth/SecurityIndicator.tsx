"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Firma del pie de la pantalla de acceso. Va en una pastilla oscura para que
 * se lea también sobre las franjas amarillas del fondo.
 */
export function SecurityIndicator() {
  const reducir = useReducedMotion();

  return (
    <motion.div
      className="flex items-center justify-center"
      initial={reducir ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 1.6 }}
    >
      <span
        className="rounded-full border px-5 py-1.5 text-sm font-medium tracking-wide"
        style={{
          color: "var(--gx-ink)",
          background: "color-mix(in srgb, var(--gx-field-bg) 85%, transparent)",
          borderColor: "color-mix(in srgb, var(--gx-accent) 45%, transparent)",
          textShadow: "none",
        }}
      >
        by zipnegocios
      </span>
    </motion.div>
  );
}
