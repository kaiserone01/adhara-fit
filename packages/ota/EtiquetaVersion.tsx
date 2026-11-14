// Versión de la interfaz que se está mostrando, en la esquina inferior derecha y muy discreta. La fija el build
// (NEXT_PUBLIC_APP_VERSION = versionName, p. ej. 1.0.42): tras una autoactualización OTA muestra la del bundle nuevo.
export function EtiquetaVersion() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
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
    </span>
  );
}
