# ADR-002: Modo "sede única" — mantener `Sucursal` oculta en lugar de eliminarla

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-11

## Contexto
Adhara Fit tiene un solo local. El repo base modela `Organizacion → Sucursal` y la palabra *sucursal* aparece en **183 archivos de código, tests y scripts** (cifra v0.2: "111 archivos con `sucursalId`", no reproducible): pagos, turnos, check-ins, usuarios, sesión con sucursal activa, planes multisede, API key del kiosco, reposo, vitrina.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- Un solo local (confirmado el 12-nov-2026) y posibilidad de reabrir multi-sede.
- Tamaño del diff y riesgo de regresión en caja y check-in (183 archivos mencionan *sucursal*, doc 09 §5).
- Conservar la API key del kiosco por sede (doc 11 DI-09).

## Decisión
Mantener la tabla `Sucursal` con **exactamente una fila** ("Local") creada por el seed. La UI no la expone: se retiran menú y pantallas `/sucursales`, selectores de sede, `UsuarioSucursal`, plan `multisede`, opción "Ambas" y módulo de permisos `SUCURSALES`. Server Actions y APIs resuelven la sede automáticamente. El login hoy pregunta la sede si `sucursalesVisibles.length > 1` y `ValidarSesion` rechaza sesiones sin `sucursalActivaId`: con una sola fila el login la **selecciona sola**. `diasGracia` y `reposo*` se mueven a configuración global.

## Alternativas
| Alternativa | Pros | Contras |
|---|---|---|
| **A. Sede única oculta (elegida)** | Diff pequeño; riesgo bajo; conserva API key del kiosco; permite reabrir multi-sede | Queda un concepto "invisible" en el schema |
| B. Eliminar `Sucursal` y `sucursalId` | Modelo más limpio | Cirugía en ~183 archivos, 36 migraciones, tests; alto riesgo de regresiones en caja y check-in |
| C. Mantener multi-sede visible | Cero trabajo | Contradice el requerimiento; UI confusa |

## Consecuencias
- (+) Reversible: si Adhara abre un segundo local, se reactiva la UI.
- (+) Compatible con futuros merges del upstream, si se decide seguirlo.
- (−) Nombres como `sucursalId` seguirán en el código; documentarlo en `CLAUDE.md`.
- Helper único `obtenerSedeUnica(organizacionId)` en dominio para centralizar la resolución.
- **Caja compartida:** `AbrirTurno` permite un solo turno abierto por sede (no por usuario), así que todo el personal comparte una caja; hace falta un flujo de traspaso (tarea 1.16).
- Confirmado el 12-nov-2026: un solo local. Revisitar solo si cambia.

## Cómo se valida
*(Pase formal F.)*
- **Specs:** S-05 (sede única oculta) y S-08 (caja compartida con traspaso).
- **Invariantes a fijar:** existe exactamente una fila `Sucursal` por organización y el login la selecciona solo (S-05); un turno abierto por sede (doc 09 V-03, doc 11 DI-70) (S-08).

## Reversibilidad
*(Pase formal F.)* Alta: el propio ADR la declara reversible; reabrir multi-sede es reactivar la UI.

## Dependencias
*(Pase formal F.)* Depende de ADR-001. Se relaciona con ADR-005 (hallazgo C1 sobre seguir el upstream), ADR-012 (API key del kiosco) y P-18 (`diasGracia` global). Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.

## Enmiendas posteriores (2026-11-12)
*Derivadas de decisiones aceptadas por el propietario (ADR-018, ADR-019, ADR-020). El texto anterior se conserva; donde choca, rige esta sección.*
- La consecuencia «Caja compartida: `AbrirTurno` permite un solo turno abierto por sede… flujo de traspaso (tarea 1.16)» queda **sin efecto**: no existen turnos de caja (ADR-018).
- El helper `obtenerSedeUnica(organizacionId)` deja de recibir parámetros: no existe la entidad `Organizacion` (ADR-019). La `Sucursal` única cuelga directamente del negocio.
- Medición del 2026-11-12 sobre el Repo A (`b4352a0`, mismo criterio de `grep`): `sucursal` aparece en 194 archivos de `apps` y `packages`; el inventario oficial reproduce la cifra de `docs/09` §5.

## Notas del propietario (2026-11-12)
- Respuesta en el chat: «Sin selector confirmado». Aceptado el 2026-11-12.
