# ADR-009: Alcance de apps del monorepo en el MVP

Estado: **propuesto** (2026-11-11) · P-05: smart-TV no previsto, no descartado (12-nov-2026)

## Contexto
El monorepo incluye 7 apps: `web-admin`, `kiosk`, `kiosk-tv` (Capacitor), `kiosk-host` (WinForms/.NET 8), `vitrina`, `vitrina-tv` (Capacitor) y `worker`. Cada una añade CI, despliegue, dependencias de plataforma (Android/Gradle, .NET) y mantenimiento.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- Cada app añade CI, despliegue y dependencias de plataforma (Android/Gradle, .NET).
- P-05 (hardware de check-in) sigue abierta; el smart-TV no está previsto pero no se descarta.
- El `worker` solo actualiza la tasa BCV, que desaparece con ADR-003.

## Decisión
| App | MVP | Motivo |
|---|---|---|
| `web-admin` | **Sí** | Núcleo |
| `kiosk` | **Sí** | Control de acceso (PWA/estático) |
| `worker` | **No (eliminar)** | Solo actualizaba la tasa BCV |
| `vitrina`, `vitrina-tv` | Diferir | Requiere adaptar PEN y TV Android; opcional |
| `kiosk-host` | Diferir | Solo si el hardware es PC con numpad dedicado |
| `kiosk-tv` | Diferir | Solo si el kiosco es Android |
| Workflows `apk-*.yml` | Diferir | Dependen de las apps Android |

Las apps diferidas se **mueven** a una rama/carpeta `_diferido/` o se omiten de la copia inicial y se reincorporan desde el commit base si se aprueban (el ADR-005 deja trazado el commit de origen).

## Alternativas
*Sección añadida en el pase formal F; alternativas inferidas del texto del ADR.*
| Alternativa | Pros | Contras |
|---|---|---|
| **A. MVP con `web-admin` y `kiosk`; el resto diferido (elegida)** | Repo más pequeño, CI más rápida | Reincorporar exige adaptación (la vitrina muestra precios en Bs) |
| B. Mantener las 7 apps | Nada que reincorporar | CI, despliegue y mantenimiento de apps sin uso inmediato |

## Consecuencias
- (+) Repo más pequeño, CI más rápida, menos superficie de mantenimiento.
- (−) Reincorporar exige trabajo de adaptación (vitrina muestra precios en Bs).
- El ADR-002 original (vitrina importa dominio puro) queda en suspenso hasta su reincorporación.

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-00.
- **Invariante a fijar:** la copia inicial contiene solo las apps del MVP. Queda abierta la elección entre omitirlas de la copia y moverlas a `_diferido/` (decisión D3 de `REVISION-ADR.md`).

## Reversibilidad
*(Pase formal F.)* Media-alta: las apps diferidas se reincorporan desde el commit base trazado en ADR-005.

## Dependencias
*(Pase formal F.)* ADR-003 (el worker se elimina), ADR-005 (workflows y keystores), ADR-012 §10 (CORS del kiosco), ADR-008. Hallazgos abiertos de la revisión G3 (C11, C15): ver `REVISION-ADR.md` §4, §7 y §8.4.
