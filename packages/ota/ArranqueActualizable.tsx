"use client";

import { useEffect, useState, type ReactNode } from "react";
import { buscarEInstalar, anotarEstado, confirmarArranque } from "./autoactualizar";
import { mensajeArranque, msMensajeFinal, textoVersion, type EstadoArranque } from "./arranque";
import { leerActualizaciones } from "./manifiesto";
import { cargarJsonConRespaldo } from "./respaldo";

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/**
 * Puerta de arranque de las apps de TV: antes de mostrar la app busca actualizaciones de la interfaz. Mientras tanto
 * muestra el logo y qué está haciendo (buscando, descargando con su porcentaje, instalando, «Está actualizado»); luego
 * arranca la app. En el navegador no busca nada. `rutaConfig` es el JSON de configuración empaquetado en el APK.
 */
export function ArranqueActualizable({ rutaConfig, children }: { rutaConfig: string; children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoArranque>({ fase: "buscando" });
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "";

  useEffect(() => {
    let cancelado = false;
    const mostrar = (e: EstadoArranque) => {
      if (!cancelado) setEstado(e);
    };
    void (async () => {
      // Sin la app Android (navegador) no hay nada que buscar.
      if (!(await confirmarArranque())) {
        mostrar({ fase: "listo" });
        return;
      }
      let config = null;
      try {
        config = leerActualizaciones(await cargarJsonConRespaldo(rutaConfig));
      } catch {
        // Sin configuración: se arranca igual.
      }
      if (!config) {
        anotarEstado("sin configuración");
        mostrar({ fase: "listo" });
        return;
      }
      let ultimo: EstadoArranque = { fase: "buscando" };
      await buscarEInstalar(config, (e) => {
        ultimo = e;
        mostrar(e);
      });
      await esperar(msMensajeFinal(ultimo));
      mostrar({ fase: "listo" });
    })();
    return () => {
      cancelado = true;
    };
  }, [rutaConfig]);

  if (estado.fase === "listo") return <>{children}</>;

  // Medidas en rem: se escalan con la pantalla como el resto de la interfaz (16 px a 1920×1080).
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        background: "var(--gx-ground)",
        color: "var(--gx-ink)",
      }}
    >
      <div
        role="img"
        aria-label="Adhara Fit"
        style={{ width: "14rem", height: "14rem", borderRadius: "2.3rem", backgroundImage: "url(/icon.png)", backgroundSize: "cover" }}
      />
      <p style={{ fontSize: "2.2rem", fontWeight: 600, textAlign: "center", maxWidth: "80%" }}>{mensajeArranque(estado)}</p>
      {estado.fase === "descargando" && (
        <div style={{ width: "32rem", height: "0.8rem", borderRadius: "0.4rem", background: "var(--gx-surface-2)", overflow: "hidden" }}>
          <div style={{ width: `${estado.porcentaje}%`, height: "100%", background: "var(--gx-accent)", transition: "width 200ms linear" }} />
        </div>
      )}
      {estado.fase === "instalando" && (
        <div style={{ width: "32rem", height: "0.8rem", borderRadius: "0.4rem", background: "var(--gx-accent)" }} />
      )}
      {version && <p style={{ fontSize: "1.4rem", color: "var(--gx-muted)" }}>{textoVersion(version)}</p>}
    </div>
  );
}
