# Adhara Fit

Sistema web **interno** de gestión para un gimnasio en Perú (un solo local, moneda PEN), en un subdominio, sin sitio público.

Estado: **desarrollo iniciado** con Spec-Driven Development (SDD). Se implementa en el orden del plan global
(`docs/superpowers/plans/2026-11-12-refactor-fundaciones.md`); el código parte de una copia limpia del Repo A (`docs/informe-importacion.md`).

## Por dónde empezar
- `handoff.md`: estado de la sesión, decisiones pendientes y próximos pasos. Se lee primero.
- `CLAUDE.md`: reglas innegociables, puertas de aprobación y protocolo de cierre.
- `docs/00-indice.md`: índice de la documentación y `docs/adr/` con las decisiones.
- `docs/superpowers/specs/`: las specs; `docs/ops/`: guías operativas del propietario.

## Levantar el proyecto en local
Requisitos: Docker con Compose, y Node ≥ 22 si vas a correr las pruebas fuera de Docker.

```bash
cp .env.example .env
docker compose up --build
```

Compose inicia PostgreSQL y `web-admin` (con comprobación de salud), crea el esquema con `prisma db push` y publica la pantalla de inicio de sesión en <http://localhost:3000>.
La base de Compose es **desechable**; para empezar de cero:

```bash
docker compose down -v
```

Todavía no hay usuario inicial: lo crea la spec S-15 (línea base y datos iniciales). Para el checkin (`apps/checkin`) usa su script `dev` (puerto 3001); no entra en Compose.

## Calidad
```bash
npm ci
npm run generate --workspace @gym-app/db   # genera el cliente de Prisma (necesita DATABASE_URL, aunque sea ficticia)
npm run lint
npm run typecheck
npm test
npx turbo run build --filter=web-admin --filter=checkin
```

`typecheck` de `web-admin` tiene 1 error preexistente y `vitrina` no compila sin acceso a Google Fonts: ambos están en la línea base (`docs/linea-base-tests.md`).

## Flujo de trabajo
- `main` recibe los push de Claude por orden del propietario (2026-11-12), sin reescribir su historia; el trabajo puede ir en ramas `docs/<tema>`, `spec/S-xx-<slug>` y `chore/<tema>`.
- Commits en español, **una sola línea**, imperativo, ≤ 100 caracteres, sin trailers.
- Cada puerta (G0–G6) requiere aprobación escrita; el desarrollo avanza por specs aprobadas, un commit por paso de la sección 5.1 de cada spec.

## Herramientas (Node ≥ 22, sin dependencias salvo `pg` para las pruebas de integración)
```bash
bash scripts/setup-hooks.sh              # activa .githooks en este clon
node tools/harness-selftest.mjs          # autotest del arnés
node tools/check-handoff.mjs             # valida handoff.md
node tools/commit-policy.mjs --range <rev-range>   # política de commits sobre un rango
node tools/verificar-repo.mjs            # exclusiones, apps y workspaces, archivos obligatorios, versiones fijadas
node tools/verificar-env.mjs             # variables de process.env frente a .env.example
node tools/auditar-npm.mjs               # npm audit frente a docs/linea-base-audit.json
node tools/spec-lint.mjs                 # valida las specs
```
