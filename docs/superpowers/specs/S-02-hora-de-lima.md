---
id: S-02
estado: en-revision
adrs: ADR-016
depende_de: S-00, S-22
aprobada_por:
fecha_aprobacion:
---
# S-02 — Hora de Lima: un solo módulo de fechas, sin depender del huso del proceso y con formato peruano

## 0. Contexto y alcance

### 0.1 Problema
El código heredado piensa en la hora de Caracas (UTC-4) en tres capas (hecho, `docs/09` §3.3): el proceso fija `TZ=America/Caracas`, un módulo de fechas suma un desfase fijo de 4 horas y los formatos usan `es-VE`. El propietario confirmó el 2026-11-12 que el sistema usa la **hora de Lima** (UTC-5, sin horario de verano), y `docs/01` RNF-01 ya lo exige. Cambiar solo `TZ` dejaría el desfase fijo roto, así que S-02 reemplaza las tres capas con un único módulo `fechaLima` que no depende del huso del proceso. Decisión del propietario, sin ADR propio (lo registra esta spec y `docs/04` §4).

### 0.2 Dentro de alcance
- Módulo `packages/domain/utils/fechaLima.ts`, que reemplaza a `fechaCaracas.ts` con sus pruebas.
- Reemplazo de los getters y setters locales de fechas por funciones de `fechaLima` en los archivos de `apps` y `packages` que los usan.
- Formato peruano de fechas y horas con `es-PE` y `timeZone: "America/Lima"` en todo formateo.
- `TZ=America/Lima` en los 3 `Dockerfile`, como defensa adicional.
- `tools/verificar-fechas.mjs`, con su archivo de pruebas, que busca los patrones prohibidos.
- Pruebas de las funciones con tres husos de proceso.

### 0.3 Fuera de alcance
- Reglas de vencimiento y cobro (S-04) y cambio de plan (S-07): usan `fechaLima`, pero se reescriben allí.
- Tasa de cambio y el worker (S-10): sus archivos se renombran mecánicamente para que compilen, sin otro cambio.
- Idioma de los textos, que ya es español.
- Cambiar el huso de los dispositivos o del servidor de despliegue (S-17).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los `grep` excluyen `node_modules`, `generated` y `.next`.
- **Capa 1, huso del proceso:** `ENV TZ=America/Caracas` en `Dockerfile:42`, `apps/kiosk/Dockerfile:49` y `apps/vitrina/Dockerfile:37` (verificado con `grep -rn TZ= Dockerfile apps/*/Dockerfile`).
- **Capa 2, desfase codificado:** `packages/domain/utils/fechaCaracas.ts` (64 líneas) fija `timeZone: "America/Caracas"` en `:4` y `:40` y suma `4 * 3_600_000` en `:18` y `:57`; `diaCalendarioCaracas` (`:2`), `inicioDelDiaCaracas` (`:17`), `rangoDiaCaracas` (`:22`), `esCumpleanos` (`:30`) y `medianocheCaracasDeFechaUtc` (`:55`) cuelgan de eso; tiene 10 pruebas en `fechaCaracas.test.ts` (65 líneas) (verificado con `grep -n 3_600_000 packages/domain/utils/fechaCaracas.ts`).
- **Consumidores:** 14 archivos no de prueba importan `utils/fechaCaracas`, entre ellos 5 casos de uso, `miembros/actions.ts:21`, `vitrina/actions.ts:15`, `lib/tasaBcv.ts:11`, `apps/vitrina/components/Reproductor.tsx:9` y `apps/worker/src/actualizar-tasa.ts:14` (verificado con `grep -rIl "utils/fechaCaracas"`).
- **Getters locales:** 18 archivos no de prueba, fuera de `packages/db`, llaman a `getFullYear`, `getMonth`, `getDate`, `getDay`, `getHours`, `getMinutes`, `setHours`, `setDate`, `setMonth` o `setFullYear`, con 59 ocurrencias en total (verificado con `grep -rIlE`/`grep -rIcE`); el más cargado es `apps/web-admin/app/(panel)/fechas.ts` (`formatearFechaISO` y `inicioDelDia`, que dependen del `TZ` del proceso, `fechas.ts:1-12`). `packages/ui/components/InputFecha.tsx` y `SelectorRangoFechas.tsx` también los usan (inventario `tz_local_getters.txt`).
- **Formato:** 30 llamadas a `toLocale(Date|Time)?String`, de las cuales 27 no traen `timeZone` en la misma línea, y 31 líneas con `es-VE` en 21 archivos no de prueba (verificado con `grep -rIn` sobre `apps` y `packages`); `HistorialSala.tsx:35` fija `timeZone: "America/Caracas"`; el sufijo `T12:00:00` se usa en `caja/actions.ts`, `pagos/actions.ts`, `api/tasa-cambio/route.ts` y en `fechaCaracas.ts`.
- **Almacenamiento:** las fechas de calendario de `Miembro` (`fechaInscripcion`, `fechaNacimiento`, `fechaUltimoPago`, `fechaVencimiento`) y de `Suscripcion` (`inicio`, `fin`) son `DateTime`, no `Date`; solo `CambioPlanAuditoria.vencimientoAnterior` y `vencimientoNuevo` son `@db.Date` (`schema.prisma:416-417`). `miembros/actions.ts:160` guarda `fechaInscripcion` con `inicioDelDiaCaracas`, es decir 00:00 local.
- **Lima:** `Intl` de Node reconoce `America/Lima` y devuelve `GMT-05:00` en todas las fechas muestreadas entre 1995 y 2040 (verificado con `node -e` y `Intl.DateTimeFormat` con `timeZoneName: "longOffset"` en enero, abril, julio y octubre de cada año). El instante `2026-11-12T04:59:59.999Z` es el 11/11/2026 a las 23:59 de Lima y `05:00:00Z` es el 12/11/2026 a las 00:00; `es-PE` formatea ese instante como `12/11/2026` y, en formato corto, `12/11/26, 12:00 a. m.` (verificado con `node -e` y `Intl.DateTimeFormat`).
- No verificado: el huso de los dispositivos del local ni del servidor de producción.

### 0.5 Supuestos
- SUP-S02-001: la hora se muestra en formato de 12 horas con «a. m.» y «p. m.» (el formato por defecto de `es-PE`) y la fecha como `dd/mm/aaaa`. Default: ese formato; asumido, por validar.
- SUP-S02-002: las fechas de calendario (inscripción, nacimiento, vencimiento y similares) se guardan como el instante de las 00:00 de Lima de ese día, es decir las 05:00:00.000 UTC, como fija `docs/04` línea 45. Default: esa normalización; asumido, por validar.
- SUP-S02-003: el reloj de referencia del sistema es el del servidor; los dispositivos del local pueden tener cualquier huso, porque toda fecha se calcula y se muestra con la zona de Lima de forma explícita. Default: ese criterio; asumido, por validar.
- SUP-S02-004: los archivos que S-10 y S-20 retirarán después (worker, tasa de cambio, parte de la vitrina) se actualizan aquí solo con el renombrado mecánico de `fechaCaracas` a `fechaLima`. Default: renombrado sin otro cambio; asumido, por validar.
- SUP-S02-005: `tools/verificar-fechas.mjs` es una búsqueda por texto sobre el código; no entiende el contexto, de modo que los casos legítimos (por ejemplo `getUTCDate`) se distinguen por la ausencia del prefijo `get` local. Default: búsqueda por patrón; asumido, por validar.

## 1. Requisitos

### REQ-S02-001
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-01
- texto: El sistema deberá concentrar el cálculo de día calendario, inicio y fin de día, rango de un día y cumpleaños en packages/domain/utils/fechaLima.ts, que reemplaza a fechaCaracas.ts.

### REQ-S02-002
- tipo: ubicuo
- prioridad: MUST
- origen: DI-07
- texto: El módulo fechaLima deberá calcular con Intl.DateTimeFormat y la zona America/Lima, sin sumar ningún desfase codificado en milisegundos.

### REQ-S02-003
- tipo: ubicuo
- prioridad: MUST
- origen: DI-07
- texto: Las funciones de fechaLima deberán devolver el mismo resultado cuando el proceso corre con TZ=UTC, TZ=America/Lima y TZ=Asia/Tokyo.

### REQ-S02-004
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-01
- texto: El día calendario de Lima deberá comenzar a las 05:00:00.000 UTC y terminar a las 04:59:59.999 UTC del día siguiente.

### REQ-S02-005
- tipo: cuando
- prioridad: MUST
- origen: RNF-01
- texto: Cuando el sistema guarda una fecha de calendario, deberá guardarla como el instante de las 00:00 de Lima de ese día.

### REQ-S02-006
- tipo: ubicuo
- prioridad: MUST
- origen: DI-47
- texto: La función esCumpleanos deberá evaluar el cumpleaños con el día calendario de Lima del instante recibido.

### REQ-S02-007
- tipo: si-entonces
- prioridad: MUST
- origen: DI-07
- texto: Si una función de fechaLima recibe una fecha inválida entonces deberá lanzar un error explícito y no devolver una fecha con valor NaN.

### REQ-S02-008
- tipo: ubicuo
- prioridad: MUST
- origen: DI-07
- texto: El código de apps y packages, salvo las pruebas, no deberá llamar a getFullYear, getMonth, getDate, getDay, getHours, getMinutes, setHours, setDate, setMonth ni setFullYear sobre una fecha.

### REQ-S02-009
- tipo: ubicuo
- prioridad: MUST
- origen: H-05
- texto: Todo formateo de fecha u hora en apps y packages deberá indicar el locale es-PE y la zona America/Lima.

### REQ-S02-010
- tipo: cuando
- prioridad: MUST
- origen: RNF-01
- texto: Cuando el sistema muestra una fecha, deberá mostrarla como dd/mm/aaaa, por ejemplo 12/11/2026.

### REQ-S02-011
- tipo: cuando
- prioridad: MUST
- origen: RNF-01
- texto: Cuando el sistema muestra una hora, deberá mostrarla en formato de 12 horas con a. m. o p. m. en la hora de Lima.

### REQ-S02-012
- tipo: ubicuo
- prioridad: MUST
- origen: DI-07
- texto: Los 3 Dockerfile deberán fijar la variable de entorno TZ con el valor America/Lima.

### REQ-S02-013
- tipo: ubicuo
- prioridad: MUST
- origen: H-05
- texto: Los directorios apps y packages no deberán contener las cadenas America/Caracas, Caracas, es-VE, UTC-4 ni -04:00, salvo en archivos de prueba que comprueben su ausencia.

### REQ-S02-014
- tipo: cuando
- prioridad: MUST
- origen: RNF-01
- texto: Cuando una persona abre el panel desde un dispositivo con otro huso horario, el sistema deberá mostrar las fechas y horas en la hora de Lima.

### REQ-S02-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El archivo tools/verificar-fechas.mjs deberá fallar cuando encuentre en apps o packages un getter local de fecha, una llamada a toLocale sin la zona America/Lima, o alguna de las cadenas de REQ-S02-013.

### REQ-S02-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El módulo fechaLima deberá tener pruebas de borde para las 23:59:59.999 y las 00:00 de Lima, el 29 de febrero, el cambio de año y un instante cercano al cambio de día en UTC.

## 2. Comportamiento

- no_aplica: concurrencia — las funciones de fechaLima son puras y sin estado compartido

### BEH-S02-001
- cubre: REQ-S02-001, REQ-S02-004
- categoria: feliz
- dado: el instante 2026-11-12T15:30:00Z
- cuando: se pide el día calendario, el inicio y el fin de ese día en Lima
- entonces: el día es 2026-11-12, el inicio es 2026-11-12T05:00:00.000Z y el fin es 2026-11-13T04:59:59.999Z

### BEH-S02-002
- cubre: REQ-S02-004
- categoria: borde
- dado: los instantes 2026-11-12T04:59:59.999Z y 2026-11-12T05:00:00.000Z
- cuando: se pide el día calendario de Lima de cada uno
- entonces: el primero cae en 2026-11-11 y el segundo en 2026-11-12

### BEH-S02-003
- cubre: REQ-S02-016
- categoria: borde
- dado: el 29 de febrero de 2028 a las 12:00 de Lima, el 31 de diciembre de 2026 a las 23:59 de Lima (2027-01-01T04:59:00Z) y el 1 de enero de 2027 a las 00:00 de Lima (2027-01-01T05:00:00Z)
- cuando: se pide el día calendario y el rango de cada uno
- entonces: el 29 de febrero de 2028 existe y es su propio día, 2027-01-01T04:59:00Z sigue en 2026-12-31 y 2027-01-01T05:00:00Z comienza 2027-01-01

### BEH-S02-004
- cubre: REQ-S02-003
- categoria: borde
- dado: el proceso corriendo con TZ=UTC, TZ=America/Lima y TZ=Asia/Tokyo
- cuando: se ejecutan las funciones de fechaLima con el mismo instante
- entonces: las tres ejecuciones devuelven exactamente los mismos valores

### BEH-S02-005
- cubre: REQ-S02-005
- categoria: feliz
- dado: una inscripción hecha el 12 de noviembre de 2026 a las 22:00 de Lima
- cuando: se guarda su fecha de inscripción
- entonces: el valor guardado es 2026-11-12T05:00:00.000Z y se lee como 12/11/2026

### BEH-S02-006
- cubre: REQ-S02-006
- categoria: borde
- dado: un miembro nacido el 12 de noviembre de 1990, guardado a las 05:00 UTC, y el instante 2026-11-12T04:59:00Z
- cuando: se evalúa esCumpleanos para ese instante y para 2026-11-12T05:01:00Z
- entonces: el primer instante da falso (aún es el 11 de noviembre en Lima) y el segundo da verdadero

### BEH-S02-007
- cubre: REQ-S02-007
- categoria: error
- dado: una fecha inválida (new Date("no es fecha"))
- cuando: se la pasa a cualquier función de fechaLima
- entonces: la función lanza un error que nombra el valor recibido

### BEH-S02-008
- cubre: REQ-S02-008, REQ-S02-009, REQ-S02-013, REQ-S02-015
- categoria: error
- dado: un archivo de prueba con date.getHours(), otro con toLocaleDateString("es-VE") y otro con la cadena America/Caracas
- cuando: se ejecuta tools/verificar-fechas.mjs
- entonces: la herramienta falla y nombra archivo y línea de cada uno

### BEH-S02-009
- cubre: REQ-S02-010, REQ-S02-011
- categoria: feliz
- dado: el instante 2026-11-12T20:30:00Z
- cuando: el panel muestra su fecha y su hora
- entonces: se ve 12/11/2026 y 3:30 p. m.

### BEH-S02-010
- cubre: REQ-S02-014
- categoria: borde
- dado: un navegador configurado con la zona Asia/Tokyo
- cuando: abre el historial de pagos que contiene un pago del 2026-11-12T20:30:00Z
- entonces: el historial muestra 12/11/2026 y 3:30 p. m., no la hora de Tokio

### BEH-S02-011
- cubre: REQ-S02-012
- categoria: feliz
- dado: el árbol final
- cuando: se leen los 3 Dockerfile
- entonces: cada uno contiene ENV TZ=America/Lima y ninguno contiene America/Caracas

### BEH-S02-012
- cubre: REQ-S02-002
- categoria: error
- dado: una versión de fechaLima que suma 4 * 3_600_000 en vez de calcular con Intl
- cuando: se ejecuta la prueba de BEH-S02-001
- entonces: la prueba falla porque el inicio del día no es 05:00:00.000Z


## 3. Invariantes

### INV-S02-001
- propiedad: para cualquier instante, el resultado de las funciones de fechaLima es el mismo con TZ=UTC, TZ=America/Lima y TZ=Asia/Tokyo
- mecanismo: test-propiedad
- deteccion: la prueba de propiedad genera 1000 instantes entre 1990 y 2050 y compara los resultados de los tres husos; falla ante la primera diferencia
- protege: REQ-S02-002, REQ-S02-003

### INV-S02-002
- propiedad: para todo día calendario de Lima, el inicio es anterior al fin, el fin más 1 ms es el inicio del día siguiente y el día calendario del inicio y del fin es el mismo
- mecanismo: test-propiedad
- deteccion: la prueba de propiedad genera 1000 instantes y falla ante la primera violación
- protege: REQ-S02-004

### INV-S02-003
- propiedad: ningún archivo de apps ni packages, salvo pruebas, contiene un getter local de fecha, un toLocale sin zona o las cadenas de Caracas
- mecanismo: lint
- deteccion: tools/verificar-fechas.mjs devuelve al menos un archivo
- protege: REQ-S02-008, REQ-S02-009, REQ-S02-013, REQ-S02-015

### INV-S02-004
- propiedad: toda fecha de calendario guardada tiene la hora 05:00:00.000 en UTC
- mecanismo: asercion-dominio
- deteccion: la función que normaliza fechas de calendario lanza un error si el resultado no es 05:00:00.000Z
- protege: REQ-S02-005

## 4. Criterios de aceptación

### AC-S02-001
- enlaza: REQ-S02-001, REQ-S02-004, BEH-S02-001, BEH-S02-002, INV-S02-002
- metodo: unitario
- procedimiento: ejecutar las pruebas de fechaLima con 2026-11-12T15:30:00Z, 2026-11-12T04:59:59.999Z y 2026-11-12T05:00:00.000Z
- esperado: día 2026-11-12, inicio 2026-11-12T05:00:00.000Z y fin 2026-11-13T04:59:59.999Z para el primero; día 2026-11-11 para el segundo y 2026-11-12 para el tercero
- test: pendiente

### AC-S02-002
- enlaza: REQ-S02-002, REQ-S02-003, BEH-S02-004, BEH-S02-012, INV-S02-001
- metodo: unitario
- procedimiento: ejecutar las pruebas de fechaLima tres veces, con TZ=UTC, TZ=America/Lima y TZ=Asia/Tokyo, y la prueba de propiedad de 1000 instantes
- esperado: las tres ejecuciones pasan con los mismos valores y la versión con desfase codificado de BEH-S02-012 falla
- test: pendiente

### AC-S02-003
- enlaza: REQ-S02-016, BEH-S02-003
- metodo: unitario
- procedimiento: ejecutar las pruebas de borde con 2028-02-29, 2027-01-01T04:59:00Z, 2027-01-01T05:00:00Z y un instante a las 04:00 UTC de un día cualquiera
- esperado: 2028-02-29 es un día propio, 2027-01-01T04:59:00Z cae en 2026-12-31, 2027-01-01T05:00:00Z cae en 2027-01-01 y el instante de las 04:00 UTC cae en el día anterior de Lima
- test: pendiente

### AC-S02-004
- enlaza: REQ-S02-005, BEH-S02-005, INV-S02-004
- metodo: integracion
- procedimiento: con una base efímera, registrar una inscripción a las 22:00 de Lima del 12 de noviembre de 2026 con el proceso en TZ=UTC y en TZ=Asia/Tokyo, leer el valor guardado y probar la función de normalización con un instante que no sea las 05:00 UTC
- esperado: el valor guardado es 2026-11-12T05:00:00.000Z en ambos casos, se lee como 12/11/2026 y la función lanza error con el otro instante
- test: pendiente

### AC-S02-005
- enlaza: REQ-S02-006, BEH-S02-006
- metodo: unitario
- procedimiento: evaluar esCumpleanos con nacimiento 1990-11-12T05:00:00Z y los instantes 2026-11-12T04:59:00Z y 2026-11-12T05:01:00Z
- esperado: falso para el primero y verdadero para el segundo
- test: pendiente

### AC-S02-006
- enlaza: REQ-S02-007, BEH-S02-007
- metodo: unitario
- procedimiento: llamar a cada función exportada de fechaLima con new Date("no es fecha")
- esperado: cada llamada lanza un error que incluye el valor recibido
- test: pendiente

### AC-S02-007
- enlaza: REQ-S02-008, REQ-S02-009, REQ-S02-013, REQ-S02-015, BEH-S02-008, INV-S02-003
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-fechas.mjs con árboles de prueba que contienen date.getHours(), toLocaleDateString("es-VE"), la cadena America/Caracas, getUTCDate y toLocaleDateString con es-PE y America/Lima; después ejecutarlo sobre el árbol final
- esperado: falla con los tres primeros nombrando archivo y línea, pasa con los dos últimos y no encuentra nada en el árbol final
- test: pendiente

### AC-S02-008
- enlaza: REQ-S02-010, REQ-S02-011, BEH-S02-009
- metodo: unitario
- procedimiento: formatear 2026-11-12T20:30:00Z con el formateador único de fechas y de horas
- esperado: la fecha es 12/11/2026 y la hora es 3:30 p. m.
- test: pendiente

### AC-S02-009
- enlaza: REQ-S02-014, BEH-S02-010
- metodo: e2e
- procedimiento: abrir el historial de pagos con un navegador de prueba configurado en Asia/Tokyo, con un pago de 2026-11-12T20:30:00Z
- esperado: el historial muestra 12/11/2026 y 3:30 p. m.
- test: pendiente

### AC-S02-010
- enlaza: REQ-S02-012, BEH-S02-011
- metodo: unitario
- procedimiento: buscar en Dockerfile, apps/kiosk/Dockerfile y apps/vitrina/Dockerfile las cadenas TZ=America/Lima y America/Caracas
- esperado: cada archivo contiene la primera una vez y ninguno la segunda
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso): (1) pruebas de `fechaLima` con los casos de borde y la propiedad de tres husos, en rojo; (2) `fechaLima.ts`, que reemplaza a `fechaCaracas.ts` con las mismas funciones más la validación de fechas inválidas; (3) `tools/verificar-fechas.mjs` con sus pruebas; (4) un formateador único de fechas y horas en `packages/ui` o `packages/domain`, que usa `es-PE` y `America/Lima`; (5) reemplazo de los 18 archivos con getters locales, de las 27 llamadas `toLocale` sin zona y de las 31 líneas con `es-VE`; (6) `TZ` en los 3 `Dockerfile`; (7) activar la herramienta en el CI.
- Los componentes de navegador (`InputFecha`, `SelectorRangoFechas`) se prueban con la zona del navegador simulada en `Asia/Tokyo`.
- Sin dependencias nuevas: las pruebas de propiedad usan un generador pseudoaleatorio con semilla fija.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15. Los datos de ejemplo del seed usan fechas de calendario a las 05:00 UTC.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- `InputFecha` y `SelectorRangoFechas` leen el valor de un campo `type=date` del navegador; sin cuidado, el día cambia cerca de la medianoche. Mitigación: convertir siempre con `fechaLima` y probarlos con otro huso.
- La búsqueda de `tools/verificar-fechas.mjs` es por texto y puede dar falsos positivos (SUP-S02-005); los casos legítimos se distinguen por usar el prefijo `getUTC`.
- Los archivos que otras specs retiran (worker, tasa de cambio, vitrina) se tocan solo para renombrar y pueden quedar con lógica de Caracas en comentarios. Mitigación: REQ-S02-013 exige que ni los comentarios nombren a Caracas.
- Si algún dispositivo imprime o muestra fechas sin pasar por el formateador único, mostrará su hora local. Mitigación: la búsqueda de REQ-S02-015.
- Los tickets (ADR-006) y los reportes futuros deben usar el formateador único; queda como criterio de S-12 y S-14.

### 5.4 Preguntas abiertas
- ¿Prefieres la hora en formato de 24 horas (por ejemplo 15:30) en lugar de 3:30 p. m.? Default: 12 horas con a. m. y p. m. (SUP-S02-001).
- ¿La semana comienza el lunes en los reportes? Default: lunes (como hoy en `fechas.ts`, `inicioDeSemana`).
