# ADR-010: Pago único por membresía — retirar los pagos fraccionados (abonos)

Estado: **propuesto** (2026-11-12) · Decisión del cliente: "no hay pagos fraccionados, un solo pago y ya" · Pendiente P-16/P-17/P-18

## Contexto
El repo base permite **abonos**: el miembro paga una parte y entra hasta una fecha límite; el saldo se cobra después. Esto atraviesa el sistema: `Plan.permitePagoParcial` y `minimoAbono*`, `ReglaAbonoPorFrecuencia` (con pantalla de configuración), `Suscripcion.fechaLimiteAbono`, `ReglaAbono.ts`, `CobrarAbonoPendiente`, `ListarAbonosPendientes`, `proyeccionAbono.ts`, "Cobrar deudas", estados del kiosco y reglas de acceso en `RegistrarCheckIn`. Hay **78 archivos** que mencionan "abono" (53 de código, 11 de tests). **Verificado en el fuente (v0.3):** el abono no está aislado, sino entrelazado en `RegistrarPago` (511 líneas, no transaccional) con multi-mes, pago retroactivo, "cobrar deudas" (`completarCicloAbierto`), tolerancia y `saldoAFavor`. Adhara Fit no fracciona pagos.

## Decisión
- Cada membresía se paga **completa en un solo acto** (precio del plan × meses adelantados).
- Se elimina todo lo anterior; no se oculta con un indicador (flag), se borra. Incluye `evaluarAbonoParcial`, `saldoNecesario`, `excedenteASaldo`, `validarLineasDePago(..., "conAbono")`, `Miembro.saldoAFavor`, `Suscripcion.fechaLimiteAbono`, el estado `abono_vencido` y la tolerancia.
- `RegistrarPago` se **reescribe** (no se poda): una operación atómica (transacción) que crea el pago, extiende o crea la suscripción y actualiza el miembro. Se conservan multi-mes (≤ 6), pago con fecha pasada (≤ 90 d, se revalida) y anulación.
- Antes de tocarlo se escriben tests de integración sobre el comportamiento actual (tarea 0.11).
- El acceso queda en tres estados: **activo**, **gracia** (si se mantiene, P-18) y **vencido**.
- Una persona que no puede pagar un mes elige un plan más corto (diario, semanal, quincenal) o se le registra un descuento fijo en el precio del plan.
- El **fiado de productos** (`DeudaProducto`) es un tema distinto y sigue a P-06.
- Pago dividido entre métodos (efectivo + Yape) queda a P-16; si se prohíbe, `grupoPagoId` y las líneas múltiples se simplifican a una sola línea.

## Alternativas
| Alternativa | Contras |
|---|---|
| **A. Eliminar el código (elegida)** | Refactor XL (≈ 78 archivos), pero deja un dominio más simple y menos reglas que probar |
| B. Dejar el código y desactivarlo con un indicador por plan | Mantiene complejidad muerta, pantallas y tests; riesgo de activarlo por error |
| C. Mantener abonos "por si acaso" | Contradice la regla del negocio |

## Consecuencias
- (+) Caja y arqueo más simples; "morosos" = vencidos; se elimina la tolerancia y el saldo pendiente.
- (+) Kiosco con menos estados y mensajes.
- (+) Menos migraciones: el baseline ya nace sin estas tablas ni columnas.
- (−) Sin flexibilidad para clientes que pagan por partes; riesgo comercial a validar con Adhara.
- (−) Trabajo concentrado en Fase 1 (tarea 1.3b); conviene hacerlo **antes** del cambio de moneda para no adaptar a PEN código que se va a borrar.
