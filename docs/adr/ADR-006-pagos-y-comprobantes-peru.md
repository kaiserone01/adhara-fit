# ADR-006: Métodos de pago peruanos; registro de comprobantes previsto pero apagado

Estado: **propuesto** (2026-11-11) · Versión 2 (2026-11-12): ajustada a la instrucción del propietario «prever la incorporación pero no activar hasta confirmar habilitar la función»; espera su «acepto ADR-006» · P-07 sigue abierta

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
3. **Registro de comprobantes, previsto y apagado:** el diseño deja preparada una tabla propia `ComprobantePago` (uno por pago como máximo, con `tipoComprobante`, `serie`, `numero` y, si es factura, RUC y razón social) y un interruptor de configuración `comprobantes.registroActivo`, **apagado**. Mientras esté apagado no hay pantallas, campos ni reportes de comprobantes, y los pagos no cambian. El sistema **no emite** comprobantes ni habla con SUNAT. Se enciende solo cuando el propietario confirme habilitar la función (asumido, por validar).
4. **Fase 3:** puerto `IEmisorComprobantes` en `packages/domain` con adaptador a un OSE/proveedor; el proveedor se elige entonces.
5. Sin cobros recurrentes automáticos (reduce reclamos típicos de gimnasios).

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

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-03 (catálogo de métodos) y S-12 (comprobantes, propuesta, apagada por defecto). Ninguna spec cubre hoy el registro de comprobante ni el reporte por tipo (ver `REVISION-ADR.md` §7).
- **Invariantes a fijar:** el n.º de operación es obligatorio para todo método distinto de efectivo; con `comprobantes.registroActivo` apagado, ninguna pantalla, API ni reporte expone datos de comprobante.

## Reversibilidad
*(Pase formal F.)* Alta para el catálogo y el registro. La emisión llega en Fase 3 mediante el puerto `IEmisorComprobantes`.

## Dependencias
*(Pase formal F.)* ADR-003 (PEN y catálogo, solapados), ADR-011 (importes e IGV). Pendiente P-07. Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.
