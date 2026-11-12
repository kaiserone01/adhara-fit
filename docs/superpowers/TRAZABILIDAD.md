# Trazabilidad de specs

<!-- Generado por `node tools/spec-lint.mjs --write`. No editar a mano. -->

Cadena: **REQ → BEH → INV → AC → test**. Una celda "—" indica que no hay elemento enlazado.

## S-00 — Fundaciones del repo: copia limpia, exclusiones, CI, entorno local y secretos (borrador)

Archivo: `S-00-fundaciones-del-repo.md` · REQ: 26 · BEH: 21 · INV: 6 · AC: 18

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S00-001 | MUST | BEH-S00-001, BEH-S00-007 | INV-S00-005 | AC-S00-001 (integracion), AC-S00-009 (manual), AC-S00-013 (integracion), AC-S00-014 (manual) | tools/verificar-repo.test.mjs; pendiente |
| REQ-S00-002 | MUST | BEH-S00-001 | INV-S00-001 | AC-S00-001 (integracion), AC-S00-002 (integracion), AC-S00-009 (manual), AC-S00-013 (integracion), AC-S00-014 (manual) | tools/verificar-repo.test.mjs; pendiente |
| REQ-S00-003 | MUST | BEH-S00-004 | INV-S00-001 | AC-S00-002 (integracion) | tools/verificar-repo.test.mjs |
| REQ-S00-004 | MUST | BEH-S00-001 | INV-S00-006 | AC-S00-001 (integracion), AC-S00-003 (unitario), AC-S00-004 (unitario), AC-S00-009 (manual), AC-S00-013 (integracion), AC-S00-014 (manual) | tools/verificar-repo.test.mjs; pendiente |
| REQ-S00-005 | MUST | BEH-S00-001 | INV-S00-006 | AC-S00-001 (integracion), AC-S00-003 (unitario), AC-S00-004 (unitario), AC-S00-009 (manual), AC-S00-013 (integracion), AC-S00-014 (manual) | tools/verificar-repo.test.mjs; pendiente |
| REQ-S00-006 | MUST | BEH-S00-005 | INV-S00-003 | AC-S00-005 (unitario) | tools/verificar-env.test.mjs |
| REQ-S00-007 | MUST | BEH-S00-002, BEH-S00-006, BEH-S00-014 | INV-S00-002 | AC-S00-006 (integracion), AC-S00-007 (e2e), AC-S00-011 (e2e) | tools/verificar-gitleaks.test.mjs; pendiente |
| REQ-S00-008 | MUST | BEH-S00-002 | — | AC-S00-007 (e2e), AC-S00-011 (e2e) | pendiente |
| REQ-S00-009 | MUST | BEH-S00-003, BEH-S00-012, BEH-S00-013 | — | AC-S00-005 (unitario), AC-S00-008 (manual) | tools/verificar-env.test.mjs; pendiente |
| REQ-S00-010 | SHOULD | BEH-S00-003 | — | AC-S00-008 (manual) | pendiente |
| REQ-S00-011 | MUST | BEH-S00-007 | — | AC-S00-001 (integracion), AC-S00-009 (manual) | tools/verificar-repo.test.mjs; pendiente |
| REQ-S00-012 | MUST | BEH-S00-010 | — | AC-S00-010 (unitario) | tools/verificar-repo.test.mjs |
| REQ-S00-013 | MUST | BEH-S00-002 | — | AC-S00-007 (e2e), AC-S00-011 (e2e) | pendiente |
| REQ-S00-014 | MUST | BEH-S00-015 | INV-S00-004 | AC-S00-012 (unitario) | tools/base-efimera.test.mjs |
| REQ-S00-015 | MUST | BEH-S00-001, BEH-S00-009 | — | AC-S00-001 (integracion), AC-S00-009 (manual), AC-S00-013 (integracion), AC-S00-014 (manual) | tools/verificar-repo.test.mjs; pendiente |
| REQ-S00-016 | MUST | BEH-S00-002, BEH-S00-011 | — | AC-S00-007 (e2e), AC-S00-011 (e2e) | pendiente |
| REQ-S00-017 | MUST | BEH-S00-003 | — | AC-S00-008 (manual) | pendiente |
| REQ-S00-018 | MUST | BEH-S00-003, BEH-S00-013 | INV-S00-003 | AC-S00-005 (unitario), AC-S00-008 (manual) | tools/verificar-env.test.mjs; pendiente |
| REQ-S00-019 | MUST | BEH-S00-008, BEH-S00-015, BEH-S00-018 | INV-S00-004 | AC-S00-012 (unitario) | tools/base-efimera.test.mjs |
| REQ-S00-020 | MUST | BEH-S00-002, BEH-S00-010 | — | AC-S00-007 (e2e), AC-S00-010 (unitario), AC-S00-011 (e2e) | pendiente; tools/verificar-repo.test.mjs |
| REQ-S00-021 | MUST | BEH-S00-001 | INV-S00-002 | AC-S00-001 (integracion), AC-S00-006 (integracion), AC-S00-009 (manual), AC-S00-013 (integracion), AC-S00-014 (manual) | tools/verificar-repo.test.mjs; tools/verificar-gitleaks.test.mjs; pendiente |
| REQ-S00-022 | SHOULD | BEH-S00-017 | — | AC-S00-015 (unitario) | tools/harness-selftest.mjs |
| REQ-S00-023 | MUST | BEH-S00-016 | — | AC-S00-016 (manual) | pendiente |
| REQ-S00-024 | MUST | BEH-S00-019 | — | AC-S00-017 (unitario) | tools/verificar-repo.test.mjs |
| REQ-S00-025 | MUST | BEH-S00-021 | — | AC-S00-018 (integracion) | tools/verificar-repo.test.mjs |
| REQ-S00-026 | MUST | BEH-S00-001, BEH-S00-020 | INV-S00-001 | AC-S00-001 (integracion), AC-S00-002 (integracion), AC-S00-009 (manual), AC-S00-013 (integracion), AC-S00-014 (manual) | tools/verificar-repo.test.mjs; pendiente |
