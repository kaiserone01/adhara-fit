# ADR-003: Moneda única PEN y eliminación del tipo de cambio

Estado: **propuesto** (2026-11-11) · Confirmado el 12-nov-2026: cobro solo en Soles

## Contexto
El repo base trabaja con precios en USD y cobros en USD y bolívares con tasa BCV diaria (`TasaCambio`, worker `actualizar-tasa`, `montoBs`, `tasaCambio`, caja y egresos en doble moneda, vitrina con equivalente en Bs). Perú opera en Soles (PEN) y el requerimiento es "la moneda es Soles".

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
