# ADR-019: Negocio único — Adhara Fit no es un SaaS multi-organización

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-12 · Decisión de negocio del propietario del 2026-11-12: **opción B, eliminar `Organizacion`**

## Contexto
El propietario aclaró que este proyecto **no es un SaaS de gimnasios** que atienda a distintas organizaciones: es el sistema de un único negocio, Adhara Fit (*single business*). Entre las opciones planteadas eligió **eliminar el concepto de organización del modelo**.

Hechos (de `docs/06`, `docs/11` y los ADR; **no re-verificados** contra el código del Repo A):
- El base modela `Organizacion` con `slug` único (doc 11 DI-16) y `organizacionId` en las tablas de negocio; por ejemplo, `Miembro` es único por (organización, cédula) (DI-21). Existe `TemaOrganizacion`, sin consumidores en ejecución (DI-28), y el cliente anterior usaba scripts para sembrar y clonar organizaciones (doc 03; ADR-007).
- La documentación v0.4 conservaba ese esquema: `Organizacion` «una sola fila» (doc 06 línea 9), seed «Adhara Fit» (línea 114), unicidad `@@unique([organizacionId, numeroDocumento])` (ADR-004) y una tabla nueva `ConfiguracionOrganizacion` (doc 06 línea 30; plan 1.8).
- Ningún ADR había decidido esto. ADR-002 trata la `Sucursal`, no la `Organizacion`; ADR-001 rechazó contratar un SaaS comercial, no la multi-organización.
- El inventario reproducible (`docs/anexos/inventario/`) no cuenta las coincidencias de «organización»: **se desconoce cuántos archivos toca** eliminarla.

## Factores de decisión
- Adhara Fit es un solo negocio con un solo local: no hay alta de organizaciones, ni aislamiento entre inquilinos que defender.
- Un modelo fiel al negocio reduce conceptos que explicar y consultas que filtrar.
- El baseline de migraciones se regenera de todos modos (SUP-S00-002), de modo que el costo recae en el código y los tests, no en las migraciones.
- El alcance de la cirugía no está medido: hay que medirlo antes de estimar.

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| A. Una sola fila `Organizacion` oculta (patrón de ADR-002) | Diff pequeño; riesgo bajo | Queda un concepto que el negocio no necesita |
| **B. Eliminar `Organizacion` y `organizacionId` del modelo (elegida por el propietario)** | Modelo fiel al negocio; sin concepto de inquilino | Cirugía de alcance no medido en esquema, repositorios, unicidades y tests; riesgo de regresiones |
| C. Mantener multi-organización visible | Cero trabajo | Contradice la decisión del propietario |

## Decisión
1. Adhara Fit es **un único negocio**. El sistema no tiene entidad `Organizacion`, ni `slug`, ni `TemaOrganizacion`, ni parámetros de organización en rutas, acciones o cuerpos de petición.
2. Se elimina `organizacionId` de todas las tablas. Las unicidades pasan a ser globales: `numeroDocumento` y `codigoSocio` únicos en todo el sistema (enmienda de ADR-004).
3. `ConfiguracionOrganizacion` pasa a ser **`ConfiguracionNegocio`**, una tabla de una sola fila con la configuración global (nombre sugerido, asumido, por validar).
4. La `Sucursal` única oculta (ADR-002) cuelga directamente del negocio; `obtenerSedeUnica` deja de recibir parámetros.
5. **Antes de estimar o ejecutar**, se mide el alcance: se amplía `anexos/inventario/generar_inventario.py` con los términos *organización* y *organizacionId* y se registra el conteo en la línea base (S-00, REQ-S00-011).
6. La terminología de documentos y código habla de «el negocio» o «Adhara Fit»; el PRD deja de llamarlo «Platform» (hecho el 2026-11-12 por orden del propietario).

## Consecuencias
- (+) Modelo coherente con el negocio.
- (−) Refactor transversal de alcance desconocido hasta medir; se hace junto con el baseline nuevo para no acumular migraciones.
- Enmiendas necesarias al aceptar este ADR: ADR-004 (unicidad global), ADR-002 (helper sin parámetros), ADR-008 (sin `TemaOrganizacion`), doc 06 (modelo `Organizacion`, `TemaOrganizacion`, `ConfiguracionOrganizacion`, unicidades) y los supuestos del seed (`Organizacion` «Adhara Fit», slug).
- Afecta al backlog: S-05 se amplía a «negocio y sede únicos»; S-06 fija las unicidades globales; el seed (S-15 propuesta) crea una sola sede y una configuración.

## Cómo se valida
- **Specs:** S-05 (eliminación de `Organizacion` y `organizacionId`), S-06 (unicidades globales), S-15 (seed).
- **Invariantes a fijar:** el esquema no contiene `Organizacion`, `TemaOrganizacion` ni columnas `organizacionId`; ninguna ruta, acción ni cuerpo de petición recibe un identificador de organización; existe exactamente una fila de `Sucursal` y una de `ConfiguracionNegocio`.
- **Criterios a fijar:** consulta al esquema sin esas columnas; test de contrato de rutas (ADR-016 §3) sin parámetros de organización; los tests de dominio adaptados pasan sin `organizacionId`.

## Reversibilidad
Baja: reintroducir multi-organización exigiría rediseñar el modelo y las consultas; con el baseline nuevo no hay datos heredados que migrar.

## Dependencias
- Enmienda **ADR-004**, **ADR-002** y **ADR-008**; se apoya en SUP-S00-002 (baseline regenerado) y en la medición de la línea base (S-00).

## Referencias
`docs/06-modelo-datos-cambios.md` (líneas 9, 30, 114) · `docs/11` DI-16, DI-21, DI-28 · `docs/02-PRD-adhara-fit.md` línea 7 · `docs/adr/ADR-001`, `ADR-002`, `ADR-004`, `ADR-007`, `ADR-008`.
