# 07 — Plan de implementación y roadmap

Versión 0.3 · 2026-11-12 (v0.1: 2026-11-11). Estimaciones **orientativas** (1 desarrollador asistido por IA; incluyen tests). Se recalibran al cierre de la Fase 0, cuando ya se haya corrido la suite del repo base.

Convención de trabajo heredada de `gym-app` (se mantiene): plan + spec fechados por feature en `docs/superpowers/{plans,specs}/`, ADRs en `docs/adr/`, commits **en español, una línea, sin firmas**, `handoff.md` al cerrar sesión (nuevo, limpio, sin PII).

## Resumen de fases

| Fase | Objetivo | Duración | Entregable verificable |
|---|---|---|---|
| **0** Preparación | Repo privado, limpio, reproducible y con baseline de seguridad | 3-5 d | `npm ci && npm run build && npm test` verdes en CI desde cero; BD local con Docker Compose |
| **1** Núcleo Perú | PEN + sede única + DNI + hora Lima + sin abonos + baseline BD | 20-28 d | Flujo completo: alta → cobro → check-in → cierre de turno, todo en S/ |
| **2** Operación y cumplimiento | Comprobantes, consentimiento, pagos locales, reportes, hardening | 8-10 d | Piloto en el local con datos de prueba |
| **3** Extensiones | Vitrina, kiosk-host, WhatsApp, facturación electrónica, web pública | A definir | Según prioridades del cliente |

## Fase 0 — Preparación (sin bloqueos: repo propio confirmado)

| # | Tarea | Criterio de aceptación |
|---|---|---|
| 0.1 | ~~Confirmar licencia~~ Resuelto (repo propio). Añadir aviso de copyright/licencia privativa al repo nuevo; **hacer privado o depurar el repo original público** (contiene PII) | Repo original privado o historial depurado |
| 0.2 | Crear repo **privado** `adhara-fit` con **copia sin historial** del commit `b4352a0` | `git log` muestra un solo commit inicial; sin `.git` del origen |
| 0.3 | Excluir: `cookies.txt`, `handoff.md`, `reset-vencimientos-log-*.json`, `.windsurf/`, `.agents/`, `skills-lock.json`, `docs/xls/`, scripts `zip-gym`, los dos `debug.keystore` (`apps/kiosk-tv` y `apps/vitrina-tv`) y **todos** los scripts de mantenimiento de `packages/db`; revisar `.github/workflows` (APK) | `gitleaks` y búsqueda de "cédula/Adrenalina/zip" sin hallazgos |
| 0.4 | Nuevo `README.md`, `CLAUDE.md` (conservar reglas de commits/handoff), `.env.example`, `.gitignore` reforzado | Un dev nuevo levanta el proyecto en < 30 min siguiendo el README |
| 0.5 | `docker-compose.yml` con Postgres + web-admin | `docker compose up` funciona |
| 0.6 | CI GitHub Actions: lint, tsc, tests por workspace, build, gitleaks, `npm audit` | Pipeline verde en `main` y PR |
| 0.7 | Correr la suite del base **antes** de cambiar nada y registrar línea base | Reporte: nº de tests, fallos preexistentes |
| 0.8 | Rotar/crear credenciales nuevas (BD, R2, API keys) — ninguna del base | Gestor de secretos |
| 0.9 | Aplicar branding mínimo: nombre, logo, favicon, paleta (ver ADR-008) | Login y kiosco muestran identidad Adhara |
| 0.10 | **Baseline de seguridad (ADR-012):** `activo` en login/sesión + invalidar sesiones, límite de intentos, rotación y hash de API key, permiso en cada caso de uso, validación de entrada, seed sin contraseñas fijas, cabeceras | Test de contrato recorre rutas y acciones y falla si alguna no declara permiso (hoy fallarían `miembros`, `planes`, `pagos` GET, `caja/ultimo-cierre`, `tasa-cambio`, `foto-proxy`); cada punto del ADR tiene test |
| 0.11 | Tests de integración del flujo de cobro sobre Postgres efímero (antes de reescribir pagos) | Suite verde sobre el comportamiento actual de `RegistrarPago`/`CerrarTurno` |

## Fase 1 — Núcleo Perú

Orden pensado para **minimizar el tiempo con el repo roto**: primero quitar lo que se borra, luego reemplazar tipos con el compilador como guía.

| # | Tarea | Depende | Esf. | Criterio de aceptación |
|---|---|---|---|---|
| 1.1 | Eliminar `apps/worker`, `BcvApiAdapter`, casos de uso y UI de tasa | 0.7 | M | Sin referencias a `tasaCambio`/`BCV` salvo en datos que se eliminan después |
| 1.2 | Eliminar padrón Excel (modelos, casos, UI, scripts, docs) | 0.7 | M | `grep -ri "padron\|Excel"` solo en changelog |
| 1.3 | Eliminar scripts de `packages/db` del cliente anterior | 0.7 | S | Directorio `packages/db` solo con schema, seed, migraciones, utilidades genéricas |
| 1.3b | **Reescribir** el flujo de pago sin abonos (ADR-010): `RegistrarPago` (transaccional), caja, check-in, kiosco, planes, configuración; eliminar `saldoAFavor`, `completarCicloAbierto`, tolerancia | 0.11 | **XL** | `grep -ri abono` sin resultados; el pago exige el total del plan; operación atómica; **rechaza cobrar una membresía sin turno abierto** (salvo fecha pasada); una sola fuente de vigencia; tests adaptados |
| 1.4 | Moneda PEN en **céntimos enteros** (ADR-011): renombrar campos `*USD`, quitar `Bs`, unificar fondo/egreso, catálogo de métodos de pago con `esEfectivo` | 1.1, 1.3b | **XL** | `tsc` limpio; tests adaptados; ningún `.toNumber()` fuera de la frontera del repositorio; arqueo sin literales de método |
| 1.5 | `fechaLima` + `TZ=America/Lima` + auditoría de getters locales y `toLocale*` (doc 09 §3.3) | — | **L** | Tests de borde 23:59/00:00 Lima y 19:00 Lima; ningún `4 * 3_600_000` |
| 1.6 | Documento: `tipoDocumento` + `numeroDocumento`, validadores, kiosco por DNI/código socio | 1.4 | M | CA de HU-01; kiosco solo acepta dígitos |
| 1.7 | Sede única: seed, ocultar selectores/menú/rutas, eliminar `UsuarioSucursal` y "Ambas", mover `diasGracia` y `reposo*` a config | 1.4 | **L** | Ningún texto ni ruta menciona "sucursal"; API key del kiosco funciona |
| 1.8 | `ConfiguracionOrganizacion` + pantalla de configuración | 1.7 | S | Cambiar días de gracia surte efecto en kiosco |
| 1.9 | Métodos de pago Perú (enum, UI, seed) | 1.4 | M | HU-41 |
| 1.10 | Baseline de migración + seed Adhara + prueba de integración con Postgres efímero | 1.4-1.9 | M | `migrate deploy` en BD vacía deja el sistema usable |
| 1.11 | Textos/ES-PE: quitar vocabulario venezolano, formateo `S/` | 1.4 | S | Revisión de UI completa con checklist |
| 1.12 | Corregir bug `reabrirPorGrupo` (filtrar por organización) | — | XS | Test que lo reproduce |
| 1.13 | Prueba manual guiada del flujo completo (checklist) | todas | S | Checklist firmado; fallos → issues |
| 1.14 | Cambio de plan: unificar o conservar los tres flujos (doc 09 §3.2) en PEN | 1.4 | M | Spec decide; tests de prorrateo y de pago exacto |
| 1.15 | Baja lógica y `AnonimizarMiembro` (ADR-013); quitar `eliminarConHistorial` | 1.4 | M | Un pago nunca desaparece de caja por dar de baja a un miembro |
| 1.16 | Caja con turno compartido: traspaso de turno (ADR-002, P-19) | 1.4 | S | Abrir con otro turno abierto muestra quién y ofrece traspaso |

**Hito M1:** demo del flujo inscripción → cobro → check-in → cierre, en S/.

## Fase 2 — Operación y cumplimiento

| # | Tarea | Esf. | Criterio |
|---|---|---|---|
| 2.1 | Comprobante en el pago (tipo/serie/número/RUC) + reporte | M | HU-13 |
| 2.2 | Consentimiento de datos + política + versionado | S | HU-03 |
| 2.3 | Libro de Reclamaciones: aviso y enlace; pantalla de ayuda | XS | Aviso visible en panel y web |
| 2.4 | Importador CSV de miembros (HU-50) | M | Dry-run con reporte, `--confirm` |
| 2.5 | Reportes: morosos, por vencer (7 días), ingresos por método/período | M | Imprimibles |
| 2.6 | Endurecer seguridad: hash de API key de kiosco, rate-limit en login y check-in, cabeceras de seguridad, CORS estricto | M | Revisión OWASP básica |
| 2.7 | Backups automáticos + procedimiento de restauración probado | S | Restauración exitosa documentada |
| 2.8 | Observabilidad: `/api/health`, alertas | S | Alerta de prueba recibida |
| 2.9 | Despliegue a staging y producción; dominio y TLS | M | Go-live checklist |
| 2.10 | Piloto con el personal; ajustes de usabilidad | M | Métricas de §4 del PRD medidas |

**Hito M2:** go-live del MVP.

## Fase 3 — Backlog priorizable

| Ítem | Esf. | Condición |
|---|---|---|
| ~~Sitio web público~~ | — | Descartado el 12-nov-2026 (sistema interno en subdominio) |
| Vitrina de TV + APK (adaptar a PEN; quitar Bs) | M | Smart-TV no previsto; reevaluar |
| `kiosk-host` Windows (numpad) | S | P-05 |
| Recordatorios por WhatsApp (API oficial o proveedor) | L | Costos y consentimiento |
| Facturación electrónica con OSE | L-XL | Régimen tributario confirmado |
| Congelamiento de membresía | M | Política comercial |
| QR/huella/tarjeta | L | Hardware |
| Dashboard de gestión | M | — |

## Riesgos del plan

| Riesgo | Mitigación |
|---|---|
| Descubrir en Fase 0 que la suite del base ya falla | Registrar línea base; no atribuirla a nuestros cambios |
| Cambio de moneda rompe muchos tests a la vez | Commits pequeños por módulo; `Decimal` y tipos como guía |
| Alcance crece ("web", WhatsApp, facturación) | Release 1 congelado en HU del PRD; extras a Fase 3 |
| Cumplimiento legal subestimado | Revisión legal del consentimiento y términos antes del go-live |
| Dependencia de una sola persona | Docs + ADRs + handoff limpio |

## Definición de "terminado" por tarea

Código + tests (dominio con Vitest) + `tsc`/lint limpios + CI verde + doc/ADR actualizados si hubo decisión + prueba manual cuando haya UI + commit de una línea en español.
