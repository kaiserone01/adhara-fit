# 08 — Decisiones pendientes y supuestos por validar

Versión 0.3 · 2026-11-12 (v0.1: 2026-11-11). Las marcadas **BLOQUEANTE** impiden empezar la Fase indicada. El resto tiene un valor por defecto (columna "Si no responde") con el que avanzaré.

## Estado tras las respuestas del 12-nov-2026

| Tema | Respuesta | Efecto |
|---|---|---|
| P-01 Titularidad del repo | El repo es propio, control total | Sin bloqueo legal. Sigue recomendado repo nuevo sin historial por higiene (PII) |
| P-02 "Web" | Sistema web interno en subdominio, sin uso público | Sin sitio público; RF-70..72 redefinidos |
| P-03 / P-04 Moneda y locales | Soles, un solo local | ADR-002 y ADR-003 confirmados |
| P-05 Hardware | Smart-TV no previsto, no descartado | Vitrina diferida (puerta abierta). **Sigue abierto:** ¿con qué dispositivo se hará el check-in? |
| P-07 Régimen tributario | Pendiente | Comprobantes con registro manual (ADR-006) |
| **Nuevo:** pagos fraccionados | **No existen**: un solo pago | ADR-010; ~66 archivos de código/tests/scripts con abonos a retirar y `RegistrarPago` a reescribir |
| P-06 Productos/fiado | Sin respuesta | Se mantiene productos; fiado oculto |
| **Verificación contra el código (doc 09)** | Hallazgos de seguridad, caja compartida, baja de miembros | ADR-011, ADR-012, ADR-013; defaults de abajo |

**Preguntas nuevas v0.3 (con default; el usuario indicó que no las responderá por este canal):** **P-19** Caja compartida: ¿qué hace el cierre de turno cuando cambian de recepcionista a mitad de día? *(default: traspaso con arqueo parcial)*. **P-20** Baja de socios: ¿cuánto tiempo se conservan los registros de pago y quién autoriza la anonimización? *(default: conservar pagos, anonimizar datos personales a pedido; plazo a validar con contador/abogado)*. **P-22** Entrenadores: hoy son `UsuarioAdmin` con email sintético y contraseña aleatoria para no poder entrar. ¿Se modelan aparte? *(default: entidad `Entrenador` sin credenciales; solo se asigna a miembros)*. **P-23** ¿Se puede cobrar una membresía sin turno abierto? *(default: no; el dominio lo rechaza salvo pagos con fecha pasada; el base solo lo exige en la UI)*. **P-21** Cobro mixto: ¿se mantiene el pago en una sola línea o hay casos con dos métodos? (es P-16) *(default: una línea; se vuelve a evaluar si el piloto lo necesita)*.

**Preguntas nuevas:** **P-16** ¿"un solo pago" también significa que no se puede dividir entre métodos (p. ej. S/ 50 efectivo + S/ 30 Yape)? **P-17** ¿Se mantiene el cálculo al cambiar de plan a mitad de ciclo? *(Default v0.3, corregido tras leer el código: **conservar**; hoy el cambio con pago exige la diferencia exacta y convierte el valor no consumido en días, y editar el plan sin pago escala el tiempo transcurrido. No genera saldo a favor.)* **P-18** ¿Los días de gracia (cortesía tras el vencimiento) se mantienen? No son pago fraccionado.

## Preguntas (historial v0.1)

| ID | Pregunta | Por qué importa | Si no responde | Bloquea |
|---|---|---|---|---|
| **P-01** | ¿Usted es el autor/dueño del repo `kaiserone01/gym-app` o tiene permiso escrito para reutilizarlo comercialmente en Adhara Fit? El repo no declara licencia | Sin licencia, el código es de su autor; usar/copiar sin permiso es riesgo legal | — | **BLOQUEANTE Fase 0** |
| **P-02** | ¿"Web" en la descripción del proyecto significa solo el panel administrativo, o también un **sitio público** (landing, planes, contacto)? | Añade alcance (RF-70..72) | Solo panel; web pública en Fase 3 | Planificación |
| **P-03** | ¿Se aceptará **algún cobro en USD** (p. ej. turistas)? | Eliminar multi-moneda es una decisión casi irreversible | Solo PEN | Fase 1 |
| **P-04** | ¿Habrá **más de un local** en los próximos 12-24 meses? | Decide si basta ocultar `Sucursal` o conviene mantener multi-sede visible | Un local | Fase 1 |
| **P-05** | ¿Qué hardware usará para el check-in? (PC con numpad, tablet Android, TV para cartelería, lector QR/huella) | `kiosk-host`, `kiosk-tv`, vitrina | Navegador en PC/tablet con numpad | Fase 3 |
| **P-06** | ¿Se venden productos (agua, suplementos) y se **fía**? | Mantener o quitar `DeudaProducto` | Productos sí, fiado conservado pero oculto | Fase 1 |
| **P-07** | ¿Cuál es el **régimen tributario** (Nuevo RUS, RER, MYPE, General) y quién emite los comprobantes? | Define comprobantes y IGV | Registro manual del comprobante | Fase 2 |
| **P-08** | ¿Cómo operan hoy? (cuaderno, Excel, otro software), ¿cuántos miembros activos tiene y cuántos check-ins diarios? | Dimensiona migración, rendimiento y adopción | ~300 activos, 80 check-ins/día (supuesto propio) | — |
| **P-09** | ¿Se **redondea el efectivo** a S/ 0.10? ¿Se registra el **vuelto**? | Afecta arqueo | No redondea, no registra vuelto | Fase 1 |
| **P-10** | Presupuesto, fecha deseada de go-live y quién mantendrá el sistema | Prioriza fases | 7-9 semanas MVP (v0.3) | — |
| **P-11** | Planes y **precios** reales (tabla), reglas de abono, días de gracia, política de congelamiento | Seed y pruebas realistas | Planes de ejemplo | Fase 1 |
| **P-12** | ¿Dominio, hosting y cuentas ya existen? ¿Preferencia (VPS, Vercel+Neon, etc.)? | Despliegue | VPS con Docker | Fase 2 |
| **P-13** | ¿Quién redactará consentimiento, términos y política de privacidad (abogado)? | Cumplimiento | Plantilla para revisar | Fase 2 |
| **P-14** | ¿Se reutiliza el nombre de paquetes `@gym-app/*` o se renombra a `@adhara/*`? | Ruido de diff | No renombrar en Fase 0-1 | — |
| **P-15** | Marca: confirmar colores exactos y tipografía (medí del PDF: amarillo `#FFCB04`, negro `#231F20`) | Tema | Usar los medidos | — |

## Supuestos activos

Ver doc 01 §7 (S-01…S-08) y los añadidos: **S-09** (vuelto no persistido), **S-10** (extranjeros con código de socio numérico en el kiosco).

## Decisiones ya tomadas por mí (revisables)

| Decisión | ADR |
|---|---|
| Nuevo repo privado, copia sin historial | ADR-005 |
| Sede única implementada como fila `Sucursal` oculta | ADR-002 |
| Solo PEN | ADR-003 |
| `numeroDocumento` único por organización, sin tipo | ADR-004 |
| El sistema registra comprobantes pero no los emite (MVP) | ADR-006 |
| Eliminar padrón Excel y scripts del cliente anterior | ADR-007 |
| Paleta amarillo/negro de la marca | ADR-008 |
| Alcance de apps: `web-admin` + `kiosk` en MVP | ADR-009 |
| Pago único, sin abonos (alcance ampliado: reescritura del flujo de pago) | ADR-010 |
| Dinero en céntimos enteros en el dominio | ADR-011 |
| Baseline de seguridad antes de funcionalidades | ADR-012 |
| Baja lógica y anonimización en lugar de borrado | ADR-013 |
