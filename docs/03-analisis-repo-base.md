# 03 — Análisis del repositorio base `kaiserone01/gym-app`

Analizado el 2026-11-11 (y verificado contra el código el 2026-11-12, ver doc 09) sobre un clon superficial (`--depth 1`, commit `b4352a0`). **No se instalaron dependencias ni se ejecutaron tests** (sin acceso a registros de paquetes en este entorno): las cifras de tests provienen de los archivos y del `handoff.md` del propio repo (dominio 390 OK, db 70, kiosk 45), no de una corrida mía.

## 1. Ficha técnica

| Aspecto | Valor |
|---|---|
| Tipo | Monorepo Turborepo + npm workspaces (`npm@10.9.7`) |
| Tamaño | ≈ 40 900 líneas TS/TSX · 732 commits · público, sin licencia declarada |
| Frontend | Next.js 16.3 (App Router), React 19.2, Tailwind 4 |
| Datos | PostgreSQL + Prisma 7 con `@prisma/adapter-pg`; 723 líneas de schema; **36 migraciones** |
| Almacenamiento | Cloudflare R2 (fotos, medios de vitrina) vía URL prefirmada |
| Auth | Sesión propia (`Sesion` en BD) + bcrypt; kiosco con API key por sede |
| Pruebas | Vitest 5; tests junto al código; 39 archivos solo en `packages/domain` |
| Despliegue | `Dockerfile` raíz + Dockerfiles por app; EasyPanel por webhook; CI en GitHub Actions (APK y verificación de vitrina) |
| Convenciones | Español en commits/ramas/migraciones; plan + spec dated en `docs/superpowers/`; ADRs en `docs/adr/`; `handoff.md` al cerrar sesión |

## 2. Mapa del monorepo

```
apps/
  web-admin/     Next.js — panel (miembros, caja, pagos, planes, en-sala, productos,
                 configuraciones, kiosko, vitrina, sucursales, usuarios) + API REST
  kiosk/         Next.js export estático — check-in (cero lógica de negocio, ADR-001)
  kiosk-tv/      Cáscara Capacitor (Android) del kiosco
  kiosk-host/    WinForms + WebView2 — reenvía solo el numpad RAIKU K-601 al kiosco
  vitrina/       Next export estático — carteleria digital para TV
  vitrina-tv/    Cáscara Capacitor (Android TV) de la vitrina
  worker/        Script TS: actualizar-tasa (BCV) para cron
packages/
  domain/        Lógica pura: entities, use-cases, ports, services, utils (hexagonal)
  infrastructure/ Adaptadores: Prisma, bcrypt, KioskTokenValidator, BcvApiAdapter, R2
  db/            Schema Prisma, migraciones, seed y ~12 scripts de mantenimiento
  ui/ theming/ design-system/ config/ domain-custom/   (algunos vacíos: solo .gitkeep)
docs/            ROADMAP, ADR-001/002, specs y planes, análisis del Excel, tema visual
```

## 3. Hallazgos de acoplamiento (medidos con `grep` sobre el clon)

| Acoplamiento | Archivos que lo mencionan | Consecuencia |
|---|---|---|
*Cifras reemplazadas en v0.3 por el inventario reproducible (`anexos/inventario/`): archivos de código + tests + scripts con al menos una coincidencia. Ver doc 09 §5 para la tabla completa y sus límites.*

| Acoplamiento | Archivos (src+test+scripts) | Consecuencia |
|---|---:|---|
| `sucursal` (cualquier mención) | **183** (154 src) | Quitar el modelo sería cirugía mayor; ocultarlo es barato (ADR-002) |
| tasa de cambio / BCV | 90 | Worker BCV, historial de tasas, reloj con tasa en el layout |
| `*USD` (campos monetarios) | 109 | El precio base es USD; PEN no existe |
| `Bs` / bolívares | 59 | Doble moneda en pagos, caja, egresos, vitrina |
| `abono` | 66 (53 src) | Atraviesa pagos, check-in, kiosco, planes, configuración |
| padrón Excel | 63 | Modelos, casos de uso, scripts y UI del cliente anterior |
| cédula | 61 | Documento venezolano; validación "solo dígitos" en el kiosco |
| Caracas / Venezuela | 33 | Más el `TZ` del proceso y el offset fijo de 4 h (doc 09 §3.3) |
| marca/tenant anterior | 40 | Marca, tema verde, scripts de clonado `zip-gym` |
| métodos de pago VE | 15 | Pago Móvil, Biopago, etc. como cadenas en caja |

## 4. Hallazgos de higiene y seguridad (importantes antes de clonar)

1. **`cookies.txt` está versionado** en la raíz (254 bytes, formato curl/Netscape, con una cookie `sesion_token` de `localhost`). Es un artefacto de pruebas, pero en un repo público es una mala práctica y puede revelar el formato de sesión. **No copiar.**
2. **`handoff.md` pesa 273 KB** y narra operaciones de producción con **nombres y cédulas de personas reales** (p. ej. correcciones de fichas de miembros). Contiene PII del cliente anterior. **No copiar.**
3. `packages/db/reset-vencimientos-log-2026-09-27.json` (10 KB) lista `miembroId`, **nombre** y fechas de vencimiento de miembros reales (verificado al abrirlo). **No copiar.**
4. El propio `handoff.md` registra credenciales expuestas en un chat (BD, R2, API key de `zip-gym`) pendientes de rotar. Adhara debe partir con **credenciales nuevas**.
5. Repo **sin licencia declarada**. Resuelto el 12-nov-2026: el repo es propio; basta añadir un aviso de copyright/licencia privativa al repo nuevo.
6. **No hay `.env.example`**: las variables solo se descubren con `grep process.env`. Se creará en Fase 0.
7. `README.md` es el texto por defecto de `create-next-app`; `CLAUDE.md` es la fuente real de orientación.
8. Hay un directorio `app/generated` "huérfano" en la raíz que el propio `CLAUDE.md` marca como por verificar.
9. Bug latente documentado por el autor: `PrismaDeudaProductoRepository.reabrirPorGrupo` hace `updateMany` por `grupoPagoId` **sin filtrar por organización**. Con una sola organización no se manifiesta, pero conviene corregirlo (1 línea) en Fase 1.
11. **Verificado en el fuente (doc 09 §4):** las cuentas desactivadas siguen pudiendo iniciar sesión y desactivar no invalida sesiones; sin límite de intentos de login; API key de kiosco en claro y sin rotación; credenciales fijas en el seed (`admin1234`, `entrenador1234`); dos `debug.keystore` versionados; `EliminarMiembro` borra pagos e historial.
10. Regla del `CLAUDE.md` del repo: commits **solo en español, una línea, sin firmas de IA**. Se mantiene en el repo de Adhara (ver ADR-005).

## 5. Matriz de decisiones por módulo

Esfuerzo: **XS** < 0,5 d · **S** ~1 d · **M** 2-3 d · **L** 4-6 d · **XL** > 1 sem (estimación orientativa para 1 desarrollador asistido por IA; incluye tests).

### 5.1 Conservar tal cual (o con ajustes de texto)

| Módulo | Ubicación | Notas | Esf. |
|---|---|---|---|
| Sesiones, login, hash | `domain/use-cases/IniciarSesion`, `infrastructure/auth` | — | — |
| Roles y permisos granulares | `PermisoUsuario`, `AuthorizationService` | Quitar módulo `SUCURSALES` | XS |
| Check-in e idempotencia | `RegistrarCheckIn`, `apps/kiosk` | Cambiar validación de documento | S |
| En sala + historial | `ListarEnSala`, `/en-sala` | Zona horaria | XS |
| Entrenadores | `UsuarioAdmin` rol `ENTRENADOR` | — | — |
| Reposo configurable del kiosco | `reposo*` en `Sucursal` | Mover a configuración global | S |

### 5.2 Adaptar

| Módulo | Qué cambia | Esf. |
|---|---|---|
| **Moneda → PEN** | `precioUSD`→`precio`, `saldoAFavorUSD`→`saldoAFavor`, quitar `tasaCambio`/`montoBs` de `Pago`/`Egreso`, `fondoInicialEfectivoUSD/Bs` → un solo fondo, `MonedaEgreso` desaparece, formatos `es-PE` | **L** |
| **Zona horaria** | `fechaCaracas.ts` → `fechaLima.ts` (UTC-5, sin DST) + `TZ` del Dockerfile + getters locales (33 archivos con mención, ≈ 10 con `setHours`; doc 09 §3.3) | L |
| **Documento de identidad** | `cedula` → `tipoDocumento` + `numeroDocumento`; validadores DNI (8 dígitos), CE, pasaporte; kiosco acepta DNI | M |
| **Métodos de pago** | Catálogo Perú (Yape, Plin, tarjeta, transferencia por banco, depósito); enum `TipoMetodoPago`; quitar `PAGO_MOVIL`, `BIOPAGO`, bancos VE; campos `codigoBanco`, `rif`→`ruc` | M |
| **Caja / turnos / arqueo** | Un solo efectivo; `ObtenerResumenTurno` deja de mapear `efectivo_usd`/`efectivo_bs` | M |
| **Planes** | Quitar `multisede`; precios en S/; presets nuevos | S |
| **Sucursal → sede única** | Una fila oculta; quitar selector, `UsuarioSucursal`, sesión con sucursal activa, módulo `SUCURSALES`, "Ambas" | **L** |
| **Marca y tema** | Verde Adrenalina → amarillo `#FFCB04` / negro `#231F20` / blanco; logo; `packages/theming/tokens.ts`; nombre | M |
| **Productos** | Precios en S/; decidir fiado (P-06) | S |
| **Días de gracia** | De `Sucursal.diasGracia` a configuración global | S |

### 5.3 Eliminar

| Elemento | Motivo | Esf. |
|---|---|---|
| `apps/worker`, `BcvApiAdapter`, `TasaCambio`, `RegistrarTasaManual`, `ObtenerTasaVigente`, `ListarHistoricoTasas`, `ConvertirMontoUSDaVES`, `RelojYTasa*`, `ModalHistorialTasas`, `tasaBcvFija.ts` | Sin tipo de cambio | M |
| `MiembroReferencia`, `PadronHoja`, menú Excel, `ActivarMiembroDesdePadron`, `EditarMiembroReferencia`, `migracion-excel/`, `importarPadronExcel.ts`, `docs/xls/` | Específico del cliente anterior | M |
| `clonarSedePrincipalAZipGym*`, `sembrarOrganizacionZipGym`, `limpiarOrganizacionParaMigracion`, `marcarAjustarFecha`, `resetVencimientosPrueba`, `diagnosticoVencimientos`, `reset-vencimientos-log-*.json` | Scripts puntuales del cliente anterior | S |
| `Miembro.genero`, `porRegularizar`, `vieneDelExcel` y su lógica de ficha | Sin uso / dependientes del Excel | S |
| `cookies.txt`, `handoff.md` (273 KB), `.windsurf/`, `.agents/`, `skills-lock.json` | PII / herramientas ajenas | XS |
| Migraciones 1-36 | Se reemplazan por un **baseline único** (ADR-005/06) | M |
| **Pagos fraccionados (abonos)**: `ReglaAbonoPorFrecuencia`, `ReglaAbono.ts`, `CobrarAbonoPendiente`, `ListarAbonosPendientes`, `proyeccionAbono.ts`, `ModalCobrarDeudas` (parte de abonos), `/configuraciones/reglas-abono`, `Plan.permitePagoParcial/minimoAbono*`, `Suscripcion.fechaLimiteAbono`, estados de abono en kiosco y check-in | ADR-010; **66 archivos** mencionan "abono" | **L** |

### 5.4 Diferir (post-MVP)

| Módulo | Cuándo | Condición |
|---|---|---|
| `apps/vitrina`, `apps/vitrina-tv`, workflows APK | Fase 3 | Smart-TV no previsto (12-nov), no descartado: reevaluar si se quiere cartelería. Además muestra precios en Bs: hay que adaptarla |
| `apps/kiosk-host` (WinForms) | Fase 3 | Si usa el numpad RAIKU K-601 u otro hardware |
| `apps/kiosk-tv` (Capacitor del kiosco) | Fase 3 | Si el kiosco será tablet Android |

## 6. Estimación agregada del trabajo de adaptación

| Bloque | Esfuerzo |
|---|---|
| Fase 0 (repo limpio, CI, branding mínimo, `.env.example`, suite base, baseline de seguridad ADR-012) | ~3-5 d |
| Fase 1 (PEN en centavos, sede única, DNI, hora Lima en 3 capas, reescritura de pagos sin abonos, catálogo de métodos, baja lógica, baseline BD, tests verdes) | ~20-28 d |
| Fase 2 (comprobantes, consentimiento, métodos de pago, reportes, endurecimiento) | ~8-10 d |
| **Total MVP** | **≈ 7-9 semanas** de un desarrollador (rango amplio: no hay datos de velocidad real ni acceso para correr la suite) |

## 7. Riesgos del repo base

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Suite de tests no corre limpia tras el cambio de moneda (≈375 casos de dominio con supuestos USD/Bs; la suite no se ha ejecutado) y `web-admin` sin tests | Alta | Medio | Refactorizar primero tipos/`Decimal` con los tests como red de seguridad; cambios en commits pequeños |
| Funcionalidades nunca probadas en navegador según el propio handoff (ficha, Excel, kiosco en TV real) | Media | Medio | Pruebas manuales guiadas en Fase 1 con checklist |
| Dependencia de `prisma7.local.config.ts` y de `.env` apuntando a producción | Media | Alto | Un `.env.example`, BD local en Docker Compose, **nunca** `migrate` contra producción desde local |
| Fechas dependientes de `TZ` del proceso, offset fijo de 4 h y getters locales | Alta | Medio | Módulo único `fechaLima` + `TZ=America/Lima` + pruebas de medianoche; auditar `setHours`/`getDate` |
| Falta de licencia | — | — | Resuelto: repo propio (12-nov-2026) |
| Vulnerabilidades heredadas (login, sesiones, API key, permisos) | Alta | Alto | ADR-012 antes de las funcionalidades |
| Pagos reescritos sin red de seguridad en la UI | Media | Alto | Tests de integración sobre Postgres efímero y e2e del flujo de cobro antes de tocar `RegistrarPago` |
