# ADR-008: Marca y tema visual de Adhara Fit

Estado: **propuesto** (2026-11-11) · restaurado el 2026-11-12: se había marcado «retirado» por un error mío; el propietario indicó que la marca y el diseño no pueden retirarse · lo amplía ADR-020 · P-15 cerrado (colores confirmados) · espera su «acepto ADR-008»

## Contexto
El base usa el tema "Adrenalina Xtreme": verde `#93e83a` sobre negro verdoso, con tokens `--gx-*` en `packages/theming/tokens.ts`. El logo de Adhara Fit (PDF recibido): rectángulo negro, kettlebell **amarillo** con una "A" negra y el texto "ADHARA FIT" en blanco.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- Identidad de marca de Adhara Fit (colores medidos del PDF recibido; P-15 por confirmar).
- Accesibilidad: contraste AA y no depender solo del color (RNF-10).
- El tema es fijo, no dinámico por organización.

## Decisión
Reemplazar los tokens por la paleta de marca (colores **medidos** del PDF; confirmar con manual de marca):

| Token | Valor | Uso |
|---|---|---|
| `--gx-ground` | `#0F0D0E` | Fondo de página (negro cálido derivado de `#231F20`) |
| `--gx-surface` | `#231F20` | Tarjetas |
| `--gx-surface-2` | `#2E292A` | Elementos anidados |
| `--gx-edge` | `#3D3738` | Bordes |
| `--gx-ink` | `#FFFFFF` | Texto principal |
| `--gx-muted` | `#B5AEAF` | Texto secundario |
| `--gx-accent` | `#FFCB04` | Acento único (botones, foco, estado "activo") |
| `--gx-accent-ink` | `#231F20` | Texto sobre acento |
| `--gx-bad` | `#FF3B4E` | Vencido/error |

- El **estado "activo"** deja de ser verde: se usa el acento amarillo con icono ✓ y texto; el **vencido** sigue en rojo. No depender solo del color (RNF-10): añadir icono y texto.
- Contraste medido (WCAG, cálculo propio): `#231F20` sobre `#FFCB04` = 10,7:1; blanco sobre `#231F20` = 16,3:1; `#B5AEAF` sobre `#231F20` = 7,5:1; `#FF3B4E` sobre `#231F20` = 4,6:1 (pasa AA para texto normal, justo). Todos ≥ 4,5:1; recalcular si se ajustan los valores.
- El logo se incorpora como SVG/PNG en `apps/*/public/branding/`; vectorizar desde el PDF.
- Tipografía: mantener la del base; el logo usa una sans humanista. Evaluar `Open Sans`/similar.

## Alternativas
*Sección añadida en el pase formal F; alternativas inferidas del texto del ADR.*
| Alternativa | Pros | Contras |
|---|---|---|
| **A. Reemplazar los tokens por la paleta de marca (elegida)** | Identidad coherente con el local | El estado "activo" amarillo es menos intuitivo que verde |
| B. Mantener el tema "Adrenalina Xtreme" | Cero trabajo | Es la identidad del cliente anterior |
| C. Paleta de marca, pero verde solo para el "OK" semántico | Estado más intuitivo | Mezcla dos acentos; el ADR la deja como alternativa a validar en pruebas de usabilidad |

## Consecuencias
- (+) Identidad coherente con el local.
- (−) El estado "activo" amarillo es menos intuitivo que verde: validar en pruebas de usabilidad del kiosco; alternativa: mantener verde solo para "OK" semántico.
- El tema sigue **fijo** (no dinámico por organización) como en el base (`TemaOrganizacion` sin consumidor).

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-10 solo cubre retirar la marca anterior; instalar la nueva no tiene spec propia (ver `REVISION-ADR.md` §7).
- **Criterio a fijar:** contraste ≥ 4,5:1 calculado por script para cada par texto/fondo usado. En la revisión G3, `--gx-bad` sobre `--gx-surface-2` dio 4,08:1.

## Reversibilidad
*(Pase formal F.)* Alta: son tokens de diseño.

## Dependencias
*(Pase formal F.)* ADR-009 (qué apps llevan marca), ADR-010 (estados activo/gracia/vencido). Pendiente P-15. Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.

## Enmiendas posteriores (2026-11-12)
*Derivadas de decisiones aceptadas por el propietario (ADR-018, ADR-019, ADR-020). El texto anterior se conserva; donde choca, rige esta sección.*
- `TemaOrganizacion` se elimina (ADR-019); el tema es único por construcción.
- El alcance se amplía y queda subordinado a **ADR-020** (sistema de diseño y rebranding completos). Los colores `#231F20`, `#FFCB04` y `#FFFFFF` quedan confirmados por el kit de logotipo entregado el 2026-11-12 (`docs/design/`); P-15 queda cerrada en lo que respecta a colores.
