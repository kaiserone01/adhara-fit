---
id: S-06
estado: en-revision
adrs: ADR-004, ADR-016, ADR-019, ADR-021, ADR-022
depende_de: S-00, S-01, S-05, S-22
aprobada_por:
fecha_aprobacion:
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
- Kiosco (`apps/kiosk`): campo, envío y cola de pendientes pasan de `cedula` a `identificador`.
- `tools/verificar-documento.mjs` con su lista de exenciones y su paso en el CI.

### 0.3 Fuera de alcance
- Anonimizar el documento al «Eliminar» un miembro: S-09 (ADR-013). El documento queda `NOT NULL` y único, de modo que S-09 deberá usar un valor que cumpla el formato de la base.
- Ocultar o enmascarar los dígitos que el socio teclea en la pantalla del kiosco, y el teclado numérico USB del televisor: S-21.
- Validar el dígito verificador del DNI: ADR-004 lo descarta.
- La tabla `MiembroReferencia`, el padrón de Excel y su activación bajo demanda: S-10 los elimina; aquí solo se editan lo mínimo para que compilen (SUP-S06-007).
- Consentimiento y aviso legal sobre el uso del documento como dato personal: S-13.
- Un importador de miembros: descartado (S-16).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-06 recibirá después de S-00, S-22, S-01, S-04 y S-05; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Esquema:** `Miembro.cedula String` está en `packages/db/prisma/schema.prisma:152` con `@@unique([organizacionId, cedula])` en `:177`; `MiembroReferencia.cedula` está en `:619` con su unicidad en `:652`; el esquema tiene 14 enums (verificado con `grep -c '^enum ' schema.prisma`).
- **Nada previo:** no existe ningún identificador `tipoDocumento`, `numeroDocumento`, `codigoSocio` ni la palabra «pasaporte» en el código (verificado con `grep -rIiE 'tipoDocumento|numeroDocumento|codigoSocio|pasaporte' apps packages --include=*.ts --include=*.tsx`, 0 coincidencias) y `packages/domain/utils/documento.ts` no existe (verificado con `ls packages/domain/utils`).
- **Alcance en código:** 40 archivos `.ts` y `.tsx` mencionan `cedula`, 6 de ellos pruebas (verificado con `grep -rIlE cedula apps packages --include=*.ts --include=*.tsx | grep -v '^packages/db'`); ADR-004 había estimado unos 52. `buscarPorOrganizacionYCedula` aparece en 14 archivos y `buscarPorCedula` en 7. Los puertos son `IMemberRepository.ts:4` y `IMiembroReferenciaRepository.ts:5`; la entidad es `Miembro.ts:6,28,45`.
- **Sin validación de formato:** `crearMiembro` solo comprueba que no exista otro miembro con la misma cédula (`CrearMiembro.ts:14-17`, error `CedulaDuplicadaError` en `:4`); `actualizarMiembro` hace lo mismo al cambiarla (`ActualizarMiembro.ts:52-55`); las acciones solo hacen `trim` (`miembros/actions.ts:114,261`) y `api/miembros/route.ts:38-41` exige que no esté vacía.
- **Check-in:** `registrarCheckIn` busca por cédula y, si no existe, intenta activarla desde el padrón (`RegistrarCheckIn.ts:70-71`); el mensaje de no encontrado dice «No se encontró ningún miembro con esa cédula.» (`:61`). `api/checkin/route.ts:25-29` lee `{ cedula }` y responde «Cédula es requerida.» (`:28`); su respuesta (`:43-54`) no incluye la cédula.
- **Kiosco:** `useEntradaCedula.ts:128` descarta todo carácter que no sea dígito; el campo muestra lo tecleado (`apps/kiosk/app/page.tsx:201-202`) y lo borra tras 7 s de inactividad (`useEntradaCedula.ts:15,113`); `lib/api.ts:39,56` envía `{ cedula }`; `colaPendientes.ts:7,29,33` guarda `cedula` en la cola local y `reintentarPendientes.ts:25` la reenvía.
- **Pantallas:** `FormularioMiembro.tsx:26,165,523-527` usa un campo de texto sin tipo ni validación; `ListaMiembros.tsx:111` busca por nombre y cédula y la muestra en `:259,:363`; también la muestran `SelectorMiembroModal.tsx:59,80,119,168`, `miembros/[id]/page.tsx:122`, `pagos/FormularioPago.tsx:162`, `caja/ModalRegistrarPagoCaja.tsx:89,1076` y `caja/ModalVenderProducto.tsx:309` (verificado con `grep -n`).
- **Familia del padrón (S-10):** `ActivarMiembroDesdePadron`, `EditarMiembroReferencia`, `filtrarFilasPadron` (cada uno con su prueba), la entidad, el puerto y el repositorio de `MiembroReferencia`, los cinco archivos de `configuraciones/excel`, `miembros/ActivarDesdeExcel.tsx`, `lib/activacion.ts` y `activarDesdeExcelAction` en `miembros/actions.ts:427-439` contienen `cedula` (verificado con la lista de `grep -rIlE cedula`).
- **Decisiones heredadas:** ADR-004 (enum de tres valores, unicidad sin tipo, validadores DNI `^\d{8}$`, CE y pasaporte alfanuméricos en mayúsculas con longitud configurable, `codigoSocio` numérico corto, renombre de `buscarPorCedula` a `buscarPorDocumento`) y su enmienda (unicidad global); S-05 deja `buscarPorCedula` y la unicidad `(cedula)` (SUP-S05-006 y SUP-S05-015) (verificado con `grep -n` en `ADR-004` y `S-05`).
- No verificado: la longitud real de los carnés de extranjería y de los pasaportes que presentan los socios de Adhara, y el contenido de las 6 pruebas que mencionan `cedula`.

### 0.5 Supuestos
- SUP-S06-001: el CE tiene entre 9 y 12 caracteres alfanuméricos y el pasaporte entre 6 y 12; el DNI tiene exactamente 8 dígitos. Default: esos rangos, como constantes en `documento.ts`; asumido, por validar.
- SUP-S06-002: el código de socio tiene exactamente 4 dígitos (`0001` a `9999`), se asigna solo a quien tiene CE o pasaporte, y nunca a quien tiene DNI. Como todo documento válido tiene al menos 6 caracteres, un identificador de 4 dígitos nunca coincide con un documento. Default: ese formato y esa regla; asumido, por validar.
- SUP-S06-003: el código lo asigna el sistema (máximo existente más uno) y el personal no lo edita; una vez asignado no cambia aunque el miembro cambie de tipo. Default: asignación automática y permanente; asumido, por validar.
- SUP-S06-004: la normalización recorta espacios, pasa a mayúsculas y quita espacios y guiones internos; no quita otros símbolos, que la validación rechaza. Default: esa normalización; asumido, por validar.
- SUP-S06-005: el cuerpo de `api/checkin` pasa a `{ identificador }`, un texto de dígitos; el kiosco envía lo tecleado sin interpretarlo y el servidor decide si es código de socio (4 dígitos) o documento. Default: ese contrato; asumido, por validar con S-21.
- SUP-S06-006: no hay datos que migrar ni pendientes en kioscos en uso: el baseline se genera nuevo (S-15) y la cola local de un kiosco con el formato anterior se vacía al actualizar el kiosco. Default: sin migración; asumido, por validar.
- SUP-S06-007: los archivos de la familia del padrón mantienen `cedula` para `MiembroReferencia` hasta que S-10 los elimine, con una exención cerrada y con tope por archivo; su único cambio es llamar a `validarDocumento` con tipo DNI cuando la cédula tiene 8 dígitos y fallar con `DocumentoInvalidoError` en otro caso. Default: edición mínima; asumido, por validar.
- SUP-S06-008: el documento se muestra completo en las pantallas del panel, que son internas, y nunca en la respuesta del check-in. Default: ese criterio; asumido, por validar con S-13.

## 1. Requisitos

### REQ-S06-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El esquema deberá definir el enum TipoDocumento con los valores DNI, CE y PASAPORTE y la columna Miembro.tipoDocumento obligatoria con valor por defecto DNI.

### REQ-S06-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La columna Miembro.numeroDocumento deberá reemplazar a Miembro.cedula como texto obligatorio y único en todo el sistema, sin incluir el tipo en la unicidad.

### REQ-S06-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La columna Miembro.codigoSocio deberá ser opcional, única en todo el sistema y limitada por la base a cuatro dígitos.

### REQ-S06-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La base deberá rechazar un numeroDocumento que no cumpla el formato de su tipo: DNI de 8 dígitos, CE de 9 a 12 caracteres alfanuméricos en mayúsculas y PASAPORTE de 6 a 12 caracteres alfanuméricos en mayúsculas.

### REQ-S06-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La función normalizarDocumento deberá devolver el texto recortado, en mayúsculas y sin espacios ni guiones.

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
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El repositorio de miembros deberá convertir la violación de la unicidad de numeroDocumento en DocumentoDuplicadoError.

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
- texto: Si la inserción de un código de socio choca con otro asignado a la vez entonces crearMiembro deberá recalcular el código y reintentar hasta tres veces.

### REQ-S06-013
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-004
- texto: Si el mayor código existente es 9999 entonces crearMiembro deberá lanzar CodigosSocioAgotadosError sin crear el miembro.

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
- texto: El puerto IMemberRepository deberá reemplazar buscarPorCedula por buscarPorDocumento y buscarPorCodigoSocio, sin parámetro de organización.

### REQ-S06-019
- tipo: cuando
- prioridad: MUST
- origen: ADR-004
- texto: Cuando el identificador de registrarCheckIn tiene exactamente cuatro dígitos, deberá buscar al miembro por codigoSocio.

### REQ-S06-020
- tipo: cuando
- prioridad: MUST
- origen: ADR-004
- texto: Cuando el identificador de registrarCheckIn no tiene exactamente cuatro dígitos, deberá buscar al miembro por numeroDocumento normalizado.

### REQ-S06-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La ruta api/checkin deberá aceptar solo un cuerpo con el campo identificador de texto no vacío y responder 400 en cualquier otro caso.

### REQ-S06-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La respuesta de api/checkin no deberá contener numeroDocumento ni codigoSocio.

### REQ-S06-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La ruta api/miembros deberá aceptar los campos tipoDocumento y numeroDocumento, rechazar con 400 el campo cedula y rechazar con 400 un tipoDocumento fuera del enum.

### REQ-S06-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: Los mensajes de error y los registros del sistema no deberán contener el número de documento de ningún miembro.

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
- origen: ADR-004
- texto: La activación desde el padrón deberá validar la cédula del padrón con validarDocumento de tipo DNI y fallar con DocumentoInvalidoError si no cumple.

### REQ-S06-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-019
- texto: Los archivos de apps y packages, salvo node_modules, .next, generated y las exenciones cerradas de la familia S-10, no deberán contener la palabra cedula sin distinguir mayúsculas.

### REQ-S06-031
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-documento.mjs encuentra la palabra cedula fuera de las exenciones o por encima del tope de una exención, deberá terminar con código distinto de cero y nombrar archivo y línea.

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

## 2. Comportamiento

### BEH-S06-001
- cubre: REQ-S06-001, REQ-S06-002, REQ-S06-003
- categoria: feliz
- dado: una base creada con el esquema final
- cuando: se consultan las columnas y restricciones de Miembro
- entonces: existen tipoDocumento con valor por defecto DNI, numeroDocumento único y codigoSocio opcional único, no existe la columna cedula y la unicidad de numeroDocumento no incluye el tipo

### BEH-S06-002
- cubre: REQ-S06-004
- categoria: error
- dado: una base con el esquema final
- cuando: se inserta un miembro DNI con "1234567", otro CE con "ABC" y otro PASAPORTE con "abc12345"
- entonces: la base rechaza las tres inserciones

### BEH-S06-003
- cubre: REQ-S06-005
- categoria: feliz
- dado: los textos " 12-345 678 " y "ab-1234 567"
- cuando: se llama a normalizarDocumento
- entonces: devuelve "12345678" y "AB1234567"

### BEH-S06-004
- cubre: REQ-S06-006
- categoria: borde
- dado: DNI "12345678", "1234567", "123456789" y "1234567A"; CE "001234567" y "12345678"; PASAPORTE "ABC123" y "AB12"
- cuando: se llama a validarDocumento con cada uno
- entonces: son válidos DNI "12345678", CE "001234567" y PASAPORTE "ABC123", y los demás no

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
- dado: una base sin miembros y dos altas simultáneas de miembros CE con números distintos
- cuando: terminan las dos transacciones
- entonces: ambas se confirman con los códigos "0001" y "0002", uno de ellos tras recalcular el código

### BEH-S06-010
- cubre: REQ-S06-013
- categoria: error
- dado: un miembro CE con el código "9999"
- cuando: se crea otro miembro CE
- entonces: lanza CodigosSocioAgotadosError y no se crea la fila

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
- dado: un miembro DNI sin código
- cuando: se cambia su tipo a CE con un número válido, luego a DNI y luego otra vez a CE
- entonces: al pasar a CE recibe el siguiente código, al volver a DNI lo conserva y al volver a CE sigue con el mismo código

### BEH-S06-016
- cubre: REQ-S06-018
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
- dado: un miembro DNI "12345678" y ningún miembro con código "0007"
- cuando: se registra un check-in con el identificador "12345678", otro con "00000007" y otro con "7"
- entonces: el primero encuentra al miembro por documento y los otros dos lanzan MiembroNoEncontradoError, sin buscar por código

### BEH-S06-019
- cubre: REQ-S06-021
- categoria: error
- dado: peticiones a api/checkin con cuerpo vacío, con identificador vacío, con identificador numérico y con el campo cedula
- cuando: se ejecutan con la clave del kiosco
- entonces: las cuatro responden 400 sin registrar acceso

### BEH-S06-020
- cubre: REQ-S06-022
- categoria: feliz
- dado: un miembro vigente con número "12345678" y código "0001"
- cuando: se hace un check-in con éxito
- entonces: el cuerpo de la respuesta no contiene "12345678" ni "0001" ni los campos numeroDocumento y codigoSocio

### BEH-S06-021
- cubre: REQ-S06-023
- categoria: error
- dado: peticiones a api/miembros con el campo cedula y con tipoDocumento "RUC"
- cuando: se ejecutan como socio
- entonces: ambas responden 400 y no se crea ningún miembro

### BEH-S06-022
- cubre: REQ-S06-024
- categoria: feliz
- dado: un alta inválida y un alta duplicada con el número "12345678"
- cuando: se captura el mensaje de error y toda la salida de registro
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
- dado: una fila de padrón con cédula "AB123" y otra con "12345678"
- cuando: se activan desde el padrón
- entonces: la primera lanza DocumentoInvalidoError y la segunda crea un miembro DNI

### BEH-S06-028
- cubre: REQ-S06-030
- categoria: feliz
- dado: el árbol final de apps y packages
- cuando: se busca la palabra cedula sin distinguir mayúsculas
- entonces: solo aparece en los archivos de la exención cerrada de S-10, dentro de su tope

### BEH-S06-029
- cubre: REQ-S06-031
- categoria: error
- dado: un archivo fuera de las exenciones con cedula, otro con buscarPorOrganizacionYCedula y un archivo exento que supera su tope
- cuando: se ejecuta tools/verificar-documento.mjs
- entonces: falla y nombra archivo y línea de los tres

### BEH-S06-030
- cubre: REQ-S06-032
- categoria: error
- dado: un pull request que agrega la palabra cedula en un archivo no exento
- cuando: corre el CI
- entonces: el paso de tools/verificar-documento.mjs falla y queda en rojo

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
- propiedad: todo numeroDocumento cumple el formato de su tipo
- mecanismo: restriccion-bd
- deteccion: CHECK por tipo sobre numeroDocumento; una fila con formato inválido falla al insertarse o actualizarse
- protege: REQ-S06-004, REQ-S06-007, REQ-S06-015

### INV-S06-004
- propiedad: normalizarDocumento es idempotente y valida(normalizar(x)) no depende de espacios, guiones ni mayúsculas del original
- mecanismo: test-propiedad
- deteccion: 500 cadenas generadas con semilla fija; normalizar(normalizar(x)) debe ser igual a normalizar(x)
- protege: REQ-S06-005, REQ-S06-006

### INV-S06-005
- propiedad: ningún documento válido coincide con un código de socio, porque ninguna cadena de cuatro dígitos es un documento válido de ningún tipo
- mecanismo: test-propiedad
- deteccion: para los 10 000 textos de cuatro dígitos, validarDocumento devuelve falso con los tres tipos
- protege: REQ-S06-019, REQ-S06-020

### INV-S06-006
- propiedad: la palabra cedula no aparece en apps ni packages fuera de las exenciones cerradas
- mecanismo: lint
- deteccion: tools/verificar-documento.mjs devuelve al menos un archivo
- protege: REQ-S06-030, REQ-S06-031

## 4. Criterios de aceptación

### AC-S06-001
- enlaza: REQ-S06-001, REQ-S06-002, REQ-S06-003, BEH-S06-001
- metodo: sql
- procedimiento: consultar las columnas, el enum y las restricciones de Miembro en la base creada con el esquema final
- esperado: existen el enum TipoDocumento con tres valores, tipoDocumento con valor por defecto DNI, numeroDocumento único sin tipo y codigoSocio opcional único, y no existe la columna cedula
- test: pendiente

### AC-S06-002
- enlaza: REQ-S06-004, REQ-S06-003, BEH-S06-002, INV-S06-002, INV-S06-003
- metodo: sql
- procedimiento: insertar un DNI con "1234567", un CE con "ABC", un PASAPORTE con "abc12345" y un miembro con codigoSocio "12"
- esperado: la base rechaza las cuatro inserciones por las restricciones de formato
- test: pendiente

### AC-S06-003
- enlaza: REQ-S06-005, REQ-S06-006, BEH-S06-003, BEH-S06-004, INV-S06-004, INV-S06-005
- metodo: unitario
- procedimiento: probar normalizarDocumento y validarDocumento con los casos de BEH-S06-003 y BEH-S06-004, y con 500 cadenas generadas y los 10 000 textos de cuatro dígitos
- esperado: los resultados coinciden con los de los comportamientos, normalizar es idempotente y ningún texto de cuatro dígitos es válido con ningún tipo
- test: pendiente

### AC-S06-004
- enlaza: REQ-S06-007, REQ-S06-008, REQ-S06-015, REQ-S06-016, REQ-S06-024, BEH-S06-005, BEH-S06-006, BEH-S06-012, BEH-S06-013, BEH-S06-014, BEH-S06-022
- metodo: integracion
- procedimiento: ejecutar crearMiembro y actualizarMiembro contra una base efímera con los casos de esos comportamientos y capturar los mensajes y la salida de registro
- esperado: se lanzan los errores indicados sin cambiar filas, el caso del mismo número escrito con separadores se confirma y ningún mensaje ni registro contiene el número
- test: pendiente

### AC-S06-005
- enlaza: REQ-S06-009, BEH-S06-007, INV-S06-001
- metodo: integracion
- procedimiento: lanzar con Promise.all dos altas de miembros DNI con el número "12345678"
- esperado: una se confirma, la otra lanza DocumentoDuplicadoError y la tabla tiene un solo miembro con ese número
- test: pendiente

### AC-S06-006
- enlaza: REQ-S06-010, REQ-S06-011, REQ-S06-013, REQ-S06-014, BEH-S06-008, BEH-S06-010, BEH-S06-011
- metodo: integracion
- procedimiento: crear en orden un CE, un PASAPORTE y un DNI; en otra base crear miembros con los códigos "0001" y "0005" y luego un PASAPORTE; en otra, un CE con el código "9999" y luego otro CE
- esperado: códigos "0001" y "0002" y DNI sin código; el nuevo recibe "0006"; el último alta lanza CodigosSocioAgotadosError sin crear la fila
- test: pendiente

### AC-S06-007
- enlaza: REQ-S06-012, BEH-S06-009, INV-S06-002
- metodo: integracion
- procedimiento: con una base sin miembros, lanzar con Promise.all dos altas de miembros CE con números distintos
- esperado: ambas se confirman con los códigos "0001" y "0002" y la tabla no tiene códigos repetidos
- test: pendiente

### AC-S06-008
- enlaza: REQ-S06-017, REQ-S06-033, BEH-S06-015
- metodo: integracion
- procedimiento: crear un miembro DNI sin código, cambiar su tipo a CE, luego a DNI y luego a CE
- esperado: recibe el siguiente código al pasar a CE y mantiene el mismo código en los cambios siguientes
- test: pendiente

### AC-S06-009
- enlaza: REQ-S06-018, BEH-S06-016
- metodo: integracion
- procedimiento: llamar a buscarPorDocumento y buscarPorCodigoSocio con valores existentes e inexistentes y verificar con la API de typescript que el puerto no declara buscarPorCedula ni parámetros de organización
- esperado: devuelven los miembros esperados o nulo y el puerto solo declara los dos métodos nuevos
- test: pendiente

### AC-S06-010
- enlaza: REQ-S06-019, REQ-S06-020, BEH-S06-017, BEH-S06-018, INV-S06-005
- metodo: integracion
- procedimiento: registrar check-ins con los identificadores "0002", "12345678", "00000007" y "7" sobre la base de esos comportamientos
- esperado: "0002" y "12345678" registran el acceso; "00000007" y "7" lanzan MiembroNoEncontradoError
- test: pendiente

### AC-S06-011
- enlaza: REQ-S06-021, REQ-S06-022, BEH-S06-019, BEH-S06-020
- metodo: integracion
- procedimiento: llamar a api/checkin con cuerpo vacío, con identificador vacío, numérico y con el campo cedula, y luego con un identificador válido
- esperado: los cuatro primeros responden 400 sin registrar acceso y el cuerpo de la respuesta válida no contiene numeroDocumento, codigoSocio ni sus valores
- test: pendiente

### AC-S06-012
- enlaza: REQ-S06-023, BEH-S06-021
- metodo: integracion
- procedimiento: llamar a api/miembros como socio con el campo cedula, con tipoDocumento "RUC" y con campos válidos
- esperado: las dos primeras responden 400 sin crear miembro y la tercera crea el miembro
- test: pendiente

### AC-S06-013
- enlaza: REQ-S06-025, REQ-S06-026, REQ-S06-027, BEH-S06-023, BEH-S06-024, BEH-S06-025
- metodo: e2e
- procedimiento: como socio, crear un miembro CE con "ab-12345678" y uno DNI con "1234567", abrir la ficha de un CE y de un DNI, y buscar "Lucía", "5678" y "0001" en la lista y en el selector de miembro
- esperado: el CE se guarda como "AB12345678", el DNI muestra el error junto al campo, solo la ficha del CE muestra el código y las tres búsquedas encuentran al miembro en ambas pantallas
- test: pendiente

### AC-S06-014
- enlaza: REQ-S06-028, BEH-S06-026
- metodo: unitario
- procedimiento: probar el cliente del kiosco y su cola con una conexión simulada que primero falla y luego responde
- esperado: la petición lleva { identificador: "0001" }, la cola guarda ese objeto y el reenvío usa el mismo valor
- test: pendiente

### AC-S06-015
- enlaza: REQ-S06-029, BEH-S06-027
- metodo: unitario
- procedimiento: ejecutar ActivarMiembroDesdePadron con las filas "AB123" y "12345678"
- esperado: la primera lanza DocumentoInvalidoError y la segunda crea un miembro de tipo DNI
- test: pendiente

### AC-S06-016
- enlaza: REQ-S06-030, REQ-S06-031, BEH-S06-028, BEH-S06-029, INV-S06-006
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-documento.mjs con un árbol con cedula fuera de las exenciones, otro con buscarPorOrganizacionYCedula, otro con una exención que supera su tope y otro limpio; después ejecutarla sobre el árbol final
- esperado: falla en los tres primeros nombrando archivo y línea, pasa con el limpio y en el árbol final solo aparecen archivos exentos dentro de su tope
- test: pendiente

### AC-S06-017
- enlaza: REQ-S06-032, BEH-S06-030
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue la palabra cedula en un archivo no exento y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-documento.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso, cada commit con typecheck y pruebas en verde): (1) pruebas de `normalizarDocumento` y `validarDocumento`, con las pruebas de propiedad de INV-S06-004 e INV-S06-005, en rojo; (2) `packages/domain/utils/documento.ts`; (3) esquema: `TipoDocumento`, `tipoDocumento`, `numeroDocumento`, `codigoSocio` y sus CHECK y únicos (se verifica que `drizzle-kit push` crea los CHECK, como en S-05) y ajuste de la entidad `Miembro`; (4) repositorio con `buscarPorDocumento`, `buscarPorCodigoSocio`, el máximo del código y la conversión de las violaciones únicas en `DocumentoDuplicadoError` y en el choque de código; (5) casos de uso `crearMiembro`, `actualizarMiembro` y `registrarCheckIn` con sus errores; (6) rutas `api/checkin` y `api/miembros` con esquemas `zod` estrictos (S-01) y acciones del panel; (7) pantallas: formulario, ficha, lista, selector y cobro; (8) kiosco: campo, cliente y cola; (9) familia del padrón, con el cambio mínimo de SUP-S06-007; (10) `tools/verificar-documento.mjs` con `tools/verificar-documento.exenciones.json` y el CI.
- Las pruebas de concurrencia usan semillas fijas y una base efímera; no hay dependencias nuevas.
- La exención de la familia S-10 es una lista cerrada con un tope de líneas por archivo; solo S-10 puede vaciarla.

### 5.2 Migración
- No hay datos que migrar (SUP-S06-006): el baseline se genera en S-15 y la base se crea con `drizzle-kit push` (S-22).
- **Enmiendas que se registran al aprobar S-06:**
  - S-22: el esquema final tiene 16 enums (se agrega `TipoDocumento`) y 23 tablas; la unicidad `(cedula)` pasa a `numeroDocumento`.
  - S-05: REQ-S05-007, BEH-S05-006, BEH-S05-023, AC-S05-004 e INV-S05-003 hablan de la cédula; pasan a `numeroDocumento`; SUP-S05-006 y SUP-S05-015 quedan cumplidos.
  - S-01: los esquemas `zod` de `api/checkin` (`{ identificador }`) y de `api/miembros` (`tipoDocumento` y `numeroDocumento`, sin `cedula`).
  - `docs/00-indice.md` y ADR-004: nota de que S-06 fijó el formato del código de socio (cuatro dígitos).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- 40 archivos cambian de nombre; el riesgo es una consulta que siga usando el nombre viejo. Mitigación: el typecheck y la herramienta de la palabra `cedula`.
- Un CE o un pasaporte con un formato distinto del supuesto no podría registrarse. Mitigación: los rangos son constantes en `documento.ts` (SUP-S06-001) y se validan con el propietario.
- El código de socio de 4 dígitos se agota en 9999 altas con CE o pasaporte; para un gimnasio de un local es muy superior a lo necesario, y `CodigosSocioAgotadosError` falla sin crear la fila.
- El kiosco muestra en pantalla lo que teclea el socio, que puede ser su DNI; es una decisión de S-21 enmascararlo.
- Un kiosco que no se actualiza enviaría `{ cedula }` y recibiría 400. Mitigación: el kiosco y el servidor cambian en el mismo despliegue y la cola local vieja se vacía (SUP-S06-006); los APK de `vitrina-tv` no están verificados.
- Se editan archivos de la familia del padrón que S-10 borra después; es trabajo que se pierde, acotado a cambios mínimos (SUP-S06-007).

### 5.4 Preguntas abiertas
- ¿El código de socio de 4 dígitos, asignado solo a quien tiene CE o pasaporte, te sirve? Default: sí (SUP-S06-002).
- ¿Los rangos de longitud de CE (9 a 12) y pasaporte (6 a 12) son adecuados para tus socios? Default: sí (SUP-S06-001).
- ¿Se enmascara en el kiosco lo que teclea el socio? Default: no se decide aquí; lo resuelve S-21.
