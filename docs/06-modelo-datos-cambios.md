# 06 — Cambios al modelo de datos (Prisma; ORM sustituido por Drizzle, ADR-022)

> **Enmienda ADR-022 (2026-11-12):** el ORM pasa a Drizzle. Los bloques ```prisma son **notación conceptual** del diff; el esquema real se escribe en TypeScript con Drizzle (S-22). Los comandos `prisma …` de §4 se sustituyen así: baseline con `drizzle-kit generate`, bases desechables con `drizzle-kit push`, aplicación en producción con el migrador de ejecución de `drizzle-orm`, y detección de drift generando de nuevo sin cambios (no verificado). Nunca contra una base real desde el agente.

Versión 0.1 · 2026-11-11. Diff **conceptual** sobre `packages/db/prisma/schema.prisma` (723 líneas, 39 entre modelos y enums en el base). La implementación real se hace en Fase 1 sobre un **baseline único** (ver §4).

## 1. Resumen por modelo

| Modelo | Acción | Detalle |
|---|---|---|
| `Organizacion` | Conservar | Una sola fila (Adhara Fit). Quitar relaciones `miembrosReferencia`, `padronHojas` |
| `Sucursal` | **Conservar oculta** | Una fila "Local" creada por seed. Se queda: `apiKey`, `reposo*`, `vitrina*` (si vitrina). Se **mueve** `diasGracia` a configuración global. Se **elimina** `tasaCambioUSD` |
| `UsuarioSucursal` | Eliminar | Sin multi-sede |
| `UsuarioAdmin.sucursalId` | Opcional → se asigna siempre a la sede única | Evita refactor de 100+ referencias |
| `ModuloPermiso.SUCURSALES` | Eliminar del enum | |
| `Miembro` | Adaptar | `cedula`→`numeroDocumento`; añadir `tipoDocumento`; `precioPlan`; `saldoAFavorUSD`→`saldoAFavor`; **eliminar** `genero`, `porRegularizar`, `vieneDelExcel`; añadir `consentimientoDatosEn`, `consentimientoVersion`, `codigoSocio?`; `sucursalId` queda nullable/ignorado |
| `Genero` (enum) | Eliminar | |
| `Plan` | Adaptar | `precioUSD`→`precio` (PEN); **eliminar** `multisede`, `permitePagoParcial`, `minimoAbonoTipo`, `minimoAbonoValor` |
| `ReglaAbonoPorFrecuencia` | **Eliminar** | Sin abonos (ADR-010) |
| `Suscripcion` | Adaptar | **Eliminar** `fechaLimiteAbono` |
| `Pago` | Adaptar | **Eliminar** `tasaCambio`, `montoBs`; renombrar `metodo` (snapshot) se mantiene; añadir `tipoComprobante`, `serieComprobante`, `numeroComprobante`, `rucCliente?`, `razonSocialCliente?` |
| `Producto` / `DeudaProducto` | Adaptar | Precios en S/ (nombre de campo `precio`) |
| `Turno` | Adaptar | `fondoInicialEfectivoUSD` + `fondoInicialEfectivoBs` → `fondoInicialEfectivo` |
| `Egreso` | Adaptar | **Eliminar** `moneda`, `tasaCambio`, `montoUSD`; enum `MonedaEgreso` eliminado |
| `ArqueoLinea` | Conservar | |
| `CheckIn` | Conservar | |
| `TasaCambio` | **Eliminar** | |
| `MetodoPago` / `TipoMetodoPago` | Adaptar | Nuevo enum (ver doc 05); `moneda` eliminado (todo PEN); `codigoBanco`,`rif`,`walletDireccion`,`walletUsuario` eliminados; añadir `cci`, `titular` |
| `CambioPlanAuditoria`, `Sesion`, `RegistroAuditoria`, `TemaOrganizacion`, `PermisoUsuario` | Conservar | |
| `MiembroReferencia`, `PadronHoja` | **Eliminar** | Padrón Excel |
| `VitrinaItem`, `TipoVitrinaItem`, `TipoMedioVitrina` | Diferir | Comentar/aislar hasta Fase 3 (o conservar sin uso) |
| **Nuevo** `ConfiguracionOrganizacion` | Crear | `diasGracia`, `incluyeIGV`, `exigirComprobante`, textos legales (versión consentimiento) |
| **Nuevo** `ConsentimientoDatos` (opcional) | Crear | Historial versionado por miembro si se requiere trazabilidad completa |

## 2. Esbozo del schema resultante (extractos)

```prisma
enum TipoDocumento { DNI CE PASAPORTE }

model Miembro {
  id                    String         @id @default(cuid())
  organizacionId        String
  organizacion          Organizacion   @relation(fields: [organizacionId], references: [id])
  tipoDocumento         TipoDocumento  @default(DNI)
  numeroDocumento       String
  codigoSocio           String?        // código numérico corto para el kiosco (extranjeros)
  nombre                String
  celular               String?
  fechaNacimiento       DateTime?
  fotoUrl               String?
  planId                String?
  precioPlan            Decimal        @db.Decimal(10, 2)   // PEN
  // saldoAFavor: se elimina (ADR-010). El excedente en efectivo es vuelto; el valor no consumido en un cambio de plan se convierte en días.
  estado                EstadoMiembro  @default(ACTIVO)   // ACTIVO | BAJA (ADR-013)
  bajaEn                DateTime?
  bajaPorId             String?
  bajaMotivo            String?
  consentimientoDatosEn DateTime?
  consentimientoVersion String?
  // ...resto igual al base (fechas, entrenador, activo, createdAt)

  @@unique([organizacionId, numeroDocumento])
  @@unique([organizacionId, codigoSocio])
}

enum TipoMetodoPago { EFECTIVO BILLETERA_DIGITAL TARJETA TRANSFERENCIA DEPOSITO }

enum TipoComprobante { BOLETA FACTURA TICKET_INTERNO NINGUNO }

model Pago {
  // ...campos del base sin tasaCambio/montoBs
  monto              Decimal         @db.Decimal(10, 2)  // PEN
  tipoComprobante    TipoComprobante @default(NINGUNO)
  serieComprobante   String?
  numeroComprobante  String?
  rucCliente         String?
  razonSocialCliente String?
}

model ConfiguracionOrganizacion {
  organizacionId     String  @id
  organizacion       Organizacion @relation(fields: [organizacionId], references: [id])
  diasGracia         Int     @default(0)
  incluyeIGV         Boolean @default(true)
  exigirComprobante  Boolean @default(false)
  versionConsentimiento String @default("v1")
}
```

> Nota: la unicidad `numeroDocumento` **sin** `tipoDocumento` es deliberada (ADR-004).

## 3. Cambios de lógica asociados (dominio)

| Regla | Cambio |
|---|---|
| `Pago.ts`, `cambioPlanCalculo.ts`, `RegistrarPago.ts` (sin ramas de abono; ver 3.1) | Sustituir USD por PEN; quitar ramas "Bs"; tolerancia desde configuración |
| `RegistrarCheckIn.ts` | `buscarPorCedula` → `buscarPorDocumento`; `diasGracia` desde configuración |
| `ObtenerResumenTurno.ts` | El efectivo es un único método `EFECTIVO`; quitar `efectivo_usd`/`efectivo_bs` |
| `resolverCobroPasado.ts` | Quitar `tasaDeLinea`/`SinTasaParaFechaError` |
| `entities/Plan.ts` → `diasGraciaParaPlan` | Mantener |
| `fechaCaracas.ts` | → `fechaLima.ts` |

### 3.0 Dinero, bajas y vigencia

**Fuente única de vigencia:** hoy conviven `Miembro.fechaVencimiento` y `Suscripcion`; el check-in decide por la suscripción y la edición manual las sincroniza a mano (doc 11, H-02). En el modelo nuevo la suscripción es la única fuente y `fechaVencimiento` se deriva (vista o campo calculado en la misma transacción).

El dominio pasa a céntimos enteros (ADR-011); la BD conserva `Decimal`. `eliminarConHistorial` se sustituye por baja lógica y `AnonimizarMiembro` (ADR-013). `Pago.metodo` deja de ser texto libre: catálogo con clave estable y `esEfectivo` (el arqueo hoy compara literales).

### 3.1 Retiro de abonos (ADR-010)

Se eliminan en dominio `ReglaAbono.ts`, `CobrarAbonoPendiente`, `ListarAbonosPendientes` y las ramas de abono en `RegistrarPago`, `RegistrarCheckIn` y `ValidarAccesoSucursalPorPlan`. El estado de acceso queda en tres valores: activo, gracia, vencido. `grupoPagoId` se conserva solo si P-16 permite pago dividido entre métodos; `DeudaProducto` (fiado de productos) es independiente y sigue a P-06.

## 4. Estrategia de migración

1. **Baseline único.** Se genera `0001_baseline` con `drizzle-kit generate` sobre el esquema adaptado (antes `prisma migrate diff`, ADR-022). No se arrastran las 36 migraciones del base (contienen historia de renombres, datos de Excel y backfills del cliente anterior).
2. **Seed Adhara** (`seed.ts`): `Organizacion` "Adhara Fit" (slug `adhara-fit`), `Sucursal` "Local" con `apiKey` generada, `ConfiguracionOrganizacion`, usuario SOCIO inicial (contraseña por variable de entorno, forzar cambio), métodos de pago base, planes de ejemplo, reglas de abono.
3. **Sin datos que migrar** del cliente anterior. Para miembros existentes de Adhara: importador CSV (HU-50, Release 1.1) con `numeroDocumento`, nombre, plan, fecha de vencimiento.
4. **Entornos:** BD local en Docker Compose; `drizzle-kit push` solo en bases desechables locales; el migrador de ejecución en CI/CD hacia staging/producción (antes `prisma migrate dev`/`deploy`, ADR-022).
5. **Verificación:** comprobación en CI de que generar de nuevo no produce cambios (antes `prisma validate` y `migrate diff`, ADR-022), y test de integración que arranca Postgres efímero y corre el seed.

## 5. Índices recomendados (revisión)

- `Miembro(organizacionId, numeroDocumento)` único (ya implícito).
- `Pago(turnoId)`, `Pago(miembroId, fechaPago)`, `Pago(fechaPago)` para históricos.
- `CheckIn(sucursalId, fechaHora)` (existe) y `CheckIn(miembroId, fechaHora)`.
- `Suscripcion(miembroId, estado)`.
