"use client";

import { useEffect } from "react";
import { anotarEstado, iniciarActualizador } from "./autoactualizar";
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
        if (!config) anotarEstado("sin configuración");
        else if (!desmontado) detener = iniciarActualizador(config);
      })
      .catch(() => anotarEstado("sin configuración"));
    return () => {
      desmontado = true;
      detener();
    };
  }, [rutaConfig]);
  return null;
}
