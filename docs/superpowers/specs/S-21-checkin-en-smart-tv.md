---
id: S-21
estado: en-revision
adrs: ADR-004, ADR-012, ADR-016, ADR-020, ADR-021, ADR-022
depende_de: S-00, S-01, S-02, S-05, S-06, S-09, S-17, S-19, S-22
aprobada_por:
fecha_aprobacion:
---
# S-21 — Check-in en smart-TV: entrada con teclado numérico USB, enmascarado, límite de intentos y APK

## 0. Contexto y alcance

### 0.1 Problema
ADR-021 incluyó en el alcance el check-in en un smart-TV con teclado numérico USB. El kiosco web (`apps/kiosk`) y su envoltorio Android (`apps/kiosk-tv`, Capacitor) ya existen en el Repo A, pero traen cuatro problemas que otras specs dejaron a S-21: (1) el teclado numérico llega por tres vías (un host de Windows que ya no es del proyecto, el APK de Android y un `<input>`) y la pantalla muestra los dígitos que teclea el socio, lo que contradice el invariante «el kiosco no muestra el documento» de ADR-004 (traspaso de S-06); (2) un código de 4 dígitos se puede enumerar porque el check-in no limita los intentos fallidos (traspaso de S-06); (3) el APK trae la marca anterior (`com.adrenalina.kiosco`, «Kiosco AX», una URL por defecto de otro negocio, íconos y un `debug.keystore` versionado) y su CI cifra el APK y emite solo advertencias si falta la clave; (4) el contrato del kiosco cambia por S-05 (sin `sucursalAsignada`), S-06 (`{ identificador }`), S-09 (miembro eliminado) y S-19 (superficie `tv` y tokens). S-21 deja el check-in en TV funcionando con esas decisiones.

### 0.2 Dentro de alcance
- Entrada del identificador solo por el teclado numérico USB (Android) o por el `<input>` (navegador de desarrollo), sin la vía del host de Windows.
- Enmascarado de lo que teclea el socio y límite de intentos fallidos en `api/checkin`.
- Mensaje neutro para el socio no encontrado, vencido o eliminado.
- Adaptación de las pantallas del kiosco a la superficie `tv` y a los tokens de S-19, y retiro de la marca anterior en `apps/kiosk` y `apps/kiosk-tv`.
- APK `kiosk-tv`: identificador, nombre, URL sin valor por defecto, íconos del kit, firma con un keystore secreto y su CI sin versionar claves.
- Contrato del kiosco con S-05, S-06 y S-09, y el origen CORS del kiosco.
- `tools/verificar-kiosco-tv.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- La vitrina y su APK: S-20.
- El host de Windows `kiosk-host`: fuera del proyecto (ADR-021 §2).
- Reconocimiento facial, lector de códigos de barras o de huellas.
- Tokens, tipografías y componentes del sistema de diseño: S-19 (S-21 solo los consume).
- Despliegue del servidor, TLS y restricción por IP: S-17.
- La cola sin conexión y su formato: ya los cambió S-06; S-21 solo comprueba que la entrada nueva los usa.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-21 recibirá tras S-00 a S-20; se recontarán al empezar.
- **Vías del teclado:** `apps/kiosk/lib/teclasNumpad.ts` define los mensajes `digit`, `enter`, `backspace` y `clear` y `mensajeDeTecla`, que solo acepta `Numpad0` a `Numpad9`, `NumpadEnter`, `Backspace` y `Escape` y descarta la fila numérica normal; `useEntradaCedula.ts` obtiene la entrada del host de Windows (`window.chrome.webview`, `:4-15`), del APK de Android (`keydown` global sin `<input>`) o de un `<input>` en un navegador normal, ignora todo mientras se envía una cédula (`enviandoRef`) y se calla tras 7 000 ms de inactividad (`TIEMPO_INACTIVIDAD_MS`, `:17`) (verificado con `Read`).
- **Pantalla:** `AccessCard.tsx` usa las fuentes `Bebas Neue`, `Barlow` y `Barlow Condensed` con estilos escritos a mano (`:65-110`), y `apps/kiosk/app/page.tsx` y `MarcoFicha.tsx` referencian los fondos del cliente anterior (verificado con `grep -n`).
- **Sin límite de intentos:** ni `api/checkin/route.ts` ni el kiosco cuentan fallos; S-06 §0.3 lo traspasó a S-21 o S-17 (verificado con `grep -n "intentos"` sin resultados).
- **APK:** `apps/kiosk-tv/capacitor/scripts/preparar.mjs:6,30` usa por defecto `https://kiosco.zipnegocios.com`, el `appId` `com.adrenalina.kiosco` y el nombre «Kiosco AX», genera la URL de inicio con la clave en el fragmento (`urlInicio`, `url.mjs`) y fija `loggingBehavior: "none"`, `allowMixedContent: false` y `webContentsDebuggingEnabled: false`; `scripts/` trae `generar-iconos.ps1` e `icono-kiosco.jpg`; `android/app/build.gradle:21-22` exige un `debug.keystore` versionado (S-00 §5.3); el CI `apk-kiosco.yml` se dispara solo a mano (`workflow_dispatch`), usa la clave de la sucursal como secreto, cifra el APK con 7-Zip AES-256 y solo emite una advertencia si falta la clave (DI-81, `docs/11`) (verificado con `Read` y `grep -n`).
- **Interacción con specs aprobadas:** S-01 guarda la clave del kiosco como hash, limita el CORS con `CORS_ORIGENES` (vacío = falla cerrado) y deja a S-21 fijar el origen del APK; S-05 quita `sucursalAsignada*` y `sucursal_incorrecta` del contrato y deja a S-21 revisar el contrato (REQ-S05-032 y REQ-S05-033); S-06 fija el cuerpo `{ identificador }` (código de 4 dígitos o documento), que la respuesta no incluye el documento (REQ-S06-022) y traspasa a S-21 el campo de entrada, el enmascarado y el límite de intentos; S-09 traspasa el mensaje del kiosco para un miembro eliminado; S-04 deja los estados `activo` y `vencido`; S-19 define la superficie `tv`, `?superficie=tv`, los tokens y la marca; S-17 deja el despliegue y el origen público (verificado con `grep -n` en las specs).
- No verificado: el comportamiento del teclado numérico USB en el smart-TV real del gimnasio (marca y modelo), la versión del WebView del televisor y que el origen de un APK de Capacitor con URL remota sea el del propio kiosco.

### 0.5 Supuestos
- SUP-S21-001: el socio escribe su identificador (código de 4 dígitos o documento de hasta 20 caracteres, S-06) con las teclas del teclado numérico USB; `Enter` envía, `Backspace` borra un dígito y `Escape` limpia. La fila numérica del teclado no escribe. Default: ese teclado; asumido, por validar en el televisor real.
- SUP-S21-002: la pantalla de entrada muestra un punto por cada carácter tecleado y nunca los caracteres; no hay revelado temporal de la última tecla. Default: enmascarado total; asumido, por validar.
- SUP-S21-003: el límite de intentos cuenta los envíos que no encuentran a un miembro activo o que el servidor rechaza por identificador inválido, por clave de kiosco: 5 fallos en 5 minutos bloquean el check-in 5 minutos con 429 y `Retry-After`; un envío correcto no reinicia el contador pero el bloqueo vence solo. Default: 5 fallos, 5 minutos y 5 minutos; asumido, por validar.
- SUP-S21-004: un socio no encontrado, con documento inexistente, con vencimiento o eliminado ve un mensaje del mismo tamaño y estilo; los estados `vencido` y `eliminado` no revelan datos del miembro más que su primer nombre cuando está vencido, y un eliminado ve el mismo texto neutro que un no encontrado: «No te encontramos. Consulta en recepción.». Default: ese tratamiento; asumido, por validar con S-09.
- SUP-S21-005: el contador de intentos se guarda en la tabla `IntentoCheckin` (clave del kiosco por prefijo, resultado y fecha) con un candado asesor por clave, como `IntentoLogin` de S-01, y se purga lo de más de 24 horas. Default: tabla propia con candado; asumido, por validar.
- SUP-S21-006: el APK de `kiosk-tv` tiene el identificador `pe.adharafit.kiosco` y el nombre «Adhara Fit Acceso»; la URL del kiosco (`KIOSCO_URL`) y la clave (`KIOSCO_CLAVE`) no tienen valor por defecto y la preparación falla si falta alguna. Default: esos nombres; asumido, por validar.
- SUP-S21-007: el APK se firma con un keystore guardado como secreto del repositorio (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_CLAVE`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_CLAVE`); ningún keystore se versiona, `build.gradle` lee la firma de variables de entorno y el workflow falla si falta un secreto; el APK se cifra con `APK_CLAVE` porque trae la clave del kiosco. El workflow se dispara a mano. Default: ese esquema; asumido, por validar.
- SUP-S21-008: el origen del APK es el del propio kiosco web (la app remota carga la URL del kiosco), de modo que `CORS_ORIGENES` de S-01 solo debe incluir el origen público del kiosco. Default: un solo origen; asumido, por validar.
- SUP-S21-009: la pantalla de entrada se muestra en la superficie `tv` cuando el kiosco se abre con `?superficie=tv` (la URL que prepara el APK) y en `kiosco` en un navegador normal; los tamaños de S-19 se aplican con tokens, sin tamaños escritos. Default: ese mecanismo; asumido, por validar.
- SUP-S21-010: tras 7 000 ms sin teclear, la entrada se limpia y vuelve el reposo (el valor actual). Default: conservar 7 000 ms; asumido, por validar.

## 1. Requisitos

### REQ-S21-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La entrada del identificador deberá aceptar solo las teclas Numpad0 a Numpad9, NumpadEnter, Backspace y Escape.

### REQ-S21-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La entrada del identificador no deberá escribir con las teclas de la fila numérica del teclado.

### REQ-S21-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La entrada del identificador no deberá leer mensajes de un host de Windows ni usar window.chrome.webview.

### REQ-S21-004
- tipo: mientras
- prioridad: MUST
- origen: ADR-016
- texto: Mientras se envía un identificador, la entrada deberá ignorar toda tecla.

### REQ-S21-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La entrada del identificador deberá limitar lo tecleado a 20 caracteres.

### REQ-S21-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La pantalla de entrada deberá mostrar un punto por cada carácter tecleado.

### REQ-S21-040
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La pantalla de entrada no deberá mostrar ningún carácter del identificador.

### REQ-S21-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El kiosco no deberá guardar el identificador tecleado en el almacenamiento local ni en los registros, salvo en la cola de pendientes de S-06 mientras no haya conexión.

### REQ-S21-008
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S21-010
- texto: Tras 7 000 ms sin teclear, la entrada deberá limpiarse y volver al reposo.

### REQ-S21-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La base de datos deberá tener la tabla IntentoCheckin con el prefijo de la clave del kiosco, el resultado y la fecha del intento.

### REQ-S21-010
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si un envío no encuentra a un miembro activo o trae un identificador inválido entonces api/checkin deberá registrar un intento fallido de esa clave de kiosco.

### REQ-S21-011
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si la clave del kiosco acumula 5 intentos fallidos en los últimos 5 minutos entonces api/checkin deberá responder 429 con la cabecera Retry-After sin buscar al miembro.

### REQ-S21-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El bloqueo por intentos fallidos deberá durar 5 minutos desde el quinto fallo.

### REQ-S21-041
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Un envío correcto no deberá reiniciar el contador de intentos fallidos.

### REQ-S21-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El conteo de intentos fallidos deberá hacerse dentro de una transacción con un candado asesor por clave de kiosco.

### REQ-S21-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: api/checkin deberá borrar los intentos de más de 24 horas.

### REQ-S21-015
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando el kiosco recibe un 429, deberá mostrar el aviso «Demasiados intentos. Espera unos minutos o consulta en recepción.» durante el tiempo indicado por Retry-After.

### REQ-S21-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La pantalla del kiosco deberá mostrar «No te encontramos. Consulta en recepción.» tanto para un identificador inexistente como para un miembro eliminado.

### REQ-S21-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La pantalla de un miembro vencido deberá mostrar su primer nombre y el estado vencido, sin documento ni fecha de nacimiento.

### REQ-S21-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El kiosco deberá usar solo los estados de acceso activo y vencido, sin sucursal_incorrecta ni abono_vencido.

### REQ-S21-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Las pantallas del kiosco deberán obtener colores, tamaños de texto, tipografías, espaciados y duraciones de los tokens de S-19 y no de valores escritos.

### REQ-S21-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La app kiosk deberá mostrar la superficie tv cuando se abre con el parámetro superficie=tv.

### REQ-S21-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Las pantallas del kiosco no deberán usar imágenes ni video de fondo del cliente anterior.

### REQ-S21-042
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El fondo de las pantallas del kiosco deberá ser el color ground con la marca de agua del isotipo.

### REQ-S21-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El kiosco no deberá importar paquetes de dominio ni de base de datos.

### REQ-S21-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El APK de kiosk-tv deberá tener el identificador pe.adharafit.kiosco y el nombre «Adhara Fit Acceso».

### REQ-S21-024
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si falta KIOSCO_URL o KIOSCO_CLAVE entonces la preparación del APK deberá terminar con error sin generar archivos.

### REQ-S21-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La preparación del APK no deberá imprimir ni guardar en la configuración de Capacitor la clave del kiosco fuera del fragmento de la URL de inicio.

### REQ-S21-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El APK deberá abrir la URL del kiosco con superficie=tv y la clave en el fragmento.

### REQ-S21-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La configuración de Capacitor deberá fijar loggingBehavior none, allowMixedContent falso y webContentsDebuggingEnabled falso.

### REQ-S21-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: La página local de sin conexión del APK deberá obtener sus colores del archivo tokens.json de S-19 y mostrar el nombre del negocio.

### REQ-S21-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El APK deberá usar los íconos del kit de Adhara Fit.

### REQ-S21-043
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: La carpeta de scripts del APK no deberá contener generar-iconos.ps1 ni icono-kiosco.jpg.

### REQ-S21-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El repositorio no deberá contener ningún archivo keystore ni jks.

### REQ-S21-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: build.gradle de kiosk-tv deberá leer el keystore, el alias y las claves de variables de entorno y no de archivos del repositorio.

### REQ-S21-032
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si falta alguno de los secretos de firma o APK_CLAVE entonces el workflow apk-kiosco.yml deberá fallar antes de compilar.

### REQ-S21-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El workflow apk-kiosco.yml deberá cifrar el APK con APK_CLAVE antes de subirlo como artefacto.

### REQ-S21-034
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El workflow apk-kiosco.yml deberá dispararse solo a mano.

### REQ-S21-044
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El workflow apk-kiosco.yml no deberá aceptar la clave del kiosco como entrada.

### REQ-S21-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: CORS_ORIGENES deberá incluir el origen público del kiosco y ningún origen de Capacitor ni de localhost en producción.

### REQ-S21-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next, out, generated y las pruebas, no deberán contener los términos com.adrenalina, zipnegocios, Kiosco AX, chrome.webview, kiosk-host ni debug.keystore.

### REQ-S21-037
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-kiosco-tv.mjs encuentra alguno de los términos de REQ-S21-036, deberá terminar con código distinto de cero.

### REQ-S21-038
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-kiosco-tv.mjs encuentra alguno de los términos de REQ-S21-036, deberá nombrar archivo, línea y término.

### REQ-S21-039
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-kiosco-tv.mjs en cada pull request.

## 2. Comportamiento

### BEH-S21-001
- cubre: REQ-S21-001, REQ-S21-002, REQ-S21-005
- categoria: borde
- dado: un teclado con teclas Numpad0 a Numpad9, NumpadEnter, Backspace, Escape, la fila numérica Digit1 y la tecla KeyA
- cuando: se pulsa cada una y luego 21 dígitos del numpad seguidos
- entonces: solo el numpad, Enter, Backspace y Escape producen mensajes; Digit1 y KeyA se ignoran; el dígito 21 no se agrega y la entrada queda en 20 caracteres

### BEH-S21-002
- cubre: REQ-S21-003, REQ-S21-022
- categoria: feliz
- dado: el código de apps/kiosk
- cuando: se buscan window.chrome.webview, kiosk-host y las importaciones de @gym-app/domain y @gym-app/db
- entonces: no hay ninguna coincidencia

### BEH-S21-003
- cubre: REQ-S21-004
- categoria: concurrencia
- dado: un envío en curso y el socio que pulsa dígitos y Enter durante la respuesta
- cuando: llega la respuesta
- entonces: las teclas pulsadas durante el envío se ignoraron, no hay doble envío y la entrada queda limpia

### BEH-S21-004
- cubre: REQ-S21-006, REQ-S21-040, REQ-S21-007
- categoria: feliz
- dado: el socio que teclea «12345678»
- cuando: se mira la pantalla, el almacenamiento local y los registros
- entonces: la pantalla muestra ocho puntos y ningún dígito; el identificador no está en el almacenamiento local ni en los registros, salvo en la cola de pendientes sin conexión

### BEH-S21-005
- cubre: REQ-S21-008
- categoria: borde
- dado: un identificador parcial tecleado
- cuando: pasan 6 999 y 7 001 ms sin teclear
- entonces: a los 6 999 ms conserva los puntos y a los 7 001 ms se limpia y vuelve el reposo

### BEH-S21-006
- cubre: REQ-S21-009, REQ-S21-010
- categoria: feliz
- dado: una base migrada, un miembro activo y un identificador inexistente
- cuando: se envía el miembro activo, el inexistente y uno con 25 caracteres
- entonces: el activo registra el ingreso sin intento fallido; los otros dos dejan un IntentoCheckin fallido cada uno con el prefijo de la clave y la fecha

### BEH-S21-007
- cubre: REQ-S21-011, REQ-S21-012, REQ-S21-041
- categoria: borde
- dado: 4 y luego 5 intentos fallidos en 5 minutos, y un envío correcto durante el bloqueo
- cuando: se envía un sexto identificador, uno correcto durante el bloqueo y uno pasados 5 minutos del quinto fallo
- entonces: con 4 fallos se atiende; con 5 responde 429 con Retry-After sin buscar al miembro; el correcto durante el bloqueo también responde 429; pasados 5 minutos se atiende de nuevo

### BEH-S21-008
- cubre: REQ-S21-013
- categoria: concurrencia
- dado: 5 intentos fallidos simultáneos de la misma clave, detenidos con una barrera
- cuando: se liberan a la vez
- entonces: se registran exactamente 5 fallos, el siguiente envío recibe 429 y ninguno se pierde ni se cuenta dos veces

### BEH-S21-009
- cubre: REQ-S21-014
- categoria: borde
- dado: intentos de hace 23 y de hace 25 horas
- cuando: llega un envío
- entonces: se borra el de 25 horas y se conserva el de 23

### BEH-S21-010
- cubre: REQ-S21-015
- categoria: feliz
- dado: una respuesta 429 con Retry-After 300
- cuando: el kiosco la recibe
- entonces: muestra «Demasiados intentos. Espera unos minutos o consulta en recepción.» durante 300 segundos y no envía nada mientras tanto

### BEH-S21-011
- cubre: REQ-S21-016, REQ-S21-017, REQ-S21-018
- categoria: error
- dado: un identificador inexistente, un miembro eliminado, un miembro vencido «Rosa Pérez» y uno activo
- cuando: se envía cada uno
- entonces: el inexistente y el eliminado muestran el mismo texto «No te encontramos. Consulta en recepción.»; el vencido muestra «Rosa» y el estado vencido sin documento ni fecha de nacimiento; el activo muestra el ingreso; ninguna respuesta trae sucursal_incorrecta ni abono_vencido

### BEH-S21-012
- cubre: REQ-S21-019, REQ-S21-020, REQ-S21-021, REQ-S21-042
- categoria: feliz
- dado: el kiosco abierto con y sin ?superficie=tv
- cuando: se leen su atributo data-superficie, sus estilos y su fondo
- entonces: con el parámetro es tv y sin él kiosco, los colores y tamaños salen de variables --gx-*, no hay Bebas Neue ni valores escritos, y el fondo es el color ground con la marca de agua del isotipo sin imágenes ni video del cliente anterior

### BEH-S21-013
- cubre: REQ-S21-023, REQ-S21-026, REQ-S21-027
- categoria: feliz
- dado: KIOSCO_URL «https://acceso.ejemplo.pe» y KIOSCO_CLAVE de prueba
- cuando: se ejecuta preparar.mjs
- entonces: capacitor.config.json trae appId pe.adharafit.kiosco, appName «Adhara Fit Acceso», la URL «https://acceso.ejemplo.pe/?superficie=tv#clave=…», loggingBehavior none, allowMixedContent falso y webContentsDebuggingEnabled falso

### BEH-S21-014
- cubre: REQ-S21-024, REQ-S21-025
- categoria: error
- dado: preparar.mjs sin KIOSCO_URL, sin KIOSCO_CLAVE, y con ambas
- cuando: se ejecuta en cada caso capturando la salida y los archivos
- entonces: los dos primeros terminan con error sin generar archivos; con ambas, la clave aparece solo en el fragmento de la URL de inicio y la salida la oculta con «***»

### BEH-S21-015
- cubre: REQ-S21-028, REQ-S21-029, REQ-S21-043
- categoria: feliz
- dado: la página local de sin conexión generada y la carpeta del APK
- cuando: se leen sus colores, su texto y los archivos de scripts
- entonces: los colores son los de ground e ink de tokens.json, muestra el nombre del negocio, usa los íconos del kit y no existen generar-iconos.ps1 ni icono-kiosco.jpg

### BEH-S21-016
- cubre: REQ-S21-030, REQ-S21-031
- categoria: error
- dado: el repositorio y el build.gradle de kiosk-tv
- cuando: se buscan archivos keystore y jks y la lectura de la firma
- entonces: no hay ningún keystore ni jks y build.gradle lee la firma de variables de entorno

### BEH-S21-017
- cubre: REQ-S21-032, REQ-S21-033, REQ-S21-034, REQ-S21-044
- categoria: error
- dado: el workflow apk-kiosco.yml analizado con un lector de YAML
- cuando: se revisan sus disparadores, sus entradas, sus pasos y sus secretos
- entonces: solo se dispara con workflow_dispatch sin entrada de clave del kiosco, verifica los cuatro secretos de firma y APK_CLAVE antes de compilar y falla si falta alguno, y cifra el APK antes de subirlo

### BEH-S21-018
- cubre: REQ-S21-035
- categoria: borde
- dado: CORS_ORIGENES de producción con el origen del kiosco, y con capacitor://localhost y http://localhost:3000
- cuando: la validación de variables de producción lee cada valor
- entonces: el primero pasa y los otros dos se rechazan nombrando el origen

### BEH-S21-019
- cubre: REQ-S21-036, REQ-S21-037, REQ-S21-038
- categoria: error
- dado: un archivo por cada uno de los seis términos de REQ-S21-036
- cuando: se ejecuta tools/verificar-kiosco-tv.mjs
- entonces: termina con código distinto de cero y nombra archivo, línea y término de cada uno

### BEH-S21-020
- cubre: REQ-S21-039
- categoria: error
- dado: un pull request que agrega zipnegocios en un archivo de apps/kiosk-tv
- cuando: corre el CI
- entonces: el paso de tools/verificar-kiosco-tv.mjs falla y queda en rojo

## 3. Invariantes

### INV-S21-001
- propiedad: el kiosco nunca muestra caracteres del identificador tecleado
- mecanismo: test-propiedad
- deteccion: sobre 100 secuencias de teclas generadas con un generador congruencial lineal de semilla fija escrito en la prueba, el texto renderizado de la entrada nunca contiene un dígito y su cantidad de puntos es igual a la cantidad de caracteres aceptados, hasta 20
- protege: REQ-S21-001, REQ-S21-002, REQ-S21-005, REQ-S21-006

### INV-S21-002
- propiedad: una clave de kiosco no puede hacer más de 5 intentos fallidos en 5 minutos
- mecanismo: transaccion
- deteccion: sobre 50 secuencias de envíos fallidos y correctos con tiempos generados con semilla fija, incluidas ráfagas simultáneas con barrera, nunca se atienden más de 5 fallos dentro de una ventana de 5 minutos
- protege: REQ-S21-010, REQ-S21-011, REQ-S21-012, REQ-S21-013

### INV-S21-003
- propiedad: un identificador inexistente y un miembro eliminado producen la misma respuesta visible
- mecanismo: test-propiedad
- deteccion: sobre 50 miembros eliminados e identificadores inexistentes generados con semilla fija, el cuerpo de la respuesta y el texto de la pantalla son idénticos
- protege: REQ-S21-016

### INV-S21-004
- propiedad: los términos heredados de otro negocio y del host de Windows no aparecen y no hay claves de firma versionadas
- mecanismo: lint
- deteccion: tools/verificar-kiosco-tv.mjs termina con código distinto de cero y lista archivo:línea y término, y falla si encuentra un archivo keystore o jks
- protege: REQ-S21-003, REQ-S21-030, REQ-S21-036, REQ-S21-037, REQ-S21-038

## 4. Criterios de aceptación

### AC-S21-001
- enlaza: REQ-S21-001, REQ-S21-002, REQ-S21-005, REQ-S21-006, REQ-S21-040, BEH-S21-001, INV-S21-001
- metodo: unitario
- procedimiento: ejecutar mensajeDeTecla con los códigos de BEH-S21-001, y renderizar con react-dom/server la entrada tras 100 secuencias de teclas con semilla fija
- esperado: solo las teclas permitidas producen mensajes, el máximo es 20 caracteres y el texto renderizado solo trae puntos
- test: pendiente

### AC-S21-002
- enlaza: REQ-S21-003, REQ-S21-022, REQ-S21-007, BEH-S21-002, BEH-S21-004
- metodo: unitario
- procedimiento: buscar con la API de typescript en apps/kiosk las referencias a window.chrome.webview, kiosk-host y las importaciones de dominio y base de datos, y las escrituras de localStorage y de registros con el identificador
- esperado: no hay coincidencias, y el identificador solo se escribe en la cola de pendientes de S-06
- test: pendiente

### AC-S21-003
- enlaza: REQ-S21-004, REQ-S21-008, BEH-S21-003, BEH-S21-005
- metodo: unitario
- procedimiento: probar el hook de entrada con temporizadores simulados y un envío pendiente: teclas durante el envío y silencios de 6 999 y 7 001 ms
- esperado: las teclas durante el envío se ignoran sin doble envío y la entrada se limpia solo a los 7 001 ms
- test: pendiente

### AC-S21-004
- enlaza: REQ-S21-009, REQ-S21-010, REQ-S21-014, BEH-S21-006, BEH-S21-009
- metodo: integracion
- procedimiento: con una base efímera, enviar a api/checkin un miembro activo, un identificador inexistente y uno de 25 caracteres, y sembrar intentos de 23 y 25 horas
- esperado: se registran los dos fallos con prefijo y fecha, el activo no deja fallo y se borra solo el de 25 horas
- test: pendiente

### AC-S21-005
- enlaza: REQ-S21-011, REQ-S21-012, REQ-S21-041, REQ-S21-013, BEH-S21-007, BEH-S21-008, INV-S21-002
- metodo: integracion
- procedimiento: enviar 4 y 5 fallos con un reloj simulado, un envío correcto durante el bloqueo y otro tras 5 minutos, lanzar con Promise.all 5 fallos simultáneos con una barrera, y repetir 50 secuencias con semilla fija
- esperado: las respuestas, el 429 con Retry-After, el fin del bloqueo y el conteo exacto de 5 coinciden con los comportamientos, y la invariante se cumple en las 50 secuencias
- test: pendiente

### AC-S21-006
- enlaza: REQ-S21-015, BEH-S21-010
- metodo: unitario
- procedimiento: renderizar la pantalla del kiosco con una respuesta 429 de Retry-After 300 y un reloj simulado, y contar los envíos durante 300 segundos
- esperado: muestra el aviso, no envía nada durante 300 segundos y vuelve a aceptar después
- test: pendiente

### AC-S21-007
- enlaza: REQ-S21-016, REQ-S21-017, REQ-S21-018, BEH-S21-011, INV-S21-003
- metodo: integracion
- procedimiento: enviar los cuatro casos de BEH-S21-011 y renderizar la pantalla con cada respuesta, y repetir 50 miembros eliminados e identificadores inexistentes con semilla fija
- esperado: los textos coinciden con BEH-S21-011, el eliminado y el inexistente son idénticos y no aparecen los estados retirados
- test: pendiente

### AC-S21-008
- enlaza: REQ-S21-019, REQ-S21-020, REQ-S21-021, REQ-S21-042, BEH-S21-012
- metodo: unitario
- procedimiento: renderizar el diseño raíz de kiosk con y sin el parámetro, y ejecutar tools/verificar-diseno.mjs de S-19 sobre apps/kiosk
- esperado: el atributo data-superficie es tv o kiosco según el parámetro y la herramienta no encuentra colores, fuentes ni fondos del cliente anterior
- test: pendiente

### AC-S21-009
- enlaza: REQ-S21-023, REQ-S21-024, REQ-S21-025, REQ-S21-026, REQ-S21-027, BEH-S21-013, BEH-S21-014
- metodo: unitario
- procedimiento: ejecutar preparar.mjs con las tres combinaciones de variables de BEH-S21-013 y BEH-S21-014 capturando salida y archivos
- esperado: se generan o no los archivos y la configuración exactamente como indican esos comportamientos y la clave nunca sale en claro
- test: pendiente

### AC-S21-010
- enlaza: REQ-S21-028, REQ-S21-029, REQ-S21-043, BEH-S21-015
- metodo: unitario
- procedimiento: leer www/offline.html generada, compararla con tokens.json y listar los archivos de scripts del APK
- esperado: los colores y el nombre coinciden, se usan los íconos del kit y los dos archivos heredados no existen
- test: pendiente

### AC-S21-011
- enlaza: REQ-S21-030, REQ-S21-031, REQ-S21-032, REQ-S21-033, REQ-S21-034, REQ-S21-044, BEH-S21-016, BEH-S21-017
- metodo: unitario
- procedimiento: buscar archivos keystore y jks, leer build.gradle y analizar apk-kiosco.yml con el lector de YAML de las pruebas
- esperado: no hay keystores, la firma sale de variables de entorno y el workflow cumple lo descrito en BEH-S21-017
- test: pendiente

### AC-S21-012
- enlaza: REQ-S21-035, BEH-S21-018
- metodo: unitario
- procedimiento: ejecutar la validación de variables de producción de S-01 con los tres valores de CORS_ORIGENES
- esperado: el origen del kiosco pasa y los otros dos se rechazan nombrando el origen
- test: pendiente

### AC-S21-013
- enlaza: REQ-S21-036, REQ-S21-037, REQ-S21-038, BEH-S21-019, INV-S21-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-kiosco-tv.mjs con un árbol por cada uno de los seis términos, con un keystore de prueba y con un árbol limpio; después ejecutarla sobre el árbol final
- esperado: falla con los seis términos y con el keystore nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S21-014
- enlaza: REQ-S21-039, BEH-S21-020
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue zipnegocios en un archivo de apps/kiosk-tv y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-kiosco-tv.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S21-015
- enlaza: REQ-S21-001, REQ-S21-006, REQ-S21-015, REQ-S21-016, REQ-S21-020
- metodo: manual
- procedimiento: instalar el APK firmado en el smart-TV del gimnasio con el teclado numérico USB, escribir un código correcto, uno incorrecto 5 veces y un documento de un miembro vencido, y mirar la pantalla a 3 metros
- esperado: solo escribe el numpad, la pantalla muestra puntos, el quinto fallo muestra el aviso de demasiados intentos, los mensajes se leen a 3 metros y el vencido muestra su primer nombre
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero; un commit por paso con typecheck y pruebas en verde): (1) pruebas de caracterización de `mensajeDeTecla`, del hook de entrada y de `api/checkin`; (2) `tools/verificar-kiosco-tv.mjs` y sus pruebas, con los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) tabla `IntentoCheckin`, conteo con candado y respuesta 429 en `api/checkin`; (4) hook de entrada sin la vía de Windows y con enmascarado, y aviso de demasiados intentos; (5) pantallas del kiosco a tokens de S-19, superficie `tv` y retiro de los fondos anteriores (coordinado con S-19); (6) mensajes neutros y estados `activo` y `vencido`; (7) `preparar.mjs`, `url.mjs`, íconos y página sin conexión; (8) `build.gradle` con firma por variables de entorno y retiro del `debug.keystore`; (9) `apk-kiosco.yml` con secretos, cifrado y disparo manual; (10) paso del CI.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la prueba, una base efímera y una barrera; no hay dependencias nuevas, y para leer el workflow se usa el lector de YAML de las pruebas de S-17.
- AC-S21-014 y AC-S21-015 son pasos manuales del propietario (requieren el CI y el televisor real).

### 5.2 Migración
- No hay datos que migrar. Los kioscos instalados con el APK anterior se reemplazan por el APK nuevo (otro identificador y otra firma): se desinstala el anterior.
- **Enmiendas que se registran al aprobar S-21:**
  - S-01: `CORS_ORIGENES` de producción solo con el origen del kiosco (REQ-S21-035); el test de contrato clasifica `api/checkin` con clave de kiosco como hasta ahora.
  - S-05: el contrato del kiosco sin `sucursalAsignada*` queda revisado por S-21 (REQ-S05-032 y REQ-S05-033).
  - S-06: el campo de entrada, el enmascarado y el límite de intentos quedan cumplidos; el invariante de ADR-004 («el kiosco no muestra el documento») se cumple.
  - S-09: el mensaje del kiosco para un miembro eliminado queda cumplido (REQ-S21-016).
  - S-15: el baseline incluye `IntentoCheckin`.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 suman una tabla; REQ-S22-007 y AC-S22-003 suman un repositorio y su suite de contrato.
  - S-19: las exenciones de `apps/kiosk` y `apps/kiosk-tv` se vacían; el parámetro `?superficie=tv` queda en uso.
  - S-02 y S-03: las exenciones de la familia S-21 se vacían.
  - `docs/06-modelo-datos-cambios.md`, `COBERTURA-RF.md` (RF-31, RNF-03) y `BACKLOG-SPECS.md`: nota de que S-21 cubre el check-in en TV.
- **Traspasos:** el propietario (smart-TV, teclado numérico USB, secretos del repositorio y keystore) y una spec futura si se agregara otro tipo de entrada.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- El teclado numérico USB puede enviar códigos distintos en otros televisores; solo se probó la lógica. Mitigación: AC-S21-015 con el equipo real antes de instalar.
- El bloqueo de 5 minutos tras 5 fallos puede frustrar a un socio que se equivoca varias veces. Mitigación: el mensaje remite a recepción y el umbral está en constantes ajustables.
- Un enumerador puede seguir adivinando códigos de 4 dígitos a un ritmo lento (unos 1 440 por día). Mitigación: el límite lo hace caro, quedan registrados y se recomienda el documento si hay sospecha; un código más largo sería otra spec.
- Perder el keystore secreto impide actualizar el APK instalado (hay que desinstalar). Mitigación: el propietario guarda el keystore en dos lugares fuera del repositorio.
- La clave del kiosco viaja dentro del APK. Mitigación: el artefacto se cifra, el fragmento de la URL no se envía al servidor, la clave se rota desde el panel (S-23) y no hay registro de la URL.
- El WebView del televisor puede ser antiguo y no soportar algún estilo. Mitigación: AC-S21-015 y el aviso de `versionWebView` que ya existe.
- El mensaje neutro para eliminados impide que recepción sepa por el kiosco quién está eliminado. Mitigación: lo ven en el panel (S-09).
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Los dígitos del socio se muestran siempre como puntos, sin revelar la última tecla? Default: sí (SUP-S21-002).
- ¿5 fallos en 5 minutos bloquean 5 minutos el kiosco completo? Default: sí (SUP-S21-003).
- ¿Un miembro eliminado ve el mismo mensaje que uno no encontrado? Default: sí (SUP-S21-004).
- ¿El APK se llama «Adhara Fit Acceso» con identificador `pe.adharafit.kiosco`? Default: sí (SUP-S21-006).
- ¿La firma del APK sale de un keystore que guardas como secreto del repositorio (nunca versionado)? Default: sí (SUP-S21-007).
- ¿Puedo probar el teclado numérico y el APK en tu smart-TV real antes de usarlo? Default: sí; necesito marca y modelo.
