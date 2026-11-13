"use client";

import { useEffect, useState } from "react";
import { CurrencyInput } from "@gym-app/ui/components/CurrencyInput";
import { Button } from "@gym-app/ui/components/Button";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { SelectorMetodoPago } from "../pagos/SelectorMetodoPago";

export interface LineaPagoMiembro {
  monto: number;
  metodoPagoId: string | null;
  metodo: string;
  numeroOperacion: string;
}

// Una de las líneas del primer pago dividido de un miembro nuevo: método de pago + monto en soles.
export function LineaPagoMiembroCampos({
  nombre,
  titulo,
  metodosPago,
  idFormulario,
  onCambio,
  onQuitar,
}: {
  nombre: string;
  titulo: string;
  metodosPago: MetodoPago[];
  idFormulario: string;
  onCambio: (linea: LineaPagoMiembro) => void;
  // Solo cuando hay más de dos pagos: quita esta línea.
  onQuitar?: () => void;
}) {
  const [monto, setMonto] = useState("");
  const [seleccion, setSeleccion] = useState<Omit<LineaPagoMiembro, "monto">>({
    metodoPagoId: null,
    metodo: "",
    numeroOperacion: "",
  });

  useEffect(() => {
    onCambio({ monto: Number(monto) || 0, ...seleccion });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCambio se reconstruye en cada render del padre
  }, [monto, seleccion]);

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border p-4" style={{ borderColor: "var(--gx-edge)" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: "var(--gx-ink)" }}>
          {titulo}
        </p>
        {onQuitar && (
          <Button type="button" variant="secundario" onClick={onQuitar}>
            Quitar
          </Button>
        )}
      </div>
      <SelectorMetodoPago
        metodos={metodosPago}
        onCambio={(s) => setSeleccion({ metodoPagoId: s.metodoPagoId, metodo: s.metodo, numeroOperacion: s.numeroOperacion })}
        idFormulario={idFormulario}
      />
      <CurrencyInput name={`${nombre}USD`} label="Monto" value={monto} onChange={setMonto} />
    </div>
  );
}
