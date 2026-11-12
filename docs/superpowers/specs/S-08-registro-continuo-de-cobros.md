---
id: S-08
estado: en-revision
adrs: ADR-011, ADR-016, ADR-018, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-07, S-22
aprobada_por:
fecha_aprobacion:
---
# S-08 — Registro continuo de cobros: sin turnos, arqueo ni egresos, con reporte diario por método y usuario

## 0. Contexto y alcance

### 0.1 Problema
El código heredado organiza el dinero en torno a la caja con turnos: hay que abrir un turno con un fondo inicial para inscribir a un miembro o cobrar, un solo usuario "tiene" la caja, el cierre compara lo esperado con lo contado (arqueo) y se registran egresos. El propietario decidió que no hay turnos ni arqueo, que no hay egresos ni fiado y que el sistema solo captura la recepción de pagos de membresías y de productos (ADR-018, aceptado). S-08 quita esa maquinaria y deja un registro continuo de cobros: cada cobro guarda quién, cuándo, método y monto, se puede anular con motivo (S-04) y hay un reporte diario por método y por usuario, que sustituye al arqueo como control.

### 0.2 Dentro de alcance
- Eliminación de `Turno`, `Egreso`, `ArqueoLinea`, de los enums `EstadoTurno` y `MonedaEgreso`, de `Pago.turnoId` y del valor `CAJA` de `ModuloPermiso`.
- Eliminación de los casos de uso `AbrirTurno`, `CerrarTurno`, `ObtenerResumenTurno`, `ObtenerUltimoCierrePorSucursal`, `RegistrarEgreso` y `ObtenerReporteCaja`, de sus entidades, puertos y repositorios, y de `SinTurnoAbiertoError`.
- Que inscribir un miembro, cobrar, cambiar de plan y vender un producto nunca consulten un turno: `miembros/page.tsx`, `miembros/nuevo/page.tsx`, `miembros/actions.ts`, `pagos/actions.ts`, `api/pagos/route.ts`, el inicio de sesión y los casos de uso de cobro que aún lo hagan.
- La carpeta `caja/` pasa a `cobros/` (ruta `/cobros`, menú «Cobros»): selector de miembro, asistente de cobro de membresía (S-04), cambio de plan (S-07), entrada a la venta de productos (S-11), cobros de hoy con anulación y totales de hoy.
- Reporte de cobros: caso de uso `obtenerReporteCobros` y la página de historial `/pagos`, con totales por día, por método y por usuario, cobros anulados marcados y cobros con fecha pasada marcados.
- `obtenerDiasConActividad` basado en los pagos.
- `tools/verificar-caja.mjs` con su paso en el CI; retiro de los archivos de la familia S-08 de las exenciones de S-02, S-03 y S-04 y de la de S-07.

### 0.3 Fuera de alcance
- Ventas de productos, fiado y las tablas de deuda: S-11. S-08 solo quita el turno de `VenderProducto` y `CobrarDeudasMiembro` y deja `ModalVenderProducto`, `ModalCobrarDeudas` y las acciones de producto donde están, dentro de `cobros/`.
- Tickets y comprobantes: S-12. Reportes de morosos, por vencer e histórico imprimible: S-14 (S-08 conserva el botón de imprimir que ya existe).
- Cobros y anulaciones de membresía: S-04. Cambio de plan: S-07. Métodos de pago: S-03.
- Un control de efectivo contado frente a esperado: no existe (ADR-018); el control es el reporte diario por método y usuario.
- Permisos por módulo y rol único: S-23 (S-08 solo retira el valor `CAJA`).
- La ruta `api/caja/ultimo-cierre` ya la retira S-01.
- La tasa de cambio y las columnas `Pago.tasaCambio` y `Pago.montoBs`: S-10.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-08 recibirá después de S-00 a S-07 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Esquema:** `enum EstadoTurno` (`schema.prisma:448`), `model Turno` con `fondoInicialEfectivoUSD`, `fondoInicialEfectivoBs`, `abiertoEn`, `cerradoEn` y `estado` (`:453-478`), `enum MonedaEgreso` (`:480`), `model Egreso` (`:485`), `model ArqueoLinea` con `@@unique([turnoId, metodo])` (`:502-512`) y `Pago.turnoId` con su relación (`:275-276`); `ModuloPermiso` incluye `CAJA` (`:104-111`) (verificado con `grep -n` y `Read`).
- **Casos de uso:** `AbrirTurno.ts`, `CerrarTurno.ts`, `ObtenerResumenTurno.ts`, `ObtenerUltimoCierrePorSucursal.ts`, `RegistrarEgreso.ts` y `ObtenerReporteCaja.ts` existen; `AbrirTurno.ts:38` y `CerrarTurno.ts:59` exigen el permiso `CAJA`; `ObtenerDiasConActividad.ts` lee `turnos.listarFechasConTurno` (verificado con `ls packages/domain/use-cases` y `Read`).
- **Alcance en código:** 50 archivos `.ts` y `.tsx` mencionan alguno de `ITurnoRepository`, `PrismaTurnoRepository`, `AbrirTurno`, `CerrarTurno`, `ObtenerResumenTurno`, `ObtenerUltimoCierre`, `RegistrarEgreso`, `Egreso`, `Arqueo`, `turnoId`, `SinTurnoAbiertoError`, `obtenerTurnoAbiertoParaUsuario`, `fondoInicial`, `cajaAbiertaPor`, `EstadoTurno`, `MonedaEgreso` o `listarPorTurno`, 5 de ellos pruebas (verificado con `grep -rIlE`); la palabra «Turno» sola da falsos positivos en `apps/vitrina` (`siguienteTurno`, `Franja.tsx:5`).
- **Exigencia de turno:** `RegistrarPago.ts:373,384` busca el turno abierto y deja `turnoId` nulo si no hay o si el cobro es pasado; `miembros/page.tsx:25-64` y `miembros/nuevo/page.tsx:21-39` impiden inscribir miembros y cobrar si el usuario no tiene la caja abierta; `pagos/actions.ts:43,228` captura `SinTurnoAbiertoError`; `api/pagos/route.ts:96` y `miembros/actions.ts:193` pasan el repositorio de turnos; `api/auth/login/route.ts:49-57` consulta el turno abierto por sede (`cajaAbiertaPor`) (verificado con `grep -n`).
- **Pantalla de caja:** `caja/` tiene 25 archivos y 4 836 líneas; `caja/page.tsx` (336 líneas) arma el resumen del turno, la lista de miembros, planes, productos, deudas, métodos y tasa; `caja/actions.ts` (650 líneas) exporta `abrirTurnoAction` (`:66`), `registrarEgresoAction` (`:128`), `cerrarTurnoAction` (`:204`), `anularPagoAction` (`:271`), `venderProductoAction` (`:338`), `fiarProductoAction` (`:431`), `cobrarDeudasAction` (`:493`) y `anularDeudaAction` (`:628`); los accesos a `/caja` están en `layout.tsx:49`, `NavegacionMobile.tsx:55`, `en-sala/ListaEnSala.tsx` y `caja/BotonRegistrarPagoCaja.tsx` (verificado con `grep -n` y `wc -l`).
- **Historial:** `pagos/page.tsx` (259 líneas) llama a `obtenerReporteCaja` (`:68`) y `obtenerDiasConActividad` (`:77`), muestra el detalle por turno con apertura, cierre, egresos y arqueo (`:165-202`) y usa `FiltroFechasHistorico` con `desde` y `hasta` (`:41-60`) (verificado con `Read`).
- **Reporte actual:** `obtenerReporteCaja` agrupa por turno, calcula `totalPagosUSD` y `totalEgresosUSD` con `number` y trata como «ajustes fuera de turno» los pagos sin `turnoId` (`ObtenerReporteCaja.ts:27-57`) (verificado con `Read`).
- **Interacción con specs aprobadas:** S-04 quitó el turno de `registrarPago` y `anularPago` (REQ-S04-024) y dejó a S-08 la reconstrucción de `caja/`; S-07 lista tres archivos de `caja/` que adapta (`ModalRegistrarPagoCaja.tsx`, `SelectorMiembroModal.tsx` y `page.tsx`); S-03 reservó la familia S-08 (`Turno*`, `Arqueo*`, `Egreso*`, `ObtenerReporteCaja*`, `ObtenerResumenTurno*` y la carpeta `caja/`) como exenta de `verificar-dinero`; S-01 retira `caja/ultimo-cierre`; S-05 deja `Turno.sucursalId` hasta S-08 (verificado con `grep -n` en las specs).
- No verificado: el contenido de `caja/ModalRegistrarPagoCaja.tsx` más allá de lo que citan S-04 y S-07, y que ningún reporte fuera de `pagos/page.tsx` use `ObtenerReporteCaja`.

### 0.5 Supuestos
- SUP-S08-001: sin turnos, el control del dinero es el reporte diario por método y usuario más la anulación con motivo y autor; no hay efectivo esperado ni contado. Default: ese control; decisión del propietario (ADR-018); asumido, por validar su suficiencia.
- SUP-S08-002: el reporte agrupa por el día de Lima de la fecha de pago (`Pago.fechaPago`), no por el de registro; los cobros registrados hoy con una fecha anterior aparecen en el día de su fecha de pago y se marcan «fecha pasada» para que el control los encuentre. Default: ese criterio; asumido, por validar.
- SUP-S08-003: los cobros anulados no suman a ningún total y se listan marcados con su motivo y autor. Default: ese criterio; asumido, por validar.
- SUP-S08-004: el reporte incluye todos los pagos (membresía, cambio de plan y producto) con su concepto y no distingue la sede, que es una sola. Default: todos los pagos; asumido, por validar.
- SUP-S08-005: el rango del historial es de hasta 366 días y el valor por defecto es hoy; para un rango mayor se pide acotar. Default: ese límite; asumido, por validar.
- SUP-S08-006: el valor `CAJA` de `ModuloPermiso` se retira y el acceso a `/cobros` y al historial exige `PAGOS VER`; cobrar exige `PAGOS CREAR` y anular `PAGOS ELIMINAR` (S-04). Default: ese reparto hasta S-23; asumido, por validar.
- SUP-S08-007: la carpeta `caja/` se mueve a `cobros/` conservando los componentes del asistente de cobro de S-04 y S-07 y los de producto de S-11; solo se quita lo que depende del turno. Default: mover y recortar, sin reescribir el asistente; asumido, por validar.
- SUP-S08-008: la sede única no necesita selector en `/cobros`; los pagos se registran en la sede de `obtenerSedeUnica` (S-05). Default: ese criterio; asumido, por validar.
- SUP-S08-009: los pagos históricos con `turnoId` no existen porque el baseline es nuevo (S-15). Default: sin migración; asumido, por validar.

## 1. Requisitos

### REQ-S08-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: El esquema no deberá contener las tablas Turno, Egreso y ArqueoLinea ni los enums EstadoTurno y MonedaEgreso.

### REQ-S08-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La tabla Pago no deberá tener la columna turnoId ni relación con Turno.

### REQ-S08-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-006
- texto: El enum ModuloPermiso no deberá contener el valor CAJA.

### REQ-S08-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Los casos de uso AbrirTurno, CerrarTurno, ObtenerResumenTurno, ObtenerUltimoCierrePorSucursal, RegistrarEgreso y ObtenerReporteCaja no deberán existir.

### REQ-S08-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Las entidades, los puertos y los repositorios de Turno, Egreso y ArqueoLinea, y el método listarPorTurno de IPagoRepository, no deberán existir.

### REQ-S08-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Ningún caso de uso, ruta ni acción de cobro, de venta o de inscripción deberá consultar un turno ni lanzar SinTurnoAbiertoError.

### REQ-S08-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Las páginas de miembros y de nuevo miembro deberán permitir inscribir y cobrar sin exigir que el usuario tenga la caja abierta.

### REQ-S08-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La ruta de inicio de sesión no deberá consultar turnos ni devolver cajaAbiertaPor.

### REQ-S08-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: La carpeta caja del panel deberá pasar a cobros con la ruta /cobros y la entrada de menú «Cobros».

### REQ-S08-010
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: Los archivos FormularioAbrirTurno, FormularioArqueo, ModalRegistrarEgreso, BotonRegistrarEgreso, AvisoCajaAjena, AvisoCajaCerrada, obtenerSucursalesVisiblesParaTurno y obtenerTurnoAbiertoParaUsuario no deberán existir.

### REQ-S08-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /cobros deberá ofrecer elegir un miembro y las acciones de cobrar la membresía, cambiar el plan y vender un producto, sin pedir abrir caja.

### REQ-S08-012
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: El asistente de cobro de /cobros deberá reutilizar el formulario de cobro de S-04 y el formulario de cambio de plan de S-07, sin calcular importes ni vencimientos por su cuenta.

### REQ-S08-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /cobros deberá listar los cobros del día de hoy de Lima con hora, miembro, concepto, método, monto y usuario que lo registró.

### REQ-S08-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /cobros deberá mostrar los totales del día de hoy por método de pago y por usuario.

### REQ-S08-015
- tipo: cuando
- prioridad: MUST
- origen: ADR-018
- texto: Cuando el socio anula un cobro desde /cobros con un motivo, la acción deberá llamar a anularPago de S-04.

### REQ-S08-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La función obtenerReporteCobros deberá devolver, para cada día de Lima del rango con cobros, la lista de cobros, el total por método, el total por usuario y el total del día.

### REQ-S08-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-002
- texto: El día de un cobro en el reporte deberá ser el día de Lima de su fecha de pago.

### REQ-S08-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-003
- texto: Los cobros anulados no deberán sumar a ningún total del reporte ni de /cobros.

### REQ-S08-019
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-002
- texto: El reporte deberá marcar «fecha pasada» los cobros cuya fecha de pago es anterior al día de Lima de su registro.

### REQ-S08-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Los totales del reporte deberán calcularse con dinero.ts y los días con fechaLima, sin number para el dinero.

### REQ-S08-021
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-004
- texto: El reporte deberá incluir los pagos de membresía, de cambio de plan y de producto con su concepto.

### REQ-S08-022
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S08-005
- texto: Si el rango pedido al reporte supera los 366 días o su fecha inicial es posterior a la final entonces obtenerReporteCobros deberá rechazarlo con un error de rango.

### REQ-S08-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /pagos deberá mostrar el historial con el filtro de fechas desde y hasta, con valor por defecto hoy, y el reporte de obtenerReporteCobros.

### REQ-S08-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: El filtro de fechas del historial deberá ofrecer los días con cobros calculados desde los pagos.

### REQ-S08-025
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S08-006
- texto: Si el usuario no tiene el permiso PAGOS VER entonces /cobros, /pagos y obtenerReporteCobros deberán rechazar el acceso sin leer pagos.

### REQ-S08-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Las pantallas y las acciones de producto de /cobros deberán funcionar sin turno y registrar el pago en la sede única.

### REQ-S08-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: El menú y la navegación móvil no deberán ofrecer Caja, Turno, Arqueo ni Egresos.

### REQ-S08-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next, generated y las exenciones cerradas de la familia S-11, no deberán contener los términos ITurnoRepository, PrismaTurnoRepository, AbrirTurno, CerrarTurno, ObtenerResumenTurno, ObtenerUltimoCierre, RegistrarEgreso, Egreso, Arqueo, turnoId, SinTurnoAbiertoError, obtenerTurnoAbiertoParaUsuario, fondoInicial, cajaAbiertaPor, EstadoTurno, MonedaEgreso, listarPorTurno ni ObtenerReporteCaja.

### REQ-S08-029
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-caja.mjs encuentra alguno de los términos de REQ-S08-028 fuera de las exenciones o por encima del tope de una exención, deberá terminar con código distinto de cero y nombrar archivo y línea.

### REQ-S08-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-caja.mjs en cada pull request.

### REQ-S08-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las listas de exenciones de verificar-dinero, verificar-fechas, verificar-pagos y verificar-plan no deberán contener archivos de la familia S-08 al terminar la spec.


### REQ-S08-032
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: La ruta /caja deberá responder 404.

### REQ-S08-033
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-003
- texto: Los cobros anulados deberán listarse marcados como anulados con su motivo y su autor en /cobros y en el reporte.
## 2. Comportamiento

### BEH-S08-001
- cubre: REQ-S08-001, REQ-S08-002, REQ-S08-003
- categoria: feliz
- dado: el esquema final
- cuando: se consultan las tablas, los enums, las columnas de Pago y los valores de ModuloPermiso
- entonces: no existen Turno, Egreso, ArqueoLinea, EstadoTurno ni MonedaEgreso, Pago no tiene turnoId y ModuloPermiso no tiene CAJA

### BEH-S08-002
- cubre: REQ-S08-004, REQ-S08-005
- categoria: feliz
- dado: el código final
- cuando: se buscan los seis casos de uso, las entidades, los puertos, los repositorios y listarPorTurno
- entonces: no existe ninguno

### BEH-S08-003
- cubre: REQ-S08-006, REQ-S08-007, REQ-S08-008
- categoria: feliz
- dado: un socio recién autenticado, sin haber abierto nada
- cuando: abre /miembros y /miembros/nuevo, inscribe un miembro, cobra su membresía, cambia su plan y vende un producto, e inicia sesión
- entonces: ninguna pantalla pide abrir la caja, ninguna operación lanza un error de turno, el cobro queda registrado y la respuesta del inicio de sesión no trae cajaAbiertaPor

### BEH-S08-004
- cubre: REQ-S08-009, REQ-S08-010, REQ-S08-027, REQ-S08-032
- categoria: feliz
- dado: el panel con un socio
- cuando: abre el menú, la navegación móvil, /caja y /cobros
- entonces: el menú dice «Cobros» y no ofrece Caja, Turno, Arqueo ni Egresos, /caja responde 404, /cobros carga y los ocho archivos retirados no existen

### BEH-S08-005
- cubre: REQ-S08-011, REQ-S08-012
- categoria: feliz
- dado: /cobros con un miembro elegido
- cuando: el socio elige cobrar la membresía y luego cambiar el plan
- entonces: se abre el formulario de cobro de S-04 y luego el de cambio de plan de S-07, ambos sin pedir abrir caja y sin cálculo propio del asistente

### BEH-S08-006
- cubre: REQ-S08-013, REQ-S08-014
- categoria: feliz
- dado: hoy tres cobros: 120.00 en Yape por Ana, 200.00 en efectivo por Ana y 280.00 en transferencia por Luis
- cuando: se abre /cobros
- entonces: la lista trae los tres con hora, miembro, concepto, método, monto y usuario, y los totales son Yape 120.00, Efectivo 200.00, Transferencia 280.00, usuario Ana 320.00, usuario Luis 280.00 y total 600.00

### BEH-S08-007
- cubre: REQ-S08-015, REQ-S08-018, REQ-S08-033
- categoria: feliz
- dado: los tres cobros de BEH-S08-006
- cuando: el socio anula el de Luis con el motivo «error de método»
- entonces: el cobro queda marcado como anulado con su motivo y su autor, el total del día baja a 320.00 y el total de Luis a 0.00

### BEH-S08-008
- cubre: REQ-S08-016
- categoria: feliz
- dado: cobros el 2026-11-10 (100.00 y 50.00), el 2026-11-11 (ninguno) y el 2026-11-12 (80.00)
- cuando: se pide el reporte del 2026-11-10 al 2026-11-12
- entonces: devuelve dos días, el 10 con total 150.00 y el 12 con total 80.00, cada uno con su lista, su total por método y su total por usuario, y no incluye el día 11

### BEH-S08-009
- cubre: REQ-S08-017
- categoria: borde
- dado: un cobro con fecha de pago 2026-11-12 23:50 de Lima (2026-11-13 04:50 UTC) y otro con 2026-11-13 00:10 de Lima
- cuando: se pide el reporte del 2026-11-12 al 2026-11-13
- entonces: el primero cae en el día 12 y el segundo en el día 13, con el servidor en UTC, en America/Lima y en Asia/Tokyo

### BEH-S08-010
- cubre: REQ-S08-019
- categoria: borde
- dado: un cobro registrado el 2026-11-12 con fecha de pago 2026-11-05
- cuando: se pide el reporte del 2026-11-05 al 2026-11-12
- entonces: el cobro aparece en el día 5 marcado «fecha pasada» y no aparece en el día 12

### BEH-S08-011
- cubre: REQ-S08-020, REQ-S08-021
- categoria: feliz
- dado: un pago de membresía de 120.00, uno de cambio de plan de 11.11 y uno de producto de 3.50 el mismo día
- cuando: se pide el reporte del día
- entonces: el total del día es 134.61, cada pago trae su concepto y el cálculo no usa number ni Math.round para los importes

### BEH-S08-012
- cubre: REQ-S08-022
- categoria: error
- dado: un rango de 367 días y un rango con la fecha inicial posterior a la final
- cuando: se pide el reporte
- entonces: ambos se rechazan con el error de rango y no se leen pagos

### BEH-S08-013
- cubre: REQ-S08-023, REQ-S08-024
- categoria: feliz
- dado: pagos en los días 10 y 12 de noviembre
- cuando: se abre /pagos sin parámetros y luego con desde 2026-11-10 y hasta 2026-11-12
- entonces: el primero muestra hoy y el segundo el reporte de ambos días, y el filtro ofrece solo los días 10 y 12 como días con cobros

### BEH-S08-014
- cubre: REQ-S08-025
- categoria: error
- dado: un usuario sin el permiso PAGOS VER
- cuando: abre /cobros y /pagos y llama a obtenerReporteCobros
- entonces: las tres se rechazan sin leer pagos

### BEH-S08-015
- cubre: REQ-S08-026
- categoria: feliz
- dado: un socio sin ningún turno y un producto con precio 3.50
- cuando: vende el producto desde /cobros
- entonces: la venta se registra como pago en la sede única, sin turno, y aparece en los cobros de hoy

### BEH-S08-016
- cubre: REQ-S08-028, REQ-S08-029
- categoria: error
- dado: archivos de prueba con cada uno de los diecisiete términos de REQ-S08-028 y un archivo exento que supera su tope; y un archivo con siguienteTurno
- cuando: se ejecuta tools/verificar-caja.mjs
- entonces: falla y nombra archivo y línea de los diecisiete términos y del archivo que supera su tope, y no marca siguienteTurno

### BEH-S08-017
- cubre: REQ-S08-030
- categoria: error
- dado: un pull request que agrega turnoId en un archivo no exento
- cuando: corre el CI
- entonces: el paso de tools/verificar-caja.mjs falla y queda en rojo

### BEH-S08-018
- cubre: REQ-S08-031
- categoria: feliz
- dado: las listas de exenciones de verificar-dinero, verificar-fechas, verificar-pagos y verificar-plan
- cuando: se ejecutan sus pruebas de lista
- entonces: ninguna entrada nombra un archivo de Turno*, Arqueo*, Egreso*, ObtenerReporteCaja*, ObtenerResumenTurno* ni de la carpeta caja

### BEH-S08-019
- cubre: REQ-S08-016, REQ-S08-018
- categoria: concurrencia
- dado: un reporte del día de hoy y, a la vez, el registro de un cobro nuevo y la anulación de otro
- cuando: terminan las tres operaciones
- entonces: el reporte devuelve un estado consistente de una sola lectura (con los totales iguales a la suma de sus filas listadas y sin contar anulados) y una lectura posterior incluye el cobro nuevo y excluye el anulado

## 3. Invariantes

### INV-S08-001
- propiedad: en todo reporte, el total del día es la suma de los totales por método y también la suma de los totales por usuario, y ninguno cuenta cobros anulados
- mecanismo: test-propiedad
- deteccion: 200 conjuntos de cobros generados con semilla fija (con anulados, fechas pasadas y varios usuarios y métodos); para cada día el total debe ser igual a la suma por método, igual a la suma por usuario e igual a la suma de los cobros no anulados de su lista
- protege: REQ-S08-016, REQ-S08-018, REQ-S08-020

### INV-S08-002
- propiedad: ningún cobro depende de un turno: el esquema no tiene turnos y registrar un cobro no necesita estado previo
- mecanismo: restriccion-bd
- deteccion: el esquema no contiene Pago.turnoId ni la tabla Turno, y un cobro se inserta en una base sin otras filas que el miembro y el plan
- protege: REQ-S08-001, REQ-S08-002, REQ-S08-006

### INV-S08-003
- propiedad: el reporte agrupa cada cobro en el día de Lima de su fecha de pago, igual con cualquier zona horaria del proceso
- mecanismo: test-propiedad
- deteccion: 200 instantes generados con semilla fija alrededor de las 00:00 y las 23:59 de Lima, probados con TZ=UTC, America/Lima y Asia/Tokyo; el día asignado debe ser igual a diaLima del instante
- protege: REQ-S08-017

### INV-S08-004
- propiedad: los términos de turno, arqueo y egreso no aparecen en apps ni packages fuera de las exenciones cerradas
- mecanismo: lint
- deteccion: tools/verificar-caja.mjs termina con código distinto de cero y lista archivo:línea de cada coincidencia fuera de las exenciones
- protege: REQ-S08-028, REQ-S08-029

## 4. Criterios de aceptación

### AC-S08-001
- enlaza: REQ-S08-001, REQ-S08-002, REQ-S08-003, REQ-S08-004, REQ-S08-005, BEH-S08-001, BEH-S08-002, INV-S08-002
- metodo: sql
- procedimiento: consultar el esquema final por las tablas, los enums, las columnas de Pago y los valores de ModuloPermiso; buscar con la API de typescript los seis casos de uso, las entidades, los puertos, los repositorios y listarPorTurno; e insertar un pago en una base con solo un miembro y un plan
- esperado: nada de eso existe y el pago se inserta sin otro estado previo
- test: pendiente

### AC-S08-002
- enlaza: REQ-S08-006, REQ-S08-007, REQ-S08-008, BEH-S08-003
- metodo: integracion
- procedimiento: con una base efímera y un socio recién autenticado, inscribir un miembro, cobrar su membresía, cambiar su plan y vender un producto llamando a las acciones y rutas, e iniciar sesión
- esperado: todo se registra, ninguna operación lanza un error de turno y la respuesta del inicio de sesión no trae cajaAbiertaPor
- test: pendiente

### AC-S08-003
- enlaza: REQ-S08-009, REQ-S08-010, REQ-S08-027, REQ-S08-032, BEH-S08-004
- metodo: e2e
- procedimiento: como socio, abrir el menú y la navegación móvil, pedir /caja y abrir /cobros; buscar los ocho archivos retirados
- esperado: el menú dice «Cobros» y no ofrece Caja, Turno, Arqueo ni Egresos, /caja responde 404, /cobros carga y los archivos no existen
- test: pendiente

### AC-S08-004
- enlaza: REQ-S08-011, REQ-S08-012, REQ-S08-013, REQ-S08-014, REQ-S08-015, REQ-S08-033, REQ-S08-026, BEH-S08-005, BEH-S08-006, BEH-S08-007, BEH-S08-015
- metodo: manual
- procedimiento: como socio, abrir /cobros, elegir un miembro y abrir el cobro de membresía y el cambio de plan, registrar los tres cobros de BEH-S08-006, anular el de Luis con un motivo y vender un producto de 3.50
- esperado: los formularios son los de S-04 y S-07, la lista y los totales coinciden con los de los comportamientos antes y después de anular, y la venta aparece en los cobros de hoy sin turno
- test: pendiente

### AC-S08-005
- enlaza: REQ-S08-016, REQ-S08-017, REQ-S08-018, REQ-S08-019, REQ-S08-020, REQ-S08-021, REQ-S08-022, BEH-S08-008, BEH-S08-009, BEH-S08-010, BEH-S08-011, BEH-S08-012, BEH-S08-019, INV-S08-001, INV-S08-003
- metodo: integracion
- procedimiento: ejecutar obtenerReporteCobros contra una base efímera con los datos de esos comportamientos, con TZ=UTC, America/Lima y Asia/Tokyo; con rangos de 367 días y con fechas invertidas; con 200 conjuntos generados con semilla fija; y con una lectura simultánea a un registro y una anulación
- esperado: los días, totales, marcas y errores coinciden con los de los comportamientos en las tres zonas, las propiedades se cumplen en los 200 conjuntos y la lectura simultánea es consistente
- test: pendiente

### AC-S08-006
- enlaza: REQ-S08-023, REQ-S08-024, REQ-S08-025, BEH-S08-013, BEH-S08-014
- metodo: integracion
- procedimiento: pedir /pagos sin parámetros y con desde y hasta con pagos en los días 10 y 12, pedir los días con cobros, y repetir /cobros, /pagos y el reporte con un usuario sin PAGOS VER contando las lecturas de pagos
- esperado: el historial muestra hoy y luego los dos días, el filtro ofrece los días 10 y 12, y sin permiso se rechazan las tres sin leer pagos
- test: pendiente

### AC-S08-007
- enlaza: REQ-S08-028, REQ-S08-029, BEH-S08-016, INV-S08-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-caja.mjs con un árbol por cada uno de los diecisiete términos, otro con una exención que supera su tope, otro con siguienteTurno y otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los diecisiete términos y con la exención excedida nombrando archivo y línea, no marca siguienteTurno, pasa con el limpio y en el árbol final solo aparecen archivos exentos dentro de su tope
- test: pendiente

### AC-S08-008
- enlaza: REQ-S08-030, BEH-S08-017
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue turnoId en un archivo no exento y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-caja.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S08-009
- enlaza: REQ-S08-031, BEH-S08-018
- metodo: unitario
- procedimiento: ejecutar las pruebas de las listas de exenciones de verificar-dinero, verificar-fechas, verificar-pagos y verificar-plan
- esperado: ninguna entrada nombra un archivo de la familia S-08
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de la lista de pagos y de los totales del historial actual (`obtenerReporteCaja`) y de las acciones de producto, en las partes que se conservan; (2) pruebas de `obtenerReporteCobros` y de `obtenerDiasConActividad` basadas en pagos, con los casos de BEH-S08-008 a BEH-S08-012 y las propiedades de INV-S08-001 e INV-S08-003, y su implementación junto al reporte viejo; (3) quitar el turno de los casos de uso que aún lo consultan (`VenderProducto`, `CobrarDeudasMiembro` y los residuos de `RegistrarPago` y `CambiarPlan`) y de `miembros/page.tsx`, `miembros/nuevo/page.tsx`, `miembros/actions.ts`, `pagos/actions.ts`, `api/pagos/route.ts` y la ruta de inicio de sesión; (4) mover `caja/` a `cobros/`, con el menú y los enlaces, y reducir `page.tsx` al selector, las acciones de cobro, los cobros de hoy y los totales de hoy; (5) rehacer `/pagos` con el reporte nuevo; (6) retirar los casos de uso, entidades, puertos, repositorios, acciones y pantallas de turno, arqueo y egreso, y quitar `CAJA` de `ModuloPermiso` y de las pantallas de permisos, retirando cada archivo de las listas de exenciones en el mismo commit; (7) esquema: retirar `Turno`, `Egreso`, `ArqueoLinea`, sus enums y `Pago.turnoId`; (8) `tools/verificar-caja.mjs` con `tools/verificar-caja.exenciones.json` y el CI.
- Las pruebas del reporte usan semillas fijas, una base efímera y los husos `TZ=UTC`, `America/Lima` y `Asia/Tokyo`; no hay dependencias nuevas.
- El criterio AC-S08-003 y AC-S08-004 son pasos del propietario o e2e manual (el repositorio no tiene un ejecutor de navegador); AC-S08-008 es manual.

### 5.2 Migración
- No hay datos que migrar (SUP-S08-009): el baseline se genera en S-15.
- **Enmiendas que se registran al aprobar S-08:**
  - S-02, S-03, S-04, S-07: la familia S-08 sale de sus listas de exenciones al terminar S-08 (REQ-S02-020, REQ-S03-030, REQ-S04-045 y REQ-S07-060).
  - S-04: 0.3 y los riesgos que remiten a S-08 se leen con esta spec; los tres archivos de `caja/` que adaptan S-04 y S-07 pasan a `cobros/`.
  - S-05: `Turno.sucursalId` desaparece con la tabla; REQ-S05-008 y SUP-S05-002 dejan de nombrarlo.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 restan dos enums (`EstadoTurno` y `MonedaEgreso`) y las tablas `Turno`, `Egreso` y `ArqueoLinea` (tres tablas menos); REQ-S22-007 y AC-S22-003 restan los repositorios de turno, egreso y arqueo.
  - S-01: la tabla de permisos de 5.1 pierde `CAJA`.
  - `docs/06-modelo-datos-cambios.md`, `docs/00-indice.md` y `COBERTURA-RF.md`: nota de que S-08 quedó como registro continuo de cobros.
- **Traspasos:** S-11 (ventas sin fiado, `ModalVenderProducto`, `ModalCobrarDeudas` y las acciones de producto), S-14 (reportes de morosos e histórico imprimible), S-12 (tickets), S-23 (permisos y rol único) y S-10 (tasa y `Pago.montoBs`).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Sin arqueo se pierde la conciliación del efectivo físico (ADR-018): un descuadre solo se detecta comparando el reporte con el dinero real fuera del sistema. Mitigación: el reporte por día, método y usuario, la marca «fecha pasada» y la anulación con motivo y autor.
- Cualquier usuario autenticado puede registrar un cobro en cualquier momento; con un solo rol (S-23) la trazabilidad depende del usuario que inicia sesión.
- 50 archivos cambian, entre ellos `caja/` (25 archivos y 4 836 líneas) que se mueve; el riesgo es una importación que siga apuntando a `caja/`. Mitigación: el typecheck y la herramienta de términos.
- Los componentes de producto y de deudas se mueven sin reescribirse y siguen con el código de fiado hasta S-11; si S-11 se pospone queda código de deudas funcionando sin turno.
- Un cobro con fecha de pago pasada aparece en un día ya cerrado en la práctica del negocio; la marca «fecha pasada» lo hace visible pero no impide que cambien los totales de ese día.
- Las cifras de 0.4 cambian cuando S-00 a S-07 modifiquen el árbol. Mitigación: se recuentan al empezar.
- Se pierde el listado de egresos del heredado; si el propietario necesita registrar gastos más adelante habrá que especificarlo (ADR-018).

### 5.4 Preguntas abiertas
- ¿El reporte diario por método y usuario es suficiente como control sin arqueo? Default: sí (SUP-S08-001, ADR-018).
- ¿El reporte agrupa los cobros por fecha de pago, marcando los de fecha pasada? Default: sí (SUP-S08-002).
- ¿La página se llama «Cobros» y la ruta es /cobros? Default: sí (SUP-S08-007).
- ¿El historial de /pagos admite hasta 366 días? Default: sí (SUP-S08-005).
