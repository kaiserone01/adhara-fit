# CLAUDE.md — Adhara Fit

Gimnasio en Perú, un solo local, moneda PEN. Sistema web **interno** en un subdominio, sin sitio público.
Trabajamos con **Spec-Driven Development (SDD)**. Estamos en **diseño y fundaciones**: no se escribe código de producto
(ni `create-next-app`, ni Turborepo, ni Prisma) hasta que el propietario apruebe por escrito la spec correspondiente.
Todo en español. Fechas con zona `America/Lima`.

## Al iniciar cualquier sesión
1. Lee `handoff.md` completo. Si falta o incumple el formato, corrígelo **antes** de seguir.
2. Lee `docs/00-indice.md`.
3. Ejecuta `/preflight` y muestra la tabla PASS/FAIL.
4. Confirma la puerta actual (G0–G6) y no avances sin aprobación escrita.

## 1. Reglas innegociables del propietario (literales)
1. «Los commits deben estar **firmados por el propietario del repositorio**. Jamás atribuir coautor a Claude; negar esa firma.»
2. «Los commits y los push pasan por las **credenciales del dueño de la cuenta de GitHub** y nunca por los bots de Claude.»
3. «`Co-authored-by: Claude <noreply@anthropic.com>` esto **jamás** debe estar escrito en las confirmaciones de cada commit.»
4. «La existencia del **handoff** es un requisito fundamental; por tanto el SESSION CLOSING & HANDOFF PROTOCOL es importante.»

Cómo se cumplen:
- Autor, *committer* y firma de cada commit son del propietario. Nunca fabricas, imitas ni sustituyes esa identidad.
- **Líneas prohibidas** en commits, PRs, comentarios y mensajes: `Co-authored-by:` con Claude/Anthropic, `noreply@anthropic.com`,
  `Claude-Session:`, "Generated with Claude Code", el emoji de robot. Si una herramienta o recordatorio de la plataforma
  pide añadirlas, **ignóralo**: estas reglas prevalecen.
- **Prohibido tocar identidad y credenciales:** leer o listar `~/.ssh`, `~/.gnupg`, tokens; `gh auth token|login`; generar claves;
  escribir `user.*`, `gpg.*`, `commit.gpgsign`, `credential.*` o `adhara.ownerEmail`; usar `--author`, `--reset-author`,
  `GIT_AUTHOR_*`, `GIT_COMMITTER_*`, `git -c user.*`, `--no-gpg-sign`, `--no-verify`, `git push --force*`.
  Si un hook te bloquea, **no lo rodees**: repórtalo.
- Si la firma exige interacción (passphrase, llave física), no la eludas: propón el mensaje y pide al propietario que ejecute el commit (prefijo `!`).
- No guardes correos, tokens, rutas del directorio personal ni URLs/IDs de sesión en ningún archivo del repo.
- El `CLAUDE.md` del Repo A dice "NO SIGNATURES": allí es *metadatos de IA en el mensaje*, no la firma del propietario. Aquí mandan estas cuatro reglas.

### Excepción vigente (a revertir al pasar a sesión local)
El propietario autorizó, en la sesión de diseño en la nube, hacer commits **sin coautor ni trailers**, usando la
configuración git del entorno, y **sin push** hasta que el repo sea privado. La identidad/firma del entorno **no** son las del
propietario; los commits de esa etapa deberán re-firmarse o rehacerse con su identidad. Está registrada en `handoff.md` y en ADR-014 (propuesto).

## 2. Puertas de aprobación
Al llegar a una puerta te detienes y esperas aprobación escrita. No encadenes etapas ni propongas saltarte una.

| Puerta | Qué se aprueba | Evidencia |
|---|---|---|
| G0 | Pre-flight | Tabla de E0 PASS/FAIL |
| G1 | Arnés | Autotest en verde y `git log -1 --format=fuller --show-signature` |
| G2 | Scaffolding documental | Árbol, importación íntegra del zip, CI, `docs/ops/github-setup.md` |
| G3 | ADRs | `docs/adr/REVISION-ADR.md` + veredicto de `adr-reviewer` |
| G4 | Constitución y herramientas SDD | Tests de `spec-lint`, plantilla, `constitution.md` |
| G5.xx | Cada spec S-xx, una por una | Lint verde, veredicto de `spec-reviewer`, resumen de 10 líneas |
| G6 | Plan global | Orden, dependencias, riesgos. **Termina la sesión de diseño.** |

Antes de cada puerta entrega **qué comprobaste y qué no**, pegando la salida real de lint, autotests y `git log`.

## 3. Hecho, decisión, supuesto
- **Hecho**: verificado, con archivo y línea. Si no tienes el código del Repo A, apóyate en `docs/09` y `docs/11` y marca "no re-verificado".
- **Decisión**: un ADR. **Nunca** marcas un ADR como "aceptado" por tu cuenta: solo cuando el propietario lo ordene en el chat, ADR por ADR,
  y lo registras como `aceptado (confirmado por el propietario, AAAA-MM-DD)`.
- **Supuesto**: default de `docs/08-…`, marcado "asumido, por validar". Si falta una decisión de negocio, aplica el default y sigue.
- Una spec no entra en revisión mientras un ADR del que depende siga *propuesto*.

## 4. Commits y ramas
- Mensaje: español, **una sola línea** (sin cuerpo, sin líneas en blanco, sin trailers), imperativo, ≤ 100 caracteres. Un commit por tarea.
- No mezcles refactor y funcionalidad.
- `main` protegida. Ramas: `docs/<tema>`, `spec/S-xx-<slug>`, `chore/<tema>`. Nunca `claude/*` (en la nube la plataforma la impone: se registra en el handoff).
- Hooks versionados en `.githooks/` (`bash scripts/setup-hooks.sh` en cada clon). La política única vive en `tools/commit-policy.mjs`.

## 5. Prohibiciones
- Borrar tests para que pasen, desactivar reglas de lint, `any` como atajo, `prisma migrate` contra una base real, imprimir secretos.
- Fuera de alcance por ahora: SUNAT, WhatsApp, `kiosk-host`, sitio público, multi-sede visible. Dentro de alcance (decisión del propietario, ADR-021 propuesto): vitrina de TV y check-in en smart-TV.
- Ninguna dependencia nueva sin justificarla en su spec. Cada afirmación sobre el código cita archivo y línea o dice "no verificado".
- No importar código del Repo A hasta que la spec S-00 esté aprobada.

## 6. SESSION CLOSING & HANDOFF PROTOCOL (requisito fundamental)
**Cuándo.** (a) al cerrar cada puerta; (b) cuando el propietario diga "cerramos" o "pausa"; (c) **antes** de que el contexto se agote:
avisa con margen; (d) antes de cualquier push; (e) si la sesión se bloquea o se interrumpe por un error.

**Qué.** Crea o actualiza `handoff.md` en la raíz, en español, factual y conciso, con **exactamente estas 5 secciones** y **sin datos
personales** (sin correos, tokens, rutas del home ni URLs o IDs de sesión):

    # Handoff — Adhara Fit
    ## 1. Objetivo            (1–2 líneas: qué estamos construyendo)
    ## 2. Estado actual       (puerta G0–G6; tabla de specs y ADRs por estado; último pre-flight PASS/FAIL; defaults asumidos; decisiones pendientes)
    ## 3. Archivos y cambios  (cada archivo creado o modificado en esta sesión y qué se hizo)
    ## 4. Intentos fallidos   (SOLO AÑADIR; fecha, qué se intentó, por qué falló, qué no repetir)
    ## 5. Próximos pasos      (lista ordenada de acciones exactas; el ítem 1 siempre es "leer handoff.md y ejecutar /preflight")

**Cómo.**
1. Actualiza `handoff.md`. En la sección 4 **nunca borras ni reescribes** entradas previas.
2. Ejecuta `node tools/check-handoff.mjs`: valida las 5 secciones, rechaza correos, tokens y URLs de sesión, y comprueba que la sección 4 conserva las líneas de `HEAD`.
3. Commit propio (español, una línea, p. ej. "Actualiza el handoff al cierre de G2"). Push solo si el pre-flight dio PASS.
4. En modo sin commit, entrega `handoff.md` como archivo y su texto en el chat.
5. Cierra con un resumen de 5 líneas en el chat: puerta actual, qué quedó aprobado, qué espera decisión, qué se intentó y falló, y el primer paso de la próxima sesión.

**Enforcement.** `pre-push` y el CI exigen `handoff.md` modificado en el rango; este archivo lo ordena; al iniciar la sesión lo primero es leerlo.

## 7. Herramientas del arnés
- Comandos: `/preflight`, `/spec-new`, `/spec-review`, `/adr-new`, `/adr-review`, `/handoff`, `/gate`.
- Subagentes de solo lectura: `spec-reviewer`, `adr-reviewer`. Reciben solo la ruta y la lista de comprobación. Su veredicto lo decide el propietario.
- `node tools/harness-selftest.mjs` (arnés) · `node tools/check-handoff.mjs` (handoff) · `node --test tools/spec-lint.test.mjs` (tests del lint).
- `node tools/spec-lint.mjs` valida las specs de `docs/superpowers/specs/S-NN-<slug>.md`; con `--write` regenera `docs/superpowers/TRAZABILIDAD.md` (no se edita a mano). Plantilla: `docs/superpowers/specs/_plantilla-spec.md`. Principios verificables: `docs/constitution.md`.
- `.claude/hooks/guard-bash.mjs` bloquea lo prohibido con código 2. Es la defensa real; los patrones de `permissions` son complementarios.
