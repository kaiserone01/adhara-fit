# Handoff — Adhara Fit

Bitácora de sesiones: la más reciente arriba, solo se añaden entradas. El historial del diseño (puertas G0–G6, estado de cada ADR y spec, intentos fallidos) está en `docs/historial/handoff-diseno.md`.

## Estado resumido
- **Qué es:** sistema web interno de un gimnasio en Perú (PEN, un local). Base: código del Repo A importado (S-00). Modo ágil desde 2026-11-13: ver `CLAUDE.md` y `docs/superpowers/plans/2026-11-13-ruta-agil.md`.
- **Referencia de qué construir:** ADR-001 a 022 (decisiones de arquitectura) y specs S-00 a S-15, S-17, S-18, S-19, S-22 y S-23 aprobadas. S-20 (vitrina de TV) y S-21 (check-in en smart-TV) siguen en revisión; sus hallazgos están en `docs/superpowers/revisiones-pendientes/`.
- **Desplegado:** provisional en Easypanel (`docs/ops/easypanel.md`): imagen del `Dockerfile`, esquema con `prisma db push` al arrancar, alta del primer administrador con `tools/crear-administrador.mjs`.
- **Preferencia del propietario:** cada código (ADR-nnn, S-nn, REQ…) que se mencione lleva al lado una descripción simple.

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
