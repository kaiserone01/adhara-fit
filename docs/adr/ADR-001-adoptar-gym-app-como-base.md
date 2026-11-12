# ADR-001: Adoptar `gym-app` como base de Adhara Fit

Estado: **propuesto** (2026-11-11) · P-01 resuelto (repo propio, 12-nov-2026)

## Contexto
Adhara Fit necesita gestión de membresías, caja y control de acceso en Perú. Existe `kaiserone01/gym-app`: monorepo Next.js 16 + Prisma 7 con dominio hexagonal, caja con turnos y arqueo, abonos, kiosco offline y roles granulares, probado en producción por otro gimnasio (≈ 41 000 líneas, 732 commits). Está acoplado a Venezuela (USD/Bs/BCV, cédula, Caracas) y a multi-sede.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- Tiempo hasta el MVP (estimación 7-9 semanas, doc 09 §6; orientativa, la suite no se ejecutó).
- Reutilizar el dominio hexagonal y la infraestructura existentes (doc 11 DI-06) y no perder reglas de negocio sutiles (ciclos, abonos, tolerancias).
- Control sobre kiosco y datos; titularidad confirmada (repo propio).
- Costo de la deuda de acoplamiento (Venezuela, multi-sede) y de limpiar PII.

## Decisión
Construir sobre `gym-app`, **adaptándolo** (no reescribiéndolo), conservando stack, arquitectura y convenciones, y retirando lo específico de Venezuela y del cliente anterior.

## Alternativas consideradas
| Alternativa | Pros | Contras |
|---|---|---|
| **A. Adaptar `gym-app` (elegida)** | Reutiliza el dominio hexagonal y la mayor parte de la infraestructura; dominio con 39 archivos de test (≈375 casos, sin ejecutar); ahorra semanas. *(La cifra "~70 %" de v0.2 se retira: no estaba medida.)* | Deuda de acoplamiento; hay que limpiar PII |
| B. Reescribir desde cero | Diseño a medida y sin deuda | 3-4× más tiempo; se pierden reglas de negocio sutiles (ciclos, abonos, tolerancias) |
| C. SaaS comercial de gimnasios | Cero desarrollo | Costo recurrente, menos control sobre kiosco/datos; fuera de lo solicitado |

## Consecuencias
- (+) Time-to-MVP estimado de 7-9 semanas (v0.3; v0.2 decía 5-6).
- (−) Heredamos decisiones del autor (p. ej. `Sucursal` omnipresente) — mitigado por ADR-002.
- Titularidad confirmada: el repo es propio.
- Se mantiene la disciplina plan+spec+ADR+handoff.

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-00 (fundaciones: copia limpia). Invariante a fijar en S-00: el repo nace del árbol de trabajo de `b4352a0` sin historial y no se importa código del Repo A antes de que S-00 esté aprobada.
- **Evidencia:** línea base de tests (ADR-016 §4, tarea 0.7 del doc 07): hasta ejecutarla, "≈375 casos" es un conteo estático (doc 09 V-02).

## Reversibilidad
*(Pase formal F.)* Alta hoy (no hay código importado); baja tras la Fase 1, cuando el diff acumulado hace costoso volver a elegir entre A y B.

## Dependencias
*(Pase formal F.)* Raíz del grafo. Lo ejecuta ADR-005; ADR-002 mitiga su acoplamiento. La línea base exige una copia local del Repo A (ADR-016). Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.
