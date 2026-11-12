# ADR-017: Arnés del agente (harness)

Estado: **propuesto** (2026-11-12)

## Contexto
Las reglas del propietario (ADR-014) deben cumplirse aunque el agente se equivoque o reciba instrucciones contrarias de la plataforma. Una instrucción en `CLAUDE.md` no es una garantía. G1 construyó un arnés de varias capas (aprobado por el propietario el 2026-11-12).

Límites conocidos: (a) la sintaxis de `.claude/settings.json` (permisos y hooks) se escribió de memoria porque `code.claude.com` no resolvía desde la sesión: **no verificada contra la documentación vigente**; (b) `core.hooksPath` no se versiona; (c) los hooks locales los puede saltar quien tenga shell, pero el agente queda bloqueado por `guard-bash`; (d) la verificación en servidor depende del plan de GitHub (no verificado); (e) el `pre-commit` no puede fijar `adhara.ownerEmail`, que configura el propietario.

## Factores de decisión
- Defensa en profundidad: instrucción, permisos, hook del agente, hooks de git, CI.
- Una sola fuente de patrones prohibidos.
- Sin dependencias (Node ≥ 22 y git).
- Cada regla con una prueba negativa.

## Opciones consideradas
| Opción | Contras |
|---|---|
| **A. Capas: `CLAUDE.md` + `permissions.deny` + hook `PreToolUse` + hooks de git + CI + autotest (elegida)** | Más piezas que mantener |
| B. Solo `CLAUDE.md` | Es una instrucción, no un control |
| C. Solo CI | Detecta tarde; no impide el commit local |

## Decisión
1. `tools/commit-policy.mjs` es la **única fuente** de los patrones prohibidos (hooks, guard, CI).
2. `.claude/settings.json`: `attribution` vacío para commit y PR; lista `deny` para lo prohibido y para leer secretos; hook `PreToolUse` sobre `Bash` que ejecuta `.claude/hooks/guard-bash.mjs`. **El hook es la defensa real**; los patrones de `permissions` son complementarios (frágiles). Sin plugins ni marketplaces externos; `.claude/settings.local.json` ignorado.
3. `guard-bash` lee el JSON del hook, inspecciona el comando completo (incluidos heredocs, `bash -c`, `eval`, `$( )`, y los cuerpos de `gh pr/issue/api`) y bloquea con código 2; si no puede leer su entrada, bloquea.
4. Hooks de git (`.githooks/`, activados con `scripts/setup-hooks.sh`): `commit-msg`, `pre-commit` (identidad si `adhara.ownerEmail` está definido, `commit.gpgsign=true`, archivos y secretos prohibidos, `spec-lint`), `pre-push` (firmas `G`/`U`, mensajes, `handoff.md` en el rango).
5. CI `politica.yml`: política de commits, autotest, commits *verified* según GitHub, `handoff.md` en el PR, `spec-lint`.
6. **Modo relajado temporal** (excepción de ADR-014): sin `adhara.ownerEmail`, `pre-commit` solo avisa; con `ADHARA_STRICT=1` falla. Se vuelve estricto al configurar el propietario su identidad.
7. Comandos `/preflight`, `/spec-new`, `/spec-review`, `/adr-new`, `/adr-review`, `/handoff`, `/gate`; subagentes `spec-reviewer` y `adr-reviewer` de solo lectura (`Read`, `Grep`, `Glob`) que reciben solo ruta y lista de comprobación.
8. Una regla solo está terminada si tiene una prueba negativa en `tools/harness-selftest.mjs`. El escaneo de secretos local (expresiones regulares) es un mínimo. **gitleaks** ya está decidido en ADR-005 §4 y ADR-012 §7; este ADR no lo revierte: su adopción como dependencia (binario en CI y pre-commit) se justifica en S-00, y hasta entonces rige el mínimo local.
9. El autotest solo prueba `guard-bash` como programa; que Claude Code cargue `settings.json` e invoque el hook se comprueba con una **prueba manual en una sesión real** (un comando prohibido debe ser bloqueado). Hasta hacerla, la defensa del agente es un supuesto.

## Consecuencias
- (+) Las reglas se cumplen de forma mecánica y verificable.
- (−) Falsos positivos posibles: `guard-bash` revisa el texto completo de ciertos comandos (p. ej. escribir una regla prohibida dentro de un heredoc de `git commit`).
- (−) Hay que mantener autotest, hooks y CI sincronizados con `CLAUDE.md`.
- Preguntas abiertas con default: verificar la sintaxis oficial cuando se permita `code.claude.com` (default: mantener el hook como defensa principal y los patrones `deny` como refuerzo); fijar acciones de CI por SHA (default: etiqueta `v4` por ahora).

## Cómo se valida
- `node tools/harness-selftest.mjs` (19 pruebas en G1: reglas negativas, permitidos, hooks reales, configuración).
- Prueba manual en sesión real del hook `PreToolUse` (decisión 9), con el resultado anotado en `handoff.md`.
- `/preflight` por sesión; PR de prueba que falle por trailer o por firma (`docs/ops/github-setup.md` §7).
- Invariante: ningún comando que viole §1 de `CLAUDE.md` llega a ejecutarse (lo detecta el autotest al añadir un caso).

## Reversibilidad
Alta: son archivos versionados; desactivar una capa no afecta a las demás.

## Dependencias
- Implementa **ADR-014**; sirve a **ADR-015**; condiciona la decisión de gitleaks en **ADR-005** y el contrato de permisos de **ADR-016**.

## Referencias
`CLAUDE.md` · `.claude/settings.json` · `.claude/hooks/guard-bash.mjs` · `.githooks/` · `tools/` · `.github/workflows/politica.yml` · `docs/ops/firma-commits.md` · `handoff.md` §4 (intentos fallidos de G1).
