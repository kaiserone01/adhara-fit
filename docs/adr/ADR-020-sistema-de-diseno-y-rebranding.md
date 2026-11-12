# ADR-020: Sistema de diseño profesional y completo, con rebranding total

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-12 · Decisión de negocio del propietario del 2026-11-12 (detalles, incluida la tipografía, se validan después)

## Contexto
Adhara Fit es un negocio distinto del cliente anterior (Adrenalina Xtreme). El propietario decidió que el **rebranding es totalmente justificado** y que no basta un «branding mínimo»: se necesita un **sistema de diseño profesional y completo** (componentes, tokens, etc.), con **persistencia visual** entre todas las pantallas.

Hechos (no re-verificados contra el Repo A):
- La documentación solo registra ADR-008 (paleta medida, tokens `--gx-*`, contrastes, estado «activo» en amarillo con icono y texto, tema fijo) y el plan 0.9 «branding mínimo: nombre, logo, favicon, paleta».
- El monorepo tiene los paquetes `ui`, `theming` y `design-system`, este último solo con `.gitkeep` y `package.json` (doc 03 línea 35; doc 11 DI-05), y usa Tailwind 4 y React 19 (DI-01).
- La interfaz de `web-admin` (≈20 000 líneas, sin tests) no se leyó (doc 09 §1). Hay cuatro superficies visuales: panel `web-admin`, kiosco de check-in, kiosco en TV y vitrina de TV (ADR-021).
- **Kit de logotipo recibido (2026-11-12):** logotipo horizontal en color, negativo y monocromo, isotipo, iconos y favicon (`docs/design/origen-logotipo/`). **Colores confirmados:** carbón `#231F20`, amarillo `#FFCB04`, blanco `#FFFFFF` (el isotipo recibido mide `#FFCB04`); queda cerrado P-15 en lo que respecta a colores. **El original no es vectorial:** el SVG de origen contiene un PNG incrustado (nota técnica del LEEME). La tipografía del logotipo parece una sans humanista en negrita, **sin identificar**; la tipografía del sistema está por validar.

## Factores de decisión
- Persistencia visual: la misma identidad en panel, kiosco, kiosco en TV y vitrina.
- Accesibilidad: contraste AA y kiosco legible a 2 m (RNF-10); en TV, lectura a distancia.
- Mantenibilidad: una única fuente de verdad para colores, tipografía, espaciado y componentes.
- Rebranding total: ninguna huella visual del cliente anterior.

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **A. Sistema de diseño propio, profesional y completo (elegida)** | Identidad coherente y verificable; base para las cuatro superficies | Más trabajo inicial; hay que mantenerlo |
| B. Solo cambiar tokens y logo («branding mínimo») | Rápido | Deriva visual entre apps; contradice la decisión del propietario |
| C. Adoptar un kit de UI de terceros sin adaptación | Menos código | Identidad genérica; dependencia nueva a justificar |

## Decisión
1. El sistema de diseño es un **entregable de primer nivel**, con su propia spec (S-19), y vive en `packages/design-system` (componentes) y `packages/theming` (tokens).
2. **Tokens** como única fuente: color (semánticos y de marca), tipografía, espaciado, radios, sombras, movimiento, capas y puntos de quiebre, con **variantes por superficie** (panel, kiosco y TV con escala de lectura a distancia).
3. **Componentes y patrones documentados**: catálogo de componentes con estados (normal, foco, deshabilitado, error, vacío, cargando), formularios, tablas, navegación y avisos, para panel y kiosco/TV.
4. **Persistencia visual verificable:** ninguna app define colores ni tamaños sueltos; solo consume tokens. El mecanismo concreto de verificación (regla de lint o comprobación en CI) se fija en S-19.
5. **Rebranding total:** la marca de Adhara Fit sustituye por completo a la del cliente anterior en todas las superficies; S-10 retira lo anterior y S-19 instala lo nuevo.
6. **Tipografía y detalles finos** (familias, escala, pesos): se validan con el propietario después y se registran en S-19; hasta entonces se mantiene la tipografía del base (asumido, por validar).
7. Se conserva ADR-008 como registro de la paleta medida; este ADR amplía su alcance y sustituye al plan 0.9 «branding mínimo».
8. **Vectorización:** como el kit no es vectorial, el logotipo y el isotipo se rehacen como SVG limpio (redibujo o vectorización) dentro de S-19; hasta entonces se usan los PNG del kit. Los PNG originales de alta resolución deben entregarse como archivos al iniciar S-19.
9. La elección de herramientas (catálogo de componentes, librería de primitivas accesibles) es una dependencia nueva y se justifica en S-19.

## Consecuencias
- (+) Identidad consistente y mantenible; la accesibilidad se vuelve comprobable.
- (−) S-19 es una spec grande y depende de insumos del propietario (logo vectorial, manual de marca, tipografía).
- Afecta al backlog: el branding sale de S-10 (solo retira la marca anterior) y de S-00; S-19 instala la marca y el sistema. Vitrina y kiosco en TV (S-20, S-21) consumen los tokens de S-19.

## Cómo se valida
- **Spec:** S-19 (sistema de diseño y marca), con S-20 y S-21 como consumidores.
- **Invariantes a fijar:** todos los colores, tamaños y fuentes de las apps provienen de tokens; todo par de color de texto y fondo usado cumple contraste AA (script de cálculo); no queda ningún recurso de marca anterior en el árbol.
- **Criterios a fijar:** revisión visual por superficie con capturas de referencia; búsqueda sin valores de color literales fuera de `packages/theming`.

## Reversibilidad
Media: los tokens y componentes son reemplazables; la adopción en todas las pantallas es la parte costosa de revertir.

## Dependencias
- Amplía **ADR-008** (*propuesto*); sustituye el alcance «branding mínimo» del plan 0.9; coordina con **ADR-021** (cuatro superficies) y **ADR-019** (tema fijo, sin `TemaOrganizacion`). Insumos: colores confirmados por el kit; pendientes la versión vectorial del logotipo, los PNG originales y la tipografía.

## Referencias
`docs/adr/ADR-008-marca-y-tema-visual.md` · `docs/03-analisis-repo-base.md` línea 35 · `docs/11` DI-01, DI-05 · `docs/01` RNF-10 · `docs/07` tarea 0.9 · `docs/superpowers/COBERTURA-RF.md` §6.

## Enmiendas posteriores (2026-11-12)
- ADR-008 fue **retirado** por orden del propietario; rige ADR-020. La Decisión 7 («se conserva ADR-008») se entiende como conservar su paleta medida como registro histórico, no como decisión vigente.
