---
id: S-04
estado: aprobada
adrs: ADR-010, ADR-011, ADR-016, ADR-018, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-04 — Pago único de membresía: cobro atómico, una sola fecha de vencimiento y anulación que la revierte

## 0. Contexto y alcance

### 0.1 Problema
El cobro heredado (`registrarPago`, 511 líneas) mezcla el pago de la membresía con abonos, saldo a favor, tolerancia, turnos de caja y tasa de cambio, escribe varias tablas sin transacción y guarda el vencimiento en dos lugares que el propio código lee a la vez. La anulación de un pago no devuelve el tiempo de acceso. ADR-010 (aceptado) decide un pago único por membresía, sin abonos, y que `registrarPago` se reescribe como una operación atómica; ADR-018 elimina los turnos y el fiado; ADR-011, S-02 y S-03 fijan el dinero y las fechas. S-04 reescribe el cobro y la anulación sobre esas bases, define el estado de acceso (activo, gracia y vencido) con una sola fecha y retira todo el código de abonos.

### 0.2 Dentro de alcance
- `registrarPago` reescrito: un cobro por membresía, con el precio acordado exacto por los meses pagados (de 1 a 6), en una transacción que abre el propio caso de uso a través de un puerto de unidad de trabajo, con bloqueo de la fila del miembro, relectura tras el bloqueo y un identificador de cobro obligatorio que evita duplicados.
- Una sola fecha de vencimiento: `Miembro.fechaVencimiento` y `Suscripcion.fin` siempre iguales, escritas por una sola función `fijarVencimiento` que usan el cobro, la anulación y la edición de la ficha del miembro (`ActualizarMiembro`).
- Función única del estado de acceso (`activo` y `vencido`), sin días de gracia, comparada por día de Lima; retiro de `abono_vencido` y de `en_gracia` también del kiosco (`apps/kiosk/lib/cara.ts`, `apps/kiosk/lib/api.ts`, `apps/kiosk/components/AccessCard.tsx` y `apps/kiosk/lib/cara.test.ts`).
- Pago con fecha pasada de cualquier antigüedad y nunca con fecha futura.
- Retiro de los días de gracia: `Sucursal.diasGracia`, `diasGraciaParaPlan`, el estado `en_gracia` y su lectura en `ListarEnSala` y `RegistrarCheckIn`.
- `anularPago` que anula el cobro completo, solo el último vigente de un miembro con vencimiento anterior registrado, y restaura el vencimiento y la fecha del último pago; los pagos sin vencimiento anterior (cambio de plan y ventas de otras specs) se siguen anulando sin tocar el vencimiento.
- Retiro del código de abonos: `ReglaAbono*`, `CobrarAbonoPendiente*`, `ListarAbonosPendientes*`, `proyeccionAbono.ts`, `RegistrarPagoConDeudas*` y su rama `incluirDeudas`, la pantalla de reglas de abono, las columnas `Plan.permitePagoParcial`, `Plan.minimoAbonoTipo`, `Plan.minimoAbonoValor`, `Suscripcion.fechaLimiteAbono` y `Miembro.saldoAFavorUSD` (hoy `saldoAFavor`), la tabla `ReglaAbonoPorFrecuencia`, el estado `abono_vencido` y la tolerancia.
- Formularios de cobro de membresía sin abono, saldo ni excedente, con vista previa del precio total y del vencimiento: `apps/web-admin/app/(panel)/pagos/FormularioPago.tsx` y el cobro de membresía de `caja/ModalRegistrarPagoCaja.tsx` (S-08 reconstruye el resto de la caja).
- Ediciones de `packages/domain/entities/Pago.ts` fuera de las que ya hizo S-03: `pagosVigentesDelCiclo`, `totalPagado`, `toleranciaDiferenciaPagoUSD` y las constantes de días atrás; de `Plan.ts`, `Suscripcion.ts`, `CheckIn.ts` y `Miembro.ts` los campos que se retiran; y de los repositorios de pago, suscripción y miembro los métodos nuevos (`bloquearPorId`, `fijarVencimiento`, `buscarVigentePorMiembro`).
- Esquema: columnas `Pago.vencimientoAnterior` y `Pago.cobroId` (única, nula en los pagos de otras specs) y retiro de `Sucursal.diasGracia`.
- Pruebas de caracterización de lo que se conserva, escritas antes de reescribir.
- `tools/verificar-pagos.mjs` con sus pruebas, ejecutada en el CI.
- Quitar del puente de dinero (S-03) y de las listas de exenciones de S-02 y S-03 todos los archivos de la familia S-04.

### 0.3 Fuera de alcance
- Cambio de plan a mitad de ciclo: S-07. `registrarPago` rechaza el cobro de un plan distinto mientras el miembro tenga un vencimiento vigente; `CambiarPlanConPago.ts` conserva sus escrituras propias hasta S-07 (ya escribe ambas fechas, sin transacción). Planes (su duración y precio) y la asignación de entrenador: S-07 y S-18.
- Turnos, arqueo y egresos (columna `Pago.turnoId` y modelos): S-08. Tasa de cambio y las columnas `Pago.tasaCambio` y `Pago.montoBs`: S-10; S-04 deja de llenarlas.
- Ventas de producto, fiado y las tablas de deuda: S-11 y ADR-018; S-04 solo retira el puente que combina una membresía con deudas.
- Sede única y `sucursal_incorrecta`: S-05. Dar de baja miembros: S-09. Tickets: S-12. Reportes de morosos: S-14.
- Registro retroactivo de miembros del padrón Excel y el aviso «Por regularizar»: S-10. Un miembro inscrito antes de hoy se registra y su primer cobro puede llevar cualquier fecha pasada. El alta del miembro y su primer cobro siguen siendo dos pasos no atómicos (`miembros/actions.ts:151-187`). La anulación no revierte `planId` ni `precioPlan`.
- `resolverCobroPasado*` pasa a la familia de S-11 (enmienda de la tabla de familias de S-03, porque solo lo usan las ventas y el cobro de deudas): el cobro de membresía deja de usarlo. `CambiarPlanConPago.ts` (S-07), los archivos de `caja/` (S-08) y `ModalCobrarDeudas.tsx` (S-11) conservan términos de abono y quedan en la lista de exenciones de `verificar-pagos`.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los `grep` excluyen `node_modules`, `generated` y `.next`.
- **Cobro sin transacción:** `registrarPago` (`packages/domain/use-cases/RegistrarPago.ts`, 511 líneas) escribe en este orden la suscripción (`extenderFin` en `:341` o `crear` en `:344`), el miembro (`actualizarFechasPago` en `:365`, `actualizar` del saldo en `:370`) y después los pagos (`pagos.crear` en `:381`), sin ninguna transacción (verificado con `grep -c transaction packages/domain/use-cases/RegistrarPago.ts`, 0 coincidencias); si la creación del pago falla, el miembro ya tiene el tiempo extendido. La rama de fechas pasadas (`registrarPagoRetroactivo`, `:408`) repite el patrón en `:462-492`.
- **Dependencias del cobro:** `RegistrarPagoDeps` incluye `turnos`, `reglasAbono` y `tasas` (`RegistrarPago.ts:116-127`); el cobro consulta el turno abierto (`:373`) y lee `miembro.saldoAFavorUSD` (`:262`).
- **Permiso y meses:** exige `PAGOS` `CREAR` (`:215`) y `meses` entero entre 1 y `MAX_MESES_POR_PAGO` = 6 (`:222`; `packages/domain/entities/Pago.ts:38`).
- **Fecha pasada:** `MAX_DIAS_ATRAS_PAGO_FECHADO` = 90 y `MAX_DIAS_ATRAS_PAGO_RETROACTIVO` = 365 (`Pago.ts:35` y `:33`); el límite de 365 días rige para miembros «Por regularizar» y para el primer pago de una inscripción (`RegistrarPago.ts:427`).
- **Cómo se calcula el fin:** `base` es el `fin` de la suscripción vigente si es posterior a ahora y, si no, ahora; el fin es `base + diasCiclo × meses` días (`RegistrarPago.ts:319-321`); conserva la hora del día de `ahora`.
- **Dos fechas de vencimiento:** `Suscripcion.fin` (`packages/domain/entities/Suscripcion.ts`) y `Miembro.fechaVencimiento` (`Miembro.ts:17`); la decisión de acceso usa la suscripción para «activo» y el miembro para «en gracia» en la misma función (`packages/domain/use-cases/ValidarAccesoSucursalPorPlan.ts`, función de `:17` a `:63`); 33 archivos no de prueba, sin contar `packages/db`, leen `fechaVencimiento` (verificado con `grep -rIl fechaVencimiento apps packages`, excluyendo pruebas y `packages/db`); la escriben `RegistrarPago.ts:365` y `:481` y `CambiarPlanConPago.ts:223` mediante `actualizarFechasPago`.
- **Estados de acceso:** `EstadoCheckIn` = `activo`, `en_gracia`, `vencido`, `abono_vencido` y `sucursal_incorrecta` (`packages/domain/entities/CheckIn.ts:3`). Los días de gracia salen de `Sucursal.diasGracia` (`schema.prisma:43`, por defecto 0) y solo cuentan para planes mensuales (`packages/domain/entities/Plan.ts:14`, `diasGraciaParaPlan`); la gracia se calcula con `diasGracia * MS_POR_DIA` (milisegundos fijos).
- **Anulación:** `anularPago` (`AnularPago.ts`, 69 líneas) exige el permiso `PAGOS` `ELIMINAR` (`:43`), un pago existente (`:51-54`) y un motivo no vacío (`:47-48`) y llama a `pagos.anular` (`:59`) por línea de pago; solo reabre las deudas del fiado (`:63-65`) y **no toca la suscripción ni el vencimiento del miembro** (verificado con `grep -c "suscripciones\|miembros\|fechaVencimiento" packages/domain/use-cases/AnularPago.ts`, 0 coincidencias).
- **Llamadores de `registrarPago`:** `apps/web-admin/app/api/pagos/route.ts:90`, `apps/web-admin/app/(panel)/miembros/actions.ts:187`, `apps/web-admin/app/(panel)/pagos/actions.ts:209` y `RegistrarPagoConDeudas.ts:31`, `:39` y `:61` (verificado con `grep -rIn "registrarPago("`); el parámetro `completarCicloAbierto` lo pasa `RegistrarPagoConDeudas.ts:57` y `excedenteASaldoAFavor` lo pasan `miembros/actions.ts:209` y `pagos/actions.ts:198`.
- **Alcance del retiro:** 53 archivos no de prueba mencionan `abono` o `Abono`, 9 `saldoAFavor` y 14 `permitePagoParcial` o `minimoAbono`; la pantalla `apps/web-admin/app/(panel)/configuraciones/reglas-abono` tiene 3 archivos (verificado con `grep -rIlE` y `ls`).
- **Pruebas existentes:** hay `AnularPago.test.ts`, `RegistrarPagoMeses.test.ts`, `RegistrarPagoRetroactivo.test.ts` y `RegistrarPagoConDeudas.test.ts`, y no hay una prueba principal de `RegistrarPago` (verificado con `ls packages/domain/use-cases | grep -i "RegistrarPago\|AnularPago"`).
- **Decisiones que S-04 hereda:** ADR-010 (pago único, `RegistrarPago` reescrito de forma atómica, multi-mes de hasta 6, pago con fecha pasada de hasta 90 días y anulación, acceso en tres estados), ADR-018 (cobrar nunca exige turno) y las enmiendas de ADR-010 (P-16, P-17 y P-18 abiertas) (verificado con `grep -n "Decisión" -A10 docs/adr/ADR-010-pago-unico-sin-abonos.md`).
- **Tercer escritor del vencimiento:** `ActualizarMiembro.ts:64-133` edita desde la ficha el vencimiento y la fecha del último pago (`miembros.actualizar` en `:75`, `pagos.moverFinCiclo` en `:94`, `ajustarCicloMasReciente` en `:96`, `extenderFin` en `:125`) y lanza `FechasIncoherentesError` si el último pago es posterior al vencimiento, sin transacción (verificado con `grep -n "fechaUltimoPago\|FechasIncoherentesError" packages/domain/use-cases/ActualizarMiembro.ts`).
- **La suscripción vigente se busca por miembro y plan** y comparando instantes: `estado = "ACTIVA"`, `inicio <= fecha` y `fin >= fecha` (`packages/infrastructure/persistence/prisma/PrismaSuscripcionRepository.ts:31-36`); con el vencimiento guardado a las 05:00Z de S-02, a partir de las 00:00 de Lima del día de vencimiento esa consulta ya no la encuentra.
- **Alta y primer cobro:** `crearMiembroAction` crea el miembro y después cobra, con `fechaPago = fechaInscripcion` y `primerPagoDeInscripcion: true` (`apps/web-admin/app/(panel)/miembros/actions.ts:151-187` y `:203-206`); `Pago.grupoPagoId` lo usan además `VenderProducto.ts:82`, `CobrarDeudasMiembro.ts:90` y `CambiarPlanConPago.ts:193`.
- **`completarCicloAbierto` y `resolverCobroPasado`:** `completarCicloAbierto` lo pasan solo `RegistrarPagoConDeudas.ts:57` y `CobrarAbonoPendiente.ts:73`; `resolverCobroPasado` lo usan también `VenderProducto.ts:65` y `CobrarDeudasMiembro.ts:80` (verificado con `grep -n resolverCobroPasado`).
- **Kiosco:** `abono_vencido` aparece en `apps/kiosk/lib/cara.ts:11`, `apps/kiosk/lib/api.ts:4`, `apps/kiosk/components/AccessCard.tsx:29`, `:130` y `:134` y `apps/kiosk/lib/cara.test.ts:40` y `:51` (verificado con `grep -n abono_vencido`).
- **Documentación:** RF-25 pide días de gracia «solo para planes mensuales» y globales (`docs/01-levantamiento-requerimientos.md:89`) y P-21 fija por defecto un pago de una sola línea (`docs/08-decisiones-pendientes.md:18`); el propietario retiró los días de gracia y decidió un cobro de una sola línea (SUP-S04-001 y SUP-S04-004).
- No verificado: cuántos miembros pagan hoy por partes.

### 0.5 Supuestos
- SUP-S04-001: el propietario decidió el 2026-11-12 que **no se reparte un cobro entre métodos**: cada cobro es un solo pago completo con un solo método. Responde P-16 y confirma el valor por defecto de P-21 (una sola línea). Decisión confirmada por el propietario; asumido, por validar solo su alcance en otros flujos (S-03 REQ-S03-020 conserva la suma exacta de varias líneas para ventas de otras specs). Default: la decisión del propietario; asumido, por validar.
- SUP-S04-002: cada mes del plan dura el `diasCiclo` del plan en días corridos (30 días para un mes) y el vencimiento es un día de calendario de Lima (S-02). Duración confirmada por el propietario el 2026-11-12; asumido, por validar su aplicación a los planes de 2 y 3 meses (60 y 90 días). Default: la decisión del propietario; asumido, por validar.
- SUP-S04-003: el último día con acceso es el día de vencimiento (inclusive); un cobro de 30 días hecho el 12 de noviembre vence el 12 de diciembre y da acceso del 12 de noviembre al 12 de diciembre, 31 días en el primer período. Confirmado por el propietario el 2026-11-12; asumido, por validar su cómputo de días. Default: la decisión del propietario; asumido, por validar.
- SUP-S04-004: **no hay días de gracia**: el propietario decidió el 2026-11-12 desincorporar esa función. Responde P-18 y retira RF-25; el acceso tiene dos estados, `activo` y `vencido`, y `sucursal_incorrecta` hasta S-05. Decisión confirmada por el propietario; asumido, por validar su efecto en los reportes de morosos (S-14). Default: la decisión del propietario; asumido, por validar.
- SUP-S04-005: el precio a cobrar es el precio acordado del miembro (`Miembro.precioPlan`) cuando el cobro es del plan actual, y el precio del plan cuando el miembro no tiene un vencimiento vigente y elige otro; con un vencimiento vigente el cobro de otro plan se rechaza y es materia de S-07. No hay excedente ni saldo a favor. Default: ese cálculo; asumido, por validar.
- SUP-S04-006: no hay cobros de cortesía: el propietario indicó que el cobro de S/ 0.00 «no aplica». El monto de un cobro debe ser mayor que S/ 0.00. Default: ese criterio; asumido, por validar.
- SUP-S04-007: se puede anular únicamente el cobro vigente más reciente de un miembro (el de mayor fin de ciclo); para anular uno anterior hay que anular antes los posteriores. Default: ese criterio; asumido, por validar.
- SUP-S04-008: un pago puede registrarse con cualquier fecha pasada, sin límite de antigüedad, y nunca con fecha futura, por decisión del propietario del 2026-11-12; el límite de 90 días, el de 365, el aviso «Por regularizar» y la excepción del primer pago de inscripción se retiran. Decisión confirmada por el propietario; asumido, por validar su efecto en los vencimientos de pagos muy antiguos. Default: la decisión del propietario; asumido, por validar.
- SUP-S04-009: el identificador de cobro (`cobroId`) es obligatorio; la pantalla lo genera como un UUID y se guarda en la columna nueva `Pago.cobroId`, única y nula en los pagos de otras specs; un cobro es exactamente un pago. Default: ese mecanismo; asumido, por validar.
- SUP-S04-010: cada cobro guarda el vencimiento anterior del miembro en `Pago.vencimientoAnterior`; para un miembro sin vencimiento previo se guarda el día anterior al cobro, de modo que restaurarlo lo deja vencido. Los pagos de otras specs (cambio de plan, ventas) tienen el campo nulo y su anulación no toca el vencimiento. Default: ese criterio; asumido, por validar.
- SUP-S04-011: la columna `Pago.turnoId` y las columnas `tasaCambio` y `montoBs` quedan sin llenar hasta que S-08 y S-10 las retiren. Default: se dejan nulas; asumido, por validar.
- SUP-S04-012: bajo el aislamiento predeterminado de PostgreSQL (SUP-S22-004), `registrarPago` y `anularPago` toman el bloqueo de la fila del miembro y releen miembro, suscripción y cobro antes de validar; el tiempo límite de la transacción es de 20 segundos, como el cobro heredado, y el de espera del bloqueo es de 5 segundos. Default: esos valores; asumido, por validar.
- SUP-S04-013: «suscripción vigente» es la suscripción `ACTIVA` del miembro cuyo día de Lima de `fin` es igual o posterior al día de Lima de hoy, sin distinguir plan; todas las fechas de calendario del cobro (`Suscripcion.inicio` y `fin`, `Miembro.fechaVencimiento` y `fechaUltimoPago`, `Pago.fechaInicioCiclo`, `fechaFinCiclo` y `vencimientoAnterior`) se guardan a las 05:00:00.000Z y `Pago.fechaPago` es un instante. Default: esa representación; asumido, por validar.
- SUP-S04-014: S-04 enmienda la tabla de familias de S-03 para que `resolverCobroPasado*` figure en S-11 y deja la lista de exenciones de `verificar-pagos` con las familias S-07, S-08 y S-11. Default: ese reparto; asumido, por validar.
- SUP-S04-015: la anulación sirve para corregir un error y también para un reintegro al miembro; el motivo libre distingue ambos. El propietario pidió prever anulaciones y reintegros el 2026-11-12. El sistema no registra el desembolso del reintegro porque no hay egresos (ADR-018). Default: ese alcance; asumido, por validar.

## 1. Requisitos

### REQ-S04-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El cobro de una membresía deberá cubrir en un solo acto, con un solo pago de un solo método, el precio acordado multiplicado por los meses pagados.

### REQ-S04-002
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el monto del pago difiere en un céntimo o más del precio total acordado entonces registrarPago deberá rechazarlo sin escribir nada.

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
- texto: Si el miembro no existe, el plan no existe o el plan está inactivo, entonces registrarPago deberá rechazar el cobro con un error propio para cada caso.

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
- origen: SUP-S04-012
- texto: Cuando dos cobros del mismo miembro llegan a la vez, registrarPago deberá procesarlos uno tras otro y aplicar ambos al vencimiento, también cuando es el primer cobro del miembro.

### REQ-S04-009
- tipo: cuando
- prioridad: MUST
- origen: SUP-S04-009
- texto: Cuando registrarPago recibe un cobroId ya registrado con el mismo miembro, plan, meses e importe, deberá devolver el pago original sin crear otro ni mover el vencimiento.

### REQ-S04-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El vencimiento de un cobro deberá ser el día de Lima de la base más los días del ciclo por los meses pagados, donde la base es el mayor entre el vencimiento actual del miembro y el día de Lima de la fecha de pago.

### REQ-S04-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La función fijarVencimiento, que usan el cobro, la anulación y la edición de la ficha, deberá escribir Miembro.fechaVencimiento y Suscripcion.fin con el mismo valor en una sola operación.

### REQ-S04-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La función estadoDeAcceso deberá devolver activo hasta el día de vencimiento inclusive y vencido después.

### REQ-S04-013
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S04-004
- texto: El sistema no deberá tener días de gracia: ni la columna Sucursal.diasGracia, ni diasGraciaParaPlan, ni el estado en_gracia.

### REQ-S04-014
- tipo: cuando
- prioridad: MUST
- origen: SUP-S04-008
- texto: Cuando el cobro trae una fecha de pago pasada, de cualquier antigüedad, registrarPago deberá guardarla como fecha del pago y usar su día de Lima en la fórmula de la base.

### REQ-S04-015
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S04-008
- texto: Si el día de Lima de la fecha de pago es posterior al día de Lima de hoy entonces registrarPago deberá rechazar el cobro.

### REQ-S04-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando se anula un pago con un motivo no vacío, anularPago deberá anular el pago del cobro.

### REQ-S04-017
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S04-007
- texto: Si el cobro que se anula no es el vigente más reciente del miembro entonces anularPago deberá rechazarlo indicando que primero se anulan los posteriores.

### REQ-S04-018
- tipo: cuando
- prioridad: MUST
- origen: SUP-S04-010
- texto: Cuando se anula un cobro con vencimiento anterior registrado, anularPago deberá restaurar ese vencimiento en el miembro y en la suscripción con fijarVencimiento, en la misma transacción.

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
- texto: Los archivos de apps y packages que no figuran en la lista de exenciones no deberán contener los términos abono, saldoAFavor, toleranciaDiferenciaPago, permitePagoParcial, minimoAbono, fechaLimiteAbono, abono_vencido, completarCicloAbierto, excedenteASaldoAFavor, diasGracia, diasGraciaParaPlan ni en_gracia.

### REQ-S04-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Los archivos RegistrarPagoConDeudas.ts y su prueba, y la rama incluirDeudas del cobro de membresía, no deberán existir al terminar la spec.

### REQ-S04-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: EstadoCheckIn y el kiosco deberán usar solo los valores activo, vencido y sucursal_incorrecta, sin abono_vencido ni en_gracia.

### REQ-S04-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El repositorio deberá conservar los archivos de pruebas de caracterización del vencimiento con 1 y 3 meses, de la fecha pasada y de la anulación, con las partes que S-04 conserva pasando con la implementación nueva.

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
- texto: Cuando tools/verificar-pagos.mjs encuentra en un archivo no exento alguno de los términos de REQ-S04-021, un archivo RegistrarPagoConDeudas o una rama incluirDeudas, deberá terminar con código distinto de cero y nombrar archivo y línea.

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
- texto: Las columnas Plan.permitePagoParcial, Plan.minimoAbonoTipo, Plan.minimoAbonoValor, Suscripcion.fechaLimiteAbono y Miembro.saldoAFavorUSD no deberán existir en el esquema.

### REQ-S04-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El formulario de cobro no deberá ofrecer campos de abono, de saldo a favor ni de excedente.

### REQ-S04-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: registrarPago y anularPago deberán abrir su transacción y bloquear la fila del miembro mediante los puertos IUnidadDeTrabajo y bloquearPorId, sin importar Drizzle ni usar sql.raw en el dominio.

### REQ-S04-033
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S04-012
- texto: registrarPago y anularPago deberán releer el miembro, la suscripción y el cobro después de tomar el bloqueo y antes de validar.

### REQ-S04-034
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S04-013
- texto: La suscripción vigente de un miembro deberá ser la ACTIVA cuyo día de Lima de fin es igual o posterior al día de Lima de hoy.

### REQ-S04-035
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S04-005
- texto: Si el cobro es de un plan distinto al del miembro y el miembro tiene un vencimiento vigente entonces registrarPago deberá rechazarlo indicando que el cambio de plan es otra operación.

### REQ-S04-036
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S04-006
- texto: Si el monto del pago no es mayor que 0.00 entonces registrarPago deberá rechazar el cobro.

### REQ-S04-037
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S04-009
- texto: Si registrarPago recibe un cobroId ausente, o ya registrado con otro miembro, plan, meses o importe, entonces deberá rechazarlo con un error de conflicto y no crear el pago.

### REQ-S04-038
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S04-009
- texto: Si registrarPago recibe el cobroId de un cobro anulado entonces deberá rechazarlo con un error y no devolver el pago anulado.

### REQ-S04-039
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S04-009
- texto: Si la base de datos rechaza un pago por la restricción única del cobroId entonces registrarPago deberá devolver el error de dominio de cobro duplicado y no el error crudo del motor.

### REQ-S04-040
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si el usuario no tiene el permiso PAGOS ELIMINAR o el pago no existe entonces anularPago deberá rechazar la anulación sin escribir nada.

### REQ-S04-041
- tipo: cuando
- prioridad: MUST
- origen: SUP-S04-010
- texto: Cuando se anula un cobro, anularPago deberá dejar Miembro.fechaUltimoPago con la fecha del pago vigente anterior del miembro o vacía si no existe.

### REQ-S04-042
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S04-010
- texto: Si la fin de ciclo del cobro que se anula difiere del vencimiento actual del miembro porque se editó a mano desde la ficha entonces anularPago deberá rechazar la anulación indicando que se corrija el vencimiento desde la ficha.

### REQ-S04-043
- tipo: cuando
- prioridad: MUST
- origen: SUP-S04-010
- texto: Cuando se anula un pago sin vencimiento anterior registrado, anularPago deberá anularlo sin modificar el vencimiento ni la fecha del último pago del miembro.

### REQ-S04-044
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S04-012
- texto: registrarPago y anularPago deberán cancelar y revertir su transacción si supera los 20 segundos o si la espera del bloqueo supera los 5 segundos.

### REQ-S04-045
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada entrada de tools/verificar-pagos.exenciones.json deberá nombrar un archivo existente que coincida con una familia de la tabla de S-03 y la spec de esa familia, que será S-07, S-08 o S-11.

### REQ-S04-046
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La tabla ReglaAbonoPorFrecuencia, su puerto IReglaAbonoRepository y su repositorio no deberán existir.

### REQ-S04-047
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S04-010
- texto: Pago deberá tener las columnas vencimientoAnterior y cobroId, con una restricción única sobre cobroId.

### REQ-S04-048
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S04-013
- texto: Las comparaciones de vigencia, de estado de acceso y de fecha de pago deberán hacerse por día de Lima con fechaLima.

### REQ-S04-049
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S04-001
- texto: Si el cobro trae más de una línea de pago entonces registrarPago deberá rechazarlo sin escribir nada.

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
- cuando: se cobran 3 meses con una sola línea de "360.00" por Yape con número de operación "55124"
- entonces: se acepta, se crea un solo pago con el cobroId y el vencimiento es el 2027-02-10

### BEH-S04-005
- cubre: REQ-S04-002
- categoria: error
- dado: el plan «1 mes» de S/ 120.00 y un miembro con ese precio acordado
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
- dado: un cobro de una línea y un fallo forzado al crear el pago, después de actualizar la suscripción y el miembro
- cuando: se ejecuta registrarPago
- entonces: no existe el pago, la suscripción y el vencimiento del miembro quedan como antes y el error llega al llamador

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
- cubre: REQ-S04-012
- categoria: borde
- dado: un miembro con vencimiento 2026-11-10
- cuando: se calcula el estado el 9, el 10 y el 11 de noviembre de 2026 (Lima)
- entonces: el 9 y el 10 son activo y el 11 es vencido

### BEH-S04-014
- cubre: REQ-S04-013
- categoria: feliz
- dado: el esquema y los tipos finales
- cuando: se buscan Sucursal.diasGracia, diasGraciaParaPlan y en_gracia
- entonces: no existen; el miembro vencido el 2026-11-10 está vencido el 2026-11-11 sin período intermedio

### BEH-S04-015
- cubre: REQ-S04-014
- categoria: borde
- dado: un miembro vencido desde 2026-10-01 y hoy 2026-11-12
- cuando: se cobra un mes con fecha de pago 2026-10-20
- entonces: la fecha del pago es el 2026-10-20 a las 05:00Z de su día, la base es esa fecha y el vencimiento es el 2026-11-19

### BEH-S04-016
- cubre: REQ-S04-014, REQ-S04-015
- categoria: borde
- dado: hoy 2026-11-12 (Lima)
- cuando: se cobra con fecha de pago 2024-01-15, con la de hoy y con la de mañana 2026-11-13
- entonces: las dos primeras se aceptan sin límite de antigüedad y la tercera se rechaza por ser futura

### BEH-S04-017
- cubre: REQ-S04-016, REQ-S04-018
- categoria: feliz
- dado: un miembro con dos cobros vigentes de un pago cada uno: el primero con vencimiento anterior 2026-11-11 y fin 2026-12-12, y el segundo con vencimiento anterior 2026-12-12 y fin 2027-01-11
- cuando: se anula el pago del segundo con el motivo «cobro duplicado»
- entonces: el pago del segundo queda anulado, el vencimiento del miembro y de la suscripción vuelve al 2026-12-12 y el primer cobro sigue vigente

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
- dado: los archivos de caracterización del vencimiento con 1 y 3 meses, de la fecha pasada y de la anulación
- cuando: se ejecutan contra la implementación heredada y después contra la nueva
- entonces: contra la heredada pasan todas y la de anulación muestra que el vencimiento no cambia; contra la nueva pasan las partes que se conservan y la de anulación se reemplaza por la nueva regla

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

### BEH-S04-027
- cubre: REQ-S04-008, REQ-S04-032
- categoria: concurrencia
- dado: un miembro recién creado sin suscripción y dos primeros cobros simultáneos del mismo cobroId distinto
- cuando: ambos llegan a la vez
- entonces: se procesan uno tras otro, existe una sola suscripción, quedan 2 pagos vigentes y el vencimiento suma los dos ciclos

### BEH-S04-028
- cubre: REQ-S04-033, REQ-S04-005
- categoria: error
- dado: un cobro que espera el bloqueo del miembro mientras otro proceso inactiva el plan
- cuando: el cobro obtiene el bloqueo
- entonces: relee el plan, lo encuentra inactivo y se rechaza con el error de plan inactivo sin escribir nada

### BEH-S04-029
- cubre: REQ-S04-034, REQ-S04-048, REQ-S04-012
- categoria: borde
- dado: un miembro con vencimiento 2026-11-12 y los instantes 2026-11-13T04:59:59.999Z y 2026-11-13T05:00:00.000Z
- cuando: se calcula la suscripción vigente y el estado de acceso en cada instante, y se cobra un mes el primero
- entonces: en el primer instante (todavía 12 de noviembre en Lima) la suscripción es vigente, el estado es activo y el cobro extiende la misma suscripción; en el segundo (13 de noviembre) el estado es vencido

### BEH-S04-030
- cubre: REQ-S04-035
- categoria: error
- dado: un miembro con vencimiento vigente en el plan «1 mes» y otro con vencimiento 2026-10-01
- cuando: se cobra el plan «3 meses» a cada uno
- entonces: el primero se rechaza indicando que el cambio de plan es otra operación y el segundo se acepta con una suscripción nueva y su plan y precio actualizados

### BEH-S04-031
- cubre: REQ-S04-036
- categoria: error
- dado: un miembro con precio acordado "120.00"
- cuando: se cobra una línea de "0.00" y otra de "-1.00"
- entonces: ambas se rechazan por monto no mayor que 0.00 y no se crea ningún pago

### BEH-S04-032
- cubre: REQ-S04-037, REQ-S04-038
- categoria: error
- dado: un cobro registrado con cobroId K para el miembro A, uno anulado con cobroId L, y envíos con cobroId ausente, K para el miembro B, K con otro importe y L
- cuando: se ejecuta registrarPago con cada uno
- entonces: los cuatro se rechazan con errores de conflicto o de cobro anulado y no se crea ningún pago

### BEH-S04-033
- cubre: REQ-S04-039
- categoria: error
- dado: dos inserciones del mismo cobroId y orden de línea que llegan a la base a la vez
- cuando: la restricción única rechaza la segunda
- entonces: el llamador recibe el error de dominio de cobro duplicado y no el código del motor

### BEH-S04-034
- cubre: REQ-S04-016, REQ-S04-017, REQ-S04-033
- categoria: concurrencia
- dado: un miembro con un cobro vigente y dos anulaciones simultáneas del mismo cobro, y otro caso con una anulación simultánea a un cobro nuevo
- cuando: llegan a la vez
- entonces: solo una anulación se aplica y la otra recibe el error de pago ya anulado; en el segundo caso las operaciones se serializan y la anulación del cobro viejo se rechaza si el nuevo ya se registró

### BEH-S04-035
- cubre: REQ-S04-040
- categoria: error
- dado: un usuario sin el permiso PAGOS ELIMINAR y un identificador de pago inexistente
- cuando: se ejecuta anularPago en cada caso
- entonces: ambos se rechazan sin escribir nada

### BEH-S04-036
- cubre: REQ-S04-041
- categoria: feliz
- dado: un miembro con los dos cobros de BEH-S04-017 y fecha del último pago igual a la del segundo
- cuando: se anula el segundo
- entonces: la fecha del último pago del miembro es la del primero; si se anulara también el primero quedaría vacía

### BEH-S04-037
- cubre: REQ-S04-042
- categoria: error
- dado: un cobro cuya fin de ciclo es 2026-12-12 y un miembro cuyo vencimiento se editó a mano a 2026-12-20
- cuando: se anula ese cobro
- entonces: se rechaza indicando que se corrija el vencimiento desde la ficha y nada cambia

### BEH-S04-038
- cubre: REQ-S04-043
- categoria: borde
- dado: un pago de cambio de plan sin vencimiento anterior registrado
- cuando: se anula
- entonces: queda anulado, y el vencimiento y la fecha del último pago del miembro no cambian

### BEH-S04-039
- cubre: REQ-S04-044
- categoria: error
- dado: una transacción de cobro que espera 6 segundos el bloqueo de un miembro retenido por otra, y otra que supera 20 segundos
- cuando: se cumple el límite
- entonces: ambas se cancelan con un error de tiempo límite y no queda ninguna escritura

### BEH-S04-040
- cubre: REQ-S04-010, REQ-S04-014
- categoria: borde
- dado: un miembro con vencimiento 2026-11-05, hoy 2026-11-12 y fecha de pago 2026-10-20, y otro cobro de un mes el 12 de noviembre a un miembro nuevo
- cuando: se cobra un mes en cada caso
- entonces: el primero tiene vencimiento 2026-12-05 (la base es el vencimiento actual, que es posterior a la fecha de pago) y el segundo da acceso del 12 de noviembre al 12 de diciembre, es decir 31 días en el primer período

### BEH-S04-041
- cubre: REQ-S04-045, REQ-S04-046, REQ-S04-047
- categoria: borde
- dado: una entrada de exención que nombra un archivo inexistente, otra sin spec, otra que asigna CambiarPlanConPago.ts a S-11 y otra a S-07; y el esquema final
- cuando: se ejecuta tools/verificar-pagos.mjs y se consulta el esquema
- entonces: la herramienta falla en las tres primeras y acepta la cuarta; el esquema no tiene la tabla ReglaAbonoPorFrecuencia y Pago tiene vencimientoAnterior y ordenLinea con la restricción única

### BEH-S04-042
- cubre: REQ-S04-049
- categoria: error
- dado: un cobro de "360.00" repartido en dos líneas de "200.00" Efectivo y "160.00" Yape
- cuando: se ejecuta registrarPago
- entonces: se rechaza sin escribir nada y se indica que el cobro admite una sola línea

## 3. Invariantes

### INV-S04-001
- propiedad: para todo miembro con suscripción vigente, Miembro.fechaVencimiento es igual a Suscripcion.fin, incluso tras cobros, anulaciones y ediciones de la ficha que pasan por fijarVencimiento
- mecanismo: transaccion
- deteccion: consulta que une Miembro con su suscripción vigente y devuelve las filas donde ambas fechas difieren, ejecutada tras cada cobro, anulación y edición de la ficha de las pruebas
- protege: REQ-S04-011, REQ-S04-018

### INV-S04-002
- propiedad: el monto de todo cobro vigente es igual al precio acordado por los meses del cobro
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

### INV-S04-006
- propiedad: toda entrada de la lista de exenciones de verificar-pagos apunta a un archivo existente, de una familia de S-03 y con su spec responsable
- mecanismo: lint
- deteccion: tools/verificar-pagos.mjs falla ante una entrada obsoleta, incompleta o de otra familia
- protege: REQ-S04-045

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
- enlaza: REQ-S04-001, REQ-S04-003, REQ-S04-049, BEH-S04-004, BEH-S04-006, BEH-S04-042
- metodo: integracion
- procedimiento: cobrar 3 meses con una línea de "360.00"; intentar el mismo cobro con dos líneas de "200.00" y "160.00"; intentar con meses 0, 7, 1.5 y -1
- esperado: el primero se acepta con un pago y vencimiento 2027-02-10; el de dos líneas se rechaza sin escribir nada; los cuatro de meses se rechazan con el error de meses
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
- procedimiento: ejecutar registrarPago con repositorios simulados para miembro inexistente, plan inexistente, plan inactivo y usuario sin permiso
- esperado: cuatro errores distintos; sin permiso solo se llama al autorizador y ningún repositorio de miembro, plan o pago recibe llamadas
- test: pendiente

### AC-S04-006
- enlaza: REQ-S04-007, BEH-S04-009, INV-S04-003
- metodo: integracion
- procedimiento: con un repositorio de pagos con inyección de fallos, forzar un fallo en cada paso de la secuencia de 5.1 de un cobro de una línea y consultar pagos, suscripción y miembro
- esperado: en todos los pasos no queda ningún pago ni cambio en la suscripción ni en el miembro y el error llega al llamador
- test: pendiente

### AC-S04-007
- enlaza: REQ-S04-008, REQ-S04-032, BEH-S04-010, BEH-S04-027
- metodo: integracion
- procedimiento: con el reloj de prueba en 2026-11-20, lanzar con Promise.all dos cobros de un mes del mismo miembro con vencimiento 2026-12-12, 20 veces; repetir con un miembro recién creado sin suscripción
- esperado: en las 40 ejecuciones quedan 2 pagos vigentes y una sola suscripción, y el vencimiento final es 2027-02-10 en el primer caso y la suma de dos ciclos desde el día del cobro en el segundo; el miembro y la suscripción coinciden
- test: pendiente

### AC-S04-008
- enlaza: REQ-S04-009, REQ-S04-037, REQ-S04-038, REQ-S04-039, BEH-S04-011, BEH-S04-032, BEH-S04-033, INV-S04-004
- metodo: integracion
- procedimiento: lanzar con Promise.all dos envíos del mismo cobroId; reenviarlo con el mismo importe; enviarlo con otro miembro y con otro importe; enviar uno sin cobroId; enviar el cobroId de un cobro anulado; forzar el rechazo de la restricción única
- esperado: un solo cobro; el reenvío devuelve los pagos originales; los casos con otro miembro, otro importe, sin cobroId y anulado se rechazan sin crear pagos; el rechazo de la restricción llega como error de cobro duplicado
- test: pendiente

### AC-S04-009
- enlaza: REQ-S04-012, REQ-S04-013, BEH-S04-013, BEH-S04-014
- metodo: unitario
- procedimiento: ejecutar estadoDeAcceso con vencimiento 2026-11-10 para los días 9, 10 y 11 de noviembre de 2026, y buscar Sucursal.diasGracia, diasGraciaParaPlan y en_gracia en el esquema y el código
- esperado: activo, activo y vencido; los tres términos no existen
- test: pendiente

### AC-S04-010
- enlaza: REQ-S04-014, REQ-S04-015, BEH-S04-015, BEH-S04-016
- metodo: integracion
- procedimiento: con hoy 2026-11-12, cobrar con fecha de pago 2026-10-20 a un miembro vencido desde 2026-10-01; cobrar con fecha 2024-01-15 y con la de hoy; cobrar con la fecha de mañana 2026-11-13
- esperado: la primera da vencimiento 2026-11-19; 2024-01-15 y hoy se aceptan; mañana se rechaza
- test: pendiente

### AC-S04-011
- enlaza: REQ-S04-016, REQ-S04-018, REQ-S04-041, BEH-S04-017, BEH-S04-019, BEH-S04-036, INV-S04-001
- metodo: integracion
- procedimiento: con los dos cobros de BEH-S04-017, anular el pago del segundo; con un miembro de un solo cobro, anularlo; ejecutar la consulta de INV-S04-001
- esperado: el vencimiento vuelve a 2026-12-12 y el pago queda anulado; la fecha del último pago es la del primer cobro; el miembro de un solo cobro queda con vencimiento el día anterior al cobro y estado vencido; la consulta devuelve 0 filas
- test: pendiente

### AC-S04-012
- enlaza: REQ-S04-017, REQ-S04-019, BEH-S04-018, BEH-S04-020
- metodo: integracion
- procedimiento: con los dos cobros de BEH-S04-017, anular el primero; anular un pago ya anulado y uno con motivo de solo espacios
- esperado: el primero se rechaza con el mensaje de anular primero los posteriores; las otras dos anulaciones se rechazan; nada cambia
- test: pendiente

### AC-S04-013
- enlaza: REQ-S04-020, REQ-S04-023, BEH-S04-021
- metodo: unitario
- procedimiento: verificar con la API de typescript que las dependencias de registrarPago y anularPago no incluyen turnos, reglas de abono ni tasas, y comprobar los valores de EstadoCheckIn y de los archivos del kiosco que nombra REQ-S04-023
- esperado: sin turnos, reglas de abono ni tasas; solo los cuatro valores de estado en el tipo y en el kiosco
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
- procedimiento: ejecutar los archivos de caracterización contra la implementación heredada (antes del paso 4 del plan) y contra la nueva (después)
- esperado: contra la heredada pasan todos y el de anulación demuestra que el vencimiento no cambia; contra la nueva pasan las partes conservadas y el de anulación se reemplaza por los AC de la anulación nueva
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

### AC-S04-019
- enlaza: REQ-S04-034, REQ-S04-048, REQ-S04-012, BEH-S04-029
- metodo: integracion
- procedimiento: con un miembro de vencimiento 2026-11-12, consultar la suscripción vigente y el estado en 2026-11-13T04:59:59.999Z y 2026-11-13T05:00:00.000Z, y cobrar un mes en el primer instante
- esperado: en el primer instante la suscripción es vigente, el estado es activo y el cobro extiende la misma suscripción sin crear otra; en el segundo el estado es vencido
- test: pendiente

### AC-S04-020
- enlaza: REQ-S04-035, REQ-S04-036, BEH-S04-030, BEH-S04-031
- metodo: integracion
- procedimiento: cobrar el plan de 3 meses a un miembro con vencimiento vigente y a otro vencido; cobrar una línea de "0.00" y otra de "-1.00" a un miembro con precio acordado "120.00"
- esperado: el primero se rechaza, el segundo se acepta con plan y precio actualizados; las dos líneas no positivas se rechazan sin crear pagos
- test: pendiente

### AC-S04-021
- enlaza: REQ-S04-033, REQ-S04-044, BEH-S04-028, BEH-S04-039
- metodo: integracion
- procedimiento: retener el bloqueo de un miembro 6 segundos desde otra conexión mientras se cobra; inactivar el plan durante la espera; simular una transacción de más de 20 segundos
- esperado: el cobro en espera se cancela por tiempo límite; el cobro que relee el plan inactivo se rechaza; la transacción larga se revierte; en los tres casos no queda ninguna escritura
- test: pendiente

### AC-S04-022
- enlaza: REQ-S04-016, REQ-S04-017, REQ-S04-033, BEH-S04-034
- metodo: integracion
- procedimiento: lanzar con Promise.all dos anulaciones del mismo cobro; lanzar la anulación de un cobro vigente a la vez que se registra otro cobro del mismo miembro
- esperado: solo una anulación se aplica; en el segundo caso las operaciones se serializan y la anulación del cobro viejo se rechaza si el nuevo ya se registró
- test: pendiente

### AC-S04-023
- enlaza: REQ-S04-040, REQ-S04-042, REQ-S04-043, BEH-S04-035, BEH-S04-037, BEH-S04-038
- metodo: integracion
- procedimiento: anular sin el permiso PAGOS ELIMINAR, un pago inexistente, un cobro cuyo vencimiento se editó a mano y un pago de cambio de plan sin vencimiento anterior
- esperado: los tres primeros se rechazan sin escribir nada; el cuarto queda anulado sin cambiar el vencimiento ni la fecha del último pago
- test: pendiente

### AC-S04-024
- enlaza: REQ-S04-010, REQ-S04-014, BEH-S04-040
- metodo: integracion
- procedimiento: con hoy 2026-11-12, cobrar un mes con fecha de pago 2026-10-20 a un miembro con vencimiento 2026-11-05, y cobrar un mes a un miembro nuevo; contar los días con acceso del segundo
- esperado: el primero vence el 2026-12-05; el segundo da acceso del 12 de noviembre al 12 de diciembre, 31 días
- test: pendiente

### AC-S04-025
- enlaza: REQ-S04-045, REQ-S04-046, REQ-S04-047, BEH-S04-041, INV-S04-006
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-pagos.mjs con una exención de archivo inexistente, otra sin spec, una que asigna CambiarPlanConPago.ts a S-11 y otra a S-07; consultar el esquema final por la tabla y las columnas
- esperado: falla en las tres primeras y acepta la cuarta; el esquema no tiene ReglaAbonoPorFrecuencia ni Sucursal.diasGracia y Pago tiene vencimientoAnterior y cobroId con la restricción única
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1 y tarea 0.11 de ADR-010, pruebas primero, un commit por paso): (1) pruebas de caracterización de la implementación heredada para el vencimiento con 1 y 3 meses, la fecha pasada de hasta 90 días, el pago con varias líneas y la anulación, en verde contra el código heredado; (2) pruebas nuevas del cobro, de `estadoDeAcceso`, de la anulación y de la concurrencia, en rojo; (3) migración del esquema (columnas retiradas y la columna `vencimientoAnterior`, `cobroId` único); (4) `registrarPago` y `anularPago` reescritos con `dinero.ts` y `fechaLima`; (5) retiro del código de abonos, de `RegistrarPagoConDeudas` y de la pantalla de reglas de abono; (6) formulario de cobro; (7) `tools/verificar-pagos.mjs` con sus pruebas; (8) quitar la familia S-04 de las listas de exenciones; (9) paso del CI.
- **Secuencia de la transacción** (abierta por el caso de uso con `IUnidadDeTrabajo`; el bloqueo es `bloquearPorId` del repositorio de miembros, que en Drizzle usa `.for("update")` sin `sql.raw`): (1) abrir la transacción con tiempo límite de 20 segundos y espera de bloqueo de 5; (2) bloquear la fila del miembro; (3) releer miembro, plan, suscripción vigente y, si hay `cobroId`, sus pagos; (4) validar permiso, meses, importe, fecha de pago y plan; (5) calcular la base y el fin; (6) crear o extender la suscripción con `fijarVencimiento`; (7) crear el pago con su `cobroId` y su `vencimientoAnterior`; (8) actualizar `Miembro.fechaUltimoPago`; (9) confirmar.
- **Anulación:** dentro de una transacción con el mismo bloqueo, tomado sobre el miembro del pago que se lee primero, releer el pago y el miembro, comprobar el permiso, que no esté anulado, que sea el vigente más reciente y que su fin de ciclo coincida con el vencimiento actual; anular el pago del cobro, restaurar `vencimientoAnterior` con `fijarVencimiento` y la fecha del último pago. La suscripción no cambia de estado: su vigencia se deduce de su `fin`. Los pagos sin `vencimientoAnterior` solo se anulan.
- Las pruebas de propiedad y de concurrencia usan generadores con semilla fija; no hay dependencias nuevas.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15. Mientras tanto la base se crea con `drizzle-kit push` (S-22).
- Cambios de esquema: se retiran `Plan.permitePagoParcial`, `Plan.minimoAbonoTipo`, `Plan.minimoAbonoValor`, `Suscripcion.fechaLimiteAbono`, `Miembro.saldoAFavorUSD` y la tabla `ReglaAbonoPorFrecuencia` con su puerto y su repositorio; se retira `Sucursal.diasGracia`; se agregan `Pago.vencimientoAnterior` (fecha) y `Pago.cobroId` (UUID, nulo en los pagos de otras specs) con una restricción única sobre `cobroId`.
- **Enmiendas que se registran al aprobar S-04:** en S-22 y S-01, el recuento pasa de 26 a 25 tablas y se mantienen 15 enums, 21 repositorios y 16 suites de contrato (sin `ReglaAbonoPorFrecuencia`); en S-03, `resolverCobroPasado*` pasa a la familia de S-11; en S-02, la lista de exenciones deja los archivos de la familia S-04 convertidos aquí.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Reescribir el cobro es el cambio de mayor riesgo del producto. Mitigación: las pruebas de caracterización del paso 1 y la transacción con bloqueo por miembro.
- Retirar los abonos toca unos 53 archivos. Mitigación: la herramienta `verificar-pagos` y el typecheck; el trabajo se hace después de reescribir el cobro.
- Anular un cobro cuyo vencimiento se editó a mano se rechaza; quien edita el vencimiento desde la ficha pierde la posibilidad de anular ese cobro hasta corregirlo. Mitigación: el mensaje de REQ-S04-042.
- Los pagos de cambio de plan y las ventas no guardan vencimiento anterior y se anulan sin devolver tiempo hasta S-07 y S-11; la anulación de un cambio de plan puede dejar al miembro con tiempo que no pagó.
- `CambiarPlanConPago.ts` y la ficha comparten vencimiento con el cobro sin la misma transacción hasta S-07; INV-S04-001 se garantiza en las rutas de S-04 y en la ficha, que usan `fijarVencimiento`.
- Anular solo el último cobro puede estorbar a quien se equivocó dos cobros atrás. Mitigación: SUP-S04-007 y el mensaje de la anulación; lo decide el propietario.
- Cambiar el vencimiento de instante con hora a día de calendario puede mover un día los vencimientos que se calculan hoy con hora. Mitigación: SUP-S04-003 y las pruebas de borde de BEH-S04-013.
- El propietario confirmó los 30 días corridos por mes; si más adelante prefiere meses de calendario, cambia `diasCiclo`, que está aislado en la función de fin.
- `RegistrarPagoConDeudas` se borra aquí aunque el fiado es de S-11; el efecto es que, entre S-04 y S-11, no se cobran deudas junto con la membresía. Mitigación: ADR-018 elimina el fiado.
- El identificador de cobro exige que la pantalla lo genere; un cliente que no lo envíe recibe un identificador generado por el servidor y pierde la protección contra el doble clic. Mitigación: el servidor genera uno si falta y la pantalla siempre lo envía.

### 5.4 Preguntas abiertas
Todas las decisiones de negocio de S-04 fueron respondidas por el propietario el 2026-11-12:
- ¿Se puede repartir un cobro entre varios métodos (P-16)? Default: no, un solo método por cobro (SUP-S04-001); confirmado.
- ¿El mes dura 30 días corridos? Default: sí (SUP-S04-002); confirmado.
- ¿El día del vencimiento todavía tiene acceso? Default: sí, inclusive (SUP-S04-003); confirmado.
- ¿Hay días de gracia (P-18)? Default: no, la función se desincorpora (SUP-S04-004); confirmado.
- ¿Hay cobros de cortesía de S/ 0.00? Default: no aplica (SUP-S04-006); confirmado.
- ¿Se prevén anulaciones y reintegros? Default: sí, con el alcance de SUP-S04-015; confirmado.
- ¿Hay límite de antigüedad para un pago con fecha pasada? Default: no, y nunca con fecha futura (SUP-S04-008); confirmado.

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de S-05. El texto anterior se conserva; donde choca, rige esta sección.*
- REQ-S04-023, BEH-S04-021 y SUP-S04-004: el estado de acceso queda en `activo` y `vencido`; `sucursal_incorrecta` desaparece con la sede única (S-05) y `MiembroFueraDeSucursalError` se retira de `RegistrarPago`.
- Los cobros no reciben ni validan sede: `sucursalId` de `Pago` se llena con `obtenerSedeUnica` (S-05, REQ-S05-008).
- Por la aprobación de S-07 (cambio de plan): SUP-S04-007 y REQ-S04-017 definen el cobro anulable como el pago no anulado de mayor `Pago.creadoEn` (a igualdad, el de mayor identificador) y no el de mayor fin de ciclo, porque un cambio de plan con cobro puede dejar un fin menor que el del cobro anterior; el requisito de columnas de `Pago` suma `creadoEn`.
- Por S-07: SUP-S04-010, REQ-S04-043, BEH-S04-038 y AC-S04-023 dejan de decir que el pago de un cambio de plan no guarda `vencimientoAnterior`: lo guarda, y su anulación restaura el vencimiento y también el plan, el precio acordado y el plan de la suscripción desde `CambioPlanAuditoria` (REQ-S07-039). REQ-S04-035 remite a `cambiarPlan` como la operación que corresponde al rechazar un plan distinto con vencimiento vigente. 0.2, 0.3, 5.1 y los dos riesgos sobre cambio de plan se leen con esta enmienda; SUP-S04-014 y REQ-S04-045 admiten a S-07 como familia.
- Por S-07: `IUnidadDeTrabajo` expone además los repositorios de planes y de auditoría de cambio de plan.
- Por la aprobación de S-08: SUP-S04-011, 0.2, 0.3 (la línea sobre turnos y la del cambio de `caja/`), REQ-S04-045 y los dos riesgos que remiten a S-08 se leen como cumplidos por S-08; la aclaración de que `ModalCobrarDeudas.tsx` conserva términos de abono y la retirada de `RegistrarPagoConDeudas` quedan cumplidas porque el fiado y las deudas se eliminan en S-08; los tres archivos de `caja/` que adaptan S-04 y S-07 pasan a `cobros/`.
- Por la aprobación de S-09: REQ-S04-005 suma `MiembroEliminadoError` a los errores de `registrarPago`; la secuencia de `registrarPago` de 5.1 sitúa su rechazo después de resolver el `cobroId` ya registrado y antes de validar el plan, el monto y el método (REQ-S09-027); REQ-S04-032 e `IUnidadDeTrabajo` exponen el puerto de auditoría (REQ-S09-014); `anularPago` permite anular los pagos de un miembro eliminado (REQ-S09-029).
- Por la aprobación de S-10: SUP-S04-011, 0.3 y 0.4 se leen como cumplidos (`Pago.tasaCambio`, `Pago.montoBs` y el aviso «Por regularizar» se retiran).
- Por la aprobación de S-11: SUP-S04-009 (`Pago.cobroId` «nula en los pagos de otras specs») se lee con que la venta de producto también la escribe; SUP-S04-014 y la nota de `resolverCobroPasado*` quedan cumplidas por su retiro.
- Por la aprobación de S-23: REQ-S04-006 y REQ-S04-040 se leen como «sesión válida de un administrador activo».
- Por la aprobación de S-13: `IUnidadDeTrabajo` expone los repositorios de `TextoLegal`, `ConsentimientoMiembro` y `Miembro` para la transacción de `crearMiembro`.
- Por la aprobación de S-14: `miembros/vencimiento.tsx` conserva `diasHastaVencimiento` para la insignia de días.

## Revisión independiente

### Veredicto de `spec-reviewer` (texto íntegro, sin editar; sobre la primera versión en revisión)

## Revisión independiente de S-04 (pago único de membresía)

Spec revisada: /home/user/adhara-fit/docs/superpowers/specs/S-04-pago-unico-de-membresia.md. Clon del Repo A: /home/user/kaiserone01/gym-app (commit b4352a0).

**Límites.** Solo tuve Read, Grep y Glob. No ejecuté `spec-lint` ni `node`. No ejecuté los `grep` de 0.4 tal como están escritos. Reproduje los conteos con Grep y hay una salvedad, que está en la fila 6. Mi veredicto de lint se limita a lo que ví: no hay «etc.», «TBD» ni adjetivos vagos en la spec.

Abreviaturas: `S04` es el archivo de la spec. `A/` es /home/user/kaiserone01/gym-app. `S02`, `S03`, `S22` y `S01` son las specs aprobadas, en /home/user/adhara-fit/docs/superpowers/specs/.

| # | Comprobación | Veredicto | Evidencia (archivo:línea) | Qué corregir |
|---|---|---|---|---|
| 1 | Cabecera completa; ADRs 010, 011, 016, 018 y 022 existentes y aceptados; dependencias aprobadas | CUMPLE | `S04:1-8` tiene las seis claves, con `aprobada_por` y `fecha_aprobacion` vacíos, que es lo correcto en `en-revision`. Los ADR-010, 011, 016, 018 y 022 están aceptados (línea 3 de cada uno). S-00, S-01, S-02, S-03 y S-22 están `aprobada`. | Nada obligatorio. Sugerencia: S-04 toca `organizacionId` y el lugar de `diasGracia` (ADR-019, `docs/06:12,32`), pero no cita ADR-019 ni ADR-002. |
| 2 | Cada REQ es una obligación, en EARS, con prioridad y origen | NO CUMPLE (menor) | **Compuestos:** REQ-005 reúne tres condiciones y pide «un error específico», mientras BEH-008 exige tres errores distintos. REQ-012, 015, 018, 021 y 030 reúnen varias obligaciones. **Orígenes flojos:** REQ-008, 009 y 017 citan ADR-010, pero `ADR-010:15-23` no dice nada de concurrencia, `cobroId` ni anulación solo del último cobro. Son decisiones de la spec (SUP-S04-007, 009 y 010), como hizo S-02 con SUP-S02-001. **REQ-027 no cubre REQ-022:** REQ-027 habla solo de los términos de REQ-021, pero BEH-022 y AC-014 hacen fallar a la herramienta por `RegistrarPagoConDeudas.ts` y por `incluirDeudas`. **REQ-024** es un requisito de proceso («antes de la reescritura») que no se puede comprobar en el árbol final. | Partir REQ-005 y REQ-030. Citar los SUP como origen de REQ-008, 009 y 017. Ampliar REQ-027 a REQ-022, o añadir un REQ. Reformular REQ-024 para que sea verificable. **REQ que faltan** (hoy solo existen como SUP o comentario): permiso `PAGOS ELIMINAR` y pago inexistente en `anularPago` (`A/packages/domain/use-cases/AnularPago.ts:43,51-54`; RF-34, `docs/01:99`); cobro de S/ 0.00 (SUP-S04-006); `cobroId` generado por el servidor (`S04:616`); actualización de `fechaUltimoPago`; y que el formulario y el servidor usen la misma función de vencimiento. |
| 3 | Cobertura formal REQ→BEH→AC e INV enlazados | CUMPLE | Los 31 REQ aparecen en algún `cubre` de BEH. Todos los REQ MUST aparecen en algún AC. Los 5 INV tienen mecanismo, detección y AC (INV-001 en AC-001 y AC-011; INV-002 en AC-004; INV-003 en AC-006; INV-004 en AC-008; INV-005 en AC-014). Los IDs enlazados existen. | Nada. Los huecos de fondo están en las filas 4, 5 y 15 a 17. |
| 4 | Hay BEH de caso feliz, borde, error y concurrencia, y escenarios de bordes y errores donde aplica | NO CUMPLE | Hay las cuatro categorías (concurrencia: BEH-010 y 011). **Faltan:** (a) concurrencia de anulación: anular dos veces el mismo pago, y anular mientras entra otro cobro. (b) Dos cobros simultáneos a un miembro **sin suscripción previa** (BEH-010 parte de un vencimiento existente). (c) Cobro de S/ 0.00. (d) `cobroId` repetido con otro miembro o importe, o de un cobro ya anulado. (e) Estado en el borde de Lima, 04:59:59.999Z y 05:00Z, como `S02` REQ-S02-017; BEH-013 solo prueba días. (f) Pago a un miembro dado de baja. (g) Fecha pasada con vencimiento intermedio (fila 9). | Añadir esos BEH y sus AC. |
| 5 | Cada AC es binario, tiene método y resultado esperado, y enlaza REQ/BEH/INV existentes | NO CUMPLE (menor) | **AC-007 y BEH-010:** «sin estados intermedios» no se puede medir, y no fijan el reloj («hoy») que decide si el vencimiento 2026-12-12 está vigente. **AC-005:** «ningún repositorio simulado recibe llamadas», pero `autorizacion.tienePermiso` sí debe llamarse (REQ-006). **AC-006:** no dice cómo se fuerza el fallo en cada paso (inyección de fallos) y la secuencia de `S04:600` tiene 8 pasos, no 4. **AC-013:** mezcla lectura de dependencias (análisis estático) con consulta SQL. **AC-008:** su tercer paso (mismo `cobroId` e importe distinto devuelve el original) fija un comportamiento dudoso. **AC-011:** mezcla cuatro casos. **AC-001, 002, 010:** dependen de un «reloj de prueba» que ningún REQ ni la firma de `registrarPago` define. **INV-001:** «suscripción vigente» no está definida. | Fijar el reloj inyectado. Partir AC-011. Sustituir «sin estados intermedios» por una condición medible. Aclarar AC-005, AC-006 y AC-013. Definir «vigente» (fila 9). |
| 6 | §0.4: cada afirmación sobre el código cita archivo y línea o «verificado con comando» o «no verificado»; contraste con el Repo A | NO CUMPLE (menor) | **Confirmado:** `RegistrarPago.ts` tiene 511 líneas. Las citas `:341`, `:344`, `:365`, `:370`, `:381`, `:408`, `:462-492`, `:116-127`, `:373`, `:262`, `:215`, `:222` y `:427` son correctas. También `Pago.ts:33,35,38`, `Miembro.ts:17`, `Plan.ts:14`, `schema.prisma:43`, `CheckIn.ts:3`, `ValidarAcceso…ts:56`, los llamadores, `AnularPago.ts` de 69 líneas y los dos `grep -c` en 0. La pantalla `reglas-abono` tiene 3 archivos. Los conteos de 53 (abono), 9 (saldoAFavor), 14 (permitePagoParcial o minimoAbono) y 33 (`fechaVencimiento`) los reproduzco si excluyo pruebas y `packages/db`. **Errores:** (1) el cálculo de base y fin está en `RegistrarPago.ts:319-321`, no en `:303-310`, que son las líneas del motor de abonos. (2) `ValidarAccesoSucursalPorPlan.ts` tiene 63 líneas; la función va de `:17` a `:63`, no `:15-80`. (3) `AnularPago` comprueba el permiso `PAGOS ELIMINAR` en `:43`; `:47-48` es solo el motivo. (4) El `grep` de 33 archivos, escrito tal cual, también cuenta `packages/db` y pruebas. **«No verificado» que sí se puede verificar:** `completarCicloAbierto` solo lo pasan `RegistrarPagoConDeudas.ts:57` y `CobrarAbonoPendiente.ts:73`. `resolverCobroPasado` también lo usan `VenderProducto.ts:65` y `CobrarDeudasMiembro.ts:80`. **Omisiones:** `ActualizarMiembro.ts:64-133` es un tercer escritor del vencimiento desde la ficha (`miembros.actualizar` en `:75`, `pagos.moverFinCiclo` en `:94`, `ajustarCicloMasReciente` en `:96`, `extenderFin` en `:125`). La búsqueda de la suscripción vigente es **por miembro y plan** (`A/packages/infrastructure/persistence/prisma/PrismaSuscripcionRepository.ts:46-55`) y compara el instante con `fin >= fecha`. `miembros/actions.ts:151-187` crea el miembro y cobra en dos pasos, con `fechaPago = fechaInscripcion` y `primerPagoDeInscripcion: true` (`:203-206`). `Pago.grupoPagoId` lo usan también `VenderProducto.ts:82`, `CobrarDeudasMiembro.ts:90` y `CambiarPlanConPago.ts:193`. | Corregir las cuatro citas. Pasar los «no verificado» verificables a hechos. Añadir a 0.4 los escritores y las omisiones de esta fila. Aclarar que los conteos excluyen `packages/db` y las pruebas. |
| 7 | Supuestos con default y «asumido, por validar» | CUMPLE (forma) | SUP-S04-001 a 011 llevan `Default:` y la marca. El fondo de dos de ellos va en la fila 8. | Añadir supuestos que hoy están implícitos: quién abre la transacción, el nivel de aislamiento (SUP-S22-004), la definición de «vigente», y el tratamiento del cobro de S/ 0.00. |
| 8 | Contradicciones con ADR aceptados (010 y enmiendas, 011, 018, 019, 022) y con requisitos | NO CUMPLE | **Gracia:** REQ-013, SUP-S04-004 y BEH-014 extienden la gracia a todos los planes. RF-25 (`docs/01:89`), la regla 3 de `docs/01:154`, `docs/06:100` («Mantener `diasGraciaParaPlan`») y `docs/09` V-09 dicen **solo planes mensuales**. P-18 (`docs/08:20`) solo pregunta si la gracia se mantiene; no pregunta si se extiende. El default correcto sería conservar el comportamiento actual (`Plan.ts:14`), y el SUP lo contradice sin avisar. **Pago dividido:** SUP-S04-001 (repartir) contradice el default de `docs/08:18` (P-21: «una línea»); es coherente con S-03 aprobada (REQ-S03-020), pero no lo reconoce. **ADR-022 y S22:** `S04:600` dice `SELECT … FOR UPDATE`, y S-22 prohíbe `sql.raw` (REQ-S22-014) y el dominio no puede importar Drizzle (REQ-S22-023). Hace falta un puerto de transacción y de bloqueo (por ejemplo `bloquearMiembro` y una unidad de trabajo), y la spec no lo define; `REVISION-ADR.md:79` ya lo advertía. **ADR-018:** compatible (REQ-020; los 90 días se mantienen en `ADR-018:27`). **ADR-010 y ADR-011:** sin choque. | Decidir con el propietario la gracia en todos los planes o solo en mensuales (default documentado: solo mensuales). Citar la divergencia de P-16 con P-21. Añadir un REQ del puerto de transacción y bloqueo (con `.for("update")`, sin `sql.raw`). Decir dónde vive `diasGracia` (hoy `Sucursal.diasGracia`, `schema.prisma:43`; pasa a configuración global en S-05). |
| 9 | Reglas de fecha: «día de vencimiento inclusive» frente a S-02 (05:00Z); REQ-010 frente a REQ-014; aritmética de ejemplos | NO CUMPLE | **Aritmética (verificada a mano):** 2026-11-12 + 30 = **2026-12-12** (BEH-001). 2026-12-12 + 30 = **2027-01-11** (BEH-002 y BEH-017). 2026-11-12 + 90 = **2027-02-10** (BEH-004, BEH-010, AC-003 y AC-007). 90 días antes de 2026-11-12 = **2026-08-14** (BEH-016). 2026-10-20 + 30 = **2026-11-19** (BEH-015). Con vencimiento 2026-11-10 y gracia 3: 10 activo, 11 a 13 en gracia, 14 vencido (BEH-013). 200,00 + 160,00 = 360,00. Todo correcto. **Problemas:** (a) La regla inclusiva solo es coherente con S-02 (`S02` REQ-S02-005: vencimiento guardado a las 05:00Z) si se compara por día de Lima. La consulta vigente del Repo A compara el instante (`PrismaSuscripcionRepository.ts:36,52`, `fin >= fecha`): con `fin` = 05:00Z del día D, a partir de las 00:00 de Lima del día D ya no hay suscripción vigente, lo contrario de REQ-012. Si `registrarPago` usa esa consulta, el cobro hecho el día del vencimiento no encuentra la suscripción y crea una segunda `ACTIVA`. `S04:600` («leer la suscripción vigente») no la define. (b) La spec no dice qué instante guardan `Suscripcion.inicio`/`fin`, `fechaUltimoPago`, `Pago.fechaInicioCiclo`/`fechaFinCiclo`/`fechaPago` ni `vencimientoAnterior`. `S02` SUP-S02-002 solo enumera seis campos y no incluye los de `Pago`. La anulación compara fechas de `Pago` con las de `Miembro`, así que deben usar la misma representación. (c) **REQ-010 y REQ-014 se contradicen:** «posterior a hoy» frente a «un vencimiento posterior» (¿a qué?). Con vencimiento 2026-11-05, hoy 2026-11-12 y fecha de pago 2026-10-20, una lectura da 2026-12-05 (base = vencimiento, como el legado en `RegistrarPago.ts:465-468`) y la otra 2026-12-12 (base = hoy). Ningún BEH lo cubre. (d) Con 30 días de ciclo, el cobro del 12-11 da acceso hasta el 12-12 inclusive, o sea 31 días; el legado daba 30 con hora. 5.3 menciona un día de desplazamiento, pero ningún BEH ni AC lo fija y no está en 5.4. (e) El estado de acceso no se prueba en el borde 04:59:59.999Z/05:00Z. (f) No dice qué consumidores usan `estadoDeAcceso`: `validarAccesoSucursal` (`ValidarAcceso…ts:17-63`), `RegistrarCheckIn`, `ListarEnSala`, el kiosco (`cara.ts`, `AccessCard.tsx`). (g) **Exenciones de S-02:** `S02:24,36` mandan a S-04 la conversión de `ActualizarMiembro.ts`, `CalcularVencimientoPlan.ts`, `resolverCobroPasado.ts`, `pagos/actions.ts`, `CampoFechaCobro.tsx`, `proyeccionRenovacion.ts`, `vencimiento.tsx`, etc. REQ-029 habla de «familia S-04», definida solo en la lista de S-03 (`S03:630`) y no en la de S-02 (por etiqueta de spec). | Escribir un REQ de representación: todas las fechas de calendario van a las 05:00Z y todas las comparaciones de vigencia y de estado son por día de Lima. Definir «vigente». Unificar REQ-010 y REQ-014 en una sola fórmula (por ejemplo base = máx(vencimiento, fecha de pago)) y añadir el BEH del vencimiento intermedio. Añadir los BEH de borde de Lima y de los 31 días, y llevar la regla inclusiva a 5.4. Listar los consumidores. Aclarar cómo se leen «familia S-04» y «archivos etiquetados S-04» en cada lista de exenciones. |
| 10 | Puente de dinero y listas de exenciones de S-02/S-03; verificar-pagos | NO CUMPLE | `S03:630` define la familia S-04 como `RegistrarPago*`, `CobrarAbono*`, `ListarAbonos*`, `ReglaAbono*` y archivos de abono. `RegistrarPagoConDeudas*` está en la familia S-11 (`S03:634`); borrarlo en S-04 es coherente, pero REQ-029 no lo dice. `resolverCobroPasado.ts`, que `S04:49` asigna a S-10, **no coincide con ninguna familia** de `S03:630-635` (S-10 es `*Tasa*`, `formatearBs*`, `ConvertirMontoUSDaVES*`, `padron*`, `ModalHistorialTasas*`). `AnularPago.ts`, `ActualizarMiembro.ts` y `Pago.ts` tampoco están en ninguna familia. `S03:20` dice que S-03 solo toca tres funciones de `Pago.ts`; S-04 debe editar el resto (`pagosVigentesDelCiclo` `:73`, `totalPagado` `:77`, `toleranciaDiferenciaPagoUSD` `:43`, `MAX_DIAS_ATRAS_PAGO_RETROACTIVO` `:33`) y no lo lista en 0.2. **REQ-021 depende de una «lista de exenciones» de `verificar-pagos` que la spec nunca define** (ni formato, ni dueño, ni REQ ni INV como `S02` REQ-S02-020/INV-005). Esa lista es necesaria: `CambiarPlanConPago.ts` (S-07) conserva `saldoAFavorGenerado` (`:110,:263`) y comentarios de abono (`:89-90,:187-188`), y los archivos de `caja/` (S-08) y `ModalCobrarDeudas.tsx` (S-11) contienen «abono». `S03:33` delegó a S-04 el cobro de S/ 0.00 (`esCortesia`, `Pago.ts:124`); S-04 solo tiene SUP-S04-006, sin REQ, BEH ni AC. | Definir la lista de exenciones de `verificar-pagos` (o declarar que no hay y que S-04 limpia todo), con REQ e INV propios. Listar los archivos de `Pago.ts`, `Plan.ts`, `Suscripcion.ts`, `CheckIn.ts`, `Miembro.ts` y los repositorios que S-04 edita. Corregir la asignación de `resolverCobroPasado.ts`. Añadir REQ, BEH y AC del cobro de S/ 0.00, con el aspecto de las líneas (¿una línea de 0.00?, ¿qué método?). |
| 11 | Recuentos de tablas de S-22 y S-01 | NO CUMPLE (menor) | `S01:704,719` fijan 26 tablas y 15 enums. `S22:39` y REQ-S22-007 hablan de 22 repositorios, y BEH-S22-026 de 17 suites. S-04 retira la tabla `ReglaAbonoPorFrecuencia` (`schema.prisma:229`) y su repositorio y puerto (`IReglaAbonoRepository.ts`, `PrismaReglaAbonoRepository.ts`): quedan 25 tablas y 15 enums, 21 repositorios y 16 suites. `S04:606` dice «cambia los recuentos» sin dar cifras, sin REQ y sin AC, y no anuncia una enmienda en «Enmiendas posteriores» como sí hicieron `S01:704` y `S03:642`. El esquema nuevo necesita además una columna de orden de línea y el tipo de `vencimientoAnterior`; `S04:606` solo nombra `vencimientoAnterior` y la restricción única (ver fila 15). | Dar las cifras. Registrar la enmienda de S-22 y S-01. Añadir el AC o la comprobación del recuento. Listar la columna de orden y los tipos nuevos. |
| 12 | Alcance frente a S-05, S-07, S-08, S-09, S-10 y S-11 | NO CUMPLE | **S-07:** REQ-004, SUP-S04-005 y BEH-007 mantienen el cobro de «otro plan» con `registrarPago` (`RegistrarPago.ts:242-250,353-364`). Con base = vencimiento más ciclo del plan nuevo, eso es un cambio de plan sin prorrateo, que `S04:29` dice que es de S-07 (P-17 conserva el cálculo). No dice qué pasa con la suscripción del plan anterior, con `planId`, con `precioPlan` ni con el entrenador. **`CambiarPlanConPago`:** sigue escribiendo `extenderFin` (`:216`) y `actualizarFechasPago` (`:223`) sin transacción y sin `vencimientoAnterior` (ver fila 16). S-04 no dice cómo conviven hasta S-07, aunque REQ-011 dice «siempre iguales». **S-08:** el cobro principal vive en `caja/ModalRegistrarPagoCaja.tsx` (78 menciones de abono y `saldoAFavor`), en la familia S-08 (`S03:632`). Otros: `caja/SelectorMiembroModal.tsx`, `ProyeccionCiclosUI.tsx`, `PanelRemanentePago.tsx`, `caja/page.tsx`, `caja/actions.ts`, `pagos/FormularioPago.tsx`, `miembros/FormularioMiembro.tsx` (`montoInicial` como abono, `miembros/actions.ts:117-121`) y `PanelPagoYCambioPlan.tsx`. REQ-026 y REQ-031 dicen «el formulario de cobro», sin decir cuál. **S-10:** SUP-S04-008 dice «el límite de 365 días y el aviso se retiran», pero `S04:33` asigna a S-10 el aviso «Por regularizar» y el alta retroactiva. Quitar `primerPagoDeInscripcion` rompe `miembros/actions.ts:158-160,203-206`: un miembro inscrito hace más de 90 días queda creado sin pago (`:176-179`). **S-11:** `AnularPago` conserva `deudas` y `reabrirPorGrupo` (`:5,40,64-65`) y S-04 no decide si siguen; las ventas de producto tienen `miembroId` nulo (`schema.prisma:271`). **S-05:** `MiembroFueraDeSucursalError` (`RegistrarPago.ts:229-232`) y `organizacionId` quedan sin tratamiento. **Kiosco:** quitar `abono_vencido` (REQ-023) obliga a editar `apps/kiosk/lib/cara.ts:11`, `api.ts:4`, `AccessCard.tsx:29,130,134` y `cara.test.ts:40,51`; la spec no los lista y falta el color de «gracia» (`REVISION-ADR.md:164`). | Decidir y escribir: ¿`registrarPago` rechaza otro plan mientras haya vencimiento vigente y deja el cambio a S-07? Enumerar qué formularios y archivos de `caja/` toca S-04 y qué dejaría exento S-08. Decidir qué pasa con la inscripción retroactiva de más de 90 días. Decir qué hace `anularPago` con `deudas` y con pagos que no son de membresía. Listar los archivos del kiosco. |
| 13 | Diseño de la transacción y del bloqueo por miembro | NO CUMPLE | **El `FOR UPDATE` cubre al miembro sin suscripción previa:** el bloqueo es sobre la fila de `Miembro`, que ya existe porque `crearMiembroAction` crea el miembro antes de cobrar (`miembros/actions.ts:151-187`), así que dos primeros cobros simultáneos se serializan y solo uno hace `crear`. Pero la spec no lo dice, y ningún BEH ni AC lo prueba (BEH-010 parte de un vencimiento existente). **Huecos:** (a) No define quién abre la transacción: hoy lo hace el llamador (`pagos/actions.ts:206`), con tres llamadores. Si queda ahí, REQ-007 no se cumple para un llamador nuevo. (b) Hay que releer el miembro **después** del bloqueo: bajo `READ COMMITTED` (SUP-S22-004) la validación de REQ-005 hecha antes quedaría desfasada. (c) `anularPago` recibe `pagoId` (`AnularPago.ts:31-37`): debe leer el pago, bloquear su miembro y volver a leer el pago antes de comprobar «ya anulado» y «último vigente». `S04:601` solo dice «el mismo bloqueo». (d) No hay `lock_timeout` ni tiempo límite de transacción (compárese con REQ-S22-024). (e) El cobro y la creación del miembro siguen sin ser atómicos (`actions.ts:176-179`); debe decirse que queda fuera. | Añadir REQ y BEH de: puerto de transacción y de bloqueo; relectura tras el bloqueo; anulación concurrente; primer cobro simultáneo de un miembro nuevo; tiempo límite. Declarar que el alta y el primer cobro no son atómicos aquí. |
| 14 | `cobroId` e idempotencia | NO CUMPLE (menor) | SUP-S04-009 pide una restricción única sobre `grupoPagoId` y el **orden de línea**, pero `Pago` no tiene ninguna columna de orden (`schema.prisma:268-310`) y `S04:606` no la lista. `grupoPagoId` lo usan también `VenderProducto.ts:82`, `CobrarDeudasMiembro.ts:90` y `CambiarPlanConPago.ts:193` (que no fijarían orden): hay que decir si la columna es anulable. AC-008 acepta un mismo `cobroId` con otro importe y devuelve los pagos originales: un envío distinto se confunde con un reintento, y un `cobroId` de otro miembro devuelve pagos ajenos. Tampoco dice qué pasa si el cobro original está anulado: el reenvío devuelve pagos anulados como si se hubiera cobrado. Si el servidor genera el id cuando falta (`S04:616`), esa ruta no tiene protección. La pantalla debe generar un `cobroId` nuevo tras un éxito, y `crypto.randomUUID` solo existe en contexto seguro (HTTPS). Un duplicado en otro miembro daría un error 23505 crudo. | Definir la columna de orden. Decidir: mismo `cobroId` con distinto miembro, plan, meses o importe se rechaza con un error de conflicto. Definir el caso del cobro anulado. Mapear el error de unicidad a un error de dominio. |
| 15 | Anulación LIFO y `vencimientoAnterior` | NO CUMPLE | (a) Un `vencimientoAnterior` nulo significa «el miembro no tenía vencimiento» (BEH-019), pero también será nulo en pagos que S-04 no escribe: `CambiarPlanConPago` (`:196-210`), ventas de producto, cobros de deudas. Con la regla de `S04:601`, anular uno de esos pagos (que sea el de mayor `fechaFinCiclo`) **borra el vencimiento del miembro**. Hay que limitar `anularPago` a pagos de membresía de S-04 o distinguir «sin dato» de «sin vencimiento». (b) Solo restaura el vencimiento. `fechaUltimoPago` queda apuntando al pago anulado (`RegistrarPago.ts:365`), y luego `ActualizarMiembro.ts:70-71` lanza `FechasIncoherentesError` cuando `fechaUltimoPago > vencimiento`. (c) La edición de la ficha cambia el vencimiento y mueve `fechaFinCiclo` de los pagos (`ActualizarMiembro.ts:93-96`), pero no `vencimientoAnterior`: restaurar un valor viejo lo resucita. Falta la guarda `pago.fechaFinCiclo == miembro.fechaVencimiento`. (d) «La suscripción deja de estar activa» no define el estado: `EstadoSuscripcion` tiene ACTIVA, VENCIDA, CANCELADA y PAUSADA (`Suscripcion.ts:1`) y `fin` no admite nulo (`schema.prisma:258`). Tampoco dice qué pasa con `inicio`/`fin` si el cobro creó la suscripción pero el miembro ya traía vencimiento (alta desde la ficha o el padrón). (e) No revierte `planId` ni `precioPlan` cambiados por el cobro (`RegistrarPago.ts:361-364`). (f) El orden por «mayor fin» sí es monótono: la base nunca es menor que el vencimiento actual, así que no hay inversión por pagos con fecha pasada. | Cerrar a-e con REQ y BEH. Añadir `fechaUltimoPago` a lo que se restaura o recalcular desde el último pago vigente. Definir el estado de la suscripción al anular. |
| 16 | INV-001 («siempre iguales») frente a los demás escritores | NO CUMPLE (menor) | El título habla de «una sola fecha de vencimiento» pero REQ-011 conserva dos columnas iguales. La igualdad solo está garantizada en las rutas de S-04. `ActualizarMiembro.ts:75-100` escribe el miembro y luego ajusta la suscripción sin transacción. `CambiarPlanConPago.ts:216-223` escribe cada una por separado. `ActivarMiembroDesdePadron` también las escribe. La detección de INV-001 es una consulta ejecutada en las pruebas, no un control de datos reales. | Acotar INV-001 a los escritores de S-04 y dejar el resto explícitamente a S-07 y S-10, o llevarlo a una única función de escritura compartida. |
| 17 | Riesgos, dependencias nuevas y lint | CUMPLE (con salvedad) | `S04:602` declara que no hay dependencias nuevas, y no vi ninguna necesidad: se usan Drizzle, `crypto` y la herramienta de texto. 5.3 recoge el riesgo de reescritura, de 53 archivos, de anular solo el último, de fecha de calendario, de mes de calendario, de `RegistrarPagoConDeudas` y del `cobroId`. No encontré «etc.», «TBD», «por definir» ni adjetivos vagos. **Salvedad:** no ejecuté `spec-lint`. | Añadir a 5.3 los riesgos de las filas 9, 12, 15 y 16 (31 días de acceso, ficha que desfasa `vencimientoAnterior`, anulación que borra el vencimiento, `CambiarPlanConPago` sin atomicidad). Correr `node tools/spec-lint.mjs` antes de entregar. |

### Prioridades para el autor
1. **Bloqueantes de diseño:** filas 12 (otro plan y S-07), 13 (puerto de transacción y relectura tras bloqueo) y 15 (la anulación puede borrar el vencimiento; `fechaUltimoPago` no se restaura).
2. **Preguntas al propietario** (no bloquean si se aplican los defaults del repo): gracia en todos los planes frente a solo mensuales (RF-25; el default documentado es solo mensuales), y la regla de 31 días de acceso con vencimiento inclusivo.
3. **Coherencia con S-02 y S-03:** filas 9 y 10 (comparación por día, representación de las fechas de `Pago`, exenciones de `verificar-pagos`, cobro de S/ 0.00).
4. **Citas y aritmética:** la aritmética de ejemplos es correcta; hay que corregir las citas `:303-310` y `ValidarAcceso…ts:15-80` (fila 6).

VEREDICTO GLOBAL: REQUIERE CAMBIOS (equivale a «Requiere cambios» en tu escala; no es «Bloqueada por pregunta», porque las decisiones de negocio pendientes tienen default aplicable). La decisión final es del propietario.

### Conciliación del autor
Verifiqué los hallazgos contra el Repo A antes de corregir: la ubicación de la base y del fin (`RegistrarPago.ts:319-321`), el permiso `PAGOS ELIMINAR` de la anulación (`AnularPago.ts:43`), la longitud de `ValidarAccesoSucursalPorPlan.ts` (63 líneas), la búsqueda de la suscripción vigente por instante (`PrismaSuscripcionRepository.ts:31-36`), los tres escritores del vencimiento y los archivos del kiosco con `abono_vencido`. **Todos eran ciertos**; ninguno se rechazó. El revisor no pudo ejecutar `spec-lint`; yo sí, con 0 errores y 0 avisos tras las correcciones.

| Hallazgo | Corrección |
|---|---|
| Fila 2 (REQ compuestos, orígenes, faltantes) | REQ-005, 011, 024, 030 y 034 reescritos o divididos; los SUP se citan como origen de REQ-008, 009 y 017; REQ-027 cubre ahora REQ-022; REQ nuevos 032 a 048 (puerto de transacción, relectura, vigencia por día, otro plan, cobro de 0.00, `cobroId`, permiso de anulación, fecha del último pago, guarda de ficha, pagos sin vencimiento anterior, tiempo límite, exenciones, tabla de abonos, columnas nuevas, comparación por día) |
| Fila 4 (BEH que faltaban) | BEH-027 a BEH-041: primer cobro simultáneo, relectura tras el bloqueo, borde de Lima, otro plan, cobro de 0.00, `cobroId` en conflicto o anulado, error de unicidad, anulación concurrente, permisos, fecha del último pago, ficha editada, pagos sin vencimiento, tiempos límite, vencimiento intermedio y 31 días, exenciones |
| Fila 5 (AC no medibles) | AC-005 a AC-008, AC-011, AC-013 y AC-015 reescritos; nuevos AC-019 a AC-025; el reloj de prueba queda como parte del procedimiento de cada AC |
| Fila 6 (citas y omisiones) | Citas corregidas (`:319-321`, `ValidarAcceso…:17-63`, `AnularPago.ts:43`); agregados el tercer escritor (`ActualizarMiembro`), la búsqueda por instante, el alta en dos pasos, los usos de `grupoPagoId`, de `completarCicloAbierto` y de `resolverCobroPasado`, y los archivos del kiosco |
| Fila 8 (gracia, P-16, bloqueo en Drizzle) | SUP-S04-004 y SUP-S04-001 declaran su divergencia de RF-25 y de P-21 y se agregan a las preguntas; REQ-032 define los puertos `IUnidadDeTrabajo` y `bloquearPorId` sin `sql.raw` |
| Fila 9 (fechas) | Fórmula única de la base (REQ-010 y REQ-014), vigencia por día de Lima (REQ-034 y REQ-048), representación de fechas (SUP-S04-013), borde de Lima (BEH-029) y los 31 días en 5.4 |
| Fila 10 (exenciones) | Lista de exenciones propia con REQ-045 e INV-006; `resolverCobroPasado*` pasa a la familia de S-11; cobro de 0.00 con REQ-036; listado de ediciones de `Pago.ts`, `Plan.ts`, `Suscripcion.ts`, `CheckIn.ts`, `Miembro.ts` y repositorios en 0.2 |
| Fila 11 (recuentos) | Cifras: 25 tablas, 15 enums, 21 repositorios y 16 suites; enmiendas a S-22, S-01, S-03 y S-02 anunciadas en 5.2 para registrarlas al aprobar |
| Fila 12 (alcance) | Otro plan se rechaza con vencimiento vigente (REQ-035); formularios y archivos del kiosco enumerados; la inscripción de más de 90 días y el alta no atómica quedan declaradas; `CambiarPlanConPago` conserva sus escrituras hasta S-07 |
| Fila 13 (transacción) | Secuencia de 9 pasos con relectura, bloqueo y tiempos límite; la anulación bloquea al miembro del pago |
| Fila 14 (`cobroId`) | `cobroId` obligatorio, conflicto, cobro anulado y error de unicidad mapeado (REQ-037 a REQ-039); `ordenLinea` nulo en pagos de otras specs |
| Fila 15 (anulación) | `vencimientoAnterior` nunca nulo en cobros de S-04; los pagos sin él se anulan sin tocar el vencimiento (REQ-043); restauración de la fecha del último pago (REQ-041); guarda de vencimiento editado a mano (REQ-042); la vigencia de la suscripción se deduce de su `fin` |
| Fila 16 (INV-001) | INV-001 acotado a las rutas de S-04 y la ficha, que usan `fijarVencimiento`; el resto queda para S-07 y S-10 |
| Fila 17 (riesgos y lint) | Riesgos agregados a 5.3; `spec-lint` ejecutado |

Tras las correcciones S-04 pasó de 31 a 48 REQ, de 26 a 41 BEH, de 5 a 6 INV y de 18 a 25 AC. Sigue en `en-revision` hasta que el propietario escriba «S-04 aprobada» sobre este texto corregido y responda las tres decisiones de negocio con valor por defecto (pago repartido, gracia en todos los planes y día de vencimiento inclusivo).

### Cambios posteriores a la revisión (2026-11-12)
El propietario respondió las decisiones de negocio y se aplicaron sobre el texto ya corregido: **sin pagos repartidos entre métodos** (un cobro es un solo pago; se agrega REQ-S04-049 y `Pago.cobroId` sustituye a `ordenLinea`); **se desincorporan los días de gracia** (REQ-S04-013 pasa a prohibirlos y el acceso tiene dos estados); **no hay cobros de cortesía** (REQ-S04-036 exige un monto mayor que 0.00); **pagos con fecha pasada sin límite de antigüedad y nunca futura** (REQ-S04-014 y REQ-S04-015); y se confirmaron los 30 días por mes y el día de vencimiento inclusive. S-04 queda con 49 REQ, 42 BEH, 6 INV y 25 AC. El propietario escribió «S-04 aprobada» el 2026-11-12 sobre este texto; la spec pasó a `aprobada`.
