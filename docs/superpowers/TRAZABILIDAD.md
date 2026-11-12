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

## S-08 — Registro continuo de cobros: sin turnos, arqueo ni egresos, con reporte diario por método y usuario (aprobada)

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

## S-09 — Eliminar miembro: la baja lógica que oculta al miembro y conserva sus pagos (aprobada)

Archivo: `S-09-eliminar-miembro.md` · REQ: 42 · BEH: 26 · INV: 4 · AC: 12

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S09-001 | MUST | BEH-S09-001 | — | AC-S09-001 (sql) | pendiente |
| REQ-S09-002 | MUST | BEH-S09-001 | — | AC-S09-001 (sql) | pendiente |
| REQ-S09-003 | MUST | BEH-S09-001 | INV-S09-002 | AC-S09-001 (sql) | pendiente |
| REQ-S09-004 | MUST | BEH-S09-001 | — | AC-S09-001 (sql) | pendiente |
| REQ-S09-005 | MUST | BEH-S09-002 | — | AC-S09-002 (integracion) | pendiente |
| REQ-S09-006 | MUST | BEH-S09-002 | — | AC-S09-002 (integracion) | pendiente |
| REQ-S09-007 | MUST | BEH-S09-003 | — | AC-S09-002 (integracion) | pendiente |
| REQ-S09-008 | MUST | BEH-S09-004 | — | AC-S09-003 (integracion) | pendiente |
| REQ-S09-009 | MUST | BEH-S09-005 | — | AC-S09-003 (integracion) | pendiente |
| REQ-S09-010 | MUST | BEH-S09-004 | INV-S09-001 | AC-S09-003 (integracion) | pendiente |
| REQ-S09-011 | MUST | BEH-S09-004, BEH-S09-007 | INV-S09-001 | AC-S09-003 (integracion) | pendiente |
| REQ-S09-012 | MUST | BEH-S09-004, BEH-S09-007 | — | AC-S09-003 (integracion) | pendiente |
| REQ-S09-013 | MUST | BEH-S09-004 | — | AC-S09-003 (integracion) | pendiente |
| REQ-S09-014 | MUST | BEH-S09-026 | — | AC-S09-004 (integracion) | pendiente |
| REQ-S09-015 | MUST | BEH-S09-006 | — | AC-S09-003 (integracion) | pendiente |
| REQ-S09-016 | MUST | BEH-S09-007 | — | AC-S09-003 (integracion) | pendiente |
| REQ-S09-017 | MUST | BEH-S09-008 | — | AC-S09-003 (integracion) | pendiente |
| REQ-S09-018 | MUST | BEH-S09-009, BEH-S09-010, BEH-S09-011, BEH-S09-012 | INV-S09-003 | AC-S09-005 (integracion), AC-S09-007 (integracion) | pendiente |
| REQ-S09-019 | MUST | BEH-S09-013 | — | AC-S09-005 (integracion) | pendiente |
| REQ-S09-020 | MUST | BEH-S09-014 | — | AC-S09-006 (integracion) | pendiente |
| REQ-S09-021 | MUST | BEH-S09-014 | — | AC-S09-006 (integracion) | pendiente |
| REQ-S09-022 | MUST | BEH-S09-014 | — | AC-S09-006 (integracion) | pendiente |
| REQ-S09-023 | MUST | BEH-S09-014 | — | AC-S09-006 (integracion) | pendiente |
| REQ-S09-024 | MUST | BEH-S09-015 | — | AC-S09-006 (integracion) | pendiente |
| REQ-S09-025 | MUST | BEH-S09-010, BEH-S09-016 | INV-S09-003 | AC-S09-005 (integracion), AC-S09-007 (integracion) | pendiente |
| REQ-S09-026 | MUST | BEH-S09-011, BEH-S09-016 | INV-S09-003 | AC-S09-005 (integracion), AC-S09-007 (integracion) | pendiente |
| REQ-S09-027 | MUST | BEH-S09-016 | — | AC-S09-007 (integracion) | pendiente |
| REQ-S09-028 | MUST | BEH-S09-017 | — | AC-S09-007 (integracion) | pendiente |
| REQ-S09-029 | MUST | BEH-S09-018 | — | AC-S09-007 (integracion) | pendiente |
| REQ-S09-030 | MUST | BEH-S09-018 | — | AC-S09-007 (integracion) | pendiente |
| REQ-S09-031 | MUST | BEH-S09-019 | — | AC-S09-007 (integracion) | pendiente |
| REQ-S09-032 | MUST | BEH-S09-020 | — | AC-S09-008 (integracion) | pendiente |
| REQ-S09-033 | MUST | BEH-S09-021 | — | AC-S09-009 (integracion) | pendiente |
| REQ-S09-034 | MUST | BEH-S09-021 | INV-S09-001 | AC-S09-003 (integracion), AC-S09-009 (integracion) | pendiente |
| REQ-S09-035 | MUST | BEH-S09-022 | — | AC-S09-009 (integracion) | pendiente |
| REQ-S09-036 | MUST | BEH-S09-023 | — | AC-S09-010 (manual) | pendiente |
| REQ-S09-037 | MUST | BEH-S09-023 | — | AC-S09-010 (manual) | pendiente |
| REQ-S09-038 | MUST | BEH-S09-023 | — | AC-S09-010 (manual) | pendiente |
| REQ-S09-039 | MUST | BEH-S09-002 | — | AC-S09-002 (integracion) | pendiente |
| REQ-S09-040 | MUST | BEH-S09-024 | INV-S09-004 | AC-S09-011 (unitario) | pendiente |
| REQ-S09-041 | MUST | BEH-S09-024 | INV-S09-004 | AC-S09-011 (unitario) | pendiente |
| REQ-S09-042 | MUST | BEH-S09-025 | — | AC-S09-012 (manual) | pendiente |

## S-10 — Retirar lo venezolano: tasa de cambio, padrón de Excel, bolívares y la marca anterior (aprobada)

Archivo: `S-10-retirar-lo-venezolano.md` · REQ: 34 · BEH: 23 · INV: 5 · AC: 11

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S10-001 | MUST | BEH-S10-001 | INV-S10-001 | AC-S10-001 (sql) | pendiente |
| REQ-S10-002 | MUST | BEH-S10-001 | INV-S10-001 | AC-S10-001 (sql) | pendiente |
| REQ-S10-003 | MUST | BEH-S10-001 | INV-S10-001 | AC-S10-001 (sql) | pendiente |
| REQ-S10-004 | MUST | BEH-S10-001 | INV-S10-001 | AC-S10-001 (sql) | pendiente |
| REQ-S10-005 | MUST | BEH-S10-002 | — | AC-S10-002 (unitario), AC-S10-003 (integracion) | pendiente |
| REQ-S10-006 | MUST | BEH-S10-002 | — | AC-S10-002 (unitario), AC-S10-003 (integracion) | pendiente |
| REQ-S10-007 | MUST | BEH-S10-002 | — | AC-S10-002 (unitario), AC-S10-003 (integracion) | pendiente |
| REQ-S10-008 | MUST | BEH-S10-003 | — | AC-S10-011 (unitario) | pendiente |
| REQ-S10-009 | MUST | BEH-S10-004, BEH-S10-006 | — | AC-S10-003 (integracion) | pendiente |
| REQ-S10-010 | MUST | BEH-S10-005, BEH-S10-006 | — | AC-S10-003 (integracion), AC-S10-005 (integracion) | pendiente |
| REQ-S10-011 | MUST | BEH-S10-007 | INV-S10-002 | AC-S10-001 (sql) | pendiente |
| REQ-S10-012 | MUST | BEH-S10-008 | — | AC-S10-002 (unitario) | pendiente |
| REQ-S10-013 | MUST | BEH-S10-007 | — | AC-S10-001 (sql), AC-S10-002 (unitario) | pendiente |
| REQ-S10-014 | MUST | BEH-S10-008 | — | AC-S10-002 (unitario) | pendiente |
| REQ-S10-015 | MUST | BEH-S10-009 | INV-S10-002 | AC-S10-001 (sql), AC-S10-004 (integracion) | pendiente |
| REQ-S10-016 | MUST | BEH-S10-009 | — | AC-S10-001 (sql), AC-S10-004 (integracion) | pendiente |
| REQ-S10-017 | MUST | BEH-S10-010 | — | AC-S10-004 (integracion) | pendiente |
| REQ-S10-018 | MUST | BEH-S10-011 | — | AC-S10-002 (unitario) | pendiente |
| REQ-S10-019 | MUST | BEH-S10-012 | — | AC-S10-005 (integracion) | pendiente |
| REQ-S10-020 | MUST | BEH-S10-011 | — | AC-S10-002 (unitario) | pendiente |
| REQ-S10-021 | MUST | BEH-S10-013 | INV-S10-004 | AC-S10-005 (integracion) | pendiente |
| REQ-S10-022 | MUST | BEH-S10-014 | — | AC-S10-006 (unitario) | pendiente |
| REQ-S10-023 | MUST | BEH-S10-014 | — | AC-S10-006 (unitario) | pendiente |
| REQ-S10-024 | MUST | BEH-S10-014 | — | AC-S10-006 (unitario) | pendiente |
| REQ-S10-025 | MUST | BEH-S10-015 | — | AC-S10-006 (unitario) | pendiente |
| REQ-S10-026 | MUST | BEH-S10-016 | — | AC-S10-002 (unitario) | pendiente |
| REQ-S10-027 | MUST | BEH-S10-017 | INV-S10-003 | AC-S10-007 (unitario) | pendiente |
| REQ-S10-028 | MUST | BEH-S10-018 | INV-S10-003 | AC-S10-007 (unitario) | pendiente |
| REQ-S10-029 | MUST | BEH-S10-017, BEH-S10-018 | INV-S10-003 | AC-S10-007 (unitario) | pendiente |
| REQ-S10-030 | MUST | BEH-S10-019 | — | AC-S10-008 (unitario) | pendiente |
| REQ-S10-031 | MUST | BEH-S10-020 | — | AC-S10-009 (manual) | pendiente |
| REQ-S10-032 | MUST | BEH-S10-021 | — | AC-S10-010 (unitario) | pendiente |
| REQ-S10-033 | MUST | BEH-S10-003, BEH-S10-022 | INV-S10-005 | AC-S10-011 (unitario) | pendiente |
| REQ-S10-034 | MUST | BEH-S10-023 | — | AC-S10-011 (unitario) | pendiente |

## S-11 — Productos: catálogo y venta con cobro inmediato, sin fiado (aprobada)

Archivo: `S-11-productos-sin-fiado.md` · REQ: 37 · BEH: 21 · INV: 4 · AC: 14

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S11-001 | MUST | BEH-S11-001 | — | AC-S11-001 (integracion) | pendiente |
| REQ-S11-002 | MUST | BEH-S11-003 | INV-S11-002 | AC-S11-003 (integracion) | pendiente |
| REQ-S11-003 | MUST | BEH-S11-001, BEH-S11-002 | — | AC-S11-001 (integracion), AC-S11-002 (integracion) | pendiente |
| REQ-S11-004 | MUST | BEH-S11-002 | — | AC-S11-002 (integracion) | pendiente |
| REQ-S11-005 | MUST | BEH-S11-003 | INV-S11-002 | AC-S11-003 (integracion) | pendiente |
| REQ-S11-006 | MUST | BEH-S11-004 | INV-S11-002 | AC-S11-003 (integracion) | pendiente |
| REQ-S11-007 | MUST | BEH-S11-005 | — | AC-S11-004 (integracion) | pendiente |
| REQ-S11-008 | MUST | BEH-S11-006 | — | AC-S11-004 (integracion) | pendiente |
| REQ-S11-009 | MUST | BEH-S11-007 | — | AC-S11-005 (integracion) | pendiente |
| REQ-S11-010 | MUST | BEH-S11-007 | INV-S11-001 | AC-S11-005 (integracion) | pendiente |
| REQ-S11-011 | MUST | BEH-S11-005 | INV-S11-001 | AC-S11-004 (integracion), AC-S11-005 (integracion) | pendiente |
| REQ-S11-012 | MUST | BEH-S11-008 | — | AC-S11-005 (integracion) | pendiente |
| REQ-S11-013 | MUST | BEH-S11-009 | INV-S11-004 | AC-S11-006 (integracion), AC-S11-012 (unitario), AC-S11-013 (unitario) | pendiente |
| REQ-S11-014 | MUST | BEH-S11-010 | — | AC-S11-006 (integracion) | pendiente |
| REQ-S11-015 | MUST | BEH-S11-010 | — | AC-S11-006 (integracion) | pendiente |
| REQ-S11-016 | MUST | BEH-S11-011, BEH-S11-014 | INV-S11-003 | AC-S11-007 (integracion) | pendiente |
| REQ-S11-017 | MUST | BEH-S11-011, BEH-S11-014 | INV-S11-003 | AC-S11-007 (integracion) | pendiente |
| REQ-S11-018 | MUST | BEH-S11-012 | — | AC-S11-007 (integracion) | pendiente |
| REQ-S11-019 | MUST | BEH-S11-013 | — | AC-S11-007 (integracion) | pendiente |
| REQ-S11-020 | MUST | BEH-S11-014 | INV-S11-003 | AC-S11-007 (integracion) | pendiente |
| REQ-S11-021 | MUST | BEH-S11-009 | — | AC-S11-006 (integracion) | pendiente |
| REQ-S11-022 | MUST | BEH-S11-009 | INV-S11-004 | AC-S11-006 (integracion), AC-S11-012 (unitario), AC-S11-013 (unitario) | pendiente |
| REQ-S11-023 | MUST | BEH-S11-007 | — | AC-S11-005 (integracion) | pendiente |
| REQ-S11-024 | MUST | BEH-S11-007 | — | AC-S11-005 (integracion) | pendiente |
| REQ-S11-025 | MUST | BEH-S11-015 | — | AC-S11-008 (integracion) | pendiente |
| REQ-S11-026 | MUST | BEH-S11-015 | — | AC-S11-008 (integracion) | pendiente |
| REQ-S11-027 | MUST | BEH-S11-016 | — | AC-S11-004 (integracion) | pendiente |
| REQ-S11-028 | MUST | BEH-S11-016 | — | AC-S11-004 (integracion) | pendiente |
| REQ-S11-029 | MUST | BEH-S11-017 | — | AC-S11-009 (integracion) | pendiente |
| REQ-S11-030 | MUST | BEH-S11-017 | — | AC-S11-009 (integracion) | pendiente |
| REQ-S11-031 | MUST | BEH-S11-018 | — | AC-S11-010 (manual) | pendiente |
| REQ-S11-032 | MUST | BEH-S11-018 | — | AC-S11-010 (manual) | pendiente |
| REQ-S11-033 | MUST | BEH-S11-018 | — | AC-S11-010 (manual) | pendiente |
| REQ-S11-034 | MUST | BEH-S11-019 | — | AC-S11-011 (integracion) | pendiente |
| REQ-S11-035 | MUST | BEH-S11-020 | INV-S11-004 | AC-S11-012 (unitario), AC-S11-013 (unitario) | pendiente |
| REQ-S11-036 | MUST | BEH-S11-020 | INV-S11-004 | AC-S11-012 (unitario), AC-S11-013 (unitario) | pendiente |
| REQ-S11-037 | MUST | BEH-S11-021 | — | AC-S11-014 (manual) | pendiente |

## S-12 — Tickets de pago y registro de comprobantes, desarrollados y apagados (aprobada)

Archivo: `S-12-tickets-y-comprobantes.md` · REQ: 62 · BEH: 30 · INV: 5 · AC: 22

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S12-001 | MUST | BEH-S12-001 | — | AC-S12-001 (integracion) | pendiente |
| REQ-S12-002 | MUST | BEH-S12-002 | — | AC-S12-002 (integracion) | pendiente |
| REQ-S12-003 | MUST | BEH-S12-002 | — | AC-S12-002 (integracion) | pendiente |
| REQ-S12-004 | MUST | BEH-S12-002 | — | AC-S12-002 (integracion) | pendiente |
| REQ-S12-005 | MUST | BEH-S12-003 | INV-S12-001 | AC-S12-001 (integracion) | pendiente |
| REQ-S12-006 | MUST | BEH-S12-003 | INV-S12-001 | AC-S12-001 (integracion) | pendiente |
| REQ-S12-007 | MUST | BEH-S12-003 | INV-S12-001 | AC-S12-001 (integracion) | pendiente |
| REQ-S12-008 | MUST | BEH-S12-001 | INV-S12-001 | AC-S12-001 (integracion) | pendiente |
| REQ-S12-009 | MUST | BEH-S12-004 | — | AC-S12-003 (integracion) | pendiente |
| REQ-S12-010 | MUST | BEH-S12-005 | INV-S12-002 | AC-S12-004 (integracion), AC-S12-016 (integracion) | pendiente |
| REQ-S12-011 | MUST | BEH-S12-005 | — | AC-S12-004 (integracion) | pendiente |
| REQ-S12-012 | MUST | BEH-S12-005 | — | AC-S12-004 (integracion) | pendiente |
| REQ-S12-013 | MUST | BEH-S12-006 | INV-S12-002 | AC-S12-004 (integracion), AC-S12-016 (integracion) | pendiente |
| REQ-S12-014 | MUST | BEH-S12-007 | — | AC-S12-005 (integracion) | pendiente |
| REQ-S12-015 | MUST | BEH-S12-005 | — | AC-S12-004 (integracion) | pendiente |
| REQ-S12-016 | MUST | BEH-S12-008, BEH-S12-010 | — | AC-S12-006 (unitario) | pendiente |
| REQ-S12-017 | MUST | BEH-S12-008, BEH-S12-010 | INV-S12-005 | AC-S12-006 (unitario), AC-S12-021 (integracion) | pendiente |
| REQ-S12-018 | MUST | BEH-S12-008 | — | AC-S12-006 (unitario) | pendiente |
| REQ-S12-019 | MUST | BEH-S12-008 | — | AC-S12-006 (unitario) | pendiente |
| REQ-S12-020 | MUST | BEH-S12-009 | — | AC-S12-006 (unitario) | pendiente |
| REQ-S12-021 | MUST | BEH-S12-010 | — | AC-S12-006 (unitario) | pendiente |
| REQ-S12-022 | MUST | BEH-S12-008, BEH-S12-010 | — | AC-S12-006 (unitario) | pendiente |
| REQ-S12-023 | MUST | BEH-S12-008 | — | AC-S12-006 (unitario) | pendiente |
| REQ-S12-024 | MUST | BEH-S12-011 | — | AC-S12-007 (manual) | pendiente |
| REQ-S12-025 | MUST | BEH-S12-011 | — | AC-S12-007 (manual) | pendiente |
| REQ-S12-026 | MUST | BEH-S12-011 | — | AC-S12-007 (manual) | pendiente |
| REQ-S12-027 | MUST | BEH-S12-012 | — | AC-S12-008 (integracion) | pendiente |
| REQ-S12-028 | MUST | BEH-S12-012 | — | AC-S12-008 (integracion) | pendiente |
| REQ-S12-029 | MUST | BEH-S12-013 | — | AC-S12-008 (integracion) | pendiente |
| REQ-S12-030 | MUST | BEH-S12-013 | — | AC-S12-008 (integracion) | pendiente |
| REQ-S12-031 | MUST | BEH-S12-013 | — | AC-S12-008 (integracion) | pendiente |
| REQ-S12-032 | MUST | BEH-S12-014 | — | AC-S12-009 (integracion) | pendiente |
| REQ-S12-033 | MUST | BEH-S12-015 | INV-S12-003 | AC-S12-010 (integracion) | pendiente |
| REQ-S12-034 | MUST | BEH-S12-016 | — | AC-S12-011 (integracion) | pendiente |
| REQ-S12-035 | MUST | BEH-S12-016 | — | AC-S12-011 (integracion), AC-S12-013 (integracion) | pendiente |
| REQ-S12-036 | MUST | BEH-S12-016 | INV-S12-005 | AC-S12-011 (integracion), AC-S12-021 (integracion) | pendiente |
| REQ-S12-037 | MUST | BEH-S12-016 | — | AC-S12-011 (integracion) | pendiente |
| REQ-S12-038 | MUST | BEH-S12-016 | — | AC-S12-011 (integracion) | pendiente |
| REQ-S12-039 | MUST | BEH-S12-017 | — | AC-S12-012 (integracion) | pendiente |
| REQ-S12-040 | MUST | BEH-S12-016 | — | AC-S12-011 (integracion) | pendiente |
| REQ-S12-041 | MUST | BEH-S12-018 | — | AC-S12-013 (integracion) | pendiente |
| REQ-S12-042 | MUST | BEH-S12-018 | — | AC-S12-013 (integracion) | pendiente |
| REQ-S12-043 | MUST | BEH-S12-018 | — | AC-S12-013 (integracion) | pendiente |
| REQ-S12-044 | MUST | BEH-S12-019 | — | AC-S12-014 (unitario) | pendiente |
| REQ-S12-045 | MUST | BEH-S12-018 | — | AC-S12-013 (integracion) | pendiente |
| REQ-S12-046 | MUST | BEH-S12-020 | INV-S12-002 | AC-S12-004 (integracion), AC-S12-015 (integracion), AC-S12-016 (integracion) | pendiente |
| REQ-S12-047 | MUST | BEH-S12-020 | INV-S12-002 | AC-S12-004 (integracion), AC-S12-015 (integracion), AC-S12-016 (integracion) | pendiente |
| REQ-S12-048 | MUST | BEH-S12-020, BEH-S12-021 | — | AC-S12-015 (integracion) | pendiente |
| REQ-S12-049 | MUST | BEH-S12-022 | — | AC-S12-015 (integracion) | pendiente |
| REQ-S12-050 | MUST | BEH-S12-022 | — | AC-S12-015 (integracion) | pendiente |
| REQ-S12-051 | MUST | BEH-S12-023 | — | AC-S12-016 (integracion) | pendiente |
| REQ-S12-052 | MUST | BEH-S12-024 | INV-S12-002 | AC-S12-004 (integracion), AC-S12-016 (integracion) | pendiente |
| REQ-S12-053 | MUST | BEH-S12-025 | — | AC-S12-016 (integracion) | pendiente |
| REQ-S12-054 | MUST | BEH-S12-025 | — | AC-S12-016 (integracion) | pendiente |
| REQ-S12-055 | MUST | BEH-S12-026 | — | AC-S12-017 (manual) | pendiente |
| REQ-S12-056 | MUST | BEH-S12-027 | INV-S12-004 | AC-S12-018 (integracion), AC-S12-020 (unitario) | pendiente |
| REQ-S12-057 | MUST | BEH-S12-027 | — | AC-S12-018 (integracion) | pendiente |
| REQ-S12-058 | MUST | BEH-S12-028 | — | AC-S12-019 (integracion) | pendiente |
| REQ-S12-059 | MUST | BEH-S12-029 | INV-S12-004 | AC-S12-020 (unitario) | pendiente |
| REQ-S12-060 | MUST | BEH-S12-029 | INV-S12-004 | AC-S12-020 (unitario) | pendiente |
| REQ-S12-061 | MUST | BEH-S12-029 | INV-S12-004 | AC-S12-020 (unitario) | pendiente |
| REQ-S12-062 | MUST | BEH-S12-030 | — | AC-S12-022 (manual) | pendiente |

## S-13 — Consentimiento de datos personales, política de privacidad y aviso del Libro de Reclamaciones (aprobada)

Archivo: `S-13-consentimiento-y-aviso-legal.md` · REQ: 51 · BEH: 29 · INV: 5 · AC: 20

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S13-001 | MUST | BEH-S13-001 | INV-S13-002 | AC-S13-001 (integracion), AC-S13-003 (integracion) | pendiente |
| REQ-S13-002 | MUST | BEH-S13-002 | INV-S13-005 | AC-S13-002 (sql) | pendiente |
| REQ-S13-003 | MUST | BEH-S13-001 | INV-S13-002 | AC-S13-001 (integracion), AC-S13-003 (integracion) | pendiente |
| REQ-S13-004 | MUST | BEH-S13-001 | — | AC-S13-001 (integracion) | pendiente |
| REQ-S13-005 | MUST | BEH-S13-003 | — | AC-S13-001 (integracion) | pendiente |
| REQ-S13-006 | MUST | BEH-S13-004 | INV-S13-002 | AC-S13-003 (integracion) | pendiente |
| REQ-S13-007 | MUST | BEH-S13-005 | — | AC-S13-004 (manual) | pendiente |
| REQ-S13-008 | MUST | BEH-S13-006 | — | AC-S13-004 (manual) | pendiente |
| REQ-S13-009 | MUST | BEH-S13-006 | — | AC-S13-004 (manual) | pendiente |
| REQ-S13-010 | MUST | BEH-S13-006 | — | AC-S13-004 (manual) | pendiente |
| REQ-S13-011 | MUST | BEH-S13-007 | — | AC-S13-005 (manual) | pendiente |
| REQ-S13-012 | MUST | BEH-S13-007 | — | AC-S13-005 (manual) | pendiente |
| REQ-S13-013 | MUST | BEH-S13-008 | INV-S13-001 | AC-S13-006 (sql) | pendiente |
| REQ-S13-014 | MUST | BEH-S13-008 | INV-S13-001 | AC-S13-006 (sql) | pendiente |
| REQ-S13-015 | MUST | BEH-S13-008 | INV-S13-001 | AC-S13-006 (sql) | pendiente |
| REQ-S13-016 | MUST | BEH-S13-009 | — | AC-S13-007 (integracion) | pendiente |
| REQ-S13-017 | MUST | BEH-S13-010 | — | AC-S13-007 (integracion) | pendiente |
| REQ-S13-018 | MUST | BEH-S13-011 | — | AC-S13-004 (manual), AC-S13-007 (integracion) | pendiente |
| REQ-S13-019 | MUST | BEH-S13-010 | — | AC-S13-007 (integracion) | pendiente |
| REQ-S13-020 | MUST | BEH-S13-010 | — | AC-S13-007 (integracion) | pendiente |
| REQ-S13-021 | MUST | BEH-S13-012 | — | AC-S13-008 (integracion) | pendiente |
| REQ-S13-022 | MUST | BEH-S13-013 | INV-S13-001 | AC-S13-006 (sql), AC-S13-008 (integracion) | pendiente |
| REQ-S13-023 | MUST | BEH-S13-015 | — | AC-S13-009 (integracion) | pendiente |
| REQ-S13-024 | MUST | BEH-S13-014 | INV-S13-001 | AC-S13-006 (sql), AC-S13-008 (integracion) | pendiente |
| REQ-S13-025 | MUST | BEH-S13-016 | — | AC-S13-010 (integracion) | pendiente |
| REQ-S13-026 | MUST | BEH-S13-017 | — | AC-S13-010 (integracion) | pendiente |
| REQ-S13-027 | MUST | BEH-S13-016 | INV-S13-003 | AC-S13-010 (integracion), AC-S13-011 (integracion) | pendiente |
| REQ-S13-028 | MUST | BEH-S13-016 | — | AC-S13-010 (integracion) | pendiente |
| REQ-S13-029 | MUST | BEH-S13-018 | INV-S13-003 | AC-S13-011 (integracion) | pendiente |
| REQ-S13-030 | MUST | BEH-S13-019, BEH-S13-020 | — | AC-S13-012 (integracion) | pendiente |
| REQ-S13-031 | MUST | BEH-S13-019 | — | AC-S13-012 (integracion) | pendiente |
| REQ-S13-032 | MUST | BEH-S13-019 | — | AC-S13-012 (integracion) | pendiente |
| REQ-S13-033 | MUST | BEH-S13-019 | — | AC-S13-012 (integracion) | pendiente |
| REQ-S13-034 | MUST | BEH-S13-019 | — | AC-S13-012 (integracion) | pendiente |
| REQ-S13-035 | MUST | BEH-S13-011 | — | AC-S13-004 (manual), AC-S13-007 (integracion) | pendiente |
| REQ-S13-036 | MUST | BEH-S13-021 | — | AC-S13-013 (integracion) | pendiente |
| REQ-S13-037 | MUST | BEH-S13-022 | — | AC-S13-013 (integracion), AC-S13-014 (manual) | pendiente |
| REQ-S13-038 | MUST | BEH-S13-022 | — | AC-S13-013 (integracion), AC-S13-014 (manual) | pendiente |
| REQ-S13-039 | MUST | BEH-S13-023 | — | AC-S13-015 (unitario) | pendiente |
| REQ-S13-040 | MUST | BEH-S13-024 | INV-S13-004 | AC-S13-017 (integracion) | pendiente |
| REQ-S13-041 | MUST | BEH-S13-025 | INV-S13-004 | AC-S13-017 (integracion), AC-S13-018 (integracion) | pendiente |
| REQ-S13-042 | MUST | BEH-S13-025 | — | AC-S13-018 (integracion) | pendiente |
| REQ-S13-043 | MUST | BEH-S13-026 | — | AC-S13-018 (integracion) | pendiente |
| REQ-S13-044 | MUST | BEH-S13-024 | INV-S13-004 | AC-S13-017 (integracion) | pendiente |
| REQ-S13-045 | MUST | BEH-S13-027 | — | AC-S13-016 (integracion) | pendiente |
| REQ-S13-046 | MUST | BEH-S13-028 | — | AC-S13-019 (unitario) | pendiente |
| REQ-S13-047 | MUST | BEH-S13-028 | — | AC-S13-019 (unitario) | pendiente |
| REQ-S13-048 | MUST | BEH-S13-028 | — | AC-S13-019 (unitario) | pendiente |
| REQ-S13-049 | MUST | BEH-S13-029 | — | AC-S13-020 (integracion) | pendiente |
| REQ-S13-050 | MUST | BEH-S13-010 | — | AC-S13-007 (integracion) | pendiente |
| REQ-S13-051 | MUST | BEH-S13-016 | — | AC-S13-010 (integracion) | pendiente |

## S-14 — Reportes: morosos, por vencer, ingresos por período e histórico imprimible (en-revision)

Archivo: `S-14-reportes.md` · REQ: 54 · BEH: 25 · INV: 4 · AC: 17

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S14-001 | MUST | BEH-S14-001 | INV-S14-003 | AC-S14-001 (integracion) | pendiente |
| REQ-S14-002 | MUST | BEH-S14-001 | — | AC-S14-001 (integracion) | pendiente |
| REQ-S14-003 | MUST | BEH-S14-002 | — | AC-S14-001 (integracion) | pendiente |
| REQ-S14-004 | MUST | BEH-S14-001, BEH-S14-003 | INV-S14-001 | AC-S14-001 (integracion) | pendiente |
| REQ-S14-005 | MUST | BEH-S14-003 | INV-S14-003 | AC-S14-001 (integracion) | pendiente |
| REQ-S14-006 | MUST | BEH-S14-004 | — | AC-S14-002 (unitario) | pendiente |
| REQ-S14-007 | MUST | BEH-S14-003 | — | AC-S14-001 (integracion) | pendiente |
| REQ-S14-008 | MUST | BEH-S14-005 | — | AC-S14-003 (integracion) | pendiente |
| REQ-S14-009 | MUST | BEH-S14-005 | — | AC-S14-003 (integracion) | pendiente |
| REQ-S14-010 | MUST | BEH-S14-005 | — | AC-S14-003 (integracion) | pendiente |
| REQ-S14-011 | MUST | BEH-S14-006 | — | AC-S14-003 (integracion) | pendiente |
| REQ-S14-012 | MUST | BEH-S14-007 | — | AC-S14-003 (integracion) | pendiente |
| REQ-S14-013 | MUST | BEH-S14-008 | — | AC-S14-003 (integracion) | pendiente |
| REQ-S14-014 | MUST | BEH-S14-009 | — | AC-S14-004 (integracion) | pendiente |
| REQ-S14-015 | MUST | BEH-S14-009 | — | AC-S14-004 (integracion) | pendiente |
| REQ-S14-016 | MUST | BEH-S14-010, BEH-S14-012, BEH-S14-023 | INV-S14-002 | AC-S14-005 (integracion), AC-S14-006 (integracion), AC-S14-013 (integracion) | pendiente |
| REQ-S14-017 | MUST | BEH-S14-010 | — | AC-S14-005 (integracion) | pendiente |
| REQ-S14-018 | MUST | BEH-S14-011 | INV-S14-002 | AC-S14-005 (integracion), AC-S14-006 (integracion) | pendiente |
| REQ-S14-019 | MUST | BEH-S14-011 | INV-S14-002 | AC-S14-005 (integracion), AC-S14-006 (integracion) | pendiente |
| REQ-S14-020 | MUST | BEH-S14-012, BEH-S14-023 | INV-S14-001 | AC-S14-001 (integracion), AC-S14-006 (integracion), AC-S14-013 (integracion) | pendiente |
| REQ-S14-021 | MUST | BEH-S14-012 | INV-S14-001 | AC-S14-001 (integracion), AC-S14-006 (integracion) | pendiente |
| REQ-S14-022 | MUST | BEH-S14-013 | — | AC-S14-007 (unitario) | pendiente |
| REQ-S14-023 | MUST | BEH-S14-010 | INV-S14-002 | AC-S14-005 (integracion) | pendiente |
| REQ-S14-024 | MUST | BEH-S14-014 | INV-S14-002 | AC-S14-005 (integracion), AC-S14-006 (integracion) | pendiente |
| REQ-S14-025 | MUST | BEH-S14-015 | INV-S14-002 | AC-S14-005 (integracion), AC-S14-008 (integracion) | pendiente |
| REQ-S14-026 | MUST | BEH-S14-015 | — | AC-S14-008 (integracion) | pendiente |
| REQ-S14-027 | MUST | BEH-S14-009 | — | AC-S14-004 (integracion) | pendiente |
| REQ-S14-028 | MUST | BEH-S14-016 | — | AC-S14-009 (manual) | pendiente |
| REQ-S14-029 | MUST | BEH-S14-016 | — | AC-S14-009 (manual) | pendiente |
| REQ-S14-030 | MUST | BEH-S14-016 | — | AC-S14-009 (manual) | pendiente |
| REQ-S14-031 | MUST | BEH-S14-017 | — | AC-S14-009 (manual), AC-S14-010 (manual) | pendiente |
| REQ-S14-032 | MUST | BEH-S14-017 | — | AC-S14-009 (manual), AC-S14-010 (manual), AC-S14-016 (integracion) | pendiente |
| REQ-S14-033 | MUST | BEH-S14-018 | INV-S14-004 | AC-S14-014 (unitario), AC-S14-016 (integracion) | pendiente |
| REQ-S14-034 | MUST | BEH-S14-019 | — | AC-S14-011 (sql) | pendiente |
| REQ-S14-035 | MUST | BEH-S14-020 | — | AC-S14-012 (integracion) | pendiente |
| REQ-S14-036 | MUST | BEH-S14-017 | — | AC-S14-009 (manual), AC-S14-010 (manual) | pendiente |
| REQ-S14-037 | MUST | BEH-S14-017 | — | AC-S14-009 (manual), AC-S14-010 (manual), AC-S14-016 (integracion) | pendiente |
| REQ-S14-038 | MUST | BEH-S14-021 | INV-S14-004 | AC-S14-014 (unitario) | pendiente |
| REQ-S14-039 | MUST | BEH-S14-021 | INV-S14-004 | AC-S14-014 (unitario) | pendiente |
| REQ-S14-040 | MUST | BEH-S14-021 | INV-S14-004 | AC-S14-014 (unitario) | pendiente |
| REQ-S14-041 | MUST | BEH-S14-022 | — | AC-S14-015 (manual) | pendiente |
| REQ-S14-042 | MUST | BEH-S14-009 | — | AC-S14-004 (integracion) | pendiente |
| REQ-S14-043 | MUST | BEH-S14-018 | — | AC-S14-016 (integracion) | pendiente |
| REQ-S14-044 | MUST | BEH-S14-006 | — | AC-S14-003 (integracion) | pendiente |
| REQ-S14-045 | MUST | BEH-S14-007 | — | AC-S14-003 (integracion) | pendiente |
| REQ-S14-046 | MUST | BEH-S14-010 | — | AC-S14-005 (integracion) | pendiente |
| REQ-S14-047 | MUST | BEH-S14-015 | INV-S14-002 | AC-S14-005 (integracion), AC-S14-008 (integracion) | pendiente |
| REQ-S14-048 | MUST | BEH-S14-016 | — | AC-S14-009 (manual) | pendiente |
| REQ-S14-049 | MUST | BEH-S14-017 | — | AC-S14-009 (manual), AC-S14-010 (manual) | pendiente |
| REQ-S14-050 | MUST | BEH-S14-017 | — | AC-S14-009 (manual), AC-S14-010 (manual) | pendiente |
| REQ-S14-051 | MUST | BEH-S14-024 | — | AC-S14-016 (integracion) | pendiente |
| REQ-S14-052 | MUST | BEH-S14-019 | — | AC-S14-011 (sql) | pendiente |
| REQ-S14-053 | MUST | BEH-S14-017 | — | AC-S14-009 (manual), AC-S14-010 (manual) | pendiente |
| REQ-S14-054 | MUST | BEH-S14-005, BEH-S14-025 | — | AC-S14-003 (integracion), AC-S14-017 (unitario) | pendiente |

## S-15 — Línea base de la base de datos y datos iniciales de Adhara Fit (aprobada)

Archivo: `S-15-linea-base-y-datos-iniciales.md` · REQ: 44 · BEH: 22 · INV: 4 · AC: 16

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S15-001 | MUST | BEH-S15-001 | INV-S15-003 | AC-S15-001 (integracion), AC-S15-002 (integracion) | pendiente |
| REQ-S15-002 | MUST | BEH-S15-001 | INV-S15-003 | AC-S15-001 (integracion), AC-S15-002 (integracion) | pendiente |
| REQ-S15-003 | MUST | BEH-S15-002 | INV-S15-003 | AC-S15-001 (integracion), AC-S15-002 (integracion) | pendiente |
| REQ-S15-004 | MUST | BEH-S15-002 | INV-S15-003 | AC-S15-001 (integracion), AC-S15-002 (integracion) | pendiente |
| REQ-S15-005 | MUST | BEH-S15-003 | — | AC-S15-003 (sql) | pendiente |
| REQ-S15-006 | MUST | BEH-S15-004 | — | AC-S15-003 (sql) | pendiente |
| REQ-S15-007 | MUST | BEH-S15-005 | — | AC-S15-003 (sql) | pendiente |
| REQ-S15-008 | MUST | BEH-S15-006 | — | AC-S15-004 (unitario) | pendiente |
| REQ-S15-009 | MUST | BEH-S15-006 | — | AC-S15-004 (unitario) | pendiente |
| REQ-S15-010 | MUST | BEH-S15-007 | — | AC-S15-005 (integracion) | pendiente |
| REQ-S15-011 | MUST | BEH-S15-008 | — | AC-S15-006 (integracion) | pendiente |
| REQ-S15-012 | MUST | BEH-S15-009 | — | AC-S15-005 (integracion) | pendiente |
| REQ-S15-013 | MUST | BEH-S15-009 | — | AC-S15-005 (integracion) | pendiente |
| REQ-S15-014 | MUST | BEH-S15-010 | — | AC-S15-007 (integracion) | pendiente |
| REQ-S15-015 | MUST | BEH-S15-006 | — | AC-S15-004 (unitario) | pendiente |
| REQ-S15-016 | MUST | BEH-S15-011 | — | AC-S15-008 (unitario) | pendiente |
| REQ-S15-017 | MUST | BEH-S15-011 | — | AC-S15-008 (unitario) | pendiente |
| REQ-S15-018 | MUST | BEH-S15-011 | — | AC-S15-008 (unitario) | pendiente |
| REQ-S15-019 | MUST | BEH-S15-012, BEH-S15-019 | — | AC-S15-009 (integracion), AC-S15-013 (integracion) | pendiente |
| REQ-S15-020 | MUST | BEH-S15-012, BEH-S15-019 | — | AC-S15-009 (integracion), AC-S15-013 (integracion) | pendiente |
| REQ-S15-021 | MUST | BEH-S15-010 | — | AC-S15-007 (integracion) | pendiente |
| REQ-S15-022 | MUST | BEH-S15-012 | INV-S15-001 | AC-S15-009 (integracion), AC-S15-012 (integracion) | pendiente |
| REQ-S15-023 | MUST | BEH-S15-012 | INV-S15-002 | AC-S15-009 (integracion), AC-S15-010 (integracion) | pendiente |
| REQ-S15-024 | MUST | BEH-S15-012 | INV-S15-002 | AC-S15-009 (integracion), AC-S15-010 (integracion) | pendiente |
| REQ-S15-025 | MUST | BEH-S15-012 | — | AC-S15-009 (integracion) | pendiente |
| REQ-S15-026 | MUST | BEH-S15-013 | INV-S15-001 | AC-S15-009 (integracion), AC-S15-012 (integracion) | pendiente |
| REQ-S15-027 | MUST | BEH-S15-013 | INV-S15-001 | AC-S15-009 (integracion), AC-S15-012 (integracion) | pendiente |
| REQ-S15-028 | MUST | BEH-S15-013 | INV-S15-001 | AC-S15-009 (integracion), AC-S15-012 (integracion) | pendiente |
| REQ-S15-029 | MUST | BEH-S15-014 | INV-S15-001 | AC-S15-010 (integracion), AC-S15-012 (integracion) | pendiente |
| REQ-S15-030 | MUST | BEH-S15-016 | — | AC-S15-011 (integracion) | pendiente |
| REQ-S15-031 | MUST | BEH-S15-016 | — | AC-S15-011 (integracion) | pendiente |
| REQ-S15-032 | MUST | BEH-S15-017 | INV-S15-001 | AC-S15-012 (integracion) | pendiente |
| REQ-S15-033 | MUST | BEH-S15-014, BEH-S15-015 | INV-S15-002 | AC-S15-009 (integracion), AC-S15-010 (integracion) | pendiente |
| REQ-S15-034 | MUST | BEH-S15-014 | — | AC-S15-010 (integracion) | pendiente |
| REQ-S15-035 | MUST | BEH-S15-015 | — | AC-S15-010 (integracion) | pendiente |
| REQ-S15-036 | MUST | BEH-S15-014 | INV-S15-002 | AC-S15-009 (integracion), AC-S15-010 (integracion) | pendiente |
| REQ-S15-037 | MUST | BEH-S15-017, BEH-S15-018, BEH-S15-019 | INV-S15-001 | AC-S15-012 (integracion), AC-S15-013 (integracion) | pendiente |
| REQ-S15-038 | MUST | BEH-S15-017 | — | AC-S15-012 (integracion) | pendiente |
| REQ-S15-039 | MUST | BEH-S15-017 | — | AC-S15-012 (integracion) | pendiente |
| REQ-S15-040 | MUST | BEH-S15-020 | — | AC-S15-014 (unitario) | pendiente |
| REQ-S15-041 | MUST | BEH-S15-021 | INV-S15-004 | AC-S15-015 (unitario) | pendiente |
| REQ-S15-042 | MUST | BEH-S15-021 | INV-S15-004 | AC-S15-015 (unitario) | pendiente |
| REQ-S15-043 | MUST | BEH-S15-021 | INV-S15-004 | AC-S15-015 (unitario) | pendiente |
| REQ-S15-044 | MUST | BEH-S15-022 | — | AC-S15-016 (manual) | pendiente |

## S-17 — Operación y despliegue: producción con TLS, respaldos, restauración, monitoreo y recuperación de acceso (en-revision)

Archivo: `S-17-operacion-y-despliegue.md` · REQ: 78 · BEH: 33 · INV: 5 · AC: 24

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S17-001 | MUST | BEH-S17-001 | — | AC-S17-001 (unitario), AC-S17-002 (unitario) | pendiente |
| REQ-S17-002 | MUST | BEH-S17-001 | — | AC-S17-001 (unitario), AC-S17-002 (unitario) | pendiente |
| REQ-S17-003 | MUST | BEH-S17-001 | — | AC-S17-001 (unitario), AC-S17-002 (unitario) | pendiente |
| REQ-S17-004 | MUST | BEH-S17-001 | — | AC-S17-001 (unitario), AC-S17-002 (unitario) | pendiente |
| REQ-S17-005 | MUST | BEH-S17-001 | — | AC-S17-001 (unitario), AC-S17-002 (unitario) | pendiente |
| REQ-S17-006 | MUST | BEH-S17-001 | — | AC-S17-001 (unitario), AC-S17-002 (unitario) | pendiente |
| REQ-S17-007 | MUST | BEH-S17-002 | — | AC-S17-003 (manual) | pendiente |
| REQ-S17-008 | MUST | BEH-S17-002 | — | AC-S17-003 (manual) | pendiente |
| REQ-S17-009 | MUST | BEH-S17-003 | — | AC-S17-003 (manual) | pendiente |
| REQ-S17-010 | MUST | BEH-S17-004 | — | AC-S17-003 (manual) | pendiente |
| REQ-S17-011 | MUST | BEH-S17-004 | — | AC-S17-003 (manual) | pendiente |
| REQ-S17-012 | MUST | BEH-S17-005 | — | AC-S17-004 (integracion) | pendiente |
| REQ-S17-013 | MUST | BEH-S17-006 | — | AC-S17-004 (integracion) | pendiente |
| REQ-S17-014 | MUST | BEH-S17-006 | — | AC-S17-004 (integracion) | pendiente |
| REQ-S17-015 | MUST | BEH-S17-007 | — | AC-S17-005 (unitario) | pendiente |
| REQ-S17-016 | MUST | BEH-S17-008 | — | AC-S17-006 (integracion) | pendiente |
| REQ-S17-017 | MUST | BEH-S17-008 | — | AC-S17-006 (integracion) | pendiente |
| REQ-S17-018 | MUST | BEH-S17-009 | — | AC-S17-007 (integracion) | pendiente |
| REQ-S17-019 | MUST | BEH-S17-010 | — | AC-S17-008 (integracion) | pendiente |
| REQ-S17-020 | MUST | BEH-S17-010 | — | AC-S17-008 (integracion) | pendiente |
| REQ-S17-021 | MUST | BEH-S17-011 | — | AC-S17-008 (integracion) | pendiente |
| REQ-S17-022 | MUST | BEH-S17-012 | — | AC-S17-008 (integracion) | pendiente |
| REQ-S17-023 | MUST | BEH-S17-008 | — | AC-S17-006 (integracion) | pendiente |
| REQ-S17-024 | MUST | BEH-S17-008 | — | AC-S17-006 (integracion) | pendiente |
| REQ-S17-025 | MUST | BEH-S17-013 | — | AC-S17-009 (unitario) | pendiente |
| REQ-S17-026 | MUST | BEH-S17-014 | INV-S17-003 | AC-S17-010 (integracion) | pendiente |
| REQ-S17-027 | MUST | BEH-S17-014 | INV-S17-003 | AC-S17-010 (integracion) | pendiente |
| REQ-S17-028 | MUST | BEH-S17-014 | — | AC-S17-010 (integracion) | pendiente |
| REQ-S17-029 | MUST | BEH-S17-015 | INV-S17-001 | AC-S17-011 (integracion) | pendiente |
| REQ-S17-030 | MUST | BEH-S17-015 | INV-S17-001 | AC-S17-011 (integracion) | pendiente |
| REQ-S17-031 | MUST | BEH-S17-016 | INV-S17-001 | AC-S17-011 (integracion) | pendiente |
| REQ-S17-032 | MUST | BEH-S17-016 | — | AC-S17-011 (integracion) | pendiente |
| REQ-S17-033 | MUST | BEH-S17-014 | — | AC-S17-010 (integracion) | pendiente |
| REQ-S17-034 | MUST | BEH-S17-017 | — | AC-S17-012 (integracion) | pendiente |
| REQ-S17-035 | MUST | BEH-S17-014, BEH-S17-016 | INV-S17-003 | AC-S17-010 (integracion), AC-S17-011 (integracion) | pendiente |
| REQ-S17-036 | MUST | BEH-S17-018 | INV-S17-003 | AC-S17-010 (integracion), AC-S17-013 (unitario) | pendiente |
| REQ-S17-037 | MUST | BEH-S17-019 | — | AC-S17-014 (integracion) | pendiente |
| REQ-S17-038 | MUST | BEH-S17-019 | — | AC-S17-014 (integracion) | pendiente |
| REQ-S17-039 | MUST | BEH-S17-019 | — | AC-S17-014 (integracion) | pendiente |
| REQ-S17-040 | MUST | BEH-S17-019 | — | AC-S17-014 (integracion) | pendiente |
| REQ-S17-041 | MUST | BEH-S17-019 | — | AC-S17-014 (integracion) | pendiente |
| REQ-S17-042 | MUST | BEH-S17-019 | — | AC-S17-014 (integracion) | pendiente |
| REQ-S17-043 | MUST | BEH-S17-019, BEH-S17-020 | — | AC-S17-014 (integracion), AC-S17-015 (integracion) | pendiente |
| REQ-S17-044 | MUST | BEH-S17-019, BEH-S17-020 | — | AC-S17-014 (integracion), AC-S17-015 (integracion) | pendiente |
| REQ-S17-045 | MUST | BEH-S17-019, BEH-S17-020 | — | AC-S17-014 (integracion), AC-S17-015 (integracion) | pendiente |
| REQ-S17-046 | MUST | BEH-S17-019, BEH-S17-021 | — | AC-S17-014 (integracion), AC-S17-016 (integracion) | pendiente |
| REQ-S17-047 | MUST | BEH-S17-019 | — | AC-S17-014 (integracion), AC-S17-015 (integracion) | pendiente |
| REQ-S17-048 | MUST | BEH-S17-022 | INV-S17-002 | AC-S17-017 (integracion) | pendiente |
| REQ-S17-049 | MUST | BEH-S17-022 | INV-S17-002 | AC-S17-017 (integracion) | pendiente |
| REQ-S17-050 | MUST | BEH-S17-022 | INV-S17-004 | AC-S17-017 (integracion), AC-S17-023 (unitario) | pendiente |
| REQ-S17-051 | MUST | BEH-S17-023 | — | AC-S17-018 (unitario) | pendiente |
| REQ-S17-052 | MUST | BEH-S17-024 | — | AC-S17-002 (unitario) | pendiente |
| REQ-S17-053 | MUST | BEH-S17-001 | — | AC-S17-001 (unitario), AC-S17-002 (unitario) | pendiente |
| REQ-S17-054 | MUST | BEH-S17-025, BEH-S17-026 | — | AC-S17-019 (integracion) | pendiente |
| REQ-S17-055 | MUST | BEH-S17-028 | — | AC-S17-020 (integracion) | pendiente |
| REQ-S17-056 | MUST | BEH-S17-025 | INV-S17-005 | AC-S17-019 (integracion) | pendiente |
| REQ-S17-057 | MUST | BEH-S17-026 | INV-S17-005 | AC-S17-019 (integracion) | pendiente |
| REQ-S17-058 | MUST | BEH-S17-027 | INV-S17-005 | AC-S17-019 (integracion) | pendiente |
| REQ-S17-059 | MUST | BEH-S17-025 | — | AC-S17-019 (integracion) | pendiente |
| REQ-S17-060 | MUST | BEH-S17-025 | — | AC-S17-019 (integracion) | pendiente |
| REQ-S17-061 | MUST | BEH-S17-025 | — | AC-S17-019 (integracion) | pendiente |
| REQ-S17-062 | MUST | BEH-S17-026 | — | AC-S17-019 (integracion) | pendiente |
| REQ-S17-063 | MUST | BEH-S17-029, BEH-S17-030 | — | AC-S17-021 (integracion) | pendiente |
| REQ-S17-064 | MUST | BEH-S17-029 | — | AC-S17-021 (integracion) | pendiente |
| REQ-S17-065 | MUST | BEH-S17-029 | — | AC-S17-021 (integracion) | pendiente |
| REQ-S17-066 | MUST | BEH-S17-029 | — | AC-S17-021 (integracion) | pendiente |
| REQ-S17-067 | MUST | BEH-S17-029 | — | AC-S17-021 (integracion) | pendiente |
| REQ-S17-068 | MUST | BEH-S17-029 | — | AC-S17-021 (integracion) | pendiente |
| REQ-S17-069 | MUST | BEH-S17-030 | — | AC-S17-021 (integracion) | pendiente |
| REQ-S17-070 | MUST | BEH-S17-031 | — | AC-S17-022 (unitario) | pendiente |
| REQ-S17-071 | MUST | BEH-S17-031 | — | AC-S17-022 (unitario) | pendiente |
| REQ-S17-072 | MUST | BEH-S17-031 | — | AC-S17-022 (unitario) | pendiente |
| REQ-S17-073 | MUST | BEH-S17-032 | INV-S17-004 | AC-S17-023 (unitario) | pendiente |
| REQ-S17-074 | MUST | BEH-S17-032 | INV-S17-004 | AC-S17-023 (unitario) | pendiente |
| REQ-S17-075 | MUST | BEH-S17-032 | INV-S17-004 | AC-S17-023 (unitario) | pendiente |
| REQ-S17-076 | MUST | BEH-S17-032 | — | AC-S17-023 (unitario) | pendiente |
| REQ-S17-077 | MUST | BEH-S17-033 | — | AC-S17-024 (manual) | pendiente |
| REQ-S17-078 | MUST | BEH-S17-016 | — | AC-S17-011 (integracion) | pendiente |

## S-18 — Entrenadores: personas del gimnasio sin credenciales, asignadas solo al miembro (aprobada)

Archivo: `S-18-entrenadores.md` · REQ: 39 · BEH: 20 · INV: 4 · AC: 11

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S18-001 | MUST | BEH-S18-001 | — | AC-S18-001 (sql) | pendiente |
| REQ-S18-002 | MUST | BEH-S18-001 | INV-S18-002 | AC-S18-001 (sql) | pendiente |
| REQ-S18-003 | MUST | BEH-S18-001 | INV-S18-001 | AC-S18-001 (sql) | pendiente |
| REQ-S18-004 | MUST | BEH-S18-001 | — | AC-S18-001 (sql) | pendiente |
| REQ-S18-005 | MUST | BEH-S18-001 | INV-S18-002 | AC-S18-001 (sql) | pendiente |
| REQ-S18-006 | MUST | BEH-S18-002 | INV-S18-002 | AC-S18-001 (sql), AC-S18-002 (integracion) | pendiente |
| REQ-S18-007 | MUST | BEH-S18-002 | INV-S18-002 | AC-S18-001 (sql), AC-S18-002 (integracion) | pendiente |
| REQ-S18-008 | MUST | BEH-S18-002 | INV-S18-004 | AC-S18-002 (integracion), AC-S18-010 (unitario) | pendiente |
| REQ-S18-009 | MUST | BEH-S18-002 | — | AC-S18-002 (integracion) | pendiente |
| REQ-S18-010 | MUST | BEH-S18-003 | — | AC-S18-003 (manual) | pendiente |
| REQ-S18-011 | MUST | BEH-S18-004 | — | AC-S18-004 (integracion) | pendiente |
| REQ-S18-012 | MUST | BEH-S18-005 | — | AC-S18-004 (integracion) | pendiente |
| REQ-S18-013 | MUST | BEH-S18-006 | — | AC-S18-004 (integracion) | pendiente |
| REQ-S18-014 | MUST | BEH-S18-007 | — | AC-S18-004 (integracion) | pendiente |
| REQ-S18-015 | MUST | BEH-S18-008 | — | AC-S18-004 (integracion) | pendiente |
| REQ-S18-016 | MUST | BEH-S18-008 | — | AC-S18-004 (integracion) | pendiente |
| REQ-S18-017 | MUST | BEH-S18-009 | — | AC-S18-004 (integracion) | pendiente |
| REQ-S18-018 | MUST | BEH-S18-010 | — | AC-S18-004 (integracion) | pendiente |
| REQ-S18-019 | MUST | BEH-S18-011 | — | AC-S18-005 (integracion) | pendiente |
| REQ-S18-020 | MUST | BEH-S18-012 | — | AC-S18-006 (integracion), AC-S18-007 (manual) | pendiente |
| REQ-S18-021 | MUST | BEH-S18-012 | — | AC-S18-006 (integracion), AC-S18-007 (manual) | pendiente |
| REQ-S18-022 | MUST | BEH-S18-011 | — | AC-S18-005 (integracion) | pendiente |
| REQ-S18-023 | MUST | BEH-S18-004 | — | AC-S18-004 (integracion) | pendiente |
| REQ-S18-024 | MUST | BEH-S18-013 | INV-S18-001, INV-S18-003 | AC-S18-001 (sql), AC-S18-006 (integracion), AC-S18-008 (integracion) | pendiente |
| REQ-S18-025 | MUST | BEH-S18-007 | — | AC-S18-004 (integracion), AC-S18-006 (integracion) | pendiente |
| REQ-S18-026 | MUST | BEH-S18-014 | INV-S18-003 | AC-S18-008 (integracion) | pendiente |
| REQ-S18-027 | MUST | BEH-S18-007 | — | AC-S18-004 (integracion), AC-S18-006 (integracion) | pendiente |
| REQ-S18-028 | MUST | BEH-S18-015 | — | AC-S18-006 (integracion) | pendiente |
| REQ-S18-029 | MUST | BEH-S18-016 | — | AC-S18-007 (manual) | pendiente |
| REQ-S18-030 | MUST | BEH-S18-016 | — | AC-S18-007 (manual) | pendiente |
| REQ-S18-031 | MUST | BEH-S18-012 | — | AC-S18-006 (integracion), AC-S18-007 (manual) | pendiente |
| REQ-S18-032 | MUST | BEH-S18-012 | — | AC-S18-006 (integracion), AC-S18-007 (manual) | pendiente |
| REQ-S18-033 | MUST | BEH-S18-017 | — | AC-S18-007 (manual), AC-S18-010 (unitario) | pendiente |
| REQ-S18-034 | MUST | BEH-S18-017 | INV-S18-004 | AC-S18-007 (manual), AC-S18-010 (unitario) | pendiente |
| REQ-S18-035 | MUST | BEH-S18-018 | — | AC-S18-009 (integracion) | pendiente |
| REQ-S18-036 | MUST | BEH-S18-019 | INV-S18-004 | AC-S18-010 (unitario) | pendiente |
| REQ-S18-037 | MUST | BEH-S18-019 | INV-S18-004 | AC-S18-010 (unitario) | pendiente |
| REQ-S18-038 | MUST | BEH-S18-020 | — | AC-S18-011 (manual) | pendiente |
| REQ-S18-039 | MUST | BEH-S18-014 | INV-S18-003 | AC-S18-008 (integracion) | pendiente |

## S-19 — Sistema de diseño y marca de Adhara Fit (en-revision)

Archivo: `S-19-sistema-de-diseno-y-marca.md` · REQ: 76 · BEH: 32 · INV: 5 · AC: 22

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S19-001 | MUST | BEH-S19-001 | — | AC-S19-001 (unitario) | pendiente |
| REQ-S19-002 | MUST | BEH-S19-001 | — | AC-S19-001 (unitario) | pendiente |
| REQ-S19-003 | MUST | BEH-S19-002 | INV-S19-003 | AC-S19-002 (unitario) | pendiente |
| REQ-S19-004 | MUST | BEH-S19-002 | INV-S19-003 | AC-S19-002 (unitario) | pendiente |
| REQ-S19-005 | MUST | BEH-S19-002 | INV-S19-003 | AC-S19-002 (unitario) | pendiente |
| REQ-S19-006 | MUST | BEH-S19-003 | INV-S19-003 | AC-S19-002 (unitario) | pendiente |
| REQ-S19-007 | MUST | BEH-S19-004 | — | AC-S19-003 (unitario) | pendiente |
| REQ-S19-008 | MUST | BEH-S19-004 | — | AC-S19-003 (unitario) | pendiente |
| REQ-S19-009 | MUST | BEH-S19-005 | — | AC-S19-003 (unitario) | pendiente |
| REQ-S19-010 | MUST | BEH-S19-005 | — | AC-S19-003 (unitario) | pendiente |
| REQ-S19-011 | MUST | BEH-S19-001 | — | AC-S19-001 (unitario) | pendiente |
| REQ-S19-012 | MUST | BEH-S19-006 | — | AC-S19-004 (unitario) | pendiente |
| REQ-S19-013 | MUST | BEH-S19-006, BEH-S19-028 | — | AC-S19-004 (unitario), AC-S19-019 (manual) | pendiente |
| REQ-S19-014 | MUST | BEH-S19-007, BEH-S19-028 | — | AC-S19-004 (unitario), AC-S19-019 (manual) | pendiente |
| REQ-S19-015 | MUST | BEH-S19-007 | — | AC-S19-004 (unitario) | pendiente |
| REQ-S19-016 | MUST | BEH-S19-008, BEH-S19-028 | — | AC-S19-005 (unitario), AC-S19-019 (manual) | pendiente |
| REQ-S19-017 | MUST | BEH-S19-007 | — | AC-S19-004 (unitario) | pendiente |
| REQ-S19-018 | MUST | BEH-S19-009 | — | AC-S19-006 (unitario) | pendiente |
| REQ-S19-019 | MUST | BEH-S19-010 | — | AC-S19-007 (unitario) | pendiente |
| REQ-S19-020 | MUST | BEH-S19-010 | — | AC-S19-007 (unitario) | pendiente |
| REQ-S19-021 | MUST | BEH-S19-010 | — | AC-S19-007 (unitario) | pendiente |
| REQ-S19-022 | MUST | BEH-S19-011 | — | AC-S19-008 (manual) | pendiente |
| REQ-S19-023 | MUST | BEH-S19-011 | — | AC-S19-008 (manual) | pendiente |
| REQ-S19-024 | MUST | BEH-S19-012 | INV-S19-005 | AC-S19-009 (unitario) | pendiente |
| REQ-S19-025 | MUST | BEH-S19-012 | INV-S19-005 | AC-S19-009 (unitario) | pendiente |
| REQ-S19-026 | MUST | BEH-S19-012 | INV-S19-005 | AC-S19-009 (unitario) | pendiente |
| REQ-S19-027 | MUST | BEH-S19-012 | INV-S19-005 | AC-S19-009 (unitario) | pendiente |
| REQ-S19-028 | MUST | BEH-S19-012 | INV-S19-005 | AC-S19-009 (unitario) | pendiente |
| REQ-S19-029 | MUST | BEH-S19-013 | — | AC-S19-010 (manual) | pendiente |
| REQ-S19-030 | MUST | BEH-S19-013 | — | AC-S19-010 (manual) | pendiente |
| REQ-S19-031 | MUST | BEH-S19-014 | — | AC-S19-010 (manual) | pendiente |
| REQ-S19-032 | MUST | BEH-S19-015, BEH-S19-016 | INV-S19-001 | AC-S19-011 (unitario) | pendiente |
| REQ-S19-033 | MUST | BEH-S19-015 | INV-S19-001 | AC-S19-011 (unitario) | pendiente |
| REQ-S19-034 | MUST | BEH-S19-015 | INV-S19-001 | AC-S19-011 (unitario) | pendiente |
| REQ-S19-035 | MUST | BEH-S19-015 | — | AC-S19-011 (unitario), AC-S19-014 (manual) | pendiente |
| REQ-S19-036 | MUST | BEH-S19-017 | INV-S19-002 | AC-S19-012 (unitario) | pendiente |
| REQ-S19-037 | MUST | BEH-S19-017 | INV-S19-002 | AC-S19-012 (unitario) | pendiente |
| REQ-S19-038 | MUST | BEH-S19-017 | INV-S19-002 | AC-S19-012 (unitario) | pendiente |
| REQ-S19-039 | MUST | BEH-S19-017 | INV-S19-002 | AC-S19-012 (unitario) | pendiente |
| REQ-S19-040 | MUST | BEH-S19-017 | INV-S19-002 | AC-S19-012 (unitario) | pendiente |
| REQ-S19-041 | MUST | BEH-S19-018 | — | AC-S19-013 (unitario) | pendiente |
| REQ-S19-042 | MUST | BEH-S19-019 | — | AC-S19-014 (manual) | pendiente |
| REQ-S19-043 | MUST | BEH-S19-020 | INV-S19-004 | AC-S19-015 (unitario) | pendiente |
| REQ-S19-044 | MUST | BEH-S19-020 | INV-S19-004 | AC-S19-015 (unitario) | pendiente |
| REQ-S19-045 | MUST | BEH-S19-020 | INV-S19-004 | AC-S19-015 (unitario) | pendiente |
| REQ-S19-046 | MUST | BEH-S19-020 | INV-S19-004 | AC-S19-014 (manual), AC-S19-015 (unitario) | pendiente |
| REQ-S19-047 | MUST | BEH-S19-021 | — | AC-S19-016 (manual) | pendiente |
| REQ-S19-048 | MUST | BEH-S19-021 | — | AC-S19-016 (manual) | pendiente |
| REQ-S19-049 | MUST | BEH-S19-022 | — | AC-S19-016 (manual), AC-S19-017 (unitario) | pendiente |
| REQ-S19-050 | MUST | BEH-S19-022 | — | AC-S19-016 (manual), AC-S19-017 (unitario) | pendiente |
| REQ-S19-051 | MUST | BEH-S19-023 | — | AC-S19-017 (unitario) | pendiente |
| REQ-S19-052 | MUST | BEH-S19-023 | — | AC-S19-017 (unitario) | pendiente |
| REQ-S19-053 | SHOULD | BEH-S19-024, BEH-S19-032 | — | AC-S19-018 (unitario) | pendiente |
| REQ-S19-054 | SHOULD | BEH-S19-025, BEH-S19-033 | — | AC-S19-018 (unitario) | pendiente |
| REQ-S19-055 | MUST | BEH-S19-026 | — | AC-S19-018 (unitario) | pendiente |
| REQ-S19-056 | MUST | BEH-S19-009 | — | AC-S19-006 (unitario) | pendiente |
| REQ-S19-057 | MUST | BEH-S19-014 | — | AC-S19-010 (manual) | pendiente |
| REQ-S19-058 | MUST | BEH-S19-009 | — | AC-S19-006 (unitario) | pendiente |
| REQ-S19-059 | MUST | BEH-S19-004 | — | AC-S19-003 (unitario) | pendiente |
| REQ-S19-060 | MUST | BEH-S19-005 | — | AC-S19-003 (unitario) | pendiente |
| REQ-S19-061 | MUST | BEH-S19-006 | — | AC-S19-004 (unitario) | pendiente |
| REQ-S19-062 | MUST | BEH-S19-008 | — | AC-S19-005 (unitario) | pendiente |
| REQ-S19-063 | MUST | BEH-S19-018 | — | AC-S19-013 (unitario) | pendiente |
| REQ-S19-064 | MUST | BEH-S19-022 | — | AC-S19-016 (manual), AC-S19-017 (unitario) | pendiente |
| REQ-S19-065 | MUST | BEH-S19-022 | — | AC-S19-016 (manual), AC-S19-017 (unitario) | pendiente |
| REQ-S19-066 | MUST | BEH-S19-009 | — | AC-S19-006 (unitario) | pendiente |
| REQ-S19-067 | MUST | BEH-S19-005 | — | AC-S19-003 (unitario) | pendiente |
| REQ-S19-068 | MUST | BEH-S19-029 | — | AC-S19-020 (unitario) | pendiente |
| REQ-S19-069 | MUST | BEH-S19-029 | — | AC-S19-020 (unitario) | pendiente |
| REQ-S19-070 | MUST | BEH-S19-030 | — | AC-S19-021 (manual) | pendiente |
| REQ-S19-071 | MUST | BEH-S19-031 | — | AC-S19-022 (unitario) | pendiente |
| REQ-S19-072 | MUST | BEH-S19-031 | — | AC-S19-022 (unitario) | pendiente |
| REQ-S19-073 | MUST | BEH-S19-012, BEH-S19-031 | INV-S19-005 | AC-S19-009 (unitario), AC-S19-022 (unitario) | pendiente |
| REQ-S19-074 | MUST | BEH-S19-009 | — | AC-S19-006 (unitario) | pendiente |
| REQ-S19-075 | MUST | BEH-S19-006 | — | AC-S19-004 (unitario) | pendiente |
| REQ-S19-076 | SHOULD | BEH-S19-032 | — | AC-S19-018 (unitario) | pendiente |

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

## S-23 — Un solo rol: el socio o administrador, con acceso total y sin permisos por módulo (aprobada)

Archivo: `S-23-un-solo-rol-administrador.md` · REQ: 36 · BEH: 19 · INV: 4 · AC: 12

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S23-001 | MUST | BEH-S23-001 | INV-S23-002 | AC-S23-001 (sql) | pendiente |
| REQ-S23-002 | MUST | BEH-S23-001 | INV-S23-002 | AC-S23-001 (sql) | pendiente |
| REQ-S23-003 | MUST | BEH-S23-001 | INV-S23-002 | AC-S23-001 (sql) | pendiente |
| REQ-S23-004 | MUST | BEH-S23-001 | INV-S23-002 | AC-S23-001 (sql) | pendiente |
| REQ-S23-005 | MUST | BEH-S23-002 | — | AC-S23-003 (unitario) | pendiente |
| REQ-S23-006 | MUST | BEH-S23-002 | — | AC-S23-003 (unitario) | pendiente |
| REQ-S23-007 | MUST | BEH-S23-002 | — | AC-S23-003 (unitario) | pendiente |
| REQ-S23-008 | MUST | BEH-S23-003 | — | AC-S23-002 (unitario) | pendiente |
| REQ-S23-009 | MUST | BEH-S23-004 | — | AC-S23-004 (integracion) | pendiente |
| REQ-S23-010 | MUST | BEH-S23-005 | INV-S23-003 | AC-S23-004 (integracion) | pendiente |
| REQ-S23-011 | MUST | BEH-S23-005 | INV-S23-003 | AC-S23-004 (integracion) | pendiente |
| REQ-S23-012 | MUST | BEH-S23-006 | — | AC-S23-005 (unitario) | pendiente |
| REQ-S23-013 | MUST | BEH-S23-002 | — | AC-S23-003 (unitario) | pendiente |
| REQ-S23-014 | MUST | BEH-S23-004 | — | AC-S23-004 (integracion) | pendiente |
| REQ-S23-015 | MUST | BEH-S23-004 | — | AC-S23-004 (integracion) | pendiente |
| REQ-S23-016 | MUST | BEH-S23-003 | — | AC-S23-002 (unitario) | pendiente |
| REQ-S23-017 | MUST | BEH-S23-003 | — | AC-S23-002 (unitario) | pendiente |
| REQ-S23-018 | MUST | BEH-S23-007 | — | AC-S23-006 (manual) | pendiente |
| REQ-S23-019 | MUST | BEH-S23-007 | — | AC-S23-006 (manual) | pendiente |
| REQ-S23-020 | MUST | BEH-S23-007 | — | AC-S23-006 (manual) | pendiente |
| REQ-S23-021 | MUST | BEH-S23-008 | — | AC-S23-007 (integracion) | pendiente |
| REQ-S23-022 | MUST | BEH-S23-010 | — | AC-S23-008 (integracion) | pendiente |
| REQ-S23-023 | MUST | BEH-S23-010 | — | AC-S23-008 (integracion) | pendiente |
| REQ-S23-024 | MUST | BEH-S23-011 | — | AC-S23-008 (integracion) | pendiente |
| REQ-S23-025 | MUST | BEH-S23-012, BEH-S23-014 | INV-S23-001 | AC-S23-009 (integracion), AC-S23-010 (integracion) | pendiente |
| REQ-S23-026 | MUST | BEH-S23-013, BEH-S23-014 | INV-S23-001 | AC-S23-009 (integracion), AC-S23-010 (integracion) | pendiente |
| REQ-S23-027 | MUST | BEH-S23-015 | — | AC-S23-007 (integracion) | pendiente |
| REQ-S23-028 | MUST | BEH-S23-009 | — | AC-S23-007 (integracion) | pendiente |
| REQ-S23-029 | MUST | BEH-S23-016 | INV-S23-001 | AC-S23-010 (integracion) | pendiente |
| REQ-S23-030 | MUST | BEH-S23-017 | — | AC-S23-003 (unitario) | pendiente |
| REQ-S23-031 | MUST | BEH-S23-017 | — | AC-S23-003 (unitario) | pendiente |
| REQ-S23-032 | MUST | BEH-S23-007 | — | AC-S23-006 (manual) | pendiente |
| REQ-S23-033 | MUST | BEH-S23-007 | INV-S23-004 | AC-S23-006 (manual), AC-S23-011 (unitario) | pendiente |
| REQ-S23-034 | MUST | BEH-S23-018 | INV-S23-004 | AC-S23-011 (unitario) | pendiente |
| REQ-S23-035 | MUST | BEH-S23-018 | INV-S23-004 | AC-S23-011 (unitario) | pendiente |
| REQ-S23-036 | MUST | BEH-S23-019 | — | AC-S23-012 (manual) | pendiente |
