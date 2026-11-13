"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type EstadoLogin = "reposo" | "cargando" | "exito" | "error";

/** Estado y envío del login (un solo paso: POST /api/auth/login). La UI solo consume este hook. */
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
      setExito(true);
      router.push("/");
    } catch {
      setCargando(false);
      fallar("No se pudo conectar. Inténtalo de nuevo.");
    }
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
    manejarSubmitCredenciales,
  };
}
