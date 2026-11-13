"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { Input } from "@gym-app/ui/components/Input";
import { Card } from "@gym-app/ui/components/Card";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { EstadoFormularioUsuario } from "./actions";

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export function CampoFoto({ nombreActual, fotoUrlActual }: { nombreActual: string; fotoUrlActual?: string | null }) {
  const [fotoPreview, setFotoPreview] = useState<string | null>(fotoUrlActual ?? null);

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-semibold"
        style={{ background: "var(--gx-surface-2)", color: "var(--gx-muted)" }}
      >
        {fotoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo elegido en el cliente, no un asset del proyecto
          <img src={fotoPreview} alt="" className="h-full w-full object-cover" />
        ) : (
          iniciales(nombreActual || "?")
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--gx-muted)" }}>
        Foto de perfil
        <input
          type="file"
          name="foto"
          accept="image/*"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) setFotoPreview(URL.createObjectURL(archivo));
          }}
          className="gx-archivo"
        />
      </label>
    </div>
  );
}

export function FormularioUsuario({
  accion,
}: {
  accion: (estado: EstadoFormularioUsuario, formData: FormData) => Promise<EstadoFormularioUsuario>;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const { mostrarError } = useFeedback();
  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error, no a mostrarError
  }, [estado.error]);

  return (
    <div className="flex max-w-md flex-col gap-4">
      {estado.error && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: "color-mix(in srgb, var(--gx-bad) 15%, transparent)", color: "var(--gx-bad)" }}
        >
          {estado.error}
        </p>
      )}

      <Card>
        <form action={enviar} className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--gx-muted)" }}>
            Datos del administrador
          </h2>

          <CampoFoto nombreActual="" />
          <Input name="nombre" label="Nombre" required />
          <Input name="telefono" label="Teléfono (opcional)" type="tel" />

          <div className="grid grid-cols-2 gap-4">
            <Input name="email" label="Correo" type="email" required />
            <Input name="password" label="Contraseña (mín. 8)" type="password" required minLength={8} />
          </div>

          <Button type="submit" disabled={enviando}>
            {enviando ? "Creando..." : "Crear administrador"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function FormularioEditarUsuario({
  accion,
  nombreInicial,
  email,
  telefonoInicial,
  fotoUrlActual,
}: {
  accion: (estado: EstadoFormularioUsuario, formData: FormData) => Promise<EstadoFormularioUsuario>;
  nombreInicial: string;
  email: string;
  telefonoInicial: string | null;
  fotoUrlActual: string | null;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const { mostrarExito, mostrarError } = useFeedback();

  useEffect(() => {
    if (estado.error) mostrarError(estado.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.error, no a mostrarError
  }, [estado.error]);

  useEffect(() => {
    if (estado.ok) mostrarExito(estado.ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo estado.ok, no a mostrarExito
  }, [estado.ok]);

  return (
    <form action={enviar} className="flex max-w-md flex-col gap-4">
      {estado.error && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: "color-mix(in srgb, var(--gx-bad) 15%, transparent)", color: "var(--gx-bad)" }}
        >
          {estado.error}
        </p>
      )}
      <CampoFoto nombreActual={nombreInicial} fotoUrlActual={fotoUrlActual} />
      <Input name="nombre" label="Nombre" required defaultValue={nombreInicial} />
      <Input name="telefono" label="Teléfono (opcional)" type="tel" defaultValue={telefonoInicial ?? ""} />
      <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
        Correo: {email}
      </p>
      <Button type="submit" disabled={enviando}>
        {enviando ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
