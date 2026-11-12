---
id: S-07
estado: en-revision
adrs: ADR-010, ADR-011, ADR-016, ADR-018, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-22
aprobada_por:
fecha_aprobacion:
---
# S-07 — Cambio de plan: una sola operación, sin saldo a favor y sin planes «con entrenador»

## 0. Contexto y alcance

### 0.1 Problema
El código heredado cambia el plan de un miembro por tres caminos distintos que dan resultados distintos: editar el plan en la ficha del miembro (`ActualizarMiembro`) escala el tiempo transcurrido sin dinero de por medio, cambiar el plan con pago (`CambiarPlanConPago`) calcula el valor no consumido y cobra la diferencia, y cambiar la duración de un plan (`ActualizarFrecuenciaPlan`) recalcula a la vez todas las suscripciones de ese plan (doc 09 §3.2). Además cada plan puede ser «con» o «sin entrenador» y eso condiciona el cambio. El propietario decidió que no hay pagos repartidos ni saldo a favor (ADR-010), que todos los planes incluyen entrenador y que este se asigna solo al miembro (`docs/datos-iniciales.md`), y que no hay cobros de cortesía. S-07 deja una sola operación, `cambiarPlan`, con el cálculo del valor no consumido del heredado (P-17: conservar), hecho con la aritmética exacta de S-03 y las fechas de Lima de S-02, atómico con el bloqueo de S-04.

### 0.2 Dentro de alcance
- `calcularCambioPlan` reescrita con `dinero.ts` y `fechaLima` (el cálculo del heredado usa `number`, centavos redondeados con `Math.round` y días de Caracas), compartida por el servidor y la vista previa.
- `cambiarPlan` (reemplaza a `CambiarPlanConPago`): atómica con la unidad de trabajo y el bloqueo del miembro de S-04, con cobro idempotente, un solo pago de un solo método por la diferencia, registro de auditoría y fechas escritas con `fijarVencimiento`.
- Anulación de un cobro de cambio de plan que también restaura el plan anterior (S-04 deja el vencimiento).
- Retiro de los otros dos caminos: el prorrateo sin pago de `ActualizarMiembro` (`prorratearVencimiento`), `ActualizarFrecuenciaPlan` y `ContarImpactoCambioPlan`.
- Simplificación del plan: sin `incluyeEntrenador` ni `frecuencia`; precio mayor que cero; duración (`diasCiclo`) entera de 1 a 365 días y no editable después de crear el plan.
- El entrenador queda como dato opcional del miembro, sin relación con el plan.
- Esquema: `CambioPlanAuditoria` sin `modo`, `origen` ni `organizacionId` y con importes como decimales de dos dígitos; se eliminan los enums `FrecuenciaPago`, `ModoCambioPlanAuditoria` y `OrigenCambioPlanAuditoria`.
- Pantallas: `FormularioCambiarPlan`, `PanelPagoYCambioPlan` y los formularios y listados de planes.
- `tools/verificar-plan.mjs` con su paso en el CI; retiro de los archivos de la familia S-07 de las exenciones de S-02, S-03 y S-04.

### 0.3 Fuera de alcance
- La reconstrucción de la caja (`caja/*`), donde el asistente de cobro también ofrece el cambio de plan: S-08. S-07 solo cambia lo mínimo para que esos archivos usen la nueva acción.
- Quién es el entrenador y cómo se registra (persona sin credenciales): S-18. S-07 solo retira la relación con el plan y deja `Miembro.entrenadorId` opcional tal como está.
- Los planes iniciales y el entrenador sembrados: S-15.
- Cobro de un plan a un miembro sin vencimiento vigente: lo hace `registrarPago` (S-04).
- Editar el precio acordado de un miembro (`Miembro.precioPlan`) o el vencimiento desde la ficha: S-04 (`fijarVencimiento`).
- Deshacer un cambio de plan sin pago (diferencia de 0.00): no hay pago que anular; se corrige con otro cambio de plan.
- Cambio de plan con descuento o con precio acordado distinto del precio del plan nuevo: no se prevé (SUP-S07-009).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-07 recibirá después de S-00 a S-05 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Tres caminos:** `ActualizarMiembro` prorratea al cambiar `planId` (`ActualizarMiembro.ts:59,108-133`, con `prorratearVencimiento` de `CalcularVencimientoPlan.ts` en `:7,124`); `CambiarPlanConPago` calcula y cobra (`CambiarPlanConPago.ts:121-265`); `ActualizarFrecuenciaPlan` reprorratea las suscripciones del plan (`ActualizarFrecuenciaPlan.ts:1-30`) y `ContarImpactoCambioPlan.ts:6-12` cuenta las afectadas (verificado con `Read`).
- **Cálculo:** `calcularCambioPlan` (`cambioPlanCalculo.ts:50-84`) usa `number`: `Math.round((precioViejo*100)/diasCicloViejo*diasRestantes)` para el valor no consumido (`:63-65`), cobra la diferencia si el valor es menor que el precio nuevo (`:80-83`) y, si es mayor, convierte el excedente en días con `Math.round` (`:68-75`); lanza `PlanCortesiaConTiempoRestanteError` si el plan nuevo cuesta 0 (`:59-61`) y usa `diaCalendarioCaracas` (`:1,51-52`).
- **Cobro:** `cambiarPlanConPago` exige `PAGOS CREAR` (`:125-127`), aplica `MiembroFueraDeSucursalError` (`:134-137`, S-05), exige entrenador si el plan nuevo lo incluye (`:146-148`), falla sin ciclo vigente con `SinCicloVigenteError` (`:151-154`), toma el precio viejo del plan de la suscripción (`:158`), valida varias líneas de pago (`:190`), crea un pago por línea con `turnoId`, `tasaCambio` y `montoBs` (`:192-211`) y escribe suscripción, miembro y auditoría sin transacción (`:215-257`) (verificado con `Read` de `CambiarPlanConPago.ts`).
- **Auditoría:** `CambioPlanAuditoria` guarda importes en centavos enteros, `modo` y `origen` (`schema.prisma:375-400,401-440`, `CambioPlanAuditoria.ts`); `AJUSTAR_VENCIMIENTO` ya no se escribe y `OrigenCambioPlanAuditoria` distingue `CAJA`, `FICHA_MIEMBRO` y `CAMBIO_FRECUENCIA_PLAN` (verificado con `Read`).
- **Plan:** `Plan` (`schema.prisma:192-`) tiene `frecuencia` (enum `FrecuenciaPago` de 7 valores, `:180`), `diasCiclo`, `incluyeEntrenador` (`:203`), `precioUSD` y los campos de abono que retira S-04; el seed del heredado crea planes con y sin entrenador (`sembrarOrganizacionZipGym.ts:40-44`).
- **Alcance en código:** `incluyeEntrenador` en 15 archivos, `FrecuenciaPago` en 22, `CambiarPlanConPago` en 10 y `cambiarPlanConPago` en 3, `CambioPlanAuditoria` en 7, `FormularioCambiarPlan` en 6, `PanelPagoYCambioPlan` en 1, `calcularCambioPlan` en 5, `prorratearVencimiento` en 3, `ActualizarFrecuenciaPlan` en 3, `contarImpactoCambioPlan` en 2, `EntrenadorRequeridoError` en 2 (verificado con `grep -rIlF` sobre `apps` y `packages` sin `packages/db`).
- **Entrenador y plan:** `FormularioMiembro.tsx:241` marca `requiereEntrenador` según `incluyeEntrenador` y `:715` muestra «con entrenador»; `FormularioCambiarPlan.tsx:173` hace lo mismo; `FormularioPlan.tsx:133,212,330,374` y `planes/page.tsx:64,115` muestran «Incluido»; `planes/actions.ts:57,135` y `api/planes/route.ts:70` lo leen del formulario (verificado con `grep -n`). `Miembro.entrenadorId` es opcional (`Miembro.ts:11,33,51`).
- **Acciones y pantallas:** `cambiarPlanAction` está en `pagos/actions.ts:265`, recibe `lineas` y `origen` («miembro» o «caja», `:90,241`) y la usa `caja/page.tsx:36,137`; `FormularioCambiarPlan.tsx` tiene 408 líneas y usa `calcularCambioPlan` en `:9,156`; el planes tiene `actualizarFrecuenciaPlanAction` en `planes/actions.ts:124`.
- **Familia S-07:** S-03 define su familia como `CambiarPlan*`, `cambioPlan*` y `FormularioCambiarPlan*` (verificado con `grep -n` en `S-03`, tabla de familias); S-04 anotó que `CambiarPlanConPago.ts` conserva términos de abono y escrituras propias hasta S-07.
- **Interacción con S-04 aprobada:** `registrarPago` rechaza un plan distinto cuando hay un vencimiento vigente (REQ-S04-035), usa `IUnidadDeTrabajo`, `bloquearPorId`, `fijarVencimiento`, `cobroId` y `Pago.vencimientoAnterior`, y deja sin revertir `planId` ni `precioPlan` al anular (`S-04` §0.3, verificado con `grep -n`).
- No verificado: el contenido de `PanelPagoYCambioPlan.tsx`, los 6 archivos que mencionan `FormularioCambiarPlan` más allá de la lista, y que ningún reporte use `Plan.frecuencia`.

### 0.5 Supuestos
- SUP-S07-001: el cálculo del valor no consumido del heredado se conserva (P-17, default «conservar»): tarifa diaria del ciclo actual por los días restantes, y nunca se acredita dinero ni se genera saldo a favor. Default: conservar el cálculo; asumido, por validar.
- SUP-S07-002: la tarifa diaria del ciclo actual es `Miembro.precioPlan` entre los `diasCiclo` del plan actual; como `planId`, `precioPlan` y la suscripción solo cambian juntos en `registrarPago` y `cambiarPlan` (una transacción cada uno), el plan del miembro y el de su suscripción vigente no se desfasan. Default: ese precio; asumido, por validar.
- SUP-S07-003: todos los planes incluyen entrenador y este se asigna solo al miembro, de forma opcional, por decisión del propietario del 2026-11-12 (`docs/datos-iniciales.md`). Default: entrenador opcional; decisión confirmada por el propietario; asumido, por validar su obligatoriedad.
- SUP-S07-004: `Plan.frecuencia` se elimina: con los planes de 1, 2 y 3 meses del propietario y sin días de gracia solo la usaba para etiquetar y para reprorratear; la duración queda en `diasCiclo`, un entero de 1 a 365 días fijado al crear el plan (30, 60 y 90 en el seed). Default: ese modelo; asumido, por validar.
- SUP-S07-005: la duración de un plan no se edita después de crearlo; para una duración distinta se crea otro plan y se desactiva el anterior. Default: duración inmutable; asumido, por validar.
- SUP-S07-006: el redondeo del valor no consumido y de los días nuevos es half-up al céntimo y al día entero, explícito en la función (ADR-011). Default: half-up; asumido, por validar.
- SUP-S07-007: la fecha del cambio es siempre hoy (día de Lima); no se admiten fechas pasadas ni futuras. Default: hoy; asumido, por validar.
- SUP-S07-008: el cliente envía el monto que vio en la vista previa y el servidor lo rechaza si su recálculo difiere (por ejemplo, si pasó la medianoche de Lima). Default: ese control; asumido, por validar.
- SUP-S07-009: el precio del plan nuevo es el del catálogo; el precio acordado con descuento del miembro se pierde al cambiar de plan. Default: precio de catálogo; asumido, por validar.
- SUP-S07-010: el pago del cambio de plan es un solo pago de un solo método, con `cobroId` obligatorio cuando el monto es mayor que 0.00, y no hay pago cuando el monto es 0.00. Default: ese criterio, coherente con P-16 y S-04; asumido, por validar.
- SUP-S07-011: la anulación de un cobro de cambio de plan restaura `planId`, `precioPlan` y el plan de la suscripción anteriores; no se hace nada especial con un cambio de plan sin pago. Default: ese comportamiento; asumido, por validar.
- SUP-S07-012: los archivos de `caja/` solo se tocan para usar la nueva firma de `cambiarPlanAction` y quedan en la lista de exenciones de S-08. Default: edición mínima; asumido, por validar.

## 1. Requisitos

### REQ-S07-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La función calcularCambioPlan deberá ser una función pura que el servidor y la vista previa usan sin duplicar su cálculo.

### REQ-S07-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Los días restantes deberán ser la cantidad de días de Lima desde hoy hasta el día de vencimiento, sin ser nunca negativos y con valor 0 el día del vencimiento.

### REQ-S07-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El valor no consumido deberá ser el precio acordado actual por los días restantes entre los días del ciclo del plan actual, redondeado una sola vez al céntimo con half-up.

### REQ-S07-004
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando el valor no consumido es menor que el precio del plan nuevo, calcularCambioPlan deberá cobrar la diferencia y fijar el vencimiento en hoy más los días del ciclo del plan nuevo.

### REQ-S07-005
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando el valor no consumido es igual al precio del plan nuevo, calcularCambioPlan deberá cobrar 0.00 y fijar el vencimiento en hoy más los días del ciclo del plan nuevo.

### REQ-S07-006
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando el valor no consumido supera el precio del plan nuevo, calcularCambioPlan deberá cobrar 0.00 y fijar el vencimiento en hoy más los días del ciclo del plan nuevo más los días equivalentes al excedente, redondeados half-up a días enteros.

### REQ-S07-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función calcularCambioPlan deberá calcular importes con dinero.ts y días con fechaLima, sin number para el dinero ni Math.round.

### REQ-S07-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El módulo dinero.ts deberá exportar proporcion, que multiplica un monto por un cociente de enteros y redondea una sola vez, y razonEntera, que divide dos montos por un factor y redondea a un entero.

### REQ-S07-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El módulo fechaLima deberá exportar diasEntreLima, que devuelve la cantidad de días de calendario de Lima entre dos días AAAA-MM-DD.

### REQ-S07-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La función cambiarPlan deberá reemplazar a CambiarPlanConPago como la operación que cambia el plan de un miembro con vencimiento vigente.

### REQ-S07-011
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el usuario no tiene el permiso PAGOS CREAR entonces cambiarPlan deberá rechazar el cambio sin leer ni escribir datos del miembro.

### REQ-S07-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La función cambiarPlan deberá abrir su transacción y bloquear la fila del miembro mediante los puertos IUnidadDeTrabajo y bloquearPorId, y releer el miembro y su suscripción vigente después de tomar el bloqueo.

### REQ-S07-013
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el miembro no existe, el plan nuevo no existe o el plan nuevo está inactivo entonces cambiarPlan deberá rechazar el cambio con un error propio para cada caso.

### REQ-S07-014
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el plan nuevo es el plan actual del miembro entonces cambiarPlan deberá rechazar el cambio con PlanIgualError.

### REQ-S07-015
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el miembro no tiene una suscripción vigente entonces cambiarPlan deberá rechazar el cambio con SinCicloVigenteError e indicar que corresponde un cobro normal.

### REQ-S07-016
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el monto esperado que envía el cliente difiere del monto que calcula el servidor entonces cambiarPlan deberá rechazar el cambio con MontoDesactualizadoError sin escribir nada.

### REQ-S07-017
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el monto a cobrar es mayor que 0.00 y no se indica un método de pago entonces cambiarPlan deberá rechazar el cambio con MetodoPagoRequeridoError.

### REQ-S07-018
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando el monto a cobrar es mayor que 0.00, cambiarPlan deberá crear un solo pago por ese monto, de un solo método, con el nuevo vencimiento como fin de ciclo y el vencimiento anterior registrado.

### REQ-S07-019
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando el monto a cobrar es 0.00, cambiarPlan no deberá crear ningún pago.

### REQ-S07-020
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando cambiarPlan recibe un cobroId ya registrado con el mismo miembro, plan nuevo e importe, deberá devolver el resultado original sin crear otro pago ni mover el vencimiento.

### REQ-S07-021
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si el monto a cobrar es mayor que 0.00 y el cobroId falta o está registrado con otro miembro, plan o importe entonces cambiarPlan deberá rechazar el cambio con un error de conflicto sin escribir nada.

### REQ-S07-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La función cambiarPlan deberá actualizar el plan, el precio acordado y el vencimiento del miembro y el plan y el fin de su suscripción vigente con fijarVencimiento, dentro de la misma transacción que el pago.

### REQ-S07-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La función cambiarPlan deberá crear un registro de CambioPlanAuditoria con los planes, los importes, los días y los vencimientos usados en el cálculo, dentro de la misma transacción.

### REQ-S07-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La función cambiarPlan no deberá consultar turnos, tasas de cambio ni días de gracia, ni modificar el entrenador del miembro.

### REQ-S07-025
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si cambiarPlan y registrarPago reciben a la vez operaciones del mismo miembro entonces deberán procesarlas una tras otra y calcular la segunda con el estado que dejó la primera.

### REQ-S07-026
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando se anula un pago de cambio de plan, anularPago deberá restaurar el plan, el precio acordado y el plan de la suscripción anteriores, en la misma transacción que restaura el vencimiento.

### REQ-S07-027
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-003
- texto: El esquema no deberá contener la columna Plan.incluyeEntrenador.

### REQ-S07-028
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-003
- texto: El entrenador de un miembro deberá ser opcional e independiente del plan, de modo que crear el miembro o cambiar su plan no lo exija ni lo modifique.
### REQ-S07-029
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-004
- texto: El esquema no deberá contener la columna Plan.frecuencia ni los enums FrecuenciaPago, ModoCambioPlanAuditoria y OrigenCambioPlanAuditoria.

### REQ-S07-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La tabla CambioPlanAuditoria no deberá tener las columnas modo, origen ni organizacionId.
### REQ-S07-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La base deberá rechazar un plan con precio igual o menor que 0.00.

### REQ-S07-032
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-004
- texto: La base deberá rechazar un plan cuyos días de ciclo no sean un entero entre 1 y 365.

### REQ-S07-033
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-005
- texto: Los casos de uso de planes no deberán permitir modificar los días de ciclo de un plan existente.

### REQ-S07-034
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Los archivos ActualizarFrecuenciaPlan, ContarImpactoCambioPlan y CalcularVencimientoPlan y sus pruebas no deberán existir.
### REQ-S07-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La acción cambiarPlanAction deberá recibir solo el miembro, el plan nuevo, el monto esperado, el método de pago, el número de operación y el cobroId.
### REQ-S07-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El formulario de cambio de plan deberá mostrar antes de confirmar el valor no consumido, el monto a cobrar o los días agregados y el nuevo vencimiento, calculados con calcularCambioPlan.

### REQ-S07-037
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S07-003
- texto: Los formularios, los listados y las rutas de planes no deberán ofrecer ni mostrar entrenador incluido ni frecuencia.

### REQ-S07-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next, generated y las exenciones cerradas de la familia S-08, no deberán contener los términos incluyeEntrenador, FrecuenciaPago, ActualizarFrecuenciaPlan, ContarImpactoCambioPlan, prorratearVencimiento, CambiarPlanConPago, EntrenadorRequeridoError, OrigenCambioPlan ni ModoCambioPlan.

### REQ-S07-039
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-plan.mjs encuentra alguno de los términos de REQ-S07-038 fuera de las exenciones o por encima del tope de una exención, deberá terminar con código distinto de cero y nombrar archivo y línea.

### REQ-S07-040
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-plan.mjs en cada pull request.

### REQ-S07-041
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las listas de exenciones de verificar-dinero, verificar-fechas y verificar-pagos no deberán contener archivos de la familia S-07 al terminar la spec.


### REQ-S07-042
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La tabla CambioPlanAuditoria deberá guardar sus importes como decimales de dos dígitos.

### REQ-S07-043
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El tipo de los cambios de actualizarMiembro no deberá aceptar el campo planId.
## 2. Comportamiento

### BEH-S07-001
- cubre: REQ-S07-001, REQ-S07-004
- categoria: feliz
- dado: un miembro con el plan de 1 mes (30 días, S/ 120.00) acordado en S/ 120.00 y 15 días restantes
- cuando: se calcula el cambio al plan de 3 meses (90 días, S/ 280.00)
- entonces: el valor no consumido es 60.00, el monto a cobrar es 220.00 y el vencimiento es hoy más 90 días; la vista previa y el servidor dan lo mismo

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
- dado: un miembro cuyo vencimiento es hoy (día de Lima) con el plan de 1 mes (S/ 120.00), y otro con vencimiento ayer
- cuando: se calcula el cambio al plan de 2 meses (S/ 200.00)
- entonces: para el primero los días restantes son 0, el valor no consumido 0.00 y el monto 200.00; para el segundo el cálculo no aplica porque no tiene suscripción vigente

### BEH-S07-005
- cubre: REQ-S07-003
- categoria: borde
- dado: un plan de 30 días acordado en S/ 10.05 con 15 días restantes, y un plan de 30 días acordado en S/ 100.00 con 1 y 2 días restantes
- cuando: se calcula el valor no consumido
- entonces: dan 5.03 (5.025 redondeado half-up), 3.33 (3.3333) y 6.67 (6.6667)

### BEH-S07-006
- cubre: REQ-S07-007, REQ-S07-008, REQ-S07-009
- categoria: feliz
- dado: calcularCambioPlan, dinero.ts y fechaLima
- cuando: se prueban las funciones con TZ=UTC, America/Lima y Asia/Tokyo
- entonces: proporcion("10.05", 15, 30) da "5.03", razonEntera("128.89", "120.00", 30) da 32, diasEntreLima("2026-11-12", "2026-11-27") da 15 y calcularCambioPlan no contiene number para el dinero ni Math.round

### BEH-S07-007
- cubre: REQ-S07-010, REQ-S07-022, REQ-S07-023, REQ-S07-018
- categoria: feliz
- dado: el miembro de BEH-S07-001 y un método de pago Yape
- cuando: se ejecuta cambiarPlan con montoEsperado "220.00" y un cobroId nuevo
- entonces: se crea un pago de 220.00 con Yape, el miembro queda con el plan de 3 meses, el precio acordado 280.00 y el nuevo vencimiento, su suscripción apunta al plan nuevo con el mismo fin, el pago guarda el vencimiento anterior y existe un registro de auditoría con los importes y días del cálculo

### BEH-S07-008
- cubre: REQ-S07-019
- categoria: feliz
- dado: el miembro de BEH-S07-002
- cuando: se ejecuta cambiarPlan con montoEsperado "0.00"
- entonces: no se crea ningún pago, el miembro queda con el plan de 1 mes y el vencimiento de hoy más 62 días y se crea el registro de auditoría con montoCobrado 0.00

### BEH-S07-009
- cubre: REQ-S07-011
- categoria: error
- dado: un usuario sin el permiso PAGOS CREAR
- cuando: ejecuta cambiarPlan
- entonces: se rechaza el cambio sin leer ni escribir datos del miembro

### BEH-S07-010
- cubre: REQ-S07-013
- categoria: error
- dado: un miembro inexistente, un plan nuevo inexistente y un plan nuevo inactivo
- cuando: se ejecuta cambiarPlan con cada uno
- entonces: se lanzan MiembroNoEncontradoError, PlanNoEncontradoError y PlanInactivoError, sin escribir

### BEH-S07-011
- cubre: REQ-S07-014
- categoria: error
- dado: un miembro con el plan de 1 mes vigente
- cuando: se ejecuta cambiarPlan con el mismo plan
- entonces: se lanza PlanIgualError y no se escribe nada

### BEH-S07-012
- cubre: REQ-S07-015
- categoria: error
- dado: un miembro sin suscripción vigente, uno con vencimiento de ayer y uno que nunca pagó
- cuando: se ejecuta cambiarPlan con cada uno
- entonces: se lanza SinCicloVigenteError con el aviso de que corresponde un cobro normal, sin escribir

### BEH-S07-013
- cubre: REQ-S07-016
- categoria: error
- dado: el miembro de BEH-S07-001 y un montoEsperado "200.00"
- cuando: se ejecuta cambiarPlan
- entonces: se lanza MontoDesactualizadoError y no se crea pago ni se modifica el miembro

### BEH-S07-014
- cubre: REQ-S07-017
- categoria: error
- dado: el miembro de BEH-S07-001 y un cambio sin método de pago
- cuando: se ejecuta cambiarPlan
- entonces: se lanza MetodoPagoRequeridoError y no se escribe nada

### BEH-S07-015
- cubre: REQ-S07-020
- categoria: borde
- dado: un cambio de plan ya confirmado con el cobroId C1
- cuando: se repite cambiarPlan con el mismo miembro, plan nuevo, importe y C1
- entonces: devuelve el resultado original, no crea otro pago y el vencimiento no se mueve

### BEH-S07-016
- cubre: REQ-S07-021
- categoria: error
- dado: un cambio con cobro a cobrar sin cobroId, y otro con el cobroId C1 de otro miembro
- cuando: se ejecuta cambiarPlan con cada uno
- entonces: ambos lanzan el error de conflicto y no se crea pago

### BEH-S07-017
- cubre: REQ-S07-012
- categoria: concurrencia
- dado: un miembro con el plan de 1 mes y dos cambiarPlan simultáneos al plan de 3 meses con cobroId distintos
- cuando: terminan las dos transacciones
- entonces: una se confirma y la otra lanza PlanIgualError porque releyó el plan ya cambiado; hay un solo pago y un solo registro de auditoría

### BEH-S07-018
- cubre: REQ-S07-025
- categoria: concurrencia
- dado: un miembro con el plan de 1 mes y vencimiento en 15 días, un cambiarPlan al plan de 3 meses y un registrarPago del plan de 1 mes a la vez
- cuando: terminan las dos transacciones
- entonces: se procesan una tras otra; si el cobro va primero el cambio calcula con el vencimiento extendido y el cliente recibe MontoDesactualizadoError; si el cambio va primero el cobro se rechaza por el plan distinto con vencimiento vigente (REQ-S04-035)

### BEH-S07-019
- cubre: REQ-S07-024, REQ-S07-028
- categoria: feliz
- dado: un miembro sin entrenador y otro con entrenador asignado
- cuando: se crea un miembro, se cambia el plan de cada uno y se mira el entrenador
- entonces: ningún paso exige entrenador y el entrenador de cada uno queda igual; el cambio no consulta turnos, tasas ni días de gracia

### BEH-S07-020
- cubre: REQ-S07-026
- categoria: feliz
- dado: el miembro de BEH-S07-007 después del cambio con pago de 220.00
- cuando: se anula ese pago con un motivo
- entonces: el miembro vuelve al plan de 1 mes, al precio acordado 120.00 y al vencimiento anterior; su suscripción apunta al plan de 1 mes con el fin anterior

### BEH-S07-021
- cubre: REQ-S07-026
- categoria: borde
- dado: el miembro de BEH-S07-008 (cambio sin pago)
- cuando: se intenta anular
- entonces: no hay pago que anular; el miembro vuelve al plan anterior solo con otro cambiarPlan, que calcula con el estado actual

### BEH-S07-022
- cubre: REQ-S07-027, REQ-S07-029, REQ-S07-030, REQ-S07-042
- categoria: feliz
- dado: el esquema final
- cuando: se consultan las columnas de Plan y de CambioPlanAuditoria y la lista de enums
- entonces: Plan no tiene incluyeEntrenador ni frecuencia, no existen los enums FrecuenciaPago, ModoCambioPlanAuditoria y OrigenCambioPlanAuditoria, y CambioPlanAuditoria no tiene modo, origen ni organizacionId y sus importes son numeric(12,2)

### BEH-S07-023
- cubre: REQ-S07-031, REQ-S07-032
- categoria: error
- dado: una base con el esquema final
- cuando: se inserta un plan con precio 0.00, otro con precio -5.00, otro con 0 días de ciclo, otro con 366 y otro con 30.5
- entonces: la base rechaza las cinco inserciones

### BEH-S07-024
- cubre: REQ-S07-033
- categoria: error
- dado: un plan existente de 30 días
- cuando: se intenta actualizar con actualizarPlan un cambio de días de ciclo
- entonces: el caso de uso lo rechaza y los días de ciclo no cambian; el nombre, el precio y el estado se actualizan

### BEH-S07-025
- cubre: REQ-S07-034, REQ-S07-043
- categoria: feliz
- dado: el árbol final
- cuando: se buscan los tres archivos retirados y se llama a actualizarMiembro con un campo planId
- entonces: los archivos no existen y el tipo de los cambios no acepta planId

### BEH-S07-026
- cubre: REQ-S07-035
- categoria: error
- dado: peticiones a cambiarPlanAction con líneas de pago, con entrenador y con origen, y otra con los campos correctos
- cuando: se ejecutan
- entonces: las tres primeras se rechazan con un error de campo desconocido y la cuarta se procesa

### BEH-S07-027
- cubre: REQ-S07-036
- categoria: feliz
- dado: el formulario de cambio de plan de un miembro con vencimiento vigente
- cuando: se elige un plan nuevo
- entonces: la pantalla muestra el valor no consumido, el monto a cobrar o los días agregados y el nuevo vencimiento antes de confirmar, iguales al servidor

### BEH-S07-028
- cubre: REQ-S07-037
- categoria: feliz
- dado: el panel con un socio
- cuando: abre el alta y la edición de planes, el listado de planes, el alta de un miembro y la API de planes
- entonces: no hay casilla ni etiqueta de entrenador incluido ni de frecuencia, el formulario pide nombre, precio y duración en días y la duración no se puede editar en un plan existente

### BEH-S07-029
- cubre: REQ-S07-038, REQ-S07-039
- categoria: error
- dado: archivos de prueba con incluyeEntrenador, FrecuenciaPago, ActualizarFrecuenciaPlan, ContarImpactoCambioPlan, prorratearVencimiento, CambiarPlanConPago, EntrenadorRequeridoError, OrigenCambioPlan y ModoCambioPlan, y un archivo exento que supera su tope
- cuando: se ejecuta tools/verificar-plan.mjs
- entonces: falla y nombra archivo y línea de los nueve términos y del archivo que supera su tope

### BEH-S07-030
- cubre: REQ-S07-040
- categoria: error
- dado: un pull request que agrega incluyeEntrenador en un archivo no exento
- cuando: corre el CI
- entonces: el paso de tools/verificar-plan.mjs falla y queda en rojo

### BEH-S07-031
- cubre: REQ-S07-041
- categoria: feliz
- dado: las listas de exenciones de verificar-dinero, verificar-fechas y verificar-pagos
- cuando: se ejecutan sus pruebas de lista
- entonces: ninguna entrada nombra CambiarPlanConPago, cambioPlanCalculo ni FormularioCambiarPlan

## 3. Invariantes

### INV-S07-001
- propiedad: el plan del miembro es siempre el de su suscripción vigente después de cualquier secuencia de cobros, cambios de plan y anulaciones
- mecanismo: test-propiedad
- deteccion: 200 secuencias de operaciones generadas con semilla fija sobre una base efímera; tras cada operación, Miembro.planId debe ser igual a Suscripcion.planId de la suscripción vigente
- protege: REQ-S07-022, REQ-S07-026

### INV-S07-002
- propiedad: el cambio de plan nunca acredita dinero: el monto a cobrar es cero o la diferencia exacta, y nunca negativo
- mecanismo: test-propiedad
- deteccion: 500 combinaciones de precios, ciclos y días restantes generadas con semilla fija; el valor no consumido más el monto a cobrar debe ser igual al precio del plan nuevo cuando el monto es mayor que cero, y el monto nunca debe ser negativo
- protege: REQ-S07-004, REQ-S07-005, REQ-S07-006

### INV-S07-003
- propiedad: todo plan tiene un precio mayor que 0.00 y días de ciclo enteros entre 1 y 365
- mecanismo: restriccion-bd
- deteccion: CHECK sobre Plan.precio y Plan.diasCiclo; una inserción o actualización fuera de rango falla
- protege: REQ-S07-031, REQ-S07-032

### INV-S07-004
- propiedad: un cambio de plan con cobro y su registro de auditoría se confirman o se revierten juntos y el importe del pago es igual al montoCobrado de la auditoría
- mecanismo: transaccion
- deteccion: una falla inyectada tras crear el pago deja sin pago, sin auditoría, sin cambios en el miembro y en la suscripción; en el caso feliz el importe del pago es igual a montoCobrado
- protege: REQ-S07-012, REQ-S07-018, REQ-S07-022, REQ-S07-023

### INV-S07-005
- propiedad: los términos retirados no aparecen en apps ni packages fuera de las exenciones cerradas
- mecanismo: lint
- deteccion: tools/verificar-plan.mjs termina con código distinto de cero y lista archivo:línea de cada coincidencia fuera de las exenciones
- protege: REQ-S07-038, REQ-S07-039

## 4. Criterios de aceptación

### AC-S07-001
- enlaza: REQ-S07-001, REQ-S07-002, REQ-S07-003, REQ-S07-004, REQ-S07-005, REQ-S07-006, BEH-S07-001, BEH-S07-002, BEH-S07-003, BEH-S07-004, BEH-S07-005, INV-S07-002
- metodo: unitario
- procedimiento: probar calcularCambioPlan con los casos de BEH-S07-001 a BEH-S07-005 con la fecha de hoy fija, y con 500 combinaciones generadas con semilla fija
- esperado: los resultados coinciden con los números de los comportamientos y el valor no consumido más el monto a cobrar es igual al precio nuevo cuando el monto es mayor que cero, sin montos negativos
- test: pendiente

### AC-S07-002
- enlaza: REQ-S07-007, REQ-S07-008, REQ-S07-009, BEH-S07-006
- metodo: unitario
- procedimiento: ejecutar las pruebas de proporcion, razonEntera y diasEntreLima con TZ=UTC, America/Lima y Asia/Tokyo, y buscar number y Math.round en calcularCambioPlan
- esperado: los resultados son proporcion("10.05", 15, 30) igual a "5.03", razonEntera("128.89", "120.00", 30) igual a 32 y diasEntreLima("2026-11-12", "2026-11-27") igual a 15, iguales en las tres zonas, y no hay coincidencias
- test: pendiente

### AC-S07-003
- enlaza: REQ-S07-010, REQ-S07-018, REQ-S07-019, REQ-S07-022, REQ-S07-023, BEH-S07-007, BEH-S07-008, INV-S07-004
- metodo: integracion
- procedimiento: ejecutar cambiarPlan contra una base efímera con los miembros de BEH-S07-001 y BEH-S07-002 y leer pago, miembro, suscripción y auditoría; repetir con una falla inyectada tras crear el pago
- esperado: con cobro hay un solo pago de 220.00 con el vencimiento anterior registrado y el resto de los datos de BEH-S07-007; sin cobro no hay pago y la auditoría trae montoCobrado 0.00; con la falla no queda pago, auditoría ni cambio
- test: pendiente

### AC-S07-004
- enlaza: REQ-S07-011, REQ-S07-013, REQ-S07-014, REQ-S07-015, REQ-S07-016, REQ-S07-017, REQ-S07-021, BEH-S07-009, BEH-S07-010, BEH-S07-011, BEH-S07-012, BEH-S07-013, BEH-S07-014, BEH-S07-016
- metodo: integracion
- procedimiento: ejecutar cambiarPlan con los casos de esos comportamientos, contando las filas leídas y escritas
- esperado: se lanzan los errores indicados sin escribir nada, y sin permiso no se lee ningún dato del miembro
- test: pendiente

### AC-S07-005
- enlaza: REQ-S07-020, BEH-S07-015
- metodo: integracion
- procedimiento: repetir un cambiarPlan confirmado con el mismo cobroId, miembro, plan nuevo e importe
- esperado: devuelve el resultado original, no crea otro pago y el vencimiento es el mismo
- test: pendiente

### AC-S07-006
- enlaza: REQ-S07-012, REQ-S07-025, BEH-S07-017, BEH-S07-018
- metodo: integracion
- procedimiento: lanzar con Promise.all dos cambiarPlan al mismo plan con cobroId distintos, y en otra prueba un cambiarPlan y un registrarPago del mismo miembro, con una barrera que fuerza que se crucen
- esperado: en la primera una se confirma y la otra lanza PlanIgualError, con un solo pago y una sola auditoría; en la segunda se procesan una tras otra con los resultados de BEH-S07-018
- test: pendiente

### AC-S07-007
- enlaza: REQ-S07-024, REQ-S07-028, BEH-S07-019
- metodo: integracion
- procedimiento: crear un miembro sin entrenador y otro con entrenador, cambiar el plan de cada uno y espiar las consultas a turnos, tasas y días de gracia
- esperado: ningún paso lanza EntrenadorRequeridoError, el entrenador de cada miembro queda igual y no hay consultas a turnos, tasas ni días de gracia
- test: pendiente

### AC-S07-008
- enlaza: REQ-S07-026, BEH-S07-020, BEH-S07-021, INV-S07-001
- metodo: integracion
- procedimiento: cambiar de plan con cobro y anular el pago con motivo; intentar anular un cambio sin pago; y ejecutar las 200 secuencias generadas con semilla fija de cobros, cambios y anulaciones comprobando el plan del miembro contra el de su suscripción vigente
- esperado: tras anular el miembro tiene el plan, el precio y el vencimiento anteriores; el cambio sin pago no tiene pago que anular; en las secuencias el plan del miembro siempre es el de su suscripción vigente
- test: pendiente

### AC-S07-009
- enlaza: REQ-S07-027, REQ-S07-029, REQ-S07-030, REQ-S07-042, REQ-S07-031, REQ-S07-032, BEH-S07-022, BEH-S07-023, INV-S07-003
- metodo: sql
- procedimiento: consultar el esquema final por las columnas de Plan y de CambioPlanAuditoria y por los enums, e insertar planes con precio 0.00, -5.00, 0 días, 366 días y 30.5 días
- esperado: Plan no tiene incluyeEntrenador ni frecuencia, los tres enums no existen, CambioPlanAuditoria no tiene modo, origen ni organizacionId y sus importes son numeric(12,2), y la base rechaza las cinco inserciones
- test: pendiente

### AC-S07-010
- enlaza: REQ-S07-033, REQ-S07-034, REQ-S07-043, BEH-S07-024, BEH-S07-025
- metodo: unitario
- procedimiento: llamar a actualizarPlan con un cambio de días de ciclo, buscar los tres archivos retirados y comprobar con la API de typescript que el tipo de los cambios de actualizarMiembro no acepta planId
- esperado: el cambio de días se rechaza sin modificar el plan, los archivos no existen y el tipo no acepta planId
- test: pendiente

### AC-S07-011
- enlaza: REQ-S07-035, BEH-S07-026
- metodo: integracion
- procedimiento: llamar a cambiarPlanAction con líneas de pago, con entrenador, con origen y con los campos correctos
- esperado: las tres primeras reciben un error y la cuarta se procesa
- test: pendiente

### AC-S07-012
- enlaza: REQ-S07-036, REQ-S07-037, BEH-S07-027, BEH-S07-028
- metodo: manual
- procedimiento: como socio, abrir el cambio de plan de un miembro con vencimiento vigente y elegir un plan nuevo, luego abrir el alta y la edición de un plan, el listado de planes y el alta de un miembro
- esperado: la vista previa muestra los mismos números que el servidor, y no hay casilla ni etiqueta de entrenador incluido ni de frecuencia, ni se edita la duración de un plan existente
- test: pendiente

### AC-S07-013
- enlaza: REQ-S07-038, REQ-S07-039, BEH-S07-029, INV-S07-005
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-plan.mjs con un árbol por cada uno de los nueve términos, otro con una exención que supera su tope y otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los nueve términos y con la exención excedida nombrando archivo y línea, pasa con el limpio y en el árbol final solo aparecen archivos exentos dentro de su tope
- test: pendiente

### AC-S07-014
- enlaza: REQ-S07-040, BEH-S07-030
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue incluyeEntrenador en un archivo no exento y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-plan.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S07-015
- enlaza: REQ-S07-041, BEH-S07-031
- metodo: unitario
- procedimiento: ejecutar las pruebas de las listas de exenciones de verificar-dinero, verificar-fechas y verificar-pagos
- esperado: ninguna entrada nombra CambiarPlanConPago, cambioPlanCalculo ni FormularioCambiarPlan
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso, cada commit con typecheck y pruebas en verde): (1) pruebas de caracterización de `calcularCambioPlan` y de `CambiarPlanConPago` contra el código heredado (las de S-04 y S-05 que sobreviven); (2) pruebas nuevas de `proporcion`, `razonEntera` y `diasEntreLima`, y su implementación en `dinero.ts` y `fechaLima.ts` (enmiendas a S-03 y S-02); (3) pruebas nuevas de `calcularCambioPlan` con los casos de BEH-S07-001 a BEH-S07-005 y las propiedades de INV-S07-002, y su reescritura; (4) esquema: `CambioPlanAuditoria` con importes numéricos, CHECK de `Plan.precio` y `Plan.diasCiclo`, con la verificación de que `drizzle-kit push` crea los CHECK (con SQL de respaldo en S-15 si no), y retiro de `Plan.incluyeEntrenador`, `Plan.frecuencia` y los tres enums, de modo que el código que aún los lee falla el typecheck y se corrige en los pasos 5 a 8; (5) `cambiarPlan` con la unidad de trabajo, el bloqueo, el cobro idempotente y la auditoría, y retiro de `CambiarPlanConPago`; (6) anulación del cobro de cambio de plan que restaura el plan (extensión de `anularPago`); (7) retiro de `ActualizarFrecuenciaPlan`, `ContarImpactoCambioPlan`, `CalcularVencimientoPlan` y del campo `planId` de `actualizarMiembro`; (8) acciones y pantallas: `cambiarPlanAction`, `FormularioCambiarPlan`, `PanelPagoYCambioPlan`, formularios y listados de planes, formulario del miembro y la ruta `api/planes`; (9) `caja/` con la edición mínima de SUP-S07-012; (10) `tools/verificar-plan.mjs` con `tools/verificar-plan.exenciones.json` y el CI; (11) quitar los archivos de la familia S-07 de las exenciones de S-02, S-03 y S-04.
- El paso 4 retira columnas antes de que todo el código esté listo; los pasos 4 a 8 se hacen en la misma rama y cada commit conserva el typecheck en verde con las migraciones aditivas primero (se agrega lo nuevo, se migran los consumidores y se retira lo viejo al final de cada paso).
- Las pruebas de concurrencia usan semillas fijas, una base efímera y una barrera que fuerza que las transacciones se crucen; no hay dependencias nuevas.
- Los criterios AC-S07-012 y AC-S07-014 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15 con los planes de 30, 60 y 90 días y precios 120.00, 200.00 y 280.00 y sin `frecuencia` ni `incluyeEntrenador`.
- **Enmiendas que se registran al aprobar S-07:**
  - S-03: la tabla de operaciones de `dinero.ts` (5.1) suma `proporcion` y `razonEntera`; agregar al texto de sus REQ de exportaciones y a sus pruebas. La familia S-07 de la tabla de familias deja de ser exenta al terminar S-07.
  - S-02: la tabla de `fechaLima` (5.1) suma `diasEntreLima`.
  - S-04: REQ-S04-035 y su rechazo del plan distinto indican `cambiarPlan` como la operación que corresponde; el texto «la anulación no revierte `planId` ni `precioPlan`» queda resuelto para los cobros de cambio de plan (REQ-S07-026); SUP-S04-014 y la lista de exenciones de `verificar-pagos` pierden la familia S-07.
  - S-05: ninguna.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 restan tres enums (`FrecuenciaPago`, `ModoCambioPlanAuditoria`, `OrigenCambioPlanAuditoria`) respecto de los valores vigentes al implementar S-07 (hoy 16 tras S-06, y el total final depende del orden de S-08 a S-10 y S-18).
  - `docs/00-indice.md`, `docs/06-modelo-datos-cambios.md` y `docs/datos-iniciales.md`: nota de que los planes no tienen `frecuencia` ni `incluyeEntrenador` y de que la duración se fija al crear el plan.
- Traspasos: S-08 (el asistente de cobro de caja ofrece el cambio de plan), S-18 (entrenador como persona), S-15 (planes sembrados) y S-14 (reportes de ingresos por cambio de plan).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- La vista previa y el servidor pueden diferir si pasa la medianoche de Lima mientras el socio mira la pantalla; el servidor lo detecta con `MontoDesactualizadoError` (REQ-S07-016) y la pantalla recalcula.
- El cálculo conserva la tarifa diaria como precio entre días del ciclo; con planes de 1, 2 y 3 meses a precios distintos, cambiar de un plan largo a uno corto puede dar muchos días extra (por ejemplo 62 días en BEH-S07-002). Mitigación: la vista previa los muestra antes de confirmar y la regla se valida con el propietario (SUP-S07-001).
- Retirar `Plan.frecuencia` y `Plan.incluyeEntrenador` toca 22 y 15 archivos; el riesgo es un reporte o una pantalla que los lea (no verificado). Mitigación: el typecheck y la herramienta de términos.
- La duración inmutable obliga a crear un plan nuevo para cambiar la duración; los miembros del plan viejo conservan su ciclo. Mitigación: SUP-S07-005, a validar.
- Un cambio de plan sin pago no se puede anular (BEH-S07-021): un error del socio se corrige con otro cambio, que calcula con el estado actual y puede cobrar o dar días distintos. Mitigación: la vista previa muestra el resultado antes de confirmar.
- Se editan archivos de `caja/` que S-08 reconstruye; el trabajo es mínimo y acotado por la exención.
- `anularPago` crece: ahora distingue el cobro de cambio de plan para restaurar el plan; si S-04 se implementa antes, se retoca ese caso de uso.
- Las cifras de 0.4 cambian cuando S-00 a S-06 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Se conserva el cálculo del valor no consumido (tarifa diaria por días restantes) para el cambio de plan? Default: sí (SUP-S07-001, P-17).
- ¿La duración de un plan se fija al crearlo y ya no se edita? Default: sí (SUP-S07-005).
- ¿El precio acordado con descuento de un miembro se pierde al cambiar de plan? Default: sí, rige el precio de catálogo (SUP-S07-009).
- ¿La duración del plan se escribe en días, entre 1 y 365? Default: sí (SUP-S07-004).
