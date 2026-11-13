"use client";

import { motion, useReducedMotion } from "motion/react";

/** Firma del pie de la pantalla de acceso. */
export function SecurityIndicator() {
  const reducir = useReducedMotion();

  return (
    <motion.div
      className="flex items-center justify-center gap-3 text-sm"
      style={{ color: "var(--gx-muted)" }}
      initial={reducir ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 1.6 }}
    >
      <span aria-hidden="true" className="hidden h-px w-16 md:block" style={{ background: "var(--gx-edge)" }} />
      <span className="tracking-wide">by zipnegocios</span>
      <span aria-hidden="true" className="hidden h-px w-16 md:block" style={{ background: "var(--gx-edge)" }} />
    </motion.div>
  );
}
