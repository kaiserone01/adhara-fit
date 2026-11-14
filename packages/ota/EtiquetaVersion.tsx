"use client";

import { useEffect, useState } from "react";
import { CLAVE_ESTADO, EVENTO_ESTADO } from "./autoactualizar";

// Estados normales que no hace falta mostrar; cualquier otro (error, sin configuración…) se añade a la etiqueta.
const ESTADOS_SILENCIOSOS = new Set(["", "iniciada", "al día"]);

function leerEstado(): string {
  try {
    return localStorage.getItem(CLAVE_ESTADO) ?? "";
  } catch {
    return "";
  }
}

// Versión de la interfaz que se está mostrando, en la esquina inferior derecha y muy discreta. La fija el build
// (NEXT_PUBLIC_APP_VERSION = versionName, p. ej. 1.0.42): tras una autoactualización OTA muestra la del bundle nuevo.
// Si la autoactualización está descargando o falló, lo dice en pocas palabras al lado (ayuda a diagnosticar un TV).
export function EtiquetaVersion() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
  const [estado, setEstado] = useState("");

  useEffect(() => {
    const actualizar = () => setEstado(leerEstado());
    actualizar();
    window.addEventListener(EVENTO_ESTADO, actualizar);
    return () => window.removeEventListener(EVENTO_ESTADO, actualizar);
  }, []);

  return (
    <span
      aria-hidden="true"
      style={{
        position: "fixed",
        right: "0.75rem",
        bottom: "0.5rem",
        zIndex: 50,
        fontSize: "0.75rem",
        lineHeight: 1,
        opacity: 0.4,
        color: "var(--gx-muted)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      v{version}
      {ESTADOS_SILENCIOSOS.has(estado) ? "" : ` · ota: ${estado}`}
    </span>
  );
}
