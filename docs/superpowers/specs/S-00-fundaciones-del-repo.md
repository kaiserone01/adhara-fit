---
id: S-00
estado: aprobada
adrs: ADR-001, ADR-005, ADR-009, ADR-012, ADR-014, ADR-016, ADR-017, ADR-018, ADR-019, ADR-020, ADR-021
depende_de: ninguna
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-00 — Fundaciones del repo: copia limpia, exclusiones, CI, entorno local y secretos

## 0. Contexto y alcance

### 0.1 Problema
Adhara Fit parte de una copia del Repo A (`gym-app` @ `b4352a0`), que es público, no declara licencia y arrastra PII de personas reales, credenciales y scripts destructivos de otro negocio. Hay que importar el código de trabajo sin esa carga, con un entorno reproducible (Docker Compose, CI, `.env.example`) y con controles que impidan que vuelva a entrar (exclusiones verificadas por CI, escaneo de secretos). Este repositorio no tiene todavía código de producto: solo contiene el arnés, la documentación y las specs.

### 0.2 Dentro de alcance
- Importar el árbol de trabajo de `b4352a0` como un único commit, sin historia del Repo A, aplicando la lista cerrada de exclusión de abajo.
- Limitar la copia inicial a las apps `web-admin`, `kiosk`, `kiosk-tv`, `vitrina` y `vitrina-tv` y a los workspaces que estas requieren (ADR-009 enmendado por ADR-021).
- Registrar la línea base del Repo A (tests, lint, tipos, build y `npm audit`) antes de aplicar exclusiones (plan 0.7, ADR-016 §4); **ya está medida** (2026-11-12) en `docs/linea-base-tests.md` y `docs/linea-base-audit.json`.
- `.env.example`, `LICENSE`, `.gitignore`, README de arranque, `docker-compose.yml` (PostgreSQL y `web-admin`) y CI de calidad (lint, tipos, tests, build, `npm audit`, gitleaks).
- Verificaciones automáticas en `tools/verificar-repo.mjs` (exclusiones, apps y workspaces, migraciones, archivos obligatorios, `.gitignore`, versiones fijadas, referencias rotas e historia) y `tools/verificar-env.mjs`; el script del procedimiento `tools/importar-repo-a.mjs`; y el helper de base efímera para pruebas de integración.
- Comprobar que el workflow `politica` del arnés corre en cada pull request.
- Lista cerrada de exclusión (se compara en minúsculas y en cualquier ruta, salvo donde se indique):
  - `cookies.txt`; `handoff.md` en cualquier ruta que no sea la raíz (el `handoff.md` del Repo A no se importa y el de este repositorio prevalece); `*.keystore`, `*.jks`, `*.p12`, `*.pfx`, `keystore.properties`, `*.pem` y `.env*` salvo `.env.example`.
  - `reset-vencimientos-log-*.json`; `.windsurf/`; `.agents/`; `skills-lock.json`; `docs/xls/`; `packages/db/migracion-excel/`.
  - Todo archivo cuyo nombre contenga `zipgym` o `zip-gym`.
  - Todas las migraciones de Prisma del Repo A (hasta la marca `20261016000000`) y `migration_lock.toml`.
  - El seed del Repo A (`prisma/seed.ts`) y cualquier archivo que contenga las contraseñas `admin1234` o `entrenador1234`.
  - En `packages/db`, todo archivo salvo `package.json`, `prisma/schema.prisma`, `prisma7.config.ts` y `prisma7.local.config.ts`. Quedan excluidos `Dockerfile.migrate` (su `CMD` borra las migraciones y ejecuta `migrate reset --force`) y los scripts `backfillPermisos*.ts`, `clonarSedePrincipalAZipGym.ts`, `clonarZipGym/`, `diagnosticoVencimientos.ts`, `importarPadronExcel.ts`, `limpiarCajaPrueba.ts`, `limpiarMiembros.ts`, `limpiarOrganizacionParaMigracion.ts`, `marcarAjustarFecha.ts`, `migracion-excel/`, `productos-prueba/`, `quitarPermisosEntrenadores.ts`, `resetVencimientosPrueba.ts`, `reset-vencimientos-log-*.json`, `sembrar*.ts` y `prisma/seed.ts`; el propietario aprueba la lista en el informe de importación.
  - Las apps `worker` y `kiosk-host`; los workflows `apk-*.yml` y `verificar-vitrina.yml`; y todo `.github/` del Repo A (los workflows permitidos son los de este repositorio).
  - El `docs/` del Repo A completo, su `README.md`, su `CLAUDE.md` y su `.claude/` (colisionan con los de este repositorio; el `.claude/settings.json` del Repo A podría sobrescribir el arnés). El `.gitignore` del Repo A se fusiona con el de este repositorio sin quitar reglas.

### 0.3 Fuera de alcance
- Cambios de comportamiento o de modelo de datos: moneda, sede única, documento, tiempo y abonos pertenecen a S-02…S-10.
- Baseline de seguridad: S-01. Retirada del código de padrón Excel, de lo específico de Venezuela y de la marca anterior: S-10 (la exclusión de los **archivos** de datos y scripts de ADR-005 §3 sí es de S-00; ADR-007 no se cita porque sigue propuesto).
- Sistema de diseño y rebranding completos (tokens, componentes, tipografía y marca; absorben el plan 0.9): spec S-19 (ADR-020). S-00 no aplica ninguna marca (SUP-S00-008).
- Generar el baseline de migraciones de Prisma y el seed de Adhara: ocurren cuando el esquema deje de cambiar (SUP-S00-002).
- Rotar o crear credenciales nuevas (plan 0.8): tarea operativa del propietario; esta spec solo exige que no haya credenciales del Repo A en el árbol.
- Hacer privado o depurar el Repo A (plan 0.1) y configurar la protección de `main` en GitHub: acciones del propietario (`docs/ops/github-setup.md`), fuera de este repositorio.
- Funcionalidades de productos (venta con cobro inmediato, RF-37): se copian tal como están y no se modifican aquí; el fiado (RF-38), los egresos y los turnos de caja quedan retirados por decisión del propietario (ADR-018) y se eliminan en las specs de productos y de pagos, no en S-00. La spec de productos se propone en `docs/superpowers/COBERTURA-RF.md`.
- SUNAT, WhatsApp, `kiosk-host`, sitio público y multi-sede visible.
- Adaptación de la vitrina y del kiosco en TV (PEN, contenido, claves de Android, APK y su CI): specs S-20 y S-21, propuestas; S-00 solo las importa sin cambios.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre un clon de solo lectura del Repo A en el commit `b4352a03` (SHA completo `b4352a0398933cf2665a3e7b82dc84049697e10c`). Lo que no se pudo comprobar se marca «no verificado».
- El Repo A es público (se clonó de forma anónima) y su raíz no tiene archivo `LICENSE`; el dato de 732 commits viene de ADR-005 y no se pudo verificar con un clon superficial; no verificado.
- `cookies.txt` está versionado en la raíz (254 bytes; su contenido no se leyó) (verificado con `git ls-files cookies.txt`).
- Hay dos `debug.keystore` rastreados: `apps/kiosk-tv/capacitor/android/app/debug.keystore` y `apps/vitrina-tv/capacitor/android/app/debug.keystore` (verificado con `git ls-files`). Los dos `build.gradle` los exigen (`apps/kiosk-tv/capacitor/android/app/build.gradle:21-22` y `apps/vitrina-tv/capacitor/android/app/build.gradle:21-22`: `storeFile file("debug.keystore")` y `storePassword "android"`), por lo que el build de Android falla sin ese archivo.
- `packages/db/prisma/seed.ts` fija las contraseñas `admin1234` (`packages/db/prisma/seed.ts:41` y `:50`) y `entrenador1234` (`packages/db/prisma/seed.ts:55`). La cadena `admin1234` aparece además en 7 documentos de `docs/superpowers/plans/` del Repo A.
- No existe `.env.example` (verificado con `git ls-files`). El código lee con `process.env` **13 variables**, las 12 de `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `KIOSCO_CLAVE`, `KIOSCO_URL`, `NEXT_PUBLIC_API_URL`, `VITRINA_WEB_DIR`, `ZIP_GYM_PASSWORD` y `NODE_ENV` con notación de punto, más `DATABASE_URL_LOCAL` con corchetes (`packages/db/prisma7.local.config.ts:10`; `packages/db/prisma7.config.ts:16` también usa corchetes para `DATABASE_URL`). Los workflows y scripts usan además `VITRINA_API_URL`, `VITRINA_CLAVE`, `VITRINA_DEV_URL` y variables `KIOSCO_*` (doc 11 DI-85); no verificado.
- Hay 36 migraciones en `packages/db/prisma/migrations` (de `20260913024831_organizacion_sucursal_plan_suscripcion` a `20261016000000_vitrina_sonido`) más `migration_lock.toml`; `docker-entrypoint.sh:11` ejecuta `prisma migrate deploy` al arrancar y `:13` lanza `apps/web-admin/server.js` (verificado).
- Hay tres workflows en `.github/workflows`: `apk-kiosco.yml`, `apk-vitrina.yml` y `verificar-vitrina.yml` (verificado con `ls .github/workflows`).
- `apps/kiosk` y `apps/vitrina` usan `output: "export"` (`apps/kiosk/next.config.ts:9`, `apps/vitrina/next.config.ts:6`) y `apps/web-admin` usa `output: "standalone"` (`apps/web-admin/next.config.ts:7`); los scripts `dev` usan los puertos 3001 y 3002 (`apps/kiosk/package.json:6`, `apps/vitrina/package.json:6`), y `Dockerfile:40` y `Dockerfile:70` fijan `PORT=3000` y `EXPOSE 3000`. `Dockerfile:42` fija `TZ=America/Caracas`.
- El modelo `VitrinaItem` (`packages/db/prisma/schema.prisma:684`) guarda `precioUSD`, `ofertaUSD` y `mostrarEquivalenteBs`; el emisor SSE en memoria que exige un solo contenedor viene de doc 11 DI-78; no re-verificado.
- El `docs/adr/` del Repo A contiene `ADR-001-gym-app-sesion.md`, `ADR-001-gym-app-sesion-v2.md` y `ADR-002-vitrina-importa-dominio-puro.md`, que repiten la numeración de este repositorio (verificado con `ls docs/adr`).
- `packages/domain-custom` solo tiene `.gitkeep` y no es un workspace (sin `package.json`); `packages/config` y `packages/design-system` tienen `.gitkeep` y `package.json`, y el `Dockerfile` los copia (`Dockerfile:18` y `Dockerfile:20`) (verificado con `ls -A packages`). `apps/kiosk-tv` y `apps/vitrina-tv` no son workspaces de npm: su `package.json` está en `capacitor/package.json` (verificado con `git ls-files apps/kiosk-tv`). El cierre de dependencias internas de `web-admin`, `kiosk` y `vitrina` es `db`, `domain`, `infrastructure`, `theming` y `ui` (verificado con `package.json` por workspace).
- El `package.json` raíz solo define `dev`, `build`, `lint`, `start` y `actualizar-tasa` (`package.json:15` apunta a `apps/worker`): **no hay `test` ni `typecheck`**. `test` existe en `apps/kiosk`, `apps/vitrina`, `packages/db` y `packages/domain`; `web-admin` no tiene `test`; solo `web-admin`, `kiosk` y `vitrina` tienen `tsconfig.json` propio (verificado con `package.json` por workspace). La línea base medida el 2026-11-12 (verificado con `npm test`, `npm audit` y `npx turbo run build`; detalle en `docs/linea-base-tests.md`) da 572 pruebas con 571 verdes (el fallo es de código excluido), lint sin errores, 1 error de tipos en `web-admin`, el build de `vitrina` fallando por Google Fonts y 21 vulnerabilidades, una crítica en `next`.

- `packages/db/Dockerfile.migrate:32` ejecuta `rm -rf prisma/migrations/*` y `prisma migrate reset --force`; `packages/db/prisma7.config.ts:13` referencia `tsx prisma/seed.ts`; los scripts `db:*` de `packages/db/package.json` apuntan a archivos que se excluyen; `.claude/settings.json` y `.claude/skills/` existen en el Repo A (verificado con `git ls-files .claude`).
- Los 5 archivos de test de `packages/db` están en `clonarZipGym/` y `migracion-excel/`, y `xlsx` figura en `packages/db/package.json:29` (verificado con `git ls-files packages/db`).

### 0.5 Supuestos
- SUP-S00-001: `worker`, `kiosk-host` y los workflows `apk-*.yml` y `verificar-vitrina.yml` se omiten de la copia; `kiosk-tv`, `vitrina` y `vitrina-tv` se importan sin modificar y se adaptan en S-20 y S-21 (ADR-021, decisión D3). Default: ese reparto; asumido, por validar.
- SUP-S00-002: las migraciones heredadas se excluyen y el baseline se genera después de las specs que cambian el esquema (decisión D12); mientras tanto la base desechable de Compose usa `prisma db push`. Default: ese comportamiento; asumido, por validar.
- SUP-S00-003: gitleaks se adopta como binario de versión fija en CI y como comprobación opcional en `pre-commit` (decisión D13). Default: sí; asumido, por validar.
- SUP-S00-004: `npm audit` falla el pipeline ante vulnerabilidades de severidad high o critical que no figuren en la línea base. Default: ese umbral; asumido, por validar.
- SUP-S00-005: el aviso legal es `Copyright (c) 2026 Adhara Fit. Todos los derechos reservados.` Default: ese texto; asumido, por validar.
- SUP-S00-006: esta spec incluye la comprobación del workflow `politica` (decisión D19). Default: incluirla; asumido, por validar.
- SUP-S00-007: la base de `docker compose` es desechable (su volumen se puede borrar) y la de las pruebas es efímera (se crea y se destruye en cada ejecución); son distintas y solo la segunda cumple ADR-016. Default: mantener esa distinción; asumido, por validar.
- SUP-S00-008: el rebranding y el sistema de diseño completos, que absorben el plan 0.9, se ejecutan en S-19. Default: trasladarlos; asumido, por validar.
- SUP-S00-009: como no existe el script `typecheck`, la línea base midió `tsc --noEmit` en `web-admin`, `kiosk` y `vitrina` (los únicos con `tsconfig.json`) y S-00 añade `typecheck` a esos tres `package.json`; el CI llama a `lint`, `typecheck`, `test` y `build` por workspace (cambio de configuración, no de `src/`). Default: ese reparto; asumido, por validar.
- SUP-S00-010: con cero migraciones `prisma migrate deploy` no crea tablas (no verificado), por lo que Compose ejecuta `prisma db push` antes de arrancar `web-admin`. Default: ese arranque; asumido, por validar.
- SUP-S00-011: el seed del Repo A no se importa y el usuario inicial llega con la spec de baseline y seed (ver COBERTURA-RF). Default: la pantalla de inicio de sesión basta para validar S-00; asumido, por validar.
- SUP-S00-012: `package-lock.json` se regenera con `npm install --package-lock-only` tras recortar los workspaces para que `npm ci` funcione. Default: regenerarlo y registrar el cambio en el informe de importación; asumido, por validar.
- SUP-S00-013: `kiosk` no entra en Compose (el plan 0.5 pide PostgreSQL y `web-admin`) y se levanta con su script `dev`, documentado en el README. Default: ese reparto; asumido, por validar.
- SUP-S00-014: gitleaks usa una regla propia `ADHARA_TEST_SECRET_` en `.gitleaks.toml` para las pruebas, de modo que no dependan de formatos de proveedores ni del bloqueo de GitHub a tokens reales. Default: esa regla; asumido, por validar.
- SUP-S00-015: `packages/db` queda sin tests y su script `test` pasa a `vitest run --passWithNoTests`. Default: ese cambio; asumido, por validar.
- SUP-S00-016: el commit de importación lo crea el propietario con su identidad y su firma (ADR-014). Default: el script prepara el árbol y propone el mensaje; asumido, por validar.
- SUP-S00-017: el conteo de «organización» de la línea base usa `grep -rliE organizacion` sobre `apps` y `packages` con las extensiones ts, tsx, prisma, mjs, js y sql, y cuenta `organizacionId` por separado. Default: ese criterio; asumido, por validar.

## 1. Requisitos

> Origen: ADR citados y tareas del plan (doc 07 §Fase 0). «El procedimiento» es el script `tools/importar-repo-a.mjs` (REQ-S00-031).

### REQ-S00-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-001
- texto: La importación deberá producir un único commit con el árbol de trabajo del commit b4352a0 del Repo A, sin que ningún commit del Repo A figure como ancestro.

### REQ-S00-002
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando se importa el árbol del Repo A, el procedimiento deberá excluir todos los archivos y directorios de la lista cerrada de exclusión de la sección 0.2.

### REQ-S00-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: El pipeline de CI deberá fallar cuando el árbol versionado, o un archivo nuevo sin versionar, coincida con la lista cerrada de exclusión, sea cual sea su ruta y su uso de mayúsculas.

### REQ-S00-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-009, ADR-021, ADR-020
- texto: La copia inicial deberá contener solo las apps web-admin, kiosk, kiosk-tv, vitrina y vitrina-tv, los workspaces de npm que web-admin, kiosk y vitrina requieren de forma transitiva y los workspaces vacíos config y design-system.

### REQ-S00-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El repositorio no deberá contener ninguna migración de Prisma con marca de tiempo igual o anterior a 20261016000000.

### REQ-S00-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: El pipeline de CI deberá fallar cuando las variables leídas con process.env, en notación de punto o de corchetes, difieran de los nombres de .env.example, sin contar las variables de la sección Solo Compose de ese archivo.

### REQ-S00-007
- tipo: cuando
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: Cuando se abre o se actualiza un pull request, o se empuja a main, el CI deberá fallar si gitleaks detecta algún secreto en el rango analizado.

### REQ-S00-008
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando se abre o se actualiza un pull request, o se empuja a main, el CI deberá ejecutar lint, comprobación de tipos, pruebas por workspace y build como jobs independientes.

### REQ-S00-009
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando una persona ejecuta docker compose up, el sistema deberá iniciar los servicios PostgreSQL y web-admin con comprobación de salud.

### REQ-S00-010
- tipo: ubicuo
- prioridad: SHOULD
- origen: ADR-005
- texto: El README deberá permitir que una persona que no participó en la importación levante el proyecto en menos de 30 minutos.

### REQ-S00-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016, ADR-001, ADR-019
- texto: Antes de aplicar cualquier exclusión, el procedimiento deberá registrar la línea base del Repo A en docs/linea-base-tests.md y docs/linea-base-audit.json.

### REQ-S00-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El archivo LICENSE deberá contener la frase Copyright (c) 2026 Adhara Fit. Todos los derechos reservados.

### REQ-S00-013
- tipo: cuando
- prioridad: MUST
- origen: ADR-014, ADR-017
- texto: Cuando se abre o se actualiza un pull request, el CI deberá ejecutar el workflow politica definido en .github/workflows/politica.yml.

### REQ-S00-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El helper de pruebas de integración deberá crear una base PostgreSQL con un nombre único que empiece por adhara_test_ para cada ejecución y destruirla al terminar.

### REQ-S00-015
- tipo: cuando
- prioridad: MUST
- origen: ADR-009, ADR-016
- texto: Cuando se aplican las exclusiones, el procedimiento deberá verificar que npm ci, la comprobación de tipos y el build no producen errores que no figuren en la línea base.

### REQ-S00-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: Cuando se abre o se actualiza un pull request, o se empuja a main, el CI deberá fallar si npm audit encuentra vulnerabilidades high o critical cuyo identificador no figure en docs/linea-base-audit.json.

### REQ-S00-017
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando docker compose inicia con una base de datos vacía, el sistema deberá crear el esquema de Prisma antes de arrancar web-admin.

### REQ-S00-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: El archivo .env.example no deberá contener ningún valor de secreto y solo admitirá, en su sección Solo Compose, valores de desarrollo local de PostgreSQL marcados como solo local.

### REQ-S00-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El helper de pruebas de integración deberá abortar antes de abrir conexión si DATABASE_URL está ausente, vacía o su host no es localhost, 127.0.0.1 ni el servicio postgres.

### REQ-S00-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El pipeline de CI deberá fallar cuando falte alguno de los archivos obligatorios LICENSE, README.md, .env.example, CLAUDE.md o handoff.md en la raíz.

### REQ-S00-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: Antes de crear el commit de importación, el procedimiento deberá ejecutar gitleaks sobre el árbol completo y detenerse si detecta algún secreto.

### REQ-S00-022
- tipo: donde
- prioridad: SHOULD
- origen: ADR-005, ADR-012
- texto: Donde gitleaks esté instalado en la máquina, el hook pre-commit deberá ejecutarlo sobre los cambios en staging y rechazar el commit ante cualquier hallazgo.

### REQ-S00-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: Antes de empujar el commit de importación, el procedimiento deberá comprobar que el repositorio remoto es privado.

### REQ-S00-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El archivo .gitignore deberá excluir los patrones *.keystore, *.jks, *.p12, *.pfx, keystore.properties, cookies.txt, .env*, *.pem, node_modules, .next, .turbo, coverage y .claude/settings.local.json, con la excepción de .env.example.

### REQ-S00-025
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando un archivo del árbol importado coincide en ruta con uno de este repositorio (README.md, CLAUDE.md, handoff.md, docs, .github, .claude, .githooks, tools, scripts, .editorconfig, .gitattributes), el procedimiento deberá conservar el de este repositorio y descartar el importado.

### REQ-S00-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: Los directorios apps y packages no deberán contener el seed del Repo A ni ningún archivo con las contraseñas admin1234 o entrenador1234.

### REQ-S00-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El archivo docker-compose.yml deberá publicar el servicio web-admin en el puerto 3000.

### REQ-S00-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: Antes de crear el commit de importación, el procedimiento deberá escribir docs/informe-importacion.md con la lista de archivos de datos conservados, la lista de permitidos de packages/db y los cambios al lockfile.

### REQ-S00-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-016
- texto: El pipeline de CI deberá fallar cuando gitleaks o la imagen de PostgreSQL usen la etiqueta latest, o cuando la versión mayor de PostgreSQL difiera entre docker-compose.yml y el workflow de CI.

### REQ-S00-030
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando se aplican las exclusiones, el procedimiento deberá corregir, solo con cambios de configuración, toda referencia de package.json, prisma7.config.ts y Dockerfile a un archivo o una app excluidos.

### REQ-S00-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-014
- texto: La importación deberá ejecutarse mediante tools/importar-repo-a.mjs, que se detiene sin crear archivos si falta la copia local del Repo A o la línea base.

## 2. Comportamiento

### BEH-S00-001
- cubre: REQ-S00-001, REQ-S00-002, REQ-S00-004, REQ-S00-005, REQ-S00-015, REQ-S00-021, REQ-S00-025, REQ-S00-026, REQ-S00-028, REQ-S00-030, REQ-S00-031
- categoria: feliz
- dado: una copia local del Repo A de prueba con los archivos de la lista de exclusión, la línea base ya registrada y un árbol de este repositorio con README.md propio
- cuando: se ejecuta tools/importar-repo-a.mjs
- entonces: el árbol resultante no contiene ningún archivo excluido, contiene solo las apps, los workspaces y los directorios vacíos permitidos, conserva los archivos propios, tiene docs/informe-importacion.md y deja la ejecución lista para que el propietario cree un único commit

### BEH-S00-002
- cubre: REQ-S00-007, REQ-S00-008, REQ-S00-016, REQ-S00-020
- categoria: feliz
- dado: un pull request sin cambios funcionales sobre la copia importada, con los archivos obligatorios presentes
- cuando: el CI se ejecuta
- entonces: lint, tipos, pruebas, build, gitleaks y npm audit no producen fallos que no figuren en la línea base

### BEH-S00-003
- cubre: REQ-S00-009, REQ-S00-010, REQ-S00-017, REQ-S00-018, REQ-S00-027
- categoria: feliz
- dado: un clon limpio y una máquina con Docker, sin el archivo .env
- cuando: la persona copia .env.example a .env y ejecuta docker compose up
- entonces: PostgreSQL y web-admin quedan saludables, el esquema existe en la base y la pantalla de inicio de sesión responde en el puerto 3000

### BEH-S00-004
- cubre: REQ-S00-003
- categoria: borde
- dado: un archivo apps/kiosk/Cookies.txt creado sin ejecutar git add, con mayúsculas y fuera de la raíz
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla con código distinto de 0 y lista la ruta apps/kiosk/Cookies.txt

### BEH-S00-005
- cubre: REQ-S00-006
- categoria: borde
- dado: una variable nueva leída con process.env, o con la notación de corchetes, que no figura en .env.example
- cuando: el CI ejecuta tools/verificar-env.mjs
- entonces: la verificación falla y nombra la variable que falta

### BEH-S00-006
- cubre: REQ-S00-007
- categoria: error
- dado: un commit que añade una cadena con el prefijo ADHARA_TEST_SECRET_ seguido de 16 caracteres alfanuméricos
- cuando: el CI ejecuta gitleaks sobre el rango analizado
- entonces: el job falla y el check queda en rojo

### BEH-S00-007
- cubre: REQ-S00-001, REQ-S00-011, REQ-S00-031
- categoria: error
- dado: que falta la copia local del Repo A o la línea base
- cuando: se ejecuta tools/importar-repo-a.mjs
- entonces: el script termina con código distinto de 0, indica qué falta y no crea ningún archivo

### BEH-S00-008
- cubre: REQ-S00-019
- categoria: error
- dado: DATABASE_URL con un host que no es localhost, 127.0.0.1 ni postgres
- cuando: arranca una prueba de integración
- entonces: el helper de pruebas aborta con un error explícito antes de abrir la conexión

### BEH-S00-009
- cubre: REQ-S00-015, REQ-S00-031
- categoria: error
- dado: que tras las exclusiones el build falla porque un workspace conservado importa una app omitida
- cuando: tools/importar-repo-a.mjs ejecuta la verificación del build
- entonces: el script termina con código distinto de 0, escribe el error en docs/informe-importacion.md y no deja el árbol listo para el commit

### BEH-S00-010
- cubre: REQ-S00-012, REQ-S00-020
- categoria: borde
- dado: un pull request que elimina el archivo LICENSE
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla y señala LICENSE como archivo obligatorio ausente

### BEH-S00-011
- cubre: REQ-S00-016
- categoria: borde
- dado: docs/linea-base-audit.json con los avisos high y critical actuales y un pull request que añade un aviso high cuyo identificador no figura en ese archivo
- cuando: el CI ejecuta npm audit
- entonces: el job falla solo por el aviso nuevo y no por los de la línea base

### BEH-S00-012
- cubre: REQ-S00-009
- categoria: error
- dado: que el puerto 3000 ya está ocupado en la máquina
- cuando: la persona ejecuta docker compose up
- entonces: Compose termina con un error de puerto ocupado que nombra el puerto y no deja PostgreSQL ni web-admin a medio iniciar

### BEH-S00-013
- cubre: REQ-S00-009, REQ-S00-018
- categoria: error
- dado: un clon limpio donde no se creó el archivo .env
- cuando: la persona ejecuta docker compose up
- entonces: Compose falla con un mensaje que menciona .env.example y no arranca ningún servicio

### BEH-S00-014
- cubre: REQ-S00-007
- categoria: borde
- dado: un hallazgo de gitleaks que el propietario clasifica como falso positivo
- cuando: se añade una entrada de allowlist en .gitleaks.toml con su motivo y se vuelve a ejecutar el CI
- entonces: el job pasa para ese hallazgo, y la entrada figura en el diff del pull request para su revisión

### BEH-S00-015
- cubre: REQ-S00-014, REQ-S00-019
- categoria: concurrencia
- dado: dos ejecuciones de pruebas de integración que se lanzan al mismo tiempo contra el mismo servidor PostgreSQL
- cuando: ambas crean su base
- entonces: cada una usa una base de nombre distinto, ninguna ve los datos de la otra y ambas bases se destruyen al terminar

### BEH-S00-016
- cubre: REQ-S00-023
- categoria: error
- dado: que el repositorio remoto de este proyecto es público
- cuando: se ejecuta tools/importar-repo-a.mjs con la opción de comprobar la privacidad
- entonces: el script termina con código distinto de 0 y pide hacer privado el repositorio antes de empujar

### BEH-S00-017
- cubre: REQ-S00-022
- categoria: borde
- dado: una máquina sin gitleaks instalado y otra con gitleaks que detecta un secreto en staging
- cuando: se ejecuta git commit con el hook pre-commit activo
- entonces: en la primera el hook avisa y continúa, y en la segunda el hook rechaza el commit

### BEH-S00-018
- cubre: REQ-S00-019
- categoria: borde
- dado: DATABASE_URL ausente o vacía
- cuando: arranca una prueba de integración
- entonces: el helper aborta con un error que distingue la causa y no abre conexión

### BEH-S00-019
- cubre: REQ-S00-024
- categoria: borde
- dado: un pull request que quita el patrón *.keystore del .gitignore
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla y nombra el patrón ausente

### BEH-S00-020
- cubre: REQ-S00-026
- categoria: borde
- dado: un archivo bajo packages que contiene la cadena admin1234
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla y lista el archivo

### BEH-S00-021
- cubre: REQ-S00-025
- categoria: borde
- dado: un árbol importado cuyo README.md, CLAUDE.md, docs, .claude y .github difieren de los de este repositorio
- cuando: el procedimiento copia el árbol
- entonces: esas rutas quedan idénticas a las de este repositorio antes de la importación

### BEH-S00-022
- cubre: REQ-S00-029
- categoria: borde
- dado: un pull request que cambia la imagen de PostgreSQL de docker-compose.yml a la etiqueta latest
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla y nombra la etiqueta no permitida

### BEH-S00-023
- cubre: REQ-S00-017
- categoria: error
- dado: un .env con una DATABASE_URL inválida
- cuando: la persona ejecuta docker compose up
- entonces: la creación del esquema falla, web-admin no arranca y el error de Prisma se muestra en la salida de Compose

### BEH-S00-024
- cubre: REQ-S00-030
- categoria: error
- dado: un script de package.json que apunta a un archivo que no existe
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla y nombra el script y la ruta ausente

### BEH-S00-025
- cubre: REQ-S00-028
- categoria: borde
- dado: un árbol listo para importar sin docs/informe-importacion.md
- cuando: se ejecuta tools/importar-repo-a.mjs
- entonces: el script escribe el informe antes de dejar el árbol listo y, si no puede escribirlo, termina con código distinto de 0

### BEH-S00-026
- cubre: REQ-S00-004
- categoria: borde
- dado: un árbol al que le falta apps/kiosk-tv, o al que le sobra apps/worker, o al que le falta un workspace requerido
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla y nombra el directorio que falta o sobra

### BEH-S00-027
- cubre: REQ-S00-013
- categoria: feliz
- dado: pull requests de prueba abiertos por el propietario: uno con un commit conforme, uno con un trailer prohibido y uno sin handoff.md modificado
- cuando: el CI ejecuta el workflow politica
- entonces: el conforme termina en verde y los otros dos fallan en el paso de política de commits y de handoff respectivamente

## 3. Invariantes

### INV-S00-001
- propiedad: ningún archivo de la lista cerrada de exclusión existe en el árbol versionado ni entre los archivos nuevos sin versionar, en ninguna ruta
- mecanismo: lint
- deteccion: tools/verificar-repo.mjs lista git ls-files y los archivos nuevos no ignorados, y termina con código distinto de 0 si alguno coincide
- protege: REQ-S00-002, REQ-S00-003, REQ-S00-026

### INV-S00-002
- propiedad: ni el árbol del commit de importación ni el rango de cada pull request contienen secretos
- mecanismo: lint
- deteccion: gitleaks detect sobre el árbol y sobre el rango termina con código distinto de 0 ante un hallazgo
- protege: REQ-S00-007, REQ-S00-021

### INV-S00-003
- propiedad: el conjunto de variables leídas con process.env, sin la sección Solo Compose, es igual al conjunto de nombres de .env.example y ninguna lleva un valor de secreto
- mecanismo: lint
- deteccion: tools/verificar-env.mjs termina con código distinto de 0 y lista las variables sobrantes, ausentes o con valor no permitido
- protege: REQ-S00-006, REQ-S00-018

### INV-S00-004
- propiedad: ninguna prueba de integración abre conexión a un host no local ni usa una base cuyo nombre no empiece por adhara_test_
- mecanismo: asercion-dominio
- deteccion: el helper de pruebas lanza un error antes de conectar y la prueba falla
- protege: REQ-S00-014, REQ-S00-019

### INV-S00-005
- propiedad: el repositorio tiene una única raíz de historia propia, el commit de importación tiene un único padre y el SHA completo del Repo A no existe en él
- mecanismo: lint
- deteccion: tools/verificar-repo.mjs con la opción de historia comprueba que git rev-list --max-parents=0 devuelve exactamente un commit, que el commit de importación tiene un solo padre y que git cat-file -e con el SHA registrado en docs/linea-base-tests.md falla
- protege: REQ-S00-001

### INV-S00-006
- propiedad: las apps y los workspaces del árbol son exactamente web-admin, kiosk, kiosk-tv, vitrina, vitrina-tv, el cierre transitivo de las dependencias internas de web-admin, kiosk y vitrina, y config y design-system; no existe ninguna migración con marca igual o anterior a 20261016000000
- mecanismo: lint
- deteccion: tools/verificar-repo.mjs calcula el cierre desde los package.json de los workspaces de npm y termina con código distinto de 0 si sobra o falta un directorio, o si existe una migración anterior al corte
- protege: REQ-S00-004, REQ-S00-005

## 4. Criterios de aceptación

### AC-S00-001
- enlaza: REQ-S00-001, INV-S00-005
- metodo: integracion
- procedimiento: tras importar en un repositorio de prueba con un Repo A ficticio de 3 commits, ejecutar node tools/verificar-repo.mjs --historia
- esperado: el código de salida es 0; git rev-list --max-parents=0 devuelve un único commit; el commit de importación tiene un único padre; git cat-file -e con el SHA del Repo A ficticio termina con error
- test: tools/verificar-repo.test.mjs

### AC-S00-002
- enlaza: REQ-S00-002, REQ-S00-003, REQ-S00-026, BEH-S00-004, BEH-S00-020, INV-S00-001
- metodo: integracion
- procedimiento: ejecutar node tools/verificar-repo.mjs en un árbol de prueba limpio; repetirlo tras crear apps/kiosk/Cookies.txt sin git add y tras añadir la cadena admin1234 a un archivo bajo packages
- esperado: el primer caso termina con código 0; el segundo y el tercero terminan con código 1 y listan la ruta exacta del archivo; una cadena admin1234 en docs o en tools no produce fallo
- test: tools/verificar-repo.test.mjs

### AC-S00-003
- enlaza: REQ-S00-004, BEH-S00-026, INV-S00-006
- metodo: unitario
- procedimiento: ejecutar la verificación de apps y workspaces sobre un árbol de prueba completo, sobre otro sin apps/kiosk-tv, sobre otro con apps/worker añadida y sobre otro sin un workspace requerido por web-admin
- esperado: el primer caso termina con código 0 y los otros tres con código 1 nombrando el directorio que falta o sobra
- test: tools/verificar-repo.test.mjs

### AC-S00-004
- enlaza: REQ-S00-005, INV-S00-006
- metodo: unitario
- procedimiento: ejecutar la verificación sobre un árbol con una migración de marca 20261016000000 y sobre otro con una de marca 20270101000000
- esperado: el primero termina con código 1 y el segundo con código 0
- test: tools/verificar-repo.test.mjs

### AC-S00-005
- enlaza: REQ-S00-006, REQ-S00-018, BEH-S00-005, INV-S00-003
- metodo: unitario
- procedimiento: ejecutar tools/verificar-env.mjs con un código de ejemplo que lee una variable ausente de .env.example (en notación de punto y en notación de corchetes), con uno consistente que tiene variables en la sección Solo Compose, y con un .env.example que trae un valor no marcado como solo local
- esperado: el primer y el cuarto caso terminan con código 1 nombrando la variable; el segundo y el tercero terminan con código 0
- test: tools/verificar-env.test.mjs

### AC-S00-006
- enlaza: REQ-S00-007, BEH-S00-006, BEH-S00-014, INV-S00-002
- metodo: integracion
- procedimiento: ejecutar gitleaks con .gitleaks.toml sobre un directorio de prueba que contiene la cadena ADHARA_TEST_SECRET_ seguida de 16 caracteres alfanuméricos, sobre otro sin ella y sobre el primero con una entrada de allowlist
- esperado: el primer caso termina con código distinto de 0, el segundo con código 0 y el tercero con código 0
- test: tools/verificar-gitleaks.test.mjs

### AC-S00-007
- enlaza: REQ-S00-008, REQ-S00-016, BEH-S00-002, BEH-S00-011
- metodo: e2e
- procedimiento: el propietario abre un pull request de prueba sin cambios funcionales sobre la copia importada; después, en otro pull request, quita de docs/linea-base-audit.json un identificador de aviso high que npm audit sí reporta
- esperado: en el primero lint, tipos, pruebas, build, gitleaks y npm audit no fallan por motivos que no figuren en docs/linea-base-tests.md; en el segundo falla solo el job de npm audit nombrando el identificador quitado
- test: pendiente

### AC-S00-008
- enlaza: REQ-S00-009, REQ-S00-010, REQ-S00-017, REQ-S00-027, BEH-S00-003
- metodo: manual
- procedimiento: una persona que no participó en la importación sigue solo el README en un clon limpio con un cronómetro, ejecuta docker compose up, comprueba docker compose ps, lista las tablas con docker compose exec y abre http://localhost:3000
- esperado: PostgreSQL y web-admin figuran como saludables, la base tiene al menos una tabla, la pantalla de inicio de sesión responde con HTTP 200 y el tiempo total es menor que 30 minutos
- test: pendiente

### AC-S00-009
- enlaza: REQ-S00-011
- metodo: manual
- procedimiento: comprobar que docs/linea-base-tests.md contiene el SHA completo, el número de tests por workspace, los fallos preexistentes, el resultado de lint, el resultado de tsc --noEmit en web-admin, kiosk y vitrina, el resultado del build, el resultado de npm audit, el tiempo, los archivos de web-admin con tests y el conteo de archivos que contienen la palabra organizacion en apps y packages, y que docs/linea-base-audit.json lista los avisos high y critical con sus identificadores
- esperado: los diez datos figuran en el primer archivo, el segundo es JSON válido con al menos un aviso, y el commit de ambos es anterior al de importación en git log
- test: pendiente

### AC-S00-010
- enlaza: REQ-S00-012, REQ-S00-020, BEH-S00-010
- metodo: unitario
- procedimiento: ejecutar tools/verificar-repo.mjs sobre un árbol con LICENSE correcto, sobre otro sin LICENSE, sobre otro con LICENSE sin la frase completa y sobre otro sin README.md
- esperado: el primer caso termina con código 0; los otros tres terminan con código 1 nombrando el archivo
- test: tools/verificar-repo.test.mjs

### AC-S00-011
- enlaza: REQ-S00-013, BEH-S00-027
- metodo: e2e
- procedimiento: el propietario abre tres pull requests de prueba con sus credenciales: uno con un commit conforme, uno con un trailer prohibido y uno sin handoff.md modificado, y observa el workflow politica
- esperado: el primero termina en verde, el segundo falla en el paso de política de commits y el tercero en el paso de handoff
- test: pendiente

### AC-S00-012
- enlaza: REQ-S00-019, BEH-S00-008, BEH-S00-018, INV-S00-004
- metodo: unitario
- procedimiento: invocar el helper con DATABASE_URL ausente, vacía y con un host ajeno; invocarlo con un host válido y un cliente de base de datos simulado
- esperado: los tres primeros casos lanzan un error que distingue la causa sin llamar al cliente; el cuarto crea una base cuyo nombre empieza por adhara_test_
- test: tools/base-efimera.test.mjs

### AC-S00-013
- enlaza: REQ-S00-015
- metodo: integracion
- procedimiento: tras aplicar las exclusiones, ejecutar npm ci, tsc --noEmit en web-admin, kiosk y vitrina, y el build, y comparar sus errores con los de docs/linea-base-tests.md
- esperado: no hay errores que no figuren en la línea base (el error de LayoutProps de web-admin y el fallo de Google Fonts de vitrina son de la línea base)
- test: pendiente

### AC-S00-014
- enlaza: REQ-S00-021, REQ-S00-028, BEH-S00-025, INV-S00-002
- metodo: manual
- procedimiento: comprobar que docs/informe-importacion.md existe antes del commit de importación y revisar su contenido
- esperado: incluye la lista de archivos con extensiones .json, .csv, .xls, .xlsx y .sql conservados, la lista de permitidos de packages/db y el cambio al lockfile, y la salida de gitleaks sobre el árbol completo es de código 0; el propietario lo aprueba por escrito
- test: pendiente

### AC-S00-015
- enlaza: REQ-S00-022, BEH-S00-017
- metodo: unitario
- procedimiento: ejecutar el hook pre-commit con un ejecutable gitleaks de prueba que termina con código 1, con otro que termina con código 0 y sin ninguno en el PATH
- esperado: el primer caso rechaza el commit, el segundo lo acepta y el tercero lo acepta mostrando un aviso
- test: tools/harness-selftest.mjs

### AC-S00-016
- enlaza: REQ-S00-023, BEH-S00-016
- metodo: unitario
- procedimiento: ejecutar la comprobación de privacidad de tools/importar-repo-a.mjs con un cliente de GitHub simulado que devuelve private true y con otro que devuelve private false
- esperado: el primer caso termina con código 0 y el segundo con código 1 pidiendo hacer privado el repositorio
- test: tools/importar-repo-a.test.mjs

### AC-S00-017
- enlaza: REQ-S00-024, BEH-S00-019
- metodo: unitario
- procedimiento: ejecutar tools/verificar-repo.mjs sobre un .gitignore completo y sobre otro sin el patrón *.keystore
- esperado: el primero termina con código 0 y el segundo con código 1 nombrando *.keystore
- test: tools/verificar-repo.test.mjs

### AC-S00-018
- enlaza: REQ-S00-025, BEH-S00-021
- metodo: integracion
- procedimiento: tras la importación de prueba, ejecutar git diff --diff-filter=MD entre el commit anterior y el árbol resultante limitado a README.md, CLAUDE.md, handoff.md, docs, .github, .claude, .githooks, tools, scripts, .editorconfig y .gitattributes
- esperado: no aparece ningún archivo modificado ni eliminado; solo pueden aparecer archivos añadidos docs/linea-base-tests.md, docs/linea-base-audit.json y docs/informe-importacion.md
- test: tools/importar-repo-a.test.mjs

### AC-S00-019
- enlaza: REQ-S00-014, BEH-S00-015, INV-S00-004
- metodo: integracion
- procedimiento: con el servicio PostgreSQL del CI, lanzar dos ejecuciones del helper con Promise.all, escribir una fila en cada base y comprobar que no se ven entre sí; al terminar consultar pg_database
- esperado: los dos nombres de base son distintos y empiezan por adhara_test_, cada ejecución ve solo su fila y ninguna base adhara_test_ sobrevive
- test: tools/base-efimera.integracion.test.mjs

### AC-S00-020
- enlaza: REQ-S00-031, BEH-S00-001, BEH-S00-007, BEH-S00-009
- metodo: integracion
- procedimiento: ejecutar tools/importar-repo-a.mjs sobre un Repo A ficticio con los archivos de la lista de exclusión en tres casos: completo, sin copia local o sin línea base, y con un workspace que importa una app omitida
- esperado: el primero deja el árbol conforme con la sección 0.2 y escribe docs/informe-importacion.md; el segundo termina con código distinto de 0 sin crear archivos; el tercero termina con código distinto de 0 y registra el error en el informe
- test: tools/importar-repo-a.test.mjs

### AC-S00-021
- enlaza: REQ-S00-029, BEH-S00-022
- metodo: unitario
- procedimiento: ejecutar tools/verificar-repo.mjs sobre docker-compose.yml y .github/workflows/ci.yml de prueba con versiones fijadas e iguales, con la etiqueta latest y con versiones mayores de PostgreSQL distintas
- esperado: el primer caso termina con código 0 y los otros dos con código 1 nombrando la causa
- test: tools/verificar-repo.test.mjs

### AC-S00-022
- enlaza: REQ-S00-009, REQ-S00-017, BEH-S00-012, BEH-S00-013, BEH-S00-023
- metodo: manual
- procedimiento: en un clon limpio ejecutar docker compose up sin .env, con el puerto 3000 ocupado y con una DATABASE_URL inválida en .env
- esperado: el primer caso falla mencionando .env.example sin arrancar servicios, el segundo falla nombrando el puerto 3000 y el tercero muestra el error de Prisma sin arrancar web-admin
- test: pendiente

### AC-S00-023
- enlaza: REQ-S00-030, BEH-S00-024
- metodo: unitario
- procedimiento: ejecutar tools/verificar-repo.mjs sobre un package.json cuyos scripts apuntan a archivos existentes y sobre otro con un script que apunta a un archivo inexistente
- esperado: el primero termina con código 0 y el segundo con código 1 nombrando el script y la ruta
- test: tools/verificar-repo.test.mjs

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Primero se escriben los scripts, sin dependencias nuevas salvo lo indicado, con `node:test`: `tools/verificar-repo.mjs`, `tools/verificar-env.mjs`, `tools/importar-repo-a.mjs`, el helper de base efímera y la prueba de gitleaks, cada uno con su archivo de pruebas (ADR-016 §8).
- `tools/verificar-env.mjs` debe leer `process.env.X` y `process.env["X"]`: el Repo A usa corchetes en `packages/db/prisma7.config.ts:16` y `packages/db/prisma7.local.config.ts:10`.
- El helper de base efímera usa el cliente `pg` (ya presente como dependencia transitiva en el lockfile, versión 8.23.0) como dependencia directa de desarrollo del workspace de pruebas; se justifica porque crear y destruir bases exige un cliente PostgreSQL y evita depender de `psql`. Sus pruebas unitarias usan un cliente simulado; la de concurrencia (AC-S00-019) usa el servicio PostgreSQL del CI.
- La prueba de gitleaks usa `.gitleaks.toml` con la regla propia `ADHARA_TEST_SECRET_` (SUP-S00-014).
- Los criterios e2e (AC-S00-007, AC-S00-011) y los manuales (AC-S00-008, AC-S00-022) los ejecuta el propietario o una persona que no participó. Precondiciones del propietario: repositorio privado, commits firmados con su identidad y, si quiere que un check en rojo impida fusionar, la protección de `main` (`docs/ops/github-setup.md` §4). Mientras los commits sigan bajo la excepción de ADR-014 §7, los e2e no pueden ejecutarse.
- La línea base de los scripts de calidad ya está medida (`docs/linea-base-tests.md`): `lint` y `build` existen; `test` solo en cuatro workspaces; `typecheck` no existe y se añade (SUP-S00-009).

### 5.2 Migración
- Estado: la **línea base ya está registrada** (2026-11-12, sobre `b4352a03`), con los archivos `docs/linea-base-tests.md` y `docs/linea-base-audit.json`. Para ejecutar la importación hace falta la copia local del Repo A (hoy hay un clon de solo lectura fuera de este repositorio) y que el remoto sea privado.
- Procedimiento (`tools/importar-repo-a.mjs`): (1) comprobar copia local, línea base y, con la opción correspondiente, remoto privado; (2) exportar el árbol con `git archive b4352a0` (sin `.git`) a un directorio nuevo; (3) aplicar la lista cerrada de exclusión y omitir `worker` y `kiosk-host`; (4) recortar los workspaces y regenerar `package-lock.json` (SUP-S00-012); (5) corregir con cambios de configuración las referencias rotas (`package.json` raíz y de `packages/db`, `prisma7.config.ts`, `Dockerfile`); (6) ejecutar gitleaks sobre el árbol y escribir `docs/informe-importacion.md`; (7) copiar al repositorio conservando los archivos propios en las colisiones; (8) ejecutar `tools/verificar-repo.mjs`, el build y gitleaks.
- **Quién firma:** el script deja el árbol listo y propone el mensaje de una línea; **el commit de importación lo crea el propietario con su identidad y su firma** (ADR-014 §2). El agente no lo ejecuta.
- «Cambio mínimo» al corregir un build roto significa editar solo archivos de configuración (`package.json`, `tsconfig*.json`, `turbo.json`, `prisma7.config.ts`, `Dockerfile`) y nunca código de `src/`.
- Reversión: antes del primer push, el commit de importación se descarta con `git reset` del propietario; no hay datos que revertir.
- Corrección al plan: la tarea 0.2 del doc 07 espera «un solo commit inicial» en el repositorio, pero este ya tiene los commits del arnés y la documentación; el criterio pasa a ser «un solo commit de importación sin historia del Repo A».
- Corrección al plan: el criterio de la tarea 0.3 («búsqueda de cédula/Adrenalina/zip sin hallazgos») no puede cumplirse en S-00, porque el código aún contiene esos términos (doc 09 §5: 40 archivos con *cédula*, 29 con marca anterior); se limita a los archivos de datos y scripts excluidos, y el resto se retira en S-06 y S-10.
- Corrección al plan: la tarea 0.9 (branding mínimo) pasa a S-19 (sistema de diseño y rebranding completos, ADR-020) por depender de P-15, del logo y de la tipografía; la tarea 0.8 (credenciales nuevas) es del propietario y no se verifica en el árbol más que por la ausencia de secretos.
- Corrección a ADR-005 §3: el seed del Repo A se **excluye** en lugar de «reescribirse»; el seed de Adhara llega con la spec de baseline y seed (SUP-S00-011).
- Cambio de arnés: REQ-S00-022 amplía `tools/hooks/pre-commit.mjs`, aprobado en G1; este cambio queda sujeto a la aprobación del propietario junto con S-00.

### 5.3 Riesgos
- Un workspace conservado puede importar una app omitida y romper el build (no verificado); mitigación: el script no deja el árbol listo y registra el error (BEH-S00-009).
- Con workspaces recortados el `package-lock.json` puede quedar desincronizado y `npm ci` falla; mitigación: regenerarlo y revisar el cambio en el informe (SUP-S00-012).
- El entrypoint con cero migraciones puede dejar la base sin tablas; mitigación: Compose ejecuta `prisma db push` (SUP-S00-010, REQ-S00-017). `Dockerfile` copia `packages/config` y `packages/design-system` (`Dockerfile:18`, `:20`): por eso ambos se conservan vacíos (REQ-S00-004).
- `packages/db/Dockerfile.migrate` es destructivo (`rm -rf prisma/migrations/*` y `prisma migrate reset --force`, `:32`) y se excluye. El mecanismo de migración del despliegue llega con S-15 y S-17.
- `packages/db` queda **sin tests** porque sus 5 archivos están en directorios excluidos, y `vitest run` sin archivos termina con error; mitigación: `--passWithNoTests` (SUP-S00-015).
- La compilación de Android exige `debug.keystore` (`apps/kiosk-tv/capacitor/android/app/build.gradle:21-22` y el equivalente de `vitrina-tv`), de modo que sin ese archivo las apps de TV no compilan; mitigación: S-20 y S-21 definen su propia firma sin versionar claves.
- El build de `vitrina` descarga *Barlow* y *Bebas Neue* de Google Fonts (`apps/vitrina/app/layout.tsx:2`) y falla sin acceso a ese host; mitigación: S-19 decide cómo autohospedar las tipografías; hasta entonces `vitrina` figura como fallo de la línea base.
- `apps/vitrina` depende de `@gym-app/domain` (`apps/vitrina/package.json:15`) y ADR-021 pide kioscos sin lógica; se trata en S-20, S-00 solo importa.
- `xlsx` (`packages/db/package.json:29`, vulnerabilidad high) queda como dependencia aunque se excluyan los scripts de Excel; mitigación: se anota en el informe de importación y se retira en S-10.
- Las variables de las apps omitidas (`ZIP_GYM_PASSWORD`, `VITRINA_*`) desaparecen de `.env.example` si ya nadie las lee; mitigación: `verificar-env` compara contra el código que queda.
- Puede haber PII fuera de la lista de exclusión (comentarios, fixtures o archivos de datos); mitigación: gitleaks sobre el árbol y revisión del propietario de la lista de archivos de datos conservados (REQ-S00-028).
- Los falsos positivos de gitleaks bloquearían pull requests; mitigación: allowlist en `.gitleaks.toml` con motivo, visible en el diff del pull request (BEH-S00-014).
- La línea base tiene vulnerabilidades preexistentes, entre ellas una crítica en `next`; los criterios de S-00 se miden contra ella, no contra cero.
- Dependencias nuevas: gitleaks (binario de CI) y `pg` (helper de pruebas). Justificación de gitleaks: ADR-005 §4 y ADR-012 §7 lo exigen; protege el árbol importado y los pull requests futuros (el repositorio no tiene historia del Repo A) y las expresiones regulares locales no cubren formatos de proveedores. La versión de gitleaks y la versión mayor de PostgreSQL se fijan sin `latest` y la de PostgreSQL debe coincidir entre Compose y CI (REQ-S00-029).

### 5.4 Preguntas abiertas
- ¿Se conservan `packages/domain-custom`, `design-system` y `config`? Default: `domain-custom` no es un workspace y se omite; `design-system` y `config` se conservan vacíos (ADR-020 y `Dockerfile:18` y `:20`).
- ¿Cómo se obtiene la copia local del Repo A? Default: un clon de solo lectura de `b4352a0` (ya existe uno fuera de este repositorio) y el procedimiento usa `git archive b4352a0`.
- ¿Se activa Dependabot (doc 04 §Seguridad)? Default: no entra en S-00; se evalúa en el plan global.
- ¿Cuál es la razón social para el aviso de copyright? Default: «Adhara Fit».
- ¿Se compilan las apps de TV en el CI de S-00? Default: no; se compilan en S-20 y S-21.
- ¿Quién ejecuta los criterios e2e mientras los commits no estén firmados por el propietario? Default: el propietario, después de publicar el repositorio con su identidad.

## Revisión independiente

### Veredicto de `spec-reviewer` (texto íntegro, sin editar)
Revisado sobre la versión anterior de esta spec (borrador pasado a `en-revision`). Solo lectura; el revisor no ejecutó `tools/spec-lint.mjs`.

Revisión independiente de `/home/user/adhara-fit/docs/superpowers/specs/S-00-fundaciones-del-repo.md`. No edité nada. No ejecuté `tools/spec-lint.mjs`: solo tengo herramientas de lectura. Lo apliqué a mano leyendo `tools/spec-lint.mjs`. Por eso la conformidad estructural de la tabla es de lectura y no de ejecución. Lo que depende del Repo A lo trato como no verificable.

| # | Comprobación | Veredicto | Evidencia (archivo:línea) | Qué corregir |
|---|---|---|---|---|
| 1 | Cabecera completa y ADRs citados existentes y aceptados | **CUMPLE** | Spec:1-8 tiene las 6 claves. `estado: en-revision` con `aprobada_por` y `fecha_aprobacion` vacíos, como exige `spec-lint.mjs:184-186`. ADR-001, 005, 009, 012, 014, 016 y 017 existen y su línea 3 dice «aceptado (confirmado por el propietario, 2026-11-12)». Todos los ADR citados en los `origen` están en `adrs` (regla A03). `depende_de: ninguna` es válido. | Nada. Observación: ADR-007 (padrón Excel) sigue «propuesto» y no puede citarse, aunque ADR-005 §3 excluye `migracion-excel/` y `docs/xls/` (ver fila 8). |
| 2 | Cada REQ es una obligación, EARS, con prioridad y origen | **NO CUMPLE** | Los 15 REQ tienen tipo, prioridad, origen y un solo «deberá», así que el lint pasa. Aun así hay REQ compuestos: REQ-S00-007 (:101) junta ejecutar y fallar. REQ-S00-008 (:107) junta cinco verificaciones y el fallo. REQ-S00-009 (:113) junta iniciar PostgreSQL, iniciar web-admin y mostrar la pantalla. REQ-S00-013 (:137) junta cuatro comprobaciones. REQ-S00-014 (:143) junta usar una base efímera y abortar. REQ-S00-015 (:149) junta tres comprobaciones. «Cuando se abre un PR» (:101, :107, :137) solo cubre la apertura, no los commits posteriores. `politica.yml:5-8` corre solo en PR hacia `main`. REQ-S00-008 no fija el umbral de `npm audit`, que queda solo en SUP-S00-004 (:50). | Dividir los REQ compuestos o justificar cada cadena. Usar «Cuando se abre o actualiza un pull request». Subir el umbral de `npm audit` (high/critical) a un REQ. Reconciliar REQ-S00-009 con 0.2 (:20), que promete PostgreSQL + web-admin + **kiosk** en compose. Añadir REQ para lo que hoy solo está en BEH o riesgos: CI ejecuta `verificar-env` (BEH-S00-005), comprobación de archivos obligatorios (BEH-S00-010), «no puede fusionarse» (BEH-S00-006, :195), PII (5.3 :367), gitleaks en pre-commit (ADR-005 §4; ver fila 8) y `.gitignore` reforzado (fila 8). |
| 3 | Cobertura REQ→BEH, REQ MUST→AC, INV con mecanismo, detección y AC | **CUMPLE** (formal), con defectos de fondo | Cobertura completa. Cada REQ tiene BEH (:156-223). Los 14 REQ MUST tienen AC directo (:259-348). INV-001…005 (:228-254) tienen `mecanismo`, `deteccion` y AC. Defectos de fondo: INV-S00-005 (:253-255) declara mecanismo `lint`, pero la «verificación de importación» no existe como script ni REQ. Su detección (`git cat-file -e b4352a0^{commit}`) solo prueba que falta ese commit, no «ningún objeto de la historia del Repo A». INV-S00-002 (:234) cubre «árbol y rango», pero REQ-S00-007 solo exige el rango. BEH-S00-007 (:197) y BEH-S00-009 (:211) no tienen AC que ejerza su resultado. | Definir y nombrar el script de verificación de importación (o convertir INV-S00-005 en comprobación manual honesta). Usar el SHA completo. Añadir una comprobación más fuerte, p. ej. que `git rev-list --max-parents=0` dé un único commit de importación. Alinear INV-S00-002 con REQ-S00-007 (añadir escaneo del árbol) y crear AC para BEH-S00-007 y BEH-S00-009. |
| 4 | Cada AC binario, con método y esperado, y enlaces válidos | **NO CUMPLE** | Los enlaces existen y los métodos son válidos. Los siguientes no se pueden comprobar de forma objetiva. **AC-S00-001** (:259-264): «el commit de importación es único» no tiene criterio, y el procedimiento no ejerce BEH-S00-007, que sí enlaza. **AC-S00-002** (:266-271): el verificador opera sobre «árbol versionado» (`git ls-files`) o sobre disco, y crear `apps/kiosk/cookies.txt` sin `git add` no aparecería. **AC-S00-003** (:273-278): «solo los workflows de este repositorio» no está enumerado y los paquetes de REQ-S00-004 no se prueban. **AC-S00-004** (:280-285): «ningún `migration.sql`» fallará para siempre al generarse el baseline (SUP-S00-002), pese a que REQ-S00-005 dice «heredada». **AC-S00-006** (:294-299): «PR bloqueado» exige protección de rama o checks obligatorios, que no están en la spec, y ADR-014:39 dice que quizá no están disponibles. Además, una cadena con forma de token GitHub puede ser bloqueada por el push protection de GitHub. **AC-S00-007** (:301-306): «cinco jobs en verde» contradice 5.3 (:369), que admite fallos preexistentes. «Vulnerabilidad high simulada» no tiene método. **AC-S00-008** (:308-313): no dice quién prueba, ni verifica que PostgreSQL arrancó, ni el puerto (5.4 :376 lo deja abierto). **AC-S00-010** (:322-327): solo busca «Todos los derechos reservados», no el copyright, y se implementa en `verificar-exclusiones.test.mjs`. **AC-S00-011** (:329-334): crear el commit con trailer prohibido exige saltarse `commit-msg`, y ADR-014 §2 prohíbe `--no-verify` al agente. Solo ejerce la política de commits, no firmas, handoff ni spec-lint (REQ-S00-013). **AC-S00-012** (:336-341): «host que no es el efímero» no está definido y no hay ruta de test. **AC-S00-013** (:343-348): compara con `docs/linea-base-tests.md`, pero AC-S00-009 (:318) no exige registrar errores de `tsc`/build. «El procedimiento no se da por terminado» no es observable. | Definir criterios objetivos para cada AC citado. Establecer qué identifica a la base efímera (nombre o patrón de host/DB). Quitar «etc.»-tipo ambigüedades como «workflows de este repositorio» con una lista cerrada. Reemplazar AC-S00-004 por «ninguna migración con timestamp ≤ 20261016…» o fechar su vigencia. Añadir la protección de rama como precondición o REQ. Cambiar AC-S00-007 a «sin fallos nuevos frente a línea base». Registrar en la línea base el resultado de lint, `tsc`, build y `npm audit`. Indicar quién crea los commits de prueba (propietario) y cómo. |
| 5 | Afirmaciones sobre código con archivo:línea o «no verificado»; supuestos con default | **NO CUMPLE** (parcial) | La marca «no re-verificado / no verificado» está en todos los puntos de 0.4 (:36-44) y los 9 supuestos tienen `Default:` y «asumido, por validar» (:47-55). Pero la **atribución de fuentes es incorrecta**: :36 cita «doc 11 DI-88» para «público, sin licencia, 732 commits, PII y credenciales en su historia». Esa fila (doc 11, DI-88) solo cubre seed, `cookies.txt` y keystores del árbol actual. En doc 11 no aparecen «732», «licencia» ni «público». REVISION-ADR T-04 marca «732 commits» como sin respaldo en 09/11. :40 cita DI-85, pero DI-85 menciona además `VITRINA_API_URL`, `VITRINA_CLAVE`, `VITRINA_DEV_URL` y `KIOSCO_*` en workflows/scripts, que no están en la lista. La lista sale de doc 09 línea 105. **Sin marcar como supuesto**: que tras excluir `ZIP_GYM_PASSWORD` y `VITRINA_WEB_DIR` (scripts y apps omitidas) sigan en `.env.example`; que `npm ci` funcione con workspaces recortados (el `package-lock.json` los lista); que `prisma migrate deploy` del entrypoint (doc 11 DI-83, ⚠️) no falle con cero migraciones (doc 09:106 dice que «un fallo bloquea el servicio»); que el kiosco pueda levantarse en compose (doc 11 DI-02: es export estático). | Corregir la cita de :36 («dato de ADR-005; no verificado») y reconciliar la lista de variables con DI-85. Añadir SUP/riesgos con default para: lockfile con workspaces recortados, `migrate deploy` sin migraciones, y variables que desaparecen con las exclusiones. |
| 6 | Sin TBD/etc./adjetivos vagos; sin dependencias sin justificar; nada fuera de alcance | **NO CUMPLE** (parcial) | Léxico: no hay «TBD», «por definir», «etc.» ni los adjetivos de `spec-lint.mjs:45-49`; pasaría T01/T02. Dependencias: gitleaks está justificado en 5.3 (:370). Pero la justificación «secretos en historia» no aplica a un repo sin historia. No se fija **versión de gitleaks** ni de PostgreSQL (:49, :20). Vaguedad sin medida: «cambio mínimo» (:366), «excluidas revisadas por el propietario» (:368), «los paquetes de los que dependen» (:83). **Fuera de alcance dentro del cuerpo**: :31 propone una «spec de productos S-11», pero REVISION-ADR D10 (:100) reserva S-11 para HU-50. COBERTURA-RF:52 sí usa S-11 = Productos, así que hay dos usos incompatibles. | Fijar versiones (gitleaks y imagen de PostgreSQL). Cambiar la justificación de gitleaks (protege el rango de PR y los PR futuros, no la historia). Eliminar o reducir :31 a «ver COBERTURA-RF» y resolver la colisión del ID S-11. |
| 7 | Escenarios de bordes, errores y concurrencia | **NO CUMPLE** (parcial) | Hay `feliz` (3), `borde` (3: 004, 005, 010) y `error` (4: 006…009), y la spec declara concurrencia con motivo en :153. Falta: `DATABASE_URL` ausente o vacía en el helper (BEH-S00-008 solo cubre host equivocado). Puerto en uso en compose. Falso positivo de gitleaks (riesgo en :368 sin BEH). `.env` sin copiar. `npm audit` con highs preexistentes (el caso más probable). Mayúsculas/minúsculas en exclusiones (`Cookies.txt`, `HANDOFF.md`). **Sobre el motivo «no aplica»** (:153): es correcto para concurrencia de negocio, pero demasiado amplio. S-00 incluye REQ-S00-014 (base efímera «por ejecución»), y hay riesgo real si dos workspaces o dos jobs paralelos comparten una misma base de pruebas (ADR-016 §2: «nunca comparten base»). SUP-S00-007 (:53) mezcla «desechable» (volumen borrable) con «efímera» (creada y destruida por ejecución, ADR-016). Un volumen persistente de compose no cumple ADR-016. | Reescribir el `no_aplica`: «sin concurrencia de negocio; el aislamiento de la base entre ejecuciones paralelas lo cubre REQ-S00-014/BEH-S00-008» y añadir ese caso al BEH. Añadir BEH de borde/error para variable ausente, puerto ocupado, falso positivo y audit con highs heredados. Distinguir en SUP-S00-007 «desechable» de «efímera». |
| 8 | Alcance frente al plan doc 07 (0.1-0.9) y ADR-005 §3 | **NO CUMPLE** | **0.1** licencia: REQ-S00-012; hacer privado el Repo A queda fuera (:32). Falta precondición de que `adhara-fit` esté **privado** antes de empujar la importación (ADR-005:15; plan 0.2). **0.2**: «un solo commit inicial» corregido en 5.2 (:362), bien documentado. **0.3**: REQ-S00-002 remite a la lista de ADR-005 §3 sin enumerarla, y falta fijar patrones concretos para «scripts `zip-gym`» y «todos los scripts de mantenimiento de `packages/db`». **Contradicción de INV-001/REQ-S00-003** (:77, :228) con `handoff.md`: ADR-005 §3 excluye `handoff.md` «en ninguna ruta», pero este repo lo exige en la raíz (`politica.yml:59-66`, `CLAUDE.md` §6). **Credenciales**: 0.3 (:29) exige «no haya credenciales del Repo A en el árbol», pero `prisma/seed.ts` (doc 11 DI-88: `admin1234`, `entrenador1234`) se conserva, ADR-005 §3 solo dice «reescrito/revisar», y ningún REQ/AC lo cubre (el plan lo deja a 0.10 = S-01). **0.4**: faltan `.gitignore` reforzado y el tratamiento de `CLAUDE.md` del Repo A; no se define qué ocurre con colisiones de `README.md`, `CLAUDE.md`, `docs/`, `.gitignore`, `package.json` entre el árbol importado y los archivos propios (:360, paso 4). `.env.example` «sin valores» (:95) choca con BEH-S00-003 (:172-174), que copia `.env.example` a `.env` y levanta compose sin editar (hace falta al menos una contraseña de PostgreSQL local). **0.5**: compose solo prueba que carga el login (:113); no dice cómo se crea el esquema sin migraciones (el entrypoint corre `migrate deploy`, doc 09:106). **0.6**: no hay trigger en `push` a `main` (el plan pide «verde en main y PR»). **0.7**: bien (REQ-S00-011). **0.8**: fuera de alcance justificada (:29). **0.9**: trasladar el branding a S-10 (:27, SUP-S00-008) no figura en las «Correcciones al plan» de 5.2. S-10 en doc 10:46 es solo retirada de marca anterior y no se ve el branding Adhara en COBERTURA-RF. **gitleaks en pre-commit**: ADR-005 §4 y D13 lo piden; SUP-S00-003 (:49) lo degrada a «opcional» sin REQ ni AC. **PII**: la búsqueda de nombres reales (:367) no tiene REQ ni AC. **0.3/ADR-007**: 0.3 (:26) dice que el padrón Excel va a S-10, pero ADR-005 §3 excluye `migracion-excel/` y `docs/xls/` en S-00. | Añadir una precondición (repo privado) y la lista cerrada de exclusiones con exención explícita del `handoff.md` raíz. Decidir y especificar el seed (excluir, reescribir o `admin1234` detectable por el verificador). Especificar fusión/colisiones de archivos de la raíz y el lockfile. Añadir `.gitignore` al alcance. Alinear `.env.example` con compose (valores locales marcados como no secretos, o paso de edición documentado). Definir cómo se crea el esquema en compose. Añadir trigger de `push` a `main`. Convertir el pre-commit de gitleaks en REQ/AC o registrar la desviación de ADR-005. Añadir REQ/AC verificable para PII. Mover la nota de branding a «Corrección al plan». Aclarar la división S-00/S-10 del padrón. |

**Notas**
- Los bloqueantes por prioridad son: (1) la contradicción entre «handoff.md en ninguna ruta» y el arnés; (2) el seed con `admin1234`, que queda sin cubrir; (3) AC-S00-007 «verde» frente a la línea base con posibles fallos; (4) el `.env.example` «sin valores» frente al flujo de compose de BEH-S00-003; (5) el esquema de BD en compose sin migraciones; (6) las precondiciones de los AC e2e (firma del propietario, repo privado y protección de rama).
- Los AC e2e (006, 007, 011) necesitan GitHub con commits firmados por el propietario. Mientras ADR-014 §7 permita commits de la excepción en la nube, no pueden ejecutarse. La spec no lo declara.
- Estructura de la spec: las secciones, subsecciones y el formato de los IDs que `spec-lint.mjs` exige están presentes. Con `estado: en-revision` la cobertura (C01-C04) y los ADR aceptados pasarían.

VEREDICTO GLOBAL: REQUIERE CAMBIOS

### Respuesta del autor a ese veredicto
Aplicado (versión actual de esta spec):
- **Fila 2:** REQ compuestos divididos o reformulados (007, 008, 009, 013, 014, 015); «abre o actualiza» y push a `main`; umbral de `npm audit` en REQ-S00-016; nuevos REQ-S00-017 a 026 para esquema en Compose, `.env.example`, helper de base, archivos obligatorios, gitleaks en árbol y en `pre-commit`, repo privado, `.gitignore`, colisiones y seed. Compose queda en PostgreSQL y `web-admin` (SUP-S00-013).
- **Fila 3:** `tools/verificar-repo.mjs` con opción de historia, SHA completo, único padre y cierre de dependencias (INV-S00-005 y 006); INV-S00-002 alineado con REQ-S00-021; AC nuevos para BEH-S00-007 y BEH-S00-009.
- **Fila 4:** AC reescritos con criterios objetivos: verificador sobre archivos no versionados, lista cerrada, corte de migraciones en `20261016000000`, regla propia de gitleaks, base efímera con prefijo `adhara_test_`, «sin fallos nuevos frente a la línea base», quién ejecuta los e2e.
- **Fila 5:** cita de «732 commits» corregida a «sin respaldo»; lista de variables reconciliada con DI-85; SUP-S00-010 a 014 y riesgos nuevos (lockfile, migraciones vacías, variables que desaparecen, kiosco como export estático).
- **Fila 6:** versiones de gitleaks y PostgreSQL fijadas sin `latest` (valores concretos no verificados); justificación de gitleaks corregida; «cambio mínimo» definido; referencia a S-11 sustituida por `COBERTURA-RF`.
- **Fila 7:** concurrencia real con BEH-S00-015 (en lugar de `no_aplica`); BEH para variable ausente, puerto ocupado, `.env` sin copiar, falso positivo de gitleaks, `npm audit` con vulnerabilidades heredadas y mayúsculas; SUP-S00-007 distingue «desechable» de «efímera».
- **Fila 8:** lista cerrada de exclusión en 0.2 (con exención de `handoff.md` raíz), seed excluido (SUP-S00-011), colisiones resueltas (REQ-S00-025), `.gitignore` y archivos obligatorios con REQ y AC, trigger en `push` a `main`, corrección al plan para el branding, división S-00/S-10 del padrón aclarada.

No aplicado, con motivo:
- **Protección de rama como REQ:** es configuración de GitHub del propietario, no un requisito del repositorio; queda como precondición en 5.1 y en `docs/ops/github-setup.md` §4.
- **Valores concretos de versión de gitleaks y PostgreSQL:** no los afirmo porque no puedo verificarlos desde esta sesión; la spec exige fijarlos y que la de PostgreSQL coincida en Compose y CI.
- **Colisión del ID S-11:** la sugerencia de REVISION-ADR D10 (S-11 = importador) queda sustituida por `docs/superpowers/COBERTURA-RF.md` (el importador pasa a S-16).
- La versión corregida **no se volvió a pasar por el revisor**.

### Cambio de alcance posterior a la revisión (2026-11-12)
Decisiones del propietario posteriores al veredicto anterior (2026-11-12): la vitrina y el check-in en smart-TV entran en el alcance (ADR-021, enmienda a ADR-009); el negocio es único y se elimina `Organizacion` (ADR-019), por lo que la línea base cuenta los archivos que la mencionan; el rebranding completo pasa a S-19 (ADR-020); y no hay egresos ni fiado (ADR-018). ADR-018 a ADR-021 fueron aceptados ese día. Además se verificó el Repo A con un clon de solo lectura y se sustituyeron los «no re-verificado» por hechos con evidencia. Esta versión **no ha sido revisada** y el veredicto de arriba describe el alcance anterior.


### Segundo veredicto de `spec-reviewer` (texto íntegro, sin editar)
Revisó la versión de esta spec previa a las correcciones de abajo (estado `en-revision`, con el clon del Repo A a la vista). Solo lectura; el revisor no ejecutó `tools/spec-lint.mjs`.

Revisión de `/home/user/adhara-fit/docs/superpowers/specs/S-00-fundaciones-del-repo.md` (versión actual, estado `en-revision`). No edité nada y no ejecuté `tools/spec-lint.mjs`: solo tengo herramientas de lectura, así que la conformidad estructural es de lectura.

Contrasté con el clon `/home/user/kaiserone01/gym-app` por lectura (Glob/Grep/Read; no ejecuté nada). El clon es superficial (`.git/shallow`). Los archivos `cookies.txt` y `debug.keystore` no están en su árbol de trabajo, pero `.git/index` contiene 3 coincidencias con esos nombres.

| # | Comprobación | Veredicto | Evidencia (archivo:línea) | Qué corregir |
|---|---|---|---|---|
| 1 | Cabecera completa; ADRs citados existentes y aceptados | CUMPLE | Spec:1-8 tiene las seis claves. `aprobada_por` y `fecha_aprobacion` vacíos es válido en `en-revision`. ADR-001, 005, 009, 012, 014, 016, 017, 020 y 021 existen y su línea 3 dice «aceptado (confirmado por el propietario, 2026-11-12)». Todos los ADR de los `origen` figuran en `adrs`. ADR-007 sigue «propuesto» y no se cita (spec:35), lo cual es correcto. ADR-018 y ADR-019 (aceptados) se aplican en el texto (spec:40, 143) pero no están en `adrs`. | Añadir ADR-018 y ADR-019 a `adrs`, o quitar la dependencia implícita. El ADR-019 es la razón del conteo de «organización» de REQ-S00-011. |
| 2 | Cada REQ: una obligación, EARS, prioridad y origen | NO CUMPLE (parcial) | Los 26 REQ tienen tipo, prioridad, origen y un «deberá». Siguen compuestos: REQ-S00-009 (:131) junta iniciar dos servicios con salud y publicar el puerto. REQ-S00-021 (:203) junta ejecutar gitleaks, registrar su resultado y listar archivos. REQ-S00-012 (:149) junta copyright y licencia privativa. REQ-S00-011 (:143) enumera siete resultados más el conteo. **Contradicción entre REQ-S00-006/INV-S00-003 (:113, :399) y REQ-S00-018 (:185):** los primeros exigen conjunto de `process.env` igual al de `.env.example`. REQ-018 y BEH-S00-003 exigen en `.env.example` valores de PostgreSQL para Compose (`POSTGRES_*`), que no se leen con `process.env`. Esas variables serían «sobrantes» y `verificar-env` fallaría. REQ-S00-019 (:191) dice «base efímera» sin definirla; la definición (prefijo `adhara_test_`) solo está en BEH-S00-018 (:359). Tampoco queda claro quién crea la base si `DATABASE_URL` ya debe apuntar a ella (REQ-014 frente a REQ-019). REQ-S00-012 no tiene verificación en CI, pero AC-S00-010 la prueba con `verificar-repo.mjs`. | Dividir REQ-009 y REQ-021. Excluir de la igualdad de REQ-006 las variables que solo consume Compose (lista cerrada) o separarlas en otro archivo. Llevar la definición de «base efímera» (prefijo, host permitido) a REQ-019. Aclarar el flujo crear/destruir de REQ-014. Añadir a REQ-020 el contenido de LICENSE, o quitar esa comprobación de AC-010. |
| 3 | Cobertura REQ→BEH, REQ MUST→AC, INV con mecanismo, detección y AC | CUMPLE (formal), con defectos de fondo | Los 26 REQ aparecen en algún `cubre`. Todos los MUST tienen AC directo o vía BEH. INV-001…006 tienen mecanismo, detección y AC. Defectos: **INV-S00-001 / REQ-S00-026 / AC-S00-002 (:386, :233, :431)** exigen que ningún archivo versionado contenga `admin1234`. Verificado: este mismo repositorio tiene esa cadena en ADR-005 (línea 17), docs/03:69, docs/09, docs/11:111 y en la propia spec (:28, :49, :233, :374, :435). El caso «árbol limpio → código 0» del AC-002 es imposible en el repositorio real. Lo mismo ocurrirá con los fixtures de `tools/verificar-repo.test.mjs`. **INV-S00-005 (:410-414)** solo comprueba que el SHA de la punta `b4352a0` no existe y que el commit de importación tiene un padre. No detecta un merge posterior de un commit ancestro del Repo A, y REQ-001 dice «ningún commit del Repo A». INV-S00-002 (:392) incluye «árbol del commit de importación» pero ningún AC lo enlaza (AC-014 lo cubre sin enlazar el INV). INV-S00-006 dice «si sobra o falta» y AC-003 solo prueba «sobra». | Acotar la búsqueda de contraseñas a las rutas importadas, con una exención explícita de `docs/` y de los fixtures; o hacerla solo en el procedimiento de importación. Fortalecer INV-005: todas las raíces de la historia son del repositorio (`git rev-list --max-parents=0`) y ningún commit alcanzable tiene un autor o SHA del Repo A. Enlazar AC-014 a INV-002. Añadir el caso «falta una app» a AC-003. |
| 4 | Cada AC binario, con método y esperado, y enlaces válidos | NO CUMPLE | Los enlaces apuntan a IDs existentes y los métodos son válidos. No objetivos o que no ejercen lo que enlazan: **AC-S00-001 (:424)** enlaza BEH-007 pero no ejerce «sin copia local»; el «procedimiento de importación» no es un script nombrado, así que BEH-007, BEH-009 y BEH-016 describen una herramienta que no existe. **AC-S00-005 (:452)** enlaza BEH-013 («Compose falla sin `.env`») y su procedimiento es de `verificar-env`. **AC-S00-008 (:473)** enlaza BEH-012 (puerto ocupado) y BEH-013, y su procedimiento no los ejerce. **AC-S00-009 (:480)** dice «los ocho datos», pero el procedimiento enumera diez (SHA, tests, fallos, lint, tipos, build, audit, tiempo, archivos de web-admin con tests, conteo de organización). REQ-011 solo pide siete y no incluye tiempo ni archivos de web-admin. **AC-S00-012 (:501)** es «unitario», pero comprobar que la base «se elimina» exige PostgreSQL. «Invocarlo dos veces seguidas» no prueba concurrencia (BEH-S00-015 pide jobs en paralelo). El helper no tiene ruta nombrada, solo su test. **AC-S00-007 (:466)**: «vulnerabilidad high nueva» no tiene paquete concreto y depende de la base de avisos del día. «No figuren en la línea base» exige un formato legible por máquina; `docs/linea-base-tests.md` es prosa. **AC-S00-010 (:487)** comprueba solo la frase «Todos los derechos reservados», no el aviso de copyright. **AC-S00-018 (:543)** prueba REQ-025 por `git diff` sobre rutas que también recibirán `docs/informe-importacion.md` y `docs/linea-base-tests.md`. «Ninguna línea modificada ni eliminada» no dice qué pasa con las añadidas. | Nombrar el script del procedimiento (p. ej. `tools/importar-repo-a.mjs`) y darle AC. Hacer que cada AC ejerza todos los BEH que enlaza, o quitar el enlace. Corregir «ocho» y alinear REQ-011 con AC-009. Definir el formato de la línea base de audit (IDs de aviso en JSON). Usar paralelismo real (`Promise.all`) y una base real en AC-012, con método `integracion`. Fijar el paquete de prueba del AC-007. |
| 5 | Afirmaciones sobre el código con archivo:línea / «verificado con comando» / «no verificado»; supuestos con default | NO CUMPLE (parcial) | **Confirmadas en el clon:** seed.ts:41, :50, :55; Dockerfile:40, :42, :70; docker-entrypoint.sh:11, :13; `output` en apps/web-admin/next.config.ts:7, apps/kiosk/next.config.ts:9, apps/vitrina/next.config.ts:6; puertos 3001/3002 en package.json:6; `VitrinaItem` en schema.prisma:684; 36 migraciones de `20260913024831` a `20261016000000`; 3 workflows; 3 archivos en `docs/adr` del Repo A; ausencia de `.env.example` y `LICENSE`; sin `test` ni `typecheck` en el `package.json` raíz y `web-admin` sin `test`; tsconfig solo en kiosk, vitrina y web-admin (más worker); 7 documentos en `docs/superpowers/plans` con `admin1234`; `domain-custom` solo con `.gitkeep`; cierre de dependencias `db, domain, infrastructure, theming, ui` (web-admin/package.json:12-16, vitrina:15-16, kiosk:13-14, infrastructure:8-9). **Falsas o no reproducibles:** (a) spec:50 «exactamente 12 variables (verificado)» es falso. `packages/db/prisma7.local.config.ts:10` lee `process.env["DATABASE_URL_LOCAL"]` (13 variables). La cifra sale de un grep que solo captura `process.env.X` (doc 09 §8.1). `prisma7.config.ts:16` también usa notación de corchetes, que `verificar-env` debe soportar. (b) spec:47-48 cita `ls` y `find` para `cookies.txt` y `debug.keystore`, pero esos archivos no están en el árbol de trabajo del clon; solo `.git/index` los referencia. El comando reproducible es `git ls-files`. (c) **spec:575** dice que sin `debug.keystore` Gradle «debería generar el suyo». Contradicho por `apps/kiosk-tv/capacitor/android/app/build.gradle:21-22` y `apps/vitrina-tv/.../build.gradle:21-22` (`storeFile file("debug.keystore")`, `storePassword "android"`): el build de Android fallará sin ese archivo. (d) Las apps `kiosk-tv` y `vitrina-tv` no son workspaces de npm: su `package.json` está en `apps/*/capacitor/package.json` y el glob `apps/*` no lo ve. spec:56, INV-006 y REQ-004 las tratan como workspaces y no dicen cómo se calcula su cierre. (e) `packages/db` queda sin ningún test: los 5 `*.test.ts` están en `clonarZipGym/` y `migracion-excel/` (excluidos), y `vitest run` sin archivos termina con error. No figura en riesgos. (f) La SUP-S00-009 no cubre cómo se mide «tipos» en la línea base (REQ-011) antes de que exista el script. (g) ADR-021 §Invariantes dice que la vitrina no importa dominio, pero `apps/vitrina/package.json:15` depende de `@gym-app/domain`; la spec no lo señala. | Corregir la cifra a 13 variables (o 13 con `DATABASE_URL_LOCAL`) y el comando de verificación. Cambiar `ls`/`find` por `git ls-files`. Reescribir el riesgo de spec:575 con `build.gradle:21`. Añadir un SUP o riesgo para `packages/db` sin tests (default: `vitest run --passWithNoTests` o quitar el script). Definir el tratamiento de `capacitor/package.json`. Definir cómo se mide «tipos» en la línea base. Anotar la dependencia de `domain` para S-20. |
| 6 | Sin TBD/etc./adjetivos vagos; sin dependencias nuevas sin justificar; nada fuera de alcance | NO CUMPLE (parcial) | No hay «TBD», «por definir» ni «etc.» en el cuerpo (solo en la cita del veredicto previo, spec:599 y :601, que `spec-lint` en `aprobada` podría marcar). gitleaks está justificado en 5.3 (:577). 5.3 exige fijar versiones de gitleaks y PostgreSQL, pero no hay AC que compruebe «sin `latest`» ni que ambas versiones coincidan. El helper de base efímera (REQ-014) necesita un cliente PostgreSQL; la spec no dice si usa `pg` (hoy transitivo vía `@prisma/adapter-pg`) o `psql`, ni lo justifica. El «conteo de archivos que mencionan organización» (REQ-011) no define patrón ni alcance (doc 09 R-05 usa `organizacionId` en `apps` y `packages`). `xlsx` (packages/db/package.json:29) queda como dependencia aunque se excluyen los scripts de Excel; no se menciona. | Dar el patrón, las extensiones y los directorios del conteo. Declarar el cliente PostgreSQL del helper y justificarlo. Añadir una comprobación de versiones fijadas. Mover la cita con «etc.» a una forma que no tropiece con el lint, o revisar cómo lo trata `spec-lint`. Anotar `xlsx` en el informe de importación. |
| 7 | Escenarios de bordes, errores y concurrencia | CUMPLE (con reservas) | Hay `feliz` (3), `borde`, `error` y `concurrencia` (BEH-015). Se cubren mayúsculas, puerto ocupado, `.env` ausente, falso positivo y audit con highs heredados. Reservas: BEH-015 no tiene AC que lo ejerza en paralelo. No hay escenario para npm o la red caídos en CI, ni para `prisma db push` fallando en Compose (cubierto solo por AC-008 en el camino feliz). Tampoco hay un caso de `npm ci` con el lockfile desincronizado fuera del flujo de importación. | Añadir el AC en paralelo para BEH-015 y un BEH de error para que falle `db push` o el healthcheck de PostgreSQL. |
| 8 | Alcance frente al plan (0.1-0.9), ADR-005 §3, ADR-009+ADR-021, ADR-018, ADR-019 | NO CUMPLE | **Plan:** 0.1, 0.8 y 0.9 están bien trasladados (5.2 :563-565). 0.2 y 0.3 corregidos en 5.2. 0.7 se cubre con REQ-011. 0.6 se cubre con REQ-008 y REQ-016, pero gitleaks no corre en `push` a `main` (REQ-007 solo en PR). **ADR-005 §3:** el seed se excluye (SUP-011) en lugar de «reescrito»; es una desviación aceptable pero no figura en «Correcciones al plan». ADR-005 §3 dice «todos los scripts de mantenimiento salvo schema, seed y migraciones», pero la spec conserva `Dockerfile.migrate` (:29). Su CMD (`packages/db/Dockerfile.migrate:32`) hace `rm -rf prisma/migrations/*` y `prisma migrate reset --force`: es destructivo y contradice el propósito de ADR-005 y CLAUDE.md §5. Además llama a `prisma db seed`, cuyo archivo se excluye. **Archivos que quedan rotos y la spec no menciona:** `packages/db/prisma7.config.ts:13` (`seed: "tsx prisma/seed.ts"`) y los scripts `db:*` de `packages/db/package.json:9-22` apuntan a archivos excluidos. El script raíz `actualizar-tasa` (package.json:15) apunta a `apps/worker`. `Dockerfile:18` y `:20` copian `packages/design-system/package.json` y `packages/config/package.json`; si `config` se omite (5.4 :580), `docker build` falla. `.gitignore` y `.claude/settings.json` existen en ambos repositorios y **REQ-025 (:227) no los lista**: `.claude/settings.json` del Repo A podría sobrescribir los hooks del arnés (G1). `*.keystore` y `*.pem` no cubren otras claves de firma (`.jks`, `.p12`, `.pfx`, `keystore.properties`), y ADR-021 §Invariantes pide que «ningún keystore ni clave de firma» esté versionado. **ADR-014 / CLAUDE.md §1:** 5.2 no dice quién crea el commit de importación ni con qué identidad; debe ser el propietario, con commit firmado (o propuesto para que lo ejecute él). REQ-022 modifica el hook `pre-commit` del arnés ya aprobado en G1 sin pasar por esa puerta. **ADR-009/021, 018, 019:** las cinco apps, la omisión de `worker`/`kiosk-host` y la exclusión de keystores y `apk-*.yml` coinciden. La copia de turnos, egresos y fiado es coherente con ADR-018 (se eliminan en otras specs). El conteo de ADR-019 está en REQ-011. | Excluir `Dockerfile.migrate` o justificarlo con una advertencia explícita. Listar en la spec las ediciones de configuración necesarias (`prisma7.config.ts`, `package.json` de db y raíz, `Dockerfile`, `docker-entrypoint.sh`) como un REQ o un paso de 5.2. Añadir `.gitignore` y `.claude/` a REQ-025 (con regla de fusión para `.gitignore`). Ampliar la exclusión de claves de firma. Declarar en 5.2 quién firma el commit de importación (ADR-014). Registrar la desviación del seed como corrección a ADR-005 §3 y el cambio al hook pre-commit como cambio de arnés. |

**Notas**
- Los bloqueantes por prioridad son: (1) INV-001/REQ-026/AC-002 (contraseñas): el verificador fallaría sobre este mismo repositorio. (2) Contradicción entre REQ-006 y REQ-018. (3) REQ-025 omite `.claude/settings.json` y `.gitignore`, con riesgo real de sobrescribir el arnés. (4) `Dockerfile.migrate` destructivo conservado, y `Dockerfile`, `prisma7.config.ts` y `package.json` de `packages/db` rotos por las exclusiones sin ningún REQ que lo cubra. (5) «12 variables» y «Gradle genera el keystore» son afirmaciones verificadas que el clon contradice. (6) `packages/db` queda sin tests y su `vitest run` fallará.
- No encontré contradicciones con ADR-018 ni con ADR-019. La enmienda de ADR-021 a ADR-009 está bien reflejada.
- La revisión previa que figura al final de la spec describe un alcance anterior y no valida esta versión.

VEREDICTO GLOBAL: REQUIERE CAMBIOS

### Respuesta del autor al segundo veredicto
Verifiqué yo mismo, antes de corregir, las afirmaciones que contradecían la spec: son ciertas `DATABASE_URL_LOCAL` y la notación de corchetes, el `build.gradle:21-22`, `Dockerfile.migrate:32`, los 5 tests de `packages/db` en directorios excluidos, `.claude/settings.json` en el Repo A y `kiosk-tv` y `vitrina-tv` fuera de los workspaces. Mi propio `grep` de variables de entorno estaba contaminado por `node_modules`; la cifra correcta es **13**. Sobre `cookies.txt` y los `debug.keystore`: `git ls-files` los lista (están en el índice); el revisor no los veía en el árbol porque su herramienta de búsqueda respeta `.gitignore`.

Aplicado en la versión actual:
- **Fila 1:** ADR-018 y ADR-019 añadidos a `adrs`.
- **Fila 2:** REQ-009 y REQ-021 divididos (nuevos REQ-027 y REQ-028); REQ-011 y REQ-012 reducidos a una obligación; REQ-006 y REQ-018 reconciliados con la sección «Solo Compose»; la definición de base efímera pasa a REQ-014 y REQ-019 (host local y prefijo `adhara_test_`, la base la crea el helper).
- **Fila 3:** la búsqueda de `admin1234` se acota a `apps` y `packages`; INV-S00-005 exige una única raíz de historia; INV-S00-002 enlazado a AC-S00-014; AC-S00-003 prueba «falta» y «sobra».
- **Fila 4:** nuevo script nombrado `tools/importar-repo-a.mjs` (REQ-S00-031, AC-S00-016 y AC-S00-020); cada AC ejerce los BEH que enlaza; línea base de audit en JSON (`docs/linea-base-audit.json`); AC de concurrencia con `Promise.all` y PostgreSQL real; «los diez datos» alineados con REQ-011.
- **Fila 5:** 13 variables; evidencia con `git ls-files`; riesgo de Gradle corregido con `build.gradle:21-22`; `kiosk-tv` y `vitrina-tv` tratados como directorios envoltorio; SUP-S00-015 para `packages/db` sin tests; medición de «tipos» definida en la línea base; dependencia de `domain` anotada para S-20.
- **Fila 6:** REQ-029 (versiones sin `latest`); `pg` declarado y justificado; patrón del conteo de «organización» definido; `xlsx` anotado.
- **Fila 7:** BEH nuevos para `db push` fallido, referencia rota, versiones y falta o sobra de una app.
- **Fila 8:** `Dockerfile.migrate` excluido; REQ-030 para las referencias rotas; `.claude/`, `.githooks`, `tools` y `scripts` en REQ-025; claves de firma ampliadas; `config` y `design-system` conservados vacíos; gitleaks también en `push` a `main`; el propietario crea el commit de importación; desviación del seed y cambio de arnés registrados en 5.2.

No aplicado, con motivo:
- Fusión de `.gitignore`: no se hizo REQ propio; queda como regla de 5.2 (unión de reglas), verificada por REQ-024.
- Los AC e2e siguen pendientes de ejecutar por el propietario (5.1).
- La versión corregida **no se ha vuelto a pasar por el revisor**.

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de S-22 (ADR-022). El texto anterior se conserva; donde choca, rige esta sección.*
- SUP-S00-002, SUP-S00-010, REQ-S00-017, AC-S00-008 y AC-S00-022: la creación del esquema en Compose pasa de `prisma db push` a un servicio `esquema` con `drizzle-kit push` (S-22, REQ-S22-016).
- §0.2, REQ-S00-003 y REQ-S00-028: la lista de permitidos de `packages/db` pasa a `package.json`, `drizzle.config.ts` y `src/` (S-22, REQ-S22-029).
- Hasta que S-22 se ejecute, el árbol importado por S-00 conserva Prisma tal como está.
