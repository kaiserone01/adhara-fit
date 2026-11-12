---
id: S-06
estado: aprobada
adrs: ADR-004, ADR-007, ADR-016, ADR-019, ADR-021, ADR-022
depende_de: S-00, S-01, S-05, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-06 — Documento de identidad: DNI, carné de extranjería o pasaporte, y código de socio

## 0. Contexto y alcance

### 0.1 Problema
El código heredado identifica al miembro por `cedula`, un texto libre que solo se recorta con `trim` y se compara tal cual, y el kiosco solo acepta dígitos. En Perú el documento principal es el DNI (8 dígitos); los extranjeros usan carné de extranjería (CE) o pasaporte, que son alfanuméricos y no se pueden digitar en un teclado numérico. ADR-004 (aceptado) define `tipoDocumento`, `numeroDocumento` único global sin incluir el tipo, validadores por tipo y un `codigoSocio` numérico corto para quien no puede digitar su documento. S-06 ejecuta esa decisión de punta a punta: esquema, dominio, API, pantallas, kiosco y una herramienta que impide que `cedula` vuelva.

### 0.2 Dentro de alcance
- Enum `TipoDocumento` (`DNI`, `CE`, `PASAPORTE`) y columnas `Miembro.tipoDocumento`, `Miembro.numeroDocumento` (reemplaza a `cedula`) y `Miembro.codigoSocio`, con sus restricciones únicas y de formato en la base.
- `packages/domain/utils/documento.ts`: `normalizarDocumento` y `validarDocumento`.
- Casos de uso `crearMiembro`, `actualizarMiembro` y `registrarCheckIn`; errores `DocumentoInvalidoError`, `DocumentoDuplicadoError` y `CodigosSocioAgotadosError`; asignación automática del código de socio.
- Puerto `IMemberRepository`: `buscarPorDocumento` y `buscarPorCodigoSocio` (S-05 deja `buscarPorCedula`).
- Contrato de `api/checkin` (`{ identificador }`) y de `api/miembros` (`tipoDocumento` y `numeroDocumento`).
- Pantallas del panel: alta y edición de miembro, ficha, lista y selector de miembro, cobro.
- Kiosco (`apps/kiosk`): campo, envío y cola de pendientes pasan de `cedula` a `identificador`; el hook `useEntradaCedula` pasa a `useEntradaIdentificador` y el texto «Ingresa tu cédula» a «Ingresa tu documento o código de socio».
- Quitar de `registrarCheckIn` y de `api/checkin` el respaldo de activación desde el padrón, que el propietario descartó (ADR-007).
- Traducción de los errores nuevos a respuestas HTTP y a mensajes de pantalla.
- `tools/verificar-documento.mjs` con su lista de exenciones y su paso en el CI.

### 0.3 Fuera de alcance
- Anonimizar el documento al «Eliminar» un miembro: S-09 (ADR-013). El documento queda `NOT NULL` y único, de modo que S-09 deberá usar un valor que cumpla el formato de la base.
- Ocultar o enmascarar los dígitos que el socio teclea en la pantalla del kiosco, y el teclado numérico USB del televisor: S-21. Es una excepción explícita al invariante «el kiosco no muestra el documento» de ADR-004 (`ADR-004:36`): S-06 cumple la parte de la respuesta del check-in (REQ-S06-022) y S-21 es responsable del campo de entrada.
- Límite de intentos fallidos en el check-in del kiosco (un código de 4 dígitos se puede enumerar): S-21 o S-17; S-01 solo limita el login.
- Qué pasa con el documento de un miembro «Eliminado» (ADR-013), que sigue ocupando el número: S-09 (SUP-S06-011).
- `GET api/miembros` envía todos los documentos al navegador y la lista filtra en el cliente: S-13.
- El seed deberá aportar `tipoDocumento` y `numeroDocumento` si crea miembros de prueba: S-15.
- Validar el dígito verificador del DNI: ADR-004 lo descarta.
- La tabla `MiembroReferencia`, el padrón de Excel y su activación bajo demanda: S-10 los elimina; aquí solo se editan lo mínimo para que compilen (SUP-S06-007).
- Consentimiento y aviso legal sobre el uso del documento como dato personal: S-13.
- Un importador de miembros: descartado (S-16).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-06 recibirá después de S-00, S-22, S-01, S-04 y S-05; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Esquema:** `Miembro.cedula String` está en `packages/db/prisma/schema.prisma:152` con `@@unique([organizacionId, cedula])` en `:177`; `MiembroReferencia.cedula` está en `:619` con su unicidad en `:652`; el esquema tiene 14 enums (verificado con `grep -c '^enum ' schema.prisma`).
- **Nada previo:** no existe ningún identificador `tipoDocumento`, `numeroDocumento`, `codigoSocio` ni la palabra «pasaporte» en el código (verificado con `grep -rIiE 'tipoDocumento|numeroDocumento|codigoSocio|pasaporte' apps packages --include=*.ts --include=*.tsx`, 0 coincidencias) y `packages/domain/utils/documento.ts` no existe (verificado con `ls packages/domain/utils`).
- **Alcance en código:** 40 archivos `.ts` y `.tsx` mencionan `cedula` (distinguiendo mayúsculas), 6 de ellos pruebas (verificado con `grep -rIlE cedula apps packages --include=*.ts --include=*.tsx | grep -v '^packages/db'`); ADR-004 había estimado unos 52. `buscarPorOrganizacionYCedula` aparece en 14 archivos y `buscarPorCedula` en 7. Los puertos son `IMemberRepository.ts:4` y `IMiembroReferenciaRepository.ts:5`; la entidad es `Miembro.ts:6,28,45`.
- **Sin validación de formato:** `crearMiembro` solo comprueba que no exista otro miembro con la misma cédula (`CrearMiembro.ts:14-17`, error `CedulaDuplicadaError` en `:4`); `actualizarMiembro` hace lo mismo al cambiarla (`ActualizarMiembro.ts:52-55`); las acciones solo hacen `trim` (`miembros/actions.ts:114,261`) y `api/miembros/route.ts:38-41` exige que no esté vacía.
- **Check-in:** `registrarCheckIn` busca por cédula y, si no existe, intenta activarla desde el padrón (`RegistrarCheckIn.ts:70-71`); el mensaje de no encontrado dice «No se encontró ningún miembro con esa cédula.» (`:61`). `api/checkin/route.ts:25-29` lee `{ cedula }` y responde «Cédula es requerida.» (`:28`); su respuesta (`:43-54`) no incluye la cédula.
- **Kiosco:** `useEntradaCedula.ts:128` descarta todo carácter que no sea dígito; el campo muestra lo tecleado (`apps/kiosk/app/page.tsx:201-202`) y lo borra tras 7 s de inactividad (`useEntradaCedula.ts:15,113`); `lib/api.ts:39,56` envía `{ cedula }`; `colaPendientes.ts:7,29,33` guarda `cedula` en la cola local y `reintentarPendientes.ts:25` la reenvía.
- **Pantallas:** `FormularioMiembro.tsx:26,165,523-527` usa un campo de texto sin tipo ni validación; `ListaMiembros.tsx:111` busca por nombre y cédula y la muestra en `:259,:363`; también la muestran `SelectorMiembroModal.tsx:59,80,119,168`, `miembros/[id]/page.tsx:122`, `pagos/FormularioPago.tsx:162`, `caja/ModalRegistrarPagoCaja.tsx:89,1076` y `caja/ModalVenderProducto.tsx:309` (verificado con `grep -n`).
- **Textos y nombres con tilde:** el conteo sin distinguir mayúsculas y con tilde da 47 archivos (verificado con `grep -rIliE -e cedula -e cédula`); los 7 que solo dicen «cédula» son `kiosk/components/FondoVideo.tsx:17`, `kiosk/lib/teclasNumpad.ts:10`, `kiosk/lib/estadoPantalla.test.ts`, `packages/domain/utils/saltoFila.ts` y su prueba, `configuraciones/metodos-pago/FormularioMetodoPago.tsx` y `pagos/SelectorMetodoPago.tsx`. El texto visible «Ingresa tu cédula» está en `kiosk/app/page.tsx:196`, el hook se llama `useEntradaCedula` (archivo importado en `page.tsx:9`) y la constante `CLASES_CAMPO_CEDULA` está en `page.tsx:31-32`.
- **Padrón dentro del check-in:** `RegistrarCheckIn.ts:10,22-23,29,71` y `api/checkin/route.ts:13,38` pasan el `input` (con `cedula`) a `ActivarMiembroInput` (`ActivarMiembroDesdePadron.ts:17-21`); `ActivarMiembroDesdePadron.ts:28,42-46` y `EditarMiembroReferencia.ts` también llaman a `buscarPorOrganizacionYCedula` (verificado con `grep -n`).
- **Edición y baja:** `api/miembros/[id]/route.ts:68-81` (PATCH) edita campos y da de baja con `activo:false`, pero no maneja el documento; el documento solo se cambia desde la acción del panel (`miembros/actions.ts:296-299`); `Miembro.activo` es la baja lógica (`schema.prisma:165`) y las búsquedas por cédula no filtran por estado (`PrismaMemberRepository.ts:56-65`).
- **Registros y kiosco instalado:** `console.error(error)` en `api/checkin/route.ts:62`, `api/miembros/route.ts:67` y `lib/activacion.ts:28`; la cola local usa `VERSION_DB = 1` (`colaPendientes.ts:2`) y el service worker sirve el shell en caché `kiosco-shell-v6` (`public/sw.js:6`).
- **Sin otros usos:** `grep` no encuentra `cedula` en reportes, exportaciones, nombres de foto, `en-sala`, la vitrina, `kiosk-tv` ni `vitrina-tv`; el seed y los scripts de `packages/db` quedan fuera por S-00 (verificado con `grep -rIl`).
- **Familia del padrón (S-10):** `ActivarMiembroDesdePadron`, `EditarMiembroReferencia`, `filtrarFilasPadron` (cada uno con su prueba), la entidad, el puerto y el repositorio de `MiembroReferencia`, los cinco archivos de `configuraciones/excel`, `miembros/ActivarDesdeExcel.tsx`, `lib/activacion.ts` y `activarDesdeExcelAction` en `miembros/actions.ts:427-439` contienen `cedula` (verificado con la lista de `grep -rIlE cedula`).
- **Decisiones heredadas:** ADR-004 (enum de tres valores, unicidad sin tipo, validadores DNI `^\d{8}$`, CE y pasaporte alfanuméricos en mayúsculas con longitud configurable, `codigoSocio` numérico corto, renombre de `buscarPorCedula` a `buscarPorDocumento`) y su enmienda (unicidad global); S-05 deja `buscarPorCedula` y la unicidad `(cedula)` (SUP-S05-006 y SUP-S05-015) (verificado con `grep -n` en `ADR-004` y `S-05`).
- No verificado: el contenido de los errores de Drizzle (si incluyen el valor en conflicto), los APK de `vitrina-tv`, la longitud real de los carnés de extranjería y de los pasaportes que presentan los socios de Adhara, y el contenido de las 6 pruebas que mencionan `cedula`.

### 0.5 Supuestos
- SUP-S06-001: el CE tiene entre 9 y 12 caracteres alfanuméricos y el pasaporte entre 6 y 12; el DNI tiene exactamente 8 dígitos. Default: esos rangos, como constantes en `documento.ts`; asumido, por validar.
- SUP-S06-002: el código de socio tiene exactamente 4 dígitos (`0001` a `9999`) y se asigna al crear a un miembro CE o pasaporte, o al cambiar su tipo a CE o pasaporte; a quien tiene DNI no se le asigna, pero si ya tenía uno lo conserva. Como todo documento válido tiene al menos 6 caracteres, un identificador de 4 dígitos nunca coincide con un documento; esa garantía se rompe si se baja el mínimo de pasaporte a 5 o menos. Default: ese formato y esa regla; asumido, por validar.
- SUP-S06-003: el código lo asigna el sistema (máximo existente más uno) y el personal no lo edita; una vez asignado no cambia aunque el miembro cambie de tipo. Default: asignación automática y permanente; asumido, por validar.
- SUP-S06-004: la normalización recorta, pasa a mayúsculas y quita espacios (incluido el de no separación) y guiones (incluidas la raya y la raya larga); no quita otros símbolos, que la validación rechaza. Default: esa normalización; asumido, por validar.
- SUP-S06-005: el cuerpo de `api/checkin` pasa a `{ identificador }`, un texto de hasta 20 caracteres; el kiosco envía lo tecleado sin interpretarlo y el servidor, sobre el texto recortado, decide si es código de socio (exactamente 4 dígitos) o documento. Default: ese contrato; asumido, por validar con S-21.
- SUP-S06-006: no hay datos que migrar ni kioscos en producción con pendientes: el baseline se genera nuevo (S-15). El servidor y el kiosco se despliegan juntos, el service worker sube de versión y, si quedara un pendiente con el formato anterior, el servidor lo rechaza con 400. Default: sin migración; asumido, por validar.
- SUP-S06-007: los archivos de la familia del padrón, `saltoFila` y los dos de métodos de pago venezolanos (`FormularioMetodoPago.tsx`, `SelectorMetodoPago.tsx`) mantienen la palabra hasta que S-10 los elimine, con una exención cerrada y con tope de líneas por archivo; el tope se calcula al empezar con el conteo sin distinguir mayúsculas ni tilde. Su única edición es la mínima para compilar: llamar a `buscarPorDocumento`, y crear el miembro con tipo DNI si la cédula del padrón tiene 8 dígitos o fallar con `DocumentoInvalidoError` en otro caso. Default: edición mínima sin pruebas nuevas; asumido, por validar.
- SUP-S06-009: cada intento de asignar un código (leer el máximo e insertar) corre en una transacción nueva, porque una violación única aborta la transacción de PostgreSQL; el aislamiento es READ COMMITTED y las violaciones se distinguen por el nombre explícito de la restricción (`miembro_numero_documento_key`, `miembro_codigo_socio_key`). Default: ese diseño; asumido, por validar.
- SUP-S06-010: los formatos usan `[0-9]` y no `\d`, tanto en JavaScript como en el CHECK de PostgreSQL, para no aceptar dígitos no ASCII; los rangos de longitud son constantes de `documento.ts` repetidas en el CHECK, de modo que cambiarlas exige regenerar el baseline. Default: ese criterio (ADR-004 decía «longitud configurable»; aquí es constante); asumido, por validar.
- SUP-S06-011: `Miembro.activo` (baja lógica) no cambia en S-06: las búsquedas por documento y por código no filtran por estado, de modo que el documento de un miembro eliminado sigue ocupado. Default: ese comportamiento hasta que S-09 defina el reingreso y el valor anonimizado, que deberá cumplir el CHECK; asumido, por validar.
- SUP-S06-012: la familia del padrón deja de recibir activaciones desde el check-in: el propietario descartó el padrón (ADR-007) y `registrarCheckIn` solo busca miembros existentes. Default: quitar el respaldo ahora y dejar el resto a S-10; asumido, por validar.
- SUP-S06-008: el documento se muestra completo en las pantallas del panel, que son internas, y nunca en la respuesta del check-in. Default: ese criterio; asumido, por validar con S-13.

## 1. Requisitos

### REQ-S06-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El esquema deberá definir el enum TipoDocumento con los valores DNI, CE y PASAPORTE.
### REQ-S06-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La columna Miembro.numeroDocumento deberá reemplazar a Miembro.cedula como texto obligatorio y único en todo el sistema, sin incluir el tipo en la unicidad.

### REQ-S06-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La columna Miembro.codigoSocio deberá ser opcional y única en todo el sistema.
### REQ-S06-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La base deberá rechazar un numeroDocumento que no cumpla el formato de su tipo: DNI de 8 dígitos, CE de 9 a 12 caracteres alfanuméricos en mayúsculas y PASAPORTE de 6 a 12 caracteres alfanuméricos en mayúsculas.
### REQ-S06-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La función normalizarDocumento deberá devolver el texto recortado, en mayúsculas y sin espacios (incluido el de no separación) ni guiones (incluidas la raya y la raya larga).
### REQ-S06-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La función validarDocumento deberá devolver verdadero solo si el número normalizado cumple el formato del tipo indicado, sin calcular dígito verificador.

### REQ-S06-007
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si el documento de un miembro nuevo no cumple el formato de su tipo entonces crearMiembro deberá lanzar DocumentoInvalidoError sin crear el miembro.

### REQ-S06-008
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si ya existe un miembro con el mismo numeroDocumento, de cualquier tipo, entonces crearMiembro deberá lanzar DocumentoDuplicadoError sin crear el miembro.

### REQ-S06-009
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si la base rechaza una inserción o una actualización por la unicidad de numeroDocumento entonces el repositorio de miembros deberá lanzar DocumentoDuplicadoError.
### REQ-S06-010
- tipo: cuando
- prioridad: MUST
- origen: ADR-004
- texto: Cuando se crea un miembro de tipo CE o PASAPORTE, crearMiembro deberá asignarle el siguiente codigoSocio.

### REQ-S06-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El siguiente codigoSocio deberá ser el mayor código existente más uno, con cuatro dígitos y ceros a la izquierda, empezando en 0001.

### REQ-S06-012
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si la inserción de un código de socio choca con otro asignado a la vez entonces el sistema deberá recalcular el código y reintentar hasta tres veces, cada intento en una transacción nueva.
### REQ-S06-013
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si el mayor código existente es 9999 y se asigna un código a un miembro CE o PASAPORTE entonces el sistema deberá lanzar CodigosSocioAgotadosError sin crear ni modificar el miembro.
### REQ-S06-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: Un miembro de tipo DNI deberá crearse sin codigoSocio.

### REQ-S06-015
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si el nuevo tipo o numeroDocumento de un miembro existente no cumple el formato entonces actualizarMiembro deberá lanzar DocumentoInvalidoError sin cambiar el miembro.

### REQ-S06-016
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si el nuevo numeroDocumento ya pertenece a otro miembro entonces actualizarMiembro deberá lanzar DocumentoDuplicadoError sin cambiar el miembro.

### REQ-S06-017
- tipo: cuando
- prioridad: MUST
- origen: ADR-004
- texto: Cuando actualizarMiembro cambia el tipo de un miembro sin código a CE o PASAPORTE, deberá asignarle el siguiente codigoSocio.

### REQ-S06-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El puerto IMemberRepository deberá exponer buscarPorDocumento, sin parámetro de organización, en lugar de buscarPorCedula.
### REQ-S06-019
- tipo: cuando
- prioridad: MUST
- origen: ADR-004
- texto: Cuando el identificador recortado de registrarCheckIn tiene exactamente cuatro dígitos, deberá buscar al miembro por codigoSocio.
### REQ-S06-020
- tipo: cuando
- prioridad: MUST
- origen: ADR-004
- texto: Cuando el identificador recortado de registrarCheckIn no tiene exactamente cuatro dígitos, deberá buscar al miembro por numeroDocumento normalizado.
### REQ-S06-021
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si el cuerpo de api/checkin no es un objeto con solo el campo identificador, texto no vacío de hasta 20 caracteres, entonces la ruta deberá responder 400 sin registrar acceso.
### REQ-S06-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La respuesta de api/checkin no deberá contener numeroDocumento ni codigoSocio.

### REQ-S06-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La ruta api/miembros deberá aceptar los campos tipoDocumento y numeroDocumento.
### REQ-S06-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: Los mensajes de error devueltos y la salida de console.error de las rutas, las acciones y los casos de uso no deberán contener el número de documento de ningún miembro.
### REQ-S06-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El formulario de alta y edición de miembro deberá ofrecer un selector de tipo de documento y un campo de número, y mostrar el error de validación junto al campo.

### REQ-S06-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La ficha del miembro deberá mostrar el tipo y el número de documento y, si existe, el código de socio.

### REQ-S06-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La búsqueda de la lista de miembros y del selector de miembro deberá encontrar por nombre, por numeroDocumento y por codigoSocio.

### REQ-S06-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El kiosco deberá enviar y guardar en su cola de pendientes el texto tecleado como identificador, sin interpretarlo.

### REQ-S06-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: La función registrarCheckIn no deberá activar miembros desde el padrón.
### REQ-S06-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: Los archivos de apps y packages, salvo node_modules, .next, generated y las exenciones cerradas de la familia S-10, no deberán contener las palabras cedula ni cédula, sin distinguir mayúsculas.
### REQ-S06-031
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-documento.mjs encuentra cedula o cédula fuera de las exenciones o por encima del tope de una exención, deberá terminar con código distinto de cero y nombrar archivo y línea.
### REQ-S06-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-documento.mjs en cada pull request.

### REQ-S06-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: Un codigoSocio ya asignado a un miembro no deberá modificarse nunca, aunque cambien su tipo o su numeroDocumento.


### REQ-S06-034
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si crearMiembro o actualizarMiembro lanza DocumentoInvalidoError, DocumentoDuplicadoError, CodigosSocioAgotadosError o CodigoSocioEnConflictoError entonces api/miembros deberá responder 400, 409, 409 y 409 respectivamente, con el mensaje del error.

### REQ-S06-035
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si crearMiembro o actualizarMiembro lanza uno de los cuatro errores de documento o de código entonces las acciones del panel deberán devolver su mensaje para mostrarlo junto al formulario.

### REQ-S06-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La columna Miembro.tipoDocumento deberá ser obligatoria con valor por defecto DNI.

### REQ-S06-037
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La base deberá limitar Miembro.codigoSocio a cuatro dígitos.

### REQ-S06-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El puerto IMemberRepository deberá exponer buscarPorCodigoSocio, sin parámetro de organización.

### REQ-S06-039
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si el cuerpo de api/miembros trae el campo cedula o un tipoDocumento fuera del enum entonces la ruta deberá responder 400 sin crear el miembro.

### REQ-S06-040
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si los tres reintentos terminan en choque de código entonces el sistema deberá lanzar CodigoSocioEnConflictoError sin crear ni modificar el miembro.
## 2. Comportamiento

### BEH-S06-001
- cubre: REQ-S06-001, REQ-S06-002, REQ-S06-003, REQ-S06-036, REQ-S06-037
- categoria: feliz
- dado: una base creada con el esquema final
- cuando: se consultan las columnas y restricciones de Miembro y se crea un miembro sin indicar el tipo
- entonces: existen el enum con tres valores, tipoDocumento con valor por defecto DNI, numeroDocumento único sin tipo y codigoSocio opcional, único y limitado a cuatro dígitos, no existe la columna cedula y el miembro sin tipo queda como DNI
### BEH-S06-002
- cubre: REQ-S06-004, REQ-S06-037
- categoria: error
- dado: una base con el esquema final
- cuando: se inserta un miembro DNI con "1234567", otro CE con "ABC", otro PASAPORTE con "abc12345" y otro con codigoSocio "12"
- entonces: la base rechaza las cuatro inserciones
### BEH-S06-003
- cubre: REQ-S06-005
- categoria: feliz
- dado: los textos " 12-345 678 ", "ab-1234 567" y " 12–345 678 " (con raya y espacio de no separación)
- cuando: se llama a normalizarDocumento
- entonces: devuelve "12345678", "AB1234567" y "12345678"
### BEH-S06-004
- cubre: REQ-S06-006
- categoria: borde
- dado: DNI "12345678", "1234567", "123456789" y "1234567A"; CE "001234567", "ABCDEF123456", "ABCDEF1234567" y "12345678"; PASAPORTE "ABC123", "AB123", "ABCDEF123456" y "ABCDEF1234567"
- cuando: se llama a validarDocumento con cada uno
- entonces: son válidos DNI "12345678", CE "001234567" y "ABCDEF123456", y PASAPORTE "ABC123" y "ABCDEF123456"; los demás no
### BEH-S06-005
- cubre: REQ-S06-007
- categoria: error
- dado: una alta con tipo DNI y número "1234567"
- cuando: se ejecuta crearMiembro
- entonces: lanza DocumentoInvalidoError, no se crea ninguna fila y el mensaje no contiene "1234567"

### BEH-S06-006
- cubre: REQ-S06-008
- categoria: error
- dado: un miembro PASAPORTE con número "AB1234567"
- cuando: se intenta crear otro miembro CE con número "ab-1234567"
- entonces: lanza DocumentoDuplicadoError y no se crea la fila

### BEH-S06-007
- cubre: REQ-S06-009
- categoria: concurrencia
- dado: dos altas simultáneas de miembros DNI con el número "12345678"
- cuando: terminan las dos transacciones
- entonces: una se confirma, la otra lanza DocumentoDuplicadoError y la tabla tiene un solo miembro con ese número

### BEH-S06-008
- cubre: REQ-S06-010, REQ-S06-011, REQ-S06-014
- categoria: feliz
- dado: una base sin miembros
- cuando: se crean en orden un miembro CE, un miembro PASAPORTE y un miembro DNI
- entonces: los dos primeros reciben los códigos "0001" y "0002" y el miembro DNI queda con codigoSocio nulo

### BEH-S06-009
- cubre: REQ-S06-012
- categoria: concurrencia
- dado: una base sin miembros y un repositorio cuyo máximo de código cambia entre la lectura y la inserción de la primera alta
- cuando: se ejecutan a la vez dos altas de miembros CE con números distintos
- entonces: ambas se confirman con los códigos "0001" y "0002", la que perdió la carrera recalculó el código en una transacción nueva y la tabla no tiene códigos repetidos
### BEH-S06-010
- cubre: REQ-S06-013
- categoria: error
- dado: un miembro CE con el código "9999" y un miembro DNI
- cuando: se crea otro miembro CE y se crea otro miembro DNI
- entonces: la alta CE lanza CodigosSocioAgotadosError sin crear la fila y la alta DNI se confirma sin código
### BEH-S06-011
- cubre: REQ-S06-011
- categoria: borde
- dado: miembros con los códigos "0001" y "0005"
- cuando: se crea un miembro PASAPORTE
- entonces: recibe "0006" y no reutiliza "0002"

### BEH-S06-012
- cubre: REQ-S06-015
- categoria: error
- dado: un miembro DNI con número "12345678"
- cuando: se actualiza su número a "1234" con actualizarMiembro
- entonces: lanza DocumentoInvalidoError y el miembro conserva "12345678"

### BEH-S06-013
- cubre: REQ-S06-016
- categoria: error
- dado: dos miembros con números "12345678" y "87654321"
- cuando: se actualiza el segundo al número "12345678"
- entonces: lanza DocumentoDuplicadoError y el segundo conserva "87654321"

### BEH-S06-014
- cubre: REQ-S06-016
- categoria: borde
- dado: un miembro DNI con número "12345678"
- cuando: se actualiza con el mismo número escrito "12-345 678" y otro nombre
- entonces: la actualización se confirma sin error de duplicado

### BEH-S06-015
- cubre: REQ-S06-017, REQ-S06-033
- categoria: feliz
- dado: un miembro DNI "12345678" sin código y otro miembro CE que ya tiene el código "0001"
- cuando: se cambia el primero a CE con el número "AB1234567", luego a DNI "12345678" y luego otra vez a CE
- entonces: al pasar a CE recibe "0002", al volver a DNI lo conserva y al volver a CE sigue con "0002"; el código "0001" del otro miembro no cambia
### BEH-S06-016
- cubre: REQ-S06-018, REQ-S06-038
- categoria: feliz
- dado: un miembro DNI "12345678" y un miembro CE con código "0001"
- cuando: se llama a buscarPorDocumento("12345678"), buscarPorCodigoSocio("0001") y a ambos con valores inexistentes
- entonces: devuelven los miembros esperados o nulo, sin parámetro de organización, y el puerto no tiene buscarPorCedula

### BEH-S06-017
- cubre: REQ-S06-019
- categoria: feliz
- dado: un miembro CE con código "0002"
- cuando: el kiosco registra el check-in con el identificador "0002"
- entonces: registra el acceso de ese miembro

### BEH-S06-018
- cubre: REQ-S06-020
- categoria: borde
- dado: un miembro DNI "12345678" y un miembro CE con el código "0007"
- cuando: se registran check-ins con los identificadores "0007", "12345678", "00000007" y "7"
- entonces: "0007" y "12345678" registran el acceso de su miembro y "00000007" y "7" lanzan MiembroNoEncontradoError, sin rellenar ceros ni convertir a número
### BEH-S06-019
- cubre: REQ-S06-021
- categoria: error
- dado: peticiones a api/checkin con cuerpo vacío, con identificador vacío, con identificador solo de espacios, con 21 caracteres, con identificador numérico y con el campo cedula
- cuando: se ejecutan con la clave del kiosco
- entonces: las seis responden 400 sin registrar acceso
### BEH-S06-020
- cubre: REQ-S06-022
- categoria: feliz
- dado: un miembro vigente con número "12345678" y código "0001"
- cuando: se hace un check-in con éxito
- entonces: el cuerpo de la respuesta no contiene "12345678" ni "0001" ni los campos numeroDocumento y codigoSocio

### BEH-S06-021
- cubre: REQ-S06-039
- categoria: error
- dado: peticiones a api/miembros con el campo cedula y con tipoDocumento "RUC"
- cuando: se ejecutan como socio
- entonces: ambas responden 400 y no se crea ningún miembro
### BEH-S06-022
- cubre: REQ-S06-024
- categoria: feliz
- dado: un alta inválida y un alta duplicada con el número "12345678", con una violación real de unicidad de la base
- cuando: se captura el mensaje de error y toda la salida de console.error
- entonces: ninguno contiene "12345678"
### BEH-S06-023
- cubre: REQ-S06-025
- categoria: feliz
- dado: el formulario de alta de miembro
- cuando: se elige CE y se escribe "ab-12345678", y luego se elige DNI y se escribe "1234567"
- entonces: la primera se guarda como "AB12345678" y la segunda muestra el error de formato junto al campo y no guarda

### BEH-S06-024
- cubre: REQ-S06-026
- categoria: feliz
- dado: un miembro CE con código "0001" y otro DNI
- cuando: se abre la ficha de cada uno
- entonces: ambas muestran tipo y número y solo la del CE muestra el código de socio

### BEH-S06-025
- cubre: REQ-S06-027
- categoria: feliz
- dado: un miembro de nombre «Lucía», número "12345678" y código "0001"
- cuando: se escribe "Lucía", "5678" y "0001" en la búsqueda de la lista y del selector
- entonces: las tres búsquedas devuelven al miembro en ambas pantallas

### BEH-S06-026
- cubre: REQ-S06-028
- categoria: feliz
- dado: el kiosco con conexión y luego sin conexión
- cuando: se teclea "0001" y Enter
- entonces: con conexión envía { identificador: "0001" } y sin conexión guarda { identificador: "0001" } en la cola y lo reenvía al volver la conexión

### BEH-S06-027
- cubre: REQ-S06-029
- categoria: error
- dado: una fila de padrón con cédula "12345678" y ningún miembro con ese documento
- cuando: el kiosco registra un check-in con el identificador "12345678"
- entonces: lanza MiembroNoEncontradoError y no se crea ningún miembro
### BEH-S06-028
- cubre: REQ-S06-030
- categoria: feliz
- dado: el árbol final de apps y packages
- cuando: se busca cedula y cédula sin distinguir mayúsculas
- entonces: solo aparecen en los archivos de la exención cerrada de S-10, dentro de su tope
### BEH-S06-029
- cubre: REQ-S06-031
- categoria: error
- dado: un archivo fuera de las exenciones con cedula, otro con la palabra «cédula» con tilde, otro con buscarPorOrganizacionYCedula y un archivo exento que supera su tope
- cuando: se ejecuta tools/verificar-documento.mjs
- entonces: falla y nombra archivo y línea de los cuatro
### BEH-S06-030
- cubre: REQ-S06-032
- categoria: error
- dado: un pull request que agrega la palabra cedula en un archivo no exento
- cuando: corre el CI
- entonces: el paso de tools/verificar-documento.mjs falla y queda en rojo


### BEH-S06-031
- cubre: REQ-S06-040
- categoria: error
- dado: una alta CE en la que los tres intentos chocan con otro código asignado a la vez
- cuando: termina el tercer reintento
- entonces: lanza CodigoSocioEnConflictoError y no se crea la fila

### BEH-S06-032
- cubre: REQ-S06-013
- categoria: error
- dado: un miembro CE con el código "9999" y un miembro DNI sin código
- cuando: se cambia el tipo del miembro DNI a CE
- entonces: actualizarMiembro lanza CodigosSocioAgotadosError y el miembro conserva su tipo DNI y su ausencia de código

### BEH-S06-033
- cubre: REQ-S06-034, REQ-S06-035
- categoria: error
- dado: una alta con documento inválido, una duplicada, una con códigos agotados y una con choque de código
- cuando: se envía cada una a api/miembros y a la acción del panel
- entonces: la ruta responde 400, 409, 409 y 409 con el mensaje del error y la acción devuelve ese mensaje para mostrarlo junto al formulario

### BEH-S06-034
- cubre: REQ-S06-023
- categoria: feliz
- dado: una petición a api/miembros con tipoDocumento "CE", numeroDocumento "ab-12345678" y los demás campos válidos
- cuando: se ejecuta como socio
- entonces: crea el miembro con tipo CE, número "AB12345678" y su código de socio
## 3. Invariantes

### INV-S06-001
- propiedad: dos miembros nunca comparten numeroDocumento, aunque tengan distinto tipo
- mecanismo: restriccion-bd
- deteccion: restricción única sobre numeroDocumento; una segunda inserción falla
- protege: REQ-S06-002, REQ-S06-008, REQ-S06-009

### INV-S06-002
- propiedad: un codigoSocio, si existe, tiene cuatro dígitos y no se repite
- mecanismo: restriccion-bd
- deteccion: restricción única y CHECK de cuatro dígitos sobre codigoSocio; una inserción repetida o con otro formato falla
- protege: REQ-S06-003, REQ-S06-010, REQ-S06-012

### INV-S06-003
- propiedad: todo numeroDocumento cumple el formato de su tipo y los rangos del CHECK son los mismos que las constantes de documento.ts
- mecanismo: restriccion-bd
- deteccion: CHECK por tipo sobre numeroDocumento, con [0-9] y no \d; una fila con formato inválido falla al insertarse o actualizarse, y una prueba compara la definición del CHECK con los rangos exportados por documento.ts
- protege: REQ-S06-004, REQ-S06-007, REQ-S06-015
### INV-S06-004
- propiedad: normalizarDocumento es idempotente y el resultado de validarDocumento sobre un texto no depende de los espacios, los guiones ni las mayúsculas del original
- mecanismo: test-propiedad
- deteccion: 500 cadenas generadas con semilla fija: normalizar(normalizar(x)) debe ser igual a normalizar(x) y validar(tipo, x) debe ser igual a validar(tipo, x con espacios y guiones agregados y letras en minúscula)
- protege: REQ-S06-005, REQ-S06-006
### INV-S06-005
- propiedad: ningún documento válido coincide con un código de socio, porque ninguna cadena de cuatro dígitos es un documento válido de ningún tipo
- mecanismo: test-propiedad
- deteccion: para los 10 000 textos de cuatro dígitos, validarDocumento devuelve falso con los tres tipos
- protege: REQ-S06-019, REQ-S06-020

### INV-S06-006
- propiedad: las palabras cedula y cédula no aparecen en apps ni packages fuera de las exenciones cerradas
- mecanismo: lint
- deteccion: tools/verificar-documento.mjs termina con código distinto de cero y lista archivo:línea de cada coincidencia fuera de las exenciones
- protege: REQ-S06-030, REQ-S06-031
## 4. Criterios de aceptación

### AC-S06-001
- enlaza: REQ-S06-001, REQ-S06-002, REQ-S06-003, REQ-S06-036, REQ-S06-037, BEH-S06-001
- metodo: sql
- procedimiento: consultar las columnas, el enum y las restricciones de Miembro en la base creada con el esquema final y crear un miembro sin indicar el tipo
- esperado: existen el enum TipoDocumento con tres valores, tipoDocumento con valor por defecto DNI, numeroDocumento único sin tipo y codigoSocio opcional, único y limitado a cuatro dígitos, no existe la columna cedula y el miembro sin tipo queda como DNI
- test: pendiente
### AC-S06-002
- enlaza: REQ-S06-004, REQ-S06-037, BEH-S06-002, INV-S06-002, INV-S06-003
- metodo: sql
- procedimiento: insertar un DNI con "1234567", un CE con "ABC", un PASAPORTE con "abc12345" y un miembro con codigoSocio "12"; leer la definición del CHECK y compararla con los rangos exportados por documento.ts
- esperado: la base rechaza las cuatro inserciones y los rangos del CHECK son iguales a las constantes
- test: pendiente
### AC-S06-003
- enlaza: REQ-S06-005, REQ-S06-006, BEH-S06-003, BEH-S06-004, INV-S06-004, INV-S06-005
- metodo: unitario
- procedimiento: probar normalizarDocumento y validarDocumento con los casos de BEH-S06-003 y BEH-S06-004, con 500 cadenas generadas con semilla fija y con los 10 000 textos de cuatro dígitos
- esperado: los resultados coinciden con los de los comportamientos, normalizar es idempotente, validar no depende de espacios, guiones ni mayúsculas y ningún texto de cuatro dígitos es válido con ningún tipo
- test: pendiente
### AC-S06-004
- enlaza: REQ-S06-007, REQ-S06-008, REQ-S06-015, REQ-S06-016, REQ-S06-024, BEH-S06-005, BEH-S06-006, BEH-S06-012, BEH-S06-013, BEH-S06-014, BEH-S06-022
- metodo: integracion
- procedimiento: ejecutar crearMiembro y actualizarMiembro contra una base efímera con los casos de esos comportamientos, provocar una violación real de unicidad y capturar los mensajes y la salida de console.error
- esperado: se lanzan los errores indicados sin cambiar filas, el caso del mismo número escrito con separadores se confirma y ni los mensajes ni la salida contienen el número
- test: pendiente
### AC-S06-005
- enlaza: REQ-S06-009, BEH-S06-007, INV-S06-001
- metodo: integracion
- procedimiento: insertar dos veces el mismo numeroDocumento directamente en el repositorio, sin el pre-chequeo de crearMiembro, y lanzar con Promise.all dos altas de miembros DNI con el número "12345678"
- esperado: el repositorio lanza DocumentoDuplicadoError en la segunda inserción; en la prueba simultánea una alta se confirma, la otra lanza DocumentoDuplicadoError y la tabla tiene un solo miembro con ese número
- test: pendiente
### AC-S06-006
- enlaza: REQ-S06-010, REQ-S06-011, REQ-S06-013, REQ-S06-014, BEH-S06-008, BEH-S06-010, BEH-S06-011
- metodo: integracion
- procedimiento: crear en orden un CE, un PASAPORTE y un DNI; en otra base crear miembros con los códigos "0001" y "0005" y luego un PASAPORTE; en otra, un CE con el código "9999" y luego un CE y un DNI
- esperado: códigos "0001" y "0002" y DNI sin código; el nuevo recibe "0006"; la alta CE con "9999" lanza CodigosSocioAgotadosError sin crear la fila y la alta DNI se confirma
- test: pendiente
### AC-S06-007
- enlaza: REQ-S06-012, REQ-S06-040, BEH-S06-009, BEH-S06-031, INV-S06-002
- metodo: integracion
- procedimiento: con un doble del repositorio que cambia el máximo entre la lectura y la inserción, ejecutar a la vez dos altas CE; en otra prueba, hacer que los tres intentos choquen
- esperado: las dos altas se confirman con "0001" y "0002" y se verifica que hubo un reintento con transacción nueva; con tres choques se lanza CodigoSocioEnConflictoError sin crear la fila
- test: pendiente
### AC-S06-008
- enlaza: REQ-S06-017, REQ-S06-033, BEH-S06-015
- metodo: integracion
- procedimiento: con un miembro CE con código "0001", crear un miembro DNI "12345678" sin código y cambiar su tipo a CE con el número "AB1234567", luego a DNI "12345678" y luego a CE
- esperado: recibe "0002" al pasar a CE y mantiene "0002" en los cambios siguientes, y el código del otro miembro sigue siendo "0001"
- test: pendiente
### AC-S06-009
- enlaza: REQ-S06-018, REQ-S06-038, BEH-S06-016
- metodo: integracion
- procedimiento: llamar a buscarPorDocumento y buscarPorCodigoSocio con valores existentes e inexistentes y verificar con la API de typescript que IMemberRepository no declara buscarPorCedula ni buscarPorOrganizacionYCedula y que los dos métodos nuevos no tienen parámetro de organización
- esperado: devuelven los miembros esperados o nulo y la comprobación de tipos se cumple
- test: pendiente
### AC-S06-010
- enlaza: REQ-S06-019, REQ-S06-020, BEH-S06-017, BEH-S06-018, INV-S06-005
- metodo: integracion
- procedimiento: registrar check-ins con los identificadores "0007", "12345678", "00000007" y "7" sobre la base de BEH-S06-018
- esperado: "0007" y "12345678" registran el acceso y "00000007" y "7" lanzan MiembroNoEncontradoError
- test: pendiente
### AC-S06-011
- enlaza: REQ-S06-021, REQ-S06-022, BEH-S06-019, BEH-S06-020
- metodo: integracion
- procedimiento: llamar a api/checkin con cuerpo vacío, con identificador vacío, de solo espacios, de 21 caracteres, numérico y con el campo cedula, y luego con un identificador válido
- esperado: los seis primeros responden 400 sin registrar acceso y el cuerpo de la respuesta válida no contiene numeroDocumento, codigoSocio ni sus valores
- test: pendiente
### AC-S06-012
- enlaza: REQ-S06-023, REQ-S06-039, BEH-S06-021, BEH-S06-034
- metodo: integracion
- procedimiento: llamar a api/miembros como socio con el campo cedula, con tipoDocumento "RUC" y con tipoDocumento "CE" y número "ab-12345678"
- esperado: las dos primeras responden 400 sin crear miembro y la tercera crea un CE con número "AB12345678" y su código
- test: pendiente
### AC-S06-013
- enlaza: REQ-S06-025, BEH-S06-023
- metodo: manual
- procedimiento: como socio, abrir el alta de miembro, elegir CE y escribir "ab-12345678", guardar, y luego elegir DNI, escribir "1234567" y guardar
- esperado: el CE se guarda como "AB12345678" y el DNI muestra el error de formato junto al campo y no se guarda
- test: pendiente
### AC-S06-014
- enlaza: REQ-S06-028, BEH-S06-026
- metodo: unitario
- procedimiento: probar el cliente del kiosco y su cola con un almacén en memoria inyectado en lugar de IndexedDB y una conexión simulada que primero falla y luego responde
- esperado: la petición lleva { identificador: "0001" }, la cola guarda ese objeto y el reenvío usa el mismo valor
- test: pendiente
### AC-S06-015
- enlaza: REQ-S06-029, BEH-S06-027
- metodo: integracion
- procedimiento: con una fila de padrón con cédula "12345678" y ningún miembro, registrar un check-in con el identificador "12345678"
- esperado: lanza MiembroNoEncontradoError y la tabla de miembros sigue vacía
- test: pendiente
### AC-S06-016
- enlaza: REQ-S06-030, REQ-S06-031, BEH-S06-028, BEH-S06-029, INV-S06-006
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-documento.mjs con un árbol con cedula fuera de las exenciones, otro con cédula con tilde, otro con buscarPorOrganizacionYCedula, otro con una exención que supera su tope y otro limpio; después ejecutarla sobre el árbol final
- esperado: falla en los cuatro primeros nombrando archivo y línea, pasa con el limpio y en el árbol final solo aparecen archivos exentos dentro de su tope
- test: pendiente
### AC-S06-017
- enlaza: REQ-S06-032, BEH-S06-030
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue la palabra cedula en un archivo no exento y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-documento.mjs falla y su estado queda en rojo
- test: pendiente


### AC-S06-018
- enlaza: REQ-S06-026, REQ-S06-027, BEH-S06-024, BEH-S06-025
- metodo: manual
- procedimiento: como socio, abrir la ficha de un miembro CE con código y la de un miembro DNI, y buscar "Lucía", "5678" y "0001" en la lista de miembros y en el selector de miembro
- esperado: solo la ficha del CE muestra el código de socio, ambas muestran tipo y número, y las tres búsquedas encuentran al miembro en ambas pantallas
- test: pendiente

### AC-S06-019
- enlaza: REQ-S06-013, BEH-S06-032
- metodo: integracion
- procedimiento: con un miembro CE con el código "9999" y un miembro DNI sin código, cambiar el tipo del segundo a CE
- esperado: actualizarMiembro lanza CodigosSocioAgotadosError y el miembro conserva el tipo DNI y no tiene código
- test: pendiente

### AC-S06-020
- enlaza: REQ-S06-034, REQ-S06-035, BEH-S06-033
- metodo: integracion
- procedimiento: provocar los cuatro errores con api/miembros y con la acción del panel
- esperado: la ruta responde 400, 409, 409 y 409 con el mensaje del error y la acción devuelve el mismo mensaje
- test: pendiente
## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso, cada commit con typecheck y pruebas en verde; el cambio se hace en dos tiempos, primero el nombre y después el modelo, para que ningún commit rompa la compilación): (1) pruebas de `normalizarDocumento` y `validarDocumento`, con las de propiedad de INV-S06-004 e INV-S06-005, en rojo; (2) `packages/domain/utils/documento.ts` con las constantes de rango; (3) renombre mecánico de `cedula` a `numeroDocumento` y de `buscarPorCedula` a `buscarPorDocumento` en los archivos del Miembro, con `MiembroReferencia.cedula` intacta, y de `useEntradaCedula` a `useEntradaIdentificador` con sus textos; (4) esquema aditivo: enum `TipoDocumento`, `tipoDocumento` con valor por defecto, `codigoSocio`, restricciones únicas con nombre explícito y ajuste de la entidad `Miembro`; (5) repositorio: `buscarPorCodigoSocio`, máximo del código y conversión de las violaciones únicas en `DocumentoDuplicadoError` y en el choque de código (por el nombre de la restricción); (6) CHECK de formato y de cuatro dígitos, junto con la actualización de los datos de prueba que usaban cédulas de cualquier forma, y la prueba que compara los CHECK con las constantes; (7) casos de uso `crearMiembro`, `actualizarMiembro` y `registrarCheckIn` con sus errores, el reintento por transacción nueva y la quita del respaldo del padrón; (8) rutas `api/checkin` y `api/miembros` con esquemas `zod` estrictos (S-01), traducción de errores a 400 y 409, y las acciones del panel, con registros que no incluyan el documento; (9) pantallas: formulario, ficha, lista, selector y cobro; (10) kiosco: campo, cliente, cola con almacén inyectable y versión del service worker; (11) familia del padrón y textos en la lista de exenciones, con la edición mínima de SUP-S06-007; (12) `tools/verificar-documento.mjs` con `tools/verificar-documento.exenciones.json` y el CI.
- Si `drizzle-kit push` no crea los CHECK (se verifica en el paso 4 de S-05 y de nuevo en el paso 6), se declaran con SQL en el baseline de S-15, como en S-05 §5.1.
- Las pruebas de concurrencia usan semillas fijas, una base efímera y un doble del repositorio que fuerza el choque; no hay dependencias nuevas. La cola del kiosco recibe su almacén por parámetro para probarse sin `fake-indexeddb`.
- La exención de la familia S-10 es una lista cerrada con un tope de líneas por archivo, contado sin distinguir mayúsculas ni tilde al empezar; solo S-10 puede vaciarla.
- Los criterios AC-S06-013 y AC-S06-018 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar (SUP-S06-006): el baseline se genera en S-15 y la base se crea con `drizzle-kit push` (S-22). S-15 deberá aportar `tipoDocumento` y `numeroDocumento` válidos si siembra miembros.
- **Enmiendas que se registran al aprobar S-06:**
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 (recuentos: tras S-05 son 23 tablas y 15 enums; con S-06 son 16 enums, y el total final depende del orden en que se implementen S-08, S-09, S-10 y S-18); REQ-S22-030, BEH-S22-022 y AC-S22-022, y el hecho de `lib/activacion.ts` de su 0.4 (la unicidad que hace fallar la segunda activación pasa de `(cedula)` a `numeroDocumento`).
  - S-05: REQ-S05-007, BEH-S05-006, BEH-S05-023, INV-S05-003 y AC-S05-004 hablan de la cédula y pasan a `numeroDocumento`; SUP-S05-006 y SUP-S05-015 quedan cumplidos; las pruebas de caracterización de REQ-S05-031 que envían `cedula` a `api/checkin` y `api/miembros` pasan a `identificador`, `tipoDocumento` y `numeroDocumento`.
  - S-01: sin cambio de texto; S-01 no define el cuerpo de cada ruta, de modo que los esquemas `zod` de `api/checkin` (`{ identificador }`) y de `api/miembros` se escriben con los campos de S-06 al implementarse (REQ-S01-016).
  - `docs/06-modelo-datos-cambios.md` (líneas 16, 46 y 63: `codigoSocio` pasa a ser único global de 4 dígitos), `docs/05-adaptacion-peru.md:35` y `ADR-004` (el «[SUPUESTO S-10]» queda resuelto aquí y «longitud configurable» pasa a constantes), `docs/superpowers/BACKLOG-SPECS.md` (S-06 aprobada) y `docs/superpowers/COBERTURA-RF.md:62` (el hook para S-21 se llama `useEntradaIdentificador`).
- **Traspasos:** S-09 (reingreso del miembro eliminado, filtro de estado y valor anonimizado que cumpla el CHECK), S-13 (el documento viaja a todos los navegadores en `GET api/miembros`), S-15 (datos válidos y CHECK de respaldo), S-21 (campo de entrada, enmascarado y límite de intentos).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- 47 archivos cambian de nombre o de texto; el riesgo es una consulta que siga usando el nombre viejo. Mitigación: el typecheck y la herramienta, que ahora detecta también «cédula» con tilde.
- Un CE o un pasaporte con un formato distinto del supuesto no podría registrarse, y cambiar los rangos exige regenerar el baseline porque el CHECK los repite. Mitigación: constantes en `documento.ts`, prueba que las compara con el CHECK, y validación de los rangos con el propietario (SUP-S06-001).
- Si algún día se baja el mínimo del pasaporte a 5 caracteres o menos, un código de socio podría confundirse con un documento. Mitigación: INV-S06-005 lo detecta en las pruebas.
- El código de 4 dígitos es corto y secuencial: el check-in devuelve nombre, foto y vencimiento (`api/checkin/route.ts:43-54`), de modo que alguien podría probar códigos. Un DNI de 8 dígitos tiene el mismo problema; S-01 limita solo el login. Mitigación: traspaso a S-21 o S-17 (límite de intentos del kiosco).
- Fuga del documento en errores y registros: la violación única de PostgreSQL incluye el valor en su detalle y los `console.error(error)` actuales (`api/checkin/route.ts:62`, `api/miembros/route.ts:67`, `lib/activacion.ts:28`) lo imprimirían; el contenido de los errores de Drizzle no está verificado. Mitigación: REQ-S06-024 y su prueba con una violación real.
- Un kiosco con el shell en caché podría seguir enviando `{ cedula }` y recibir 400. Mitigación: servidor y kiosco se despliegan juntos y el service worker sube de versión (SUP-S06-006); los APK de `vitrina-tv` no están verificados.
- «Eliminar» un miembro deja su documento ocupado y un socio que vuelve no podría darse de alta. Mitigación: traspaso a S-09 (SUP-S06-011).
- Se editan archivos de la familia del padrón y de métodos de pago venezolanos que S-10 borra después; el trabajo es mínimo y acotado por la exención.
- Un pegado con caracteres exóticos (otros espacios o guiones Unicode) puede no normalizarse. Mitigación: SUP-S06-004 cubre el espacio de no separación, la raya y la raya larga; otros se rechazan con el error de formato.
- Las pruebas de S-05 y S-22 también usan `cedula`; se actualizan en el paso 3.

### 5.4 Preguntas abiertas
- ¿El código de socio de 4 dígitos, asignado solo a quien tiene CE o pasaporte, te sirve? Default: sí (SUP-S06-002); confirmado por el propietario el 2026-11-12.
- ¿Los rangos de longitud de CE (9 a 12) y pasaporte (6 a 12) son adecuados para tus socios? Default: sí (SUP-S06-001); confirmado por el propietario el 2026-11-12.
- ¿Se enmascara en el kiosco lo que teclea el socio y se limitan los intentos fallidos del check-in? Default: no se decide aquí; lo resuelve S-21 (S-17 para el límite).
- ¿Un miembro eliminado puede volver a darse de alta con el mismo documento? Default: no hasta que S-09 lo defina (SUP-S06-011).

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de S-10. El texto anterior se conserva; donde choca, rige esta sección.*
- Por la aprobación de S-10: SUP-S06-007, REQ-S06-030 y las exenciones de `verificar-documento` de la familia del padrón desaparecen porque sus archivos se retiran.

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura), que recibió únicamente la ruta y la lista de comprobación. Veredicto sobre la versión `1cfd693`; cada fila se resume y el veredicto global se conserva tal como lo entregó. El revisor no pudo ejecutar `spec-lint` ni `git`; verificó con `Grep`, `Glob` y `Read`.

> **Verificación de 0.4.** Reprodujo el esquema (`schema.prisma:152,177,619,652`; 14 enums), las 0 coincidencias de `tipoDocumento`, `numeroDocumento`, `codigoSocio` y «pasaporte», la ausencia de `documento.ts`, los 40 archivos con `cedula` (22 en `apps` y 18 en `packages`; 6 pruebas), `buscarPorOrganizacionYCedula` en 14 archivos y `buscarPorCedula` en 7, y todas las líneas citadas del check-in, el kiosco y las pantallas. Observación: el comando de 0.4 distingue mayúsculas, pero la herramienta no debía hacerlo; con `-i` cambian las líneas por archivo.
>
> | # | Comprobación | Veredicto | Qué corregir (resumen del revisor) |
> |---|---|---|---|
> | 1 | Cabecera; ADRs existentes y aceptados | CUMPLE | Opcional: S-04 no figura en `depende_de`. |
> | 2 | Cada REQ: una obligación, EARS, origen | NO CUMPLE (menor) | Dividir REQ-001, 003, 018, 023 y 029; recalificar REQ-009, 021 y 029; acotar REQ-013 a CE y pasaporte; falta qué ocurre tras el tercer reintento; orígenes incoherentes en REQ-009, 021 y 030; acotar REQ-024 a mensajes y `console.*`. |
> | 3 | Cobertura REQ→BEH→AC; INV; categorías | NO CUMPLE (menor) | Faltan BEH de concurrencia, agotamiento y reintento en `actualizarMiembro`, de tras 3 reintentos, de bordes de longitud, de identificador vacío o con espacios, y de la respuesta HTTP o de pantalla de los tres errores nuevos (hoy caerían en 500); INV-004 afirma dos propiedades y prueba una; INV-006 mal redactado. |
> | 4 | Cada AC es binario y lo que espera existe | NO CUMPLE | AC-009 es falso (el puerto tiene más métodos); BEH-018 no distingue de «no existe»; `Promise.all` puede serializarse y el pre-chequeo enmascara REQ-009 y REQ-012; AC-014 exige `fake-indexeddb` (la cola usa IndexedDB); BEH-015 sin números; AC-013 e2e no tiene ejecutor; AC-002 lista 4 inserciones y BEH-002 cubre 3. |
> | 5 | Hechos de 0.4 | CUMPLE (con observaciones) | Recontar con `-i` y fijar los topes con ese conteo. |
> | 6 | Hechos incompletos que afectan al diseño | NO CUMPLE | La herramienta busca «cedula» sin tilde y quedan 7 archivos con «cédula» (incluido «Ingresa tu cédula» en la TV); el hook `useEntradaCedula` y `CLASES_CAMPO_CEDULA`; el respaldo del padrón dentro del check-in; el PATCH que no maneja el documento; `Miembro.activo`; los `console.error`; `VERSION_DB` y `sw.js`. |
> | 7 | Supuestos y preguntas | NO CUMPLE (menor) | SUP-002 contradice SUP-003 y REQ-033; SUP-005 dice «dígitos» y REQ-021 acepta cualquier texto; SUP-006 sin mecanismo; «muy superior» sin cifra; faltan supuestos de clasificación del identificador, longitud máxima, aislamiento, aborto de transacción, nombres de restricción y espacios Unicode. |
> | 8 | Contradicciones con ADR y specs aprobadas | NO CUMPLE (menor) | ADR-004:36 exige que el kiosco no muestre el documento y se delega a S-21 sin excepción explícita; «longitud configurable» frente a constantes; ADR-013 deja el documento ocupado tras «Eliminar»; falta declarar los nombres de restricción; S-01 no define esquemas por ruta. |
> | 9 | Alcance frente a otras specs | NO CUMPLE (menor) | REQ-029 valida en código que S-10 borra; los cambios al padrón no son «el único cambio»; solapamiento con S-21 en hook y texto; faltan traspasos a S-09, S-13 y S-15. |
> | 10 | Viabilidad del código de socio, CHECK y orden del plan | NO CUMPLE | La no colisión es viable (todo documento válido tiene al menos 6 caracteres) pero depende del mínimo del pasaporte; la lectura del máximo y la inserción no son atómicas y una violación única aborta la transacción: el reintento exige transacción nueva; usar `[0-9]` y no `\d`; verificar que `drizzle-kit push` crea los CHECK; el paso 3 del plan deja el `typecheck` en rojo hasta el paso 9. |
> | 11 | Riesgos omitidos | NO CUMPLE | Enumeración del código corto, fuga del documento en errores y registros, cliente viejo con shell en caché, documento ocupado tras «Eliminar», cambio de rangos, cambio solo de tipo, espacios Unicode, pruebas de S-05 y S-22 con `cedula`, choque de nombres con S-21. |
> | 12 | Enmiendas a S-22, S-05 y S-01 | NO CUMPLE | Citar IDs concretos y recuentos relativos; añadir REQ-S05-031; S-01 no define el cuerpo por ruta; faltan docs/06, docs/05, ADR-004, BACKLOG y COBERTURA-RF. |
>
> **VEREDICTO GLOBAL: REQUIERE CAMBIOS.**

### Conciliación del autor
Todos los hallazgos se verificaron y resultaron ciertos; ninguno se rechazó. Los 47 archivos (40 con `cedula` y 7 solo con tilde), el hook, los `console.error`, la ausencia de manejo del documento en el PATCH, `VERSION_DB = 1` y `kiosco-shell-v6` se reprodujeron con `grep`.

- Fila 2: se dividieron REQ-001 (y REQ-036), REQ-003 (y REQ-037), REQ-018 (y REQ-038) y REQ-023 (y REQ-039); REQ-009, REQ-021 y REQ-029 pasan a la forma que corresponde; REQ-013 se acota a CE y pasaporte; REQ-040 define el tercer reintento fallido; los orígenes pasan a ADR-004, ADR-016 y ADR-007; REQ-024 se acota a mensajes y `console.error`.
- Fila 3: nuevos BEH-031 (tras tres reintentos), BEH-032 (agotamiento al actualizar), BEH-033 (400 y 409 en la ruta y mensaje en pantalla) y BEH-034 (alta por la API); REQ-034 y REQ-035 definen la traducción de errores; BEH-004 agrega los bordes de longitud; BEH-019 agrega el identificador vacío, de espacios y de 21 caracteres; INV-004 prueba las dos propiedades e INV-006 se reescribió.
- Fila 4: AC-009 compara el puerto con la API de typescript; BEH-018 agrega un miembro con código «0007»; AC-005 y AC-007 prueban el repositorio sin pre-chequeo y usan un doble que fuerza el choque; AC-014 inyecta el almacén (sin dependencia nueva); BEH-015 trae los números; AC-013 y AC-018 son pasos manuales; BEH-002 cubre las cuatro inserciones.
- Fila 5 y 6: 0.4 cuenta 47 archivos con tilde, lista los 7 que solo dicen «cédula», el texto de la TV, el hook, el padrón dentro del check-in, el PATCH, `Miembro.activo`, los `console.error`, la versión de la base local y el service worker; la herramienta busca «cedula» y «cédula» sin distinguir mayúsculas y sus topes se calculan así (SUP-S06-007).
- Fila 7: SUP-002 resuelve la contradicción (el código se conserva al volver a DNI); SUP-005 fija el texto de hasta 20 caracteres recortado; SUP-006 describe el despliegue conjunto sin prometer una cola vaciada; nuevos SUP-009 a SUP-012 (transacción por intento, READ COMMITTED y nombres de restricción; `[0-9]` y constantes repetidas en el CHECK; eliminados; padrón); «muy superior» se quitó.
- Fila 8: excepción explícita al invariante de ADR-004:36 en 0.3 (S-06 cumple la respuesta del check-in; S-21, el campo de entrada); constantes en lugar de «longitud configurable» (SUP-S06-010); documento ocupado tras «Eliminar» como traspaso a S-09 (SUP-S06-011).
- Fila 9: REQ-029 deja de validar en el padrón y pasa a quitar el respaldo del check-in (el propietario descartó el padrón, ADR-007); el solapamiento con S-21 queda delimitado (S-06 renombra hook y texto; S-21, el enmascarado y el límite de intentos); traspasos a S-09, S-13, S-15 y S-21 en 0.3 y 5.2.
- Fila 10: el plan se rehízo en dos tiempos (renombre mecánico y luego modelo) para que cada commit compile; cada intento de código corre en una transacción nueva; `[0-9]` y no `\d`; plan B para los CHECK con SQL en S-15; una prueba compara los CHECK con las constantes.
- Fila 11 y 12: 5.3 agrega los riesgos omitidos; 5.2 lista las enmiendas con identificadores concretos y la nota de S-01. Se verificó la existencia de REQ-S22-016, REQ-S22-030, BEH-S22-008, BEH-S22-022, AC-S22-014 y AC-S22-022.
- Lo que no se pudo verificar y queda marcado «no verificado»: el contenido de los errores de Drizzle, los APK de `vitrina-tv` y las longitudes reales de los carnés y pasaportes.
- Aprobación: el propietario escribió «S-06 aprobada» antes de terminar esta revisión; las correcciones fueron de hechos, mecanismos y alcance mínimo, y no cambiaron ninguna decisión que el propietario viera en el resumen (código de 4 dígitos, longitudes, kiosco). La única decisión nueva, quitar el respaldo del padrón del check-in, se apoya en su decisión previa «sin padrón» (ADR-007).
- Por la aprobación de S-09: SUP-S06-011 queda cumplido por REQ-S09-031 (el documento de un miembro eliminado sigue ocupado y el mensaje indica restaurarlo); la anonimización del documento (0.3, 5.2 y el «valor anonimizado») no se implementa porque el propietario la descartó.
