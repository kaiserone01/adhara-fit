"use client";

import type { ChangeEvent } from "react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { TipoMedio, VitrinaItem } from "@gym-app/domain/entities/Vitrina";
import { diaCalendarioLima } from "@gym-app/domain/utils/fechaLima";
import { guardarItemAction } from "./actions";
import { SelectorMedio } from "./SelectorMedio";

const dia = (fecha: Date | null) => (fecha ? diaCalendarioLima(fecha).toISOString().slice(0, 10) : "");

// Con `alCambiar` el interruptor es controlado (conserva la elección mientras el formulario siga montado).
function Interruptor({ nombre, etiqueta, marcado, alCambiar }: { nombre: string; etiqueta: string; marcado: boolean; alCambiar?: (marcado: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm" style={{ color: "var(--gx-ink)" }}>
      <input
        type="checkbox"
        name={nombre}
        {...(alCambiar ? { checked: marcado, onChange: (e: ChangeEvent<HTMLInputElement>) => alCambiar(e.target.checked) } : { defaultChecked: marcado })}
        className="h-5 w-5"
        style={{ accentColor: "var(--gx-accent)" }}
      />
      {etiqueta}
    </label>
  );
}

export function FormularioVitrinaItem({ item }: { item?: VitrinaItem }) {
  const [estado, enviar, enviando] = useActionState(guardarItemAction, {});
  const { mostrarError } = useFeedback();
  const [subiendo, setSubiendo] = useState(false);
  const [sonido, setSonido] = useState(item?.sonido ?? false); // se conserva al ir video -> imagen -> video
  const [tipoMedio, setTipoMedio] = useState<TipoMedio | null>(item?.mediaTipo ?? null);
  const formulario = useRef<HTMLFormElement>(null);
  const mensajeError = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!estado.error) return;
    mostrarError(estado.error);
    // El primer campo inválido recibe el foco tras un envío fallido; si no hay, el mensaje de error.
    const primero = formulario.current?.querySelector<HTMLElement>(":invalid") ?? mensajeError.current;
    primero?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado
  }, [estado]);

  return (
    <form
      ref={formulario}
      // Se envía dentro de una transición (en vez de action=) para que React no reinicie los campos si el servidor rechaza los datos.
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => enviar(datos));
      }}
      className="flex max-w-2xl flex-col gap-5"
    >
      {item && <input type="hidden" name="id" value={item.id} />}
      {/* Los ítems antiguos (entrenador, producto) conservan su tipo; las piezas nuevas son todas iguales. */}
      <input type="hidden" name="tipo" value={item?.tipo ?? "PROMO"} />

      <SelectorMedio
        alOcupar={setSubiendo}
        alCambiarTipo={setTipoMedio}
        inicial={item ? { mediaUrl: item.mediaUrl, mediaTipo: item.mediaTipo, posterUrl: item.posterUrl } : undefined}
      />

      <Input label="Nombre (solo para identificarla en el panel)" name="nombre" defaultValue={item?.nombre ?? ""} maxLength={60} />

      {tipoMedio === "VIDEO" && (
        <div>
          <Interruptor nombre="sonido" etiqueta="Con sonido" marcado={sonido} alCambiar={setSonido} />
          <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
            Si está activo, el video se oye en la TV.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Duración (segundos, vacío = la general)" name="duracionSeg" inputMode="numeric" defaultValue={item?.duracionSeg ?? ""} />
        <Input label="Mostrar desde" name="inicio" type="date" defaultValue={dia(item?.inicio ?? null)} />
        <Input label="Mostrar hasta (incluido)" name="fin" type="date" defaultValue={dia(item?.fin ?? null)} />
      </div>

      <div className="flex flex-col gap-2">
        {estado.error && (
          <p ref={mensajeError} tabIndex={-1} role="alert" className="text-sm outline-none" style={{ color: "var(--gx-bad)" }}>
            {estado.error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={enviando || subiendo}>
            {enviando ? "Guardando…" : subiendo ? "Subiendo archivo…" : "Guardar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
