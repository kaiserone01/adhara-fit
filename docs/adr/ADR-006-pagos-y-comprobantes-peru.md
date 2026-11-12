# ADR-006: Métodos de pago peruanos; ticket no fiscal (correo e impresión) y registro de comprobantes, desarrollados y apagados

Estado: **propuesto** (2026-11-11) · Versión 3 (2026-11-12): el propietario pidió prever los comprobantes sin activarlos y sumar un ticket digital por correo y un ticket impreso, ambos no fiscales, «desarrollar pero apagar»; espera su «acepto ADR-006» · P-07 sigue abierta

## Contexto
El base modela métodos venezolanos (pago móvil, BioPago, Punto Banesco, Zelle, Binance) y no tiene concepto de comprobante tributario. En Perú se usan efectivo, Yape, Plin, tarjetas (POS), transferencias/depósitos con CCI, y los comprobantes electrónicos (boleta/factura) se emiten por sistemas SUNAT (SEE-SOL, SEE-Facturador SUNAT, OSE o sistema propio). Las reglas de designación de emisores electrónicos cambiaron en 2026 (R.S. 000075-2026/SUNAT) **[VERIFICAR con contador]**.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- Métodos de pago usados en Perú (efectivo, billeteras digitales, tarjeta, transferencia, depósito).
- El régimen tributario y el emisor de comprobantes están sin definir (P-07).
- SUNAT queda fuera del alcance actual.
- Evitar doble digitación para recepción.

## Decisión
1. **Catálogo de métodos** nuevo: `EFECTIVO`, `BILLETERA_DIGITAL` (Yape/Plin), `TARJETA`, `TRANSFERENCIA`, `DEPOSITO`, configurable (banco, CCI, titular, teléfono, QR, logo).
2. N.º de operación obligatorio para todo método distinto de efectivo.
3. **Ticket no fiscal de pago**, con la leyenda «Documento no fiscal, sin validez tributaria». Contiene el nombre del negocio, la fecha y hora de Lima, un número correlativo interno, el nombre del miembro, el plan y su vigencia, el monto (`S/ 120.00`), el método de pago, el n.º de operación si lo hay y el administrador que registró el pago. Se ofrece por dos canales: (a) **correo electrónico** al miembro y (b) **impresión física** en una ticketera. Ambos canales se **desarrollan completos y quedan apagados** con los interruptores `ticket.correo.activo` y `ticket.impresion.activa`. Mientras estén apagados no hay botones, envíos ni impresiones.
   - Correo: exige un correo opcional del miembro (campo nuevo, con su consentimiento, S-13), un puerto `IEnviadorCorreo` y un adaptador a un servicio de envío; el proveedor y la librería son una decisión de S-12 con su dependencia nueva justificada. Hecho: el miembro del Repo A no tiene campo de correo y el Repo A no envía correos (verificado con `grep` de `nodemailer`, `smtp`, `sendgrid`, `resend` y `mailgun` sobre `apps` y `packages`).
   - Impresión: ticket en HTML con ancho de 80 mm impreso con el diálogo del navegador, como ya hace `BotonImprimir.tsx` (precedente verificado); la impresión directa por comandos de ticketera queda para después. Ancho de 58 o 80 mm por confirmar; default 80 mm (asumido, por validar).
4. **Registro de comprobantes tributarios, previsto y apagado:** el diseño deja preparada una tabla propia `ComprobantePago` (como máximo una por pago, con `tipoComprobante`, `serie`, `numero` y, si es factura, RUC y razón social) y el interruptor `comprobantes.registroActivo`, apagado. Sin pantallas ni reportes mientras esté apagado. El sistema **no emite** comprobantes ni habla con SUNAT; se enciende solo cuando el propietario lo confirme (asumido, por validar).
5. **Fase 3:** puerto `IEmisorComprobantes` en `packages/domain` con adaptador a un OSE/proveedor; el proveedor se elige entonces.
6. Sin cobros recurrentes automáticos (reduce reclamos típicos de gimnasios).

## Alternativas
| Alternativa | Contras |
|---|---|
| Emisión integrada desde el MVP | Alcance L-XL, depende del régimen tributario, proveedor y pruebas de homologación |
| Ignorar comprobantes | Incumplimiento y reconciliación manual imposible |
| **Registro manual (elegida)** | Doble digitación; riesgo de errores de transcripción |

## Consecuencias
- (+) Entrega rápida y cumple la necesidad de trazabilidad.
- (−) Doble trabajo para recepción hasta Fase 3 → mitigar con campos mínimos y pegado rápido.
- El desglose por tipo de comprobante en el reporte se difiere hasta que el interruptor se encienda.
- El ticket por correo suma datos personales (correo del miembro), un servicio de envío con credenciales y la entregabilidad del dominio (S-12 y S-13); no verificado con un abogado o contador que el ticket no fiscal cumpla las normas de comprobantes: validar antes de encender cualquier canal.

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-03 (catálogo de métodos) y S-12 (tickets y comprobantes, propuesta, apagados por defecto). Ninguna spec cubre hoy el registro de comprobante ni el reporte por tipo (ver `REVISION-ADR.md` §7).
- **Invariantes a fijar:** el n.º de operación es obligatorio para todo método distinto de efectivo; con los tres interruptores apagados (`ticket.correo.activo`, `ticket.impresion.activa` y `comprobantes.registroActivo`), ninguna pantalla, API ni reporte expone tickets ni datos de comprobante, y el ticket siempre lleva la leyenda de documento no fiscal.

## Reversibilidad
*(Pase formal F.)* Alta para el catálogo y el registro. La emisión llega en Fase 3 mediante el puerto `IEmisorComprobantes`.

## Dependencias
*(Pase formal F.)* ADR-003 (PEN y catálogo, solapados), ADR-011 (importes e IGV). Pendiente P-07. Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.
