import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type KeyboardEvent } from "react";
import { mensajeDeTecla, type MensajeTeclado } from "./teclasNumpad";

export const TIEMPO_INACTIVIDAD_MS = 7_000;
// Máscara de entrada: el documento más largo es el CE (12 dígitos); el servidor admite hasta 20 por tolerancia.
export const MAX_LARGO_IDENTIFICADOR = 12;

const sinSuscripcion = () => () => {};
const esAndroid = () => /Android/i.test(navigator.userAgent);
const sinHostEnServidor = () => false;

interface Opciones {
  // Cada vez que se escribe o borra (opcional).
  alEscribir?: () => void;
  alEnviar: (identificador: string) => Promise<void>;
}

// Fuente del identificador: en el APK de Android TV, un keydown global solo de numpad (sin <input>, para que no
// salga el teclado en pantalla) y, en un navegador normal, un <input> de tipo contraseña. La pantalla nunca
// muestra lo tecleado (ADR-004): solo un punto por carácter.
export function useEntradaIdentificador({ alEscribir, alEnviar }: Opciones) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [identificador, setIdentificador] = useState("");
  // Espejo síncrono: "dígito + Enter" seguidos deben ver el valor actual sin esperar al render.
  const identificadorRef = useRef("");
  const opciones = useRef({ alEscribir, alEnviar });
  const android = useSyncExternalStore(sinSuscripcion, esAndroid, sinHostEnServidor);
  // Mientras se envía un identificador se ignora todo: evita el doble envío y dígitos que se perderían.
  const enviandoRef = useRef(false);

  useEffect(() => {
    opciones.current = { alEscribir, alEnviar };
  });

  const asignar = useCallback((valor: string) => {
    identificadorRef.current = valor;
    setIdentificador(valor);
  }, []);

  const manejar = useCallback(
    (mensaje: MensajeTeclado) => {
      if (enviandoRef.current) return;
      const { alEscribir, alEnviar } = opciones.current;

      switch (mensaje.type) {
        case "digit":
          if (!/^\d$/.test(mensaje.value)) return;
          if (identificadorRef.current.length >= MAX_LARGO_IDENTIFICADOR) return;
          alEscribir?.();
          asignar(identificadorRef.current + mensaje.value);
          return;
        case "backspace":
          alEscribir?.();
          asignar(identificadorRef.current.slice(0, -1));
          return;
        case "clear":
          alEscribir?.();
          asignar("");
          return;
        case "enter":
          // Enter con la entrada vacía no envía nada.
          if (!identificadorRef.current) return;
          enviandoRef.current = true;
          alEnviar(identificadorRef.current).finally(() => {
            enviandoRef.current = false;
          });
      }
    },
    [asignar]
  );

  useEffect(() => {
    if (!android) return;

    const alTeclear = (evento: globalThis.KeyboardEvent) => {
      const mensaje = mensajeDeTecla(evento);
      if (!mensaje) return;
      evento.preventDefault();
      // Mantener una tecla pulsada no debe repetir dígitos ni, peor, el Enter.
      if (evento.repeat) return;
      manejar(mensaje);
    };

    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [android, manejar]);

  // Un identificador a medias que nadie termina de teclear no debe quedar a la vista del siguiente socio.
  // Cada tecla reinicia la cuenta (cambia `identificador`).
  useEffect(() => {
    if (!identificador) return;
    const temporizador = setTimeout(() => asignar(""), TIEMPO_INACTIVIDAD_MS);
    return () => clearTimeout(temporizador);
  }, [identificador, asignar]);

  // Sin Android, el checkin tiene un teclado numérico físico y no pantalla táctil (ADR v1 §2.5):
  // el input siempre debe estar enfocado para capturarlo sin que el staff toque nada.
  useEffect(() => {
    if (!android) inputRef.current?.focus();
  });

  const propsInput = {
    ref: inputRef,
    type: "password" as const,
    autoComplete: "off",
    maxLength: MAX_LARGO_IDENTIFICADOR,
    value: identificador,
    onChange: (evento: ChangeEvent<HTMLInputElement>) => {
      opciones.current.alEscribir?.();
      asignar(evento.target.value.replace(/\D/g, "").slice(0, MAX_LARGO_IDENTIFICADOR));
    },
    onKeyDown: (evento: KeyboardEvent<HTMLInputElement>) => {
      if (evento.key === "Enter") manejar({ type: "enter" });
      if (evento.key === "Escape") asignar("");
    },
    onBlur: () => inputRef.current?.focus(),
    inputMode: "numeric" as const,
    autoFocus: true,
  };

  // `enviarActual` deja que el indicador «Presiona Enter» envíe lo tecleado al tocarlo (pantalla táctil).
  return { identificador, limpiar: () => asignar(""), sinInput: android, propsInput, enviarActual: () => manejar({ type: "enter" }) };
}
