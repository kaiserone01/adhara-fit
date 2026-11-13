"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { CurrencyInput } from "@gym-app/ui/components/CurrencyInput";
import { Card } from "@gym-app/ui/components/Card";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { EstadoAbrirTurno } from "./actions";
import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";

export interface UltimoCierreFormulario {
  turnoId: string;
  cerradoEn: string;
  efectivoContado: number | null;
}

export function FormularioAbrirTurno({
  accion,
  requiereSucursal,
  sucursales,
  ultimoCierre,
}: {
  accion: (estado: EstadoAbrirTurno, formData: FormData) => Promise<EstadoAbrirTurno>;
  requiereSucursal: boolean;
  sucursales: Array<{ id: string; nombre: string }>;
  // Cuando ya se sabe la sucursal (fija, o la única visible) llega
  // resuelto desde el servidor. Cuando hay que elegir sucursal
  // (requiereSucursal), llega null y se consulta acá mismo al cambiar
  // el <select> (ver /api/caja/ultimo-cierre).
  ultimoCierre: UltimoCierreFormulario | null;
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

  const [cierre, setCierre] = useState<UltimoCierreFormulario | null>(ultimoCierre);
  const [cargandoCierre, setCargandoCierre] = useState(false);
  const [sucursalElegida, setSucursalElegida] = useState("");

  // Los campos de fondo inicial son "sugerencia editable": arrancan con
  // lo contado en el cierre anterior, pero el operador los puede cambiar
  // (ver diseño acordado — puede haber diferencias reales, ej. retiraron
  // parte para depósito).
  const [fondo, setFondo] = useState(cierre?.efectivoContado != null ? String(cierre.efectivoContado) : "0");

  async function alCambiarSucursal(sucursalId: string) {
    setSucursalElegida(sucursalId);
    setCierre(null);
    if (!sucursalId) return;

    setCargandoCierre(true);
    try {
      const res = await fetch(`/api/caja/ultimo-cierre?sucursalId=${sucursalId}`);
      const datos: UltimoCierreFormulario | null = res.ok ? await res.json() : null;
      setCierre(datos);
      setFondo(datos?.efectivoContado != null ? String(datos.efectivoContado) : "0");
    } finally {
      setCargandoCierre(false);
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      {/* Sin esto, quien abre un turno no tiene forma de saber cuánto
          efectivo quedó físicamente en caja tras el cierre anterior —
          antes había que preguntarle a quien cerró (ver diseño acordado). */}
      {(requiereSucursal ? sucursalElegida !== "" : true) && (
        <Card className="text-sm">
          <h3 className="mb-2 font-semibold" style={{ color: "var(--gx-ink)" }}>
            Último cierre
          </h3>
          {cargandoCierre && <p style={{ color: "var(--gx-muted)" }}>Consultando...</p>}
          {!cargandoCierre && cierre === null && (
            <p style={{ color: "var(--gx-muted)" }}>Todavía no hay turnos cerrados en esta sucursal.</p>
          )}
          {!cargandoCierre && cierre !== null && (
            <>
              <p className="mb-2 text-xs" style={{ color: "var(--gx-muted)" }}>
                {new Date(cierre.cerradoEn).toLocaleString("es-PE", { timeZone: "America/Lima" })}
              </p>
              <div className="flex justify-between">
                <span style={{ color: "var(--gx-muted)" }}>Efectivo contado</span>
                <span className="font-medium" style={{ color: "var(--gx-ink)" }}>
                  {formatearSoles(cierre.efectivoContado ?? 0)}
                </span>
              </div>
            </>
          )}
        </Card>
      )}

      <Card>
        <form action={enviar} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--gx-ink)" }}>
            Abrir turno
          </h2>

          {estado.error && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: "color-mix(in srgb, var(--gx-bad) 15%, transparent)", color: "var(--gx-bad)" }}
            >
              {estado.error}
            </p>
          )}

          {requiereSucursal && (
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--gx-muted)" }}>
              Sucursal
              <select
                name="sucursalId"
                required
                value={sucursalElegida}
                onChange={(e) => alCambiarSucursal(e.target.value)}
                className="min-h-11 rounded-lg border px-3 gx-campo"
              >
                <option value="">Selecciona una sucursal</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          <CurrencyInput name="fondoInicialEfectivoUSD" label="Fondo inicial en efectivo" required value={fondo} onChange={setFondo} />
          <p className="text-xs" style={{ color: "var(--gx-muted)" }}>
            Solo el efectivo físico en caja — no incluye bancos ni puntos de venta. Se sugiere lo contado en el
            último cierre; puedes ajustarlo si es distinto.
          </p>

          <Button type="submit" disabled={enviando}>
            {enviando ? "Abriendo..." : "Abrir turno"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
