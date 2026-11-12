---
id: S-08
estado: en-revision
adrs: ADR-002, ADR-010, ADR-011, ADR-016, ADR-018, ADR-019, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-22
aprobada_por:
fecha_aprobacion:
---
# S-08 — Registro continuo de cobros: sin turnos, arqueo ni egresos, con reporte diario por método y usuario

## 0. Contexto y alcance

### 0.1 Problema
El código heredado organiza el dinero en torno a la caja con turnos: hay que abrir un turno con un fondo inicial para inscribir a un miembro o cobrar, un solo usuario "tiene" la caja, el cierre compara lo esperado con lo contado (arqueo) y se registran egresos. El propietario decidió que no hay turnos ni arqueo, que no hay egresos, fiado ni deudas (el 2026-11-12 lo reiteró: «no existe ni el fiado ni las deudas») y que el sistema solo captura la recepción de pagos de membresías, incluidas las de miembros vencidos, y de productos con cobro inmediato; Efectivo sigue siendo un método de pago permitido (ADR-018, aceptado; S-03). S-08 quita esa maquinaria y deja un registro continuo de cobros: cada cobro guarda quién, cuándo, método y monto, se puede anular con motivo (S-04) y hay un reporte diario por método y por usuario, que sustituye al arqueo como control.

### 0.2 Dentro de alcance
- Eliminación de `Turno`, `Egreso`, `ArqueoLinea`, de los enums `EstadoTurno` y `MonedaEgreso`, de `Pago.turnoId` y del valor `CAJA` de `ModuloPermiso`.
- Eliminación de los casos de uso `AbrirTurno`, `CerrarTurno`, `ObtenerResumenTurno`, `ObtenerUltimoCierrePorSucursal`, `RegistrarEgreso` y `ObtenerReporteCaja`, de sus entidades, puertos y repositorios, de `SinTurnoAbiertoError` (definido en `VenderProducto.ts:28` y reexportado en `CobrarDeudasMiembro.ts:12`) y de la ruta `api/caja/ultimo-cierre`, que S-01 deja a esta spec.
- Eliminación del fiado y de las deudas: la tabla `DeudaProducto`, el enum `EstadoDeuda`, los casos de uso `FiarProducto`, `CobrarDeudasMiembro`, `CobrarDeudasSeleccionadas`, `AnularDeuda`, `ListarDeudasPendientes` y `RegistrarPagoConDeudas` (que S-04 ya retira de `registrarPago`), su entidad, puerto y repositorio, las acciones `fiarProductoAction`, `cobrarDeudasAction` y `anularDeudaAction`, y los componentes `BotonCobrarDeudas`, `ModalCobrarDeudas` y `ModalDetalleDeuda`.
- Reemplazo del permiso `CAJA` por `PAGOS` en `VenderProducto`, en el alta de usuarios y en las pantallas de permisos.
- Que Efectivo se ofrezca como método de pago en el cobro de membresía, el cambio de plan y la venta de producto, y que el cobro de la membresía de un miembro vencido se pueda hacer desde `/cobros`.
- Que inscribir un miembro, cobrar, cambiar de plan y vender un producto nunca consulten un turno: `miembros/page.tsx`, `miembros/nuevo/page.tsx`, `miembros/actions.ts`, `pagos/actions.ts`, `api/pagos/route.ts`, el inicio de sesión y los casos de uso de cobro que aún lo hagan.
- La carpeta `caja/` pasa a `cobros/` (ruta `/cobros`, menú «Cobros») en un solo cambio con todos los enlaces, `revalidatePath` e importaciones que la nombran (`pagos/`, `miembros/`, `en-sala/`): selector de miembro, asistente de cobro de membresía (S-04), cambio de plan (S-07), entrada a la venta de productos (S-11), cobros de hoy con anulación y totales de hoy, y enlace a `/pagos`. Las acciones de producto y deuda pasan a `cobros/productosActions.ts` (familia S-11) y los demás archivos que quedan en `cobros/` se convierten a `dinero.ts` y `fechaLima`.
- Reporte de cobros: caso de uso `obtenerReporteCobros` con un puerto de lectura de una sola consulta, y la página de historial `/pagos` (hoy sin control de permiso), con totales por día, por método y por usuario, concepto de cada cobro, cobros anulados marcados y cobros con fecha pasada marcados.
- `obtenerDiasConActividad` basado en los pagos y en `fechaLima` (hoy usa SQL con la zona de Caracas).
- `tools/verificar-caja.mjs` con su paso en el CI; retiro de los archivos de la familia S-08 de las exenciones de S-02, S-03 y S-04 y de la de S-07.

### 0.3 Fuera de alcance
- El catálogo de productos y sus ventas con cobro inmediato (precios, permisos propios, pantallas de productos): S-11. S-08 solo quita el turno y reemplaza el permiso en `VenderProducto` y deja `ModalVenderProducto` y la acción de venta dentro de `cobros/`; el fiado y las deudas ya no existen desde S-08.
- Tickets y comprobantes: S-12. Frontera con S-14: S-08 entrega `/pagos` con el reporte diario por método y usuario; S-14 lo amplía con morosos, por vencer, ingresos por período e histórico imprimible (S-08 conserva el botón de imprimir que ya existe).
- Cobros y anulaciones de membresía: S-04. Cambio de plan: S-07. Métodos de pago: S-03.
- Un control de efectivo contado frente a esperado: no existe (ADR-018); el control es el reporte diario por método y usuario.
- Permisos por módulo y rol único: S-23 (S-08 solo retira el valor `CAJA`).
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
- **Interacción con specs aprobadas:** S-04 quitó el turno de `registrarPago` y `anularPago` (REQ-S04-024) y dejó a S-08 la reconstrucción de `caja/`; S-07 lista tres archivos de `caja/` que adapta (`ModalRegistrarPagoCaja.tsx`, `SelectorMiembroModal.tsx` y `page.tsx`) y deja a S-08 las exenciones de la familia S-08 en `caja/` (REQ-S07-057); S-03 reservó la familia S-08 (`Turno*`, `Arqueo*`, `Egreso*`, `ObtenerReporteCaja*`, `ObtenerResumenTurno*` y la carpeta `caja/`) como exenta de `verificar-dinero`; S-01 deja la retirada de `caja/ultimo-cierre` a las specs de ADR-018 (S-01 §0.3) y protege la ruta con `exigirPermiso(CAJA, VER)` en su tabla de permisos (REQ-S01-029); S-05 deja `Turno.sucursalId` hasta S-08; `Pago.creadoEn` lo agrega S-07 (REQ-S07-038) (verificado con `grep -n` en las specs).
- **Permiso `CAJA` fuera de los casos de uso de turno:** `VenderProducto.ts:55`, `CobrarDeudasMiembro.ts:65`, `FiarProducto.ts:51`, `CrearUsuarioAdmin.ts:42,51,67-68`, `usuarios/actions.ts:55` y `usuarios/FormularioPermisos.tsx:10` (verificado con `grep -n '"CAJA"'`).
- **Enlaces y rutas a `/caja`:** `miembros/FormularioMiembro.tsx:440` y `en-sala/ListaEnSala.tsx:106` (`/caja?cobrar=<miembro>`), `caja/BotonRegistrarPagoCaja.tsx:66`, `pagos/actions.ts:239,374` y ocho `revalidatePath("/caja")` en `caja/actions.ts`; `pagos/FormularioPago.tsx:13` importa `../caja/SelectorMiembroModal` y `login/page.tsx:11-12,191` pinta `cajaAbiertaPor` (verificado con `grep -n`).
- **Datos del reporte:** `conceptoPago.ts:5-10` solo distingue producto de miembro y `Pago` no tiene un campo que separe la membresía del cambio de plan (solo `CambioPlanAuditoria.pagoId`, S-07); `listarPorOrganizacionYRango` (`PrismaPagoRepository.ts:116-120`) devuelve pagos sin nombre de usuario ni de miembro; `listarFechasConTurno` usa SQL con `America/Caracas` (`PrismaTurnoRepository.ts:94-112`); `/pagos` (`pagos/page.tsx:56-58`) y `/caja` solo comprueban la sesión, no un permiso, y la lista actual excluye los anulados (`pagos/page.tsx:81`) (verificado con `Read`).
- **Otros usos:** comentarios con «Arqueo», «Egreso» u `ObtenerResumenTurno` en `tasaBcvFija.ts:23`, `configuraciones/metodosPagoUI.ts:27,31` y `pagos/SelectorMetodoPago.tsx:439,484`; `ObtenerResumenTurno` exporta `METODO_EFECTIVO_BS`, que usa `caja/page.tsx:9`; solo `pagos/page.tsx:8,68` usa `obtenerReporteCaja` (verificado con `grep -n`).
- **Fiado y deudas:** `DeudaProducto` aparece en 22 archivos, `FiarProducto` en 5, `CobrarDeudasMiembro` en 7, `ListarDeudas` en 7, `anularDeuda` en 4, `ModalCobrarDeudas` en 2, `BotonCobrarDeudas` en 2, `ModalDetalleDeuda` en 2, `RegistrarPagoConDeudas` en 4 y `EstadoDeuda` en 2; los casos de uso están en `packages/domain/use-cases` (`AnularDeuda`, `CobrarDeudasMiembro`, `CobrarDeudasSeleccionadas`, `FiarProducto`, `ListarDeudasPendientes`, `RegistrarPagoConDeudas`) y los componentes en `caja/` (verificado con `ls` y `grep -rIlF`).
- **Efectivo:** S-03 conformó los métodos Yape, transferencias al BCP y Efectivo (SUP-S03-005), no exige número de operación para el efectivo y mantiene `esEfectivo` solo para los reportes (S-03 5.1; ADR-006 punto 2) (verificado con `grep -n` en `S-03` y `ADR-006`).
- No verificado: el contenido de `caja/ModalRegistrarPagoCaja.tsx` más allá de lo que citan S-04 y S-07, y las 4 836 líneas de `caja/` contadas con `wc -l` sin revisar archivo por archivo.

### 0.5 Supuestos
- SUP-S08-001: sin turnos, el control del dinero es el reporte diario por método y usuario más la anulación con motivo y autor; no hay efectivo esperado ni contado. Default: ese control; decisión del propietario (ADR-018); asumido, por validar su suficiencia.
- SUP-S08-002: el reporte agrupa por el día de Lima de la fecha de pago (`Pago.fechaPago`), no por el de registro; los cobros registrados hoy con una fecha anterior aparecen en el día de su fecha de pago y se marcan «fecha pasada» para que el control los encuentre. Default: ese criterio; asumido, por validar.
- SUP-S08-003: los cobros anulados no suman a ningún total y se listan marcados con su motivo y autor. Default: ese criterio; asumido, por validar.
- SUP-S08-004: el reporte incluye todos los pagos (membresía, cambio de plan y producto) con su concepto y no distingue la sede, que es una sola. Default: todos los pagos; asumido, por validar.
- SUP-S08-005: el rango del historial es de hasta 366 días y el valor por defecto es hoy; para un rango mayor se pide acotar. Default: ese límite; asumido, por validar.
- SUP-S08-006: el valor `CAJA` de `ModuloPermiso` se retira y el acceso a `/cobros` y al historial exige `PAGOS VER`; cobrar exige `PAGOS CREAR` y anular `PAGOS ELIMINAR` (S-04). Default: ese reparto hasta S-23; asumido, por validar.
- SUP-S08-007: la carpeta `caja/` se mueve a `cobros/` conservando los componentes del asistente de cobro de S-04 y S-07 y los de producto de S-11; solo se quita lo que depende del turno. Default: mover y recortar, sin reescribir el asistente; asumido, por validar.
- SUP-S08-008: la sede única no necesita selector en `/cobros`; los pagos se registran en la sede de `obtenerSedeUnica` (S-05). Default: ese criterio; asumido, por validar.
- SUP-S08-009: los pagos históricos con `turnoId` no existen porque el baseline se genera nuevo (S-00, S-15). Default: sin migración; asumido, por validar.
- SUP-S08-010: el concepto de un cobro es el nombre del producto (con la cantidad si es mayor que 1) para las ventas, «Cambio de plan» si existe un registro de `CambioPlanAuditoria` con su `pagoId` (S-07) y «Membresía» en los demás casos. Default: esa definición; asumido, por validar.
- SUP-S08-011: el reporte se arma con una sola consulta del repositorio por rango, con los nombres del usuario y del miembro, y todo se agrega en memoria; no se pagina porque el rango máximo es 366 días de un solo local. Default: sin paginar; asumido, por validar.
- SUP-S08-012: un día aparece en el reporte si tiene al menos un cobro, aunque todos estén anulados (con total 0.00), y un método o usuario aparece en los totales de un día solo si tiene al menos un cobro no anulado. Default: ese criterio; asumido, por validar.
- SUP-S08-013: el rango máximo de 366 días cuenta ambos extremos (el 2026-01-01 al 2027-01-01 es válido). Default: inclusivo; asumido, por validar.
- SUP-S08-014: no se mantienen las pruebas del reporte viejo (`obtenerReporteCaja`) porque prueban un comportamiento que se elimina por decisión del propietario (ADR-018); se reemplazan por las del reporte nuevo en el mismo paso. Default: reemplazarlas; asumido, por validar.
- SUP-S08-015: tras mover `caja/` a `cobros/` no queda ninguna exención de la familia S-08; los archivos de producto y deuda son de la familia S-11 y los demás se convierten a `dinero.ts` y `fechaLima` en S-08. Default: ese reparto; asumido, por validar.
- SUP-S08-017: el fiado y las deudas se eliminan en S-08 y no en S-11, porque el propietario dijo el 2026-11-12 que no existen; S-11 conserva el catálogo de productos y su venta con cobro inmediato. Default: eliminarlos aquí; decisión confirmada por el propietario (ADR-018 §4); asumido, por validar el reparto con S-11.
- SUP-S08-018: la venta de productos se mantiene sin fiado, con cobro inmediato y con Efectivo, Yape o transferencia, por respuesta del propietario del 2026-11-12. Default: mantenerla; decisión confirmada por el propietario; asumido, por validar su alcance (catálogo y permisos en S-11).
- SUP-S08-019: «el cobro de membresías vencidas» es el cobro de la membresía de un miembro sin vencimiento vigente, que hace `registrarPago` (S-04) y que `/cobros` debe ofrecer sin ningún paso previo. Default: esa lectura; asumido, por validar.
- SUP-S08-016: la medianoche de Lima con la página abierta: `/cobros` calcula «hoy» al cargar y no se refresca sola. Default: ese comportamiento; asumido, por validar.

## 1. Requisitos

### REQ-S08-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: El esquema no deberá contener las tablas Turno, Egreso y ArqueoLinea.

### REQ-S08-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: El esquema no deberá contener los enums EstadoTurno y MonedaEgreso.

### REQ-S08-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La tabla Pago no deberá tener la columna turnoId ni relación con Turno.

### REQ-S08-004
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-006
- texto: El enum ModuloPermiso no deberá contener el valor CAJA.

### REQ-S08-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Los casos de uso AbrirTurno, CerrarTurno, ObtenerResumenTurno, ObtenerUltimoCierrePorSucursal, RegistrarEgreso y ObtenerReporteCaja no deberán existir.

### REQ-S08-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Las entidades, los puertos y los repositorios de Turno, Egreso y ArqueoLinea, y el método listarPorTurno de IPagoRepository, no deberán existir.

### REQ-S08-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La clase SinTurnoAbiertoError no deberá existir.

### REQ-S08-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Ningún caso de uso, ruta ni acción de cobro, de venta o de inscripción deberá consultar un turno.

### REQ-S08-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-006
- texto: El caso de uso VenderProducto deberá exigir el permiso PAGOS CREAR en lugar de CAJA CREAR.

### REQ-S08-010
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-006
- texto: El alta de usuarios y las pantallas de permisos no deberán ofrecer ni asignar el módulo CAJA.

### REQ-S08-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Las páginas de miembros y de nuevo miembro deberán permitir inscribir y cobrar sin exigir que el usuario tenga la caja abierta.

### REQ-S08-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La ruta de inicio de sesión no deberá consultar turnos ni devolver cajaAbiertaPor.

### REQ-S08-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página de inicio de sesión no deberá mostrar el estado de la caja.

### REQ-S08-014
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: La carpeta caja del panel deberá pasar a cobros con la ruta /cobros y la entrada de menú «Cobros».

### REQ-S08-015
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: La ruta /caja deberá responder 404.

### REQ-S08-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La ruta api/caja/ultimo-cierre no deberá existir.

### REQ-S08-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: Los archivos FormularioAbrirTurno, FormularioArqueo, ModalRegistrarEgreso, BotonRegistrarEgreso, AvisoCajaAjena, AvisoCajaCerrada, obtenerSucursalesVisiblesParaTurno y obtenerTurnoAbiertoParaUsuario no deberán existir.

### REQ-S08-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: Todo enlace, revalidatePath e importación que nombraba /caja o la carpeta caja deberá nombrar /cobros o la carpeta cobros.

### REQ-S08-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /cobros deberá ofrecer elegir un miembro y las acciones de cobrar la membresía, cambiar el plan y vender un producto, sin pedir abrir caja.

### REQ-S08-020
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: El asistente de cobro de /cobros deberá reutilizar el formulario de cobro de S-04 y el formulario de cambio de plan de S-07, sin calcular importes ni vencimientos por su cuenta.

### REQ-S08-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /cobros deberá listar los cobros del día de hoy de Lima con hora, miembro o producto, concepto, método, monto y usuario que lo registró.

### REQ-S08-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /cobros deberá mostrar el total de hoy por método de pago.

### REQ-S08-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /cobros deberá mostrar el total de hoy por usuario.

### REQ-S08-024
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando el socio anula un cobro desde /cobros con un motivo, el cobro deberá quedar anulado con ese motivo y con su autor según las reglas de S-04.

### REQ-S08-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /cobros deberá ofrecer un enlace al historial /pagos.

### REQ-S08-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La venta de productos desde /cobros deberá registrar el pago en la sede única sin turno.

### REQ-S08-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Los archivos de cobros que no son de la familia S-11 (VenderProducto y ModalVenderProducto) deberán usar dinero.ts y fechaLima.

### REQ-S08-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La función obtenerReporteCobros deberá devolver, para cada día de Lima del rango con al menos un cobro, la lista de sus cobros.

### REQ-S08-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La función obtenerReporteCobros deberá devolver para cada día el total del día.

### REQ-S08-030
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-012
- texto: La función obtenerReporteCobros deberá devolver para cada día el total por método de pago, solo de los métodos con al menos un cobro no anulado.

### REQ-S08-031
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-012
- texto: La función obtenerReporteCobros deberá devolver para cada día el total por usuario, solo de los usuarios con al menos un cobro no anulado.

### REQ-S08-032
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-002
- texto: El día de un cobro en el reporte deberá ser el día de Lima de su fecha de pago.

### REQ-S08-033
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-003
- texto: Los cobros anulados no deberán sumar a ningún total del reporte ni de /cobros.

### REQ-S08-034
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-003
- texto: Los cobros anulados deberán listarse marcados como anulados con su motivo y su autor en /cobros y en el reporte.

### REQ-S08-035
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-002
- texto: El reporte deberá marcar «fecha pasada» los cobros cuyo día de Lima de la fecha de pago es anterior al día de Lima de su campo creadoEn.

### REQ-S08-036
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-010
- texto: El concepto de cada cobro deberá ser el producto con su cantidad si es una venta, «Cambio de plan» si existe un registro de cambio de plan con su pagoId y «Membresía» en los demás casos.

### REQ-S08-037
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-011
- texto: La función obtenerReporteCobros deberá leer los cobros del rango con una sola consulta del repositorio que traiga el nombre del usuario y del miembro.

### REQ-S08-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Los totales del reporte deberán calcularse con dinero.ts y los días con fechaLima, sin number para el dinero.

### REQ-S08-039
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S08-013
- texto: Si el rango pedido al reporte supera los 366 días contando ambos extremos o su fecha inicial es posterior a la final entonces obtenerReporteCobros deberá rechazarlo con un error de rango sin leer pagos.

### REQ-S08-040
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La página /pagos deberá mostrar el historial con el filtro de fechas desde y hasta, con valor por defecto hoy, y el reporte de obtenerReporteCobros.

### REQ-S08-041
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La función obtenerDiasConActividad deberá devolver los días de Lima distintos de la fecha de pago de los cobros, calculados con fechaLima a partir de lo que entrega el repositorio de pagos.

### REQ-S08-042
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S08-006
- texto: Si el usuario no tiene el permiso PAGOS VER entonces /cobros, /pagos y obtenerReporteCobros deberán rechazar el acceso sin leer pagos.

### REQ-S08-043
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: El menú y la navegación móvil no deberán ofrecer Caja, Turno, Arqueo, Egresos ni Deudas.

### REQ-S08-044
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos ITurnoRepository, PrismaTurnoRepository, DrizzleTurnoRepository, AbrirTurno, CerrarTurno, ObtenerResumenTurno, ObtenerUltimoCierre, RegistrarEgreso, Egreso, Arqueo, turnoId, SinTurnoAbiertoError, obtenerTurnoAbiertoParaUsuario, fondoInicial, cajaAbiertaPor, EstadoTurno, MonedaEgreso, listarPorTurno, ObtenerReporteCaja, buscarAbiertoPorSucursal ni listarFechasConTurno.

### REQ-S08-045
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener la ruta /caja ni el valor CAJA de ModuloPermiso.

### REQ-S08-046
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-caja.mjs encuentra alguno de los términos de REQ-S08-044 o de REQ-S08-045, deberá terminar con código distinto de cero y nombrar el archivo, la línea y cada término encontrado.

### REQ-S08-047
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-caja.mjs en cada pull request.

### REQ-S08-048
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Las listas de exenciones de verificar-dinero, verificar-fechas, verificar-pagos y verificar-plan no deberán contener archivos de la familia S-08 al terminar la spec.


### REQ-S08-049
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-007
- texto: La ruta /cobros con el parámetro cobrar y el identificador de un miembro deberá abrir el cobro de ese miembro.

### REQ-S08-050
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-018
- texto: Los formularios de cobro de membresía, de cambio de plan y de venta de producto deberán ofrecer Efectivo entre los métodos de pago activos, sin pedir número de operación.

### REQ-S08-051
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-018
- texto: El total por método del reporte y de /cobros deberá mostrar el efectivo como un método más, sin monto esperado ni contado.

### REQ-S08-052
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-017
- texto: El esquema no deberá contener la tabla DeudaProducto ni el enum EstadoDeuda.

### REQ-S08-053
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-017
- texto: Los casos de uso FiarProducto, CobrarDeudasMiembro, CobrarDeudasSeleccionadas, AnularDeuda, ListarDeudasPendientes y RegistrarPagoConDeudas, y la entidad, el puerto y el repositorio de DeudaProducto, no deberán existir.

### REQ-S08-054
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-017
- texto: Las acciones fiarProductoAction, cobrarDeudasAction y anularDeudaAction y los componentes BotonCobrarDeudas, ModalCobrarDeudas y ModalDetalleDeuda no deberán existir.

### REQ-S08-055
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-017
- texto: La página /cobros y la venta de productos no deberán ofrecer fiar, registrar deudas ni cobrar deudas.

### REQ-S08-056
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S08-019
- texto: La página /cobros deberá ofrecer cobrar la membresía de un miembro sin vencimiento vigente sin ningún paso previo.

### REQ-S08-057
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos DeudaProducto, EstadoDeuda, FiarProducto, CobrarDeudas, RegistrarPagoConDeudas, ListarDeudas, AnularDeuda, fiarProductoAction, anularDeudaAction ni ModalDetalleDeuda.
## 2. Comportamiento

### BEH-S08-001
- cubre: REQ-S08-001, REQ-S08-002, REQ-S08-003, REQ-S08-004
- categoria: feliz
- dado: el esquema final
- cuando: se consultan las tablas, los enums, las columnas de Pago y los valores de ModuloPermiso
- entonces: no existen Turno, Egreso, ArqueoLinea, EstadoTurno ni MonedaEgreso, Pago no tiene turnoId y ModuloPermiso no tiene CAJA

### BEH-S08-002
- cubre: REQ-S08-005, REQ-S08-006, REQ-S08-007
- categoria: feliz
- dado: el código final
- cuando: se buscan los seis casos de uso, las entidades, los puertos, los repositorios, listarPorTurno y SinTurnoAbiertoError
- entonces: no existe ninguno

### BEH-S08-003
- cubre: REQ-S08-008, REQ-S08-011, REQ-S08-012, REQ-S08-013
- categoria: feliz
- dado: un socio recién autenticado, sin haber abierto nada
- cuando: abre /miembros y /miembros/nuevo, inscribe un miembro, cobra su membresía, cambia su plan y vende un producto, e inicia sesión
- entonces: ninguna pantalla pide abrir la caja, ninguna operación consulta un turno, el cobro queda registrado, la respuesta del inicio de sesión no trae cajaAbiertaPor y la página de login no muestra el estado de la caja

### BEH-S08-004
- cubre: REQ-S08-009, REQ-S08-010
- categoria: feliz
- dado: un usuario nuevo creado con los permisos por defecto y un usuario con PAGOS CREAR
- cuando: se crea el usuario, se abre la pantalla de permisos y se ejecuta VenderProducto con cada usuario
- entonces: la pantalla no ofrece CAJA, el usuario nuevo tiene PAGOS VER y PAGOS CREAR, y VenderProducto acepta a quien tiene PAGOS CREAR y rechaza a quien no

### BEH-S08-005
- cubre: REQ-S08-014, REQ-S08-015, REQ-S08-016, REQ-S08-017, REQ-S08-043
- categoria: feliz
- dado: el panel con un socio
- cuando: abre el menú, la navegación móvil, /caja, /cobros y api/caja/ultimo-cierre
- entonces: el menú dice «Cobros» y no ofrece Caja, Turno, Arqueo ni Egresos, /caja y la ruta api/caja/ultimo-cierre responden 404, /cobros carga y los ocho archivos retirados no existen

### BEH-S08-006
- cubre: REQ-S08-018, REQ-S08-049
- categoria: feliz
- dado: el botón «Cobrar ahora» de en sala y el de la ficha del miembro M1
- cuando: se pulsan, se cobra y se anula un cobro
- entonces: ambos llevan a /cobros con el parámetro cobrar igual a M1 y abren su cobro, y tras cobrar y anular /cobros se refresca con los datos nuevos

### BEH-S08-007
- cubre: REQ-S08-019, REQ-S08-020
- categoria: feliz
- dado: /cobros con un miembro elegido
- cuando: el socio elige cobrar la membresía y luego cambiar el plan
- entonces: se abre el formulario de cobro de S-04 y luego el de cambio de plan de S-07, ambos sin pedir abrir caja y sin cálculo propio del asistente

### BEH-S08-008
- cubre: REQ-S08-021, REQ-S08-022, REQ-S08-023, REQ-S08-025
- categoria: feliz
- dado: hoy tres cobros: 120.00 en Yape por Ana para el miembro M1, 200.00 en efectivo por Ana para M2 y 280.00 en transferencia por Luis para M3
- cuando: se abre /cobros
- entonces: la lista trae los tres con hora, miembro, concepto, método, monto y usuario; los totales son Yape 120.00, Efectivo 200.00, Transferencia 280.00, Ana 320.00, Luis 280.00 y total 600.00; hay un enlace a /pagos

### BEH-S08-009
- cubre: REQ-S08-024, REQ-S08-033, REQ-S08-034
- categoria: feliz
- dado: los tres cobros de BEH-S08-008
- cuando: el socio anula el de M3 con el motivo «error de método»
- entonces: queda marcado como anulado con su motivo y su autor, el total del día baja a 320.00, Transferencia y Luis desaparecen de los totales y el cobro anulado sigue en la lista

### BEH-S08-010
- cubre: REQ-S08-024
- categoria: error
- dado: el miembro M1 con dos cobros vigentes, el primero de 120.00 y el segundo de 200.00
- cuando: el socio intenta anular el primero
- entonces: S-04 lo rechaza indicando que primero se anulan los posteriores, /cobros muestra ese mensaje y nada cambia

### BEH-S08-011
- cubre: REQ-S08-026
- categoria: feliz
- dado: un socio sin ningún turno y un producto con precio 3.50
- cuando: vende el producto desde /cobros
- entonces: la venta se registra como pago en la sede única, sin turno, y aparece en los cobros de hoy con el producto como concepto

### BEH-S08-012
- cubre: REQ-S08-027
- categoria: feliz
- dado: los archivos que quedan en cobros fuera de la familia S-11
- cuando: se ejecutan verificar-dinero y verificar-fechas sin exenciones para ellos
- entonces: ambas pasan

### BEH-S08-013
- cubre: REQ-S08-028, REQ-S08-029, REQ-S08-030, REQ-S08-031
- categoria: feliz
- dado: cobros el 2026-11-10 (100.00 en Yape por Ana y 50.00 en efectivo por Luis), el 2026-11-11 (ninguno) y el 2026-11-12 (80.00 en Yape por Ana)
- cuando: se pide el reporte del 2026-11-10 al 2026-11-12
- entonces: devuelve dos días, el 10 con total 150.00, Yape 100.00, Efectivo 50.00, Ana 100.00 y Luis 50.00, y el 12 con total 80.00, cada uno con su lista, y no incluye el día 11

### BEH-S08-014
- cubre: REQ-S08-032
- categoria: borde
- dado: un cobro con fecha de pago 2026-11-12 23:50 de Lima (2026-11-13 04:50 UTC) y otro con 2026-11-13 00:10 de Lima
- cuando: se pide el reporte del 2026-11-12 al 2026-11-13
- entonces: el primero cae en el día 12 y el segundo en el día 13, con el servidor en UTC, en America/Lima y en Asia/Tokyo

### BEH-S08-015
- cubre: REQ-S08-035
- categoria: borde
- dado: un cobro registrado el 2026-11-12 con fecha de pago 2026-11-05, y otro registrado el 2026-11-12 con fecha de pago 2026-11-12
- cuando: se pide el reporte del 2026-11-05 al 2026-11-12
- entonces: el primero aparece en el día 5 marcado «fecha pasada» y no en el día 12; el segundo aparece en el día 12 sin marca

### BEH-S08-016
- cubre: REQ-S08-033, REQ-S08-034
- categoria: borde
- dado: un día con dos cobros ambos anulados y otro día con un cobro vigente y uno anulado
- cuando: se pide el reporte
- entonces: el primer día aparece con total 0.00 y sin métodos ni usuarios en sus totales, con los dos cobros marcados anulados; el segundo suma solo el vigente

### BEH-S08-017
- cubre: REQ-S08-036, REQ-S08-038
- categoria: feliz
- dado: un pago de membresía de 120.00, uno de cambio de plan de 11.11 con su registro de cambio de plan, y uno de producto de 3.50 por 2 unidades, el mismo día
- cuando: se pide el reporte del día
- entonces: los conceptos son «Membresía», «Cambio de plan» y el producto con × 2, y el total del día es 134.61

### BEH-S08-018
- cubre: REQ-S08-037
- categoria: concurrencia
- dado: un repositorio de pagos con un contador de consultas y, a la vez, el registro de un cobro nuevo y la anulación de otro
- cuando: se ejecuta obtenerReporteCobros
- entonces: hace una sola consulta, los totales del día son iguales a la suma de las filas que lista y no cuentan anulados, y una lectura posterior incluye el cobro nuevo y excluye el anulado

### BEH-S08-019
- cubre: REQ-S08-039
- categoria: error
- dado: un rango de 367 días, un rango del 2026-01-01 al 2027-01-01 (366 días contando ambos extremos) y un rango con la fecha inicial posterior a la final
- cuando: se pide el reporte
- entonces: el primero y el tercero se rechazan con el error de rango sin leer pagos y el segundo se procesa

### BEH-S08-020
- cubre: REQ-S08-040, REQ-S08-041
- categoria: feliz
- dado: pagos con fecha de pago en los días 10 y 12 de noviembre
- cuando: se abre /pagos sin parámetros y luego con desde 2026-11-10 y hasta 2026-11-12
- entonces: el primero muestra hoy y el segundo el reporte de ambos días, y el filtro ofrece solo los días 10 y 12 como días con cobros

### BEH-S08-021
- cubre: REQ-S08-042
- categoria: error
- dado: un usuario sin el permiso PAGOS VER
- cuando: abre /cobros y /pagos y llama a obtenerReporteCobros
- entonces: las tres se rechazan sin leer pagos

### BEH-S08-022
- cubre: REQ-S08-044, REQ-S08-045, REQ-S08-046, REQ-S08-057
- categoria: error
- dado: un archivo por cada uno de los veintiún términos de REQ-S08-044, otro con la ruta /caja, otro con el valor CAJA, un archivo por cada uno de los diez términos de REQ-S08-057 y un archivo con siguienteTurno
- cuando: se ejecuta tools/verificar-caja.mjs
- entonces: falla y nombra archivo, línea y término de cada uno de los treinta y tres casos, y no marca siguienteTurno

### BEH-S08-023
- cubre: REQ-S08-047
- categoria: error
- dado: un pull request que agrega turnoId en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-caja.mjs falla y queda en rojo

### BEH-S08-024
- cubre: REQ-S08-048
- categoria: feliz
- dado: las listas de exenciones de verificar-dinero, verificar-fechas, verificar-pagos y verificar-plan
- cuando: se ejecutan sus pruebas de lista
- entonces: ninguna entrada nombra un archivo de Turno*, Arqueo*, Egreso*, ObtenerReporteCaja*, ObtenerResumenTurno* ni de la carpeta caja o cobros que no sea de la familia S-11


### BEH-S08-025
- cubre: REQ-S08-050, REQ-S08-051
- categoria: feliz
- dado: los métodos activos Yape, transferencia al BCP y Efectivo
- cuando: se abre el cobro de membresía, el cambio de plan y la venta de producto, y se cobran 50.00 en efectivo
- entonces: los tres formularios ofrecen Efectivo sin pedir número de operación, los demás métodos sí lo piden, y el cobro en efectivo aparece en /cobros y en el reporte con su propia fila de total, sin monto esperado ni contado

### BEH-S08-026
- cubre: REQ-S08-052, REQ-S08-053, REQ-S08-054
- categoria: feliz
- dado: el esquema y el código finales
- cuando: se consultan la tabla DeudaProducto, el enum EstadoDeuda, los seis casos de uso, la entidad, el puerto, el repositorio, las tres acciones y los tres componentes
- entonces: no existe ninguno

### BEH-S08-027
- cubre: REQ-S08-055
- categoria: feliz
- dado: /cobros con un miembro elegido y el formulario de venta de producto
- cuando: el socio revisa las acciones y los campos que se ofrecen
- entonces: no hay botón de fiar, de deudas ni de cobrar deudas, y la venta solo admite cobro inmediato

### BEH-S08-028
- cubre: REQ-S08-056
- categoria: feliz
- dado: un miembro con vencimiento de hace 10 días y otro que nunca pagó
- cuando: el socio elige a cada uno en /cobros y cobra su membresía
- entonces: el cobro se ofrece sin ningún paso previo y se registra con las reglas de S-04, con la base del vencimiento en el día de hoy

### BEH-S08-029
- cubre: REQ-S08-057
- categoria: error
- dado: un archivo por cada uno de los diez términos de REQ-S08-057
- cuando: se ejecuta tools/verificar-caja.mjs
- entonces: falla y nombra archivo, línea y término de cada uno
## 3. Invariantes

### INV-S08-001
- propiedad: en todo reporte, el total del día es la suma de los totales por método y también la suma de los totales por usuario, y ninguno cuenta cobros anulados
- mecanismo: test-propiedad
- deteccion: 200 conjuntos de cobros generados con semilla fija (con anulados, fechas pasadas y varios usuarios y métodos); para cada día el total debe ser igual a la suma por método, igual a la suma por usuario e igual a la suma de los cobros no anulados de su lista
- protege: REQ-S08-028, REQ-S08-029, REQ-S08-030, REQ-S08-031, REQ-S08-033

### INV-S08-002
- propiedad: un cobro se registra sin ningún estado previo de caja: el esquema no tiene turnos y el pago solo exige miembro, plan, sede, usuario y método
- mecanismo: restriccion-bd
- deteccion: el esquema no contiene Pago.turnoId ni la tabla Turno, y se inserta un pago en una base con una sede, un usuario, un miembro, un plan y un método sembrados y ninguna otra fila
- protege: REQ-S08-001, REQ-S08-003, REQ-S08-008

### INV-S08-003
- propiedad: el reporte agrupa cada cobro en el día de Lima de su fecha de pago, igual con cualquier zona horaria del proceso
- mecanismo: test-propiedad
- deteccion: 200 instantes generados con semilla fija alrededor de las 00:00 y las 23:59 de Lima, probados con TZ=UTC, America/Lima y Asia/Tokyo; el día asignado debe ser igual a diaLima del instante
- protege: REQ-S08-032, REQ-S08-041

### INV-S08-004
- propiedad: los términos de turno, arqueo, egreso y caja no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-caja.mjs termina con código distinto de cero y lista archivo:línea y término de cada coincidencia
- protege: REQ-S08-044, REQ-S08-045, REQ-S08-046

## 4. Criterios de aceptación

### AC-S08-001
- enlaza: REQ-S08-001, REQ-S08-002, REQ-S08-003, REQ-S08-004, REQ-S08-005, REQ-S08-006, REQ-S08-007, BEH-S08-001, BEH-S08-002, INV-S08-002
- metodo: sql
- procedimiento: consultar el esquema final por las tablas, los enums, las columnas de Pago y los valores de ModuloPermiso; buscar con la API de typescript los seis casos de uso, las entidades, los puertos, los repositorios, listarPorTurno y SinTurnoAbiertoError; e insertar un pago en una base con una sede, un usuario, un miembro, un plan y un método sembrados
- esperado: nada de lo retirado existe y el pago se inserta sin otro estado previo
- test: pendiente

### AC-S08-002
- enlaza: REQ-S08-008, REQ-S08-011, REQ-S08-012, REQ-S08-013, BEH-S08-003
- metodo: integracion
- procedimiento: con una base efímera y un socio recién autenticado, inscribir un miembro, cobrar su membresía, cambiar su plan y vender un producto llamando a las acciones y rutas, iniciar sesión, y leer la respuesta de la ruta de inicio de sesión y la página de login
- esperado: todo se registra, ninguna operación consulta un turno, la respuesta no trae cajaAbiertaPor y la página no muestra el estado de la caja
- test: pendiente

### AC-S08-003
- enlaza: REQ-S08-009, REQ-S08-010, BEH-S08-004
- metodo: integracion
- procedimiento: crear un usuario con los permisos por defecto, leer sus permisos y la pantalla de permisos, y ejecutar VenderProducto con un usuario con PAGOS CREAR y con uno sin él
- esperado: el usuario tiene PAGOS VER y PAGOS CREAR y ningún permiso CAJA, la pantalla no ofrece CAJA, y VenderProducto acepta y rechaza según PAGOS CREAR
- test: pendiente

### AC-S08-004
- enlaza: REQ-S08-014, REQ-S08-015, REQ-S08-016, REQ-S08-017, REQ-S08-018, REQ-S08-049, REQ-S08-043, BEH-S08-005, BEH-S08-006
- metodo: manual
- procedimiento: como socio, abrir el menú y la navegación móvil, pedir /caja y api/caja/ultimo-cierre, abrir /cobros, pulsar «Cobrar ahora» desde en sala y desde la ficha de un miembro, cobrar y anular un cobro; buscar los ocho archivos retirados
- esperado: el menú dice «Cobros» y no ofrece Caja, Turno, Arqueo ni Egresos, /caja y la ruta de último cierre responden 404, los botones llevan a /cobros con el miembro, /cobros se refresca tras cobrar y anular, y los archivos no existen
- test: pendiente

### AC-S08-005
- enlaza: REQ-S08-019, REQ-S08-020, REQ-S08-025, BEH-S08-007
- metodo: manual
- procedimiento: como socio, abrir /cobros, elegir un miembro, abrir el cobro de membresía y el cambio de plan, y pulsar el enlace al historial
- esperado: los formularios son los de S-04 y S-07 sin pedir abrir caja y el enlace lleva a /pagos
- test: pendiente

### AC-S08-006
- enlaza: REQ-S08-021, REQ-S08-022, REQ-S08-023, REQ-S08-024, REQ-S08-026, REQ-S08-033, REQ-S08-034, BEH-S08-008, BEH-S08-009, BEH-S08-010, BEH-S08-011
- metodo: integracion
- procedimiento: con una base efímera, registrar los tres cobros de BEH-S08-008, leer los datos de la página /cobros (lista y totales de hoy) con una fecha de hoy fija, anular el de M3 con un motivo, intentar anular el primer cobro de un miembro con dos cobros y vender un producto de 3.50
- esperado: la lista y los totales coinciden con los de los comportamientos antes y después de anular, el cobro anulado sigue listado con su motivo y su autor, la anulación fuera de orden se rechaza con el mensaje de S-04 y la venta aparece en la sede única sin turno
- test: pendiente

### AC-S08-007
- enlaza: REQ-S08-027, BEH-S08-012
- metodo: unitario
- procedimiento: ejecutar verificar-dinero y verificar-fechas sobre el árbol final sin exenciones para los archivos de cobros fuera de la familia S-11
- esperado: ambas pasan
- test: pendiente

### AC-S08-008
- enlaza: REQ-S08-028, REQ-S08-029, REQ-S08-030, REQ-S08-031, REQ-S08-032, REQ-S08-035, REQ-S08-036, REQ-S08-038, BEH-S08-013, BEH-S08-014, BEH-S08-015, BEH-S08-016, BEH-S08-017, INV-S08-001, INV-S08-003
- metodo: integracion
- procedimiento: ejecutar obtenerReporteCobros contra una base efímera con los datos de esos comportamientos, con TZ=UTC, America/Lima y Asia/Tokyo, y con 200 conjuntos generados con semilla fija
- esperado: los días, las listas, los totales, las marcas y los conceptos coinciden con los de los comportamientos en las tres zonas y las propiedades se cumplen en los 200 conjuntos
- test: pendiente

### AC-S08-009
- enlaza: REQ-S08-037, REQ-S08-039, BEH-S08-018, BEH-S08-019
- metodo: integracion
- procedimiento: ejecutar obtenerReporteCobros con un repositorio que cuenta sus consultas y simula un registro y una anulación entre dos lecturas, y con los rangos de 367 días, de 366 días y con fechas invertidas
- esperado: hace una sola consulta con totales iguales a la suma de sus filas listadas sin anulados, una lectura posterior incluye el cobro nuevo y excluye el anulado, y los rangos inválidos se rechazan sin leer pagos mientras el de 366 días se procesa
- test: pendiente

### AC-S08-010
- enlaza: REQ-S08-040, REQ-S08-041, REQ-S08-042, BEH-S08-020, BEH-S08-021
- metodo: integracion
- procedimiento: pedir /pagos sin parámetros y con desde y hasta con pagos en los días 10 y 12, pedir los días con cobros, y repetir /cobros, /pagos y el reporte con un usuario sin PAGOS VER contando las lecturas de pagos
- esperado: el historial muestra hoy y luego los dos días, el filtro ofrece los días 10 y 12, y sin permiso se rechazan las tres sin leer pagos
- test: pendiente

### AC-S08-011
- enlaza: REQ-S08-044, REQ-S08-045, REQ-S08-046, REQ-S08-057, BEH-S08-022, BEH-S08-029, INV-S08-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-caja.mjs con un árbol por cada uno de los veintiún términos, uno por cada uno de los diez términos de deuda, otro con la ruta /caja, otro con el valor CAJA, otro con siguienteTurno y otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los treinta y tres casos nombrando archivo, línea y término, no marca siguienteTurno, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S08-012
- enlaza: REQ-S08-047, BEH-S08-023
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue turnoId en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-caja.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S08-013
- enlaza: REQ-S08-048, BEH-S08-024
- metodo: unitario
- procedimiento: ejecutar las pruebas de las listas de exenciones de verificar-dinero, verificar-fechas, verificar-pagos y verificar-plan
- esperado: ninguna entrada nombra un archivo de la familia S-08
- test: pendiente


### AC-S08-014
- enlaza: REQ-S08-050, REQ-S08-051, BEH-S08-025
- metodo: integracion
- procedimiento: con los métodos activos Yape, transferencia al BCP y Efectivo, leer el catálogo que reciben los formularios de cobro de membresía, de cambio de plan y de venta de producto, cobrar 50.00 en efectivo sin número de operación y 50.00 en Yape sin número, y leer el reporte del día
- esperado: los tres formularios ofrecen Efectivo, el cobro en efectivo se acepta sin número de operación, el de Yape sin número se rechaza y el reporte trae una fila de total para Efectivo sin monto esperado ni contado
- test: pendiente

### AC-S08-015
- enlaza: REQ-S08-052, REQ-S08-053, REQ-S08-054, REQ-S08-055, REQ-S08-056, BEH-S08-026, BEH-S08-027, BEH-S08-028
- metodo: integracion
- procedimiento: consultar el esquema y buscar con la API de typescript los archivos, casos de uso y acciones de fiado y deudas; leer las acciones que ofrece /cobros; y cobrar la membresía de un miembro vencido y de uno que nunca pagó
- esperado: nada de fiado ni deudas existe, /cobros no lo ofrece y los dos cobros se registran con las reglas de S-04 sin ningún paso previo
- test: pendiente
## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de la venta de producto y de la anulación en lo que se conserva (las pruebas de fiado y de deudas se retiran con sus casos de uso, SUP-S08-017); (2) pruebas de `tools/verificar-caja.mjs` y la herramienta con todos los archivos actuales de turno, arqueo y egreso en su lista de exenciones, que se achica en cada paso siguiente; (3) pruebas de `obtenerReporteCobros`, de su puerto de lectura y de `obtenerDiasConActividad` basado en pagos, con los casos de BEH-S08-013 a BEH-S08-019 y las propiedades de INV-S08-001 e INV-S08-003, junto al reporte viejo; (4) reemplazar el permiso `CAJA` por `PAGOS` en `VenderProducto`, `CrearUsuarioAdmin`, `usuarios/actions.ts` y `FormularioPermisos.tsx`, y retirar el fiado y las deudas (casos de uso, entidad, puerto, repositorio, acciones, componentes y sus pruebas, con los llamadores en `caja/page.tsx` y `pagos/actions.ts`) antes de tocar el esquema; (5) quitar el turno de `VenderProducto`, los residuos de `RegistrarPago` y `CambiarPlan`, `miembros/page.tsx`, `miembros/nuevo/page.tsx`, `miembros/actions.ts`, `pagos/actions.ts`, `api/pagos/route.ts`, la ruta y la página de inicio de sesión, migrando en el mismo commit a todos los llamadores de `SinTurnoAbiertoError`; (6) mover `caja/` a `cobros/` en un solo commit junto con todos los enlaces, `revalidatePath`, importaciones (`pagos/FormularioPago.tsx`, `miembros/FormularioMiembro.tsx`, `en-sala/ListaEnSala.tsx`) y las listas de exenciones que nombraban rutas de `caja/`, separar la acción de venta de producto en `cobros/productosActions.ts` y reducir `page.tsx` al selector, las acciones de cobro, los cobros de hoy y los totales de hoy; (7) rehacer `/pagos` con el reporte nuevo y el permiso `PAGOS VER`; (8) retirar los casos de uso, entidades, puertos, repositorios, acciones, pantallas y la ruta `api/caja/ultimo-cierre` de turno, arqueo y egreso, y las pruebas del reporte viejo (SUP-S08-014), achicando la lista de exenciones de la herramienta; (9) esquema: retirar `Turno`, `Egreso`, `ArqueoLinea`, `DeudaProducto`, sus enums (`EstadoTurno`, `MonedaEgreso`, `EstadoDeuda`), `Pago.turnoId` y el valor `CAJA`; (10) convertir a `dinero.ts` y `fechaLima` los archivos de `cobros/` que no son de la familia S-11 y vaciar las exenciones de la familia S-08 de S-02, S-03, S-04 y S-07.
- Las pruebas del reporte usan semillas fijas, una base efímera y los husos `TZ=UTC`, `America/Lima` y `Asia/Tokyo`; no hay dependencias nuevas.
- Los criterios AC-S08-004, AC-S08-005 y AC-S08-012 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).
- La herramienta busca cada término por separado, de modo que `Egreso` y `RegistrarEgreso` pueden coincidir en una misma línea y la herramienta lista ambos; no hay topes porque no hay exenciones permanentes.

### 5.2 Migración
- No hay datos que migrar (SUP-S08-009): el baseline se genera nuevo (S-00, S-15).
- **Enmiendas que se registran al aprobar S-08:**
  - S-01: la tabla de permisos por ruta de 5.1 y REQ-S01-029 pierden `caja/ultimo-cierre` (la ruta desaparece) y su AC; los usos de `CAJA` en la tabla pasan a `PAGOS`.
  - S-02, S-03, S-04 y S-07: la familia S-08 sale de sus listas de exenciones al terminar S-08 (REQ-S02-020, REQ-S03-030, REQ-S04-045 y REQ-S07-060); S-07 REQ-S07-057 deja de tener la exención de la familia S-08.
  - S-03: la tabla de familias (5.1) cambia la carpeta `caja/` por `cobros/` y retira `Turno*`, `Arqueo*`, `Egreso*`, `ObtenerReporteCaja*` y `ObtenerResumenTurno*` de la familia S-08, y el caso de prueba de `Turno.ts` se elimina.
  - S-04: SUP-S04-011, 0.2, 0.3, REQ-S04-045 y los dos riesgos remiten a S-08 como cumplida; los tres archivos de `caja/` que adaptan S-04 y S-07 pasan a `cobros/`.
  - S-05: REQ-S05-008, SUP-S05-002, SUP-S05-005, INV-S05-004, 0.2 y 0.3 dejan de nombrar `Turno` al desaparecer la tabla.
  - S-22: REQ-S22-002, BEH-S22-012 y AC-S22-001 restan tres enums (`EstadoTurno`, `MonedaEgreso` y `EstadoDeuda`); REQ-S22-016, BEH-S22-008 y AC-S22-014 restan cuatro tablas (`Turno`, `Egreso`, `ArqueoLinea` y `DeudaProducto`); REQ-S22-007 y AC-S22-003 restan los repositorios de turno, egreso, arqueo y deuda; REQ-S22-009 y AC-S22-004 quitan esos repositorios de la prueba de humo.
  - S-03: la familia S-11 de la tabla de familias pierde `FiarProducto*`, `CobrarDeudas*`, `ListarDeudas*`, `RegistrarPagoConDeudas*` y `ModalCobrarDeudas*`; el puente de dinero deja de nombrarlos.
  - S-05: SUP-S05-002 y REQ-S05-008 dejan de nombrar `DeudaProducto.sucursalId`.
  - S-04: la aclaración de que `ModalCobrarDeudas.tsx` conserva términos de abono y la retirada de `RegistrarPagoConDeudas` quedan cumplidas por S-08.
  - `docs/06-modelo-datos-cambios.md`, `docs/00-indice.md` y `COBERTURA-RF.md`: nota de que S-08 quedó como registro continuo de cobros.
- **Traspasos:** S-11 (catálogo de productos y venta con cobro inmediato, `ModalVenderProducto`, `cobros/productosActions.ts`), S-14 (reportes de morosos, ingresos por período e histórico imprimible), S-12 (tickets), S-23 (permisos y rol único; el reporte por usuario pierde valor con un solo rol) y S-10 (tasa y `Pago.montoBs`).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Sin arqueo se pierde la conciliación del efectivo físico (ADR-018): un descuadre solo se detecta comparando el reporte con el dinero real fuera del sistema. Mitigación: el reporte por día, método y usuario, la marca «fecha pasada» y la anulación con motivo y autor.
- Un cobro anulado de un día ya revisado cambia ese total sin avisar; solo existe la marca «fecha pasada» y la lista de anulados. Mitigación: los anulados se listan con motivo y autor (REQ-S08-034).
- La anulación solo alcanza al cobro más reciente de cada miembro (S-04): el operador puede no poder anular un cobro de un día anterior si el miembro tiene uno posterior (BEH-S08-010). Mitigación: el mensaje indica qué anular primero.
- Eliminar a un miembro (ADR-013, S-09) puede borrar sus pagos y cambiar los totales de un día pasado. Mitigación: S-09 define que «Eliminar» conserva los pagos.

- Una inscripción con fecha de inscripción anterior se marca «fecha pasada» aunque sea normal (S-04); es una marca informativa.
- Con la página abierta al cruzar la medianoche de Lima, «hoy» queda en el día anterior hasta recargar (SUP-S08-016).
- 50 archivos cambian y `caja/` (25 archivos, 4 836 líneas) se mueve; el riesgo es una importación o un enlace que siga apuntando a `/caja`. Mitigación: el typecheck y la herramienta, que ahora detecta la ruta y el módulo.
- Se pierden las pruebas del reporte viejo y las suites de contrato y de humo de S-22 de turno, egreso y arqueo, junto con esas capacidades, por decisión del propietario.
- Cualquier usuario autenticado con `PAGOS CREAR` puede registrar un cobro en cualquier momento; con un solo rol (S-23) la trazabilidad depende del usuario que inicia sesión.
- Las cifras de 0.4 cambian cuando S-00 a S-07 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿El reporte diario por método y usuario es suficiente como control sin arqueo? Default: sí (SUP-S08-001, ADR-018).
- ¿El reporte agrupa los cobros por fecha de pago, marcando los de fecha pasada? Default: sí (SUP-S08-002).
- ¿La página se llama «Cobros» y la ruta es /cobros? Default: sí (SUP-S08-007).
- ¿El fiado y las deudas se eliminan en S-08 y no en S-11? Default: sí (SUP-S08-017); confirmado por el propietario el 2026-11-12.
- ¿La venta de productos se mantiene sin fiado? Default: sí (SUP-S08-018); confirmado por el propietario el 2026-11-12.
- ¿El historial de /pagos admite hasta 366 días contando ambos extremos? Default: sí (SUP-S08-005, SUP-S08-013).
- ¿El permiso para ver cobros e historial es `PAGOS VER`, hoy sin control? Default: sí (SUP-S08-006).

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura), que recibió únicamente la ruta y la lista de comprobación. Veredicto sobre la versión `d0f62ce`; cada fila se resume y el veredicto global se conserva tal como lo entregó. El revisor no tuvo shell: contó con `Grep` y `Glob`; verificó la aritmética de BEH-006 a BEH-011 (correcta) y los números de línea de 0.4 (casi todos correctos).

> | # | Comprobación | Veredicto | Qué corregir (resumen del revisor) |
> |---|---|---|---|
> | 1 | Cabecera y ADRs | NO CUMPLE (menor) | Faltan ADR-002, ADR-019 y ADR-010 en `adrs`; orígenes inadecuados de REQ-026 y REQ-031. |
> | 2 | REQ: una obligación, EARS, origen | NO CUMPLE | Varios REQ agrupan obligaciones separables (001, 004, 005, 006, 011, 013, 014, 016, 020, 022, 025, 027, 031, 033); orígenes incoherentes en REQ-010, 026 y 032; REQ-019 dice «registro» sin nombrar `Pago.creadoEn`; REQ-015 prescribe una llamada y no un resultado; REQ-021 pide «concepto» sin definirlo. |
> | 3 | Cobertura | CUMPLE | Todos los REQ tienen BEH y AC; hay las cuatro categorías. |
> | 4 | AC binarios; aritmética | NO CUMPLE | «Diecisiete» términos en lugar de dieciocho; AC-001 y INV-002 insertan un pago «con solo un miembro y un plan», imposible por las claves foráneas; la lectura simultánea de AC-005 y BEH-019 no es determinista; el esperado «ni Math.round» no es observable en integración; AC-003 es `e2e` sin ejecutor; faltan miembros distintos y una anulación rechazada; sin definir días con solo anulados, métodos en cero ni si 366 es inclusivo; AC-004 manual cubre 7 REQ de interfaz. |
> | 5 | Hechos de 0.4 | CUMPLE (con 2 matices) | Se pudo cerrar el «no verificado» de `ObtenerReporteCaja`; los 50 archivos incluyen la ruta `api/caja/ultimo-cierre`, que 0.3 decía que retiraba S-01. |
> | 6 | Hechos incompletos que afectan al diseño | NO CUMPLE | (a) el permiso `CAJA` sigue en `VenderProducto`, `CobrarDeudasMiembro`, `FiarProducto`, `CrearUsuarioAdmin`, `usuarios/actions.ts` y `FormularioPermisos.tsx`; (b) enlaces, `revalidatePath` e importaciones a `/caja`; (c) `login/page.tsx` pinta `cajaAbiertaPor`; (d) comentarios con términos no listados y `METODO_EFECTIVO_BS`; (e) `SinTurnoAbiertoError` se define en `VenderProducto.ts:28`; (f) residuos en `CambiarPlanConPago` y `RegistrarPago.ts:495`; (g) `/pagos` y `/caja` no comprueban permiso; (h) el enlace a `/pagos` sale de `caja/`; (i) `conceptoPago.ts` no distingue membresía de cambio de plan; (j) el repositorio no trae nombres; (k) `ObtenerDiasConActividad` usa SQL con `America/Caracas`; (l) la lista actual excluye los anulados. |
> | 7 | Supuestos y preguntas | NO CUMPLE (menor) | Faltan supuestos implícitos: `Pago.creadoEn`, topes de exenciones, base nueva de S-00 y no solo S-15, el tamaño de `cobros/`. |
> | 8 | Contradicciones con ADR y specs | NO CUMPLE | (a) error factual: S-01 no retira `caja/ultimo-cierre`, la deja a las specs de ADR-018 y la protege con `exigirPermiso(CAJA, VER)`; (b) la exención de la familia S-08 para términos de S-07 en `caja/`; (c) al mover a `cobros/` las exenciones por ruta dejan de coincidir; (d) S-01 exige guardas en todo `actions.ts`; (e) el fiado sigue en pantalla; (g) los nombres `Prisma*` están desactualizados tras S-22. |
> | 9 | Alcance | NO CUMPLE (menor) | Solapa con S-14 en `/pagos`; el trabajo en `CobrarDeudasMiembro` se pierde con S-11; el reporte por usuario pierde valor con S-23. |
> | 10 | Viabilidad | NO CUMPLE | Hay que decir cómo se obtiene el rango de instantes del día de Lima; el orden de pruebas deja commits que no compilan (llamadores de `SinTurnoAbiertoError`, mover `caja/` con exenciones por ruta, quitar `CAJA` sin remapear) y deja la herramienta al final; el paso 1 caracteriza lo que se borra; los términos sensibles a mayúsculas se solapan; el «tope» no se define; el reporte de 366 días carga todo en memoria. |
> | 11 | Riesgos omitidos | NO CUMPLE | ADR-013, anulación posterior sin aviso, anulación limitada al cobro más reciente, ventas con varias líneas, medianoche con la página abierta, inscripciones retroactivas, pérdida de pruebas. |
> | 12 | Enmiendas a specs aprobadas | NO CUMPLE | Faltan: S-01 (`caja/ultimo-cierre` desaparece), S-03 (familia y caso de `Turno.ts`), S-05 (INV-S05-004, 0.2, 0.3, SUP-S05-005), S-22 (REQ-S22-009, AC-S22-004, y los enums están en REQ-S22-002, BEH-S22-012 y AC-S22-001), S-04 (SUP-S04-011, 0.2, línea 37, REQ-S04-045) y S-07 (REQ-S07-057). |
>
> **VEREDICTO GLOBAL: REQUIERE CAMBIOS.**

### Conciliación del autor
Todos los hallazgos se verificaron contra el Repo A y las specs y resultaron ciertos; ninguno se rechazó. Verificados con `grep` y `Read`: el permiso `CAJA` en seis archivos, los enlaces a `/caja` en cuatro más los `revalidatePath`, `cajaAbiertaPor` en `login/page.tsx`, el SQL de Caracas de `listarFechasConTurno`, que `/pagos` no comprueba permiso y, en S-01, que `caja/ultimo-cierre` está en «Fuera de alcance» (§0.3) y que su tabla de permisos la protege con `CAJA`. Reconozco un error mío: el borrador decía que S-01 retiraba la ruta.

- Fila 1 y 2: `adrs` suma ADR-002, ADR-010 y ADR-019 y `depende_de` suma S-06; los REQ se rehicieron (49 en total): separación de tablas, enums y columna; del total del día, por método y por usuario; de la lista de pagos y su anulación; y de los términos y la ruta `/caja`; los orígenes se corrigieron; REQ-035 nombra el campo `creadoEn` y REQ-024 describe el resultado (anulado con motivo y autor).
- Fila 4: BEH y AC usan «veintiún términos más la ruta y el módulo» (veintitrés casos); los pagos de prueba se insertan con sede, usuario, miembro, plan y método sembrados; la lectura única se prueba con un repositorio que cuenta sus consultas (REQ-S08-037, BEH-S08-018); se quitó «ni Math.round» del esperado; AC-S08-004 y AC-S08-005 son manuales y la lista y los totales de hoy tienen una prueba de integración (AC-S08-006); los tres cobros usan miembros distintos; BEH-S08-010 prueba la anulación rechazada; SUP-S08-012 y SUP-S08-013 fijan los días con solo anulados, los métodos en cero y el rango inclusivo.
- Fila 5: 0.4 cierra el «no verificado» de `obtenerReporteCaja`.
- Fila 6: 0.4 agrega los puntos (a) a (l); se resuelven con REQ-S08-009 y REQ-S08-010 (remapear `CAJA` a `PAGOS` en los casos de uso, el alta de usuarios y las pantallas), REQ-S08-013 (página de login), REQ-S08-016 (ruta `api/caja/ultimo-cierre`), REQ-S08-018 y REQ-S08-049 (enlaces, `revalidatePath`, importaciones y `?cobrar=`), REQ-S08-025 (enlace a `/pagos`), REQ-S08-036 y SUP-S08-010 (concepto), REQ-S08-037 (una consulta con nombres), REQ-S08-041 (días con cobros con `fechaLima`), REQ-S08-042 (permiso `PAGOS VER`, comportamiento nuevo declarado) y REQ-S08-034 (los anulados ahora se listan).
- Fila 7: SUP-S08-009 cita S-00; nuevos SUP-S08-010 a SUP-S08-016.
- Fila 8: 0.3 y 0.4 corrigen el error sobre S-01; la exención de la familia S-08 desaparece (SUP-S08-015): los archivos de producto y deuda son de la familia S-11 y los demás se convierten a `dinero.ts` y `fechaLima` (REQ-S08-027); `cobros/actions.ts` conserva sus guardas y las acciones de producto pasan a `cobros/productosActions.ts`; REQ-S08-044 y REQ-S08-045 incluyen `DrizzleTurnoRepository`, `buscarAbiertoPorSucursal`, `listarFechasConTurno`, `/caja` y `CAJA`.
- Fila 9: 0.3 declara la frontera con S-14 y el trabajo mínimo que S-11 borra; el reporte por usuario se anota como transitorio.
- Fila 10: el plan se rehízo en diez pasos con la herramienta en el paso 2, el remapeo de `CAJA` antes de quitar el valor, los llamadores de `SinTurnoAbiertoError` migrados en el mismo commit, el movimiento de `caja/` en un solo commit con todos los enlaces y las exenciones, y el borrado de las pruebas del reporte viejo declarado (SUP-S08-014); la herramienta busca cada término por separado y no hay topes porque no hay exenciones permanentes; el rango del día de Lima sale de `fechaLima`.
- Fila 11 y 12: 5.3 suma los riesgos omitidos; 5.2 completa las enmiendas con los IDs del revisor (S-01, S-02, S-03, S-04, S-05, S-07 y S-22).
- Lo que no se pudo verificar y queda marcado «no verificado»: el contenido de `ModalRegistrarPagoCaja.tsx` más allá de lo que citan S-04 y S-07.

### Cambio posterior por orden del propietario (2026-11-12)
Tras la conciliación, el propietario pidió validar que Efectivo siga siendo un método de pago y que no existan turnos, fiado ni deudas, «solo el cobro de membresías». Se verificó que Efectivo ya estaba conformado en S-03 (SUP-S03-005, sin número de operación) y se agregaron REQ-S08-050 y REQ-S08-051; el fiado y las deudas, que el borrador dejaba funcionando hasta S-11, pasan a eliminarse en S-08 (REQ-S08-052 a REQ-S08-055 y REQ-S08-057, SUP-S08-017); el cobro de la membresía de un miembro vencido queda explícito (REQ-S08-056). Ante la ambigüedad de «solo el cobro de membresías», el propietario respondió que la venta de productos se mantiene sin fiado (SUP-S08-018).
