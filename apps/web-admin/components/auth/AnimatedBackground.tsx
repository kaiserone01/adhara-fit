"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/**
 * Fondo cinematográfico: foto a pantalla completa (la ruta es
 * /branding/login-fondo.webp; si no existe se ve solo el degradado), zoom muy
 * lento y parallax con el cursor. El parallax solo se activa con puntero fino
 * y sin «reducir movimiento».
 */
export function AnimatedBackground() {
  const reducir = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 40, damping: 22 });
  const sy = useSpring(y, { stiffness: 40, damping: 22 });

  useEffect(() => {
    if (reducir) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    function alMover(e: PointerEvent) {
      x.set((e.clientX / window.innerWidth - 0.5) * -22);
      y.set((e.clientY / window.innerHeight - 0.5) * -14);
    }
    window.addEventListener("pointermove", alMover, { passive: true });
    return () => window.removeEventListener("pointermove", alMover);
  }, [reducir, x, y]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ background: "var(--gx-ground)" }}>
      <motion.div
        className="absolute -inset-8 will-change-transform"
        style={{ x: sx, y: sy }}
        initial={reducir ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          className="login-foto absolute inset-0"
          initial={{ scale: 1 }}
          animate={reducir ? { scale: 1 } : { scale: 1.06 }}
          transition={{ duration: 40, ease: "linear" }}
        />
      </motion.div>
      <div className="login-velo absolute inset-0" />
      <div className="login-vineta absolute inset-0" />
    </div>
  );
}
