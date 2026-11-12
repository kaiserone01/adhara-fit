# Adhara Fit — Paquete documental de arranque

> Estado: **borrador v0.4 para validación** · Fecha: 2026-11-12 (v0.1: 2026-11-11 · v0.2: 2026-11-12) · v0.3 incorpora la verificación contra el código fuente (doc 09) · v0.4 añade el prompt inicial de la sesión limpia (doc 12: SDD, ADR primero, arnés, identidad del propietario y protocolo de handoff) · Idioma: español (misma convención que el repo base)

Sistema de gestión de gimnasio con control de accesos para **Adhara Fit** (Perú, moneda **PEN / Soles**, un solo local), construido sobre el repositorio base `kaiserone01/gym-app` (commit analizado: `b4352a0`, rama `main`, 11-nov-2026).

## Cómo leer este paquete

> **Nota ADR-022 (2026-11-12):** donde los documentos 01, 03, 10 y 12 nombran Prisma (pila del repo base, adaptadores, prompts históricos), rige ADR-022: el ORM pasa a Drizzle. Son documentos históricos y no se reescriben.

| # | Documento | Para qué sirve |
|---|---|---|
| 01 | [Levantamiento de requerimientos](01-levantamiento-requerimientos.md) | Qué necesita el negocio: alcance, RF, RNF, reglas de negocio, supuestos y preguntas abiertas |
| 02 | [PRD](02-PRD-adhara-fit.md) | Producto: personas, historias de usuario, MVP, métricas, releases |
| 03 | [Análisis del repo base](03-analisis-repo-base.md) | Qué hay en `gym-app` y matriz módulo por módulo: conservar / adaptar / eliminar / diferir |
| 04 | [Arquitectura objetivo](04-arquitectura-objetivo.md) | Stack, componentes, despliegue, seguridad, datos |
| 05 | [Adaptación a Perú](05-adaptacion-peru.md) | Moneda, DNI, zona horaria, comprobantes SUNAT, pagos locales, protección de datos |
| 06 | [Cambios al modelo de datos](06-modelo-datos-cambios.md) | Diff conceptual del esquema (notación Prisma; ORM sustituido por Drizzle, ADR-022) y estrategia de migración |
| 07 | [Plan de implementación y roadmap](07-plan-implementacion-roadmap.md) | Fases, tareas, criterios de aceptación, estimaciones, riesgos |
| 08 | [Decisiones pendientes](08-decisiones-pendientes.md) | Lo que necesito que el cliente/usted confirme antes de Fase 1 |
| 09 | [Verificación contra el código](09-verificacion-contra-codigo.md) | Cada afirmación de estos documentos contrastada con el fuente: confirmada / corregida / nueva, con evidencia |
| 11 | [Verificación del Documento de Ingeniería](11-verificacion-documento-ingenieria.md) | 93 afirmaciones del documento de ingeniería contrastadas con el fuente (73 confirmadas, 10 con matiz, 6 incorrectas o incompletas, 4 no verificadas) + 7 hallazgos nuevos |
| 12 | [Prompt inicial de la sesión limpia (Repo B)](12-prompt-inicial-claude-code.md) | **Mensaje de apertura vigente**: SDD con cuatro pilares, revisión de ADRs primero, andamiaje y arnés, reglas innegociables de firma/credenciales y protocolo de handoff |
| 10 | [Prompt para Claude Code (SDD) — referencia](10-prompt-claude-code.md) | Sustituido por el doc 12 como apertura; se conserva su tabla de specs S-00…S-10 y sus criterios de calidad |
| Anexo | [`anexos/inventario/`](anexos/inventario/) | Inventario reproducible de acoplamiento (script + listas por término) |
| ADR | [`adr/`](adr/) | Registros de decisión de arquitectura (ADR-001 a ADR-013) |

## Resumen ejecutivo (1 minuto)

- **El repo base es una buena base de dominio, pero hay que reescribir más de lo previsto**: dominio hexagonal (`packages/domain`, 39 archivos de test, ≈375 casos), caja con turnos y arqueo, kiosco de check-in, roles y permisos granulares, Prisma 7 + Postgres, Docker. La cifra "~70 % reutilizable" de v0.2 era una estimación sin base medida y se retira; el núcleo de pagos (`RegistrarPago`, 511 líneas, no transaccional) y la caja deben **reescribirse**, y `web-admin` (≈20 000 líneas) **no tiene ningún test**.
- **Está acoplado a Venezuela y a multi-sede** (archivos de código, tests y scripts con coincidencia, criterio en `anexos/inventario/`): `sucursal` 183, tasa/BCV 90, `Bs` 59, `*USD` 109, cédula 61, Caracas/Venezuela 33 — y la zona horaria depende además del `TZ` del proceso y de un offset fijo de 4 h (doc 09 §3.3).
- **Además trae material específico del cliente anterior** (Adrenalina Xtreme): padrón Excel, scripts de clonado `zip-gym`, `handoff.md` de 273 KB, un log JSON de datos y un `cookies.txt` versionado en un repo **público**. Nada de eso debe llegar al repo de Adhara.
- **Permisos incompletos** (doc 11): crear/editar miembros y planes, y listar pagos, no exigen permiso ni en la ruta ni en el caso de uso; `RegistrarPago` tampoco exige turno abierto.
- **Hallazgos de seguridad heredados** (doc 09 §4, ADR-012): las cuentas desactivadas pueden iniciar sesión, no hay límite de intentos de login, la API key del kiosco está en claro y sin rotación, y borrar un miembro destruye sus pagos (ADR-013). Se corrigen **antes** de construir funcionalidades.
- **Recomendación**: nuevo repo **privado** sin historial (ADR-005) → modo *sede única* con una fila `Sucursal` oculta (ADR-002) → moneda única PEN sin tasa de cambio (ADR-003) → DNI/CE/Pasaporte (ADR-004) → baseline de migraciones nuevo.
- **Decisiones confirmadas el 12-nov-2026:** el repo es propio (sin bloqueo legal); es un sistema web **interno** en un subdominio, sin sitio público; solo PEN y un local; **sin pagos fraccionados** (un pago por membresía, ADR-010); smart-TV no previsto pero no descartado. **Pendientes:** régimen tributario/comprobantes, productos con fiado, dispositivo de check-in, ¿pago dividido entre métodos? Ver doc 08.

## Convenciones

- Los términos de dominio se mantienen en español como en el código (`Miembro`, `Plan`, `Suscripcion`, `Turno`, `Pago`).
- Marcadores: **[SUPUESTO]** = decidido por mí para poder avanzar, requiere confirmación; **[PREGUNTA]** = bloquea o cambia el alcance; **[VERIFICAR]** = hecho legal/tributario que debe confirmar un contador o abogado peruano.
- "PDR" en la solicitud se interpretó como **PRD** (Product Requirements Document). Si se refería a otro documento, avísame.
