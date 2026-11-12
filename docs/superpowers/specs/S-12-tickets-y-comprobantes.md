---
id: S-12
estado: en-revision
adrs: ADR-006, ADR-011, ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-06, S-08, S-09, S-11, S-22, S-23
aprobada_por:
fecha_aprobacion:
---
# S-12 — Tickets de pago y registro de comprobantes, desarrollados y apagados

## 0. Contexto y alcance

### 0.1 Problema
ADR-006 (aceptado el 2026-11-12) decidió que el sistema desarrolla por completo, y entrega **apagados**, tres funciones: un **ticket de pago no fiscal** (por correo y para imprimir en una ticketera de 80 mm) y el **registro del comprobante tributario** (boleta, factura o ticket interno) que el gimnasio emite fuera del sistema. Hasta que el propietario las confirme con su contador, ninguna pantalla, API ni reporte debe exponer tickets ni datos de comprobante. El código heredado no tiene nada de esto: el miembro no tiene correo, no se envía ningún correo y solo existe un botón genérico de imprimir. S-12 crea los tres interruptores, el ticket, el envío por correo y el registro de comprobantes, y garantiza que con los interruptores apagados el sistema se comporta como si no existieran. No emite comprobantes ni se comunica con SUNAT.

### 0.2 Dentro de alcance
- Tres interruptores en `ConfiguracionNegocio` (`ticketCorreoActivo`, `ticketImpresionActiva`, `comprobantesRegistroActivo`), apagados por defecto, y su sección en la pantalla de configuración.
- Tabla `TicketPago` (un ticket por pago, con número correlativo interno) y el caso de uso que lo obtiene o crea.
- Ticket en HTML para ticketera de 80 mm, con la leyenda «Documento no fiscal, sin validez tributaria», y el botón de imprimir en el detalle del cobro.
- Correo del miembro (`Miembro.correo` y `Miembro.correoConsentidoEn`), puerto `IEnviadorCorreo`, adaptador SMTP con `nodemailer` y el envío manual del ticket por correo, con registro de cada intento (`EnvioTicket`).
- Tabla `ComprobantePago` (como máximo uno por pago) con tipo, serie, número y, si es factura, RUC y razón social, y su validación.
- Que con los interruptores apagados las rutas respondan 404 y ninguna respuesta de la API incluya datos de ticket ni de comprobante.
- `tools/verificar-ticket.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Emitir comprobantes electrónicos o hablar con SUNAT, un OSE o un facturador (ADR-006 §5, Fase 3): el puerto `IEmisorComprobantes` no se crea aquí.
- Impresión directa por comandos de ticketera: solo el diálogo de impresión del navegador.
- Envío automático del ticket al registrar cada pago: el envío es manual (SUP-S12-004).
- Texto legal del consentimiento de datos personales, política de privacidad y Libro de Reclamaciones: S-13; aquí solo se guarda la marca de que el miembro aceptó recibir su ticket por correo.
- Reportes por tipo de comprobante: S-14, y solo cuando el interruptor esté encendido (ADR-006).
- Validar con un contador o abogado que el ticket cumple las normas de comprobantes: lo hace el propietario antes de encender cualquier interruptor.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-12 recibirá después de S-00 a S-11, S-22 y S-23; se recontarán al empezar.
- **Impresión:** `apps/web-admin/app/(panel)/BotonImprimir.tsx` es un botón que llama a `window.print()` y solo lo usa `pagos/page.tsx`; `globals.css:76-80` define `@media print` con solo el fondo blanco (verificado con `Read` y `grep -rn BotonImprimir`).
- **Correo:** `Miembro` no tiene campo de correo ni de email (solo `celular`, `schema.prisma:155`); el único correo es `UsuarioAdmin.email` (`:85`); ningún `package.json` declara `nodemailer`, `sendgrid`, `resend` ni `smtp` (verificado con `grep -rn` sobre los `package.json`, sin `node_modules`).
- **Pantallas de pagos:** `pagos/` tiene `page.tsx` (historial), `nuevo/`, `FormularioPago.tsx` y `actions.ts`, y no tiene una página de detalle de un pago (verificado con `ls`).
- **Ventas sin miembro:** una venta de producto es un `Pago` con `miembroId` nulo y `productoNombre` y `cantidad` (`VenderProducto.ts:70-83`, `schema.prisma:299-305`); `conceptoPago.ts:5-10` calcula el texto «producto × cantidad» o el nombre del miembro (verificado con `Read`).
- **Columnas del pago para la vigencia:** la venta escribe `fechaInicioCiclo` y `fechaFinCiclo` en nulo (`VenderProducto.ts:91-92`), de modo que los pagos de membresía las usan para el ciclo; no se verificó cómo las deja S-04 ni cómo se enlaza el plan con el pago.
- **Decisiones previas:** ADR-006 §3 fija el contenido del ticket (negocio, fecha y hora de Lima, número correlativo interno, miembro, plan y vigencia, monto, método, número de operación y administrador), los interruptores `ticket.correo.activo`, `ticket.impresion.activa` y `comprobantes.registroActivo`, y deja la librería y el proveedor de correo a S-12 con su dependencia justificada; S-05 crea `ConfiguracionNegocio` de una sola fila; S-03 define `formatearSoles` y los métodos de pago; S-04 define el `cobroId`, la anulación y el cobro de un solo pago; S-11 define la venta de un producto; S-09 define el miembro eliminado (verificado con `Read` de los ADR y `grep -n` en las specs).
- No verificado: el comportamiento de `nodemailer` en la versión que se fije con servidores SMTP reales, y que la ticketera del propietario imprima bien un documento HTML de 80 mm.

### 0.5 Supuestos
- SUP-S12-001: los interruptores son tres columnas booleanas de `ConfiguracionNegocio`, apagadas por defecto; los enciende y apaga cualquier administrador desde la pantalla de configuración, con un aviso fijo «Valida con tu contador antes de encender». Default: esas columnas y ese aviso; asumido, por validar.
- SUP-S12-002: el ticket se obtiene por pago y es único: el primer pedido crea el `TicketPago` con un número correlativo interno generado por la base (columna de identidad) y los siguientes devuelven el mismo; el número puede tener saltos si una transacción se revierte. Default: ese correlativo con saltos posibles; asumido, por validar.
- SUP-S12-003: el ticket se muestra con el número en seis dígitos («N.º 000123»), la fecha y la hora de Lima en formato 12 horas, el concepto (el plan y la vigencia hasta la fecha que dejó el pago, o el producto y la cantidad en una venta), el monto con `formatearSoles`, el método, el número de operación si lo hay y el nombre del administrador que registró el pago. Default: ese contenido; asumido, por validar.
- SUP-S12-004: el ticket se envía por correo solo cuando un administrador pulsa «Enviar por correo» en el ticket; no se envía solo al registrar el pago, para que un fallo del correo nunca afecte un cobro. Default: envío manual; asumido, por validar.
- SUP-S12-005: el proveedor es cualquier servidor SMTP configurado por variables de entorno (`SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE` y `CORREO_REMITENTE`), con la librería `nodemailer`, que se justifica por no atar al gimnasio a un proveedor de pago y por ser la librería estándar de SMTP para Node; el correo es de texto plano, sin adjuntos. Default: `nodemailer` con SMTP; asumido, por validar.
- SUP-S12-006: el miembro tiene un correo opcional de hasta 254 caracteres, guardado en minúsculas, y una marca `correoConsentidoEn` que registra cuándo aceptó recibir su ticket por correo; sin la marca no se envía nada. El campo solo aparece en los formularios cuando el interruptor del correo está encendido. Default: ese diseño; asumido, por validar.
- SUP-S12-007: el comprobante registrado es de tipo `BOLETA` (serie `B` y tres caracteres), `FACTURA` (serie `F` y tres caracteres) o `TICKET_INTERNO` (serie `T` y tres caracteres), con número entero de 1 a 99 999 999 y único por tipo y serie; la factura exige un RUC de 11 dígitos con dígito verificador válido y prefijo 10, 15, 16, 17 o 20, y una razón social de 2 a 120 caracteres. Default: esas reglas, no validadas con un contador; asumido, por validar.
- SUP-S12-008: no se puede registrar un comprobante de un pago anulado; si se anula un pago que ya tiene comprobante, el comprobante se conserva y se muestra con la marca «pago anulado». Default: ese tratamiento; asumido, por validar.
- SUP-S12-009: con el interruptor del correo apagado el envío y los campos de correo no existen; para encenderlo debe haber un servidor SMTP configurado, y si no lo hay el interruptor no se enciende. Default: esa condición; asumido, por validar.
- SUP-S12-010: ancho de impresión de 80 mm; si el propietario usa 58 mm se ajusta con una variable de estilo. Default: 80 mm; asumido, por validar (ADR-006).

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
- texto: La pantalla de configuración deberá permitir encender y apagar cada interruptor y mostrar el aviso «Valida con tu contador antes de encender».

### REQ-S12-003
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-009
- texto: Si no hay un servidor SMTP configurado entonces encender ticketCorreoActivo deberá rechazarse con CorreoNoConfiguradoError sin escribir nada.

### REQ-S12-004
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si ticketImpresionActiva está apagado entonces la ruta del ticket imprimible deberá responder 404.

### REQ-S12-005
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si ticketCorreoActivo está apagado entonces la acción de enviar el ticket por correo deberá rechazar el pedido sin escribir nada.

### REQ-S12-006
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si comprobantesRegistroActivo está apagado entonces la acción de registrar comprobante deberá rechazar el pedido sin escribir nada.

### REQ-S12-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: Con los tres interruptores apagados el sistema no deberá mostrar ninguna pantalla, botón, campo ni dato de ticket, correo de miembro o comprobante, ni incluirlos en las respuestas de la API.

### REQ-S12-008
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-002
- texto: La base de datos deberá tener la tabla TicketPago con una fila como máximo por pago, un número correlativo generado por la base y único, y la fecha de creación.

### REQ-S12-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-002
- texto: obtenerTicketDePago deberá devolver el ticket existente del pago o crearlo si no existe, de modo que dos pedidos del mismo pago devuelvan el mismo número.

### REQ-S12-010
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos pedidos simultáneos del ticket de un mismo pago llegan a la vez entonces obtenerTicketDePago deberá crear una sola fila y devolver el mismo número a ambos.

### REQ-S12-011
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-008
- texto: Si el pago está anulado o no existe entonces obtenerTicketDePago deberá rechazarlo con PagoAnuladoError o PagoNoEncontradoError sin crear ningún ticket.

### REQ-S12-012
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-003
- texto: El ticket deberá contener el nombre del negocio, la fecha y la hora de Lima, el número correlativo de seis dígitos, el concepto, el monto, el método de pago, el número de operación si existe y el administrador que registró el pago.

### REQ-S12-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: Todo ticket deberá incluir la leyenda «Documento no fiscal, sin validez tributaria».

### REQ-S12-014
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-003
- texto: El ticket de una membresía deberá mostrar el nombre del miembro, el plan y la fecha de vencimiento que dejó el pago.

### REQ-S12-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El ticket deberá mostrar el monto con formatearSoles de S-03 y la fecha y la hora con las funciones de fechaLima de S-02.

### REQ-S12-016
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-010
- texto: La vista imprimible del ticket deberá tener un ancho de 80 mm, sin menús ni elementos del panel.

### REQ-S12-041
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-003
- texto: El ticket de una venta deberá mostrar el producto y la cantidad.

### REQ-S12-042
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-010
- texto: El botón de imprimir del ticket deberá abrir el diálogo de impresión del navegador.

### REQ-S12-043
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las credenciales SMTP no deberán imprimirse, registrarse ni incluirse en ninguna respuesta ni en el registro de envíos.

### REQ-S12-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-006
- texto: Miembro deberá tener el correo opcional, de hasta 254 caracteres y guardado en minúsculas, y la marca correoConsentidoEn.

### REQ-S12-018
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-006
- texto: Si el correo no tiene la forma usuario@dominio.tld o supera 254 caracteres entonces crear o editar el miembro deberá rechazarlo con CorreoInvalidoError sin escribir nada.

### REQ-S12-019
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-006
- texto: Guardar un correo del miembro deberá exigir marcar la aceptación de recibir el ticket por correo y registrar la fecha y la hora de Lima en correoConsentidoEn.

### REQ-S12-020
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-006
- texto: Si el miembro no tiene correo o no tiene correoConsentidoEn o está eliminado entonces enviarTicketPorCorreo deberá rechazar el envío con MiembroSinCorreoError sin llamar al puerto de correo.

### REQ-S12-021
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-005
- texto: El sistema deberá definir el puerto IEnviadorCorreo en packages/domain y su adaptador SMTP con nodemailer en packages/infrastructure.

### REQ-S12-022
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-005
- texto: El correo del ticket deberá ser de texto plano, con el asunto «Ticket de pago N.º 000123 — Adhara Fit» (con el número y el nombre del negocio), el contenido del ticket y su leyenda, y sin adjuntos.

### REQ-S12-023
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-004
- texto: El envío del ticket por correo deberá ocurrir solo cuando un administrador lo pida y nunca dentro de la transacción de un cobro.

### REQ-S12-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada intento de envío deberá registrarse en EnvioTicket con el ticket, el destino, el estado ENVIADO o FALLIDO, el mensaje de error recortado a 200 caracteres y la fecha y la hora de Lima.

### REQ-S12-025
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-004
- texto: Si el puerto de correo falla entonces enviarTicketPorCorreo deberá registrar el intento como FALLIDO y devolver CorreoNoEnviadoError sin modificar el pago ni el ticket.

### REQ-S12-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las credenciales SMTP deberán leerse solo de variables de entorno.

### REQ-S12-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: La base de datos deberá tener la tabla ComprobantePago con una fila como máximo por pago y los campos tipo, serie, número, RUC, razón social, fecha de registro y administrador que lo registró.

### REQ-S12-028
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-007
- texto: ComprobantePago deberá tener una restricción única sobre el tipo, la serie y el número.

### REQ-S12-029
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-007
- texto: Si el tipo, la serie o el número no cumplen la forma del tipo —BOLETA con serie B, FACTURA con serie F y TICKET_INTERNO con serie T más tres caracteres alfanuméricos en mayúsculas, y número de 1 a 99 999 999— entonces registrarComprobante deberá rechazarlo con ComprobanteInvalidoError sin escribir nada.

### REQ-S12-030
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-007
- texto: Si el tipo es FACTURA y el RUC no tiene 11 dígitos, prefijo 10, 15, 16, 17 o 20 y dígito verificador válido, o la razón social no tiene de 2 a 120 caracteres, entonces registrarComprobante deberá rechazarlo con ComprobanteInvalidoError sin escribir nada.

### REQ-S12-031
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-007
- texto: Si el tipo no es FACTURA entonces registrarComprobante deberá rechazar un RUC o una razón social enviados con ComprobanteInvalidoError sin escribir nada.

### REQ-S12-032
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-007
- texto: Si el pago ya tiene un comprobante o la combinación de tipo, serie y número ya existe entonces registrarComprobante deberá rechazarlo con ComprobanteDuplicadoError sin escribir nada.

### REQ-S12-033
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos registros simultáneos usan el mismo pago o la misma combinación de tipo, serie y número entonces el que pierde la restricción única deberá devolver ComprobanteDuplicadoError y no el error crudo del motor.

### REQ-S12-034
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S12-008
- texto: Si el pago está anulado o no existe entonces registrarComprobante deberá rechazarlo con PagoAnuladoError o PagoNoEncontradoError sin escribir nada.

### REQ-S12-035
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S12-008
- texto: El detalle de un pago con comprobante cuyo pago se anuló después deberá mostrar el comprobante con la marca «pago anulado».

### REQ-S12-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: El sistema no deberá emitir comprobantes ni comunicarse con SUNAT, un OSE o un facturador.

### REQ-S12-037
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las rutas, acciones y pantallas de tickets, correo y comprobantes deberán exigir una sesión válida de un administrador activo.

### REQ-S12-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos SUNAT.emitir, IEmisorComprobantes, enviarTicketAutomatico ni smtp.clave en claro.

### REQ-S12-039
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-ticket.mjs encuentra alguno de los términos de REQ-S12-038, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S12-040
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-ticket.mjs en cada pull request.

## 2. Comportamiento

### BEH-S12-001
- cubre: REQ-S12-001, REQ-S12-007
- categoria: feliz
- dado: una base recién migrada y sembrada y el sistema recién arrancado
- cuando: se leen los tres interruptores y se recorren el menú, las rutas del panel y las respuestas de la API de pagos y de miembros
- entonces: los tres valen falso, no existe ninguna pantalla, ruta ni dato de ticket, correo de miembro ni comprobante, y las rutas de ticket responden 404

### BEH-S12-002
- cubre: REQ-S12-002, REQ-S12-003
- categoria: error
- dado: un administrador en la configuración, sin variables SMTP
- cuando: intenta encender ticketCorreoActivo, y luego enciende ticketImpresionActiva y comprobantesRegistroActivo
- entonces: el primero se rechaza con CorreoNoConfiguradoError sin escribir; los otros dos se encienden; la pantalla muestra el aviso «Valida con tu contador antes de encender»

### BEH-S12-003
- cubre: REQ-S12-004, REQ-S12-005, REQ-S12-006
- categoria: error
- dado: cada interruptor apagado y las rutas y acciones de su función
- cuando: se piden la ruta imprimible del ticket, la acción de enviar por correo y la de registrar comprobante
- entonces: la ruta responde 404 y las acciones rechazan el pedido sin escribir nada

### BEH-S12-004
- cubre: REQ-S12-008, REQ-S12-009, REQ-S12-011
- categoria: feliz
- dado: un pago de membresía de «120.00» no anulado y otro anulado
- cuando: se pide el ticket del primero dos veces y el del anulado y el de un identificador inexistente
- entonces: el primero devuelve el mismo número las dos veces y existe una sola fila; los otros dos se rechazan con PagoAnuladoError y PagoNoEncontradoError sin crear fila

### BEH-S12-005
- cubre: REQ-S12-010
- categoria: concurrencia
- dado: un pago sin ticket y dos pedidos simultáneos detenidos con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: se crea una sola fila y ambos pedidos devuelven el mismo número

### BEH-S12-006
- cubre: REQ-S12-012, REQ-S12-013, REQ-S12-014, REQ-S12-015, REQ-S12-041
- categoria: feliz
- dado: una membresía de «María» en el plan «1 mes» pagada con Yape, operación «55123», que vence el 2026-12-12, y una venta de 3 «Agua 600 ml» en efectivo por «7.50»
- cuando: se arma cada ticket
- entonces: ambos traen «Adhara Fit», la fecha y la hora de Lima en 12 horas, el número en seis dígitos, la leyenda «Documento no fiscal, sin validez tributaria», el administrador, «S/ 120.00» con plan y vencimiento en el primero y «S/ 7.50» con «Agua 600 ml × 3» en el segundo

### BEH-S12-007
- cubre: REQ-S12-016, REQ-S12-042
- categoria: feliz
- dado: el ticket abierto con ticketImpresionActiva encendido
- cuando: el administrador pulsa «Imprimir»
- entonces: se abre el diálogo de impresión del navegador y la vista impresa mide 80 mm de ancho sin menús ni elementos del panel

### BEH-S12-008
- cubre: REQ-S12-017, REQ-S12-018, REQ-S12-019
- categoria: borde
- dado: el interruptor del correo encendido y correos «Socia@Ejemplo.PE», «sin-arroba», uno de 254 caracteres y otro de 255
- cuando: se edita un miembro con cada correo, con y sin marcar la aceptación
- entonces: «Socia@Ejemplo.PE» se guarda como «socia@ejemplo.pe» con correoConsentidoEn en la hora de Lima solo si se marcó la aceptación; «sin-arroba» y el de 255 caracteres se rechazan con CorreoInvalidoError y el de 254 se acepta; sin la aceptación no se guarda ningún correo

### BEH-S12-009
- cubre: REQ-S12-020
- categoria: error
- dado: un miembro sin correo, otro con correo sin consentimiento y otro eliminado con correo y consentimiento
- cuando: se intenta enviar el ticket de cada uno
- entonces: los tres se rechazan con MiembroSinCorreoError y el puerto de correo no se llama

### BEH-S12-010
- cubre: REQ-S12-021, REQ-S12-022, REQ-S12-023, REQ-S12-024
- categoria: feliz
- dado: el interruptor encendido, un miembro con correo y consentimiento y un puerto de correo simulado
- cuando: el administrador pulsa «Enviar por correo» en el ticket N.º 000123
- entonces: el puerto recibe un correo de texto plano con el asunto «Ticket de pago N.º 000123 — Adhara Fit», el contenido del ticket y la leyenda, sin adjuntos, se registra un EnvioTicket ENVIADO con la fecha de Lima, y registrar un cobro nuevo no envía ningún correo

### BEH-S12-011
- cubre: REQ-S12-025, REQ-S12-026, REQ-S12-043
- categoria: error
- dado: un puerto de correo que falla con un mensaje de 300 caracteres que contiene la clave SMTP
- cuando: el administrador pulsa «Enviar por correo»
- entonces: se registra un EnvioTicket FALLIDO con el mensaje recortado a 200 caracteres y sin la clave, se lanza CorreoNoEnviadoError, el pago y el ticket no cambian y la clave no aparece en la respuesta ni en los registros

### BEH-S12-012
- cubre: REQ-S12-027, REQ-S12-028, REQ-S12-029
- categoria: feliz
- dado: el interruptor de comprobantes encendido y un pago de «120.00»
- cuando: se registra una BOLETA serie «B001» número 1
- entonces: se crea el comprobante con el administrador y la fecha de registro, y el detalle del pago lo muestra

### BEH-S12-013
- cubre: REQ-S12-029
- categoria: borde
- dado: series «B001», «b001», «B01», «F001» para una boleta, «T9Z1» para un ticket interno, y números 0, 1, 99999999 y 100000000
- cuando: se intenta registrar cada combinación
- entonces: se aceptan «B001», «T9Z1», el número 1 y el 99999999; se rechazan «b001», «B01», «F001» para una boleta y los números 0 y 100000000 con ComprobanteInvalidoError

### BEH-S12-014
- cubre: REQ-S12-030, REQ-S12-031
- categoria: error
- dado: facturas con RUC «20123456786», «20123456787», «30123456789», «2012345678», razón social de 1 y de 121 caracteres, y una boleta con RUC
- cuando: se intenta registrar cada una
- entonces: solo la factura con «20123456786» y una razón social de 2 a 120 caracteres se acepta; el resto se rechaza con ComprobanteInvalidoError sin escribir

### BEH-S12-015
- cubre: REQ-S12-032
- categoria: error
- dado: un pago con comprobante «B001-1» y otro pago sin comprobante
- cuando: se registra otro comprobante para el primer pago y «B001-1» para el segundo
- entonces: ambos se rechazan con ComprobanteDuplicadoError sin escribir

### BEH-S12-016
- cubre: REQ-S12-033
- categoria: concurrencia
- dado: dos registros simultáneos de «B001-2» para dos pagos distintos, detenidos con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: se crea un solo comprobante y el otro devuelve ComprobanteDuplicadoError y no el error crudo

### BEH-S12-017
- cubre: REQ-S12-034, REQ-S12-035
- categoria: borde
- dado: un pago anulado sin comprobante, un identificador inexistente y un pago con comprobante que luego se anula
- cuando: se registra un comprobante para los dos primeros y se abre el detalle del tercero
- entonces: los dos primeros se rechazan con PagoAnuladoError y PagoNoEncontradoError, y el detalle del tercero muestra el comprobante con la marca «pago anulado»

### BEH-S12-018
- cubre: REQ-S12-036, REQ-S12-037
- categoria: error
- dado: peticiones sin sesión, con sesión vencida y de un administrador desactivado
- cuando: llegan a las rutas y acciones de ticket, correo y comprobante con los interruptores encendidos
- entonces: todas se rechazan antes de leer o escribir, y no existe ninguna función que emita comprobantes ni llame a SUNAT

### BEH-S12-019
- cubre: REQ-S12-038, REQ-S12-039
- categoria: error
- dado: un archivo por cada uno de los cuatro términos de REQ-S12-038
- cuando: se ejecuta tools/verificar-ticket.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S12-020
- cubre: REQ-S12-040
- categoria: error
- dado: un pull request que agrega enviarTicketAutomatico en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-ticket.mjs falla y queda en rojo

## 3. Invariantes

### INV-S12-001
- propiedad: con los tres interruptores apagados nada de tickets, correos de miembro o comprobantes es visible
- mecanismo: test-propiedad
- deteccion: sobre 20 estados de la base generados con un generador congruencial lineal de semilla fija (con y sin datos de ticket, correo y comprobante), cada ruta del panel y cada respuesta de la API con los interruptores apagados no contiene ningún campo de ticket, correo ni comprobante y las rutas de ticket responden 404
- protege: REQ-S12-004, REQ-S12-005, REQ-S12-006, REQ-S12-007

### INV-S12-002
- propiedad: cada pago tiene como máximo un ticket y un comprobante, y el número del ticket es único
- mecanismo: restriccion-bd
- deteccion: restricciones únicas sobre TicketPago.pagoId, TicketPago.numero, ComprobantePago.pagoId y sobre el tipo, la serie y el número del comprobante; una inserción duplicada falla
- protege: REQ-S12-008, REQ-S12-010, REQ-S12-027, REQ-S12-028, REQ-S12-033

### INV-S12-003
- propiedad: nunca se envía un correo a un miembro sin correo, sin consentimiento o eliminado
- mecanismo: asercion-dominio
- deteccion: enviarTicketPorCorreo comprueba las tres condiciones antes de llamar al puerto, y una prueba con un puerto simulado que cuenta llamadas verifica 0 llamadas en los casos de BEH-S12-009
- protege: REQ-S12-020

### INV-S12-004
- propiedad: los términos prohibidos no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-ticket.mjs termina con código distinto de cero y lista archivo:línea y término
- protege: REQ-S12-036, REQ-S12-038, REQ-S12-039

## 4. Criterios de aceptación

### AC-S12-001
- enlaza: REQ-S12-001, REQ-S12-004, REQ-S12-005, REQ-S12-006, REQ-S12-007, BEH-S12-001, BEH-S12-003, INV-S12-001
- metodo: integracion
- procedimiento: con una base efímera migrada y sembrada, leer los interruptores, pedir las rutas de ticket y llamar a las acciones de enviar por correo y de registrar comprobante con los tres interruptores apagados, y repetir la lectura de las rutas y las respuestas de la API sobre 20 estados con semilla fija
- esperado: los tres valen falso, las rutas responden 404, las acciones rechazan sin escribir y ninguna respuesta contiene campos de ticket, correo ni comprobante
- test: pendiente

### AC-S12-002
- enlaza: REQ-S12-002, REQ-S12-003, BEH-S12-002
- metodo: integracion
- procedimiento: sin variables SMTP, ejecutar la acción de encender cada interruptor, y leer el texto de la pantalla de configuración
- esperado: el interruptor del correo se rechaza con CorreoNoConfiguradoError sin escribir, los otros dos se encienden y el aviso aparece
- test: pendiente

### AC-S12-003
- enlaza: REQ-S12-008, REQ-S12-009, REQ-S12-010, REQ-S12-011, BEH-S12-004, BEH-S12-005, INV-S12-002
- metodo: integracion
- procedimiento: pedir dos veces el ticket de un pago, el de un pago anulado y el de un identificador inexistente, y lanzar con Promise.all dos pedidos simultáneos del ticket de un pago sin ticket con una barrera
- esperado: un solo número y una sola fila, los rechazos sin crear fila, y en la carrera una sola fila con el mismo número en ambas respuestas
- test: pendiente

### AC-S12-004
- enlaza: REQ-S12-012, REQ-S12-013, REQ-S12-014, REQ-S12-015, REQ-S12-041, BEH-S12-006
- metodo: unitario
- procedimiento: armar el ticket de la membresía y de la venta de BEH-S12-006 con una hora fija de Lima y comparar con el texto esperado
- esperado: el texto coincide, con la leyenda, el monto «S/ 120.00» o «S/ 7.50» y la fecha y la hora de Lima en 12 horas
- test: pendiente

### AC-S12-005
- enlaza: REQ-S12-016, REQ-S12-042, BEH-S12-007
- metodo: manual
- procedimiento: con el interruptor de impresión encendido, abrir el ticket de un pago, pulsar «Imprimir» y mirar la vista previa de impresión del navegador
- esperado: se abre el diálogo de impresión y la vista previa mide 80 mm de ancho sin menús ni elementos del panel
- test: pendiente

### AC-S12-006
- enlaza: REQ-S12-017, REQ-S12-018, REQ-S12-019, BEH-S12-008
- metodo: integracion
- procedimiento: con el interruptor del correo encendido, editar un miembro con los cinco correos de BEH-S12-008, con y sin la aceptación
- esperado: se guardan en minúsculas solo los válidos con aceptación, con correoConsentidoEn en la hora de Lima, y los inválidos lanzan CorreoInvalidoError sin escribir
- test: pendiente

### AC-S12-007
- enlaza: REQ-S12-020, INV-S12-003, BEH-S12-009
- metodo: integracion
- procedimiento: llamar a enviarTicketPorCorreo para un miembro sin correo, uno sin consentimiento y uno eliminado con un puerto simulado que cuenta llamadas
- esperado: los tres lanzan MiembroSinCorreoError y el puerto recibe 0 llamadas
- test: pendiente

### AC-S12-008
- enlaza: REQ-S12-021, REQ-S12-022, REQ-S12-023, REQ-S12-024, REQ-S12-025, REQ-S12-026, REQ-S12-043, BEH-S12-010, BEH-S12-011
- metodo: integracion
- procedimiento: con un puerto de correo simulado, enviar el ticket N.º 000123, registrar un cobro nuevo y enviar con un puerto que falla con un mensaje de 300 caracteres que incluye la clave, y buscar la clave en las respuestas y en los registros capturados
- esperado: el correo es de texto plano con el asunto y el contenido de BEH-S12-010, el cobro nuevo no envía nada, el fallo deja un EnvioTicket FALLIDO recortado y sin la clave, lanza CorreoNoEnviadoError y la clave no aparece en ninguna parte
- test: pendiente

### AC-S12-009
- enlaza: REQ-S12-027, REQ-S12-028, REQ-S12-029, REQ-S12-030, REQ-S12-031, BEH-S12-012, BEH-S12-013, BEH-S12-014
- metodo: integracion
- procedimiento: registrar comprobantes con las combinaciones de serie, número, RUC y razón social de BEH-S12-012 a BEH-S12-014
- esperado: se aceptan y rechazan exactamente las que indican esos comportamientos, sin escribir en los rechazos
- test: pendiente

### AC-S12-010
- enlaza: REQ-S12-032, REQ-S12-033, REQ-S12-034, REQ-S12-035, BEH-S12-015, BEH-S12-016, BEH-S12-017, INV-S12-002
- metodo: integracion
- procedimiento: registrar un segundo comprobante para un pago y un comprobante repetido, lanzar con Promise.all dos registros simultáneos de la misma combinación con una barrera, registrar para un pago anulado y un inexistente, y abrir el detalle de un pago anulado después de tener comprobante
- esperado: los duplicados fallan con ComprobanteDuplicadoError, queda un solo comprobante en la carrera, los otros dos casos lanzan sus errores y el detalle muestra la marca «pago anulado»
- test: pendiente

### AC-S12-011
- enlaza: REQ-S12-036, REQ-S12-037, BEH-S12-018
- metodo: integracion
- procedimiento: enviar a las rutas y acciones de ticket, correo y comprobante peticiones sin sesión, con sesión vencida y de un administrador desactivado; y buscar con la API de typescript funciones que emitan comprobantes o llamen a hosts de SUNAT
- esperado: todas se rechazan antes de leer o escribir y la búsqueda no encuentra nada
- test: pendiente

### AC-S12-012
- enlaza: REQ-S12-038, REQ-S12-039, BEH-S12-019, INV-S12-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-ticket.mjs con un árbol por cada uno de los cuatro términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los cuatro términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S12-013
- enlaza: REQ-S12-040, BEH-S12-020
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue enviarTicketAutomatico en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-ticket.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas en rojo de los interruptores, del ticket, del correo y del comprobante; (2) esquema aditivo: las tres columnas de `ConfiguracionNegocio`, `TicketPago`, `EnvioTicket`, `ComprobantePago`, `Miembro.correo` y `correoConsentidoEn`, todo apagado u opcional, con el seed de S-15 sin cambios; (3) casos de uso y puertos con sus pruebas: `obtenerTicketDePago`, `registrarComprobante`, `enviarTicketPorCorreo` con un puerto simulado; (4) la dependencia `nodemailer` y el adaptador SMTP, con una prueba contra un servidor SMTP local simulado; (5) rutas, pantallas y acciones detrás de los interruptores (ticket imprimible, botón de imprimir, envío, formulario de comprobante, campo de correo en el formulario del miembro, sección de la configuración), con la prueba de que todo falta cuando están apagados; (6) variables SMTP en `.env.example`, sin valores; (7) `tools/verificar-ticket.mjs` y su paso del CI.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la prueba, una base efímera y una barrera que fija el orden de las transacciones.
- **Dependencia nueva justificada:** `nodemailer` (SUP-S12-005), con versión exacta fijada como las demás dependencias (S-01); se importa solo desde el adaptador de infraestructura y su ausencia de configuración no impide arrancar.
- AC-S12-005 y AC-S12-013 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador ni se verificó la ticketera real).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15) con las tablas y columnas nuevas, y los interruptores quedan apagados por defecto.
- **Enmiendas que se registran al aprobar S-12:**
  - S-05: `ConfiguracionNegocio` suma las tres columnas de interruptores.
  - S-15: el baseline incluye `TicketPago`, `EnvioTicket`, `ComprobantePago` y las columnas nuevas de `Miembro`; el seed no cambia (los interruptores quedan apagados).
  - S-00: `.env.example` suma `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE` y `CORREO_REMITENTE`, sin valores; la lista de dependencias suma `nodemailer`.
  - S-06 y S-09: `Miembro` suma `correo` y `correoConsentidoEn`; un miembro eliminado no recibe correos.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 suman tres tablas (`TicketPago`, `EnvioTicket` y `ComprobantePago`) y la prueba de humo de repositorios suma los tres.
  - `docs/06-modelo-datos-cambios.md`, `docs/datos-iniciales.md`, `COBERTURA-RF.md` (RF-39) y `BACKLOG-SPECS.md`: nota de que S-12 cubre el ticket y el registro de comprobantes, apagados.
- **Traspasos:** S-13 (texto legal del consentimiento y política de privacidad), S-14 (reporte por tipo de comprobante con el interruptor encendido) y S-17 (variables SMTP en el despliegue y entregabilidad del dominio).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Nadie ha validado con un contador o abogado que el ticket no fiscal cumpla las normas de comprobantes. Mitigación: la leyenda, los interruptores apagados y el aviso «Valida con tu contador antes de encender» (ADR-006).
- Guardar el correo de un miembro es un dato personal (Ley 29733). Mitigación: el campo no existe con el interruptor apagado, exige la aceptación expresa y su fecha, y el texto legal lo completa S-13.
- El correo puede caer en spam o fallar por la entregabilidad del dominio. Mitigación: texto plano, envío manual con reintento y registro de cada intento; el dominio lo trata S-17.
- El número correlativo puede tener saltos si una transacción se revierte, lo que un auditor podría leer como pérdida de tickets. Mitigación: es un ticket interno no fiscal; si se exigiera correlativo sin saltos, sería una spec nueva.
- La validación de la forma del comprobante (series y RUC) no está contrastada con un contador. Mitigación: SUP-S12-007 y el interruptor apagado.
- Registrar un comprobante a mano duplica el trabajo de recepción (ADR-006). Mitigación: campos mínimos.
- La ticketera real puede imprimir distinto de la vista previa. Mitigación: ancho configurable y prueba manual del propietario antes de encender.
- No está verificado cómo S-04 enlaza el plan y la fecha de vencimiento con el pago. Mitigación: se lee al empezar el paso 3 y, si hace falta, se enmienda esta spec.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿El ticket se envía por correo solo cuando un administrador lo pide (no automáticamente al cobrar)? Default: sí (SUP-S12-004).
- ¿Se usa `nodemailer` con cualquier servidor SMTP que configures por variables de entorno? Default: sí (SUP-S12-005).
- ¿El ticket se imprime en 80 mm? Default: sí (SUP-S12-010).
- ¿Las series de comprobante son B, F o T más tres caracteres? Default: sí (SUP-S12-007).
- ¿El número del ticket puede tener saltos? Default: sí (SUP-S12-002).
- ¿Los tres interruptores quedan apagados hasta que valides con tu contador? Default: sí (SUP-S12-001).
