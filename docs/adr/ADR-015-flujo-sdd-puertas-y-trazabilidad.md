# ADR-015: Flujo Spec-Driven Development, puertas de aprobación y trazabilidad

Estado: **propuesto** (2026-11-12)

## Contexto
El trabajo sigue Spec-Driven Development: ninguna funcionalidad se implementa sin una spec aprobada por el propietario. El doc 10 (v0.3) y el doc 12 (v0.4) describen el flujo; el doc 10 declara que desde v0.4 el mensaje de apertura es el doc 12.

Hechos en los documentos: (a) el doc 10 nombra las specs `docs/superpowers/specs/AAAA-MM-DD-<tema>.md` y el doc 12 `S-xx-<slug>.md` con ramas `spec/S-xx-<slug>`; (b) los supuestos del doc 01 §7 y del doc 08 usan IDs `S-01…S-10`, que **colisionan** con los IDs de las specs `S-00…S-10` (p. ej. "S-02" es a la vez el supuesto "todo en PEN" y la spec de tiempo); (c) ADR-004 cita "[SUPUESTO S-10]".

## Factores de decisión
- Que cada obligación sea comprobable y trazable de punta a punta.
- Que el propietario decida en puertas claras y no se encadenen etapas.
- Revisión independiente del autor.
- IDs sin ambigüedad.

## Opciones consideradas
| Opción | Contras |
|---|---|
| **A. Puertas G0–G6, specs con cuatro pilares e IDs estables, trazabilidad generada (elegida)** | Más proceso por spec |
| B. Specs por fecha, sin IDs de requisitos (doc 10) | No hay cobertura verificable por herramienta |
| C. Sin puertas, aprobación al final | El error se descubre tarde; contradice la instrucción del propietario |

## Decisión
1. Puertas: G0 pre-flight · G1 arnés · G2 scaffolding · G3 ADRs · G4 constitución y herramientas · G5.xx cada spec · G6 plan global. En cada una el agente entrega la evidencia, la lista de qué comprobó y qué no, y se detiene hasta recibir aprobación escrita.
2. Orden: ADRs revisados → constitución y plantilla → specs S-00…S-10 de una en una → plan global. Una spec no entra en revisión mientras algún ADR del que depende siga *propuesto*.
3. Un ADR solo pasa a `aceptado (confirmado por el propietario, AAAA-MM-DD)` por orden expresa del propietario en el chat, ADR por ADR. El agente nunca lo hace por su cuenta.
4. Spec: estados `borrador | en-revision | aprobada`; cuatro pilares con IDs estables `REQ-Sxx-nnn` (EARS), `BEH-Sxx-nnn` (Dado/Cuando/Entonces), `INV-Sxx-nnn` (con mecanismo de cumplimiento y detección) y `AC-Sxx-nnn` (binarios, con método). Cobertura: todo REQ → ≥ 1 BEH; todo REQ MUST → ≥ 1 AC; todo INV → mecanismo y ≥ 1 AC.
5. `docs/superpowers/TRAZABILIDAD.md` (REQ → BEH → INV → AC → test) se **genera** con `spec-lint`; no se edita a mano.
6. Revisión independiente con subagentes de solo lectura (`spec-reviewer`, `adr-reviewer`) que reciben solo la ruta y la lista de comprobación; su veredicto lo decide el propietario.
7. Nombres: specs `docs/superpowers/specs/S-xx-<slug>.md`; planes `docs/superpowers/plans/AAAA-MM-DD-<tema>.md`; ramas `docs/<tema>`, `spec/S-xx-<slug>`, `chore/<tema>`. Prevalece el doc 12 sobre el doc 10.
8. **Desambiguación de IDs:** en specs, ADRs y documentos nuevos, los supuestos de los docs 01/08 se citan como `SUP-xx` (S-01 → `SUP-01`, S-10 → `SUP-10`); `S-xx` queda reservado a las specs. Los docs importados no se editan.
9. El handoff se actualiza al cerrar cada puerta (ADR-014, ADR-017).

## Consecuencias
- (+) Cobertura y trazabilidad verificables por herramienta; decisiones del propietario explícitas.
- (−) Más pasos por spec; el propietario es cuello de botella en cada puerta (deliberado).
- (−) Hay que mantener la equivalencia `SUP-xx` ↔ `S-xx` de los docs 01/08 (tabla en `docs/superpowers/` al crear la constitución).

## Cómo se valida
- `spec-lint` (G4) con tests: estructura, IDs únicos, referencias, cobertura, ausencia de "TBD/por definir/etc." en `aprobada`, y ADRs citados: deben existir en cualquier estado y estar **aceptados** desde `en-revision` (así se hace cumplir la decisión 2, no solo al aprobar). Un borrador solo avisa.
- `check-handoff` y el CI exigen `handoff.md` en cada rango.
- Invariante: una spec `en-revision` o `aprobada` no cita ADRs en *propuesto* (lo detecta `spec-lint`).

## Reversibilidad
Media: cambiar la nomenclatura de IDs una vez creadas las specs obliga a renombrar referencias; por eso se decide antes de G4.

## Dependencias
- Depende de **ADR-014** (identidad) y **ADR-017** (herramientas). Gobierna la aceptación de **ADR-001…013**.

## Referencias
`docs/10-prompt-claude-code.md` (cabecera, §2.C) · `docs/12-prompt-inicial-claude-code.md` · `docs/01-levantamiento-requerimientos.md` §7 · `docs/08-decisiones-pendientes.md` · `CLAUDE.md` §2–§3.
