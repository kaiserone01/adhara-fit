---
id: S-04
estado: en-revision
adrs: ADR-010, ADR-011, ADR-016, ADR-018, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-22
aprobada_por:
fecha_aprobacion:
---
# S-04 — Pago único de membresía: cobro atómico, una sola fecha de vencimiento y anulación que la revierte

## 0. Contexto y alcance

### 0.1 Problema
El cobro heredado (`registrarPago`, 511 líneas) mezcla el pago de la membresía con abonos, saldo a favor, tolerancia, turnos de caja y tasa de cambio, escribe varias tablas sin transacción y guarda el vencimiento en dos lugares que el propio código lee a la vez. La anulación de un pago no devuelve el tiempo de acceso. ADR-010 (aceptado) decide un pago único por membresía, sin abonos, y que `registrarPago` se reescribe como una operación atómica; ADR-018 elimina los turnos y el fiado; ADR-011, S-02 y S-03 fijan el dinero y las fechas. S-04 reescribe el cobro y la anulación sobre esas bases, define el estado de acceso (activo, gracia y vencido) con una sola fecha y retira todo el código de abonos.

### 0.2 Dentro de alcance
- `registrarPago` reescrito: un cobro por membresía, con el precio acordado exacto por los meses pagados (de 1 a 6), en una transacción, con bloqueo por miembro y un identificador de cobro que evita duplicados.
- Una sola fecha de vencimiento: `Miembro.fechaVencimiento` y `Suscripcion.fin` siempre iguales y escritas en la misma transacción.
- Función única del estado de acceso (`activo`, `en_gracia`, `vencido`) con días de gracia para todos los planes.
- Pago con fecha pasada de hasta 90 días.
- `anularPago` que anula el cobro completo, solo el último vigente de un miembro, y devuelve el vencimiento anterior.
- Retiro del código de abonos: `ReglaAbono*`, `CobrarAbonoPendiente*`, `ListarAbonosPendientes*`, `proyeccionAbono.ts`, `RegistrarPagoConDeudas*` y su rama `incluirDeudas`, la pantalla de reglas de abono, las columnas `Plan.permitePagoParcial`, `Plan.minimoAbonoTipo`, `Plan.minimoAbonoValor`, `Suscripcion.fechaLimiteAbono` y `Miembro.saldoAFavorUSD` (hoy `saldoAFavor`), la tabla `ReglaAbonoPorFrecuencia`, el estado `abono_vencido` y la tolerancia.
- Formulario de cobro sin abono, saldo ni excedente, con vista previa del precio total y del vencimiento.
- Pruebas de caracterización de lo que se conserva, escritas antes de reescribir.
- `tools/verificar-pagos.mjs` con sus pruebas, ejecutada en el CI.
- Quitar del puente de dinero (S-03) y de las listas de exenciones de S-02 y S-03 todos los archivos de la familia S-04.

### 0.3 Fuera de alcance
- Cambio de plan a mitad de ciclo: S-07, con sus archivos exentos. Planes (su duración y precio) y la asignación de entrenador: S-07 y S-18.
- Turnos, arqueo y egresos (columna `Pago.turnoId` y modelos): S-08. Tasa de cambio y las columnas `Pago.tasaCambio` y `Pago.montoBs`: S-10; S-04 deja de llenarlas.
- Ventas de producto, fiado y las tablas de deuda: S-11 y ADR-018; S-04 solo retira el puente que combina una membresía con deudas.
- Sede única y `sucursal_incorrecta`: S-05. Dar de baja miembros: S-09. Tickets: S-12. Reportes de morosos: S-14.
- Registro retroactivo de miembros del padrón Excel y el aviso «Por regularizar»: S-10.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los `grep` excluyen `node_modules`, `generated` y `.next`.
- **Cobro sin transacción:** `registrarPago` (`packages/domain/use-cases/RegistrarPago.ts`, 511 líneas) escribe en este orden la suscripción (`extenderFin` en `:341` o `crear` en `:344`), el miembro (`actualizarFechasPago` en `:365`, `actualizar` del saldo en `:370`) y después los pagos (`pagos.crear` en `:381`), sin ninguna transacción (verificado con `grep -c transaction packages/domain/use-cases/RegistrarPago.ts`, 0 coincidencias); si la creación del pago falla, el miembro ya tiene el tiempo extendido. La rama de fechas pasadas (`registrarPagoRetroactivo`, `:408`) repite el patrón en `:462-492`.
- **Dependencias del cobro:** `RegistrarPagoDeps` incluye `turnos`, `reglasAbono` y `tasas` (`RegistrarPago.ts:116-127`); el cobro consulta el turno abierto (`:373`) y lee `miembro.saldoAFavorUSD` (`:262`).
- **Permiso y meses:** exige `PAGOS` `CREAR` (`:215`) y `meses` entero entre 1 y `MAX_MESES_POR_PAGO` = 6 (`:222`; `packages/domain/entities/Pago.ts:38`).
- **Fecha pasada:** `MAX_DIAS_ATRAS_PAGO_FECHADO` = 90 y `MAX_DIAS_ATRAS_PAGO_RETROACTIVO` = 365 (`Pago.ts:35` y `:33`); el límite de 365 días rige para miembros «Por regularizar» y para el primer pago de una inscripción (`RegistrarPago.ts:427`).
- **Cómo se calcula el fin:** `base` es el `fin` de la suscripción vigente si es posterior a ahora y, si no, ahora; el fin es `base + diasCiclo × meses` días (`RegistrarPago.ts:303-310`); conserva la hora del día de `ahora`.
- **Dos fechas de vencimiento:** `Suscripcion.fin` (`packages/domain/entities/Suscripcion.ts`) y `Miembro.fechaVencimiento` (`Miembro.ts:17`); la decisión de acceso usa la suscripción para «activo» y el miembro para «en gracia» en la misma función (`packages/domain/use-cases/ValidarAccesoSucursalPorPlan.ts:15-80`); 33 archivos no de prueba leen `fechaVencimiento` (verificado con `grep -rIl fechaVencimiento apps packages`); la escriben `RegistrarPago.ts:365` y `:481` y `CambiarPlanConPago.ts:223` mediante `actualizarFechasPago`.
- **Estados de acceso:** `EstadoCheckIn` = `activo`, `en_gracia`, `vencido`, `abono_vencido` y `sucursal_incorrecta` (`packages/domain/entities/CheckIn.ts:3`). Los días de gracia salen de `Sucursal.diasGracia` (`schema.prisma:43`, por defecto 0) y solo cuentan para planes mensuales (`packages/domain/entities/Plan.ts:14`, `diasGraciaParaPlan`); la gracia se calcula con `diasGracia * MS_POR_DIA` (milisegundos fijos).
- **Anulación:** `anularPago` (`AnularPago.ts`, 69 líneas) exige rol socio o gerente, motivo no vacío (`:47-48`) y llama a `pagos.anular` (`:59`) por línea de pago; solo reabre las deudas del fiado (`:63-65`) y **no toca la suscripción ni el vencimiento del miembro** (verificado con `grep -c "suscripciones\|miembros\|fechaVencimiento" packages/domain/use-cases/AnularPago.ts`, 0 coincidencias).
- **Llamadores de `registrarPago`:** `apps/web-admin/app/api/pagos/route.ts:90`, `apps/web-admin/app/(panel)/miembros/actions.ts:187`, `apps/web-admin/app/(panel)/pagos/actions.ts:209` y `RegistrarPagoConDeudas.ts:31`, `:39` y `:61` (verificado con `grep -rIn "registrarPago("`); el parámetro `completarCicloAbierto` lo pasa `RegistrarPagoConDeudas.ts:57` y `excedenteASaldoAFavor` lo pasan `miembros/actions.ts:209` y `pagos/actions.ts:198`.
- **Alcance del retiro:** 53 archivos no de prueba mencionan `abono` o `Abono`, 9 `saldoAFavor` y 14 `permitePagoParcial` o `minimoAbono`; la pantalla `apps/web-admin/app/(panel)/configuraciones/reglas-abono` tiene 3 archivos (verificado con `grep -rIlE` y `ls`).
- **Pruebas existentes:** hay `AnularPago.test.ts`, `RegistrarPagoMeses.test.ts`, `RegistrarPagoRetroactivo.test.ts` y `RegistrarPagoConDeudas.test.ts`, y no hay una prueba principal de `RegistrarPago` (verificado con `ls packages/domain/use-cases | grep -i "RegistrarPago\|AnularPago"`).
- **Decisiones que S-04 hereda:** ADR-010 (pago único, `RegistrarPago` reescrito de forma atómica, multi-mes de hasta 6, pago con fecha pasada de hasta 90 días y anulación, acceso en tres estados), ADR-018 (cobrar nunca exige turno) y las enmiendas de ADR-010 (P-16, P-17 y P-18 abiertas) (verificado con `grep -n "Decisión" -A10 docs/adr/ADR-010-pago-unico-sin-abonos.md`).
- No verificado: cuántos miembros pagan hoy por partes, que `completarCicloAbierto` y `resolverCobroPasado` solo sirvan al fiado y a la tasa (`resolverCobroPasado.ts` pertenece a la familia de S-10), y el contenido de `ActualizarMiembro.ts` que edita fechas de la ficha.

### 0.5 Supuestos
- SUP-S04-001: «pago único» significa que la membresía se paga completa en un solo cobro, que puede repartirse entre varios métodos (por ejemplo Efectivo y Yape) como hoy. Responde P-16. Default: se permite repartir; asumido, por validar.
- SUP-S04-002: cada mes del plan dura el `diasCiclo` del plan en días corridos (30 días para un mes), como hoy, y el vencimiento es un día de calendario de Lima (S-02). Default: días corridos; asumido, por validar.
- SUP-S04-003: el último día con acceso es el día de vencimiento (inclusive); los días de gracia cuentan desde el día siguiente; después el estado es «vencido». Default: ese criterio; asumido, por validar.
- SUP-S04-004: los días de gracia son un solo valor del negocio (`diasGracia`, por defecto 0) y valen para todos los planes. Responde P-18. Default: se mantiene la gracia, con valor 0 hasta que el propietario indique otro; asumido, por validar.
- SUP-S04-005: el precio a cobrar es el precio acordado del miembro (`Miembro.precioPlan`) cuando el cobro es del mismo plan, y el precio del plan cuando es otro, multiplicado por los meses; no hay excedente ni saldo a favor. Default: ese cálculo; asumido, por validar.
- SUP-S04-006: un cobro de S/ 0.00 solo se acepta cuando el precio acordado total es S/ 0.00; no hay «cortesía» por una línea de monto cero. Default: ese criterio; asumido, por validar.
- SUP-S04-007: se puede anular únicamente el cobro vigente más reciente de un miembro (el de mayor fin de ciclo); para anular uno anterior hay que anular antes los posteriores. Default: ese criterio; asumido, por validar.
- SUP-S04-008: un pago con fecha pasada acepta hasta 90 días hacia atrás, sin excepciones por «Por regularizar» ni por primer pago de inscripción; el límite de 365 días y el aviso se retiran. Default: 90 días; asumido, por validar.
- SUP-S04-009: el identificador de cobro (`cobroId`) lo genera la pantalla como un UUID y se guarda en `Pago.grupoPagoId` para todas las líneas, con una restricción única por línea. Default: ese mecanismo; asumido, por validar.
- SUP-S04-010: cada cobro guarda el vencimiento anterior del miembro (`Pago.vencimientoAnterior`, fecha o nulo) para que la anulación lo restaure sin recalcular. Default: columna nueva; asumido, por validar.
- SUP-S04-011: la columna `Pago.turnoId` y las columnas `tasaCambio` y `montoBs` quedan sin llenar hasta que S-08 y S-10 las retiren. Default: se dejan nulas; asumido, por validar.

## 1. Requisitos

### REQ-S04-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El cobro de una membresía deberá cubrir en un solo acto el precio acordado multiplicado por los meses pagados.

### REQ-S04-002
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si la suma de las líneas del cobro difiere en un céntimo o más del precio total acordado entonces registrarPago deberá rechazarlo sin escribir nada.

### REQ-S04-003
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si los meses del cobro no son un entero entre 1 y 6 entonces registrarPago deberá rechazarlo.

### REQ-S04-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El precio acordado deberá ser Miembro.precioPlan cuando el cobro es del plan actual del miembro y el precio del plan cuando es de otro plan.

### REQ-S04-005
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el miembro o el plan no existen, o el plan está inactivo, entonces registrarPago deberá rechazar el cobro con un error específico.

### REQ-S04-006
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el usuario no tiene el permiso PAGOS CREAR entonces registrarPago deberá rechazar el cobro sin leer ni escribir datos del miembro.

### REQ-S04-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: registrarPago deberá crear los pagos, crear o extender la suscripción y actualizar el miembro dentro de una sola transacción.

### REQ-S04-008
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando dos cobros del mismo miembro llegan a la vez, registrarPago deberá procesarlos uno tras otro y aplicar ambos al vencimiento.

### REQ-S04-009
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando registrarPago recibe un cobroId ya registrado, deberá devolver los pagos originales sin crear otros ni mover el vencimiento.

### REQ-S04-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El vencimiento de un cobro deberá ser el día de Lima de la base más los días del ciclo por los meses pagados, donde la base es el vencimiento vigente si es posterior a hoy y hoy en caso contrario.

### REQ-S04-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Miembro.fechaVencimiento y la fin de la suscripción vigente del miembro deberán tener siempre el mismo valor.

### REQ-S04-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La función estadoDeAcceso deberá devolver activo hasta el día de vencimiento inclusive, en_gracia durante los días de gracia siguientes y vencido después, calculados con una sola fecha de vencimiento y con fechaLima.

### REQ-S04-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Los días de gracia deberán ser un valor único del negocio que vale para todos los planes.

### REQ-S04-014
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando el cobro trae una fecha de pago pasada de hasta 90 días, registrarPago deberá usar esa fecha como fecha del pago y como día de base si el miembro no tiene un vencimiento posterior.

### REQ-S04-015
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si la fecha de pago es posterior a hoy o anterior a 90 días antes de hoy entonces registrarPago deberá rechazar el cobro.

### REQ-S04-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando se anula un pago con un motivo no vacío, anularPago deberá anular todas las líneas de ese cobro.

### REQ-S04-017
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el cobro que se anula no es el vigente más reciente del miembro entonces anularPago deberá rechazarlo indicando que primero se anulan los posteriores.

### REQ-S04-018
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando se anula un cobro, anularPago deberá restaurar en la misma transacción el vencimiento anterior guardado en ese cobro, en el miembro y en la suscripción.

### REQ-S04-019
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el pago ya está anulado o el motivo está vacío entonces anularPago deberá rechazar la anulación.

### REQ-S04-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: registrarPago y anularPago no deberán consultar turnos, reglas de abono ni tasas de cambio.

### REQ-S04-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Los archivos de apps y packages que no figuran en la lista de exenciones no deberán contener los términos abono, saldoAFavor, toleranciaDiferenciaPago, permitePagoParcial, minimoAbono, fechaLimiteAbono, abono_vencido, completarCicloAbierto ni excedenteASaldoAFavor.

### REQ-S04-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Los archivos RegistrarPagoConDeudas.ts y su prueba, y la rama incluirDeudas del cobro de membresía, no deberán existir al terminar la spec.

### REQ-S04-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: EstadoCheckIn deberá contener los valores activo, en_gracia, vencido y sucursal_incorrecta y no abono_vencido.

### REQ-S04-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El repositorio deberá tener, antes de la reescritura, pruebas de caracterización del cálculo del vencimiento, de los meses, de la fecha pasada y de la anulación.

### REQ-S04-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: registrarPago deberá calcular los montos con dinero.ts y las fechas con fechaLima, sin usar el puente de dinero.

### REQ-S04-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El formulario de cobro deberá mostrar el precio total exacto y el vencimiento resultante antes de confirmar.

### REQ-S04-027
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-pagos.mjs encuentra en un archivo no exento alguno de los términos de REQ-S04-021, deberá terminar con código distinto de cero y nombrar archivo y línea.

### REQ-S04-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-pagos.mjs en cada pull request.

### REQ-S04-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las listas de exenciones de verificar-dinero y de verificar-fechas no deberán contener archivos de la familia S-04 al terminar la spec.

### REQ-S04-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Las columnas Plan.permitePagoParcial, Plan.minimoAbonoTipo, Plan.minimoAbonoValor, Suscripcion.fechaLimiteAbono, Miembro.saldoAFavorUSD y la tabla ReglaAbonoPorFrecuencia no deberán existir en el esquema.

### REQ-S04-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El formulario de cobro no deberá ofrecer campos de abono, de saldo a favor ni de excedente.

## 2. Comportamiento

### BEH-S04-001
- cubre: REQ-S04-001, REQ-S04-010, REQ-S04-025
- categoria: feliz
- dado: un miembro nuevo, el plan «1 mes» de 30 días y S/ 120.00, y el 2026-11-12 en Lima
- cuando: se cobra "120.00" con una sola línea de Yape y número de operación "55123"
- entonces: se crea un pago, la suscripción empieza el 2026-11-12 y el vencimiento es el 2026-12-12, igual en el miembro y en la suscripción

### BEH-S04-002
- cubre: REQ-S04-010
- categoria: feliz
- dado: un miembro con vencimiento 2026-12-12 y hoy 2026-11-20
- cuando: paga otro mes del mismo plan
- entonces: la base es el vencimiento vigente y el nuevo vencimiento es el 2027-01-11 (2026-12-12 más 30 días)

### BEH-S04-003
- cubre: REQ-S04-010
- categoria: borde
- dado: un miembro con vencimiento 2026-10-01 (ya vencido) y hoy 2026-11-12
- cuando: paga un mes
- entonces: la base es hoy y el vencimiento es el 2026-12-12

### BEH-S04-004
- cubre: REQ-S04-001, REQ-S04-003, REQ-S04-010
- categoria: borde
- dado: el plan «1 mes» de S/ 120.00 y hoy 2026-11-12
- cuando: se cobran 3 meses con líneas "200.00" (Efectivo) y "160.00" (Yape, número "55124")
- entonces: se acepta porque la suma es "360.00", se crean 2 líneas con el mismo cobroId y el vencimiento es el 2027-02-10

### BEH-S04-005
- cubre: REQ-S04-002
- categoria: error
- dado: el plan «1 mes» de S/ 120.00
- cuando: se cobra "119.99", "120.01" y "60.00"
- entonces: los tres cobros se rechazan sin crear pagos, sin tocar la suscripción y sin cambiar el vencimiento

### BEH-S04-006
- cubre: REQ-S04-003
- categoria: error
- dado: un cobro con meses 0, 7, 1.5 y -1
- cuando: se ejecuta registrarPago
- entonces: cada cobro se rechaza con el error de meses inválidos

### BEH-S04-007
- cubre: REQ-S04-004
- categoria: borde
- dado: un miembro con precio acordado "100.00" en el plan «1 mes» de lista "120.00"
- cuando: se cobra el mismo plan y luego otro plan de lista "200.00"
- entonces: el primer cobro exige "100.00" y el segundo exige "200.00"

### BEH-S04-008
- cubre: REQ-S04-005, REQ-S04-006
- categoria: error
- dado: un miembro inexistente, un plan inactivo y un usuario sin el permiso PAGOS CREAR
- cuando: se ejecuta registrarPago en cada caso
- entonces: cada uno se rechaza con su error y, en el caso sin permiso, no se lee ni escribe el miembro

### BEH-S04-009
- cubre: REQ-S04-007
- categoria: error
- dado: un cobro con 2 líneas y un fallo forzado al crear la segunda
- cuando: se ejecuta registrarPago
- entonces: no existe ningún pago, la suscripción y el vencimiento del miembro quedan como antes y el error llega al llamador

### BEH-S04-010
- cubre: REQ-S04-008
- categoria: concurrencia
- dado: un miembro con vencimiento 2026-12-12 y 20 ejecuciones de dos cobros simultáneos de un mes
- cuando: ambos cobros llegan a la vez
- entonces: en las 20 ejecuciones quedan 2 pagos vigentes y el vencimiento es el 2027-01-11 más 30 días, es decir el 2027-02-10, sin estados intermedios

### BEH-S04-011
- cubre: REQ-S04-009
- categoria: concurrencia
- dado: dos envíos simultáneos del mismo cobro con el mismo cobroId
- cuando: ambos llegan a registrarPago
- entonces: existe un solo cobro, el vencimiento se movió una vez y los dos envíos reciben los mismos pagos

### BEH-S04-012
- cubre: REQ-S04-011
- categoria: feliz
- dado: el miembro de BEH-S04-001 después del cobro
- cuando: se consulta la suscripción vigente y el miembro
- entonces: ambos tienen vencimiento 2026-12-12

### BEH-S04-013
- cubre: REQ-S04-012, REQ-S04-013
- categoria: borde
- dado: un miembro con vencimiento 2026-11-10 y diasGracia = 3
- cuando: se calcula el estado el 10, el 11, el 13 y el 14 de noviembre de 2026 (Lima)
- entonces: el 10 es activo, el 11 y el 13 son en_gracia y el 14 es vencido

### BEH-S04-014
- cubre: REQ-S04-013
- categoria: borde
- dado: un plan semanal y un plan de 3 meses con vencimiento 2026-11-10 y diasGracia = 3
- cuando: se calcula el estado el 2026-11-12
- entonces: ambos están en_gracia, porque la gracia vale para todos los planes

### BEH-S04-015
- cubre: REQ-S04-014
- categoria: borde
- dado: un miembro vencido desde 2026-10-01 y hoy 2026-11-12
- cuando: se cobra un mes con fecha de pago 2026-10-20
- entonces: la fecha del pago es el 2026-10-20, la base es esa fecha y el vencimiento es el 2026-11-19

### BEH-S04-016
- cubre: REQ-S04-015
- categoria: error
- dado: hoy 2026-11-12
- cuando: se cobra con fecha de pago 2026-08-14, 2026-08-13 y 2026-11-13
- entonces: la primera se acepta (90 días), la segunda se rechaza por 91 días y la tercera se rechaza por ser futura

### BEH-S04-017
- cubre: REQ-S04-016, REQ-S04-018
- categoria: feliz
- dado: un miembro con dos cobros vigentes, el primero con vencimiento anterior nulo y fin 2026-12-12, y el segundo con vencimiento anterior 2026-12-12 y fin 2027-01-11, cada uno con 2 líneas
- cuando: se anula el segundo con el motivo «cobro duplicado»
- entonces: las 2 líneas del segundo quedan anuladas, el vencimiento del miembro y de la suscripción vuelve al 2026-12-12 y el primero sigue vigente

### BEH-S04-018
- cubre: REQ-S04-017
- categoria: error
- dado: los dos cobros de BEH-S04-017
- cuando: se intenta anular el primero
- entonces: se rechaza con el mensaje de anular primero los posteriores y nada cambia

### BEH-S04-019
- cubre: REQ-S04-018
- categoria: borde
- dado: un miembro nuevo con un único cobro del 2026-11-12 y vencimiento anterior nulo
- cuando: se anula ese cobro
- entonces: el miembro queda sin vencimiento vigente, su estado es vencido y la suscripción deja de estar activa

### BEH-S04-020
- cubre: REQ-S04-019
- categoria: error
- dado: un pago ya anulado y un pago sin anular
- cuando: se anula el primero, y el segundo con un motivo de solo espacios
- entonces: ambas anulaciones se rechazan y nada cambia

### BEH-S04-021
- cubre: REQ-S04-020, REQ-S04-023
- categoria: feliz
- dado: el árbol final
- cuando: se leen las dependencias de registrarPago y anularPago y el tipo EstadoCheckIn
- entonces: no figuran turnos, reglas de abono ni tasas, y EstadoCheckIn solo tiene activo, en_gracia, vencido y sucursal_incorrecta

### BEH-S04-022
- cubre: REQ-S04-021, REQ-S04-022, REQ-S04-027
- categoria: error
- dado: archivos de prueba con abono, saldoAFavor, toleranciaDiferenciaPago, completarCicloAbierto, un RegistrarPagoConDeudas.ts y una rama incluirDeudas
- cuando: se ejecuta tools/verificar-pagos.mjs
- entonces: la herramienta falla y nombra archivo y línea de cada uno

### BEH-S04-023
- cubre: REQ-S04-024
- categoria: feliz
- dado: el repositorio antes de reescribir registrarPago
- cuando: se ejecutan las pruebas de caracterización contra la implementación heredada
- entonces: pasan las pruebas del vencimiento con 1 y 3 meses, del cobro con fecha pasada y de la anulación (que muestra que hoy no devuelve el tiempo)

### BEH-S04-024
- cubre: REQ-S04-026, REQ-S04-031
- categoria: feliz
- dado: el formulario de cobro de un miembro con el plan «1 mes» y 2 meses elegidos
- cuando: la persona abre el formulario
- entonces: ve el precio total S/ 240.00 y el vencimiento resultante, y no ve campos de abono, saldo ni excedente

### BEH-S04-025
- cubre: REQ-S04-028
- categoria: error
- dado: un pull request que agrega la palabra abono en un archivo no exento
- cuando: corre el CI
- entonces: el paso de tools/verificar-pagos.mjs falla y el pull request queda en rojo

### BEH-S04-026
- cubre: REQ-S04-029, REQ-S04-030
- categoria: borde
- dado: el árbol final
- cuando: se leen las dos listas de exenciones y se consulta el esquema
- entonces: ninguna entrada es de la familia S-04 y las columnas y la tabla de abonos no existen

## 3. Invariantes

### INV-S04-001
- propiedad: para todo miembro con suscripción vigente, Miembro.fechaVencimiento es igual a Suscripcion.fin
- mecanismo: transaccion
- deteccion: consulta que une Miembro con su suscripción vigente y devuelve las filas donde ambas fechas difieren, ejecutada tras cada cobro y anulación de las pruebas
- protege: REQ-S04-011, REQ-S04-018

### INV-S04-002
- propiedad: toda suma de líneas de un cobro vigente es igual al precio acordado por los meses del cobro
- mecanismo: asercion-dominio
- deteccion: registrarPago lanza un error ante cualquier diferencia; la prueba intenta diferencias de un céntimo por encima y por debajo
- protege: REQ-S04-001, REQ-S04-002

### INV-S04-003
- propiedad: un cobro crea todas sus escrituras o ninguna
- mecanismo: transaccion
- deteccion: la prueba fuerza un fallo en cada paso de la secuencia y comprueba que no queda ningún pago ni cambio de suscripción ni de miembro
- protege: REQ-S04-007, REQ-S04-018

### INV-S04-004
- propiedad: cada cobroId produce como máximo un cobro
- mecanismo: restriccion-bd
- deteccion: restricción única sobre el cobroId y el orden de línea; una inserción duplicada falla
- protege: REQ-S04-009

### INV-S04-005
- propiedad: ningún archivo no exento de apps ni packages contiene términos de abono, saldo a favor o tolerancia
- mecanismo: lint
- deteccion: tools/verificar-pagos.mjs devuelve al menos un archivo
- protege: REQ-S04-021, REQ-S04-022, REQ-S04-027

## 4. Criterios de aceptación

### AC-S04-001
- enlaza: REQ-S04-001, REQ-S04-010, REQ-S04-011, REQ-S04-025, BEH-S04-001, BEH-S04-012, INV-S04-001
- metodo: integracion
- procedimiento: con una base efímera, cobrar "120.00" por 1 mes del plan de 30 días a un miembro nuevo el 2026-11-12 (reloj de prueba) y consultar suscripción y miembro; ejecutar la consulta de INV-S04-001
- esperado: 1 pago, inicio 2026-11-12 y vencimiento 2026-12-12 en ambos, y la consulta devuelve 0 filas
- test: pendiente

### AC-S04-002
- enlaza: REQ-S04-010, BEH-S04-002, BEH-S04-003
- metodo: integracion
- procedimiento: cobrar un mes a un miembro con vencimiento 2026-12-12 el 2026-11-20, y a otro con vencimiento 2026-10-01 el 2026-11-12
- esperado: los vencimientos resultantes son 2027-01-11 y 2026-12-12
- test: pendiente

### AC-S04-003
- enlaza: REQ-S04-001, REQ-S04-003, BEH-S04-004, BEH-S04-006
- metodo: integracion
- procedimiento: cobrar 3 meses con líneas "200.00" y "160.00"; intentar con meses 0, 7, 1.5 y -1
- esperado: el primero se acepta con 2 líneas del mismo cobroId y vencimiento 2027-02-10; los otros cuatro se rechazan con el error de meses
- test: pendiente

### AC-S04-004
- enlaza: REQ-S04-002, REQ-S04-004, BEH-S04-005, BEH-S04-007, INV-S04-002
- metodo: integracion
- procedimiento: cobrar "119.99", "120.01" y "60.00" por el plan de S/ 120.00; con un precio acordado de "100.00", cobrar "100.00" del mismo plan y "200.00" de otro plan de lista "200.00"
- esperado: los tres primeros se rechazan sin escribir nada; los dos últimos se aceptan
- test: pendiente

### AC-S04-005
- enlaza: REQ-S04-005, REQ-S04-006, BEH-S04-008
- metodo: unitario
- procedimiento: ejecutar registrarPago con repositorios simulados para miembro inexistente, plan inactivo y usuario sin permiso
- esperado: tres errores distintos y, sin permiso, ningún repositorio simulado recibe llamadas
- test: pendiente

### AC-S04-006
- enlaza: REQ-S04-007, BEH-S04-009, INV-S04-003
- metodo: integracion
- procedimiento: forzar un fallo en cada paso de un cobro de 2 líneas (suscripción, miembro, primera línea y segunda línea) y consultar pagos, suscripción y miembro
- esperado: en los cuatro casos no queda ningún pago ni cambio y el error llega al llamador
- test: pendiente

### AC-S04-007
- enlaza: REQ-S04-008, BEH-S04-010
- metodo: integracion
- procedimiento: lanzar con Promise.all dos cobros de un mes del mismo miembro, 20 veces
- esperado: en las 20 ejecuciones hay 2 pagos vigentes y el vencimiento es 2027-02-10 a partir de 2026-12-12 más 60 días, sin estados intermedios
- test: pendiente

### AC-S04-008
- enlaza: REQ-S04-009, BEH-S04-011, INV-S04-004
- metodo: integracion
- procedimiento: lanzar con Promise.all dos envíos del mismo cobroId y luego un envío con el mismo cobroId y otro importe
- esperado: un solo cobro, un solo movimiento de vencimiento; el tercero devuelve los pagos originales
- test: pendiente

### AC-S04-009
- enlaza: REQ-S04-012, REQ-S04-013, BEH-S04-013, BEH-S04-014
- metodo: unitario
- procedimiento: ejecutar estadoDeAcceso con vencimiento 2026-11-10 y diasGracia 3 para los días 10, 11, 13 y 14 de noviembre de 2026, y con planes semanal y de 3 meses el día 12
- esperado: activo, en_gracia, en_gracia y vencido; ambos planes en_gracia el día 12
- test: pendiente

### AC-S04-010
- enlaza: REQ-S04-014, REQ-S04-015, BEH-S04-015, BEH-S04-016
- metodo: integracion
- procedimiento: con hoy 2026-11-12, cobrar con fecha de pago 2026-10-20 a un miembro vencido desde 2026-10-01; luego con fechas 2026-08-14, 2026-08-13 y 2026-11-13
- esperado: la primera da vencimiento 2026-11-19; 2026-08-14 se acepta, 2026-08-13 y 2026-11-13 se rechazan
- test: pendiente

### AC-S04-011
- enlaza: REQ-S04-016, REQ-S04-018, REQ-S04-019, BEH-S04-017, BEH-S04-019, BEH-S04-020, INV-S04-001
- metodo: integracion
- procedimiento: con los dos cobros de BEH-S04-017, anular el segundo; con un miembro de un solo cobro, anularlo; anular un pago ya anulado y uno con motivo de espacios; ejecutar la consulta de INV-S04-001
- esperado: el vencimiento vuelve a 2026-12-12 y las 2 líneas quedan anuladas; el miembro de un solo cobro queda vencido; las dos anulaciones inválidas se rechazan; la consulta devuelve 0 filas
- test: pendiente

### AC-S04-012
- enlaza: REQ-S04-017, BEH-S04-018
- metodo: integracion
- procedimiento: con los dos cobros de BEH-S04-017, anular el primero
- esperado: se rechaza con el mensaje de anular primero los posteriores y nada cambia
- test: pendiente

### AC-S04-013
- enlaza: REQ-S04-020, REQ-S04-023, REQ-S04-030, BEH-S04-021, BEH-S04-026
- metodo: sql
- procedimiento: leer las dependencias de registrarPago y anularPago, el tipo EstadoCheckIn y consultar el esquema final por las columnas y la tabla de REQ-S04-030
- esperado: sin turnos, reglas de abono ni tasas; cuatro valores de EstadoCheckIn; ninguna de las columnas ni la tabla existe
- test: pendiente

### AC-S04-014
- enlaza: REQ-S04-021, REQ-S04-022, REQ-S04-027, BEH-S04-022, INV-S04-005
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-pagos.mjs con árboles de prueba con cada término de REQ-S04-021, con RegistrarPagoConDeudas.ts y con la rama incluirDeudas, y con otro limpio; después sobre el árbol final
- esperado: falla con los casos con términos nombrando archivo y línea, pasa con el limpio y no encuentra nada en el árbol final fuera de las exenciones
- test: pendiente

### AC-S04-015
- enlaza: REQ-S04-024, BEH-S04-023
- metodo: integracion
- procedimiento: antes de la reescritura, ejecutar las pruebas de caracterización contra la implementación heredada con 1 y 3 meses, con fecha pasada y con anulación
- esperado: todas pasan, y la de anulación demuestra que hoy el vencimiento no cambia
- test: pendiente

### AC-S04-016
- enlaza: REQ-S04-025, REQ-S04-029, BEH-S04-026
- metodo: unitario
- procedimiento: ejecutar tools/verificar-dinero.mjs y tools/verificar-fechas.mjs sobre el árbol final y buscar usos de dineroPuente en los archivos de la familia S-04
- esperado: ambas pasan, ninguna lista de exenciones contiene archivos de la familia S-04 y no hay usos del puente en ellos
- test: pendiente

### AC-S04-017
- enlaza: REQ-S04-026, REQ-S04-031, BEH-S04-024
- metodo: manual
- procedimiento: abrir el formulario de cobro de un miembro con el plan «1 mes», elegir 2 meses y buscar campos de abono, saldo y excedente
- esperado: se ve S/ 240.00 y el vencimiento resultante, y no hay campos de abono, saldo ni excedente
- test: pendiente

### AC-S04-018
- enlaza: REQ-S04-028, BEH-S04-025
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue la palabra abono en un archivo no exento y mirar el resultado del CI
- esperado: el paso de tools/verificar-pagos.mjs falla y el pull request no se puede fusionar mientras la protección de main esté activa
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1 y tarea 0.11 de ADR-010, pruebas primero, un commit por paso): (1) pruebas de caracterización de la implementación heredada para el vencimiento con 1 y 3 meses, la fecha pasada de hasta 90 días, el pago con varias líneas y la anulación, en verde contra el código heredado; (2) pruebas nuevas del cobro, de `estadoDeAcceso`, de la anulación y de la concurrencia, en rojo; (3) migración del esquema (columnas retiradas y la columna `vencimientoAnterior`, `cobroId` único); (4) `registrarPago` y `anularPago` reescritos con `dinero.ts` y `fechaLima`; (5) retiro del código de abonos, de `RegistrarPagoConDeudas` y de la pantalla de reglas de abono; (6) formulario de cobro; (7) `tools/verificar-pagos.mjs` con sus pruebas; (8) quitar la familia S-04 de las listas de exenciones; (9) paso del CI.
- **Secuencia de la transacción** (Drizzle, S-22): bloquear la fila del miembro con `SELECT … FOR UPDATE`; comprobar el `cobroId`; leer la suscripción vigente; calcular la base y el fin; crear o extender la suscripción; crear las líneas con el mismo `cobroId` y su orden; actualizar `Miembro.fechaVencimiento` y `fechaUltimoPago`; confirmar.
- **Anulación:** dentro de una transacción con el mismo bloqueo, anular todas las líneas del cobro, restaurar `Pago.vencimientoAnterior` en el miembro y en la suscripción (si es nulo, el miembro queda sin vencimiento vigente y la suscripción deja de estar activa).
- Las pruebas de propiedad y de concurrencia usan generadores con semilla fija; no hay dependencias nuevas.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15. Mientras tanto la base se crea con `drizzle-kit push` (S-22).
- Cambios de esquema: se retiran `Plan.permitePagoParcial`, `Plan.minimoAbonoTipo`, `Plan.minimoAbonoValor`, `Suscripcion.fechaLimiteAbono`, `Miembro.saldoAFavorUSD` y la tabla `ReglaAbonoPorFrecuencia`; se agrega `Pago.vencimientoAnterior` y una restricción única sobre `cobroId` (`grupoPagoId`) y orden de línea. Esto cambia los recuentos de tablas y columnas de S-22 y S-01, que se actualizan al terminar S-04.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Reescribir el cobro es el cambio de mayor riesgo del producto. Mitigación: las pruebas de caracterización del paso 1 y la transacción con bloqueo por miembro.
- Retirar los abonos toca unos 53 archivos. Mitigación: la herramienta `verificar-pagos` y el typecheck; el trabajo se hace después de reescribir el cobro.
- Anular solo el último cobro puede estorbar a quien se equivocó dos cobros atrás. Mitigación: SUP-S04-007 y el mensaje de la anulación; lo decide el propietario.
- Cambiar el vencimiento de instante con hora a día de calendario puede mover un día los vencimientos que se calculan hoy con hora. Mitigación: SUP-S04-003 y las pruebas de borde de BEH-S04-013.
- Si el propietario quiere que el mes sea de calendario y no de 30 días, cambia `diasCiclo`; la función de fin está aislada.
- `RegistrarPagoConDeudas` se borra aquí aunque el fiado es de S-11; el efecto es que, entre S-04 y S-11, no se cobran deudas junto con la membresía. Mitigación: ADR-018 elimina el fiado.
- El identificador de cobro exige que la pantalla lo genere; un cliente que no lo envíe recibe un identificador generado por el servidor y pierde la protección contra el doble clic. Mitigación: el servidor genera uno si falta y la pantalla siempre lo envía.

### 5.4 Preguntas abiertas
- ¿Se puede repartir un cobro entre varios métodos (P-16)? Default: sí (SUP-S04-001).
- ¿El mes dura 30 días corridos o es de calendario (P-17 no, esto es nuevo)? Default: 30 días corridos (SUP-S04-002).
- ¿Cuántos días de gracia (P-18)? Default: se mantiene, con 0 hasta que el propietario indique otro valor (SUP-S04-004).
- ¿Se acepta anular solo el último cobro de un miembro? Default: sí (SUP-S04-007).
- ¿Se acepta un cobro de S/ 0.00 solo si el precio acordado es S/ 0.00? Default: sí (SUP-S04-006).
- ¿Es suficiente un límite de 90 días para registrar un pago con fecha pasada? Default: sí (SUP-S04-008).
