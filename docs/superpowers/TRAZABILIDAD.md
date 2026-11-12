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

## S-04 — Pago único de membresía: cobro atómico, una sola fecha de vencimiento y anulación que la revierte (aprobada)

Archivo: `S-04-pago-unico-de-membresia.md` · REQ: 49 · BEH: 42 · INV: 6 · AC: 25

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S04-001 | MUST | BEH-S04-001, BEH-S04-004 | INV-S04-002 | AC-S04-001 (integracion), AC-S04-003 (integracion), AC-S04-004 (integracion) | pendiente |
| REQ-S04-002 | MUST | BEH-S04-005 | INV-S04-002 | AC-S04-004 (integracion) | pendiente |
| REQ-S04-003 | MUST | BEH-S04-004, BEH-S04-006 | — | AC-S04-003 (integracion) | pendiente |
| REQ-S04-004 | MUST | BEH-S04-007 | — | AC-S04-004 (integracion) | pendiente |
| REQ-S04-005 | MUST | BEH-S04-008, BEH-S04-028 | — | AC-S04-005 (unitario), AC-S04-021 (integracion) | pendiente |
| REQ-S04-006 | MUST | BEH-S04-008 | — | AC-S04-005 (unitario) | pendiente |
| REQ-S04-007 | MUST | BEH-S04-009 | INV-S04-003 | AC-S04-006 (integracion) | pendiente |
| REQ-S04-008 | MUST | BEH-S04-010, BEH-S04-027 | — | AC-S04-007 (integracion) | pendiente |
| REQ-S04-009 | MUST | BEH-S04-011 | INV-S04-004 | AC-S04-008 (integracion) | pendiente |
| REQ-S04-010 | MUST | BEH-S04-001, BEH-S04-002, BEH-S04-003, BEH-S04-004, BEH-S04-040 | — | AC-S04-001 (integracion), AC-S04-002 (integracion), AC-S04-003 (integracion), AC-S04-024 (integracion) | pendiente |
| REQ-S04-011 | MUST | BEH-S04-012 | INV-S04-001 | AC-S04-001 (integracion), AC-S04-011 (integracion) | pendiente |
| REQ-S04-012 | MUST | BEH-S04-013, BEH-S04-029 | — | AC-S04-009 (unitario), AC-S04-019 (integracion) | pendiente |
| REQ-S04-013 | MUST | BEH-S04-014 | — | AC-S04-009 (unitario) | pendiente |
| REQ-S04-014 | MUST | BEH-S04-015, BEH-S04-016, BEH-S04-040 | — | AC-S04-010 (integracion), AC-S04-024 (integracion) | pendiente |
| REQ-S04-015 | MUST | BEH-S04-016 | — | AC-S04-010 (integracion) | pendiente |
| REQ-S04-016 | MUST | BEH-S04-017, BEH-S04-034 | — | AC-S04-011 (integracion), AC-S04-022 (integracion) | pendiente |
| REQ-S04-017 | MUST | BEH-S04-018, BEH-S04-034 | — | AC-S04-012 (integracion), AC-S04-022 (integracion) | pendiente |
| REQ-S04-018 | MUST | BEH-S04-017, BEH-S04-019 | INV-S04-001, INV-S04-003 | AC-S04-001 (integracion), AC-S04-006 (integracion), AC-S04-011 (integracion) | pendiente |
| REQ-S04-019 | MUST | BEH-S04-020 | — | AC-S04-012 (integracion) | pendiente |
| REQ-S04-020 | MUST | BEH-S04-021 | — | AC-S04-013 (unitario) | pendiente |
| REQ-S04-021 | MUST | BEH-S04-022 | INV-S04-005 | AC-S04-014 (unitario) | pendiente |
| REQ-S04-022 | MUST | BEH-S04-022 | INV-S04-005 | AC-S04-014 (unitario) | pendiente |
| REQ-S04-023 | MUST | BEH-S04-021 | — | AC-S04-013 (unitario) | pendiente |
| REQ-S04-024 | MUST | BEH-S04-023 | — | AC-S04-015 (integracion) | pendiente |
| REQ-S04-025 | MUST | BEH-S04-001 | — | AC-S04-001 (integracion), AC-S04-016 (unitario) | pendiente |
| REQ-S04-026 | MUST | BEH-S04-024 | — | AC-S04-017 (manual) | pendiente |
| REQ-S04-027 | MUST | BEH-S04-022 | INV-S04-005 | AC-S04-014 (unitario) | pendiente |
| REQ-S04-028 | MUST | BEH-S04-025 | — | AC-S04-018 (manual) | pendiente |
| REQ-S04-029 | MUST | BEH-S04-026 | — | AC-S04-016 (unitario) | pendiente |
| REQ-S04-030 | MUST | BEH-S04-026 | — | AC-S04-016 (unitario) | pendiente |
| REQ-S04-031 | MUST | BEH-S04-024 | — | AC-S04-017 (manual) | pendiente |
| REQ-S04-032 | MUST | BEH-S04-027 | — | AC-S04-007 (integracion) | pendiente |
| REQ-S04-033 | MUST | BEH-S04-028, BEH-S04-034 | — | AC-S04-021 (integracion), AC-S04-022 (integracion) | pendiente |
| REQ-S04-034 | MUST | BEH-S04-029 | — | AC-S04-019 (integracion) | pendiente |
| REQ-S04-035 | MUST | BEH-S04-030 | — | AC-S04-020 (integracion) | pendiente |
| REQ-S04-036 | MUST | BEH-S04-031 | — | AC-S04-020 (integracion) | pendiente |
| REQ-S04-037 | MUST | BEH-S04-032 | — | AC-S04-008 (integracion) | pendiente |
| REQ-S04-038 | MUST | BEH-S04-032 | — | AC-S04-008 (integracion) | pendiente |
| REQ-S04-039 | MUST | BEH-S04-033 | — | AC-S04-008 (integracion) | pendiente |
| REQ-S04-040 | MUST | BEH-S04-035 | — | AC-S04-023 (integracion) | pendiente |
| REQ-S04-041 | MUST | BEH-S04-036 | — | AC-S04-011 (integracion) | pendiente |
| REQ-S04-042 | MUST | BEH-S04-037 | — | AC-S04-023 (integracion) | pendiente |
| REQ-S04-043 | MUST | BEH-S04-038 | — | AC-S04-023 (integracion) | pendiente |
| REQ-S04-044 | MUST | BEH-S04-039 | — | AC-S04-021 (integracion) | pendiente |
| REQ-S04-045 | MUST | BEH-S04-041 | INV-S04-006 | AC-S04-025 (unitario) | pendiente |
| REQ-S04-046 | MUST | BEH-S04-041 | — | AC-S04-025 (unitario) | pendiente |
| REQ-S04-047 | MUST | BEH-S04-041 | — | AC-S04-025 (unitario) | pendiente |
| REQ-S04-048 | MUST | BEH-S04-029 | — | AC-S04-019 (integracion) | pendiente |
| REQ-S04-049 | MUST | BEH-S04-042 | — | AC-S04-003 (integracion) | pendiente |

## S-05 — Negocio y sede únicos: sin organización, con una sola sede oculta y una configuración global (aprobada)

Archivo: `S-05-negocio-y-sede-unicos.md` · REQ: 33 · BEH: 25 · INV: 5 · AC: 17

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S05-001 | MUST | BEH-S05-001 | INV-S05-002 | AC-S05-001 (sql), AC-S05-014 (unitario) | pendiente |
| REQ-S05-002 | MUST | BEH-S05-001 | INV-S05-002 | AC-S05-001 (sql), AC-S05-014 (unitario) | pendiente |
| REQ-S05-003 | MUST | BEH-S05-002 | — | AC-S05-002 (sql) | pendiente |
| REQ-S05-004 | MUST | BEH-S05-003, BEH-S05-022 | INV-S05-001 | AC-S05-003 (integracion) | pendiente |
| REQ-S05-005 | MUST | BEH-S05-004 | INV-S05-001 | AC-S05-003 (integracion) | pendiente |
| REQ-S05-006 | MUST | BEH-S05-005 | INV-S05-001 | AC-S05-003 (integracion) | pendiente |
| REQ-S05-007 | MUST | BEH-S05-006, BEH-S05-023 | INV-S05-003 | AC-S05-004 (integracion) | pendiente |
| REQ-S05-008 | MUST | BEH-S05-007, BEH-S05-008 | INV-S05-004 | AC-S05-005 (integracion) | pendiente |
| REQ-S05-009 | MUST | BEH-S05-009 | — | AC-S05-006 (sql) | pendiente |
| REQ-S05-010 | MUST | BEH-S05-009 | — | AC-S05-006 (sql) | pendiente |
| REQ-S05-011 | MUST | BEH-S05-010 | — | AC-S05-007 (unitario) | pendiente |
| REQ-S05-012 | MUST | BEH-S05-010 | — | AC-S05-007 (unitario) | pendiente |
| REQ-S05-013 | MUST | BEH-S05-011 | — | AC-S05-008 (e2e) | pendiente |
| REQ-S05-014 | MUST | BEH-S05-012 | — | AC-S05-009 (integracion) | pendiente |
| REQ-S05-015 | MUST | BEH-S05-012 | — | AC-S05-009 (integracion) | pendiente |
| REQ-S05-016 | MUST | BEH-S05-013 | — | AC-S05-009 (integracion) | pendiente |
| REQ-S05-017 | MUST | BEH-S05-014 | — | AC-S05-010 (integracion) | pendiente |
| REQ-S05-018 | MUST | BEH-S05-015 | — | AC-S05-010 (integracion) | pendiente |
| REQ-S05-019 | MUST | BEH-S05-016 | — | AC-S05-011 (integracion) | pendiente |
| REQ-S05-020 | MUST | BEH-S05-017 | INV-S05-005 | AC-S05-012 (integracion) | pendiente |
| REQ-S05-021 | MUST | BEH-S05-018 | — | AC-S05-013 (integracion) | pendiente |
| REQ-S05-022 | MUST | BEH-S05-019 | INV-S05-002 | AC-S05-001 (sql), AC-S05-014 (unitario) | pendiente |
| REQ-S05-023 | MUST | BEH-S05-019 | INV-S05-002 | AC-S05-001 (sql), AC-S05-014 (unitario) | pendiente |
| REQ-S05-024 | MUST | BEH-S05-020 | — | AC-S05-015 (manual) | pendiente |
| REQ-S05-025 | MUST | BEH-S05-021 | — | AC-S05-016 (unitario) | pendiente |
| REQ-S05-026 | MUST | BEH-S05-004 | INV-S05-001 | AC-S05-003 (integracion) | pendiente |
| REQ-S05-027 | MUST | BEH-S05-010 | — | AC-S05-007 (unitario) | pendiente |
| REQ-S05-028 | MUST | BEH-S05-011 | — | AC-S05-008 (e2e) | pendiente |
| REQ-S05-029 | MUST | BEH-S05-014 | — | AC-S05-010 (integracion) | pendiente |
| REQ-S05-030 | MUST | BEH-S05-024 | — | AC-S05-010 (integracion) | pendiente |
| REQ-S05-031 | MUST | BEH-S05-018 | — | AC-S05-013 (integracion) | pendiente |
| REQ-S05-032 | MUST | BEH-S05-025 | — | AC-S05-017 (integracion) | pendiente |
| REQ-S05-033 | MUST | BEH-S05-025 | — | AC-S05-017 (integracion) | pendiente |

## S-06 — Documento de identidad: DNI, carné de extranjería o pasaporte, y código de socio (aprobada)

Archivo: `S-06-documento-de-identidad.md` · REQ: 40 · BEH: 34 · INV: 6 · AC: 20

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S06-001 | MUST | BEH-S06-001 | — | AC-S06-001 (sql) | pendiente |
| REQ-S06-002 | MUST | BEH-S06-001 | INV-S06-001 | AC-S06-001 (sql), AC-S06-005 (integracion) | pendiente |
| REQ-S06-003 | MUST | BEH-S06-001 | INV-S06-002 | AC-S06-001 (sql), AC-S06-002 (sql), AC-S06-007 (integracion) | pendiente |
| REQ-S06-004 | MUST | BEH-S06-002 | INV-S06-003 | AC-S06-002 (sql) | pendiente |
| REQ-S06-005 | MUST | BEH-S06-003 | INV-S06-004 | AC-S06-003 (unitario) | pendiente |
| REQ-S06-006 | MUST | BEH-S06-004 | INV-S06-004 | AC-S06-003 (unitario) | pendiente |
| REQ-S06-007 | MUST | BEH-S06-005 | INV-S06-003 | AC-S06-002 (sql), AC-S06-004 (integracion) | pendiente |
| REQ-S06-008 | MUST | BEH-S06-006 | INV-S06-001 | AC-S06-004 (integracion), AC-S06-005 (integracion) | pendiente |
| REQ-S06-009 | MUST | BEH-S06-007 | INV-S06-001 | AC-S06-005 (integracion) | pendiente |
| REQ-S06-010 | MUST | BEH-S06-008 | INV-S06-002 | AC-S06-002 (sql), AC-S06-006 (integracion), AC-S06-007 (integracion) | pendiente |
| REQ-S06-011 | MUST | BEH-S06-008, BEH-S06-011 | — | AC-S06-006 (integracion) | pendiente |
| REQ-S06-012 | MUST | BEH-S06-009 | INV-S06-002 | AC-S06-002 (sql), AC-S06-007 (integracion) | pendiente |
| REQ-S06-013 | MUST | BEH-S06-010, BEH-S06-032 | — | AC-S06-006 (integracion), AC-S06-019 (integracion) | pendiente |
| REQ-S06-014 | MUST | BEH-S06-008 | — | AC-S06-006 (integracion) | pendiente |
| REQ-S06-015 | MUST | BEH-S06-012 | INV-S06-003 | AC-S06-002 (sql), AC-S06-004 (integracion) | pendiente |
| REQ-S06-016 | MUST | BEH-S06-013, BEH-S06-014 | — | AC-S06-004 (integracion) | pendiente |
| REQ-S06-017 | MUST | BEH-S06-015 | — | AC-S06-008 (integracion) | pendiente |
| REQ-S06-018 | MUST | BEH-S06-016 | — | AC-S06-009 (integracion) | pendiente |
| REQ-S06-019 | MUST | BEH-S06-017 | INV-S06-005 | AC-S06-003 (unitario), AC-S06-010 (integracion) | pendiente |
| REQ-S06-020 | MUST | BEH-S06-018 | INV-S06-005 | AC-S06-003 (unitario), AC-S06-010 (integracion) | pendiente |
| REQ-S06-021 | MUST | BEH-S06-019 | — | AC-S06-011 (integracion) | pendiente |
| REQ-S06-022 | MUST | BEH-S06-020 | — | AC-S06-011 (integracion) | pendiente |
| REQ-S06-023 | MUST | BEH-S06-034 | — | AC-S06-012 (integracion) | pendiente |
| REQ-S06-024 | MUST | BEH-S06-022 | — | AC-S06-004 (integracion) | pendiente |
| REQ-S06-025 | MUST | BEH-S06-023 | — | AC-S06-013 (manual) | pendiente |
| REQ-S06-026 | MUST | BEH-S06-024 | — | AC-S06-018 (manual) | pendiente |
| REQ-S06-027 | MUST | BEH-S06-025 | — | AC-S06-018 (manual) | pendiente |
| REQ-S06-028 | MUST | BEH-S06-026 | — | AC-S06-014 (unitario) | pendiente |
| REQ-S06-029 | MUST | BEH-S06-027 | — | AC-S06-015 (integracion) | pendiente |
| REQ-S06-030 | MUST | BEH-S06-028 | INV-S06-006 | AC-S06-016 (unitario) | pendiente |
| REQ-S06-031 | MUST | BEH-S06-029 | INV-S06-006 | AC-S06-016 (unitario) | pendiente |
| REQ-S06-032 | MUST | BEH-S06-030 | — | AC-S06-017 (manual) | pendiente |
| REQ-S06-033 | MUST | BEH-S06-015 | — | AC-S06-008 (integracion) | pendiente |
| REQ-S06-034 | MUST | BEH-S06-033 | — | AC-S06-020 (integracion) | pendiente |
| REQ-S06-035 | MUST | BEH-S06-033 | — | AC-S06-020 (integracion) | pendiente |
| REQ-S06-036 | MUST | BEH-S06-001 | — | AC-S06-001 (sql) | pendiente |
| REQ-S06-037 | MUST | BEH-S06-001, BEH-S06-002 | — | AC-S06-001 (sql), AC-S06-002 (sql) | pendiente |
| REQ-S06-038 | MUST | BEH-S06-016 | — | AC-S06-009 (integracion) | pendiente |
| REQ-S06-039 | MUST | BEH-S06-021 | — | AC-S06-012 (integracion) | pendiente |
| REQ-S06-040 | MUST | BEH-S06-031 | — | AC-S06-007 (integracion) | pendiente |

## S-07 — Cambio de plan: una sola operación, sin saldo a favor y sin planes «con entrenador» (aprobada)

Archivo: `S-07-cambio-de-plan.md` · REQ: 61 · BEH: 38 · INV: 5 · AC: 15

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S07-001 | MUST | BEH-S07-001 | — | AC-S07-001 (unitario) | pendiente |
| REQ-S07-002 | MUST | BEH-S07-004 | — | AC-S07-001 (unitario) | pendiente |
| REQ-S07-003 | MUST | BEH-S07-004, BEH-S07-005 | — | AC-S07-001 (unitario) | pendiente |
| REQ-S07-004 | MUST | BEH-S07-001 | INV-S07-002 | AC-S07-001 (unitario) | pendiente |
| REQ-S07-005 | MUST | BEH-S07-003 | INV-S07-002 | AC-S07-001 (unitario) | pendiente |
| REQ-S07-006 | MUST | BEH-S07-002 | INV-S07-002 | AC-S07-001 (unitario) | pendiente |
| REQ-S07-007 | MUST | BEH-S07-006 | — | AC-S07-002 (unitario) | pendiente |
| REQ-S07-008 | MUST | BEH-S07-006 | — | AC-S07-002 (unitario) | pendiente |
| REQ-S07-009 | MUST | BEH-S07-006 | — | AC-S07-002 (unitario) | pendiente |
| REQ-S07-010 | MUST | BEH-S07-007 | — | AC-S07-002 (unitario) | pendiente |
| REQ-S07-011 | MUST | BEH-S07-006 | — | AC-S07-002 (unitario) | pendiente |
| REQ-S07-012 | MUST | BEH-S07-008 | — | AC-S07-003 (integracion) | pendiente |
| REQ-S07-013 | MUST | BEH-S07-010 | — | AC-S07-004 (integracion) | pendiente |
| REQ-S07-014 | MUST | BEH-S07-020 | — | AC-S07-006 (integracion) | pendiente |
| REQ-S07-015 | MUST | BEH-S07-023 | — | AC-S07-006 (integracion) | pendiente |
| REQ-S07-016 | MUST | BEH-S07-016 | — | AC-S07-005 (integracion) | pendiente |
| REQ-S07-017 | MUST | BEH-S07-016, BEH-S07-021 | — | AC-S07-005 (integracion), AC-S07-006 (integracion) | pendiente |
| REQ-S07-018 | MUST | BEH-S07-017 | — | AC-S07-005 (integracion) | pendiente |
| REQ-S07-019 | MUST | BEH-S07-018 | — | AC-S07-005 (integracion) | pendiente |
| REQ-S07-020 | MUST | BEH-S07-019, BEH-S07-021 | — | AC-S07-005 (integracion), AC-S07-006 (integracion) | pendiente |
| REQ-S07-021 | MUST | BEH-S07-011 | — | AC-S07-004 (integracion) | pendiente |
| REQ-S07-022 | MUST | BEH-S07-012, BEH-S07-020 | — | AC-S07-004 (integracion), AC-S07-006 (integracion) | pendiente |
| REQ-S07-023 | MUST | BEH-S07-013 | — | AC-S07-004 (integracion) | pendiente |
| REQ-S07-024 | MUST | BEH-S07-014 | — | AC-S07-004 (integracion) | pendiente |
| REQ-S07-025 | MUST | BEH-S07-015 | — | AC-S07-004 (integracion) | pendiente |
| REQ-S07-026 | MUST | BEH-S07-015 | — | AC-S07-004 (integracion) | pendiente |
| REQ-S07-027 | MUST | BEH-S07-008 | — | AC-S07-003 (integracion) | pendiente |
| REQ-S07-028 | MUST | BEH-S07-008 | — | AC-S07-003 (integracion) | pendiente |
| REQ-S07-029 | MUST | BEH-S07-009 | — | AC-S07-003 (integracion) | pendiente |
| REQ-S07-030 | MUST | BEH-S07-008 | — | AC-S07-003 (integracion) | pendiente |
| REQ-S07-031 | MUST | BEH-S07-008 | INV-S07-001 | AC-S07-003 (integracion), AC-S07-008 (integracion) | pendiente |
| REQ-S07-032 | MUST | BEH-S07-008 | INV-S07-001 | AC-S07-003 (integracion), AC-S07-008 (integracion) | pendiente |
| REQ-S07-033 | MUST | BEH-S07-008 | INV-S07-004 | AC-S07-003 (integracion) | pendiente |
| REQ-S07-034 | MUST | BEH-S07-008 | INV-S07-004 | AC-S07-003 (integracion) | pendiente |
| REQ-S07-035 | MUST | BEH-S07-024 | — | AC-S07-007 (integracion) | pendiente |
| REQ-S07-036 | MUST | BEH-S07-022 | — | AC-S07-006 (integracion) | pendiente |
| REQ-S07-037 | MUST | BEH-S07-025 | — | AC-S07-007 (integracion) | pendiente |
| REQ-S07-038 | MUST | BEH-S07-026 | — | AC-S07-008 (integracion) | pendiente |
| REQ-S07-039 | MUST | BEH-S07-026, BEH-S07-027 | INV-S07-001 | AC-S07-008 (integracion) | pendiente |
| REQ-S07-040 | MUST | BEH-S07-028 | — | AC-S07-009 (sql) | pendiente |
| REQ-S07-041 | MUST | BEH-S07-024 | — | AC-S07-007 (integracion) | pendiente |
| REQ-S07-042 | MUST | BEH-S07-028 | — | AC-S07-009 (sql) | pendiente |
| REQ-S07-043 | MUST | BEH-S07-028 | — | AC-S07-009 (sql) | pendiente |
| REQ-S07-044 | MUST | BEH-S07-028 | — | AC-S07-009 (sql) | pendiente |
| REQ-S07-045 | MUST | BEH-S07-028 | — | AC-S07-009 (sql) | pendiente |
| REQ-S07-046 | MUST | BEH-S07-029 | INV-S07-003 | AC-S07-009 (sql) | pendiente |
| REQ-S07-047 | MUST | BEH-S07-029 | INV-S07-003 | AC-S07-009 (sql) | pendiente |
| REQ-S07-048 | MUST | BEH-S07-030 | — | AC-S07-010 (unitario) | pendiente |
| REQ-S07-049 | MUST | BEH-S07-031 | — | AC-S07-010 (unitario) | pendiente |
| REQ-S07-050 | MUST | BEH-S07-031 | — | AC-S07-010 (unitario) | pendiente |
| REQ-S07-051 | MUST | BEH-S07-032 | — | AC-S07-011 (integracion) | pendiente |
| REQ-S07-052 | MUST | BEH-S07-033 | — | AC-S07-011 (integracion) | pendiente |
| REQ-S07-053 | MUST | BEH-S07-034 | — | AC-S07-012 (manual) | pendiente |
| REQ-S07-054 | MUST | BEH-S07-034 | — | AC-S07-012 (manual) | pendiente |
| REQ-S07-055 | MUST | BEH-S07-035 | — | AC-S07-012 (manual) | pendiente |
| REQ-S07-056 | MUST | BEH-S07-035 | — | AC-S07-012 (manual) | pendiente |
| REQ-S07-057 | MUST | BEH-S07-036 | INV-S07-005 | AC-S07-013 (unitario) | pendiente |
| REQ-S07-058 | MUST | BEH-S07-036 | INV-S07-005 | AC-S07-013 (unitario) | pendiente |
| REQ-S07-059 | MUST | BEH-S07-037 | — | AC-S07-014 (manual) | pendiente |
| REQ-S07-060 | MUST | BEH-S07-038 | — | AC-S07-015 (unitario) | pendiente |
| REQ-S07-061 | MUST | BEH-S07-026 | — | AC-S07-008 (integracion) | pendiente |

## S-08 — Registro continuo de cobros: sin turnos, arqueo ni egresos, con reporte diario por método y usuario (en-revision)

Archivo: `S-08-registro-continuo-de-cobros.md` · REQ: 57 · BEH: 29 · INV: 4 · AC: 15

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S08-001 | MUST | BEH-S08-001 | INV-S08-002 | AC-S08-001 (sql) | pendiente |
| REQ-S08-002 | MUST | BEH-S08-001 | — | AC-S08-001 (sql) | pendiente |
| REQ-S08-003 | MUST | BEH-S08-001 | INV-S08-002 | AC-S08-001 (sql) | pendiente |
| REQ-S08-004 | MUST | BEH-S08-001 | — | AC-S08-001 (sql) | pendiente |
| REQ-S08-005 | MUST | BEH-S08-002 | — | AC-S08-001 (sql) | pendiente |
| REQ-S08-006 | MUST | BEH-S08-002 | — | AC-S08-001 (sql) | pendiente |
| REQ-S08-007 | MUST | BEH-S08-002 | — | AC-S08-001 (sql) | pendiente |
| REQ-S08-008 | MUST | BEH-S08-003 | INV-S08-002 | AC-S08-001 (sql), AC-S08-002 (integracion) | pendiente |
| REQ-S08-009 | MUST | BEH-S08-004 | — | AC-S08-003 (integracion) | pendiente |
| REQ-S08-010 | MUST | BEH-S08-004 | — | AC-S08-003 (integracion) | pendiente |
| REQ-S08-011 | MUST | BEH-S08-003 | — | AC-S08-002 (integracion) | pendiente |
| REQ-S08-012 | MUST | BEH-S08-003 | — | AC-S08-002 (integracion) | pendiente |
| REQ-S08-013 | MUST | BEH-S08-003 | — | AC-S08-002 (integracion) | pendiente |
| REQ-S08-014 | MUST | BEH-S08-005 | — | AC-S08-004 (manual) | pendiente |
| REQ-S08-015 | MUST | BEH-S08-005 | — | AC-S08-004 (manual) | pendiente |
| REQ-S08-016 | MUST | BEH-S08-005 | — | AC-S08-004 (manual) | pendiente |
| REQ-S08-017 | MUST | BEH-S08-005 | — | AC-S08-004 (manual) | pendiente |
| REQ-S08-018 | MUST | BEH-S08-006 | — | AC-S08-004 (manual) | pendiente |
| REQ-S08-019 | MUST | BEH-S08-007 | — | AC-S08-005 (manual) | pendiente |
| REQ-S08-020 | MUST | BEH-S08-007 | — | AC-S08-005 (manual) | pendiente |
| REQ-S08-021 | MUST | BEH-S08-008 | — | AC-S08-006 (integracion) | pendiente |
| REQ-S08-022 | MUST | BEH-S08-008 | — | AC-S08-006 (integracion) | pendiente |
| REQ-S08-023 | MUST | BEH-S08-008 | — | AC-S08-006 (integracion) | pendiente |
| REQ-S08-024 | MUST | BEH-S08-009, BEH-S08-010 | — | AC-S08-006 (integracion) | pendiente |
| REQ-S08-025 | MUST | BEH-S08-008 | — | AC-S08-005 (manual), AC-S08-006 (integracion) | pendiente |
| REQ-S08-026 | MUST | BEH-S08-011 | — | AC-S08-006 (integracion) | pendiente |
| REQ-S08-027 | MUST | BEH-S08-012 | — | AC-S08-007 (unitario) | pendiente |
| REQ-S08-028 | MUST | BEH-S08-013 | INV-S08-001 | AC-S08-008 (integracion) | pendiente |
| REQ-S08-029 | MUST | BEH-S08-013 | INV-S08-001 | AC-S08-008 (integracion) | pendiente |
| REQ-S08-030 | MUST | BEH-S08-013 | INV-S08-001 | AC-S08-008 (integracion) | pendiente |
| REQ-S08-031 | MUST | BEH-S08-013 | INV-S08-001 | AC-S08-008 (integracion) | pendiente |
| REQ-S08-032 | MUST | BEH-S08-014 | INV-S08-003 | AC-S08-008 (integracion) | pendiente |
| REQ-S08-033 | MUST | BEH-S08-009, BEH-S08-016 | INV-S08-001 | AC-S08-006 (integracion), AC-S08-008 (integracion) | pendiente |
| REQ-S08-034 | MUST | BEH-S08-009, BEH-S08-016 | — | AC-S08-006 (integracion), AC-S08-008 (integracion) | pendiente |
| REQ-S08-035 | MUST | BEH-S08-015 | — | AC-S08-008 (integracion) | pendiente |
| REQ-S08-036 | MUST | BEH-S08-017 | — | AC-S08-008 (integracion) | pendiente |
| REQ-S08-037 | MUST | BEH-S08-018 | — | AC-S08-009 (integracion) | pendiente |
| REQ-S08-038 | MUST | BEH-S08-017 | — | AC-S08-008 (integracion) | pendiente |
| REQ-S08-039 | MUST | BEH-S08-019 | — | AC-S08-009 (integracion) | pendiente |
| REQ-S08-040 | MUST | BEH-S08-020 | — | AC-S08-010 (integracion) | pendiente |
| REQ-S08-041 | MUST | BEH-S08-020 | INV-S08-003 | AC-S08-008 (integracion), AC-S08-010 (integracion) | pendiente |
| REQ-S08-042 | MUST | BEH-S08-021 | — | AC-S08-010 (integracion) | pendiente |
| REQ-S08-043 | MUST | BEH-S08-005 | — | AC-S08-004 (manual) | pendiente |
| REQ-S08-044 | MUST | BEH-S08-022 | INV-S08-004 | AC-S08-011 (unitario) | pendiente |
| REQ-S08-045 | MUST | BEH-S08-022 | INV-S08-004 | AC-S08-011 (unitario) | pendiente |
| REQ-S08-046 | MUST | BEH-S08-022 | INV-S08-004 | AC-S08-011 (unitario) | pendiente |
| REQ-S08-047 | MUST | BEH-S08-023 | — | AC-S08-012 (manual) | pendiente |
| REQ-S08-048 | MUST | BEH-S08-024 | — | AC-S08-013 (unitario) | pendiente |
| REQ-S08-049 | MUST | BEH-S08-006 | — | AC-S08-004 (manual) | pendiente |
| REQ-S08-050 | MUST | BEH-S08-025 | — | AC-S08-014 (integracion) | pendiente |
| REQ-S08-051 | MUST | BEH-S08-025 | — | AC-S08-014 (integracion) | pendiente |
| REQ-S08-052 | MUST | BEH-S08-026 | — | AC-S08-015 (integracion) | pendiente |
| REQ-S08-053 | MUST | BEH-S08-026 | — | AC-S08-015 (integracion) | pendiente |
| REQ-S08-054 | MUST | BEH-S08-026 | — | AC-S08-015 (integracion) | pendiente |
| REQ-S08-055 | MUST | BEH-S08-027 | — | AC-S08-015 (integracion) | pendiente |
| REQ-S08-056 | MUST | BEH-S08-028 | — | AC-S08-015 (integracion) | pendiente |
| REQ-S08-057 | MUST | BEH-S08-022, BEH-S08-029 | — | AC-S08-011 (unitario) | pendiente |

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
