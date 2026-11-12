# ADR-011: Dinero como centavos enteros en el dominio

Estado: **propuesto** (2026-11-12) · Corrige la afirmación "Decimal en dominio" de ADR-003 v0.2

## Contexto
Verificado en el código: la BD usa `Decimal(10,2)`/`Decimal(14,2)`, pero los repositorios convierten con `.toNumber()` (41 usos) y el dominio opera con `number` de JS. `repartirLineasPago` ya trabaja en centavos (`aCentavos`) y `validarLineasDePago` compara con tolerancia (`< 0.01`); el resto del dominio suma y resta flotantes. Con pago único exacto (ADR-010) cualquier error de redondeo se convierte en un cobro rechazado o en una diferencia de arqueo.

## Decisión
1. En el **dominio**, todo importe es un **entero en céntimos** (`Money = number` entero, nombre de tipo `Centimos`), con funciones puras `sumar`, `restar`, `multiplicarPorEnteros`, `formatear`.
2. En la **BD** se conserva `Decimal(10,2)`/`(14,2)`; la conversión ocurre **solo** en la frontera del repositorio (`Decimal ↔ céntimos`), nunca con `Number(x)*100` sin redondear.
3. Los porcentajes (IGV, descuentos futuros) se calculan con redondeo **half-up** y se prueban con casos de borde (S/ 0.01, S/ 0.005, S/ 99.995).
4. La API HTTP expone importes como **cadena decimal** (`"120.50"`) o céntimos enteros, nunca `float` derivado.
5. Un test de propiedad garantiza `sumar(a, b) − b === a` y que el total de un turno es la suma exacta de sus líneas.

## Alternativas
| Alternativa | Contras |
|---|---|
| `Decimal.js` en el dominio | Dependencia nueva en un paquete que hoy es puro; tipos menos simples en tests |
| Mantener `number` con tolerancia | Perpetúa la fuente del error; contradice "sin tolerancia" (ADR-010) |

## Consecuencias
- (+) Cálculos exactos y fáciles de probar; (−) toca todos los casos de uso y tests que usan montos (se hace junto con el renombrado de campos `*USD`, tarea 1.4).
