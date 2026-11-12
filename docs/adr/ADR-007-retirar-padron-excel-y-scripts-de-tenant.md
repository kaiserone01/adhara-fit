# ADR-007: Retirar el padrón Excel y los scripts específicos del cliente anterior

> v0.3: el alcance se amplía a **todos** los scripts de mantenimiento de `packages/db` (doc 11, H-03 y DI-87): varios son destructivos y sin guarda.

Estado: **propuesto** (2026-11-11)

## Contexto
Gran parte de `packages/db` y de `web-admin` existe para operar la migración desde un Excel del cliente anterior: `MiembroReferencia`, `PadronHoja`, menú "Excel" (cuadrícula espejo), `ActivarMiembroDesdePadron`, `importarPadronExcel.ts`, `migracion-excel/`, columnas `porRegularizar`/`vieneDelExcel`, y utilitarios `clonarSedePrincipalAZipGym*`, `sembrarOrganizacionZipGym`, `limpiarOrganizacionParaMigracion`, `marcarAjustarFecha`, `resetVencimientosPrueba`, `diagnosticoVencimientos`. No aplican a Adhara y contienen lógica y datos del otro negocio.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- El padrón Excel y los scripts contienen lógica y datos del otro negocio.
- Varios scripts de `packages/db` son destructivos y sin guarda (doc 11 DI-87, H-03).
- Menos superficie de mantenimiento y menos migraciones.
- Hay que poder cargar los miembros existentes de Adhara.

## Decisión
Eliminar todo lo anterior del repo de Adhara. Para cargar los miembros existentes de Adhara se construye un **importador CSV genérico** (HU-50) con simulación por defecto y `--confirm`, reutilizando el patrón de seguridad del base (dry-run, reporte sin PII en git, respeta ediciones manuales).

## Alternativas
*Sección añadida en el pase formal F; alternativas inferidas del texto del ADR.*
| Alternativa | Pros | Contras |
|---|---|---|
| **A. Eliminar todo y construir un importador CSV genérico (elegida)** | Sin PII ajena; menos superficie; importador con dry-run y `--confirm` | Se pierde el espejo de Excel; hay que construir HU-50 |
| B. Conservar el padrón y los scripts | Cero trabajo inicial | Lógica y datos del otro negocio; scripts destructivos sin guarda; no aplica a Adhara (Contexto) |

## Consecuencias
- (+) Menos superficie, menos migraciones, sin PII ajena.
- (+) Se elimina la regla de "activación bajo demanda desde el padrón" en el check-in: el kiosco solo valida miembros existentes.
- (−) Se pierde la espejo de Excel; si Adhara maneja un Excel propio, se importa una vez y se abandona.
- Se conserva (como referencia, en el ADR/doc de origen) el patrón de `MiembroReferencia` por si hiciera falta algo similar.

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-10 (retirada de Venezuela). El importador (HU-50, Release 1.1, tarea 2.4 del doc 07) no tiene spec en S-00…S-10.
- **Invariantes a fijar:** el código no contiene referencias a padrón/Excel/`MiembroReferencia` (búsqueda en CI); el importador simula por defecto y exige `--confirm`.

## Reversibilidad
*(Pase formal F.)* Media: el patrón de `MiembroReferencia` se conserva como referencia en el doc de origen.

## Dependencias
*(Pase formal F.)* ADR-005 (exclusiones), ADR-004 y ADR-003 (formato del CSV), ADR-012 §9 (scripts destructivos). Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.
