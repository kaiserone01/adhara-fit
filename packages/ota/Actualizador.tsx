"use client";

import { useEffect } from "react";
import { iniciarActualizador } from "./autoactualizar";
import { leerActualizaciones } from "./manifiesto";
import { cargarJsonConRespaldo } from "./respaldo";

/** Sin interfaz: arranca la autoactualización del APK. `rutaConfig` es el JSON de configuración empaquetado. */
export function Actualizador({ rutaConfig }: { rutaConfig: string }) {
  useEffect(() => {
    let detener = () => {};
    let desmontado = false;
    cargarJsonConRespaldo(rutaConfig)
      .then((datos) => {
        const config = leerActualizaciones(datos);
        if (config && !desmontado) detener = iniciarActualizador(config);
      })
      .catch(() => undefined);
    return () => {
      desmontado = true;
      detener();
    };
  }, [rutaConfig]);
  return null;
}
