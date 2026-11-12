# 05 — Adaptación a Perú

Versión 0.1 · 2026-11-11. Los puntos legales/tributarios están marcados **[VERIFICAR]**: reflejan fuentes públicas consultadas hoy y deben ser validados por el contador y/o abogado de Adhara Fit. Este documento no es asesoría legal ni tributaria.

## 1. Moneda

| Aspecto | Decisión |
|---|---|
| Código / símbolo | `PEN` / `S/` |
| Formato | `S/ 1,234.50` (`es-PE`: coma de miles, punto decimal) |
| Multi-moneda | No. Ver ADR-003 |
| Redondeo | Half-up a 2 decimales; en efectivo el cobro real puede redondearse a múltiplos de S/ 0.10 por falta de monedas de 1 y 5 céntimos — **[PREGUNTA P-09]** ¿se redondea el efectivo? |
| IGV | 18 % **[VERIFICAR]** sobre servicios gravados. Decidir si el precio de catálogo **incluye IGV** (lo habitual para consumidor final) y guardar `incluyeIGV` en configuración si se necesita desglose en reportes |

## 2. Zona horaria y calendario

- `America/Lima`, UTC-5 fijo.
- Reemplazar `packages/domain/utils/fechaCaracas.ts` por `fechaLima.ts` conservando la API (`diaCalendario…`, `inicioDelDia…`). El offset está codificado como `4 * 3_600_000` en dos sitios (líneas 18 y 57) y `medianocheCaracasDeFechaUtc` maneja un caso histórico UTC−4:30 que en Lima no existe: se elimina.
- **Tres capas a cambiar** (doc 09 §3.3): (1) `ENV TZ=America/Caracas` del `Dockerfile` → `America/Lima`; (2) el offset fijo; (3) getters locales y formateo (`setHours` 10 archivos, `getDate()` 18, `toLocale*` ≈26, `Intl.DateTimeFormat` 3, sufijo `T12:00:00` 4). Cambiar solo el `TZ` deja el offset fijo roto.
- 33 archivos de código/tests/scripts mencionan Caracas/Venezuela (inventario).
- **Idioma de formato:** `es-VE` está fijado en 21 archivos (34 ocurrencias; UI y kiosco). Pasa a `es-PE` en un único módulo de formato (doc 11, H-05).
- Eliminar los textos "hora de Caracas" de la UI.

## 3. Identificación de personas

| Tipo | Formato | Validación |
|---|---|---|
| DNI | 8 dígitos | Regex `^\d{8}$`. (El dígito verificador del DNI no es público de forma fiable: no validarlo) |
| Carné de extranjería (CE) | Alfanumérico, longitud variable | Configurable, 8-12 **[VERIFICAR]** |
| Pasaporte | Alfanumérico 6-12 | Mayúsculas, sin espacios |
| RUC (para facturas) | 11 dígitos | Regex y prefijo 10/15/17/20 **[VERIFICAR]** |

Modelo: `Miembro.tipoDocumento` (enum `DNI|CE|PASAPORTE`) + `Miembro.numeroDocumento`. Unicidad: `@@unique([organizacionId, numeroDocumento])` (ver ADR-004).

**Kiosco:** el numpad solo ingresa dígitos; para CE/Pasaporte alfanuméricos el miembro debe identificarse en recepción **o** se le asigna un **código de socio numérico** corto. **[SUPUESTO S-10]** El MVP asume que la mayoría usa DNI y que extranjeros se registran con un código numérico interno.

Celular: 9 dígitos que comienzan en 9, prefijo `+51` opcional.

## 4. Métodos de pago

Catálogo inicial (configurable desde el panel):

| Método | `TipoMetodoPago` propuesto | Pide N.º de operación | Notas |
|---|---|---|---|
| Efectivo | `EFECTIVO` | No | Alimenta fondo inicial y arqueo en efectivo |
| Yape | `BILLETERA_DIGITAL` | Sí (últimos dígitos / código) | Mostrar QR o número configurado |
| Plin | `BILLETERA_DIGITAL` | Sí | Idem |
| Tarjeta (POS) | `TARJETA` | Sí (voucher/lote) | Visa/Mastercard vía POS Niubiz/Izipay **[PREGUNTA]** ¿qué POS? |
| Transferencia bancaria | `TRANSFERENCIA` | Sí | Banco + cuenta + **CCI** (20 dígitos) |
| Depósito en cuenta | `DEPOSITO` | Sí | Idem |

Campos de configuración: `nombreBanco`, `numeroCuenta`, `cci`, `titular`, `telefono` (Yape/Plin), `qrUrl`, `logoUrl`. Se eliminan `PAGO_MOVIL`, `PUNTO_VENTA`, `BIOPAGO`, `CRIPTO`, `codigoBanco`, `rif`, `walletDireccion`, `walletUsuario`.

**Bancarización:** la normativa peruana exige medios de pago para ciertos montos; para un gimnasio con tickets bajos no aplica, pero conviene confirmar con el contador **[VERIFICAR]**.

## 5. Comprobantes de pago

**Qué sabemos (consultado 11-nov-2026):**
- Los comprobantes electrónicos (boleta de venta, factura, notas de crédito/débito) son la norma; SUNAT designa emisores electrónicos y ofrece sistemas gratuitos (SEE-SOL, SEE-Facturador SUNAT) además de OSE/sistema propio.
- La Resolución de Superintendencia N.º 000075-2026/SUNAT modificó las reglas de designación de emisores electrónicos; según la prensa especializada, rige desde el 1-jun-2026 y busca que los contribuyentes sean designados al inscribirse en el RUC. Quienes salen del Nuevo RUS deben emitir electrónicamente desde el mes siguiente. **[VERIFICAR]** el régimen tributario de Adhara Fit (Nuevo RUS, RER, MYPE, Régimen General).

**Decisión MVP (ADR-006):** el sistema **no emite** comprobantes. Registra por cada cobro: `tipoComprobante` (`BOLETA|FACTURA|TICKET_INTERNO|NINGUNO`), `serie`, `numero`, y para facturas `rucCliente` y `razonSocial`. El personal emite en SUNAT SOL/facturador y copia el número.

**Fase 3:** integrar un **OSE** o proveedor (API REST) desde un puerto `IEmisorComprobantes` en dominio. No elegir proveedor aún.

## 6. Protección de datos personales (Ley 29733)

Hechos verificados hoy:
- El **nuevo Reglamento** (D.S. N.º 016-2024-JUS) fue publicado el 30-nov-2024 y **entró en vigor el 30-mar-2025**, reemplazando al de 2013.
- Incorpora el **Oficial de Datos Personales**, con calendario escalonado y obligatoriedad para ciertos umbrales de ventas (reportado: > 2 300 UIT, desde nov-2025); un gimnasio pequeño probablemente no está obligado, pero sí a las demás obligaciones. **[VERIFICAR]**
- La autoridad aumentó fiscalizaciones en 2025 (reportes de prensa: 760 frente a 454).

**Consecuencias de diseño:**
1. **Consentimiento** informado y versionado en el alta (RF-15). Texto redactado por un abogado.
2. Gimnasio trata **fotos** (dato personal) y posiblemente **salud** (dato sensible) si se añade PAR-Q: evitar recopilar salud sin necesidad y base legal.
3. **Banco de datos personales:** evaluar inscripción ante la ANPD **[VERIFICAR]**.
4. **Derechos ARCO:** proceso para exportar/rectificar/eliminar un miembro. El repo base tiene "Quitar del sistema" (borrado físico) y baja lógica; documentar el procedimiento y la retención de pagos (obligación tributaria).
5. **Seguridad e incidentes:** registro de accesos, backups cifrados, procedimiento de notificación de brechas.
6. **Transferencia internacional:** R2/S3/hosting fuera del Perú ⇒ documentarlo en la política de privacidad.
7. **Retención:** definir plazos (p. ej. pagos 5 años por tributario **[VERIFICAR]**; check-ins 12 meses; miembros inactivos).

## 7. Libro de Reclamaciones (Ley 29571, DS 011-2011-PCM)

- Obligatorio para todo establecimiento abierto al público, en formato físico o virtual; los gimnasios están incluidos.
- El Indecopi ofrece la herramienta gratuita **"Tu Libro de Reclamaciones"**. Si hay web con venta de servicios, se exige el virtual y se publicó (jul-2026) un proyecto de la PCM para modificar el reglamento, por lo que conviene revisar el texto final **[VERIFICAR]**.
- Requisito de producto: **aviso visible** (Anexo III) en el local. El sistema es interno y sin web pública, así que no necesita enlace web mientras Adhara no publique un sitio comercial (si lo hace, sí corresponde el virtual). **No** exigir aceptar políticas de privacidad para reclamar.

## 8. Regla comercial típica de gimnasios en Perú

La práctica de reclamos frecuentes en gimnasios incluye: cobros recurrentes tras cancelar, congelamientos, cláusulas de exoneración de responsabilidad y cesión de membresía. Implicaciones: (1) **sin cobro automático** en el MVP; (2) política de congelamiento escrita (RF-26, Release 2); (3) contrato/términos claros revisados por abogado.

## 9. Localización de la UI

- Español neutro-peruano ("recepción", "boleta", "S/", "DNI", "Yape").
- Fechas `dd/mm/aaaa`.
- Quitar: "cédula", "RIF", "Bs", "BCV", "tasa", "pago móvil", "sede principal" (si se oculta la sede).
- Feriados nacionales: no afectan el cálculo del ciclo; fuera de alcance.

## 10. Fuentes consultadas (11-nov-2026)

- CMS Grau, *Aprueban Nuevo Reglamento de la Ley de Protección de Datos Personales* — https://cms.law/en/per/publication/aprueban-nuevo-reglamento-de-la-ley-de-proteccion-de-datos-personales
- CMS Grau, *Nuevo Reglamento* (sept-2025) — https://cms.law/en/per/publication/nuevo-reglamento-de-proteccion-de-datos-personales
- LexLatin, *Perú reforma su régimen de protección de datos personales* — https://lexlatin.com/reportajes/proteccion-datos-personales-peru-empresas-oficial-cumplimiento-reforma
- SUNAT, *Obligados a emitir CPE* — https://cpe.sunat.gob.pe/informacion_general/obligados_cpe
- SUNAT, R.S. 000075-2026/SUNAT — https://www.sunat.gob.pe/legislacion/superin/2026/000075-2026.pdf
- Gestión, *Sunat: contribuyentes serán designados como emisores electrónicos una vez inscritos en RUC* — https://gestion.pe/economia/sunat-contribuyentes-seran-designados-como-emisores-electronicos-una-vez-inscritos-en-ruc-noticia/
- El Peruano, *PCM publica proyecto para modificar el Reglamento del Libro de Reclamaciones* — https://elperuano.pe/noticia/300583-pcm-publica-proyecto-para-modificar-el-reglamento-del-libro-de-reclamaciones
- Indecopi, *Tu Libro de Reclamaciones* — https://www.gob.pe/institucion/indecopi/noticias/1296574-los-emprendedores-ya-pueden-generar-su-libro-de-reclamaciones-de-manera-rapida-y-sencilla-sin-costo-alguno
- KOM, *Libro de Reclamaciones para gimnasios* (fuente secundaria) — https://kom.pe/libro-reclamaciones-gimnasios-fitness-peru/
