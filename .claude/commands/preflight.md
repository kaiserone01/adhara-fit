---
description: Pre-flight de E0 (solo lectura): identidad, firma, push y visibilidad, con tabla PASS/FAIL
---
Ejecuta el pre-flight de solo lectura y muestra una tabla PASS/FAIL. No crees ni modifiques archivos.

1. Lee `handoff.md` (si existe) y recuerda el último resultado de pre-flight y la excepción vigente.
2. Ejecuta, sin imprimir secretos:
   - `git config --show-origin --get-regexp '^(user\.|commit\.gpgsign|gpg\.|adhara\.)'`
   - `git config --get core.hooksPath` (debe ser `.githooks`; si no, indica `bash scripts/setup-hooks.sh`)
   - `git remote -v`, `git status -sb`, `git log -1 --format=fuller` (si hay commits)
   - `gh auth status` y `gh api repos/{owner}/{repo} --jq '{private,size}'` (si `gh` existe)
   - nombres (solo nombres) de variables `CLAUDE_*` y de proxy: `printenv | cut -d= -f1 | grep -E '^(CLAUDE|HTTPS?_PROXY|GIT_)'`
3. Evalúa y tabula:

| Control | PASS si… |
|---|---|
| Identidad | `user.name`/`user.email` son los que el propietario confirmó en el chat tras verlos |
| Firma | `commit.gpgsign=true` con `gpg.format` y `user.signingkey` definidos (no leas la clave privada) |
| Push | el remoto y la autenticación son del propietario, no de un proxy o bot de la plataforma |
| Visibilidad | informativo (desde 2026-11-12 el propietario levantó la exigencia de repo privado; no bloquea el push) |
| Hooks | `core.hooksPath=.githooks` y `adhara.ownerEmail` definido (lo configura el propietario) |

4. Si algo falla, detente y ofrece: (A) abrir la sesión en local; (B) modo sin commit; o continuar bajo la excepción
   registrada en `handoff.md` si el propietario ya la autorizó. Nunca escribas `user.*`, `gpg.*`, `credential.*` ni `adhara.ownerEmail`.
