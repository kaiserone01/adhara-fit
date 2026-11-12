# Trazabilidad de specs

<!-- Generado por `node tools/spec-lint.mjs --write`. No editar a mano. -->

Cadena: **REQ → BEH → INV → AC → test**. Una celda "—" indica que no hay elemento enlazado.

## S-00 — Fundaciones del repo: copia limpia, exclusiones, CI, entorno local y secretos (borrador)

Archivo: `S-00-fundaciones-del-repo.md` · REQ: 15 · BEH: 10 · INV: 5 · AC: 13

| REQ | Prioridad | BEH | INV | AC (método) | Test |
|---|---|---|---|---|---|
| REQ-S00-001 | MUST | BEH-S00-001, BEH-S00-007 | INV-S00-005 | AC-S00-001 (manual), AC-S00-009 (manual), AC-S00-013 (integracion) | pendiente |
| REQ-S00-002 | MUST | BEH-S00-001 | INV-S00-001 | AC-S00-001 (manual), AC-S00-002 (integracion), AC-S00-009 (manual), AC-S00-013 (integracion) | pendiente; tools/verificar-exclusiones.test.mjs |
| REQ-S00-003 | MUST | BEH-S00-004 | INV-S00-001 | AC-S00-002 (integracion) | tools/verificar-exclusiones.test.mjs |
| REQ-S00-004 | MUST | BEH-S00-001 | — | AC-S00-001 (manual), AC-S00-003 (unitario), AC-S00-009 (manual), AC-S00-013 (integracion) | pendiente; tools/verificar-exclusiones.test.mjs |
| REQ-S00-005 | MUST | BEH-S00-001 | — | AC-S00-001 (manual), AC-S00-004 (unitario), AC-S00-009 (manual), AC-S00-013 (integracion) | pendiente; tools/verificar-exclusiones.test.mjs |
| REQ-S00-006 | MUST | BEH-S00-005 | INV-S00-003 | AC-S00-005 (unitario) | tools/verificar-env.test.mjs |
| REQ-S00-007 | MUST | BEH-S00-006 | INV-S00-002 | AC-S00-006 (e2e) | pendiente |
| REQ-S00-008 | MUST | BEH-S00-002 | — | AC-S00-007 (e2e), AC-S00-011 (e2e) | pendiente |
| REQ-S00-009 | MUST | BEH-S00-003 | — | AC-S00-008 (manual) | pendiente |
| REQ-S00-010 | SHOULD | BEH-S00-003 | — | AC-S00-008 (manual) | pendiente |
| REQ-S00-011 | MUST | BEH-S00-007 | — | AC-S00-001 (manual), AC-S00-009 (manual) | pendiente |
| REQ-S00-012 | MUST | BEH-S00-010 | — | AC-S00-010 (unitario) | tools/verificar-exclusiones.test.mjs |
| REQ-S00-013 | MUST | BEH-S00-002 | — | AC-S00-007 (e2e), AC-S00-011 (e2e) | pendiente |
| REQ-S00-014 | MUST | BEH-S00-008 | INV-S00-004 | AC-S00-012 (unitario) | pendiente |
| REQ-S00-015 | MUST | BEH-S00-001, BEH-S00-009 | — | AC-S00-001 (manual), AC-S00-009 (manual), AC-S00-013 (integracion) | pendiente |
