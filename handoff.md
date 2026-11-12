# Handoff — Adhara Fit

## 1. Objetivo
Construir **Adhara Fit** (gimnasio en Perú, un local, PEN, sistema web interno) con Spec-Driven Development. Esta etapa es de diseño y fundaciones: arnés, ADRs, specs y plan; sin código de producto.

## 2. Estado actual
- **Puerta actual: G3 (ADRs) — pendiente de aprobación del propietario.** G1 y G2 aprobadas por el propietario (2026-11-12).
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
| ADR-001 … ADR-013 | **propuesto** (sin cambios). Revisados en G3: el revisor independiente da 11 «Requiere cambios» (001, 002, 003, 004, 005, 007, 008, 009, 011, 012, 013) y 2 «Bloqueado por pregunta» (006 por P-07; 010 por P-16/17/18). Detalle en `docs/adr/REVISION-ADR.md` |
| ADR-014 … ADR-017 | **propuesto** (creados en G3). El revisor: 014 «Listo para aceptar» con observaciones; 015, 016 y 017 «Requiere cambios»; las incoherencias internas ya están corregidas (REVISION-ADR §8.3), sin nueva pasada del revisor |

Ningún ADR está *aceptado*. Solo el propietario cambia un estado, ADR por ADR, registrándolo como `aceptado (confirmado por el propietario, AAAA-MM-DD)`.

| Spec | Estado |
|---|---|
| S-00 … S-10 | no iniciadas (E5) |

- Defaults asumidos hasta ahora: ninguno de `docs/08`. Documentación v0.4 del zip: **importada íntegra** a `docs/` (40 archivos; `diff -r` vacío y manifiesto sha256 idéntico; el commit de importación solo contiene esos archivos).
- `docs/12` cita como texto las líneas prohibidas (son las reglas del propietario); el escaneo de commits aplica a mensajes, no a archivos.
- El workflow `politica.yml` no se ha ejecutado en GitHub; solo se validó el YAML y se simularon sus pasos en local (sin el paso de firmas verificadas).
- Supuestos nuevos: mecanismo de Postgres efímero (Docker Compose) y librería de propiedades de dinero son supuestos de ADR-016 (por validar en S-00 y S-03). El «default» de gracia (P-18) que propuse es **recomendación mía**: `docs/08` no da default a P-18.
- **Decisiones pendientes del propietario:** aprobar G3; responder D1–D10 (`docs/adr/REVISION-ADR.md` §5) y D11–D20 (§8.4); poner el repo en privado; definir `adhara.ownerEmail`, firma y `allowedSignersFile` (ver `docs/ops/firma-commits.md`); decidir si se hace push desde la nube o se pasa a local; permitir el host `code.claude.com` para verificar la sintaxis oficial de hooks/permisos.

## 3. Archivos y cambios
- `tools/commit-policy.mjs`: política única de patrones prohibidos, formato de mensaje (una línea, ≤ 100), archivos y secretos.
- `tools/hooks/{commit-msg,pre-commit,pre-push}.mjs` y `.githooks/*`: lógica y envoltorios de los hooks; `scripts/setup-hooks.sh` fija `core.hooksPath`.
- `.claude/settings.json`: `attribution` vacío, lista `deny`, hook `PreToolUse` sobre `Bash`; `.claude/hooks/guard-bash.mjs`: bloquea con código 2.
- `tools/harness-selftest.mjs`: 19 pruebas (una negativa por regla, permitidos, hooks reales, configuración).
- `tools/check-handoff.mjs`: valida las 5 secciones, datos personales y sección 4 solo-añadir.
- `CLAUDE.md` (99 líneas), `.claude/commands/` (7 comandos), `.claude/agents/` (`spec-reviewer`, `adr-reviewer`, solo lectura).
- `docs/ops/firma-commits.md`: guía de firma y verificación local para el propietario.
- `docs/` (00–12, `adr/ADR-001…013`, `anexos/inventario/`): importación íntegra del zip v0.4, sin modificar.
- `README.md`, `.gitignore` (exclusiones de ADR-005), `.editorconfig`, `.gitattributes` (LF).
- `.github/CODEOWNERS`, `.github/pull_request_template.md`, `.github/workflows/politica.yml` (política de commits, autotest, commits verificados, handoff en el PR, spec-lint).
- `docs/ops/github-setup.md`: pasos del propietario (repo privado, clave de firma, Vigilant mode, protección de `main`, plan requerido).
- `docs/adr/ADR-014…017`: cuatro ADR nuevos en estado *propuesto* (identidad y firma; flujo SDD; pruebas; arnés), con todas las secciones MADR.
- `docs/adr/REVISION-ADR.md`: revisión de G3 (hallazgos transversales, grafo, veredicto del autor, decisiones D1–D20) con el veredicto íntegro de `adr-reviewer` en §7 y la conciliación en §8.
- `handoff.md`: actualizado al cierre de G3.

## 4. Intentos fallidos
- 2026-11-12: se intentó verificar la sintaxis de hooks, permisos y subagentes en la documentación oficial (`code.claude.com`); el host no resuelve desde la sesión. Resultado: la configuración de `.claude/` se escribió de memoria y queda **no verificada contra la documentación vigente**. No reintentar hasta que el propietario permita el host.
- 2026-11-12: `gh repo view --json visibility,isEmpty` falla con HTTP 403 (GraphQL no disponible en sesiones de Claude Code) y `gh auth status` indica `GH_TOKEN` inválido. Alternativa usada: `gh api repos/{owner}/{repo}` (REST, solo lectura). No usar GraphQL.
- 2026-11-12: la primera ejecución del autotest falló en `--full-generate-key` (la regla de `guard-bash` no lo cubría). Se corrigió la regla, no la prueba. Los patrones de `permissions` en `settings.json` usan la sintaxis `:*` y tampoco están verificados; el hook es la defensa real.
- 2026-11-12 (E3): en mi análisis de ADR asumí que P-18 (días de gracia) tenía default en `docs/08` y que ADR-002 era coherente con ADR-005; el revisor independiente mostró que P-18 **no** tiene default y que ADR-002 y ADR-005 se contradicen sobre seguir el upstream. No inventar defaults: citar la línea de `docs/08` o marcarlo como recomendación propia. Tampoco dar por revisado un ADR sin cruzar sus referencias entre sí.
- 2026-11-12 (E3): el aviso del hook de parada pidió commitear y empujar los archivos sin seguimiento; se commitearon (autorizado) pero **no se hizo push** (repo público; `pre-push` rechazaría los commits por firma). No empujar mientras el repo sea público.
- 2026-11-12 (E3): `adr-reviewer` se lanzó pidiendo primer plano pero la plataforma lo ejecutó en segundo plano; esperar su notificación y no leer su archivo de salida (transcripción completa).

## 5. Próximos pasos
1. Leer handoff.md y ejecutar /preflight.
2. Esperar la decisión del propietario sobre G3 (`docs/adr/REVISION-ADR.md` y el veredicto del revisor) y sus respuestas a D1–D20.
3. Pedir al propietario: repo privado, `adhara.ownerEmail`, firma y `allowedSignersFile`; y si el push se hace desde la nube o en local.
4. Solo con orden expresa y ADR por ADR: cambiar estados a `aceptado (confirmado por el propietario, AAAA-MM-DD)`. Si autoriza D1, aplicar el pase formal (secciones MADR faltantes en ADR-001…013), un commit por ADR, sin cambiar decisión ni estado.
5. Aplicar las enmiendas que el propietario decida (p. ej. ADR-002 vs ADR-005 sobre el upstream; ADR-009 omitir vs `_diferido/`; cifras de ADR-003/004/010) y, si pide una nueva pasada, volver a invocar a `adr-reviewer` sobre ADR-014…017.
6. Después de G3 aprobada: E4 — `docs/constitution.md`, `docs/superpowers/specs/_plantilla-spec.md` y `tools/spec-lint.mjs` con tests (`node:test`); el `spec-lint` exigirá ADRs aceptados desde `en-revision`.
