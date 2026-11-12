# ADR-010: Pago único por membresía — retirar los pagos fraccionados (abonos)

Estado: **propuesto** (2026-11-12) · Decisión del cliente: "no hay pagos fraccionados, un solo pago y ya" · Pendiente P-16/P-17/P-18

## Contexto
El repo base permite **abonos**: el miembro paga una parte y entra hasta una fecha límite; el saldo se cobra después. Esto atraviesa el sistema: `Plan.permitePagoParcial` y `minimoAbono*`, `ReglaAbonoPorFrecuencia` (con pantalla de configuración), `Suscripcion.fechaLimiteAbono`, `ReglaAbono.ts`, `CobrarAbonoPendiente`, `ListarAbonosPendientes`, `proyeccionAbono.ts`, "Cobrar deudas", estados del kiosco y reglas de acceso en `RegistrarCheckIn`. Hay **78 archivos** que mencionan "abono" (53 de código, 11 de tests). **Verificado en el fuente (v0.3):** el abono no está aislado, sino entrelazado en `RegistrarPago` (511 líneas, no transaccional) con multi-mes, pago retroactivo, "cobrar deudas" (`completarCicloAbierto`), tolerancia y `saldoAFavor`. Adhara Fit no fracciona pagos.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- Regla de negocio del cliente: "no hay pagos fraccionados, un solo pago y ya".
- Los abonos están entrelazados en `RegistrarPago` (511 líneas, no transaccional; doc 09 §3.1, doc 11 DI-64).
- Menos reglas, estados y tests; caja y arqueo más simples.
- Riesgo comercial para clientes que pagan por partes.

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

## Cómo se valida
*(Pase formal F.)*
- **Specs:** S-04 (pago único y suscripciones) y S-07 (cambio de plan). Tests de caracterización previos (tarea 0.11) y tests primero (ADR-016).
- **Invariantes a fijar:** el pago y su suscripción se crean en una sola transacción; no hay pago sin turno abierto (doc 11 H-01, P-23).

## Reversibilidad
*(Pase formal F.)* Baja: el ADR decide borrar el código de abonos, no ocultarlo con un indicador.

## Dependencias
*(Pase formal F.)* ADR-011 (importes exactos), ADR-016 (pruebas), orden respecto a ADR-003 (tarea 1.3b antes de 1.4). Pendientes P-16, P-17 y P-18. Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.

## Enmiendas posteriores (2026-11-12)
*Derivadas de decisiones aceptadas por el propietario (ADR-018, ADR-019, ADR-020). El texto anterior se conserva; donde choca, rige esta sección.*
- El invariante «no hay pago sin turno» queda **sin efecto**: cobrar nunca exige un turno porque no existen turnos (ADR-018).
- El fiado de productos deja de ser «un tema distinto que sigue a P-06»: P-06 está respondida y el fiado se elimina (ADR-018). Siguen abiertas P-16, P-17 y P-18.

## Notas del propietario (2026-11-12)
- Confirmó en el chat: «pago único de membresía es un criterio decidido». Esto **no** cambia el estado del ADR: pasa a *aceptado* solo con su orden expresa «acepto ADR-nnn».
