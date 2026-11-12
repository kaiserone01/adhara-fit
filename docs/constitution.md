# Constitución de Adhara Fit

Estado: **borrador para G4** (2026-11-12). Entra en vigor cuando el propietario escribe «G4 aprobada».
Es breve a propósito: cada artículo dice qué se exige y **cómo se verifica**. Lo que no se pueda verificar no es un artículo.

**Alcance:** gimnasio en Perú, un solo local, moneda PEN, sistema web interno en un subdominio, sin sitio público.
**Fuentes:** `CLAUDE.md` §1 y §6 (reglas del propietario), `docs/10-prompt-claude-code.md` §2.B, `docs/12-prompt-inicial-claude-code.md` y los ADR.

> **Provisionalidad.** Un artículo que se apoya en un ADR *propuesto* es **provisional** hasta que el propietario acepte ese ADR (columna «ADR»). Los artículos marcados **R** son reglas del propietario y no dependen de ningún ADR.

## I. Reglas del propietario (R)
| # | Artículo | Se verifica con |
|---|---|---|
| C-01 | Autor, *committer* y firma de cada commit son del propietario. Nunca se atribuye coautor a Claude. | `pre-commit`/`pre-push`, CI `politica.yml` (commits *verified*) |
| C-02 | Commit y push usan solo las credenciales del propietario. El agente no lee ni escribe identidad ni credenciales. | `guard-bash`, `harness-selftest` |
| C-03 | Ningún commit, PR ni comentario lleva `Co-authored-by` de Claude/Anthropic, `Claude-Session:`, «Generated with Claude Code» ni el emoji de robot. | `commit-msg`, `tools/commit-policy.mjs`, CI |
| C-04 | Mensaje de commit: español, **una línea**, imperativo, ≤ 100 caracteres, sin trailers; un commit por tarea. | `commit-msg`, CI |
| C-05 | El `handoff.md` es obligatorio: se actualiza al cerrar cada puerta, antes de cualquier push y ante bloqueos; 5 secciones, sin datos personales, sección 4 solo-añadir. | `tools/check-handoff.mjs`, `pre-push`, CI |
| C-06 | Nada se escribe como código de producto hasta que la spec correspondiente esté aprobada por el propietario. | `spec-lint` (estado `aprobada`), revisión de PR |
| C-07 | Cada puerta (G0–G6) se detiene a esperar la aprobación escrita del propietario; no se encadenan etapas. | `handoff.md` §2, revisión del propietario |
| C-08 | Un ADR solo pasa a `aceptado (confirmado por el propietario, AAAA-MM-DD)` por orden expresa del propietario, ADR por ADR. | `spec-lint` (A02), `grep` del estado en `docs/adr/` |

## II. Proceso SDD
| # | Artículo | ADR | Se verifica con |
|---|---|---|---|
| C-09 | Toda spec tiene los cuatro pilares con IDs estables (`REQ`, `BEH`, `INV`, `AC`) y cobertura: todo REQ → ≥ 1 BEH; todo REQ MUST → ≥ 1 AC; todo INV → mecanismo y ≥ 1 AC. | 015 | `tools/spec-lint.mjs` y `TRAZABILIDAD.md` |
| C-10 | Una spec solo entra en revisión si todos los ADR que cita están aceptados; una spec aprobada no contiene «TBD», «por definir», «etc.» ni adjetivos sin medida. | 015 | `spec-lint` (A01, A02, T01, T02) |
| C-11 | Toda afirmación sobre el código cita `archivo:línea`, da su evidencia con «verificado con `comando`» (hechos de existencia o conteo) o dice «no verificado»; se distingue siempre hecho, decisión (ADR) y supuesto («asumido, por validar», con default). | 015 | `spec-lint` (T03, T04), revisión independiente |
| C-12 | La revisión de specs y ADR la hace un subagente de solo lectura que recibe solo la ruta y la lista de comprobación; su veredicto lo decide el propietario. | 015, 017 | `.claude/agents/*` (solo `Read`, `Grep`, `Glob`), `harness-selftest` |

## III. Arquitectura y dominio
| # | Artículo | ADR | Se verifica con |
|---|---|---|---|
| C-13 | **Dominio puro y puertos/adaptadores:** `packages/domain` no importa framework, BD ni E/S; la infraestructura implementa puertos. | 001 | Regla de lint de dependencias entre paquetes (a definir en S-00); test de arquitectura |
| C-14 | **Permisos en el caso de uso:** todo caso de uso que cambia o lista datos recibe el actor y verifica `tienePermiso`; toda ruta `app/api/**` y server action declara su permiso. | 012 | Test de contrato que recorre rutas y acciones (ADR-016 §3) |
| C-15 | **Dinero en soles (PEN) con 2 decimales exactos:** la BD guarda `numeric` de 2 decimales; la API entrega cadena decimal con `PEN`; un solo formateador `S/ 120.00`; sin coma flotante en los cálculos; el redondeo solo ocurre por regla explícita y nunca altera el importe original. | 011 | Test de propiedad y casos de borde (S/ 0.00, 0.01, 15.43, 99999999.99, negativos) |
| C-16 | **Tiempo:** un único módulo `fechaLima`, `TZ=America/Lima`; sin getters locales ni offsets fijos fuera de él. | — (doc 09 §3.3) | Lint/búsqueda de `getHours`/`toLocale*` fuera del módulo; pruebas 23:59/00:00 Lima |
| C-17 | **Un pago nunca se borra:** se anula con motivo y autor; no existe «eliminar con historial». | 010, 013 | Restricción de BD/ausencia de borrado en repositorios; test de integración |
| C-18 | **Seguridad por defecto:** cuenta inactiva no inicia sesión; límite de intentos; API key hasheada y rotable; validación de entrada; sin credenciales fijas en el seed; ningún script destructivo sin `--confirm`. | 012 | Tests por criterio de ADR-012; escaneo de secretos en CI |
| C-19 | **Privacidad y retención:** baja lógica y anonimización a pedido; el borrado físico solo por retención programada con plazo validado por contador/abogado. | 013 | Tests de `AnonimizarMiembro`; auditoría de quién y cuándo |

## IV. Pruebas
| # | Artículo | ADR | Se verifica con |
|---|---|---|---|
| C-20 | **Test primero:** cada AC tiene su test (o consulta SQL / pasos manuales declarados) antes del código que lo satisface. | 016 | Columna «Test» de `TRAZABILIDAD.md`; revisión del PR |
| C-21 | **Integración sobre PostgreSQL efímero**, creado por ejecución y destruido al terminar; `drizzle-kit migrate`/`push`/`drop` (antes `prisma migrate`, ADR-022) solo contra la base efímera y nunca por el agente contra una real. | 016 | Helper de pruebas que aborta si `DATABASE_URL` no es la efímera; `guard-bash` |
| C-22 | Prohibido borrar tests para que pase la suite, desactivar reglas de lint o usar `any` como atajo. | 016 | CI (lint y suite), revisión del PR |

## V. Dependencias, alcance y secretos
| # | Artículo | Se verifica con |
|---|---|---|
| C-23 | Ninguna dependencia nueva sin justificarla en su spec. | `spec-lint` (sección de riesgos), revisión del PR |
| C-24 | Fuera de alcance por ahora: SUNAT, WhatsApp, `kiosk-host`, sitio público, multi-sede visible. Dentro de alcance: vitrina de TV y check-in en smart-TV (ADR-021, aceptado). | Revisión de specs (§0.3 «Fuera de alcance») |
| C-25 | El Repo A es de solo lectura y no se importa código de él hasta que la spec S-00 esté aprobada. | `spec-lint`, revisión del propietario |
| C-26 | Nunca se imprimen ni se versionan secretos, correos, tokens, rutas del directorio personal ni URLs/IDs de sesión. | `pre-commit` (archivos y secretos), `check-handoff`, escaneo de secretos |

## VI. Cambios a esta constitución
Solo el propietario la modifica, por escrito, y el cambio se registra en `handoff.md`. Cada artículo nuevo declara su forma de verificación; si no la tiene, no entra.

### Pendientes conocidos (no verificados todavía)
- C-13: la regla de lint de dependencias entre paquetes no existe aún; se define en S-00.
- Un artículo con ADR en la columna es provisional mientras ese ADR siga *propuesto*. El 2026-11-12 no queda ningún ADR propuesto: los 22 están aceptados.
- La referencia legal de C-19 (Ley 29733 y plazos) no está verificada (ver `docs/adr/REVISION-ADR.md` T-13).
