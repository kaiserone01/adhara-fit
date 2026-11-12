---
id: S-00
estado: borrador
adrs: ADR-001, ADR-005, ADR-009, ADR-012, ADR-014, ADR-016, ADR-017, ADR-020, ADR-021
depende_de: ninguna
aprobada_por:
fecha_aprobacion:
---
# S-00 — Fundaciones del repo: copia limpia, exclusiones, CI, entorno local y secretos

## 0. Contexto y alcance

### 0.1 Problema
Adhara Fit parte de una copia del Repo A (`gym-app` @ `b4352a0`), que es público, no declara licencia y arrastra PII de personas reales, credenciales y scripts destructivos de otro negocio. Hay que importar el código de trabajo sin esa carga, con un entorno reproducible (Docker Compose, CI, `.env.example`) y con controles que impidan que vuelva a entrar (exclusiones verificadas por CI, escaneo de secretos). Este repositorio no tiene todavía código de producto: solo contiene el arnés, la documentación y las specs.

### 0.2 Dentro de alcance
- Importar el árbol de trabajo de `b4352a0` como un único commit, sin historia del Repo A, aplicando la lista cerrada de exclusión de abajo.
- Limitar la copia inicial a las apps `web-admin`, `kiosk`, `kiosk-tv`, `vitrina` y `vitrina-tv` y a los workspaces que estas requieren (ADR-009 enmendado por ADR-021).
- Registrar la línea base del Repo A (tests, lint, tipos, build y `npm audit`) antes de aplicar exclusiones (plan 0.7, ADR-016 §4).
- `.env.example`, `LICENSE`, `.gitignore`, README de arranque, `docker-compose.yml` (PostgreSQL y `web-admin`) y CI de calidad (lint, tipos, tests, build, `npm audit`, gitleaks).
- Verificaciones automáticas en un script único `tools/verificar-repo.mjs` (exclusiones, apps y workspaces, migraciones, archivos obligatorios, `.gitignore`, historia) y `tools/verificar-env.mjs`; helper de base efímera para pruebas de integración.
- Comprobar que el workflow `politica` del arnés corre en cada pull request.
- Lista cerrada de exclusión (se compara en minúsculas y en cualquier ruta, salvo donde se indique):
  - `cookies.txt`; `handoff.md` en cualquier ruta que no sea la raíz (el `handoff.md` del Repo A no se importa y el de este repositorio prevalece); `*.keystore`, `*.pem` y `.env*` salvo `.env.example`.
  - `reset-vencimientos-log-*.json`; `.windsurf/`; `.agents/`; `skills-lock.json`; `docs/xls/`; `packages/db/migracion-excel/`.
  - Todo archivo cuyo nombre contenga `zipgym` o `zip-gym`.
  - Todas las migraciones de Prisma del Repo A (hasta la marca `20261016000000`) y `migration_lock.toml`.
  - El seed del Repo A (`prisma/seed.ts`) y cualquier archivo que contenga las contraseñas `admin1234` o `entrenador1234`.
  - En `packages/db`, todo archivo salvo `package.json`, `prisma/schema.prisma`, `prisma7.config.ts`, `prisma7.local.config.ts` y `Dockerfile.migrate` (este último se revisa en el informe de importación porque ejecuta migraciones). Quedan excluidos los scripts `backfillPermisos*.ts`, `clonarSedePrincipalAZipGym.ts`, `clonarZipGym/`, `diagnosticoVencimientos.ts`, `importarPadronExcel.ts`, `limpiarCajaPrueba.ts`, `limpiarMiembros.ts`, `limpiarOrganizacionParaMigracion.ts`, `marcarAjustarFecha.ts`, `migracion-excel/`, `productos-prueba/`, `quitarPermisosEntrenadores.ts`, `resetVencimientosPrueba.ts`, `reset-vencimientos-log-*.json`, `sembrar*.ts` y `prisma/seed.ts`; el propietario aprueba la lista en el informe de importación.
  - Las apps `worker` y `kiosk-host`; los workflows `apk-*.yml` y `verificar-vitrina.yml`; y todo `.github/` del Repo A (los workflows permitidos son los de este repositorio).
  - El `docs/` del Repo A completo, su `README.md` y su `CLAUDE.md` (colisionan con los de este repositorio).

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
- `cookies.txt` está versionado en la raíz (254 bytes); su contenido no se leyó, solo se verificó que existe (verificado con `ls` en la raíz).
- Hay dos `debug.keystore` rastreados: `apps/kiosk-tv/capacitor/android/app/debug.keystore` y `apps/vitrina-tv/capacitor/android/app/debug.keystore` (verificado con `find . -name debug.keystore`).
- `packages/db/prisma/seed.ts` fija las contraseñas `admin1234` (`packages/db/prisma/seed.ts:41` y `:50`) y `entrenador1234` (`packages/db/prisma/seed.ts:55`). La cadena `admin1234` aparece además en 7 documentos de `docs/superpowers/plans/` del Repo A.
- No existe `.env.example` (verificado). El código lee con `process.env`, en `apps` y `packages`, exactamente estas 12 variables: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `KIOSCO_CLAVE`, `KIOSCO_URL`, `NEXT_PUBLIC_API_URL`, `VITRINA_WEB_DIR`, `ZIP_GYM_PASSWORD` y `NODE_ENV` (verificado). Los workflows y scripts usan además `VITRINA_API_URL`, `VITRINA_CLAVE`, `VITRINA_DEV_URL` y variables `KIOSCO_*` (doc 11 DI-85); no verificado.
- Hay 36 migraciones en `packages/db/prisma/migrations` (de `20260913024831_organizacion_sucursal_plan_suscripcion` a `20261016000000_vitrina_sonido`) más `migration_lock.toml`; `docker-entrypoint.sh:11` ejecuta `prisma migrate deploy` al arrancar y `:13` lanza `apps/web-admin/server.js` (verificado).
- Hay tres workflows en `.github/workflows`: `apk-kiosco.yml`, `apk-vitrina.yml` y `verificar-vitrina.yml` (verificado con `ls .github/workflows`).
- `apps/kiosk` y `apps/vitrina` usan `output: "export"` (`apps/kiosk/next.config.ts:9`, `apps/vitrina/next.config.ts:6`) y `apps/web-admin` usa `output: "standalone"` (`apps/web-admin/next.config.ts:7`); los scripts `dev` usan los puertos 3001 y 3002 (`apps/kiosk/package.json:6`, `apps/vitrina/package.json:6`), y `Dockerfile:40` y `Dockerfile:70` fijan `PORT=3000` y `EXPOSE 3000`. `Dockerfile:42` fija `TZ=America/Caracas`.
- El modelo `VitrinaItem` (`packages/db/prisma/schema.prisma:684`) guarda `precioUSD`, `ofertaUSD` y `mostrarEquivalenteBs`; el emisor SSE en memoria que exige un solo contenedor viene de doc 11 DI-78; no re-verificado.
- El `docs/adr/` del Repo A contiene `ADR-001-gym-app-sesion.md`, `ADR-001-gym-app-sesion-v2.md` y `ADR-002-vitrina-importa-dominio-puro.md`, que repiten la numeración de este repositorio (verificado con `ls docs/adr`).
- `packages/domain-custom` solo tiene `.gitkeep` y no es un workspace (sin `package.json`); `packages/config` y `packages/design-system` tienen `.gitkeep` y `package.json` (verificado con `ls -A packages`). Las dependencias internas de las cinco apps del alcance cierran en `db`, `domain`, `infrastructure`, `theming` y `ui`; `config` y `design-system` quedarían fuera (verificado con `package.json` por workspace).
- El `package.json` raíz solo define `dev`, `build`, `lint`, `start` y `actualizar-tasa`: **no hay `test` ni `typecheck`** (`package.json`, scripts). `test` existe en `apps/kiosk`, `apps/vitrina`, `packages/db` y `packages/domain`, `web-admin` no tiene `test`, y solo `apps/web-admin`, `apps/kiosk` y `apps/vitrina` tienen `tsconfig.json` propio (verificado con `package.json` y `ls` por workspace). La suite no se había ejecutado en los análisis previos: la mide la línea base de S-00.

### 0.5 Supuestos
- SUP-S00-001: `worker`, `kiosk-host` y los workflows `apk-*.yml` y `verificar-vitrina.yml` se omiten de la copia; `kiosk-tv`, `vitrina` y `vitrina-tv` se importan sin modificar y se adaptan en S-20 y S-21 (ADR-021, decisión D3). Default: ese reparto; asumido, por validar.
- SUP-S00-002: las migraciones heredadas se excluyen y el baseline se genera después de las specs que cambian el esquema (decisión D12); mientras tanto la base desechable de Compose usa `prisma db push`. Default: ese comportamiento; asumido, por validar.
- SUP-S00-003: gitleaks se adopta como binario de versión fija en CI y como comprobación opcional en `pre-commit` (decisión D13). Default: sí; asumido, por validar.
- SUP-S00-004: `npm audit` falla el pipeline ante vulnerabilidades de severidad high o critical que no figuren en la línea base. Default: ese umbral; asumido, por validar.
- SUP-S00-005: el aviso legal es `Copyright (c) 2026 Adhara Fit. Todos los derechos reservados.` Default: ese texto; asumido, por validar.
- SUP-S00-006: esta spec incluye la comprobación del workflow `politica` (decisión D19). Default: incluirla; asumido, por validar.
- SUP-S00-007: la base de `docker compose` es desechable (su volumen se puede borrar) y la de las pruebas es efímera (se crea y se destruye en cada ejecución); son distintas y solo la segunda cumple ADR-016. Default: mantener esa distinción; asumido, por validar.
- SUP-S00-008: el rebranding y el sistema de diseño completos, que absorben el plan 0.9, se ejecutan en S-19. Default: trasladarlos; asumido, por validar.
- SUP-S00-009: como no existe el script `typecheck`, S-00 añade `typecheck` a los `package.json` que tengan `tsconfig.json` y el CI llama a `lint`, `typecheck`, `test` y `build` por workspace (cambio de configuración, no de `src/`). Default: ese reparto; asumido, por validar.
- SUP-S00-010: con cero migraciones `prisma migrate deploy` no crea tablas (no verificado), por lo que Compose ejecuta `prisma db push` antes de arrancar `web-admin`. Default: ese arranque; asumido, por validar.
- SUP-S00-011: el seed del Repo A no se importa y el usuario inicial llega con la spec de baseline y seed (ver COBERTURA-RF). Default: la pantalla de inicio de sesión basta para validar S-00; asumido, por validar.
- SUP-S00-012: `package-lock.json` se regenera con `npm install --package-lock-only` tras recortar los workspaces para que `npm ci` funcione. Default: regenerarlo y registrar el cambio en el informe de importación; asumido, por validar.
- SUP-S00-013: `kiosk` no entra en Compose (el plan 0.5 pide PostgreSQL y `web-admin`) y se levanta con su script `dev`, documentado en el README. Default: ese reparto; asumido, por validar.
- SUP-S00-014: gitleaks usa una regla propia `ADHARA_TEST_SECRET_` en `.gitleaks.toml` para las pruebas, de modo que no dependan de formatos de proveedores ni del bloqueo de GitHub a tokens reales. Default: esa regla; asumido, por validar.

## 1. Requisitos

> Origen: ADR citados y tareas del plan (doc 07 §Fase 0).

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
- texto: La copia inicial deberá contener solo las apps web-admin, kiosk, kiosk-tv, vitrina y vitrina-tv y los workspaces que estas requieren de forma transitiva en sus package.json y el workspace design-system reservado por ADR-020.

### REQ-S00-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El repositorio no deberá contener ninguna migración de Prisma con marca de tiempo igual o anterior a 20261016000000.

### REQ-S00-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: El pipeline de CI deberá fallar cuando el conjunto de variables leídas con process.env difiera del conjunto de nombres de .env.example.

### REQ-S00-007
- tipo: cuando
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: Cuando se abre o se actualiza un pull request, el CI deberá fallar si gitleaks detecta algún secreto en el rango del pull request.

### REQ-S00-008
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando se abre o se actualiza un pull request, o se empuja a main, el CI deberá ejecutar lint, comprobación de tipos, pruebas por workspace y build como jobs independientes.

### REQ-S00-009
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando una persona ejecuta docker compose up, el sistema deberá iniciar los servicios PostgreSQL y web-admin con comprobación de salud y publicar web-admin en el puerto declarado en docker-compose.yml.

### REQ-S00-010
- tipo: ubicuo
- prioridad: SHOULD
- origen: ADR-005
- texto: El README deberá permitir que una persona que no participó en la importación levante el proyecto en menos de 30 minutos.

### REQ-S00-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016, ADR-001
- texto: Antes de aplicar cualquier exclusión, el procedimiento deberá registrar en docs/linea-base-tests.md el SHA completo del Repo A, el número de tests por workspace, los fallos preexistentes, el resultado de lint, tipos, build y npm audit y el conteo de archivos que mencionan organización.

### REQ-S00-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El archivo LICENSE deberá contener el aviso de copyright y la declaración de licencia privativa.

### REQ-S00-013
- tipo: cuando
- prioridad: MUST
- origen: ADR-014, ADR-017
- texto: Cuando se abre o se actualiza un pull request, el CI deberá ejecutar el workflow politica definido en .github/workflows/politica.yml.

### REQ-S00-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Las pruebas de integración deberán usar una base PostgreSQL creada con un nombre único en cada ejecución y destruida al terminar.

### REQ-S00-015
- tipo: cuando
- prioridad: MUST
- origen: ADR-009, ADR-016
- texto: Cuando se aplican las exclusiones, el procedimiento deberá verificar que npm ci, la comprobación de tipos y el build no producen errores que no figuren en la línea base.

### REQ-S00-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: Cuando se abre o se actualiza un pull request, o se empuja a main, el CI deberá fallar si npm audit encuentra vulnerabilidades de severidad high o critical que no figuren en la línea base.

### REQ-S00-017
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando docker compose inicia con una base de datos vacía, el sistema deberá crear el esquema de Prisma antes de arrancar web-admin.

### REQ-S00-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: El archivo .env.example no deberá contener ningún valor de secreto y solo admitirá valores de desarrollo local de PostgreSQL marcados como solo local.

### REQ-S00-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El helper de pruebas de integración deberá abortar antes de abrir conexión si DATABASE_URL está ausente, vacía o no apunta a una base efímera.

### REQ-S00-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El pipeline de CI deberá fallar cuando falte alguno de los archivos obligatorios LICENSE, README.md, .env.example, CLAUDE.md o handoff.md en la raíz.

### REQ-S00-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: Antes de crear el commit de importación, el procedimiento deberá ejecutar gitleaks sobre el árbol completo y registrar su resultado y la lista de archivos de datos conservados en docs/informe-importacion.md.

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
- texto: El archivo .gitignore deberá excluir los patrones *.keystore, cookies.txt, .env*, *.pem, node_modules, .next, .turbo, coverage y .claude/settings.local.json, con la excepción de .env.example.

### REQ-S00-025
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando un archivo del árbol importado coincide en ruta con uno de este repositorio (README.md, CLAUDE.md, handoff.md, docs, .github, .editorconfig, .gitattributes), el procedimiento deberá conservar el de este repositorio y descartar el importado.

### REQ-S00-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: El repositorio no deberá contener el seed del Repo A ni ningún archivo con las contraseñas admin1234 o entrenador1234.

## 2. Comportamiento

### BEH-S00-001
- cubre: REQ-S00-001, REQ-S00-002, REQ-S00-004, REQ-S00-005, REQ-S00-015, REQ-S00-021, REQ-S00-026
- categoria: feliz
- dado: una copia local del Repo A en el commit b4352a0, la línea base ya registrada y el repositorio remoto privado
- cuando: se ejecuta el procedimiento de importación con la lista cerrada de exclusión
- entonces: se crea un único commit de importación con solo las cinco apps del alcance y sus workspaces, sin migraciones ni seed, con docs/informe-importacion.md, y npm ci, los tipos y el build no tienen errores nuevos

### BEH-S00-002
- cubre: REQ-S00-007, REQ-S00-008, REQ-S00-013, REQ-S00-016, REQ-S00-020
- categoria: feliz
- dado: un pull request con un commit en una sola línea y firmado por el propietario, con handoff.md modificado y sin cambios funcionales
- cuando: el CI se ejecuta
- entonces: lint, tipos, pruebas, build, gitleaks, npm audit y el workflow politica no producen fallos nuevos respecto de la línea base

### BEH-S00-003
- cubre: REQ-S00-009, REQ-S00-010, REQ-S00-017, REQ-S00-018
- categoria: feliz
- dado: un clon limpio y una máquina con Docker, sin el archivo .env
- cuando: la persona copia .env.example a .env y ejecuta docker compose up
- entonces: PostgreSQL y web-admin quedan saludables, el esquema existe en la base y la pantalla de inicio de sesión responde en el puerto declarado

### BEH-S00-004
- cubre: REQ-S00-003
- categoria: borde
- dado: un archivo apps/kiosk/Cookies.txt creado sin ejecutar git add, con mayúsculas y fuera de la raíz
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla con código distinto de 0 y lista la ruta apps/kiosk/Cookies.txt

### BEH-S00-005
- cubre: REQ-S00-006
- categoria: borde
- dado: una variable nueva leída con process.env que no figura en .env.example
- cuando: el CI ejecuta tools/verificar-env.mjs
- entonces: la verificación falla y nombra la variable que falta

### BEH-S00-006
- cubre: REQ-S00-007
- categoria: error
- dado: un commit que añade una cadena con el prefijo ADHARA_TEST_SECRET_ seguido de 16 caracteres alfanuméricos
- cuando: el CI ejecuta gitleaks sobre el rango del pull request
- entonces: el job falla y el check del pull request queda en rojo

### BEH-S00-007
- cubre: REQ-S00-001, REQ-S00-011
- categoria: error
- dado: que no hay copia local del Repo A disponible
- cuando: se intenta ejecutar el procedimiento de importación
- entonces: el procedimiento se detiene antes de crear archivos y pide la copia, sin importar nada

### BEH-S00-008
- cubre: REQ-S00-019
- categoria: error
- dado: DATABASE_URL apuntando a un host que no es la base efímera de pruebas
- cuando: arranca una prueba de integración
- entonces: el helper de pruebas aborta con un error explícito antes de abrir la conexión

### BEH-S00-009
- cubre: REQ-S00-015
- categoria: error
- dado: que tras las exclusiones el build falla porque un workspace conservado importa una app omitida
- cuando: el procedimiento ejecuta el build
- entonces: el procedimiento no genera el commit de importación y deja el error en docs/informe-importacion.md

### BEH-S00-010
- cubre: REQ-S00-012, REQ-S00-020
- categoria: borde
- dado: un pull request que elimina el archivo LICENSE
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla y señala LICENSE como archivo obligatorio ausente

### BEH-S00-011
- cubre: REQ-S00-016
- categoria: borde
- dado: una línea base que registra dos vulnerabilidades high preexistentes y un pull request que añade una dependencia con una vulnerabilidad high nueva
- cuando: el CI ejecuta npm audit
- entonces: el job falla solo por la vulnerabilidad nueva y no por las dos de la línea base

### BEH-S00-012
- cubre: REQ-S00-009
- categoria: error
- dado: que el puerto declarado para web-admin ya está ocupado en la máquina
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
- dado: dos jobs de CI de pruebas de integración que se ejecutan en paralelo
- cuando: ambos crean su base PostgreSQL
- entonces: cada job usa una base de nombre distinto, ninguno ve los datos del otro y ambas bases se destruyen al terminar

### BEH-S00-016
- cubre: REQ-S00-023
- categoria: error
- dado: que el repositorio remoto de este proyecto es público
- cuando: se intenta empujar el commit de importación
- entonces: el procedimiento se detiene antes del push y pide al propietario hacer el repositorio privado

### BEH-S00-017
- cubre: REQ-S00-022
- categoria: borde
- dado: una máquina sin gitleaks instalado y otra con gitleaks que detecta un secreto en staging
- cuando: se ejecuta git commit con el hook pre-commit activo
- entonces: en la primera el hook avisa y continúa, y en la segunda el hook rechaza el commit

### BEH-S00-018
- cubre: REQ-S00-019
- categoria: borde
- dado: DATABASE_URL ausente, vacía o con un nombre de base sin el prefijo adhara_test_
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
- dado: un archivo versionado que contiene la cadena admin1234
- cuando: el CI ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla y lista el archivo

### BEH-S00-021
- cubre: REQ-S00-025
- categoria: borde
- dado: un árbol importado cuyo README.md, CLAUDE.md y docs/ difieren de los de este repositorio
- cuando: el procedimiento copia el árbol
- entonces: README.md, CLAUDE.md, handoff.md, docs, .github, .editorconfig y .gitattributes quedan idénticos a los de este repositorio antes de la importación

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
- propiedad: el conjunto de variables leídas con process.env es igual al conjunto de nombres de .env.example y ninguna lleva un valor de secreto
- mecanismo: lint
- deteccion: tools/verificar-env.mjs termina con código distinto de 0 y lista las variables sobrantes, ausentes o con valor no permitido
- protege: REQ-S00-006, REQ-S00-018

### INV-S00-004
- propiedad: ninguna prueba de integración abre conexión a una base que no sea la efímera de su ejecución
- mecanismo: asercion-dominio
- deteccion: el helper de pruebas lanza un error antes de conectar y la prueba falla
- protege: REQ-S00-014, REQ-S00-019

### INV-S00-005
- propiedad: el repositorio no contiene ningún commit del Repo A y el commit de importación tiene un único padre
- mecanismo: lint
- deteccion: tools/verificar-repo.mjs con la opción de historia comprueba que git cat-file -e con el SHA completo registrado en docs/linea-base-tests.md falla y que el commit de importación tiene exactamente un padre
- protege: REQ-S00-001

### INV-S00-006
- propiedad: las apps y los workspaces del árbol son exactamente web-admin, kiosk, kiosk-tv, vitrina, vitrina-tv, el cierre transitivo de sus dependencias internas y packages/design-system
- mecanismo: lint
- deteccion: tools/verificar-repo.mjs calcula el cierre desde los package.json y termina con código distinto de 0 si sobra o falta un directorio, o si existe una migración con marca igual o anterior a 20261016000000
- protege: REQ-S00-004, REQ-S00-005

## 4. Criterios de aceptación

### AC-S00-001
- enlaza: REQ-S00-001, BEH-S00-001, BEH-S00-007, INV-S00-005
- metodo: integracion
- procedimiento: tras importar, ejecutar node tools/verificar-repo.mjs --historia
- esperado: el código de salida es 0; el commit de importación tiene un único padre; git cat-file -e con el SHA completo registrado en docs/linea-base-tests.md termina con error
- test: tools/verificar-repo.test.mjs

### AC-S00-002
- enlaza: REQ-S00-002, REQ-S00-003, REQ-S00-026, BEH-S00-004, BEH-S00-020, INV-S00-001
- metodo: integracion
- procedimiento: ejecutar node tools/verificar-repo.mjs en un árbol limpio; repetirlo tras crear apps/kiosk/Cookies.txt sin git add y tras añadir la cadena admin1234 a un archivo versionado
- esperado: el primer caso termina con código 0; el segundo y el tercero terminan con código 1 y listan la ruta exacta del archivo
- test: tools/verificar-repo.test.mjs

### AC-S00-003
- enlaza: REQ-S00-004, INV-S00-006
- metodo: unitario
- procedimiento: ejecutar la verificación de apps y workspaces sobre un árbol de prueba con apps/web-admin, apps/kiosk, apps/kiosk-tv, apps/vitrina, apps/vitrina-tv y un workspace requerido, y repetirla añadiendo apps/worker
- esperado: el primer caso termina con código 0 y el segundo con código 1 nombrando apps/worker
- test: tools/verificar-repo.test.mjs

### AC-S00-004
- enlaza: REQ-S00-005, INV-S00-006
- metodo: unitario
- procedimiento: ejecutar la verificación sobre un árbol con una migración de marca 20261016000000 y sobre otro con una de marca 20270101000000
- esperado: el primero termina con código 1 y el segundo con código 0
- test: tools/verificar-repo.test.mjs

### AC-S00-005
- enlaza: REQ-S00-006, REQ-S00-018, BEH-S00-005, BEH-S00-013, INV-S00-003
- metodo: unitario
- procedimiento: ejecutar tools/verificar-env.mjs con un código de ejemplo que lee una variable ausente de .env.example, con uno consistente y con un .env.example que trae un valor no marcado como solo local
- esperado: el primer y el tercer caso terminan con código 1 nombrando la variable; el segundo termina con código 0
- test: tools/verificar-env.test.mjs

### AC-S00-006
- enlaza: REQ-S00-007, REQ-S00-021, BEH-S00-006, BEH-S00-014, INV-S00-002
- metodo: integracion
- procedimiento: ejecutar gitleaks con .gitleaks.toml sobre un directorio de prueba que contiene la cadena ADHARA_TEST_SECRET_ seguida de 16 caracteres alfanuméricos, sobre otro sin ella y sobre el primero con una entrada de allowlist
- esperado: el primer caso termina con código distinto de 0, el segundo con código 0 y el tercero con código 0
- test: tools/verificar-gitleaks.test.mjs

### AC-S00-007
- enlaza: REQ-S00-008, REQ-S00-016, BEH-S00-002, BEH-S00-011
- metodo: e2e
- procedimiento: el propietario abre un pull request de prueba sin cambios funcionales sobre la copia importada y otro que añade una dependencia con una vulnerabilidad high nueva; se revisan los jobs de lint, tipos, pruebas, build y npm audit
- esperado: en el primero ningún job falla por motivos que no figuren en docs/linea-base-tests.md; en el segundo falla solo el job de npm audit
- test: pendiente

### AC-S00-008
- enlaza: REQ-S00-009, REQ-S00-010, REQ-S00-017, BEH-S00-003, BEH-S00-012, BEH-S00-013
- metodo: manual
- procedimiento: una persona que no participó en la importación sigue solo el README en un clon limpio con un cronómetro, ejecuta docker compose up, comprueba docker compose ps, lista las tablas con docker compose exec y abre la URL del README
- esperado: PostgreSQL y web-admin figuran como saludables, la base tiene al menos una tabla, la pantalla de inicio de sesión responde con HTTP 200 y el tiempo total es menor que 30 minutos
- test: pendiente

### AC-S00-009
- enlaza: REQ-S00-011, BEH-S00-007, BEH-S00-001
- metodo: manual
- procedimiento: comprobar que docs/linea-base-tests.md existe con el SHA completo, el número de tests por workspace, los fallos preexistentes, el resultado de lint, tipos, build y npm audit, el tiempo, los archivos de web-admin con tests y el conteo de archivos con «organización», y que su commit precede al de importación en git log
- esperado: el archivo contiene los ocho datos y su commit es anterior al de importación
- test: pendiente

### AC-S00-010
- enlaza: REQ-S00-012, REQ-S00-020, BEH-S00-010
- metodo: unitario
- procedimiento: ejecutar tools/verificar-repo.mjs sobre un árbol con LICENSE correcto, sobre otro sin LICENSE y sobre otro con LICENSE sin la frase Todos los derechos reservados
- esperado: el primer caso termina con código 0; el segundo y el tercero terminan con código 1 nombrando LICENSE
- test: tools/verificar-repo.test.mjs

### AC-S00-011
- enlaza: REQ-S00-013, BEH-S00-002
- metodo: e2e
- procedimiento: el propietario abre tres pull requests de prueba con sus credenciales: uno con un commit que lleva un trailer prohibido, uno sin handoff.md modificado y uno conforme, y observa el workflow politica
- esperado: el primero falla en el paso de política de commits, el segundo en el paso de handoff y el tercero termina en verde
- test: pendiente

### AC-S00-012
- enlaza: REQ-S00-014, REQ-S00-019, BEH-S00-008, BEH-S00-015, BEH-S00-018, INV-S00-004
- metodo: unitario
- procedimiento: invocar el helper con DATABASE_URL ausente, vacía, con un host ajeno y con un nombre de base sin el prefijo adhara_test_; invocarlo dos veces seguidas con un host local válido
- esperado: los cuatro primeros casos lanzan un error sin abrir conexión; en los dos últimos los nombres de base generados son distintos y la base se elimina al terminar
- test: tools/base-efimera.test.mjs

### AC-S00-013
- enlaza: REQ-S00-015, BEH-S00-001, BEH-S00-009
- metodo: integracion
- procedimiento: tras aplicar las exclusiones, ejecutar npm ci, la comprobación de tipos y el build, y comparar sus errores con los de docs/linea-base-tests.md
- esperado: no hay errores que no figuren en la línea base; si los hay, no se genera el commit de importación y el error queda en docs/informe-importacion.md
- test: pendiente

### AC-S00-014
- enlaza: REQ-S00-021, BEH-S00-001
- metodo: manual
- procedimiento: comprobar que docs/informe-importacion.md existe antes del commit de importación y revisar su contenido
- esperado: incluye la salida de gitleaks con código 0 sobre el árbol completo, la lista de archivos con extensiones .json, .csv, .xls, .xlsx y .sql conservados, la lista de permitidos de packages/db y el cambio al lockfile; el propietario lo aprueba por escrito
- test: pendiente

### AC-S00-015
- enlaza: REQ-S00-022, BEH-S00-017
- metodo: unitario
- procedimiento: ejecutar el hook pre-commit con un ejecutable gitleaks de prueba que termina con código 1, con otro que termina con código 0 y sin ninguno en el PATH
- esperado: el primer caso rechaza el commit, el segundo lo acepta y el tercero lo acepta mostrando un aviso
- test: tools/harness-selftest.mjs

### AC-S00-016
- enlaza: REQ-S00-023, BEH-S00-016
- metodo: manual
- procedimiento: antes de empujar la importación, ejecutar gh api repos/kaiserone01/adhara-fit con el filtro .private
- esperado: el resultado es true; si es false, el push no se realiza
- test: pendiente

### AC-S00-017
- enlaza: REQ-S00-024, BEH-S00-019
- metodo: unitario
- procedimiento: ejecutar tools/verificar-repo.mjs sobre un .gitignore completo y sobre otro sin el patrón *.keystore
- esperado: el primero termina con código 0 y el segundo con código 1 nombrando *.keystore
- test: tools/verificar-repo.test.mjs

### AC-S00-018
- enlaza: REQ-S00-025, BEH-S00-021
- metodo: integracion
- procedimiento: tras la importación, ejecutar git diff entre el commit anterior y el de importación limitado a README.md, CLAUDE.md, handoff.md, docs, .github, .editorconfig y .gitattributes
- esperado: el diff no contiene ninguna línea modificada ni eliminada en esas rutas
- test: tools/verificar-repo.test.mjs

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Primero se escriben los scripts verificables sin dependencias, con `node:test`: `tools/verificar-repo.mjs`, `tools/verificar-env.mjs` y el helper de base efímera, cada uno con su archivo de pruebas (ADR-016 §8).
- La prueba de gitleaks usa `.gitleaks.toml` con la regla propia `ADHARA_TEST_SECRET_` (SUP-S00-014); la base efímera real la levanta el CI con un servicio de PostgreSQL (supuesto de ADR-016).
- Los criterios e2e (AC-S00-007, AC-S00-011) y el manual AC-S00-008 los ejecuta el propietario o una persona que no participó. Precondiciones que son del propietario: repositorio privado, commits firmados con su identidad y protección de `main` si se quiere que un check en rojo impida fusionar (`docs/ops/github-setup.md` §4); mientras los commits sigan bajo la excepción de ADR-014 §7, los e2e no pueden ejecutarse.
- Los scripts de calidad del código importado se ejecutan tal como existen en el Repo A (SUP-S00-009).

### 5.2 Migración
- Condición previa: una copia local del Repo A en `b4352a0`, proporcionada por el propietario, y el repositorio remoto privado; sin ellas el procedimiento se detiene (BEH-S00-007, BEH-S00-016).
- Procedimiento: (1) `git rev-parse b4352a0` en la copia para obtener el SHA completo y ejecutar la línea base sobre la copia intacta, y registrarlo todo en `docs/linea-base-tests.md`; (2) exportar el árbol con `git archive b4352a0` (sin `.git`) a un directorio nuevo; (3) aplicar la lista cerrada de exclusión y omitir las apps fuera del alcance (`worker`, `kiosk-host`); (4) recortar los workspaces y regenerar `package-lock.json` (SUP-S00-012); (5) ejecutar gitleaks sobre el árbol y escribir `docs/informe-importacion.md` para aprobación del propietario; (6) copiar al repositorio conservando los archivos propios en las colisiones y crear el commit de importación; (7) ejecutar `tools/verificar-repo.mjs`, el build y gitleaks.
- «Cambio mínimo» al corregir un build roto significa editar solo archivos de configuración de workspaces (`package.json`, `tsconfig*.json`, `turbo.json`) y nunca código de `src/`.
- Reversión: antes del primer push, el commit de importación se descarta con `git reset` del propietario; no hay datos que revertir.
- Corrección al plan: la tarea 0.2 del doc 07 espera «un solo commit inicial» en el repositorio, pero este ya tiene los commits del arnés y la documentación; el criterio pasa a ser «un solo commit de importación sin historia del Repo A».
- Corrección al plan: el criterio de la tarea 0.3 («búsqueda de cédula/Adrenalina/zip sin hallazgos») no puede cumplirse en S-00, porque el código aún contiene esos términos (doc 09 §5: 40 archivos con *cédula*, 29 con marca anterior); se limita a los archivos de datos y scripts excluidos, y el resto se retira en S-06 y S-10.
- Corrección al plan: la tarea 0.9 (branding mínimo) pasa a S-19 (sistema de diseño y rebranding completos, ADR-020) por depender de P-15, del logo y de la tipografía; la tarea 0.8 (credenciales nuevas) es del propietario y no se verifica en el árbol más que por la ausencia de secretos.

### 5.3 Riesgos
- Un workspace conservado puede importar una app omitida y romper el build (no verificado); mitigación: el procedimiento no genera el commit y registra el error (BEH-S00-009).
- Con workspaces recortados el `package-lock.json` puede quedar desincronizado y `npm ci` falla; mitigación: regenerarlo y revisar el cambio en el informe de importación (SUP-S00-012).
- El entrypoint con cero migraciones puede dejar la base sin tablas; mitigación: Compose ejecuta `prisma db push` (SUP-S00-010, REQ-S00-017).
- Las variables de las apps omitidas (`ZIP_GYM_PASSWORD`, `VITRINA_*`) desaparecen de `.env.example` si ya nadie las lee; mitigación: `verificar-env` compara contra el código que queda.
- Puede haber PII fuera de la lista de exclusión (comentarios, fixtures o archivos de datos); mitigación: gitleaks sobre el árbol y revisión del propietario de la lista de archivos de datos conservados (REQ-S00-021).
- Los falsos positivos de gitleaks bloquearían pull requests; mitigación: allowlist en `.gitleaks.toml` con motivo, visible en el diff del pull request para su revisión (BEH-S00-014).
- La línea base puede mostrar fallos y vulnerabilidades preexistentes; mitigación: se registran y los criterios de S-00 se miden contra ellos, no contra cero.
- Las apps de TV (Capacitor y Android) no se compilan en el CI de S-00 y, sin `debug.keystore`, Gradle debería generar el suyo (no verificado); mitigación: se trata en S-20 y S-21 y no se versiona ninguna clave de firma.
- La vitrina conserva precios en Bs y un emisor SSE en memoria hasta S-10 y S-20; mitigación: no se despliega antes de adaptarla.
- Dependencia nueva: gitleaks (binario de CI). Justificación: ADR-005 §4 y ADR-012 §7 lo exigen; protege el árbol importado y los pull requests futuros (el repositorio no tiene historia del Repo A) y la alternativa de expresiones regulares locales no cubre formatos de proveedores. La versión de gitleaks y la versión mayor de PostgreSQL se fijan, sin `latest`, en `.github/workflows/ci.yml` y `docker-compose.yml`, y la de PostgreSQL debe coincidir en ambos.

### 5.4 Preguntas abiertas
- ¿Se conservan `packages/domain-custom`, `design-system` y `config`? Default: `domain-custom` no es un workspace y se omite; `design-system` se conserva por ADR-020; `config` se omite si ningún workspace del alcance lo requiere (hoy ninguno).
- ¿Cómo se obtiene la copia local del Repo A? Default: el propietario la proporciona y el procedimiento usa `git archive b4352a0`.
- ¿Se activa Dependabot (doc 04 §Seguridad)? Default: no entra en S-00; se evalúa en el plan global.
- ¿Qué puerto usa `web-admin` en `docker compose`? Default: 3000, el que fijan `Dockerfile:40` y `Dockerfile:70`.
- ¿Cuál es la razón social para el aviso de copyright? Default: «Adhara Fit».
- ¿Se compilan las apps de TV en el CI de S-00? Default: no; se compilan en S-20 y S-21.

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
Decisiones del propietario posteriores al veredicto anterior: la vitrina y el check-in en smart-TV entran en el alcance (ADR-021, enmienda a ADR-009); el negocio es único y se elimina `Organizacion` (ADR-019), por lo que la línea base cuenta los archivos que la mencionan; y el rebranding completo pasa a S-19 (ADR-020). Por eso la spec vuelve a `borrador` hasta que ADR-021 esté aceptado, y esta versión **no ha sido revisada**: el veredicto de arriba describe el alcance anterior.
