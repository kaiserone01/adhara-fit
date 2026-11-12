---
id: S-01
estado: aprobada
adrs: ADR-012, ADR-016, ADR-018, ADR-021, ADR-022
depende_de: S-00, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-01 — Baseline de seguridad: cuentas, intentos de login, clave del kiosco, permisos, validación, cabeceras y CORS

## 0. Contexto y alcance

### 0.1 Problema
ADR-012 (aceptado el 2026-11-12) exige cerrar, antes de construir funcionalidades, las fallas de seguridad que el código heredado trae y que no dependen de Perú ni de la sede única. Esta spec cubre los criterios 1 a 5, 8 y 10 de ADR-012 sobre el árbol que dejan S-00 y S-22 (Drizzle). Los criterios 6, 7 y 9 los cubren S-00 (`.env.example`, gitleaks, exclusión de scripts destructivos) y la spec de seed (S-15, propuesta). Hecho verificado (0.4): un usuario desactivado inicia sesión y conserva sus sesiones, no hay límite de intentos, la clave del kiosco se guarda y se muestra en claro, 7 casos de uso que cambian o listan datos no verifican permiso, ninguna ruta valida su cuerpo y no se envía ninguna cabecera de seguridad.

### 0.2 Dentro de alcance
- Verificación de credenciales única y compartida por las dos rutas de login y por `iniciarSesion`, que rechaza `activo = false`.
- Invalidación de sesiones al desactivar o eliminar un usuario y al validar la sesión de un usuario inactivo.
- Límite de intentos de login por correo normalizado e IP, con tabla `IntentoLogin` que sirve también de registro.
- Clave de API del kiosco guardada como hash, mostrada una sola vez y rotable por un socio. Toca todos los puntos que hoy manejan la clave en claro: `Sucursal.apiKey`, `ISucursalRepository.buscarPorApiKey`, `PrismaSucursalRepository`, `KioskTokenValidator`, el panel de sucursales y la creación de sucursal, que hoy termina en un `redirect` y pasa a mostrar la clave una vez.
- Conservar en el kiosco web los check-ins pendientes cuando el servidor responde 401, para no perderlos al rotar la clave.
- Regla nueva en `tools/verificar-repo.mjs` que exige versión exacta para `zod`, y `typescript` como dependencia de desarrollo exacta en la raíz para `tools/contrato-permisos.mjs`.
- `docs/ops/limite-de-intentos.md`, que documenta cómo mover la tabla de intentos a Redis.
- Permiso verificado dentro de los 7 casos de uso cuyas rutas y acciones tampoco lo verifican en la frontera, guardas de acceso comunes (`exigirSesion`, `exigirPermiso`, `exigirSocio`, `exigirKiosco`) en las 16 rutas que no son de login y en las 54 acciones, permiso por ruta y método según la tabla de 5.1, y test de contrato que recorre rutas y acciones. Cambia la firma de esos 7 casos de uso, de modo que se actualizan sus 14 llamadores: 6 páginas, `miembros/actions.ts`, `planes/actions.ts` y 6 rutas.
- Esquemas `zod` para las 11 rutas con cuerpo JSON, parámetros de ruta o de consulta que no se retiran.
- Cabeceras de seguridad, HSTS en producción, `noindex` y `robots.txt`.
- CORS del kiosco acotado a una lista de orígenes por variable de entorno.
- Dependencia `zod` directa en `web-admin`.

### 0.3 Fuera de alcance
- Seed sin contraseñas fijas, `.env.example` completo, gitleaks y exclusión de scripts destructivos: S-00 y S-15 (ADR-012 criterios 6, 7 y 9).
- Validación con `zod` de los argumentos de las 54 server actions: se hace en las specs que reescriben cada acción; aquí solo se verifica su permiso (pregunta 5.4).
- Eliminar las rutas `caja/ultimo-cierre`, `tasa-cambio` y `tasa-cambio/historial`, la acción `registrarTasaManualAction` y los casos de uso `ObtenerUltimoCierrePorSucursal` y `RegistrarTasaManual`: lo hacen las specs de ADR-018 y ADR-003. S-01 los cubre con una guarda para que no queden sin protección entretanto.
- Autenticación del kiosco en la TV (S-21) y credenciales de entrenadores (S-18).
- Política de contraseñas, segundo factor, cookie de sesión, protección CSRF de acciones, igualación de tiempos de respuesta del login y retención de la tabla `IntentoLogin` (5.3 y 5.4).
- Mover la clave de API fuera de `Sucursal` cuando S-05 elimine la sede visible.
- Reescribir el kiosco en TV (S-21) y la vitrina (S-20): S-01 solo cambia la comprobación de la clave en el servidor y la cola de pendientes del kiosco web.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números de línea son del Repo A; el árbol tras S-00 y S-22 puede desplazarlos.
- Las dos rutas de login verifican las credenciales dentro de la ruta, sin pasar por el caso de uso: `apps/web-admin/app/api/auth/login/route.ts:32-33` y `apps/web-admin/app/api/auth/login/sucursal/route.ts:30-31` llaman a `buscarCredencialesPorEmail` y a `hasher.comparar`. El segundo paso reenvía el correo y la contraseña y los vuelve a verificar, y `iniciarSesion` los verifica una tercera vez (`packages/domain/use-cases/IniciarSesion.ts:37` y `:43`).
- Ningún punto comprueba `activo`: `buscarCredencialesPorEmail` no filtra por `activo` (`packages/infrastructure/persistence/prisma/PrismaUsuarioAdminRepository.ts:56-61`), `iniciarSesion` no lo consulta (`IniciarSesion.ts:37-54`) y `validarSesion` solo comprueba el vencimiento y la sucursal (`ValidarSesion.ts:22` y `:27`).
- Desactivar un usuario solo impide la autodesactivación (`packages/domain/use-cases/ActualizarUsuarioAdmin.ts:38`) y no toca sus sesiones; el caso de uso solo recibe `{ usuarios }` (`ActualizarUsuarioAdmin.ts:24`) y el dominio no abre transacciones. El puerto de sesiones solo tiene `crear`, `buscarPorToken` y `eliminarPorToken` (`packages/domain/ports/ISesionRepository.ts:4-6`). Eliminar un usuario sí borra sus sesiones dentro de una transacción de Prisma (`PrismaUsuarioAdminRepository.ts:82-88`).
- No existe ningún límite de intentos: ni tabla ni código (verificado con `grep -rIn -i -E "intento|rate.?limit|throttle" apps packages --include=*.ts` sin coincidencias de login).
- Las cookies de sesión son `httpOnly`, `sameSite: "lax"` y `secure` solo en producción (`login/route.ts:83-86`).
- `Sucursal.apiKey` es `String @unique @default(uuid())` (`packages/db/prisma/schema.prisma:47`); `KioskTokenValidator.validar` la busca en claro (`packages/infrastructure/auth/KioskTokenValidator.ts:9`); el panel la muestra y ofrece copiarla (`apps/web-admin/app/(panel)/sucursales/FormularioSucursal.tsx:37-38` y `:76-82`) y el kiosco la guarda en `localStorage` (`apps/kiosk/lib/config.ts:10-11`) y la envía en `X-Kiosk-Api-Key` (`apps/kiosk/lib/api.ts:54`).
- La clave en claro también pasa por `ISucursalRepository.buscarPorApiKey` (`PrismaSucursalRepository.ts:35-36`), la entidad `Sucursal` (`packages/domain/entities/Sucursal.ts:8`), `KioskTokenValidator.ts:19` y `apps/web-admin/app/(panel)/sucursales/[id]/page.tsx:56`. `crearSucursalAction` termina en `redirect(conMensajeOk("/sucursales", "Sucursal creada."))` (`sucursales/actions.ts:61-62`) y el formulario usa `useActionState` (`FormularioSucursal.tsx:26`).
- La cola de pendientes del kiosco web elimina cualquier check-in que reciba una respuesta del servidor, incluido el 401: `ErrorCheckIn` se lanza para toda respuesta no exitosa (`apps/kiosk/lib/api.ts:64-65`) y `reintentarPendientes.ts:27-30` quita el pendiente.
- Las cuatro rutas de kiosco exportan `OPTIONS` además de su método; un preflight del navegador no lleva la clave. Los mensajes del kiosco hoy son «Falta el header X-Kiosk-Api-Key.» y «API key de sucursal inválida.», ambos con 401 (`kiosco.ts:33` y `:36`).
- Los métodos por ruta son: `auth/login` POST, `auth/login/sucursal` POST, `auth/logout` POST, `caja/ultimo-cierre` GET, `checkin` OPTIONS y POST, `en-sala` GET, `en-sala/historial` GET, `foto-proxy` GET, `kiosco/estado` OPTIONS y GET, `kiosco/vitrina` OPTIONS y GET, `kiosco/vitrina/eventos` OPTIONS y GET, `miembros` GET y POST, `miembros/[id]` GET y PATCH, `pagos` GET y POST, `planes` GET y POST, `planes/[id]` PATCH, `tasa-cambio` GET, `tasa-cambio/historial` GET, `usuarios` GET y POST (verificado con `grep -oE "export async function (GET|POST|PUT|PATCH|DELETE|OPTIONS)"` por ruta).
- CORS: `Access-Control-Allow-Origin: "*"` en `apps/web-admin/lib/kiosco.ts:16-18`; la clave se lee en `kiosco.ts:32-35`.
- Hay 19 rutas `route.ts` (verificado con `find apps/web-admin/app/api -name route.ts`): 3 de autenticación (`auth/login`, `auth/login/sucursal`, `auth/logout`), 4 de kiosco con clave (`checkin`, `kiosco/estado`, `kiosco/vitrina`, `kiosco/vitrina/eventos`) y 12 con sesión (`caja/ultimo-cierre`, `en-sala`, `en-sala/historial`, `foto-proxy`, `miembros`, `miembros/[id]`, `pagos`, `planes`, `planes/[id]`, `tasa-cambio`, `tasa-cambio/historial`, `usuarios`). Solo `en-sala/route.ts` verifica un permiso (2 coincidencias de `tienePermiso`); las otras 11 rutas con sesión solo comprueban que haya sesión (verificado con `grep -c "tienePermiso"` por archivo).
- Hay 54 server actions en 14 archivos `actions.ts` (verificado con `grep -cE "^export async function"` por archivo).
- De los 68 casos de uso, **49 no contienen `tienePermiso`** ni `puedeCrearUsuarioConRol` (verificado con un bucle `grep -q` sobre `packages/domain/use-cases/*.ts` sin los archivos de prueba). Entre ellos están los 7 que nombra ADR-012 §4 (`CrearMiembro`, `ActualizarMiembro`, `CrearPlan`, `ActualizarPlan`, `ListarMiembros` —`ListarMiembros.ts:4-12` solo filtra por sucursal—, `ListarPagos` y `ListarUsuariosAdmin`), los 2 que otros ADR eliminan (`ObtenerUltimoCierrePorSucursal`, `RegistrarTasaManual`, que existen en `packages/domain/use-cases`) y 40 más: cálculos puros, sesión, kiosco, funciones retiradas y casos de uso protegidos solo en la frontera.
- Esa frontera hoy se protege de forma desigual: las acciones de usuarios y de métodos de pago comprueban `usuario.rol !== "SOCIO"` dentro de la acción (`app/(panel)/usuarios/actions.ts:96`, `:167`, `:203`, `:236`; `app/(panel)/configuraciones/actions.ts:62`, `:102`, `:146`), mientras que las acciones de planes y de miembros solo comprueban que haya sesión (`planes/actions.ts:50`, `:91`; `miembros/actions.ts:109`, `:256`) y `registrarTasaManualAction` no comprueba ningún permiso (`configuraciones/actions.ts:169-170`). Por eso los 7 casos de uso de ADR-012 son los que no tienen ninguna comprobación ni en la acción ni en el caso de uso.
- El permiso se pregunta con `deps.autorizacion.tienePermiso(usuarioId, modulo, accion)` (`packages/domain/ports/IAuthorizationService.ts:6`); los módulos son `MIEMBROS`, `PAGOS`, `PLANES`, `CAJA`, `USUARIOS`, `SUCURSALES` y `EN_SALA`, las acciones `VER`, `CREAR`, `EDITAR` y `ELIMINAR`, y los roles `SOCIO`, `GERENTE`, `RECEPCION` y `ENTRENADOR` (`schema.prisma:68`, `:104` y `:114`). Además hay controles propios en la frontera: `puedeEditarKiosko(rol)` en `kiosko/actions.ts:23-26` y `vitrina/actions.ts:30-33`.
- 9 rutas leen un cuerpo JSON (`auth/login`, `auth/login/sucursal`, `checkin`, `usuarios`, `miembros`, `miembros/[id]`, `pagos`, `planes`, `planes/[id]`); `auth/login` y `auth/login/sucursal` solo comprueban que los campos existan (`login/sucursal/route.ts:23-28`); 6 rutas leen `searchParams` y 2 llevan un id de ruta (verificado con `grep -ln` sobre `apps/web-admin/app/api`). `foto-proxy` ya exige sesión y que la URL empiece por `R2_PUBLIC_URL` (`foto-proxy/route.ts:14-17`).
- `zod` 4.6.4 está en el lockfile solo como dependencia transitiva y ningún `package.json` la declara (verificado con `grep -n '"zod"' package-lock.json apps/*/package.json packages/*/package.json`).
- No hay `middleware` ni `proxy` en `web-admin`, `next.config.ts` no define `headers()` y no existe `robots` (verificado con `ls` y `grep -n "headers" apps/web-admin/next.config.ts`, sin resultados). El layout carga las fuentes en tiempo de ejecución desde `https://fonts.googleapis.com` y `https://fonts.gstatic.com` (`apps/web-admin/app/layout.tsx:22-25`) y 5 formularios usan vistas previas con `createObjectURL` o `blob:` (verificado con `grep -rIln "createObjectURL|blob:" apps/web-admin/app`).
- `IniciarSesion`, `ValidarSesion` y `CerrarSesion` no tienen pruebas: de 68 casos de uso solo 19 tienen archivo de prueba (verificado con `ls packages/domain/use-cases`).
- `RegistroAuditoria` registra cambios de campo con un usuario obligatorio (`packages/db/prisma/schema.prisma:582`, modelo `RegistroAuditoria`), por lo que no sirve para intentos de login sin usuario.
- `typescript` 5.9.3 figura en el lockfile (`package-lock.json:9997-9998`) y cada app lo declara con `^5` (`apps/web-admin/package.json:34`); la raíz no lo declara.
- No verificado: cómo se comporta el despliegue frente a proxies (qué cabecera trae la IP real) y si los orígenes del kiosco son estables; el comportamiento de `bcryptjs` ante contraseñas largas.

### 0.5 Supuestos
- SUP-S01-001: el tiempo de espera tras el límite se calcula por ventana deslizante: la cabecera `Retry-After` vale los segundos, redondeados hacia arriba, hasta que el fallo más antiguo de la ventana sale de ella. No hay retroceso exponencial (desviación de ADR-012 §2, ver SUP-S01-016). Default: ventana deslizante de 15 minutos con máximo de 5 fallos; asumido, por validar.
- SUP-S01-002: la clave del límite es el correo normalizado (minúsculas, sin espacios) más la IP; un acierto no borra los fallos previos. Default: esa clave sin borrado; asumido, por validar.
- SUP-S01-003: la IP del cliente es el **último** valor de `X-Forwarded-For` (el que añade el proxy de confianza) y «desconocida» cuando la cabecera falta; el primer valor lo controla el cliente y no se usa. Hay un solo proxy de confianza delante de `web-admin` y S-17 exige que ese proxy añada su valor. Default: ese criterio; asumido, por validar.
- SUP-S01-004: «permiso de SOCIO» de ADR-012 §3 se entiende como rol `SOCIO` del usuario. Default: solo el rol `SOCIO` rota la clave; asumido, por validar.
- SUP-S01-005: la clave de API son 32 bytes aleatorios codificados en base64url (43 caracteres) y se guarda su SHA-256 en hexadecimal (64 caracteres) más sus 8 primeros caracteres como prefijo de identificación; no se usa bcrypt porque la clave tiene entropía alta y se valida en cada petición del kiosco. Default: ese formato; asumido, por validar.
- SUP-S01-006: la rotación invalida la clave anterior de inmediato, sin período de gracia, y los kioscos se reconfiguran a mano. Default: invalidación inmediata; asumido, por validar.
- SUP-S01-007: la política de contenido (CSP) base es `default-src 'self'`, `script-src 'self' 'unsafe-inline'` (más `'unsafe-eval'` solo si `NODE_ENV` vale development), `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com`, `img-src 'self' data: blob:` más el origen de `R2_PUBLIC_URL`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'` y `form-action 'self'`; los orígenes de Google se retiran cuando S-19 autoaloje las fuentes y los nonces quedan para después. Default: esa política en todos los entornos; asumido, por validar.
- SUP-S01-008: si `KIOSCO_ORIGENES_PERMITIDOS` está vacía o ausente, el sistema no envía cabeceras CORS (falla cerrada), también en desarrollo. Default: falla cerrada; asumido, por validar.
- SUP-S01-009: las guardas de acceso se llaman `exigirSesion`, `exigirPermiso`, `exigirSocio` y `exigirKiosco` y viven en `apps/web-admin/lib/acceso.ts`; lanzan un error de acceso que el ayudante de la ruta convierte en 401 o 403, el de la acción en una redirección a `/login` o en el mensaje de error que la acción ya devuelve, y una página en una redirección a `/` con el aviso «No tienes permiso». Default: esos nombres y conversiones; asumido, por validar.
- SUP-S01-010: el test de contrato es estático, usa la API de `typescript` y comprueba que una guarda aparezca en el cuerpo de cada función, no en qué orden ni que sea la que corresponde (una acción que solo llama a `exigirSesion` pasa aunque deba exigir un permiso). `typescript` 5.9.3, hoy declarada solo por cada app, se declara en la raíz como dependencia de desarrollo exacta; es una excepción a «herramientas sin dependencias» de ADR-016 §8, justificada en 5.3. Default: sin comprobar orden ni idoneidad; asumido, por validar.
- SUP-S01-011: `zod` se fija en 4.6.4, la versión que ya figura en el lockfile. Default: esa versión exacta; asumido, por validar.
- SUP-S01-012: tras S-22 los identificadores son cadenas UUID de 36 caracteres; los esquemas de ids aceptan letras, dígitos y guion hasta 64 caracteres. Default: ese formato; asumido, por validar.
- SUP-S01-013: el mensaje de error de credenciales no distingue usuario inexistente, contraseña incorrecta, cuenta inactiva ni bloqueo por intentos en el cuerpo de la respuesta; solo el código 429 y `Retry-After` delatan el bloqueo. Default: mensaje único para los tres primeros casos; asumido, por validar.
- SUP-S01-014: S-01 se aparta en parte de ADR-012 §4 («todo caso de uso que cambia o lista datos recibe el actor y verifica `tienePermiso`» y el test falla si una ruta «no declara permiso»): verifica el permiso dentro de los 7 casos de uso que ADR-012 nombra, que no tienen ninguna comprobación en la frontera, deja el resto (49 casos de uso en total sin `tienePermiso`) protegido en la frontera, y acepta que `exigirSesion` basta para que el test de contrato pase. Default: esa interpretación; asumido, por validar (confirmada por el propietario el 2026-11-12).
- SUP-S01-015: S-01 no depende de ADR-003 (propuesto): las rutas `tasa-cambio` y `tasa-cambio/historial` y la acción `registrarTasaManualAction` reciben una guarda `exigirSesion`, que no cambia su comportamiento, y desaparecen cuando se acepte y se ejecute ADR-003. Default: esa guarda; asumido, por validar.
- SUP-S01-016: S-01 se aparta de ADR-012 §2 en dos puntos: no hay retroceso exponencial (SUP-S01-001) y no hay tope adicional por correo sin IP ni por IP sin correo, para que un atacante no bloquee una cuenta desde cualquier lugar; la ruta a Redis se documenta en `docs/ops/limite-de-intentos.md` (REQ-S01-027). Default: esas desviaciones; asumido, por validar (confirmada por el propietario el 2026-11-12).
- SUP-S01-017: aplicar la tabla de permisos de 5.1 puede negar acceso a roles que hoy lo tienen solo porque la ruta no comprobaba nada; se acepta y AC-S01-019 fija el resultado por rol con los permisos por defecto, que no se han verificado. Default: aceptar el cierre; asumido, por validar.
- SUP-S01-018: un intento bloqueado se registra una sola vez por clave y por minuto. Default: ese tope; asumido, por validar.
- SUP-S01-019: el propietario indicó (2026-11-12) que solo inicia sesión el socio o administrador. S-01 conserva las guardas por rol y por permiso porque los roles GERENTE, RECEPCION y ENTRENADOR y los permisos por módulo se retiran en S-23 (ítem aprobado por el propietario el 2026-11-12), no aquí; mientras existan, AC-S01-019 los prueba. Default: ese orden; asumido, por validar.

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
- texto: El sistema deberá permitir como máximo 5 verificaciones de contraseña con resultado fallido por clave en cualquier ventana de 15 minutos, también cuando los intentos llegan a la vez.

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
- texto: Cuando un socio rota la clave de una sucursal, el sistema deberá reemplazar el hash guardado por el de una clave nueva de 32 bytes aleatorios en una sola escritura.

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
- texto: El test de contrato deberá fallar si algún manejador de app/api/**/route.ts, salvo los OPTIONS, o alguna función exportada de un actions.ts no llama a exigirSesion, exigirPermiso, exigirSocio o exigirKiosco y no figura en la lista cerrada de rutas públicas.

### REQ-S01-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La lista cerrada de rutas públicas del test de contrato deberá contener exactamente auth/login, auth/login/sucursal y auth/logout.

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
- texto: El sistema deberá enviar en todas las respuestas de web-admin el conjunto de cabeceras de seguridad de la tabla de 5.1.

### REQ-S01-019
- tipo: mientras
- prioridad: MUST
- origen: ADR-012
- texto: Mientras NODE_ENV vale production, el sistema deberá enviar Strict-Transport-Security con max-age de 31536000 e includeSubDomains.

### REQ-S01-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá enviar la cabecera X-Robots-Tag con valor noindex, nofollow en todas las respuestas de web-admin.

### REQ-S01-021
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando una petición de kiosco trae un Origin que figura en KIOSCO_ORIGENES_PERMITIDOS, el sistema deberá responder con Access-Control-Allow-Origin igual a ese Origin y con Vary: Origin.

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
- texto: El sistema deberá incluir pruebas de los casos de uso iniciarSesion, validarSesion, cerrarSesion y verificarCredenciales, que hoy no existen.

### REQ-S01-026
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando una clave bloqueada recibe varios intentos dentro del mismo minuto, el sistema deberá registrar en IntentoLogin solo el primero como bloqueado.

### REQ-S01-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El repositorio deberá incluir docs/ops/limite-de-intentos.md con los pasos para mover la tabla de intentos de login a Redis.

### REQ-S01-028
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando el servidor responde 401 al reenviar un check-in pendiente, el kiosco web deberá conservar ese check-in en su cola.

### REQ-S01-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá exigir en cada ruta y método el módulo y la acción de permiso que indica la tabla de 5.1.

### REQ-S01-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema deberá servir /robots.txt con la regla Disallow: /.

### REQ-S01-031
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si un caso de uso lanza el error de permiso dentro de una ruta entonces la ruta deberá responder 403 con un cuerpo que no revele datos.

### REQ-S01-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Los manejadores OPTIONS de las 4 rutas de kiosco deberán responder solo con las cabeceras CORS y sin consultar la base de datos.

### REQ-S01-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Los esquemas de las rutas de login deberán rechazar un correo de más de 254 caracteres y una contraseña de más de 128 caracteres.

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
- cubre: REQ-S01-007, REQ-S01-026
- categoria: concurrencia
- dado: una clave sin fallos previos y 50 intentos simultáneos con contraseña incorrecta
- cuando: todos terminan
- entonces: exactamente 5 llegaron a verificar la contraseña con resultado fallido, los otros 45 respondieron 429 y la tabla tiene 5 filas de fallo y 1 de bloqueado

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
- dado: una clave de API con un carácter alterado y una petición sin la cabecera X-Kiosk-Api-Key
- cuando: el kiosco envía cada una
- entonces: ambas responden 401; la primera con el mensaje «API key de sucursal inválida.» y la segunda con «Falta el header X-Kiosk-Api-Key.», sin revelar si la clave alterada existió

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
- cubre: REQ-S01-015, REQ-S01-032
- categoria: borde
- dado: el árbol final con 4 manejadores OPTIONS en las rutas de kiosco y una ruta nueva que no figura en la lista de rutas públicas ni llama a una guarda
- cuando: se ejecuta el test de contrato
- entonces: los 4 OPTIONS no se exigen como protegidos, responden solo con cabeceras CORS y el test falla únicamente por la ruta nueva

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
- cubre: REQ-S01-018, REQ-S01-019, REQ-S01-020, REQ-S01-030
- categoria: feliz
- dado: web-admin en producción
- cuando: se pide /login y /robots.txt
- entonces: ambas respuestas traen el conjunto de cabeceras de la tabla de 5.1, Strict-Transport-Security y X-Robots-Tag, y robots.txt contiene Disallow: /

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

### BEH-S01-024
- cubre: REQ-S01-028
- categoria: error
- dado: un kiosco web con un check-in pendiente y la clave ya rotada en el servidor
- cuando: el kiosco reintenta el envío y recibe 401
- entonces: el check-in sigue en la cola y se reintenta cuando el kiosco guarda una clave nueva

### BEH-S01-025
- cubre: REQ-S01-029, REQ-S01-031
- categoria: error
- dado: un usuario con rol GERENTE sin el permiso PAGOS VER
- cuando: pide GET pagos
- entonces: la ruta responde 403 con un cuerpo que no incluye datos de pagos

### BEH-S01-026
- cubre: REQ-S01-009
- categoria: borde
- dado: un socio que crea una sucursal desde el panel
- cuando: la acción termina
- entonces: el formulario muestra la clave una sola vez con aviso de guardarla, no hay redirección hasta que el socio cierra el aviso y al recargar la página de la sucursal solo se ve el prefijo de 8 caracteres

### BEH-S01-027
- cubre: REQ-S01-033
- categoria: borde
- dado: un correo de 255 caracteres y una contraseña de 129 caracteres
- cuando: se envían a auth/login
- entonces: la ruta responde 400 sin consultar la base de datos ni registrar un intento

### BEH-S01-028
- cubre: REQ-S01-021
- categoria: feliz
- dado: KIOSCO_ORIGENES_PERMITIDOS con un origen
- cuando: llega una petición con ese origen
- entonces: la respuesta trae Access-Control-Allow-Origin con ese origen y Vary: Origin

### BEH-S01-029
- cubre: REQ-S01-027
- categoria: feliz
- dado: el repositorio terminado
- cuando: una persona abre docs/ops/limite-de-intentos.md
- entonces: encuentra los pasos para mover los intentos a Redis, la clave de conteo y la ventana de 15 minutos

## 3. Invariantes

### INV-S01-001
- propiedad: tras desactivar o eliminar un usuario con sus casos de uso, ninguna sesión pertenece a un usuario con activo igual a false
- mecanismo: transaccion
- deteccion: consulta que une Sesion con UsuarioAdmin y devuelve filas con activo igual a false después de ejecutar el caso de uso
- protege: REQ-S01-003, REQ-S01-004

### INV-S01-002
- propiedad: para cada fila de fallo de IntentoLogin hay como máximo 5 fallos de su misma clave en los 15 minutos anteriores a ella, incluida ella
- mecanismo: transaccion
- deteccion: consulta que cuenta, para cada fila de fallo, los fallos de la misma clave en los 15 minutos previos y devuelve las filas cuya cuenta supera 5
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
- propiedad: todo manejador de ruta, salvo los OPTIONS, y toda acción exportada llama a una guarda o figura en la lista cerrada de rutas públicas
- mecanismo: lint
- deteccion: tools/contrato-permisos.mjs falla ante un manejador sin guarda
- protege: REQ-S01-014, REQ-S01-015

### INV-S01-006
- propiedad: ningún caso de uso de la lista de REQ-S01-012 lee ni escribe datos antes de verificar el permiso
- mecanismo: asercion-dominio
- deteccion: la prueba con un autorizador que deniega y repositorios simulados falla si algún repositorio simulado recibe una llamada
- protege: REQ-S01-012, REQ-S01-013

### INV-S01-007
- propiedad: las respuestas de una muestra de cinco rutas (página, API, 404, robots.txt y ruta de kiosco) llevan las cabeceras de seguridad y noindex
- mecanismo: test-propiedad
- deteccion: la prueba pide esa muestra y falla si falta alguna cabecera
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
- enlaza: REQ-S01-005, REQ-S01-006, REQ-S01-026, BEH-S01-005, BEH-S01-008
- metodo: integracion
- procedimiento: enviar 6 intentos con contraseña incorrecta de la misma clave, el primero en el segundo 0 y el último en el segundo 10, luego el mismo correo con otra IP y con mayúsculas distintas, y leer la tabla IntentoLogin
- esperado: intentos 1 a 5 con 401 y registro fallo; intento 6 con 429 y Retry-After igual a 890 (900 menos 10 segundos); la otra IP no se bloquea; la variante de mayúsculas comparte contador; un séptimo intento dentro del mismo minuto no agrega otra fila de bloqueado
- test: pendiente

### AC-S01-005
- enlaza: REQ-S01-006, BEH-S01-006
- metodo: unitario
- procedimiento: con un reloj simulado, registrar 5 fallos con el más antiguo a 14 minutos y 59 segundos y enviar un intento 2 segundos después; repetir con el más antiguo a 14 minutos y 59 segundos y un intento 0 segundos después
- esperado: el primer intento no se bloquea y se verifica la contraseña; el segundo responde 429 con Retry-After igual a 1
- test: pendiente

### AC-S01-006
- enlaza: REQ-S01-007, REQ-S01-026, BEH-S01-007, INV-S01-002
- metodo: integracion
- procedimiento: lanzar con Promise.all 50 intentos con contraseña incorrecta de la misma clave sobre una base efímera, contar las verificaciones de contraseña y las filas de IntentoLogin, y ejecutar la consulta de INV-S01-002
- esperado: 5 verificaciones, 5 filas de fallo y 1 de bloqueado, y la consulta de INV-S01-002 devuelve 0 filas
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
- enlaza: REQ-S01-014, REQ-S01-015, REQ-S01-032, BEH-S01-016, BEH-S01-017, INV-S01-005
- metodo: unitario
- procedimiento: ejecutar tools/contrato-permisos.mjs sobre el árbol final y sobre árboles de prueba con un manejador sin guarda, con una acción sin guarda y con una ruta nueva fuera de la lista pública
- esperado: pasa sobre el árbol final, informa el número de rutas y de acciones recorridas (hoy 19 rutas y 54 acciones más las que agregue S-01) y falla en los tres árboles de prueba nombrando el archivo y la función; los 4 OPTIONS no cuentan como fallo
- test: pendiente

### AC-S01-013
- enlaza: REQ-S01-016, REQ-S01-033, BEH-S01-018, BEH-S01-027
- metodo: integracion
- procedimiento: enviar a cada una de las 11 rutas una entrada inválida (campo faltante, tipo erróneo, id de 300 caracteres, url que no es URL, correo de 255 caracteres, contraseña de 129) y una válida
- esperado: las inválidas responden 400 con el cuerpo {"error":"Datos inválidos.","campos":[{"campo":"…","mensaje":"…"}]} y no ejecutan el caso de uso; las válidas llegan al caso de uso
- test: pendiente

### AC-S01-014
- enlaza: REQ-S01-017, BEH-S01-019
- metodo: unitario
- procedimiento: ejecutar la regla de versión exacta de tools/verificar-repo.mjs sobre un package.json con zod en ^4.6.4 y sobre otro con 4.6.4
- esperado: falla con el primero nombrando zod y pasa con el segundo
- test: pendiente

### AC-S01-015
- enlaza: REQ-S01-018, REQ-S01-019, REQ-S01-020, REQ-S01-030, BEH-S01-020, INV-S01-007
- metodo: integracion
- procedimiento: arrancar web-admin con NODE_ENV=production y pedir /login, una ruta de API, una ruta inexistente, /robots.txt y /api/kiosco/estado con una clave válida; repetir con NODE_ENV=development
- esperado: las 5 respuestas de producción traen todas las cabeceras de la tabla de 5.1, Strict-Transport-Security y X-Robots-Tag; en desarrollo la CSP incluye 'unsafe-eval' y no hay Strict-Transport-Security; robots.txt contiene Disallow: /
- test: pendiente

### AC-S01-016
- enlaza: REQ-S01-021, REQ-S01-022, BEH-S01-021, BEH-S01-028
- metodo: unitario
- procedimiento: probar la función de cabeceras CORS con la variable en un origen, en blanco y ausente, y con Origin igual, distinto y ausente
- esperado: solo el caso de Origin igual devuelve Access-Control-Allow-Origin con ese origen y Vary: Origin; el resto no devuelve cabeceras Access-Control-*
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

### AC-S01-019
- enlaza: REQ-S01-029, REQ-S01-031, BEH-S01-025
- metodo: integracion
- procedimiento: para cada fila de la tabla de 5.1, crear un usuario de cada rol (SOCIO, GERENTE, RECEPCION, ENTRENADOR) con los permisos por defecto y otro con exactamente el permiso de la fila, y llamar a la ruta y al método
- esperado: el usuario con el permiso recibe 200 (o el código de éxito de la ruta) y el que no lo tiene recibe 403 sin datos; la tabla de resultados por rol queda registrada en la prueba
- test: pendiente

### AC-S01-020
- enlaza: REQ-S01-028, BEH-S01-024
- metodo: unitario
- procedimiento: en apps/kiosk, ejecutar las pruebas de la cola de pendientes con un servidor simulado que responde 401, luego 200
- esperado: tras el 401 el pendiente sigue en la cola; tras el 200 se elimina
- test: pendiente

### AC-S01-021
- enlaza: REQ-S01-009, BEH-S01-026
- metodo: e2e
- procedimiento: como socio, crear una sucursal desde el panel, anotar la clave mostrada, cerrar el aviso y recargar la página de la sucursal
- esperado: la clave se vio una sola vez con 43 caracteres y tras recargar solo aparece el prefijo de 8 caracteres
- test: pendiente

### AC-S01-022
- enlaza: REQ-S01-027, BEH-S01-029
- metodo: manual
- procedimiento: una persona que no participó lee docs/ops/limite-de-intentos.md y enumera los pasos para mover los intentos a Redis
- esperado: enumera la clave de conteo, la ventana de 15 minutos y los pasos de cambio sin preguntar nada al autor
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso): (1) pruebas de `iniciarSesion`, `validarSesion` y `cerrarSesion` con el comportamiento actual, que hoy no existen; (2) `verificarCredenciales`, la tabla `IntentoLogin` y el límite con sus pruebas, incluida la de 50 intentos simultáneos; (3) activo y sesiones: nuevo método `eliminarPorUsuarioId` del puerto de sesiones y su uso al desactivar y eliminar; (4) clave de API: columna de hash, `RotarApiKeyKiosco`, `KioskTokenValidator` y el panel de sucursales; (5) permisos en los 7 casos de uso y `lib/acceso.ts`; (6) `tools/contrato-permisos.mjs` con su archivo de pruebas y las listas cerradas; (7) esquemas `zod` y su ayudante de lectura; (8) cabeceras, `robots` y CORS.
- Las pruebas de integración usan el helper de base efímera de S-00 (REQ-S00-014 y REQ-S00-019) y los repositorios de Drizzle de S-22; las unitarias usan repositorios simulados.
- Mecanismo transaccional (el dominio no abre transacciones): el puerto `IIntentoLoginRepository` ofrece `reservar(clave, ahora)`, que dentro de una transacción toma un candado asesor por clave, cuenta los fallos de la ventana, inserta el intento como fallo provisional o como bloqueado y devuelve el resultado, y `resolver(id, resultado)`, que cambia el fallo provisional a éxito. El puerto `IUsuarioAdminRepository` gana `desactivarConSesiones(id)`, que desactiva al usuario y borra sus sesiones en una sola transacción (hoy `eliminar` ya lo hace, `PrismaUsuarioAdminRepository.ts:82-88`), y `ISesionRepository` gana `eliminarPorUsuarioId`.
- La atomicidad del límite se consigue dentro de una transacción con un candado asesor por clave (`pg_advisory_xact_lock` con la plantilla `sql` parametrizada, nunca `sql.raw`, REQ-S22-014): se cuenta, se inserta el intento como fallo provisional y se suelta el candado; después de verificar la contraseña, un acierto cambia ese registro a éxito.
- Cabeceras de seguridad (REQ-S01-018): `Content-Security-Policy` según SUP-S01-007, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y `X-Content-Type-Options: nosniff`.
- Tabla de permisos por ruta y método (REQ-S01-029): `caja/ultimo-cierre` GET → `exigirPermiso(CAJA, VER)`; `en-sala` GET y `en-sala/historial` GET → `exigirPermiso(EN_SALA, VER)`; `foto-proxy` GET → `exigirSesion`; `miembros` GET → `exigirPermiso(MIEMBROS, VER)` y POST → `exigirPermiso(MIEMBROS, CREAR)`; `miembros/[id]` GET → `exigirPermiso(MIEMBROS, VER)` y PATCH → `exigirPermiso(MIEMBROS, EDITAR)`; `pagos` GET → `exigirPermiso(PAGOS, VER)` y POST → `exigirPermiso(PAGOS, CREAR)`; `planes` GET → `exigirPermiso(PLANES, VER)` y POST → `exigirPermiso(PLANES, CREAR)`; `planes/[id]` PATCH → `exigirPermiso(PLANES, EDITAR)`; `usuarios` GET → `exigirPermiso(USUARIOS, VER)` y POST → `exigirSocio`; `tasa-cambio` GET y `tasa-cambio/historial` GET → `exigirSesion` (SUP-S01-015); `checkin` POST, `kiosco/estado` GET, `kiosco/vitrina` GET y `kiosco/vitrina/eventos` GET → `exigirKiosco`; las tres rutas de `auth` son públicas. Los casos de uso con permiso propio son `CrearMiembro` (MIEMBROS, CREAR), `ActualizarMiembro` (MIEMBROS, EDITAR), `ListarMiembros` (MIEMBROS, VER), `CrearPlan` (PLANES, CREAR), `ActualizarPlan` (PLANES, EDITAR), `ListarPagos` (PAGOS, VER) y `ListarUsuariosAdmin` (USUARIOS, VER). Las acciones conservan su control actual (`usuario.rol !== "SOCIO"` pasa a `exigirSocio`; `puedeEditarKiosko` se conserva) y llaman a una guarda.
- Dependencias nuevas, justificadas en 5.3: `zod` (directa, 4.6.4) y `typescript` 5.9.3 en la raíz (de desarrollo, ya instalada por las apps).
- Los criterios e2e e integrados que usan Docker los ejecuta el propietario o el CI.

### 5.2 Migración
- Enmienda a S-22 (que permanece aprobada): sus recuentos de 25 tablas y 14 enums, y REQ-S22-004 para `apiKey`, valen al terminar S-22; S-01 los cambia a 26 y 15 y reemplaza `apiKey` por `apiKeyHash` y `apiKeyPrefijo`. Se registra en la sección «Enmiendas posteriores» de S-22 al aprobarse S-01.
- Enmienda a S-00: `tools/verificar-repo.mjs` agrega la regla de versión exacta para `zod` y `.env.example` agrega `KIOSCO_ORIGENES_PERMITIDOS`.
- No hay datos que migrar: el baseline se genera en S-15. El esquema cambia en TypeScript: la columna `apiKey` de `Sucursal` pasa a `apiKeyHash` y `apiKeyPrefijo`, y se agrega la tabla `IntentoLogin` con el enum del resultado. Mientras tanto la base se crea con `drizzle-kit push` (S-22).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit que se puede revertir en orden inverso.

### 5.3 Riesgos
- La IP real depende del proxy: si `X-Forwarded-For` puede ser falsificado por el cliente, un atacante rota la IP y evita el límite por clave. Mitigación: SUP-S01-003 y la cuenta por correo con otra IP no ayuda al atacante; el despliegue (S-17) debe fijar el proxy de confianza.
- El límite por correo e IP permite bloquear a un usuario legítimo desde una IP ajena solo en esa IP; no bloquea su cuenta. Es deliberado.
- La CSP con `'unsafe-inline'` en scripts es débil; se endurece con nonces después (SUP-S01-007).
- El test de contrato comprueba que la guarda aparezca, no que preceda a los accesos a datos (SUP-S01-010); la revisión de código cubre el orden.
- `IntentoLogin` crece sin límite: la retención llega con S-17.
- Convertir las 12 rutas con sesión y las 54 acciones a las guardas comunes es un cambio mecánico en 14 archivos de acciones y 12 rutas; el riesgo es cambiar un permiso sin querer. Mitigación: la guarda `exigirSocio` reproduce el `usuario.rol !== "SOCIO"` actual y la suite de contrato de S-22 no cubre acciones, por lo que cada conversión conserva el mensaje de error existente.
- La IP queda en el último valor de `X-Forwarded-For` (SUP-S01-003): si el despliegue no tiene un proxy que lo añada, todas las peticiones comparten la clave «desconocida» y un atacante puede bloquear el login de un correo para todos; S-17 debe fijar el proxy. Un atacante distribuido contra un solo correo no se detiene con la clave correo más IP (SUP-S01-016).
- La cola de pendientes del kiosco descartaba los check-ins ante un 401; REQ-S01-028 lo corrige, pero un kiosco con clave vieja acumulará pendientes hasta que se reconfigure.
- Aplicar la tabla de permisos puede bloquear a roles que hoy acceden por falta de control (SUP-S01-017).
- El cambio de 25 a 26 tablas y de 14 a 15 enums (`IntentoLogin` y su enum) hace que los recuentos de S-22 (REQ-S22-016, BEH-S22-008 y AC-S22-014) valgan al terminar S-22 y se actualicen al terminar S-01; la columna `apiKey` generada por la aplicación (REQ-S22-004) pasa a `apiKeyHash`.
- `typescript` en la raíz es una excepción a ADR-016 §8: herramientas sin dependencias nuevas; no suma paquetes porque ya está en el lockfile.
- La compatibilidad con los orígenes de los APK de ADR-021 (Capacitor) no se ha verificado; con la variable vacía el CORS falla cerrado y el kiosco en TV deja de conectar hasta que S-21 fije su origen.
- Las dos rutas de login se reducen a un solo caso de uso: puede cambiar mensajes de error que el panel muestra; el mensaje único se conserva (SUP-S01-013).
- Los kioscos desplegados dejan de autenticar cuando se rota la clave (SUP-S01-006).
- Dependencia nueva: `zod`, porque ADR-012 §5 pide validar con esquema y escribir las comprobaciones a mano repetiría el código de 11 rutas; ya está en el lockfile como transitiva, de modo que no suma paquetes nuevos al árbol.

### 5.4 Preguntas abiertas
- ¿Se valida también con `zod` el argumento de las 54 server actions? Default: no en S-01; cada spec que reescribe una acción lo hace.
- ¿Rotar la contraseña de un usuario también debe cerrar sus otras sesiones? Default: no entra en S-01.
- ¿Se agrega retraso uniforme en el login para igualar el tiempo entre usuario inexistente y contraseña incorrecta? Default: no entra en S-01.
- ¿Se conserva el nombre de la variable `KIOSCO_ORIGENES_PERMITIDOS`? Default: sí.
- ¿Confirmas las tres desviaciones de ADR-012 de SUP-S01-014 y SUP-S01-016 (permiso en 7 casos de uso y guardas en la frontera para el resto, `exigirSesion` suficiente para el test, sin retroceso exponencial ni tope por correo o IP)? Default: sí; si no, se enmienda ADR-012 o la spec.

## Revisión independiente

### Veredicto de `spec-reviewer` (texto íntegro, sin editar; sobre la primera versión en revisión)

REVISIÓN INDEPENDIENTE — S-01 `/home/user/adhara-fit/docs/superpowers/specs/S-01-baseline-de-seguridad.md` (solo lectura)

Alcance de mi revisión: leí la spec completa, `_plantilla-spec.md` (solo la cabecera), ADR-001, 012, 016, 018, 019, 022 (completos), S-22 (completa, incluida su revisión) y S-00 (con búsquedas dirigidas). Contrasté la sección 0.4 con el clon `/home/user/kaiserone01/gym-app` leyendo archivos y con Grep/Glob. No pude ejecutar `node tools/spec-lint.mjs` ni ningún comando: esta sesión no tiene Bash. Tampoco pude confirmar el commit `b4352a0` con `git rev-parse` (no hay Bash). Los recuentos que hago abajo salen de Glob/Grep, no de `find`/`grep -c` por shell.

**Resultado de la verificación de 0.4 contra el Repo A**
- Confirmados:
  - Rutas de login: `login/route.ts:32-33`, `login/sucursal/route.ts:30-31`, cookie `login/route.ts:83-86`.
  - `IniciarSesion.ts:37,:43` y `ValidarSesion.ts:22,:27`.
  - `PrismaUsuarioAdminRepository.ts:56-61`, `ActualizarUsuarioAdmin.ts:38` y `ISesionRepository.ts:4-6`.
  - `Sucursal.apiKey` en `schema.prisma:47`, `KioskTokenValidator.ts:9`, `FormularioSucursal.tsx:37-38,76-82`, `kiosk/lib/config.ts:10-11` y `kiosk/lib/api.ts:54`.
  - CORS `*` en `kiosco.ts:15-19` y lectura de la clave en `:32-35`.
  - Las 19 rutas (Glob), 3 de auth, 4 de kiosco y 12 con sesión. Solo `en-sala/route.ts` tiene `tienePermiso` (2 coincidencias).
  - 54 acciones en 14 archivos (Grep `^export async function`).
  - 87 archivos en `use-cases`, 19 de prueba y 68 casos de uso. 19 contienen `tienePermiso` o `puedeCrearUsuarioConRol`, luego 49 no. Los 7 que nombra ADR-012 §4 están entre los 49.
  - Líneas citadas: `usuarios/actions.ts:96,167,203,236`, `configuraciones/actions.ts:62,102,146,169-170`, `planes/actions.ts:50,91`, `miembros/actions.ts:109,256`.
  - Cuerpos JSON en 9 rutas, `searchParams` en 6 rutas y 2 ids de ruta. La unión de entradas no retiradas da 11 rutas.
  - `RegistroAuditoria` con `usuarioId` obligatorio (`schema.prisma:582-593`).
  - `zod` 4.6.4 solo transitivo en el lockfile (`package-lock.json:10865-10867`) y ningún `package.json` lo declara.
  - Sin `middleware`, `proxy` ni `robots`, y `next.config.ts` sin `headers()`.
  - Sin pruebas de `IniciarSesion`, `ValidarSesion` ni `CerrarSesion`.
- Discrepancias u omisiones del clon (ver filas 5 y 11): ninguna cifra es falsa, pero 0.4 omite varias cosas que afectan al diseño.

| # | Comprobación | Veredicto | Evidencia (archivo:línea) | Qué corregir |
|---|---|---|---|---|
| 1 | Cabecera completa; ADRs citados existentes y aceptados | NO CUMPLE (menor) | Cabecera S-01:1-8 con `aprobada_por` y `fecha_aprobacion` vacíos, correcto para `en-revision`. ADR-012, ADR-016 y ADR-022 existen y están aceptados (ADR-012:3, ADR-016:3, ADR-022:3). S-01:30 y REQ-S01-015 (S-01:162) dependen de **ADR-003, que sigue *propuesto*** (ADR-003:3). También usan ADR-018 (aceptado) y el CORS de ADR-021 (aceptado), y ninguno figura en `adrs:`. | Añadir ADR-018 y ADR-021 a `adrs:`. Declarar la dependencia de ADR-003 en un SUP, como hizo S-22 con SUP-S22-013. Si ADR-003 no se acepta, `tasa-cambio*`, `registrarTasaManualAction` y `RegistrarTasaManual` sobreviven y habría que protegerlos. CLAUDE.md §3 prohíbe revisar una spec que depende de un ADR propuesto. Decisión del propietario. |
| 2 | Cada REQ: una obligación, EARS, prioridad y origen | NO CUMPLE | Todos tienen tipo, MUST y origen. Compuestos: REQ-S01-020 (S-01:188-192, cabecera `X-Robots-Tag` **y** servir `/robots.txt`), REQ-S01-010 (:128-132, generar 32 bytes **e** invalidar la anterior), REQ-S01-015 (:158-162, dos listas distintas), REQ-S01-018 (:176-180, cuatro cabeceras) y REQ-S01-025 (:218-222, cuatro conjuntos de pruebas). **REQ-S01-007** (:110-114) dice «verificar la contraseña como máximo 5 veces por clave en cualquier ventana de 15 minutos». Es falsa: los aciertos también verifican y no cuentan como fallo (SUP-S01-002, :58), de modo que una clave con 4 fallos y N aciertos supera 5 verificaciones. INV-S01-002 (:395-399) solo cuenta fallos. REQ-S01-015 dice «cada uno con la spec que lo elimina» pero no nombra ninguna. | Dividir 020, 010 y 015. Reformular REQ-007 como «como máximo 5 verificaciones fallidas por clave y ventana», que es lo que prueba BEH/AC-006. Nombrar en REQ-015 la spec que elimina cada pieza (S-08 y S-10 son las candidatas, no verificadas). |
| 3 | Cobertura REQ→BEH→AC, INV enlazados; hay BEH feliz, borde, error y concurrencia | CUMPLE (con observaciones) | Los 25 REQ tienen ≥1 BEH y todos son MUST con ≥1 AC. Los 7 INV tienen mecanismo, detección y AC (INV-001→AC-002/003, 002→AC-006, 003→AC-007, 004→AC-007/010, 005→AC-012, 006→AC-011, 007→AC-015). Categorías presentes: feliz (BEH-003, 005, 009, 010, 015, 020, 023), borde (006, 008, 017, 019, 021), error (001, 002, 004, 011, 012, 014, 016, 018, 022) y concurrencia (007, 013). Observaciones: (a) **INV-S01-001** (:389-393) dice «ninguna sesión pertenece a un usuario inactivo», pero BEH/AC-002 construyen a propósito esa violación con una escritura directa. La propiedad solo vale tras el caso de uso. (b) INV-S01-002 (:398) detecta con «ventanas de 15 minutos», que es una agrupación por cubos fijos y no una ventana deslizante (SUP-S01-001), así que puede dar falsos positivos y negativos. (c) INV-S01-007 (:425-429) se rotula `test-propiedad` y es una muestra de 4 rutas. (d) BEH-S01-012 (:310-315) dice «el mismo mensaje que cuando la cabecera falta de otra forma»: el texto no se entiende, y hoy los mensajes difieren (`kiosco.ts:33` frente a `:36`). | Reescribir el alcance de INV-001 («tras Actualizar o Eliminar»). Definir la detección de INV-002 con la ventana deslizante. Corregir BEH-012 (decidir si «falta la cabecera» y «clave inválida» comparten mensaje; REQ-024 solo cubre la inválida). Rotular INV-007 como muestra. |
| 4 | Cada AC es binario, con método y resultado, y enlaza REQ/BEH/INV existentes | NO CUMPLE | Todos tienen método, procedimiento y esperado, y los enlaces existen. Problemas: **AC-S01-012** (:510-515) exige que pase «sobre el árbol final (19 rutas y 54 acciones)». S-01 añade al menos una acción (rotar la clave), luego serán ≥55, y la cifra se rompe. **AC-S01-014** (:524-529) usa «la comprobación de versiones fijadas de `tools/verificar-repo.mjs`», pero S-00 solo fija gitleaks y PostgreSQL (S-00:21 y :257); no valida paquetes npm. S-22 creó la suya (REQ-S22-021, `tools/verificar-drizzle.mjs`). AC-S01-013 (:517-522) no define la forma de «la lista de campos inválidos». AC-S01-004 y AC-S01-005 usan la ventana pero no fijan el valor de `Retry-After`. AC-S01-015 (:531-536) con `NODE_ENV=development` no dice si la CSP se aplica en desarrollo. | Contar acciones sin cifra fija, o la cifra real tras S-01. Nombrar la herramienta que fija `zod` (extender `verificar-repo.mjs` y declararlo en 0.2, o ampliar `verificar-drizzle.mjs`). Fijar el formato del 400 (por ejemplo `{error, campos:[{campo, mensaje}]}`) y el cálculo de `Retry-After` en un AC. |
| 5 | Afirmaciones sobre el código con archivo:línea o «no verificado»; supuestos con default | CUMPLE (con huecos, véase fila 11) | 0.4 es verificable y casi toda correcta (ver arriba). Todos los SUP llevan «Default:» y «asumido, por validar». Detalles: SUP-S01-010 (:66) afirma que «la API de TypeScript que el repositorio ya trae» sirve para `tools/`, sin cita. `typescript` está solo como `^5` en `apps/*/package.json` (`web-admin/package.json:34`, `kiosk/package.json:27`, `vitrina/package.json:29`), no en la raíz, y ADR-016 §8 exige herramientas sin dependencias. SUP-S01-012 (:68) fija «hasta 64 caracteres, letras, dígitos y guion» sin cita. La numeración SUP-013/014 está invertida (:69-70). | Citar `typescript` con su `package.json` y registrar la excepción a ADR-016 §8, como hizo SUP-S22-015 para `pg`, o marcar «no verificado». Justificar el 64 de SUP-012 con el UUID de S-22 (36). Ordenar SUP-013/014. |
| 6 | Sin «TBD», «por definir», «etc.» ni adjetivos sin medida; sin dependencias nuevas sin justificar; sin nada fuera de alcance | CUMPLE (con reservas) | Grep sin coincidencias de `TBD`, `por definir` ni `etc.`. Una sola vez «la adecuada» (SUP-S01-010, :66). `zod` justificada en 5.3 (:581) y fijada en 4.6.4 (SUP-S01-011). Reservas de dependencias: `typescript` usada por `tools/` (fila 5). | Quitar «la adecuada» (:66) o medirla. Ver fila 10 para el alcance. |
| 7 | Contradicciones con ADR-012, 016, 022, 001, 018, 019 y con S-00 y S-22 aprobadas | NO CUMPLE | **(a) ADR-012 §4** (ADR-012:19) exige que el test de contrato falle si una ruta o acción «no declara permiso». S-01 acepta `exigirSesion` como guarda suficiente (REQ-S01-014, :152-156; SUP-S01-010, :66), así que una ruta con solo sesión pasa. No figura como desviación en 0.5. **(b) Criterio 2 de ADR-012** (ADR-012:17) pide «backoff y registro de auditoría» y «documentar cómo moverla a Redis». SUP-S01-001 (:57) descarta el backoff sin declararlo como desviación, y no hay ningún REQ ni entrega que documente la ruta a Redis. **(c) SUP-S01-014** (:69) declara bien la desviación de ADR-012 §4 (7 casos de uso de 49) y exige confirmación del propietario: sigue pendiente. **(d) S-22:** REQ-S22-016, BEH-S22-008 y AC-S22-014 cuentan «25 tablas» y 14 enums (S-22:170, :312, :589). S-01 añade `IntentoLogin` y un enum, así que esos criterios dejan de cumplirse. REQ-S22-029 permite en `packages/db` solo `package.json`, `drizzle.config.ts` y `src/` (compatible). REQ-S22-004 (apiKey con valor generado) se reemplaza por `apiKeyHash`. S-01 no enmienda nada de S-22. **(e) S-00:** `.env.example` y `verificar-env.mjs` (REQ-S00-006) sí aplican a REQ-S01-023. ADR-001, 018 y 019: sin conflicto. | Declarar (a) y (b) como desviaciones con motivo y pedir confirmación del propietario. Añadir el entregable de la ruta a Redis. Añadir una enmienda explícita a S-22 (de 25 a 26 tablas y de 14 a 15 enums, y fin de `apiKey` por defecto de la aplicación). |
| 8 | Cobertura de los 10 criterios de ADR-012: cuáles cubre y cuáles delega, y si la delegación es correcta | CUMPLE (con reservas) | **1** cubierto (REQ-001 a 004). **2** cubierto en parte: límite y tabla sí (REQ-005 a 007), pero sin backoff y sin la ruta a Redis (fila 7b). **3** cubierto (REQ-008 a 011, 024), pero véase fila 11 sobre `buscarPorApiKey`. **4** cubierto en parte (fila 7a y c). **5** cubierto para rutas (REQ-016, 11 rutas); las acciones se delegan (S-01:29), compatible con ADR-012 §5 («cuerpo de toda ruta»). **6** delegado a S-15 (propuesta, no existe aún); el seed sale del árbol por S-00 (ver S-22:30), así que no entran contraseñas fijas mientras tanto: delegación correcta. **7** delegado a S-00 (gitleaks, `.env.example`, cookies y keystore ya cubiertos en S-00): correcto. **8** cubierto (REQ-018 a 020). **9** delegado a S-00 (scripts excluidos); lo de `--confirm` y `DATABASE_URL` no productiva lo cubre S-22 REQ-022 para `drizzle-kit`: correcto. **10** cubierto (REQ-021, 022 y SUP-008). | Mantener las delegaciones 6, 7 y 9. Cerrar 2 y 4 como indican las filas 7 y 12. Anotar que 6 depende de que exista S-15. |
| 9 | Seguridad del propio diseño (límite de intentos, hash, CSP, CORS) | NO CUMPLE | **IP falsificable.** SUP-S01-003 (:59) toma el **primer** valor de `X-Forwarded-For`. Con un proxy que *añade* a la cabecera, el primer valor lo controla el cliente: el atacante rota la IP para eludir el límite y, a la inversa, bloquea a un usuario legítimo fijando la IP de la víctima (cinco fallos con su correo e IP). 5.3 (:573) lo reconoce a medias, pero el default adoptado es el explotable. **Cobertura del límite.** La clave es correo+IP (SUP-002), así que ni un ataque distribuido contra un solo correo ni la rotación de correos desde una IP están limitados. El texto de 5.3 «la cuenta por correo con otra IP no ayuda al atacante» es confuso o incorrecto. **Crecimiento.** Cada intento, incluidos los bloqueados, escribe una fila (REQ-005) y toma un candado. Un flujo ilimitado de peticiones infla `IntentoLogin` y la retención queda para S-17 (:577). **Sin tope de longitud.** REQ-016 no fija máximos para correo ni contraseña, y la clave del límite es el correo. **CSP.** SUP-S01-007 (:63) no admite `fonts.googleapis.com` ni `fonts.gstatic.com`, pero `web-admin/app/layout.tsx:22-25` los carga: la política rompería las fuentes (`default-src 'self'` cubre `font-src` y `style-src` no lo permite). Tampoco contempla `'unsafe-eval'` de Next en desarrollo ni `blob:` en `img-src` (visor/recorte de fotos, no verificado). **CORS.** Falta `Vary: Origin` al devolver el `Origin` dinámico (REQ-021). **Hash.** Bien justificado: SHA-256 de 256 bits de entropía con búsqueda por índice único (SUP-005). Prefijo de 8 caracteres de la clave en claro (48 bits): aceptable. **bcrypt** con claves largas: no verificado, correctamente declarado (:54). | (1) Cambiar el default de IP a la dirección más a la derecha confiable (o el N-ésimo desde la derecha) y exigir en S-17 que el proxy sobrescriba la cabecera; o ignorar `X-Forwarded-For` hasta entonces. (2) Valorar un tope por correo (sin IP) y/o por IP, o documentar el riesgo aceptado. (3) No insertar filas `bloqueado` repetidas, o limitarlas, y fijar longitudes máximas en los esquemas de login. (4) Ajustar la CSP: `style-src` y `font-src` con los dos orígenes de Google (o autoalojar las fuentes), `'unsafe-eval'` solo en desarrollo, y comprobar `blob:`. (5) Añadir `Vary: Origin`. |
| 10 | Alcance: ¿hace algo que corresponde a otra spec? | CUMPLE (con reservas) | 0.3 delega bien (S-00, S-15, S-21, S-18, S-05). Reservas: (a) La spec no menciona los **7 llamadores en páginas** de los casos de uso que cambian de firma (`miembros/page.tsx:26`, `pagos/nuevo/page.tsx:20`, `caja/page.tsx:97`, `miembros/[id]/page.tsx:54`, `miembros/[id]/pagos/page.tsx:63`, `usuarios/page.tsx:27`), ni cómo muestran el error de permiso. (b) Añadir `actor` y la comprobación en `CrearMiembro` y similares exige cambiar sus 14 llamadores (acciones y rutas). (c) El panel debe mostrar la clave una sola vez, pero `crearSucursalAction` termina en `redirect(...)` (`sucursales/actions.ts:61`), así que «devolver la clave en la respuesta» (REQ-S01-009) no encaja con el flujo actual y falta el diseño de la pantalla. | Añadir a 0.2 y 5.1 los llamadores en páginas y el diseño de «mostrar una sola vez» (estado de la acción o cookie efímera). Nada que quitar del alcance. |
| 11 | Hechos de 0.4 incompletos que afectan al diseño | NO CUMPLE | (a) **Las 4 rutas con CORS exportan `OPTIONS`** (`checkin/route.ts:16`, `kiosco/estado/route.ts:7`, `kiosco/vitrina/route.ts:12`, `eventos/route.ts:11`). Un preflight no lleva la clave, así que no puede llamar a `exigirKiosco`. REQ-S01-014/015 solo permiten tres rutas públicas y cuatro retiros, y SUP-S01-009 (:65) habla de un marcador `acceso = "publico"` que REQ-015 contradice. El test de contrato fallaría en esos manejadores. (b) `PrismaUsuarioAdminRepository.eliminar` **ya** borra las sesiones dentro de una transacción (`PrismaUsuarioAdminRepository.ts:83-88`); 0.4 (:39) dice solo «borrado físico». REQ-004 en la rama de eliminar ya se cumple. (c) Hay un segundo camino con la clave en claro: `ISucursalRepository.buscarPorApiKey` (`PrismaSucursalRepository.ts:35-36`) y `Sucursal.apiKey` en la entidad (`Sucursal.ts:8`) y en `KioskTokenValidator.ts:19`; también `sucursales/[id]/page.tsx:56`. Quitar la columna rompe todos ellos y la spec no los enumera. (d) `ActualizarUsuarioAdmin` recibe solo `{ usuarios }` (`ActualizarUsuarioAdmin.ts:24`) y el dominio no abre transacciones. **REQ-S01-004** («en la misma transacción») y BEH/AC-004 no son implementables sin definir el mecanismo (método compuesto del repositorio o unidad de trabajo). 5.1 solo menciona `eliminarPorUsuarioId`. Lo mismo para el límite de intentos: ¿qué puerto contiene el candado asesor? (e) La cola de pendientes del kiosco **descarta** cualquier check-in que reciba una respuesta del servidor, 401 incluido (`kiosk/lib/reintentarPendientes.ts:27-30`, `kiosk/lib/api.ts:64-65`). Tras rotar la clave (SUP-S01-006) se pierden los check-ins sin enviar. (f) Los casos de uso protegidos «solo en la frontera» usan también `puedeEditarKiosko(rol)` (`kiosko/actions.ts:23-26`, `vitrina/actions.ts:30-33`), que 0.4 (:47) no menciona. | (a) Eximir explícitamente los manejadores `OPTIONS` de kiosco (o un marcador) en REQ-015. (b) Corregir 0.4 y limitar REQ-004 a la desactivación o añadir la prueba. (c) Enumerar en 0.2 y 5.1 los archivos de la clave en claro. (d) Definir el puerto y el límite transaccional en 5.1. (e) Añadir como riesgo (5.3) el descarte de pendientes y decidir (no descartar en 401). (f) Completar 0.4. |
| 12 | REQ de permisos: ¿qué permiso exige cada caso de uso? | NO CUMPLE | REQ-S01-012 (:140-144) exige «el permiso» en 7 casos de uso sin decir cuál. Solo `PLANES CREAR` (BEH-014), `MIEMBROS VER` y `PAGOS VER` (BEH-015) aparecen. Faltan `ActualizarMiembro`, `ActualizarPlan`, `ListarPagos`, `ListarUsuariosAdmin` y `CrearMiembro`. Las 11 rutas con sesión que no pasan por esos casos (`foto-proxy`, `en-sala/historial`, etc.) quedan con `exigirSesion` y ningún REQ dice qué permiso necesitan, aunque ADR-012 §4 (:19) las nombra (`api/foto-proxy`, `api/caja/ultimo-cierre`). Además `registrarTasaManualAction` y las dos rutas `tasa-cambio*` y `caja/ultimo-cierre` quedan **sin protección alguna** hasta que otra spec las retire, cuando una línea `exigirSesion` las cerraría hoy. | Añadir una tabla módulo/acción por caso de uso y por ruta. Proteger con `exigirSesion` o `exigirPermiso` también las piezas de retiro programado en vez de eximirlas, o justificar por qué no. |
| 13 | Riesgos y dependencias nuevas justificadas | CUMPLE (con reservas) | 5.3 (:572-581) justifica `zod` (ya en el lockfile como transitiva, 4.6.4) y recoge IP, CSP débil, orden de la guarda y crecimiento de la tabla. Faltan: el descarte de pendientes del kiosco (fila 11e), la dependencia de `typescript` en `tools/` (fila 5), el cambio de 25 a 26 tablas en S-22 (fila 7d) y la compatibilidad con el origen de las APK de ADR-021 (los TV usan Capacitor; SUP-008 falla cerrada y el origen «no verificado», S-01:54). | Añadir esos cuatro riesgos a 5.3. |

**Preguntas para el propietario (condicionan las filas 1, 7 y 12)**
1. ¿Confirma que S-01 se aparte de ADR-012 §4 solo en los 7 casos de uso (SUP-S01-014) y que un `exigirSesion` basta para que el test de contrato pase? Hoy es un debilitamiento de lo que fija ADR-012 §4 y ADR-016 §3.
2. ¿Acepta descartar el backoff y no documentar la ruta a Redis en el criterio 2 de ADR-012?
3. ¿Se acepta ADR-003 antes de revisar de nuevo? Si no, S-01 debe proteger las piezas de tasa en vez de eximirlas.

**Lo que no pude verificar**
- Salida de `spec-lint`.
- El commit exacto del clon (`b4352a0`).
- Si `typescript` está accesible desde `tools/` por hoisting.
- Si el visor de fotos necesita `blob:` en `img-src`.
- El comportamiento real del despliegue con `X-Forwarded-For` (la spec también lo declara «no verificado»).

VEREDICTO GLOBAL: Requiere cambios (no Bloqueada; las tres preguntas anteriores las decide el propietario). Prioridad: (1) fila 9, la IP falsificable y la CSP que rompe las fuentes; (2) fila 11a, los manejadores `OPTIONS` hacen fallar el test de contrato; (3) fila 7, desviaciones de ADR-012 §4 y del criterio 2 no declaradas; (4) fila 11d y 12, el mecanismo transaccional y la tabla de permisos; (5) fila 2, REQ-007 falsa y REQ compuestos; (6) fila 4, AC-012 y AC-014 no reproducibles.

### Conciliación del autor
Verifiqué cada hallazgo contra el clon (y contra el lockfile) antes de corregir. **Todos eran ciertos**; ninguno se rechazó. Dos matices: el revisor habla de 7 páginas llamadoras y el clon da 6 páginas (más 2 archivos de acciones y 6 rutas, 14 archivos); y el revisor no pudo ejecutar `spec-lint`, que yo ejecuté tras las correcciones (0 errores, 0 avisos).

| Hallazgo | Corrección |
|---|---|
| Fila 1 (ADR-018, ADR-021, ADR-003) | `adrs:` ampliado; SUP-S01-015: S-01 no depende de ADR-003 porque protege las piezas de tasa con `exigirSesion` |
| Fila 2 (REQ compuestos; REQ-007 falsa) | REQ-007 reformulado (fallos); REQ-010, 015, 018, 020 y 025 reescritos y divididos; REQ-030 nuevo para `robots.txt` |
| Fila 3 (INV y BEH-012) | INV-001, 002 y 007 reescritos; BEH-012 con los dos mensajes reales |
| Fila 4 (AC) | AC-004, 005, 006, 012, 013, 014 y 015 reescritos: `Retry-After` numérico, formato del 400, sin cifra fija de acciones, regla de versión exacta en `verificar-repo.mjs`, CSP de desarrollo |
| Fila 5 (supuestos) | `typescript` 5.9.3 citado y declarada excepción a ADR-016 §8; SUP-012 con el UUID de 36; SUP-013/014 ordenados |
| Fila 6 («la adecuada») | Retirada |
| Fila 7 (desviaciones) | SUP-014 amplía (`exigirSesion` basta); SUP-016 declara sin backoff ni tope por correo o IP; REQ-027 documenta la ruta a Redis; enmienda de S-22 (26 tablas, 15 enums, fin del `apiKey` por defecto) en 5.2 |
| Fila 9 (diseño de seguridad) | IP = último valor de `X-Forwarded-For`; límite de longitud (REQ-033); un solo bloqueado por clave y minuto (REQ-026); CSP con los dos orígenes de Google, `blob:` y `'unsafe-eval'` solo en desarrollo; `Vary: Origin` en REQ-021 |
| Fila 10 (llamadores y clave una vez) | 0.2 y 5.1 enumeran los 14 llamadores y el flujo de mostrar la clave una vez (BEH-026, AC-021) |
| Fila 11 (a-f) | `OPTIONS` eximidos (REQ-032); 0.4 corregido para `eliminar`; archivos de la clave en claro enumerados; puertos transaccionales definidos en 5.1; cola de pendientes del kiosco (REQ-028); `puedeEditarKiosko` citado |
| Fila 12 (permisos) | Tabla de permisos por ruta y método en 5.1 (REQ-029, AC-019) y por caso de uso; las piezas de retiro llevan guarda en vez de excepción |
| Fila 13 (riesgos) | 5 riesgos agregados a 5.3 |

Tras las correcciones S-01 pasó de 25 a 33 REQ, de 23 a 29 BEH, de 18 a 22 AC (7 INV). El propietario confirmó las desviaciones de ADR-012 (SUP-S01-014 y SUP-S01-016) y escribió «S-01 aprobada» el 2026-11-12; la spec pasó a `aprobada`.

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de S-04. El texto anterior se conserva; donde choca, rige esta sección.*
- Recuentos: por la aprobación de S-04, `ReglaAbonoPorFrecuencia` desaparece; tras S-04 el esquema tiene 25 tablas y 15 enums (S-01 había fijado 26 y 15).
- Por la aprobación de S-05 (sede única): el login es de un solo paso y desaparece la ruta `auth/login/sucursal`. REQ-S01-002 y AC-S01-001 hablan de una sola ruta de login; REQ-S01-015 y AC-S01-012 fijan como únicas rutas públicas `auth/login` y `auth/logout`; REQ-S01-016 y AC-S01-013 pasan de 11 a 10 rutas con entrada; REQ-S01-033 y BEH-S01-001 pierden el segundo paso de login.
- Por la aprobación de S-05: la clave de API del kiosco ya no se crea desde un panel de sucursales; la crea el seed (S-15) y el panel solo la rota, desde la pantalla de configuración del kiosco, con `exigirSocio`. Afecta a REQ-S01-008 («la clave de la sede única»), REQ-S01-009 a REQ-S01-011, BEH-S01-009 a BEH-S01-013, BEH-S01-026, AC-S01-007 a AC-S01-010, AC-S01-021 e INV-S01-004; el permiso `SUCURSALES` deja de existir, de modo que los casos con «GERENTE con SUCURSALES EDITAR» pasan a «GERENTE sin permiso de rotación», y el paso del panel de sucursales de 5.1 pasa a la pantalla del kiosco.
- Recuentos por S-05: tras S-05 el esquema tiene 23 tablas y 15 enums (se retiran `Organizacion`, `TemaOrganizacion` y `UsuarioSucursal` y se agrega `ConfiguracionNegocio`).
- Por la aprobación de S-06 (documento de identidad): sin cambio de texto en REQ-S01-016, que no define el cuerpo de cada ruta; los esquemas `zod` de `api/checkin` (`{ identificador }`, texto de hasta 20 caracteres) y de `api/miembros` (`tipoDocumento` y `numeroDocumento`, sin `cedula`) se escriben con los campos de S-06 al implementarse.
- Por la aprobación de S-08 (registro continuo de cobros): la ruta `caja/ultimo-cierre` desaparece, de modo que la tabla de permisos por ruta de 5.1, REQ-S01-029 y su criterio de aceptación pierden esa fila; los demás usos de `CAJA` en la tabla pasan a `PAGOS`, porque el valor `CAJA` de `ModuloPermiso` se retira.
- Por la aprobación de S-09 (eliminar miembro): REQ-S01-012 (permisos en los casos de uso), REQ-S01-029 (tabla de permisos) y REQ-S01-014 (guarda en cada acción) suman `eliminarMiembro` y `restaurarMiembro` con `MIEMBROS ELIMINAR`; REQ-S01-016 exige que el `PATCH` de `api/miembros/[id]` rechace con 400 los campos fuera de su lista, incluidos `activo` y `estado`.
- Por la aprobación de S-18: AC-S01-019 deja de crear un usuario de rol `ENTRENADOR`; REQ-S01-029, REQ-S01-031 y la tabla de contrato de permisos agregan los casos de uso y las acciones de entrenadores (`USUARIOS CREAR`, `USUARIOS EDITAR` y `USUARIOS VER`) a las listas cerradas; H-07 queda cerrado para los entrenadores.
- Por la aprobación de S-23: REQ-S01-011, REQ-S01-012, REQ-S01-014 y REQ-S01-029 se leen con «sesión válida de un administrador activo» (cualquier administrador rota la clave del kiosco); las guardas `exigirPermiso` y `exigirSocio` desaparecen (SUP-S01-009); `tools/contrato-permisos.mjs` clasifica las rutas en tres clases (pública, clave de kiosco, sesión); AC-S01-019 y SUP-S01-019 quedan cumplidos.
- Por la aprobación de S-15: la clave inicial del kiosco la crea el seed (`db:sembrar`) con la misma función de generación de la rotación, y se imprime una sola vez.
