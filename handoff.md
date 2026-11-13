# Handoff — Adhara Fit

Bitácora de sesiones: la más reciente arriba, solo se añaden entradas. El historial del diseño (puertas G0–G6, estado de cada ADR y spec, intentos fallidos) está en `docs/historial/handoff-diseno.md`.

## Estado resumido
- **Qué es:** sistema web interno de un gimnasio en Perú (PEN, un local). Base: código del Repo A importado (S-00). Modo ágil desde 2026-11-13: ver `CLAUDE.md` y `docs/superpowers/plans/2026-11-13-ruta-agil.md`.
- **Referencia de qué construir:** ADR-001 a 022 (decisiones de arquitectura) y specs S-00 a S-15, S-17, S-18, S-19, S-22 y S-23 aprobadas. S-20 (vitrina de TV) y S-21 (check-in en smart-TV) siguen en revisión; sus hallazgos están en `docs/superpowers/revisiones-pendientes/`.
- **Desplegado:** provisional en Easypanel (`docs/ops/easypanel.md`): imagen del `Dockerfile`, esquema con `prisma db push` al arrancar, alta del primer administrador con `tools/crear-administrador.mjs`.
- **Preferencia del propietario:** cada código (ADR-nnn, S-nn, REQ…) que se mencione lleva al lado una descripción simple.

## Sesión 2026-11-13 (diseño, rama de diseño) — Rediseño del login
**Qué se hizo**
- `apps/web-admin/app/login/page.tsx` queda en 3 líneas y renderiza `components/auth/LoginExperience.tsx`. Nuevos componentes en `apps/web-admin/components/auth/`: fondo con zoom lento y parallax, franjas diagonales y destellos, tarjeta de cristal, panel de marca, formulario (estados normal/cargando/éxito/error con vibración), indicador «Acceso seguro» y `login.css`.
- La lógica del login (dos pasos, `/api/auth/login` y `/api/auth/login/sucursal`) se movió sin cambios de contrato a `useLoginFlow.ts`; solo se añadió `try/catch` por si falla la red («No se pudo conectar…»).
- Versión mobile: tarjeta apilada (marca arriba, formulario abajo), lema y «Acceso seguro» debajo, campos y botón de 48 px.
- Dependencia nueva: `motion` (en web-admin) para las entradas escalonadas y los estados del botón.
- Respeta `prefers-reduced-motion` (sin zoom, parallax, destellos ni pulso) y solo anima `transform`/`opacity`.

**Qué funcionó**
- `tsc --noEmit` sin errores (tras `next typegen`), eslint sin errores en login, `next build` compila y `/login` responde 200.

**Qué no funcionó / pendiente**
- No se pudo revisar el resultado en el navegador (extensión de Chrome no conectada): falta la revisión visual en desktop y mobile.
- Falta la foto de fondo: debe guardarse como `apps/web-admin/public/branding/login-fondo.webp`; hasta entonces se ve solo el degradado.
- Etiquetas flotantes de la propuesta no se hicieron: se dejaron las etiquetas fijas sobre el campo, como en el mockup.
- Al construir en un clon nuevo hace falta `npm run generate -w @gym-app/db` antes de `next build` (cliente de Prisma no versionado).

**Siguiente**
- Colocar la foto, revisar a ojo (≈1672×941 y ≈390 px) y ajustar polígonos de las franjas y posición del fondo.

## Sesión 2026-11-13 (noche, 4) — Tramo 1: solo soles y hora de Lima
**Qué se hizo**
- Dinero solo en PEN con dos decimales: `packages/domain/utils/formatearSoles.ts` («S/ 1,234.50», con prueba) reemplaza todos los `# Handoff — Adhara Fit

Bitácora de sesiones: la más reciente arriba, solo se añaden entradas. El historial del diseño (puertas G0–G6, estado de cada ADR y spec, intentos fallidos) está en `docs/historial/handoff-diseno.md`.

## Estado resumido
- **Qué es:** sistema web interno de un gimnasio en Perú (PEN, un local). Base: código del Repo A importado (S-00). Modo ágil desde 2026-11-13: ver `CLAUDE.md` y `docs/superpowers/plans/2026-11-13-ruta-agil.md`.
- **Referencia de qué construir:** ADR-001 a 022 (decisiones de arquitectura) y specs S-00 a S-15, S-17, S-18, S-19, S-22 y S-23 aprobadas. S-20 (vitrina de TV) y S-21 (check-in en smart-TV) siguen en revisión; sus hallazgos están en `docs/superpowers/revisiones-pendientes/`.
- **Desplegado:** provisional en Easypanel (`docs/ops/easypanel.md`): imagen del `Dockerfile`, esquema con `prisma db push` al arrancar, alta del primer administrador con `tools/crear-administrador.mjs`.
- **Preferencia del propietario:** cada código (ADR-nnn, S-nn, REQ…) que se mencione lleva al lado una descripción simple.

/`toFixed(2)` del panel; `CurrencyInput` con prefijo «S/».
- Quitado todo el subsistema de tasa de cambio/BCV y bolívares del dominio, la infraestructura, el panel, el check-in y la vitrina (tasa vigente, líneas en Bs, equivalentes, avisos del servidor, `tasaBcvFija`/`tasaActual`). Tipos de método de pago: Efectivo, Billetera digital (Yape/Plin), Tarjeta, Transferencia y Depósito.
- Hora de Lima: `fechaCaracas` pasa a `packages/domain/utils/fechaLima.ts` (UTC-5 fijo, con pruebas); `es-VE` → `es-PE`, `America/Caracas` → `America/Lima` y `TZ=America/Lima` en los Dockerfile.
- Esquema Prisma solo aditivo (valores por defecto, PEN, valores nuevos del enum): las columnas y tablas viejas (`tasaCambio`, `montoBs`, `TasaCambio`, `MiembroReferencia`, `PadronHoja`…) **siguen en la base** y se borran en la línea base (S-15). Las columnas con sufijo USD (`precioUSD`, `costoUSD`…) conservan el nombre pero ya significan soles.
- Verificado: pruebas del dominio (375), check-in (50) y vitrina (65) en verde; `tsc` de web-admin sin errores; lint sin errores; `next build` de web-admin compila.

**Qué no funcionó / pendiente**
- Siguen sin retirar: el padrón de Excel (`configuraciones/excel`, `ActivarMiembroDesdePadron`, `MiembroReferencia`, «Por regularizar»/`vieneDelExcel`, dependencia `xlsx`) y la marca vieja «Adrenalina» en `verificar-autorizacion.ts`, `ThemeStyleTag.tsx` y la vitrina-tv. Es la otra mitad de S-10; va en un commit aparte porque toca el flujo del check-in.
- Los mensajes de error del panel aún tienen voseo («Agregá», «Elegí»): pasar a tuteo.

**Siguiente**
1. Retirar el padrón de Excel y lo «Por regularizar» (S-10) y los restos de «Adrenalina».
2. Tramo 2 de la ruta ágil.
3. Lanzar el workflow `apk` (sigue sin ejecutarse).

## Sesión 2026-11-13 (noche, 3) — Workflow de los APK
**Qué se hizo**
- `.github/workflows/apk.yml` (manual, `workflow_dispatch`): para Check-in y Vitrina hace `npm ci`, build del export estático, `npm run sync` de Capacitor, `gradlew assembleDebug` (Java 21) y sube el APK cifrado con `openssl` (AES-256, `APK_PASSPHRASE`) como artefacto de 14 días. Descifrado y pasos en `apps/checkin-tv/README.md` §3.
- El propietario cargó en GitHub los secrets del repositorio `CHECKIN_CLAVE` y `APK_PASSPHRASE` (no como Environment secrets: el workflow no usa `environment`). **Falta la variable del repositorio `CHECKIN_API_URL`** (Settings → Secrets and variables → Actions → Variables); el workflow falla con mensaje claro si no existe.

**Qué no funcionó / hallazgo**
- `build.gradle` firma con `android/app/debug.keystore`, que no está en el repositorio (`*.keystore` en `.gitignore`; el README decía que sí). El workflow genera una llave nueva en cada ejecución: **cada APK nuevo exige desinstalar el anterior del TV**. Si molesta, la salida es guardar un keystore fijo como secret en base64.
- Sin verificar: el workflow no se ha ejecutado (primer intento pendiente); posibles fallos: licencias/plataforma Android 36 en el runner o el Gradle wrapper.

**Siguiente**
1. Crear la variable `CHECKIN_API_URL` y lanzar el workflow `apk`; anotar aquí el resultado.
2. Probar el APK en el TV real (lista en `apps/checkin-tv/README.md` §6).

## Sesión 2026-11-13 (noche, 2) — Paleta y logotipos de Adhara
**Decisiones del propietario**
- **Se queda Prisma; Drizzle (ADR-022 / S-22) queda descartado**, para evitar el refactor. El ORM ya no está pendiente.
- La contraseña de la base que se pegó en el chat es la de la «Internal Connection URL» de Easypanel (solo alcanzable dentro de la red del proyecto): riesgo aceptado, no se rota.

**Qué se hizo**
- `packages/theming/tokens.ts`: `temaAdrenalinaXtreme` pasa a `temaAdhara` (carbón `#231F20`, amarillo `#FFCB04`, blanco `#FFFFFF`; superficies como escalones de carbón; verde, naranja y rojo solo para estados). Usado en los layouts de `web-admin`, `checkin` y `vitrina`.
- Colores fijos que quedaban del verde anterior: `tonos.ts` (+ prueba), `globals.css` del check-in, `GuardaWebView`, `campos.css`, vista previa de `FormularioImagenCheckin`. El tono «verde» del check-in ahora usa `--gx-good` (verde de éxito), no el amarillo de marca.
- Logotipos del kit (`docs/ADHARA_FIT_Logo_Kit`): `logo-negativo.png` e `isotipo.png` en `public/branding/` de las tres apps; login, barra lateral, ficha del check-in (marco y esquina), marca de agua y pantalla de reposo de la vitrina los usan. `icon.png`, `apple-icon.png` y `favicon.ico` salen del kit. Se borraron los archivos de Adrenalina de `public/branding`.

**Qué funcionó**
- Pruebas del check-in (50), lint (solo avisos) y build del check-in y la vitrina en verde; `web-admin#typecheck` sigue con el error previo de `LayoutProps`.

**Pendiente / sin verificar**
- No se miró el resultado en un navegador ni en el TV: revisar contraste y tamaños del logo en el despliegue.
- Los íconos del APK (`checkin-tv`, `vitrina-tv`: `icono-checkin.jpg`, `generar-iconos.*`, fondo `#0A0D07`) siguen con la marca anterior; se rehacen al compilar el APK.
- El kit son PNG, no vectores. `docs/design/tema-adrenalina-xtreme.md` describe el tema anterior.

**Siguiente**
1. Tramo 1, corte 2: solo PEN (S-03), hora de Lima (S-02), quitar tasa, padrón, bolívares y es-VE (S-10), sin tocar el esquema.
2. «Ingresa tu cédula» del check-in pasa a DNI/CE en el tramo 3.

## Sesión 2026-11-13 (noche) — Primer despliegue y tramo 1, corte 1
**Qué funcionó**
- El primer despliegue en Easypanel (rama `main`, commit del rediseño del Check-in) construyó bien (~8 min) y la app responde en su dominio con sesión iniciada: el alta provisional del administrador (`tools/crear-administrador.mjs`) funcionó contra la base real. Variables declaradas por el propietario: `DATABASE_URL`, `CHECKIN_CLAVE`, R2, `TZ`, `ADMIN_*` (y la `NEXT_PUBLIC_API_URL` antigua, que ya no se usa y se puede quitar).
- Tramo 1, corte 1 (lo visible): marca «ADHARA FIT» en login, panel y título (sin logotipo hasta tener los PNG, S-19); el reloj del panel ahora es `RelojLima` (hora de Lima, es-PE) y ya no muestra la tasa BCV. Se borraron `RelojYTasa`, `RelojYTasaConHistorial` y `ModalHistorialTasas`.

**Qué se vio en el despliegue y falta (tramo 1, corte 2 y siguientes)**
- La interfaz sigue en venezolano: ~100 archivos con tasa/BCV, ~60 con bolívares, ~107 con USD, 27 con Caracas y 21 con `es-VE`; la paleta y el tema siguen siendo los de Adrenalina Xtreme (`temaAdrenalinaXtreme`).
- **No quitar tablas ni columnas del esquema en este tramo:** `prisma db push` se niega a perder datos y el contenedor no arrancaría. Se retiran primero del código y las tablas se eliminan en la línea base (S-15).
- La contraseña de la base de datos se pegó en el chat: hay que rotarla (y revisar que no se haya compartido nada más).

**Siguiente**
1. Tramo 1, corte 2: dinero solo en PEN (S-03) y fechas en Lima (S-02) en dominio, repositorios y pantallas; retirar tasa, padrón y bolívares (S-10).
2. Paleta Adhara (`#231F20`, `#FFCB04`, `#FFFFFF`) como tema (S-19).

## Sesión 2026-11-13 (tarde) — Check-in Module
**Decisiones del propietario**
- El kiosco pasa a llamarse **Check-in Module**. Es un circuito cerrado (un gimnasio, un propietario): sin versión web del kiosco, todo va en un APK que lleva dentro la interfaz y habla con la base a través de `web-admin`. La clave es **una variable de entorno fija** (`CHECKIN_CLAVE`), sin claves por sede ni revocables desde el panel.
- **El dato que dispara el check-in son dos documentos: DNI y CE (carnet de extranjería).** Se descarta el pasaporte (S-06 lo preveía) y la cédula de Adrenalina. Pendiente de aplicar en el tramo 3 (socios y planes).
- No hay ningún APK de Adhara instalado en ningún televisor: el renombre no rompe nada.

**Qué se hizo**
- Renombre `kiosco`/`kiosk` → `checkin` (3 commits): `apps/kiosk` → `apps/checkin`, `apps/kiosk-tv` → `apps/checkin-tv`, rutas `/api/kiosco/estado` → `/api/checkin/estado` y `/api/kiosco/vitrina` → `/api/vitrina`, variables `KIOSCO_*` → `CHECKIN_*`, `appId` `pe.adharafit.checkin` y nombre «Adhara Check-in». `docs/` no se renombró (las specs y ADR conservan el término anterior). `tools/importar-repo-a.mjs` sigue usando los nombres del Repo A.
- La validación del check-in compara el header `X-Checkin-Api-Key` con `CHECKIN_CLAVE` (`claveCheckinValida`, 5 pruebas; falla cerrado si falta o mide menos de 16) y devuelve la sede única. Se quitó la API key de la pantalla de sucursales. La columna `Sucursal.apiKey` queda sin uso en la base (se retira en la línea base de S-15, para que `db push` no pierda datos).

**Qué no funcionó / no repetir**
- El renombre automático convirtió `kiosko` (con o) en `checkino`; se corrigió en un segundo commit. Al renombrar por texto, buscar antes todas las variantes de la palabra.
- Un comando con `python - <<EOF || node -e '...'` se colgó (el `python` de Windows no responde): usar scripts `.mjs` en el scratchpad, no comillas anidadas.
- `web-admin#typecheck` falla por un error que ya traía el repo (`LayoutProps`, `app/layout.tsx(18,50)`, `docs/linea-base-tests.md`). No es regresión.

**Rediseño de red del Check-in (mismo día)**
- `CHECKIN_URL` existía porque el check-in nació como servicio web aparte y el APK solo lo abría (`server.url`). Se eliminó junto con `NEXT_PUBLIC_API_URL`: en Easypanel quedan **solo dos servicios, web-admin y PostgreSQL**; el check-in y la vitrina son APK que hablan con web-admin.
- `apps/checkin` lee `checkin-config.json` (`{apiUrl, clave}`, dentro del bundle del APK) en vez de una variable de build (`validarConfig`, 11 pruebas). Se quitaron lo que era de la versión web: `Dockerfile`, service worker, `manifest.json`, la pantalla `/config` de clave manual y la clave por fragmento de URL (`claveFragmento` y sus pruebas, que ya no tienen objeto).
- `apps/checkin-tv/capacitor`: `configuracion.mjs` (6 pruebas) y `preparar.mjs` empaquetan `apps/checkin/out`, sin `server.url`, como `vitrina-tv`. Variables solo de compilación: `CHECKIN_API_URL`, `CHECKIN_CLAVE`, `CHECKIN_WEB_DIR`. La vitrina usa la misma clave (`CHECKIN_CLAVE`).
- CORS se deja en `*` a propósito: la defensa real es la clave en el encabezado (no una cookie), así que restringir el origen no añade seguridad. No existe ninguna variable de orígenes en el código; el requisito `KIOSCO_ORIGENES_PERMITIDOS` de S-01, S-20 y S-21 queda sin efecto.

**Pendiente**
1. **El APK no se ha compilado ni probado:** falta escribir el workflow de GitHub Actions (Gradle) y probar en un TV real (lista en `apps/checkin-tv/README.md` §6).
2. `apps/vitrina` conserva un `Dockerfile` y un `docker-entrypoint.sh` de vista previa que no se despliegan; se pueden borrar.
3. Quitar la marca anterior y la tasa/bolívares de la interfaz del check-in (tramo 1; incluye `adrenalina-gym-bg.png` y las fuentes de Google).
4. DNI y CE como único identificador (tramo 3); quitar el pasaporte.

## Sesión 2026-11-13 (local, Windows) — paso al modo ágil
**Qué se hizo**
- Se retomó en local: `npm ci` completo, cliente de Prisma generado, 390 pruebas de dominio, 45 de checkin y 65 de vitrina en verde.
- `tools/auditar-npm.mjs`: arreglado en Windows (`ejecutarAuditoria`, con 6 pruebas nuevas).
- `tools/verificar-env.mjs`: ahora también lee `tools/crear-administrador.mjs`.
- `tools/crear-administrador.mjs` (+16 pruebas): alta provisional del primer administrador (organización, sede y usuario SOCIO) con `pg`; variables `ADMIN_NOMBRE`, `ADMIN_CORREO` y `ADMIN_CONTRASENA_INICIAL` en `.env.example`, Compose, `docker-entrypoint.sh`, `Dockerfile` y `docs/ops/easypanel.md`. Solo actúa si no hay ningún administrador.
- **Cambio de reglas** (orden del propietario): `CLAUDE.md` reescrito en modo ágil; el `pre-commit` ya no corre `spec-lint`; el `pre-push` solo avisa si falta el handoff; el CI y `politica.yml` pierden `verificar-repo`, `spec-lint`, el autotest del arnés y la exigencia de handoff. El handoff anterior pasó a `docs/historial/handoff-diseno.md`.
- Agentes: S-21 conciliada con el revisor (70 REQ, 26 BEH, 4 INV, 16 AC; sigue `en-revision`); S-20 en curso al cerrar esta entrada.

**Qué funcionó**
- Mover el alta del administrador a `tools/` con SQL directo: cumple las reglas de carpetas de S-00 y no depende del ORM (sirve también si se cambia de Prisma).

**Qué no funcionó / no repetir**
- `packages/db` solo admitía cuatro archivos (lista cerrada de S-00, `verificar-repo`): el primer intento del alta en TypeScript ahí fue rechazado. Esa verificación ya no bloquea.
- `npm ci` lanzado antes de tiempo dejó `node_modules` sin `.bin`; hay que dejar terminar `npm ci` antes de `prisma generate`.
- `verificar-env` solo reconoce `process.env.X`; pasar `process.env` entero a una función lo hace creer que las variables no se leen.
- El sistema denegó volcar los nombres de las variables de entorno (`printenv`): no insistir.

**Pendiente / sin verificar**
- El SQL de `crear-administrador.mjs` (ids y `apiKey` generados en el script; el resto de columnas se asume con valor por defecto en la base) **no se ha probado contra una base real**. Se probará en el primer arranque desplegado o con una `DATABASE_URL` local.
- Decisión del propietario sobre Drizzle (ADR-022 / S-22): pospuesto o descartado. Mientras tanto se sigue con Prisma.
- Rotar las claves de base y R2 que se compartieron por chat (el repositorio es público).
- Insumos: PNG originales del logotipo, textos legales, datos de cobro de Yape y BCP, marca y modelo del televisor, VPS y dominio definitivos.

**Siguiente**
1. Empujar a `main` (avance rápido) para que Easypanel reconstruya, y anotar aquí los errores del primer despliegue.
2. Tramo 1 de la hoja de ruta: solo PEN, hora de Lima, sin tasa ni bolívares ni marca anterior.
3. Seguir los tramos 2 a 6 de `docs/superpowers/plans/2026-11-13-ruta-agil.md`.
