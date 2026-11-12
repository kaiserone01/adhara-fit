# ADR-011: Política monetaria — Sol peruano (PEN) con dos decimales, aritmética exacta y redondeo por regla

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-12 · Versión 2: reescrito el 2026-11-12 con la política que dictó el propietario en el chat; sustituye a la versión 1 («dinero como céntimos enteros en el dominio»). Corrige la afirmación «Decimal en dominio» de ADR-003 v0.2.

## Contexto
Hechos (verificados en el Repo A, `docs/09` V-04 y `docs/linea-base-tests.md`): la base usa `Decimal(10,2)`, `(12,2)`, `(12,4)` y `(14,2)` en 23 columnas; los repositorios convierten con `.toNumber()` (41 líneas en 11 archivos de `packages/infrastructure`) y el dominio opera con `number` de JS, es decir, con coma flotante binaria. `repartirLineasPago` trabaja en céntimos (`aCentavos`) y `validarLineasDePago` compara con tolerancia (`< 0.01`); el resto suma y resta con flotantes. Con pago único exacto (ADR-010) cualquier error de redondeo se convierte en un cobro rechazado.

Decisión de negocio del propietario (2026-11-12, en el chat): el sistema usa el Sol peruano (PEN) con dos decimales; no hay conversión entre monedas; el sistema solo lleva **registros contables de transacciones, sin la figura tributaria** (las transacciones fiscales están fuera de alcance por ahora) y los algoritmos quedan preparados para funciones futuras si las hubiera.

Hechos externos, **no verificados** contra el texto oficial vigente (búsqueda web del 2026-11-12): la Circular 002-2011-BCRP limita el redondeo a los pagos en efectivo y al monto total a pagar; el BCRP retiró la moneda de 1 céntimo el 1 de mayo de 2011 y la de 5 céntimos a partir del 1 de enero de 2019; las transacciones digitales conservan los céntimos. La regla exacta de redondeo vigente no se pudo confirmar (el ejemplo S/ 9,99 a S/ 9,95 de una nota informativa de 2011 no coincide con un redondeo a múltiplos de S/ 0,10).

## Factores de decisión
- Exactitud del importe: preservarlo y evitar alteraciones involuntarias durante los cálculos.
- Compatibilidad con las convenciones monetarias del Perú y, más adelante, con las tributarias.
- Un solo formato en toda la aplicación (`S/ 120.00`) y representaciones explícitas al intercambiar datos.
- Mantener el dominio puro y sin dependencias nuevas.

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **A. Política del propietario: base con 2 decimales, API en cadena decimal con `PEN`, enteros escalados en el cálculo, redondeo solo por regla (elegida)** | Exacta, sin dependencia nueva, preparada para reglas futuras | Toca todos los casos de uso y pruebas con montos |
| B. `Decimal.js` en el dominio | Aritmética decimal directa | Dependencia nueva en un paquete que hoy es puro |
| C. Mantener `number` con tolerancia | Cero trabajo | Perpetúa el error de coma flotante |

## Decisión
1. **Moneda y precisión:** el Sol peruano (código ISO 4217 `PEN`) es la moneda de referencia, con **dos decimales** como precisión monetaria estándar.
2. **Persistencia:** los importes definitivos se guardan en la base con `numeric` de dos decimales (el valor exacto `120.00`).
3. **Interoperabilidad:** las API, las exportaciones y los comprobantes transmiten el importe como **cadena decimal explícita** (`"120.00"`) junto con el código `PEN`; nunca como `float` ni como céntimos enteros.
4. **Presentación:** toda la aplicación usa un **único formateador** de soles, `S/ 120.00` (coma para los miles, `S/ 1,200.00`; negativos `-S/ 50.25`; en Node, `Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })` lo produce, con un espacio de no separación después de `S/`, verificado con Node).
5. **Precisión aritmética:** los cálculos internos no usan coma flotante binaria cuando pueda introducir errores. Se usan **enteros escalados** (sin dependencia nueva): 2 decimales para importes definitivos y una escala mayor, 6 decimales, para valores intermedios cuando un cálculo pueda producir fracciones. Asumido, por validar.
6. **Redondeo:** no hay redondeo monetario global ni automático en cada operación. Se conserva la precisión intermedia y se redondea **solo cuando lo exige una regla de negocio, contable o tributaria**, con el modo indicado de forma explícita (por defecto *half-up*). Hoy ninguna regla del producto lo exige: los precios de los planes son fijos y el pago es único.
7. **Pagos en efectivo:** se contempla la regla especial del BCRP para redondear el **monto total a pagar en efectivo**, sin modificar el importe original de la operación y respetando la protección al consumidor. Si la regla está activa, el pago guarda por separado el importe original, el monto cobrado en efectivo y el ajuste por redondeo. La regla es una **política intercambiable** (`ninguna` por defecto, `bcrp` pendiente de validar) y no se activa hasta que el propietario o su contador validen el texto vigente. Asumido, por validar.
8. **Alcance fiscal:** el cálculo tributario (IGV, detracciones, etc.) y las transacciones fiscales quedan **fuera de alcance**. El módulo de dinero deja preparadas funciones puras genéricas (porcentaje con modo de redondeo explícito, política de redondeo de efectivo) con sus pruebas, **sin conectarlas a ningún flujo** ni crear campos tributarios.

## Alternativas
Véase la tabla de opciones. Se descarta exponer céntimos enteros en la API (versión 1, Decisión 4) por indicación del propietario.

## Consecuencias
- (+) Cálculos exactos, formato uniforme y reglas de redondeo explícitas y reemplazables; (−) toca todos los casos de uso y pruebas que usan montos, junto con el renombrado de los campos `*USD` (tarea 1.4).
- Enmiendas necesarias al aceptarlo: `docs/constitution.md` C-15 (ya actualizado en su texto provisional) y `docs/04` línea 51 («céntimos enteros»), que deja de regir. Backlog: S-03 pasa a «Moneda única PEN, importes exactos y métodos de pago».

## Cómo se valida
- **Spec:** S-03.
- **Pruebas del propio ADR:** casos de borde (S/ 0.00, 0.01, 15.43, 29.99, 99999999.99, negativos), propiedad `sumar(a, b) − b = a`, formateo de `S/ 1,200.00` y `-S/ 50.25`, y el redondeo de efectivo con la política `ninguna` (identidad) y con una política de prueba.
- **Invariantes a fijar:** ningún importe del dominio es un `float` binario; toda respuesta de API trae el monto como cadena decimal con `PEN`; el importe original de una operación no cambia al aplicar el redondeo de efectivo (el ajuste se guarda aparte); el total del día por método y por usuario es la suma exacta de los pagos no anulados (ADR-018).

## Reversibilidad
Media-baja: toca los casos de uso, los repositorios y las pruebas con montos.

## Dependencias
ADR-010 (pago exacto), ADR-003 (moneda única; se corrige su afirmación sobre `Decimal`), ADR-016 (pruebas de propiedad), ADR-018 (el total del día reemplaza al total del turno; `Egreso` desaparece), ADR-022 (mapeo de `numeric` en Drizzle, S-22).

## Enmiendas posteriores (2026-11-12)
- Consecuencia de ADR-018: no hay turnos ni egresos; sus importes dejan de existir.
- La directriz anterior del propietario «sin redondeo del monto cobrado y sin redondeo de efectivo a 5 o 10 céntimos» queda **precisada** por su política posterior: no hay redondeo global ni automático, y el redondeo de efectivo del BCRP se contempla como política intercambiable, apagada por defecto, que nunca altera el importe original.

## Referencias
`docs/09` V-04 · `docs/linea-base-tests.md` §3 · `docs/datos-iniciales.md` (formato de montos) · BCRP, Circular 002-2011 y notas informativas de 2011 y 2018 (no verificadas, ver Contexto).

## Notas del propietario (2026-11-12)
- Respuesta en el chat: «Política monetaria aceptada». Aceptado el 2026-11-12.
