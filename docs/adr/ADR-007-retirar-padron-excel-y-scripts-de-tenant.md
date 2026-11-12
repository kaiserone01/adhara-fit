# ADR-007: Retirar el padrón Excel y los scripts específicos del cliente anterior

> v0.3: el alcance se amplía a **todos** los scripts de mantenimiento de `packages/db` (doc 11, H-03 y DI-87): varios son destructivos y sin guarda.

Estado: **propuesto** (2026-11-11)

## Contexto
Gran parte de `packages/db` y de `web-admin` existe para operar la migración desde un Excel del cliente anterior: `MiembroReferencia`, `PadronHoja`, menú "Excel" (cuadrícula espejo), `ActivarMiembroDesdePadron`, `importarPadronExcel.ts`, `migracion-excel/`, columnas `porRegularizar`/`vieneDelExcel`, y utilitarios `clonarSedePrincipalAZipGym*`, `sembrarOrganizacionZipGym`, `limpiarOrganizacionParaMigracion`, `marcarAjustarFecha`, `resetVencimientosPrueba`, `diagnosticoVencimientos`. No aplican a Adhara y contienen lógica y datos del otro negocio.

## Decisión
Eliminar todo lo anterior del repo de Adhara. Para cargar los miembros existentes de Adhara se construye un **importador CSV genérico** (HU-50) con simulación por defecto y `--confirm`, reutilizando el patrón de seguridad del base (dry-run, reporte sin PII en git, respeta ediciones manuales).

## Consecuencias
- (+) Menos superficie, menos migraciones, sin PII ajena.
- (+) Se elimina la regla de "activación bajo demanda desde el padrón" en el check-in: el kiosco solo valida miembros existentes.
- (−) Se pierde la espejo de Excel; si Adhara maneja un Excel propio, se importa una vez y se abandona.
- Se conserva (como referencia, en el ADR/doc de origen) el patrón de `MiembroReferencia` por si hiciera falta algo similar.
