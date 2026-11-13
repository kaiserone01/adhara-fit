"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Panel de identidad: logotipo del kit de marca (sin rotar ni deformar), halo
 * pulsante sutil, subtítulo y una línea que se dibuja.
 */
export function BrandPanel() {
  const reducir = useReducedMotion();
  const ini = (x: number) => (reducir ? false : { opacity: 0, x });

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-8 text-center md:px-10 md:py-16">
      <motion.div
        className="relative"
        initial={ini(-30)}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.8, ease: "easeOut" }}
      >
        <span className="login-halo" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático del kit de marca */}
        <img
          src="/branding/logo-negativo.png"
          alt="Adhara Fit"
          className="relative mx-auto h-14 w-auto sm:h-16 md:h-24"
        />
      </motion.div>

      <motion.div
        initial={ini(-20)}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
        className="text-[11px] uppercase md:text-xs"
        style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          letterSpacing: "0.3em",
          color: "var(--gx-muted)",
        }}
      >
        Gym · Panel de administración
      </motion.div>

      <span
        aria-hidden="true"
        className="login-linea block h-px w-24"
        style={{ background: "linear-gradient(90deg, var(--gx-accent), transparent)" }}
      />
    </div>
  );
}
