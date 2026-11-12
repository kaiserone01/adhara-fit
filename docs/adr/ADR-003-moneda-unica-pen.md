# ADR-003: Moneda única PEN y eliminación del tipo de cambio

Estado: **propuesto** (2026-11-11) · Confirmado el 12-nov-2026: cobro solo en Soles

## Contexto
El repo base trabaja con precios en USD y cobros en USD y bolívares con tasa BCV diaria (`TasaCambio`, worker `actualizar-tasa`, `montoBs`, `tasaCambio`, caja y egresos en doble moneda, vitrina con equivalente en Bs). Perú opera en Soles (PEN) y el requerimiento es "la moneda es Soles".

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- Perú opera en Soles; cobro solo en PEN (confirmado el 12-nov-2026).
- Eliminar una dependencia externa (API de tasas) y su clase de errores.
- Simplificar caja y arqueo.
- Irreversibilidad: reintroducir USD exigiría rehacer la conversión.

## Decisión
- Una sola moneda: **PEN**. Los precios y montos pasan a `precio`/`monto` (sin sufijo de moneda).
- Se elimina `TasaCambio`, el worker, `BcvApiAdapter`, `RegistrarTasaManual`, `ConvertirMontoUSDaVES`, `montoBs`, `tasaCambio` en `Pago`/`Egreso`, `MonedaEgreso`, `Sucursal.tasaCambioUSD` y el reloj/tasa del layout.
- `Turno` pasa a un único `fondoInicialEfectivo`.
- Dinero: `Decimal` en BD y **céntimos enteros en el dominio** (ADR-011; el base usa `number` de JS, no `Decimal`), redondeo half-up a 2 decimales, formato `es-PE`.
- Los literales de método de pago de caja (`"Efectivo (USD)"`, `"Efectivo (Bs)"`) se sustituyen por un catálogo con clave estable.

## Alternativas
| Alternativa | Contras |
|---|---|
| **A. Solo PEN (elegida)** | Si luego se acepta USD hay que reintroducir conversión |
| B. Mantener multi-moneda genérica (ISO) | Complejidad permanente para un caso hipotético; 65 archivos con lógica Bs a generalizar |
| C. PEN + USD de referencia | Cambia la semántica del precio; sin demanda declarada |

## Consecuencias
- (+) Se elimina una dependencia externa (API de tasas) y una clase de errores (tasas faltantes, `SinTasaParaFechaError`).
- (+) Caja y arqueo más simples.
- (−) Gran refactor mecánico (esfuerzo L) guiado por el compilador y los tests de dominio.
- (−) Cuasi-irreversible: documentar en el PRD y confirmar con el cliente antes de Fase 1.

## Cómo se valida
*(Pase formal F.)*
- **Specs:** S-03 (dinero y catálogo de métodos) y S-10 (retirada de Venezuela).
- **Invariante a fijar:** el esquema y el código no contienen campos `*USD`/`Bs`, `TasaCambio` ni worker de tasa (consulta al esquema y búsqueda en CI).

## Reversibilidad
*(Pase formal F.)* Baja: el propio ADR la califica de cuasi-irreversible.

## Dependencias
*(Pase formal F.)* ADR-011 (dinero en céntimos; se corrigen mutuamente), ADR-006 (catálogo de métodos, solapado), ADR-010 (orden: abonos antes que moneda), ADR-009 (el worker se elimina). Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.
