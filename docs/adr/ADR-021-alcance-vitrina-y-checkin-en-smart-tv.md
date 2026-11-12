# ADR-021: Alcance ampliado — vitrina de TV y check-in en smart-TV

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-12 · Decisión de negocio del propietario del 2026-11-12 · **Enmienda la tabla de apps de ADR-009**

## Contexto
ADR-009 (aceptado el 2026-11-12) difería la vitrina, la vitrina en TV y el kiosco en TV: «smart-TV no previsto, no descartado» (P-05). El propietario decidió ahora que **la vitrina entra en el alcance** y que **el check-in también funciona en un smart-TV**, además del kiosco web.

Hechos (de `docs/09`, `docs/11` y ADR-009; **no re-verificados** contra el Repo A):
- El monorepo tiene `apps/vitrina`, `apps/vitrina-tv` (Capacitor 8 sobre Android) y `apps/kiosk-tv` (Capacitor 8) (doc 11 DI-01, DI-03). Los dos proyectos Capacitor tienen un `debug.keystore` rastreado que no debe importarse (DI-88).
- La vitrina tiene límites de contenido (textos, imágenes y videos H.264, DI-77), emisor SSE en memoria que exige un solo contenedor (DI-78) y reglas de reproducción en TV (DI-79). Hay tres workflows: `apk-kiosco.yml`, `apk-vitrina.yml` y `verificar-vitrina.yml` (DI-13, DI-81).
- ADR-009 anota que la vitrina muestra precios en Bs y requiere adaptación a PEN. El principio «kiosco sin lógica» (doc 04 línea 37) se mantiene.
- `kiosk-host` (WinForms para un numpad en PC) depende del hardware (P-05): el propietario no lo mencionó.

## Factores de decisión
- El hardware real del local incluye smart-TV para el check-in y para la cartelería.
- Costo adicional de CI, despliegue y mantenimiento Android que ADR-009 quería evitar.
- Una sola identidad visual en las cuatro superficies (ADR-020).

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **A. Incluir vitrina, vitrina en TV y kiosco en TV en el alcance (elegida)** | Cubre el hardware real y la cartelería | CI y despliegue Android; más superficie visual; vitrina en memoria limita a un contenedor |
| B. Mantener todo diferido (ADR-009 original) | Menos mantenimiento | Contradice la decisión del propietario |
| C. Solo vitrina web, sin APK ni kiosco en TV | Menos mantenimiento Android | No cubre el check-in en TV |

## Decisión
1. **Entran en el alcance** `apps/vitrina`, `apps/vitrina-tv` y `apps/kiosk-tv`, junto con `web-admin` y `kiosk`.
2. **Siguen fuera:** `apps/worker` (eliminado por ADR-003) y `apps/kiosk-host` (sin decisión; asumido, por validar).
3. S-00 importa las cinco apps sin adaptarlas y excluye los `debug.keystore` y los workflows `apk-*.yml` y `verificar-vitrina.yml`. La adaptación se hace en dos specs nuevas propuestas: **S-20 Vitrina de TV** (contenido, PEN, SSE, administración) y **S-21 Check-in en smart-TV** (kiosco en TV, entrada del DNI, APK y su CI).
4. El kiosco en TV y la vitrina siguen el principio «kiosco sin lógica» (no importan dominio ni base de datos) y se autentican con la API key del kiosco (ADR-012 §3 y §10).
5. Las cuatro superficies consumen los tokens de ADR-020.
6. Este ADR **enmienda la tabla de ADR-009** cuando el propietario lo acepte; hasta entonces ADR-009 sigue siendo el texto aceptado, y S-00 se redacta con esta ampliación como borrador.

## Consecuencias
- (+) El alcance coincide con el hardware y la operación reales.
- (−) Hay que construir y mantener los APK (Capacitor, Android SDK, firma de aplicaciones) y su CI, y proteger las claves de firma (no versionar keystores).
- (−) La vitrina con SSE en memoria no escala a varias réplicas (DI-78); aceptable para un solo local.
- Afecta a: PRD §2.2 (lista de lo diferido), `CLAUDE.md` §5 y constitución C-24 (ya actualizados), ADR-009 (tabla), S-00 (lista de apps), S-10 (retirar Bs de la vitrina) y el plan (la Fase 3 deja de contener la vitrina).

## Cómo se valida
- **Specs:** S-00 (lista de apps permitidas), S-20 y S-21 (adaptación y APK).
- **Invariantes a fijar:** `apps/` contiene exactamente las cinco apps del alcance; ningún `keystore` ni clave de firma está versionado; el kiosco en TV y la vitrina no importan dominio ni base de datos.
- **Criterios a fijar:** build de las apps en el CI de S-20/S-21; prueba manual del check-in en un smart-TV real.

## Reversibilidad
Media: las apps se pueden volver a excluir; los APK ya distribuidos y las claves de firma no se revierten.

## Dependencias
- Enmienda **ADR-009**; coordina con **ADR-003** (retirar Bs), **ADR-012** (API key y CORS del kiosco) y **ADR-020** (tokens para TV). Insumos abiertos: cómo se digita el DNI en TV y qué contenido muestra la vitrina.

## Referencias
`docs/adr/ADR-009-alcance-de-apps-del-monorepo.md` · `docs/08` P-05 · `docs/11` DI-01, DI-03, DI-13, DI-77…DI-81, DI-88 · `docs/04-arquitectura-objetivo.md` línea 37 · `docs/02` §2.2.
