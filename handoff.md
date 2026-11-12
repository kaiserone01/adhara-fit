# Handoff — Adhara Fit

## 1. Objetivo
Construir **Adhara Fit** (gimnasio en Perú, un local, PEN, sistema web interno) con Spec-Driven Development. Esta etapa es de diseño y fundaciones: arnés, ADRs, specs y plan; sin código de producto.

## 2. Estado actual
- **Puerta actual: G5.00 (spec S-00) — vuelve a BORRADOR por el cambio de alcance; sin aprobar.** G1, G2, G3 y G4 aprobadas (2026-11-12). Aceptados por el propietario: ADR-001, 005, 009, 012, 014, 016 y 017. La vitrina y el check-in en smart-TV entran en el alcance (ADR-021 propuesto, enmienda a ADR-009), así que S-00 cita un ADR propuesto y no puede estar en revisión hasta que el propietario lo acepte.
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
| ADR-001, 005, 009, 012 | **aceptado (confirmado por el propietario, 2026-11-12)**. Tienen hallazgos abiertos de la revisión G3 sin enmendar (p. ej. ADR-005 §6 «sin firmas», contradicción ADR-002/ADR-005 sobre el upstream, ADR-009 «`_diferido/` o se omiten»); S-00 los cubre con defaults marcados «asumido, por validar» |
| ADR-002, 003, 004, 006, 007, 008, 010, 011, 013 | **propuesto** (pase formal F aplicado, +251 líneas, 0 borradas). Revisor G3: 009 y 012 ya aceptados; 006 y 010 «Bloqueado por pregunta»; el resto «Requiere cambios». Detalle en `docs/adr/REVISION-ADR.md` |
| ADR-014, 016, 017 | **aceptado (confirmado por el propietario, 2026-11-12)** |
| ADR-015 | **propuesto** (el revisor pidió cambios menores; ya corregidos) |
| ADR-018 | **propuesto** (nuevo, 2026-11-12): sin turnos de caja ni arqueo, decisión de negocio del propietario. Enmendará ADR-002, 003, 010 y 011 y afecta a S-04, S-08 y S-11 |
| ADR-019 | **propuesto**: negocio único, **opción B elegida por el propietario** (eliminar `Organizacion`/`organizacionId`); falta su orden de aceptación y medir el alcance |
| ADR-020 | **propuesto** (nuevo): sistema de diseño profesional y completo con rebranding total y persistencia visual; tipografía por validar |
| ADR-021 | **propuesto** (nuevo): vitrina y check-in en smart-TV dentro del alcance; enmienda la tabla de ADR-009 (aceptado). `worker` y `kiosk-host` siguen fuera |

Siete ADR están aceptados (001, 005, 009, 012, 014, 016, 017). Solo el propietario cambia un estado, ADR por ADR, registrándolo como `aceptado (confirmado por el propietario, AAAA-MM-DD)`.

| Spec | Estado |
|---|---|
| S-00 | **borrador** (26 REQ, 21 BEH, 6 INV, 18 AC; `spec-lint`: 0 errores y 1 aviso A02 por ADR-021 propuesto). Tuvo una revisión independiente («REQUIERE CAMBIOS», pegada en la spec) sobre el alcance anterior; el alcance cambió y **la versión actual no está revisada**. Importa cinco apps (`web-admin`, `kiosk`, `kiosk-tv`, `vitrina`, `vitrina-tv`) |
| S-01 … S-10 | no iniciadas. Se redactan de una en una y cada una exige sus ADR aceptados antes de la revisión. Con ADR-018 propuesto, S-08 se reformula (registro continuo de cobros y reporte diario) y S-04 y S-11 pierden el «turno obligatorio» |
| S-11 … S-21 | propuestas en `docs/superpowers/COBERTURA-RF.md`: productos, comprobantes, consentimiento, reportes, baseline y seed, importador, operación, entrenadores, **S-19 sistema de diseño y rebranding (aprobada como ítem del backlog)**, **S-20 vitrina de TV** y **S-21 check-in en smart-TV**; el resto pendiente de decisión del propietario |

- Defaults asumidos hasta ahora: ninguno de `docs/08`. Documentación v0.4 del zip: **importada íntegra** a `docs/` (40 archivos; `diff -r` vacío y manifiesto sha256 idéntico; el commit de importación solo contiene esos archivos).
- `docs/12` cita como texto las líneas prohibidas (son las reglas del propietario); el escaneo de commits aplica a mensajes, no a archivos.
- El workflow `politica.yml` no se ha ejecutado en GitHub; solo se validó el YAML y se simularon sus pasos en local (sin el paso de firmas verificadas).
- Supuestos nuevos: mecanismo de Postgres efímero (Docker Compose) y librería de propiedades de dinero son supuestos de ADR-016 (por validar en S-00 y S-03). El «default» de gracia (P-18) que propuse es **recomendación mía**: `docs/08` no da default a P-18.
- Prueba en vivo del arnés (ADR-017 decisión 9): en esta sesión el hook `PreToolUse` de `guard-bash` **bloqueó** un comando que escribía `core.hookspath`; es la primera evidencia de que `settings.json` se carga. Falta confirmar la sintaxis contra la documentación oficial.
- `spec-lint`: formato de spec con campos `- clave: valor` bajo encabezados `### REQ-Sxx-nnn`; los supuestos de specs se llaman `SUP-Sxx-nnn`; añadí dos exigencias no pedidas explícitamente (el propietario puede quitarlas): bloque `## Revisión independiente` en specs aprobadas (T05) y campo `protege` en cada INV para encadenar REQ→INV en la trazabilidad.
- Defaults aplicados en S-00 (marcados «asumido, por validar» como SUP-S00-001…014): apps diferidas se omiten (D3), migraciones excluidas con `prisma db push` solo en la base desechable de Compose (D12), gitleaks sí (D13), `npm audit` falla en high/critical no presentes en la línea base, texto de LICENSE, S-00 incluye la comprobación de `politica` (D19), branding mínimo (plan 0.9) pasa a S-10, el seed del Repo A no se importa, Compose solo con PostgreSQL y `web-admin`, regla propia de gitleaks para pruebas, `docs/` del Repo A no se importa.
- **Decisión de negocio nueva (2026-11-12):** no habrá turnos de caja ni arqueo (registrada en ADR-018, *propuesto*). Default asumido, por validar: los egresos se conservan como registro de gasto con fecha y usuario, sin turno.
- **Hueco de alcance detectado por el propietario:** las funcionalidades de productos (RF-37, RF-38) no tenían spec ni tarea; el cruce completo de requisitos está en `docs/superpowers/COBERTURA-RF.md` (propone S-11…S-18; el fiado, P-06, espera decisión).
- **Decisiones de negocio del propietario (2026-11-12, segunda ronda):** (1) negocio único, se elimina `Organizacion` (ADR-019, opción B); el PRD ya se renombró a «negocio único»; (2) rebranding total y sistema de diseño profesional y completo (ADR-020); la tipografía y más detalles de diseño se validan después; (3) la vitrina y el check-in en smart-TV entran en el alcance (ADR-021); (4) S-19 aprobada como ítem del backlog. `CLAUDE.md` §5 y constitución C-24 ya no excluyen vitrina/TV.
- **Decisiones de negocio del propietario (2026-11-12, tercera ronda):** sin egresos y sin fiado; el sistema solo captura la recepción de pagos de membresías y de productos (ADR-018 ampliado, *propuesto*; P-06 respondida: productos sí, fiado no). Kit de logotipo entregado: colores `#231F20`, `#FFCB04` y `#FFFFFF` confirmados; el original **no es vectorial** (hay que vectorizar en S-19); solo el `.ico` y el LEEME están como archivos originales en `docs/design/origen-logotipo/`; los PNG llegaron como imágenes en el chat y faltan como archivos.
- **Sistema de diseño:** antes solo existía ADR-008 (paleta, tokens, contrastes); ahora ADR-020 y S-19 definen el alcance completo. Faltan insumos: logo vectorial (el PDF está fuera del repo), P-15 y la tipografía. Pendiente de cerrar con el propietario: cómo se digita el DNI en el TV, qué muestra la vitrina, el fiado (P-06) y `kiosk-host`.
- **Decisiones pendientes del propietario:** aprobar S-00 o pedir cambios; aceptar ADR-018 y decidir si se amplía el backlog (COBERTURA-RF §4 y §5); responder las D2–D20 que sigan abiertas (`docs/adr/REVISION-ADR.md` §5 y §8.4); proporcionar la copia local del Repo A; poner el repo en privado; definir `adhara.ownerEmail`, firma y `allowedSignersFile` (ver `docs/ops/firma-commits.md`); decidir si se hace push desde la nube o se pasa a local; permitir el host `code.claude.com`. (Texto anterior conservado a continuación.)

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
- `docs/superpowers/specs/S-00-fundaciones-del-repo.md`: spec S-00 en borrador (copia limpia, exclusiones, apps del MVP, `.env.example`, gitleaks, CI, Docker Compose, base efímera, LICENSE, comprobación de `politica`).
- `docs/superpowers/TRAZABILIDAD.md`: regenerado con S-00 (`--write`). `tools/spec-lint.mjs` y su test: reconoce el plural «deberán» (un test nuevo).
- `docs/09-verificacion-contra-codigo.md` §7: filas 15 y 16 (correcciones al plan: criterios de las tareas 0.2 y 0.3 del doc 07).
- `docs/superpowers/specs/S-00-fundaciones-del-repo.md`: reescrita tras la revisión (lista cerrada de exclusión, 26 REQ, 21 BEH, 6 INV, 18 AC, bloque `## Revisión independiente` con el veredicto íntegro y la respuesta del autor).
- `docs/adr/ADR-001, 005, 009, 012, 014, 016, 017`: línea `Estado` cambiada a `aceptado (confirmado por el propietario, 2026-11-12)` por orden expresa (un commit por ADR).
- `docs/adr/ADR-018-sin-turnos-de-caja-ni-arqueo.md`: nuevo ADR propuesto.
- `docs/superpowers/COBERTURA-RF.md`: cruce de requisitos contra specs, propuesta S-11…S-18 y cambio de alcance por ADR-018.
- `docs/adr/ADR-019-organizacion-unica.md`: nuevo ADR propuesto (organización única, no SaaS).
- `docs/superpowers/COBERTURA-RF.md`: añadidas S-19 (sistema de diseño y marca), §6 (lo documentado y lo que falta del diseño) y §7 (organización única).
- `docs/adr/ADR-019-organizacion-unica.md` (reescrito a la opción B), `ADR-020-sistema-de-diseno-y-rebranding.md` y `ADR-021-alcance-vitrina-y-checkin-en-smart-tv.md`: nuevos o actualizados, todos *propuestos*.
- `docs/02-PRD-adhara-fit.md`: renombrado a negocio único (línea 7) y «Con el sistema» (línea 13) por orden del propietario. `CLAUDE.md` §5 y `docs/constitution.md` C-24: vitrina/TV pasan a estar dentro del alcance.
- `docs/superpowers/specs/S-00-fundaciones-del-repo.md`: alcance ampliado a cinco apps, rebranding trasladado a S-19, línea base con conteo de «organización»; vuelve a `borrador`. `docs/superpowers/COBERTURA-RF.md`: S-19 aprobada como ítem, S-20, S-21 y §8.
- `docs/adr/ADR-018`: ampliado a «sin turnos, arqueo, egresos ni fiado». `docs/adr/ADR-020`: insumos del kit de logotipo y tarea de vectorización.
- `docs/design/README.md` y `docs/design/origen-logotipo/` (LEEME y favicon `.ico` originales): material de origen para S-19.
- `docs/superpowers/COBERTURA-RF.md` (§9 y retiro de RF-38) y `docs/superpowers/specs/S-00-fundaciones-del-repo.md` (§0.3: productos sin fiado, egresos y turnos retirados).
- `handoff.md`: actualizado tras la tercera ronda de decisiones.

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
- 2026-11-12 (E5): al redactar S-00, `spec-lint` no reconocía el plural «deberán» y marcaba 0 obligaciones en REQ-S00-014. Se corrigió la herramienta (y se añadió un test), no el requisito. Redactar los REQ con «deberá» o «deberán», una sola vez.
- 2026-11-12 (E5): el paso 3 de E5 (`spec-reviewer`) NO se ejecutó para S-00 porque la regla E3.5 prohíbe revisar una spec cuyos ADR siguen *propuestos*. No relanzar el revisor ni marcar `en-revision` hasta que el propietario acepte ADR-001, 005, 009, 012, 014, 016 y 017.
- 2026-11-12 (E5): los criterios de las tareas 0.2 y 0.3 del plan (doc 07) no eran cumplibles tal cual (el repo ya tiene commits; el código aún contiene «cédula» y marca anterior). Se anotaron en `docs/09` §7 (filas 15 y 16) y en S-00 §5.2. Contrastar los criterios del plan con el inventario antes de copiarlos a una spec.
- 2026-11-12 (E5): el revisor independiente devolvió «REQUIERE CAMBIOS» sobre S-00 (REQ compuestos, AC no comprobables, lista de exclusión sin enumerar, `handoff.md` raíz en conflicto con la exclusión, seed con contraseñas fijas, `.env.example` sin valores frente a Compose, esquema sin migraciones). Se reescribió la spec. Lección: enumerar listas cerradas y definir el criterio objetivo de cada AC antes de pasar a revisión, y comprobar que una regla heredada de un ADR no choque con archivos propios del repo (p. ej. `handoff.md`).
- 2026-11-12 (E5): la plataforma volvió a pedir en un aviso del hook de parada commitear y empujar; se commitea y no se empuja (repo público). No cambiar esa conducta sin orden del propietario.
- 2026-11-12 (E5): la spec S-00 citaba «S-11» para productos mientras `REVISION-ADR` D10 lo reservaba al importador; se resolvió en `COBERTURA-RF` (importador pasa a S-16). Antes de nombrar un ID de spec nuevo, buscarlo con grep en `docs/`.
- 2026-11-12 (E5): se aceptó ADR-009 (apps diferidas) y horas después el propietario incluyó la vitrina y el TV en el alcance, lo que contradice ese ADR aceptado y a S-00. Una enmienda a un ADR aceptado no se aplica sola: se redactó ADR-021 como propuesto y S-00 volvió a borrador. Antes de aceptar un ADR de alcance, confirmar con el propietario que el hardware y las apps están cerrados (P-05).
- 2026-11-12 (E5): los cinco PNG del kit de logotipo llegaron al sistema solo como imágenes inline convertidas (WebP y un PNG), no como archivos originales; solo el `.ico` y el LEEME eran archivos. No versionar esas copias como activos oficiales; pedir al propietario los PNG originales (o un zip) antes de S-19.

## 5. Próximos pasos
1. Leer handoff.md y ejecutar /preflight.
2. Esperar las respuestas del propietario a las preguntas abiertas (aceptar ADR-018 a ADR-021; entrada del DNI en TV; contenido de la vitrina; `kiosk-host`; PNG originales del logotipo). Cuando ADR-021 esté aceptado: pasar S-00 a `en-revision`, invocar `spec-reviewer` (solo la ruta), pegar su veredicto sin editar en `## Revisión independiente`, corregir y entregar el resumen de 10 líneas. Solo con «S-00 aprobada» se marca `estado: aprobada`.
3. Pedir al propietario: repo privado, `adhara.ownerEmail`, firma y `allowedSignersFile`; y si el push se hace desde la nube o en local.
4. Solo con orden expresa y ADR por ADR: cambiar estados a `aceptado (confirmado por el propietario, AAAA-MM-DD)`. Si acepta ADR-018, enmendar ADR-002, 003, 010 y 011 y reformular S-08 antes de redactarla.
5. Seguir E5 con las demás specs, de una en una, en el orden S-01…S-10 más las que el propietario apruebe de S-11…S-18; cada una en borrador mientras sus ADR estén *propuestos*; no pasar a revisión sin ADR aceptados. S-04 queda condicionada a la línea base de tests (requiere copia local del Repo A) y ya no exige turno abierto. Solo con «S-xx aprobada» se marca `estado: aprobada`.
6. Cuando el propietario acepte ADR-019, enmendar ADR-004, ADR-002, ADR-008 y el doc 06, y medir el alcance (inventario ampliado con «organización»). Para S-19 pedir el logo vectorial, P-15 y la tipografía; S-20 y S-21 dependen de S-19.
7. Opcional, en una sesión nueva: comprobar las skills `brainstorming`, `writing-plans` y `using-superpowers` de la cuenta antes de usarlas en E5/E6.
