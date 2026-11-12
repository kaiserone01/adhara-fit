# ADR-019: Organización única — Adhara Fit no es un SaaS multi-organización

Estado: **propuesto** (2026-11-12) · Decisión de negocio del propietario, formulada en el chat el 2026-11-12 · Opción A asumida por defecto, por validar

## Contexto
El propietario aclaró que este proyecto **no es un SaaS de gimnasios** que atienda a distintas organizaciones: es el sistema interno de un único negocio, Adhara Fit.

Hechos (de `docs/06`, `docs/11` y los ADR; **no re-verificados** contra el código del Repo A):
- El base modela `Organizacion` con `slug` único (doc 11 DI-16) y `organizacionId` en las tablas de negocio; por ejemplo, `Miembro` es único por (organización, cédula) (DI-21). Existe `TemaOrganizacion`, sin consumidores en ejecución (DI-28), y el cliente anterior usaba scripts para sembrar y clonar organizaciones (doc 03; ADR-007).
- La documentación v0.4 conserva ese esquema: `Organizacion` «Conservar — una sola fila (Adhara Fit)» (doc 06 línea 9), seed con `Organizacion` «Adhara Fit» (línea 114), unicidad `@@unique([organizacionId, numeroDocumento])` (ADR-004) y una tabla nueva `ConfiguracionOrganizacion` (doc 06 línea 30; plan 1.8). El PRD llama al producto «Adhara Fit Platform» (doc 02 línea 7).
- **Ningún ADR decidió esto de forma explícita.** ADR-002 trata la `Sucursal` (sede única oculta), no la `Organizacion`. ADR-001 rechazó contratar un SaaS comercial como alternativa de compra, no la multi-organización.
- El inventario reproducible (`docs/anexos/inventario/`) no cuenta las coincidencias de «organización»: se desconoce cuántos archivos tocaría eliminarla.

## Factores de decisión
- Adhara Fit es un solo negocio con un solo local: no hay alta de organizaciones, ni planes de suscripción de clientes, ni aislamiento entre inquilinos que defender.
- El costo de eliminar `organizacionId` del modelo no está medido y toca consultas, unicidades y pruebas de todo el sistema.
- El baseline de migraciones se regenera de todos modos (SUP-S00-002, doc 06 §baseline), de modo que el costo de la opción B recae en el código, no en las migraciones.
- Coherencia con ADR-002 (sede única oculta) y ADR-008 (tema fijo).

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **A. Una sola fila `Organizacion`, oculta (asumida por defecto)** | Mismo patrón que ADR-002; diff pequeño; riesgo bajo | Queda un concepto invisible en el esquema y en los nombres (`organizacionId`) |
| B. Eliminar `Organizacion` y `organizacionId` del modelo | Modelo fiel al negocio; sin concepto de inquilino | Cirugía de alcance no medido en esquema, repositorios, unicidades y tests; riesgo alto de regresiones |
| C. Mantener multi-organización visible | Cero trabajo | Contradice la decisión del propietario |

## Decisión
1. Adhara Fit es **una sola organización**. El sistema no ofrece alta, listado, cambio ni administración de organizaciones, ni dominios o temas por organización.
2. **Asumido, por validar (opción A):** se conserva una única fila `Organizacion` («Adhara Fit»), creada por el seed y oculta, igual que `Sucursal` en ADR-002. El `slug` deja de tener uso funcional y el tema es fijo (ADR-008). `ConfiguracionOrganizacion` se trata como la configuración global única del negocio.
3. La resolución de la organización se centraliza en un helper (como `obtenerSedeUnica` en ADR-002); ninguna ruta ni pantalla recibe un identificador de organización del cliente.
4. La terminología de los documentos nuevos habla de «el negocio» o «Adhara Fit», no de «plataforma».

## Consecuencias
- (+) Se evita una cirugía de alcance desconocido y se conserva la separación de datos ya probada.
- (−) El esquema mantiene un concepto de organización que el negocio no necesita; documentarlo en `CLAUDE.md` como en ADR-002.
- Si el propietario prefiere la opción B, se abre una spec propia con medición previa de archivos afectados (ampliar `generar_inventario.py` con el término) y se enmiendan ADR-004 y el doc 06.
- Pendiente: renombrar «Adhara Fit Platform» en el PRD cuando el propietario apruebe el cambio de nomenclatura (los documentos importados no se editan sin su orden).

## Cómo se valida
- **Spec:** S-05 (sede única) se amplía a «sede y organización únicas»; el seed (S-15 propuesta) crea una sola fila de cada una.
- **Invariantes a fijar:** existe exactamente una fila `Organizacion` y una `Sucursal`; ninguna ruta, acción ni pantalla crea, lista o cambia organizaciones; ningún cuerpo de petición acepta `organizacionId`.
- **Criterio a fijar:** una búsqueda en rutas y server actions no encuentra parámetros de organización y un test de contrato (ADR-016 §3) lo comprueba.

## Reversibilidad
Alta con la opción A (la fila única se puede ampliar); baja con la opción B.

## Dependencias
- Complementa **ADR-002** y **ADR-008**; afecta a **ADR-004** (unicidad por organización) y al doc 06 si se elige la opción B. Se apoya en SUP-S00-002 (baseline regenerado).

## Referencias
`docs/06-modelo-datos-cambios.md` (líneas 9, 30, 114) · `docs/11` DI-16, DI-21, DI-28 · `docs/02-PRD-adhara-fit.md` línea 7 · `docs/adr/ADR-001`, `ADR-002`, `ADR-004`, `ADR-007`, `ADR-008`.
