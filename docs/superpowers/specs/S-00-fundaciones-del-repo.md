---
id: S-00
estado: en-revision
adrs: ADR-001, ADR-005, ADR-009, ADR-012, ADR-014, ADR-016, ADR-017
depende_de: ninguna
aprobada_por:
fecha_aprobacion:
---
# S-00 — Fundaciones del repo: copia limpia, exclusiones, CI, entorno local y secretos

## 0. Contexto y alcance

### 0.1 Problema
Adhara Fit parte de una copia del Repo A (`gym-app` @ `b4352a0`), que es público, no declara licencia y arrastra PII de personas reales, credenciales y scripts destructivos de otro negocio. Hay que importar el código de trabajo sin esa carga, con un entorno reproducible (Docker Compose, CI, `.env.example`) y con controles que impidan que vuelva a entrar (exclusiones verificadas por CI, escaneo de secretos). Este repositorio está vacío de código de producto: hoy solo contiene el arnés, la documentación y las specs.

### 0.2 Dentro de alcance
- Importar el árbol de trabajo de `b4352a0` como un único commit, sin historia del Repo A, aplicando la lista de exclusión de ADR-005 §3.
- Limitar la copia inicial a las apps del MVP (`web-admin`, `kiosk`) y a los paquetes de los que dependen (ADR-009).
- Registrar la línea base de tests del Repo A antes de aplicar exclusiones (plan 0.7, ADR-016 §4).
- `.env.example`, `LICENSE`, README de arranque, `docker-compose.yml` (PostgreSQL + `web-admin` + `kiosk`) y CI de calidad (lint, tipos, tests, build, `npm audit`, gitleaks).
- Verificaciones automáticas: lista de exclusión, variables de entorno y base efímera para pruebas de integración.
- Comprobar que el workflow `politica` del arnés corre en cada pull request.

### 0.3 Fuera de alcance
- Cambios de comportamiento o de modelo de datos: moneda, sede única, documento, tiempo y abonos pertenecen a S-02…S-10.
- Baseline de seguridad: S-01. Retirada de lo específico de Venezuela, padrón Excel y marca anterior: S-10.
- Branding mínimo (plan 0.9: nombre, logo, favicon, paleta): se traslada a S-10 junto con ADR-008 (supuesto SUP-S00-008).
- Generar el baseline de migraciones de Prisma: ocurre cuando el esquema deje de cambiar (ver SUP-S00-002).
- Rotar o crear credenciales nuevas (plan 0.8): es una tarea operativa del propietario; esta spec solo exige que no haya credenciales del Repo A en el árbol.
- Hacer privado o depurar el Repo A (plan 0.1): decisión y acción del propietario, fuera de este repositorio.
- Funcionalidades de productos (venta con cobro inmediato, RF-37, y fiado, RF-38): se copian tal como están en el Repo A y no se modifican aquí; su adaptación a PEN, permisos y turno obligatorio se trata en una spec de productos propuesta como S-11, pendiente de confirmación del propietario.
- SUNAT, WhatsApp, vitrina/TV, `kiosk-host`, sitio público y multi-sede visible.

### 0.4 Comportamiento actual verificado
> No hay copia local del Repo A en esta sesión: todo lo siguiente proviene de `docs/09` y `docs/11`, que citan archivo y línea, y queda como no re-verificado.
- El Repo A es público, sin archivo de licencia, con 732 commits y PII y credenciales en su historia (doc 11 DI-88, ADR-005 contexto); no re-verificado.
- `cookies.txt` está versionado en la raíz y contiene una cookie `sesion_token` de `localhost` (doc 11 DI-88); no re-verificado.
- Hay dos `debug.keystore` rastreados, en `apps/kiosk-tv/capacitor/android/app/` y `apps/vitrina-tv/capacitor/android/app/` (doc 11 DI-88); no re-verificado.
- `prisma/seed.ts` fija las contraseñas `admin1234` y `entrenador1234` e imprime la contraseña y la API key (doc 11 DI-88, líneas 41-60 según el doc); no re-verificado.
- No existe `.env.example`; el código lee `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `KIOSCO_CLAVE`, `KIOSCO_URL`, `NEXT_PUBLIC_API_URL`, `VITRINA_WEB_DIR`, `ZIP_GYM_PASSWORD` y `NODE_ENV` (doc 09 §4.2, doc 11 DI-85); no re-verificado.
- Hay 36 migraciones (20260913… a 20261016…) y el entrypoint ejecuta `migrate deploy` al arrancar el contenedor (doc 11 DI-15, DI-83); no re-verificado.
- Hay tres workflows en `.github/workflows`: `apk-kiosco.yml`, `apk-vitrina.yml` y `verificar-vitrina.yml` (doc 11 DI-13); no re-verificado.
- `packages/domain-custom`, `design-system` y `config` están vacíos o casi vacíos (doc 11 DI-05); no re-verificado.
- La suite de tests nunca se ejecutó en el análisis: no hay `node_modules` ni red (doc 09 §1); no verificado.

### 0.5 Supuestos
- SUP-S00-001: las apps diferidas (`worker`, `kiosk-tv`, `kiosk-host`, `vitrina`, `vitrina-tv`) y los workflows `apk-*.yml` y `verificar-vitrina.yml` se omiten de la copia en lugar de moverse a `_diferido/` (decisión D3). Default: omitirlas y reincorporarlas desde `b4352a0` si se aprueban; asumido, por validar.
- SUP-S00-002: las migraciones heredadas se excluyen y el baseline se genera después de las specs que cambian el esquema (decisión D12); mientras tanto la base desechable usa `prisma db push`. Default: ese comportamiento; asumido, por validar.
- SUP-S00-003: gitleaks se adopta como binario de versión fija en CI y como comprobación opcional en `pre-commit` (decisión D13). Default: sí; asumido, por validar.
- SUP-S00-004: `npm audit` falla el pipeline ante vulnerabilidades de severidad high o critical. Default: ese umbral; asumido, por validar.
- SUP-S00-005: el aviso legal es `Copyright (c) 2026 Adhara Fit. Todos los derechos reservados.` Default: ese texto; asumido, por validar.
- SUP-S00-006: esta spec incluye la comprobación del workflow `politica` (decisión D19). Default: incluirla; asumido, por validar.
- SUP-S00-007: la base de datos de `docker compose` es desechable (su volumen se puede borrar) y no cuenta como base real. Default: tratarla como desechable; asumido, por validar.
- SUP-S00-008: el branding mínimo del plan 0.9 se ejecuta en S-10. Default: trasladarlo; asumido, por validar.
- SUP-S00-009: el repo base expone los scripts `lint`, `typecheck`, `test` y `build` en `package.json` (no verificado). Default: si los nombres reales difieren se adaptan y se documentan en el README; asumido, por validar.

## 1. Requisitos

> Origen: ADR citados y tareas del plan (doc 07 §Fase 0).

### REQ-S00-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-001
- texto: El repositorio deberá contener el árbol de trabajo del commit b4352a0 del Repo A en un único commit de importación, sin ningún objeto de la historia del Repo A.

### REQ-S00-002
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando se importa el árbol del Repo A, el procedimiento deberá excluir todos los archivos y directorios de la lista de exclusión de ADR-005 §3.

### REQ-S00-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: El pipeline de CI deberá fallar cuando el árbol versionado contenga cualquier archivo de la lista de exclusión, sea cual sea su ruta.

### REQ-S00-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-009
- texto: La copia inicial deberá contener solo las apps web-admin y kiosk, los paquetes de los que dependen y los workflows de este repositorio.

### REQ-S00-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El repositorio no deberá contener ninguna migración de Prisma heredada del Repo A.

### REQ-S00-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: El archivo .env.example deberá enumerar, sin valores, exactamente las variables de entorno que lee el código.

### REQ-S00-007
- tipo: cuando
- prioridad: MUST
- origen: ADR-005, ADR-012
- texto: Cuando se abre un pull request, el CI deberá ejecutar gitleaks sobre el rango del pull request y fallar ante cualquier hallazgo.

### REQ-S00-008
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando se abre un pull request, el CI deberá ejecutar lint, comprobación de tipos, pruebas por workspace, build y npm audit, y fallar si alguno de ellos falla.

### REQ-S00-009
- tipo: cuando
- prioridad: MUST
- origen: ADR-005
- texto: Cuando una persona ejecuta docker compose up, el sistema deberá iniciar PostgreSQL y web-admin y mostrar la pantalla de inicio de sesión de web-admin en el puerto indicado en el README.

### REQ-S00-010
- tipo: ubicuo
- prioridad: SHOULD
- origen: ADR-005
- texto: El README deberá permitir que una persona nueva levante el proyecto en menos de 30 minutos.

### REQ-S00-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016, ADR-001
- texto: Antes de aplicar cualquier exclusión, el procedimiento deberá registrar la línea base de tests del Repo A en docs/linea-base-tests.md.

### REQ-S00-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-005
- texto: El repositorio deberá incluir un archivo LICENSE con el aviso de copyright y licencia privativa.

### REQ-S00-013
- tipo: cuando
- prioridad: MUST
- origen: ADR-014, ADR-017
- texto: Cuando se abre un pull request, el CI deberá ejecutar el workflow politica con la política de commits, las firmas verificadas, el handoff y spec-lint.

### REQ-S00-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Las pruebas de integración deberán usar una base PostgreSQL efímera y abortar antes de conectarse si DATABASE_URL no apunta a ella.

### REQ-S00-015
- tipo: cuando
- prioridad: MUST
- origen: ADR-009, ADR-016
- texto: Cuando se aplican las exclusiones, el procedimiento deberá dejar la instalación, la comprobación de tipos y el build sin errores nuevos respecto de la línea base.

## 2. Comportamiento

- no_aplica: concurrencia — S-00 no introduce lógica de negocio ni acceso concurrente a datos; la concurrencia de caja se trata en S-04 y S-08

### BEH-S00-001
- cubre: REQ-S00-001, REQ-S00-002, REQ-S00-004, REQ-S00-005, REQ-S00-015
- categoria: feliz
- dado: una copia local del Repo A en el commit b4352a0 y la línea base ya registrada
- cuando: se ejecuta el procedimiento de importación con la lista de exclusión
- entonces: se crea un único commit de importación sin los archivos excluidos, con solo web-admin y kiosk, sin migraciones, y la instalación, los tipos y el build no tienen errores nuevos

### BEH-S00-002
- cubre: REQ-S00-008, REQ-S00-013
- categoria: feliz
- dado: un pull request con un commit en una sola línea y firmado, con handoff.md modificado
- cuando: el CI se ejecuta
- entonces: lint, tipos, pruebas, build, npm audit y el workflow politica terminan en verde

### BEH-S00-003
- cubre: REQ-S00-009, REQ-S00-010
- categoria: feliz
- dado: un clon limpio y una máquina con Docker, sin el archivo .env
- cuando: la persona copia .env.example a .env y ejecuta docker compose up
- entonces: PostgreSQL y web-admin inician y la pantalla de inicio de sesión responde en el puerto del README

### BEH-S00-004
- cubre: REQ-S00-003
- categoria: borde
- dado: un archivo cookies.txt colocado en apps/kiosk, fuera de la raíz donde estaba en el Repo A
- cuando: el CI ejecuta la verificación de exclusiones
- entonces: la verificación falla con código distinto de 0 y lista la ruta apps/kiosk/cookies.txt

### BEH-S00-005
- cubre: REQ-S00-006
- categoria: borde
- dado: una variable nueva leída con process.env que no figura en .env.example
- cuando: el CI ejecuta la verificación de variables de entorno
- entonces: la verificación falla y nombra la variable que falta

### BEH-S00-006
- cubre: REQ-S00-007
- categoria: error
- dado: un commit que añade una cadena con el formato de un token de GitHub
- cuando: el CI ejecuta gitleaks sobre el rango del pull request
- entonces: el job falla y el pull request no puede fusionarse

### BEH-S00-007
- cubre: REQ-S00-001, REQ-S00-011
- categoria: error
- dado: que no hay copia local del Repo A disponible
- cuando: se intenta ejecutar el procedimiento de importación
- entonces: el procedimiento se detiene antes de crear archivos y pide la copia, sin importar nada

### BEH-S00-008
- cubre: REQ-S00-014
- categoria: error
- dado: DATABASE_URL apuntando a un host que no es la base efímera de pruebas
- cuando: arranca una prueba de integración
- entonces: el helper de pruebas aborta con un error explícito antes de abrir la conexión

### BEH-S00-009
- cubre: REQ-S00-015
- categoria: error
- dado: que tras las exclusiones el build falla porque un paquete conservado importa una app omitida
- cuando: el procedimiento ejecuta el build
- entonces: el procedimiento no se da por terminado y el error queda registrado en el informe de importación para su corrección

### BEH-S00-010
- cubre: REQ-S00-012
- categoria: borde
- dado: un pull request que elimina el archivo LICENSE
- cuando: se revisa el pull request
- entonces: la comprobación de archivos obligatorios falla y señala LICENSE

## 3. Invariantes

### INV-S00-001
- propiedad: ningún archivo de la lista de exclusión existe en el árbol versionado, en ninguna ruta
- mecanismo: lint
- deteccion: el script tools/verificar-exclusiones.mjs termina con código distinto de 0 y lista los archivos que coinciden por nombre o ruta
- protege: REQ-S00-002, REQ-S00-003

### INV-S00-002
- propiedad: el árbol versionado y el rango de cada pull request no contienen secretos
- mecanismo: lint
- deteccion: gitleaks detect termina con código distinto de 0 ante un hallazgo
- protege: REQ-S00-007

### INV-S00-003
- propiedad: el conjunto de variables leídas con process.env es igual al conjunto de nombres de .env.example
- mecanismo: lint
- deteccion: el script tools/verificar-env.mjs termina con código distinto de 0 y lista las variables sobrantes o ausentes
- protege: REQ-S00-006

### INV-S00-004
- propiedad: ninguna prueba de integración abre conexión a una base que no sea la efímera
- mecanismo: asercion-dominio
- deteccion: el helper de pruebas lanza un error antes de conectar y la prueba falla
- protege: REQ-S00-014

### INV-S00-005
- propiedad: el repositorio no contiene ningún objeto de la historia del Repo A
- mecanismo: lint
- deteccion: git cat-file -e b4352a0^{commit} debe fallar; si tiene éxito, la verificación de importación falla
- protege: REQ-S00-001

## 4. Criterios de aceptación

### AC-S00-001
- enlaza: REQ-S00-001, BEH-S00-001, BEH-S00-007, INV-S00-005
- metodo: manual
- procedimiento: tras importar, ejecutar git show --stat sobre el commit de importación y git cat-file -e b4352a0^{commit}
- esperado: el commit de importación es único, su mensaje es de una línea y el segundo comando termina con error
- test: pendiente

### AC-S00-002
- enlaza: REQ-S00-002, REQ-S00-003, BEH-S00-004, INV-S00-001
- metodo: integracion
- procedimiento: ejecutar node tools/verificar-exclusiones.mjs en un árbol limpio y de nuevo tras crear apps/kiosk/cookies.txt
- esperado: el primer caso termina con código 0 y el segundo con código 1 listando apps/kiosk/cookies.txt
- test: tools/verificar-exclusiones.test.mjs

### AC-S00-003
- enlaza: REQ-S00-004
- metodo: unitario
- procedimiento: comprobar con la verificación de exclusiones que el directorio apps contiene exactamente kiosk y web-admin y que .github/workflows contiene solo los workflows de este repositorio
- esperado: la comprobación pasa con esos dos directorios y falla si aparece cualquier otra app
- test: tools/verificar-exclusiones.test.mjs

### AC-S00-004
- enlaza: REQ-S00-005
- metodo: unitario
- procedimiento: buscar en el árbol versionado archivos migration.sql y directorios prisma/migrations
- esperado: la búsqueda no devuelve ningún resultado
- test: tools/verificar-exclusiones.test.mjs

### AC-S00-005
- enlaza: REQ-S00-006, BEH-S00-005, INV-S00-003
- metodo: unitario
- procedimiento: ejecutar tools/verificar-env.mjs con un código de ejemplo que lee una variable ausente de .env.example y con uno consistente
- esperado: el primero termina con código 1 nombrando la variable y el segundo con código 0
- test: tools/verificar-env.test.mjs

### AC-S00-006
- enlaza: REQ-S00-007, BEH-S00-006, INV-S00-002
- metodo: e2e
- procedimiento: abrir un pull request de prueba que añade una cadena con el formato de un token de GitHub y observar el job de gitleaks
- esperado: el job termina en fallo y el pull request queda bloqueado; sin esa cadena el job termina en verde
- test: pendiente

### AC-S00-007
- enlaza: REQ-S00-008, BEH-S00-002
- metodo: e2e
- procedimiento: abrir un pull request sin cambios funcionales sobre la copia importada y revisar los jobs de lint, tipos, pruebas, build y npm audit
- esperado: los cinco jobs terminan en verde; con una vulnerabilidad high simulada, npm audit falla
- test: pendiente

### AC-S00-008
- enlaza: REQ-S00-009, REQ-S00-010, BEH-S00-003
- metodo: manual
- procedimiento: en un clon limpio, seguir solo el README con un cronómetro, ejecutar docker compose up y abrir la URL del README
- esperado: la pantalla de inicio de sesión de web-admin carga y el tiempo total es menor que 30 minutos
- test: pendiente

### AC-S00-009
- enlaza: REQ-S00-011, BEH-S00-007, BEH-S00-001
- metodo: manual
- procedimiento: comprobar que docs/linea-base-tests.md existe con el número de tests por workspace, los fallos preexistentes, el tiempo y los archivos de web-admin con tests, y que su commit es anterior al de importación
- esperado: el archivo existe y su commit precede al de importación en git log
- test: pendiente

### AC-S00-010
- enlaza: REQ-S00-012, BEH-S00-010
- metodo: unitario
- procedimiento: comprobar que el archivo LICENSE existe y contiene la frase Todos los derechos reservados
- esperado: la comprobación pasa y falla si el archivo falta
- test: tools/verificar-exclusiones.test.mjs

### AC-S00-011
- enlaza: REQ-S00-013, BEH-S00-002
- metodo: e2e
- procedimiento: abrir dos pull requests de prueba, uno con un commit que lleva un trailer prohibido y otro conforme, y observar el workflow politica
- esperado: el primero falla en el paso de política de commits y el segundo termina en verde
- test: pendiente

### AC-S00-012
- enlaza: REQ-S00-014, BEH-S00-008, INV-S00-004
- metodo: unitario
- procedimiento: invocar el helper de pruebas con DATABASE_URL apuntando a un host que no es el efímero y comprobar que no se abre conexión
- esperado: el helper lanza un error y no llama al cliente de base de datos
- test: pendiente

### AC-S00-013
- enlaza: REQ-S00-015, BEH-S00-001, BEH-S00-009
- metodo: integracion
- procedimiento: tras aplicar las exclusiones, ejecutar la instalación, la comprobación de tipos y el build, y comparar los errores con los de docs/linea-base-tests.md
- esperado: no hay errores que no figuren ya en la línea base; si los hay, el procedimiento no se da por terminado
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Primero se escriben los scripts verificables sin dependencias, con `node:test`: `tools/verificar-exclusiones.mjs` y `tools/verificar-env.mjs`, cada uno con su archivo de pruebas (ADR-016 §8).
- El helper de base efímera se prueba de forma unitaria sin abrir conexión; la base efímera real la levanta el CI con un servicio de PostgreSQL (supuesto de ADR-016).
- Los criterios e2e (gitleaks, pipeline, política) se comprueban con pull requests de prueba y el resultado se anota en `handoff.md`.
- Los scripts de calidad del código importado se ejecutan tal como existen en el Repo A (SUP-S00-009).

### 5.2 Migración
- Condición previa: una copia local del Repo A en `b4352a0`, proporcionada por el propietario; sin ella el procedimiento se detiene (BEH-S00-007).
- Procedimiento: (1) ejecutar la línea base sobre la copia intacta y confirmar `docs/linea-base-tests.md`; (2) exportar el árbol con `git archive b4352a0` (sin `.git`) a un directorio nuevo; (3) aplicar la lista de exclusión y omitir las apps diferidas; (4) copiar al repositorio y crear el commit de importación; (5) ejecutar la verificación de exclusiones, el build y gitleaks.
- Reversión: antes del primer push, el commit de importación se descarta con `git reset` del propietario; no hay datos que revertir.
- Corrección al plan: la tarea 0.2 del doc 07 espera «un solo commit inicial» en el repositorio, pero este ya tiene los commits del arnés y la documentación; el criterio pasa a ser «un solo commit de importación sin historia del Repo A».
- Corrección al plan: el criterio de la tarea 0.3 («búsqueda de cédula/Adrenalina/zip sin hallazgos») no puede cumplirse en S-00, porque el código aún contiene esos términos (doc 09 §5: 40 archivos con *cédula*, 29 con marca anterior); se limita a los archivos de datos y scripts excluidos, y el resto se retira en S-06 y S-10.

### 5.3 Riesgos
- Un paquete conservado puede importar una app omitida y romper el build (no verificado); mitigación: registrar el error en el informe de importación y corregir con el cambio mínimo (BEH-S00-009).
- Puede haber PII fuera de la lista de exclusión (por ejemplo en comentarios o fixtures); mitigación: gitleaks y una búsqueda de nombres de personas reales previa al commit de importación.
- Los falsos positivos de gitleaks bloquearían pull requests; mitigación: archivo de configuración con exclusiones revisadas por el propietario.
- La línea base puede mostrar fallos preexistentes; mitigación: se registran y los criterios de S-00 se miden contra ellos, no contra cero.
- Dependencia nueva: gitleaks (binario de CI). Justificación: ADR-005 §4 y ADR-012 §7 lo exigen y la alternativa de expresiones regulares locales no cubre secretos en historia ni formatos de proveedores.

### 5.4 Preguntas abiertas
- ¿Se conservan `packages/domain-custom`, `design-system` y `config`, que están casi vacíos (doc 11 DI-05)? Default: se conservan solo si algún workspace los referencia.
- ¿Cómo se obtiene la copia local del Repo A? Default: el propietario la proporciona y el procedimiento usa `git archive b4352a0`.
- ¿Se activa Dependabot (doc 04 §Seguridad)? Default: no entra en S-00; se evalúa en el plan global.
- ¿Qué puerto usa `web-admin` en `docker compose`? Default: el que fije el README tras leer la configuración del Repo A (no verificado).
