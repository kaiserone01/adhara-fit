# 01 — Levantamiento de requerimientos

Versión 0.1 · 2026-11-11 · Cliente: Adhara Fit · Proyecto: `adhara-fit`

## 1. Contexto y objetivo

Adhara Fit es un gimnasio en Perú (marca: kettlebell amarilla con "A", fondo negro, texto blanco). Necesita una plataforma para:

1. **Administrar** miembros, planes, pagos y caja.
2. **Controlar accesos** de los miembros al local (check-in en kiosco).
3. **Acceso web privado:** se usa desde el navegador en un subdominio propio (p. ej. `app.<dominio>`), solo para las operaciones del gimnasio. **No hay sitio público** (confirmado 12-nov-2026).

**Objetivo de negocio:** reemplazar cuadernos/Excel por un sistema único que diga, en segundos, si un miembro tiene acceso hoy, cuánto debe y cuánto se recaudó por turno, todo en **Soles**.

**Estrategia técnica:** partir del repo `gym-app` (ya probado en producción en otro gimnasio) y adaptarlo, en lugar de construir desde cero.

## 2. Alcance

### 2.1 Dentro del alcance (MVP — Fases 0-2)

- Un solo local, sin noción visible de sucursales (confirmado 12-nov-2026).
- Moneda única: **PEN (S/)**. Sin tasa de cambio.
- Identificación de miembros por **DNI** (y CE/Pasaporte para extranjeros).
- Panel administrativo web (`web-admin`) para personal.
- Kiosco de check-in (`kiosk`) con teclado numérico.
- Caja con turnos, egresos y arqueo por método de pago.
- Métodos de pago peruanos: efectivo, Yape, Plin, tarjeta (POS), transferencia/depósito.
- Cumplimiento básico: consentimiento de datos personales, Libro de Reclamaciones, registro del comprobante emitido.

### 2.2 Fuera del alcance del MVP (diferido)

- Vitrina de TV + APK Android (`apps/vitrina`, `apps/vitrina-tv`) — smart-TV no previsto, no descartado.
- `kiosk-host` (app WinForms para numpad RAIKU K-601) — **[PREGUNTA P-05]** depende del hardware que use Adhara.
- Emisión electrónica de comprobantes integrada con SUNAT/OSE.
- App móvil para miembros, reservas de clases, pasarela de pago online.
- Multi-sede (el modelo lo soporta; la UI se oculta).

### 2.3 Eliminado explícitamente

- Conversión USD↔Bs, tasa BCV, worker `actualizar-tasa`.
- Padrón Excel (`MiembroReferencia`, `PadronHoja`, menú "Excel", activación por cédula del padrón).
- Scripts de clonado `zip-gym` y de migración del Excel.
- Campo `genero` (ya sin uso en el repo base) y marcas `porRegularizar`/`vieneDelExcel`.
- **Pagos fraccionados (abonos)**, reglas de abono, fecha límite de abono, saldo pendiente y tolerancia: cada membresía se paga completa en un solo pago (ADR-010).

## 3. Interesados

| Rol | Interés | Notas |
|---|---|---|
| Propietario/Socio de Adhara Fit | Control de ingresos, morosos, reportes | Rol `SOCIO` |
| Gerente | Operación diaria, configuraciones | Rol `GERENTE` |
| Recepción | Altas, cobros, caja, check-in | Rol `RECEPCION` |
| Entrenadores | Ver sus alumnos | Rol `ENTRENADOR`, sin acceso a caja |
| Miembros | Entrar rápido, saber su vencimiento | Usuario del kiosco |
| Equipo técnico (usted/yo) | Mantenibilidad, despliegue | |
| Contador / asesor legal | Comprobantes, datos personales | **[VERIFICAR]** |

## 4. Requerimientos funcionales

Prioridad: **M** = Must (MVP), **S** = Should, **C** = Could (post-MVP). "Base" indica si ya existe en `gym-app`.

### 4.1 Acceso y seguridad
| ID | Requerimiento | Pri | Base |
|---|---|---|---|
| RF-01 | Login con email y contraseña (bcrypt), sesión con token en cookie | M | Sí |
| RF-02 | Roles `SOCIO`, `GERENTE`, `RECEPCION`, `ENTRENADOR` con permisos granulares por módulo y acción (VER/CREAR/EDITAR/ELIMINAR) | M | Sí |
| RF-03 | Cambio de contraseña propio y por administrador | M | Sí |
| RF-04 | Registro de auditoría de acciones sensibles | S | Parcial (`RegistroAuditoria` sin consumidores amplios) |

### 4.2 Miembros
| ID | Requerimiento | Pri | Base |
|---|---|---|---|
| RF-10 | Alta/edición de miembro: nombre, **tipo y número de documento**, celular, fecha de nacimiento, foto, plan, entrenador | M | Sí (cédula → documento) |
| RF-11 | Unicidad de documento por organización | M | Sí |
| RF-12 | Baja lógica y reactivación; eliminación física controlada | M | Sí |
| RF-13 | Listado con filtros: nombre/documento, inscripción, vencimiento, plan, próximo cobro; vista tarjetas/lista; impresión | M | Sí |
| RF-14 | Ficha con historial de pagos y fechas de pago/vencimiento editables | M | Sí |
| RF-15 | Registro de consentimiento de tratamiento de datos personales (fecha, versión del texto) | M | **No** (nuevo) |
| RF-16 | Contacto de emergencia / condiciones de salud declaradas (PAR-Q) | C | No |

### 4.3 Planes y suscripciones
| ID | Requerimiento | Pri | Base |
|---|---|---|---|
| RF-20 | Planes con frecuencia (diario, semanal, quincenal, mensual, semestral, anual, personalizado) y `diasCiclo` | M | Sí |
| RF-21 | Plan con/sin entrenador, precio en **PEN** | M | Sí (USD → PEN) |
| RF-22 | ~~Abonos parciales~~ **Retirado:** la membresía se paga completa en un solo pago (ADR-010) | — | Sí (se elimina) |
| RF-23 | Cambio de plan con auditoría. Se conserva el cálculo existente (valor no consumido → días; diferencia a pagar en un solo pago exacto); no genera saldo a favor. **[P-17]** confirmar con el cliente | S | Sí |
| RF-24 | Pago de 1 a 6 meses adelantados | S | Sí |
| RF-25 | Días de gracia configurables, solo para planes mensuales (configuración **global**, no por sede) | M | Sí (mover de `Sucursal` a configuración) |
| RF-26 | Congelamiento de membresía (viaje, lesión) | C | **No** |

### 4.4 Pagos y caja
| ID | Requerimiento | Pri | Base |
|---|---|---|---|
| RF-30 | Registrar el pago único de la membresía (precio del plan × meses) con un método; **[PREGUNTA P-16]** ¿se permite dividirlo entre métodos (efectivo + Yape)? | M | Sí |
| RF-31 | Métodos de pago configurables: efectivo, Yape, Plin, tarjeta, transferencia, depósito | M | Sí (catálogo nuevo) |
| RF-32 | N.º de operación para métodos no efectivo | M | Sí |
| RF-33 | Pago con fecha pasada (hasta 90 días) fuera de turno | S | Sí |
| RF-34 | Anulación de pago con motivo (solo SOCIO/GERENTE); nunca se borra | M | Sí |
| RF-35 | Turnos de caja: apertura con fondo inicial en efectivo, egresos, cierre con arqueo por método y nota obligatoria si hay diferencia | M | Sí (quitar doble moneda) |
| RF-36 | Histórico de pagos por rango/turno, imprimible | M | Sí |
| RF-37 | Venta de productos (agua, guantes…) con cobro inmediato | S | Sí |
| RF-38 | Fiado de productos y cobro posterior de deudas | C | Sí — **[PREGUNTA P-06]** ¿lo usará Adhara? |
| RF-39 | Registrar **tipo y número de comprobante** (boleta/factura/ticket interno) emitido por pago | M | **No** (nuevo) |
| RF-40 | Emisión electrónica integrada (OSE/SUNAT) | C | No |

### 4.5 Control de acceso
| ID | Requerimiento | Pri | Base |
|---|---|---|---|
| RF-50 | Kiosco: el miembro digita su DNI y ve estado (activo/vencido/en gracia), foto, nombre | M | Sí |
| RF-51 | Autenticación del kiosco por API key (no por id de sede) | M | Sí |
| RF-52 | Cola offline de check-ins con reintento al volver la red | M | Sí |
| RF-53 | Idempotencia de check-in (ventana de 2 min) | M | Sí |
| RF-54 | Pantalla "En sala": quién está dentro, marcar salida, historial para SOCIO | M | Sí |
| RF-55 | Frases, imagen y opacidad de la pantalla en reposo configurables | S | Sí |
| RF-56 | Lector QR/huella/tarjeta de proximidad | C | No |
| RF-57 | Aviso al miembro vencido para pasar por recepción (sin bloquear puerta física) | M | Sí |

### 4.6 Reportes y configuración
| ID | Requerimiento | Pri | Base |
|---|---|---|---|
| RF-60 | Configuración de métodos de pago y días de gracia | M | Sí |
| RF-61 | Gestión de usuarios y permisos | M | Sí |
| RF-62 | Reporte de morosos / por vencer | S | Parcial (filtros de Miembros) |
| RF-63 | Dashboard de ingresos, altas y asistencia | C | No |
| RF-64 | Recordatorios de vencimiento por WhatsApp | C | No |

### 4.7 Acceso web privado (sin sitio público)
| ID | Requerimiento | Pri |
|---|---|---|
| RF-70 | Despliegue en subdominio propio con TLS; todo requiere sesión salvo login y kiosco; sin indexación (`noindex`) | M |
| RF-71 | Aviso del Libro de Reclamaciones en el local (físico o virtual) | M |
| RF-72 | Texto de consentimiento y política de privacidad accesibles desde el alta | M |

## 5. Requerimientos no funcionales

| ID | Categoría | Requerimiento |
|---|---|---|
| RNF-01 | Localización | Todas las fechas en `America/Lima` (UTC-5, sin horario de verano); montos con formato `es-PE` (`S/ 1,234.50`); textos en español |
| RNF-02 | Rendimiento | Check-in responde en < 1 s en red local/4G; listado de miembros fluido con ≥ 2 000 registros |
| RNF-03 | Disponibilidad | El kiosco sigue operando sin internet (cola offline) |
| RNF-04 | Seguridad | HTTPS obligatorio, contraseñas con bcrypt, API key de kiosco rotables, sin secretos en el repo, cabeceras CORS restringidas |
| RNF-05 | Datos personales | Cumplir Ley 29733 y su nuevo reglamento (DS 016-2024-JUS, vigente desde 30-mar-2025): base legal/consentimiento, medidas de seguridad, derechos ARCO, gestión de incidentes **[VERIFICAR]** |
| RNF-06 | Mantenibilidad | Mantener la arquitectura hexagonal; lógica nueva en `packages/domain` con tests Vitest |
| RNF-07 | Respaldo | Backup diario de Postgres con retención ≥ 14 días y prueba de restauración mensual |
| RNF-08 | Observabilidad | Logs estructurados y alerta ante fallos de check-in/DB |
| RNF-09 | Despliegue | Contenedores Docker (ya existen) en VPS/PaaS; migraciones al arrancar el contenedor |
| RNF-10 | Accesibilidad | Interfaz del kiosco legible a 2 m; contraste AA con la paleta de marca |

## 6. Reglas de negocio (heredadas y adaptadas)

1. Un miembro tiene **a lo sumo una suscripción activa**; el pago extiende desde `max(fin vigente, hoy)`.
2. El **ciclo** de un pago dura `diasCiclo` del plan; pagar N meses suma N×`diasCiclo`.
3. Estado de acceso: **activo** (vigente), **gracia** (solo planes mensuales y si `diasGracia > 0`), **vencido**.
4. **Pago único:** cada membresía se cobra completa (precio del plan × meses). No hay abonos, saldos pendientes ni fecha límite de abono (ADR-010).
5. **Sin tolerancia:** el monto cobrado debe igualar el total; no se aceptan diferencias.
6. Un pago **nunca se borra**: se anula con motivo y autor. *(En el repo base `EliminarMiembro` sí borra pagos; se sustituye por baja lógica, ADR-013.)*
7. Un turno de caja abierto a la vez **por sede** (verificado en `AbrirTurno`; no es por usuario). Con sede única hay **una sola caja compartida**: quien atiende después debe cerrar o recibir el turno (traspaso). El cierre recalcula lo esperado en servidor. *(Verificado: el base solo exige turno abierto para vender productos y cobrar deudas; el pago de membresía sin turno se guarda con `turnoId = null` y sale del arqueo. En Adhara el dominio lo rechaza, salvo pagos con fecha pasada; P-23.)*
8. ENTRENADOR no puede abrir/cerrar turno, registrar egresos ni cobrar.
9. El kiosco nunca envía un id de sede: se autentica con API key.
10. Documento único por organización (no por tipo): `DNI 12345678` y `CE 12345678` colisionan a propósito para evitar duplicados.

## 7. Supuestos

| ID | Supuesto | Impacto si es falso |
|---|---|---|
| S-01 | Adhara Fit tiene **un solo local** y no lo abrirá en el corto plazo | Mantener la tabla `Sucursal` (ADR-002) lo cubre sin rediseño |
| S-02 | Todos los precios y cobros son en PEN; no se acepta USD | Reintroducir multi-moneda es costoso; confirmar P-03 |
| S-03 | Se despliega en un VPS/PaaS con Docker y Postgres administrado | Cambia sólo el doc de despliegue |
| S-04 | El personal usa PC/tablet con Chrome/Edge | — |
| S-05 | Los comprobantes se emiten **fuera** del sistema (SUNAT SOL / facturador) y aquí solo se registra el número | Si se quiere emisión integrada, es una fase aparte (ADR-006) |
| S-06 | Hay conexión a internet estable en recepción; el kiosco tolera cortes | — |
| S-07 | (retirado) ya no hay abonos ni tolerancia | — |
| S-08 | ~~Derecho a reutilizar `gym-app`~~ **Confirmado:** el repo es propio (12-nov-2026) | Resuelto |

## 8. Restricciones

- Presupuesto/plazo: **[PREGUNTA P-10]** no informados.
- El repo base usa Next.js 16, React 19, Prisma 7, Node 22, Tailwind 4, npm 10 workspaces: se conserva la pila para no perder el trabajo ya probado.
- Cumplimiento: Ley 29733 (datos), Ley 29571 y DS 011-2011-PCM (Libro de Reclamaciones), normas SUNAT de comprobantes **[VERIFICAR]**.

## 9. Criterios de aceptación globales del MVP

- Un recepcionista puede, en < 2 min: inscribir un miembro con DNI, cobrarle un plan mensual con Yape, y ver que el kiosco le da acceso.
- Cierre de turno cuadra al céntimo entre pagos registrados y arqueo.
- Ningún texto, moneda, zona horaria ni dato de ejemplo hace referencia a Venezuela, Bs, BCV, cédula ni Adrenalina.
- `npm run build`, `lint` y todos los tests (dominio + db + kiosk) en verde en CI.
- El repo no contiene PII, secretos ni historial del cliente anterior.

## 10. Preguntas abiertas

Ver [08-decisiones-pendientes.md](08-decisiones-pendientes.md).
