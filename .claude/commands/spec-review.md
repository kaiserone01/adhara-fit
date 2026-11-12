---
description: Revisión independiente de una spec con el subagente spec-reviewer
argument-hint: ruta de la spec
---
Revisa `$ARGUMENTS` de forma independiente.

1. Verifica antes que `node tools/spec-lint.mjs` está en verde (pega la salida real).
2. Invoca al subagente `spec-reviewer` pasándole **solo** la ruta de la spec y la lista de comprobación de `docs/superpowers/specs/_plantilla-spec.md`
   (no le pases el contexto de redacción ni tu razonamiento).
3. Pega su veredicto **sin editarlo** en un bloque `## Revisión independiente` de la spec.
4. Corrige lo que proceda y vuelve a pasar el lint. Si cambias algo sustantivo, vuelve a invocar al revisor.
5. Entrega el resumen de 10 líneas: decisiones que necesitan aprobación del propietario y defaults asumidos. Espera «S-xx aprobada».
