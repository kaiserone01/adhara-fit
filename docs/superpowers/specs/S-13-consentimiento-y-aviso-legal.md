---
id: S-13
estado: en-revision
adrs: ADR-006, ADR-012, ADR-013, ADR-016, ADR-022
depende_de: S-00, S-01, S-02, S-05, S-06, S-09, S-12, S-22, S-23
aprobada_por:
fecha_aprobacion:
---
# S-13 — Consentimiento de datos personales, política de privacidad y aviso del Libro de Reclamaciones

## 0. Contexto y alcance

### 0.1 Problema
El gimnasio guarda datos personales de sus miembros (nombre, documento de identidad, teléfono, foto y, desde S-12, correo). Los requisitos RF-15, RF-71 y RF-72 del PRD, obligatorios en el MVP, piden: registrar el consentimiento de tratamiento de datos con su fecha y la versión del texto aceptado (Ley 29733), tener el texto de consentimiento y la política de privacidad accesibles desde el alta, y tener el aviso del Libro de Reclamaciones en el local (Ley 29571). Hoy el código no registra nada de esto, y `GET api/miembros` entrega a cualquier navegador con sesión el documento de todos los miembros (hallazgo que S-06 traspasó aquí). Los textos legales los debe redactar o revisar un abogado (P-13): el sistema no incluye texto legal propio; ofrece dónde publicarlo con versiones, cómo registrar la aceptación y cómo imprimir el aviso. No hay sitio público: todo es interno.

### 0.2 Dentro de alcance
- Tabla `TextoLegal` (versionada e inmutable) para tres tipos: `CONSENTIMIENTO`, `POLITICA_PRIVACIDAD` y `AVISO_RECLAMACIONES`, y la pantalla para publicar una versión nueva.
- Tabla `ConsentimientoMiembro`: aceptación con fecha, versión del texto, medio (pantalla o papel) y quién la registró, y su revocación.
- Exigir la aceptación en el alta de un miembro cuando hay un texto de consentimiento publicado; registrar la aceptación de miembros existentes; revocarla.
- Estado de consentimiento en la lista de miembros y filtro «Pendientes de consentimiento».
- Página `/privacidad` con la política y el consentimiento vigentes, enlazada desde el alta.
- Datos del negocio para el aviso (`razonSocial`, `ruc`, `direccion` en `ConfiguracionNegocio`) y la página imprimible `/libro-de-reclamaciones`.
- Minimización de `GET api/miembros` y de la lista: sin el documento completo, con búsqueda en el servidor y tope de resultados.
- Plantillas para el abogado en `docs/legal/` (no se cargan en el sistema).

### 0.3 Fuera de alcance
- Redactar el texto legal definitivo, que lo hace o revisa un abogado antes de publicarlo (P-13); las plantillas son borradores.
- Un Libro de Reclamaciones virtual (formulario público o registro de reclamos): no hay sitio público; el libro físico lo lleva el gimnasio (SUP-S13-007).
- Atender solicitudes ARCO con supresión o anonimización: el propietario decidió no anonimizar (2026-11-12, ADR-013 enmendado); los datos de un miembro eliminado se conservan.
- Plazo de retención y borrado programado (P-20).
- El consentimiento del ticket por correo: ya lo registra S-12 (`correoConsentidoEn`); aquí solo se limpia al revocar.
- Enmascarado del documento en el kiosco y límite de intentos: S-21.
- Registro de incidentes de seguridad: no hay requisito.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-13 recibirá después de S-00 a S-12, S-22 y S-23; se recontarán al empezar.
- **Sin consentimiento ni textos legales:** el esquema no tiene ninguna tabla ni campo de consentimiento, política o reclamaciones (`grep -in "consentimiento\|privacidad\|reclam" packages/db/prisma/schema.prisma` sin resultados); el formulario de alta es `miembros/nuevo/page.tsx` con `FormularioMiembro.tsx` (verificado con `grep` y `ls`).
- **Lista completa al navegador:** `GET api/miembros` llama a `listarMiembros` y devuelve `{ miembros }` con todos los miembros de la sede sin paginar ni filtrar (`api/miembros/route.ts:10-25`); ningún archivo de `apps` hace `fetch` a esa ruta (solo la ruta y su `[id]` la nombran, verificado con `grep -rn "api/miembros"`), de modo que el riesgo está en la propia ruta y en lo que la página de miembros entrega al cliente.
- **Confidencialidad en el panel:** S-06 (SUP-S06-008) muestra el documento completo en el panel y nunca en la respuesta del check-in, y deja a S-13 la lista que filtra en el cliente (S-06 §0.3, línea 33; verificado con `grep -n` en S-06).
- **Negocio sin datos fiscales:** S-05 crea `ConfiguracionNegocio` con el nombre del negocio y los campos `reposo*` y `vitrina*`, sin razón social, RUC ni dirección (S-05 REQ sobre `ConfiguracionNegocio`, verificado con `grep -n ConfiguracionNegocio` en S-05).
- **Decisiones previas:** ADR-013 (enmendado) conserva los datos del miembro eliminado y descarta la anonimización; S-09 define `MiembroEliminadoError` y el estado `BAJA`; S-12 define `Miembro.correoConsentidoEn`, la validación del RUC y los interruptores; PRD RF-15, RF-71, RF-72 y RNF-05 (Ley 29733 y DS 016-2024-JUS, vigencia por **[VERIFICAR]**); P-13 (quién redacta los textos) sin respuesta (verificado con `grep -n` en los docs, `docs/01:78,132-133,143` y `docs/08`).
- No verificado: el contenido exacto que exige la Ley 29733, su reglamento y la Ley 29571 para el consentimiento, la política y el aviso; el plazo de respuesta a los reclamos; y si el aviso físico debe llevar datos que el sistema no tiene.

### 0.5 Supuestos
- SUP-S13-001: hay tres tipos de texto legal —`CONSENTIMIENTO`, `POLITICA_PRIVACIDAD` y `AVISO_RECLAMACIONES`—, versionados con enteros consecutivos desde 1 por tipo, inmutables una vez publicados; la versión vigente de un tipo es la mayor. Default: ese modelo; asumido, por validar.
- SUP-S13-002: el contenido de un texto legal es texto plano de 20 a 20 000 caracteres (recortado), y se muestra siempre como texto con saltos de línea, nunca como HTML. Default: texto plano; asumido, por validar.
- SUP-S13-003: mientras no haya un `CONSENTIMIENTO` publicado el alta no exige aceptación y el sistema muestra un aviso permanente «Falta publicar el texto de consentimiento»; desde que se publique, el alta de un miembro nuevo exige marcarla. Default: ese comportamiento, para no frenar la operación mientras el abogado entrega el texto; asumido, por validar.
- SUP-S13-004: la aceptación la registra el administrador en nombre del miembro, indicando si fue en pantalla o en papel; no hay firma digital ni captura del miembro. Default: registro por el administrador; asumido, por validar.
- SUP-S13-005: una versión nueva del consentimiento solo obliga a aceptarla de nuevo cuando se publica marcada «cambio sustancial»; las demás versiones no cambian el estado de quien aceptó una anterior. Default: re-aceptación solo con cambio sustancial; asumido, por validar.
- SUP-S13-006: revocar el consentimiento no elimina ni anonimiza datos (decisión del propietario sobre la anonimización) y no cambia el estado del miembro; registra la fecha, el motivo y el autor, deja al miembro como «Revocado» y borra su marca de correo de S-12 para que no reciba tickets. Default: ese efecto; asumido, por validar, con riesgo legal aceptado.
- SUP-S13-007: el Libro de Reclamaciones es físico: el sistema solo imprime el aviso con los datos del negocio y el texto publicado; no registra reclamos. Default: aviso impreso; asumido, por validar.
- SUP-S13-008: la lista de miembros no incluye el documento completo: muestra los últimos 3 caracteres precedidos de puntos; la búsqueda por nombre, documento o código de socio se hace en el servidor con un tope de 100 resultados, y el documento completo solo aparece en la ficha. Default: ese criterio; asumido, por validar.
- SUP-S13-009: la política y el consentimiento se leen en `/privacidad`, página interna con sesión, desde un enlace del alta; el miembro los lee en la pantalla del administrador o en papel. Default: página interna; asumido, por validar.
- SUP-S13-010: las plantillas de `docs/legal/` llevan la marca «BORRADOR PARA REVISIÓN DE UN ABOGADO — NO PUBLICAR SIN REVISAR» y no se cargan solas en el sistema. Default: marca visible y carga manual; asumido, por validar.

## 1. Requisitos

### REQ-S13-001
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-001
- texto: La base de datos deberá tener la tabla TextoLegal con tipo, versión, contenido, cambioSustancial, fecha de publicación y administrador que la publicó, y una restricción única sobre el tipo y la versión.

### REQ-S13-002
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-001
- texto: El sistema no deberá modificar ni borrar un TextoLegal publicado.

### REQ-S13-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-001
- texto: publicarTextoLegal deberá guardar el texto con la versión siguiente a la mayor existente del tipo, o 1 si no hay ninguna.

### REQ-S13-004
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-002
- texto: Si el contenido recortado tiene menos de 20 o más de 20 000 caracteres, o el tipo no es uno de los tres, entonces publicarTextoLegal deberá rechazarlo con TextoLegalInvalidoError sin escribir nada.

### REQ-S13-005
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos publicaciones simultáneas del mismo tipo llegan a la vez entonces publicarTextoLegal deberá producir dos versiones consecutivas distintas y no un error crudo del motor.

### REQ-S13-006
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-002
- texto: El sistema deberá mostrar el contenido de un texto legal como texto con saltos de línea, sin interpretar HTML.

### REQ-S13-007
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-009
- texto: La página /privacidad deberá mostrar el CONSENTIMIENTO y la POLITICA_PRIVACIDAD vigentes con su versión y fecha de publicación.

### REQ-S13-008
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-003
- texto: Si no hay un texto vigente de un tipo entonces la página /privacidad deberá mostrar «Aún no se ha publicado» en lugar de ese texto.

### REQ-S13-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-009
- texto: El formulario de alta de miembro deberá enlazar la página /privacidad.

### REQ-S13-010
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-001
- texto: La pantalla de textos legales deberá permitir publicar una versión nueva de cada tipo, marcarla como cambio sustancial y ver el historial de versiones.

### REQ-S13-011
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-004
- texto: La base de datos deberá tener la tabla ConsentimientoMiembro con el miembro, el texto aceptado, la fecha de aceptación, el medio PANTALLA o PAPEL, el administrador que la registró y los datos de revocación, y una restricción única sobre el miembro y el texto.

### REQ-S13-012
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-003
- texto: Si hay un CONSENTIMIENTO vigente y el alta de un miembro no trae la aceptación y el medio entonces crearMiembro deberá rechazarla con ConsentimientoRequeridoError sin crear nada.

### REQ-S13-013
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-003
- texto: Si hay un CONSENTIMIENTO vigente entonces crearMiembro deberá crear el miembro y su ConsentimientoMiembro con la versión vigente en la misma transacción.

### REQ-S13-014
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-003
- texto: Si no hay un CONSENTIMIENTO vigente entonces crearMiembro no deberá exigir la aceptación ni crear un ConsentimientoMiembro.

### REQ-S13-015
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-004
- texto: registrarConsentimiento deberá crear la aceptación de un miembro existente con la versión vigente, el medio indicado, el administrador y la fecha y hora de Lima del servidor.

### REQ-S13-016
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-004
- texto: Si no hay un CONSENTIMIENTO vigente o el miembro no existe o está eliminado entonces registrarConsentimiento deberá rechazarlo con SinTextoVigenteError, MiembroNoEncontradoError o MiembroEliminadoError sin escribir nada.

### REQ-S13-017
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-004
- texto: Si el miembro ya tiene una aceptación no revocada de la versión vigente entonces registrarConsentimiento deberá devolver la existente sin crear otra.

### REQ-S13-018
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos registros simultáneos del mismo miembro y la misma versión llegan a la vez entonces registrarConsentimiento deberá crear una sola fila y devolver la misma a ambos.

### REQ-S13-019
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-006
- texto: revocarConsentimiento deberá marcar la aceptación vigente del miembro con la fecha y hora de Lima, el motivo de 5 a 200 caracteres y el administrador que la revoca.

### REQ-S13-020
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-006
- texto: Si el miembro no tiene una aceptación no revocada o el motivo no cumple el largo entonces revocarConsentimiento deberá rechazarlo con SinConsentimientoError o MotivoInvalidoError sin escribir nada.

### REQ-S13-021
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-006
- texto: revocarConsentimiento deberá poner en nulo la marca correoConsentidoEn del miembro dentro de la misma transacción.

### REQ-S13-022
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-006
- texto: revocarConsentimiento no deberá eliminar, anonimizar ni cambiar el estado del miembro.

### REQ-S13-023
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-005
- texto: El estado de consentimiento de un miembro deberá ser SIN_TEXTO si no hay CONSENTIMIENTO publicado, REVOCADO si su última aceptación está revocada, SIN_CONSENTIMIENTO si nunca aceptó, DESACTUALIZADO si aceptó una versión anterior a la última marcada como cambio sustancial y VIGENTE en los demás casos.

### REQ-S13-024
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-005
- texto: La lista de miembros deberá mostrar el estado de consentimiento de cada miembro y ofrecer el filtro «Pendientes de consentimiento» con los estados SIN_CONSENTIMIENTO, DESACTUALIZADO y REVOCADO.

### REQ-S13-025
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-003
- texto: Si no hay un CONSENTIMIENTO publicado entonces el panel deberá mostrar el aviso permanente «Falta publicar el texto de consentimiento».

### REQ-S13-026
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-007
- texto: ConfiguracionNegocio deberá tener los campos opcionales razonSocial de 2 a 120 caracteres, ruc de 11 dígitos con la validación de S-12 y dirección de 5 a 200 caracteres.

### REQ-S13-027
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-007
- texto: La página /libro-de-reclamaciones deberá mostrar, en un formato imprimible A4, la razón social, el RUC, la dirección y el AVISO_RECLAMACIONES vigente.

### REQ-S13-028
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S13-007
- texto: Si falta el AVISO_RECLAMACIONES vigente o algún dato del negocio entonces la página /libro-de-reclamaciones deberá indicar qué falta en lugar de imprimirlo incompleto.

### REQ-S13-029
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-007
- texto: El sistema no deberá almacenar reclamos ni quejas de clientes.

### REQ-S13-030
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-008
- texto: La respuesta de GET api/miembros y la lista del panel no deberán incluir el documento completo.

### REQ-S13-036
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-010
- texto: Ningún comando ni semilla del sistema deberá cargar las plantillas de docs/legal en la base de datos.

### REQ-S13-035
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-008
- texto: La lista del panel y GET api/miembros deberán mostrar del documento solo los últimos 3 caracteres precedidos de puntos.

### REQ-S13-031
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-008
- texto: GET api/miembros y la lista del panel deberán buscar por nombre, documento o código de socio en el servidor con el parámetro q y devolver como máximo 100 miembros.

### REQ-S13-032
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-008
- texto: El documento completo de un miembro solo deberá aparecer en su ficha.

### REQ-S13-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las rutas, acciones y pantallas de textos legales, consentimiento, privacidad y reclamaciones deberán exigir una sesión válida de un administrador activo.

### REQ-S13-034
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S13-010
- texto: Las plantillas de docs/legal deberán llevar la marca «BORRADOR PARA REVISIÓN DE UN ABOGADO — NO PUBLICAR SIN REVISAR».

## 2. Comportamiento

### BEH-S13-001
- cubre: REQ-S13-001, REQ-S13-003
- categoria: feliz
- dado: ningún texto legal publicado
- cuando: el administrador publica un CONSENTIMIENTO y luego otro, y una POLITICA_PRIVACIDAD
- entonces: el primero queda en la versión 1, el segundo en la 2 y la política en la 1, cada uno con la fecha de publicación y el administrador

### BEH-S13-002
- cubre: REQ-S13-002
- categoria: feliz
- dado: el árbol final y un texto publicado
- cuando: se buscan casos de uso, acciones, rutas y botones que modifiquen o borren un texto legal
- entonces: no existe ninguno y el texto publicado conserva su contenido

### BEH-S13-003
- cubre: REQ-S13-004
- categoria: borde
- dado: contenidos de 19, 20, 20 000 y 20 001 caracteres, uno de solo espacios y un tipo desconocido
- cuando: se intenta publicar cada uno
- entonces: se aceptan los de 20 y 20 000 caracteres y se rechazan los demás con TextoLegalInvalidoError sin escribir

### BEH-S13-004
- cubre: REQ-S13-005
- categoria: concurrencia
- dado: dos publicaciones simultáneas de un CONSENTIMIENTO detenidas con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: se crean las versiones 1 y 2, una por publicación, sin error crudo ni versión repetida

### BEH-S13-005
- cubre: REQ-S13-006
- categoria: feliz
- dado: un texto con las líneas «Línea 1», «<script>alert(1)</script>» y «Línea 3»
- cuando: se muestra en /privacidad
- entonces: aparecen las tres líneas como texto, el script no se ejecuta ni se inserta como elemento y los saltos de línea se conservan

### BEH-S13-006
- cubre: REQ-S13-007, REQ-S13-008, REQ-S13-009
- categoria: feliz
- dado: un CONSENTIMIENTO versión 2 publicado y ninguna política
- cuando: el administrador abre /privacidad y el formulario de alta
- entonces: la página muestra el consentimiento con «versión 2» y su fecha, y «Aún no se ha publicado» en lugar de la política; el formulario de alta trae el enlace a /privacidad

### BEH-S13-007
- cubre: REQ-S13-010
- categoria: feliz
- dado: la pantalla de textos legales
- cuando: el administrador publica una versión nueva del consentimiento marcada como cambio sustancial y abre el historial
- entonces: aparecen todas las versiones con su fecha, autor y marca de cambio sustancial, y ninguna se puede editar

### BEH-S13-008
- cubre: REQ-S13-011, REQ-S13-012
- categoria: error
- dado: un CONSENTIMIENTO vigente
- cuando: se intenta crear un miembro sin aceptación y otro con aceptación pero sin medio
- entonces: ambos se rechazan con ConsentimientoRequeridoError y no se crea ningún miembro ni consentimiento

### BEH-S13-009
- cubre: REQ-S13-013, REQ-S13-015
- categoria: feliz
- dado: un CONSENTIMIENTO versión 2 vigente y un administrador con sesión
- cuando: crea un miembro con aceptación en PAPEL
- entonces: existen el miembro y su ConsentimientoMiembro de la versión 2, medio PAPEL, el administrador y la hora de Lima, creados en una sola transacción; si falla la creación del miembro no queda consentimiento

### BEH-S13-010
- cubre: REQ-S13-014, REQ-S13-025
- categoria: borde
- dado: ningún CONSENTIMIENTO publicado
- cuando: se crea un miembro sin aceptación y se abre el panel
- entonces: el miembro se crea sin consentimiento y el panel muestra «Falta publicar el texto de consentimiento»

### BEH-S13-011
- cubre: REQ-S13-016
- categoria: error
- dado: un miembro existente, un identificador inexistente, un miembro eliminado y ningún CONSENTIMIENTO publicado
- cuando: se intenta registrar el consentimiento en cada caso
- entonces: se lanzan SinTextoVigenteError, MiembroNoEncontradoError y MiembroEliminadoError según corresponda, sin escribir nada

### BEH-S13-012
- cubre: REQ-S13-017
- categoria: borde
- dado: un miembro con aceptación no revocada de la versión vigente
- cuando: se registra el consentimiento otra vez
- entonces: se devuelve la aceptación existente y no se crea otra fila

### BEH-S13-013
- cubre: REQ-S13-018
- categoria: concurrencia
- dado: dos registros simultáneos del consentimiento de un mismo miembro, detenidos con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: queda una sola fila y ambos reciben la misma

### BEH-S13-014
- cubre: REQ-S13-019, REQ-S13-021, REQ-S13-022
- categoria: feliz
- dado: un miembro con aceptación vigente y correo con correoConsentidoEn
- cuando: el administrador revoca con el motivo «Pidió no recibir avisos»
- entonces: la aceptación queda revocada con la fecha de Lima, el motivo y el autor, correoConsentidoEn queda en nulo y el miembro conserva su estado, sus datos y sus pagos

### BEH-S13-015
- cubre: REQ-S13-020
- categoria: error
- dado: un miembro sin aceptación y otro con aceptación
- cuando: se revoca al primero y al segundo con motivos de 4 y de 201 caracteres
- entonces: el primero lanza SinConsentimientoError y el segundo MotivoInvalidoError en ambos casos, sin escribir

### BEH-S13-016
- cubre: REQ-S13-023, REQ-S13-024
- categoria: feliz
- dado: un CONSENTIMIENTO v1 y v2 (v2 de cambio sustancial) y cinco miembros: A aceptó v2, B aceptó v1, C nunca aceptó, D aceptó v1 y revocó, y E aceptó v1 cuando v2 no era sustancial
- cuando: se abre la lista y se aplica «Pendientes de consentimiento»
- entonces: A es VIGENTE, B DESACTUALIZADO, C SIN_CONSENTIMIENTO, D REVOCADO y E DESACTUALIZADO por ser v2 la última de cambio sustancial; el filtro devuelve B, C, D y E; con v2 no sustancial E sería VIGENTE

### BEH-S13-017
- cubre: REQ-S13-026
- categoria: borde
- dado: la configuración del negocio
- cuando: se guardan razón social de 1 y de 121 caracteres, RUC «20123456786», «20123456787» y de 10 dígitos, y dirección de 4 y de 201 caracteres
- entonces: se aceptan razón social de 2 a 120, el RUC válido y dirección de 5 a 200; se rechazan los demás sin escribir

### BEH-S13-018
- cubre: REQ-S13-027, REQ-S13-028
- categoria: feliz
- dado: razón social, RUC y dirección completos y un AVISO_RECLAMACIONES publicado, y luego la configuración sin dirección
- cuando: el administrador abre /libro-de-reclamaciones
- entonces: con todo completo muestra los cuatro elementos en formato A4 imprimible; sin la dirección indica «Falta la dirección» y no ofrece imprimir

### BEH-S13-019
- cubre: REQ-S13-029
- categoria: feliz
- dado: el esquema y el código finales
- cuando: se buscan tablas, casos de uso, rutas y formularios que guarden un reclamo o queja
- entonces: no existe ninguno

### BEH-S13-020
- cubre: REQ-S13-030, REQ-S13-031, REQ-S13-032, REQ-S13-035
- categoria: feliz
- dado: 150 miembros, uno con documento «12345678» y nombre «Rosa Pérez»
- cuando: se pide GET api/miembros sin q, con q «Rosa», con q «12345678» y se abre la ficha de Rosa
- entonces: sin q devuelve 100 miembros sin documento completo; con q «Rosa» y con q «12345678» devuelve a Rosa con el documento como «•••••678»; el documento completo «12345678» aparece solo en la ficha

### BEH-S13-021
- cubre: REQ-S13-033
- categoria: error
- dado: peticiones sin sesión, con sesión vencida y de un administrador desactivado
- cuando: llegan a las rutas, acciones y pantallas de textos legales, consentimiento, privacidad y reclamaciones
- entonces: todas se rechazan antes de leer o escribir datos

### BEH-S13-022
- cubre: REQ-S13-034, REQ-S13-036
- categoria: feliz
- dado: la carpeta docs/legal y los comandos del sistema
- cuando: se leen las plantillas y se buscan comandos o semillas que las carguen
- entonces: cada plantilla lleva la marca de borrador y ningún comando las carga en la base de datos

## 3. Invariantes

### INV-S13-001
- propiedad: toda aceptación apunta a un texto de tipo CONSENTIMIENTO y a un miembro existente, y no hay dos aceptaciones del mismo miembro y texto
- mecanismo: restriccion-bd
- deteccion: claves foráneas, restricción única sobre el miembro y el texto, y CHECK de que el texto es de tipo CONSENTIMIENTO por la prueba de inserción de un texto de otro tipo, que falla
- protege: REQ-S13-011, REQ-S13-017, REQ-S13-018

### INV-S13-002
- propiedad: las versiones de un tipo de texto son enteros consecutivos desde 1 sin repeticiones
- mecanismo: test-propiedad
- deteccion: sobre 50 secuencias de publicaciones, algunas simultáneas, generadas con un generador congruencial lineal de semilla fija escrito en la prueba, las versiones de cada tipo son 1, 2, 3… sin huecos ni repetidos
- protege: REQ-S13-001, REQ-S13-003, REQ-S13-005

### INV-S13-003
- propiedad: ningún miembro con consentimiento revocado conserva correoConsentidoEn
- mecanismo: transaccion
- deteccion: revocarConsentimiento limpia la marca en la misma transacción; la prueba revoca sobre 20 miembros generados con semilla fija y comprueba que ninguno conserva la marca
- protege: REQ-S13-019, REQ-S13-021

### INV-S13-004
- propiedad: ninguna respuesta de lista de miembros contiene un documento completo
- mecanismo: test-propiedad
- deteccion: para 50 combinaciones de q y de cantidad de miembros generadas con semilla fija, ninguna respuesta de GET api/miembros ni la lista del panel contiene un documento de 6 o más caracteres completo
- protege: REQ-S13-030, REQ-S13-031, REQ-S13-032

## 4. Criterios de aceptación

### AC-S13-001
- enlaza: REQ-S13-001, REQ-S13-003, REQ-S13-004, BEH-S13-001, BEH-S13-003
- metodo: integracion
- procedimiento: con una base efímera, publicar los textos de BEH-S13-001 y probar los contenidos y el tipo de BEH-S13-003
- esperado: las versiones son 1, 2 y 1, los contenidos de 20 y 20 000 caracteres se aceptan y el resto se rechaza con TextoLegalInvalidoError sin escribir
- test: pendiente

### AC-S13-002
- enlaza: REQ-S13-002, BEH-S13-002
- metodo: unitario
- procedimiento: buscar con la API de typescript, en apps y packages, funciones, acciones y rutas que actualicen o borren filas de TextoLegal
- esperado: no existe ninguna
- test: pendiente

### AC-S13-003
- enlaza: REQ-S13-005, BEH-S13-004, INV-S13-002
- metodo: integracion
- procedimiento: lanzar con Promise.all dos publicaciones del mismo tipo con una barrera, y ejecutar 50 secuencias con el generador de semilla fija
- esperado: las versiones son consecutivas sin repeticiones ni huecos ni error crudo
- test: pendiente

### AC-S13-004
- enlaza: REQ-S13-006, REQ-S13-007, REQ-S13-008, REQ-S13-009, REQ-S13-025, BEH-S13-005, BEH-S13-006, BEH-S13-010
- metodo: manual
- procedimiento: publicar un texto con una línea «<script>alert(1)</script>», abrir /privacidad y el formulario de alta, y abrir el panel sin ningún CONSENTIMIENTO publicado
- esperado: el script se ve como texto, los saltos de línea se conservan, se muestra la versión y fecha o «Aún no se ha publicado», el alta enlaza /privacidad y el panel muestra el aviso de falta de consentimiento
- test: pendiente

### AC-S13-005
- enlaza: REQ-S13-010, BEH-S13-007
- metodo: manual
- procedimiento: publicar una versión nueva marcada como cambio sustancial y abrir el historial
- esperado: aparecen todas las versiones con fecha, autor y marca, y ninguna se puede editar
- test: pendiente

### AC-S13-006
- enlaza: REQ-S13-011, REQ-S13-012, REQ-S13-013, REQ-S13-014, REQ-S13-015, BEH-S13-008, BEH-S13-009, BEH-S13-010, INV-S13-001
- metodo: integracion
- procedimiento: crear miembros con un CONSENTIMIENTO vigente sin aceptación, sin medio y con aceptación en PAPEL, forzar un fallo en la creación del miembro, crear un miembro sin CONSENTIMIENTO publicado e intentar insertar una aceptación de un texto que no es CONSENTIMIENTO
- esperado: los dos primeros lanzan ConsentimientoRequeridoError, el tercero crea miembro y aceptación juntos con los campos de BEH-S13-009, el fallo no deja aceptación, el último no exige aceptación y la inserción de otro tipo falla
- test: pendiente

### AC-S13-007
- enlaza: REQ-S13-016, REQ-S13-017, REQ-S13-018, BEH-S13-011, BEH-S13-012, BEH-S13-013
- metodo: integracion
- procedimiento: registrar el consentimiento en los casos de BEH-S13-011 y BEH-S13-012 y lanzar con Promise.all dos registros del mismo miembro con una barrera
- esperado: se lanzan los errores indicados, la repetición devuelve la existente y la carrera deja una sola fila
- test: pendiente

### AC-S13-008
- enlaza: REQ-S13-019, REQ-S13-020, REQ-S13-021, REQ-S13-022, BEH-S13-014, BEH-S13-015, INV-S13-003
- metodo: integracion
- procedimiento: revocar el consentimiento de un miembro con correoConsentidoEn, probar los casos de BEH-S13-015 y repetir la revocación sobre 20 miembros con semilla fija
- esperado: la revocación deja los datos de BEH-S13-014, el miembro conserva estado, datos y pagos, los errores se lanzan sin escribir y ningún miembro revocado conserva correoConsentidoEn
- test: pendiente

### AC-S13-009
- enlaza: REQ-S13-023, REQ-S13-024, BEH-S13-016
- metodo: integracion
- procedimiento: crear los cinco miembros de BEH-S13-016 con los dos casos de v2 (sustancial y no sustancial), leer sus estados y aplicar el filtro
- esperado: los estados y el contenido del filtro coinciden con BEH-S13-016 en los dos casos
- test: pendiente

### AC-S13-010
- enlaza: REQ-S13-026, REQ-S13-027, REQ-S13-028, BEH-S13-017, BEH-S13-018
- metodo: integracion
- procedimiento: guardar los datos del negocio de BEH-S13-017 y leer los datos que alimentan /libro-de-reclamaciones con todo completo y sin la dirección
- esperado: se aceptan y rechazan los valores indicados, y los datos de la página traen los cuatro elementos o indican qué falta
- test: pendiente

### AC-S13-011
- enlaza: REQ-S13-027, REQ-S13-028, BEH-S13-018
- metodo: manual
- procedimiento: abrir /libro-de-reclamaciones completa e imprimirla en la vista previa del navegador, y repetir sin la dirección
- esperado: la vista previa A4 muestra razón social, RUC, dirección y aviso, y sin la dirección indica qué falta y no ofrece imprimir
- test: pendiente

### AC-S13-012
- enlaza: REQ-S13-029, REQ-S13-033, BEH-S13-019, BEH-S13-021
- metodo: integracion
- procedimiento: buscar con la API de typescript tablas, rutas y formularios que guarden reclamos, y enviar a las rutas, acciones y pantallas de esta spec peticiones sin sesión, con sesión vencida y de un administrador desactivado
- esperado: no existe almacenamiento de reclamos y todas las peticiones se rechazan antes de leer o escribir
- test: pendiente

### AC-S13-013
- enlaza: REQ-S13-030, REQ-S13-031, REQ-S13-032, REQ-S13-035, BEH-S13-020, INV-S13-004
- metodo: integracion
- procedimiento: con 150 miembros, pedir GET api/miembros sin q, con q por nombre y con q por documento, leer los datos de la lista del panel y abrir la ficha, y repetir sobre 50 combinaciones con semilla fija
- esperado: sin q devuelve 100 miembros sin documento completo, las búsquedas devuelven al miembro con «•••••678», el documento completo solo está en la ficha y ninguna respuesta contiene un documento completo
- test: pendiente

### AC-S13-014
- enlaza: REQ-S13-034, REQ-S13-036, BEH-S13-022
- metodo: unitario
- procedimiento: leer cada archivo de docs/legal buscando la marca de borrador y buscar con la API de typescript comandos o semillas que lean esa carpeta
- esperado: todas las plantillas llevan la marca y ningún comando las carga
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización del alta de miembro y de la lista de miembros; (2) esquema aditivo: `TextoLegal`, `ConsentimientoMiembro` y los tres campos de `ConfiguracionNegocio`; (3) casos de uso `publicarTextoLegal`, `registrarConsentimiento`, `revocarConsentimiento` y el cálculo del estado, con sus pruebas, incluida la concurrencia; (4) `crearMiembro` con consentimiento en la misma transacción (con `IUnidadDeTrabajo` de S-04) y el formulario de alta; (5) pantallas de textos legales, `/privacidad`, `/libro-de-reclamaciones`, datos del negocio y el aviso permanente; (6) lista de miembros con estado y filtro, y minimización de `GET api/miembros` con búsqueda en el servidor (cambio atómico de la ruta y de la lista del panel); (7) plantillas de `docs/legal/` con la marca.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la propia prueba, una base efímera y una barrera que fija el orden de las transacciones; no hay dependencias nuevas.
- Las plantillas legales las redacto como borrador general y no sustituyen a un abogado.
- AC-S13-004, AC-S13-005 y AC-S13-011 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15) con las tablas y los campos nuevos; el seed no publica ningún texto, de modo que el sistema nace sin consentimiento exigido (SUP-S13-003).
- **Enmiendas que se registran al aprobar S-13:**
  - S-05: `ConfiguracionNegocio` suma `razonSocial`, `ruc` y `direccion`.
  - S-06: el traspaso de `GET api/miembros` queda cumplido; SUP-S06-008 se lee con la lista enmascarada (SUP-S13-008).
  - S-09: el traspaso de consentimiento queda cumplido y `crearMiembro` suma el consentimiento en su transacción.
  - S-12: `correoConsentidoEn` se limpia al revocar (REQ-S13-021); la validación del RUC se reutiliza.
  - S-15: el baseline incluye las tablas nuevas; el seed no publica textos.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 suman dos tablas (`TextoLegal` y `ConsentimientoMiembro`).
  - `docs/06-modelo-datos-cambios.md`, `COBERTURA-RF.md` (RF-15, RF-71, RF-72) y `BACKLOG-SPECS.md`: nota de que S-13 cubre consentimiento, privacidad y aviso.
- **Traspasos:** S-17 (publicación de la página `/privacidad` y retención), S-21 (enmascarado del documento en el kiosco) y una spec futura si el propietario fija la retención (P-20) o pide supresión.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Los textos legales no los redacta un abogado: publicar un texto sin revisar puede no cumplir la Ley 29733 ni la Ley 29571. Mitigación: plantillas marcadas, nada se carga solo y el aviso «Falta publicar el texto de consentimiento».
- Mientras no haya texto publicado, el sistema registra miembros sin consentimiento (SUP-S13-003). Mitigación: el aviso permanente y el filtro «Pendientes»; cuando se publique, los miembros existentes aparecen como SIN_CONSENTIMIENTO.
- Revocar sin supresión de datos y sin anonimizar puede incumplir los derechos de cancelación de la Ley 29733 (decisión del propietario, riesgo legal aceptado en ADR-013 y S-09). Mitigación: se registra la revocación y se corta el correo; la supresión queda para una spec futura.
- El consentimiento lo registra el administrador en nombre del miembro (SUP-S13-004): no hay firma ni evidencia propia. Mitigación: el medio PAPEL permite guardar la hoja firmada fuera del sistema.
- El aviso del Libro de Reclamaciones puede exigir contenido que no se verificó. Mitigación: el texto lo publica el propietario tras validarlo y el sistema solo lo imprime.
- Enmascarar el documento en la lista cambia cómo se busca a un miembro. Mitigación: búsqueda en servidor por documento completo, nombre o código; la ficha lo muestra completo.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Mientras no haya texto de consentimiento publicado el alta no lo exige y el panel muestra un aviso? Default: sí (SUP-S13-003).
- ¿Una versión nueva solo obliga a aceptarla de nuevo si la publicas como «cambio sustancial»? Default: sí (SUP-S13-005).
- ¿Revocar el consentimiento solo registra la revocación y corta los correos, sin borrar datos? Default: sí (SUP-S13-006).
- ¿El Libro de Reclamaciones es físico y el sistema solo imprime el aviso con los datos del negocio? Default: sí (SUP-S13-007).
- ¿La lista de miembros oculta el documento (solo los últimos 3 caracteres) y la búsqueda se hace en el servidor? Default: sí (SUP-S13-008).
- ¿Quién redacta o revisa los textos legales (abogado)? Default: tú los consigues y los publicas desde la pantalla (SUP-S13-010).
