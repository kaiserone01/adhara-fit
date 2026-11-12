---
id: S-12
estado: aprobada
adrs: ADR-006, ADR-011, ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-11, S-15, S-22, S-23
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-12 — Tickets de pago y registro de comprobantes, desarrollados y apagados

## 0. Contexto y alcance

### 0.1 Problema
ADR-006 (aceptado el 2026-11-12) decidió que el sistema desarrolla por completo, y entrega **apagadas**, tres funciones: un **ticket de pago no fiscal** (por correo y para imprimir en una ticketera de 80 mm) y el **registro del comprobante tributario** (boleta, factura o ticket interno) que el gimnasio emite fuera del sistema. Hasta que el propietario las confirme con su contador, ninguna pantalla, API ni reporte debe exponer tickets ni datos de comprobante. El código heredado no tiene nada de esto: el miembro no tiene correo, no se envía ningún correo y solo existen botones genéricos de imprimir. S-12 crea los tres interruptores, el ticket, el envío por correo y el registro de comprobantes, y garantiza que con los interruptores apagados el sistema se comporta como si no existieran. No emite comprobantes ni se comunica con SUNAT.

### 0.2 Dentro de alcance
- Tres interruptores en `ConfiguracionNegocio` (`ticketCorreoActivo`, `ticketImpresionActiva`, `comprobantesRegistroActivo`, que corresponden a `ticket.correo.activo`, `ticket.impresion.activa` y `comprobantes.registroActivo` de ADR-006), apagados por defecto, y su pestaña «Tickets y comprobantes» en la pantalla de configuración existente (`configuraciones/`).
- Tabla `TicketPago`: un ticket por pago, con número correlativo interno y una **copia congelada** de lo que muestra, creada la primera vez que se pide.
- Ticket en HTML para ticketera de 80 mm, con la leyenda «Documento no fiscal, sin validez tributaria», y el botón de imprimir.
- Correo del miembro (`Miembro.correo` y `Miembro.correoConsentidoEn`), puerto `IEnviadorCorreo`, adaptador SMTP con `nodemailer` y el envío manual del ticket, con registro de cada intento (`EnvioTicket`).
- Tabla `ComprobantePago` (como máximo uno por pago) con tipo, serie, número y, si es factura, RUC y razón social, y su validación.
- Que con los interruptores apagados las rutas respondan 404, las acciones se rechacen y ninguna respuesta de la API incluya datos de ticket, correo ni comprobante.
- `tools/verificar-ticket.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Emitir comprobantes electrónicos o hablar con SUNAT, un OSE o un facturador (ADR-006 §5, Fase 3): el puerto `IEmisorComprobantes` no se crea aquí.
- Impresión directa por comandos de ticketera: solo el diálogo de impresión del navegador.
- Envío automático del ticket al registrar cada pago: el envío es manual (SUP-S12-004).
- Texto legal del consentimiento de datos personales, política de privacidad y Libro de Reclamaciones: S-13; aquí solo se guarda la marca de que el miembro aceptó recibir su ticket por correo.
- Reportes por tipo de comprobante: S-14, y solo cuando el interruptor esté encendido (ADR-006).
- Validar con un contador o abogado que el ticket cumple las normas de comprobantes: lo hace el propietario antes de encender cualquier interruptor.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-12 recibirá después de S-00 a S-11, S-15, S-22 y S-23; se recontarán al empezar.
- **Impresión:** `apps/web-admin/app/(panel)/BotonImprimir.tsx:7` es un botón que llama a `window.print()` y solo lo usa `pagos/page.tsx`; `en-sala/HistorialSala.tsx:74` tiene otro `window.print()`; `globals.css:76-80` define `@media print` con solo el fondo blanco (verificado con `Read` y `grep -rn`).
- **Correo:** `Miembro` no tiene campo de correo (solo `celular`, `schema.prisma:155`); el único correo es `UsuarioAdmin.email` (`:85`); ningún `package.json` declara `nodemailer`, `sendgrid`, `resend`, `mailgun` ni `smtp` (verificado con `grep -rn` sobre los `package.json`, sin `node_modules`).
- **Pantalla de configuración:** existe `apps/web-admin/app/(panel)/configuraciones/` con `page.tsx`, `tabs.ts`, `TabsConfiguraciones.tsx`, `actions.ts`, `layout.tsx` y las carpetas `metodos-pago`, `reglas-abono` y `excel` (verificado con `ls`); S-04 retira las reglas de abono y S-10 el Excel.
- **Pantallas de pagos:** `pagos/` tiene `page.tsx` (historial), `nuevo/`, `FormularioPago.tsx` y `actions.ts`, y no tiene una página de detalle de un pago (verificado con `ls`).
- **Ventas sin miembro:** una venta de producto es un `Pago` con `miembroId` nulo (`VenderProducto.ts:89`), `productoNombre` y `cantidad` (`:103-104`) y `fechaInicioCiclo` y `fechaFinCiclo` nulos (`:99-100`); `conceptoPago.ts:5-10` calcula «producto × cantidad» (y omite «× 1») o el nombre del miembro (verificado con `Read`).
- **El pago no apunta a un plan:** `Pago` (`schema.prisma:268-315`) no tiene `planId`; el plan vive en `Miembro.planId` (`:159`, mutable) y en `Suscripcion.planId` (`:255`), y `Suscripcion` no tiene `pagoId` (`:251-266`) (verificado con `Read`).
- **Decisiones previas:** ADR-006 §3 fija el contenido del ticket (negocio, fecha y hora de Lima, número correlativo interno, miembro, plan y vigencia, monto, método, número de operación y administrador), los interruptores y que la librería y el proveedor de correo los decide S-12 con su dependencia justificada; S-02 define el formateador único `packages/ui/formato/fechaHora.ts` (fecha `dd/mm/aaaa`, hora `3:30 p. m.`, REQ-S02-010 y REQ-S02-011); S-03 define `formatearSoles`; S-05 crea `ConfiguracionNegocio` de una sola fila; S-04 define el cobro de un solo pago, el bloqueo por miembro y la anulación, y S-07 la columna `Pago.creadoEn` y el cobro anulable como el no anulado de mayor `creadoEn`; S-08 define el concepto del cobro («Membresía», «Cambio de plan» o el producto, SUP-S08-010); S-09 define el miembro eliminado y limita los campos editables del `PATCH` de `api/miembros/[id]` (REQ-S09); S-11 define la venta de un solo producto (verificado con `Read` de los ADR y `grep -n` en las specs).
- No verificado: el comportamiento de `nodemailer` en la versión que se fije con servidores SMTP reales, que la ticketera del propietario imprima bien un documento HTML de 80 mm, y el contenido de `ModalVenderProducto.tsx` tras S-08 y S-11.

### 0.5 Supuestos
- SUP-S12-001: los interruptores son tres columnas booleanas de `ConfiguracionNegocio`, apagadas por defecto; los enciende y apaga cualquier administrador desde la pestaña «Tickets y comprobantes» de `configuraciones/`, con el aviso fijo «Valida con tu contador antes de encender». Apagar un interruptor no borra los datos ya guardados: solo los oculta. Default: esas columnas y ese aviso; asumido, por validar.
- SUP-S12-002: el ticket es único por pago: el primer pedido crea el `TicketPago` con un número correlativo generado por la base (columna de identidad) y una copia congelada de su contenido, y los siguientes lo devuelven idéntico aunque después cambien el nombre del miembro, el plan o el negocio; el número puede tener saltos si una transacción se revierte. Default: copia congelada y correlativo con saltos posibles; asumido, por validar.
- SUP-S12-003: el ticket muestra el nombre del negocio, la fecha y la hora de registro del pago (`Pago.creadoEn`) con el formateador único de S-02, el número en seis dígitos («N.º 000123»), el concepto de S-08, el monto con `formatearSoles`, el método, el número de operación si lo hay y el nombre del administrador que registró el pago. Una venta muestra el producto y la cantidad siempre con «× cantidad» (también «× 1»). Default: ese contenido; asumido, por validar.
- SUP-S12-004: el ticket de una membresía o de un cambio de plan muestra además el nombre del miembro y, solo si el pago es el cobro más reciente no anulado del miembro (mayor `Pago.creadoEn`), el nombre del plan y la fecha de vencimiento del miembro en ese momento; si no lo es, omite plan y vigencia para no mostrar datos de otro cobro. Default: ese criterio; asumido, por validar.
- SUP-S12-005: el ticket se envía por correo solo cuando un administrador pulsa «Enviar por correo»; no se envía solo al registrar el pago, para que un fallo del correo nunca afecte un cobro. Una venta no tiene miembro y por eso no se puede enviar por correo. Default: envío manual; asumido, por validar.
- SUP-S12-006: el proveedor es cualquier servidor SMTP configurado por variables de entorno (`SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE` y `CORREO_REMITENTE`); «SMTP configurado» significa que `SMTP_HOST`, `SMTP_PUERTO` y `CORREO_REMITENTE` no están vacías (usuario y clave son opcionales para relés locales). La librería es `nodemailer` con `@types/nodemailer` como dependencia de desarrollo, en versión exacta fijada al implementar entre las que tengan al menos dos semanas de publicación y pasen `npm audit`; se justifica por no atar al gimnasio a un proveedor de pago y por ser la librería estándar de SMTP para Node. El correo es de texto plano, sin adjuntos, y el adaptador corta a los 10 segundos. Default: ese diseño; asumido, por validar.
- SUP-S12-007: el miembro tiene un correo opcional de hasta 254 caracteres con la forma `^[^@\s]+@[^@\s]+\.[^@\s]+$`, guardado en minúsculas, y una marca `correoConsentidoEn` con la fecha y hora de Lima en que aceptó recibir su ticket por correo; sin la marca no se envía nada; cambiar el correo exige aceptar de nuevo y vaciarlo borra la marca. El campo solo aparece cuando el interruptor del correo está encendido. Default: ese diseño; asumido, por validar.
- SUP-S12-008: el comprobante es de tipo `BOLETA` (serie `B`), `FACTURA` (serie `F`) o `TICKET_INTERNO` (serie `T`), cada serie seguida de tres caracteres alfanuméricos en mayúsculas, con número entero de 1 a 99 999 999 y único por tipo y serie. La factura exige un RUC de 11 dígitos con prefijo 10, 15, 16, 17 o 20 y dígito verificador válido —se multiplican los 10 primeros dígitos por 5, 4, 3, 2, 7, 6, 5, 4, 3 y 2, se suma, y el dígito es 11 menos el resto de dividir entre 11, tomando 0 si da 10 y 1 si da 11— y una razón social de 2 a 120 caracteres. Default: esas reglas, no validadas con un contador; asumido, por validar.
- SUP-S12-009: no se puede registrar un comprobante de un pago anulado; si se anula un pago que ya tiene comprobante, el comprobante se conserva y se muestra con la marca «pago anulado». Default: ese tratamiento; asumido, por validar.
- SUP-S12-010: para encender el interruptor del correo debe haber un servidor SMTP configurado (SUP-S12-006); si no lo hay no se enciende. Default: esa condición; asumido, por validar.
- SUP-S12-011: ancho de impresión de 80 mm; si el propietario usa 58 mm se ajusta con una variable de estilo. Default: 80 mm; asumido, por validar (ADR-006).
- SUP-S12-012: la entrada de «pegado rápido» de ADR-006 se reduce a los campos del comprobante: tipo, serie, número y, si es factura, RUC y razón social, sin otros datos. Default: esos campos; asumido, por validar.

## 1. Requisitos

### REQ-S12-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: ConfiguracionNegocio deberá tener las columnas booleanas ticketCorreoActivo, ticketImpresionActiva y comprobantesRegistroActivo, todas con valor por defecto falso.

### REQ-S12-002
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-001
- texto: La pestaña «Tickets y comprobantes» de la pantalla de configuración deberá permitir encender y apagar cada interruptor.

### REQ-S12-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-001
- texto: La pestaña «Tickets y comprobantes» deberá mostrar el aviso «Valida con tu contador antes de encender».

### REQ-S12-004
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-010
- texto: Si SMTP_HOST, SMTP_PUERTO o CORREO_REMITENTE están vacías entonces encender ticketCorreoActivo deberá rechazarse con CorreoNoConfiguradoError sin escribir nada.

### REQ-S12-005
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si ticketImpresionActiva está apagado entonces la ruta del ticket imprimible deberá responder 404.

### REQ-S12-006
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si ticketCorreoActivo está apagado entonces la acción de enviar el ticket por correo deberá rechazar el pedido con InterruptorApagadoError sin escribir nada.

### REQ-S12-007
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si comprobantesRegistroActivo está apagado entonces la acción de registrar comprobante deberá rechazar el pedido con InterruptorApagadoError sin escribir nada.

### REQ-S12-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: Con los tres interruptores apagados el sistema no deberá mostrar ninguna pantalla, botón, campo ni dato de ticket, correo de miembro o comprobante, ni incluirlos en las respuestas de la API.

### REQ-S12-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-001
- texto: Apagar un interruptor no deberá borrar ni modificar los tickets, los envíos, los correos de miembros ni los comprobantes ya guardados.

### REQ-S12-010
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-002
- texto: La base de datos deberá tener la tabla TicketPago con una fila como máximo por pago, un número correlativo generado por la base y único, y la fecha de creación.

### REQ-S12-011
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-002
- texto: TicketPago deberá guardar una copia congelada del nombre del negocio, el concepto, el nombre del miembro, el plan, la fecha de vencimiento, el monto, el método, el número de operación, el administrador y la fecha y la hora de registro del pago.

### REQ-S12-012
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-002
- texto: obtenerTicketDePago deberá devolver el ticket existente del pago, sin recalcular su contenido, o crearlo si no existe.

### REQ-S12-013
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos pedidos simultáneos del ticket de un mismo pago llegan a la vez entonces obtenerTicketDePago deberá crear una sola fila y devolver el mismo número a ambos.

### REQ-S12-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: obtenerTicketDePago y registrarComprobante deberán leer el pago con bloqueo compartido de su fila dentro de una transacción de IUnidadDeTrabajo de S-04 antes de validar que no está anulado.

### REQ-S12-015
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-009
- texto: Si el pago está anulado o no existe entonces obtenerTicketDePago deberá rechazarlo con PagoAnuladoError o PagoNoEncontradoError sin crear ningún ticket.

### REQ-S12-016
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-003
- texto: El ticket deberá contener el nombre del negocio, la fecha y la hora de registro del pago, el número correlativo de seis dígitos, el concepto, el monto, el método de pago, el número de operación si existe y el administrador que registró el pago.

### REQ-S12-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: Todo ticket deberá incluir la leyenda «Documento no fiscal, sin validez tributaria».

### REQ-S12-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-004
- texto: El ticket de una membresía o de un cambio de plan deberá mostrar el nombre del miembro.

### REQ-S12-019
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-004
- texto: El ticket de un pago que es el cobro más reciente no anulado del miembro deberá mostrar el nombre del plan y la fecha de vencimiento del miembro en ese momento.

### REQ-S12-020
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-004
- texto: Si el pago no es el cobro más reciente no anulado del miembro entonces el ticket no deberá mostrar plan ni vigencia.

### REQ-S12-021
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-003
- texto: El ticket de una venta deberá mostrar el producto con «× cantidad», también cuando la cantidad es 1.

### REQ-S12-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El ticket deberá mostrar el monto con formatearSoles de S-03.

### REQ-S12-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El ticket deberá mostrar la fecha y la hora con el formateador único de packages/ui/formato/fechaHora.ts de S-02.

### REQ-S12-024
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-011
- texto: La vista imprimible del ticket deberá tener un ancho de 80 mm.

### REQ-S12-025
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-011
- texto: La vista imprimible del ticket no deberá mostrar menús ni elementos del panel.

### REQ-S12-026
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-011
- texto: El botón de imprimir del ticket deberá abrir el diálogo de impresión del navegador.

### REQ-S12-027
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-007
- texto: Miembro deberá tener el correo opcional, de hasta 254 caracteres y guardado en minúsculas, y la marca correoConsentidoEn.

### REQ-S12-028
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-007
- texto: Si el correo no tiene la forma usuario@dominio.tld definida en SUP-S12-007 o supera 254 caracteres entonces crear o editar el miembro deberá rechazarlo con CorreoInvalidoError sin escribir nada.

### REQ-S12-029
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-007
- texto: Si se guarda un correo sin la aceptación de recibir el ticket por correo entonces crear o editar el miembro deberá rechazarlo con ConsentimientoCorreoRequeridoError sin escribir nada.

### REQ-S12-030
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-007
- texto: Al guardar un correo con la aceptación, el sistema deberá registrar en correoConsentidoEn la fecha y la hora de Lima del servidor.

### REQ-S12-031
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-007
- texto: Vaciar el correo de un miembro deberá poner en nulo correoConsentidoEn.

### REQ-S12-032
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-007
- texto: El PATCH de api/miembros/[id] deberá aceptar los campos correo y aceptaCorreo solo cuando el interruptor del correo está encendido.

### REQ-S12-033
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-005
- texto: Si el pago no tiene miembro, o el miembro no tiene correo, o no tiene correoConsentidoEn, o está eliminado, entonces enviarTicketPorCorreo deberá rechazar el envío con MiembroSinCorreoError sin llamar al puerto de correo.

### REQ-S12-034
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-006
- texto: El sistema deberá definir el puerto IEnviadorCorreo en packages/domain.

### REQ-S12-035
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-006
- texto: El adaptador SMTP de IEnviadorCorreo deberá implementarse con nodemailer en packages/infrastructure y cortar el envío a los 10 segundos.

### REQ-S12-036
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-006
- texto: El correo del ticket deberá ser de texto plano, sin adjuntos, con el contenido del ticket y su leyenda.

### REQ-S12-037
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-006
- texto: El asunto del correo deberá ser «Ticket de pago N.º 000123 — Adhara Fit», con el número del ticket y el nombre del negocio.

### REQ-S12-038
- tipo: cuando
- prioridad: MUST
- origen: SUP-S12-005
- texto: Cuando un administrador pide enviar el ticket por correo, enviarTicketPorCorreo deberá enviarlo fuera de la transacción de cualquier cobro.

### REQ-S12-039
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si ya hay un envío en curso del mismo ticket entonces enviarTicketPorCorreo deberá rechazar el segundo pedido con EnvioEnCursoError sin llamar al puerto de correo.

### REQ-S12-040
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada intento de envío deberá registrarse en EnvioTicket con el ticket, el destino, el estado ENVIADO o FALLIDO y la fecha y la hora de Lima.

### REQ-S12-041
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El registro de un intento FALLIDO deberá guardar el mensaje de error recortado a 200 caracteres.

### REQ-S12-042
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-005
- texto: Si el puerto de correo falla entonces enviarTicketPorCorreo deberá registrar el intento como FALLIDO y devolver CorreoNoEnviadoError.

### REQ-S12-043
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-005
- texto: El fallo de un envío no deberá modificar el pago ni el ticket.

### REQ-S12-044
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las credenciales SMTP deberán leerse solo de variables de entorno.

### REQ-S12-045
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las credenciales SMTP no deberán imprimirse, registrarse ni incluirse en ninguna respuesta ni en el registro de envíos.

### REQ-S12-046
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: La base de datos deberá tener la tabla ComprobantePago con una fila como máximo por pago y los campos tipo, serie, número, RUC, razón social, fecha de registro y administrador que lo registró.

### REQ-S12-047
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: ComprobantePago deberá tener una restricción única sobre el tipo, la serie y el número.

### REQ-S12-048
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-008
- texto: Si el tipo, la serie o el número no cumplen la forma del tipo definida en SUP-S12-008 entonces registrarComprobante deberá rechazarlo con ComprobanteInvalidoError sin escribir nada.

### REQ-S12-049
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-008
- texto: Si el tipo es FACTURA y el RUC no cumple el prefijo, los 11 dígitos y el dígito verificador definidos en SUP-S12-008, o la razón social no tiene de 2 a 120 caracteres, entonces registrarComprobante deberá rechazarlo con ComprobanteInvalidoError sin escribir nada.

### REQ-S12-050
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-008
- texto: Si el tipo no es FACTURA entonces registrarComprobante deberá rechazar un RUC o una razón social enviados con ComprobanteInvalidoError sin escribir nada.

### REQ-S12-051
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-008
- texto: Si el pago ya tiene un comprobante o la combinación de tipo, serie y número ya existe entonces registrarComprobante deberá rechazarlo con ComprobanteDuplicadoError sin escribir nada.

### REQ-S12-052
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos registros simultáneos usan el mismo pago, o la misma combinación de tipo, serie y número, entonces el que pierde la restricción única deberá devolver ComprobanteDuplicadoError y no el error crudo del motor.

### REQ-S12-053
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-009
- texto: Si el pago está anulado o no existe entonces registrarComprobante deberá rechazarlo con PagoAnuladoError o PagoNoEncontradoError sin escribir nada.

### REQ-S12-054
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-009
- texto: El detalle de un pago con comprobante cuyo pago se anuló después deberá mostrar el comprobante con la marca «pago anulado».

### REQ-S12-055
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-012
- texto: El formulario de comprobante deberá pedir solo el tipo, la serie, el número y, si es factura, el RUC y la razón social.

### REQ-S12-056
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: El sistema no deberá emitir comprobantes ni comunicarse con SUNAT, un OSE o un facturador.

### REQ-S12-057
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las rutas, acciones y pantallas de tickets, correo y comprobantes deberán exigir una sesión válida de un administrador activo.

### REQ-S12-058
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: Los repositorios de TicketPago, EnvioTicket y ComprobantePago deberán implementarse con Drizzle en packages/infrastructure/persistence/drizzle/ y tener cada uno su suite de contrato.

### REQ-S12-059
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos IEmisorComprobantes, enviarTicketAutomatico, emitirComprobante ni sunat.gob.pe.

### REQ-S12-060
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-ticket.mjs encuentra alguno de los términos de REQ-S12-059, deberá terminar con código distinto de cero.

### REQ-S12-061
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-ticket.mjs encuentra alguno de los términos de REQ-S12-059, deberá nombrar archivo, línea y término.

### REQ-S12-062
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-ticket.mjs en cada pull request.

## 2. Comportamiento

### BEH-S12-001
- cubre: REQ-S12-001, REQ-S12-008
- categoria: feliz
- dado: una base recién migrada y sembrada y el sistema recién arrancado
- cuando: se leen los tres interruptores y se recorren el menú, las rutas del panel y las respuestas de la API de pagos y de miembros
- entonces: los tres valen falso, no existe ninguna pantalla, botón, campo ni dato de ticket, correo de miembro ni comprobante, y las rutas de ticket responden 404

### BEH-S12-002
- cubre: REQ-S12-002, REQ-S12-003, REQ-S12-004
- categoria: error
- dado: un administrador en la pestaña «Tickets y comprobantes», sin variables SMTP
- cuando: intenta encender ticketCorreoActivo, y luego enciende ticketImpresionActiva y comprobantesRegistroActivo
- entonces: el primero se rechaza con CorreoNoConfiguradoError sin escribir; los otros dos se encienden; la pestaña muestra el aviso «Valida con tu contador antes de encender»

### BEH-S12-003
- cubre: REQ-S12-005, REQ-S12-006, REQ-S12-007
- categoria: error
- dado: cada interruptor apagado
- cuando: se piden la ruta imprimible del ticket, la acción de enviar por correo y la de registrar comprobante
- entonces: la ruta responde 404 y las dos acciones lanzan InterruptorApagadoError sin escribir nada

### BEH-S12-004
- cubre: REQ-S12-009
- categoria: borde
- dado: los tres interruptores encendidos, un ticket, un envío, un correo de miembro con consentimiento y un comprobante guardados
- cuando: se apagan los tres
- entonces: las filas guardadas no cambian, no se muestran en ninguna pantalla ni respuesta, y al encenderlos de nuevo reaparecen iguales

### BEH-S12-005
- cubre: REQ-S12-010, REQ-S12-011, REQ-S12-012, REQ-S12-015
- categoria: feliz
- dado: un pago de membresía de «120.00» no anulado y otro anulado
- cuando: se pide el ticket del primero, se cambia el nombre del miembro y se pide otra vez, y se pide el del anulado y el de un identificador inexistente
- entonces: el primero devuelve el mismo número y la misma copia congelada (con el nombre anterior), existe una sola fila, y los otros dos lanzan PagoAnuladoError y PagoNoEncontradoError sin crear fila

### BEH-S12-006
- cubre: REQ-S12-013
- categoria: concurrencia
- dado: un pago sin ticket y dos pedidos simultáneos detenidos con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: se crea una sola fila y ambos pedidos devuelven el mismo número

### BEH-S12-007
- cubre: REQ-S12-014
- categoria: concurrencia
- dado: un pago no anulado y, con una barrera, la anulación de ese pago y el pedido de su ticket y de su comprobante simultáneos
- cuando: se liberan a la vez en cada orden
- entonces: si el ticket o el comprobante toma primero el bloqueo, se crea y la anulación espera; si la anulación gana, el ticket y el comprobante lanzan PagoAnuladoError; en ningún orden queda un ticket o comprobante de un pago anulado sin la marca «pago anulado»

### BEH-S12-008
- cubre: REQ-S12-016, REQ-S12-017, REQ-S12-018, REQ-S12-019, REQ-S12-022, REQ-S12-023
- categoria: feliz
- dado: la membresía de «María» cobrada con Yape, operación «55123», el 2026-11-12 a las 3:30 p. m. de Lima, que es su cobro más reciente y deja el vencimiento en el 2026-12-12
- cuando: se arma el ticket N.º 123
- entonces: el texto es exactamente «Adhara Fit», «12/11/2026 3:30 p. m.», «N.º 000123», «Membresía», «María», el plan «1 mes» con «Vence 12/12/2026», «S/ 120.00», «Yape», «Operación 55123», el nombre del administrador y «Documento no fiscal, sin validez tributaria»

### BEH-S12-009
- cubre: REQ-S12-020
- categoria: borde
- dado: dos cobros de María, el más antiguo con ticket pedido después de registrar el segundo
- cuando: se pide el ticket del más antiguo
- entonces: muestra el concepto, el nombre de María, el monto y el método, y no muestra plan ni vencimiento

### BEH-S12-010
- cubre: REQ-S12-016, REQ-S12-017, REQ-S12-021, REQ-S12-022
- categoria: feliz
- dado: una venta de 1 «Agua 600 ml» y otra de 3, en efectivo
- cuando: se arma el ticket de cada una
- entonces: traen «Agua 600 ml × 1» y «Agua 600 ml × 3», «S/ 2.50» y «S/ 7.50», sin nombre de miembro, y la leyenda

### BEH-S12-011
- cubre: REQ-S12-024, REQ-S12-025, REQ-S12-026
- categoria: feliz
- dado: el ticket abierto con ticketImpresionActiva encendido
- cuando: el administrador pulsa «Imprimir»
- entonces: se abre el diálogo de impresión del navegador y la vista impresa mide 80 mm de ancho sin menús ni elementos del panel

### BEH-S12-012
- cubre: REQ-S12-027, REQ-S12-028
- categoria: borde
- dado: el interruptor del correo encendido y correos «Socia@Ejemplo.PE», «sin-arroba», uno de 254 caracteres y otro de 255
- cuando: se edita un miembro con cada correo, con la aceptación marcada
- entonces: «Socia@Ejemplo.PE» se guarda como «socia@ejemplo.pe» y el de 254 caracteres se acepta; «sin-arroba» y el de 255 caracteres lanzan CorreoInvalidoError sin escribir

### BEH-S12-013
- cubre: REQ-S12-029, REQ-S12-030, REQ-S12-031
- categoria: error
- dado: un miembro con correo y correoConsentidoEn
- cuando: se cambia el correo sin marcar la aceptación, se cambia con la aceptación y se vacía
- entonces: el primero lanza ConsentimientoCorreoRequeridoError sin escribir; el segundo guarda el correo nuevo con correoConsentidoEn en la hora de Lima actual; el tercero deja correo y correoConsentidoEn en nulo

### BEH-S12-014
- cubre: REQ-S12-032
- categoria: borde
- dado: el PATCH de api/miembros/[id] con el cuerpo {correo, aceptaCorreo} y el interruptor del correo apagado y encendido
- cuando: se envía en cada estado
- entonces: apagado responde 400 por campo no permitido sin escribir; encendido lo acepta

### BEH-S12-015
- cubre: REQ-S12-033
- categoria: error
- dado: un pago de venta (sin miembro), un miembro sin correo, otro con correo sin consentimiento y otro eliminado con correo y consentimiento
- cuando: se intenta enviar el ticket de cada uno
- entonces: los cuatro lanzan MiembroSinCorreoError y el puerto de correo no se llama

### BEH-S12-016
- cubre: REQ-S12-034, REQ-S12-035, REQ-S12-036, REQ-S12-037, REQ-S12-038, REQ-S12-040
- categoria: feliz
- dado: el interruptor encendido, un miembro con correo y consentimiento y un puerto de correo simulado
- cuando: el administrador pulsa «Enviar por correo» en el ticket N.º 000123 y luego se registra un cobro nuevo
- entonces: el puerto recibe un correo de texto plano sin adjuntos con el asunto «Ticket de pago N.º 000123 — Adhara Fit», el contenido del ticket y la leyenda, se registra un EnvioTicket ENVIADO con destino y fecha de Lima, y el cobro nuevo no envía ningún correo ni comparte su transacción con el envío

### BEH-S12-017
- cubre: REQ-S12-039
- categoria: concurrencia
- dado: dos pedidos simultáneos de envío del mismo ticket (doble clic), detenidos con una barrera
- cuando: se liberan a la vez
- entonces: el puerto recibe un solo correo, un pedido termina bien y el otro lanza EnvioEnCursoError, y hay un solo EnvioTicket

### BEH-S12-018
- cubre: REQ-S12-041, REQ-S12-042, REQ-S12-043, REQ-S12-045
- categoria: error
- dado: un puerto de correo que falla con un mensaje de 300 caracteres que contiene la clave SMTP, y otro que no responde en 10 segundos
- cuando: el administrador pulsa «Enviar por correo» en cada caso
- entonces: se registra un EnvioTicket FALLIDO con el mensaje recortado a 200 caracteres y sin la clave, se lanza CorreoNoEnviadoError, el pago y el ticket no cambian, y la clave no aparece en la respuesta ni en los registros; el segundo caso falla por tiempo a los 10 segundos

### BEH-S12-019
- cubre: REQ-S12-044
- categoria: feliz
- dado: el código del adaptador SMTP y del arranque
- cuando: se buscan las lecturas de SMTP_HOST, SMTP_PUERTO, SMTP_USUARIO, SMTP_CLAVE y CORREO_REMITENTE
- entonces: todas leen process.env y no hay valores escritos en el código

### BEH-S12-020
- cubre: REQ-S12-046, REQ-S12-047, REQ-S12-048
- categoria: feliz
- dado: el interruptor de comprobantes encendido y un pago de «120.00»
- cuando: se registra una BOLETA serie «B001» número 1
- entonces: se crea el comprobante con el administrador y la fecha de registro, y el detalle del pago lo muestra

### BEH-S12-021
- cubre: REQ-S12-048
- categoria: borde
- dado: series «B001», «b001», «B01», «F001» para una boleta, «T9Z1» para un ticket interno, y números 0, 1, 99999999 y 100000000
- cuando: se intenta registrar cada combinación
- entonces: se aceptan «B001», «T9Z1», el número 1 y el 99999999; se rechazan «b001», «B01», «F001» para una boleta y los números 0 y 100000000 con ComprobanteInvalidoError

### BEH-S12-022
- cubre: REQ-S12-049, REQ-S12-050
- categoria: error
- dado: facturas con RUC «20123456786», «20123456787» (dígito verificador incorrecto), «30123456781» (prefijo inválido con dígito correcto), «2012345678», razón social de 1 y de 121 caracteres, y una boleta con RUC
- cuando: se intenta registrar cada una
- entonces: solo la factura con «20123456786» y una razón social de 2 a 120 caracteres se acepta; el resto se rechaza con ComprobanteInvalidoError sin escribir

### BEH-S12-023
- cubre: REQ-S12-051
- categoria: error
- dado: un pago con comprobante «B001-1» y otro pago sin comprobante
- cuando: se registra otro comprobante para el primer pago y «B001-1» para el segundo
- entonces: ambos se rechazan con ComprobanteDuplicadoError sin escribir

### BEH-S12-024
- cubre: REQ-S12-052
- categoria: concurrencia
- dado: dos registros simultáneos de «B001-2» para dos pagos distintos, y dos registros simultáneos para un mismo pago con números distintos, detenidos con una barrera
- cuando: se liberan a la vez
- entonces: en cada caso se crea un solo comprobante y el otro devuelve ComprobanteDuplicadoError y no el error crudo

### BEH-S12-025
- cubre: REQ-S12-053, REQ-S12-054
- categoria: borde
- dado: un pago anulado sin comprobante, un identificador inexistente y un pago con comprobante que luego se anula
- cuando: se registra un comprobante para los dos primeros y se abre el detalle del tercero
- entonces: los dos primeros lanzan PagoAnuladoError y PagoNoEncontradoError, y el detalle del tercero muestra el comprobante con la marca «pago anulado»

### BEH-S12-026
- cubre: REQ-S12-055
- categoria: feliz
- dado: el formulario de comprobante con el tipo BOLETA y con el tipo FACTURA
- cuando: se abre cada uno
- entonces: la boleta pide tipo, serie y número; la factura pide además RUC y razón social; ninguno pide otros datos

### BEH-S12-027
- cubre: REQ-S12-056, REQ-S12-057
- categoria: error
- dado: peticiones sin sesión, con sesión vencida y de un administrador desactivado
- cuando: llegan a las rutas y acciones de ticket, correo y comprobante con los interruptores encendidos
- entonces: todas se rechazan antes de leer o escribir

### BEH-S12-028
- cubre: REQ-S12-058
- categoria: feliz
- dado: los repositorios de TicketPago, EnvioTicket y ComprobantePago
- cuando: se ejecuta su suite de contrato contra una base efímera
- entonces: cada repositorio crea y lee una fila, y las restricciones únicas se hacen cumplir

### BEH-S12-029
- cubre: REQ-S12-059, REQ-S12-060, REQ-S12-061
- categoria: error
- dado: un archivo por cada uno de los cuatro términos de REQ-S12-059
- cuando: se ejecuta tools/verificar-ticket.mjs
- entonces: termina con código distinto de cero y nombra archivo, línea y término de cada uno

### BEH-S12-030
- cubre: REQ-S12-062
- categoria: error
- dado: un pull request que agrega enviarTicketAutomatico en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-ticket.mjs falla y queda en rojo

## 3. Invariantes

### INV-S12-001
- propiedad: con los tres interruptores apagados nada de tickets, correos de miembro o comprobantes es visible
- mecanismo: test-propiedad
- deteccion: sobre 20 estados de la base generados con un generador congruencial lineal de semilla fija (con y sin datos de ticket, correo y comprobante), cada ruta del panel y cada respuesta de la API con los interruptores apagados no contiene ningún campo de ticket, correo ni comprobante y las rutas de ticket responden 404
- protege: REQ-S12-005, REQ-S12-006, REQ-S12-007, REQ-S12-008

### INV-S12-002
- propiedad: cada pago tiene como máximo un ticket y un comprobante, y el número del ticket es único
- mecanismo: restriccion-bd
- deteccion: restricciones únicas sobre TicketPago.pagoId, TicketPago.numero, ComprobantePago.pagoId y sobre el tipo, la serie y el número del comprobante; una inserción duplicada falla
- protege: REQ-S12-010, REQ-S12-013, REQ-S12-046, REQ-S12-047, REQ-S12-052

### INV-S12-003
- propiedad: nunca se envía un correo cuando no hay miembro, correo, consentimiento o el miembro está eliminado
- mecanismo: asercion-dominio
- deteccion: enviarTicketPorCorreo comprueba las cuatro condiciones antes de llamar al puerto, y una prueba con un puerto simulado que cuenta llamadas verifica 0 llamadas en los casos de BEH-S12-015
- protege: REQ-S12-033

### INV-S12-004
- propiedad: los términos prohibidos no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-ticket.mjs termina con código distinto de cero y lista archivo:línea y término
- protege: REQ-S12-056, REQ-S12-059, REQ-S12-060, REQ-S12-061

### INV-S12-005
- propiedad: todo ticket generado lleva la leyenda de documento no fiscal
- mecanismo: test-propiedad
- deteccion: sobre 50 pagos generados con semilla fija (membresías, cambios de plan y ventas, con y sin número de operación), el texto de cada ticket y de cada correo contiene la leyenda
- protege: REQ-S12-017, REQ-S12-036

## 4. Criterios de aceptación

### AC-S12-001
- enlaza: REQ-S12-001, REQ-S12-005, REQ-S12-006, REQ-S12-007, REQ-S12-008, BEH-S12-001, BEH-S12-003, INV-S12-001
- metodo: integracion
- procedimiento: con una base efímera migrada y sembrada, leer los interruptores, pedir las rutas de ticket y llamar a las acciones de enviar por correo y de registrar comprobante con los tres interruptores apagados, y repetir la lectura de las rutas y las respuestas de la API sobre 20 estados con semilla fija
- esperado: los tres valen falso, las rutas responden 404, las acciones lanzan InterruptorApagadoError sin escribir y ninguna respuesta contiene campos de ticket, correo ni comprobante
- test: pendiente

### AC-S12-002
- enlaza: REQ-S12-002, REQ-S12-003, REQ-S12-004, BEH-S12-002
- metodo: integracion
- procedimiento: sin variables SMTP, ejecutar la acción de encender cada interruptor, y leer los textos de la pestaña «Tickets y comprobantes»
- esperado: el interruptor del correo se rechaza con CorreoNoConfiguradoError sin escribir, los otros dos se encienden y el aviso aparece
- test: pendiente

### AC-S12-003
- enlaza: REQ-S12-009, BEH-S12-004
- metodo: integracion
- procedimiento: con los tres interruptores encendidos y datos guardados, apagarlos, leer las filas y las respuestas, y encenderlos de nuevo
- esperado: las filas no cambian, no hay datos visibles apagados y reaparecen iguales al encender
- test: pendiente

### AC-S12-004
- enlaza: REQ-S12-010, REQ-S12-011, REQ-S12-012, REQ-S12-013, REQ-S12-015, BEH-S12-005, BEH-S12-006, INV-S12-002
- metodo: integracion
- procedimiento: pedir el ticket de un pago, cambiar el nombre del miembro y pedirlo otra vez, pedir el de un pago anulado y el de un identificador inexistente, y lanzar con Promise.all dos pedidos simultáneos del ticket de un pago sin ticket con una barrera
- esperado: el mismo número y la misma copia congelada, una sola fila, los rechazos sin crear fila, y en la carrera una sola fila con el mismo número en ambas respuestas
- test: pendiente

### AC-S12-005
- enlaza: REQ-S12-014, BEH-S12-007
- metodo: integracion
- procedimiento: con una barrera que fija quién toma primero el bloqueo, lanzar con Promise.all la anulación de un pago y el pedido de su ticket y de su comprobante, en cada orden
- esperado: el resultado es el de BEH-S12-007 en cada orden
- test: pendiente

### AC-S12-006
- enlaza: REQ-S12-016, REQ-S12-017, REQ-S12-018, REQ-S12-019, REQ-S12-020, REQ-S12-021, REQ-S12-022, REQ-S12-023, BEH-S12-008, BEH-S12-009, BEH-S12-010
- metodo: unitario
- procedimiento: armar con un reloj fijo de Lima los tickets de BEH-S12-008 a BEH-S12-010 y comparar con el texto literal de esos comportamientos
- esperado: cada texto coincide letra por letra, con la fecha «12/11/2026», la hora «3:30 p. m.», los montos con «S/», el plan y el vencimiento solo en el cobro más reciente, y «× 1» y «× 3» en las ventas
- test: pendiente

### AC-S12-007
- enlaza: REQ-S12-024, REQ-S12-025, REQ-S12-026, BEH-S12-011
- metodo: manual
- procedimiento: con el interruptor de impresión encendido, abrir el ticket de un pago, pulsar «Imprimir» y mirar la vista previa de impresión del navegador
- esperado: se abre el diálogo de impresión y la vista previa mide 80 mm de ancho sin menús ni elementos del panel
- test: pendiente

### AC-S12-008
- enlaza: REQ-S12-027, REQ-S12-028, REQ-S12-029, REQ-S12-030, REQ-S12-031, BEH-S12-012, BEH-S12-013
- metodo: integracion
- procedimiento: con el interruptor del correo encendido, editar un miembro con los cuatro correos de BEH-S12-012 con la aceptación, y con los cambios de BEH-S12-013
- esperado: se guardan en minúsculas solo los válidos con correoConsentidoEn en la hora de Lima, los inválidos lanzan CorreoInvalidoError, la falta de aceptación lanza ConsentimientoCorreoRequeridoError, y vaciar el correo deja ambos campos en nulo
- test: pendiente

### AC-S12-009
- enlaza: REQ-S12-032, BEH-S12-014
- metodo: integracion
- procedimiento: enviar el PATCH de api/miembros/[id] con {correo, aceptaCorreo} con el interruptor apagado y encendido
- esperado: apagado responde 400 sin escribir y encendido acepta
- test: pendiente

### AC-S12-010
- enlaza: REQ-S12-033, INV-S12-003, BEH-S12-015
- metodo: integracion
- procedimiento: llamar a enviarTicketPorCorreo para un pago de venta, un miembro sin correo, uno sin consentimiento y uno eliminado con un puerto simulado que cuenta llamadas
- esperado: los cuatro lanzan MiembroSinCorreoError y el puerto recibe 0 llamadas
- test: pendiente

### AC-S12-011
- enlaza: REQ-S12-034, REQ-S12-035, REQ-S12-036, REQ-S12-037, REQ-S12-038, REQ-S12-040, BEH-S12-016
- metodo: integracion
- procedimiento: con un servidor SMTP local simulado, enviar el ticket N.º 000123, registrar un cobro nuevo y leer el correo recibido y el EnvioTicket
- esperado: el correo es de texto plano sin adjuntos con el asunto y el contenido de BEH-S12-016, el EnvioTicket es ENVIADO con destino y fecha de Lima, y el cobro nuevo no envía nada
- test: pendiente

### AC-S12-012
- enlaza: REQ-S12-039, BEH-S12-017
- metodo: integracion
- procedimiento: lanzar con Promise.all dos pedidos de envío del mismo ticket con una barrera
- esperado: el puerto recibe un solo correo, un pedido termina bien, el otro lanza EnvioEnCursoError y hay un solo EnvioTicket
- test: pendiente

### AC-S12-013
- enlaza: REQ-S12-035, REQ-S12-041, REQ-S12-042, REQ-S12-043, REQ-S12-045, BEH-S12-018
- metodo: integracion
- procedimiento: con un puerto que falla con un mensaje de 300 caracteres que incluye la clave, y con un servidor SMTP simulado que no responde, enviar el ticket y buscar la clave en las respuestas y en los registros capturados
- esperado: el EnvioTicket es FALLIDO con el mensaje recortado a 200 caracteres y sin la clave, se lanza CorreoNoEnviadoError, el pago y el ticket no cambian, el segundo caso falla a los 10 segundos y la clave no aparece en ninguna parte
- test: pendiente

### AC-S12-014
- enlaza: REQ-S12-044, BEH-S12-019
- metodo: unitario
- procedimiento: buscar con la API de typescript las lecturas de SMTP_HOST, SMTP_PUERTO, SMTP_USUARIO, SMTP_CLAVE y CORREO_REMITENTE y los literales de texto asignados a esos nombres
- esperado: todas las lecturas son process.env y no hay literales
- test: pendiente

### AC-S12-015
- enlaza: REQ-S12-046, REQ-S12-047, REQ-S12-048, REQ-S12-049, REQ-S12-050, BEH-S12-020, BEH-S12-021, BEH-S12-022
- metodo: integracion
- procedimiento: registrar comprobantes con las combinaciones de serie, número, RUC y razón social de BEH-S12-020 a BEH-S12-022
- esperado: se aceptan y rechazan exactamente las que indican esos comportamientos, sin escribir en los rechazos
- test: pendiente

### AC-S12-016
- enlaza: REQ-S12-051, REQ-S12-052, REQ-S12-053, REQ-S12-054, BEH-S12-023, BEH-S12-024, BEH-S12-025, INV-S12-002
- metodo: integracion
- procedimiento: registrar un segundo comprobante para un pago y un comprobante repetido, lanzar con Promise.all los dos pares simultáneos de BEH-S12-024 con una barrera, registrar para un pago anulado y un inexistente, y abrir el detalle de un pago anulado después de tener comprobante
- esperado: los duplicados fallan con ComprobanteDuplicadoError, queda un solo comprobante en cada carrera, los otros dos casos lanzan sus errores y el detalle muestra la marca «pago anulado»
- test: pendiente

### AC-S12-017
- enlaza: REQ-S12-055, BEH-S12-026
- metodo: manual
- procedimiento: abrir el formulario de comprobante con el tipo BOLETA y con el tipo FACTURA y contar los campos
- esperado: la boleta pide tipo, serie y número; la factura suma RUC y razón social; no hay otros campos
- test: pendiente

### AC-S12-018
- enlaza: REQ-S12-056, REQ-S12-057, BEH-S12-027
- metodo: integracion
- procedimiento: enviar a las rutas y acciones de ticket, correo y comprobante peticiones sin sesión, con sesión vencida y de un administrador desactivado
- esperado: todas se rechazan antes de leer o escribir
- test: pendiente

### AC-S12-019
- enlaza: REQ-S12-058, BEH-S12-028
- metodo: integracion
- procedimiento: ejecutar la suite de contrato de los repositorios de TicketPago, EnvioTicket y ComprobantePago contra una base efímera
- esperado: cada uno crea y lee una fila y hace cumplir sus restricciones únicas
- test: pendiente

### AC-S12-020
- enlaza: REQ-S12-056, REQ-S12-059, REQ-S12-060, REQ-S12-061, BEH-S12-029, INV-S12-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-ticket.mjs con un árbol por cada uno de los cuatro términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los cuatro términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S12-021
- enlaza: REQ-S12-017, REQ-S12-036, INV-S12-005
- metodo: integracion
- procedimiento: generar 50 pagos con semilla fija y armar el ticket y el correo de cada uno
- esperado: todos los textos contienen la leyenda «Documento no fiscal, sin validez tributaria»
- test: pendiente

### AC-S12-022
- enlaza: REQ-S12-062, BEH-S12-030
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue enviarTicketAutomatico en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-ticket.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas en rojo de los interruptores, del ticket, del correo y del comprobante; (2) esquema aditivo: las tres columnas de `ConfiguracionNegocio`, `TicketPago`, `EnvioTicket`, `ComprobantePago`, los enums `TipoComprobante` y `EstadoEnvio` y `Miembro.correo` y `correoConsentidoEn`, todo apagado u opcional, con el seed de S-15 sin cambios; (3) repositorios con Drizzle y sus suites de contrato; (4) casos de uso y puertos con sus pruebas: `obtenerTicketDePago` (inserción con conflicto y lectura del pago con bloqueo compartido en `IUnidadDeTrabajo`), `registrarComprobante` y `enviarTicketPorCorreo` con un puerto simulado; (5) la dependencia `nodemailer` y su adaptador SMTP, con una prueba contra un servidor SMTP local simulado; (6) rutas, pantallas y acciones detrás de los interruptores (ticket imprimible, botón de imprimir, envío, formulario de comprobante, campo de correo en el formulario del miembro y en el `PATCH`, pestaña de `configuraciones/`), con la prueba de que todo falta cuando están apagados; (7) variables SMTP en `.env.example`, sin valores; (8) `tools/verificar-ticket.mjs` y su paso del CI.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la prueba, una base efímera y una barrera que fija el orden de las transacciones.
- **Dependencia nueva justificada:** `nodemailer` y `@types/nodemailer` (SUP-S12-006), con versión exacta fijada como las demás dependencias (S-01); se importa solo desde el adaptador de infraestructura y la ausencia de configuración no impide arrancar.
- AC-S12-007, AC-S12-017 y AC-S12-022 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador ni se verificó la ticketera real).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15) con las tablas, enums y columnas nuevas, y los interruptores quedan apagados por defecto.
- **Enmiendas que se registran al aprobar S-12:**
  - S-05: `ConfiguracionNegocio` suma las tres columnas de interruptores.
  - S-15: el baseline incluye `TicketPago`, `EnvioTicket`, `ComprobantePago`, los dos enums y las columnas nuevas de `Miembro`; el seed no cambia (los interruptores quedan apagados).
  - S-00: `.env.example` suma `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE` y `CORREO_REMITENTE`, sin valores; la lista de dependencias suma `nodemailer` y `@types/nodemailer`.
  - S-06 y S-09: `Miembro` suma `correo` y `correoConsentidoEn`; la lista de campos editables del `PATCH` de `api/miembros/[id]` suma `correo` y `aceptaCorreo` cuando el interruptor está encendido; un miembro eliminado no recibe correos.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 suman tres tablas; REQ-S22-002, BEH-S22-012 y AC-S22-001 suman dos enums (`TipoComprobante` y `EstadoEnvio`); REQ-S22-007 y AC-S22-003 suman tres repositorios y sus suites de contrato.
  - S-07: el cobro más reciente no anulado por `Pago.creadoEn` se reutiliza para decidir si el ticket muestra plan y vigencia.
  - `docs/06-modelo-datos-cambios.md`, `docs/datos-iniciales.md`, `COBERTURA-RF.md` (RF-39) y `BACKLOG-SPECS.md`: nota de que S-12 cubre el ticket y el registro de comprobantes, apagados, y dependencias reales.
- **Traspasos:** S-13 (texto legal del consentimiento y política de privacidad), S-14 (reporte por tipo de comprobante con el interruptor encendido) y S-17 (variables SMTP en el despliegue y entregabilidad del dominio).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Nadie ha validado con un contador o abogado que el ticket no fiscal cumpla las normas de comprobantes. Mitigación: la leyenda, los interruptores apagados y el aviso «Valida con tu contador antes de encender» (ADR-006).
- Guardar el correo de un miembro es un dato personal (Ley 29733). Mitigación: el campo no existe con el interruptor apagado, exige la aceptación expresa y su fecha, y el texto legal lo completa S-13.
- El correo puede caer en spam o fallar por la entregabilidad del dominio. Mitigación: texto plano, envío manual con reintento y registro de cada intento; el dominio lo trata S-17.
- El número correlativo puede tener saltos si una transacción se revierte, lo que un auditor podría leer como pérdida de tickets. Mitigación: es un ticket interno no fiscal; si se exigiera correlativo sin saltos, sería una spec nueva.
- La copia congelada se toma al pedir el ticket por primera vez, no al cobrar: si se pide mucho después, el vencimiento mostrado es el de ese momento (solo si el pago sigue siendo el cobro más reciente). Mitigación: SUP-S12-004 omite plan y vigencia cuando hay un cobro posterior.
- La validación de la forma del comprobante (series y RUC) no está contrastada con un contador. Mitigación: SUP-S12-008 y el interruptor apagado.
- Registrar un comprobante a mano duplica el trabajo de recepción (ADR-006). Mitigación: solo seis campos como máximo (SUP-S12-012).
- La ticketera real puede imprimir distinto de la vista previa. Mitigación: ancho configurable y prueba manual del propietario antes de encender.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿El ticket se envía por correo solo cuando un administrador lo pide (no automáticamente al cobrar)? Default: sí (SUP-S12-005).
- ¿Se usa `nodemailer` con cualquier servidor SMTP que configures por variables de entorno? Default: sí (SUP-S12-006).
- ¿El ticket se imprime en 80 mm? Default: sí (SUP-S12-011).
- ¿Las series de comprobante son B, F o T más tres caracteres? Default: sí (SUP-S12-008).
- ¿El número del ticket puede tener saltos? Default: sí (SUP-S12-002).
- ¿Un ticket guarda una copia congelada de lo que muestra? Default: sí (SUP-S12-002).
- ¿Los tres interruptores quedan apagados hasta que valides con tu contador? Default: sí (SUP-S12-001).

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de otras specs. El texto anterior se conserva; donde choca, rige esta sección.*
- Por la aprobación de S-13: guardar un correo con aceptación y `enviarTicketPorCorreo` rechazan con `ConsentimientoRevocadoError` a un miembro cuyo consentimiento está REVOCADO (REQ-S13-029); revocar el consentimiento pone en nulo `correoConsentidoEn`.
- Por la aprobación de S-14: el reporte por tipo de comprobante queda cumplido en `obtenerIngresosPorPeriodo` mientras `comprobantesRegistroActivo` esté encendido.
- Por la aprobación de S-19: el formateador único de fechas que usa el ticket está en `packages/design-system/formato/fechaHora.ts`.

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura, sin ejecutar `spec-lint`), 2026-11-12, sobre el primer borrador. Veredicto global: **REQUIERE CAMBIOS**. Resumen fiel:

> | # | Comprobación | Veredicto | Hallazgo principal |
> |---|---|---|---|
> | 1 | Cabecera y ADR | CUMPLE (observaciones) | ADR-022 sin REQ de origen; `depende_de` omitía S-07 y S-15 |
> | 2 | REQ | NO CUMPLE | REQ-002, 008, 016, 019, 021, 022, 025 y 043 compuestos; REQ-005/006 sin error nombrado; REQ-015 citaba funciones de `fechaLima` inexistentes; REQ-023 con tipo equivocado |
> | 3 | Cobertura | CUMPLE (observaciones) | BEH-011 no probaba el origen de las credenciales; sin carrera de «mismo pago»; sin INV de la leyenda |
> | 4 | AC | NO CUMPLE | AC-004 sin texto literal ni formato de fecha; AC-011 sin criterio de búsqueda; AC mixtos; RUC «30123456789» fallaba también el dígito |
> | 5 | Hechos | NO CUMPLE | citas de `VenderProducto.ts` erradas; omitía `HistorialSala.tsx:74` y la pantalla `configuraciones/`; el vínculo pago-plan sí era verificable (`Pago` no tiene `planId`) |
> | 6 | Vaguedad y dependencias | NO CUMPLE (menor) | `nodemailer` sin versión ni tipos; RUC, correo y «SMTP configurado» sin definición; el término `smtp.clave` no detectaba `SMTP_CLAVE` |
> | 7 | Escenarios | NO CUMPLE | ticket sin copia congelada (plan y nombre cambian); venta sin destinatario; plan y vigencia de un cambio de plan; qué fecha muestra; carrera contra la anulación; doble clic y tiempo del SMTP; cambiar o vaciar el correo con consentimiento; «× 1»; apagar un interruptor |

### Conciliación del autor
Los hallazgos se verificaron contra el Repo A y las specs (`VenderProducto.ts:89,99-104`, `schema.prisma:251-266,268-315`, `configuraciones/`, `HistorialSala.tsx:74`, S-02 REQ-S02-010/011, S-07 y S-09) y resultaron ciertos; ninguno se rechazó. La spec pasó de 43 REQ a 62, de 20 BEH a 30, de 4 INV a 5 y de 13 AC a 22.

| Fila | Corrección |
|---|---|
| 1 | `depende_de` suma S-07 y S-15; REQ-058 usa ADR-022 (repositorios Drizzle con suites de contrato) |
| 2 | REQ divididos (002/003, 016 a 026, 034 a 038, 040/041, 044/045, 059 a 061); `InterruptorApagadoError` en REQ-006/007; formateador único de S-02 y `formatearSoles` de S-03 (REQ-022/023); REQ-038 pasa a `cuando` |
| 3 | BEH-019 prueba el origen de las credenciales; BEH-024 suma la carrera de un mismo pago; INV-005 de la leyenda |
| 4 | BEH-008 fija el texto literal con `12/11/2026 3:30 p. m.`; RUC «30123456781» aísla el prefijo; AC-014 y AC-020 con criterio concreto; términos de la herramienta con `emitirComprobante` y `sunat.gob.pe`; AC mixtos partidos |
| 5 | 0.4 corregido (líneas, `HistorialSala`, `configuraciones/`, que `Pago` no tiene `planId`) |
| 6 | SUP-S12-006 fija el tipo de dependencia y define «SMTP configurado»; SUP-S12-007 define el patrón del correo; SUP-S12-008 el algoritmo del RUC y las series; SUP-S12-012 acota el «pegado rápido» |
| 7 | Copia congelada (SUP-S12-002, REQ-011/012); plan y vigencia solo en el cobro más reciente (SUP-S12-004, REQ-019/020, BEH-009); venta sin destinatario (REQ-033); tiempo del SMTP (REQ-035, BEH-018); doble clic (REQ-039, BEH-017); correo cambiado o vaciado (REQ-029 a 031, BEH-013); «× 1» (REQ-021); apagar un interruptor (REQ-009, BEH-004); carrera contra la anulación (REQ-014, BEH-007) |
