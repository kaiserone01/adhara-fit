# ADR-002: Modo "sede única" — mantener `Sucursal` oculta en lugar de eliminarla

Estado: **propuesto** (2026-11-11)

## Contexto
Adhara Fit tiene un solo local. El repo base modela `Organizacion → Sucursal` y la palabra *sucursal* aparece en **183 archivos de código, tests y scripts** (cifra v0.2: "111 archivos con `sucursalId`", no reproducible): pagos, turnos, check-ins, usuarios, sesión con sucursal activa, planes multisede, API key del kiosco, reposo, vitrina.

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
