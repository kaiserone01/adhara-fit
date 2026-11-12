---
id: S-01
estado: en-revision
adrs: ADR-012, ADR-016, ADR-022
depende_de: S-00, S-22
aprobada_por:
fecha_aprobacion:
---
# S-01 — Baseline de seguridad: cuentas, intentos de login, clave del kiosco, permisos, validación, cabeceras y CORS

## 0. Contexto y alcance

### 0.1 Problema
ADR-012 (aceptado el 2026-11-12) exige cerrar, antes de construir funcionalidades, las fallas de seguridad que el código heredado trae y que no dependen de Perú ni de la sede única. Esta spec cubre los criterios 1 a 5, 8 y 10 de ADR-012 sobre el árbol que dejan S-00 y S-22 (Drizzle). Los criterios 6, 7 y 9 los cubren S-00 (`.env.example`, gitleaks, exclusión de scripts destructivos) y la spec de seed (S-15, propuesta). Hecho verificado (0.4): un usuario desactivado inicia sesión y conserva sus sesiones, no hay límite de intentos, la clave del kiosco se guarda y se muestra en claro, 7 casos de uso que cambian o listan datos no verifican permiso, ninguna ruta valida su cuerpo y no se envía ninguna cabecera de seguridad.

### 0.2 Dentro de alcance
- Verificación de credenciales única y compartida por las dos rutas de login y por `iniciarSesion`, que rechaza `activo = false`.
- Invalidación de sesiones al desactivar o eliminar un usuario y al validar la sesión de un usuario inactivo.
- Límite de intentos de login por correo normalizado e IP, con tabla `IntentoLogin` que sirve también de registro.
- Clave de API del kiosco guardada como hash, mostrada una sola vez y rotable por un socio.
- Permiso verificado dentro de los 7 casos de uso cuyas rutas y acciones tampoco lo verifican en la frontera, guardas de acceso comunes (`exigirSesion`, `exigirPermiso`, `exigirSocio`, `exigirKiosco`) en las 12 rutas con sesión y en las 54 acciones, y test de contrato que recorre rutas y acciones.
- Esquemas `zod` para las 11 rutas con cuerpo JSON, parámetros de ruta o de consulta que no se retiran.
- Cabeceras de seguridad, HSTS en producción, `noindex` y `robots.txt`.
- CORS del kiosco acotado a una lista de orígenes por variable de entorno.
- Dependencia `zod` directa en `web-admin`.

### 0.3 Fuera de alcance
- Seed sin contraseñas fijas, `.env.example` completo, gitleaks y exclusión de scripts destructivos: S-00 y S-15 (ADR-012 criterios 6, 7 y 9).
- Validación con `zod` de los argumentos de las 54 server actions: se hace en las specs que reescriben cada acción; aquí solo se verifica su permiso (pregunta 5.4).
- Rutas, acciones y casos de uso que ADR-018 y ADR-003 eliminan (rutas `caja/ultimo-cierre`, `tasa-cambio` y `tasa-cambio/historial`, acción `registrarTasaManualAction` y casos de uso `ObtenerUltimoCierrePorSucursal` y `RegistrarTasaManual`): no se endurecen; las 4 piezas que el test de contrato recorre entran en una lista cerrada de retiro programado (REQ-S01-015).
- Autenticación del kiosco en la TV (S-21) y credenciales de entrenadores (S-18).
- Política de contraseñas, segundo factor, cookie de sesión, protección CSRF de acciones, igualación de tiempos de respuesta del login y retención de la tabla `IntentoLogin` (5.3 y 5.4).
- Mover la clave de API fuera de `Sucursal` cuando S-05 elimine la sede visible.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números de línea son del Repo A; el árbol tras S-00 y S-22 puede desplazarlos.
- Las dos rutas de login verifican las credenciales dentro de la ruta, sin pasar por el caso de uso: `apps/web-admin/app/api/auth/login/route.ts:32-33` y `apps/web-admin/app/api/auth/login/sucursal/route.ts:30-31` llaman a `buscarCredencialesPorEmail` y a `hasher.comparar`. El segundo paso reenvía el correo y la contraseña y los vuelve a verificar, y `iniciarSesion` los verifica una tercera vez (`packages/domain/use-cases/IniciarSesion.ts:37` y `:43`).
- Ningún punto comprueba `activo`: `buscarCredencialesPorEmail` no filtra por `activo` (`packages/infrastructure/persistence/prisma/PrismaUsuarioAdminRepository.ts:56-61`), `iniciarSesion` no lo consulta (`IniciarSesion.ts:37-54`) y `validarSesion` solo comprueba el vencimiento y la sucursal (`ValidarSesion.ts:22` y `:27`).
- Desactivar un usuario solo impide la autodesactivación (`packages/domain/use-cases/ActualizarUsuarioAdmin.ts:38`) y no toca sus sesiones; el puerto de sesiones solo tiene `crear`, `buscarPorToken` y `eliminarPorToken` (`packages/domain/ports/ISesionRepository.ts:4-6`). `EliminarUsuarioAdmin.ts:45-50` hace un borrado físico.
- No existe ningún límite de intentos: ni tabla ni código (verificado con `grep -rIn -i -E "intento|rate.?limit|throttle" apps packages --include=*.ts` sin coincidencias de login).
- Las cookies de sesión son `httpOnly`, `sameSite: "lax"` y `secure` solo en producción (`login/route.ts:83-86`).
- `Sucursal.apiKey` es `String @unique @default(uuid())` (`packages/db/prisma/schema.prisma:47`); `KioskTokenValidator.validar` la busca en claro (`packages/infrastructure/auth/KioskTokenValidator.ts:9`); el panel la muestra y ofrece copiarla (`apps/web-admin/app/(panel)/sucursales/FormularioSucursal.tsx:37-38` y `:76-82`) y el kiosco la guarda en `localStorage` (`apps/kiosk/lib/config.ts:10-11`) y la envía en `X-Kiosk-Api-Key` (`apps/kiosk/lib/api.ts:54`).
- CORS: `Access-Control-Allow-Origin: "*"` en `apps/web-admin/lib/kiosco.ts:16-18`; la clave se lee en `kiosco.ts:32-35`.
- Hay 19 rutas `route.ts` (verificado con `find apps/web-admin/app/api -name route.ts`): 3 de autenticación (`auth/login`, `auth/login/sucursal`, `auth/logout`), 4 de kiosco con clave (`checkin`, `kiosco/estado`, `kiosco/vitrina`, `kiosco/vitrina/eventos`) y 12 con sesión (`caja/ultimo-cierre`, `en-sala`, `en-sala/historial`, `foto-proxy`, `miembros`, `miembros/[id]`, `pagos`, `planes`, `planes/[id]`, `tasa-cambio`, `tasa-cambio/historial`, `usuarios`). Solo `en-sala/route.ts` verifica un permiso (2 coincidencias de `tienePermiso`); las otras 11 rutas con sesión solo comprueban que haya sesión (verificado con `grep -c "tienePermiso"` por archivo).
- Hay 54 server actions en 14 archivos `actions.ts` (verificado con `grep -cE "^export async function"` por archivo).
- De los 68 casos de uso, **49 no contienen `tienePermiso`** ni `puedeCrearUsuarioConRol` (verificado con un bucle `grep -q` sobre `packages/domain/use-cases/*.ts` sin los archivos de prueba). Entre ellos están los 7 que nombra ADR-012 §4 (`CrearMiembro`, `ActualizarMiembro`, `CrearPlan`, `ActualizarPlan`, `ListarMiembros` —`ListarMiembros.ts:4-12` solo filtra por sucursal—, `ListarPagos` y `ListarUsuariosAdmin`), los 2 que otros ADR eliminan (`ObtenerUltimoCierrePorSucursal`, `RegistrarTasaManual`, que existen en `packages/domain/use-cases`) y 40 más: cálculos puros, sesión, kiosco, funciones retiradas y casos de uso protegidos solo en la frontera.
- Esa frontera hoy se protege de forma desigual: las acciones de usuarios y de métodos de pago comprueban `usuario.rol !== "SOCIO"` dentro de la acción (`app/(panel)/usuarios/actions.ts:96`, `:167`, `:203`, `:236`; `app/(panel)/configuraciones/actions.ts:62`, `:102`, `:146`), mientras que las acciones de planes y de miembros solo comprueban que haya sesión (`planes/actions.ts:50`, `:91`; `miembros/actions.ts:109`, `:256`) y `registrarTasaManualAction` no comprueba ningún permiso (`configuraciones/actions.ts:169-170`). Por eso los 7 casos de uso de ADR-012 son los que no tienen ninguna comprobación ni en la acción ni en el caso de uso.
- El permiso se pregunta con `deps.autorizacion.tienePermiso(usuarioId, modulo, accion)` (`packages/domain/ports/IAuthorizationService.ts:6`); los módulos son `MIEMBROS`, `PAGOS`, `PLANES`, `CAJA`, `USUARIOS`, `SUCURSALES` y `EN_SALA`, las acciones `VER`, `CREAR`, `EDITAR` y `ELIMINAR`, y los roles `SOCIO`, `GERENTE`, `RECEPCION` y `ENTRENADOR` (`schema.prisma:68`, `:104` y `:114`).
- 9 rutas leen un cuerpo JSON (`auth/login`, `auth/login/sucursal`, `checkin`, `usuarios`, `miembros`, `miembros/[id]`, `pagos`, `planes`, `planes/[id]`); `auth/login` y `auth/login/sucursal` solo comprueban que los campos existan (`login/sucursal/route.ts:23-28`); 6 rutas leen `searchParams` y 2 llevan un id de ruta (verificado con `grep -ln` sobre `apps/web-admin/app/api`). `foto-proxy` ya exige sesión y que la URL empiece por `R2_PUBLIC_URL` (`foto-proxy/route.ts:14-17`).
- `zod` 4.6.4 está en el lockfile solo como dependencia transitiva y ningún `package.json` la declara (verificado con `grep -n '"zod"' package-lock.json apps/*/package.json packages/*/package.json`).
- No hay `middleware` ni `proxy` en `web-admin`, `next.config.ts` no define `headers()` y no existe `robots` (verificado con `ls` y `grep -n "headers" apps/web-admin/next.config.ts`, sin resultados).
- `IniciarSesion`, `ValidarSesion` y `CerrarSesion` no tienen pruebas: de 68 casos de uso solo 19 tienen archivo de prueba (verificado con `ls packages/domain/use-cases`).
- `RegistroAuditoria` registra cambios de campo con un usuario obligatorio (`packages/db/prisma/schema.prisma:582`, modelo `RegistroAuditoria`), por lo que no sirve para intentos de login sin usuario.
- No verificado: cómo se comporta el despliegue frente a proxies (qué cabecera trae la IP real) y si los orígenes del kiosco son estables; el comportamiento de `bcryptjs` ante contraseñas largas.

### 0.5 Supuestos
- SUP-S01-001: el tiempo de espera tras el límite se calcula por ventana deslizante, no con retroceso exponencial: la cabecera `Retry-After` indica los segundos hasta que el fallo más antiguo de la ventana sale de ella. Default: ventana deslizante de 15 minutos con máximo de 5 fallos; asumido, por validar.
- SUP-S01-002: la clave del límite es el correo normalizado (minúsculas, sin espacios) más la IP; un acierto no borra los fallos previos. Default: esa clave sin borrado; asumido, por validar.
- SUP-S01-003: la IP del cliente es el primer valor de `X-Forwarded-For` cuando existe y «desconocida» cuando no; hay un solo proxy de confianza delante de `web-admin`. Default: ese criterio; asumido, por validar.
- SUP-S01-004: «permiso de SOCIO» de ADR-012 §3 se entiende como rol `SOCIO` del usuario. Default: solo el rol `SOCIO` rota la clave; asumido, por validar.
- SUP-S01-005: la clave de API son 32 bytes aleatorios codificados en base64url (43 caracteres) y se guarda su SHA-256 en hexadecimal (64 caracteres) más sus 8 primeros caracteres como prefijo de identificación; no se usa bcrypt porque la clave tiene entropía alta y se valida en cada petición del kiosco. Default: ese formato; asumido, por validar.
- SUP-S01-006: la rotación invalida la clave anterior de inmediato, sin período de gracia, y los kioscos se reconfiguran a mano. Default: invalidación inmediata; asumido, por validar.
- SUP-S01-007: la política de contenido (CSP) base es `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:` más el origen de `R2_PUBLIC_URL`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'` y `form-action 'self'`; endurecerla con nonces queda para después. Default: esa política; asumido, por validar.
- SUP-S01-008: si `KIOSCO_ORIGENES_PERMITIDOS` está vacía o ausente, el sistema no envía cabeceras CORS (falla cerrada), también en desarrollo. Default: falla cerrada; asumido, por validar.
- SUP-S01-009: las guardas de acceso se llaman `exigirSesion`, `exigirPermiso`, `exigirSocio` y `exigirKiosco` y viven en `apps/web-admin/lib/acceso.ts`; las rutas públicas se marcan con `export const acceso = "publico"`. Default: esos nombres; asumido, por validar.
- SUP-S01-010: el test de contrato es estático, usa la API de TypeScript que el repositorio ya trae y comprueba que una guarda aparezca en el cuerpo de cada función, no en qué orden ni que sea la adecuada (una acción que solo llama a `exigirSesion` pasa aunque deba exigir un permiso). Default: sin comprobar orden ni idoneidad; asumido, por validar.
- SUP-S01-011: `zod` se fija en 4.6.4, la versión que ya figura en el lockfile. Default: esa versión exacta; asumido, por validar.
- SUP-S01-012: tras S-22 los identificadores son cadenas de hasta 64 caracteres con letras, dígitos y guion; los esquemas de ids usan ese formato. Default: ese formato; asumido, por validar.
- SUP-S01-014: S-01 se aparta en parte de ADR-012 §4 («todo caso de uso que cambia o lista datos recibe el actor y verifica `tienePermiso`»): verifica el permiso dentro de los 7 casos de uso que ADR-012 nombra y que no tienen ninguna comprobación en la frontera, y deja el resto (49 casos de uso en total sin `tienePermiso`) protegido en la frontera con las guardas y el test de contrato. Default: esa interpretación; asumido, por validar, pendiente de confirmación del propietario.
- SUP-S01-013: el mensaje de error de credenciales no distingue usuario inexistente, contraseña incorrecta, cuenta inactiva ni bloqueo por intentos en el cuerpo de la respuesta; solo el código 429 y `Retry-After` delatan el bloqueo. Default: mensaje único para los tres primeros casos; asumido, por validar.

## 1. Requisitos

### REQ-S01-001
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando alguien intenta iniciar sesión con un usuario cuyo activo es false, el sistema deberá responder 401 con el mismo mensaje que una contraseña incorrecta y no crear ninguna sesión.

### REQ-S01-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá verificar las credenciales mediante un único caso de uso verificarCredenciales que usen las dos rutas de login y iniciarSesion.

### REQ-S01-003
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando validarSesion recibe el token de una sesión de un usuario inactivo, el sistema deberá eliminar esa sesión y tratar la petición como no autenticada.

### REQ-S01-004
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando se desactiva o se elimina un usuario, el sistema deberá eliminar todas sus sesiones en la misma transacción que el cambio.

### REQ-S01-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá registrar en la tabla IntentoLogin cada intento de login con el correo normalizado, la IP, la hora y el resultado (éxito, fallo o bloqueado).

### REQ-S01-006
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando una clave de correo e IP acumula 5 fallos en los últimos 15 minutos, el sistema deberá responder 429 con la cabecera Retry-After a los intentos siguientes de esa clave sin verificar la contraseña.

### REQ-S01-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá verificar la contraseña como máximo 5 veces por clave en cualquier ventana de 15 minutos, también cuando los intentos llegan a la vez.

### REQ-S01-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá guardar la clave de API de cada sucursal únicamente como hash SHA-256 y su prefijo de 8 caracteres.

### REQ-S01-009
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando se crea una sucursal o se rota su clave, el sistema deberá devolver la clave en claro una sola vez en esa respuesta.

### REQ-S01-010
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando un socio rota la clave de una sucursal, el sistema deberá reemplazarla por una de 32 bytes aleatorios de modo que la anterior deje de autenticar de inmediato.

### REQ-S01-011
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si quien solicita la rotación de una clave no tiene el rol SOCIO entonces el sistema deberá rechazarla sin cambiar la clave.

### REQ-S01-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá exigir dentro de CrearMiembro, ActualizarMiembro, CrearPlan, ActualizarPlan, ListarMiembros, ListarPagos y ListarUsuariosAdmin el permiso del usuario solicitante antes de leer o escribir datos.

### REQ-S01-013
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si el usuario solicitante no tiene el permiso que exige un caso de uso entonces el caso de uso deberá lanzar un error de permiso sin leer ni escribir en la base.

### REQ-S01-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El test de contrato deberá fallar si algún manejador de app/api/**/route.ts o alguna función exportada de un actions.ts no llama a exigirSesion, exigirPermiso, exigirSocio o exigirKiosco y no figura en una de las dos listas cerradas de excepciones.

### REQ-S01-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Las dos listas cerradas del test de contrato deberán ser las 3 rutas públicas auth/login, auth/login/sucursal y auth/logout y los 4 manejadores de retiro programado, que son las rutas caja/ultimo-cierre, tasa-cambio y tasa-cambio/historial y la acción registrarTasaManualAction, cada uno con la spec que lo elimina.

### REQ-S01-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando una de las 11 rutas con entrada recibe un cuerpo, un parámetro de ruta o un parámetro de consulta que no cumple su esquema zod, el sistema deberá responder 400 con la lista de campos inválidos sin ejecutar el caso de uso.

### REQ-S01-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá declarar zod 4.6.4 como dependencia directa de web-admin con versión exacta.

### REQ-S01-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá enviar en todas las respuestas de web-admin las cabeceras Content-Security-Policy, X-Frame-Options con valor DENY, Referrer-Policy con valor strict-origin-when-cross-origin y X-Content-Type-Options con valor nosniff.

### REQ-S01-019
- tipo: mientras
- prioridad: MUST
- origen: ADR-012
- texto: Mientras NODE_ENV vale production, el sistema deberá enviar Strict-Transport-Security con max-age de 31536000 e includeSubDomains.

### REQ-S01-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá enviar X-Robots-Tag con valor noindex, nofollow en todas las respuestas y servir /robots.txt con la regla Disallow: /.

### REQ-S01-021
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando una petición de kiosco trae un Origin que figura en KIOSCO_ORIGENES_PERMITIDOS, el sistema deberá devolver ese mismo Origin en Access-Control-Allow-Origin.

### REQ-S01-022
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si el Origin de una petición de kiosco no figura en KIOSCO_ORIGENES_PERMITIDOS o la variable está vacía entonces el sistema deberá omitir todas las cabeceras Access-Control-*.

### REQ-S01-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El archivo .env.example deberá listar la variable KIOSCO_ORIGENES_PERMITIDOS con un valor de ejemplo.

### REQ-S01-024
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando un kiosco presenta una clave de API que no coincide con ningún hash guardado, el sistema deberá responder 401 sin revelar si la clave existió.

### REQ-S01-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El sistema deberá incluir pruebas de iniciarSesion, validarSesion, cerrarSesion y verificarCredenciales, que hoy no existen.

## 2. Comportamiento

### BEH-S01-001
- cubre: REQ-S01-001, REQ-S01-002
- categoria: error
- dado: un usuario con contraseña correcta y activo igual a false
- cuando: envía sus credenciales a auth/login y luego a auth/login/sucursal
- entonces: ambas rutas responden 401 con el mismo mensaje que una contraseña incorrecta y no existe ninguna fila nueva en la tabla de sesiones

### BEH-S01-002
- cubre: REQ-S01-003
- categoria: error
- dado: un usuario con una sesión vigente al que luego se le pone activo igual a false sin pasar por el caso de uso
- cuando: envía una petición con el token de esa sesión
- entonces: el sistema responde 401 y la fila de la sesión deja de existir

### BEH-S01-003
- cubre: REQ-S01-004
- categoria: feliz
- dado: un usuario con 3 sesiones vigentes
- cuando: un socio lo desactiva con ActualizarUsuarioAdmin
- entonces: las 3 sesiones dejan de existir en la misma transacción y la petición siguiente con cualquiera de sus tokens recibe 401

### BEH-S01-004
- cubre: REQ-S01-004
- categoria: error
- dado: un usuario con 2 sesiones y una desactivación que falla a mitad de la transacción
- cuando: se ejecuta el cambio
- entonces: el usuario conserva activo igual a true y sus 2 sesiones

### BEH-S01-005
- cubre: REQ-S01-005, REQ-S01-006
- categoria: feliz
- dado: un correo con 4 fallos en los últimos 15 minutos
- cuando: llega un quinto intento con contraseña incorrecta y después un sexto
- entonces: el quinto responde 401 y queda registrado como fallo, el sexto responde 429 con Retry-After mayor que 0 y queda registrado como bloqueado

### BEH-S01-006
- cubre: REQ-S01-006
- categoria: borde
- dado: 5 fallos de una clave, el más antiguo ocurrido hace 14 minutos con 59 segundos
- cuando: llega un intento 2 segundos después
- entonces: el fallo más antiguo ya salió de la ventana, se verifica la contraseña y el intento no se bloquea

### BEH-S01-007
- cubre: REQ-S01-007
- categoria: concurrencia
- dado: una clave sin fallos previos y 50 intentos simultáneos con contraseña incorrecta
- cuando: todos terminan
- entonces: exactamente 5 llegaron a verificar la contraseña, 45 respondieron 429 y la tabla tiene 5 fallos y 45 bloqueados

### BEH-S01-008
- cubre: REQ-S01-006
- categoria: borde
- dado: dos IP distintas que usan el mismo correo y el mismo correo con distinta capitalización en una de ellas
- cuando: cada una agota 5 fallos
- entonces: el bloqueo de una IP no bloquea a la otra, y las variantes de mayúsculas del correo comparten el mismo contador

### BEH-S01-009
- cubre: REQ-S01-008, REQ-S01-009
- categoria: feliz
- dado: un socio que crea una sucursal
- cuando: termina la creación
- entonces: la respuesta trae la clave en claro de 43 caracteres, la base guarda solo el hash de 64 caracteres y el prefijo de 8, y una lectura posterior de la sucursal no incluye la clave

### BEH-S01-010
- cubre: REQ-S01-010
- categoria: feliz
- dado: un kiosco que autentica con la clave K1 de una sucursal
- cuando: un socio rota la clave y se obtiene la clave K2
- entonces: una petición con K1 recibe 401, una con K2 recibe 200 y K2 aparece en claro solo en la respuesta de la rotación

### BEH-S01-011
- cubre: REQ-S01-011
- categoria: error
- dado: un usuario con rol GERENTE y permiso SUCURSALES EDITAR
- cuando: intenta rotar la clave de una sucursal
- entonces: el sistema lo rechaza con un error de permiso y la clave no cambia

### BEH-S01-012
- cubre: REQ-S01-024
- categoria: error
- dado: una clave de API con un carácter alterado
- cuando: el kiosco la envía en X-Kiosk-Api-Key
- entonces: el sistema responde 401 con el mismo mensaje que cuando la cabecera falta de otra forma

### BEH-S01-013
- cubre: REQ-S01-010
- categoria: concurrencia
- dado: dos socios que rotan la clave de la misma sucursal a la vez
- cuando: ambas rotaciones terminan
- entonces: la sucursal queda con exactamente una clave válida, la de la rotación que terminó última, y la clave devuelta a la otra ya no autentica

### BEH-S01-014
- cubre: REQ-S01-012, REQ-S01-013
- categoria: error
- dado: un usuario sin permiso PLANES CREAR
- cuando: se invoca CrearPlan con datos válidos
- entonces: el caso de uso lanza el error de permiso y la tabla de planes no cambia

### BEH-S01-015
- cubre: REQ-S01-012
- categoria: feliz
- dado: un usuario con permiso MIEMBROS VER y otro con permiso PAGOS VER
- cuando: cada uno invoca ListarMiembros
- entonces: el primero recibe la lista y el segundo recibe el error de permiso

### BEH-S01-016
- cubre: REQ-S01-014
- categoria: error
- dado: un manejador de ruta nuevo, o una función exportada de un actions.ts, que no llama a ninguna guarda
- cuando: se ejecuta el test de contrato
- entonces: el test falla y nombra el archivo y la función

### BEH-S01-017
- cubre: REQ-S01-015
- categoria: borde
- dado: una entrada de la lista de retiro programado cuyo archivo ya no existe
- cuando: se ejecuta el test de contrato
- entonces: el test falla y pide quitar la entrada de la lista

### BEH-S01-018
- cubre: REQ-S01-016
- categoria: error
- dado: un cuerpo de auth/login sin contraseña, un id de ruta de 300 caracteres y un parámetro url de foto-proxy que no es una URL
- cuando: se envía cada petición
- entonces: cada una responde 400 con la lista de campos inválidos y no se ejecuta ningún caso de uso

### BEH-S01-019
- cubre: REQ-S01-017
- categoria: borde
- dado: un package.json de web-admin que declara zod con el rango ^4.6.4
- cuando: se ejecuta la comprobación de versiones fijadas
- entonces: la comprobación falla y nombra la dependencia

### BEH-S01-020
- cubre: REQ-S01-018, REQ-S01-019, REQ-S01-020
- categoria: feliz
- dado: web-admin en producción
- cuando: se pide /login y /robots.txt
- entonces: ambas respuestas traen las cabeceras de REQ-S01-018, Strict-Transport-Security y X-Robots-Tag, y robots.txt contiene Disallow: /

### BEH-S01-021
- cubre: REQ-S01-021, REQ-S01-022
- categoria: borde
- dado: KIOSCO_ORIGENES_PERMITIDOS con un solo origen
- cuando: llegan peticiones con ese origen, con otro origen y sin Origin
- entonces: la primera recibe ese origen en Access-Control-Allow-Origin y las otras dos no reciben ninguna cabecera Access-Control-*

### BEH-S01-022
- cubre: REQ-S01-023
- categoria: error
- dado: un .env.example sin KIOSCO_ORIGENES_PERMITIDOS
- cuando: se ejecuta tools/verificar-env.mjs de S-00
- entonces: la verificación falla y nombra la variable

### BEH-S01-023
- cubre: REQ-S01-025
- categoria: feliz
- dado: las pruebas nuevas de sesión
- cuando: se ejecutan con npm test en packages/domain
- entonces: pasan las pruebas de iniciarSesion, validarSesion, cerrarSesion y verificarCredenciales junto con las 390 heredadas

## 3. Invariantes

### INV-S01-001
- propiedad: ninguna sesión pertenece a un usuario con activo igual a false
- mecanismo: transaccion
- deteccion: consulta que une Sesion con UsuarioAdmin y devuelve filas con activo igual a false tras desactivar a un usuario
- protege: REQ-S01-003, REQ-S01-004

### INV-S01-002
- propiedad: por cada clave y ventana de 15 minutos hay como máximo 5 filas de IntentoLogin con resultado fallo
- mecanismo: transaccion
- deteccion: consulta que agrupa IntentoLogin por correo e IP en ventanas de 15 minutos y devuelve grupos con más de 5 fallos
- protege: REQ-S01-006, REQ-S01-007

### INV-S01-003
- propiedad: la base nunca guarda una clave de API en claro
- mecanismo: restriccion-bd
- deteccion: restricción CHECK que exige que la columna apiKeyHash tenga 64 caracteres hexadecimales y la ausencia de una columna apiKey
- protege: REQ-S01-008, REQ-S01-009

### INV-S01-004
- propiedad: dos sucursales no comparten hash de clave de API
- mecanismo: restriccion-bd
- deteccion: índice único sobre apiKeyHash; una inserción duplicada falla
- protege: REQ-S01-008, REQ-S01-010

### INV-S01-005
- propiedad: todo manejador de ruta y toda acción exportada llama a una guarda o figura en una lista cerrada
- mecanismo: lint
- deteccion: tools/contrato-permisos.mjs falla ante un manejador sin guarda
- protege: REQ-S01-014, REQ-S01-015

### INV-S01-006
- propiedad: ningún caso de uso de la lista de REQ-S01-012 lee ni escribe datos antes de verificar el permiso
- mecanismo: asercion-dominio
- deteccion: la prueba con un autorizador que deniega y repositorios simulados falla si algún repositorio simulado recibe una llamada
- protege: REQ-S01-012, REQ-S01-013

### INV-S01-007
- propiedad: toda respuesta de web-admin lleva las cabeceras de seguridad y noindex
- mecanismo: test-propiedad
- deteccion: la prueba pide una muestra de rutas (página, API, 404, robots.txt) y falla si falta alguna cabecera
- protege: REQ-S01-018, REQ-S01-020

## 4. Criterios de aceptación

### AC-S01-001
- enlaza: REQ-S01-001, REQ-S01-002, BEH-S01-001
- metodo: integracion
- procedimiento: con una base efímera, crear un usuario con activo igual a false y contraseña conocida, enviar sus credenciales a auth/login y a auth/login/sucursal y contar las filas de sesión
- esperado: ambas respuestas son 401 con el mismo cuerpo que una contraseña incorrecta y no hay filas de sesión nuevas
- test: pendiente

### AC-S01-002
- enlaza: REQ-S01-003, BEH-S01-002, INV-S01-001
- metodo: integracion
- procedimiento: crear un usuario con una sesión, ponerlo inactivo con una escritura directa, enviar una petición protegida con su token y consultar la tabla de sesiones
- esperado: la respuesta es 401 y no existe la fila de la sesión
- test: pendiente

### AC-S01-003
- enlaza: REQ-S01-004, BEH-S01-003, BEH-S01-004, INV-S01-001
- metodo: integracion
- procedimiento: crear un usuario con 3 sesiones, desactivarlo con ActualizarUsuarioAdmin y contar sesiones; repetir con un fallo forzado a mitad de la transacción y con EliminarUsuarioAdmin
- esperado: queda 0 sesiones tras desactivar y tras eliminar; con el fallo queda activo igual a true y 3 sesiones
- test: pendiente

### AC-S01-004
- enlaza: REQ-S01-005, REQ-S01-006, BEH-S01-005, BEH-S01-008
- metodo: integracion
- procedimiento: enviar 6 intentos con contraseña incorrecta de la misma clave, luego el mismo correo con otra IP y con mayúsculas distintas, y leer la tabla IntentoLogin
- esperado: intentos 1 a 5 con 401 y registro fallo, intento 6 con 429, Retry-After mayor que 0 y registro bloqueado; la otra IP no se bloquea y la variante de mayúsculas comparte contador
- test: pendiente

### AC-S01-005
- enlaza: REQ-S01-006, BEH-S01-006
- metodo: unitario
- procedimiento: con un reloj simulado, registrar 5 fallos con el más antiguo a 14 minutos y 59 segundos y enviar un intento 2 segundos después
- esperado: el intento no se bloquea y se verifica la contraseña
- test: pendiente

### AC-S01-006
- enlaza: REQ-S01-007, BEH-S01-007, INV-S01-002
- metodo: integracion
- procedimiento: lanzar con Promise.all 50 intentos con contraseña incorrecta de la misma clave sobre una base efímera y contar las verificaciones de contraseña y las filas de IntentoLogin
- esperado: 5 verificaciones, 5 filas con fallo y 45 con bloqueado
- test: pendiente

### AC-S01-007
- enlaza: REQ-S01-008, REQ-S01-009, BEH-S01-009, INV-S01-003, INV-S01-004
- metodo: integracion
- procedimiento: crear una sucursal como socio, leer la fila en la base, leer la sucursal por el caso de uso e intentar insertar una segunda fila con el mismo hash y otra con un hash de 10 caracteres
- esperado: la respuesta trae 43 caracteres, la fila trae un hash de 64 y un prefijo de 8, la lectura posterior no incluye la clave y las dos inserciones fallan
- test: pendiente

### AC-S01-008
- enlaza: REQ-S01-010, REQ-S01-024, BEH-S01-010, BEH-S01-012
- metodo: integracion
- procedimiento: autenticar un kiosco con K1, rotar con un socio, repetir con K1, con K2 y con K2 alterada en un carácter
- esperado: K1 recibe 401, K2 recibe 200 y la alterada recibe 401 con el mismo cuerpo que K1
- test: pendiente

### AC-S01-009
- enlaza: REQ-S01-011, BEH-S01-011
- metodo: unitario
- procedimiento: invocar RotarApiKeyKiosco con un usuario GERENTE que tiene SUCURSALES EDITAR y con uno SOCIO, con repositorios simulados
- esperado: el primero lanza error de permiso y el repositorio simulado no recibe escritura; el segundo guarda un hash nuevo
- test: pendiente

### AC-S01-010
- enlaza: REQ-S01-010, BEH-S01-013, INV-S01-004
- metodo: integracion
- procedimiento: lanzar con Promise.all dos rotaciones de la misma sucursal y probar las dos claves devueltas
- esperado: exactamente una de las dos claves autentica y la tabla tiene un solo hash para la sucursal
- test: pendiente

### AC-S01-011
- enlaza: REQ-S01-012, REQ-S01-013, BEH-S01-014, BEH-S01-015, INV-S01-006
- metodo: unitario
- procedimiento: para cada uno de los 7 casos de uso, invocarlo con un autorizador que deniega y repositorios simulados, y después con uno que concede
- esperado: con denegación lanza el error de permiso y ningún repositorio simulado recibe llamadas; con concesión completa su operación
- test: pendiente

### AC-S01-012
- enlaza: REQ-S01-014, REQ-S01-015, BEH-S01-016, BEH-S01-017, INV-S01-005
- metodo: unitario
- procedimiento: ejecutar tools/contrato-permisos.mjs sobre el árbol y sobre árboles de prueba con un manejador sin guarda, con una acción sin guarda y con una entrada de retiro programado cuyo archivo no existe
- esperado: pasa sobre el árbol final (19 rutas y 54 acciones) y falla en los tres árboles de prueba nombrando el archivo
- test: pendiente

### AC-S01-013
- enlaza: REQ-S01-016, BEH-S01-018
- metodo: integracion
- procedimiento: enviar a cada una de las 11 rutas una entrada inválida (campo faltante, tipo erróneo, id de 300 caracteres, url que no es URL) y una válida
- esperado: las inválidas responden 400 con la lista de campos y no ejecutan el caso de uso; las válidas llegan al caso de uso
- test: pendiente

### AC-S01-014
- enlaza: REQ-S01-017, BEH-S01-019
- metodo: unitario
- procedimiento: ejecutar la comprobación de versiones fijadas de tools/verificar-repo.mjs sobre un package.json con zod en ^4.6.4 y sobre otro con 4.6.4
- esperado: falla con el primero nombrando zod y pasa con el segundo
- test: pendiente

### AC-S01-015
- enlaza: REQ-S01-018, REQ-S01-019, REQ-S01-020, BEH-S01-020, INV-S01-007
- metodo: integracion
- procedimiento: arrancar web-admin con NODE_ENV=production y pedir /login, una ruta de API, una ruta inexistente y /robots.txt; repetir con NODE_ENV=development
- esperado: las 4 respuestas de producción traen las cabeceras de REQ-S01-018, Strict-Transport-Security y X-Robots-Tag; en desarrollo no hay Strict-Transport-Security; robots.txt contiene Disallow: /
- test: pendiente

### AC-S01-016
- enlaza: REQ-S01-021, REQ-S01-022, BEH-S01-021
- metodo: unitario
- procedimiento: probar la función de cabeceras CORS con la variable en un origen, en blanco y ausente, y con Origin igual, distinto y ausente
- esperado: solo el caso de Origin igual devuelve Access-Control-Allow-Origin con ese origen; el resto no devuelve cabeceras Access-Control-*
- test: pendiente

### AC-S01-017
- enlaza: REQ-S01-023, BEH-S01-022
- metodo: unitario
- procedimiento: ejecutar tools/verificar-env.mjs sobre un .env.example con la variable y sobre otro sin ella
- esperado: pasa con el primero y falla nombrando KIOSCO_ORIGENES_PERMITIDOS con el segundo
- test: pendiente

### AC-S01-018
- enlaza: REQ-S01-025, BEH-S01-023
- metodo: unitario
- procedimiento: ejecutar npm test en packages/domain
- esperado: pasan las pruebas nuevas de iniciarSesion, validarSesion, cerrarSesion y verificarCredenciales y las 390 heredadas
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso): (1) pruebas de `iniciarSesion`, `validarSesion` y `cerrarSesion` con el comportamiento actual, que hoy no existen; (2) `verificarCredenciales`, la tabla `IntentoLogin` y el límite con sus pruebas, incluida la de 50 intentos simultáneos; (3) activo y sesiones: nuevo método `eliminarPorUsuarioId` del puerto de sesiones y su uso al desactivar y eliminar; (4) clave de API: columna de hash, `RotarApiKeyKiosco`, `KioskTokenValidator` y el panel de sucursales; (5) permisos en los 7 casos de uso y `lib/acceso.ts`; (6) `tools/contrato-permisos.mjs` con su archivo de pruebas y las listas cerradas; (7) esquemas `zod` y su ayudante de lectura; (8) cabeceras, `robots` y CORS.
- Las pruebas de integración usan el helper de base efímera de S-00 (REQ-S00-014 y REQ-S00-019) y los repositorios de Drizzle de S-22; las unitarias usan repositorios simulados.
- La atomicidad del límite se consigue dentro de una transacción con un candado asesor por clave (`pg_advisory_xact_lock` con la plantilla `sql` parametrizada, nunca `sql.raw`, REQ-S22-014): se cuenta, se inserta el intento como fallo provisional y se suelta el candado; después de verificar la contraseña, un acierto cambia ese registro a éxito.
- Dependencias nuevas, justificadas en 5.3: `zod` (directa, 4.6.4).
- Los criterios e2e e integrados que usan Docker los ejecuta el propietario o el CI.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15. El esquema cambia en TypeScript: la columna `apiKey` de `Sucursal` pasa a `apiKeyHash` y `apiKeyPrefijo`, y se agrega la tabla `IntentoLogin` con el enum del resultado. Mientras tanto la base se crea con `drizzle-kit push` (S-22).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit que se puede revertir en orden inverso.

### 5.3 Riesgos
- La IP real depende del proxy: si `X-Forwarded-For` puede ser falsificado por el cliente, un atacante rota la IP y evita el límite por clave. Mitigación: SUP-S01-003 y la cuenta por correo con otra IP no ayuda al atacante; el despliegue (S-17) debe fijar el proxy de confianza.
- El límite por correo e IP permite bloquear a un usuario legítimo desde una IP ajena solo en esa IP; no bloquea su cuenta. Es deliberado.
- La CSP con `'unsafe-inline'` en scripts es débil; se endurece con nonces después (SUP-S01-007).
- El test de contrato comprueba que la guarda aparezca, no que preceda a los accesos a datos (SUP-S01-010); la revisión de código cubre el orden.
- `IntentoLogin` crece sin límite: la retención llega con S-17.
- Convertir las 12 rutas con sesión y las 54 acciones a las guardas comunes es un cambio mecánico en 14 archivos de acciones y 12 rutas; el riesgo es cambiar un permiso sin querer. Mitigación: la guarda `exigirSocio` reproduce el `usuario.rol !== "SOCIO"` actual y la suite de contrato de S-22 no cubre acciones, por lo que cada conversión conserva el mensaje de error existente.
- Las dos rutas de login se reducen a un solo caso de uso: puede cambiar mensajes de error que el panel muestra; el mensaje único se conserva (SUP-S01-013).
- Los kioscos desplegados dejan de autenticar cuando se rota la clave (SUP-S01-006).
- Dependencia nueva: `zod`, porque ADR-012 §5 pide validar con esquema y escribir las comprobaciones a mano repetiría el código de 11 rutas; ya está en el lockfile como transitiva, de modo que no suma paquetes nuevos al árbol.

### 5.4 Preguntas abiertas
- ¿Se valida también con `zod` el argumento de las 54 server actions? Default: no en S-01; cada spec que reescribe una acción lo hace.
- ¿Rotar la contraseña de un usuario también debe cerrar sus otras sesiones? Default: no entra en S-01.
- ¿Se agrega retraso uniforme en el login para igualar el tiempo entre usuario inexistente y contraseña incorrecta? Default: no entra en S-01.
- ¿Se conserva el nombre de la variable `KIOSCO_ORIGENES_PERMITIDOS`? Default: sí.
