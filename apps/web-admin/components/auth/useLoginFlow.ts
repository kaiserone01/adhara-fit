"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export interface SucursalParaElegir {
  id: string;
  nombre: string;
}

export type EstadoLogin = "reposo" | "cargando" | "exito" | "error";

/**
 * Estado y envío del login en dos pasos. La lógica es la misma que tenía la
 * página: POST /api/auth/login y, si hay varias sucursales, POST
 * /api/auth/login/sucursal reenviando las credenciales (no hay token
 * intermedio entre los dos pasos). La UI solo consume este hook.
 */
export function useLoginFlow() {
  const router = useRouter();
  const [verPassword, setVerPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Se incrementa en cada error para reiniciar la animación de vibración.
  const [errorVez, setErrorVez] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);
  // null = todavía en el paso 1 (credenciales); un array = paso 2 (elegir sucursal).
  const [sucursalesParaElegir, setSucursalesParaElegir] = useState<SucursalParaElegir[] | null>(null);

  function fallar(mensaje: string) {
    setError(mensaje);
    setErrorVez((v) => v + 1);
  }

  async function manejarSubmitCredenciales(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setCargando(false);

      if (!res.ok) {
        fallar(data.error ?? "Error al iniciar sesión.");
        return;
      }
      if (data.requiereSeleccion) {
        setSucursalesParaElegir(data.sucursales);
        return;
      }
      setExito(true);
      router.push("/");
    } catch {
      setCargando(false);
      fallar("No se pudo conectar. Inténtalo de nuevo.");
    }
  }

  async function elegirSucursal(sucursalId: string) {
    setError(null);
    setCargando(true);

    try {
      const res = await fetch("/api/auth/login/sucursal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, sucursalId }),
      });
      setCargando(false);

      if (!res.ok) {
        const data = await res.json();
        fallar(data.error ?? "Error al iniciar sesión.");
        return;
      }
      setExito(true);
      router.push("/");
    } catch {
      setCargando(false);
      fallar("No se pudo conectar. Inténtalo de nuevo.");
    }
  }

  function volverACredenciales() {
    setSucursalesParaElegir(null);
    setError(null);
  }

  const estado: EstadoLogin = exito ? "exito" : cargando ? "cargando" : error ? "error" : "reposo";

  return {
    email,
    setEmail,
    password,
    setPassword,
    verPassword,
    alternarVerPassword: () => setVerPassword((v) => !v),
    error,
    errorVez,
    cargando,
    estado,
    sucursalesParaElegir,
    manejarSubmitCredenciales,
    elegirSucursal,
    volverACredenciales,
  };
}
