# 09 — Verificación contra el código fuente (v0.3)

Estado: **borrador v0.3** · Fecha: 2026-11-12 · Base: `kaiserone01/gym-app` @ `b4352a0`

Este documento responde a una observación válida: varias valoraciones de la v0.2 salían de la documentación del propio repo (`handoff.md`, ADR, README) y no de leer el código. Aquí se contrastan **las afirmaciones de los documentos 01–08 y del *Documento de Ingeniería de Funcionalidades*** contra el fuente, con evidencia por archivo.

## 1. Alcance y método (qué se hizo y qué no)

**Leído de principio a fin:** `RegistrarPago.ts` (511 líneas), `entities/Pago.ts`, `IniciarSesion.ts`, `ValidarSesion.ts`, `ActualizarMiembro.ts`, `CalcularVencimientoPlan.ts`, `EliminarMiembro.ts`, `AnularPago.ts` (permisos y motivo), `AbrirTurno.ts`, `ObtenerResumenTurno.ts`, `utils/fechaCaracas.ts`, `docker-entrypoint.sh`, `KioskTokenValidator.ts`, la ruta SSE de la vitrina y `PrismaMemberRepository.eliminarConHistorial`.

**Leído parcialmente:** `CambiarPlanConPago.ts` (150 de 265 líneas), `RegistrarCheckIn.ts` (líneas 28–156), `CerrarTurno.ts` (solo permiso y cálculo de lo esperado), `seed.ts` (solo credenciales).

**Auditado con script + lectura de los helpers:** las 19 rutas `app/api/**/route.ts` y los `actions.ts` de `(panel)` (qué exige cada una: sesión, permiso, ambos o ninguno).

**Medido por patrón (`grep`):** acoplamiento a Venezuela/multi-sede, zona horaria, variables de entorno, tipos monetarios. Reproducible con `anexos/inventario/generar_inventario.py`; el criterio de conteo está en `anexos/inventario/README.md`.

**No se hizo (límites reales):**
- **No se ejecutaron los tests ni la aplicación**: este entorno no tiene red para `npm install` y no hay `node_modules`. Toda afirmación sobre "tests verdes/rojos" sigue siendo una hipótesis hasta que se corra la suite en la Fase 0.
- No se leyeron completos los 68 casos de uso no-test, ni `apps/kiosk-host` (.NET), ni los componentes de UI de `web-admin` (≈20 000 líneas, sin tests).
- **El documento de ingeniería adjunto** se perdió tras un reinicio de contexto y se volvió a adjuntar el 12-nov-2026; su verificación completa, afirmación por afirmación, está en el **doc 11**. Este documento (09) verifica solo **mis** documentos v0.2.

## 2. Resultado: veredicto por afirmación

Leyenda: ✅ confirmado · ⚠️ confirmado con matiz · ❌ incorrecto en mis documentos (corregido en v0.3) · 🆕 hallazgo nuevo · ❓ no verificado

### 2.1 Afirmaciones de mis documentos v0.2

| ID | Afirmación (documento) | Veredicto | Evidencia / corrección |
|---|---|---|---|
| V-01 | "39 archivos de test en dominio" (00, 03) | ✅ | 39 `*.test.ts` en `packages/domain`. **Web-admin: 0 tests** 🆕 |
| V-02 | "390 tests de dominio" (03) | ❌ | Conteo de `it(`/`test(` al inicio de línea: **≈375** casos. Cifra corregida; el conteo exacto lo dará `vitest` |
| V-03 | Regla 7: "un turno de caja por usuario abierto a la vez" (01, 02 HU) | ❌ | `AbrirTurno`: **un turno abierto por sucursal**, no por usuario. Con sede única hay **una sola caja compartida** → hace falta traspaso de turno entre quienes atienden |
| V-04 | "Dinero con `Decimal` en BD y dominio" (04, ADR-003) | ❌ | BD: `Decimal(10,2)`/`(14,2)`. **Dominio: `number` de JS**: los repos convierten con `.toNumber()` (41 usos). `repartirLineasPago` convierte a centavos pero el resto suma flotantes. Ver ADR-011 |
| V-05 | P-17: "sin prorrateo al cambiar de plan" como default | ❌ | Existen **tres flujos** con prorrateo/cálculo exacto ya probados (ver §3.2). El default correcto es **conservar** |
| V-06 | "Los casos de uso validan permisos" (heredado de la doc del repo) | ❌ | Solo en algunos. **Con chequeo**: `RegistrarPago`, `AnularPago`, `AbrirTurno`, `CerrarTurno`, `RegistrarEgreso`, `EliminarMiembro`, `EliminarPlan`, productos, ventas y fiado. **Sin chequeo** (ni en la ruta ni en el caso de uso): crear/editar/dar de baja/reactivar miembros, crear/editar planes, listar miembros y pagos, último cierre de caja, tasa manual. Detalle y evidencia: doc 11 (DI-10, DI-34, DI-35) |
| V-07 | Regla 6: "un pago nunca se borra: se anula con motivo y autor" | ⚠️ | Cierto para `AnularPago` (exige permiso `PAGOS/ELIMINAR` y motivo; guarda `anuladoEn`/`anuladoPorId`). **Pero** `eliminarConHistorial` borra físicamente pagos, check-ins y suscripciones del miembro (§4.3) |
| V-08 | "27 archivos con `America/Caracas`", "65 con `Bs`", "40 con `tasaCambio`", "`sucursalId` en 111 archivos" (00, 03) | ❌ | Cifras incompletas/no reproducibles. Ver §5: con criterio documentado, **33** archivos de código/tests/scripts mencionan Caracas/Venezuela, **59** `Bs`, **90** tasa/BCV, **183** `sucursal`. Además hay dependencia **por zona del proceso** y no solo por texto (§3.3) |
| V-09 | Regla 3: gracia solo en planes mensuales y con `diasGracia > 0` | ✅ | `diasGraciaParaPlan(...)` devuelve `diasGraciaSede` solo si `frecuencia === "MENSUAL"` (`entities/Plan.ts`) |
| V-10 | Regla 1: pago extiende desde `max(fin vigente, hoy)` | ✅ | `RegistrarPago`: `base = activa && activa.fin > ahora ? activa.fin : ahora` y `fin.setDate(fin.getDate() + plan.diasCiclo * meses)` |
| V-11 | Regla 8: ENTRENADOR no cobra ni abre/cierra turno | ⚠️ | Se cumple **por configuración**: `CrearUsuarioAdmin` asigna permisos vacíos al rol ENTRENADOR y `ActualizarPermisosUsuario` impide editárselos. No es una regla de dominio fija en cada caso de uso |
| V-12 | Regla 7 (2.ª parte): el cierre recalcula lo esperado en servidor | ✅ | `CerrarTurno` toma `esperadoPorMetodo` de `ObtenerResumenTurno`, no del cliente; exige `CAJA/EDITAR` |
| V-13 | Regla 9: el kiosco no envía id de sede, se autentica con API key | ✅ | `KioskTokenValidator.validar(apiKey)` → `sucursal.findUnique({ where: { apiKey } })` |
| V-14 | Estimación de esfuerzo: Fase 1 ≈ 14–19 días | ⚠️ | Subestimada (ver §6). Nuevo rango en doc 07 |
| V-15 | Exclusión de archivos al copiar el árbol (ADR-005) | ⚠️ | Faltaban los dos `debug.keystore` rastreados y revisar `.github/workflows` (usa `secrets.KIOSCO_APK_PASSWORD`) |
| V-16 | HU-20 / regla 7: "no se cobra sin turno abierto" | ❌ | `RegistrarPago` no lo exige: sin turno guarda `turnoId = null` (`RegistrarPago.ts:384`) y el pago queda fuera del arqueo. Solo `VenderProducto` y `CobrarDeudasMiembro` lanzan `SinTurnoAbiertoError`. La UI lo evita; la API REST y el alta con pago no. Ver doc 11 H-01 |
| V-17 | Estado de acceso = vigencia del miembro | ⚠️ | El check-in decide por la `Suscripcion` vigente, no por `Miembro.fechaVencimiento` (doc 11 DI-44, H-02) |

### 2.2 Afirmaciones del Documento de Ingeniería

Verificadas en el **doc 11** (93 afirmaciones agrupadas: 73 confirmadas, 10 con matiz, 6 incorrectas o incompletas, 4 no verificadas; más 7 hallazgos nuevos). Las cinco que aparecían aquí en v0.3-previa (credenciales del seed, `cookies.txt`, `debug.keystore`, hexagonal, migraciones al arrancar) quedaron confirmadas: DI-88 (seed, `cookies.txt` y keystores), DI-06 (hexagonal) y DI-83 (migraciones al arrancar).

## 3. Hallazgos que cambian el diseño

### 3.1 `RegistrarPago` es más que "registrar un pago" (afecta ADR-010)

En un solo caso de uso de 511 líneas conviven: abono sobre ciclo abierto (`esAbonoDeCicloAbierto`), `completarCicloAbierto` ("Cobrar deudas"), multi-mes (`MAX_MESES_POR_PAGO = 6`), pago con fecha pasada (`MAX_DIAS_ATRAS_PAGO_FECHADO = 90`) y retroactivo (`MAX_DIAS_ATRAS_PAGO_RETROACTIVO = 365`, con `tasas.buscarMasCercanaAnterior` y `SinTasaParaFechaError`), líneas de pago múltiples (`grupoPagoId` si hay más de una) y excedente → `saldoAFavor`. **No es transaccional**: crea pago, suscripción y actualización del miembro en llamadas separadas.

Consecuencia: "sin abonos" **no es quitar un `if`**. Alcanza a `validarLineasDePago(..., "conAbono")`, `evaluarAbonoParcial`, `saldoNecesario`, `excedenteASaldo`, `Plan.permitePagoParcial`/mínimos, `fechaLimiteAbono` de la suscripción, el estado `abono_vencido` del kiosco, "Cobrar deudas" y 78 archivos con el término *abono* (53 de código, 11 de tests). El ADR-010 se amplía y se recomienda **reescribir `RegistrarPago`** en lugar de podarlo.

### 3.2 Cambio de plan: tres flujos distintos

| Flujo | Dónde | Semántica real |
|---|---|---|
| (a) Editar el plan del miembro sin pago | `ActualizarMiembro` → `prorratearVencimiento` | Escala el **tiempo transcurrido** a la duración del plan nuevo; nunca deja el vencimiento antes de "ahora"; **no prorratea** si `vieneDelExcel` |
| (b) Cambio de plan con pago | `CambiarPlanConPago` + `calcularCambioPlan` | Exige pago **exacto** de la diferencia; el valor no consumido que sobra se convierte en **días**; `saldoAFavorGenerado` es siempre 0 |
| (c) Cambiar la frecuencia/duración de un plan | `ActualizarFrecuenciaPlan` | Reprorratea **todas** las suscripciones del plan |

(b) es compatible con "un solo pago". (a) y (c) mueven fechas sin dinero. La spec debe decidir si se **unifican** o se conservan. El comentario del schema que dice que `saldoAFavorUSD` se "genera al bajar de plan" está **obsoleto**: el único origen real es `RegistrarPago.excedenteASaldoAFavor` (pagar de más).

### 3.3 Zona horaria: dependencia triple

1. **Variable del proceso**: `Dockerfile` fija `ENV TZ=America/Caracas`; muchos cálculos usan getters locales (`setHours` 10 archivos, `getDate()` 18, `getMonth()` 9, `getFullYear()` 8, `getDay()` 2).
2. **Offset codificado**: `utils/fechaCaracas.ts` usa `4 * 3_600_000` (líneas 18 y 57); `esCumpleanos` usa getters locales sobre la fecha de nacimiento.
3. **Formato**: `toLocale{Date,Time,}String` en ≈26 archivos, `Intl.DateTimeFormat` en 3, sufijo `T12:00:00` en 4, comentarios "UTC-4" en 6.

Para Lima (UTC−5, sin horario de verano) hay que cambiar **las tres capas**. Cambiar solo el `TZ` deja el offset fijo roto. Recomendación: un único módulo `fechaLima` (ya previsto) + `TZ=America/Lima` + tests de borde (23:59/00:00 Lima).

### 3.4 Caja y arqueo acoplados al nombre del método

`ObtenerResumenTurno` usa literales (`"Efectivo (USD)"`, `"Efectivo (Bs)"`), agrupa por el **string** `Pago.metodo` y decide `enBs` por texto. `CerrarTurno` compara el arqueo por ese mismo string. Para PEN hay que sustituirlo por un catálogo de métodos con clave estable (efectivo / Yape / Plin / tarjeta / transferencia) y `esEfectivo` explícito.

### 3.5 Baja de miembro destruye evidencia

`EliminarMiembro` → `eliminarConHistorial` borra en una transacción `checkIn`, `cambioPlanAuditoria`, `deudaProducto`, `pago`, `suscripcion` y `miembro`. Los pagos borrados **dejan de contar en caja y reportes** (lo dice el propio comentario). Choca con la regla de que los pagos se anulan y no se borran, con la conservación de registros contables y con la gestión de derechos ARCO (suprimir datos personales **no** exige destruir el registro contable: se anonimiza). Ver ADR-013.

## 4. Seguridad e higiene (hallazgos verificados)

### 4.1 Control de acceso

| Hallazgo | Severidad | Evidencia |
|---|---|---|
| **Cuentas desactivadas pueden iniciar sesión** | Alta | `IniciarSesion` no consulta `UsuarioAdmin.activo`; `ValidarSesion` tampoco; `buscarCredencialesPorEmail` es un `findUnique` por email sin filtro |
| **Registrar tasa de cambio sin permiso** | Alta (se elimina con ADR-003, pero muestra el patrón) | `registrarTasaManualAction` / `RegistrarTasaManual` no verifican permiso |
| **Permisos incompletos en rutas, acciones y casos de uso** | Alta | Un usuario autenticado sin permiso puede crear/editar miembros y planes (precios) y listar pagos. Lista exacta en doc 11 (DI-10, DI-34, DI-35). Las de `kiosko/*` y `vitrina/*` usan `sesionConPermiso()` (**no** son brecha: falso positivo descartado) |
| **`POST /api/miembros` no valida `body.sucursalId`** | Media (irrelevante con sede única, pero indica falta de validación de entrada) | `apps/web-admin/app/api/miembros/route.ts` |
| **Sin límite de intentos de login** | Alta | No hay rate-limit, bloqueo ni retardo en `api/auth/login` |
| **API key de kiosco en texto plano y sin rotación** | Media | `Sucursal.apiKey` único en claro, visible/copiable en `FormularioSucursal`, guardada en `localStorage` del kiosco; no existe endpoint ni caso de uso de rotación |
| **CORS `*` en rutas de kiosco** | Baja–Media | `lib/kiosco.ts` (decisión documentada: la autenticación real es la API key; aceptable si la key se puede rotar) |
| **Desactivar un usuario no invalida sus sesiones** | Alta (junto con `activo`) | `ActualizarUsuarioAdmin` solo impide auto-desactivarse; `ISesionRepository` no tiene invalidación masiva; la sesión dura 7 días |
| Cookie `sesion_token` `httpOnly`, `secure` en prod, `sameSite=lax` | Info | Correcto |

### 4.2 Operación

- **SSE de la vitrina en memoria** (`globalThis.__emisorVitrina`): válido con una sola instancia; no escala a varias réplicas.
- **No existe `.env.example`**; variables en uso: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `KIOSCO_CLAVE`, `KIOSCO_URL`, `NEXT_PUBLIC_API_URL`, `VITRINA_WEB_DIR`, `ZIP_GYM_PASSWORD`, `NODE_ENV`.
- La migración corre al arrancar el contenedor: un fallo bloquea el servicio (aceptable para un solo local si hay copia de seguridad previa; ver doc 07).

### 4.3 Datos y repositorio

`cookies.txt`, 2 × `debug.keystore`, credenciales de seed, `handoff.md` con datos personales, log JSON de vencimientos y scripts de otro cliente: **ninguno pasa al repo nuevo** (ADR-005 actualizado).

## 5. Inventario de acoplamiento (para dimensionar las specs)

Archivos con al menos una coincidencia, por tipo (criterio y límites: `anexos/inventario/README.md`).

| Término | Código (src) | Tests | Scripts BD | Docs | Líneas | Núcleo del acoplamiento |
|---|---:|---:|---:|---:|---:|---|
| sucursal | 154 | 19 | 10 | 59 | 3 706 | `packages/domain` 75, `apps/web-admin` 71 |
| tasa de cambio / BCV | 74 | 13 | 3 | 42 | 1 072 | `web-admin` 38, `domain` 36 |
| USD (campos `*USD`) | 80 | 20 | 9 | 37 | 979 | `domain` 50, `web-admin` 38 |
| Bs / bolívares | 50 | 6 | 3 | 28 | 366 | `web-admin` 29, `domain` 20 |
| abono | 53 | 11 | 2 | 11 | 1 119 | `web-admin` 29, `domain` 28 |
| padrón Excel | 37 | 15 | 11 | 15 | 1 127 | `domain` 27, `web-admin` 19, `db` 14 |
| cédula | 40 | 11 | 10 | 34 | 1 024 | `web-admin` 19, `domain` 18, `db` 13 |
| marca/tenant anterior | 29 | 3 | 8 | 27 | 385 | `kiosk*`/`vitrina*` 22, `db` 10, `web-admin` 4 |
| Caracas/Venezuela | 26 | 6 | 1 | 14 | 201 | `domain` 15, `web-admin` 11 |
| métodos de pago VE | 9 | 4 | 2 | 9 | 73 | `web-admin` 7, `domain` 6 |
| getters/locale de fecha | 35 | 1 | 4 | 21 | 176 | `web-admin` 21, `domain` 8 |

Lectura: el acoplamiento más profundo es **sucursal** (transversal) y el cluster **dinero** (USD + Bs + tasa + abono), que se concentra en `domain` y `web-admin`. La UI (`web-admin`, 20 000 líneas sin tests) es donde más se repite.

## 6. Efecto sobre el plan y el esfuerzo

- **Fase 0** crece: correr la suite real, `.env.example`, retirar secretos/keystores, baseline de seguridad (ADR-012) → **3–5 días** (antes 2–3).
- **Fase 1** crece: reescritura de `RegistrarPago` (ADR-010), dinero en centavos (ADR-011), catálogo de métodos de pago, zona horaria en tres capas, unificar cambio de plan, baja lógica (ADR-013) → **20–28 días** (antes 14–19).
- **Fase 2** sin cambios sustanciales, más pruebas de UI (web-admin parte de 0 tests).
- **Total MVP ≈ 7–9 semanas** de un desarrollador (antes 5–6). El rango sigue siendo amplio porque la suite no se ejecutó.

## 7. Registro de correcciones respecto a v0.2

| # | Documento | Corrección |
|---|---|---|
| 1 | 01 regla 7 | Turno único **por sede** → caja compartida y traspaso |
| 2 | 01 regla 6 | Matiz: `EliminarMiembro` borra; se reemplaza por baja lógica |
| 3 | 03 riesgos | "390 tests" → ≈375 casos; web-admin sin tests |
| 4 | 04, ADR-003 | Dinero: centavos enteros en dominio (ADR-011), no "Decimal en dominio" |
| 5 | 08 (P-17) | Default "conservar prorrateo" en lugar de "sin prorrateo" |
| 6 | ADR-010 | Alcance ampliado (§3.1) |
| 7 | ADR-005 | Exclusiones: `debug.keystore` ×2, revisar `.github/workflows` |
| 8 | ADR-002 | Login auto-selecciona la sede única; una caja compartida |
| 9 | 00, 03 | Cifras de acoplamiento reemplazadas por el inventario reproducible |
| 10 | 07 | Fase 0 y 1 ampliadas; nuevas tareas de seguridad |
| 11 | ADR nuevos | ADR-011 (dinero), ADR-012 (baseline de seguridad), ADR-013 (baja lógica y retención) |
| 12 | 02 HU-20 · 01 regla 7 | El turno obligatorio para cobrar membresías no existe en el dominio del base (V-16): se exige en el nuevo |
| 13 | 09 V-06 | "Los casos de uso validan permisos" pasa de ⚠️ a ❌ con lista exacta (doc 11) |
| 14 | 11 (nuevo) | Verificación completa del documento de ingeniería; 7 hallazgos nuevos |
| 15 | 07 tarea 0.2 (S-00) | El criterio «`git log` muestra un solo commit inicial» no aplica: este repositorio ya contiene el arnés y la documentación. El criterio pasa a ser «un solo commit de importación, sin historia del Repo A» (spec S-00, REQ-S00-001) |
| 16 | 07 tarea 0.3 (S-00) | El criterio «búsqueda de cédula/Adrenalina/zip sin hallazgos» no puede cumplirse en la Fase 0: el código aún contiene esos términos (§5: 40 archivos con *cédula*, 29 con marca anterior). Se limita a los archivos de datos y scripts excluidos; el resto se retira en S-06 y S-10 (spec S-00 §5.2) |

## 8. Re-verificación contra el clon del Repo A (2026-11-12)

Clon de solo lectura de `kaiserone01/gym-app` en `b4352a0398933cf2665a3e7b82dc84049697e10c`. Sustituye al «no re-verificado» de los puntos que se indican. Las rutas son del Repo A.

### 8.1 Confirmado
| Afirmación | Evidencia |
|---|---|
| 7 apps y 8 directorios en `packages` | `ls apps`, `ls packages` (`domain-custom` solo tiene `.gitkeep`; `config` y `design-system` tienen `.gitkeep` y `package.json`) |
| 36 migraciones (de `20260913024831_organizacion_sucursal_plan_suscripcion` a `20261016000000_vitrina_sonido`) y `migration_lock.toml` (DI-15) | `packages/db/prisma/migrations` |
| `schema.prisma`: 723 líneas, 25 modelos y 14 enums (DI-14) | `packages/db/prisma/schema.prisma` |
| 3 workflows (DI-13); sin `.env.example`; sin `LICENSE`; `cookies.txt` (254 bytes) y `handoff.md` (707 líneas, DI-11) versionados; 2 `debug.keystore` (DI-88) | `ls`, `find` |
| Seed con contraseñas fijas (DI-88) | `packages/db/prisma/seed.ts:41`, `:50`, `:55` |
| 13 variables leídas con `process.env`: las 12 de DI-85 con notación de punto y `DATABASE_URL_LOCAL` con corchetes (**corrige** la cifra de 12 de la primera versión de esta sección, que solo buscaba la notación de punto) | `packages/db/prisma7.local.config.ts:10` y `packages/db/prisma7.config.ts:16`; `grep -rnoE` con punto y con corchetes, excluyendo `node_modules` |
| `TZ=America/Caracas` (DI-07); `PORT=3000` y `EXPOSE 3000` | `Dockerfile:42`, `:40`, `:70` |
| `migrate deploy` al arrancar (DI-83) y `output: "standalone"` en `web-admin` (resuelve el ⚠️ de DI-83); `kiosk` y `vitrina` en `output: "export"` (DI-02) | `docker-entrypoint.sh:11`; `apps/web-admin/next.config.ts:7`, `apps/kiosk/next.config.ts:9`, `apps/vitrina/next.config.ts:6`; `dev` en 3001 y 3002 (`apps/kiosk/package.json:6`, `apps/vitrina/package.json:6`) |
| El inventario oficial reproduce las cifras del §5. «abono» son **78** archivos: 53 de código + 11 tests + 2 scripts + **1 migración** + 11 documentos (la tabla del §5 omitía la columna de migración: se resuelve la duda 77/78) | `generar_inventario.py` sobre el clon |

### 8.2 Correcciones y hallazgos nuevos
| # | Hallazgo | Evidencia | Consecuencia |
|---|---|---|---|
| R-01 | El `package.json` raíz **no tiene `test` ni `typecheck`**: solo `dev`, `build`, `lint`, `start` y `actualizar-tasa`. `test` existe en `apps/kiosk`, `apps/vitrina`, `packages/db` y `packages/domain`; `web-admin` no tiene `test`. Solo `web-admin`, `kiosk` y `vitrina` tienen `tsconfig.json` propio | `package.json` de cada workspace; `turbo.json` define la tarea `test` | S-00 añade `typecheck` donde haya `tsconfig.json` (SUP-S00-009) |
| R-02 | `packages/db` tiene más scripts de mantenimiento de los listados en ADR-005: `backfillPermisos*.ts`, `clonarZipGym/`, `diagnosticoVencimientos.ts`, `limpiarCajaPrueba.ts`, `limpiarMiembros.ts`, `marcarAjustarFecha.ts`, `productos-prueba/`, `quitarPermisosEntrenadores.ts`, `resetVencimientosPrueba.ts`, `sembrarMiembrosPrueba.ts`, `Dockerfile.migrate`, `prisma7*.config.ts`, entre otros | `ls packages/db` | Lista de permitidos explícita en S-00 §0.2 |
| R-03 | `admin1234` aparece también en 7 documentos de `docs/superpowers/plans/` del Repo A | `grep -rl admin1234` | El `docs/` del Repo A no se importa |
| R-04 | El `docs/adr/` del Repo A tiene `ADR-001-gym-app-sesion.md`, `ADR-001-gym-app-sesion-v2.md` y `ADR-002-vitrina-importa-dominio-puro.md`: colisión de numeración confirmada | `ls docs/adr` | Idem |
| R-05 | Alcance de `organizacionId`: **175 archivos** (144 de código fuente) y 13 modelos (`Sucursal`, `UsuarioAdmin`, `Miembro`, `Plan`, `ReglaAbonoPorFrecuencia`, `Producto`, `DeudaProducto`, `CambioPlanAuditoria`, `Turno`, `MetodoPago`, `TemaOrganizacion`, `MiembroReferencia`, `PadronHoja`). **73 archivos** solo se tocan por `organizacionId`; los otros 102 se eliminan o se reescriben por otras decisiones (turnos, egresos, fiado, abonos, padrón, tasa, tema) | `grep` por patrón sobre `apps` y `packages` | Mide el costo real de ADR-019 (opción B): entre 73 y 175 archivos |
| R-06 | Alcance de lo que ADR-018 elimina (archivos de `apps` y `packages`): `turno` 78 (66 de código), `arqueo` 24, `egreso` 22 (19 de código), `deudaProducto`/fiado 46 (22 de código) | `grep` por patrón | Dimensiona S-08 y S-11 |
| R-07 | El kiosco captura el DNI con un `keydown` global de dígitos, Enter y Escape, **sin `<input>`** (para no abrir el teclado en pantalla): es compatible con un numpad USB; no se probó en un TV | `apps/kiosk/lib/useEntradaCedula.ts:29`, `:106`, `:131-132` | Base de S-21 (check-in en smart-TV) |
| R-08 | La vitrina maneja carteles de tres tipos (`ENTRENADOR`, `PROMO`, `PRODUCTO`) con imagen o video, duración, vigencia, orden, etiquetas, precio, oferta, descuento y sonido; guarda `precioUSD`, `ofertaUSD` y `mostrarEquivalenteBs`. 41 archivos, 7 de ellos tests. El APK exige Android System WebView ≥ 111 y lleva la API key de la sede dentro | `packages/db/prisma/schema.prisma:684`; `apps/vitrina`; `apps/vitrina-tv/README.md` | Base de S-20 («heredamos lo que la vitrina resuelve») |
| R-09 | Los workspaces `packages/db`, `domain`, `infrastructure`, `ui` y `theming` no tienen `tsconfig.json` propio; el cierre de dependencias de las cinco apps del alcance es `db`, `domain`, `infrastructure`, `theming` y `ui` | `package.json` de cada workspace | S-00 REQ-S00-004; `design-system` se conserva por ADR-020 |
| R-10 | **Línea base medida** (ver `docs/linea-base-tests.md`): `packages/domain` 39 archivos y **390** pruebas (corrige V-02: ≈375 era un conteo estático), `kiosk` 45, `vitrina` 65, `packages/db` 72 con **1 fallo preexistente** (lee `docs/xls/DATA ADRENALINA_hoy.xlsm`, que el Repo A no versiona); `web-admin` 0 tests | `npm test --workspace …` | La suite sí funciona; hay 571 de 572 pruebas verdes |
| R-11 | `npm audit`: 21 vulnerabilidades (11 moderate, 9 high, **1 critical: `next`**) | `npm audit --json`; `docs/linea-base-audit.json` | Base de comparación del CI (S-00, REQ-S00-016) |
| R-12 | El build de `vitrina` depende de Google Fonts (*Barlow*, *Bebas Neue*) | `apps/vitrina/app/layout.tsx:2` | Afecta a la tipografía (S-19) y al CI y a un TV sin internet |
| R-13 | El build de Android **exige** `debug.keystore`: `storeFile file("debug.keystore")` y `storePassword "android"` | `apps/kiosk-tv/capacitor/android/app/build.gradle:21-22`; `apps/vitrina-tv/capacitor/android/app/build.gradle:21-22` | Corrige la suposición de que Gradle genera uno; S-20 y S-21 deben definir su propia firma sin versionar claves |
| R-14 | `packages/db/Dockerfile.migrate` es destructivo: su `CMD` ejecuta `rm -rf prisma/migrations/*` y `prisma migrate reset --force` | `packages/db/Dockerfile.migrate:32` | No se importa |
| R-15 | `Dockerfile` copia `packages/design-system/package.json` y `packages/config/package.json` | `Dockerfile:18`, `:20` | Ambos workspaces se conservan para no romper la imagen |
| R-16 | `prisma7.config.ts` referencia el seed (`seed: "tsx prisma/seed.ts"`), los scripts `db:*` de `packages/db/package.json` y el script raíz `actualizar-tasa` apuntan a archivos o apps que se excluyen | `packages/db/prisma7.config.ts:13`; `package.json:15` | Requieren ediciones de configuración (S-00, REQ-S00-030) |
| R-17 | `apps/kiosk-tv` y `apps/vitrina-tv` no son workspaces de npm: su `package.json` está en `capacitor/package.json` y el glob `apps/*` no lo ve | `apps/kiosk-tv/capacitor/package.json`; `apps/vitrina-tv/capacitor/package.json` | Se tratan como directorios envoltorio, fuera del cierre de dependencias |
| R-18 | `.claude/settings.json` y `.claude/skills/` existen en el Repo A | `git ls-files .claude` | No se importan: podrían sobrescribir el arnés de este repositorio |
| R-19 | `apps/vitrina` depende de `@gym-app/domain` | `apps/vitrina/package.json:15` | La vitrina importa dominio puro (ADR-002 del Repo A); a tener en cuenta en S-20 |

