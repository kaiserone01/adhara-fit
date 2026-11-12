# Adhara Fit

Sistema web **interno** de gestión para un gimnasio en Perú (un solo local, moneda PEN), en un subdominio, sin sitio público.

Estado: **diseño y fundaciones** con Spec-Driven Development (SDD). Todavía no hay código de producto.

## Por dónde empezar
- `handoff.md`: estado de la sesión, decisiones pendientes y próximos pasos. Se lee primero.
- `CLAUDE.md`: reglas innegociables, puertas de aprobación y protocolo de cierre.
- `docs/00-indice.md`: índice de la documentación (v0.4) y `docs/adr/` con las decisiones.
- `docs/ops/`: guías operativas del propietario (`firma-commits.md`, `github-setup.md`).

## Flujo de trabajo
- `main` protegida; el trabajo va en ramas `docs/<tema>`, `spec/S-xx-<slug>` y `chore/<tema>`, y entra por pull request.
- Commits en español, **una sola línea**, imperativo, ≤ 100 caracteres, sin trailers, firmados por el propietario.
- Cada puerta (G0–G6) requiere aprobación escrita antes de continuar.

## Herramientas (Node ≥ 22, sin dependencias)
```bash
bash scripts/setup-hooks.sh              # activa .githooks en este clon
node tools/harness-selftest.mjs          # autotest del arnés
node tools/check-handoff.mjs             # valida handoff.md
node tools/commit-policy.mjs --range <rev-range>   # política de commits sobre un rango
```
