---
description: Redacta una spec S-xx con los cuatro pilares a partir de la plantilla
argument-hint: S-xx <slug>
---
Crea la spec `$ARGUMENTS` (formato `S-xx slug`). Requisitos previos: la puerta G4 aprobada y todos los ADRs de los que depende
**aceptados** por el propietario (si alguno sigue *propuesto*, detente y dilo).

1. Copia `docs/superpowers/specs/_plantilla-spec.md` a `docs/superpowers/specs/S-xx-<slug>.md` con `estado: borrador`.
2. Rellena, en este orden, citando **archivo y línea** (o "no verificado" / "no re-verificado, ver docs/09 §…"):
   0. Contexto y alcance (problema, dentro/fuera, comportamiento actual, supuestos con default).
   1. Requisitos `REQ-Sxx-nnn` en EARS, con prioridad MUST/SHOULD y origen (RF, ADR, DI-/H-).
   2. Comportamiento `BEH-Sxx-nnn` Dado/Cuando/Entonces: feliz, bordes, errores, concurrencia.
   3. Invariantes `INV-Sxx-nnn` con mecanismo de cumplimiento y cómo se detecta la violación.
   4. Criterios de aceptación `AC-Sxx-nnn` binarios, con método y resultado esperado; enlazan REQ/BEH/INV.
   5. Plan de pruebas, migración, riesgos y preguntas abiertas con default.
3. Ejecuta `node tools/spec-lint.mjs` y corrige hasta verde. No marques `aprobada`: eso lo ordena el propietario.
4. Sigue con `/spec-review`.
