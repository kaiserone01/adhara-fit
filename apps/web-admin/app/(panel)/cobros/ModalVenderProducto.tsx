"use client";

import { formatearSoles } from "@gym-app/domain/utils/formatearSoles";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@gym-app/ui/components/Button";
import { useFeedback } from "@gym-app/ui/components/FeedbackOverlay";
import type { Producto } from "@gym-app/domain/entities/Producto";
import type { MetodoPago } from "@gym-app/domain/entities/MetodoPago";
import { totalRenglones } from "@gym-app/domain/use-cases/resolverItemsVenta";
import { SelectorMetodoPago } from "../pagos/SelectorMetodoPago";
import { CampoNumeroOperacion } from "../pagos/CampoNumeroOperacion";
import { MetodoYCampos } from "../pagos/MetodoYCampos";
import { ColumnaLateral, ColumnaPrincipal, MarcoAsistente, TituloSeccion } from "./MarcoAsistente";
import { normalizarTexto } from "@/lib/normalizarTexto";
import type { EstadoVenderProducto } from "./actions";

const ID_FORMULARIO = "formulario-vender-producto";


interface Seleccion {
  metodoPagoId: string | null;
  metodo: string;
  numeroOperacion: string;
  requiereNumeroOperacion: boolean;
}

const SELECCION_VACIA: Seleccion = {
  metodoPagoId: null,
  metodo: "",
  numeroOperacion: "",
  requiereNumeroOperacion: false,
};

interface ItemCarrito {
  productoId: string;
  cantidad: number;
}

export function ModalVenderProducto({
  accion,
  productos,
  metodosPago,
  onCerrar,
}: {
  accion: (estado: EstadoVenderProducto, formData: FormData) => Promise<EstadoVenderProducto>;
  productos: Producto[];
  metodosPago: MetodoPago[];
  onCerrar: () => void;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const { mostrarExito, mostrarError } = useFeedback();

  const [paso, setPaso] = useState<1 | 2>(1);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [seleccion, setSeleccion] = useState<Seleccion>(SELECCION_VACIA);

  const error = estado.error;
  const ok = estado.ok;

  useEffect(() => {
    if (error) mostrarError(error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo resultado, no a mostrarError
  }, [estado]);

  useEffect(() => {
    if (ok) {
      mostrarExito(ok);
      onCerrar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un nuevo ok, no a mostrarExito/onCerrar
  }, [ok]);

  const renglones = carrito.flatMap((item) => {
    const producto = productos.find((p) => p.id === item.productoId);
    return producto ? [{ producto, cantidad: item.cantidad, productoNombre: producto.nombre, precioUnitarioUSD: producto.costoUSD }] : [];
  });
  const total = totalRenglones(renglones);
  const unidades = renglones.reduce((suma, r) => suma + r.cantidad, 0);
  const enCarrito = (id: string) => carrito.find((i) => i.productoId === id)?.cantidad ?? 0;

  const textoBusqueda = normalizarTexto(busqueda.trim());
  const productosFiltrados = textoBusqueda
    ? productos.filter((p) => normalizarTexto(`${p.nombre} ${p.descripcion ?? ""}`).includes(textoBusqueda))
    : productos;

  function cambiarCantidad(productoId: string, delta: number) {
    setCarrito((actual) => {
      const existente = actual.find((i) => i.productoId === productoId);
      if (!existente) return delta > 0 ? [...actual, { productoId, cantidad: delta }] : actual;
      const cantidad = existente.cantidad + delta;
      return cantidad < 1
        ? actual.filter((i) => i.productoId !== productoId)
        : actual.map((i) => (i.productoId === productoId ? { ...i, cantidad } : i));
    });
  }

  const numeroOperacionValido = !seleccion.requiereNumeroOperacion || /^\d{4}$/.test(seleccion.numeroOperacion);
  const puedeEnviar = seleccion.metodoPagoId !== null && numeroOperacionValido;

  const items = carrito.map(({ productoId, cantidad }) => ({ productoId, cantidad }));
  const lineas = [
    {
      monto: total,
      metodo: seleccion.metodo,
      metodoPagoId: seleccion.metodoPagoId,
      numeroOperacion: seleccion.requiereNumeroOperacion ? seleccion.numeroOperacion : null,
    },
  ];


  const etiquetaTotal = (
    <div className="flex items-baseline justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--gx-edge)" }}>
      <span className="text-lg font-semibold" style={{ color: "var(--gx-ink)" }}>
        Total {formatearSoles(total)}
      </span>
    </div>
  );

  return (
    <MarcoAsistente titulo="Vender producto" etiqueta={`Paso ${paso} de 2 · ${paso === 1 ? "Elige los productos" : "Cobrar"}`} onCerrar={onCerrar}>
      {productos.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
          No hay productos activos. Créalos en la sección Productos.
        </p>
      ) : paso === 1 ? (
        <>
          <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:flex-1">
            <input
              type="search"
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              aria-label="Buscar producto"
              className="min-h-12 w-full shrink-0 rounded-lg border px-4 lg:max-w-md gx-campo"
            />

            <div className="grid min-h-40 flex-1 auto-rows-max grid-cols-2 content-start gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {productosFiltrados.length === 0 && (
                <p className="col-span-full py-6 text-center text-sm" style={{ color: "var(--gx-muted)" }}>
                  Ningún producto coincide con &quot;{busqueda.trim()}&quot;.
                </p>
              )}
              {productosFiltrados.map((p) => {
                const cantidad = enCarrito(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => cambiarCantidad(p.id, 1)}
                    aria-label={`Agregar ${p.nombre}`}
                    className="relative flex flex-col gap-1.5 rounded-xl border-2 p-2.5 text-left transition-colors duration-150"
                    style={{
                      borderColor: cantidad > 0 ? "var(--gx-accent)" : "var(--gx-edge)",
                      background: cantidad > 0 ? "color-mix(in srgb, var(--gx-accent) 12%, transparent)" : "var(--gx-surface-2)",
                    }}
                  >
                    {cantidad > 0 && (
                      <span
                        className="absolute right-1.5 top-1.5 z-10 min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-bold"
                        style={{ background: "var(--gx-accent)", color: "var(--gx-accent-ink)" }}
                      >
                        {cantidad}
                      </span>
                    )}
                    <div className="h-24 w-full overflow-hidden rounded-lg" style={{ background: "var(--gx-surface)" }}>
                      {p.fotoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- foto en R2 (dominio externo)
                        <img src={p.fotoUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span
                      title={p.nombre}
                      className="line-clamp-2 min-h-[2.5em] break-words text-sm font-medium leading-tight"
                      style={{ color: "var(--gx-ink)" }}
                    >
                      {p.nombre}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--gx-accent)" }}>
                      {formatearSoles(p.costoUSD)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <ColumnaLateral>
            <TituloSeccion>Carrito{unidades > 0 ? ` · ${unidades}` : ""}</TituloSeccion>
            <div className="flex min-h-24 flex-col gap-2 lg:flex-1 lg:overflow-y-auto">
              {renglones.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm" style={{ borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }}>
                  Toca un producto para agregarlo al carrito.
                </p>
              ) : (
                renglones.map((r) => (
                  <div key={r.producto.id} className="flex flex-col gap-2 rounded-xl p-3" style={{ background: "var(--gx-surface-2)" }}>
                    <span className="line-clamp-2 break-words text-sm font-medium leading-tight" style={{ color: "var(--gx-ink)" }}>
                      {r.producto.nombre}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Button type="button" variant="secundario" aria-label={`Quitar una unidad de ${r.producto.nombre}`} onClick={() => cambiarCantidad(r.producto.id, -1)}>
                          −
                        </Button>
                        <span className="w-6 text-center font-semibold" style={{ color: "var(--gx-ink)" }}>
                          {r.cantidad}
                        </span>
                        <Button type="button" variant="secundario" aria-label={`Agregar una unidad de ${r.producto.nombre}`} onClick={() => cambiarCantidad(r.producto.id, 1)}>
                          +
                        </Button>
                      </span>
                      <span className="font-semibold" style={{ color: "var(--gx-ink)" }}>
                        {formatearSoles(totalRenglones([r]))}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
            {etiquetaTotal}
            <div className="flex gap-3">
              <Button type="button" variant="secundario" className="min-h-12 flex-1 text-base" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button type="button" className="min-h-12 flex-1 text-base" disabled={carrito.length === 0} onClick={() => setPaso(2)}>
                Continuar
              </Button>
            </div>
          </ColumnaLateral>
        </>
      ) : (
        <>
          <form id={ID_FORMULARIO} action={enviar} className="contents">
            <input type="hidden" name="items" value={JSON.stringify(items)} />
            <input type="hidden" name="lineas" value={JSON.stringify(lineas)} />

            <ColumnaPrincipal>
              <TituloSeccion>Método de pago</TituloSeccion>
                  <MetodoYCampos
                    vacio={seleccion.metodoPagoId ? "Este método no requiere número de operación." : "Elige un método de pago."}
                    selector={
                      <SelectorMetodoPago
                        compacto
                        grande
                        metodos={metodosPago}
                        idFormulario={ID_FORMULARIO}
                        onCambio={setSeleccion}
                        ocultarNumeroOperacion
                        numeroOperacion={seleccion.numeroOperacion}
                        onCambioNumeroOperacion={(valor) => setSeleccion((prev) => ({ ...prev, numeroOperacion: valor }))}
                      />
                    }
                    campos={
                      seleccion.requiereNumeroOperacion && (
                        <CampoNumeroOperacion
                          value={seleccion.numeroOperacion}
                          onChange={(valor) => setSeleccion((prev) => ({ ...prev, numeroOperacion: valor }))}
                        />
                      )
                    }
                  />
            </ColumnaPrincipal>
          </form>

          <ColumnaLateral>
            <TituloSeccion>Resumen</TituloSeccion>
            <div className="flex flex-col gap-2 rounded-xl p-4 lg:flex-1 lg:overflow-y-auto" style={{ background: "var(--gx-surface-2)" }}>
              {renglones.map((r) => (
                <div key={r.producto.id} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words" style={{ color: "var(--gx-ink)" }}>
                    {r.producto.nombre}
                    {r.cantidad > 1 ? ` × ${r.cantidad}` : ""}
                  </span>
                  <span className="shrink-0" style={{ color: "var(--gx-muted)" }}>
                    {formatearSoles(totalRenglones([r]))}
                  </span>
                </div>
              ))}
            </div>
            {etiquetaTotal}
            <div className="flex gap-3">
              <Button type="button" variant="secundario" className="min-h-12 flex-1 text-base" onClick={() => setPaso(1)}>
                Volver
              </Button>
              <Button type="submit" form={ID_FORMULARIO} className="min-h-12 flex-1 text-base" disabled={!puedeEnviar || enviando}>
                {enviando ? "Registrando..." : "Registrar venta"}
              </Button>
            </div>
          </ColumnaLateral>
        </>
      )}
    </MarcoAsistente>
  );
}
