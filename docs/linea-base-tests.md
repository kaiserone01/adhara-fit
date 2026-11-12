# Línea base del Repo A (`gym-app`)

Medida el 2026-11-12 sobre un clon de solo lectura en el commit `b4352a0398933cf2665a3e7b82dc84049697e10c`, **antes de cualquier cambio** (REQ-S00-011, ADR-016 §4, plan 0.7). Entorno: Node v22.23.4 y npm 10.9.9; instalación con `npm ci` (607 paquetes). Es el punto de referencia de S-00: «sin errores nuevos» significa sin errores que no figuren aquí.

## 1. Pruebas (vitest)
| Workspace | Archivos de test | Pruebas | Resultado | Tiempo |
|---|---:|---:|---|---:|
| `packages/domain` | 39 | **390** | 390 pasan | 3 s |
| `apps/kiosk` | 10 | 45 | 45 pasan | 1 s |
| `apps/vitrina` | 7 | 65 | 65 pasan | 1 s |
| `packages/db` | 5 | 72 | 71 pasan, **1 falla** | 1 s |
| `apps/web-admin`, `packages/infrastructure`, `packages/ui` | 0 | 0 | sin tests | — |
| **Total** | **61** | **572** | 571 pasan, 1 falla | |

- **Archivos de `web-admin` con tests: 0** (≈20 000 líneas sin pruebas, doc 09 §1).
- **Fallo preexistente:** `packages/db/migracion-excel/leerEstilosExcel.test.ts` › «encabezados de la fila 3 y rellenos» falla con `ENOENT` al abrir `docs/xls/DATA ADRENALINA_hoy.xlsm`, un archivo que el propio Repo A no versiona. Es ambiental y de código que S-00 excluye.
- Los 5 archivos de test de `packages/db` están en `clonarZipGym/` y `migracion-excel/` (excluidos): tras las exclusiones `packages/db` queda **sin tests** y `vitest run` sin archivos termina con error (S-00 SUP-S00-015).
- **Corrección al doc 09 V-02:** el conteo estático daba ≈375; la ejecución mide **390** pruebas de dominio, que era la cifra original.

## 2. Lint (`npx turbo run lint`)
Resultado: **3 tareas correctas, 0 errores** (13 s). Avisos: `kiosk` 1, `web-admin` 14.

## 3. Tipos (`npx tsc --noEmit -p tsconfig.json`)
No existe el script `typecheck`; solo `web-admin`, `kiosk` y `vitrina` tienen `tsconfig.json`.
| App | Resultado |
|---|---|
| `kiosk` | 0 errores |
| `vitrina` | 0 errores |
| `web-admin` | 44 errores sin generar el cliente de Prisma (`tx` implícito en `any`); **1 error** con el cliente generado (`app/layout.tsx(18,50)`: `LayoutProps` no existe, es un tipo que Next genera al compilar) |

El cliente se genera con `npm run generate --workspace packages/db` (Prisma 7.10.0).

## 4. Build (`npx turbo run build --continue`)
| App | Resultado |
|---|---|
| `web-admin` | compila (16 s) |
| `kiosk` | compila (7 s) |
| `vitrina` | **falla** por `next/font/google`: no puede descargar *Barlow* ni *Bebas Neue* (`apps/vitrina/app/layout.tsx:2`). Es la única app que usa Google Fonts. En este entorno el host está bloqueado; en una máquina con internet compilaría. Importa para la tipografía (S-19) y para un TV sin conexión |

## 5. `npm audit`
**21 vulnerabilidades:** 11 moderate, **9 high y 1 critical**. La crítica es `next`. Los avisos high y critical, con sus identificadores, están en `docs/linea-base-audit.json` (lectura por máquina para el CI de S-00, REQ-S00-016). Incluye `xlsx` (high), que S-00 conserva en `packages/db/package.json` aunque excluya los scripts de Excel.

## 6. Mediciones de acoplamiento (grep por patrón sobre `apps` y `packages`)
| Término | Archivos |
|---|---:|
| `organizacionId` | 175 (144 de código fuente; 73 solo por ese motivo) |
| `organizacion` (cualquier forma) | 178 |
| `turno` | 78 |
| `arqueo` / `egreso` | 24 / 22 |
| fiado (`deudaProducto`, `fiar`, `Deuda`) | 46 |
| `sucursal` | 194 |
Criterio y límites: `docs/anexos/inventario/README.md`; el inventario oficial reproduce las cifras de `docs/09` §5.

## 7. Datos de estructura
36 migraciones y `migration_lock.toml`; `schema.prisma` de 723 líneas con 25 modelos y 14 enums; 7 apps y 8 directorios en `packages`; 13 variables de entorno leídas con `process.env` (12 con punto y `DATABASE_URL_LOCAL` con corchetes). Detalle en `docs/09` §8.
