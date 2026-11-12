# 04 — Arquitectura objetivo

Versión 0.1 · 2026-11-11. Se **conserva** la arquitectura del repo base (ADR-001 y ADR-002 originales); este documento fija qué queda y qué se simplifica.

## 1. Vista de contexto

```
 ┌──────────────┐  HTTPS   ┌───────────────────────────┐   SQL   ┌────────────┐
 │ Personal     │─────────▶│ web-admin (Next.js 16)    │────────▶│ PostgreSQL │
 │ (PC/tablet)  │          │ panel + API REST          │         └────────────┘
 └──────────────┘          │  ├ Server Actions         │   S3    ┌────────────┐
                           │  └ /api/kiosco/*          │────────▶│ R2 / S3    │ fotos
 ┌──────────────┐  HTTPS   │                           │         └────────────┘
 │ Kiosco       │─────────▶│  X-Kiosk-Api-Key          │
 │ (kiosk,PWA)  │ cola     └───────────────────────────┘
 │ + numpad     │ offline
 └──────────────┘
        (Fase 3: kiosk-host Windows, kiosk-tv/vitrina Android)
```

## 2. Componentes y responsabilidades

| Componente | Responsabilidad | Cambios vs base |
|---|---|---|
| `apps/web-admin` | UI del personal + API del kiosco | Quitar sucursales, tasa, Excel; marca Adhara |
| `apps/kiosk` | Check-in sin lógica de negocio (estático, PWA) | DNI en lugar de cédula; textos |
| `packages/domain` | Reglas puras (sin Node/ORM/red) | PEN, `fechaLima`, documentos, comprobantes |
| `packages/infrastructure` | Adaptadores de puertos | Quitar `BcvApiAdapter`; añadir (Fase 3) cliente OSE |
| `packages/db` | Schema, migraciones, seed | **Baseline nuevo**, seed Adhara |
| `packages/theming`, `ui` | Tokens y componentes | Paleta amarillo/negro |

**Eliminados del MVP:** `apps/worker`, `packages/design-system`, `packages/config`, `packages/domain-custom` (vacíos). Se puede conservar `domain-custom` como punto de extensión, pero con `.gitkeep` solamente.

## 3. Principios (se mantienen)

1. **Hexagonal:** la lógica nueva va a `packages/domain` con tests; Next.js solo orquesta.
2. **Kiosco sin lógica:** `apps/kiosk` no importa dominio/infra/db (ADR-001 base). La excepción de ADR-002 (vitrina importa funciones puras) se mantiene si se reincorpora la vitrina.
3. **El servidor decide:** turno, sucursal (implícita), rol y esperado de arqueo se derivan de la sesión, nunca del cliente.
4. **Pagos inmutables:** anular, no borrar.
5. **Una fuente de verdad para tiempo:** helper único `fechaLima` (reemplaza `fechaCaracas`).

## 4. Modelo de tiempo

- Se almacenan instantes en UTC (columna de instante UTC; el mapeo con Drizzle se fija en S-22).
- Las fechas de **calendario** (vencimiento, inscripción) se normalizan a **00:00 `America/Lima`** (= 05:00 UTC). Perú no usa horario de verano, por lo que el offset es fijo UTC-5; aun así se usa el nombre de zona IANA y no un offset codificado.
- Prueba obligatoria de bordes: 23:59 y 00:00 Lima; 19:00 Lima (00:00 UTC).

## 5. Modelo monetario

- Una sola moneda: **PEN**. `Decimal(10,2)` para montos de operación, `Decimal(14,2)` para totales de caja.
- Redondeo **half-up a 2 decimales** al calcular porcentajes (IGV, descuentos). En el **dominio** el dinero son **céntimos enteros** (ADR-011): el base usa `number` de JS (`.toNumber()` en los repositorios), no `Decimal`; la conversión se hace solo en la frontera del repositorio.
- Formato de presentación: `Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'})` → `S/ 1,234.50`.
- Se elimina por completo el concepto de `tasaCambio`, `montoBs`, `montoUSD`.

## 5.1 Efectivo y vuelto

En Perú el cobro en efectivo suele traer **vuelto**. El repo base no lo modela (cobraba USD/Bs exactos). **[SUPUESTO S-09]** Registrar solo el monto neto cobrado; el vuelto no se persiste. Si el cliente lo exige, añadir `montoRecibido` en el pago en efectivo.

## 6. Seguridad

| Tema | Medida |
|---|---|
| Secretos | Solo en variables de entorno; `.env.example` con nombres, sin valores; `.gitignore` que excluye `*.env*`, `cookies.txt`, `reporte-*.json` |
| Sesiones | Token aleatorio en cookie `HttpOnly`, `Secure`, `SameSite=Lax`; expiración y revocación (modelo `Sesion`) |
| Kiosco | API key por organización/sede, hash en BD **[mejora propuesta]**; rotación desde el panel; CORS restringido al origen del kiosco |
| Autorización | `AuthorizationService` en dominio; validación en cada Server Action y ruta API |
| Archivos | URLs prefirmadas de corta duración; tipos/tamaños limitados |
| Datos personales | Minimización (no guardar salud sin base legal), consentimiento versionado, exportación/eliminación a solicitud (ARCO) |
| Dependencias | `npm audit` en CI; Dependabot |
| Backups | `pg_dump` diario cifrado + prueba de restauración |

**Mejora propuesta (no existe en el base):** hoy la API key del kiosco se guarda en claro en `Sucursal.apiKey`. Guardar solo un hash y mostrar la clave una vez al generarla.

## 7. Despliegue

| Entorno | Descripción |
|---|---|
| Local | Docker Compose: Postgres + web-admin (+ kiosk). `npm run dev` |
| Staging | Misma imagen que producción, BD aparte, datos ficticios |
| Producción | VPS o PaaS con Docker (EasyPanel/Coolify/Fly/Render); Postgres administrado; **subdominio dedicado** (p. ej. `app.<dominio>`) con TLS, `noindex`/`robots.txt` Disallow y acceso solo autenticado; R2/S3 para fotos |

- **Migraciones:** baseline único con `drizzle-kit generate`; en producción las aplica el migrador de ejecución de `drizzle-orm` al arrancar el contenedor, **solo contra la BD de su entorno** (ADR-022; asumido, por validar).
- **Regla heredada y reforzada:** el `.env` local nunca apunta a producción.
- **Región:** elegir la más cercana a Lima (p. ej. São Paulo / `sa-east-1`) para latencia del kiosco.
- CI en GitHub Actions: `lint`, `tsc`, tests por workspace, `build`, escaneo de secretos (gitleaks).

## 8. Observabilidad

Logs JSON de la app, `/api/health` (BD + versión), alertas por uptime externo y por tasa de errores 5xx del check-in.

## 9. Tecnología — decisiones de versión

Se mantiene: Node 22, Next 16, React 19, Drizzle ORM 0.x (sustituye a Prisma 7, ADR-022), Tailwind 4, Vitest 5, npm workspaces + Turborepo. **No migrar de stack en el MVP, salvo el ORM (ADR-022).** Revisar versiones y avisos de seguridad al arrancar Fase 0 (`npm outdated`, `npm audit`).
