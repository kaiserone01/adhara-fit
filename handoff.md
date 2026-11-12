# Handoff — Adhara Fit

## 1. Objetivo
Construir **Adhara Fit** (gimnasio en Perú, un local, PEN, sistema web interno) con Spec-Driven Development. Esta etapa es de diseño y fundaciones: arnés, ADRs, specs y plan; sin código de producto.

## 2. Estado actual
- **Puerta actual: G1 (arnés) — pendiente de aprobación del propietario.**
- **G0 superado en modo relajado por decisión del propietario (2026-11-12, America/Lima).** Último pre-flight, con los 4 controles en FAIL:

| Control | Resultado | Motivo |
|---|---|---|
| Identidad | FAIL | `user.name`/`user.email` del entorno son los de la plataforma, no los del propietario |
| Firma | FAIL | firma con el firmador de la plataforma, no con la clave del propietario |
| Push | FAIL | autenticación por proxy/bot de la plataforma; `GH_TOKEN` inválido |
| Visibilidad | FAIL | el repo está vacío pero es **público** (se exige privado) |
| `adhara.ownerEmail` | FAIL | sin definir (lo configura el propietario) |

- **Excepción autorizada por el propietario:** commits desde la sesión en la nube **sin coautor ni trailers**, con la configuración git del entorno (sin tocarla), por velocidad. Los commits de esta etapa no cumplen las reglas 1–2 (autor y firma del propietario); habrá que re-firmarlos o rehacerlos con su identidad.
- **Sin push** hasta que el repo sea privado y el propietario lo confirme.
- Rama impuesta por la plataforma: `claude/gracious-faraday-0j7ziu` (el flujo definitivo usa `docs/*`, `spec/*`, `chore/*`).
- Modo relajado del arnés: sin `adhara.ownerEmail`, `pre-commit` avisa en lugar de fallar (`ADHARA_STRICT=1` lo endurece).

| ADR | Estado |
|---|---|
| ADR-001 … ADR-013 | no revisados (E3); estado original del zip, sin cambios |
| ADR-014 … ADR-017 | no creados (se proponen en E3) |

| Spec | Estado |
|---|---|
| S-00 … S-10 | no iniciadas (E5) |

- Defaults asumidos hasta ahora: ninguno de `docs/08`. Documentación v0.4 del zip: extraída y verificada (40 archivos), aún **no importada** a `docs/` (E2).
- **Decisiones pendientes del propietario:** aprobar G1; poner el repo en privado; definir `adhara.ownerEmail`, firma y `allowedSignersFile` (ver `docs/ops/firma-commits.md`); decidir si se hace push desde la nube o se pasa a local; permitir el host `code.claude.com` para verificar la sintaxis oficial de hooks/permisos.

## 3. Archivos y cambios
- `tools/commit-policy.mjs`: política única de patrones prohibidos, formato de mensaje (una línea, ≤ 100), archivos y secretos.
- `tools/hooks/{commit-msg,pre-commit,pre-push}.mjs` y `.githooks/*`: lógica y envoltorios de los hooks; `scripts/setup-hooks.sh` fija `core.hooksPath`.
- `.claude/settings.json`: `attribution` vacío, lista `deny`, hook `PreToolUse` sobre `Bash`; `.claude/hooks/guard-bash.mjs`: bloquea con código 2.
- `tools/harness-selftest.mjs`: 19 pruebas (una negativa por regla, permitidos, hooks reales, configuración).
- `tools/check-handoff.mjs`: valida las 5 secciones, datos personales y sección 4 solo-añadir.
- `CLAUDE.md` (99 líneas), `.claude/commands/` (7 comandos), `.claude/agents/` (`spec-reviewer`, `adr-reviewer`, solo lectura).
- `docs/ops/firma-commits.md`: guía de firma y verificación local para el propietario.
- `handoff.md`: este archivo.

## 4. Intentos fallidos
- 2026-11-12: se intentó verificar la sintaxis de hooks, permisos y subagentes en la documentación oficial (`code.claude.com`); el host no resuelve desde la sesión. Resultado: la configuración de `.claude/` se escribió de memoria y queda **no verificada contra la documentación vigente**. No reintentar hasta que el propietario permita el host.
- 2026-11-12: `gh repo view --json visibility,isEmpty` falla con HTTP 403 (GraphQL no disponible en sesiones de Claude Code) y `gh auth status` indica `GH_TOKEN` inválido. Alternativa usada: `gh api repos/{owner}/{repo}` (REST, solo lectura). No usar GraphQL.
- 2026-11-12: la primera ejecución del autotest falló en `--full-generate-key` (la regla de `guard-bash` no lo cubría). Se corrigió la regla, no la prueba. Los patrones de `permissions` en `settings.json` usan la sintaxis `:*` y tampoco están verificados; el hook es la defensa real.

## 5. Próximos pasos
1. Leer handoff.md y ejecutar /preflight.
2. Esperar la decisión del propietario sobre G1 (autotest, `git log -1 --format=fuller --show-signature`, revisión del arnés).
3. Si G1 se aprueba: E2 — importar el zip a `docs/` conservando la estructura (verificar integridad), crear `README.md`, `.gitignore`, `.editorconfig`, `.gitattributes`, `.github/*`, `politica.yml` y `docs/ops/github-setup.md`.
4. Pedir al propietario: repo privado, `adhara.ownerEmail`, firma y `allowedSignersFile`; y si el push se hace desde la nube o en local.
5. Después de G2: E3 (revisión de ADR-001…013, propuesta de ADR-014…017, `adr-reviewer`), sin marcar ningún ADR como aceptado.
