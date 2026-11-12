---
id: S-02
estado: aprobada
adrs: ADR-016
depende_de: S-00, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-02 — Hora de Lima: un solo módulo de fechas, sin depender del huso del proceso y con formato peruano

## 0. Contexto y alcance

### 0.1 Problema
El código heredado piensa en la hora de Caracas (UTC-4) en tres capas (hecho, `docs/09` §3.3): el proceso fija `TZ=America/Caracas`, un módulo de fechas suma un desfase fijo de 4 horas y los formatos usan `es-VE`. El propietario confirmó el 2026-11-12 que el sistema usa la **hora de Lima** (UTC-5, sin horario de verano desde 1994), y `docs/01` RNF-01 y `docs/04` §4 ya lo exigen; por eso esta spec no lleva un ADR propio (el propietario puede pedirlo). Cambiar solo `TZ` dejaría el desfase fijo roto, así que S-02 reemplaza las tres capas con un único módulo `fechaLima` que no depende del huso del proceso, un formateador único y una herramienta que impide que vuelvan los patrones prohibidos. Para no hacer trabajo que otras specs rehacen, una lista cerrada de exenciones deja fuera los archivos que S-04, S-08, S-10 y S-20 reescriben o retiran; esos archivos siguen siendo correctos porque el proceso corre con `TZ=America/Lima`.

### 0.2 Dentro de alcance
- Módulo `packages/domain/utils/fechaLima.ts`, que reemplaza a `fechaCaracas.ts` y a su prueba, con las funciones de la tabla de 5.1.
- Formateador único de fechas y horas en `packages/ui` (lo usan también el kiosco y la vitrina, que no importan el dominio).
- Reemplazo de los getters locales, de `new Date(año, mes, día)` local, de `T12:00:00` sin zona y de los `toLocale*String` de fecha u hora en los archivos que no figuran en la lista de exenciones.
- `TZ=America/Lima` en los 3 `Dockerfile`.
- `tools/verificar-fechas.mjs` con sus pruebas y `tools/verificar-fechas.exenciones.json`, ejecutada en el CI.

### 0.3 Fuera de alcance
- Reglas de vencimiento y cobro (S-04), cambio de plan (S-07), registro de cobros y caja (S-08): usan `fechaLima`, pero se reescriben allí; sus archivos entran en la lista de exenciones.
- Tasa de cambio, padrón Excel y formato de dinero en bolívares (S-10 y S-03): sus archivos, incluidos `formatearBs.ts` y `FichaReposo.tsx`, entran en la lista de exenciones.
- Vitrina y TV (S-20 y S-21): sus archivos, incluido `apps/vitrina-tv/prueba/index.html`, entran en la lista de exenciones.
- `apps/worker`, que S-00 no importa.
- Las columnas `@db.Date` de `CambioPlanAuditoria`, que trata S-07.
- Idioma de los textos, que ya es español, y el huso de los dispositivos y del servidor (S-17).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los `grep` excluyen `node_modules`, `generated` y `.next`.
- **Capa 1, huso del proceso:** `ENV TZ=America/Caracas` en `Dockerfile:42`, `apps/kiosk/Dockerfile:49` y `apps/vitrina/Dockerfile:37` (verificado con `grep -rn TZ= Dockerfile apps/*/Dockerfile`).
- **Capa 2, desfase codificado:** `packages/domain/utils/fechaCaracas.ts` (64 líneas) fija `timeZone: "America/Caracas"` en `:4` y `:40` y suma `4 * 3_600_000` en `:18` y `:57` (verificado con `grep -n 3_600_000 packages/domain/utils/fechaCaracas.ts`); exporta `diaCalendarioCaracas` (`:2`, devuelve el día a las 00:00 UTC, «mismo formato que `TasaCambio.fecha`»), `sumarDias` (`:12`), `inicioDelDiaCaracas` (`:17`), `rangoDiaCaracas` (`:22`), `esCumpleanos` (`:30`, que da falso ante `null`, `fechaCaracas.test.ts:9`, y trata el 29 de febrero según el comentario de `:27-29`) y `medianocheCaracasDeFechaUtc` (`:55`, con lógica de la era UTC-4:30). Tiene 10 pruebas en `fechaCaracas.test.ts` (65 líneas).
- **Consumidores:** 12 archivos no de prueba importan `utils/fechaCaracas`, uno de ellos en `apps/worker`, que S-00 no importa (verificado con `grep -rIl "utils/fechaCaracas" apps packages`).
- **Getters locales:** 18 archivos no de prueba, fuera de `packages/db`, llaman a `getFullYear`, `getMonth`, `getDate`, `getDay`, `getHours`, `getMinutes`, `setHours`, `setDate`, `setMonth` o `setFullYear`, con 59 ocurrencias (verificado con `grep -rIcE`): `fechas.ts` (10), `SelectorRangoFechas.tsx` (8), `InputFecha.tsx` (6), `RegistrarPago.ts` (5), `ReglaAbono.ts` (4), `pagos/page.tsx`, `FiltroFechasHistorico.tsx`, `miembros/[id]/page.tsx`, `FormularioMiembro.tsx` y `CampoFechaCobro.tsx` (3 cada uno), `resolverCobroPasado.ts`, `vencimiento.tsx` y `caja/actions.ts` (2 cada uno), y `fechaCaracas.ts`, `CalcularVencimientoPlan.ts`, `ActualizarMiembro.ts`, `pagos/actions.ts` y `proyeccionRenovacion.ts` (1 cada uno). Hay además 3 usos de `new Date(año, mes, día)` local (`fechas.ts:38`, `:42` y `InputFecha.tsx:15`; verificado con `grep -rInE "new Date\("`).
- **Sufijo sin zona:** `T12:00:00` sin `Z` en `caja/actions.ts:372` y `:525`, `pagos/actions.ts:162` y `:196` y `api/tasa-cambio/route.ts:23` (verificado con `grep -rInE "T12:00:00"`).
- **Formato:** 30 líneas con `toLocale(Date|Time)?String`, de las cuales 27 no traen `timeZone` en la misma línea y 24 de esas son de fecha u hora (las otras 3 son de dinero: `formatearBs.ts:2`, `FichaReposo.tsx:6` y `ModalHistorialTasas.tsx:30`); 31 líneas con `es-VE` en 21 archivos; `HistorialSala.tsx:35` fija `timeZone: "America/Caracas"` (verificado con `grep -rIn`). Otros usos del repositorio: `{ day: "2-digit", month: "2-digit", year: "numeric" }` en `AccessCard.tsx:21` y `dateStyle: "short"` en `pagos/page.tsx:133`, que da año de dos dígitos.
- **Cadenas de Caracas:** 27 archivos no de prueba y 71 líneas contienen `Caracas`, `UTC-4` o `-04:00` (verificado con `grep -rInE "Caracas|UTC-4|-04:00"` sobre `.ts`, `.tsx`, `.html` y `.prisma`).
- **Almacenamiento:** las fechas de calendario de `Miembro` (`fechaInscripcion`, `fechaNacimiento`, `fechaUltimoPago`, `fechaVencimiento`) y de `Suscripcion` (`inicio`, `fin`) son `DateTime`; solo `CambioPlanAuditoria.vencimientoAnterior` y `vencimientoNuevo` son `@db.Date` (`schema.prisma:416-417`). `miembros/actions.ts:160` guarda `fechaInscripcion` con `inicioDelDiaCaracas`.
- **Lima, verificado con `node -e` y `Intl.DateTimeFormat` con `timeZoneName: "longOffset"`:** `America/Lima` es `GMT-05:00` en enero, abril, julio y octubre de cada año entre 1995 y 2040; **antes de 1995 hubo horario de verano (GMT-04:00) del 1 de enero al 1 de abril de 1986, 1987, 1990 y 1994**. El instante `2026-11-12T04:59:59.999Z` es el 11/11/2026 a las 23:59 de Lima y `05:00:00Z` es el 12/11/2026 a las 00:00. Con `es-PE`, las opciones `{ day: "2-digit", month: "2-digit", year: "numeric" }` dan `05/03/2026` para 2026-03-05T20:30:00Z y `{ hour: "numeric", minute: "2-digit", hour12: true }` da `3:30 p. m.` para 2026-11-12T20:30:00Z, con espacios normales (U+0020) en esta versión de Node.
- **Relojes de dispositivo:** el kiosco y la vitrina leen `new Date()` del dispositivo (`apps/kiosk/lib/useHoraActual.ts:3`, citado por la revisión, no re-verificado) y el kiosco usa `@gym-app/ui` y `@gym-app/theming` pero no el dominio (`apps/kiosk/package.json:13-14`).
- No verificado: el huso de los dispositivos del local ni del servidor de producción.

### 0.5 Supuestos
- SUP-S02-001: la hora se muestra en formato de 12 horas con «a. m.» y «p. m.» y la fecha como `dd/mm/aaaa` con día y mes de dos dígitos. Default: ese formato; asumido, por validar (el propietario confirmó el 2026-11-12 el formato de 12 horas como predeterminado visual para las interfaces orientadas al público, por ser más natural).
- SUP-S02-002: las fechas de calendario (`fechaInscripcion`, `fechaNacimiento`, `fechaUltimoPago`, `fechaVencimiento`, `Suscripcion.inicio` y `Suscripcion.fin`) se guardan como el instante `05:00:00.000Z` del día de Lima, como fija `docs/04` línea 45. En los cuatro períodos de horario de verano anteriores a 1995 ese instante equivale a la 01:00 de Lima del mismo día, de modo que el día sigue siendo el correcto. Default: esa normalización fija; asumido, por validar.
- SUP-S02-003: el reloj de referencia del sistema es el del servidor; el kiosco y la vitrina muestran la hora de su dispositivo y la formatean con la zona de Lima. Default: ese criterio; asumido, por validar.
- SUP-S02-004: los archivos que otras specs rehacen o retiran quedan en una lista de exenciones con la spec responsable (S-04, S-08, S-10 o S-20); la lista se genera al implementar, se revisa y se achica a medida que esas specs terminan. Mientras tanto siguen correctos porque el proceso corre con `TZ=America/Lima`. Default: ese reparto; asumido, por validar.
- SUP-S02-005: el formateador único vive en `packages/ui/formato/fechaHora.ts` y reemplaza los espacios no separables de `Intl` por espacios normales para dar una salida estable. Default: esa ubicación y esa normalización; asumido, por validar.
- SUP-S02-006: las pruebas de propiedad usan un generador pseudoaleatorio con semilla fija sobre instantes entre 1995 y 2050; los instantes anteriores a 1995 solo se prueban en casos puntuales. Default: ese rango; asumido, por validar.
- SUP-S02-007: ninguna prueba arranca un navegador: la lógica de los campos de fecha y de «Hoy» se extrae a funciones puras de `fechaLima`, que se prueban con tres husos de proceso. Default: sin dependencias nuevas de prueba; asumido, por validar.
- SUP-S02-008: la semana comienza el lunes, como en `fechas.ts` (`inicioDeSemana`). Default: lunes; asumido, por validar.

## 1. Requisitos

### REQ-S02-001
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-01
- texto: El módulo packages/domain/utils/fechaLima.ts deberá exportar las funciones de la tabla de 5.1 con sus firmas y retornos.

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
- texto: Desde 1995 el día calendario de Lima deberá comenzar a las 05:00:00.000 UTC y terminar a las 04:59:59.999 UTC del día siguiente.

### REQ-S02-005
- tipo: cuando
- prioridad: MUST
- origen: RNF-01
- texto: Cuando el sistema guarda una fecha de calendario, deberá guardarla como el instante 05:00:00.000 UTC de ese día de Lima.

### REQ-S02-006
- tipo: ubicuo
- prioridad: MUST
- origen: DI-47
- texto: La función esCumpleanos deberá evaluar el cumpleaños con el día calendario de Lima del instante recibido, devolver falso ante una fecha de nacimiento nula y celebrar el 29 de febrero solo en años bisiestos.

### REQ-S02-007
- tipo: si-entonces
- prioridad: MUST
- origen: DI-07
- texto: Si una función de fechaLima recibe una fecha inválida entonces deberá lanzar un error cuyo mensaje contenga Invalid Date.

### REQ-S02-008
- tipo: ubicuo
- prioridad: MUST
- origen: DI-07
- texto: Los archivos de apps y packages que no figuran en la lista de exenciones no deberán contener getters ni setters locales de fecha, new Date con año, mes y día locales, ni T12:00:00 sin zona.

### REQ-S02-009
- tipo: ubicuo
- prioridad: MUST
- origen: H-05
- texto: Todo formateo de fecha u hora en los archivos que no figuran en la lista de exenciones deberá usar el formateador único de packages/ui/formato/fechaHora.ts.

### REQ-S02-010
- tipo: cuando
- prioridad: MUST
- origen: SUP-S02-001
- texto: Cuando el formateador único muestra una fecha, deberá mostrarla como dd/mm/aaaa con día y mes de dos dígitos, por ejemplo 05/03/2026.

### REQ-S02-011
- tipo: cuando
- prioridad: MUST
- origen: SUP-S02-001
- texto: Cuando el formateador único muestra una hora, deberá mostrarla en la hora de Lima en formato de 12 horas con a. m. o p. m. y espacios normales, por ejemplo 3:30 p. m.

### REQ-S02-012
- tipo: ubicuo
- prioridad: MUST
- origen: DI-07
- texto: Los 3 Dockerfile deberán fijar la variable de entorno TZ con el valor America/Lima.

### REQ-S02-013
- tipo: ubicuo
- prioridad: MUST
- origen: H-05
- texto: Los archivos de apps y packages que no figuran en la lista de exenciones no deberán contener las cadenas America/Caracas, UTC-4 ni -04:00, ni el locale es-VE en un formateo de fecha u hora.

### REQ-S02-014
- tipo: cuando
- prioridad: MUST
- origen: RNF-01
- texto: Cuando una persona elige una fecha en un campo de fecha o pulsa Hoy, el sistema deberá interpretar el día como día de Lima aunque el dispositivo esté en otro huso.

### REQ-S02-015
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-fechas.mjs encuentra en un archivo no exento alguno de los patrones de la tabla de 5.1, deberá terminar con código distinto de cero y nombrar archivo y línea.

### REQ-S02-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-fechas.mjs en cada pull request.

### REQ-S02-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El módulo fechaLima deberá tener pruebas de borde para 23:59:59.999 y 00:00 de Lima, las 19:00 de Lima que son las 00:00 UTC, las 04:00 UTC, el 29 de febrero y el cambio de año.

### REQ-S02-018
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-01
- texto: Los archivos fechaCaracas.ts y fechaCaracas.test.ts no deberán existir al terminar la spec.

### REQ-S02-019
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-01
- texto: El módulo fechaLima deberá ofrecer inicio de semana en lunes, inicio de mes y fin de mes en la hora de Lima.

### REQ-S02-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada entrada de tools/verificar-fechas.exenciones.json deberá nombrar un archivo existente y la spec que lo reescribe o retira, que será S-04, S-08, S-10 o S-20.

## 2. Comportamiento

- no_aplica: concurrencia — las funciones de fechaLima son puras y sin estado compartido

### BEH-S02-001
- cubre: REQ-S02-001, REQ-S02-004
- categoria: feliz
- dado: el instante 2026-11-12T15:30:00Z
- cuando: se pide el día, el inicio y el fin de ese día en Lima
- entonces: el día es "2026-11-12", el inicio es 2026-11-12T05:00:00.000Z y el fin es 2026-11-13T04:59:59.999Z

### BEH-S02-002
- cubre: REQ-S02-004, REQ-S02-017
- categoria: borde
- dado: los instantes 2026-11-12T04:59:59.999Z, 2026-11-12T05:00:00.000Z, 2026-11-12T00:00:00Z y 2026-11-12T04:00:00Z
- cuando: se pide el día de Lima de cada uno
- entonces: son "2026-11-11" (23:59:59.999), "2026-11-12" (00:00), "2026-11-11" (19:00) y "2026-11-11" (23:00)

### BEH-S02-003
- cubre: REQ-S02-017
- categoria: borde
- dado: el 29 de febrero de 2028 a las 12:00 de Lima, el 31 de diciembre de 2026 a las 23:59 de Lima (2027-01-01T04:59:00Z) y el 1 de enero de 2027 a las 00:00 de Lima (2027-01-01T05:00:00Z)
- cuando: se pide el día y el rango de cada uno
- entonces: el 29 de febrero de 2028 es su propio día, 2027-01-01T04:59:00Z sigue en "2026-12-31" y 2027-01-01T05:00:00Z comienza "2027-01-01"

### BEH-S02-004
- cubre: REQ-S02-003
- categoria: borde
- dado: tres procesos hijos con TZ=UTC, TZ=America/Lima y TZ=Asia/Tokyo
- cuando: cada uno ejecuta las funciones de fechaLima con el mismo instante
- entonces: los tres devuelven exactamente los mismos valores

### BEH-S02-005
- cubre: REQ-S02-005
- categoria: feliz
- dado: una inscripción hecha el 12 de noviembre de 2026 a las 22:00 de Lima (2026-11-13T03:00:00Z)
- cuando: se guarda su fecha de inscripción
- entonces: el valor guardado es 2026-11-12T05:00:00.000Z y se muestra como 12/11/2026

### BEH-S02-006
- cubre: REQ-S02-006
- categoria: borde
- dado: un miembro nacido el 12 de noviembre de 1990, guardado a las 05:00:00.000Z
- cuando: se evalúa esCumpleanos con 2026-11-12T04:59:00Z y con 2026-11-12T05:01:00Z
- entonces: el primer instante da falso (aún es el 11 de noviembre en Lima) y el segundo da verdadero

### BEH-S02-007
- cubre: REQ-S02-006
- categoria: borde
- dado: una fecha de nacimiento nula y otra del 29 de febrero de 2000
- cuando: se evalúa esCumpleanos el 28 de febrero de 2027 y el 29 de febrero de 2028 (Lima)
- entonces: la nula da falso siempre, la del 29 de febrero da falso en 2027 y verdadero el 29 de febrero de 2028

### BEH-S02-008
- cubre: REQ-S02-007
- categoria: error
- dado: una fecha inválida (new Date("no es fecha"))
- cuando: se la pasa a cualquier función de fechaLima
- entonces: la función lanza un error cuyo mensaje contiene Invalid Date

### BEH-S02-009
- cubre: REQ-S02-008, REQ-S02-013, REQ-S02-015
- categoria: error
- dado: archivos de prueba con date.getHours(), new Date(2026, 10, 12), `${dia}T12:00:00`, la cadena America/Caracas y la cadena -04:00
- cuando: se ejecuta tools/verificar-fechas.mjs
- entonces: la herramienta falla y nombra archivo y línea de cada uno

### BEH-S02-010
- cubre: REQ-S02-009, REQ-S02-015
- categoria: error
- dado: llamadas a toLocaleDateString con es-PE sin zona, con timeZone "UTC", con opciones repartidas en varias líneas sin zona y con es-VE
- cuando: se ejecuta tools/verificar-fechas.mjs
- entonces: la herramienta falla en las cuatro y no falla ante una llamada con es-PE y timeZone America/Lima en varias líneas

### BEH-S02-011
- cubre: REQ-S02-010, REQ-S02-011
- categoria: feliz
- dado: los instantes 2026-03-05T20:30:00Z y 2026-03-05T14:05:00Z
- cuando: el formateador único muestra su fecha y su hora
- entonces: se ve 05/03/2026 con 3:30 p. m. y 05/03/2026 con 9:05 a. m., con espacios normales

### BEH-S02-012
- cubre: REQ-S02-014
- categoria: borde
- dado: un proceso con TZ=Asia/Tokyo y el instante 2026-11-12T20:30:00Z, que en Tokio ya es el 13 de noviembre
- cuando: se calcula el día de «Hoy» y el valor de un campo de fecha con "2026-11-12"
- entonces: «Hoy» da "2026-11-12" y el campo da el instante 2026-11-12T05:00:00.000Z

### BEH-S02-013
- cubre: REQ-S02-012
- categoria: feliz
- dado: el árbol final
- cuando: se leen los 3 Dockerfile
- entonces: cada uno contiene ENV TZ=America/Lima y ninguno contiene America/Caracas

### BEH-S02-014
- cubre: REQ-S02-002
- categoria: error
- dado: una versión de fechaLima.ts que suma 4 * 3_600_000 o * 3600000 en vez de calcular con Intl
- cuando: se ejecuta tools/verificar-fechas.mjs sobre fechaLima.ts
- entonces: la herramienta falla porque el archivo contiene un desfase codificado en milisegundos

### BEH-S02-015
- cubre: REQ-S02-016
- categoria: error
- dado: un pull request que agrega date.getDate() en un archivo no exento
- cuando: corre el CI
- entonces: el paso de tools/verificar-fechas.mjs falla y el pull request queda en rojo

### BEH-S02-016
- cubre: REQ-S02-018, REQ-S02-020
- categoria: borde
- dado: una entrada de exención que nombra un archivo que ya no existe y otra sin la spec responsable
- cuando: se ejecuta tools/verificar-fechas.mjs
- entonces: la herramienta falla pidiendo quitar la primera y completar la segunda; y falla si existe fechaCaracas.ts o su prueba

### BEH-S02-017
- cubre: REQ-S02-019
- categoria: feliz
- dado: el jueves 2026-11-12 en Lima
- cuando: se piden el inicio de semana, el inicio de mes y el fin de mes
- entonces: son 2026-11-09T05:00:00.000Z, 2026-11-01T05:00:00.000Z y 2026-12-01T04:59:59.999Z

## 3. Invariantes

### INV-S02-001
- propiedad: para cualquier instante entre 1995 y 2050, el resultado de las funciones de fechaLima es el mismo con TZ=UTC, TZ=America/Lima y TZ=Asia/Tokyo
- mecanismo: test-propiedad
- deteccion: la prueba lanza procesos hijos con cada TZ, genera 1000 instantes con semilla fija y falla ante la primera diferencia
- protege: REQ-S02-002, REQ-S02-003

### INV-S02-002
- propiedad: para todo día de Lima desde 1995, el inicio es anterior al fin, el fin más 1 ms es el inicio del día siguiente y el día de Lima del inicio y del fin es el mismo
- mecanismo: test-propiedad
- deteccion: la prueba de propiedad genera 1000 instantes con semilla fija y falla ante la primera violación
- protege: REQ-S02-004

### INV-S02-003
- propiedad: ningún archivo no exento de apps ni packages contiene un getter local de fecha, un formateo de fecha sin la zona America/Lima o las cadenas de Caracas
- mecanismo: lint
- deteccion: tools/verificar-fechas.mjs devuelve al menos un archivo
- protege: REQ-S02-008, REQ-S02-009, REQ-S02-013, REQ-S02-015

### INV-S02-004
- propiedad: toda fecha de calendario guardada vale 05:00:00.000Z y su día de Lima es el día elegido, incluso para fechas de los períodos de horario de verano anteriores a 1995
- mecanismo: asercion-dominio
- deteccion: la función que normaliza fechas de calendario lanza un error si el resultado no vale 05:00:00.000Z o si su día de Lima difiere del pedido; la prueba cubre 1990-01-15 y 2026-11-12
- protege: REQ-S02-005

### INV-S02-005
- propiedad: toda entrada de la lista de exenciones apunta a un archivo existente y a una spec responsable
- mecanismo: lint
- deteccion: tools/verificar-fechas.mjs falla ante una entrada obsoleta o incompleta
- protege: REQ-S02-020

## 4. Criterios de aceptación

### AC-S02-001
- enlaza: REQ-S02-001, REQ-S02-004, BEH-S02-001, BEH-S02-002, INV-S02-002
- metodo: unitario
- procedimiento: ejecutar las pruebas de fechaLima con 2026-11-12T15:30:00Z, 2026-11-12T04:59:59.999Z, 2026-11-12T05:00:00.000Z, 2026-11-12T00:00:00Z y 2026-11-12T04:00:00Z, y la prueba de propiedad de 1000 instantes
- esperado: día "2026-11-12", inicio 2026-11-12T05:00:00.000Z y fin 2026-11-13T04:59:59.999Z para el primero; "2026-11-11", "2026-11-12", "2026-11-11" y "2026-11-11" para los cuatro siguientes; y la propiedad pasa
- test: pendiente

### AC-S02-002
- enlaza: REQ-S02-002, REQ-S02-003, BEH-S02-004, BEH-S02-014, INV-S02-001
- metodo: unitario
- procedimiento: ejecutar la prueba que lanza tres procesos hijos con TZ=UTC, TZ=America/Lima y TZ=Asia/Tokyo sobre 1000 instantes entre 1995 y 2050; ejecutar tools/verificar-fechas.mjs sobre una copia de fechaLima.ts con `* 3600000`
- esperado: las tres ejecuciones dan los mismos valores y la herramienta falla sobre la copia con el desfase
- test: pendiente

### AC-S02-003
- enlaza: REQ-S02-017, BEH-S02-003
- metodo: unitario
- procedimiento: ejecutar las pruebas con el 29 de febrero de 2028 a las 12:00 de Lima, 2027-01-01T04:59:00Z y 2027-01-01T05:00:00Z
- esperado: el 29 de febrero de 2028 es un día propio, 2027-01-01T04:59:00Z cae en "2026-12-31" y 2027-01-01T05:00:00Z cae en "2027-01-01"
- test: pendiente

### AC-S02-004
- enlaza: REQ-S02-005, BEH-S02-005, INV-S02-004
- metodo: integracion
- procedimiento: con una base efímera y el proceso en TZ=UTC y luego en TZ=Asia/Tokyo, guardar una inscripción del 12 de noviembre de 2026 a las 22:00 de Lima y una fecha de nacimiento del 15 de enero de 1990, leerlas, y probar la función de normalización con 2026-11-12T06:00:00Z
- esperado: los valores guardados son 2026-11-12T05:00:00.000Z y 1990-01-15T05:00:00.000Z en ambos casos, su día de Lima coincide con el elegido, se muestra 12/11/2026 y la función lanza error con el otro instante
- test: pendiente

### AC-S02-005
- enlaza: REQ-S02-006, BEH-S02-006, BEH-S02-007
- metodo: unitario
- procedimiento: evaluar esCumpleanos con nacimiento 1990-11-12T05:00:00Z en 2026-11-12T04:59:00Z y 2026-11-12T05:01:00Z; con nacimiento nulo; y con nacimiento 2000-02-29 en 2027-02-28 y 2028-02-29
- esperado: falso y verdadero para los dos primeros; falso para el nulo; falso en 2027 y verdadero en 2028 para el 29 de febrero
- test: pendiente

### AC-S02-006
- enlaza: REQ-S02-007, BEH-S02-008
- metodo: unitario
- procedimiento: llamar a cada función exportada de fechaLima con new Date("no es fecha")
- esperado: cada llamada lanza un error cuyo mensaje contiene Invalid Date
- test: pendiente

### AC-S02-007
- enlaza: REQ-S02-008, REQ-S02-009, REQ-S02-013, REQ-S02-015, BEH-S02-009, BEH-S02-010, INV-S02-003
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-fechas.mjs con árboles de prueba que contienen date.getHours(), new Date(2026, 10, 12), `${dia}T12:00:00`, la cadena America/Caracas, la cadena -04:00, toLocaleDateString con es-PE sin zona, con timeZone "UTC", con opciones en varias líneas sin zona y con es-VE; y otros con getUTCDate y con es-PE y America/Lima en varias líneas; después ejecutarla sobre el árbol final
- esperado: falla con los nueve primeros nombrando archivo y línea, pasa con los dos últimos y no encuentra nada en el árbol final fuera de la lista de exenciones
- test: pendiente

### AC-S02-008
- enlaza: REQ-S02-010, REQ-S02-011, BEH-S02-011
- metodo: unitario
- procedimiento: formatear con el formateador único 2026-03-05T20:30:00Z y 2026-03-05T14:05:00Z, y comprobar que la salida no contiene U+00A0 ni U+202F
- esperado: 05/03/2026 con 3:30 p. m. y 05/03/2026 con 9:05 a. m., con solo espacios normales
- test: pendiente

### AC-S02-009
- enlaza: REQ-S02-014, BEH-S02-012
- metodo: unitario
- procedimiento: ejecutar con TZ=Asia/Tokyo las funciones puras de «Hoy» y de interpretación de un campo de fecha con el instante 2026-11-12T20:30:00Z y el texto "2026-11-12"
- esperado: «Hoy» da "2026-11-12" y el campo da 2026-11-12T05:00:00.000Z
- test: pendiente

### AC-S02-010
- enlaza: REQ-S02-012, BEH-S02-013
- metodo: unitario
- procedimiento: buscar en Dockerfile, apps/kiosk/Dockerfile y apps/vitrina/Dockerfile las cadenas TZ=America/Lima y America/Caracas
- esperado: cada archivo contiene la primera una vez y ninguno la segunda
- test: pendiente

### AC-S02-011
- enlaza: REQ-S02-016, BEH-S02-015
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue date.getDate() en un archivo no exento y mirar el resultado del CI
- esperado: el paso de tools/verificar-fechas.mjs falla y el pull request no se puede fusionar mientras la protección de main esté activa
- test: pendiente

### AC-S02-012
- enlaza: REQ-S02-018, REQ-S02-020, BEH-S02-016, INV-S02-005
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-fechas.mjs con una exención que nombra un archivo inexistente, otra sin spec responsable y con fechaCaracas.ts presente; y después sobre el árbol final
- esperado: falla en los tres casos de prueba nombrando el problema y pasa sobre el árbol final con las exenciones restantes todas asignadas a S-04, S-08, S-10 o S-20
- test: pendiente

### AC-S02-013
- enlaza: REQ-S02-019, BEH-S02-017
- metodo: unitario
- procedimiento: pedir inicio de semana, inicio de mes y fin de mes para 2026-11-12T15:30:00Z
- esperado: 2026-11-09T05:00:00.000Z, 2026-11-01T05:00:00.000Z y 2026-12-01T04:59:59.999Z
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso): (1) pruebas de `fechaLima` y del formateador único, en rojo; (2) `fechaLima.ts` y el formateador, y borrado de `fechaCaracas.ts` y de su prueba; (3) `tools/verificar-fechas.mjs` con sus pruebas, que usa la API de `typescript` (ya declarada por S-01) para leer los argumentos de `toLocale*String` aunque estén en varias líneas; (4) lista de exenciones generada con la herramienta y revisada; (5) reemplazo de los archivos no exentos; (6) `TZ` en los 3 `Dockerfile`; (7) paso del CI. Las pruebas de propiedad usan procesos hijos con cada `TZ` y un generador con semilla fija; no hay navegador ni dependencias nuevas de prueba (SUP-S02-007).
- **Tabla de funciones de `fechaLima`:**

| Función | Firma | Retorno |
|---|---|---|
| `diaLima` | `(instante: Date) => string` | día de Lima, `"2026-11-12"` |
| `inicioDelDiaLima` | `(instante: Date) => Date` | inicio del día de Lima (reemplaza a `inicioDelDiaCaracas`) |
| `finDelDiaLima` | `(instante: Date) => Date` | último milisegundo del día de Lima |
| `rangoDiaLima` | `(dia: string) => { inicio: Date; fin: Date }` | rango del día `"AAAA-MM-DD"` (reemplaza a `rangoDiaCaracas`) |
| `diaCalendarioLima` | `(instante: Date) => Date` | el día de Lima a las 00:00 UTC, igual que el retorno de `diaCalendarioCaracas`; lo usan consumidores que S-10 retira |
| `fechaDeCalendario` | `(dia: string) => Date` | el instante `05:00:00.000Z` del día (REQ-S02-005) |
| `hoyLima` | `(ahora?: Date) => string` | día de Lima de «Hoy» |
| `sumarDias` | `(fecha: Date, dias: number) => Date` | suma días de 24 horas, sin cambio de comportamiento |
| `esCumpleanos` | `(nacimiento: Date \| null, ahora: Date) => boolean` | REQ-S02-006 |
| `inicioDeSemanaLima`, `inicioDeMesLima`, `finDeMesLima` | `(instante: Date) => Date` | REQ-S02-019 |
| `medianocheLimaDeFechaUtc` | `(fecha: Date) => Date` | conserva la función para `ActivarMiembroDesdePadron` (S-10), calculada con `Intl` |

- **Patrones que `verificar-fechas` rechaza** fuera de las exenciones: `getFullYear`, `getMonth`, `getDate`, `getDay`, `getHours`, `getMinutes`, `setHours`, `setDate`, `setMonth`, `setFullYear` locales; `new Date` con tres o más argumentos numéricos; el sufijo `T12:00:00` sin `Z`; `toLocaleDateString`, `toLocaleTimeString` o `toLocaleString` de una fecha sin `locale` `es-PE` y `timeZone: "America/Lima"` (aunque las opciones estén en varias líneas, y con `timeZone: "UTC"` incluido); las cadenas `America/Caracas`, `UTC-4` y `-04:00`; y, en `fechaLima.ts`, `3_600_000` y `3600000`. Las llamadas de dinero (`toLocaleString` con `minimumFractionDigits`) no se revisan. Se reconoce un archivo de prueba por el sufijo `.test.ts` o `.test.tsx`.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15, y su seed usa fechas de calendario a las 05:00:00.000Z.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- `InputFecha` y `SelectorRangoFechas` leen el valor de un campo `type=date` del navegador; sin cuidado, el día cambia cerca de la medianoche. Mitigación: llevar esa lógica a funciones puras de `fechaLima` (`hoyLima`, `fechaDeCalendario`) y probarlas con otro huso de proceso.
- Los archivos exentos conservan getters locales y solo son correctos mientras el proceso corra con `TZ=America/Lima`. Mitigación: REQ-S02-012, y la lista se achica cuando S-04, S-08, S-10 y S-20 terminan.
- La asignación de una exención a una spec es una propuesta mía; si el plan global (G6) la cambia, se edita la lista.
- El horario de verano peruano de 1986, 1987, 1990 y 1994 afecta a cualquier fecha de nacimiento de esos períodos. Mitigación: SUP-S02-002 y la prueba de INV-S02-004 con una fecha de enero de 1990.
- Los tickets (ADR-006), los reportes (S-14) y la vitrina deben usar el formateador único; queda como criterio de S-12, S-14 y S-20.
- La herramienta es un análisis estático: puede pasar por alto un formateo construido dinámicamente. Mitigación: la revisión de código y la regla de que todo formateo pase por el formateador único.

### 5.4 Preguntas abiertas
- ¿Hora en 24 o en 12 horas? Default: 12 horas con a. m. y p. m., que el propietario confirmó el 2026-11-12 (SUP-S02-001).
- ¿La semana comienza el lunes en los reportes? Default: lunes (SUP-S02-008).
- ¿Quieres un ADR propio para la hora de Lima (ADR-023)? Default: no, porque ya lo fijan RNF-01 y `docs/04` §4.

## Revisión independiente

### Veredicto de `spec-reviewer` (texto íntegro, sin editar; sobre la primera versión en revisión)

## Revisión independiente de S-02 (hora de Lima)

Spec revisada: `/home/user/adhara-fit/docs/superpowers/specs/S-02-hora-de-lima.md`. Clon del Repo A: `/home/user/kaiserone01/gym-app`, HEAD `b4352a0398933cf2665a3e7b82dc84049697e10c` (confirmado en `.git/packed-refs` y `.git/logs/HEAD`).

**Límites de esta revisión.** No tuve shell, solo Read, Grep y Glob. No ejecuté `spec-lint` ni `node -e`. Los conteos del Repo A los saqué con Grep sobre `apps` y `packages`, incluidos `.ts`, `.tsx`, `.mjs`, `.js`, `.html` y `.prisma`. Los resultados de `Intl` de §0.4 y la conversión de husos las hice a mano o con la base tz que conozco, y lo marco donde cuenta.

| # | Comprobación | Veredicto | Evidencia | Qué corregir |
|---|---|---|---|---|
| 1 | Cabecera completa; ADRs citados existen y están aceptados | CUMPLE | `S-02:1-8`. `adrs: ADR-016`, aceptado el 2026-11-12 (`ADR-016:3`). `depende_de` S-00 y S-22 están `aprobada` (`S-00:3-7`, `S-22:3-7`). `aprobada_por` vacío es correcto en `en-revision`. TRAZABILIDAD (16 REQ, 12 BEH, 4 INV, 10 AC) coincide con la spec. | Nada. Observación: la decisión Caracas→Lima queda "sin ADR" (`S-02:14`) aunque CLAUDE.md §3 dice "Decisión: un ADR". Está cubierta por RNF-01 (`docs/01:139`) y `docs/04:45`; el propietario debe confirmar que no hace falta ADR. |
| 2 | Orígenes RNF-01, DI-07, DI-47 y H-05 existen | CUMPLE | RNF-01 en `docs/01:139`. DI-07 en `docs/11:30`. DI-47 en `docs/11:70`. H-05 en `docs/11:126`. ADR-016 (REQ-015 y 016) figura en `adrs`. | Orígenes flojos: REQ-007 y REQ-008 citan DI-07, que trata de `TZ` en Docker y de `T12:00:00`; la fuente real es `docs/09` §3.3. REQ-010 y REQ-011 (formato dd/mm/aaaa y 12 horas) citan RNF-01, que solo dice "fechas en America/Lima" y montos `es-PE`. Su origen real es SUP-S02-001, un supuesto sin validar. Citar el SUP o `docs/09`, o bajar REQ-011 a SHOULD hasta validarlo. |
| 3 | Cada REQ es una obligación, EARS, con prioridad y origen | NO CUMPLE (menor) | El lint exige un "deberá" por REQ y todos cumplen. REQ-015 (`:134-138`) es `tipo: ubicuo` pero lleva condición "cuando encuentre". REQ-004 (`:72`) fija inicio y fin. REQ-001 (`:54`) mezcla "concentrar" con "reemplaza a fechaCaracas.ts". | REQ-015: pasarlo a `cuando`, o partirlo en tres (getter, toLocale sin zona, cadenas). REQ-001: quitar o separar el borrado de `fechaCaracas.ts`, que ningún AC verifica. |
| 4 | Cobertura REQ→BEH→AC (todo REQ MUST con AC) e INV con mecanismo, detección y AC | NO CUMPLE | Los 16 REQ tienen BEH y AC. INV-001 a 004 tienen mecanismo y detección. INV-002 está enlazado en AC-001 (`:264`), pero el procedimiento (`:266`) usa 3 instantes fijos y no corre la propiedad de 1000 instantes. | Añadir a AC-001 (o a un AC nuevo) la ejecución de la prueba de propiedad de INV-002. Ver también filas 5 y 6. |
| 5 | Cada AC es binario, con método y resultado esperado, y enlaza REQ/BEH/INV existentes | NO CUMPLE | AC-006 (`:302`) pide un error "que incluye el valor recibido" para `new Date("no es fecha")`; el valor recibido es `Invalid Date`. AC-002 (`:274`) exige que "falle" una versión con desfase codificado (BEH-012), que es una prueba de mutación sin implementación definida. AC-009 (`:319-324`) es e2e. AC-003 (`:280`) prueba 04:00Z, pero BEH-003 (`:164-169`) no lo cubre. INV-001 compara tres husos en una sola prueba, y un proceso Node no cambia de huso a mitad de ejecución. | AC-006: fijar el texto exacto del mensaje (p. ej. que contenga `Invalid Date`). AC-002/BEH-012: sustituir por una comprobación comprobable, como búsqueda de `3_600_000` y `* 3600000` en `fechaLima.ts`, o añadir ese patrón a `verificar-fechas`. AC-003/BEH-003: alinearlos. INV-001: decir que la prueba lanza procesos hijos con `TZ`. |
| 6 | Valores de ejemplo correctos (convertidos a Lima, UTC-5) | CUMPLE (con 2 salvedades) | BEH-001: 15:30Z es 10:30 del 12/11, inicio 05:00Z y fin 04:59:59.999Z del 13/11, correcto. BEH-002: 04:59:59.999Z es 23:59:59.999 del 11/11 y 05:00Z es 00:00 del 12/11, correcto. BEH-003: 2027-01-01T04:59:00Z es 23:59 del 31/12/2026, 2028 es bisiesto, correcto. BEH-005: 22:00 Lima es 03:00Z del día 13 y el valor guardado es 05:00Z del día 12, correcto. BEH-006: 04:59Z es 23:59 del 11/11 (falso) y 05:01Z es 00:01 del 12/11 (verdadero), correcto. BEH-009 y BEH-010: 20:30Z es 15:30, o sea `12/11/2026` y `3:30 p. m.`, correcto. AC-003: 04:00Z es 23:00 del día anterior, correcto. | Salvedad 1: la base tz tiene horario de verano en Perú en 1986-87, 1990 y 1994 (UTC-4 del 1 de enero al 1 de abril); no lo ejecuté. §0.4 (`:38`) muestrea desde 1995, pero INV-001 e INV-002 generan instantes "entre 1990 y 2050". Con una fecha de nacimiento de enero a marzo de 1990 o 1994, la 00:00 de Lima es 04:00Z y no 05:00Z. Eso contradice INV-004 (`:255-259`) y REQ-004. Decidir: normalizar a 05:00Z fijo, o limitar el rango a 1995 o más, y documentarlo. Salvedad 2: `3:30 p. m.` depende del espacio exacto que emite ICU (puede ser espacio no separable). AC-008 compara texto, así que fijar el carácter exacto o normalizar el espacio. |
| 7 | Formato dd/mm/aaaa y hora de 12 horas definidos con precisión | NO CUMPLE | `es-PE` por defecto da `d/M/aaaa`, sin cero a la izquierda. El Repo A ya usa `{ day: "2-digit", month: "2-digit", year: "numeric" }` (p. ej. `AccessCard.tsx:21`). Otros usan `dateStyle: "short"` (`pagos/page.tsx:133`, `RelojYTasa.tsx:73`), que da año de 2 dígitos (`12/11/26`, como dice `S-02:38`). Ningún AC usa un día o mes de un solo dígito. | Fijar las opciones exactas del formateador (2-digit, year numeric, `hour12`, hora con o sin cero). Añadir un AC con una fecha como 2026-03-05. Nombrar y ubicar el "formateador único" en §0.2 y en un REQ; hoy solo aparece en el plan (`:336`) y en AC-008. Placement abierto: `packages/ui` o `packages/domain`, y `docs/04:37` dice que el kiosco no importa dominio. |
| 8 | §0.4 con archivo:línea o comando, contrastado con el Repo A | NO CUMPLE (conteos) | Correcto: los 3 `TZ=America/Caracas` (`Dockerfile:42`, `apps/kiosk/Dockerfile:49`, `apps/vitrina/Dockerfile:37`). `fechaCaracas.ts` tiene 64 líneas, `timeZone` en `:4` y `:40`, `4 * 3_600_000` en `:18` y `:57`, y las funciones en `:2`, `:17`, `:22`, `:30` y `:55`. El test tiene 65 líneas y 10 pruebas. Getters locales: 59 líneas en 18 archivos, fuera de `packages/db` y de pruebas. `es-VE`: 31 líneas en 21 archivos. `HistorialSala.tsx:35` fija `America/Caracas`. `schema.prisma:416-417` es `@db.Date`; `miembros/actions.ts:160` es correcto. **Erróneo:** "14 archivos no de prueba importan `utils/fechaCaracas`": hay 12 (6 en `packages/domain` y 6 en `apps`; los 14 de "fechaCaracas" incluyen el test y `handoff.md`). "30 llamadas a toLocale…" son 30 líneas, y 3 líneas traen 2 llamadas. "27 sin timeZone": 3 de esas son formato numérico (`formatearBs.ts:2`, `FichaReposo.tsx:6`, `ModalHistorialTasas.tsx:30`), así que las de fecha o hora son 24. `T12:00:00` en `fechaCaracas.ts:23` es `T12:00:00Z`, no hora local. `fechas.ts:1-12` no abarca `inicioDelDia` (`:11-15`). **Falta:** ningún conteo de "Caracas", "UTC-4" y "-04:00", que es la medida de REQ-013. Hay al menos 33 archivos y 98 líneas, coherente con `docs/09` V-08, incluidos 6 tests, `PrismaTurnoRepository.ts:95-112`, `ITurnoRepository.ts:21`, `PrismaTasaCambioRepository.ts:6`, `schema.prisma:414` y `apps/vitrina-tv/prueba/index.html:27,52`. Hay además `new Date(a, m, d)` locales (`fechas.ts:38,42`, `InputFecha.tsx:15`) que ningún REQ ni la herramienta cubren. | Corregir los conteos (12, 30 líneas, 24 de fecha). Añadir el inventario de "Caracas" (el anexo `docs/anexos/inventario/caracas_venezuela.txt` existe). Decidir si el constructor local `new Date(y, m, d)` y el `T12:00:00` sin zona entran en REQ-008 y REQ-015; hoy ningún REQ, BEH ni AC los toca (el `T12:00:00` está en `pagos/actions.ts:162,196`, `caja/actions.ts:372,525` y `tasa-cambio/route.ts:23`). |
| 9 | Supuestos con default y "asumido, por validar" | CUMPLE | SUP-S02-001 a 005 tienen los dos marcadores. §5.4 repite el Default. | SUP-S02-002 termina en "y similares" (`:43`), una lista abierta. Enumerar los campos de calendario: `fechaInscripcion`, `fechaNacimiento`, `fechaUltimoPago`, `fechaVencimiento`, `Suscripcion.inicio` y `Suscripcion.fin`. SUP-S02-003 dice que la referencia es el reloj del servidor, pero kiosco y vitrina leen `new Date()` del dispositivo (`useHoraActual.ts:3`). Declararlo. |
| 10 | Contradicciones con ADR 016, 022, 011, 019 | NO CUMPLE (ADR-011) | ADR-016 §7 y §1: coherente. ADR-022 y S-22: coherentes; S-22 declara que conserva los tipos (`S-22:28`) y que `date()` entrega `Date` (SUP-S22-011, `:68`). ADR-019: sin conflicto. **ADR-011 §4 (`:29`):** el único formateador de soles es de S-03, y REQ-013 obliga a quitar `es-VE` también de `formatearBs.ts`, `FichaReposo.tsx`, `ModalHistorialTasas.tsx:30` y `CurrencyInput.tsx:17`, que son formato de dinero (Bs). Choca con §0.2 ("fechas y horas") y con SUP-S02-004. **S-22:** `date()` en modo `date` (`cambioPlanAuditoria`) entrega 00:00Z, no 05:00Z, y contradice INV-004. | Acotar REQ-013 y REQ-009 a fecha y hora, y dejar el formato numérico y de Bs a S-03 y S-10. Excluir de INV-004 las columnas `date()`, o decir cómo se tratan. |
| 11 | Contradicciones con S-00, S-22 y S-01 | NO CUMPLE | **S-00** excluye `apps/worker` (`S-00:30`, SUP-S00-001 `:63`). Aun así `S-02:26,34,45,347` mandan renombrar `apps/worker/src/actualizar-tasa.ts`, que no estará en el árbol. S-00 también importa `kiosk-tv`, `vitrina-tv` y `vitrina` "sin modificar" y los adapta en S-20 y S-21, pero REQ-013 exige tocar `vitrina-tv/prueba/index.html` y `vitrina/Reproductor.tsx`. S-22 retira el esquema Prisma, así que `schema.prisma:414` y su comentario desaparecen. **S-01:** sin conflicto. | Quitar el worker de §0.3, §0.4 y SUP-S02-004. Listar qué archivos de vitrina o TV se tocan y justificar la excepción a SUP-S00-001, o excluirlos de REQ-013. |
| 12 | Alcance: no hace lo de otra spec | NO CUMPLE | §0.3 (`:25`) dice que S-04 y S-07 reescriben el vencimiento, pero REQ-008 y el plan 5.1 paso 5 reemplazan aquí los getters de `RegistrarPago.ts:267,321,429,459,468`, `CalcularVencimientoPlan.ts:18`, `resolverCobroPasado.ts:19,23`, `ActualizarMiembro.ts:88` y `ReglaAbono.ts:93,117,171,184`. ADR-010 reescribe `RegistrarPago` y borra `ReglaAbono`; ADR-018 borra turnos y caja; el vencimiento es S-04. Es trabajo desechable con riesgo de regresión. Tampoco hay REQ para semana y mes (`inicioDeSemana`, `finDeMes` en `fechas.ts:23-43`, y la copia en `SelectorRangoFechas.tsx`). | Decidir y escribir un límite: o S-02 hace el cambio mecánico de todos y dice que S-04 lo rehace, o REQ-008 excluye los archivos que S-04, S-05 y S-08 reescriben, con la lista. Añadir un REQ para las funciones de semana y mes, o declararlas fuera. |
| 13 | Contrato de `fechaLima` (firmas, tipos, funciones portadas) | NO CUMPLE | Hoy `diaCalendarioCaracas` devuelve un `Date` a 00:00Z (`fechaCaracas.ts:1,9`, "mismo formato que `TasaCambio.fecha`"). BEH-001 dice "el día es 2026-11-12" sin tipo. REQ-001 (`:54`) omite `sumarDias` (`:12`, usado en `cambioPlanCalculo.ts` y `SincronizarTasas.ts`) y `medianocheCaracasDeFechaUtc` (`:55`, usado en `ActivarMiembroDesdePadron.ts`). Esa última lleva la lógica de la era UTC-4:30. REQ-002 prohíbe todo desfase. El renombrado mecánico es inseguro si el tipo de retorno cambia. `esCumpleanos(null)` devuelve falso (`fechaCaracas.test.ts:9`) y REQ-007 lanza error ante fechas inválidas, sin decir qué pasa con `null`. El comentario `fechaCaracas.ts:27-29` fija que los nacidos un 29 de febrero cumplen solo en bisiestos, y ningún BEH lo cubre. | Añadir una tabla con nombre, firma y retorno de cada función exportada. Declarar qué pasa con `sumarDias` y `medianocheLima…`. Añadir un BEH para `esCumpleanos(null)` y otro para el 29 de febrero. |
| 14 | Hay BEH feliz, borde, error y concurrencia (o `no_aplica` con motivo) | CUMPLE (con observación) | Feliz (BEH-001, 005, 009, 011), borde (002, 003, 004, 006, 010) y error (007, 008, 012). `no_aplica: concurrencia` con motivo en `:148`. | El motivo vale para el módulo. Considerar un borde para llamadores que leen `new Date()` dos veces cruzando la medianoche de Lima; es opcional. |
| 15 | Cobertura de REQ-009, REQ-013, REQ-014 y REQ-015 | NO CUMPLE | BEH-008 y AC-007 solo prueban `getHours`, `es-VE` y la cadena Caracas. La rama "toLocale sin zona America/Lima" de REQ-015 no tiene caso de fallo (el caso de éxito sí está). Una llamada multilínea como `HistorialSala.tsx:30-36` o `[id]/pagos/page.tsx:22-23`, con opciones en otra línea, es indetectable por línea. Un `timeZone: "UTC"` (`ModalHistorialTasas.tsx:22`, `ListaEnSala.tsx:25`) tampoco está resuelto. BEH-008 usa "un archivo de prueba" como entrada, pero REQ-008 exime a las pruebas; la regla de qué archivo es de prueba no está definida. Nada exige ni prueba que el CI ejecute la herramienta (plan paso 7). | Añadir los casos de fallo que faltan: `es-PE` sin zona, `timeZone: "UTC"` y llamada multilínea. Definir cómo la herramienta reconoce un archivo de prueba. Añadir un REQ y un AC de que el CI la ejecuta, o quitar el paso 7 del plan. |
| 16 | REQ-014 y AC-009 discriminan | NO CUMPLE | El historial de pagos (`pagos/page.tsx`) no tiene `"use client"` (conteo 0), así que se renderiza en el servidor y el huso del navegador no influye. Con `TZ=America/Lima` en Docker, AC-009 pasaría aunque el código siga sin zona explícita. Los controles sensibles al navegador son `InputFecha` (botón "Hoy" con `new Date()` local, `:116,197`), `SelectorRangoFechas`, `ModalHistorialTasas`, `HistorialSala` y `ListaEnSala`. Ningún REQ ni AC cubre entrada, filtro ni "Hoy" con otro huso, aunque el riesgo está en §5.3 (`:345`) y el plan (`:337`). | Cambiar AC-009 para probar un componente de cliente. Para una página de servidor, ejecutar con `TZ=UTC`. Añadir REQ, BEH y AC para `InputFecha` y `SelectorRangoFechas` con Asia/Tokyo. |
| 17 | Sin dependencias nuevas sin justificar | NO CUMPLE | §5.1 (`:338`) dice "sin dependencias nuevas". Pero AC-009 es e2e con navegador y el plan prueba componentes de React con la zona del navegador simulada. Ningún `package.json` del Repo A tiene `playwright`, `puppeteer`, `jsdom`, `happy-dom` ni `testing-library` (búsqueda sin resultados). Sin eso no hay navegador ni DOM de prueba. | Justificar la herramienta de pruebas de navegador o de DOM como dependencia nueva, o rebajar AC-009 y las pruebas de componentes a pruebas de funciones puras. |
| 18 | Riesgos | CUMPLE | §5.3 cubre `InputFecha`, falsos positivos de la herramienta, archivos que retiran otras specs y dispositivos con otro huso. §5.2 "No hay datos que migrar" es coherente con S-00 (SUP-S00-002). | Añadir el riesgo del horario de verano peruano de 1986 a 1994 (fila 6) y los 3 husos en INV-001. |
| 19 | Sin "TBD", "por definir", "etc." ni adjetivos sin medida; nada fuera de alcance | CUMPLE | No encontré "TBD", "por definir" ni "etc." (el patrón `\betc` está en `spec-lint.mjs:42`). No vi adjetivos de la lista `spec-lint.mjs:46`. Sin SUNAT, WhatsApp ni sitio público. | Solo lo ya señalado en la fila 9: "y similares". |
| 20 | Plan de pruebas y orden (ADR-016) | CUMPLE | §5.1 cumple "test primero", un commit por paso. REQ-016 coincide con ADR-016 §7 (23:59 y 00:00). Pero `docs/04:46` exige además "19:00 Lima (00:00 UTC)" y no está en REQ-016, BEH-003 ni AC-003. | Añadir el caso 2026-11-12T00:00Z (19:00 del día anterior en Lima) a REQ-016, BEH-003 y AC-003. |

**VEREDICTO GLOBAL: Requiere cambios.**

No es "Bloqueada por pregunta". La cabecera y los ADR están en orden y no falta ninguna decisión del propietario. Los bloqueos son defectos de la spec. Los más graves son las filas 11, 12, 16 y 17: el worker excluido por S-00, S-02 reescribiendo código que S-04 reescribe, el AC-009 que no discrimina y las dependencias de pruebas de navegador no justificadas. Siguen las filas 6 y 7 (el horario de verano de Perú antes de 1995 contra INV-004, y el formato `d/M/aaaa` frente a `dd/mm/aaaa`) y la 13 (falta el contrato de funciones). La decisión final es del propietario.

### Conciliación del autor
Verifiqué cada hallazgo contra el Repo A y con Node antes de corregir. **Todos eran ciertos**; ninguno se rechazó. Diferencias de método: el revisor cuenta 33 archivos y 98 líneas con `Caracas`, `UTC-4` o `-04:00` incluyendo pruebas y otros tipos de archivo; yo cuento 27 archivos y 71 líneas no de prueba en `.ts`, `.tsx`, `.html` y `.prisma`. El revisor no pudo ejecutar `spec-lint`; yo sí, con 0 errores y 0 avisos tras las correcciones.

| Hallazgo | Corrección |
|---|---|
| Fila 1 (sin ADR) | Se mantiene sin ADR y se pregunta al propietario en 5.4 (default: no) |
| Fila 2 (orígenes) | REQ-010 y REQ-011 citan SUP-S02-001; REQ-006 a REQ-008 conservan DI-07 y DI-47 |
| Fila 3 (REQ compuestos) | REQ-001 separado de REQ-018 (borrado de `fechaCaracas`); REQ-015 pasa a `cuando` con la tabla de patrones |
| Filas 4 y 5 (AC) | AC-001 corre la propiedad de INV-002; AC-002 usa procesos hijos con `TZ` y la regla contra `3_600_000`; AC-006 fija «Invalid Date» |
| Fila 6 (horario de verano antes de 1995; espacio de `Intl`) | Verificado con Node (1986, 1987, 1990 y 1994, GMT-04:00 de enero a marzo). REQ-004 vale desde 1995; SUP-S02-002 explica que `05:00Z` sigue dando el día correcto; pruebas de propiedad entre 1995 y 2050 (SUP-S02-006); el formateador normaliza los espacios (SUP-S02-005) |
| Fila 7 (formato) | Opciones exactas `2-digit` y `hour12`; ejemplo `05/03/2026`; el formateador único queda nombrado y ubicado en `packages/ui/formato/fechaHora.ts` (lo usa el kiosco, que no importa el dominio) |
| Fila 8 (conteos) | 12 importadores, 24 llamadas de fecha u hora, 27 archivos con cadenas de Caracas, `new Date(año, mes, día)` y `T12:00:00` sin zona incorporados |
| Fila 9 (supuestos) | Campos de calendario enumerados; reloj del dispositivo declarado (SUP-S02-003) |
| Fila 10 (dinero; `date()`) | REQ-009 y REQ-013 se limitan a fecha y hora; las columnas `@db.Date` pasan a S-07 |
| Filas 11 y 12 (worker, alcance) | Worker fuera de la spec; lista cerrada de exenciones con la spec responsable (S-04, S-08, S-10, S-20), REQ-020 e INV-005 |
| Fila 13 (contrato) | Tabla de funciones con firma y retorno; BEH para `null` y 29 de febrero; semana y mes en REQ-019 |
| Filas 15 y 16 (herramienta y «Hoy») | Casos de fallo de `es-PE` sin zona, `timeZone: "UTC"` y varias líneas; análisis con la API de `typescript`; REQ-014 y AC-009 sobre funciones puras; REQ-016 y AC-011 para el CI |
| Fila 17 (dependencias) | Sin navegador ni dependencias nuevas de prueba (SUP-S02-007) |
| Fila 20 (19:00 Lima) | Caso `2026-11-12T00:00:00Z` agregado a REQ-017, BEH-002 y AC-001 |

Tras las correcciones S-02 pasó de 16 a 20 REQ, de 12 a 17 BEH, de 4 a 5 INV y de 10 a 13 AC. El propietario escribió «S-02 aprobada» el 2026-11-12, al mismo tiempo que confirmó el formato de 12 horas para las interfaces orientadas al público, y se le informó de estas correcciones en el mismo mensaje en que se le entregó el resumen.

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de S-04. El texto anterior se conserva; donde choca, rige esta sección.*
- Por la aprobación de S-04: los archivos asignados a S-04 en la lista de exenciones de `verificar-fechas` (`RegistrarPago.ts`, `CalcularVencimientoPlan.ts`, `resolverCobroPasado.ts` según su familia, `pagos/actions.ts`, `CampoFechaCobro.tsx`, `proyeccionRenovacion.ts`, `vencimiento.tsx` y los que reescribe S-04) se convierten a `fechaLima` en S-04, que vacía esa parte de la lista (REQ-S04-029).
