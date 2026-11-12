# 11 — Verificación del Documento de Ingeniería contra el código (v0.3)

Estado: **borrador v0.3** · Fecha: 2026-11-12 · Base: `kaiserone01/gym-app` @ `b4352a0` · Documento verificado: *Documento de Ingeniería de Funcionalidades — gym-app (Adrenalina Xtreme Gym)*

Este documento contrasta, afirmación por afirmación, el documento de ingeniería que adjuntó con el código fuente. Cada fila indica el veredicto y la evidencia (archivo y línea). Complementa el doc 09, que verifica **mis** documentos v0.2. Los identificadores `DI-xx` son de este documento y los `H-xx` son hallazgos que el documento de ingeniería no recoge.

## 1. Resultado en una línea

De **93** afirmaciones comprobadas (agrupadas, no frase a frase): **73 confirmadas**, **10 con matiz**, **6 incorrectas o incompletas** y **4 no verificadas**. El documento es fiable en estructura, versiones, reglas de negocio y límites numéricos; sus errores están en **permisos** (DI-10, DI-34, DI-35), **orden del check-in** (DI-41), **qué significa "activo"** (DI-44) y **seguridad de los scripts** (DI-87). Aporta además información que mis documentos no tenían (kiosco sin conexión, vitrina, CI de APK, scripts) y yo aporto 7 hallazgos que él no tiene (§3).

Alcance y límites: es verificación estática, **no se ejecutó nada** (sin red para instalar dependencias). No se leyeron en profundidad el C# de `kiosk-host`, `MainActivity`/`ArranqueReceiver`, `R2StorageService`, `padronExcel` ni los componentes de UI del panel. Un "confirmado" significa que lo leído en el código lo respalda, no que se haya probado en ejecución.

| Veredicto | Cantidad |
|---|---:|
| ✅ Confirmado | 73 |
| ⚠️ Confirmado con matiz | 10 |
| ❌ Incorrecto o incompleto | 6 |
| ❓ No verificado | 4 |

## 2. Matriz de verificación

| ID | § | Afirmación del documento | Veredicto | Evidencia / corrección |
|---|---|---|:--:|---|
| DI-01 | §1 | Versiones: Next 16.3.4, React 19.2.8, Tailwind 4, Vitest 5.0.2, Prisma 7.10 + adapter-pg, Capacitor 8, npm@10.9.7, Node 22-alpine | ✅ | `apps/web-admin\|kiosk\|vitrina/package.json`, `package.json`, `packages/db/package.json`, `Dockerfile:7`, `apps/*-tv/capacitor/package.json` |
| DI-02 | §1 | Puertos 3001 (kiosco) y 3002 (vitrina) | ⚠️ | Son los puertos del script `dev` (`next dev -p 3001\|3002`); en producción ambos son export estático. `apps/kiosk/package.json:6`, `apps/vitrina/package.json:6` |
| DI-03 | §1 | `appId` `com.adrenalina.kiosco` y `com.adrenalina.vitrina` | ✅ | `apps/kiosk-tv\|vitrina-tv/capacitor/android/app/build.gradle:7` |
| DI-04 | §1 | Host Windows: C# .NET 8 WinForms + WebView2 | ✅ | `KioskHost.csproj:5` (`net8.0-windows`), `Program.cs:13` (Mutex). Además existe un proyecto de tests `apps/kiosk-host/tests/KioskHost.Tests` que el documento no menciona |
| DI-05 | §2 | `domain-custom`, `design-system`, `config` vacíos | ⚠️ | `domain-custom` solo tiene `.gitkeep`; `design-system` y `config` tienen `.gitkeep` y un `package.json` |
| DI-06 | §2 | Infraestructura: `auth/` (Bcrypt, KioskTokenValidator), `exchange-rate/`, `storage/` (R2), `persistence/prisma` | ✅ | `packages/infrastructure/*` |
| DI-07 | §2 | `TZ=America/Caracas` en Docker; fechas pasadas con `T12:00:00` | ✅ | `Dockerfile:42`; sufijo `T12:00:00` en 4 archivos |
| DI-08 | §2 | Sin `middleware.ts` | ✅ | Ni `middleware.ts` ni `proxy.ts` (nombre en Next 16) bajo `apps/` |
| DI-09 | §2 | El `sucursalId` del kiosco nunca llega del body: se deriva de la API key | ✅ | `KioskTokenValidator.validar(apiKey)`; `api/checkin/route.ts` usa `sucursalDeKiosco` |
| DI-10 | §2, §5 | "Los casos de uso reciben el actor y validan permisos granulares dentro del dominio" | ❌ | Solo para algunos. **Sin chequeo**: `CrearMiembro`, `ActualizarMiembro` (editar, dar de baja, reactivar, foto), `CrearPlan`, `ActualizarPlan`, `ListarMiembros`, `ListarPagos`, `ObtenerUltimoCierrePorSucursal`, `RegistrarTasaManual`. **Con chequeo**: `RegistrarPago`, `AnularPago`, `AbrirTurno`, `CerrarTurno`, `RegistrarEgreso`, `EliminarMiembro`, `EliminarPlan`, productos, sucursales, `VenderProducto`, `FiarProducto` |
| DI-11 | §3 | `handoff.md` de 707 líneas | ✅ | `wc -l handoff.md` = 707 |
| DI-12 | §3 | `docs/superpowers/{plans,specs}` ≈ 45 archivos | ⚠️ | 18 specs + 39 planes = 57 |
| DI-13 | §3 | Tres workflows en `.github/workflows` | ✅ | `apk-kiosco.yml`, `apk-vitrina.yml`, `verificar-vitrina.yml` |
| DI-14 | §4 | `schema.prisma` de 723 líneas | ✅ | 723 líneas; 25 modelos + 14 enums = 39 (cifra de mi v0.1 "33" era errónea) |
| DI-15 | §4 | ~36 migraciones, 20260913 → 20261016 | ✅ | 36 carpetas: `20260913024831_organizacion_sucursal_plan_suscripcion` … `20261016000000_vitrina_sonido` |
| DI-16 | §4 | `Organizacion.slug` único | ✅ | `schema.prisma` modelo `Organizacion` |
| DI-17 | §4 | `Sucursal`: `apiKey` uuid, `diasGracia`, `tasaCambioUSD`, `reposo*`, `vitrina*` | ✅ | `apiKey String @unique @default(uuid())`; `reposoOpacidad` 20–100 por comentario del schema |
| DI-18 | §4 | `Sucursal.tasaCambioUSD` es un campo legado | ✅ | Solo lo referencian `prisma/seed.ts` y `clonarSedePrincipalAZipGym.ts` |
| DI-19 | §4 | Roles SOCIO/GERENTE/RECEPCION/ENTRENADOR; el entrenador es un `UsuarioAdmin` | ✅ | `enum RolUsuario`; `CrearUsuarioAdmin.ts` (`ENTRENADOR: []`, comentario "no operan el panel"); el script de siembra les pone email `entrenador-<uuid>@sinacceso.interno` y contraseña aleatoria (`sembrarOrganizacionZipGym.ts:92-93`) |
| DI-20 | §4 | `PermisoUsuario` = módulo × acción | ✅ | 7 módulos (MIEMBROS, PAGOS, PLANES, CAJA, USUARIOS, SUCURSALES, EN_SALA) × 4 acciones (VER, CREAR, EDITAR, ELIMINAR) |
| DI-21 | §4 | `Miembro`: único (org, cédula); `sucursalId` null = "Ambas"; `saldoAFavorUSD`; `porRegularizar`; `vieneDelExcel` | ✅ | `@@unique([organizacionId, cedula])` y campos en el modelo |
| DI-22 | §4 | `Miembro.genero` sin uso | ✅ | Solo aparece en `clonarSedePrincipalAZipGym.ts:576`. El comentario del schema ("para saludar en el kiosco") está obsoleto: el saludo es neutro |
| DI-23 | §4 | `Plan`: 7 frecuencias, `diasCiclo`, `incluyeEntrenador`, `multisede`, `permitePagoParcial`, `minimoAbono*` | ✅ | `enum FrecuenciaPago` (DIARIO…PERSONALIZADO) y modelo `Plan` |
| DI-24 | §4 | `Pago`: `monto` USD, `metodo` snapshot + `metodoPagoId`, `tasaCambio`, `montoBs`, `fechaInicio/FinCiclo`, `grupoPagoId`, anulación | ✅ | Modelo `Pago` |
| DI-25 | §4 | `CambioPlanAuditoria.modo` siempre `CICLO_COMPLETO` | ✅ | `CambiarPlanConPago.ts:253`; el enum conserva `AJUSTAR_VENCIMIENTO` como histórico |
| DI-26 | §4 | `TasaCambio` global, fuente BCV/BINANCE_P2P/MANUAL | ✅ | Sin `organizacionId`; `fecha @unique`; `fuente` es `String`, no enum |
| DI-27 | §4 | `MetodoPago`: EFECTIVO, PAGO_MOVIL, TRANSFERENCIA, PUNTO_VENTA, BIOPAGO, CRIPTO | ✅ | `enum TipoMetodoPago` |
| DI-28 | §4 | `TemaOrganizacion` y `RegistroAuditoria` modelados sin consumidores | ⚠️ | Sin consumidores **en tiempo de ejecución**. `TemaOrganizacion` lo usan `seed.ts` y los scripts de siembra/clonado; `RegistroAuditoria` solo el script de clonado |
| DI-29 | §5 | Matriz de permisos por defecto por rol | ✅ | `CrearUsuarioAdmin.ts` constante `PERMISOS_POR_ROL`; está duplicada a propósito en `packages/db/backfillPermisosYSucursales.ts` |
| DI-30 | §5 | Solo SOCIO: usuarios, permisos, `ActualizarFrecuenciaPlan` | ✅ | Comprobación de rol en `ActualizarFrecuenciaPlan.ts:52`, `ActualizarUsuarioAdmin`, `EliminarUsuarioAdmin`, `ActualizarPermisosUsuario` |
| DI-31 | §5 | Solo SOCIO: asignar sedes e historial de sala 24 h | ❓ | No se leyó la condición exacta de estos dos casos |
| DI-32 | §5 | No se puede desactivar ni eliminar a uno mismo; `CambiarPassword` ≥ 8 caracteres | ✅ | `ActualizarUsuarioAdmin.ts:38`, `EliminarUsuarioAdmin.ts:36`, `CambiarPassword.ts:31` |
| DI-33 | §5 | Menú Kiosko/Configuraciones solo SOCIO y GERENTE | ✅ | `lib/permisoKiosko.ts` |
| DI-34 | §5 | Brecha: 4 rutas REST validan solo sesión (`/api/miembros`, `PATCH /api/planes`, `GET /api/usuarios`, `GET /api/pagos`) | ❌ | Incompleta. Solo sesión (sin permiso en ruta ni en el caso de uso): `miembros` (GET, POST, GET/PATCH `[id]`), `planes` (GET, POST, PATCH), `pagos` GET, `caja/ultimo-cierre`, `tasa-cambio` y `tasa-cambio/historial`, `foto-proxy`. `POST /api/pagos` y `POST /api/usuarios` sí validan dentro del caso de uso |
| DI-35 | §5 | "Las server actions y los casos de uso sí validan" | ❌ | No lo hacen `crearMiembroAction` (la creación), `actualizarMiembroAction`, `actualizarFotoMiembroAction`, `darDeBajaAction`, `reactivarAction`, `crearPlanAction`, `actualizarPlanAction`. Un usuario autenticado sin permiso (p. ej. RECEPCION sin `PLANES/EDITAR`) puede cambiar planes y precios |
| DI-36 | §6 | Login en dos pasos con `requiereSeleccion` si hay más de una sede | ✅ | `api/auth/login/route.ts:42,62` |
| DI-37 | §6 | Token hex de 32 bytes, 7 días, cookie `sesion_token` httpOnly/lax/secure en prod | ✅ | `IniciarSesion.ts:7,49`; `api/auth/login/route.ts:83-86` |
| DI-38 | §6 | `ValidarSesion` rechaza `sucursalActivaId` nulo | ✅ | `ValidarSesion.ts` |
| DI-39 | §6 | Nadie comprueba `UsuarioAdmin.activo` (login, sesión, repositorio) | ✅ | `IniciarSesion`, `ValidarSesion`, `buscarCredencialesPorEmail` (`findUnique({ where: { email } })`). Además, desactivar un usuario no invalida sus sesiones |
| DI-40 | §6 | API key del kiosco: CORS `*`; rotación "[?]" | ✅ | CORS `*` en `lib/kiosco.ts:16`. **Resuelto el [?]**: no existe endpoint ni caso de uso de rotación; la clave se guarda en claro y se muestra y copia desde `FormularioSucursal` |
| DI-41 | §7 | Orden de reglas: 1) idempotencia 2 min, 2) activar desde padrón, 3) estado | ❌ | Orden inverso. Primero se busca el miembro y, si no existe, se intenta el padrón (`RegistrarCheckIn.ts:69-72`); la idempotencia se evalúa después, con el miembro ya resuelto (`:99-104`) |
| DI-42 | §7 | Idempotencia: mismo miembro y sede en < 2 min devuelve el registro previo | ✅ | `VENTANA_IDEMPOTENCIA_MINUTOS = 2`. Devuelve el **estado guardado**, no lo recalcula |
| DI-43 | §7 | Estados y precedencia: `sucursal_incorrecta` → `abono_vencido` → `activo` → `en_gracia` → `vencido` | ✅ | `ValidarAccesoSucursalPorPlan.ts:30-69` |
| DI-44 | §7 | `activo` = suscripción vigente / vencimiento futuro | ❌ | Depende **solo de la `Suscripcion` activa vigente**, no de `Miembro.fechaVencimiento`. Un miembro con vencimiento futuro y sin suscripción queda `vencido` (lo reconoce el comentario de `ActualizarMiembro.ts:80-81`). Hay dos fuentes de verdad que se sincronizan a mano |
| DI-45 | §7 | La gracia aplica solo a planes MENSUAL | ✅ | `Plan.ts:14-16` (`diasGraciaParaPlan`). Se mide en milisegundos desde el instante del vencimiento, no en días de calendario |
| DI-46 | §7 | Se registra el check-in aunque el estado sea `vencido` | ✅ | `RegistrarCheckIn.ts` siempre llama a `checkIns.crear` |
| DI-47 | §7 | `esCumpleanos` en zona Caracas | ✅ | `utils/fechaCaracas.ts` (getters locales sobre la fecha de nacimiento; depende del `TZ` del proceso) |
| DI-48 | §7 | Kiosco: `kiosco_api_key`/`kiosco_info`, timeout 10 s, cola IndexedDB `kiosco-checkin`, reintento 30 s, ficha 30 s, borrado a los 7 s, refresco de sede 30 s, SW `kiosco-shell-v6`, saludo neutro | ✅ | `lib/config.ts:3`, `useInfoKiosco.ts:4-5`, `lib/api.ts:2`, `colaPendientes.ts:1`, `app/page.tsx:25-26`, `useEntradaCedula.ts:15`, `public/sw.js:6`, `lib/frases.ts:16` |
| DI-49 | §7 | Un error del servidor no se encola; solo la caída de red | ✅ | `app/page.tsx:149-153` (`ErrorCheckIn` → ficha de error; cualquier otro error → `encolar`) |
| DI-50 | §7 | Cara `por_vencer` con ≤ 5 días | ✅ | `apps/kiosk/lib/cara.ts:3`; es solo de interfaz, no un estado del servidor |
| DI-51 | §7 | Reposo: hasta 30 frases de 60 caracteres, opacidad 20–100 | ✅ | `utils/reposoKiosko.ts:1-2`; opacidad por comentario del schema |
| DI-52 | §7 | En sala: `requiereCobro` = vencido, en gracia o abono vencido; historial `hoy\|24h` | ✅ | `ListarEnSala.ts:27-55` |
| DI-53 | §8 | `ActualizarMiembro`: cédula única, bloqueo entre sedes, edición de fechas sincroniza suscripción y pagos, fecha de pago > vencimiento se rechaza, cambio de plan sin pago prorratea salvo `vieneDelExcel` | ✅ | `ActualizarMiembro.ts:43-135` |
| DI-54 | §8 | `EliminarMiembro` borra al miembro y todo su historial | ✅ | `PrismaMemberRepository.ts:113-121` (check-ins, auditoría, deudas, pagos, suscripciones, miembro) |
| DI-55 | §8 | `ActivarMiembroDesdePadron` solo en la misma sede, nunca crea pago, deja `porRegularizar` | ✅ | `ActivarMiembroDesdePadron.ts:24,32,56-57` |
| DI-56 | §9 | `ActualizarFrecuenciaPlan`: solo SOCIO, exige escribir el nombre del plan, prorratea opcionalmente | ✅ | `ActualizarFrecuenciaPlan.ts:52` y confirmación por nombre |
| DI-57 | §9 | `EliminarPlan` falla si hay historial; productos usan permisos de PLANES; `EliminarProducto` desactiva si hay ventas | ✅ | `EliminarPlan.ts`, `CrearProducto\|ActualizarProducto\|EliminarProducto.ts` (`PLANES`); vender y fiar usan `CAJA/CREAR` |
| DI-58 | §9 | Regla de abono: gana la del plan; el mínimo es ≥ 1 día | ⚠️ | "Gana la del plan" confirmado (`ReglaAbono.ts:29`). El piso de 1 día solo aparece en comentarios; no se verificó la validación |
| DI-59 | §10 | `RegistrarPago`: PAGOS/CREAR, 1–6 meses | ✅ | `MAX_MESES_POR_PAGO = 6`; chequeo de permiso en el caso de uso |
| DI-60 | §10 | Tolerancia = min(1 USD, 10 % del precio) | ✅ | `entities/Pago.ts:43-45`. El faltante queda como saldo pendiente y el acceso cubre el ciclo completo |
| DI-61 | §10 | Saldo a favor primero; excedente opcional a saldo a favor; ciclo abierto acumulado; pago parcial exige `permitePagoParcial` | ✅ | `RegistrarPago.ts` (`saldoNecesario`, `excedenteASaldo`, `esAbonoDeCicloAbierto`, `evaluarAbonoParcial`) |
| DI-62 | §10 | Retroactivo: 90 días (365 si `porRegularizar` o primer pago), fuera de turno, tasa BCV del día | ✅ | `RegistrarPago.ts:426-427`, `:384`, `:404` |
| DI-63 | §10 | `grupoPagoId` UUID con 2+ líneas; `POST /api/pagos` soporta una sola | ✅ | `RegistrarPago.ts:377` (y `:487`, ruta retroactiva); `api/pagos/route.ts:105-109` |
| DI-64 | §10 | `registrarPago` solo no es transaccional; solo la ruta con deudas y algunas acciones usan `$transaction` | ✅ | `$transaction` en `caja/actions.ts`, `pagos/actions.ts`, `lib/activacion.ts` y repositorios; `RegistrarPago` crea los pagos en un bucle y actualiza miembro y suscripción en llamadas aparte |
| DI-65 | §10 | `validarTasaSiEsEnBs` fuerza refresco antes de cobrar | ⚠️ | Invocada en `caja/actions.ts:380` y `:533`; no se comprobó si otras rutas de cobro la usan |
| DI-66 | §10.1 | Cambio de plan con pago: V = precio/días × días restantes; V > precio nuevo suma días; V < precio nuevo cobra diferencia; cortesía bloqueada; sincroniza `precioPlan` | ✅ | `entities/cambioPlanCalculo.ts` (calcula en céntimos con `Math.round`), `CambiarPlanConPago.ts:226` |
| DI-67 | §10.2 | `AnularPago`: PAGOS/ELIMINAR, motivo obligatorio, reabre deudas, no revierte suscripción ni fechas | ✅ | `AnularPago.ts:43-48,59-66`; no hay código que toque suscripción ni vencimiento |
| DI-68 | §10.3 | `CobrarAbonoPendiente` exige monto exacto | ❓ | No se leyó este caso de uso |
| DI-69 | §11 | `VenderProducto` y `CobrarDeudasMiembro` exigen turno abierto; `RegistrarPagoConDeudas` en transacción | ✅ | `SinTurnoAbiertoError` en `VenderProducto.ts:70` y `CobrarDeudasMiembro.ts:85`; transacción en `pagos/actions.ts` |
| DI-70 | §12 | `AbrirTurno` (CAJA/CREAR): un solo turno por sede | ✅ | `AbrirTurno.ts:38,49` (`TurnoYaAbiertoError`). La UI muestra `AvisoCajaAjena` si el turno es de otro usuario (`caja/page.tsx:190-200`) |
| DI-71 | §12 | Arqueo acoplado a "Efectivo (USD)" / "Efectivo (Bs)" | ✅ | `ObtenerResumenTurno.ts` |
| DI-72 | §12 | `RegistrarEgreso` USD o BS (BS exige tasa); `CerrarTurno` recalcula en servidor y exige nota si hay diferencia | ✅ | `RegistrarEgreso.ts` (`TasaRequeridaError`), `CerrarTurno.ts:59,71-77` |
| DI-73 | §13 | `BcvApiAdapter`: `ve.dolarapi.com/v1/historicos/dolares/oficial`, ETag, 5 s, campo `promedio` | ✅ | `BcvApiAdapter.ts:3-4,18,30,55` |
| DI-74 | §13 | `SincronizarTasas`: ventana 7 días (60 con tabla vacía), descarta ≤ 0; `ObtenerTasaVigente` AL_DIA/DESACTUALIZADA | ✅ | `SincronizarTasas.ts:5-6,35`; `ObtenerTasaVigente.ts:13-14` |
| DI-75 | §13 | Orquestador: 45 min mínimos, bloqueo máx. 2,5 s; `tasaBcvFija.ts` sigue en uso | ✅ | `lib/tasaBcv.ts:13-14`; `tasaBcvFija` en ≥ 8 archivos de `caja/` |
| DI-76 | §13 | Worker: conserva la última tasa y sale con código 1 solo si no hay ninguna | ✅ | `apps/worker/src/actualizar-tasa.ts:34-38` |
| DI-77 | §14 | Límites de vitrina: nombre 60, especialidad 60, frase 120, etiqueta 20; 3–300 s; video H.264 ≤ 100 MB ≤ 1920×1080; imagen 8 MB (reposo 5 MB); franjas de 3 | ✅ | `utils/vitrinaItem.ts:3-4,26-29`, `utils/videoVitrina.ts:3-6`, `services/secuenciaVitrina.ts:3`, `vitrina/actions.ts:118`, `kiosko/actions.ts:68` |
| DI-78 | §14 | SSE con latido de 25 s y emisor en memoria (un solo contenedor) | ✅ | `kiosco/vitrina/eventos/route.ts` (`LATIDO_MS = 25_000`); `lib/vitrinaEventos.ts` (`globalThis`) |
| DI-79 | §14 | TV: omite pieza tras 3 fallos, stall 20 s, tope 10 min, sondeo 10 min, reintento 60 s, SSE 2→60 s, reloj 15 s | ✅ | `apps/vitrina/lib/sincronizar.ts:6`, `reproduccion.ts:4-5`, `useVitrina.ts:15-20` |
| DI-80 | §15.1 | Host Windows: `KIOSK_URL` con prioridad, URL por defecto de zipnegocios, `HKCU\Run`, datos en `%LOCALAPPDATA%\KioskHost\WebView2` | ✅ | `apps/kiosk-host/README.md`. El detalle de teclas del numpad no se contrastó con el C# |
| DI-81 | §15.2 | APK: cifrado 7-Zip AES-256, `versionCode = run_number`, APK genérico sin clave "sin fallar" | ✅ | `apk-vitrina.yml:106,140,146`; `apk-kiosco.yml:86,93` (solo emiten `::warning::`) |
| DI-82 | §15.3 | `verificar-vitrina.yml` corre en push a `main`/`vitrina` | ❓ | Se leyó el comentario inicial; no se verificaron los disparadores |
| DI-83 | §15.4 | Entrypoint con `migrate deploy`, `bodySizeLimit 10mb`, `output: standalone` | ⚠️ | Entrypoint y `bodySizeLimit: "10mb"` (`next.config.ts:18`) confirmados; `output: standalone` no se verificó |
| DI-84 | §16 | 19 endpoints bajo `app/api` | ✅ | Coinciden exactamente con las 19 rutas encontradas |
| DI-85 | §17 | Variables de entorno y ausencia de `.env.example` | ✅ | `process.env.*` en ts/tsx y variables en workflows/scripts (`VITRINA_API_URL`, `VITRINA_CLAVE`, `VITRINA_DEV_URL`, `KIOSCO_*`) |
| DI-86 | §18 | Todos los scripts cargan el `.env` raíz (producción) | ⚠️ | Cargan `../../.env` (`dotenv`); que ese `.env` apunte a producción viene del `handoff.md`, no es verificable en el código |
| DI-87 | §18 | "Los destructivos son dry-run salvo `--confirm`" | ❌ | Solo tienen guarda `clonarSede…` (`--confirm`), `importarPadronExcel` (`--confirm`), `limpiarOrganizacionParaMigracion` (`--confirm`), `sembrarProductosPrueba` (`--confirm`) y `resetVencimientosPrueba` (`--aplicar`). `limpiarMiembros.ts` ejecuta `deleteMany({})` sobre check-ins, auditorías, pagos, suscripciones y miembros **de todas las organizaciones, sin where ni confirmación** (`:17-33`); `limpiarCajaPrueba.ts` usa `prisma.cierreCaja`, un modelo que ya no existe (script roto) |
| DI-88 | §18, §19 | `seed.ts` con `admin@gymdemo.com / admin1234` y `carlos@gymdemo.com / entrenador1234`; `cookies.txt` y `debug.keystore` commiteados | ✅ | `prisma/seed.ts:41-60` (imprime también la contraseña y la API key); `cookies.txt` en la raíz (contiene una cookie `sesion_token` de `localhost`; el valor no se transcribe); `apps/kiosk-tv/capacitor/android/app/debug.keystore` y `apps/vitrina-tv/capacitor/android/app/debug.keystore` |
| DI-89 | §18 | Importación desde `docs/xls/DATA ADRENALINA_hoy.xlsm` | ⚠️ | El `.xlsm` no está en el repo (`.gitignore:58` excluye `docs/xls/*.xlsm`); solo hay `ANALISIS_MIGRACION_EXCEL.md` |
| DI-90 | §19 | Puntos a reemplazar: marca, slugs, Excel, localización VE, literales de caja, reglas hardcodeadas, credenciales | ✅ | Contrastado con el inventario reproducible (`anexos/inventario/`). Añade `es-VE` (21 archivos, 34 ocurrencias), que el documento no cuenta |
| DI-91 | §20 | Riesgos 1–12 (activo, REST sin permiso, pago no atómico, anular sin revertir, CORS, SSE, tasa global, APK sin clave, scripts con `.env` de producción, tablas sin uso, eliminar miembro, sin `.env.example`) | ⚠️ | Todos confirmados; el 2 queda incompleto (DI-34/35) y el 9 es más grave de lo descrito (DI-87) |
| DI-92 | §21 | Disparidades documentación ↔ código (README, ADR-001, ROADMAP `DUENO`/`PlanSucursalAcceso`/`ActualizarTasaDiaria`, comentario de `lib/sesion.ts`) | ✅ | `README.md` (boilerplate), `docs/adr/ADR-001-gym-app-sesion.md:5`, `docs/ROADMAP.md:15,16,49`, `apps/web-admin/lib/sesion.ts:3-4`; `PlanSucursalAcceso` no está en el schema |
| DI-93 | §21 | `CLAUDE.md` omite `api/en-sala`, `api/kiosco`, `api/foto-proxy` y carpetas del panel | ❓ | No se comparó el `CLAUDE.md` línea a línea |

## 3. Hallazgos nuevos (no están en el documento de ingeniería)

| ID | Hallazgo | Evidencia | Consecuencia para Adhara |
|---|---|---|---|
| H-01 | `RegistrarPago` **no exige turno abierto**. Si no hay turno y el cobro no es retroactivo, el pago se guarda con `turnoId = null` y queda fuera del arqueo. El error `SinTurnoAbiertoError` solo existe en `VenderProducto` y `CobrarDeudasMiembro`. El asistente de cobro de la UI vive dentro de la rama "turno abierto" (`caja/page.tsx:86`), pero `POST /api/pagos` y el alta de miembro con pago (`miembros/actions.ts:193`) llegan al caso de uso sin esa guarda. | `RegistrarPago.ts:384`; `VenderProducto.ts:70`; `CobrarDeudasMiembro.ts:85` | Corrige mi PRD (HU-20: "no se cobra sin turno") y la regla 7 del doc 01. La regla se exigirá en el dominio (spec S-04/S-08) |
| H-02 | Dos fuentes de verdad de la vigencia: `Miembro.fechaVencimiento` y `Suscripcion`. El check-in decide por la suscripción; la edición manual intenta mantener ambas en sincronía y, si falta la suscripción, la crea. | `ValidarAccesoSucursalPorPlan.ts:36`; `ActualizarMiembro.ts:80-99` | La spec de pagos debe fijar **una** fuente de verdad (recomendado: la suscripción) y derivar el resto |
| H-03 | `limpiarMiembros.ts` borra todo el historial de todas las organizaciones sin confirmación; `limpiarCajaPrueba.ts` está roto (modelo inexistente). | `packages/db/limpiarMiembros.ts:17-33`; `limpiarCajaPrueba.ts:20` | Ningún script de `packages/db` pasa al repo nuevo salvo `seed` (reescrito) y migraciones (ADR-005, ADR-007) |
| H-04 | Comentarios del schema obsoletos: `saldoAFavorUSD` ("generado al bajar de plan") y `genero` ("para saludar"); el código ni genera ese saldo en el cambio de plan ni usa el género. | `schema.prisma`; `CambiarPlanConPago.ts` (`saldoAFavorGenerado` siempre 0) | No fiarse de los comentarios del schema; las specs citan código |
| H-05 | La localización VE está también en el idioma de formato: `es-VE` aparece 34 veces en 21 archivos (UI y kiosco). | `grep -rlE "es-VE"` sobre `apps` y `packages` | Entra en la spec de tiempo/localización (S-02): `es-PE` |
| H-06 | La matriz de permisos por rol está duplicada en dominio y en un script de `packages/db` por una restricción de dependencias; hay que mantenerlas a mano. | `CrearUsuarioAdmin.ts` y `backfillPermisosYSucursales.ts` | El repo nuevo la define una sola vez (paquete compartido o seed generado) |
| H-07 | Los entrenadores son `UsuarioAdmin` con email sintético y contraseña aleatoria para "no poder entrar". Con el hueco de `activo` y sin rate-limit, esa cuenta es un login potencial. | `sembrarOrganizacionZipGym.ts:92-93`; `CrearUsuarioAdmin.ts` | Decidir en la spec de usuarios: entidad `Entrenador` separada o usuario con login deshabilitado (P-22) |

## 4. Qué cambia en mis documentos

| Documento | Cambio |
|---|---|
| 01 regla 7 · 02 HU-20 | El turno es obligatorio para cobrar membresías **solo en la UI** del base; se exigirá en el dominio (H-01) |
| 03 §4 · ADR-012 | Lista completa de casos de uso, acciones y rutas sin control de permiso (DI-10, DI-34, DI-35) |
| ADR-005 · ADR-007 | Ningún script de mantenimiento pasa al repo nuevo; `limpiarMiembros.ts` es destructivo y sin guarda (H-03) |
| 05 §2 | Localización `es-VE` (H-05) además de zona horaria |
| 06 §3.0 | Fuente única de vigencia (H-02) |
| 07 | Tareas 0.3, 1.3b y 1.16 ajustadas; se añade la comprobación de permisos como test de contrato (tarea 0.10) |
| 08 | **P-22** (entrenadores como usuarios, H-07) y **P-23** (cobrar membresía sin turno abierto) con default |
| 09 | §2.2 sustituido por referencia a este documento; V-06 ampliado |
| 10 | Lectura obligatoria incluye este documento; S-01, S-04 y S-08 recogen los hallazgos |

## 5. Lo que el documento de ingeniería tiene y mis documentos no tenían

Para que no se pierda, se traslada a las specs: (1) **kiosco sin conexión** con cola IndexedDB y reintento (DI-48/49) — se conserva en el kiosco de Adhara; (2) **vitrina y APK** (DI-77…81) — fuera del MVP, pero con sus límites documentados para Fase 3; (3) **CI de APK** y gestión de claves por sede (DI-81) — irrelevante con sede única, relevante si se hace APK; (4) **estados de cara del kiosco** y umbral `por_vencer` de 5 días (DI-50), que pasa a configuración; (5) **tabla de scripts** (§18) como lista de lo que **no** se copia.
