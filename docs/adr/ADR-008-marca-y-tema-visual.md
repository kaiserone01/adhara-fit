# ADR-008: Marca y tema visual de Adhara Fit

Estado: **propuesto** (2026-11-11) · Confirmar P-15

## Contexto
El base usa el tema "Adrenalina Xtreme": verde `#93e83a` sobre negro verdoso, con tokens `--gx-*` en `packages/theming/tokens.ts`. El logo de Adhara Fit (PDF recibido): rectángulo negro, kettlebell **amarillo** con una "A" negra y el texto "ADHARA FIT" en blanco.

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

## Consecuencias
- (+) Identidad coherente con el local.
- (−) El estado "activo" amarillo es menos intuitivo que verde: validar en pruebas de usabilidad del kiosco; alternativa: mantener verde solo para "OK" semántico.
- El tema sigue **fijo** (no dinámico por organización) como en el base (`TemaOrganizacion` sin consumidor).
