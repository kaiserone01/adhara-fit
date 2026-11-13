# Retomar el desarrollo en local (handoff especial)

Para continuar Adhara Fit en tu computadora, partiendo de cero, con lo que hoy está en el repositorio remoto.
Este archivo complementa `handoff.md` (el estado oficial de la sesión) y no contiene secretos.

## 1. Dónde está el trabajo
- Repositorio: `https://github.com/kaiserone01/adhara-fit` (público).
- **Todo el avance está en la rama `claude/gracious-faraday-0j7ziu`.** La rama `main` quedó atrás (solo tiene el diseño hasta la aprobación de S-14, S-17 y S-19) porque no se autorizó empujarle el código. Mientras no decidas lo contrario, trabaja desde la rama.
- Última etapa: Ola 0 del plan global. S-00 está implementada; S-22 (Drizzle) va en el paso 2 de 5.

## 2. Instalar lo necesario (una sola vez)
| Herramienta | Versión | Para qué |
|---|---|---|
| Git | cualquiera reciente | clonar y commitear |
| Node.js | 22 o superior (con npm 10) | todo el monorepo y las herramientas `tools/` |
| Docker Desktop | opcional | `docker compose up` (PostgreSQL + `web-admin`) |
| PostgreSQL 16 | solo si no usas Docker | pruebas de integración y desarrollo |
| Claude Code | última | continuar con el agente (`npm install -g @anthropic-ai/claude-code`) |
| GitHub CLI (`gh`) | opcional | ver el CI |

En Windows usa **WSL2 (Ubuntu)** o Git Bash: los hooks y `scripts/setup-hooks.sh` son de Bash.

## 3. Descargar y preparar
```bash
git clone https://github.com/kaiserone01/adhara-fit.git
cd adhara-fit
git checkout claude/gracious-faraday-0j7ziu
bash scripts/setup-hooks.sh
npm ci
```

Si el `npm ci` falla por la red, repítelo; en tu casa no hace falta ninguna opción especial (las banderas `--noproxy` y `--legacy-peer-deps` de las notas del handoff eran de la nube).

Después, genera el cliente de la base (necesita una `DATABASE_URL`, aunque sea ficticia) y comprueba que todo está sano:
```bash
DATABASE_URL=postgresql://u:p@localhost:5432/x npm run generate --workspace @gym-app/db
node tools/verificar-repo.mjs
node tools/verificar-env.mjs
node tools/auditar-npm.mjs
node --test "tools/*.test.mjs"
node tools/harness-selftest.mjs
node tools/spec-lint.mjs
npm test
```
Esperado: `verificar-*` y `auditar-npm` sin hallazgos, 0 pruebas fallidas en `tools/` (algunas se omiten sin PostgreSQL o sin gitleaks), 390 de dominio en verde y `spec-lint` con 0 errores y 0 avisos.

## 4. Levantar la aplicación en local
Con Docker:
```bash
cp .env.example .env
docker compose up --build
```
Abre <http://localhost:3000>. Compose crea el esquema con `prisma db push` al arrancar y la base es desechable (`docker compose down -v` la borra). **Todavía no hay usuario inicial** (llega con S-15/S-17).

Sin Docker, con PostgreSQL propio:
```bash
cp .env.example .env     # completa DATABASE_URL con tu base local
cd packages/db && npx prisma db push --config prisma7.config.ts && cd ../..
npm run dev
```

Pruebas de integración contra PostgreSQL (el helper crea y destruye bases `adhara_test_*`; solo acepta hosts locales):
```bash
export DATABASE_URL=postgresql://<usuario>:<clave>@localhost:5432/postgres
node --test tools/base-efimera.integracion.test.mjs
```

## 5. Reglas que el agente ya conoce (CLAUDE.md)
- Español, fechas en `America/Lima`, moneda PEN. Un commit por tarea, mensaje de **una línea** (≤ 100 caracteres), sin cuerpo ni trailers; nunca `Co-authored-by` de Claude.
- Spec-Driven: el código de producto solo para specs aprobadas (hoy S-00 a S-15, S-17, S-18, S-19, S-22, S-23). S-20 y S-21 siguen en revisión.
- Los hooks avisan, no bloquean, si falta firma o identidad. En local puedes usar **tu propia identidad de Git** y firmar si quieres; con `ADHARA_STRICT=1` el rigor vuelve a ser total.
- Al cerrar una sesión o una etapa: actualizar `handoff.md` y ejecutar `node tools/check-handoff.mjs`. `pre-push` exige que `handoff.md` cambie en lo que se sube.
- No guardes claves, correos ni rutas personales en el repositorio (es público).

## 6. Estado resumido
- **Aprobadas:** ADR-001 a 022; specs S-00 a S-15, S-17, S-18, S-19, S-22 y S-23 (S-16 descartada).
- **S-00 implementada:** código del Repo A importado en un solo commit (`docs/informe-importacion.md`), `LICENSE`, `.env.example`, Compose, CI de calidad con gitleaks, y las herramientas `verificar-repo`, `verificar-env`, `auditar-npm`, `importar-repo-a` y `base-efimera`, todas con pruebas.
- **S-22 en curso (Drizzle):** hecho el paso 0 (`verificar-drizzle`, `guardia-db-local`) y `comparar-esquemas`. Falta instalar `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11 y `pg` 8.23.0 en `packages/db` y `@types/pg`; en la nube la instalación se colgaba, en tu máquina debería ser inmediata.
- **S-20 y S-21:** redactadas y con lint verde, pero los revisores independientes pidieron cambios. Los hallazgos están en `docs/superpowers/revisiones-pendientes/S-20.md` y `S-21.md`. Hay que corregirlas, pegar `## Revisión independiente` con la conciliación y esperar tu «aprobada». Se implementan al final (Ola 6).
- **Despliegue provisional:** `docs/ops/easypanel.md`. La imagen crea el esquema al arrancar; sin usuario inicial.

## 7. Qué sigue, en orden
1. Leer `handoff.md` y ejecutar los comandos del apartado 3.
2. S-22: instalar las dependencias de Drizzle (apartado 6); escribir las suites de contrato de los repositorios contra los puertos del dominio (paso 1 de la sección 5.1 de la spec, que se saltó); generar el esquema Drizzle en `packages/db/src/schema/` (se puede generar con `drizzle-kit pull` desde una base creada con `prisma db push` y reordenar por tabla); comprobar paridad con `node tools/comparar-esquemas.mjs <urlA> <urlB>`; luego los 22 repositorios, `web-admin` y el retiro de Prisma.
3. Ola 1: S-01, S-02, S-03. Ola 2: S-04 a S-07. Ola 3: S-08, S-09, S-10, S-11, S-18, S-23. Ola 3b: S-15 pasos 1 a 5. Ola 4: S-19. Ola 5: S-12, S-13, S-14. Ola 6: S-20 y S-21 (tras conciliarlas). Ola 7: S-15 paso 6 y 7, y S-17. Detalle en `docs/superpowers/plans/2026-11-12-refactor-fundaciones.md`.

## 8. Decisiones tuyas pendientes
- ¿Empujar el código a `main`? (Easypanel mira `main`; hoy solo tiene el diseño.)
- ¿Adelantar el alta del primer administrador (correo y contraseña inicial por variables de entorno) para entrar a la app antes de la Ola 3b? Recomendado.
- **Rotar las claves** que compartiste por chat (base de datos y R2): el repositorio es público.
- Pendientes de insumos: PNG originales del logotipo, textos legales revisados, datos de cobro de Yape y BCP, nombre y correo del primer administrador, marca y modelo del televisor, VPS y dominio definitivos.
- Primer resultado del CI en GitHub (especialmente el job `gitleaks`, que no se pudo ejecutar en la nube).

## 9. Prompt para continuar con Claude Code
Abre Claude Code dentro de la carpeta `adhara-fit` (ya en la rama `claude/gracious-faraday-0j7ziu`) y pega:

```text
Continúa el desarrollo de Adhara Fit desde donde quedó la sesión en la nube.

Primero, en este orden:
1. Lee CLAUDE.md, handoff.md completo, docs/00-indice.md y docs/ops/retomar-en-local.md.
2. Ejecuta /preflight y muestra la tabla PASS/FAIL (los controles de identidad y firma ya no bloquean).
3. Ejecuta los comandos de verificación del apartado 3 de docs/ops/retomar-en-local.md y dime qué pasa y qué falla.

Después sigue el plan global (docs/superpowers/plans/2026-11-12-refactor-fundaciones.md): estamos en la Ola 0, spec S-22 (Drizzle), con el paso 0 y el comparador de esquemas hechos. Haz así:
- Instala drizzle-orm 0.45.4, pg 8.23.0, drizzle-kit 0.31.11 (dev) y @types/pg (dev) en packages/db con versiones exactas.
- Escribe primero las suites de contrato de los repositorios contra los puertos del dominio (paso 1 de la sección 5.1 de S-22), usando el helper tools/base-efimera.mjs, luego el esquema Drizzle y la paridad con tools/comparar-esquemas.mjs, luego los repositorios de uno en uno.
- Un commit por paso, mensaje de una sola línea en español (≤ 100 caracteres), sin trailers ni coautor; pruebas primero; typecheck, lint y pruebas en verde antes de cada commit.
- Actualiza handoff.md al cerrar cada etapa (sin datos personales ni claves) y ejecuta node tools/check-handoff.mjs.
- No empujes a main hasta que yo lo pida; la rama de trabajo es claude/gracious-faraday-0j7ziu.

Reglas que no cambian: el código de producto solo para specs aprobadas por escrito (S-00 a S-15, S-17, S-18, S-19, S-22 y S-23); S-20 y S-21 siguen en revisión y sus hallazgos están en docs/superpowers/revisiones-pendientes/. Cada código que menciones (ADR-nnn, S-nn, REQ, etc.) debe llevar al lado una descripción simple. No guardes claves ni correos en el repositorio. Si algo te bloquea, reporta en vez de rodearlo.

Antes de empezar, pregúntame solo dos cosas: si empujo a main y si adelantamos el alta del primer administrador. Con mi respuesta, sigue sin más pausas.
```
