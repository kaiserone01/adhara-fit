# ADR-009: Alcance de apps del monorepo en el MVP

Estado: **propuesto** (2026-11-11) · P-05: smart-TV no previsto, no descartado (12-nov-2026)

## Contexto
El monorepo incluye 7 apps: `web-admin`, `kiosk`, `kiosk-tv` (Capacitor), `kiosk-host` (WinForms/.NET 8), `vitrina`, `vitrina-tv` (Capacitor) y `worker`. Cada una añade CI, despliegue, dependencias de plataforma (Android/Gradle, .NET) y mantenimiento.

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

## Consecuencias
- (+) Repo más pequeño, CI más rápida, menos superficie de mantenimiento.
- (−) Reincorporar exige trabajo de adaptación (vitrina muestra precios en Bs).
- El ADR-002 original (vitrina importa dominio puro) queda en suspenso hasta su reincorporación.
