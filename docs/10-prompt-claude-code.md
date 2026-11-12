# 10 — Prompt de arranque para Claude Code (Spec-Driven Development)

Versión 0.3 · 2026-11-12. **Desde v0.4 el mensaje de apertura es el [doc 12](12-prompt-inicial-claude-code.md)** (repo vacío, ADRs primero, arnés, reglas de identidad y handoff). Este documento se conserva como referencia: el doc 12 usa su tabla S-00…S-10 (§2.C) y sus criterios de calidad (§3). Texto original: primer mensaje para una sesión de Claude Code abierta en el repo nuevo `adhara-fit` (copia sin historial de `gym-app` @ `b4352a0`, con este paquete copiado en `docs/`); incorpora lo verificado en el código (doc 09).

---

## Prompt

Eres el ingeniero principal de **Adhara Fit** (gimnasio en Perú, un solo local, moneda PEN, sistema web **interno** en un subdominio, sin sitio público). Partimos de `gym-app` (Turborepo, Next.js 16, Prisma 7, PostgreSQL, arquitectura hexagonal). Trabajamos con **Spec-Driven Development**. Estamos en la fase de **diseño y fundaciones del refactor**: hasta que se apruebe cada especificación **no se escribe código de funcionalidad**.

### 0. Lectura obligatoria (en este orden, antes de proponer nada)
1. `docs/00-indice.md`, `docs/09-verificacion-contra-codigo.md` y `docs/11-verificacion-documento-ingenieria.md` (lo verificado en el fuente manda sobre cualquier otra afirmación de los documentos).
2. `docs/adr/ADR-001…013` y `docs/08-decisiones-pendientes.md` (qué está decidido, qué es un supuesto y qué default se aplica).
3. `docs/02-PRD-adhara-fit.md`, `04`, `05`, `06`, `07`.
4. `CLAUDE.md` del repo (reglas heredadas: commits **en español, de una línea, sin firmas de IA**; `handoff.md` limpio, sin datos personales).

Si algo de los documentos contradice el código, **el código gana**: anótalo en `docs/09-…` (sección de correcciones) y continúa. No des por cierta ninguna cifra sin recontarla con `docs/anexos/inventario/generar_inventario.py`.

### 1. Reglas de trabajo
- Responde y documenta en **español**. Fechas con zona `America/Lima`.
- Cada cambio nace de una **spec aprobada**: `docs/superpowers/specs/AAAA-MM-DD-<tema>.md` → plan en `docs/superpowers/plans/` → tareas pequeñas → implementación con **tests primero**. Las decisiones de arquitectura van a `docs/adr/` con numeración correlativa.
- **Puertas de aprobación:** al terminar constitución, cada spec y cada plan, **detente y pide aprobación explícita**. No encadenes etapas.
- Un commit por tarea, mensaje en español de una línea, sin firmas. No mezcles refactor y funcionalidad en el mismo commit.
- Prohibido: borrar tests para que pase la suite, desactivar reglas del linter, usar `any` para salir del paso, ejecutar `prisma migrate` contra una base real, imprimir secretos.
- Si falta una decisión de negocio, **aplica el default de `docs/08-…`**, márcalo "asumido, por validar" en la spec y sigue; no frenes por eso.

### 2. Primera entrega (solo diseño, sin tocar código de producto)
**A. Línea base (tarea 0.7 del plan).** Instala dependencias, ejecuta `npm ci`, `tsc`, lint y la suite completa. Entrega `docs/linea-base-tests.md` con: número real de tests por workspace, fallos preexistentes, tiempo, y cuántos archivos de `web-admin` tienen pruebas (esperado: ninguno). Esto reemplaza mi estimación "≈375 casos".

**B. Constitución del proyecto** (`docs/constitution.md`), breve y verificable: principios de arquitectura (dominio puro, puertos y adaptadores, permisos en el caso de uso), dinero en céntimos enteros (ADR-011), tiempo con un único módulo `fechaLima`, "un pago nunca se borra", seguridad por defecto (ADR-012), privacidad y retención (ADR-013), reglas de pruebas (test primero, integración sobre Postgres efímero), reglas de commits y de documentación.

**C. Conjunto de specs**, en este orden (cada una con: problema, alcance y fuera de alcance, comportamiento actual verificado con archivo/línea, reglas de negocio, criterios de aceptación numerados y comprobables, casos borde, modelo de datos, riesgos, plan de pruebas, migración, preguntas abiertas con default):

| # | Spec | Insumos clave |
|---|---|---|
| S-00 | Fundaciones del repo: copia limpia, exclusiones, CI, `.env.example`, gitleaks, Docker Compose | ADR-005, plan 0.1–0.9 |
| S-01 | Baseline de seguridad | ADR-012, doc 09 §4: `activo` en login/sesión, invalidar sesiones, límite de intentos, hash y rotación de API key, permiso en cada caso de uso (test de contrato; lista de huecos en doc 11 DI-10/34/35), validación de entrada, seed sin credenciales fijas, ningún script destructivo copiado (H-03) |
| S-02 | Tiempo: `fechaLima`, `TZ`, getters y `toLocale*` | doc 09 §3.3, doc 05 §2 |
| S-03 | Dinero en céntimos y catálogo de métodos de pago con `esEfectivo` | ADR-011, ADR-006, doc 09 §3.4 |
| S-04 | Pago único y suscripciones: **reescritura transaccional de `RegistrarPago`** sin abonos, multi-mes (≤ 6), fecha pasada (≤ 90 d), anulación, **turno abierto obligatorio** (H-01) y una sola fuente de vigencia (H-02) | ADR-010, doc 09 §3.1, doc 11 H-01/H-02; tests de integración previos (tarea 0.11) |
| S-05 | Sede única oculta (login que autoselecciona, API key del kiosco, config global de gracia y reposo) | ADR-002 |
| S-06 | Documento de identidad DNI/CE/Pasaporte y `codigoSocio` | ADR-004 |
| S-07 | Cambio de plan: unificar o conservar los tres flujos, sin saldo a favor | doc 09 §3.2, P-17 |
| S-08 | Caja compartida con traspaso de turno y arqueo por método | ADR-002, doc 09 §3.4, P-19 |
| S-09 | Baja lógica y anonimización de miembros | ADR-013, P-20 |
| S-10 | Retirada de Venezuela: tasa/BCV/worker, padrón Excel, scripts de tenant, marca anterior | ADR-003, ADR-007, ADR-008 |

Para cada spec, además del archivo, entrega en el chat un **resumen de 10 líneas** con las decisiones que necesitan mi aprobación.

**D. Plan global** (`docs/superpowers/plans/…-refactor-fundaciones.md`): orden y dependencias de S-00…S-10, hitos, riesgos, y qué se puede paralelizar. Recalibra las estimaciones del doc 07 con la línea base de A.

### 3. Criterios de calidad de tu trabajo
- Cada afirmación sobre el código cita **archivo y línea**. Marca lo no verificado como "no verificado".
- Distingue siempre: **hecho** (visto en el código), **decisión** (ADR) y **supuesto** (default).
- Ningún criterio de aceptación sin forma de comprobarlo (test, consulta o paso manual).
- No introduzcas dependencias nuevas sin justificarlas en la spec.
- Antes de cerrar cada etapa, repasa tu propio texto contra el código y lista qué comprobaste y qué no.

### 4. Qué NO hacer todavía
Facturación electrónica SUNAT, WhatsApp, vitrina/TV, `kiosk-host`, sitio público, multi-sede visible. Quedan en backlog (doc 07, Fase 3).

### 5. Cierre de cada sesión
Actualiza `handoff.md` (5 secciones, **sin datos personales**), lista lo aprobado, lo pendiente y los defaults que asumiste, y propón el siguiente paso.

---

## Notas para quien lo use
- Si Claude Code propone saltarse una puerta de aprobación, responda "sin aprobación no se avanza".
- Las preguntas P-16 a P-21 tienen default; solo hay que responderlas si el default no sirve.
- Mantenga el paquete documental en el repo (`docs/`) y trate el doc 09 como documento vivo: cada corrección contra el código se agrega allí.
