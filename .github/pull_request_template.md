## Resumen
<!-- Qué cambia y por qué, en 2–4 líneas. -->

## Trazabilidad
- **ID de spec / ADR:** <!-- S-xx, ADR-nnn o "n/a (andamiaje)" -->
- **Puerta:** <!-- G0 | G1 | G2 | G3 | G4 | G5.xx | G6 -->

## Lista de verificación
- [ ] Sin trailers en los commits (ni `Co-authored-by`, ni `Claude-Session`, ni leyendas de IA).
- [ ] Commits firmados por el propietario (aparecen como *Verified*).
- [ ] Mensajes de commit en español, una línea, ≤ 100 caracteres.
- [ ] Handoff actualizado (`handoff.md` modificado y `node tools/check-handoff.mjs` en verde).
- [ ] `node tools/harness-selftest.mjs` en verde.
- [ ] Si toca specs: `node tools/spec-lint.mjs` en verde y revisión de `spec-reviewer` pegada en la spec.
- [ ] Sin secretos, correos, rutas personales ni URLs/IDs de sesión en los archivos.

## Qué se comprobó y qué no
<!-- Pega la salida real de lint/autotests. Marca "no verificado" lo que no se pudo comprobar. -->
