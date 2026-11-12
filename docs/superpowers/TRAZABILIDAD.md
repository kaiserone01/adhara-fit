# Trazabilidad de specs

<!-- Generado por `node tools/spec-lint.mjs --write`. No editar a mano. -->

Cadena: **REQ → BEH → INV → AC → test**. Una celda "—" indica que no hay elemento enlazado.

## S-00 — Fundaciones del repo: copia limpia, exclusiones, CI, entorno local y secretos (aprobada)

Archivo: `S-00-fundaciones-del-repo.md` · REQ: 31 · BEH: 27 · INV: 6 · AC: 23

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S00-001 | MUST | BEH-S00-001, BEH-S00-007 | INV-S00-005 | AC-S00-001 (integracion), AC-S00-020 (integracion) | tools/verificar-repo.test.mjs; tools/importar-repo-a.test.mjs |
| REQ-S00-002 | MUST | BEH-S00-001 | INV-S00-001 | AC-S00-002 (integracion), AC-S00-020 (integracion) | tools/verificar-repo.test.mjs; tools/importar-repo-a.test.mjs |
| REQ-S00-003 | MUST | BEH-S00-004 | INV-S00-001 | AC-S00-002 (integracion) | tools/verificar-repo.test.mjs |
| REQ-S00-004 | MUST | BEH-S00-001, BEH-S00-026 | INV-S00-006 | AC-S00-003 (unitario), AC-S00-004 (unitario), AC-S00-020 (integracion) | tools/verificar-repo.test.mjs; tools/importar-repo-a.test.mjs |
| REQ-S00-005 | MUST | BEH-S00-001 | INV-S00-006 | AC-S00-003 (unitario), AC-S00-004 (unitario), AC-S00-020 (integracion) | tools/verificar-repo.test.mjs; tools/importar-repo-a.test.mjs |
| REQ-S00-006 | MUST | BEH-S00-005 | INV-S00-003 | AC-S00-005 (unitario) | tools/verificar-env.test.mjs |
| REQ-S00-007 | MUST | BEH-S00-002, BEH-S00-006, BEH-S00-014 | INV-S00-002 | AC-S00-006 (integracion), AC-S00-007 (e2e), AC-S00-014 (manual) | tools/verificar-gitleaks.test.mjs; pendiente |
| REQ-S00-008 | MUST | BEH-S00-002 | — | AC-S00-007 (e2e) | pendiente |
| REQ-S00-009 | MUST | BEH-S00-003, BEH-S00-012, BEH-S00-013 | — | AC-S00-008 (manual), AC-S00-022 (manual) | pendiente |
| REQ-S00-010 | SHOULD | BEH-S00-003 | — | AC-S00-008 (manual) | pendiente |
| REQ-S00-011 | MUST | BEH-S00-007 | — | AC-S00-009 (manual), AC-S00-020 (integracion) | pendiente; tools/importar-repo-a.test.mjs |
| REQ-S00-012 | MUST | BEH-S00-010 | — | AC-S00-010 (unitario) | tools/verificar-repo.test.mjs |
| REQ-S00-013 | MUST | BEH-S00-027 | — | AC-S00-011 (e2e) | pendiente |
| REQ-S00-014 | MUST | BEH-S00-015 | INV-S00-004 | AC-S00-012 (unitario), AC-S00-019 (integracion) | tools/base-efimera.test.mjs; tools/base-efimera.integracion.test.mjs |
| REQ-S00-015 | MUST | BEH-S00-001, BEH-S00-009 | — | AC-S00-013 (integracion), AC-S00-020 (integracion) | pendiente; tools/importar-repo-a.test.mjs |
| REQ-S00-016 | MUST | BEH-S00-002, BEH-S00-011 | — | AC-S00-007 (e2e) | pendiente |
| REQ-S00-017 | MUST | BEH-S00-003, BEH-S00-023 | — | AC-S00-008 (manual), AC-S00-022 (manual) | pendiente |
| REQ-S00-018 | MUST | BEH-S00-003, BEH-S00-013 | INV-S00-003 | AC-S00-005 (unitario), AC-S00-008 (manual), AC-S00-022 (manual) | tools/verificar-env.test.mjs; pendiente |
| REQ-S00-019 | MUST | BEH-S00-008, BEH-S00-015, BEH-S00-018 | INV-S00-004 | AC-S00-012 (unitario), AC-S00-019 (integracion) | tools/base-efimera.test.mjs; tools/base-efimera.integracion.test.mjs |
| REQ-S00-020 | MUST | BEH-S00-002, BEH-S00-010 | — | AC-S00-007 (e2e), AC-S00-010 (unitario) | pendiente; tools/verificar-repo.test.mjs |
| REQ-S00-021 | MUST | BEH-S00-001 | INV-S00-002 | AC-S00-006 (integracion), AC-S00-014 (manual), AC-S00-020 (integracion) | tools/verificar-gitleaks.test.mjs; pendiente; tools/importar-repo-a.test.mjs |
| REQ-S00-022 | SHOULD | BEH-S00-017 | — | AC-S00-015 (unitario) | tools/harness-selftest.mjs |
| REQ-S00-023 | MUST | BEH-S00-016 | — | AC-S00-016 (unitario) | tools/importar-repo-a.test.mjs |
| REQ-S00-024 | MUST | BEH-S00-019 | — | AC-S00-017 (unitario) | tools/verificar-repo.test.mjs |
| REQ-S00-025 | MUST | BEH-S00-001, BEH-S00-021 | — | AC-S00-018 (integracion), AC-S00-020 (integracion) | tools/importar-repo-a.test.mjs |
| REQ-S00-026 | MUST | BEH-S00-001, BEH-S00-020 | INV-S00-001 | AC-S00-002 (integracion), AC-S00-020 (integracion) | tools/verificar-repo.test.mjs; tools/importar-repo-a.test.mjs |
| REQ-S00-027 | MUST | BEH-S00-003 | — | AC-S00-008 (manual) | pendiente |
| REQ-S00-028 | MUST | BEH-S00-001, BEH-S00-025 | — | AC-S00-014 (manual), AC-S00-020 (integracion) | pendiente; tools/importar-repo-a.test.mjs |
| REQ-S00-029 | MUST | BEH-S00-022 | — | AC-S00-021 (unitario) | tools/verificar-repo.test.mjs |
| REQ-S00-030 | MUST | BEH-S00-001, BEH-S00-024 | — | AC-S00-020 (integracion), AC-S00-023 (unitario) | tools/importar-repo-a.test.mjs; tools/verificar-repo.test.mjs |
| REQ-S00-031 | MUST | BEH-S00-001, BEH-S00-007, BEH-S00-009 | — | AC-S00-020 (integracion) | tools/importar-repo-a.test.mjs |

## S-01 — Baseline de seguridad: cuentas, intentos de login, clave del kiosco, permisos, validación, cabeceras y CORS (aprobada)

Archivo: `S-01-baseline-de-seguridad.md` · REQ: 33 · BEH: 29 · INV: 7 · AC: 22

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S01-001 | MUST | BEH-S01-001 | — | AC-S01-001 (integracion) | pendiente |
| REQ-S01-002 | MUST | BEH-S01-001 | — | AC-S01-001 (integracion) | pendiente |
| REQ-S01-003 | MUST | BEH-S01-002 | INV-S01-001 | AC-S01-002 (integracion), AC-S01-003 (integracion) | pendiente |
| REQ-S01-004 | MUST | BEH-S01-003, BEH-S01-004 | INV-S01-001 | AC-S01-002 (integracion), AC-S01-003 (integracion) | pendiente |
| REQ-S01-005 | MUST | BEH-S01-005 | — | AC-S01-004 (integracion) | pendiente |
| REQ-S01-006 | MUST | BEH-S01-005, BEH-S01-006, BEH-S01-008 | INV-S01-002 | AC-S01-004 (integracion), AC-S01-005 (unitario), AC-S01-006 (integracion) | pendiente |
| REQ-S01-007 | MUST | BEH-S01-007 | INV-S01-002 | AC-S01-006 (integracion) | pendiente |
| REQ-S01-008 | MUST | BEH-S01-009 | INV-S01-003, INV-S01-004 | AC-S01-007 (integracion), AC-S01-010 (integracion) | pendiente |
| REQ-S01-009 | MUST | BEH-S01-009, BEH-S01-026 | INV-S01-003 | AC-S01-007 (integracion), AC-S01-021 (e2e) | pendiente |
| REQ-S01-010 | MUST | BEH-S01-010, BEH-S01-013 | INV-S01-004 | AC-S01-007 (integracion), AC-S01-008 (integracion), AC-S01-010 (integracion) | pendiente |
| REQ-S01-011 | MUST | BEH-S01-011 | — | AC-S01-009 (unitario) | pendiente |
| REQ-S01-012 | MUST | BEH-S01-014, BEH-S01-015 | INV-S01-006 | AC-S01-011 (unitario) | pendiente |
| REQ-S01-013 | MUST | BEH-S01-014 | INV-S01-006 | AC-S01-011 (unitario) | pendiente |
| REQ-S01-014 | MUST | BEH-S01-016 | INV-S01-005 | AC-S01-012 (unitario) | pendiente |
| REQ-S01-015 | MUST | BEH-S01-017 | INV-S01-005 | AC-S01-012 (unitario) | pendiente |
| REQ-S01-016 | MUST | BEH-S01-018 | — | AC-S01-013 (integracion) | pendiente |
| REQ-S01-017 | MUST | BEH-S01-019 | — | AC-S01-014 (unitario) | pendiente |
| REQ-S01-018 | MUST | BEH-S01-020 | INV-S01-007 | AC-S01-015 (integracion) | pendiente |
| REQ-S01-019 | MUST | BEH-S01-020 | — | AC-S01-015 (integracion) | pendiente |
| REQ-S01-020 | MUST | BEH-S01-020 | INV-S01-007 | AC-S01-015 (integracion) | pendiente |
| REQ-S01-021 | MUST | BEH-S01-021, BEH-S01-028 | — | AC-S01-016 (unitario) | pendiente |
| REQ-S01-022 | MUST | BEH-S01-021 | — | AC-S01-016 (unitario) | pendiente |
| REQ-S01-023 | MUST | BEH-S01-022 | — | AC-S01-017 (unitario) | pendiente |
| REQ-S01-024 | MUST | BEH-S01-012 | — | AC-S01-008 (integracion) | pendiente |
| REQ-S01-025 | MUST | BEH-S01-023 | — | AC-S01-018 (unitario) | pendiente |
| REQ-S01-026 | MUST | BEH-S01-007 | — | AC-S01-004 (integracion), AC-S01-006 (integracion) | pendiente |
| REQ-S01-027 | MUST | BEH-S01-029 | — | AC-S01-022 (manual) | pendiente |
| REQ-S01-028 | MUST | BEH-S01-024 | — | AC-S01-020 (unitario) | pendiente |
| REQ-S01-029 | MUST | BEH-S01-025 | — | AC-S01-019 (integracion) | pendiente |
| REQ-S01-030 | MUST | BEH-S01-020 | — | AC-S01-015 (integracion) | pendiente |
| REQ-S01-031 | MUST | BEH-S01-025 | — | AC-S01-019 (integracion) | pendiente |
| REQ-S01-032 | MUST | BEH-S01-017 | — | AC-S01-012 (unitario) | pendiente |
| REQ-S01-033 | MUST | BEH-S01-027 | — | AC-S01-013 (integracion) | pendiente |

## S-02 — Hora de Lima: un solo módulo de fechas, sin depender del huso del proceso y con formato peruano (aprobada)

Archivo: `S-02-hora-de-lima.md` · REQ: 20 · BEH: 17 · INV: 5 · AC: 13

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S02-001 | MUST | BEH-S02-001 | — | AC-S02-001 (unitario) | pendiente |
| REQ-S02-002 | MUST | BEH-S02-014 | INV-S02-001 | AC-S02-002 (unitario) | pendiente |
| REQ-S02-003 | MUST | BEH-S02-004 | INV-S02-001 | AC-S02-002 (unitario) | pendiente |
| REQ-S02-004 | MUST | BEH-S02-001, BEH-S02-002 | INV-S02-002 | AC-S02-001 (unitario) | pendiente |
| REQ-S02-005 | MUST | BEH-S02-005 | INV-S02-004 | AC-S02-004 (integracion) | pendiente |
| REQ-S02-006 | MUST | BEH-S02-006, BEH-S02-007 | — | AC-S02-005 (unitario) | pendiente |
| REQ-S02-007 | MUST | BEH-S02-008 | — | AC-S02-006 (unitario) | pendiente |
| REQ-S02-008 | MUST | BEH-S02-009 | INV-S02-003 | AC-S02-007 (unitario) | pendiente |
| REQ-S02-009 | MUST | BEH-S02-010 | INV-S02-003 | AC-S02-007 (unitario) | pendiente |
| REQ-S02-010 | MUST | BEH-S02-011 | — | AC-S02-008 (unitario) | pendiente |
| REQ-S02-011 | MUST | BEH-S02-011 | — | AC-S02-008 (unitario) | pendiente |
| REQ-S02-012 | MUST | BEH-S02-013 | — | AC-S02-010 (unitario) | pendiente |
| REQ-S02-013 | MUST | BEH-S02-009 | INV-S02-003 | AC-S02-007 (unitario) | pendiente |
| REQ-S02-014 | MUST | BEH-S02-012 | — | AC-S02-009 (unitario) | pendiente |
| REQ-S02-015 | MUST | BEH-S02-009, BEH-S02-010 | INV-S02-003 | AC-S02-007 (unitario) | pendiente |
| REQ-S02-016 | MUST | BEH-S02-015 | — | AC-S02-011 (manual) | pendiente |
| REQ-S02-017 | MUST | BEH-S02-002, BEH-S02-003 | — | AC-S02-001 (unitario), AC-S02-003 (unitario) | pendiente |
| REQ-S02-018 | MUST | BEH-S02-016 | — | AC-S02-012 (unitario) | pendiente |
| REQ-S02-019 | MUST | BEH-S02-017 | — | AC-S02-013 (unitario) | pendiente |
| REQ-S02-020 | MUST | BEH-S02-016 | INV-S02-005 | AC-S02-012 (unitario) | pendiente |

## S-03 — Dinero en soles con dos decimales exactos y catálogo de métodos de pago de Perú (aprobada)

Archivo: `S-03-dinero-y-metodos-de-pago.md` · REQ: 32 · BEH: 25 · INV: 6 · AC: 19

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S03-001 | MUST | BEH-S03-001 | INV-S03-001 | AC-S03-001 (unitario), AC-S03-004 (unitario) | pendiente |
| REQ-S03-002 | MUST | BEH-S03-022 | INV-S03-005 | AC-S03-017 (unitario) | pendiente |
| REQ-S03-003 | MUST | BEH-S03-002, BEH-S03-003 | — | AC-S03-002 (unitario) | pendiente |
| REQ-S03-004 | MUST | BEH-S03-004 | — | AC-S03-003 (unitario) | pendiente |
| REQ-S03-005 | MUST | BEH-S03-005 | — | AC-S03-003 (unitario) | pendiente |
| REQ-S03-006 | MUST | BEH-S03-006 | INV-S03-001 | AC-S03-001 (unitario), AC-S03-004 (unitario) | pendiente |
| REQ-S03-007 | MUST | BEH-S03-006 | INV-S03-001 | AC-S03-001 (unitario), AC-S03-004 (unitario) | pendiente |
| REQ-S03-008 | MUST | BEH-S03-007 | — | AC-S03-005 (unitario) | pendiente |
| REQ-S03-009 | MUST | BEH-S03-008, BEH-S03-009 | INV-S03-002 | AC-S03-006 (unitario) | pendiente |
| REQ-S03-010 | MUST | BEH-S03-008 | INV-S03-002 | AC-S03-006 (unitario) | pendiente |
| REQ-S03-011 | MUST | BEH-S03-010 | INV-S03-005 | AC-S03-007 (unitario), AC-S03-017 (unitario) | pendiente |
| REQ-S03-012 | MUST | BEH-S03-011 | — | AC-S03-008 (unitario) | pendiente |
| REQ-S03-013 | MUST | BEH-S03-012 | — | AC-S03-009 (unitario) | pendiente |
| REQ-S03-014 | MUST | BEH-S03-013 | — | AC-S03-009 (unitario) | pendiente |
| REQ-S03-015 | MUST | BEH-S03-014 | INV-S03-003 | AC-S03-010 (integracion), AC-S03-011 (integracion) | pendiente |
| REQ-S03-016 | MUST | BEH-S03-014 | — | AC-S03-010 (integracion) | pendiente |
| REQ-S03-017 | MUST | BEH-S03-015 | INV-S03-003 | AC-S03-010 (integracion), AC-S03-011 (integracion) | pendiente |
| REQ-S03-018 | MUST | BEH-S03-017 | — | AC-S03-012 (integracion) | pendiente |
| REQ-S03-019 | MUST | BEH-S03-016 | — | AC-S03-012 (integracion) | pendiente |
| REQ-S03-020 | MUST | BEH-S03-018 | — | AC-S03-013 (unitario) | pendiente |
| REQ-S03-021 | MUST | BEH-S03-019 | INV-S03-004 | AC-S03-014 (unitario) | pendiente |
| REQ-S03-022 | MUST | BEH-S03-020 | — | AC-S03-015 (sql) | pendiente |
| REQ-S03-023 | MUST | BEH-S03-020 | — | AC-S03-015 (sql) | pendiente |
| REQ-S03-024 | MUST | BEH-S03-020 | — | AC-S03-015 (sql) | pendiente |
| REQ-S03-025 | MUST | BEH-S03-021 | — | AC-S03-016 (unitario) | pendiente |
| REQ-S03-026 | MUST | BEH-S03-022 | INV-S03-005 | AC-S03-017 (unitario) | pendiente |
| REQ-S03-027 | MUST | BEH-S03-022 | INV-S03-005 | AC-S03-017 (unitario) | pendiente |
| REQ-S03-028 | MUST | BEH-S03-010, BEH-S03-022 | INV-S03-005 | AC-S03-007 (unitario), AC-S03-017 (unitario) | pendiente |
| REQ-S03-029 | MUST | BEH-S03-023 | — | AC-S03-018 (manual) | pendiente |
| REQ-S03-030 | MUST | BEH-S03-024 | INV-S03-006 | AC-S03-019 (unitario) | pendiente |
| REQ-S03-031 | MUST | BEH-S03-025 | INV-S03-006 | AC-S03-019 (unitario) | pendiente |
| REQ-S03-032 | MUST | BEH-S03-021 | — | AC-S03-016 (unitario) | pendiente |

## S-04 — Pago único de membresía: cobro atómico, una sola fecha de vencimiento y anulación que la revierte (en-revision)

Archivo: `S-04-pago-unico-de-membresia.md` · REQ: 31 · BEH: 26 · INV: 5 · AC: 18

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S04-001 | MUST | BEH-S04-001, BEH-S04-004 | INV-S04-002 | AC-S04-001 (integracion), AC-S04-003 (integracion), AC-S04-004 (integracion) | pendiente |
| REQ-S04-002 | MUST | BEH-S04-005 | INV-S04-002 | AC-S04-004 (integracion) | pendiente |
| REQ-S04-003 | MUST | BEH-S04-004, BEH-S04-006 | — | AC-S04-003 (integracion) | pendiente |
| REQ-S04-004 | MUST | BEH-S04-007 | — | AC-S04-004 (integracion) | pendiente |
| REQ-S04-005 | MUST | BEH-S04-008 | — | AC-S04-005 (unitario) | pendiente |
| REQ-S04-006 | MUST | BEH-S04-008 | — | AC-S04-005 (unitario) | pendiente |
| REQ-S04-007 | MUST | BEH-S04-009 | INV-S04-003 | AC-S04-006 (integracion) | pendiente |
| REQ-S04-008 | MUST | BEH-S04-010 | — | AC-S04-007 (integracion) | pendiente |
| REQ-S04-009 | MUST | BEH-S04-011 | INV-S04-004 | AC-S04-008 (integracion) | pendiente |
| REQ-S04-010 | MUST | BEH-S04-001, BEH-S04-002, BEH-S04-003, BEH-S04-004 | — | AC-S04-001 (integracion), AC-S04-002 (integracion), AC-S04-003 (integracion) | pendiente |
| REQ-S04-011 | MUST | BEH-S04-012 | INV-S04-001 | AC-S04-001 (integracion), AC-S04-011 (integracion) | pendiente |
| REQ-S04-012 | MUST | BEH-S04-013 | — | AC-S04-009 (unitario) | pendiente |
| REQ-S04-013 | MUST | BEH-S04-013, BEH-S04-014 | — | AC-S04-009 (unitario) | pendiente |
| REQ-S04-014 | MUST | BEH-S04-015 | — | AC-S04-010 (integracion) | pendiente |
| REQ-S04-015 | MUST | BEH-S04-016 | — | AC-S04-010 (integracion) | pendiente |
| REQ-S04-016 | MUST | BEH-S04-017 | — | AC-S04-011 (integracion) | pendiente |
| REQ-S04-017 | MUST | BEH-S04-018 | — | AC-S04-012 (integracion) | pendiente |
| REQ-S04-018 | MUST | BEH-S04-017, BEH-S04-019 | INV-S04-001, INV-S04-003 | AC-S04-001 (integracion), AC-S04-006 (integracion), AC-S04-011 (integracion) | pendiente |
| REQ-S04-019 | MUST | BEH-S04-020 | — | AC-S04-011 (integracion) | pendiente |
| REQ-S04-020 | MUST | BEH-S04-021 | — | AC-S04-013 (sql) | pendiente |
| REQ-S04-021 | MUST | BEH-S04-022 | INV-S04-005 | AC-S04-014 (unitario) | pendiente |
| REQ-S04-022 | MUST | BEH-S04-022 | INV-S04-005 | AC-S04-014 (unitario) | pendiente |
| REQ-S04-023 | MUST | BEH-S04-021 | — | AC-S04-013 (sql) | pendiente |
| REQ-S04-024 | MUST | BEH-S04-023 | — | AC-S04-015 (integracion) | pendiente |
| REQ-S04-025 | MUST | BEH-S04-001 | — | AC-S04-001 (integracion), AC-S04-016 (unitario) | pendiente |
| REQ-S04-026 | MUST | BEH-S04-024 | — | AC-S04-017 (manual) | pendiente |
| REQ-S04-027 | MUST | BEH-S04-022 | INV-S04-005 | AC-S04-014 (unitario) | pendiente |
| REQ-S04-028 | MUST | BEH-S04-025 | — | AC-S04-018 (manual) | pendiente |
| REQ-S04-029 | MUST | BEH-S04-026 | — | AC-S04-013 (sql), AC-S04-016 (unitario) | pendiente |
| REQ-S04-030 | MUST | BEH-S04-026 | — | AC-S04-013 (sql), AC-S04-016 (unitario) | pendiente |
| REQ-S04-031 | MUST | BEH-S04-024 | — | AC-S04-017 (manual) | pendiente |

## S-22 — Capa de datos con Drizzle: esquema, repositorios, transacciones y retiro de Prisma (aprobada)

Archivo: `S-22-capa-de-datos-con-drizzle.md` · REQ: 30 · BEH: 27 · INV: 6 · AC: 28

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S22-001 | MUST | BEH-S22-020 | — | AC-S22-001 (integracion), AC-S22-020 (integracion) | pendiente |
| REQ-S22-002 | MUST | BEH-S22-012 | INV-S22-001 | AC-S22-001 (integracion) | pendiente |
| REQ-S22-003 | MUST | BEH-S22-011, BEH-S22-012 | INV-S22-001 | AC-S22-001 (integracion), AC-S22-002 (unitario) | pendiente |
| REQ-S22-004 | MUST | BEH-S22-006 | INV-S22-006 | AC-S22-009 (integracion) | pendiente |
| REQ-S22-005 | MUST | BEH-S22-007 | — | AC-S22-010 (integracion) | pendiente |
| REQ-S22-006 | MUST | BEH-S22-020 | — | AC-S22-020 (integracion) | pendiente |
| REQ-S22-007 | MUST | BEH-S22-001 | — | AC-S22-003 (integracion), AC-S22-020 (integracion) | pendiente |
| REQ-S22-008 | MUST | BEH-S22-001 | — | AC-S22-003 (integracion) | pendiente |
| REQ-S22-009 | MUST | BEH-S22-016 | — | AC-S22-004 (integracion) | pendiente |
| REQ-S22-010 | MUST | BEH-S22-002 | — | AC-S22-005 (integracion) | pendiente |
| REQ-S22-011 | MUST | BEH-S22-003 | — | AC-S22-006 (integracion) | pendiente |
| REQ-S22-012 | MUST | BEH-S22-004 | INV-S22-004 | AC-S22-007 (integracion), AC-S22-028 (integracion) | pendiente |
| REQ-S22-013 | MUST | BEH-S22-005 | — | AC-S22-008 (integracion) | pendiente |
| REQ-S22-014 | MUST | BEH-S22-010 | INV-S22-003 | AC-S22-011 (unitario) | pendiente |
| REQ-S22-015 | MUST | BEH-S22-014 | INV-S22-002 | AC-S22-012 (unitario), AC-S22-024 (unitario) | pendiente |
| REQ-S22-016 | MUST | BEH-S22-008 | — | AC-S22-014 (e2e) | pendiente |
| REQ-S22-017 | MUST | BEH-S22-017 | — | AC-S22-015 (unitario) | pendiente |
| REQ-S22-018 | MUST | BEH-S22-013 | — | AC-S22-016 (integracion) | pendiente |
| REQ-S22-019 | MUST | BEH-S22-013 | — | AC-S22-016 (integracion) | pendiente |
| REQ-S22-020 | MUST | BEH-S22-015 | — | AC-S22-017 (unitario) | pendiente |
| REQ-S22-021 | MUST | BEH-S22-018 | — | AC-S22-018 (unitario) | pendiente |
| REQ-S22-022 | MUST | BEH-S22-009 | — | AC-S22-019 (unitario) | pendiente |
| REQ-S22-023 | MUST | BEH-S22-019 | INV-S22-005 | AC-S22-013 (unitario) | pendiente |
| REQ-S22-024 | MUST | BEH-S22-021 | — | AC-S22-021 (integracion) | pendiente |
| REQ-S22-025 | MUST | BEH-S22-025 | — | AC-S22-025 (unitario) | pendiente |
| REQ-S22-026 | MUST | BEH-S22-027 | — | AC-S22-027 (integracion) | pendiente |
| REQ-S22-027 | MUST | BEH-S22-024 | INV-S22-002 | AC-S22-012 (unitario), AC-S22-024 (unitario) | pendiente |
| REQ-S22-028 | MUST | BEH-S22-026 | — | AC-S22-026 (integracion) | pendiente |
| REQ-S22-029 | MUST | BEH-S22-023 | — | AC-S22-023 (unitario) | pendiente |
| REQ-S22-030 | MUST | BEH-S22-022 | — | AC-S22-022 (integracion) | pendiente |
