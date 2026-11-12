# ADR-011: Dinero como centavos enteros en el dominio

Estado: **propuesto** (2026-11-12) · Corrige la afirmación "Decimal en dominio" de ADR-003 v0.2

## Contexto
Verificado en el código: la BD usa `Decimal(10,2)`/`Decimal(14,2)`, pero los repositorios convierten con `.toNumber()` (41 usos) y el dominio opera con `number` de JS. `repartirLineasPago` ya trabaja en centavos (`aCentavos`) y `validarLineasDePago` compara con tolerancia (`< 0.01`); el resto del dominio suma y resta flotantes. Con pago único exacto (ADR-010) cualquier error de redondeo se convierte en un cobro rechazado o en una diferencia de arqueo.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- El dominio opera con `number` de JS (41 `.toNumber()`, doc 09 V-04) aunque la BD usa `Decimal`.
- Con pago único exacto (ADR-010) cualquier error de redondeo se convierte en un cobro rechazado o en una diferencia de arqueo.
- Mantener el dominio puro, sin dependencias nuevas.

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

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-03.
- **Pruebas del propio ADR:** casos de borde (S/ 0.01, 0.005, 99.995) y test de propiedad (`sumar(a, b) − b === a`; total de turno = suma exacta de sus líneas).
- **Invariantes a fijar:** todo importe de dominio es un entero en céntimos; la conversión Decimal↔céntimos ocurre solo en el repositorio.

## Reversibilidad
*(Pase formal F.)* Media-baja: toca todos los casos de uso y tests con montos.

## Dependencias
*(Pase formal F.)* ADR-010 (pago exacto); corrige a ADR-003; ADR-016 (tests de propiedad). Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.

## Enmiendas posteriores (2026-11-12)
*Derivadas de decisiones aceptadas por el propietario (ADR-018, ADR-019, ADR-020). El texto anterior se conserva; donde choca, rige esta sección.*
- La propiedad «el total de un turno es la suma exacta de sus líneas» pasa a «el total del día, por método y por usuario, es la suma exacta de los pagos no anulados» (ADR-018: sin turnos ni arqueo).
- `Egreso` se elimina (ADR-018); sus importes dejan de existir en el dominio.
- **Directriz del propietario (2026-11-12), que no equivale a aceptar este ADR:** los importes se manejan en céntimos enteros con 2 decimales y **sin redondeo del monto cobrado**; se cobra el monto exacto (por ejemplo, S/ 15.43 o S/ 29.99) y las billeteras y los terminales POS procesan hasta el último céntimo. Por tanto no se redondea el efectivo a múltiplos de 5 o 10 céntimos. El redondeo *half-up* de la Decisión 3 queda limitado a calcular porcentajes (IGV, descuentos) hasta el céntimo. ADR-011 sigue *propuesto* hasta que el propietario lo acepte.
