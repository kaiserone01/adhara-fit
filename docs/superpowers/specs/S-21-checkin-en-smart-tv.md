---
id: S-21
estado: en-revision
adrs: ADR-002, ADR-004, ADR-010, ADR-012, ADR-013, ADR-016, ADR-020, ADR-021, ADR-022
depende_de: S-00, S-01, S-04, S-05, S-06, S-09, S-10, S-15, S-17, S-19, S-22, S-23
aprobada_por:
fecha_aprobacion:
---
# S-21 — Check-in en smart-TV: entrada con teclado numérico USB, enmascarado, límite de intentos y APK

## 0. Contexto y alcance

### 0.1 Problema
ADR-021 (alcance ampliado: vitrina de TV y check-in en smart-TV) incluyó en el alcance el check-in en un smart-TV con teclado numérico USB. El kiosco web (`apps/kiosk`) y su envoltorio Android (`apps/kiosk-tv`, Capacitor) ya existen en el Repo A (el sistema del cliente anterior, base del código), pero traen cuatro problemas que otras specs dejaron a S-21: (1) el teclado numérico llega por tres vías (un host de Windows que ya no es del proyecto, el APK de Android y un `<input>`) y la pantalla muestra los dígitos que teclea el socio, lo que contradice el invariante «el kiosco no muestra el documento» de ADR-004 (documento de identidad; traspaso de S-06, la spec del documento de identidad); (2) un código de 4 dígitos se puede enumerar porque el check-in no limita los intentos fallidos (traspaso de S-06); (3) el APK trae la marca anterior (`com.adrenalina.kiosco`, «Kiosco AX», una URL por defecto de otro negocio, íconos y un `debug.keystore` versionado en el Repo A) y su CI cifra el APK y emite solo advertencias si falta la clave; (4) el contrato del kiosco cambia por S-05 (negocio y sede únicos: sin `sucursalAsignada`), S-06 (`{ identificador }`), S-09 (eliminar miembro) y S-19 (sistema de diseño: superficie `tv` y tokens). S-21 deja el check-in en TV funcionando con esas decisiones.

**Códigos que cita esta spec.** ADR-002 (una sola sede), ADR-004 (documento de identidad; el kiosco no lo muestra), ADR-010 (pago único de membresía y estados de acceso `activo` y `vencido`), ADR-012 (baseline de seguridad: clave del kiosco, CORS, secretos, sin keystores), ADR-013 (baja lógica «Eliminar»), ADR-016 (estrategia de pruebas), ADR-020 (sistema de diseño y rebranding), ADR-021 (alcance de vitrina y check-in en smart-TV), ADR-022 (Drizzle reemplaza a Prisma). Specs: S-00 (fundaciones e importación del Repo A), S-01 (baseline de seguridad), S-04 (pago único y estado de acceso), S-05 (negocio y sede únicos), S-06 (documento de identidad), S-09 (eliminar miembro), S-10 (retirar lo venezolano), S-13 (consentimiento y aviso legal), S-14 (reportes), S-15 (línea base y datos iniciales), S-17 (operación y despliegue), S-19 (sistema de diseño y marca), S-20 (vitrina de TV, en revisión), S-22 (capa de datos con Drizzle), S-23 (un solo rol administrador). RF-50 (kiosco: el miembro digita su documento y ve su estado), RF-53 (idempotencia del check-in) y RNF-04 (seguridad: claves rotables y CORS restringido) son del levantamiento de requerimientos (`docs/01-levantamiento-requerimientos.md:110,113,142`).

### 0.2 Dentro de alcance
- Entrada del identificador solo por el teclado numérico USB (Android) o por el `<input>` (navegador), sin la vía del host de Windows.
- Enmascarado de lo que teclea el socio y límite de intentos fallidos en `api/checkin`, con su aviso en el kiosco y la cola de pendientes que no descarta un bloqueo.
- Mensaje neutro para el socio no encontrado o eliminado, y pantalla mínima para el vencido.
- Vaciar las exenciones de `apps/kiosk` y `apps/kiosk-tv` en las herramientas de S-19 (diseño) y S-10 (retirar lo venezolano); la superficie `tv` y el fondo los entrega S-19.
- APK `kiosk-tv`: identificador, nombre, paquete, URL sin valor por defecto, íconos del kit, firma con un keystore secreto y su CI escrito de nuevo sin versionar claves.
- Contrato del kiosco con S-05, S-06 y S-09, y el origen CORS del kiosco (variable `KIOSCO_ORIGENES_PERMITIDOS` de S-01).
- `tools/verificar-kiosco-tv.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- La vitrina y su APK: S-20 (en revisión). S-20 usa su propia variable de CORS para el origen de su APK; S-21 no la toca.
- El host de Windows `kiosk-host`: fuera del proyecto (ADR-021 §2).
- Reconocimiento facial, lector de códigos de barras o de huellas.
- Tokens, tipografías, fondo con marca de agua, superficie `tv` (`?superficie=tv`) y componentes del sistema de diseño: S-19 (S-21 solo los consume; REQ-S19-067 fija la superficie y REQ-S19-051 y REQ-S19-052 el fondo).
- Despliegue del servidor, TLS y restricción por IP: S-17.
- La cola sin conexión y su formato: ya los cambió S-06 (REQ-S06-028, la cola guarda el identificador sin interpretarlo); S-21 solo cambia qué respuestas descarta.
- Teclear un documento con letras (carné de extranjería o pasaporte alfanuméricos) con el teclado numérico: esos socios usan su código de 4 dígitos (S-06, SUP-S06-002).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el árbol de este repositorio importado por S-00 (commit de importación `ab306a7`, sin cambios de S-01 a S-20 en esos directorios; verificado con `git log --oneline -- apps/kiosk-tv`). Los workflows de `.github/` no se importan (S-00:30), así que `apk-kiosco.yml` se leyó en un clon local del Repo A en otro commit (no `b4352a0`): sus líneas `:86` y `:93` coinciden con DI-81 de `docs/11` y `:7-15`, `:36` y `:69` con las que cita el revisor independiente; no re-verificado sobre `b4352a0`.
- **Vías del teclado:** `apps/kiosk/lib/teclasNumpad.ts:11-24` define `mensajeDeTecla`, que solo acepta `Numpad0` a `Numpad9` (`:12`), `NumpadEnter` (`:15`), `Backspace` (`:17`) y `Escape` (`:19`) y descarta la fila numérica; `apps/kiosk/lib/useEntradaCedula.ts` obtiene la entrada del host de Windows (`window.chrome.webview`, `:4-13` y `:81-92`), del APK de Android (`keydown` global sin `<input>`, `:94-108`, con la tecla repetida ignorada en `:102`) o de un `<input>` en un navegador normal (`:123-137`); ignora todo mientras se envía (`enviandoRef`, `:41` y `:54`), el valor de limpieza por inactividad es `TIEMPO_INACTIVIDAD_MS` = 7 000 ms (`:15`, usado en `:110-115`) y la limpieza solo vacía la entrada.
- **Sin tope ni enmascarado:** la entrada no limita la longitud (no hay `maxLength` en `apps/kiosk`, verificado con `grep -rn maxLength apps/kiosk/app apps/kiosk/components apps/kiosk/lib`, 0 coincidencias); el `onChange` del `<input>` acepta cualquier dígito de ambas filas (`useEntradaCedula.ts:126-129`); la pantalla muestra los dígitos en claro, en un `<div>` (`apps/kiosk/app/page.tsx:201-203`) o en el `<input>` (`:205`); `Enter` con la entrada vacía llega a `alEnviar("")` (`useEntradaCedula.ts:71-75`) y `page.tsx:125` lo descarta.
- **Envío y errores:** `apps/kiosk/lib/api.ts:56` envía `{ cedula }`; toda respuesta no exitosa lanza `ErrorCheckIn` con el mensaje del servidor y el estado (`:26-33`, `:64-66`) sin leer ninguna cabecera; `apps/kiosk/app/page.tsx:149-150` muestra `error.message` y `:151-153` encola solo si el error no es `ErrorCheckIn`; `apps/kiosk/lib/reintentarPendientes.ts:27-31` quita de la cola todo pendiente que reciba un `ErrorCheckIn`, incluido un 429 futuro.
- **Respuesta del servidor:** `apps/web-admin/app/api/checkin/route.ts:27-29` responde 400 si falta la cédula, `:50-51` incluye `sucursalAsignadaNombre` y `sucursalAsignadaDireccion`, `:59-61` responde 404 con el mensaje de `MiembroNoEncontradoError` («No se encontró ningún miembro con esa cédula.», `packages/domain/use-cases/RegistrarCheckIn.ts:59-63`); `apps/web-admin/lib/kiosco.ts:15-19` fija hoy `Access-Control-Allow-Origin: *` y no expone `Retry-After`; no hay conteo de intentos (verificado con `grep -rn "intentos" apps/web-admin/app/api/checkin apps/kiosk/lib`, 0 coincidencias).
- **Pantalla del miembro:** `apps/kiosk/components/AccessCard.tsx:58` muestra nombre y primer apellido (`nombreCorto`), foto, vencimiento y entrenador (`:96-101`, `:141-166`), con la cara `sucursal_incorrecta` en `:114-129`; usa `Bebas Neue` en `:65`, `:90`, `:106` y `:110` y `Barlow` en `:75` y `:80`; `FichaAviso.tsx:24`, `FichaReposo.tsx:55` y `app/page.tsx:195` usan `Bebas Neue`; `MarcoFicha.tsx:37` y `app/layout.tsx:24` cargan `Barlow Condensed`; `app/page.tsx:174` y `:179` y `MarcoFicha.tsx:34` referencian el fondo y el logotipo del cliente anterior (S-19 los retira).
- **Comentarios con términos viejos:** `apps/kiosk/lib/teclasNumpad.ts:1` y `apps/kiosk/app/page.tsx:200` nombran `apps/kiosk-host` (verificado con `grep -rn "kiosk-host" apps/kiosk apps/kiosk-tv`, 2 coincidencias); `chrome.webview` aparece escrito como `chrome?.webview` en `useEntradaCedula.ts:12`, de modo que una búsqueda literal de `chrome.webview` no lo encuentra.
- **APK, scripts:** `apps/kiosk-tv/capacitor/scripts/preparar.mjs` usa por defecto `https://kiosco.zipnegocios.com` (`:5` y `:12`), el `appId` `com.adrenalina.kiosco` (`:27`) y el nombre «Kiosco AX» (`:28`), escribe la clave en `capacitor.config.json` (`:30`, `server.url`) y en `www/index.html` y `www/offline.html` (`:18`, `:23-24`), fija `loggingBehavior: "none"`, `allowMixedContent: false` y `webContentsDebuggingEnabled: false` (`:32-33`) y oculta la clave en la salida (`:37`); `url.mjs:6` arma `${base}/#clave=...` sin parámetro de superficie; la página sin conexión usa colores literales (`preparar.mjs:16`); `scripts/` trae `generar-iconos.ps1` e `icono-kiosco.jpg` (verificado con `ls apps/kiosk-tv/capacitor/scripts`); `capacitor/.gitignore` ignora `www/` y `capacitor.config.json` (verificado con `cat apps/kiosk-tv/capacitor/.gitignore`).
- **APK, Android:** `apps/kiosk-tv/capacitor/android/app/build.gradle:4` y `:7` fijan `com.adrenalina.kiosco`, `:19-26` definen la firma `debug` con `storeFile file("debug.keystore")` y `:31-34` el tipo `release` sin `signingConfig`; el archivo `debug.keystore` no está en este repositorio porque S-00 lo excluyó (verificado con `git ls-files | grep -iE "keystore|\.jks"`, 0 resultados); `MainActivity.java:1` declara `package com.adrenalina.kiosco;`; `res/values/strings.xml:3-6` trae `app_name` y `title_activity_main` «Kiosco AX» y `package_name` y `custom_url_scheme` `com.adrenalina.kiosco`; el `splash.png` de `res/drawable` es el de Capacitor por defecto (una X azul sobre blanco, visto con `Read`) y el manifiesto usa `@drawable/banner` (`AndroidManifest.xml:9`) (verificado con `grep -rn "adrenalina\|Kiosco AX" apps/kiosk-tv` y `grep -n banner`).
- **APK, CI y README:** `.github/workflows/apk-kiosco.yml` (clon local) pide las entradas `sucursal` y `kiosco_url` (`:7-15`), toma la clave del secreto por sucursal `KIOSCO_CLAVE_<SUCURSAL>` (`:36`, `:64`, `:74`), compila con `assembleDebug` (`:69`), cifra con 7-Zip AES-256 (`:86`) y solo emite `::warning::` si falta la clave (`:93`); el CI actual del repositorio es `.github/workflows/ci.yml`; `apps/kiosk-tv/README.md:1`, `:5`, `:45` y `:74` traen «Kiosco AX», `com.adrenalina.kiosco`, `zipnegocios` y `debug.keystore` (verificado con `grep -n` sobre esos archivos).
- **Interacción con specs aprobadas:** S-01 guarda la clave del kiosco como hash con prefijo (`apiKeyHash` y `apiKeyPrefijo`, S-01:706), limita el CORS con `KIOSCO_ORIGENES_PERMITIDOS` (variable vacía = falla cerrada, SUP-S01-008 en S-01:73; REQ-S01-021 y REQ-S01-022), limita el login con la tabla `IntentoLogin` y un candado asesor por clave con fallo provisional (S-01:696-697) y conserva en la cola el check-in que recibe un 401 (REQ-S01-028); S-05 quita `sucursalAsignada*` del check-in (REQ-S05-033) y `sucursalNombre` del estado a favor de `negocioNombre` (REQ-S05-032); S-06 fija el cuerpo `{ identificador }` de hasta 20 caracteres (SUP-S06-005), que el check-in no devuelve el documento ni el código (REQ-S06-022), que el kiosco guarda en la cola el texto tecleado sin interpretarlo (REQ-S06-028) y renombra el hook a `useEntradaIdentificador`; S-09 traspasa el mensaje del miembro eliminado (S-09:30); S-04 deja los estados `activo` y `vencido` (REQ-S04-023); S-10 prohíbe `adrenalina` y `zipnegocios` en `apps` salvo exenciones de las apps de TV que S-21 vacía (REQ-S10-028 y REQ-S10-030); S-19 fija `?superficie=tv`, los tokens y su `tokens.json` y las exenciones de diseño con spec S-21 (REQ-S19-067, REQ-S19-063 y S-19:326); S-17 deja el despliegue y pide que la IP del gimnasio, compartida por el kiosco y los televisores, figure en `IPS_PERMITIDAS` (SUP-S17-003 en S-17:50 y S-17:988); S-14 define `enmascararDocumento`, que muestra los últimos 3 caracteres (SUP-S14-016 en S-14:61), y S-13 y S-14 dicen que S-21 la usa (S-13:788) (verificado con `grep -n` en las specs).
- No verificado: el comportamiento del teclado numérico USB en el smart-TV real del gimnasio (marca y modelo), la versión del WebView del televisor, que el origen de un APK de Capacitor con URL remota sea el del propio kiosco, que `?superficie=tv` persista si el kiosco navega a `/config` (S-19 no lo define), el contenido de los demás `splash.png` y de los íconos actuales, la ruta exacta de `tokens.json` (la fija S-19) y el comportamiento de una pasada de la cola de pendientes ante un 429, que hoy no existe.

### 0.5 Supuestos
- SUP-S21-001: el socio escribe su identificador (código de 4 dígitos o DNI de 8 dígitos; el tope es el de S-06, 20 caracteres) con las teclas del teclado numérico USB; `Enter` envía, `Backspace` borra un carácter y `Escape` limpia. La fila numérica no escribe en el APK de Android. Un documento con letras (carné de extranjería o pasaporte, S-06 SUP-S06-001) no se puede teclear con el numpad: ese socio usa su código de 4 dígitos (SUP-S06-002). En un navegador de escritorio el `<input>` acepta los dígitos de ambas filas y recorta a 20, porque la restricción del numpad existe para el televisor. Default: ese reparto; asumido, por validar en el televisor real.
- SUP-S21-002: la pantalla de entrada muestra un punto por cada carácter tecleado y nunca los caracteres, en el APK y en el `<input>` del navegador (que pasa a tipo contraseña sin autocompletar); no hay revelado temporal de la última tecla. Default: enmascarado total; asumido, por validar.
- SUP-S21-003: el límite cuenta por clave de kiosco los envíos con identificador inválido, sin miembro, con miembro eliminado o con miembro vencido (un vencido cuenta como fallo porque la pantalla revela su primer nombre y se podría enumerar con ella); 5 fallos en los últimos 5 minutos (un fallo cuenta mientras hayan pasado menos de 300 segundos) bloquean el check-in hasta 300 segundos después del quinto fallo; el quinto envío fallido se atiende y el sexto recibe 429. `Retry-After` vale los segundos, redondeados hacia arriba y con mínimo 1, que faltan hasta ese instante. Los envíos bloqueados no cuentan como fallos. Default: 5 fallos, 5 minutos y 5 minutos; asumido, por validar.
- SUP-S21-004: un socio no encontrado, con documento inexistente o eliminado ve el mismo texto «No te encontramos. Consulta en recepción.»; un vencido ve solo su primer nombre, el estado vencido y la indicación de pasar por recepción, sin foto, entrenador, fecha de vencimiento, documento ni fecha de nacimiento (hoy ve nombre y primer apellido, foto, vencimiento y entrenador, `AccessCard.tsx:58`, `:96-101`, `:141-166`); un activo se muestra como hoy. Default: ese tratamiento; asumido, por validar con S-09.
- SUP-S21-005: los intentos se guardan en la tabla `IntentoCheckin` (prefijo de la clave, resultado `exito`, `fallo` o `bloqueado`, y fecha) con el mismo mecanismo de S-01: dentro de una transacción con candado asesor por clave se cuenta, se inserta el intento como fallo provisional o como bloqueado y, si el miembro activo existe, se cambia a éxito; el resultado reutiliza el enum de `IntentoLogin`, de modo que la base pasa a 27 tablas y 15 enums al terminar S-21 (tras S-22 y S-01); de los envíos bloqueados se registra solo el primero de cada 60 segundos; se purga lo de más de 24 horas en cada envío. Default: tabla propia con candado; asumido, por validar.
- SUP-S21-006: el APK de `kiosk-tv` tiene el identificador `pe.adharafit.kiosco`, el nombre «Adhara Fit Acceso» y ese mismo paquete Java; la URL del kiosco (`KIOSCO_URL`) y la clave (`KIOSCO_CLAVE`) no tienen valor por defecto y la preparación falla si falta alguna. Default: esos nombres; asumido, por validar.
- SUP-S21-007: el APK se compila en `release` y se firma con un keystore guardado como secreto del repositorio (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_CLAVE`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_CLAVE`); el workflow decodifica el keystore a un archivo temporal fuera del árbol, ningún keystore se versiona y `build.gradle` lee la firma de variables de entorno; la clave del kiosco (`KIOSCO_CLAVE`) y la clave del cifrado (`APK_CLAVE`) son secretos; la URL (`KIOSCO_URL`) es una variable del repositorio; el workflow no tiene entradas, se dispara a mano y falla antes de compilar si falta un secreto. Default: ese esquema; asumido, por validar.
- SUP-S21-008: el origen del APK es el del propio kiosco web (la app remota carga la URL del kiosco), de modo que `KIOSCO_ORIGENES_PERMITIDOS` solo incluye el origen público del kiosco, igual a `KIOSCO_URL`; la herramienta de S-21 lo comprueba sobre el archivo de entorno de producción que el propietario le pase. Default: un solo origen; asumido, por validar.
- SUP-S21-009: la pantalla de entrada se muestra en la superficie `tv` cuando el kiosco se abre con `?superficie=tv` (la URL que prepara el APK, REQ-S19-067) y en `kiosco` en un navegador normal; los tamaños de S-19 (`tv`: base 36 px, grande 48, extragrande 64 y título 96, SUP-S19-004) se aplican con tokens. Default: ese mecanismo; asumido, por validar.
- SUP-S21-010: tras 7 000 ms desde la última tecla, la entrada se limpia (el valor actual); cada tecla reinicia la cuenta. Default: conservar 7 000 ms; asumido, por validar.
- SUP-S21-011: si el 429 llega sin un `Retry-After` legible (cabecera ausente o no numérica), el kiosco bloquea los envíos 300 segundos. Default: 300 segundos; asumido, por validar.
- SUP-S21-012: S-21 no usa `enmascararDocumento` de S-14 porque deja ver los últimos 3 caracteres y ADR-004 pide que el kiosco no muestre el documento; la entrada solo muestra puntos. Default: puntos sin ningún carácter; asumido, por validar.
- SUP-S21-013: los íconos de lanzador, el banner de Android TV y el `splash.png` del APK se generan a partir de los íconos del kit de S-19 (SUP-S19-009) con el Image Asset de Android Studio y se versionan como PNG; no se agrega ninguna dependencia de imágenes y `generar-iconos.ps1` y `icono-kiosco.jpg` se retiran. Default: generación manual; asumido, por validar.

## 1. Requisitos

### REQ-S21-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La entrada del identificador por teclado en Android deberá aceptar solo las teclas Numpad0 a Numpad9, NumpadEnter, Backspace y Escape.

### REQ-S21-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La entrada del identificador por teclado en Android no deberá escribir con las teclas de la fila numérica del teclado.

### REQ-S21-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La entrada del identificador no deberá usar window.chrome.webview.

### REQ-S21-004
- tipo: mientras
- prioridad: MUST
- origen: RF-53
- texto: Mientras se envía un identificador, la entrada deberá ignorar toda tecla.

### REQ-S21-005
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S06-005
- texto: La entrada del identificador deberá limitar lo tecleado a 20 caracteres.

### REQ-S21-051
- tipo: cuando
- prioridad: MUST
- origen: RF-50
- texto: Cuando se pulsa Enter con la entrada vacía, la entrada no deberá enviar ningún identificador.

### REQ-S21-052
- tipo: cuando
- prioridad: MUST
- origen: RF-53
- texto: Cuando llega una tecla repetida por mantener pulsada una tecla, la entrada deberá ignorarla.

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
- texto: El kiosco deberá guardar el identificador tecleado solo en su cola de check-ins pendientes y solo mientras no haya conexión.

### REQ-S21-058
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El kiosco no deberá imprimir el identificador tecleado en la consola ni en ningún registro.

### REQ-S21-008
- tipo: cuando
- prioridad: MUST
- origen: ADR-004
- texto: Cuando pasan 7 000 ms desde la última tecla con la entrada no vacía, la entrada deberá limpiarse.

### REQ-S21-009
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-04
- texto: La base de datos deberá tener la tabla IntentoCheckin con el prefijo de la clave del kiosco, el resultado (éxito, fallo o bloqueado) y la fecha del intento.

### REQ-S21-057
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-04
- texto: api/checkin deberá registrar cada intento como fallo provisional antes de buscar al miembro.

### REQ-S21-059
- tipo: cuando
- prioridad: MUST
- origen: RNF-04
- texto: Cuando un envío encuentra a un miembro con estado activo, api/checkin deberá cambiar su intento a éxito.

### REQ-S21-010
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-04
- texto: Si un envío trae un identificador inválido, no encuentra a ningún miembro o encuentra a uno vencido entonces api/checkin deberá dejar su intento como fallo de esa clave de kiosco.

### REQ-S21-011
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-04
- texto: Si la clave del kiosco acumula 5 intentos fallidos en los últimos 5 minutos entonces api/checkin deberá responder 429 sin buscar al miembro.

### REQ-S21-048
- tipo: cuando
- prioridad: MUST
- origen: RNF-04
- texto: Cuando api/checkin responde 429, deberá incluir la cabecera Retry-After con los segundos, redondeados hacia arriba y con mínimo 1, que faltan para cumplirse 300 segundos desde el quinto fallo.

### REQ-S21-012
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-04
- texto: El bloqueo por intentos fallidos deberá terminar cuando se cumplen 300 segundos desde el quinto fallo.

### REQ-S21-041
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-04
- texto: Un envío correcto no deberá reiniciar el contador de intentos fallidos.

### REQ-S21-054
- tipo: cuando
- prioridad: MUST
- origen: RNF-04
- texto: Cuando una clave bloqueada recibe varios envíos en 60 segundos, api/checkin deberá registrar solo el primero como bloqueado.

### REQ-S21-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El registro y el conteo de intentos deberán hacerse dentro de una transacción con un candado asesor por clave de kiosco.

### REQ-S21-014
- tipo: cuando
- prioridad: MUST
- origen: RNF-04
- texto: Cuando api/checkin recibe un envío, deberá borrar los intentos de más de 24 horas.

### REQ-S21-049
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando api/checkin responde 429 a un Origin permitido, deberá incluir Access-Control-Expose-Headers con el valor Retry-After.

### REQ-S21-015
- tipo: cuando
- prioridad: MUST
- origen: RNF-04
- texto: Cuando el kiosco recibe un 429, deberá mostrar el aviso «Demasiados intentos. Espera unos minutos o consulta en recepción.» durante los segundos de Retry-After.

### REQ-S21-063
- tipo: mientras
- prioridad: MUST
- origen: RNF-04
- texto: Mientras se muestra el aviso de demasiados intentos, el kiosco no deberá enviar ni reenviar ningún check-in.

### REQ-S21-064
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-04
- texto: Si el 429 llega sin una cabecera Retry-After legible entonces el kiosco deberá usar 300 segundos.

### REQ-S21-050
- tipo: cuando
- prioridad: MUST
- origen: RF-52
- texto: Cuando el servidor responde 429 al reenviar un check-in pendiente, el kiosco deberá conservar ese check-in en su cola.

### REQ-S21-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-004
- texto: Cuando api/checkin responde 404, el kiosco deberá mostrar «No te encontramos. Consulta en recepción.» y no el mensaje del servidor.

### REQ-S21-060
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: api/checkin deberá responder con el mismo código y el mismo cuerpo a un identificador inexistente y a un miembro eliminado.

### REQ-S21-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La pantalla de un miembro vencido deberá mostrar su primer nombre.

### REQ-S21-046
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: La pantalla de un miembro vencido deberá mostrar el estado vencido.

### REQ-S21-047
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: La pantalla de un miembro vencido no deberá mostrar foto, entrenador, fecha de vencimiento, documento ni fecha de nacimiento.

### REQ-S21-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El kiosco deberá usar solo los estados de acceso activo y vencido, sin sucursal_incorrecta ni abono_vencido.

### REQ-S21-061
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: El kiosco no deberá leer sucursalNombre, sucursalAsignadaNombre ni sucursalAsignadaDireccion.

### REQ-S21-062
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: El kiosco deberá mostrar el negocioNombre de kiosco/estado donde hoy muestra sucursalNombre.

### REQ-S21-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Al terminar S-21, tools/verificar-diseno.exenciones.json no deberá contener ninguna entrada cuya spec sea S-21.

### REQ-S21-045
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Al terminar S-21, tools/verificar-venezuela.exenciones.json no deberá contener ninguna entrada cuya spec sea S-21.

### REQ-S21-071
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Al terminar S-21, tools/verificar-kiosco-tv.exenciones.json no deberá contener ninguna entrada.

### REQ-S21-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El kiosco no deberá importar paquetes de dominio ni de base de datos.

### REQ-S21-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El applicationId del APK de kiosk-tv deberá ser pe.adharafit.kiosco.

### REQ-S21-065
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El namespace de build.gradle y el paquete Java de MainActivity deberán ser pe.adharafit.kiosco.

### REQ-S21-066
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El nombre visible del APK deberá ser «Adhara Fit Acceso» en capacitor.config.json y en strings.xml.

### REQ-S21-067
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: Los valores package_name y custom_url_scheme de strings.xml deberán ser pe.adharafit.kiosco.

### REQ-S21-024
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si falta KIOSCO_URL o KIOSCO_CLAVE entonces la preparación del APK deberá terminar con error sin generar archivos.

### REQ-S21-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La preparación del APK no deberá imprimir la clave del kiosco.

### REQ-S21-068
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La preparación del APK deberá escribir la clave del kiosco solo en capacitor.config.json, www/index.html y www/offline.html, que git ignora.

### REQ-S21-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
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
- texto: La página local de sin conexión del APK deberá obtener sus colores del archivo tokens.json de S-19.

### REQ-S21-069
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: La página local de sin conexión del APK deberá mostrar el nombre «Adhara Fit».

### REQ-S21-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El APK deberá usar un ícono de lanzador y un banner de Android TV hechos con los íconos del kit de Adhara Fit.

### REQ-S21-070
- tipo: ubicuo
- prioridad: SHOULD
- origen: ADR-020
- texto: El APK deberá usar como pantalla de arranque el isotipo del kit de Adhara Fit sobre el color ground.

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
- texto: build.gradle de kiosk-tv deberá firmar el tipo release con el keystore, el alias y las claves leídos de variables de entorno.

### REQ-S21-032
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si falta alguno de los secretos de firma, APK_CLAVE o KIOSCO_CLAVE entonces verificar-secretos.mjs de kiosk-tv deberá terminar con código distinto de cero nombrando el secreto ausente.

### REQ-S21-072
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: verificar-secretos.mjs de kiosk-tv no deberá imprimir el valor de ningún secreto.

### REQ-S21-053
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El workflow apk-kiosco.yml deberá ejecutar verificar-secretos.mjs antes de compilar.

### REQ-S21-056
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El workflow apk-kiosco.yml deberá compilar el APK con assembleRelease.

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
- texto: El workflow apk-kiosco.yml no deberá declarar entradas.

### REQ-S21-035
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si tools/verificar-kiosco-tv.mjs recibe --env con una KIOSCO_ORIGENES_PERMITIDOS que no incluye el origen de KIOSCO_URL entonces la herramienta deberá terminar con código distinto de cero.

### REQ-S21-055
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si tools/verificar-kiosco-tv.mjs recibe --env con una KIOSCO_ORIGENES_PERMITIDOS que contiene un origen de Capacitor o de localhost entonces la herramienta deberá terminar con código distinto de cero nombrando ese origen.

### REQ-S21-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los archivos de apps/kiosk y apps/kiosk-tv, salvo node_modules, .next, out, generated, build, www, salida y las pruebas, no deberán contener los términos com.adrenalina, zipnegocios, Kiosco AX, chrome.webview (también escrito chrome?.webview), kiosk-host ni debug.keystore.

### REQ-S21-037
- tipo: cuando
- prioridad: MUST
- origen: ADR-020
- texto: Cuando tools/verificar-kiosco-tv.mjs encuentra alguno de los términos de REQ-S21-036, deberá terminar con código distinto de cero.

### REQ-S21-038
- tipo: cuando
- prioridad: MUST
- origen: ADR-020
- texto: Cuando tools/verificar-kiosco-tv.mjs encuentra alguno de los términos de REQ-S21-036, deberá nombrar archivo, línea y término.

### REQ-S21-073
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando tools/verificar-kiosco-tv.mjs encuentra un archivo keystore o jks en el repositorio, deberá terminar con código distinto de cero nombrando el archivo.

### REQ-S21-039
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El CI deberá ejecutar tools/verificar-kiosco-tv.mjs en cada pull request.

## 2. Comportamiento

### BEH-S21-001
- cubre: REQ-S21-001, REQ-S21-002, REQ-S21-005
- categoria: borde
- dado: la entrada por teclado en Android y las teclas Numpad0 a Numpad9, NumpadEnter, Backspace, Escape, la fila numérica Digit1 y la tecla KeyA
- cuando: se pulsa cada una y luego 21 dígitos del numpad seguidos
- entonces: solo el numpad, Enter, Backspace y Escape producen mensajes; Digit1 y KeyA se ignoran; el dígito 21 no se agrega y la entrada queda en 20 caracteres

### BEH-S21-021
- cubre: REQ-S21-051, REQ-S21-052
- categoria: borde
- dado: la entrada vacía y, aparte, la entrada con «1234»
- cuando: se pulsa NumpadEnter con la entrada vacía, y luego se mantiene pulsada Numpad5 con 5 eventos repetidos y NumpadEnter con 3 eventos repetidos
- entonces: el Enter con la entrada vacía no envía nada; de la tecla mantenida entra un solo «5» y el Enter repetido no envía una segunda vez

### BEH-S21-002
- cubre: REQ-S21-003, REQ-S21-022
- categoria: feliz
- dado: el código de apps/kiosk y un window.chrome.webview simulado que emite mensajes de dígito
- cuando: se monta la entrada, se emiten mensajes por el objeto simulado y se buscan en apps/kiosk las importaciones de @gym-app/domain y @gym-app/db
- entonces: la entrada no registra ningún escuchador en el objeto simulado ni cambia con sus mensajes y no hay ninguna importación de dominio ni de base de datos

### BEH-S21-003
- cubre: REQ-S21-004
- categoria: concurrencia
- dado: un envío en curso y el socio que pulsa dígitos y Enter durante la respuesta
- cuando: llega la respuesta
- entonces: las teclas pulsadas durante el envío se ignoraron, no hay doble envío y la entrada queda limpia

### BEH-S21-004
- cubre: REQ-S21-006, REQ-S21-040, REQ-S21-007, REQ-S21-058
- categoria: feliz
- dado: el socio que teclea «12345678» con la consola, localStorage y sessionStorage observados
- cuando: se mira la pantalla, los almacenes del navegador y lo impreso, con conexión y sin conexión
- entonces: la pantalla muestra ocho puntos y ningún dígito, tanto en el APK como en el campo del navegador; con conexión el identificador no está en ningún almacén ni en lo impreso; sin conexión solo está en la cola de pendientes

### BEH-S21-005
- cubre: REQ-S21-008
- categoria: borde
- dado: un identificador parcial tecleado y, en otra prueba, una tecla más a los 6 000 ms
- cuando: pasan 6 999 y 7 001 ms desde la última tecla
- entonces: a los 6 999 ms conserva los puntos y a los 7 001 ms se limpia; la tecla de los 6 000 ms reinicia la cuenta desde ella

### BEH-S21-006
- cubre: REQ-S21-009, REQ-S21-057, REQ-S21-059, REQ-S21-010
- categoria: feliz
- dado: una base migrada, un miembro activo, uno vencido, uno eliminado y un identificador inexistente
- cuando: se envían el activo, el vencido, el eliminado, el inexistente y uno de 25 caracteres
- entonces: el activo deja un IntentoCheckin con resultado éxito; los otros cuatro dejan un IntentoCheckin con resultado fallo, cada uno con el prefijo de la clave y la fecha, y la tabla no contiene ningún identificador ni documento

### BEH-S21-007
- cubre: REQ-S21-011, REQ-S21-012, REQ-S21-041, REQ-S21-048, REQ-S21-054
- categoria: borde
- dado: un reloj simulado y 5 envíos fallidos en los segundos 0, 1, 2, 3 y 4
- cuando: se envía un sexto identificador en el segundo 10, uno correcto en el segundo 20, y uno en cada uno de los segundos 303, 304 y 305
- entonces: el quinto envío fallido se atiende y responde 404; el del segundo 10 responde 429 con Retry-After 294 sin buscar al miembro; el correcto del segundo 20 responde 429 con Retry-After 284; el del segundo 303 (299 s del quinto fallo) responde 429 con Retry-After 1; los de los segundos 304 (300 s) y 305 (301 s) se atienden; entre los segundos 10 y 20 se registra una sola fila de bloqueado y otra en el 303

### BEH-S21-008
- cubre: REQ-S21-013
- categoria: concurrencia
- dado: 10 envíos fallidos simultáneos de la misma clave, detenidos con una barrera
- cuando: se liberan a la vez
- entonces: se registran exactamente 5 filas con resultado fallo y 1 con resultado bloqueado, 5 respuestas son 404 y 5 son 429, y ningún intento se pierde ni se cuenta dos veces

### BEH-S21-009
- cubre: REQ-S21-014
- categoria: borde
- dado: intentos de hace 23 y de hace 25 horas
- cuando: llega un envío
- entonces: se borra el de 25 horas y se conserva el de 23

### BEH-S21-010
- cubre: REQ-S21-015, REQ-S21-063
- categoria: feliz
- dado: una respuesta 429 con Retry-After 300 y un reloj simulado
- cuando: el kiosco la recibe y el socio teclea y pulsa Enter durante los 300 segundos, y luego a los 301
- entonces: muestra «Demasiados intentos. Espera unos minutos o consulta en recepción.» durante 300 segundos y no envía ni reenvía nada mientras tanto; a los 301 segundos vuelve a aceptar envíos

### BEH-S21-022
- cubre: REQ-S21-064
- categoria: error
- dado: un 429 sin cabecera Retry-After y otro con Retry-After «abc»
- cuando: el kiosco los recibe
- entonces: en los dos casos muestra el aviso y bloquea los envíos 300 segundos

### BEH-S21-023
- cubre: REQ-S21-049
- categoria: feliz
- dado: KIOSCO_ORIGENES_PERMITIDOS con el origen del kiosco, un 429 de api/checkin y peticiones con ese origen, con otro y sin Origin
- cuando: se arman las cabeceras del 429
- entonces: solo la petición con el origen permitido recibe Access-Control-Expose-Headers con el valor Retry-After; las otras dos no reciben ninguna cabecera Access-Control-*

### BEH-S21-024
- cubre: REQ-S21-050
- categoria: error
- dado: un check-in pendiente en la cola y un servidor simulado que responde 429, luego 404 y luego 200
- cuando: el kiosco reintenta la cola tres veces
- entonces: tras el 429 el pendiente sigue en la cola y la pasada no reenvía los demás; tras el 404 se quita; el 200 de otro pendiente también lo quita

### BEH-S21-011
- cubre: REQ-S21-016, REQ-S21-060, REQ-S21-017, REQ-S21-046, REQ-S21-047, REQ-S21-018, REQ-S21-061, REQ-S21-062
- categoria: error
- dado: un identificador inexistente, un miembro eliminado, un miembro vencido «Rosa Pérez Quispe» con foto, entrenador y vencimiento, y uno activo
- cuando: se envía cada uno y se pide kiosco/estado
- entonces: el inexistente y el eliminado reciben el mismo código y el mismo cuerpo y el kiosco muestra «No te encontramos. Consulta en recepción.» sin el mensaje del servidor; el vencido muestra «Rosa» y el estado vencido, sin foto, entrenador, fecha de vencimiento, documento ni fecha de nacimiento; el activo muestra el ingreso; ninguna respuesta trae sucursal_incorrecta, abono_vencido, sucursalAsignadaNombre ni sucursalAsignadaDireccion, y la pantalla de reposo muestra negocioNombre

### BEH-S21-012
- cubre: REQ-S21-019, REQ-S21-045, REQ-S21-071
- categoria: feliz
- dado: el árbol final con apps/kiosk y apps/kiosk-tv ya limpios
- cuando: se ejecutan tools/verificar-diseno.mjs, tools/verificar-venezuela.mjs y tools/verificar-kiosco-tv.mjs
- entonces: las tres terminan con código 0 y sus archivos de exenciones no traen ninguna entrada de spec S-21 (el de tools/verificar-kiosco-tv.exenciones.json está vacío)

### BEH-S21-013
- cubre: REQ-S21-023, REQ-S21-026, REQ-S21-027, REQ-S21-066
- categoria: feliz
- dado: KIOSCO_URL «https://acceso.ejemplo.pe» y KIOSCO_CLAVE de prueba
- cuando: se ejecuta preparar.mjs
- entonces: capacitor.config.json trae appId pe.adharafit.kiosco, appName «Adhara Fit Acceso», la URL «https://acceso.ejemplo.pe/?superficie=tv#clave=…», loggingBehavior none, allowMixedContent falso y webContentsDebuggingEnabled falso

### BEH-S21-025
- cubre: REQ-S21-065, REQ-S21-067, REQ-S21-023, REQ-S21-066
- categoria: feliz
- dado: los archivos android/app/build.gradle, MainActivity.java y res/values/strings.xml de kiosk-tv
- cuando: se leen
- entonces: namespace y applicationId son pe.adharafit.kiosco, MainActivity.java está en la carpeta pe/adharafit/kiosco con ese paquete, strings.xml trae «Adhara Fit Acceso» en app_name y title_activity_main y pe.adharafit.kiosco en package_name y custom_url_scheme

### BEH-S21-014
- cubre: REQ-S21-024, REQ-S21-025, REQ-S21-068
- categoria: error
- dado: preparar.mjs sin KIOSCO_URL, sin KIOSCO_CLAVE, y con ambas
- cuando: se ejecuta en cada caso capturando la salida y los archivos
- entonces: los dos primeros terminan con error sin generar archivos; con ambas, la salida oculta la clave con «***» y la clave aparece solo en capacitor.config.json, www/index.html y www/offline.html, que figuran en el .gitignore de capacitor

### BEH-S21-015
- cubre: REQ-S21-028, REQ-S21-069, REQ-S21-029, REQ-S21-070, REQ-S21-043
- categoria: feliz
- dado: la página local de sin conexión generada, los PNG de íconos, banner y splash y la carpeta de scripts del APK
- cuando: se leen sus colores, su texto, las dimensiones de los PNG y los archivos de scripts
- entonces: los colores son los de ground e ink de tokens.json y no hay colores literales en preparar.mjs, muestra «Adhara Fit», los íconos de lanzador miden 48, 72, 96, 144 y 192 píxeles, el banner 320 por 180 y el splash no es el de Capacitor, y no existen generar-iconos.ps1 ni icono-kiosco.jpg

### BEH-S21-016
- cubre: REQ-S21-030, REQ-S21-031, REQ-S21-073
- categoria: error
- dado: el repositorio con un archivo de prueba de extensión keystore, otro jks y el build.gradle de kiosk-tv
- cuando: se ejecuta tools/verificar-kiosco-tv.mjs y se lee la firma del tipo release
- entonces: la herramienta termina con código distinto de cero nombrando cada archivo; sin ellos no hay ningún keystore ni jks y build.gradle firma el tipo release con valores leídos de variables de entorno

### BEH-S21-017
- cubre: REQ-S21-053, REQ-S21-056, REQ-S21-033, REQ-S21-034, REQ-S21-044
- categoria: error
- dado: el workflow apk-kiosco.yml analizado con un lector de YAML
- cuando: se revisan sus disparadores, sus entradas y el orden de sus pasos
- entonces: solo se dispara con workflow_dispatch y no declara entradas, ejecuta verificar-secretos.mjs antes de compilar, compila con assembleRelease y cifra el APK con APK_CLAVE antes del paso que lo sube

### BEH-S21-026
- cubre: REQ-S21-032, REQ-S21-072
- categoria: error
- dado: verificar-secretos.mjs con las seis variables completas y, por turno, con cada una ausente
- cuando: se ejecuta en cada caso capturando la salida
- entonces: con las seis termina con código 0; con una ausente termina con código distinto de cero nombrándola; en ningún caso la salida contiene el valor de una variable

### BEH-S21-018
- cubre: REQ-S21-035, REQ-S21-055
- categoria: borde
- dado: un archivo de entorno de producción con KIOSCO_URL «https://acceso.ejemplo.pe» y KIOSCO_ORIGENES_PERMITIDOS con ese origen, con otro origen, y con «https://acceso.ejemplo.pe,capacitor://localhost» y «https://acceso.ejemplo.pe,http://localhost:3000»
- cuando: se ejecuta tools/verificar-kiosco-tv.mjs con --env sobre cada archivo
- entonces: el primero pasa; el segundo falla por no incluir el origen de KIOSCO_URL; el tercero y el cuarto fallan nombrando capacitor://localhost y http://localhost:3000

### BEH-S21-019
- cubre: REQ-S21-036, REQ-S21-037, REQ-S21-038
- categoria: error
- dado: un archivo por cada uno de los seis términos de REQ-S21-036 (incluida la forma chrome?.webview) dentro de apps/kiosk o apps/kiosk-tv, y el mismo término dentro de apps/web-admin
- cuando: se ejecuta tools/verificar-kiosco-tv.mjs
- entonces: termina con código distinto de cero y nombra archivo, línea y término de cada uno de los seis; no nombra el de apps/web-admin

### BEH-S21-020
- cubre: REQ-S21-039
- categoria: error
- dado: el archivo .github/workflows/ci.yml leído con el lector de YAML
- cuando: se buscan sus disparadores y sus pasos
- entonces: se dispara en pull_request y un paso ejecuta node tools/verificar-kiosco-tv.mjs

## 3. Invariantes

### INV-S21-001
- propiedad: el kiosco nunca muestra caracteres del identificador tecleado
- mecanismo: test-propiedad
- deteccion: sobre 100 secuencias de teclas generadas con un generador congruencial lineal de semilla fija escrito en la prueba, el texto renderizado de la entrada nunca contiene un dígito y su cantidad de puntos es igual a la cantidad de caracteres aceptados, hasta 20
- protege: REQ-S21-001, REQ-S21-002, REQ-S21-005, REQ-S21-006, REQ-S21-040

### INV-S21-002
- propiedad: una clave de kiosco no puede registrar más de 5 intentos fallidos en una ventana de 5 minutos
- mecanismo: transaccion
- deteccion: sobre 50 secuencias de envíos fallidos y correctos con tiempos generados con semilla fija, incluidas ráfagas simultáneas con barrera, nunca hay más de 5 filas fallo de una clave con fechas dentro de una ventana de 300 segundos
- protege: REQ-S21-010, REQ-S21-011, REQ-S21-012, REQ-S21-013, REQ-S21-057

### INV-S21-003
- propiedad: un identificador inexistente y un miembro eliminado producen la misma respuesta visible
- mecanismo: test-propiedad
- deteccion: sobre 50 miembros eliminados e identificadores inexistentes generados con semilla fija, el código y el cuerpo de la respuesta y el texto de la pantalla son idénticos
- protege: REQ-S21-016, REQ-S21-060

### INV-S21-004
- propiedad: los términos heredados de otro negocio y del host de Windows no aparecen en el kiosco y su APK, y no hay claves de firma versionadas
- mecanismo: lint
- deteccion: tools/verificar-kiosco-tv.mjs termina con código distinto de cero y lista archivo:línea y término, y falla si encuentra un archivo keystore o jks
- protege: REQ-S21-003, REQ-S21-030, REQ-S21-036, REQ-S21-037, REQ-S21-038, REQ-S21-073

## 4. Criterios de aceptación

### AC-S21-001
- enlaza: REQ-S21-001, REQ-S21-002, REQ-S21-005, REQ-S21-006, REQ-S21-040, REQ-S21-051, REQ-S21-052, BEH-S21-001, BEH-S21-021, INV-S21-001
- metodo: unitario
- procedimiento: ejecutar mensajeDeTecla y la máquina de estados de la entrada con los códigos de BEH-S21-001 y BEH-S21-021, y renderizar con react-dom/server el campo de entrada tras 100 secuencias de teclas con semilla fija
- esperado: solo las teclas permitidas producen mensajes, el máximo es 20 caracteres, el Enter vacío y las teclas repetidas no producen envío ni caracteres extra y el texto renderizado solo trae puntos
- test: pendiente

### AC-S21-002
- enlaza: REQ-S21-003, REQ-S21-022, REQ-S21-007, REQ-S21-058, BEH-S21-002, BEH-S21-004
- metodo: unitario
- procedimiento: probar la entrada con un window.chrome.webview simulado, buscar con la API de typescript en apps/kiosk las importaciones de dominio y base de datos y las escrituras de localStorage, sessionStorage y consola, y repetir el envío de «12345678» con conexión y sin conexión con la consola y los almacenes espiados
- esperado: la entrada ignora el objeto simulado, no hay coincidencias de importación ni de escritura con el identificador, y el identificador solo se escribe en la cola de pendientes y solo sin conexión
- test: pendiente

### AC-S21-003
- enlaza: REQ-S21-004, REQ-S21-008, BEH-S21-003, BEH-S21-005
- metodo: unitario
- procedimiento: probar la máquina de estados de la entrada con temporizadores simulados y un envío pendiente: teclas durante el envío, silencios de 6 999 y 7 001 ms y una tecla a los 6 000 ms
- esperado: las teclas durante el envío se ignoran sin doble envío, la entrada se limpia solo a los 7 001 ms desde la última tecla y la tecla de los 6 000 ms reinicia la cuenta
- test: pendiente

### AC-S21-004
- enlaza: REQ-S21-009, REQ-S21-010, REQ-S21-014, REQ-S21-057, REQ-S21-059, BEH-S21-006, BEH-S21-009
- metodo: integracion
- procedimiento: con una base efímera, enviar a api/checkin un miembro activo, uno vencido, uno eliminado, un identificador inexistente y uno de 25 caracteres, leer la tabla IntentoCheckin, y sembrar intentos de 23 y 25 horas antes de un envío
- esperado: el activo queda con resultado éxito, los otros cuatro con resultado fallo, prefijo y fecha, sin ningún identificador en la tabla, y se borra solo el intento de 25 horas
- test: pendiente

### AC-S21-005
- enlaza: REQ-S21-011, REQ-S21-012, REQ-S21-041, REQ-S21-013, REQ-S21-048, REQ-S21-054, BEH-S21-007, BEH-S21-008, INV-S21-002
- metodo: integracion
- procedimiento: con un reloj simulado, enviar los 5 fallos y los envíos de los segundos 10, 20, 303, 304 y 305 de BEH-S21-007 y leer las filas de IntentoCheckin; lanzar con Promise.all 10 fallos simultáneos con una barrera y contar filas y respuestas; repetir 50 secuencias con semilla fija
- esperado: las respuestas, Retry-After 294, 284 y 1, el fin del bloqueo a los 300 segundos, las filas de bloqueado y el conteo exacto de 5 fallos, 1 bloqueado, 5 respuestas 404 y 5 respuestas 429 coinciden con los comportamientos, y la invariante se cumple en las 50 secuencias
- test: pendiente

### AC-S21-006
- enlaza: REQ-S21-015, REQ-S21-063, REQ-S21-064, REQ-S21-050, BEH-S21-010, BEH-S21-022, BEH-S21-024
- metodo: unitario
- procedimiento: probar el reductor de pantalla del kiosco y la cola de pendientes con una respuesta 429 de Retry-After 300, otra sin cabecera y otra con «abc», un reloj simulado y un servidor simulado que responde 429, 404 y 200, contando los envíos
- esperado: se muestra el aviso, no se envía ni se reenvía nada durante 300 segundos, vuelve a aceptar a los 301, el pendiente sigue en la cola tras el 429 y se quita tras el 404 y el 200
- test: pendiente

### AC-S21-007
- enlaza: REQ-S21-016, REQ-S21-060, REQ-S21-017, REQ-S21-046, REQ-S21-047, REQ-S21-018, REQ-S21-061, REQ-S21-062, BEH-S21-011, INV-S21-003
- metodo: integracion
- procedimiento: enviar los cuatro casos de BEH-S21-011 y pedir kiosco/estado, renderizar con react-dom/server la pantalla con cada respuesta, y repetir 50 miembros eliminados e identificadores inexistentes con semilla fija
- esperado: los textos coinciden con BEH-S21-011, el eliminado y el inexistente son idénticos en respuesta y pantalla, el vencido no muestra foto, entrenador ni vencimiento y no aparecen los estados ni los campos retirados
- test: pendiente

### AC-S21-008
- enlaza: REQ-S21-019, REQ-S21-045, REQ-S21-071, BEH-S21-012
- metodo: unitario
- procedimiento: ejecutar tools/verificar-diseno.mjs, tools/verificar-venezuela.mjs y tools/verificar-kiosco-tv.mjs sobre el árbol final y leer sus archivos de exenciones
- esperado: las tres terminan con código 0 y no queda ninguna entrada de spec S-21 ni en las exenciones de S-21
- test: pendiente

### AC-S21-009
- enlaza: REQ-S21-023, REQ-S21-065, REQ-S21-066, REQ-S21-067, REQ-S21-024, REQ-S21-025, REQ-S21-026, REQ-S21-027, REQ-S21-068, BEH-S21-013, BEH-S21-014, BEH-S21-025
- metodo: unitario
- procedimiento: ejecutar preparar.mjs con las tres combinaciones de variables de BEH-S21-013 y BEH-S21-014 capturando salida y archivos, comprobar que los tres archivos con la clave figuran en el .gitignore de capacitor, y leer build.gradle, MainActivity.java y strings.xml
- esperado: se generan o no los archivos y la configuración exactamente como indican esos comportamientos, la clave solo está en los tres archivos ignorados y nunca sale en claro, y los identificadores, el nombre y el paquete son los de BEH-S21-025
- test: pendiente

### AC-S21-010
- enlaza: REQ-S21-028, REQ-S21-069, REQ-S21-029, REQ-S21-070, REQ-S21-043, BEH-S21-015
- metodo: unitario
- procedimiento: leer www/offline.html generada, compararla con tokens.json, leer el encabezado de los PNG de íconos, banner y splash para medir sus dimensiones y listar los archivos de scripts del APK
- esperado: los colores y el nombre coinciden, las dimensiones son las de BEH-S21-015 y los dos archivos heredados no existen
- test: pendiente

### AC-S21-011
- enlaza: REQ-S21-030, REQ-S21-031, REQ-S21-073, REQ-S21-053, REQ-S21-056, REQ-S21-033, REQ-S21-034, REQ-S21-044, REQ-S21-032, REQ-S21-072, BEH-S21-016, BEH-S21-017, BEH-S21-026
- metodo: unitario
- procedimiento: buscar archivos keystore y jks, leer build.gradle, analizar apk-kiosco.yml con el lector de YAML de las pruebas (SUP-S17-012) y ejecutar verificar-secretos.mjs con las seis variables y con cada una ausente
- esperado: no hay keystores, la firma sale de variables de entorno, el workflow cumple lo descrito en BEH-S21-017 y el verificador falla nombrando la variable ausente sin imprimir valores
- test: pendiente

### AC-S21-012
- enlaza: REQ-S21-035, REQ-S21-055, BEH-S21-018
- metodo: unitario
- procedimiento: ejecutar tools/verificar-kiosco-tv.mjs con --env sobre los cuatro archivos de entorno de BEH-S21-018
- esperado: el primero pasa, el segundo falla por no incluir el origen de KIOSCO_URL y los otros dos fallan nombrando el origen
- test: pendiente

### AC-S21-013
- enlaza: REQ-S21-036, REQ-S21-037, REQ-S21-038, BEH-S21-019, INV-S21-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-kiosco-tv.mjs con un árbol por cada uno de los seis términos (con chrome?.webview incluido), con uno de los términos fuera de apps/kiosk y apps/kiosk-tv, con un keystore de prueba y con un árbol limpio; después ejecutarla sobre el árbol final
- esperado: falla con los seis términos y con el keystore nombrando archivo, línea y término, pasa con el limpio y con el término fuera de las dos apps, y no encuentra nada en el árbol final
- test: pendiente

### AC-S21-014
- enlaza: REQ-S21-039, BEH-S21-020
- metodo: unitario
- procedimiento: leer .github/workflows/ci.yml con el lector de YAML de las pruebas y buscar el paso que ejecuta node tools/verificar-kiosco-tv.mjs y los disparadores del workflow
- esperado: el workflow se dispara en pull_request y el paso existe sin condición que lo omita
- test: pendiente

### AC-S21-015
- enlaza: REQ-S21-001, REQ-S21-006, REQ-S21-015, REQ-S21-016, REQ-S21-070
- metodo: manual
- procedimiento: instalar el APK firmado en el smart-TV del gimnasio con el teclado numérico USB, escribir un código correcto, uno incorrecto 5 veces, un documento de un miembro vencido y un identificador con la fila numérica del teclado, y mirar la pantalla a 3 metros; medir la altura del texto de los mensajes con la regla del equipo y compararla con el token de la superficie tv (base 36 px, título 96 px, SUP-S19-004)
- esperado: solo escribe el numpad, la pantalla muestra puntos, el quinto fallo muestra el aviso de demasiados intentos, los mensajes se leen a 3 metros con el tamaño de los tokens de la superficie tv, el vencido muestra solo su primer nombre y el estado, y el arranque muestra el isotipo sobre el color ground
- test: pendiente

### AC-S21-016
- enlaza: REQ-S21-049, BEH-S21-023
- metodo: unitario
- procedimiento: probar la función de cabeceras CORS de S-01 con un 429, con KIOSCO_ORIGENES_PERMITIDOS en un origen y con Origin igual, distinto y ausente
- esperado: solo el caso de Origin igual devuelve Access-Control-Expose-Headers con Retry-After; los otros dos no devuelven ninguna cabecera Access-Control-*
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero; un commit por paso con typecheck y pruebas en verde): (1) pruebas de caracterización de `mensajeDeTecla`, del hook de entrada, de la cola de pendientes y de `api/checkin`; (2) `tools/verificar-kiosco-tv.mjs` y sus pruebas, con los archivos actuales en `tools/verificar-kiosco-tv.exenciones.json`, que se achica en cada paso y queda vacío (REQ-S21-071); (3) tabla `IntentoCheckin` (puerto y repositorio Drizzle con `reservar` y `resolver` como en S-01:696-697), conteo con candado, respuesta 429 con `Retry-After`, `Access-Control-Expose-Headers` y respuesta idéntica para el eliminado; (4) entrada del kiosco: máquina de estados pura sin la vía de Windows, con enmascarado, tope de 20, Enter vacío y tecla repetida; ErrorCheckIn con estado y `Retry-After`, aviso de demasiados intentos y cola que conserva el 429; (5) pantallas del kiosco a los tokens de S-19, con las exenciones de S-19 y S-10 vaciadas (coordinado con S-19); (6) mensajes neutros, pantalla mínima del vencido, estados `activo` y `vencido` y contrato de S-05 (`negocioNombre`); (7) `preparar.mjs`, `url.mjs`, página sin conexión desde `tokens.json`, `verificar-secretos.mjs` y README; (8) Android: paquete, `namespace`, `strings.xml`, `build.gradle` con firma por variables de entorno, íconos del kit y retiro de los scripts de íconos; (9) `apk-kiosco.yml` escrito de nuevo (S-00 no importa `.github`) con secretos, `assembleRelease`, cifrado y disparo manual; (10) paso del CI y opción `--env` de la herramienta.
- El hook de entrada se divide en una máquina de estados pura (reductor y temporizador inyectable) y un hook delgado, para probar sin DOM: `apps/kiosk` no tiene jsdom ni testing-library (verificado con `ls node_modules | grep -i "jsdom\|testing-library"`, 0 resultados) y S-21 no agrega ninguna dependencia. Las pantallas se prueban con `react-dom/server`.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la prueba, una base efímera (S-00) y una barrera; las de integración usan los repositorios de Drizzle de S-22. Para leer el workflow se usa el lector de YAML de las pruebas de S-17 (SUP-S17-012), dependencia de desarrollo ya justificada allí.
- Los PNG se miden leyendo su encabezado (IHDR) con `node:fs`, sin librería de imágenes.
- AC-S21-015 es un paso manual del propietario (requiere el CI y el televisor real).

### 5.2 Migración
- No hay datos que migrar. Los kioscos instalados con el APK anterior se reemplazan por el APK nuevo (otro identificador y otra firma): se desinstala el anterior.
- La clave del kiosco que usa el APK es la que imprime el seed (S-15) o la que rota el administrador desde el panel (S-23).
- **Enmiendas que se registran al aprobar S-21:**
  - S-01 (baseline de seguridad): `KIOSCO_ORIGENES_PERMITIDOS` de producción solo con el origen del kiosco (SUP-S21-008); la función de cabeceras CORS agrega `Access-Control-Expose-Headers: Retry-After` a las respuestas 429 (REQ-S21-049); el test de contrato clasifica `api/checkin` con clave de kiosco como hasta ahora.
  - S-05 (negocio y sede únicos): el contrato del kiosco sin `sucursalAsignada*` y con `negocioNombre` queda revisado por S-21 (REQ-S05-032 y REQ-S05-033).
  - S-06 (documento de identidad): el campo de entrada, el enmascarado y el límite de intentos quedan cumplidos; el invariante de ADR-004 («el kiosco no muestra el documento») se cumple.
  - S-09 (eliminar miembro): el mensaje del kiosco para un miembro eliminado queda cumplido (REQ-S21-016 y REQ-S21-060).
  - S-10 (retirar lo venezolano): la exención de las apps de TV cuya spec es S-21 se vacía (REQ-S21-045).
  - S-13 (consentimiento) y S-14 (reportes): `enmascararDocumento` no la usa S-21 (SUP-S21-012); las frases «también la usa S-21» (S-13:788) y SUP-S14-016 se leen sin esa mención.
  - S-15 (línea base y datos iniciales): el baseline incluye `IntentoCheckin`.
  - S-22 (capa de datos con Drizzle): REQ-S22-016, BEH-S22-008 y AC-S22-014 suman una tabla (27 tras S-01 y S-21); REQ-S22-007 y AC-S22-003 suman un repositorio y su suite de contrato.
  - S-19 (sistema de diseño): las exenciones de `apps/kiosk` y `apps/kiosk-tv` se vacían (REQ-S21-019); el parámetro `?superficie=tv` queda en uso (REQ-S19-067).
  - S-00 (fundaciones): `ci.yml` suma el paso de `tools/verificar-kiosco-tv.mjs` y `apk-kiosco.yml` se escribe nuevo porque S-00 no importa `.github` (S-00:30).
  - S-02 (hora de Lima): sin enmienda; S-02 no admite a S-21 como dueña de exenciones (REQ-S02-020, S-02:175); si algún archivo de `kiosk-tv` necesitara exención de `verificar-fechas` se resuelve al implementar (no verificado).
  - `docs/06-modelo-datos-cambios.md`, `COBERTURA-RF.md` (RF-50 a RF-53, RNF-03 y RNF-10, no RF-31) y `BACKLOG-SPECS.md`: nota de que S-21 cubre el check-in en TV.
- **Traspasos:** el propietario (smart-TV, teclado numérico USB, secretos del repositorio y keystore, y poner la IP pública del gimnasio en `IPS_PERMITIDAS` para el kiosco y los televisores, S-17:988; ejecutar `tools/verificar-kiosco-tv.mjs --env` sobre el entorno de producción antes de cada despliegue) y una spec futura si se agregara otro tipo de entrada.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- El teclado numérico USB puede enviar códigos distintos en otros televisores; solo se probó la lógica. Mitigación: AC-S21-015 con el equipo real antes de instalar.
- El bloqueo de 5 minutos tras 5 fallos puede frustrar a un socio que se equivoca varias veces. Mitigación: el mensaje remite a recepción y el umbral está en constantes ajustables.
- El límite es por clave de kiosco: el kiosco web y el televisor comparten la clave y se bloquean juntos, y un vencido que insiste cuenta como fallo y bloquea a los demás. Mitigación: el aviso remite a recepción; si molesta, una spec futura puede limitar por dispositivo.
- Bajo una ráfaga simultánea, 5 reservas provisionales pueden bloquear a un envío correcto que llega después (mismo mecanismo que S-01:697). Mitigación: el socio reintenta tras el aviso; la ráfaga no ocurre con un solo kiosco y un teclado.
- Los envíos de la cola de pendientes también cuentan como intentos: varios pendientes con identificadores inexistentes pueden bloquear el kiosco. Mitigación: la pasada se detiene al primer 429 y conserva los pendientes (REQ-S21-050).
- Un enumerador puede seguir adivinando códigos de 4 dígitos a un ritmo lento (unos 1 440 por día, porque 5 por cada 5 minutos son 1 440 por 24 horas). Mitigación: el límite lo hace caro, quedan registrados en `IntentoCheckin` y se recomienda el documento si hay sospecha; un código más largo sería otra spec.
- Perder el keystore secreto impide actualizar el APK instalado (hay que desinstalar). Mitigación: el propietario guarda el keystore en dos lugares fuera del repositorio.
- La clave del kiosco viaja dentro del APK. Mitigación: el artefacto se cifra con `APK_CLAVE`, el fragmento de la URL no se envía al servidor, la clave se rota desde el panel (S-23) y no hay registro de la URL.
- El WebView del televisor puede ser antiguo y no soportar algún estilo. Mitigación: AC-S21-015 y el aviso de `apps/kiosk/components/GuardaWebView.tsx` que ya existe.
- La superficie `tv` puede perderse si el kiosco navega a otra ruta sin el parámetro (no verificado; S-19 no lo define). Mitigación: AC-S21-015 y, si ocurre, pedir a S-19 que la recuerde.
- El mensaje neutro para eliminados impide que recepción sepa por el kiosco quién está eliminado. Mitigación: lo ven en el panel (S-09).
- Un socio con carné de extranjería o pasaporte alfanumérico no puede teclear su documento con el numpad. Mitigación: usa su código de 4 dígitos (S-06, SUP-S06-002).
- S-20 (en revisión) nombra la variable de CORS como `CORS_ORIGENES`; S-01 la llama `KIOSCO_ORIGENES_PERMITIDOS`. Mitigación: S-21 usa el nombre de S-01 y se avisa para que S-20 lo concilie.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Los dígitos del socio se muestran siempre como puntos, sin revelar la última tecla? Default: sí (SUP-S21-002).
- ¿5 fallos en 5 minutos bloquean 5 minutos el check-in de la clave del kiosco completa, y un miembro vencido cuenta como fallo? Default: sí a ambas (SUP-S21-003).
- ¿Un miembro eliminado ve el mismo mensaje que uno no encontrado, y el vencido ve solo su primer nombre y el estado, sin foto ni vencimiento? Default: sí (SUP-S21-004).
- ¿El APK se llama «Adhara Fit Acceso» con identificador `pe.adharafit.kiosco`? Default: sí (SUP-S21-006).
- ¿La firma del APK sale de un keystore que guardas como secreto del repositorio (nunca versionado) y el APK sale en `release`? Default: sí (SUP-S21-007).
- ¿Un socio con carné de extranjería o pasaporte con letras entra con su código de 4 dígitos porque el numpad no escribe letras? Default: sí (SUP-S21-001).
- ¿En un navegador de escritorio el `<input>` acepta ambas filas de dígitos y solo el APK restringe al numpad? Default: sí (SUP-S21-001).
- ¿Se acepta que S-21 no use `enmascararDocumento` de S-14 y la entrada solo muestre puntos? Default: sí (SUP-S21-012).
- ¿Los íconos, el banner y el arranque del APK se generan una vez con el Image Asset de Android Studio a partir del kit y se versionan? Default: sí (SUP-S21-013).
- ¿Puedo probar el teclado numérico y el APK en tu smart-TV real antes de usarlo? Default: sí; necesito marca y modelo.

## Revisión independiente

### Veredicto de `spec-reviewer` (texto íntegro, sin editar; copiado de `docs/superpowers/revisiones-pendientes/S-21.md`)

> # Hallazgos del spec-reviewer sobre S-21 (pendientes de conciliar; veredicto REQUIERE CAMBIOS)
> 1. depende_de omite S-04, S-10, S-15, S-23; S-02 sobra; S-20 aún sin aprobar.
> 2. REQ compuestos: 003, 007, 015, 017, 025, 035. Tipo EARS: 008 debe ser `cuando`; 014 sin disparador. Orígenes: 009-014 citan ADR-012 (es login) ; 004/018/036-039 citan ADR-016; 005 viene de SUP-S06-005; 008 cita SUP-S21-010 (no válido).
> 4. AC: 012 (validación de variables de producción no existe en S-01; definir quién), 015 (3 m sin medida: usar altura texto tv de S-19 SUP-S19-004), 009 (la clave sí queda en capacitor.config.json/index.html/offline.html: declarar), 005 (fijar valor Retry-After; S-01:562), 011 (ejecutar el paso).
> 5. Líneas erróneas en 0.4: TIEMPO_INACTIVIDAD_MS está en useEntradaCedula.ts:15; preparar.mjs URL por defecto :5 y :12, appId :27, nombre :28; AccessCard.tsx usa Bebas Neue (:65,90,106,110) y Barlow (:75,80), Barlow Condensed en MarcoFicha.tsx:37 y layout.tsx:24. Variable CORS_ORIGENES -> KIOSCO_ORIGENES_PERMITIDOS (S-01:73,212,218,224). Faltan hechos: assembleDebug (apk-kiosco.yml:69), release sin signingConfig (build.gradle:31-34), entradas sucursal/kiosco_url (apk-kiosco.yml:7-15) y secreto por sucursal (:36), S-00 no importa .github (S-00:30) => workflow se escribe desde cero; pasar a assembleRelease.
>    NOTA: S-20 también usa CORS_ORIGENES / CORS_ORIGENES_VITRINA: revisar contra S-01 (KIOSCO_ORIGENES_PERMITIDOS).
> 6. Duplicación con S-19 (REQ-020, REQ-042, BEH-012); REQ-036 escanea todo apps/packages: acotar a apps/kiosk y apps/kiosk-tv o declarar exenciones; SUP-S21-004 vago (vencido); SUP-S21-001 20 caracteres con teclado numérico; traspaso S-17:988 (IPS_PERMITIDAS televisores).
> 7. BEH-008 debe usar 10 simultáneos y exigir exactamente 5 filas; REQ-013 fallo provisional (S-01:697); cola de pendientes descarta ErrorCheckIn (reintentarPendientes.ts:27-31) => REQ/BEH para 429; Access-Control-Expose-Headers: Retry-After (enmienda S-01); definir conteo del vencido, registro de bloqueados, valores de `resultado`, cálculo Retry-After; bordes 299/301 s; Enter vacío, tecla mantenida (useEntradaCedula.ts:102); REQ-002 vs <input> (useEntradaCedula.ts:126-129).

### Conciliación del autor
Verifiqué cada hallazgo contra el árbol importado de `apps/kiosk` y `apps/kiosk-tv`, contra las specs aprobadas y contra el clon local de `apk-kiosco.yml`. **Todos los hechos eran ciertos**, salvo un matiz: el `debug.keystore` ya no está en este repositorio (S-00 lo excluyó); las decisiones de negocio nuevas quedan como preguntas con default en 5.4. El revisor no numeró un hallazgo 3.

| Hallazgo | Resultado de mi verificación | Qué cambió |
|---|---|---|
| 1. `depende_de` (la cabecera que lista las specs previas) | Cierto: S-04 (estados de acceso), S-10 (retirar lo venezolano), S-15 (línea base y seed) y S-23 (rotación de la clave) se usan; S-02 (hora de Lima) no, porque su lista de exenciones no admite a S-21 (S-02:175) | Cabecera: se agregan S-04, S-10, S-15 y S-23 y se quita S-02; 5.2 declara que S-02 no lleva enmienda; S-20 (vitrina, en revisión) queda solo en 0.3 y en un riesgo, sin dependencia |
| 2. REQ compuestos 003, 007, 015, 017, 025, 035 | Cierto | REQ-003 queda solo con `window.chrome.webview`; REQ-007 pasa a «solo en la cola y solo sin conexión» y REQ-058 prohíbe imprimirlo; REQ-015 queda con el aviso y REQ-063 (no enviar durante el aviso) y REQ-064 (sin `Retry-After` legible) son nuevos; REQ-017 se divide en 017, 046 y 047; REQ-025 queda con «no imprimir» y REQ-068 declara dónde sí queda la clave; REQ-035 se divide en 035 y 055 |
| 2. EARS: REQ-008 `cuando`; REQ-014 sin disparador | Cierto | REQ-008 y REQ-014 pasan a `cuando` con su evento («pasan 7 000 ms desde la última tecla», «api/checkin recibe un envío»); el «volver al reposo» de REQ-008 se quitó porque el código solo limpia la entrada (`useEntradaCedula.ts:110-115`) |
| 2. Orígenes mal atribuidos | Cierto: ADR-012 §2 (límite de intentos de login) no cubre el check-in y ADR-016 (estrategia de pruebas) no es el origen de REQ-004, 018 ni 036 a 039 | REQ-009 a 012, 014, 015, 041, 048, 054, 057, 059, 063 y 064 citan RNF-04 (seguridad); REQ-004 cita RF-53 (idempotencia del check-in) y REQ-050 RF-52 (cola sin conexión); REQ-018 cita ADR-010 (estados de acceso); REQ-036 a 039 citan ADR-020 (rebranding); REQ-005 cita SUP-S06-005 (hasta 20 caracteres); REQ-008 cita ADR-004; la cabecera agrega ADR-002, ADR-010 y ADR-013 |
| 4. AC-012 (variables de producción) | Cierto: S-01 no define ninguna validación de variables de producción, solo `tools/verificar-env.mjs` sobre `.env.example` (S-01:653) | S-21 define quién: `tools/verificar-kiosco-tv.mjs --env <archivo>` (REQ-035 y REQ-055, BEH-018, AC-012); el propietario la ejecuta antes de cada despliegue (5.2) |
| 4. AC-015 («a 3 metros» sin medida) | Cierto | AC-015 mide la altura del texto con la regla del equipo contra el token `tv` (base 36 px, título 96 px, SUP-S19-004) |
| 4. AC-009 (la clave queda en archivos) | Cierto: `preparar.mjs:18,23-24,30` | REQ-068 y BEH-014 declaran que la clave queda solo en `capacitor.config.json`, `www/index.html` y `www/offline.html`, ignorados por git; AC-009 lo comprueba |
| 4. AC-005 (valor de Retry-After) | Cierto: S-01:562 fija un valor numérico | REQ-048, SUP-S21-003 y BEH-007 fijan la fórmula y los valores 294, 284 y 1; AC-005 los exige |
| 4. AC-011 (ejecutar el paso) | Cierto: leer el YAML no prueba que falle | `verificar-secretos.mjs` (REQ-032 y REQ-072, BEH-026) se ejecuta en la prueba con cada variable ausente; el workflow lo ejecuta antes de compilar (REQ-053) |
| 5. Líneas erróneas en 0.4 | Cierto | 0.4 reescrita con líneas leídas hoy: `TIEMPO_INACTIVIDAD_MS` `:15`, `preparar.mjs` `:5`, `:12`, `:27`, `:28`, `AccessCard.tsx` `:65`, `:75`, `:80`, `:90`, `:106`, `:110`, `MarcoFicha.tsx:37`, `layout.tsx:24` |
| 5. Variable de CORS | Cierto: S-01 la llama `KIOSCO_ORIGENES_PERMITIDOS` (S-01:73, :212, :218, :224) | SUP-S21-008, REQ-035 y REQ-055, BEH-018 y 5.2 usan ese nombre; `CORS_ORIGENES` desaparece |
| 5. Hechos que faltaban | Cierto (con el matiz del `debug.keystore`) | 0.4 agrega `assembleDebug` (`:69`), `release` sin firma (`build.gradle:31-34`), entradas `sucursal` y `kiosco_url` (`:7-15`), secreto por sucursal (`:36`), que S-00 no importa `.github` (S-00:30) y que el workflow se escribe nuevo (REQ-044, REQ-056, SUP-S21-007), y además `namespace`, `MainActivity.java`, `strings.xml`, el splash por defecto y el README (REQ-065 a REQ-067) |
| 5. Nota sobre S-20 | Cierto: S-20 usa `CORS_ORIGENES` y `CORS_ORIGENES_VITRINA` (S-20:222, :228) | No toqué S-20; 0.3, 5.2 y 5.3 dicen que S-21 solo usa el nombre de S-01 y que S-20 debe conciliarlo |
| 6. Duplicación con S-19 | Cierto: REQ-S19-067 (superficie `tv`), REQ-S19-051 y REQ-S19-052 (fondos) ya existen | Se retiran REQ-020, REQ-021 y REQ-042 y BEH-012 se reduce a las exenciones; REQ-019 pasa a «exenciones de S-21 vacías» (como REQ-S19-063) y 0.3 remite a S-19; los IDs retirados no se reutilizan |
| 6. REQ-036 sobre todo `apps` y `packages` | Cierto: S-10 ya prohíbe `adrenalina` y `zipnegocios` en `apps` y `packages` (REQ-S10-028) | REQ-036 se acota a `apps/kiosk` y `apps/kiosk-tv`; se declara el solape con S-10 y REQ-045 vacía su exención; REQ-071 declara las exenciones propias, que acaban vacías |
| 6. SUP-S21-004 vago (vencido) | Cierto | SUP-S21-004 y REQ-017, 046 y 047 fijan qué ve el vencido (primer nombre y estado, sin foto, entrenador ni vencimiento) frente a lo de hoy (`AccessCard.tsx:58`, `:96-101`, `:141-166`); se pregunta al propietario en 5.4 |
| 6. SUP-S21-001 (20 caracteres con teclado numérico) | Cierto: carné y pasaporte son alfanuméricos (S-06 SUP-S06-001) | SUP-S21-001 y 0.3 declaran que esos socios usan su código de 4 dígitos; pregunta en 5.4 |
| 6. Traspaso S-17:988 | Cierto | 0.4 y los traspasos de 5.2 piden poner la IP del gimnasio en `IPS_PERMITIDAS` |
| 7. BEH-008 con 10 simultáneos y exactamente 5 filas | Cierto | BEH-008 y AC-005 usan 10 envíos simultáneos y exigen 5 filas fallo, 1 bloqueado, 5 respuestas 404 y 5 respuestas 429 |
| 7. REQ-013 y el fallo provisional | Cierto (S-01:696-697) | REQ-057 (intento provisional) y REQ-059 (cambio a éxito), SUP-S21-005 y el riesgo de la ráfaga en 5.3 |
| 7. La cola descarta el 429 | Cierto: `reintentarPendientes.ts:27-31` | REQ-050 (conservar en la cola), BEH-024 y AC-006; REQ-063 (sin envíos durante el aviso) |
| 7. `Access-Control-Expose-Headers: Retry-After` | Cierto: `kiosco.ts:15-19` no lo expone y el kiosco es de otro origen (`kiosco.ts:4-5`) | REQ-049, BEH-023 y AC-016; enmienda a S-01 en 5.2 |
| 7. Conteo del vencido, registro de bloqueados, valores de `resultado` y cálculo de `Retry-After` | Cierto | SUP-S21-003 (el vencido cuenta como fallo) y SUP-S21-005 (valores `exito`, `fallo` y `bloqueado`, un bloqueado por cada 60 s, `Retry-After` por redondeo hacia arriba); REQ-009, 010, 048 y 054; pregunta en 5.4 |
| 7. Bordes de 299 y 301 segundos | Cierto | BEH-007 usa los segundos 303, 304 y 305 (299, 300 y 301 s del quinto fallo) |
| 7. `Enter` vacío y tecla mantenida | Cierto: `useEntradaCedula.ts:71-75` y `:102` | REQ-051 y REQ-052 con BEH-021 |
| 7. REQ-002 frente al `<input>` | Cierto: el `<input>` acepta ambas filas (`useEntradaCedula.ts:126-129`) | REQ-001 y REQ-002 se acotan a la entrada por teclado en Android (REQ-005 sigue valiendo para ambas vías); SUP-S21-001 declara que el `<input>` del navegador acepta ambas filas y pregunta en 5.4 |
