# ADR-018: Sin turnos, arqueo, egresos ni fiado — el sistema solo captura la recepción de pagos

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-12 · Decisión de negocio del propietario, formulada en el chat el 2026-11-12 y ampliada ese día con «sin egresos» y «sin fiados»

## Contexto
El propietario decidió que en Adhara Fit **no existirán turnos de caja**: la recepción de pagos es un flujo continuo y, por tanto, **el arqueo es innecesario**. Precisó después: **sin egresos y sin fiados**; el sistema solo captura la recepción de pagos de **planes de membresía y de productos**.

Hechos (de `docs/09`, `docs/11` y los requisitos; **no re-verificados** contra el código del Repo A):
- El base modela la caja con turnos: `AbrirTurno` permite un turno abierto por sede (doc 09 V-03; doc 11 DI-70), `CerrarTurno` recalcula lo esperado y exige nota si hay diferencia (doc 09 V-12; doc 11 DI-72) y `ObtenerResumenTurno` agrupa por método y calcula el arqueo (doc 09 §3.4; doc 11 DI-71).
- `Pago.turnoId` vincula cada pago a su turno; `RegistrarPago` lo deja nulo si no hay turno abierto (doc 09 V-16, doc 11 H-01) y `VenderProducto` y `CobrarDeudasMiembro` exigen turno (doc 11 DI-69).
- Los requisitos y el plan asumían turnos: RF-35 (doc 01 línea 100), RF-33 «fuera de turno» (línea 98), RF-36 «por rango/turno» (línea 101), reglas 7 y 8 (líneas 158-159), criterio «cierre de turno cuadra al céntimo» (línea 185); HU-20, HU-21, HU-22 y HU-23 y el indicador «turnos con diferencia > S/ 5» (doc 02 líneas 38, 50, 82, 85-90); el modelo `Turno`, `Egreso` y `ArqueoLinea` (doc 06 líneas 21-23, 96, 122); las tareas 0.11, 1.3b, 1.4 y 1.16 (doc 07); y las preguntas P-19 y P-23 (doc 08).

## Factores de decisión
- Continuidad operativa: varias personas reciben pagos sin abrir ni cerrar turno.
- Simplificar el dominio: se eliminan un agregado, un cierre con conteo y un flujo de traspaso (tarea 1.16) y la regla «turno obligatorio».
- Riesgo: sin arqueo se pierde la conciliación del efectivo físico; hay que sustituir el control (ver Decisión §3).

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **A. Eliminar turnos y arqueo; cobros continuos (elegida por el propietario)** | Flujo continuo; menos código, estados y tests | Sin conciliación del efectivo contado; el control pasa a reportes y auditoría |
| B. Mantener un turno único «siempre abierto» y oculto | Conserva el código y los reportes por turno | Mantiene complejidad muerta; contradice la decisión del propietario |
| C. Conservar turnos con arqueo opcional | Flexible | Dos modos de operar; más pruebas y pantallas |

## Decisión
1. **No existen turnos de caja, fondo inicial, traspaso ni arqueo.** Se eliminan la entidad `Turno` y `ArqueoLinea`, `Pago.turnoId`, los casos de uso `AbrirTurno`, `CerrarTurno`, `ObtenerResumenTurno` y `ObtenerUltimoCierrePorSucursal`, la ruta `api/caja/ultimo-cierre` y las pantallas de caja y turno.
2. **Cobrar nunca exige un turno.** Desaparecen `SinTurnoAbiertoError` y la regla «turno obligatorio» (doc 11 H-01; P-23): `RegistrarPago`, `VenderProducto` y `CobrarDeudasMiembro` operan en cualquier momento. «Fuera de turno» deja de ser un caso especial; se mantiene el límite de 90 días para pagos con fecha pasada (RF-33).
3. **Control sustitutivo, sin «esperado frente a contado»:** cada pago guarda fecha y hora, método, monto y quién lo registró; se conserva la anulación con motivo y autor (RF-34); el reporte de ingresos se hace por día, método y usuario (RF-62; plan 2.5); `esEfectivo` se mantiene para esos reportes.
4. **Sin egresos y sin fiado:** se eliminan `Egreso`, `RegistrarEgreso` y `MonedaEgreso` (HU-21); y `DeudaProducto`, `FiarProducto`, `CobrarDeudasMiembro`, `RegistrarPagoConDeudas`, «Cobrar deudas» y el bug de `reabrirPorGrupo` (RF-38 retirado; P-06 respondida: productos sí, fiado no). El sistema no registra gastos ni deudas: **solo captura pagos de membresías y ventas de productos con cobro inmediato (RF-37)**, cada uno con método, monto, fecha y hora, y quién lo registró.
5. Los requisitos y las historias que dependen de turnos, egresos o fiado se retiran o se reformulan: RF-35, RF-38, HU-20, HU-21, HU-22, el indicador de diferencia de caja, las tareas 1.12 y 1.16 y las preguntas P-19, P-23 y P-06 pierden vigencia; RF-33 y RF-36 se reformulan sin «turno».

## Consecuencias
- (+) Flujo de recepción continuo y dominio más pequeño.
- (−) No hay conciliación del efectivo físico: un descuadre solo se detecta comparando reportes con el dinero real fuera del sistema.
- (−) Hay que enmendar, cuando el propietario acepte este ADR (ADR-010 remitía el fiado a P-06, ya respondida; doc 06: `Turno`, `Egreso`, `ArqueoLinea` y `DeudaProducto` pasan a «Eliminar»): ADR-002 (consecuencia de caja compartida y tarea 1.16), ADR-003 (`Turno` con `fondoInicialEfectivo`; `Egreso` con `moneda`), ADR-010 (invariante «no hay pago sin turno») y ADR-011 (propiedad «total de turno = suma de sus líneas», que pasa a «total del día»). Detalle anterior:
- (−) Afecta al backlog: S-04 pierde el «turno obligatorio»; S-08 deja de ser «caja compartida con traspaso y arqueo» y pasa a cubrir el registro continuo de cobros y el reporte diario por método y usuario; S-11 vende sin turno. Ver `docs/superpowers/COBERTURA-RF.md`.

## Cómo se valida
- **Spec:** S-08 reformulada (propuesta en `COBERTURA-RF.md`). Invariantes a fijar: ningún modelo, ruta ni caso de uso depende de un turno; el esquema no contiene `Turno`, `ArqueoLinea` ni `Pago.turnoId`.
- **Criterios a fijar:** el esquema no contiene `Egreso` ni `DeudaProducto`; no existe ninguna ruta ni pantalla de egresos o de deudas; 

## Reversibilidad
Media-baja: reintroducir turnos exigiría diseñar de nuevo el agregado, el cierre y la migración de datos; los pagos ya registrados no pierden información.

## Dependencias
- Enmienda ADR-002, ADR-003, ADR-010 y ADR-011 (*propuestos*); interactúa con ADR-012 §4 (*aceptado*). Reemplaza las preguntas P-19 y P-23 del doc 08. No depende de otro ADR.

## Referencias
`docs/01-levantamiento-requerimientos.md` (líneas 26, 98-101, 158-159, 185) · `docs/02-PRD-adhara-fit.md` (líneas 16, 38, 50, 82-90) · `docs/06-modelo-datos-cambios.md` (líneas 21-23, 96, 122) · `docs/07-plan-implementacion-roadmap.md` (0.11, 1.3b, 1.4, 1.16) · `docs/09` V-03, V-12, V-16 · `docs/11` DI-69…DI-72, H-01 · `docs/08` P-19, P-23.
