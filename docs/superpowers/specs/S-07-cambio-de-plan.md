---
id: S-07
estado: aprobada
adrs: ADR-010, ADR-011, ADR-016, ADR-018, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-06, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-07 — Cambio de plan: una sola operación, sin saldo a favor y sin planes «con entrenador»

## 0. Contexto y alcance

### 0.1 Problema
El código heredado cambia el plan de un miembro por tres caminos que dan resultados distintos: editar el plan en la ficha (`ActualizarMiembro`) escala el tiempo transcurrido sin dinero, cambiar el plan con pago (`CambiarPlanConPago`) calcula el valor no consumido y cobra la diferencia, y cambiar la duración de un plan (`ActualizarFrecuenciaPlan`) recalcula a la vez todas las suscripciones de ese plan (doc 09 §3.2). Además cada plan puede ser «con» o «sin entrenador» y eso condiciona el cambio. El propietario decidió que no hay pagos repartidos ni saldo a favor (ADR-010), que no hay cobros de cortesía, y que todos los planes incluyen entrenador y este se asigna solo al miembro (`docs/datos-iniciales.md`). S-07 deja una sola operación, `cambiarPlan`, con el cálculo del valor no consumido del heredado (P-17: conservar), hecho con la aritmética exacta de S-03 y los días de Lima de S-02, atómica con el bloqueo de S-04 y anulable.

### 0.2 Dentro de alcance
- `calcularCambioPlan` reescrita con `dinero.ts` y `fechaLima` (el heredado usa `number`, `Math.round` y días de Caracas), compartida por el servidor y la vista previa, con el día de hoy de Lima tomado del servidor.
- `cambiarPlan` (reemplaza a `CambiarPlanConPago`): permiso, unidad de trabajo y bloqueo del miembro de S-04, orden de validación fijo, cobro idempotente por `cobroId`, un solo pago de un solo método por la diferencia, auditoría con vínculo al pago, y fechas escritas con `fijarVencimiento`.
- Anulación de un cobro de cambio de plan que también restaura el plan y el precio anteriores, y una definición del «cobro vigente más reciente» por orden de registro (`Pago.creadoEn`), que enmienda a S-04.
- Retiro de los otros dos caminos: el prorrateo sin pago de `ActualizarMiembro` (`prorratearVencimiento`), `ActualizarFrecuenciaPlan` y `ContarImpactoCambioPlan`.
- Simplificación del plan: sin `incluyeEntrenador` ni `frecuencia`; precio mayor que cero; `diasCiclo` entero de 1 a 365 y no editable después de crear el plan; contrato de `api/planes` y de los formularios de planes.
- El entrenador queda como dato opcional del miembro, sin relación con el plan.
- Esquema: `CambioPlanAuditoria` sin `modo` ni `origen`, con importes decimales y fechas como instante 05:00Z; `Pago.creadoEn`; se eliminan los enums `FrecuenciaPago`, `ModoCambioPlanAuditoria` y `OrigenCambioPlanAuditoria`.
- Pantallas: `FormularioCambiarPlan`, `PanelPagoYCambioPlan`, formularios y listados de planes, formulario del miembro y los tres archivos de `caja/` que usan el cambio de plan (`ModalRegistrarPagoCaja.tsx`, `SelectorMiembroModal.tsx` y `page.tsx`).
- `tools/verificar-plan.mjs` con su paso en el CI; retiro de los archivos de la familia S-07 de las exenciones de S-02, S-03 y S-04.

### 0.3 Fuera de alcance
- La reconstrucción de la caja, donde el asistente de cobro ofrece el cambio de plan: S-08 (aquí solo se adaptan los tres archivos de arriba a la nueva acción).
- Quién es el entrenador y cómo se registra (persona sin credenciales): S-18; `Miembro.entrenadorId` queda como está.
- Los planes iniciales (30, 60 y 90 días a 120.00, 200.00 y 280.00, `docs/datos-iniciales.md`) y el entrenador sembrado: S-15.
- El cobro a un miembro sin vencimiento vigente: `registrarPago` (S-04).
- Editar `Miembro.precioPlan` o el vencimiento desde la ficha: ya existe en la ficha (`miembros/actions.ts:263,303`) y no cambia; S-07 solo registra su efecto sobre el valor no consumido (SUP-S07-014).
- Las ramas `vieneDelExcel` de `ActualizarMiembro` y el padrón: S-10.
- Los permisos por módulo y el rol único: S-23.
- Deshacer un cambio de plan sin pago (diferencia de 0.00): no hay pago que anular; se corrige con otro cambio de plan.
- Cambio de plan con descuento o con un precio acordado distinto del de catálogo: no se prevé (SUP-S07-009).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-07 recibirá después de S-00 a S-06 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Tres caminos:** `ActualizarMiembro` prorratea al cambiar `planId` (`ActualizarMiembro.ts:59,108-133`, con `prorratearVencimiento` de `CalcularVencimientoPlan.ts` importado en `:7` y usado en `:124`); `CambiarPlanConPago` calcula y cobra (`CambiarPlanConPago.ts:121-265`); `ActualizarFrecuenciaPlan` reprorratea las suscripciones del plan (`ActualizarFrecuenciaPlan.ts:73-81`) y `ContarImpactoCambioPlan.ts:6-12` cuenta las afectadas (verificado con `Read`).
- **Cálculo:** `calcularCambioPlan` (`cambioPlanCalculo.ts:50-84`) usa `number`: `Math.round((precioViejo*100)/diasCicloViejo*diasRestantes)` para el valor no consumido (`:63-65`), cobra la diferencia si el valor es menor que el precio nuevo (`:80-83`) y, si es mayor, convierte el excedente en días con `Math.round` (`:68-75`); lanza `PlanCortesiaConTiempoRestanteError` si el plan nuevo cuesta 0 (`:30-34,59-61`) y usa `diaCalendarioCaracas` (`:1,51-52`) (verificado con `Read`).
- **Cobro:** `cambiarPlanConPago` exige `PAGOS CREAR` (`CambiarPlanConPago.ts:125-127`), aplica `MiembroFueraDeSucursalError` (`:134-137`, S-05), exige entrenador si el plan nuevo lo incluye (`:146-148`), falla sin ciclo vigente con `SinCicloVigenteError` (`:151-154`), toma el precio viejo del precio de catálogo del plan de la suscripción y solo si no existe usa `Miembro.precioPlan` (`:156-158`, con un comentario sobre el error de «vuelve a cobrar de menos» en `:117-120`), valida varias líneas de pago (`:190`), crea un pago por línea con `turnoId`, `tasaCambio` y `montoBs` (`:192-211`), fija `fechaUltimoPago = ahora` aunque no haya pago (`:223`) y escribe suscripción, miembro y auditoría sin transacción (`:215-257`) (verificado con `Read`).
- **Auditoría:** `CambioPlanAuditoria` (`schema.prisma:401-447`) guarda importes en centavos enteros, `modo` y `origen` (enums en `:375-400`) y ya tiene `pagoId` (`:437`, `CambiarPlanConPago.ts:255`), que es su único vínculo con el pago; `AJUSTAR_VENCIMIENTO` ya no se escribe (verificado con `Read`).
- **Plan:** `Plan` (`schema.prisma:192-`) tiene `frecuencia` (enum `FrecuenciaPago` de 7 valores, `:180`), `diasCiclo`, `incluyeEntrenador` (`:203`), `precioUSD` y los campos de abono que retira S-04; el seed del heredado crea planes con y sin entrenador (`sembrarOrganizacionZipGym.ts:40-44`). `Plan.frecuencia` también lo lee `planFrecuencia` en `PrismaCheckInRepository.ts:69`, `CheckIn.ts:26` y `ListarEnSala.ts:83` para los días de gracia que retira S-04 (verificado con `grep -rn planFrecuencia`).
- **Alcance en código:** `incluyeEntrenador` en 15 archivos, `FrecuenciaPago` en 22 (5 son de `ReglaAbono*`, que retira S-04), `CambiarPlanConPago` en 10 (6 son solo comentarios), `cambiarPlanConPago` en 3, `CambioPlanAuditoria` en 7, `FormularioCambiarPlan` en 6, `PanelPagoYCambioPlan` en 1, `calcularCambioPlan` en 5, `prorratearVencimiento` en 3, `ActualizarFrecuenciaPlan` en 3, `contarImpactoCambioPlan` en 2, `EntrenadorRequeridoError` en 2 (verificado con `grep -rIlF` sobre `apps` y `packages` sin `packages/db`).
- **Entrenador y plan:** `FormularioMiembro.tsx:241` marca `requiereEntrenador` según `incluyeEntrenador` y `:715` muestra «con entrenador»; `FormularioCambiarPlan.tsx:173` hace lo mismo; `FormularioPlan.tsx:133,212,330,374` y `planes/page.tsx:64,115` muestran «Incluido»; `planes/actions.ts:57,135` y `api/planes/route.ts:70` lo leen; `Miembro.entrenadorId` es opcional (`Miembro.ts:11,33,51`) (verificado con `grep -n`).
- **Acciones y pantallas:** `cambiarPlanAction` (`pagos/actions.ts:265`) recibe `lineas`, `sucursalIdPago`, `entrenadorId` y `origen` («miembro» o «caja», `:273-277,281,390-392`), devuelve `saldoAFavorGenerado` y redirige o devuelve estado según el origen; `caja/page.tsx:36,137` la pasa a `ModalRegistrarPagoCaja.tsx`, que importa `FormularioCambiarPlan`, `EntrenadorParaCambio` y `ProyeccionCambioPlan` (`:35`), recibe `entrenadores` y `accionCambiarPlan` (`:166-186,1111-1124`) y usa `FrecuenciaPago` (`:6,46,500`); `FormularioCambiarPlan.tsx` (408 líneas) calcula la vista previa con `hoy: new Date()` del navegador (`:156-158`); `PanelPagoYCambioPlan.tsx` lo usa en `:108` y le pasa `fechaVencimientoActual` (`:30,55,126`); la ficha edita `precioPlan` (`miembros/actions.ts:263,303`) y pasa `planId` a `actualizarMiembro` (`:280-302`) (verificado con `grep -n` y `Read`).
- **API de planes:** `api/planes/route.ts` tiene `GET` (`:24`) y `POST` (`:37`, con `incluyeEntrenador` en `:70`) y `api/planes/[id]/route.ts:22` tiene el `PATCH` de precio (verificado con `grep -n`).
- **Familia S-07:** S-03 define su familia como `CambiarPlan*`, `cambioPlan*` y `FormularioCambiarPlan*` (`S-03` tabla de familias, verificado con `grep -n`); S-02 reserva a S-04, S-08, S-10 y S-20 como dueños de exenciones (`REQ-S02-020`, `SUP-S02-004`) y entrega a S-07 las columnas `@db.Date` de `CambioPlanAuditoria` (`S-02` §0.3).
- **Interacción con S-04 aprobada:** `registrarPago` rechaza un plan distinto cuando hay un vencimiento vigente (REQ-S04-035), usa `IUnidadDeTrabajo`, `bloquearPorId`, `fijarVencimiento`, `cobroId` (REQ-S04-037 a REQ-S04-039) y `Pago.vencimientoAnterior`, tiene un tiempo límite de 20 s y una espera de bloqueo de 5 s (REQ-S04-044), define el cobro anulable como «el vigente más reciente, el de mayor fin de ciclo» (SUP-S04-007, REQ-S04-017) y dice que los pagos de cambio de plan no guardan vencimiento anterior y se anulan sin tocar el vencimiento (SUP-S04-010, REQ-S04-043, BEH-S04-038, AC-S04-023) (verificado con `grep -n` en `S-04`).
- No verificado: el contenido de los demás archivos que mencionan `FormularioCambiarPlan`, que ningún reporte use `Plan.frecuencia`, y el detalle de lo que expone `IUnidadDeTrabajo` más allá de su nombre.

### 0.5 Supuestos
- SUP-S07-001: el cálculo del valor no consumido del heredado se conserva (P-17, default «conservar»): tarifa diaria del ciclo actual por los días restantes, sin acreditar dinero ni generar saldo a favor. Default: conservar el cálculo; asumido, por validar.
- SUP-S07-002: la tarifa diaria del ciclo actual usa `Miembro.precioPlan` (el precio acordado) entre los `diasCiclo` del plan actual; el heredado usaba el precio de catálogo del plan de la suscripción (`CambiarPlanConPago.ts:156-158`), así que para un miembro con descuento el valor no consumido baja (es una divergencia deliberada: se valora lo que realmente paga). Si `Miembro.planId` o `Miembro.precioPlan` están vacíos con una suscripción vigente, se usa el plan de la suscripción y su precio de catálogo. Default: ese precio; asumido, por validar.
- SUP-S07-003: todos los planes incluyen entrenador y este se asigna solo al miembro, por decisión del propietario del 2026-11-12 (`docs/datos-iniciales.md`); que la asignación sea opcional es un supuesto mío. Default: entrenador opcional; asumido, por validar.
- SUP-S07-004: `Plan.frecuencia` se elimina: con los planes de 1, 2 y 3 meses y sin días de gracia solo servía para etiquetar y para reprorratear; la duración queda en `diasCiclo`, entero de 1 a 365 días fijado al crear el plan (30, 60 y 90 en el seed). Default: ese modelo; asumido, por validar.
- SUP-S07-005: la duración de un plan no se edita después de crearlo; para otra duración se crea otro plan y se desactiva el anterior. Default: duración inmutable; asumido, por validar.
- SUP-S07-006: el redondeo del valor no consumido es half-up al céntimo y el de los días nuevos es half-up al día entero, explícito en `dinero.ts` (ADR-011). Default: half-up; asumido, por validar.
- SUP-S07-007: la fecha del cambio es siempre hoy, el día de Lima del servidor; no se admiten fechas pasadas ni futuras y la vista previa usa el «hoy» del servidor, no el reloj del navegador. Default: hoy del servidor; asumido, por validar.
- SUP-S07-008: el cliente envía el monto y el vencimiento que vio en la vista previa y el servidor rechaza si su recálculo difiere en cualquiera de los dos (por ejemplo, si pasó la medianoche de Lima, aunque el monto siga en 0.00). Default: ese control doble; asumido, por validar.
- SUP-S07-009: el precio del plan nuevo es el del catálogo; el precio acordado con descuento del miembro se pierde al cambiar de plan. Default: precio de catálogo; asumido, por validar.
- SUP-S07-010: el pago del cambio de plan es un solo pago de un solo método, con `cobroId` obligatorio cuando el monto es mayor que 0.00 y sin pago cuando es 0.00. Default: ese criterio, coherente con P-16 y S-04; asumido, por validar.
- SUP-S07-011: el cobro anulable es «el no anulado de mayor fecha de registro» (`Pago.creadoEn`, a igualdad el de mayor identificador) y no el de mayor fin de ciclo, porque un cambio de plan puede dejar un fin menor que el del cobro anterior; para los cobros de membresía de S-04 ambos criterios coinciden, porque cada cobro nuevo termina en una fecha igual o posterior. Default: ese criterio, con enmienda a S-04; asumido, por validar.
- SUP-S07-012: la anulación de un cobro de cambio de plan restaura `planId`, `precioPlan` y el plan de la suscripción desde su registro de auditoría (que guarda el plan y el precio anteriores y el `pagoId`). Un cambio sin pago no tiene qué anular. Default: ese comportamiento; asumido, por validar.
- SUP-S07-013: `vencimientoAnterior` y `vencimientoNuevo` de la auditoría se guardan como el instante 05:00Z del día de Lima, igual que las demás fechas de calendario (SUP-S02-002), y el cálculo trabaja con cadenas AAAA-MM-DD hasta escribirlos. Default: ese formato; asumido, por validar.
- SUP-S07-014: editar `Miembro.precioPlan` desde la ficha cambia el valor no consumido de un cambio de plan posterior, y los días que el socio agrega a mano desde la ficha se valoran al precio acordado; no se agrega control. Default: sin control adicional; asumido, por validar.
- SUP-S07-015: `cambiarPlanAction` nunca redirige: devuelve un estado con el resultado o el error y cada llamador (ficha o caja) decide cómo seguir. Default: ese contrato; asumido, por validar.
- SUP-S07-016: el plan actual puede estar inactivo y el miembro puede estar dado de baja lógica (`Miembro.activo`) sin impedir el cambio; solo el plan nuevo debe estar activo. Default: ese criterio hasta que S-09 defina la baja; asumido, por validar.

## 1. Requisitos

### REQ-S07-001
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-001
- texto: La función calcularCambioPlan deberá ser una función pura, sin reloj ni acceso a la base, exportada desde cambioPlanCalculo.ts e importada tanto por cambiarPlan como por el formulario de cambio de plan.

### REQ-S07-002
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-001
- texto: Los días restantes deberán ser la cantidad de días de Lima desde hoy hasta el día de vencimiento, sin ser nunca negativos y con valor 0 el día del vencimiento.

### REQ-S07-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-006
- texto: El valor no consumido deberá ser el precio acordado actual por los días restantes entre los días del ciclo del plan actual, redondeado una sola vez al céntimo con half-up.

### REQ-S07-004
- tipo: cuando
- prioridad: MUST
- origen: SUP-S07-001
- texto: Cuando el valor no consumido es menor que el precio del plan nuevo, calcularCambioPlan deberá devolver como monto a cobrar la diferencia y como vencimiento el día de hoy más los días del ciclo del plan nuevo.

### REQ-S07-005
- tipo: cuando
- prioridad: MUST
- origen: SUP-S07-001
- texto: Cuando el valor no consumido es igual al precio del plan nuevo, calcularCambioPlan deberá devolver monto a cobrar 0.00 y como vencimiento el día de hoy más los días del ciclo del plan nuevo.

### REQ-S07-006
- tipo: cuando
- prioridad: MUST
- origen: SUP-S07-001
- texto: Cuando el valor no consumido supera el precio del plan nuevo, calcularCambioPlan deberá devolver monto a cobrar 0.00 y como vencimiento el día de hoy más los días del ciclo del plan nuevo más los días equivalentes al excedente, redondeados half-up a días enteros.

### REQ-S07-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función calcularCambioPlan deberá calcular los importes con dinero.ts y las fechas con fechaLima, sin Math.round, toFixed ni Number( sobre importes.

### REQ-S07-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función proporcion de dinero.ts deberá devolver el monto multiplicado por un numerador entero y dividido por un denominador entero positivo, redondeado una sola vez al céntimo con el modo indicado, que por defecto es half-up.

### REQ-S07-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función razonEntera de dinero.ts deberá devolver el entero resultante de multiplicar el cociente de dos montos por un factor entero, redondeado half-up, con el segundo monto positivo.

### REQ-S07-010
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si proporcion recibe un denominador menor que 1 o razonEntera recibe un divisor que no es positivo entonces la función deberá lanzar un error de parámetro.

### REQ-S07-011
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-013
- texto: El módulo fechaLima deberá exportar diasEntreLima, que devuelve los días de calendario de Lima entre dos días AAAA-MM-DD, y sumarDiasLima, que devuelve el día AAAA-MM-DD resultante de sumar días a un día.

### REQ-S07-012
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-001
- texto: La función cambiarPlan deberá reemplazar a CambiarPlanConPago como la operación que cambia el plan de un miembro con vencimiento vigente.

### REQ-S07-013
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el usuario no tiene el permiso PAGOS CREAR entonces cambiarPlan deberá rechazar el cambio sin leer ni escribir datos del miembro.

### REQ-S07-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La función cambiarPlan deberá abrir su transacción y bloquear la fila del miembro mediante IUnidadDeTrabajo y bloquearPorId, y releer el miembro, su suscripción vigente y el cobro después de tomar el bloqueo.

### REQ-S07-015
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si la transacción de cambiarPlan supera los 20 segundos o la espera del bloqueo supera los 5 segundos entonces cambiarPlan deberá cancelarla y revertirla.

### REQ-S07-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La función cambiarPlan deberá validar en este orden: permiso, cobroId ya registrado, existencia del miembro y del plan nuevo, plan nuevo activo, plan igual, suscripción vigente, monto y vencimiento esperados, y método de pago.

### REQ-S07-017
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando cambiarPlan recibe un cobroId ya registrado como cambio de plan con el mismo miembro, plan nuevo e importe, deberá devolver el resultado original sin crear otro pago ni mover el vencimiento.

### REQ-S07-018
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si el monto a cobrar es mayor que 0.00 y el cobroId falta, está registrado con otro miembro, plan o importe, o pertenece a un pago que no es un cambio de plan entonces cambiarPlan deberá rechazar el cambio con un error de conflicto sin escribir nada.

### REQ-S07-019
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si cambiarPlan recibe el cobroId de un cobro anulado entonces deberá rechazarlo con un error y no devolver el pago anulado.

### REQ-S07-020
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si la base rechaza un pago de cambio de plan por la restricción única del cobroId entonces cambiarPlan deberá devolver el error de dominio de cobro duplicado y no el error crudo del motor.

### REQ-S07-021
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el miembro no existe, el plan nuevo no existe o el plan nuevo está inactivo entonces cambiarPlan deberá rechazar el cambio con un error propio para cada caso.

### REQ-S07-022
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el plan nuevo es el plan actual del miembro entonces cambiarPlan deberá rechazar el cambio con PlanIgualError.

### REQ-S07-023
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el miembro no tiene una suscripción vigente entonces cambiarPlan deberá rechazar el cambio con SinCicloVigenteError e indicar que corresponde un cobro normal.

### REQ-S07-024
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S07-008
- texto: Si el monto esperado o el vencimiento esperado que envía el cliente difiere del que calcula el servidor entonces cambiarPlan deberá rechazar el cambio con CambioDesactualizadoError sin escribir nada.

### REQ-S07-025
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el monto a cobrar es mayor que 0.00 y no se indica un método de pago entonces cambiarPlan deberá rechazar el cambio con MetodoPagoRequeridoError.

### REQ-S07-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función cambiarPlan deberá validar el método de pago y el número de operación con las mismas reglas de S-03 que registrarPago.

### REQ-S07-027
- tipo: cuando
- prioridad: MUST
- origen: SUP-S07-010
- texto: Cuando el monto a cobrar es mayor que 0.00, cambiarPlan deberá crear un solo pago por ese monto con un solo método de pago.

### REQ-S07-028
- tipo: cuando
- prioridad: MUST
- origen: SUP-S07-010
- texto: Cuando cambiarPlan crea el pago, deberá guardar en él el nuevo vencimiento como fin de ciclo y el vencimiento anterior del miembro.

### REQ-S07-029
- tipo: cuando
- prioridad: MUST
- origen: SUP-S07-010
- texto: Cuando el monto a cobrar es 0.00, cambiarPlan no deberá crear ningún pago ni modificar Miembro.fechaUltimoPago.

### REQ-S07-030
- tipo: cuando
- prioridad: MUST
- origen: SUP-S07-010
- texto: Cuando cambiarPlan crea el pago, deberá dejar Miembro.fechaUltimoPago con la fecha de ese pago.

### REQ-S07-031
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-009
- texto: La función cambiarPlan deberá dejar en el miembro el plan nuevo y como precio acordado el precio de catálogo del plan nuevo.

### REQ-S07-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La función cambiarPlan deberá escribir el plan nuevo y el nuevo vencimiento en la suscripción vigente y el nuevo vencimiento en el miembro con fijarVencimiento.

### REQ-S07-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La función cambiarPlan deberá escribir el pago, el miembro, la suscripción y la auditoría dentro de una sola transacción.

### REQ-S07-034
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-012
- texto: La función cambiarPlan deberá crear un registro de CambioPlanAuditoria con el plan y el precio acordado anteriores, el plan nuevo, los importes, los días, los vencimientos y el pagoId usados en el cálculo.

### REQ-S07-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La función cambiarPlan no deberá consultar turnos, tasas de cambio ni días de gracia.

### REQ-S07-036
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando cambiarPlan y registrarPago reciben a la vez operaciones del mismo miembro, deberán procesarlas una tras otra y calcular la segunda con el estado que dejó la primera.

### REQ-S07-037
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S07-002
- texto: Si Miembro.planId o Miembro.precioPlan están vacíos con una suscripción vigente entonces cambiarPlan deberá usar el plan de la suscripción y su precio de catálogo como plan y precio actuales.

### REQ-S07-038
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-011
- texto: La tabla Pago deberá tener la columna creadoEn con la fecha de registro del pago.

### REQ-S07-039
- tipo: cuando
- prioridad: MUST
- origen: SUP-S07-012
- texto: Cuando se anula un pago con registro de cambio de plan, anularPago deberá restaurar el plan, el precio acordado y el plan de la suscripción anteriores desde la auditoría, en la misma transacción que restaura el vencimiento.

### REQ-S07-040
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-003
- texto: El esquema no deberá contener la columna Plan.incluyeEntrenador.

### REQ-S07-041
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-003
- texto: El entrenador de un miembro deberá ser opcional e independiente del plan, de modo que crear el miembro o cambiar su plan no lo exija ni lo modifique.

### REQ-S07-042
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-004
- texto: El esquema no deberá contener la columna Plan.frecuencia ni los enums FrecuenciaPago, ModoCambioPlanAuditoria y OrigenCambioPlanAuditoria.

### REQ-S07-043
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La tabla CambioPlanAuditoria no deberá tener las columnas modo ni origen.

### REQ-S07-044
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La tabla CambioPlanAuditoria deberá guardar sus importes como decimales de dos dígitos.

### REQ-S07-045
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-013
- texto: La tabla CambioPlanAuditoria deberá guardar los vencimientos anterior y nuevo como el instante 05:00Z del día de Lima.

### REQ-S07-046
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-004
- texto: La base deberá rechazar un plan con precio igual o menor que 0.00.

### REQ-S07-047
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-004
- texto: La base deberá rechazar un plan cuyos días de ciclo no sean un entero entre 1 y 365.

### REQ-S07-048
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S07-005
- texto: Si actualizarPlan recibe un cambio de los días de ciclo de un plan existente entonces deberá rechazarlo con DiasCicloInmutablesError sin modificar el plan.

### REQ-S07-049
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Los archivos ActualizarFrecuenciaPlan, ContarImpactoCambioPlan y CalcularVencimientoPlan y sus pruebas no deberán existir.

### REQ-S07-050
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El tipo de los cambios de actualizarMiembro no deberá aceptar el campo planId.

### REQ-S07-051
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La acción cambiarPlanAction deberá aceptar solo los campos miembro, plan nuevo, monto esperado, vencimiento esperado, método de pago, número de operación y cobroId, con un error para cualquier otro campo.

### REQ-S07-052
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-015
- texto: La acción cambiarPlanAction deberá devolver siempre un estado con el resultado o el error, sin redirigir, para que cada llamador decida cómo seguir.

### REQ-S07-053
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-007
- texto: El formulario de cambio de plan deberá obtener el día de hoy de Lima del servidor y no del reloj del navegador.

### REQ-S07-054
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El formulario de cambio de plan deberá mostrar antes de confirmar el valor no consumido, el monto a cobrar o los días agregados y el nuevo vencimiento, calculados con calcularCambioPlan.

### REQ-S07-055
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-003
- texto: Los formularios, los listados y las rutas de planes no deberán ofrecer ni mostrar entrenador incluido ni frecuencia.

### REQ-S07-056
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-004
- texto: La ruta api/planes deberá aceptar al crear un plan solo nombre, precio como cadena decimal y días de ciclo, y al actualizarlo solo nombre, precio y estado activo.

### REQ-S07-057
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next, generated y las exenciones cerradas de la familia S-08, no deberán contener los términos incluyeEntrenador, FrecuenciaPago, planFrecuencia, ActualizarFrecuenciaPlan, ContarImpactoCambioPlan, prorratearVencimiento, CambiarPlanConPago, EntrenadorRequeridoError, PlanCortesiaConTiempoRestanteError, OrigenCambioPlan ni ModoCambioPlan.

### REQ-S07-058
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-plan.mjs encuentra alguno de los términos de REQ-S07-057 fuera de las exenciones o por encima del tope de una exención, deberá terminar con código distinto de cero y nombrar archivo y línea.

### REQ-S07-059
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-plan.mjs en cada pull request.

### REQ-S07-060
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las listas de exenciones de verificar-dinero, verificar-fechas y verificar-pagos no deberán contener archivos de la familia S-07 al terminar la spec.


### REQ-S07-061
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-011
- texto: El cobro anulable de un miembro deberá ser el pago no anulado de mayor creadoEn y, a igualdad, el de mayor identificador.
## 2. Comportamiento

### BEH-S07-001
- cubre: REQ-S07-001, REQ-S07-004
- categoria: feliz
- dado: un miembro con el plan de 1 mes (30 días, S/ 120.00) acordado en S/ 120.00 y 15 días restantes
- cuando: se calcula el cambio al plan de 3 meses (90 días, S/ 280.00)
- entonces: el valor no consumido es 60.00, el monto a cobrar 220.00 y el vencimiento hoy más 90 días; el servidor y la vista previa dan lo mismo con la misma fecha de hoy

### BEH-S07-002
- cubre: REQ-S07-006
- categoria: feliz
- dado: un miembro con el plan de 3 meses (90 días, S/ 280.00) acordado en S/ 280.00 y 80 días restantes
- cuando: se calcula el cambio al plan de 1 mes (30 días, S/ 120.00)
- entonces: el valor no consumido es 248.89, el excedente 128.89, los días nuevos 32 (128.89 por 30 entre 120.00 es 32.22), el monto a cobrar 0.00 y el vencimiento hoy más 62 días

### BEH-S07-003
- cubre: REQ-S07-005
- categoria: borde
- dado: un plan A de 30 días y S/ 90.00 con 20 días restantes, y un plan B de 60 días y S/ 60.00
- cuando: se calcula el cambio de A a B
- entonces: el valor no consumido es 60.00, igual al precio de B; el monto a cobrar es 0.00 y el vencimiento es hoy más 60 días

### BEH-S07-004
- cubre: REQ-S07-002, REQ-S07-003
- categoria: borde
- dado: un miembro cuyo vencimiento es hoy (día de Lima) con el plan de 1 mes (S/ 120.00)
- cuando: se calcula el cambio al plan de 2 meses (S/ 200.00)
- entonces: los días restantes son 0, el valor no consumido 0.00 y el monto 200.00; con vencimiento de ayer no hay suscripción vigente y el cálculo no aplica

### BEH-S07-005
- cubre: REQ-S07-003
- categoria: borde
- dado: un plan de 30 días acordado en S/ 10.05 con 15 días restantes, y un plan de 30 días acordado en S/ 100.00 con 1 y 2 días restantes
- cuando: se calcula el valor no consumido
- entonces: dan 5.03 (5.025 redondeado half-up), 3.33 (3.3333) y 6.67 (6.6667)

### BEH-S07-006
- cubre: REQ-S07-007, REQ-S07-008, REQ-S07-009, REQ-S07-011
- categoria: feliz
- dado: dinero.ts, fechaLima y calcularCambioPlan
- cuando: se prueban con TZ=UTC, America/Lima y Asia/Tokyo
- entonces: proporcion("10.05", 15, 30) da "5.03", razonEntera("128.89", "120.00", 30) da 32, diasEntreLima("2026-11-12", "2026-11-27") da 15, sumarDiasLima("2026-11-12", 90) da "2027-02-10" y calcularCambioPlan no contiene Math.round, toFixed ni Number( sobre importes

### BEH-S07-007
- cubre: REQ-S07-010
- categoria: error
- dado: proporcion con denominador 0 y razonEntera con divisor "0.00" y con divisor negativo
- cuando: se llaman
- entonces: las tres lanzan el error de parámetro

### BEH-S07-008
- cubre: REQ-S07-012, REQ-S07-027, REQ-S07-028, REQ-S07-030, REQ-S07-031, REQ-S07-032, REQ-S07-033, REQ-S07-034
- categoria: feliz
- dado: el miembro de BEH-S07-001 y un método de pago Yape
- cuando: se ejecuta cambiarPlan con monto esperado "220.00", el vencimiento esperado de hoy más 90 días y un cobroId nuevo
- entonces: se crea un solo pago de 220.00 con Yape con fin de ciclo igual al nuevo vencimiento y el vencimiento anterior, el miembro queda con el plan de 3 meses, el precio acordado 280.00, el nuevo vencimiento y la fecha del último pago de hoy, su suscripción apunta al plan nuevo con el mismo fin, y existe un registro de auditoría con el plan y el precio anteriores, el plan nuevo, los importes, los días, los vencimientos y el pagoId

### BEH-S07-009
- cubre: REQ-S07-029
- categoria: feliz
- dado: el miembro de BEH-S07-002 con fecha del último pago F
- cuando: se ejecuta cambiarPlan con monto esperado "0.00" y el vencimiento esperado de hoy más 62 días
- entonces: no se crea ningún pago, la fecha del último pago sigue siendo F, el miembro queda con el plan de 1 mes y el vencimiento de hoy más 62 días y el registro de auditoría trae monto cobrado 0.00 y pagoId vacío

### BEH-S07-010
- cubre: REQ-S07-013
- categoria: error
- dado: un usuario sin el permiso PAGOS CREAR
- cuando: ejecuta cambiarPlan
- entonces: se rechaza el cambio sin leer ni escribir datos del miembro

### BEH-S07-011
- cubre: REQ-S07-021
- categoria: error
- dado: un miembro inexistente, un plan nuevo inexistente y un plan nuevo inactivo
- cuando: se ejecuta cambiarPlan con cada uno
- entonces: se lanzan MiembroNoEncontradoError, PlanNoEncontradoError y PlanInactivoError, sin escribir

### BEH-S07-012
- cubre: REQ-S07-022
- categoria: error
- dado: un miembro con el plan de 1 mes vigente, y un cambio sin pago ya confirmado al plan de 3 meses
- cuando: se ejecuta cambiarPlan con el mismo plan, y se repite el cambio sin pago con otro cobroId (doble clic)
- entonces: ambos casos lanzan PlanIgualError y no se escribe nada

### BEH-S07-013
- cubre: REQ-S07-023
- categoria: error
- dado: un miembro con vencimiento de ayer y uno que nunca pagó
- cuando: se ejecuta cambiarPlan con cada uno
- entonces: se lanza SinCicloVigenteError con el aviso de que corresponde un cobro normal, sin escribir

### BEH-S07-014
- cubre: REQ-S07-024
- categoria: error
- dado: el miembro de BEH-S07-001 con un monto esperado "200.00", y el miembro de BEH-S07-002 con monto esperado "0.00" pero el vencimiento esperado de ayer más 62 días
- cuando: se ejecuta cambiarPlan con cada uno
- entonces: ambos lanzan CambioDesactualizadoError y no se crea pago ni se modifica el miembro

### BEH-S07-015
- cubre: REQ-S07-025, REQ-S07-026
- categoria: error
- dado: el miembro de BEH-S07-001 con un cambio sin método de pago, otro con un método inactivo y otro con un método que exige número de operación sin indicarlo
- cuando: se ejecuta cambiarPlan con cada uno
- entonces: se lanza MetodoPagoRequeridoError en el primero y el error de S-03 de método inactivo y de número de operación requerido en los otros, sin escribir nada

### BEH-S07-016
- cubre: REQ-S07-016, REQ-S07-017
- categoria: borde
- dado: un cambio de plan con pago ya confirmado con el cobroId C1
- cuando: se repite cambiarPlan con el mismo miembro, plan nuevo, importe y C1 (el miembro ya tiene el plan nuevo)
- entonces: devuelve el resultado original, no lanza PlanIgualError, no crea otro pago y el vencimiento no se mueve

### BEH-S07-017
- cubre: REQ-S07-018
- categoria: error
- dado: un cambio con monto a cobrar sin cobroId, otro con el cobroId C1 de otro miembro, y otro con el cobroId de un cobro de membresía de S-04
- cuando: se ejecuta cambiarPlan con cada uno
- entonces: los tres lanzan el error de conflicto y no se crea pago

### BEH-S07-018
- cubre: REQ-S07-019
- categoria: error
- dado: un cobro de cambio de plan con cobroId C1 que luego fue anulado
- cuando: se ejecuta cambiarPlan con C1
- entonces: se lanza el error de cobro anulado y no se devuelve el pago anulado

### BEH-S07-019
- cubre: REQ-S07-020
- categoria: error
- dado: dos inserciones de pago de cambio de plan con el mismo cobroId, la segunda sin pasar por el chequeo previo
- cuando: se ejecuta la segunda
- entonces: cambiarPlan devuelve el error de dominio de cobro duplicado y no el error crudo del motor

### BEH-S07-020
- cubre: REQ-S07-014, REQ-S07-022
- categoria: concurrencia
- dado: un miembro con el plan de 1 mes y dos cambiarPlan simultáneos al plan de 3 meses con cobroId distintos
- cuando: terminan las dos transacciones
- entonces: una se confirma y la otra lanza PlanIgualError porque releyó el plan ya cambiado; hay un solo pago y un solo registro de auditoría

### BEH-S07-021
- cubre: REQ-S07-017, REQ-S07-020
- categoria: concurrencia
- dado: un miembro con el plan de 1 mes y dos cambiarPlan simultáneos al plan de 3 meses con el mismo cobroId y los mismos datos
- cuando: terminan las dos transacciones
- entonces: una crea el pago y la otra devuelve el resultado original; hay un solo pago

### BEH-S07-022
- cubre: REQ-S07-036
- categoria: concurrencia
- dado: un miembro con el plan de 1 mes y vencimiento en 15 días, un cambiarPlan al plan de 3 meses y un registrarPago del plan de 1 mes, con una barrera que fija cuál toma el bloqueo primero
- cuando: se ejecutan una vez con cada orden
- entonces: si el cobro va primero el cambio calcula con el vencimiento extendido y el cliente recibe CambioDesactualizadoError; si el cambio va primero el cobro se rechaza por el plan distinto con vencimiento vigente (REQ-S04-035)

### BEH-S07-023
- cubre: REQ-S07-015
- categoria: error
- dado: una transacción de cambiarPlan que espera el bloqueo del miembro más de 5 segundos y otra que se prolonga más de 20 segundos, con el tiempo simulado
- cuando: vencen los plazos
- entonces: ambas se cancelan y revierten sin dejar pago, auditoría ni cambios

### BEH-S07-024
- cubre: REQ-S07-035, REQ-S07-041
- categoria: feliz
- dado: un miembro sin entrenador y otro con entrenador asignado
- cuando: se crea un miembro, se cambia el plan de cada uno y se mira el entrenador
- entonces: ningún paso exige entrenador y el entrenador de cada uno queda igual; el cambio no consulta turnos, tasas ni días de gracia

### BEH-S07-025
- cubre: REQ-S07-037
- categoria: borde
- dado: un miembro con suscripción vigente del plan de 1 mes, Miembro.planId vacío y Miembro.precioPlan vacío
- cuando: se calcula y se ejecuta un cambio al plan de 3 meses
- entonces: se usan el plan de la suscripción y su precio de catálogo (S/ 120.00) como actuales y el cambio se confirma

### BEH-S07-026
- cubre: REQ-S07-038, REQ-S07-039, REQ-S07-061
- categoria: feliz
- dado: un miembro con el plan de 3 meses (S/ 280.00), un cobro de membresía M1 y 35 días restantes
- cuando: cambia al plan de 1 mes (S/ 120.00) con cobro de 11.11 (valor no consumido 108.89, vencimiento hoy más 30 días, anterior al de M1), intenta anular M1 y luego anula el cambio
- entonces: anular M1 se rechaza porque el cambio es el cobro registrado más recientemente; anular el cambio restaura el plan de 3 meses, el precio 280.00, el plan de la suscripción y el vencimiento anterior; después M1 se puede anular

### BEH-S07-027
- cubre: REQ-S07-039
- categoria: borde
- dado: el miembro de BEH-S07-009 (cambio sin pago)
- cuando: se busca un pago que anular
- entonces: no hay pago de ese cambio; el miembro vuelve al plan anterior solo con otro cambiarPlan, que calcula con el estado actual

### BEH-S07-028
- cubre: REQ-S07-040, REQ-S07-042, REQ-S07-043, REQ-S07-044, REQ-S07-045
- categoria: feliz
- dado: el esquema final
- cuando: se consultan las columnas de Plan, Pago y CambioPlanAuditoria y la lista de enums
- entonces: Plan no tiene incluyeEntrenador ni frecuencia, no existen los tres enums, Pago tiene creadoEn, y CambioPlanAuditoria no tiene modo ni origen, sus importes son numeric(12,2) y sus vencimientos son instantes 05:00Z

### BEH-S07-029
- cubre: REQ-S07-046, REQ-S07-047
- categoria: error
- dado: una base con el esquema final
- cuando: se inserta un plan con precio 0.00, otro con -5.00, otro con 0 días de ciclo, otro con 366 y otro con el texto "30.5" como días
- entonces: la base rechaza las cinco inserciones

### BEH-S07-030
- cubre: REQ-S07-048
- categoria: error
- dado: un plan existente de 30 días
- cuando: se llama a actualizarPlan con un cambio de días de ciclo (convertido con unknown en la prueba)
- entonces: lanza DiasCicloInmutablesError y los días no cambian; con nombre, precio y estado se actualizan

### BEH-S07-031
- cubre: REQ-S07-049, REQ-S07-050
- categoria: feliz
- dado: el árbol final
- cuando: se buscan los tres archivos retirados y se revisa el tipo de los cambios de actualizarMiembro
- entonces: los archivos no existen y el tipo no acepta planId

### BEH-S07-032
- cubre: REQ-S07-051
- categoria: error
- dado: envíos de cambiarPlanAction con un campo de líneas de pago, con uno de entrenador, con uno de origen y con los campos correctos
- cuando: se ejecutan
- entonces: los tres primeros devuelven un error de campo no permitido y el cuarto se procesa

### BEH-S07-033
- cubre: REQ-S07-052
- categoria: feliz
- dado: un cambio confirmado desde la ficha y otro desde el modal de caja
- cuando: cambiarPlanAction termina
- entonces: no redirige y devuelve un estado con el resultado; la ficha navega a la ficha del miembro y la caja cierra el modal y sigue en la caja

### BEH-S07-034
- cubre: REQ-S07-053, REQ-S07-054
- categoria: feliz
- dado: el formulario de cambio de plan de un miembro con vencimiento vigente y un navegador con el reloj atrasado dos días
- cuando: se elige un plan nuevo
- entonces: la pantalla muestra el valor no consumido, el monto a cobrar o los días agregados y el nuevo vencimiento calculados con el día de Lima del servidor, iguales a los del servidor

### BEH-S07-035
- cubre: REQ-S07-055, REQ-S07-056
- categoria: feliz
- dado: el panel con un socio y la API de planes
- cuando: abre el alta y la edición de planes, el listado de planes, el alta de un miembro, y llama a api/planes para crear con y sin días de ciclo y para actualizar con el campo incluyeEntrenador
- entonces: no hay casilla ni etiqueta de entrenador incluido ni de frecuencia, la duración no se edita en un plan existente, crear sin días de ciclo o actualizar con un campo ajeno devuelve 400 y las llamadas correctas funcionan

### BEH-S07-036
- cubre: REQ-S07-057, REQ-S07-058
- categoria: error
- dado: archivos de prueba con cada uno de los once términos de REQ-S07-057 y un archivo exento que supera su tope
- cuando: se ejecuta tools/verificar-plan.mjs
- entonces: falla y nombra archivo y línea de los once términos y del archivo que supera su tope

### BEH-S07-037
- cubre: REQ-S07-059
- categoria: error
- dado: un pull request que agrega incluyeEntrenador en un archivo no exento
- cuando: corre el CI
- entonces: el paso de tools/verificar-plan.mjs falla y queda en rojo

### BEH-S07-038
- cubre: REQ-S07-060
- categoria: feliz
- dado: las listas de exenciones de verificar-dinero, verificar-fechas y verificar-pagos
- cuando: se ejecutan sus pruebas de lista
- entonces: ninguna entrada nombra CambiarPlanConPago, cambioPlanCalculo ni FormularioCambiarPlan

## 3. Invariantes

### INV-S07-001
- propiedad: el plan del miembro es siempre el de su suscripción vigente después de cualquier secuencia de cobros, cambios de plan y anulaciones hechos por las rutas de S-04 y S-07
- mecanismo: test-propiedad
- deteccion: 200 secuencias de operaciones generadas con semilla fija sobre una base efímera; tras cada operación, Miembro.planId debe ser igual a Suscripcion.planId de la suscripción vigente
- protege: REQ-S07-031, REQ-S07-032, REQ-S07-039

### INV-S07-002
- propiedad: el cambio de plan nunca acredita dinero: el monto a cobrar es cero o la diferencia exacta, y nunca negativo
- mecanismo: test-propiedad
- deteccion: 500 combinaciones de precios, ciclos y días restantes generadas con semilla fija; el valor no consumido más el monto a cobrar debe ser igual al precio del plan nuevo cuando el monto es mayor que cero, y el monto nunca debe ser negativo
- protege: REQ-S07-004, REQ-S07-005, REQ-S07-006

### INV-S07-003
- propiedad: todo plan tiene un precio mayor que 0.00 y días de ciclo enteros entre 1 y 365
- mecanismo: restriccion-bd
- deteccion: CHECK sobre Plan.precio y Plan.diasCiclo; una inserción o actualización fuera de rango falla
- protege: REQ-S07-046, REQ-S07-047

### INV-S07-004
- propiedad: un cambio de plan con cobro y su registro de auditoría se confirman o se revierten juntos y el importe del pago es igual al monto cobrado de la auditoría
- mecanismo: transaccion
- deteccion: un doble del repositorio de auditoría que lanza al escribir deja sin pago, sin auditoría y sin cambios en el miembro y en la suscripción; en el caso feliz el importe del pago es igual al monto cobrado
- protege: REQ-S07-033, REQ-S07-034

### INV-S07-005
- propiedad: los términos retirados no aparecen en apps ni packages fuera de las exenciones cerradas
- mecanismo: lint
- deteccion: tools/verificar-plan.mjs termina con código distinto de cero y lista archivo:línea de cada coincidencia fuera de las exenciones
- protege: REQ-S07-057, REQ-S07-058

## 4. Criterios de aceptación

### AC-S07-001
- enlaza: REQ-S07-001, REQ-S07-002, REQ-S07-003, REQ-S07-004, REQ-S07-005, REQ-S07-006, BEH-S07-001, BEH-S07-002, BEH-S07-003, BEH-S07-004, BEH-S07-005, INV-S07-002
- metodo: unitario
- procedimiento: probar calcularCambioPlan con los casos de BEH-S07-001 a BEH-S07-005 con la fecha de hoy fija, y con 500 combinaciones generadas con semilla fija
- esperado: los resultados coinciden con los números de los comportamientos y el valor no consumido más el monto a cobrar es igual al precio nuevo cuando el monto es mayor que cero, sin montos negativos
- test: pendiente

### AC-S07-002
- enlaza: REQ-S07-007, REQ-S07-008, REQ-S07-009, REQ-S07-010, REQ-S07-011, BEH-S07-006, BEH-S07-007
- metodo: unitario
- procedimiento: ejecutar las pruebas de proporcion, razonEntera, diasEntreLima y sumarDiasLima con TZ=UTC, America/Lima y Asia/Tokyo, llamar a las funciones con divisores 0 y negativos, y buscar Math.round, toFixed y Number( en calcularCambioPlan
- esperado: los resultados son proporcion("10.05", 15, 30) igual a "5.03", razonEntera("128.89", "120.00", 30) igual a 32, diasEntreLima("2026-11-12", "2026-11-27") igual a 15 y sumarDiasLima("2026-11-12", 90) igual a "2027-02-10", iguales en las tres zonas; los divisores inválidos lanzan el error de parámetro y no hay coincidencias de búsqueda
- test: pendiente

### AC-S07-003
- enlaza: REQ-S07-012, REQ-S07-027, REQ-S07-028, REQ-S07-029, REQ-S07-030, REQ-S07-031, REQ-S07-032, REQ-S07-033, REQ-S07-034, BEH-S07-008, BEH-S07-009, INV-S07-004
- metodo: integracion
- procedimiento: ejecutar cambiarPlan contra una base efímera con los miembros de BEH-S07-008 y BEH-S07-009 y leer pago, miembro, suscripción y auditoría; repetir con un doble del repositorio de auditoría que lanza al escribir
- esperado: con cobro hay un solo pago de 220.00 y todos los datos de BEH-S07-008; sin cobro no hay pago, la fecha del último pago no cambia y la auditoría trae monto cobrado 0.00 y pagoId vacío; con el doble no queda pago, auditoría ni cambio
- test: pendiente

### AC-S07-004
- enlaza: REQ-S07-013, REQ-S07-021, REQ-S07-022, REQ-S07-023, REQ-S07-024, REQ-S07-025, REQ-S07-026, BEH-S07-010, BEH-S07-011, BEH-S07-012, BEH-S07-013, BEH-S07-014, BEH-S07-015
- metodo: integracion
- procedimiento: ejecutar cambiarPlan con los casos de esos comportamientos, contando las filas leídas y escritas
- esperado: se lanzan los errores indicados sin escribir nada y sin permiso no se lee ningún dato del miembro
- test: pendiente

### AC-S07-005
- enlaza: REQ-S07-016, REQ-S07-017, REQ-S07-018, REQ-S07-019, REQ-S07-020, BEH-S07-016, BEH-S07-017, BEH-S07-018, BEH-S07-019
- metodo: integracion
- procedimiento: repetir un cambio confirmado con el mismo cobroId, miembro, plan nuevo e importe; probar los cobroId de BEH-S07-017 y BEH-S07-018; e insertar dos veces el mismo cobroId sin el chequeo previo
- esperado: el reintento devuelve el resultado original sin PlanIgualError ni otro pago, los conflictos y el cobro anulado se rechazan y la duplicación devuelve el error de dominio
- test: pendiente

### AC-S07-006
- enlaza: REQ-S07-014, REQ-S07-015, REQ-S07-017, REQ-S07-020, REQ-S07-022, REQ-S07-036, BEH-S07-020, BEH-S07-021, BEH-S07-022, BEH-S07-023
- metodo: integracion
- procedimiento: con una barrera que fija qué transacción toma el bloqueo primero, lanzar con Promise.all dos cambiarPlan al mismo plan con cobroId distintos, otros dos con el mismo cobroId, y un cambiarPlan con un registrarPago en cada orden; simular el tiempo para los plazos de 5 y 20 segundos
- esperado: los resultados son los de esos comportamientos en cada orden, con un solo pago por cobroId y sin pagos ni cambios en las transacciones canceladas
- test: pendiente

### AC-S07-007
- enlaza: REQ-S07-035, REQ-S07-037, REQ-S07-041, BEH-S07-024, BEH-S07-025
- metodo: integracion
- procedimiento: crear un miembro sin entrenador y otro con entrenador, cambiar el plan de cada uno, usar un miembro con planId y precioPlan vacíos y espiar las consultas a turnos, tasas y días de gracia
- esperado: ningún paso exige ni modifica el entrenador, el miembro sin planId usa el plan y el precio de su suscripción y no hay consultas a turnos, tasas ni días de gracia
- test: pendiente

### AC-S07-008
- enlaza: REQ-S07-038, REQ-S07-039, REQ-S07-061, BEH-S07-026, BEH-S07-027, INV-S07-001
- metodo: integracion
- procedimiento: cambiar de plan con cobro de 11.11 sobre un miembro con un cobro M1 más largo, intentar anular M1, anular el cambio y anular M1; intentar anular un cambio sin pago; y ejecutar las 200 secuencias generadas con semilla fija de cobros, cambios y anulaciones comprobando el plan del miembro contra el de su suscripción vigente
- esperado: anular M1 mientras el cambio está vigente se rechaza, anular el cambio restaura plan, precio, suscripción y vencimiento, después M1 se anula, el cambio sin pago no tiene pago que anular y en las secuencias el plan del miembro siempre es el de su suscripción vigente
- test: pendiente

### AC-S07-009
- enlaza: REQ-S07-040, REQ-S07-042, REQ-S07-043, REQ-S07-044, REQ-S07-045, REQ-S07-046, REQ-S07-047, BEH-S07-028, BEH-S07-029, INV-S07-003
- metodo: sql
- procedimiento: consultar el esquema final por las columnas de Plan, Pago y CambioPlanAuditoria y por los enums, e insertar planes con precio 0.00, -5.00, 0 días, 366 días y el texto "30.5" como días
- esperado: Plan no tiene incluyeEntrenador ni frecuencia, los tres enums no existen, Pago tiene creadoEn, CambioPlanAuditoria no tiene modo ni origen y usa numeric(12,2) e instantes 05:00Z, y la base rechaza las cinco inserciones
- test: pendiente

### AC-S07-010
- enlaza: REQ-S07-048, REQ-S07-049, REQ-S07-050, BEH-S07-030, BEH-S07-031
- metodo: unitario
- procedimiento: llamar a actualizarPlan con un cambio de días de ciclo (convertido con unknown), buscar los tres archivos retirados y comprobar con la API de typescript que el tipo de los cambios de actualizarMiembro no acepta planId
- esperado: lanza DiasCicloInmutablesError sin modificar el plan, los archivos no existen y el tipo no acepta planId
- test: pendiente

### AC-S07-011
- enlaza: REQ-S07-051, REQ-S07-052, BEH-S07-032, BEH-S07-033
- metodo: integracion
- procedimiento: enviar cambiarPlanAction con un campo lineas, uno entrenadorId, uno origen y con los campos correctos, y confirmar un cambio desde la ficha y desde el modal de caja
- esperado: los tres primeros devuelven un error de campo no permitido, el cuarto se procesa y en ningún caso la acción redirige
- test: pendiente

### AC-S07-012
- enlaza: REQ-S07-053, REQ-S07-054, REQ-S07-055, REQ-S07-056, BEH-S07-034, BEH-S07-035
- metodo: manual
- procedimiento: como socio, con el reloj del navegador atrasado dos días, abrir el cambio de plan de un miembro con vencimiento vigente y elegir un plan nuevo; abrir el alta y la edición de un plan, el listado de planes y el alta de un miembro; y llamar a api/planes con los cuerpos de BEH-S07-035
- esperado: la vista previa muestra los mismos números que el servidor, no hay casilla ni etiqueta de entrenador incluido ni de frecuencia, la duración de un plan existente no se edita y la API responde 400 a los cuerpos inválidos
- test: pendiente

### AC-S07-013
- enlaza: REQ-S07-057, REQ-S07-058, BEH-S07-036, INV-S07-005
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-plan.mjs con un árbol por cada uno de los once términos, otro con una exención que supera su tope y otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los once términos y con la exención excedida nombrando archivo y línea, pasa con el limpio y en el árbol final solo aparecen archivos exentos dentro de su tope
- test: pendiente

### AC-S07-014
- enlaza: REQ-S07-059, BEH-S07-037
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue incluyeEntrenador en un archivo no exento y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-plan.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S07-015
- enlaza: REQ-S07-060, BEH-S07-038
- metodo: unitario
- procedimiento: ejecutar las pruebas de las listas de exenciones de verificar-dinero, verificar-fechas y verificar-pagos
- esperado: ninguna entrada nombra CambiarPlanConPago, cambioPlanCalculo ni FormularioCambiarPlan
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de `calcularCambioPlan`, de `CambiarPlanConPago` y de la anulación (las de S-04 y S-05 que sobreviven); (2) pruebas de `proporcion`, `razonEntera`, `diasEntreLima` y `sumarDiasLima` y su implementación en `dinero.ts` y `fechaLima.ts` (enmiendas a S-03 y S-02); (3) pruebas y archivo nuevo del cálculo exacto (`cambioPlanExacto.ts`) con los casos de BEH-S07-001 a BEH-S07-005 y las propiedades de INV-S07-002, sin tocar aún el `calcularCambioPlan` heredado; (4) esquema aditivo: `Pago.creadoEn`, columnas nuevas de `CambioPlanAuditoria` (plan y precio anteriores, importes decimales, instantes 05:00Z) y CHECK de `Plan.precio` y `Plan.diasCiclo`, con la verificación de que `drizzle-kit push` crea los CHECK (SQL de respaldo en S-15 si no); (5) `CambiarPlan.ts` nuevo con unidad de trabajo, bloqueo, plazos, orden de validación, cobro idempotente y auditoría, junto a `CambiarPlanConPago.ts`; (6) `anularPago` con el orden por `creadoEn` y la restauración del plan; (7) migrar los llamadores a la nueva operación: `cambiarPlanAction` sin `origen` ni líneas, `FormularioCambiarPlan` con el día de hoy del servidor, `PanelPagoYCambioPlan`, los tres archivos de `caja/` y el formulario del miembro sin entrenador condicionado; (8) planes: formularios, listados, `api/planes`, `planes/actions.ts` y `actualizarPlan` con `DiasCicloInmutablesError`, y `actualizarMiembro` sin `planId` con su llamador `miembros/actions.ts:280-302` en el mismo commit; (9) retirar `CambiarPlanConPago`, `ActualizarFrecuenciaPlan`, `ContarImpactoCambioPlan`, `CalcularVencimientoPlan` y el cálculo heredado (renombrando `cambioPlanExacto.ts` a `cambioPlanCalculo.ts`), y quitar `Plan.incluyeEntrenador`, `Plan.frecuencia` y los tres enums del esquema, retirando cada archivo de las listas de exenciones en el mismo commit que lo borra; (10) `tools/verificar-plan.mjs` con `tools/verificar-plan.exenciones.json` y el CI.
- Las pruebas de concurrencia usan semillas fijas, una base efímera y una barrera que fija el orden en que las transacciones toman el bloqueo; no hay dependencias nuevas.
- Los criterios AC-S07-012 y AC-S07-014 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).
- `IUnidadDeTrabajo` (S-04) deberá exponer también los repositorios de planes y de auditoría de cambio de plan; la ampliación se hace en el paso 5.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15 con los planes de 30, 60 y 90 días a 120.00, 200.00 y 280.00 (`docs/datos-iniciales.md`) y sin `frecuencia` ni `incluyeEntrenador`.
- **Enmiendas que se registran al aprobar S-07:**
  - S-02: REQ-S02-001 y la tabla de 5.1 (`diasEntreLima` y `sumarDiasLima`); REQ-S02-020, SUP-S02-004 y AC-S02-012 (S-07 pasa a ser dueña de exenciones); la nota de 0.3 sobre las columnas `@db.Date` de `CambioPlanAuditoria` (quedan como instante 05:00Z, SUP-S07-013); y la asignación de `CalcularVencimientoPlan.ts` a S-04, que S-07 reemplaza por su retiro.
  - S-03: REQ-S03-001 y la tabla de operaciones de 5.1 (`proporcion` y `razonEntera`); REQ-S03-005 (errores de parámetros) para el divisor; REQ-S03-030 y la fila de familias de S-07: sus archivos dejan de ser exentos al terminar S-07; y los comportamientos y criterios que prueban la tabla.
  - S-04: SUP-S04-007 y REQ-S04-017 (el cobro anulable es el de mayor `creadoEn`, REQ-S07-061); REQ-S04-035 (el rechazo del plan distinto remite a `cambiarPlan`); SUP-S04-010, REQ-S04-043, BEH-S04-038 y AC-S04-023 (el pago de cambio de plan sí guarda `vencimientoAnterior` y se anula restaurando también el plan, REQ-S07-039); el requisito de columnas de `Pago` (suma `creadoEn`); 0.2 (anulación), 0.3 (cambio de plan) y 5.1 (anulación) y los dos riesgos sobre cambio de plan; y la aclaración de que SUP-S04-014 y REQ-S04-045 admiten a S-07 como familia.
  - S-05: la línea de 0.2 que agrupa a `CambioPlanAuditoria` entre las tablas que otras specs retiran después: se conserva, sin `organizacionId` (S-05 ya lo retira).
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 restan tres enums (`FrecuenciaPago`, `ModoCambioPlanAuditoria`, `OrigenCambioPlanAuditoria`) respecto de los valores vigentes al implementar S-07 (16 tras S-06; el total final depende del orden de S-08 a S-10 y S-18); REQ-S22-028 (suites de contrato): `PrismaPlanRepository` pierde `actualizarFrecuenciaYEntrenador` y `contarSuscripcionesActivasVigentes`, y `CambioPlanAuditoria` cambia de columnas y tipos.
  - `docs/00-indice.md`, `docs/06-modelo-datos-cambios.md` (línea 29, `CambioPlanAuditoria`) y `docs/datos-iniciales.md` (la opcionalidad del entrenador es un supuesto): nota de que los planes no tienen `frecuencia` ni `incluyeEntrenador` y de que la duración se fija al crear el plan.
- **Traspasos:** S-08 (el asistente de cobro de caja ofrece el cambio de plan), S-10 (ramas `vieneDelExcel`), S-14 (el cobro de cambio de plan se distingue de la membresía solo por su registro de auditoría), S-15 (planes sembrados), S-18 (entrenador como persona) y S-23 (permiso `PAGOS CREAR` y rol único).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Bajar de un plan largo a uno corto puede acortar el vencimiento y, con cobro, cobrar una diferencia pequeña (BEH-S07-026: 35 días restantes de 3 meses pasan a 30 días y se cobra 11.11). Es el cálculo del heredado; la vista previa lo muestra antes de confirmar y el orden de anulación por `creadoEn` evita el bloqueo. Se valida con el propietario (SUP-S07-001).
- La vista previa y el servidor pueden diferir si pasa la medianoche de Lima; el servidor lo detecta comparando monto y vencimiento (REQ-S07-024) y la pantalla recalcula con el día del servidor.
- El valor no consumido usa el precio acordado y no el de catálogo (SUP-S07-002): para miembros con descuento da menos que el heredado. Editar `precioPlan` desde la ficha o agregar días a mano también lo altera (SUP-S07-014).
- Con planes de 1, 2 y 3 meses a precios distintos, un cambio de un plan largo a uno corto puede dar muchos días extra (por ejemplo 62 días en BEH-S07-002). Mitigación: la vista previa los muestra.
- Retirar `Plan.frecuencia` y `Plan.incluyeEntrenador` toca unos 17 y 15 archivos (los 22 de `FrecuenciaPago` incluyen 5 de `ReglaAbono*` que retira S-04); el riesgo es un reporte o una pantalla que los lea (no verificado). Mitigación: el typecheck y la herramienta de términos.
- La duración inmutable obliga a crear un plan nuevo para cambiarla; los miembros del plan viejo conservan su ciclo (SUP-S07-005).
- Un cambio de plan sin pago no se puede anular (BEH-S07-027): un error se corrige con otro cambio, que calcula con el estado actual y puede cobrar o dar días distintos.
- El `cobroId` es compartido con `registrarPago`: un `cobroId` de una membresía llegado a `cambiarPlan` se rechaza como conflicto (REQ-S07-018).
- Se editan tres archivos de `caja/` que S-08 reconstruye; el trabajo es acotado por la exención. El permiso `PAGOS CREAR` y el rol del socio cambiarán con S-23.
- `anularPago` crece: ahora distingue el cobro de cambio de plan; si S-04 se implementa antes, se retoca ese caso de uso.
- Las cifras de 0.4 cambian cuando S-00 a S-06 modifiquen el árbol. Mitigación: se recuentan al empezar.
- `Miembro.precioPlan` no tiene CHECK de rango; un valor inválido produciría un valor no consumido inválido (no verificado).

### 5.4 Preguntas abiertas
- ¿Se conserva el cálculo del valor no consumido (tarifa diaria por días restantes) para el cambio de plan? Default: sí (SUP-S07-001, P-17).
- ¿Se permite bajar a un plan más corto pagando una diferencia aunque el vencimiento quede más cerca (BEH-S07-026)? Default: sí, con la vista previa (SUP-S07-001).
- ¿La duración de un plan se fija al crearlo y ya no se edita? Default: sí (SUP-S07-005).
- ¿El precio acordado con descuento de un miembro se pierde al cambiar de plan? Default: sí, rige el precio de catálogo (SUP-S07-009).
- ¿Un cambio de plan sin pago se puede deshacer? Default: no, se corrige con otro cambio (0.3).
- ¿La duración del plan se escribe en días, entre 1 y 365? Default: sí (SUP-S07-004).

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura), que recibió únicamente la ruta y la lista de comprobación. Veredicto sobre la versión `700e4f6`; cada fila se resume y el veredicto global se conserva tal como lo entregó. El revisor solo pudo usar `Read`, `Grep` y `Glob`: reprodujo los 12 conteos de 0.4 y comprobó a mano la aritmética de los cinco ejemplos, que es correcta.

> | # | Comprobación | Veredicto | Qué corregir (resumen del revisor) |
> |---|---|---|---|
> | 1 | Cabecera; ADRs | CUMPLE (con observaciones) | Añadir S-06 a `depende_de`; REQ-030 quitaba `organizacionId` sin citar ADR-019. |
> | 2 | Cada REQ: una obligación, EARS, origen | NO CUMPLE (menor) | Partir REQ-018, 022, 024, 026, 029, 030 y 034; REQ-004 a 006 mezclan «cobrar» y «fijar vencimiento» en una función pura; REQ-025 es «cuando»; orígenes flojos (ADR-010 no trata el cambio de plan); REQ-008 no describe `razonEntera`; REQ-001 no se puede probar. |
> | 3 | Cobertura; INV; categorías | NO CUMPLE (menor) | Faltan escenarios que S-04 sí cubre: `cobroId` anulado, error de unicidad, dos envíos con el mismo `cobroId`, plazos de 20 s y 5 s, método inválido, `Miembro.planId` nulo, doble clic sin pago, bajada con cobro, plan actual inactivo. |
> | 4 | Cada AC es binario; aritmética | NO CUMPLE | Aritmética correcta. AC-002 busca `number` y los días son `number`; AC-003 y AC-004 dicen «falla inyectada» sin decir cómo; AC-006 acepta dos resultados sin forzar el orden; AC-007 nombra una clase que REQ-038 prohíbe; AC-010 necesita un cast y un chequeo; AC-009 con `30.5` solo falla como texto; AC-011 «campo desconocido» sin REQ; `IUnidadDeTrabajo` solo tiene nombre. |
> | 5 | Hechos de 0.4 | CUMPLE (con 4 imprecisiones) | `ActualizarFrecuenciaPlan.ts` el reprorrateo está en `:73-81`; el modelo de auditoría termina cerca de `:447`; los 22 de `FrecuenciaPago` incluyen 5 de `ReglaAbono*`; 6 de los 10 de `CambiarPlanConPago` son comentarios; `PanelPagoYCambioPlan.tsx` sí se pudo leer. |
> | 6 | Hechos incompletos que afectan al diseño | NO CUMPLE | (a) la vista previa usa `hoy: new Date()` del navegador; (b) el heredado usa el precio de catálogo del plan viejo y S-07 el acordado; (c) el heredado fija `fechaUltimoPago` aun sin pago; (d) `cambiarPlanAction` usa `origen` para redirigir; (e) `ModalRegistrarPagoCaja.tsx` exige una edición grande; (f) `Plan.frecuencia` también lo leen `planFrecuencia` y `ListarEnSala`; (g) contrato de `api/planes`; (h) la ficha edita `precioPlan`; (i) `miembros/actions.ts:280-302` pasa `planId`; (j) ramas `vieneDelExcel`; (k) `pagoId` ya existe en la auditoría; (l) `PlanCortesiaConTiempoRestanteError` queda muerto. |
> | 7 | Supuestos y preguntas | NO CUMPLE (menor) | SUP-003 dice «confirmado» pero la opcionalidad es un supuesto; SUP-002 afirma algo falso (la ficha edita `precioPlan`); implícitos sin declarar (bajada con cobro, `planId` nulo, reloj del cliente); faltan dos preguntas; «mínima» sin medida. |
> | 8 | Contradicciones con ADR y specs; interfaces de S-04 | NO CUMPLE | (a) una bajada con cobro deja un fin menor y, con la regla «vigente más reciente = mayor fin» de S-04, bloquea la anulación del cambio y del cobro anterior; (b) S-04 dice que el cambio de plan no guarda `vencimientoAnterior` y S-07 sí; (c) REQ-026 no dice cómo se encuentra el plan anterior; (d) `cobroId` compartido; (e) el orden de validación hace que un reintento dé `PlanIgualError` antes de resolver el `cobroId`; (f) `MontoDesactualizadoError` compara solo el monto, que es 0.00 en la rama de días; S-05 ya retira `organizacionId`; las columnas `@db.Date` que S-02 entrega a S-07; S-02 REQ-020 no admite a S-07; S-23. |
> | 9 | Alcance | NO CUMPLE (menor) | La edición de `caja/` no está acotada; ramas `vieneDelExcel`; hueco de quién edita `precioPlan`; citar `docs/datos-iniciales.md` para S-15. |
> | 10 | Viabilidad | NO CUMPLE | `fechaLima` no tiene suma de días sobre cadenas; la anulación es inviable sin definir la restauración; faltan los plazos y el orden de validación; el orden de pruebas se contradice (el paso 4 deja el typecheck en rojo y varios pasos cambian firmas con llamadores sin migrar); las exenciones exigen archivos existentes; una bajada con cobro quita días. |
> | 11 | Riesgos omitidos | NO CUMPLE | Bajada con cobro, anulación bloqueada, vista previa obsoleta, reloj del navegador, `precioPlan` editado en la ficha, días gratis a precio acordado, `cobroId` compartido, doble clic, divergencia de precio, S-23, contrato de `api/planes`, sin CHECK en `precioPlan`. |
> | 12 | Enmiendas a S-02, S-03, S-04 y S-22 | NO CUMPLE | Sin IDs en S-02 y S-03; en S-04 faltan SUP-S04-010, REQ-S04-043, BEH-S04-038, su AC, 0.2, 0.3, 5.1 y los riesgos, y la definición de «vigente más reciente»; en S-22 falta REQ-S22-028; en S-05 «ninguna» es incorrecto. |
>
> **VEREDICTO GLOBAL: REQUIERE CAMBIOS.**

### Conciliación del autor
Todos los hallazgos se verificaron contra el Repo A y las specs y resultaron ciertos; ninguno se rechazó. Verificados con `grep` y `Read`: `hoy: new Date()` en `FormularioCambiarPlan.tsx:156-158`, el precio de catálogo del heredado en `CambiarPlanConPago.ts:156-158`, `planFrecuencia` en tres archivos, `Pago` sin columna de registro (solo `fechaPago` con valor por defecto, retroactivable) y las definiciones de S-04 y S-02 citadas.

- Fila 1 y 2: `depende_de` suma S-06; los REQ se rehicieron (61 en total): se separan el cálculo puro, la validación, el pago, las escrituras y la auditoría; los orígenes pasan a los supuestos SUP-S07-001 a SUP-S07-015 donde ningún ADR los trata; `razonEntera` y `proporcion` se definen con fórmula, modo half-up y error de divisor (REQ-S07-008 a REQ-S07-010); REQ-S07-001 pide una función pura exportada e importada por el servidor y el formulario.
- Fila 3: nuevos BEH de `cobroId` anulado, error de unicidad, dos envíos simultáneos con el mismo `cobroId`, plazos de 20 s y 5 s, método inválido, `Miembro.planId` vacío, doble clic sin pago y bajada con cobro; el plan actual inactivo y el miembro dado de baja se declaran en SUP-S07-016.
- Fila 4: AC-002 busca `Math.round`, `toFixed` y `Number(` sobre importes; la falla se inyecta con un doble del repositorio de auditoría; el orden se fuerza con una barrera; AC-007 ya no nombra la clase; la prueba de días de ciclo convierte con `unknown` y REQ-S07-048 agrega el chequeo; la inserción de `30.5` es texto; REQ-S07-051 exige rechazar campos extra; 5.1 declara que `IUnidadDeTrabajo` expone planes y auditoría.
- Fila 5: 0.4 corrige las cuatro citas y mueve a «verificado» lo que se pudo leer.
- Fila 6: 0.4 agrega los puntos (a) a (l); se resuelven con REQ-S07-053 (hoy del servidor), SUP-S07-002 (precio acordado, divergencia declarada), REQ-S07-029 y REQ-S07-030 (`fechaUltimoPago`), REQ-S07-051 y REQ-S07-052 (sin `origen`, sin redirigir), REQ-S07-056 (contrato de `api/planes`), REQ-S07-034 (`pagoId` y plan y precio anteriores en la auditoría) y los términos `planFrecuencia` y `PlanCortesiaConTiempoRestanteError` en REQ-S07-057; las tres archivos de `caja/` se listan en 0.2.
- Fila 7: SUP-S07-003 queda como supuesto; SUP-S07-002 deja de afirmar lo falso y se agregan SUP-S07-014 a SUP-S07-016; 5.4 agrega dos preguntas; «mínima» se reemplazó por la lista de archivos.
- Fila 8: (a) la regla del cobro anulable pasa a ser por orden de registro con la columna `Pago.creadoEn` (REQ-S07-038, REQ-S07-061, SUP-S07-011), con la enmienda a S-04; (b) esa enmienda también cubre `vencimientoAnterior` en el cambio de plan; (c) la auditoría guarda el plan y el precio anteriores y el `pagoId`, y REQ-S07-039 restaura desde ella; (d) REQ-S07-018 rechaza un `cobroId` que no es de cambio de plan; (e) REQ-S07-016 fija el orden de validación y BEH-S07-016 prueba el reintento; (f) REQ-S07-024 compara el monto y el vencimiento; S-05 y S-02 (REQ-S02-020, SUP-S02-004) se enmiendan en 5.2 y las fechas de la auditoría quedan como instante 05:00Z (SUP-S07-013).
- Fila 9 y 11: se lista la edición de `caja/`, se traspasan las ramas `vieneDelExcel` a S-10 y el `precioPlan` de la ficha queda declarado sin cambio (SUP-S07-014); 5.3 agrega los riesgos omitidos.
- Fila 10: `fechaLima` suma `sumarDiasLima` (REQ-S07-011); el plan de pruebas se rehízo en diez pasos que agregan lo nuevo al lado de lo viejo, migran los llamadores y retiran lo viejo al final con las exenciones en el mismo commit; los plazos de S-04 se heredan (REQ-S07-015); la bajada con cobro se acepta, con anulación posible por el nuevo orden (BEH-S07-026) y se pregunta al propietario.
- Fila 12: 5.2 lista las enmiendas por spec con sus IDs (REQ-S02-001, REQ-S02-020, AC-S02-012, REQ-S03-001, REQ-S03-005, REQ-S03-030, SUP-S04-007, REQ-S04-017, REQ-S04-035, SUP-S04-010, REQ-S04-043, BEH-S04-038, AC-S04-023, REQ-S22-016, BEH-S22-008, AC-S22-014 y REQ-S22-028).
- Lo que no se pudo verificar y queda marcado «no verificado»: que ningún reporte use `Plan.frecuencia`, el detalle de `IUnidadDeTrabajo` y el rango de `Miembro.precioPlan`.
- Aprobación: el propietario escribió «Aprobado» el 2026-11-12 sobre este texto corregido, con el veredicto ya pegado; se tomó como «S-07 aprobada» y como un sí a los valores por defecto de las seis preguntas de 5.4 y del resumen (cálculo conservado, bajada de plan aceptada con vista previa, duración fija, precio de catálogo, sin deshacer, valor no consumido con el precio acordado).
