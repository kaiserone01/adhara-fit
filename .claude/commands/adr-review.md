---
description: Revisión independiente de ADRs con el subagente adr-reviewer
argument-hint: ruta del ADR o docs/adr
---
Revisa `$ARGUMENTS` de forma independiente.

1. Invoca al subagente `adr-reviewer` con **solo** la ruta y esta lista de comprobación, sin contexto de redacción:
   secciones MADR completas · respaldo en `docs/09` y `docs/11` · reversibilidad · dependencias y contradicciones con otros ADRs ·
   spec e invariante que lo protegen · consistencia de estado (*propuesto* / *aceptado (confirmado por el propietario, fecha)*).
2. Pega su veredicto **sin editarlo** en `docs/adr/REVISION-ADR.md`.
3. Veredicto por ADR: **Listo para aceptar / Requiere cambios / Bloqueado por pregunta**, con la decisión que se necesita del propietario.
4. No cambies ningún estado a *aceptado*: solo el propietario, ADR por ADR, en el chat.
