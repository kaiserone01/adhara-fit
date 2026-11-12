---
description: Crea un ADR nuevo en estado propuesto (formato MADR)
argument-hint: NNN <slug>
---
Crea `docs/adr/ADR-$ARGUMENTS.md` (formato `NNN slug`) con estado **propuesto**. Nunca lo marques como aceptado.

Secciones obligatorias: Estado · Contexto · Factores de decisión · Opciones consideradas · Decisión · Consecuencias ·
Cómo se valida (spec e invariante que lo protegen) · Reversibilidad · Dependencias (ADRs y specs) · Referencias (`docs/09`, `docs/11`, archivo:línea).

Distingue hecho (verificado), decisión y supuesto ("asumido, por validar"). Después ejecuta `/adr-review`.
