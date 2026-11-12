# ADR-001: Adoptar `gym-app` como base de Adhara Fit

Estado: **propuesto** (2026-11-11) · P-01 resuelto (repo propio, 12-nov-2026)

## Contexto
Adhara Fit necesita gestión de membresías, caja y control de acceso en Perú. Existe `kaiserone01/gym-app`: monorepo Next.js 16 + Prisma 7 con dominio hexagonal, caja con turnos y arqueo, abonos, kiosco offline y roles granulares, probado en producción por otro gimnasio (≈ 41 000 líneas, 732 commits). Está acoplado a Venezuela (USD/Bs/BCV, cédula, Caracas) y a multi-sede.

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
