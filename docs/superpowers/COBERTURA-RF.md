# Cobertura de requisitos por spec

Estado: **propuesta para decisión del propietario** (2026-11-12). No modifica el backlog vigente (`docs/10-prompt-claude-code.md` §2.C, S-00…S-10) hasta que el propietario lo apruebe.
Origen: el propietario observó que las funcionalidades de **productos**, que están en el alcance, no aparecen en las specs.

## 1. Resultado
El backlog S-00…S-10 es la lista del **refactor** (Fases 0 y 1 del plan). Las funcionalidades de la Fase 2 y varias de la Fase 1 no tienen ninguna spec que las cubra.
**Productos** (RF-37, RF-38) están en el Release 1 (`docs/02-PRD-adhara-fit.md` §5: «Panel: … Productos …»), en el modelo de datos como «Adaptar» (`docs/06` línea 20) y con un bug conocido en el plan (tarea 1.12), pero **ni el plan (docs/07) tiene una tarea de productos ni el backlog tiene una spec**. Solo les tocan de refilón otras specs (S-01, S-03, S-08, S-09, S-10).

## 2. Matriz de requisitos (Must y Should del MVP)
Leyenda: ✅ cubierto por la spec indicada · ◐ cubierto en parte · ⚪ heredado sin cambios (no necesita spec) · ❌ sin spec.

| Requisito | Resumen | Cobertura actual | Brecha |
|---|---|---|---|
| RF-01, RF-02 | Login y permisos granulares | ✅ S-01 | — |
| RF-03 | Cambio de contraseña | ⚪ | — |
| RF-04 | Auditoría de acciones sensibles (S) | ◐ S-01 (intentos de login), S-09 (anonimización) | Sin spec propia; el modelo existe sin consumidores (doc 11 DI-28) |
| RF-10, RF-11 | Alta/edición y unicidad de documento | ✅ S-06 | El entrenador del miembro depende de P-22 (ver S-18) |
| RF-12 | Baja lógica y reactivación | ✅ S-09 | — |
| RF-13, RF-14 | Listado, ficha, vigencia | ⚪ / ✅ S-04 (fuente única de vigencia) | — |
| **RF-15, RF-72** | **Consentimiento de datos y política (M, nuevo)** | ❌ | Plan 2.2 sin spec |
| RF-20…RF-25 | Planes, cambio de plan, pago de 1-6 meses, gracia | ✅ S-03, S-04, S-05, S-07 | — |
| RF-30…RF-34 | Pago único, métodos, n.º de operación, fecha pasada, anulación | ✅ S-03, S-04 | — |
| RF-35 | ~~Turnos de caja y arqueo~~ **Retirado** (ADR-018 propuesto: sin turnos ni arqueo) | S-08 reformulada | S-08 pasa a cubrir el registro continuo de cobros y el reporte diario por método y usuario |
| RF-36 | Histórico de pagos imprimible | ⚪ (ajuste de PEN en S-03/S-10) | Impresión: sin criterio propio |
| **RF-37** | **Venta de productos con cobro inmediato (S)** | ❌ | **Sin spec** |
| **RF-38** | **Fiado de productos y cobro de deudas (C, P-06 sin respuesta)** | ❌ | **Sin spec; default de `docs/08`: conservado pero oculto** |
| **RF-39** | **Tipo y n.º de comprobante por pago (M, nuevo)** | ◐ S-03 solo el catálogo de métodos | Plan 2.1 sin spec (ADR-006) |
| RF-50…RF-55, RF-57 | Kiosco, check-in, cola offline, En sala, reposo | ✅ S-05, S-06 / ⚪ | — |
| RF-60, RF-61 | Configuración de métodos y gracia; usuarios y permisos | ✅ S-03, S-05, S-01 | — |
| **RF-62** | **Reporte de morosos / por vencer (S)** | ❌ | Plan 2.5 sin spec |
| **RF-70** | **Subdominio con TLS, sesión obligatoria, `noindex`** | ◐ S-01 (cabeceras, ADR-012 §8) | Despliegue (plan 2.9) sin spec |
| **RF-71** | **Aviso del Libro de Reclamaciones (M)** | ❌ | Plan 2.3 sin spec |
| RNF-01 | Localización `America/Lima`, `es-PE` | ✅ S-02 | Textos en español peruano: plan 1.11 sin dueño claro |
| RNF-05 | Datos personales (Ley 29733) | ◐ S-09 | Falta consentimiento (RF-15) y política |
| **RNF-07, RNF-08, RNF-09** | **Respaldo, observabilidad, despliegue** | ❌ | Plan 2.7, 2.8, 2.9 sin spec |
| RNF-10 | Accesibilidad / contraste | ◐ S-10 (retira marca anterior) | Instalar la marca nueva no tiene spec (REVISION-ADR T-14) |

### Tareas del plan sin spec dueña
| Tarea | Qué es |
|---|---|
| 1.10 | Baseline de migración + seed Adhara + prueba de integración (S-00 SUP-002 la deja «después de las specs que cambian el esquema») |
| 1.12 | Corregir el bug `reabrirPorGrupo` de la deuda de productos (doc 03 línea 68) |
| 2.4 | Importador CSV de miembros (HU-50) |
| 2.10 | Piloto con el personal (no es una spec: va al plan global) |

## 3. Propuesta: ampliar el backlog (sin renumerar S-00…S-10)
Los IDs son estables: las specs nuevas continúan la numeración. Orden y dependencias definitivos se fijan en el plan global (G6).

| Spec propuesta | Cubre | Depende de (specs) | Nota |
|---|---|---|---|
| **S-11 Productos y fiado** | RF-37, RF-38, tarea 1.12; permisos de productos (DI-57), vender sin turno (ADR-018; DI-69 deja de aplicar), precios en PEN | S-01, S-03, S-08 | Decisión P-06: ver §4 |
| S-12 Comprobantes de pago | RF-39, plan 2.1, ADR-006 | S-03, S-04 | Registro, no emisión |
| S-13 Consentimiento y aviso legal | RF-15, RF-72, RF-71, plan 2.2 y 2.3 | S-06, S-09 | Textos legales a revisar por abogado |
| S-14 Reportes | RF-62, RF-36, plan 2.5 | S-04, S-12 | Morosos, por vencer, ingresos por método |
| S-15 Baseline de BD y seed Adhara | plan 1.10, ADR-012 §6 | S-03, S-05, S-06, S-09 | Cierra la deuda de S-00 SUP-002 |
| S-16 Importador CSV de miembros | HU-50, plan 2.4 | S-06, S-15 | Dry-run y `--confirm` |
| S-17 Operación: respaldo, observabilidad y despliegue | RNF-07…RNF-09, RF-70, plan 2.7-2.9 | S-00, S-01 | Staging y producción |
| S-18 Entrenadores | P-22, H-07, RF-10 | S-01, S-06 | Default de `docs/08`: entidad sin credenciales |

## 4. Decisiones que necesito del propietario
| # | Decisión | Mi recomendación |
|---|---|---|
| E1 | ¿Aprobar S-11…S-18 como ampliación del backlog (o elegir cuáles)? | Aprobar S-11 ya; el resto, ordenadas por el plan global |
| E2 | **Productos:** ¿se venden productos en Adhara (RF-37)? | Sí (RF-37 está en el MVP) |
| E3 | **Fiado (P-06, sin respuesta):** ¿el fiado se usa (RF-38)? Default de `docs/08`: «conservado pero oculto». Ojo: ADR-010 decidió **borrar, no ocultar**, los abonos; ocultar el fiado deja código y pantallas muertos | Decidir: **eliminar el fiado** del MVP (como los abonos) o conservarlo visible. Si no hay respuesta, aplico el default de `docs/08` y lo marco «asumido, por validar» |
| E4 | ¿Se necesita un ADR para fiado/productos? | Solo si decides eliminar el fiado (decisión de producto con consecuencias en datos) |
| E5 | ¿Cuáles de S-12…S-18 son MVP y cuáles post-MVP? | PRD Release 1 incluye comprobante, consentimiento, reportes y despliegue: todas MVP salvo lo que decidas diferir |

## 5. Cambio de alcance: sin turnos de caja ni arqueo (ADR-018, propuesto)
El propietario decidió el 2026-11-12 que no habrá turnos de caja y que el arqueo es innecesario. Efecto sobre este cruce:

| Spec | Cambio propuesto |
|---|---|
| S-04 Pago único y suscripciones | Se elimina el «turno abierto obligatorio» (doc 10 §2.C; doc 11 H-01; P-23): cobrar nunca exige turno |
| **S-08** | Deja de ser «caja compartida con traspaso de turno y arqueo por método». Nuevo título propuesto: **registro continuo de cobros y reporte diario por método y usuario** (anulación con motivo, auditoría, egresos como gasto fechado). Conserva su ID |
| S-11 Productos y fiado | Vender y cobrar deudas sin turno |
| S-03, S-10 | Sin `Turno` ni `fondoInicialEfectivo`; sin `*USD` ni `Bs` en egresos |
| S-14 Reportes | Absorbe el reporte diario de ingresos por método y usuario que sustituye al arqueo |
| Plan (doc 07) | Pierden vigencia las tareas 1.16 (traspaso) y el criterio de turno de 1.3b; 0.11 deja de probar `CerrarTurno` |
| ADR propuestos | Enmiendas en ADR-002, 003, 010 y 011 cuando el propietario acepte ADR-018 (detalle en el propio ADR) |

Pregunta abierta con default: **egresos**. Default: se conservan como registro de gasto con fecha y usuario, sin turno (asumido, por validar).
