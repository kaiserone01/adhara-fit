# 02 — PRD (Product Requirements Document) — Adhara Fit

Versión 0.1 · 2026-11-11 · Estado: borrador para validación

## 1. Resumen del producto

**Adhara Fit Platform** es el sistema de gestión y control de acceso del gimnasio Adhara Fit. Permite al personal inscribir miembros, cobrar membresías en Soles, cerrar caja por turno y saber en tiempo real quién tiene acceso, y permite al miembro validar su ingreso en un kiosco con su DNI.

**Propuesta de valor:** menos morosidad y menos cuadernos. Una sola fuente de verdad para vencimientos, cobros y asistencia.

## 2. Problema

| Hoy (supuesto, **[PREGUNTA P-08]**) | Con la plataforma |
|---|---|
| Vencimientos y pagos en cuaderno/Excel | Estado de acceso calculado automáticamente |
| Cierre de caja manual, propenso a descuadres | Turno con arqueo por método y diferencia explícita |
| Recepción decide el acceso "de memoria" | El kiosco muestra activo/gracia/vencido con foto |
| Cobros por Yape/Plin sin trazabilidad | Pago con N.º de operación y método registrado |
| Sin visibilidad de ocupación | Pantalla "En sala" en vivo |

## 3. Personas

> **Proto-personas supuestas** (nombres y cifras inventados para ilustrar; no provienen de entrevistas). Validar con Adhara Fit en la primera reunión.

**Rosa — Recepcionista (usuaria diaria).** Atiende 40-80 ingresos al día; necesita buscar por DNI, cobrar rápido (Yape/efectivo) y no equivocarse con el cierre. *Dolor:* cobros mezclados, miembros que "dicen que ya pagaron".

**Carlos — Propietario.** Quiere ver ingresos, morosos y asistencia desde el celular/PC. *Dolor:* no sabe cuánto entró realmente ni cuánta gente activa tiene.

**Miguel — Entrenador.** Quiere ver sus alumnos y vencimientos, sin tocar caja.

**Lucía — Miembro.** Llega, digita su DNI, entra. Quiere saber cuándo le vence.

## 4. Objetivos y métricas de éxito

| Objetivo | Métrica | Meta a 90 días del go-live |
|---|---|---|
| Adopción | % de pagos registrados en el sistema vs. total real | ≥ 95 % |
| Control de caja | Turnos con diferencia > S/ 5 | < 5 % |
| Velocidad en recepción | Tiempo de alta + primer cobro | < 2 min (p75) |
| Acceso | Check-ins resueltos por kiosco sin ayuda | ≥ 90 % |
| Calidad | Incidentes críticos (pérdida de datos, cobro duplicado) | 0 |
| Cobranza | Morosos recuperados tras recordatorio (Fase 3) | Línea base a definir |

## 5. Alcance por release

### Release 0 — "Repo listo" (Fase 0)
Repo nuevo, limpio y desplegable en local con Docker Compose; CI; documentación; sin lógica nueva.

### Release 1 — MVP Perú (Fases 1-2)
- Panel: Miembros, Planes, Caja (turnos), Pagos, En sala, Productos, Configuraciones, Usuarios.
- Kiosco de check-in por DNI.
- PEN, `America/Lima`, métodos de pago peruanos, registro de comprobante, consentimiento de datos, backup.

### Release 2 — Operación ampliada
Reportes (morosos, ingresos), recordatorios por WhatsApp, congelamiento de membresía, vitrina de TV (smart-TV no previsto; reevaluar).

### Release 3 — Integraciones
Facturación electrónica vía OSE/SUNAT, Yape/Plin Empresas o pasarela, QR/huella.

## 6. Historias de usuario del MVP

Formato: *Como [rol] quiero [acción] para [beneficio]* · Criterios de aceptación (CA) verificables.

### Miembros
- **HU-01** Como recepcionista quiero inscribir a un miembro con su DNI y primer pago para que quede activo desde el día uno.
  - CA: DNI de 8 dígitos validado; documento duplicado → error claro; al guardar con pago, `Suscripcion` activa y vencimiento = fecha + `diasCiclo`.
  - CA: Para CE/Pasaporte se acepta alfanumérico con longitud configurable.
- **HU-02** Como recepcionista quiero buscar a un miembro por nombre o DNI para atenderlo rápido.
  - CA: búsqueda parcial, resultados < 500 ms con 2 000 miembros.
- **HU-03** Como propietario quiero que cada alta registre el consentimiento de datos para cumplir la ley.
  - CA: casilla obligatoria con versión del texto; fecha/hora guardada; visible en la ficha.

### Planes y pagos
- **HU-10** Como gerente quiero crear planes (nombre, frecuencia, precio en S/, con/sin entrenador) para ofrecer la tarifa vigente.
  - CA: precio con 2 decimales; no se puede borrar un plan con suscripciones (solo desactivar).
- **HU-11** Como recepcionista quiero cobrar una membresía con uno o varios métodos para registrar pagos mixtos (efectivo + Yape). **[Pendiente P-16]**: si no se permite dividir, un pago = un método.
  - CA: la suma de líneas = total exacto (sin tolerancia); métodos no efectivo piden N.º de operación; `grupoPagoId` común.
- ~~**HU-12** Abonos~~ **Retirada (12-nov-2026):** un solo pago por membresía, sin fraccionamiento (ADR-010). Quien no pueda pagar un mes completo elige un plan más corto (diario, semanal, quincenal).
- **HU-13** Como recepcionista quiero registrar el comprobante emitido (boleta/factura/ticket + serie-número) en cada cobro.
  - CA: campos opcionales por método, obligatorios si el SOCIO lo configura así.
- **HU-14** Como gerente quiero anular un pago con motivo para corregir errores sin perder trazabilidad.
  - CA: solo SOCIO/GERENTE; el pago queda marcado, no borrado; el turno recalcula.

### Caja
- **HU-20** Como recepcionista quiero abrir turno con fondo inicial en efectivo para comenzar a cobrar.
  - CA: un solo turno abierto en el local (caja compartida); si hay otro abierto, se muestra quién lo abrió y se permite el traspaso con cierre y arqueo; el dominio rechaza cobrar una membresía sin turno abierto (salvo pagos "fuera de turno" con fecha pasada). *Nota: el repo base no lo exige en `RegistrarPago`, solo la UI; ver doc 11 H-01.*
- **HU-21** Como recepcionista quiero registrar egresos con motivo para que la caja cuadre.
- **HU-22** Como recepcionista quiero cerrar turno contando por método para detectar diferencias.
  - CA: esperado calculado en servidor; nota obligatoria solo si hay diferencia.
- **HU-23** Como propietario quiero ver y **imprimir** el histórico de pagos por rango/turno.

### Acceso
- **HU-30** Como miembro quiero digitar mi DNI en el kiosco para entrar.
  - CA: respuesta < 1 s; muestra foto, nombre, estado y fecha de vencimiento.
- **HU-31** Como miembro con plan vencido quiero ver un mensaje claro para ir a recepción.
- **HU-32** Como recepcionista quiero ver quién está en sala y marcar salida a mano.
- **HU-33** Como gerente quiero personalizar frases e imagen de la pantalla en reposo.
- **HU-34** Como técnico quiero que el kiosco funcione sin internet y sincronice después.
  - CA: cola IndexedDB; sin duplicados al reintentar.

### Administración
- **HU-40** Como SOCIO quiero crear usuarios y asignar permisos por módulo/acción.
- **HU-41** Como gerente quiero configurar métodos de pago (Yape, Plin, bancos con su N.º de cuenta/CCI) para mostrarlos en el cobro.
- **HU-42** Como gerente quiero definir los días de gracia (solo mensuales).

## 7. Fuera de alcance (MVP)

Facturación electrónica integrada, app para miembros, reservas de clases, pagos online, multi-sede en la UI, hardware biométrico, vitrina de TV.

## 8. Dependencias y supuestos clave

- Repo propio (resuelto). Sistema web interno en subdominio, sin sitio público (resuelto).
- Definir el dispositivo de check-in (P-05); smart-TV no previsto.
- Asesoría contable para comprobantes y legal para datos personales **[VERIFICAR]**.

## 9. Riesgos de producto

| Riesgo | Mitigación |
|---|---|
| Personal rechaza el sistema por lentitud | Pruebas con Rosa (recepción) en Fase 2; atajos de teclado; cobrar en ≤ 4 clics |
| Miembros sin DNI a mano | Búsqueda por nombre en recepción; QR/tarjeta en Release 3 |
| Cortes de internet | Kiosco offline; recepción con aviso claro de modo degradado |
| Migración de miembros existentes | Importador CSV simple (HU-50, Release 1.1); el Excel del cliente anterior **no** sirve |

## 10. Plan de lanzamiento (propuesta)

1. Piloto interno 1 semana con datos de prueba y personal.
2. Carga inicial de miembros (CSV) + 2 semanas en paralelo con el método anterior.
3. Corte definitivo y retiro del cuaderno/Excel.
