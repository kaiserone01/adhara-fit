# Handoff — Adhara Fit

## 1. Objetivo
Construir **Adhara Fit** (gimnasio en Perú, un local, PEN, sistema web interno) con Spec-Driven Development. Esta etapa es de diseño y fundaciones: arnés, ADRs, specs y plan; sin código de producto.

## 2. Estado actual
- **Puerta actual: G4 (constitución y herramientas SDD) — pendiente de aprobación del propietario.** G1, G2 y G3 aprobadas por el propietario (2026-11-12). Con G3 el propietario autorizó solo D1 (pase formal F); D2–D20 siguen sin respuesta.
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
| ADR-001 … ADR-013 | **propuesto** (estado sin cambios). **Pase formal F aplicado (D1):** añadidas las secciones MADR faltantes (+251 líneas, 0 borradas; un commit por ADR). Revisados en G3: el revisor independiente da 11 «Requiere cambios» (001, 002, 003, 004, 005, 007, 008, 009, 011, 012, 013) y 2 «Bloqueado por pregunta» (006 por P-07; 010 por P-16/17/18). Detalle en `docs/adr/REVISION-ADR.md` |
| ADR-014 … ADR-017 | **propuesto** (creados en G3). El revisor: 014 «Listo para aceptar» con observaciones; 015, 016 y 017 «Requiere cambios»; las incoherencias internas ya están corregidas (REVISION-ADR §8.3), sin nueva pasada del revisor |

Ningún ADR está *aceptado*. Solo el propietario cambia un estado, ADR por ADR, registrándolo como `aceptado (confirmado por el propietario, AAAA-MM-DD)`.

| Spec | Estado |
|---|---|
| S-00 … S-10 | no iniciadas (E5). Ninguna puede entrar en revisión mientras sus ADR sigan *propuestos* (p. ej. S-00 depende de ADR-001, 005, 009, 014 y 017) |

- Defaults asumidos hasta ahora: ninguno de `docs/08`. Documentación v0.4 del zip: **importada íntegra** a `docs/` (40 archivos; `diff -r` vacío y manifiesto sha256 idéntico; el commit de importación solo contiene esos archivos).
- `docs/12` cita como texto las líneas prohibidas (son las reglas del propietario); el escaneo de commits aplica a mensajes, no a archivos.
- El workflow `politica.yml` no se ha ejecutado en GitHub; solo se validó el YAML y se simularon sus pasos en local (sin el paso de firmas verificadas).
- Supuestos nuevos: mecanismo de Postgres efímero (Docker Compose) y librería de propiedades de dinero son supuestos de ADR-016 (por validar en S-00 y S-03). El «default» de gracia (P-18) que propuse es **recomendación mía**: `docs/08` no da default a P-18.
- Prueba en vivo del arnés (ADR-017 decisión 9): en esta sesión el hook `PreToolUse` de `guard-bash` **bloqueó** un comando que escribía `core.hookspath`; es la primera evidencia de que `settings.json` se carga. Falta confirmar la sintaxis contra la documentación oficial.
- `spec-lint`: formato de spec con campos `- clave: valor` bajo encabezados `### REQ-Sxx-nnn`; los supuestos de specs se llaman `SUP-Sxx-nnn`; añadí dos exigencias no pedidas explícitamente (el propietario puede quitarlas): bloque `## Revisión independiente` en specs aprobadas (T05) y campo `protege` en cada INV para encadenar REQ→INV en la trazabilidad.
- **Decisiones pendientes del propietario:** aprobar G4; responder D2–D20 (`docs/adr/REVISION-ADR.md` §5 y §8.4) y ordenar qué ADR pasan a *aceptado* (S-00 necesita 001, 005, 009, 014 y 017); poner el repo en privado; definir `adhara.ownerEmail`, firma y `allowedSignersFile` (ver `docs/ops/firma-commits.md`); decidir si se hace push desde la nube o se pasa a local; permitir el host `code.claude.com` para verificar la sintaxis oficial de hooks/permisos.

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
- `docs/adr/ADR-001…013`: pase formal F (secciones Factores, Cómo se valida, Reversibilidad, Dependencias y, en 007/008/009, Alternativas inferidas).
- `docs/constitution.md`: 26 artículos (C-01…C-26), cada uno con su forma de verificación; provisional donde se apoya en ADR propuestos.
- `docs/superpowers/specs/_plantilla-spec.md`: plantilla con los cuatro pilares; instanciada como borrador pasa el lint.
- `tools/spec-lint.mjs` + `tools/spec-lint.test.mjs` (27 pruebas `node:test`) + `tools/fixtures/spec-lint/` (1 spec buena, 2 malas): reglas H/S/I/E/R/C/A/T/Z, trazabilidad y código de salida; `docs/superpowers/TRAZABILIDAD.md` generado (aún sin specs).
- `.github/workflows/politica.yml` (paso de tests de spec-lint), `CLAUDE.md` (100 líneas, herramientas de spec) y `.claude/commands/spec-new.md` (usa `--write`).
- `handoff.md`: actualizado al cierre de G4.

## 4. Intentos fallidos
- 2026-11-12: se intentó verificar la sintaxis de hooks, permisos y subagentes en la documentación oficial (`code.claude.com`); el host no resuelve desde la sesión. Resultado: la configuración de `.claude/` se escribió de memoria y queda **no verificada contra la documentación vigente**. No reintentar hasta que el propietario permita el host.
- 2026-11-12: `gh repo view --json visibility,isEmpty` falla con HTTP 403 (GraphQL no disponible en sesiones de Claude Code) y `gh auth status` indica `GH_TOKEN` inválido. Alternativa usada: `gh api repos/{owner}/{repo}` (REST, solo lectura). No usar GraphQL.
- 2026-11-12: la primera ejecución del autotest falló en `--full-generate-key` (la regla de `guard-bash` no lo cubría). Se corrigió la regla, no la prueba. Los patrones de `permissions` en `settings.json` usan la sintaxis `:*` y tampoco están verificados; el hook es la defensa real.
- 2026-11-12 (E3): en mi análisis de ADR asumí que P-18 (días de gracia) tenía default en `docs/08` y que ADR-002 era coherente con ADR-005; el revisor independiente mostró que P-18 **no** tiene default y que ADR-002 y ADR-005 se contradicen sobre seguir el upstream. No inventar defaults: citar la línea de `docs/08` o marcarlo como recomendación propia. Tampoco dar por revisado un ADR sin cruzar sus referencias entre sí.
- 2026-11-12 (E3): el aviso del hook de parada pidió commitear y empujar los archivos sin seguimiento; se commitearon (autorizado) pero **no se hizo push** (repo público; `pre-push` rechazaría los commits por firma). No empujar mientras el repo sea público.
- 2026-11-12 (E3): `adr-reviewer` se lanzó pidiendo primer plano pero la plataforma lo ejecutó en segundo plano; esperar su notificación y no leer su archivo de salida (transcripción completa).
- 2026-11-12 (E4): `spec-lint` contaba 0 «deberá» porque `\b` no reconoce «á» en JavaScript; los tests lo detectaron. Usar lookarounds `(?<![\p{L}])…(?![\p{L}])` con la bandera `u` para palabras con tilde.
- 2026-11-12 (E4): un test de `spec-lint` pasaba por el motivo equivocado (al borrar una línea `- deteccion:` dejé un `- ` colgando que rompía la siguiente) y las pruebas de mutación lo delataron. Al mutar reglas, comprobar que cada mutante falle por la causa esperada; borrar siempre la línea completa, con su `- `.
- 2026-11-12 (E4): `guard-bash` bloqueó un comando mío con `git config core.hookspath` en un repo temporal (innecesario). No se rodeó; se quitó la línea. No escribir `core.hookspath` desde comandos del agente (solo `scripts/setup-hooks.sh`).
- 2026-11-12 (E4): el propietario pidió buscar las skills nuevas de superpowers de su cuenta (`brainstorming`, `writing-plans`, `using-superpowers`, habilitadas hoy); la herramienta `Skill` no las acepta en esta sesión porque no están en la lista cargada al iniciar. Se verán en una sesión nueva. Antes de usarlas, comprobar que no choquen con el formato de commit ni con los nombres de `docs/superpowers/`.

## 5. Próximos pasos
1. Leer handoff.md y ejecutar /preflight.
2. Esperar la decisión del propietario sobre G4 (constitución, plantilla, `spec-lint` con sus tests) y sus respuestas a D2–D20.
3. Pedir al propietario: repo privado, `adhara.ownerEmail`, firma y `allowedSignersFile`; y si el push se hace desde la nube o en local.
4. Solo con orden expresa y ADR por ADR: cambiar estados a `aceptado (confirmado por el propietario, AAAA-MM-DD)`. Para empezar S-00 hacen falta aceptados ADR-001, 005, 009, 014 y 017. Aplicar antes las enmiendas que decida (ADR-002 vs ADR-005 sobre el upstream; ADR-009 omitir vs `_diferido/`; cifras de ADR-003/004/010) y, si lo pide, nueva pasada de `adr-reviewer` sobre ADR-014…017.
5. Si G4 se aprueba: E5 — por cada spec S-00…S-10, de una en una: `/spec-new`, `node tools/spec-lint.mjs --write` en verde, `spec-reviewer` independiente (bloque `## Revisión independiente`), resumen de 10 líneas y esperar «S-xx aprobada». S-04 queda condicionada a la línea base de tests (requiere copia local del Repo A).
6. Opcional, en una sesión nueva: comprobar las skills `brainstorming`, `writing-plans` y `using-superpowers` de la cuenta antes de usarlas en E5/E6.
