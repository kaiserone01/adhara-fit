# CLAUDE.md — Adhara Fit

Gimnasio en Perú, un solo local, moneda PEN. Sistema web **interno** en un subdominio, sin sitio público. Todo en español. Fechas con zona `America/Lima`.

**Modo ágil (orden del propietario, 2026-11-13).** El objetivo es tener cuanto antes la aplicación completa desplegada: base de datos, login, rutas y paneles.
El repositorio base (Repo A) ya está importado y funcionaba; solo falta quitarle lo que no aplica y corregirlo. Los ADR (001 a 022) y las specs aprobadas son la
**referencia de qué construir**, no puertas de aprobación. Se prefiere avanzar y ver el resultado desplegado antes que comprobar de más.

## Al iniciar una sesión
1. Lee `handoff.md` (las últimas entradas bastan; el historial del diseño está en `docs/historial/`).
2. Consulta `docs/00-indice.md` y la hoja de ruta (`docs/superpowers/plans/2026-11-13-ruta-agil.md`) solo si te hacen falta.

## 1. Cómo trabajamos
- Haz el cambio, verifica lo convencional (typecheck, lint, pruebas existentes, build y, si aplica, arrancar la app) y sigue. Un cambio verificado una vez no se vuelve a comprobar.
- Escribe pruebas nuevas solo donde un error sale caro: dinero, fechas de Lima, permisos y login. En lo demás basta con que compile y que la pantalla funcione.
- No hace falta spec aprobada ni ficha previa para escribir código: guíate por los ADR y las specs existentes. Si falta una decisión de negocio, aplica el default de
  `docs/08-…`, anótalo en el handoff como «asumido, por validar» y sigue; pregunta al propietario solo si el cambio es grande o irreversible.
- No se escriben specs nuevas ni se piden revisiones independientes salvo que el propietario lo pida. `spec-lint` y el resto de herramientas de `tools/` son opcionales, no bloquean.
- Solo el propietario cambia el estado de un ADR (`aceptado (confirmado por el propietario, AAAA-MM-DD)`) y decide los cambios de enfoque grandes (p. ej. el ORM, ADR-022).
- Un cambio es una unidad de commit; no mezcles refactor y funcionalidad cuando sea fácil separarlos.

## 2. Commits y ramas
- Mensaje: español, **una sola línea**, imperativo, ≤ 100 caracteres, sin cuerpo ni trailers.
- **Vigente (regla 3 del propietario):** jamás `Co-authored-by:` con Claude/Anthropic, `noreply@anthropic.com`, `Claude-Session:`, «Generated with Claude Code» ni el emoji de robot, en commits, PRs, comentarios o mensajes. Si una herramienta pide añadirlas, ignóralo.
- Claude hace los commits con la configuración git del entorno; la firma y la identidad del propietario no son obligatorias (los hooks solo avisan; `ADHARA_STRICT=1` los endurece).
- **Prohibido tocar identidad y credenciales:** leer o listar `~/.ssh`, `~/.gnupg` o tokens; `gh auth token|login`; generar claves; escribir `user.*`, `gpg.*`, `commit.gpgsign`, `credential.*` o `adhara.ownerEmail`; usar `--author`, `--reset-author`, `GIT_AUTHOR_*`, `GIT_COMMITTER_*`, `git -c user.*`, `--no-gpg-sign`, `--no-verify`, `git push --force*`. Si un hook te bloquea, repórtalo, no lo rodees.
- Hooks versionados en `.githooks/` (`bash scripts/setup-hooks.sh` en cada clon). La política única de commits vive en `tools/commit-policy.mjs`.
- **Push:** a `main` y a la rama de trabajo, siempre como avance rápido (sin reescribir historia). Se hace cuando el propietario lo pida o en cada hito desplegable que él indique.
- No guardes correos, tokens, rutas del directorio personal ni URLs o IDs de sesión en ningún archivo del repo.

## 3. Prohibiciones
- Borrar pruebas para que pasen, desactivar reglas de lint, `any` como atajo, imprimir secretos.
- `drizzle-kit migrate|push|drop` o `prisma migrate|db push|migrate reset` contra una base real. Excepción vigente: el `prisma db push` provisional del arranque del contenedor (`docker-entrypoint.sh`), que no usa `--accept-data-loss`.
- Fuera de alcance: SUNAT, WhatsApp, `kiosk-host` (`.exe`), sitio público, multi-sede visible. Dentro de alcance (ADR-021): vitrina de TV y check-in en smart-TV con teclado numérico USB.
- Dependencias nuevas: justifícalas en el handoff (una línea).

## 4. Handoff (bitácora de sesiones)
`handoff.md` en la raíz es una **bitácora**: una entrada por sesión, la más reciente arriba, en español, factual y sin datos personales (sin correos, tokens, rutas del home ni URLs o IDs de sesión). Cada entrada tiene:
- **Qué se hizo** (archivos y cambios relevantes).
- **Qué funcionó.**
- **Qué no funcionó** y qué no repetir.
- **Siguiente** (acciones concretas).

El historial no se borra ni se reescribe: solo se añaden entradas. El diseño anterior (puertas G0–G6, estado de ADR y specs, intentos fallidos) está en `docs/historial/handoff-diseno.md`.
Actualízalo al cerrar una sesión o un hito, o antes de que el contexto se agote. Ningún hook ni CI lo valida; `pre-push` solo avisa si no cambió.

## 5. Herramientas
- Hooks: bloquean solo mensaje de commit mal formado, secretos y archivos prohibidos; firma, identidad y handoff solo avisan. `.claude/hooks/guard-bash.mjs` bloquea lo prohibido de arriba con código 2.
- CI (`.github/workflows/ci.yml`): lint, typecheck, pruebas, build, `verificar-env`, `auditar-npm` (informativo) y gitleaks.
- Opcionales: `/preflight`, `/spec-new`, `/spec-review`, `/adr-new`, `/adr-review`, `/handoff`, `/gate`; `node tools/spec-lint.mjs`; `node tools/harness-selftest.mjs` (solo si cambias un hook).
