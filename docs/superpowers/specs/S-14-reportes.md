---
id: S-14
estado: aprobada
adrs: ADR-006, ADR-011, ADR-012, ADR-013, ADR-016, ADR-018, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-11, S-12, S-13, S-22, S-23
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-14 — Reportes: morosos, por vencer, ingresos por período e histórico imprimible

## 0. Contexto y alcance

### 0.1 Problema
Sin turnos ni arqueo (ADR-018), el control del dinero y de las renovaciones depende de los reportes. S-08 ya entrega `/pagos` con el reporte diario por método y por usuario. Faltan los cuatro reportes que el PRD pide (RF-36 y RF-62): **quiénes están vencidos (morosos)**, **quiénes vencen pronto**, **cuánto se cobró por período** (por método y por concepto, incluidas las ventas de producto) y el **histórico de pagos imprimible**. Hoy lo único parecido es un filtro «próximo cobro» del listado de miembros que se aplica en el navegador sobre la lista completa de miembros, algo que S-13 deja de enviar. La herramienta `tools/verificar-reportes.mjs` es necesaria porque retirar un filtro del navegador se rompe en silencio si alguien lo vuelve a agregar; sigue la forma de las demás herramientas de términos retirados. S-09 exige que los eliminados no aparezcan entre los morosos ni por vencer pero que sus pagos sigan contando en los ingresos, S-11 deja el reporte de ventas por producto y S-12 el desglose por tipo de comprobante cuando esté encendido.

### 0.2 Dentro de alcance
- Página `/reportes/morosos`: miembros no eliminados con vencimiento anterior a hoy (Lima), con días de atraso y último pago, y la lista aparte de los que nunca tuvieron un cobro.
- Página `/reportes/por-vencer`: miembros no eliminados que vencen en los próximos N días (de 1 a 30, por defecto 7).
- Página `/reportes/ingresos`: ingresos por día o por mes, por método y por concepto (membresía, cambio de plan, producto), ventas por producto y, con el interruptor de S-12 encendido, por tipo de comprobante.
- Histórico imprimible en `/pagos` (el de S-08): formato A4, encabezado con el negocio y el rango, y la columna de comprobante cuando corresponda.
- Estilos de impresión comunes a los reportes.
- Índices `Pago(fechaPago)` y `Miembro(estado, fechaVencimiento)`.
- Retiro de los filtros de fecha del navegador en la lista de miembros («próximo cobro», «vencidos hasta» e «inscritos desde»), con enlace a los reportes, y el filtro por plan como parámetro del servidor.
- Función compartida `enmascararDocumento`.
- Entrada «Reportes» del menú.
- `tools/verificar-reportes.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Recordatorios automáticos por WhatsApp o correo (RF-64 es opcional y WhatsApp está fuera del proyecto).
- Exportar a CSV o Excel: no se pidió (SUP-S14-008).
- Tablero con gráficos, altas y asistencia (RF-63, deseable): no entra.
- Cobro de deudas: no existen (ADR-018).
- Reportes por usuario o por turno: el total por usuario ya lo entrega S-08.
- Facturación y cálculo tributario: fuera del proyecto.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-14 recibirá después de S-00 a S-13, S-22 y S-23; se recontarán al empezar.
- **Filtros actuales en el navegador:** `ListaMiembros.tsx:126-137` filtra por «vencidos» o «vence en N días» comparando `miembro.fechaVencimiento` en el cliente, sobre la lista completa que le entrega la página; las opciones están en `OPCIONES_PROXIMO_COBRO` (`:23`); los filtros «Vencidos hasta» (`:118-122,178`), «Inscritos desde» (`:116`) y por plan (`:124`) también se aplican en el cliente; `diasHastaVencimiento` se define en `miembros/vencimiento.tsx:3` y se usa en `vencimiento.tsx:16` (`DiasDisponibles`) y en `ListaMiembros.tsx:282` (`estaVencido`), de modo que la función sirve también a la insignia de días y no se retira (verificado con `Read` y `grep -n`).
- **Historial de pagos:** `pagos/page.tsx` es el reporte de caja heredado, con turno, arqueo, egresos y bolívares (`:4-8`), y `BotonImprimir` (`:16`); `globals.css:76-80` solo fija el fondo blanco en impresión (verificado con `Read`); S-08 lo reemplaza por el reporte diario por método y usuario.
- **Índices:** el esquema solo declara `@@index([grupoPagoId])` en `Pago` y la única compuesta de `Miembro` es `@@unique([organizacionId, cedula])`; no hay índice sobre `Pago.fechaPago` ni sobre `Miembro.fechaVencimiento` (verificado con `awk` sobre `schema.prisma`).
- **Vencimiento:** `Miembro.fechaVencimiento` es opcional (`schema.prisma:164`); `Pago.fechaFinCiclo` guarda el fin de ese ciclo, que pasa a ser `Suscripcion.fin` y `Miembro.fechaVencimiento` (`:289`) (verificado con `Read`).
- **Decisiones previas:** S-04 define que el último día con acceso es el de vencimiento inclusive y dos estados, `activo` y `vencido`, sin días de gracia (SUP-S04-003, SUP-S04-004, REQ de `estadoDeAcceso`); S-07 define `diasEntreLima`, `sumarDiasLima` y `Pago.creadoEn`; S-08 define `obtenerReporteCobros`, el día de Lima de `fechaPago`, el concepto de cada cobro (SUP-S08-010), los anulados que no suman y el rango máximo de 366 días; S-09 define el estado `BAJA` y exige excluir a los eliminados de morosos y por vencer e incluir sus pagos en ingresos; S-11 deja el reporte de ventas por producto; S-12 deja el reporte por tipo de comprobante cuando su interruptor esté encendido; S-13 define el documento enmascarado (últimos 3 caracteres); S-02 define el formateador único y S-03 `formatearSoles` y las sumas de `dinero.ts` (verificado con `grep -n` en las specs).
- No verificado: el volumen real de miembros y pagos de Adhara Fit (se asume del orden de cientos de miembros y decenas de miles de pagos) y el contenido de `FiltroFechasHistorico.tsx` tras S-08.

### 0.5 Supuestos
- SUP-S14-001: un miembro es **moroso** si no está eliminado y su día de vencimiento (Lima) es anterior a hoy; los días de atraso son `diasEntreLima(vencimiento, hoy)`. Los miembros sin ningún vencimiento (nunca cobrados) se listan aparte como «Sin primer cobro» y no son morosos. Default: esa definición; asumido, por validar.
- SUP-S14-002: un miembro **vence pronto** si no está eliminado y su día de vencimiento está entre hoy y hoy más N días, ambos inclusive (quien vence hoy aparece con 0 días); N es un entero de 1 a 30 con 7 por defecto. Default: esa definición; asumido, por validar.
- SUP-S14-003: cada fila de morosos y por vencer muestra nombre, código de socio, documento enmascarado (S-13), celular, plan, fecha de vencimiento, días de atraso o restantes, y el último cobro no anulado (fecha y monto); el orden es por días de atraso descendente en morosos y por vencimiento ascendente en por vencer, y a igualdad por nombre; el tope es 500 filas con el indicador `hayMas`. Default: esos campos, orden y tope; asumido, por validar.
- SUP-S14-004: ambos reportes muestran «Renovación estimada», la suma de `Miembro.precioPlan` de las filas, solo como estimación de lo que se cobraría al renovar; no es una deuda (no existen deudas). Default: mostrarla; asumido, por validar.
- SUP-S14-005: el reporte de ingresos agrupa por el día o el mes de Lima de `Pago.fechaPago` (el criterio de S-08), excluye los pagos anulados, incluye los pagos de miembros eliminados y desglosa por método (el nombre guardado en el pago) y por concepto (membresía, cambio de plan o producto, con la clasificación de S-08). El rango máximo es 366 días por día y 36 meses por mes. Default: esos criterios; asumido, por validar.
- SUP-S14-006: las ventas por producto agrupan los pagos de producto del rango por nombre del producto guardado en el pago, con unidades y monto, ordenadas por monto descendente. Default: ese agrupamiento; asumido, por validar.
- SUP-S14-007: el histórico imprimible es la página `/pagos` de S-08 con estilos de impresión en A4, un encabezado con el nombre del negocio, el rango y la fecha y hora de impresión, sin menús ni filtros, y con la columna de comprobante solo cuando `comprobantesRegistroActivo` está encendido. Default: ese diseño; asumido, por validar.
- SUP-S14-008: no se exporta a CSV ni a Excel; la salida es la pantalla y la impresión del navegador (que también permite guardar PDF). Default: sin exportación; asumido, por validar.
- SUP-S14-009: los filtros de fecha del listado de miembros («próximo cobro», «vencidos hasta» e «inscritos desde») se retiran porque la lista deja de traer todos los miembros (S-13) y los reportes los reemplazan; el filtro por plan pasa a ser un parámetro `planId` del servidor en la misma consulta de S-13. Default: retirarlos; asumido, por validar.
- SUP-S14-010: el «último cobro» de un miembro es su cobro no anulado de mayor `Pago.creadoEn` (el criterio de S-07), y se muestra con su fecha de pago y su monto. Default: ese criterio; asumido, por validar.
- SUP-S14-011: un día o mes aparece en el reporte de ingresos si tiene al menos un cobro, aunque todos estén anulados (con total 0.00), y un método o concepto aparece en los totales solo si tiene al menos un cobro no anulado; ambos extremos del rango cuentan (el criterio de S-08, SUP-S08-012 y SUP-S08-013). Default: ese criterio; asumido, por validar.
- SUP-S14-012: el tope de 500 filas se aplica a cada lista por separado (morosos, y «Sin primer cobro»); la renovación estimada suma todas las filas que cumplen la definición, no solo las devueltas. Default: ese criterio; asumido, por validar.
- SUP-S14-013: el vencimiento se compara por su día de Lima (el instante guardado a las 05:00:00.000Z, S-04) en una sola consulta con la fecha de hoy y los límites como fechas de calendario de Lima. Default: ese criterio; asumido, por validar.
- SUP-S14-014: el encabezado impreso toma el nombre de `ConfiguracionNegocio.nombre` y la fecha y hora de impresión son las del momento en que se genera la página en el servidor, con el formateador único de S-02. Default: ese criterio; asumido, por validar.
- SUP-S14-015: `RangoInvalidoError` es la clase de error de rango que S-14 crea en `packages/domain` y que `obtenerReporteCobros` de S-08 reutiliza; un N de por-vencer fuera de 1 a 30 lanza `ParametroInvalidoError`. Default: esos nombres; asumido, por validar.
- SUP-S14-016: la función `enmascararDocumento` muestra 5 puntos fijos y los últimos 3 caracteres del documento, y todos los puntos cuando el documento tiene menos de 3 caracteres; la usan S-13, estos reportes y S-21. Default: esa regla; asumido, por validar.
- SUP-S14-017: las listas de morosos y por vencer son una sola consulta en una sentencia, por lo que leen una instantánea coherente de la base y no necesitan bloqueos; no se agrega un escenario de concurrencia para ellas. Default: sin bloqueo; asumido, por validar.

## 1. Requisitos

### REQ-S14-001
- tipo: ubicuo
- prioridad: MUST
- origen: RF-62
- texto: listarMorosos deberá devolver los miembros no eliminados cuyo día de vencimiento de Lima es anterior al día de hoy de Lima.

### REQ-S14-002
- tipo: ubicuo
- prioridad: MUST
- origen: RF-62
- texto: listarMorosos deberá calcular los días de atraso de cada miembro con diasEntreLima de S-07.

### REQ-S14-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-001
- texto: listarMorosos deberá devolver aparte, como «Sin primer cobro», a los miembros no eliminados sin fecha de vencimiento.

### REQ-S14-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: listarMorosos y listarPorVencer no deberán incluir a los miembros eliminados.

### REQ-S14-005
- tipo: ubicuo
- prioridad: MUST
- origen: RF-62
- texto: listarPorVencer deberá devolver los miembros no eliminados cuyo día de vencimiento está entre hoy y hoy más N días de Lima, ambos inclusive.

### REQ-S14-006
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S14-002
- texto: Si N no es un entero de 1 a 30 entonces listarPorVencer deberá rechazarlo con ParametroInvalidoError sin consultar miembros.

### REQ-S14-007
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-002
- texto: listarPorVencer deberá usar 7 como N cuando no se indica.

### REQ-S14-008
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-003
- texto: Cada fila de morosos y por vencer deberá traer nombre, código de socio, celular, plan, fecha de vencimiento y los días de atraso o restantes.

### REQ-S14-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-003
- texto: Cada fila de morosos y por vencer deberá traer el documento enmascarado con los últimos 3 caracteres, según S-13.

### REQ-S14-010
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-003
- texto: Cada fila de morosos y por vencer deberá traer la fecha y el monto del último cobro no anulado del miembro, o ninguno si no tiene.

### REQ-S14-011
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-003
- texto: listarMorosos deberá ordenar por días de atraso descendente y, a igualdad, por nombre.

### REQ-S14-044
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-003
- texto: listarPorVencer deberá ordenar por fecha de vencimiento ascendente y, a igualdad, por nombre.

### REQ-S14-012
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-003
- texto: listarMorosos deberá devolver como máximo 500 morosos y 500 miembros en «Sin primer cobro», e indicar con hayMas cuando existen más en cada lista.

### REQ-S14-045
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-003
- texto: listarPorVencer deberá devolver como máximo 500 filas e indicar con hayMas cuando existen más.

### REQ-S14-013
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-004
- texto: listarMorosos y listarPorVencer deberán devolver la renovación estimada como la suma, con dinero.ts, del precio del plan de todos los miembros que cumplen la definición, aunque hayMas sea verdadero.

### REQ-S14-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: listarMorosos y listarPorVencer deberán leer sus datos con una sola consulta del repositorio, sin una consulta por miembro.

### REQ-S14-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: listarMorosos y listarPorVencer deberán recibir el día de hoy de Lima como argumento.

### REQ-S14-042
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: listarMorosos, listarPorVencer y obtenerIngresosPorPeriodo no deberán leer el reloj del sistema.

### REQ-S14-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: obtenerIngresosPorPeriodo deberá devolver para cada día o mes de Lima del rango con al menos un cobro, aunque todos estén anulados, el total del período.

### REQ-S14-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-005
- texto: obtenerIngresosPorPeriodo deberá asignar cada cobro al día o mes de Lima de su fecha de pago.

### REQ-S14-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-005
- texto: obtenerIngresosPorPeriodo deberá devolver el total por método de pago de cada período y del rango.

### REQ-S14-019
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-005
- texto: obtenerIngresosPorPeriodo deberá devolver el total por concepto —membresía, cambio de plan y producto— de cada período y del rango, con la clasificación de S-08.

### REQ-S14-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: obtenerIngresosPorPeriodo no deberá sumar los cobros anulados.

### REQ-S14-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: obtenerIngresosPorPeriodo deberá incluir los cobros de miembros eliminados.

### REQ-S14-022
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S14-005
- texto: Si el rango supera 366 días por día o 36 meses por mes, o la fecha inicial es posterior a la final, entonces obtenerIngresosPorPeriodo deberá rechazarlo con RangoInvalidoError sin leer pagos, contando ambos extremos del rango.

### REQ-S14-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: obtenerIngresosPorPeriodo deberá sumar los montos con dinero.ts.

### REQ-S14-046
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: obtenerIngresosPorPeriodo deberá devolver todos los montos como cadenas de dos decimales.

### REQ-S14-024
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-006
- texto: obtenerIngresosPorPeriodo deberá devolver las ventas por producto del rango con el nombre del producto, las unidades y el monto, ordenadas por monto descendente.

### REQ-S14-025
- tipo: mientras
- prioridad: MUST
- origen: ADR-006
- texto: Mientras comprobantesRegistroActivo esté encendido, obtenerIngresosPorPeriodo deberá devolver el total por tipo de comprobante.

### REQ-S14-047
- tipo: mientras
- prioridad: MUST
- origen: ADR-006
- texto: Mientras comprobantesRegistroActivo esté encendido, obtenerIngresosPorPeriodo deberá devolver el total de los cobros sin comprobante.

### REQ-S14-026
- tipo: mientras
- prioridad: MUST
- origen: ADR-006
- texto: Mientras comprobantesRegistroActivo esté apagado, los reportes no deberán incluir ni mostrar datos de comprobante.

### REQ-S14-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: obtenerIngresosPorPeriodo deberá leer los cobros del rango con una sola consulta del repositorio.

### REQ-S14-028
- tipo: ubicuo
- prioridad: MUST
- origen: RF-36
- texto: La página /pagos deberá poder imprimirse en formato A4.

### REQ-S14-048
- tipo: ubicuo
- prioridad: MUST
- origen: RF-36
- texto: La impresión de /pagos deberá mostrar un encabezado con el nombre del negocio de ConfiguracionNegocio, el rango y la fecha y la hora de impresión del momento en que se genera la página.

### REQ-S14-029
- tipo: ubicuo
- prioridad: MUST
- origen: RF-36
- texto: La impresión de /pagos no deberá mostrar menús, filtros ni botones.

### REQ-S14-030
- tipo: mientras
- prioridad: MUST
- origen: ADR-006
- texto: Mientras comprobantesRegistroActivo esté encendido, la impresión de /pagos deberá incluir la columna de comprobante de cada cobro.

### REQ-S14-031
- tipo: ubicuo
- prioridad: MUST
- origen: RF-62
- texto: Las páginas /reportes/morosos, /reportes/por-vencer y /reportes/ingresos deberán poder imprimirse en formato A4.

### REQ-S14-049
- tipo: ubicuo
- prioridad: MUST
- origen: RF-62
- texto: La impresión de las tres páginas de reportes deberá mostrar el mismo encabezado que la de /pagos.

### REQ-S14-050
- tipo: ubicuo
- prioridad: MUST
- origen: RF-62
- texto: La impresión de las tres páginas de reportes no deberá mostrar menús, filtros ni botones.

### REQ-S14-032
- tipo: ubicuo
- prioridad: MUST
- origen: RF-62
- texto: El menú deberá tener la entrada «Reportes» con Morosos, Por vencer e Ingresos.

### REQ-S14-033
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-009
- texto: La lista de miembros no deberá tener los filtros de próximo cobro, vencidos hasta ni inscritos desde en el navegador.

### REQ-S14-043
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-009
- texto: La lista de miembros deberá enlazar los reportes de morosos y por vencer.

### REQ-S14-051
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-009
- texto: GET api/miembros y la lista del panel deberán aceptar el parámetro planId y filtrar por plan en el servidor.

### REQ-S14-034
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El esquema deberá tener el índice Pago(fechaPago).

### REQ-S14-052
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El esquema deberá tener el índice Miembro(estado, fechaVencimiento).

### REQ-S14-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las páginas /reportes/morosos, /reportes/por-vencer, /reportes/ingresos y /pagos y sus acciones deberán llamar a exigirSesion de S-01 antes de leer datos.

### REQ-S14-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las páginas de los reportes deberán mostrar los montos con formatearSoles.

### REQ-S14-053
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las páginas de los reportes deberán mostrar las fechas y horas con el formateador único de S-02.

### REQ-S14-054
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-016
- texto: La función enmascararDocumento de packages/domain deberá devolver 5 puntos seguidos de los últimos 3 caracteres del documento, o solo puntos si tiene menos de 3 caracteres.

### REQ-S14-037
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S14-008
- texto: Los reportes no deberán ofrecer exportación a CSV ni a Excel.

### REQ-S14-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos proximoCobroFiltro, OPCIONES_PROXIMO_COBRO, venceHasta ni inscritoDesde.

### REQ-S14-039
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-reportes.mjs encuentra alguno de los términos de REQ-S14-038, deberá terminar con código distinto de cero.

### REQ-S14-040
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-reportes.mjs encuentra alguno de los términos de REQ-S14-038, deberá nombrar archivo, línea y término.

### REQ-S14-041
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-reportes.mjs en cada pull request.

## 2. Comportamiento

### BEH-S14-001
- cubre: REQ-S14-001, REQ-S14-002, REQ-S14-004
- categoria: feliz
- dado: hoy el 2026-11-12 en Lima y cuatro miembros: A vence el 2026-11-02, B vence el 2026-11-12, C vence el 2026-11-20 y D vence el 2026-10-01 pero está eliminado
- cuando: se ejecuta listarMorosos
- entonces: devuelve solo a A con 10 días de atraso; B (vence hoy) no es moroso, C no vence aún y D no aparece por estar eliminado

### BEH-S14-002
- cubre: REQ-S14-003
- categoria: borde
- dado: un miembro sin fecha de vencimiento no eliminado, otro igual eliminado y otro con vencimiento anterior a hoy
- cuando: se ejecuta listarMorosos
- entonces: «Sin primer cobro» trae solo al primero, y los morosos solo al tercero

### BEH-S14-003
- cubre: REQ-S14-005, REQ-S14-007, REQ-S14-004
- categoria: feliz
- dado: hoy el 2026-11-12 y miembros que vencen el 2026-11-11, el 2026-11-12, el 2026-11-19, el 2026-11-20 y el 2026-11-15 (este eliminado)
- cuando: se ejecuta listarPorVencer sin indicar N
- entonces: devuelve a quien vence el 12 (0 días) y a quien vence el 19 (7 días), en ese orden; el que venció el 11, el que vence el 20 y el eliminado no aparecen

### BEH-S14-004
- cubre: REQ-S14-006
- categoria: error
- dado: valores de N de 0, 1, 30, 31, 7.5 y «siete»
- cuando: se ejecuta listarPorVencer con cada uno
- entonces: 1 y 30 se aceptan y los demás lanzan RangoInvalidoError sin consultar miembros

### BEH-S14-005
- cubre: REQ-S14-008, REQ-S14-009, REQ-S14-010, REQ-S14-054
- categoria: feliz
- dado: un moroso «Rosa Pérez», código «0012», documento «12345678», celular «987654321», plan «1 mes», vencido el 2026-11-02, con un cobro no anulado de «120.00» pagado el 2026-10-03 y registrado ese día, y un cobro anulado de «150.00» pagado el 2026-11-03 y registrado después (mayor Pago.creadoEn)
- cuando: se ejecuta listarMorosos
- entonces: la fila trae «Rosa Pérez», «0012», «•••••678», «987654321», «1 mes», vencimiento 02/11/2026, 10 días y último cobro 03/10/2026 por «S/ 120.00» (el no anulado de mayor creadoEn, no el anulado más reciente); un miembro sin cobros trae el último cobro vacío

### BEH-S14-006
- cubre: REQ-S14-011, REQ-S14-044
- categoria: borde
- dado: tres morosos: «Beto» con 20 días, «Ana» con 20 días y «Carla» con 5 días, y tres por vencer que vencen en 3, 3 y 1 día
- cuando: se ejecutan listarMorosos y listarPorVencer
- entonces: morosos: «Ana», «Beto», «Carla»; por vencer: el de 1 día primero y los de 3 días por nombre

### BEH-S14-007
- cubre: REQ-S14-012, REQ-S14-045
- categoria: borde
- dado: 501 morosos, 501 miembros sin primer cobro y 501 que vencen en los próximos 7 días, y luego 500 de cada uno
- cuando: se ejecutan listarMorosos y listarPorVencer
- entonces: con 501 cada lista devuelve 500 filas con su hayMas verdadero (las listas de morosos y de «Sin primer cobro» tienen cada una su propio hayMas); con 500 devuelve 500 con hayMas falso

### BEH-S14-008
- cubre: REQ-S14-013
- categoria: feliz
- dado: 502 morosos con precioPlan «0.10» cada uno
- cuando: se ejecuta listarMorosos
- entonces: devuelve 500 filas con hayMas verdadero y la renovación estimada es «50.20» (todos los 502, no solo los devueltos), sin errores de coma flotante; con precios «120.00», «200.00» y «0.10» la suma es «320.10»

### BEH-S14-009
- cubre: REQ-S14-014, REQ-S14-015, REQ-S14-042, REQ-S14-027
- categoria: feliz
- dado: 300 morosos con cobros, un contador de consultas del repositorio y el reloj del sistema fijado primero a un instante y luego a otro distinto
- cuando: se ejecutan listarMorosos y listarPorVencer con el día de hoy de Lima como argumento, y obtenerIngresosPorPeriodo con un rango fijo, en cada reloj
- entonces: cada caso de uso hace una sola consulta del repositorio y el resultado es idéntico con los dos relojes

### BEH-S14-010
- cubre: REQ-S14-016, REQ-S14-017, REQ-S14-023, REQ-S14-046
- categoria: feliz
- dado: cobros de «120.00» el 2026-11-01 a las 11:30 p. m. de Lima, de «200.00» el 2026-11-02 a las 12:10 a. m. de Lima y de «0.10» el 2026-11-02 a las 10:00 a. m.
- cuando: se pide el ingreso por día del 2026-11-01 al 2026-11-02 y por mes
- entonces: por día: 01/11 «120.00» y 02/11 «200.10»; por mes: noviembre «320.10»; el cobro de las 11:30 p. m. cae en el 1 y el de las 12:10 a. m. en el 2; todos los montos son cadenas de dos decimales

### BEH-S14-011
- cubre: REQ-S14-018, REQ-S14-019
- categoria: feliz
- dado: en un día, una membresía de «120.00» por Yape, un cambio de plan de «11.11» por Efectivo, y una venta de 3 aguas por «7.50» en Efectivo
- cuando: se pide el ingreso de ese día
- entonces: total «138.61»; por método: Yape «120.00» y Efectivo «18.61»; por concepto: membresía «120.00», cambio de plan «11.11» y producto «7.50»

### BEH-S14-012
- cubre: REQ-S14-020, REQ-S14-021, REQ-S14-016
- categoria: feliz
- dado: un cobro de «120.00» anulado, otro de «120.00» de un miembro eliminado y otro de «50.00» normal en un día, y en otro día solo un cobro anulado de «80.00»
- cuando: se pide el ingreso del período
- entonces: el día con tres cobros suma «170.00» (el anulado no suma y el del eliminado sí) y el día con solo un cobro anulado aparece con total «0.00»

### BEH-S14-013
- cubre: REQ-S14-022
- categoria: error
- dado: rangos de 367 días por día, de 366 días por día contando ambos extremos, de 37 meses por mes, de 36 meses por mes y uno con la fecha inicial posterior a la final
- cuando: se pide el ingreso con cada rango
- entonces: se aceptan 366 días y 36 meses y los otros tres lanzan RangoInvalidoError sin leer pagos

### BEH-S14-014
- cubre: REQ-S14-024
- categoria: feliz
- dado: ventas de «Agua 600 ml» (3 + 2 unidades a «2.50»), de «Guantes» (1 a «15.00») y un cobro anulado de «Agua 600 ml»
- cuando: se pide el ingreso del rango
- entonces: las ventas por producto son «Guantes», 1 unidad, «15.00» primero y «Agua 600 ml», 5 unidades, «12.50» después, en orden de monto descendente; el anulado no suma

### BEH-S14-015
- cubre: REQ-S14-025, REQ-S14-047, REQ-S14-026
- categoria: borde
- dado: tres cobros: una boleta de «120.00», una factura de «200.00» y uno sin comprobante de «50.00», con el interruptor de comprobantes encendido y luego apagado
- cuando: se pide el ingreso del rango en cada estado
- entonces: encendido: BOLETA «120.00», FACTURA «200.00» y sin comprobante «50.00»; apagado: el reporte, la impresión y la respuesta no contienen ningún dato de comprobante

### BEH-S14-016
- cubre: REQ-S14-028, REQ-S14-048, REQ-S14-029, REQ-S14-030
- categoria: feliz
- dado: la página /pagos con un rango del 01/11/2026 al 12/11/2026, el nombre del negocio «Adhara Fit» en la configuración y el interruptor de comprobantes encendido y luego apagado
- cuando: se abre la vista previa de impresión
- entonces: la hoja es A4, el encabezado muestra «Adhara Fit», el rango y la fecha y hora de impresión del momento en que se generó la página, no hay menús, filtros ni botones, y la columna de comprobante aparece solo con el interruptor encendido

### BEH-S14-017
- cubre: REQ-S14-031, REQ-S14-049, REQ-S14-050, REQ-S14-032, REQ-S14-036, REQ-S14-053, REQ-S14-037
- categoria: feliz
- dado: el menú y las tres páginas de reportes
- cuando: el administrador abre cada una, las muestra en la vista previa de impresión y revisa las acciones disponibles
- entonces: «Reportes» ofrece Morosos, Por vencer e Ingresos; las tres se imprimen en A4 con el mismo encabezado de /pagos y sin menús, filtros ni botones; los montos y fechas salen con el formato de S-03 y S-02 y no hay opción de exportar a CSV ni Excel

### BEH-S14-018
- cubre: REQ-S14-033, REQ-S14-043
- categoria: feliz
- dado: la lista de miembros
- cuando: el administrador la abre
- entonces: no hay filtros de próximo cobro, vencidos hasta ni inscritos desde, y hay enlaces a los reportes de morosos y por vencer

### BEH-S14-019
- cubre: REQ-S14-034, REQ-S14-052
- categoria: feliz
- dado: una base migrada
- cuando: se consulta el catálogo de índices
- entonces: existen el índice sobre Pago(fechaPago) y el compuesto sobre Miembro(estado, fechaVencimiento)

### BEH-S14-020
- cubre: REQ-S14-035
- categoria: error
- dado: peticiones sin sesión, con sesión vencida y de un administrador desactivado
- cuando: llegan a las rutas, acciones y páginas de los reportes
- entonces: todas se rechazan antes de leer datos

### BEH-S14-021
- cubre: REQ-S14-038, REQ-S14-039, REQ-S14-040
- categoria: error
- dado: un archivo por cada uno de los cuatro términos de REQ-S14-038
- cuando: se ejecuta tools/verificar-reportes.mjs
- entonces: termina con código distinto de cero y nombra archivo, línea y término de cada uno

### BEH-S14-022
- cubre: REQ-S14-041
- categoria: error
- dado: un pull request que agrega proximoCobroFiltro en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-reportes.mjs falla y queda en rojo

### BEH-S14-023
- cubre: REQ-S14-016, REQ-S14-020
- categoria: concurrencia
- dado: un reporte de ingresos del día de hoy ejecutándose mientras se registra una anulación de un cobro de ese día, con una barrera
- cuando: terminan las dos operaciones
- entonces: el reporte devuelve el estado anterior o el posterior a la anulación completo, nunca un total que cuente el cobro y su anulación a la vez ni una mezcla parcial de los totales

### BEH-S14-024
- cubre: REQ-S14-051
- categoria: feliz
- dado: 150 miembros, 60 de ellos del plan «1 mes»
- cuando: se pide GET api/miembros con planId del plan «1 mes» y con q «an»
- entonces: devuelve solo miembros del plan «1 mes» que cumplen q, filtrados en el servidor, con el tope de 100 y hayMas

### BEH-S14-025
- cubre: REQ-S14-054
- categoria: borde
- dado: documentos «12345678», «123», «12» y vacío
- cuando: se aplica enmascararDocumento a cada uno
- entonces: devuelve «•••••678», «•••••123», «••» y «»; el segundo conserva sus 3 caracteres y el tercero y el cuarto no revelan nada

## 3. Invariantes

### INV-S14-001
- propiedad: ningún miembro eliminado aparece en morosos ni por vencer, y sus cobros no anulados siempre suman en los ingresos
- mecanismo: test-propiedad
- deteccion: sobre 50 conjuntos de miembros y cobros generados con un generador congruencial lineal de semilla fija escrito en la prueba (con eliminados, anulados, sin vencimiento y vencimientos alrededor de hoy), ningún eliminado está en las listas y el total de ingresos de obtenerIngresosPorPeriodo es la suma de los cobros no anulados de todos los miembros
- protege: REQ-S14-004, REQ-S14-020, REQ-S14-021

### INV-S14-002
- propiedad: los totales de un período cuadran por método, por concepto, por producto y por comprobante
- mecanismo: test-propiedad
- deteccion: sobre los mismos 50 conjuntos generados, para cada período y para el rango, total = suma por método = suma por concepto; la suma de las ventas por producto = total del concepto producto; y con comprobantes encendido, la suma por tipo de comprobante más los cobros sin comprobante = total, todo comparado con dinero.ts
- protege: REQ-S14-016, REQ-S14-018, REQ-S14-019, REQ-S14-023, REQ-S14-024, REQ-S14-025, REQ-S14-047

### INV-S14-003
- propiedad: los morosos y los que vencen pronto nunca se solapan
- mecanismo: test-propiedad
- deteccion: sobre los mismos conjuntos y con N de 1 a 30, la intersección de listarMorosos y listarPorVencer es vacía
- protege: REQ-S14-001, REQ-S14-005

### INV-S14-004
- propiedad: los términos de los filtros heredados no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-reportes.mjs termina con código distinto de cero y lista archivo:línea y término
- protege: REQ-S14-033, REQ-S14-038, REQ-S14-039, REQ-S14-040

## 4. Criterios de aceptación

### AC-S14-001
- enlaza: REQ-S14-001, REQ-S14-002, REQ-S14-003, REQ-S14-004, REQ-S14-005, REQ-S14-007, REQ-S14-020, REQ-S14-021, BEH-S14-001, BEH-S14-002, BEH-S14-003, INV-S14-001, INV-S14-003
- metodo: integracion
- procedimiento: con una base efímera y hoy fijado en el 2026-11-12, crear los miembros de BEH-S14-001 a BEH-S14-003, ejecutar listarMorosos y listarPorVencer, y repetir sobre 50 conjuntos con semilla fija comprobando la exclusión de eliminados, la ausencia de intersección y, con obtenerIngresosPorPeriodo, que el total sea la suma de los cobros no anulados de todos los miembros
- esperado: las listas, los días, la lista «Sin primer cobro» y el orden coinciden con los comportamientos, y las propiedades se cumplen en los 50 conjuntos
- test: pendiente

### AC-S14-002
- enlaza: REQ-S14-006, BEH-S14-004
- metodo: unitario
- procedimiento: ejecutar listarPorVencer con N de 0, 1, 30, 31, 7.5 y «siete» con un repositorio simulado que cuenta consultas
- esperado: 1 y 30 se aceptan, los demás lanzan ParametroInvalidoError y el repositorio recibe 0 consultas en esos casos
- test: pendiente

### AC-S14-003
- enlaza: REQ-S14-008, REQ-S14-009, REQ-S14-010, REQ-S14-011, REQ-S14-012, REQ-S14-013, REQ-S14-044, REQ-S14-045, BEH-S14-005, BEH-S14-006, BEH-S14-007, BEH-S14-008
- metodo: integracion
- procedimiento: crear los datos de BEH-S14-005 a BEH-S14-008 y leer las filas, el orden, los topes con 500 y 501 filas en cada lista y la renovación estimada con 502 morosos
- esperado: los campos, el documento «•••••678», el último cobro no anulado de mayor creadoEn, el orden, los hayMas y «50.20» y «320.10» coinciden con los comportamientos
- test: pendiente

### AC-S14-004
- enlaza: REQ-S14-014, REQ-S14-015, REQ-S14-027, REQ-S14-042, BEH-S14-009
- metodo: integracion
- procedimiento: con 300 morosos y un contador de consultas del repositorio, fijar el reloj del sistema con los temporizadores simulados de vitest a dos instantes distintos y ejecutar los tres casos de uso con los argumentos de BEH-S14-009 en cada uno
- esperado: cada caso de uso hace una sola consulta y los resultados son idénticos con los dos relojes
- test: pendiente

### AC-S14-005
- enlaza: REQ-S14-016, REQ-S14-017, REQ-S14-023, REQ-S14-046, REQ-S14-024, REQ-S14-025, REQ-S14-047, BEH-S14-010, INV-S14-002
- metodo: integracion
- procedimiento: registrar los cobros de BEH-S14-010 con fechas de pago de Lima, pedir el ingreso por día y por mes, y repetir sobre los 50 conjuntos comprobando las identidades de INV-S14-002
- esperado: los totales por día y por mes coinciden con BEH-S14-010, son cadenas de dos decimales y las propiedades se cumplen
- test: pendiente

### AC-S14-006
- enlaza: REQ-S14-018, REQ-S14-019, REQ-S14-020, REQ-S14-021, REQ-S14-024, BEH-S14-011, BEH-S14-012, BEH-S14-014
- metodo: integracion
- procedimiento: crear los cobros de BEH-S14-011, BEH-S14-012 y BEH-S14-014 (membresía, cambio de plan con su registro de auditoría, ventas, anulados, un día con solo un anulado y un miembro eliminado) y pedir el ingreso
- esperado: los totales por método, por concepto, el total del período, el día con total «0.00» y las ventas por producto coinciden con los comportamientos
- test: pendiente

### AC-S14-007
- enlaza: REQ-S14-022, BEH-S14-013
- metodo: unitario
- procedimiento: ejecutar obtenerIngresosPorPeriodo con los cinco rangos de BEH-S14-013 con un repositorio simulado que cuenta lecturas
- esperado: 366 días y 36 meses se aceptan y los otros tres lanzan RangoInvalidoError con 0 lecturas
- test: pendiente

### AC-S14-008
- enlaza: REQ-S14-025, REQ-S14-026, BEH-S14-015
- metodo: integracion
- procedimiento: crear los tres cobros de BEH-S14-015, pedir el ingreso y las respuestas de los reportes con el interruptor de comprobantes encendido y apagado
- esperado: encendido trae los tres totales por tipo y sin comprobante; apagado no trae ningún campo ni texto de comprobante
- test: pendiente

### AC-S14-009
- enlaza: REQ-S14-028, REQ-S14-029, REQ-S14-030, REQ-S14-031, REQ-S14-048, REQ-S14-049, REQ-S14-050, BEH-S14-016, BEH-S14-017
- metodo: manual
- procedimiento: abrir /pagos con el rango del 01/11/2026 al 12/11/2026 y las tres páginas de reportes, mostrar cada una en la vista previa de impresión del navegador con el interruptor de comprobantes encendido y apagado, y contar menús, filtros y botones
- esperado: cada hoja es A4 con el encabezado de BEH-S14-016, sin menús, filtros ni botones, y la columna de comprobante en /pagos solo con el interruptor encendido
- test: pendiente

### AC-S14-010
- enlaza: REQ-S14-036, REQ-S14-053, BEH-S14-017
- metodo: manual
- procedimiento: abrir las tres páginas de reportes y revisar los formatos de montos y fechas
- esperado: montos con «S/» y dos decimales y fechas con dd/mm/aaaa
- test: pendiente

### AC-S14-011
- enlaza: REQ-S14-034, REQ-S14-052, BEH-S14-019
- metodo: sql
- procedimiento: consultar el catálogo de índices de una base migrada por Pago(fechaPago) y Miembro(estado, fechaVencimiento)
- esperado: ambos índices existen
- test: pendiente

### AC-S14-012
- enlaza: REQ-S14-035, BEH-S14-020
- metodo: integracion
- procedimiento: enviar a /reportes/morosos, /reportes/por-vencer, /reportes/ingresos y /pagos, y a las acciones de esas páginas, peticiones sin sesión, con sesión vencida y de un administrador desactivado, con un contador de lecturas del repositorio
- esperado: todas se rechazan con 0 lecturas del repositorio y la búsqueda estática de exigirSesion en cada página y acción la encuentra antes de cualquier lectura
- test: pendiente

### AC-S14-013
- enlaza: REQ-S14-016, REQ-S14-020, BEH-S14-023
- metodo: integracion
- procedimiento: con una barrera, lanzar con Promise.all el reporte de ingresos de hoy y la anulación de un cobro de hoy, en cada orden
- esperado: el reporte devuelve el estado completo anterior o posterior a la anulación y nunca una mezcla
- test: pendiente

### AC-S14-014
- enlaza: REQ-S14-038, REQ-S14-039, REQ-S14-040, BEH-S14-021, INV-S14-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-reportes.mjs con un árbol por cada uno de los cuatro términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los cuatro términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S14-015
- enlaza: REQ-S14-041, BEH-S14-022
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue proximoCobroFiltro en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-reportes.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S14-016
- enlaza: REQ-S14-032, REQ-S14-033, REQ-S14-037, REQ-S14-043, REQ-S14-051, BEH-S14-018, BEH-S14-024
- metodo: integracion
- procedimiento: leer la definición del menú, buscar con la API de typescript en la lista de miembros los filtros retirados y los enlaces a los reportes, buscar rutas, acciones o encabezados de tipo text/csv o xlsx, y pedir GET api/miembros con planId y q sobre 150 miembros
- esperado: el menú trae Morosos, Por vencer e Ingresos bajo «Reportes», la lista no trae los tres filtros y enlaza los reportes, no existe exportación, y la respuesta filtra por plan y por q en el servidor con tope de 100 y hayMas
- test: pendiente

### AC-S14-017
- enlaza: REQ-S14-054, BEH-S14-025
- metodo: unitario
- procedimiento: ejecutar enmascararDocumento con «12345678», «123», «12» y la cadena vacía
- esperado: devuelve «•••••678», «•••••123», «••» y «»
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de `/pagos` (S-08) y de la lista de miembros; (2) `tools/verificar-reportes.mjs` y sus pruebas, con el filtro heredado en su lista de exenciones, que se achica en cada paso; (3) índices `Pago(fechaPago)` y `Miembro(estado, fechaVencimiento)` en el esquema; (4) puerto de lectura de reportes y su repositorio con Drizzle y la suite de contrato, una consulta por reporte; (5) casos de uso `listarMorosos`, `listarPorVencer` y `obtenerIngresosPorPeriodo` con sus pruebas, incluidas las propiedades y la concurrencia; (6) páginas `/reportes/*` y la entrada del menú; (7) estilos de impresión comunes, encabezado y columna de comprobante en `/pagos`; (8) retiro de los filtros de fecha de `ListaMiembros.tsx` («próximo cobro», «vencidos hasta» e «inscritos desde», que S-13 ya no puede sostener en el cliente) con el filtro por plan en el servidor y los enlaces a los reportes, y retiro de la exención; `diasHastaVencimiento` se conserva para la insignia de días; (9) paso del CI.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la propia prueba, una base efímera y una barrera que fija el orden de las transacciones; no hay dependencias nuevas.
- Los casos de uso reciben el día de hoy de Lima como argumento (REQ-S14-015) para probarlos con un reloj fijo.
- AC-S14-009, AC-S14-010 y AC-S14-015 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15) con los índices nuevos.
- **Enmiendas que se registran al aprobar S-14:**
  - S-08: `/pagos` suma los estilos de impresión y el encabezado (REQ-S14-028 a REQ-S14-030, REQ-S14-048); la consulta única de REQ-S08-037 trae además el comprobante cuando el interruptor está encendido; `obtenerReporteCobros` reutiliza `RangoInvalidoError` de S-14; el botón de imprimir se conserva.
  - S-01 y S-23: las rutas `/reportes/*` se clasifican como «sesión» en `tools/contrato-permisos.mjs` y llaman a `exigirSesion`.
  - S-04: `miembros/vencimiento.tsx` (a cargo de S-04) conserva `diasHastaVencimiento`.
  - S-09 y S-11 y S-12: los traspasos a S-14 (eliminados, ventas por producto y reporte por tipo de comprobante) quedan cumplidos.
  - S-13: la lista de miembros deja de ofrecer los filtros de fecha; el filtro por plan pasa a ser el parámetro `planId` del servidor; `enmascararDocumento` es la función compartida del enmascarado (también la usa S-21).
  - S-15: el baseline incluye `Pago(fechaPago)` y `Miembro(estado, fechaVencimiento)`.
  - S-22: REQ-S22-007 y AC-S22-003 suman el repositorio de reportes y su suite de contrato.
  - `docs/06-modelo-datos-cambios.md`, `COBERTURA-RF.md` (RF-36, RF-62) y `BACKLOG-SPECS.md`: nota de que S-14 cubre los reportes.
- **Traspasos:** S-17 (tiempo de respuesta con datos reales) y una spec futura para el tablero (RF-63) y los recordatorios (RF-64) si el propietario los pide.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Sin turnos ni arqueo, el reporte por período es la única forma de cuadrar el dinero; un cobro mal clasificado distorsiona el total por concepto. Mitigación: la clasificación es la de S-08 y la propiedad INV-S14-002 comprueba que los totales cuadran.
- «Moroso» se calcula solo con el vencimiento; un miembro que no renovó ni vuelve sigue apareciendo indefinidamente. Mitigación: el propietario puede eliminarlo (S-09); el orden por atraso lo deja al final de la atención.
- Los reportes revelan datos personales (nombre, celular y documento enmascarado) a quien imprime la hoja. Mitigación: el documento sale enmascarado y la impresión es una acción deliberada del administrador.
- El tope de 500 filas oculta casos si hubiera más; hayMas lo señala. Mitigación: Adhara Fit tiene un volumen del orden de cientos.
- El rendimiento con miles de miembros y decenas de miles de pagos no está medido. Mitigación: una consulta por reporte, índices nuevos y medición en S-17.
- «Renovación estimada» podría leerse como una deuda. Mitigación: su rótulo dice «estimada» y no hay deudas en el sistema.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Moroso es quien tiene el vencimiento anterior a hoy, y quien vence hoy todavía no lo es? Default: sí (SUP-S14-001).
- ¿«Por vencer» usa 7 días por defecto, ajustable de 1 a 30? Default: sí (SUP-S14-002).
- ¿Los miembros que nunca tuvieron un cobro van en una lista aparte («Sin primer cobro»)? Default: sí (SUP-S14-001).
- ¿Los ingresos se muestran por día o por mes, por método y por concepto, con las ventas por producto? Default: sí (SUP-S14-005 y SUP-S14-006).
- ¿No hace falta exportar a CSV o Excel, basta imprimir o guardar en PDF? Default: sí (SUP-S14-008).
- ¿Se retiran los filtros de fecha del listado de miembros («próximo cobro», «vencidos hasta» e «inscritos desde») y los reemplazan los reportes? Default: sí (SUP-S14-009).
- ¿Un día con solo cobros anulados aparece con total 0.00, como en el historial de S-08? Default: sí (SUP-S14-011).

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura, sin ejecutar `spec-lint`), 2026-11-12, sobre el primer borrador. Veredicto global: **REQUIERE CAMBIOS**. Resumen fiel:

> | # | Comprobación | Veredicto | Hallazgo principal |
> |---|---|---|---|
> | 1 | Cabecera y ADR | NO CUMPLE (menor) | faltaban ADR-013 y S-06 |
> | 2 | REQ | NO CUMPLE | orígenes equivocados (ADR-018 para los eliminados, RF-36 para ingresos); REQ-025 con tipo equivocado; REQ-011, 012, 023, 025, 028, 031, 034 y 036 compuestos; `RangoInvalidoError` sin definir |
> | 3 | Cobertura | NO CUMPLE (parcial) | INV-001 sin prueba de ingresos; INV-002 sin las identidades de producto y comprobante; sin escenario de concurrencia para las listas |
> | 4 | AC | NO CUMPLE (menor) | BEH-005 no demostraba que el anulado se excluye y «último» sin criterio; AC-012 sin enumerar rutas ni métrica; AC-004 sin cómo detectar el reloj; REQ-015 desalineado con BEH-009; varios REQ de interfaz solo con AC manual |
> | 5 | Hechos | NO CUMPLE (menor) | `diasHastaVencimiento` también sirve a la insignia de días; los filtros «Vencidos hasta», «Inscritos desde» y por plan también son del cliente; enmascarado sin función; falta línea en `pagos/page.tsx` |
> | 6 | Vaguedad y alcance | CUMPLE (observación) | la herramienta nueva no estaba justificada |
> | 7 | Escenarios | NO CUMPLE | día con solo anulados, extremos del rango, tope y renovación estimada, miembros sin plan, comparación de días de Lima, origen del encabezado, volumen de 36 meses |

### Conciliación del autor
Los hallazgos se verificaron contra el Repo A y las specs (`ListaMiembros.tsx:116-137,282`, `vencimiento.tsx:3,16`, S-08 SUP-S08-012/013 y REQ-S08-039, S-07, S-13) y resultaron ciertos; ninguno se rechazó. La spec pasó de 43 REQ a 54, de 23 BEH a 25, de 4 INV a 4 y de 15 AC a 17.

| Fila | Corrección |
|---|---|
| 1 | `adrs` suma ADR-013 y `depende_de` suma S-06 |
| 2 | Orígenes a ADR-013 (REQ-004, REQ-021) y ADR-018 (REQ-016); REQ-025 y REQ-047 con tipo `mientras`; REQ divididos (011/044, 012/045, 023/046, 025/047, 028/048, 031/049/050, 033/043, 034/052, 036/053); `RangoInvalidoError` y `ParametroInvalidoError` definidos (SUP-S14-015) |
| 3 | AC-001 ejecuta ingresos sobre los 50 conjuntos; INV-002 suma las identidades por producto y por comprobante; SUP-S14-017 explica por qué las listas no necesitan bloqueo |
| 4 | BEH-005 con anulado más reciente y distinto monto; «último» = mayor `Pago.creadoEn` (SUP-S14-010); AC-012 enumera páginas y mide lecturas; AC-004 usa temporizadores simulados; REQ-015 y BEH-009 alineados; AC-016 y AC-017 automatizan menú, filtros, exportación, planId y el enmascarado |
| 5 | 0.4 con `diasHastaVencimiento` (se conserva), los filtros «Vencidos hasta», «Inscritos desde» y por plan (REQ-033, REQ-051, SUP-S14-009), `pagos/page.tsx:4-8,16`; `enmascararDocumento` definido (REQ-054, SUP-S14-016) |
| 6 | 0.1 justifica `tools/verificar-reportes.mjs`; términos: `proximoCobroFiltro`, `OPCIONES_PROXIMO_COBRO`, `venceHasta`, `inscritoDesde` |
| 7 | SUP-S14-011 (día con solo anulados, ambos extremos), SUP-S14-012 (tope por lista y renovación de todos), SUP-S14-013 (días de Lima en una consulta), SUP-S14-014 (origen del encabezado), BEH-008, BEH-012, BEH-013 |
