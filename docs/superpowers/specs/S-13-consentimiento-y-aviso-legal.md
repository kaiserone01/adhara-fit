---
id: S-13
estado: aprobada
adrs: ADR-006, ADR-012, ADR-013, ADR-016, ADR-022
depende_de: S-00, S-01, S-02, S-04, S-05, S-06, S-09, S-12, S-22, S-23
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-13 — Consentimiento de datos personales, política de privacidad y aviso del Libro de Reclamaciones

## 0. Contexto y alcance

### 0.1 Problema
El gimnasio guarda datos personales de sus miembros (nombre, documento de identidad, teléfono, foto y, desde S-12, correo). Los requisitos RF-15, RF-71 y RF-72 del PRD, obligatorios en el MVP, piden: registrar el consentimiento de tratamiento de datos con su fecha y la versión del texto aceptado (Ley 29733), tener el texto de consentimiento y la política de privacidad accesibles desde el alta, y tener el aviso del Libro de Reclamaciones en el local (Ley 29571). Hoy el código no registra nada de esto, y el listado de miembros entrega el documento completo de todos al navegador (hallazgo que S-06 traspasó aquí). Los textos legales los debe redactar o revisar un abogado (P-13): el sistema no incluye texto legal propio; ofrece dónde publicarlo con versiones, cómo registrar la aceptación y cómo imprimir el aviso, y la spec entrega plantillas borrador para que el abogado las revise. No hay sitio público: todo es interno.

### 0.2 Dentro de alcance
- Tabla `TextoLegal` (versionada e inmutable) para tres tipos: `CONSENTIMIENTO`, `POLITICA_PRIVACIDAD` y `AVISO_RECLAMACIONES`, y la pantalla para publicar una versión nueva.
- Tabla `ConsentimientoMiembro`: aceptación con fecha, versión del texto, medio (pantalla o papel) y quién la registró, y su revocación.
- Exigir la aceptación en el alta de un miembro (formulario del panel y `POST api/miembros`) cuando hay un texto de consentimiento publicado; registrar la aceptación de miembros existentes; revocarla.
- Estado de consentimiento en la lista de miembros y filtro «Pendientes de consentimiento».
- Página `/privacidad` con la política y el consentimiento vigentes, enlazada desde el alta.
- Datos del negocio para el aviso (`razonSocial`, `ruc`, `direccion` en `ConfiguracionNegocio`) y la página imprimible `/libro-de-reclamaciones`.
- Documento enmascarado en la lista de miembros y en `GET api/miembros`, con búsqueda en el servidor y tope de resultados.
- Tres plantillas borrador para el abogado en `docs/legal/` (no se cargan en el sistema).

### 0.3 Fuera de alcance
- Redactar el texto legal definitivo, que lo hace o revisa un abogado antes de publicarlo (P-13); las plantillas son borradores.
- Un Libro de Reclamaciones virtual (formulario público o registro de reclamos): no hay sitio público; el libro físico lo lleva el gimnasio (SUP-S13-007).
- Atender solicitudes ARCO con supresión o anonimización: el propietario decidió no anonimizar (2026-11-12, ADR-013 enmendado); los datos de un miembro eliminado se conservan.
- Plazo de retención y borrado programado (P-20).
- El consentimiento del ticket por correo: ya lo registra S-12 (`correoConsentidoEn`); aquí solo se limpia al revocar y se bloquea si el miembro está en estado REVOCADO.
- Quitar de la lista otros datos personales (celular, fecha de nacimiento, correo): esta spec solo enmascara el documento.
- Enmascarado del documento en el kiosco y límite de intentos: S-21.
- Registro de incidentes de seguridad: no hay requisito.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-13 recibirá después de S-00 a S-12, S-22 y S-23; se recontarán al empezar.
- **Sin consentimiento ni textos legales:** el esquema no tiene ninguna tabla ni campo de consentimiento, política o reclamaciones (`grep -in "consentimiento\|privacidad\|reclam" packages/db/prisma/schema.prisma` sin resultados); el formulario de alta es `miembros/nuevo/page.tsx` con `FormularioMiembro.tsx` (verificado con `grep` y `ls`).
- **Lista completa al navegador:** `GET api/miembros` llama a `listarMiembros` y devuelve `{ miembros }` con todos los miembros de la sede sin paginar ni filtrar (`api/miembros/route.ts:10-25`); `miembros/page.tsx:73` pasa la lista completa a `ListaMiembros`, que filtra en el cliente con `normalizarTexto` sobre nombre y cédula (`ListaMiembros.tsx:105-113`, con `MINIMO_CARACTERES_BUSQUEDA`); ningún archivo de `apps` hace `fetch` a `api/miembros` (solo la ruta y su `[id]` la nombran, verificado con `grep -rn "api/miembros"`).
- **Llamadores de `crearMiembro`:** `miembros/actions.ts:151` y `api/miembros/route.ts:45` (POST) (verificado con `grep -n crearMiembro`).
- **Confidencialidad en el panel:** S-06 (SUP-S06-008) muestra el documento completo en el panel y nunca en la respuesta del check-in, y deja a S-13 la lista que filtra en el cliente (S-06 §0.3, línea 33; verificado con `grep -n` en S-06).
- **Negocio sin datos fiscales:** S-05 crea `ConfiguracionNegocio` con el nombre del negocio y los campos `reposo*` y `vitrina*`, sin razón social, RUC ni dirección (REQ-S05-003, verificado con `grep -n ConfiguracionNegocio` en S-05).
- **Decisiones previas:** ADR-013 (enmendado) conserva los datos del miembro eliminado y descarta la anonimización; S-09 define `MiembroEliminadoError`, el estado `BAJA` y el bloqueo y relectura del miembro con `bloquearPorId` de S-04; S-12 define `Miembro.correoConsentidoEn`, la validación del RUC y los interruptores; PRD RF-15, RF-71, RF-72 y RNF-05 (Ley 29733 y DS 016-2024-JUS, vigencia por **[VERIFICAR]**); P-13 (quién redacta los textos) sin respuesta, con la respuesta propuesta «Plantilla para revisar» (verificado con `grep -n` en los docs, `docs/01:78,132-133,143` y `docs/08:38`).
- No verificado: el contenido exacto que exigen la Ley 29733, su reglamento y la Ley 29571 para el consentimiento, la política y el aviso; el plazo de respuesta a los reclamos; y si el aviso físico debe llevar datos que el sistema no tiene.

### 0.5 Supuestos
- SUP-S13-001: hay tres tipos de texto legal —`CONSENTIMIENTO`, `POLITICA_PRIVACIDAD` y `AVISO_RECLAMACIONES`—, versionados con enteros consecutivos desde 1 por tipo, inmutables una vez publicados; la versión vigente de un tipo es la mayor. La versión 1 de cada tipo se guarda siempre como cambio sustancial. Default: ese modelo; asumido, por validar.
- SUP-S13-002: el contenido de un texto legal es texto plano de 20 a 20 000 caracteres (recortado), y se muestra siempre como texto con saltos de línea, nunca como HTML. Default: texto plano; asumido, por validar.
- SUP-S13-003: mientras no haya un `CONSENTIMIENTO` publicado el alta no exige aceptación y el panel muestra, en la parte superior de todas sus páginas, el aviso «Falta publicar el texto de consentimiento»; desde que se publique, el alta de un miembro nuevo exige marcarla. Default: ese comportamiento, para no frenar la operación mientras el abogado entrega el texto; asumido, por validar.
- SUP-S13-004: la aceptación la registra el administrador en nombre del miembro, indicando si fue en pantalla o en papel; no hay firma digital ni captura del miembro. Default: registro por el administrador; asumido, por validar.
- SUP-S13-005: una versión nueva del consentimiento solo obliga a aceptarla de nuevo cuando se publica marcada «cambio sustancial»; el estado DESACTUALIZADO compara la versión aceptada con la mayor versión marcada como cambio sustancial. Default: re-aceptación solo con cambio sustancial; asumido, por validar.
- SUP-S13-006: revocar el consentimiento no elimina ni anonimiza datos (decisión del propietario sobre la anonimización) y no cambia el estado del miembro; registra la fecha, el motivo y el autor, deja al miembro como «Revocado», borra su marca de correo de S-12 y bloquea que se vuelva a fijar esa marca o se envíen tickets mientras esté REVOCADO. Un miembro REVOCADO sale de ese estado cuando se registra una aceptación nueva. Default: ese efecto; asumido, por validar, con riesgo legal aceptado.
- SUP-S13-007: el Libro de Reclamaciones es físico: el sistema solo imprime el aviso con los datos del negocio y el texto publicado; no registra reclamos. Default: aviso impreso; asumido, por validar.
- SUP-S13-008: la lista de miembros no incluye el documento completo: muestra los últimos 3 caracteres precedidos de puntos; la búsqueda por nombre, documento o código de socio se hace en el servidor con el parámetro `q` (contiene, sin distinguir mayúsculas ni tildes, de al menos `MINIMO_CARACTERES_BUSQUEDA` y hasta 80 caracteres, con `%` y `_` tomados como texto), ordenada por nombre ascendente, con un tope de 100 resultados y un indicador `hayMas` cuando hay más; el documento completo solo aparece en la ficha. Default: ese criterio; asumido, por validar.
- SUP-S13-009: la política y el consentimiento se leen en `/privacidad`, página interna con sesión, desde un enlace del alta; el miembro los lee en la pantalla del administrador o en papel. Default: página interna; asumido, por validar.
- SUP-S13-010: las plantillas de `docs/legal/` son tres archivos borrador (`plantilla-consentimiento.md`, `plantilla-politica-privacidad.md` y `plantilla-aviso-reclamaciones.md`) con la marca «BORRADOR PARA REVISIÓN DE UN ABOGADO — NO PUBLICAR SIN REVISAR»; el propietario las entrega al abogado y publica el texto revisado desde la pantalla, y ningún comando las carga solas. Default: marca visible y carga manual; asumido, por validar (alineado con la respuesta propuesta de P-13, «plantilla para revisar»).
- SUP-S13-011: si se publica una versión nueva del consentimiento mientras se crea un miembro, el miembro queda con la versión que se leyó al empezar su creación; si la nueva es de cambio sustancial, aparecerá como DESACTUALIZADO. Default: sin bloqueo entre publicar y crear miembros; asumido, por validar.

## 1. Requisitos

### REQ-S13-001
- tipo: ubicuo
- prioridad: MUST
- origen: RF-15
- texto: La base de datos deberá tener la tabla TextoLegal con tipo, versión, contenido, cambioSustancial, fecha de publicación y administrador que la publicó, y una restricción única sobre el tipo y la versión.

### REQ-S13-002
- tipo: ubicuo
- prioridad: MUST
- origen: RF-15
- texto: La base de datos deberá rechazar cualquier UPDATE o DELETE sobre TextoLegal con un disparador que lance una excepción.

### REQ-S13-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-001
- texto: publicarTextoLegal deberá guardar el texto con la versión siguiente a la mayor existente del tipo, o 1 si no hay ninguna.

### REQ-S13-004
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-001
- texto: publicarTextoLegal deberá guardar la versión 1 de cada tipo con cambioSustancial verdadero.

### REQ-S13-005
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-002
- texto: Si el contenido recortado tiene menos de 20 o más de 20 000 caracteres, o el tipo no es uno de los tres, entonces publicarTextoLegal deberá rechazarlo con TextoLegalInvalidoError sin escribir nada.

### REQ-S13-006
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos publicaciones simultáneas del mismo tipo llegan a la vez entonces publicarTextoLegal deberá producir dos versiones consecutivas distintas y no un error crudo del motor.

### REQ-S13-007
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-002
- texto: El sistema deberá mostrar el contenido de un texto legal como texto con saltos de línea, sin interpretar HTML.

### REQ-S13-008
- tipo: ubicuo
- prioridad: MUST
- origen: RF-72
- texto: La página /privacidad deberá mostrar el CONSENTIMIENTO y la POLITICA_PRIVACIDAD vigentes con su versión y fecha de publicación.

### REQ-S13-009
- tipo: mientras
- prioridad: MUST
- origen: RF-72
- texto: Mientras no haya un texto vigente de un tipo, la página /privacidad deberá mostrar «Aún no se ha publicado» en lugar de ese texto.

### REQ-S13-010
- tipo: ubicuo
- prioridad: MUST
- origen: RF-72
- texto: El formulario de alta de miembro deberá enlazar la página /privacidad.

### REQ-S13-011
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-001
- texto: La pantalla de textos legales deberá permitir publicar una versión nueva de cada tipo y marcarla como cambio sustancial.

### REQ-S13-012
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-001
- texto: La pantalla de textos legales deberá mostrar el historial de versiones de cada tipo con su fecha, autor y marca de cambio sustancial.

### REQ-S13-013
- tipo: ubicuo
- prioridad: MUST
- origen: RF-15
- texto: La base de datos deberá tener la tabla ConsentimientoMiembro con el miembro, el texto aceptado y su tipo, la fecha de aceptación, el medio PANTALLA o PAPEL, el administrador que la registró y los datos de revocación.

### REQ-S13-014
- tipo: ubicuo
- prioridad: MUST
- origen: RF-15
- texto: ConsentimientoMiembro deberá tener una clave foránea compuesta a TextoLegal sobre el texto y su tipo y un CHECK que fije ese tipo en CONSENTIMIENTO.

### REQ-S13-015
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-006
- texto: ConsentimientoMiembro deberá tener una restricción única parcial sobre el miembro y el texto que solo cuente las aceptaciones no revocadas.

### REQ-S13-016
- tipo: si-entonces
- prioridad: MUST
- origen: RF-15
- texto: Si hay un CONSENTIMIENTO vigente y el alta de un miembro no trae la aceptación y el medio entonces crearMiembro deberá rechazarla con ConsentimientoRequeridoError sin crear nada.

### REQ-S13-017
- tipo: cuando
- prioridad: MUST
- origen: RF-15
- texto: Cuando hay un CONSENTIMIENTO vigente y se crea un miembro con su aceptación, crearMiembro deberá crear el miembro y su ConsentimientoMiembro con la versión vigente en la misma transacción.

### REQ-S13-018
- tipo: mientras
- prioridad: MUST
- origen: SUP-S13-003
- texto: Mientras no haya un CONSENTIMIENTO vigente, crearMiembro no deberá exigir la aceptación ni crear un ConsentimientoMiembro.

### REQ-S13-019
- tipo: ubicuo
- prioridad: MUST
- origen: RF-15
- texto: El formulario del panel y el POST de api/miembros deberán recibir la aceptación y el medio.

### REQ-S13-050
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El POST de api/miembros deberá validar la aceptación y el medio con el esquema de entrada de S-01.

### REQ-S13-020
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-004
- texto: registrarConsentimiento deberá crear la aceptación de un miembro existente con la versión vigente, el medio indicado, el administrador y la fecha y hora de Lima del servidor.

### REQ-S13-021
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-004
- texto: Si no hay un CONSENTIMIENTO vigente o el miembro no existe o está eliminado entonces registrarConsentimiento deberá rechazarlo con SinTextoVigenteError, MiembroNoEncontradoError o MiembroEliminadoError sin escribir nada.

### REQ-S13-022
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-013
- texto: Si el miembro ya tiene una aceptación no revocada de la versión vigente entonces registrarConsentimiento deberá devolver la existente sin crear otra.

### REQ-S13-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: registrarConsentimiento y revocarConsentimiento deberán bloquear la fila del miembro con bloquearPorId de S-04 y releer su estado antes de validar.

### REQ-S13-024
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos registros simultáneos del mismo miembro y la misma versión llegan a la vez entonces registrarConsentimiento deberá crear una sola fila y devolver la misma a ambos.

### REQ-S13-025
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-006
- texto: revocarConsentimiento deberá marcar la aceptación no revocada del miembro con la fecha y hora de Lima, el motivo de 5 a 200 caracteres y el administrador que la revoca.

### REQ-S13-026
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-006
- texto: Si el miembro no tiene una aceptación no revocada o el motivo no cumple el largo entonces revocarConsentimiento deberá rechazarlo con SinConsentimientoError o MotivoInvalidoError sin escribir nada.

### REQ-S13-027
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-006
- texto: revocarConsentimiento deberá poner en nulo la marca correoConsentidoEn del miembro dentro de la misma transacción.

### REQ-S13-028
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-006
- texto: revocarConsentimiento no deberá eliminar, anonimizar ni cambiar el estado del miembro.

### REQ-S13-051
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: revocarConsentimiento deberá poder aplicarse a un miembro eliminado.

### REQ-S13-029
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-006
- texto: Si el miembro está en estado de consentimiento REVOCADO entonces guardar un correo con aceptación y enviarTicketPorCorreo deberán rechazarse con ConsentimientoRevocadoError sin escribir ni llamar al puerto de correo.

### REQ-S13-030
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-005
- texto: El estado de consentimiento de un miembro deberá ser SIN_TEXTO si no hay CONSENTIMIENTO publicado y REVOCADO si su aceptación más reciente está revocada.

### REQ-S13-031
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-005
- texto: El estado de consentimiento de un miembro con una aceptación más reciente no revocada deberá ser DESACTUALIZADO si su versión es menor que la mayor versión marcada como cambio sustancial y VIGENTE en los demás casos.

### REQ-S13-032
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-005
- texto: El estado de consentimiento de un miembro sin ninguna aceptación, con un CONSENTIMIENTO publicado, deberá ser SIN_CONSENTIMIENTO.

### REQ-S13-033
- tipo: ubicuo
- prioridad: MUST
- origen: RF-15
- texto: La lista de miembros deberá mostrar el estado de consentimiento de cada miembro.

### REQ-S13-034
- tipo: ubicuo
- prioridad: MUST
- origen: RF-15
- texto: La lista de miembros deberá ofrecer el filtro «Pendientes de consentimiento» con los estados SIN_CONSENTIMIENTO, DESACTUALIZADO y REVOCADO.

### REQ-S13-035
- tipo: mientras
- prioridad: MUST
- origen: SUP-S13-003
- texto: Mientras no haya un CONSENTIMIENTO publicado, el panel deberá mostrar en la parte superior de todas sus páginas el aviso «Falta publicar el texto de consentimiento».

### REQ-S13-036
- tipo: ubicuo
- prioridad: MUST
- origen: RF-71
- texto: ConfiguracionNegocio deberá tener los campos opcionales razonSocial de 2 a 120 caracteres, ruc de 11 dígitos con la validación de S-12 y dirección de 5 a 200 caracteres.

### REQ-S13-037
- tipo: ubicuo
- prioridad: MUST
- origen: RF-71
- texto: La página /libro-de-reclamaciones deberá mostrar, en un formato imprimible A4, la razón social, el RUC, la dirección y el AVISO_RECLAMACIONES vigente.

### REQ-S13-038
- tipo: si-entonces
- prioridad: MUST
- origen: RF-71
- texto: Si falta el AVISO_RECLAMACIONES vigente o algún dato del negocio entonces la página /libro-de-reclamaciones deberá indicar qué falta en lugar de imprimirlo incompleto.

### REQ-S13-039
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-007
- texto: El sistema no deberá almacenar reclamos ni quejas de clientes.

### REQ-S13-040
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-008
- texto: La respuesta de GET api/miembros y la lista del panel deberán mostrar del documento solo los últimos 3 caracteres precedidos de puntos.

### REQ-S13-041
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-008
- texto: GET api/miembros y la lista del panel deberán buscar por nombre, documento o código de socio en el servidor con el parámetro q, sin distinguir mayúsculas ni tildes y tomando % y _ como texto.

### REQ-S13-042
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-008
- texto: GET api/miembros y la lista del panel deberán devolver como máximo 100 miembros ordenados por nombre ascendente e indicar con hayMas cuando existen más.

### REQ-S13-043
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-008
- texto: Si q tiene menos de MINIMO_CARACTERES_BUSQUEDA o más de 80 caracteres entonces GET api/miembros deberá responder 400 sin consultar miembros.

### REQ-S13-044
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-008
- texto: El documento completo de un miembro solo deberá aparecer en su ficha.

### REQ-S13-045
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las rutas, acciones y pantallas de textos legales, consentimiento, privacidad y reclamaciones deberán exigir una sesión válida de un administrador activo.

### REQ-S13-046
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-010
- texto: El repositorio deberá contener docs/legal/plantilla-consentimiento.md, docs/legal/plantilla-politica-privacidad.md y docs/legal/plantilla-aviso-reclamaciones.md.

### REQ-S13-047
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-010
- texto: Cada plantilla de docs/legal deberá llevar la marca «BORRADOR PARA REVISIÓN DE UN ABOGADO — NO PUBLICAR SIN REVISAR».

### REQ-S13-048
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-010
- texto: Ningún comando ni semilla del sistema deberá cargar las plantillas de docs/legal en la base de datos.

### REQ-S13-049
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: Los repositorios de TextoLegal y ConsentimientoMiembro deberán implementarse con Drizzle en packages/infrastructure/persistence/drizzle/ y tener cada uno su suite de contrato.

## 2. Comportamiento

### BEH-S13-001
- cubre: REQ-S13-001, REQ-S13-003, REQ-S13-004
- categoria: feliz
- dado: ningún texto legal publicado
- cuando: el administrador publica un CONSENTIMIENTO sin marcar cambio sustancial y luego otro marcado, y una POLITICA_PRIVACIDAD
- entonces: el primero queda en la versión 1 con cambioSustancial verdadero, el segundo en la 2 y la política en la 1, cada uno con la fecha de publicación y el administrador

### BEH-S13-002
- cubre: REQ-S13-002
- categoria: error
- dado: un texto legal publicado
- cuando: se intenta un UPDATE de su contenido y un DELETE con SQL directo
- entonces: ambas operaciones fallan por la excepción del disparador y el texto conserva su contenido

### BEH-S13-003
- cubre: REQ-S13-005
- categoria: borde
- dado: contenidos de 19, 20, 20 000 y 20 001 caracteres, uno de solo espacios y un tipo desconocido
- cuando: se intenta publicar cada uno
- entonces: se aceptan los de 20 y 20 000 caracteres y se rechazan los demás con TextoLegalInvalidoError sin escribir

### BEH-S13-004
- cubre: REQ-S13-006
- categoria: concurrencia
- dado: dos publicaciones simultáneas de un CONSENTIMIENTO detenidas con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: se crean las versiones 1 y 2, una por publicación, sin error crudo ni versión repetida

### BEH-S13-005
- cubre: REQ-S13-007
- categoria: feliz
- dado: un texto con las líneas «Línea 1», «<script>alert(1)</script>» y «Línea 3»
- cuando: se muestra en /privacidad
- entonces: aparecen las tres líneas como texto, el script no se ejecuta ni se inserta como elemento y los saltos de línea se conservan

### BEH-S13-006
- cubre: REQ-S13-008, REQ-S13-009, REQ-S13-010
- categoria: feliz
- dado: un CONSENTIMIENTO versión 2 publicado y ninguna política
- cuando: el administrador abre /privacidad y el formulario de alta
- entonces: la página muestra el consentimiento con «versión 2» y su fecha, y «Aún no se ha publicado» en lugar de la política; el formulario de alta trae el enlace a /privacidad

### BEH-S13-007
- cubre: REQ-S13-011, REQ-S13-012
- categoria: feliz
- dado: la pantalla de textos legales
- cuando: el administrador publica una versión nueva del consentimiento marcada como cambio sustancial y abre el historial
- entonces: aparecen todas las versiones con su fecha, autor y marca de cambio sustancial, y ninguna se puede editar

### BEH-S13-008
- cubre: REQ-S13-013, REQ-S13-014, REQ-S13-015
- categoria: error
- dado: una base migrada con un CONSENTIMIENTO, una POLITICA_PRIVACIDAD y un miembro
- cuando: se inserta una aceptación que apunta a la política, otra con el tipo POLITICA_PRIVACIDAD en la columna de tipo, y dos aceptaciones no revocadas del mismo miembro y texto
- entonces: las dos primeras fallan por la clave foránea compuesta y el CHECK, la segunda aceptación no revocada falla por la restricción parcial, y con la primera ya revocada se acepta una nueva

### BEH-S13-009
- cubre: REQ-S13-016
- categoria: error
- dado: un CONSENTIMIENTO vigente
- cuando: se intenta crear un miembro sin aceptación y otro con aceptación pero sin medio
- entonces: ambos se rechazan con ConsentimientoRequeridoError y no se crea ningún miembro ni consentimiento

### BEH-S13-010
- cubre: REQ-S13-017, REQ-S13-019, REQ-S13-050, REQ-S13-020
- categoria: feliz
- dado: un CONSENTIMIENTO versión 2 vigente y un administrador con sesión
- cuando: crea un miembro con aceptación en PAPEL por el formulario y otro por el POST de api/miembros, y el POST con un medio fuera de PANTALLA y PAPEL
- entonces: existen los dos miembros con su ConsentimientoMiembro de la versión 2, medio PAPEL, el administrador y la hora de Lima, creados cada uno en una sola transacción; el POST con el medio inválido responde 400; si falla la creación del miembro no queda consentimiento

### BEH-S13-011
- cubre: REQ-S13-018, REQ-S13-035
- categoria: borde
- dado: ningún CONSENTIMIENTO publicado
- cuando: se crea un miembro sin aceptación y se abren el panel de inicio y la lista de miembros
- entonces: el miembro se crea sin consentimiento y ambas páginas muestran en la parte superior «Falta publicar el texto de consentimiento»

### BEH-S13-012
- cubre: REQ-S13-021
- categoria: error
- dado: un miembro existente, un identificador inexistente, un miembro eliminado y ningún CONSENTIMIENTO publicado
- cuando: se intenta registrar el consentimiento en cada caso
- entonces: se lanzan SinTextoVigenteError, MiembroNoEncontradoError y MiembroEliminadoError según corresponda, sin escribir nada

### BEH-S13-013
- cubre: REQ-S13-022
- categoria: borde
- dado: un miembro con aceptación no revocada de la versión vigente
- cuando: se registra el consentimiento otra vez
- entonces: se devuelve la aceptación existente y no se crea otra fila

### BEH-S13-014
- cubre: REQ-S13-024
- categoria: concurrencia
- dado: dos registros simultáneos del consentimiento de un mismo miembro, detenidos con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: queda una sola fila y ambos reciben la misma

### BEH-S13-015
- cubre: REQ-S13-023
- categoria: concurrencia
- dado: un miembro con aceptación vigente, y con una barrera: una revocación y la eliminación del miembro, y dos revocaciones simultáneas
- cuando: se liberan a la vez en cada orden
- entonces: la revocación y la eliminación se aplican ambas en cualquier orden sin error crudo; de las dos revocaciones una se aplica y la otra lanza SinConsentimientoError; el miembro queda con una sola aceptación revocada

### BEH-S13-016
- cubre: REQ-S13-025, REQ-S13-027, REQ-S13-028, REQ-S13-051
- categoria: feliz
- dado: un miembro con aceptación vigente y correo con correoConsentidoEn, y otro miembro eliminado con aceptación
- cuando: el administrador revoca la del primero con el motivo «Pidió no recibir avisos» y la del eliminado
- entonces: ambas aceptaciones quedan revocadas con la fecha de Lima, el motivo y el autor, correoConsentidoEn del primero queda en nulo y los miembros conservan su estado, sus datos y sus pagos

### BEH-S13-017
- cubre: REQ-S13-026
- categoria: error
- dado: un miembro sin aceptación y otro con aceptación
- cuando: se revoca al primero y al segundo con motivos de 4 y de 201 caracteres
- entonces: el primero lanza SinConsentimientoError y el segundo MotivoInvalidoError en ambos casos, sin escribir

### BEH-S13-018
- cubre: REQ-S13-029
- categoria: error
- dado: un miembro REVOCADO con correo, y el interruptor del correo de S-12 encendido
- cuando: se guarda un correo con aceptación de ticket y se pide el envío de un ticket
- entonces: ambos lanzan ConsentimientoRevocadoError sin escribir ni llamar al puerto de correo; tras registrar una aceptación nueva del consentimiento ya se puede guardar el correo con su aceptación

### BEH-S13-019
- cubre: REQ-S13-030, REQ-S13-031, REQ-S13-032, REQ-S13-033, REQ-S13-034
- categoria: feliz
- dado: un CONSENTIMIENTO v1 (sustancial), v2 (sustancial) y v3 (no sustancial), y cinco miembros: A aceptó v3, B aceptó v2, C aceptó v1, D nunca aceptó y E aceptó v2 y revocó
- cuando: se abre la lista y se aplica «Pendientes de consentimiento»
- entonces: A es VIGENTE, B VIGENTE (v3 no es sustancial), C DESACTUALIZADO (v1 es menor que la v2 sustancial), D SIN_CONSENTIMIENTO y E REVOCADO; el filtro devuelve C, D y E; sin ningún CONSENTIMIENTO publicado todos son SIN_TEXTO

### BEH-S13-020
- cubre: REQ-S13-030
- categoria: borde
- dado: el miembro E revocado y un CONSENTIMIENTO vigente v3
- cuando: se registra una aceptación nueva de E
- entonces: E pasa a VIGENTE porque su aceptación más reciente es la nueva, y la revocada anterior se conserva

### BEH-S13-021
- cubre: REQ-S13-036
- categoria: borde
- dado: la configuración del negocio
- cuando: se guardan razón social de 1 y de 121 caracteres, RUC «20123456786», «20123456787» y de 10 dígitos, y dirección de 4 y de 201 caracteres
- entonces: se aceptan razón social de 2 a 120, el RUC válido y dirección de 5 a 200; se rechazan los demás sin escribir

### BEH-S13-022
- cubre: REQ-S13-037, REQ-S13-038
- categoria: feliz
- dado: razón social, RUC y dirección completos y un AVISO_RECLAMACIONES publicado, y luego la configuración sin dirección
- cuando: el administrador abre /libro-de-reclamaciones
- entonces: con todo completo muestra los cuatro elementos en formato A4 imprimible; sin la dirección indica «Falta la dirección» y no ofrece imprimir

### BEH-S13-023
- cubre: REQ-S13-039
- categoria: feliz
- dado: el esquema y el código finales
- cuando: se buscan tablas, casos de uso, rutas y formularios que guarden un reclamo o queja
- entonces: no existe ninguno

### BEH-S13-024
- cubre: REQ-S13-040, REQ-S13-044
- categoria: feliz
- dado: un miembro «Rosa Pérez» con documento «12345678»
- cuando: se pide la lista del panel y GET api/miembros, y se abre la ficha de Rosa
- entonces: la lista y la API traen «•••••678» y no el documento completo; la ficha muestra «12345678»

### BEH-S13-025
- cubre: REQ-S13-041, REQ-S13-042
- categoria: borde
- dado: 150 miembros, entre ellos «Rosa Pérez» con documento «12345678», «José 100%» y «Jose_Nunez», y 120 con nombres que contienen «an»
- cuando: se pide GET api/miembros sin q, con q «rosa perez», con q «12345678», con q «jose 100%», con q «_» y con q «an»
- entonces: sin q devuelve 100 miembros ordenados por nombre con hayMas verdadero; «rosa perez» y «12345678» devuelven a Rosa sin distinguir mayúsculas ni tildes; «jose 100%» devuelve solo a «José 100%» y «_» (si cumple el mínimo) solo a quien contiene «_»; «an» devuelve 100 con hayMas verdadero

### BEH-S13-026
- cubre: REQ-S13-043
- categoria: error
- dado: un q de 1 carácter, otro de 81 y uno de 80
- cuando: se pide GET api/miembros con cada uno
- entonces: los dos primeros responden 400 sin consultar miembros y el de 80 se acepta

### BEH-S13-027
- cubre: REQ-S13-045
- categoria: error
- dado: peticiones sin sesión, con sesión vencida y de un administrador desactivado
- cuando: llegan a las rutas, acciones y pantallas de textos legales, consentimiento, privacidad y reclamaciones
- entonces: todas se rechazan antes de leer o escribir datos

### BEH-S13-028
- cubre: REQ-S13-046, REQ-S13-047, REQ-S13-048
- categoria: feliz
- dado: la carpeta docs/legal y los comandos del sistema
- cuando: se listan las plantillas, se leen y se buscan comandos o semillas que las carguen
- entonces: existen los tres archivos, cada uno lleva la marca de borrador y ningún comando las carga en la base de datos

### BEH-S13-029
- cubre: REQ-S13-049
- categoria: feliz
- dado: los repositorios de TextoLegal y ConsentimientoMiembro
- cuando: se ejecuta su suite de contrato contra una base efímera
- entonces: cada repositorio crea y lee una fila y hace cumplir sus restricciones

## 3. Invariantes

### INV-S13-001
- propiedad: toda aceptación apunta a un texto de tipo CONSENTIMIENTO y a un miembro existente, y no hay dos aceptaciones no revocadas del mismo miembro y texto
- mecanismo: restriccion-bd
- deteccion: clave foránea compuesta sobre el texto y su tipo, CHECK de que el tipo es CONSENTIMIENTO y restricción única parcial sobre las no revocadas; las inserciones que las violan fallan
- protege: REQ-S13-013, REQ-S13-014, REQ-S13-015, REQ-S13-022, REQ-S13-024

### INV-S13-002
- propiedad: las versiones de un tipo de texto son enteros consecutivos desde 1 sin repeticiones
- mecanismo: test-propiedad
- deteccion: sobre 50 secuencias de publicaciones, algunas simultáneas, generadas con un generador congruencial lineal de semilla fija escrito en la prueba, las versiones de cada tipo son 1, 2, 3… sin huecos ni repetidos
- protege: REQ-S13-001, REQ-S13-003, REQ-S13-006

### INV-S13-003
- propiedad: ningún miembro REVOCADO tiene correoConsentidoEn ni puede recibir tickets por correo
- mecanismo: test-propiedad
- deteccion: sobre 50 secuencias de aceptar, revocar, guardar correo con aceptación y enviar ticket generadas con semilla fija, tras cada paso ningún miembro cuyo estado es REVOCADO tiene correoConsentidoEn y el puerto de correo no recibe ninguna llamada para él
- protege: REQ-S13-027, REQ-S13-029

### INV-S13-004
- propiedad: ninguna respuesta de lista de miembros contiene un documento completo
- mecanismo: test-propiedad
- deteccion: para 50 combinaciones de q y de cantidad de miembros generadas con semilla fija, ninguna respuesta de GET api/miembros ni la lista del panel contiene un documento de 6 o más caracteres completo
- protege: REQ-S13-040, REQ-S13-041, REQ-S13-044

### INV-S13-005
- propiedad: un texto legal publicado nunca cambia ni se borra
- mecanismo: restriccion-bd
- deteccion: el disparador de TextoLegal lanza una excepción en cualquier UPDATE o DELETE; las dos operaciones con SQL directo fallan
- protege: REQ-S13-002

## 4. Criterios de aceptación

### AC-S13-001
- enlaza: REQ-S13-001, REQ-S13-003, REQ-S13-004, REQ-S13-005, BEH-S13-001, BEH-S13-003
- metodo: integracion
- procedimiento: con una base efímera, publicar los textos de BEH-S13-001 y probar los contenidos y el tipo de BEH-S13-003
- esperado: las versiones son 1, 2 y 1, la versión 1 es sustancial, los contenidos de 20 y 20 000 caracteres se aceptan y el resto se rechaza con TextoLegalInvalidoError sin escribir
- test: pendiente

### AC-S13-002
- enlaza: REQ-S13-002, BEH-S13-002, INV-S13-005
- metodo: sql
- procedimiento: en una base migrada con un texto publicado, ejecutar un UPDATE de su contenido y un DELETE con SQL directo
- esperado: ambos fallan con la excepción del disparador y el texto conserva su contenido
- test: pendiente

### AC-S13-003
- enlaza: REQ-S13-006, BEH-S13-004, INV-S13-002
- metodo: integracion
- procedimiento: lanzar con Promise.all dos publicaciones del mismo tipo con una barrera, y ejecutar 50 secuencias con el generador de semilla fija
- esperado: las versiones son consecutivas sin repeticiones ni huecos ni error crudo
- test: pendiente

### AC-S13-004
- enlaza: REQ-S13-007, REQ-S13-008, REQ-S13-009, REQ-S13-010, REQ-S13-035, BEH-S13-005, BEH-S13-006, BEH-S13-011
- metodo: manual
- procedimiento: publicar un texto con una línea «<script>alert(1)</script>», abrir /privacidad y el formulario de alta, y abrir el inicio del panel y la lista de miembros sin ningún CONSENTIMIENTO publicado
- esperado: el script se ve como texto, los saltos de línea se conservan, se muestra la versión y fecha o «Aún no se ha publicado», el alta enlaza /privacidad y las dos páginas del panel muestran en la parte superior el aviso de falta de consentimiento
- test: pendiente

### AC-S13-005
- enlaza: REQ-S13-011, REQ-S13-012, BEH-S13-007
- metodo: manual
- procedimiento: publicar una versión nueva marcada como cambio sustancial y abrir el historial
- esperado: aparecen todas las versiones con fecha, autor y marca, y ninguna se puede editar
- test: pendiente

### AC-S13-006
- enlaza: REQ-S13-013, REQ-S13-014, REQ-S13-015, BEH-S13-008, INV-S13-001
- metodo: sql
- procedimiento: en una base migrada, ejecutar las cuatro inserciones de BEH-S13-008 (aceptación de una política, tipo equivocado en la columna de tipo, dos aceptaciones no revocadas del mismo par y una nueva tras revocar la primera)
- esperado: las tres primeras fallan por restricción y la última se acepta
- test: pendiente

### AC-S13-007
- enlaza: REQ-S13-016, REQ-S13-017, REQ-S13-018, REQ-S13-019, REQ-S13-050, REQ-S13-020, BEH-S13-009, BEH-S13-010, BEH-S13-011
- metodo: integracion
- procedimiento: crear miembros por la acción y por el POST con un CONSENTIMIENTO vigente sin aceptación, sin medio, con medio inválido y con aceptación en PAPEL, forzar un fallo en la creación del miembro, y crear un miembro sin CONSENTIMIENTO publicado
- esperado: los casos sin aceptación o sin medio lanzan ConsentimientoRequeridoError, el medio inválido responde 400, los válidos crean miembro y aceptación juntos con los campos de BEH-S13-010, el fallo no deja aceptación y sin texto publicado no se exige aceptación
- test: pendiente

### AC-S13-008
- enlaza: REQ-S13-021, REQ-S13-022, REQ-S13-024, BEH-S13-012, BEH-S13-013, BEH-S13-014
- metodo: integracion
- procedimiento: registrar el consentimiento en los casos de BEH-S13-012 y BEH-S13-013 y lanzar con Promise.all dos registros del mismo miembro con una barrera
- esperado: se lanzan los errores indicados, la repetición devuelve la existente y la carrera deja una sola fila
- test: pendiente

### AC-S13-009
- enlaza: REQ-S13-023, BEH-S13-015
- metodo: integracion
- procedimiento: con una barrera, lanzar con Promise.all una revocación y la eliminación del mismo miembro, y dos revocaciones, en cada orden
- esperado: el resultado es el de BEH-S13-015 y no hay error crudo
- test: pendiente

### AC-S13-010
- enlaza: REQ-S13-025, REQ-S13-026, REQ-S13-027, REQ-S13-028, REQ-S13-051, BEH-S13-016, BEH-S13-017
- metodo: integracion
- procedimiento: revocar el consentimiento de un miembro con correoConsentidoEn y de uno eliminado, y probar los casos de BEH-S13-017
- esperado: las revocaciones dejan los datos de BEH-S13-016, los miembros conservan estado, datos y pagos, y los errores se lanzan sin escribir
- test: pendiente

### AC-S13-011
- enlaza: REQ-S13-029, BEH-S13-018, INV-S13-003
- metodo: integracion
- procedimiento: con un puerto de correo simulado que cuenta llamadas, guardar un correo con aceptación y pedir el envío para un miembro REVOCADO, registrar una aceptación nueva y repetir, y ejecutar 50 secuencias con semilla fija
- esperado: los dos primeros lanzan ConsentimientoRevocadoError con 0 llamadas, después de la aceptación nueva se guarda el correo, y en las secuencias ningún miembro REVOCADO conserva correoConsentidoEn ni recibe llamadas
- test: pendiente

### AC-S13-012
- enlaza: REQ-S13-030, REQ-S13-031, REQ-S13-032, REQ-S13-033, REQ-S13-034, BEH-S13-019, BEH-S13-020
- metodo: integracion
- procedimiento: crear las versiones y los cinco miembros de BEH-S13-019, leer sus estados y aplicar el filtro, registrar una aceptación nueva de E, y repetir sin ningún CONSENTIMIENTO publicado
- esperado: los estados y el contenido del filtro coinciden con BEH-S13-019, E pasa a VIGENTE con la revocada conservada y sin texto todos son SIN_TEXTO
- test: pendiente

### AC-S13-013
- enlaza: REQ-S13-036, REQ-S13-037, REQ-S13-038, BEH-S13-021, BEH-S13-022
- metodo: integracion
- procedimiento: guardar los datos del negocio de BEH-S13-021 y leer los datos que alimentan /libro-de-reclamaciones con todo completo y sin la dirección
- esperado: se aceptan y rechazan los valores indicados, y los datos de la página traen los cuatro elementos o indican qué falta
- test: pendiente

### AC-S13-014
- enlaza: REQ-S13-037, REQ-S13-038, BEH-S13-022
- metodo: manual
- procedimiento: abrir /libro-de-reclamaciones completa e imprimirla en la vista previa del navegador, y repetir sin la dirección
- esperado: la vista previa A4 muestra razón social, RUC, dirección y aviso, y sin la dirección indica qué falta y no ofrece imprimir
- test: pendiente

### AC-S13-015
- enlaza: REQ-S13-039, BEH-S13-023
- metodo: unitario
- procedimiento: buscar con la API de typescript, en el esquema de Drizzle y en apps y packages, tablas, funciones, rutas y formularios cuyo nombre contenga reclamo, queja o reclamacion, salvo la ruta /libro-de-reclamaciones y el tipo AVISO_RECLAMACIONES
- esperado: no existe ninguno
- test: pendiente

### AC-S13-016
- enlaza: REQ-S13-045, BEH-S13-027
- metodo: integracion
- procedimiento: enviar a las rutas, acciones y pantallas de esta spec peticiones sin sesión, con sesión vencida y de un administrador desactivado
- esperado: todas se rechazan antes de leer o escribir
- test: pendiente

### AC-S13-017
- enlaza: REQ-S13-040, REQ-S13-044, BEH-S13-024, INV-S13-004
- metodo: integracion
- procedimiento: con un miembro de documento «12345678», pedir GET api/miembros, leer los datos de la lista del panel y abrir la ficha, y repetir sobre 50 combinaciones de q con semilla fija
- esperado: la lista y la API traen «•••••678», la ficha trae «12345678» y ninguna respuesta de lista contiene un documento completo
- test: pendiente

### AC-S13-018
- enlaza: REQ-S13-041, REQ-S13-042, REQ-S13-043, BEH-S13-025, BEH-S13-026
- metodo: integracion
- procedimiento: con 150 miembros, pedir GET api/miembros con los cinco valores de q de BEH-S13-025 y con los tres largos de BEH-S13-026
- esperado: las respuestas, el orden, el tope de 100 con hayMas, el tratamiento de % y _ y los códigos 400 coinciden con esos comportamientos
- test: pendiente

### AC-S13-019
- enlaza: REQ-S13-046, REQ-S13-047, REQ-S13-048, BEH-S13-028
- metodo: unitario
- procedimiento: comprobar que existen docs/legal/plantilla-consentimiento.md, docs/legal/plantilla-politica-privacidad.md y docs/legal/plantilla-aviso-reclamaciones.md, que cada uno contiene la marca de borrador, y buscar con la API de typescript lecturas de la carpeta docs/legal desde comandos o semillas
- esperado: los tres archivos existen con la marca y ninguna lectura de esa carpeta aparece en el código
- test: pendiente

### AC-S13-020
- enlaza: REQ-S13-049, BEH-S13-029
- metodo: integracion
- procedimiento: ejecutar la suite de contrato de los repositorios de TextoLegal y ConsentimientoMiembro contra una base efímera
- esperado: cada uno crea y lee una fila y hace cumplir sus restricciones
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización del alta de miembro (acción y POST) y de la lista de miembros; (2) esquema aditivo: `TextoLegal` con su disparador de inmutabilidad (SQL en el baseline, S-15), `ConsentimientoMiembro` con su clave compuesta, CHECK y única parcial, y los tres campos de `ConfiguracionNegocio`; (3) repositorios con Drizzle y sus suites de contrato; (4) casos de uso `publicarTextoLegal`, `registrarConsentimiento`, `revocarConsentimiento` y el cálculo del estado, con sus pruebas, incluida la concurrencia, y la exposición de los repositorios nuevos en `IUnidadDeTrabajo`; (5) `crearMiembro` con consentimiento en la misma transacción y el formulario y el POST de alta; (6) pantallas de textos legales, `/privacidad`, `/libro-de-reclamaciones`, datos del negocio y el aviso en la parte superior del panel; (7) lista de miembros con estado y filtro, y documento enmascarado con búsqueda en el servidor (cambio atómico de `GET api/miembros` y de la lista del panel); (8) enmienda de S-12 para el estado REVOCADO; (9) las tres plantillas de `docs/legal/` con la marca.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la propia prueba, una base efímera y una barrera que fija el orden de las transacciones; no hay dependencias nuevas.
- Las plantillas son borradores generales y no sustituyen a un abogado.
- AC-S13-004, AC-S13-005 y AC-S13-014 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15) con las tablas y los campos nuevos; el seed no publica ningún texto, de modo que el sistema nace sin consentimiento exigido (SUP-S13-003).
- **Enmiendas que se registran al aprobar S-13:**
  - S-04: `IUnidadDeTrabajo` expone los repositorios de `TextoLegal`, `ConsentimientoMiembro` y `Miembro` para la transacción de `crearMiembro`.
  - S-05: `ConfiguracionNegocio` suma `razonSocial`, `ruc` y `direccion` (REQ-S05-003).
  - S-06: el traspaso de `GET api/miembros` queda cumplido; SUP-S06-008 se lee con la lista enmascarada (SUP-S13-008).
  - S-09: el traspaso de consentimiento queda cumplido, `crearMiembro` suma el consentimiento en su transacción y la lista de campos del `PATCH` no cambia.
  - S-12: `correoConsentidoEn` se limpia al revocar (REQ-S13-027); guardar un correo con aceptación y `enviarTicketPorCorreo` rechazan con `ConsentimientoRevocadoError` a un miembro REVOCADO (REQ-S13-029); la validación del RUC se reutiliza.
  - S-15: el baseline incluye las tablas nuevas, el disparador de `TextoLegal`, la clave compuesta, el CHECK y la única parcial; el seed no publica textos.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 suman dos tablas (`TextoLegal` y `ConsentimientoMiembro`); REQ-S22-002, BEH-S22-012 y AC-S22-001 suman dos enums (`TipoTextoLegal` y `MedioConsentimiento`); REQ-S22-007 y AC-S22-003 suman dos repositorios y sus suites de contrato.
  - `docs/06-modelo-datos-cambios.md`, `COBERTURA-RF.md` (RF-15, RF-71, RF-72) y `BACKLOG-SPECS.md`: nota de que S-13 cubre consentimiento, privacidad y aviso.
- **Traspasos:** S-17 (publicación de la página `/privacidad` y retención), S-21 (enmascarado del documento en el kiosco) y una spec futura si el propietario fija la retención (P-20) o pide supresión.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Los textos legales no los redacta un abogado: publicar un texto sin revisar puede no cumplir la Ley 29733 ni la Ley 29571. Mitigación: plantillas marcadas, nada se carga solo y el aviso «Falta publicar el texto de consentimiento».
- Mientras no haya texto publicado, el sistema registra miembros sin consentimiento (SUP-S13-003). Mitigación: el aviso en todas las páginas y el filtro «Pendientes»; cuando se publique, los miembros existentes aparecen como SIN_CONSENTIMIENTO.
- Revocar sin supresión de datos y sin anonimizar puede incumplir los derechos de cancelación de la Ley 29733 (decisión del propietario, riesgo legal aceptado en ADR-013 y S-09). Mitigación: se registra la revocación y se corta el correo; la supresión queda para una spec futura.
- El consentimiento lo registra el administrador en nombre del miembro (SUP-S13-004): no hay firma ni evidencia propia. Mitigación: el medio PAPEL permite guardar la hoja firmada fuera del sistema.
- El aviso del Libro de Reclamaciones puede exigir contenido que no se verificó. Mitigación: el texto lo publica el propietario tras validarlo y el sistema solo lo imprime.
- Enmascarar el documento en la lista cambia cómo se busca a un miembro. Mitigación: búsqueda en servidor por documento completo, nombre o código; la ficha lo muestra completo. La lista sigue enviando celular, fecha de nacimiento y correo (fuera de alcance, 0.3).
- Esta spec depende de S-12, que sigue en revisión: si S-12 cambia `correoConsentidoEn`, la validación del RUC o sus interruptores, esta spec debe ajustarse. Mitigación: S-12 se aprueba antes de implementar S-13.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Mientras no haya texto de consentimiento publicado el alta no lo exige y el panel muestra un aviso en todas sus páginas? Default: sí (SUP-S13-003).
- ¿Una versión nueva solo obliga a aceptarla de nuevo si la publicas como «cambio sustancial»? Default: sí (SUP-S13-005).
- ¿Revocar el consentimiento solo registra la revocación y corta los correos, sin borrar datos? Default: sí (SUP-S13-006).
- ¿El Libro de Reclamaciones es físico y el sistema solo imprime el aviso con los datos del negocio? Default: sí (SUP-S13-007).
- ¿La lista de miembros oculta el documento (solo los últimos 3 caracteres) y la búsqueda se hace en el servidor con tope de 100? Default: sí (SUP-S13-008).
- ¿Las tres plantillas de texto legal se entregan como borradores para que las revise un abogado y tú publicas el texto revisado desde la pantalla? Default: sí (SUP-S13-010).

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de otras specs. El texto anterior se conserva; donde choca, rige esta sección.*
- Por la aprobación de S-14: la lista de miembros deja de ofrecer los filtros de fecha; el filtro por plan pasa a ser el parámetro `planId` del servidor; `enmascararDocumento` es la función compartida del enmascarado (también la usa S-21).

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura, sin ejecutar `spec-lint`), 2026-11-12, sobre el primer borrador. Veredicto global: **REQUIERE CAMBIOS**. Resumen fiel:

> | # | Comprobación | Veredicto | Hallazgo principal |
> |---|---|---|---|
> | 1 | Cabecera y ADR | CUMPLE (observación) | depende de S-12, que sigue en revisión |
> | 2 | REQ | NO CUMPLE (menor) | REQ-010, 024 y 031 compuestos; tipos mal clasificados (008, 013, 014, 017, 025); sin origen RF-15, RF-71 ni RF-72; REQ-030 y 035 solapados; «permanente» sin alcance |
> | 3 | Cobertura | NO CUMPLE | INV-001 pedía un CHECK entre tablas, que PostgreSQL no permite; INV-003 era falso porque S-12 permite fijar `correoConsentidoEn` después de revocar; la inmutabilidad se «verificaba» solo por ausencia de código |
> | 4 | AC | NO CUMPLE (menor) | AC estáticos sin criterio de búsqueda; AC-012 mezclaba métodos; AC-014 pasaba en vacío |
> | 5 | Hechos | CUMPLE (observaciones) | faltaban `ListaMiembros.tsx:110-111`, `miembros/page.tsx:73`, los dos llamadores de `crearMiembro` y el ID de REQ-S05 |
> | 6 | Vaguedad y alcance | CUMPLE (observaciones) | «permanente» sin medida; primera persona y default distintos de P-13; ningún REQ exigía que existieran las plantillas |
> | 7 | Escenarios | NO CUMPLE | sin camino para re-aceptar tras revocar; el caso E de BEH-016 era idéntico a B; sin concurrencia contra la eliminación ni entre revocaciones; faltaba `IUnidadDeTrabajo` en las enmiendas; revocar a un eliminado sin especificar; semántica de la búsqueda sin definir |

### Conciliación del autor
Los hallazgos se verificaron contra el Repo A y las specs (`ListaMiembros.tsx:105-113`, `miembros/page.tsx:73`, `api/miembros/route.ts:45`, `miembros/actions.ts:151`, S-12 y S-05) y resultaron ciertos; ninguno se rechazó. La spec pasó de 36 REQ a 51, de 22 BEH a 29, de 4 INV a 5 y de 14 AC a 20.

| Fila | Corrección |
|---|---|
| 1 | `depende_de` suma S-02 y S-04; el riesgo de depender de S-12 queda en 5.3 y S-12 se aprueba antes de implementar |
| 2 | REQ divididos (011/012, 030 a 032, 033/034, 041 a 043, 046 a 048, 050, 051); tipos `mientras` y `cuando`; orígenes RF-15, RF-71, RF-72 y ADR-013; «parte superior de todas las páginas» en REQ-035 |
| 3 | REQ-014 y INV-001: clave foránea compuesta y CHECK de tipo; REQ-029 y INV-003: un miembro REVOCADO no puede fijar la marca de correo ni recibir tickets (enmienda a S-12); REQ-002, INV-005 y AC-002: disparador de inmutabilidad en el baseline |
| 4 | AC-015 y AC-019 con criterio de búsqueda y nombres de archivo; AC-012 separado de los estáticos |
| 5 | 0.4 con las citas y los dos llamadores; REQ-S05-003 citado |
| 6 | SUP-S13-010 alineado con P-13; REQ-046 exige los tres archivos de plantilla |
| 7 | REQ-015 (única parcial) y BEH-020 (re-aceptación); BEH-019 corregido con v1, v2 y v3; REQ-023 y BEH-015 (bloqueo y relectura, eliminación y revocaciones simultáneas); S-04 en 5.2; REQ-051 y BEH-016 (revocar a un eliminado); SUP-S13-008, REQ-041 a 043 y BEH-025/026 (búsqueda); SUP-S13-011 (publicar contra crear); «Minimización» pasa a «Documento enmascarado» |
