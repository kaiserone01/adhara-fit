# ADR-022: Drizzle ORM reemplaza a Prisma como capa de acceso a datos

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-12 · Origen: indicación del propietario en el chat del 2026-11-12 («vamos a cambiar el ORM de Prisma a Drizzle»). Aceptación literal: «acepto ADR-022, S-22 va después de S-00». Con ella queda fijada la opción A (orden); los demás puntos de la Decisión y las preguntas 1 a 6 se aplican con el default indicado, **asumido, por validar** (la pregunta 6, el experimento previo, queda en «no se hace»). **Enmienda** (ya aplicada) a ADR-001 (Decisión: «conservando stack…» y estimado de tiempo) y a ADR-016 §2 (comando de migración de la base efímera). Revisión independiente: `REVISION-ADR.md` §9; este texto ya incorpora sus correcciones.

## Contexto
El propietario decidió cambiar el ORM. La documentación v0.4 mantenía Prisma: «No migrar de stack en el MVP» (`docs/04-arquitectura-objetivo.md` línea 93) y ADR-001 adoptó la base «Next.js 16 + Prisma 7». Ningún ADR había decidido esto, de modo que esta decisión necesita su propio ADR y deja sin efecto esa frase de `docs/04`.

Hechos (verificados el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a0`, con `grep -rIl -E "@prisma/client|PrismaClient|prisma\."` sobre `apps` y `packages`, sin `node_modules`, `.next` ni `generated`, y con `npm view`):
- **49 archivos** coinciden con ese patrón (en una versión anterior de este ADR dije 44: era un error de recuento): 16 en `packages/db`, 24 en `packages/infrastructure`, 8 en `apps/web-admin` (uno es `tsconfig.tsbuildinfo`, un artefacto de compilación) y 1 en `apps/worker`. `packages/infrastructure` tiene 23 archivos `Prisma*`, de los cuales `PrismaClientOrTx.ts` es un ayudante y no un repositorio.
- **Lo que sobrevive a S-00 y hay que portar:** de `packages/db` ningún archivo de código (los 14 scripts de mantenimiento y el seed se excluyen por ADR-005 §3 y SUP-S00-011; quedan `package.json`, `schema.prisma` y las configuraciones); de `web-admin`, `lib/prisma.ts`, `lib/activacion.ts`, `(panel)/caja/actions.ts` y `(panel)/pagos/actions.ts`; el worker se omite (ADR-009, SUP-S00-001, y ADR-003). Cinco repositorios corresponden a modelos que otros ADR eliminan: `PrismaTurno`, `PrismaArqueo`, `PrismaEgreso`, `PrismaDeudaProducto` y `PrismaTasaCambio`. Quedan unos 17 repositorios y el ayudante.
- `packages/db/prisma/schema.prisma` tiene 25 modelos y 14 enums; las migraciones son 37 entradas (36 más `migration_lock.toml`). Hay 20 usos de `$transaction`, `$queryRaw` o `$executeRaw` en 14 archivos; los más cargados son `PrismaVitrinaRepository` (4), `PrismaMemberRepository`, `PrismaUsuarioAdminRepository`, `PrismaPermisoRepository`, `caja/actions.ts` (3) y `pagos/actions.ts` (2). Los campos `Json` del esquema solo están en los modelos del padrón Excel, que ADR-007 retira (informe del revisor, `schema.prisma:646` y `:663`).
- Dependencias de Prisma: `@prisma/client`, `@prisma/adapter-pg` y `prisma`, todas `^7.10.0` (`packages/db/package.json:27`, `:28`, `:32`); scripts `generate`, `migrate:dev` y `db:seed` (`:6-8`).
- **No existen pruebas de los repositorios:** `packages/infrastructure` y `apps/web-admin` tienen 0 archivos de test (verificado con `find … -name '*.test.*'`; `docs/linea-base-tests.md` §1). Las 390 pruebas de dominio no importan el ORM, así que pasarían igual con cualquier ORM; las 72 de `packages/db` están en directorios que S-00 excluye.
- `docs/linea-base-tests.md` §3: `web-admin` no pasa `tsc` sin generar antes el cliente de Prisma.
- npm el 2026-11-12: `drizzle-orm` 0.45.4 (etiqueta `latest`, licencia Apache-2.0; etiqueta `beta` 1.0.0-beta.22), `drizzle-kit` 0.31.11 (MIT), con `pg` >=8 como dependencia par. La versión estable sigue siendo anterior a 1.0.
- `packages/domain` es hexagonal y no importa Prisma (`docs/04` línea 27, no re-verificado).

Lo que **no** está verificado: el comportamiento de `db.transaction` de Drizzle frente al `$transaction` interactivo que usa `RegistrarPago`; cómo llegan `numeric` y `timestamp` desde `pg` (tengo la impresión de que `numeric` llega como cadena; se comprueba en S-22); el comportamiento exacto de `drizzle-kit` ante un esquema sin cambios; el esfuerzo total.

## Factores de decisión
- Voluntad del propietario: cambiar a Drizzle (la opción B se descarta por eso, sin más argumento técnico).
- S-00 ya descarta las 36 migraciones y regenera el baseline (SUP-S00-002): no hay migraciones que traducir ni datos que conservar.
- ADR-018, ADR-019 y ADR-003 eliminan modelos y ADR-019 pide hacer esa cirugía «junto con el baseline nuevo para no acumular migraciones»: conviene no portar ni versionar lo que va a desaparecer.
- Cada spec posterior toca esquema y repositorios: hacer el cambio tarde obliga a reescribir dos veces.
- Drizzle no genera cliente: desaparece el paso `npm run generate` que condiciona el typecheck de `web-admin`.
- Riesgo: `drizzle-orm` es 0.x y puede romper entre versiones menores.
- Valor de ADR-001: reutilizar infraestructura heredada (`docs/11` DI-06, `persistence/prisma`). Reescribir unos 17 repositorios la erosiona y su estimado de 7 a 9 semanas.

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **A. Spec propia S-22 justo después de S-00 y antes de S-01 (propuesta)** | Las demás specs nacen sobre el ORM definitivo | Se porta el esquema tal cual, incluidos modelos que luego se eliminan; S-01 queda detrás; exige escribir pruebas de caracterización (no hay pruebas heredadas de repositorios) |
| B. Mantener Prisma 7 | Cero trabajo | Contradice la decisión del propietario |
| C. Cambiar al final (tras S-21) | Se porta solo lo que sobrevive | Cada spec reescribe repositorios dos veces |
| D. Cambiar tras las specs que eliminan modelos (S-05, S-08, S-10) | Se porta un esquema más pequeño | S-01 a S-04 se escriben sobre Prisma y se rehacen |
| E. Coexistencia: cada spec porta los repositorios que ya toca | Reparte el costo | Dos herramientas de migración y dos clientes a la vez; riesgo de inconsistencias |

## Decisión
*(Propuesta; vale cuando el propietario acepte.)*
1. La capa de acceso a datos pasa a **Drizzle ORM sobre el cliente `pg`**. `packages/domain` no cambia: se reescriben los adaptadores de `packages/infrastructure`, el esquema y las partes de `web-admin` que usan el cliente (`lib/prisma.ts`, `lib/activacion.ts`, `caja/actions.ts`, `pagos/actions.ts`). Los puertos del dominio se conservan.
2. **Versión:** la estable 0.x de `drizzle-orm` y de `drizzle-kit`, fijadas exactas (hoy 0.45.4 y 0.31.11); no se usa la beta 1.0. Asumido, por validar.
3. **Esquema** en TypeScript (`packages/db/src/schema/`). Mientras duren las specs que cambian el esquema, **no se versionan migraciones**: las bases efímeras de pruebas y la de Compose se crean con `drizzle-kit push`, que solo se usa contra bases desechables (sustituye a `prisma db push`, SUP-S00-010, REQ-S00-017; S-22 enmienda esos dos puntos de forma explícita). Asumido, por validar.
4. **Baseline único:** el baseline de migraciones se genera una sola vez con `drizzle-kit generate`, después de las specs que cambian el esquema (SUP-S00-002, ADR-019). Cómo se aplican al arrancar el contenedor se fija en S-22; default: el migrador de ejecución de `drizzle-orm`, para no llevar `drizzle-kit` a la imagen de producción. Asumido, por validar.
5. **Orden:** S-00 se conserva tal como está aprobada. Se agrega la spec **S-22 «Capa de datos con Drizzle»** inmediatamente después de S-00 y antes de S-01; S-01 a S-21 dependen de ella (se registra en el backlog). Es un refactor y no una funcionalidad, por lo que retrasa las correcciones de ADR-012 sin contradecirlo. El orden definitivo lo fija el plan global (G6). Asumido, por validar.
6. **Paridad por pruebas nuevas, no heredadas:** como no existen pruebas de repositorios, S-22 escribe **primero** pruebas de caracterización de los repositorios que sobreviven sobre PostgreSQL efímero (ADR-016 §1, §2 y §5), contra Prisma, y luego las hace pasar con Drizzle. Incluyen: mapeo de `numeric` (montos) a céntimos y de `timestamp`/fechas de calendario según ADR-011 y `docs/04` §4-§5, enums, y una prueba de concurrencia de `RegistrarPago` que fije la semántica transaccional (ADR-010, ADR-016 §5). Las 390 pruebas de dominio se siguen ejecutando, aunque no prueban el ORM.
7. **Consultas:** se prohíbe `sql.raw` en todo el código, con una lista cerrada de excepciones en S-22; el resto usa la plantilla `sql` parametrizada. Se verifica con una búsqueda automatizada.
8. **Límites del agente:** el agente no ejecuta `drizzle-kit migrate`, `push` ni `drop` contra una base real (extiende ADR-016 §2 y `CLAUDE.md` §5). Una regla en `guard-bash` para estos comandos es un cambio del arnés y lo aprueba el propietario.
9. **Verificación previa barata (opcional):** antes de aceptar, portar `PrismaPagoRepository`, el de más transacciones, como experimento fuera del repositorio principal, si el propietario lo autoriza.

## Consecuencias
- (+) Sin paso de generación de cliente; tipos inferidos del esquema; SQL más cercano.
- (−) Reescritura de unos 17 repositorios y 4 archivos de `web-admin` más sus pruebas de caracterización (esfuerzo sin medir); dependencia 0.x con riesgo de cambios incompatibles; sin migraciones «down» automáticas (no verificado); se erosiona la ventaja de reutilización de ADR-001.
- Dependencias nuevas, a justificar en S-22: `drizzle-orm`, `drizzle-kit` (desarrollo) y `pg` como dependencia directa de ejecución; se retiran `@prisma/client`, `@prisma/adapter-pg` y `prisma`. S-00 ya planea `pg` como dependencia de desarrollo del helper de base efímera (S-00 §5.1).
- **Enmiendas necesarias solo al aceptarlo:** ADR-001 (Decisión y estimado, con una sección «Enmiendas posteriores» como las de ADR-003 y ADR-011), ADR-016 §2, `docs/constitution.md` C-21, `CLAUDE.md` líneas 5 y 67, `docs/04` líneas 27, 44, 82 y 93, `docs/06` (título, bloques `prisma`, `prisma migrate` en las líneas 113, 116 y 117), `docs/01` línea 179, `docs/03` líneas 12, 33, 34 y 137, `docs/10` líneas 9 y 24, `docs/12` líneas 22 y 51, `docs/00-indice.md` línea 16 y el patrón `.prisma` de `tools/spec-lint.mjs:51` (menor). `docs/11` y `docs/linea-base-tests.md` son históricos y no se editan. S-00 se enmienda solo en SUP-S00-010 y REQ-S00-017, dentro de S-22.
- Afecta al backlog: nueva S-22, de la que dependen S-01 a S-21; S-15 (seed) y S-16 (importador) se escriben sobre Drizzle; la vitrina (ADR-021) tiene el repositorio con más SQL crudo.
- ADR-002, ADR-003 y ADR-004 siguen *propuestos*: ADR-022 los usa como motivo (modelos que desaparecen) pero no depende de ellos para decidir. Por la regla de `CLAUDE.md` §3, S-22 no entra en revisión mientras ADR-022 esté propuesto.

## Cómo se valida
- **Spec:** S-22 (propuesta).
- **Invariantes a fijar:** (1) ni `package.json`, ni el lockfile, ni el árbol contienen `prisma`, `@prisma/*`, `schema.prisma` ni la carpeta `prisma/` tras S-22; (2) ningún archivo usa `sql.raw` fuera de la lista cerrada de excepciones; (3) el esquema Drizzle y las migraciones del baseline coinciden: generar de nuevo no produce cambios (comportamiento de `drizzle-kit` no verificado; se prueba en un experimento previo); (4) montos, fechas, enums y transacciones se mapean igual que antes, con la prueba de concurrencia de paridad.
- **Criterios a fijar:** pruebas de caracterización de repositorios en verde contra PostgreSQL efímero, primero con Prisma y luego con Drizzle; build y typecheck sin el paso `generate`.

## Reversibilidad
Alta mientras sea solo una decisión; baja tras S-22 (volver a Prisma exigiría reescribir de nuevo los repositorios y el baseline). El costo de reversión no está medido.

## Dependencias
- ADR-001 (base, enmendada), ADR-016 §2 y §5 (base efímera y concurrencia real), ADR-012 (S-01 se escribe después sobre Drizzle), ADR-011 y `docs/04` §4-§5 (mapeo de montos y fechas), ADR-010 (`RegistrarPago` transaccional), ADR-021 (vitrina), ADR-019/018/003 (modelos que desaparecen), ADR-009 (worker omitido); S-00 (SUP-S00-002, SUP-S00-010, REQ-S00-017) y la nueva S-22.

## Referencias
`docs/04-arquitectura-objetivo.md` (líneas 27, 44, 82, 93) · `docs/06-modelo-datos-cambios.md` · `docs/linea-base-tests.md` §1 y §3 · `packages/db/package.json:6-8`, `:27-32` y `packages/db/prisma/schema.prisma` del Repo A en `b4352a0` · `docs/superpowers/specs/S-00-fundaciones-del-repo.md` (SUP-S00-002, SUP-S00-010, REQ-S00-017) · `docs/adr/REVISION-ADR.md` §9.

## Preguntas abiertas
Cada una con su default; si no respondes, se aplica y queda marcada como asumida.
1. ¿Versión estable 0.x o beta 1.0? Default: estable 0.45.4, fijada exacta.
2. ¿Cuándo se hace el cambio? Default: S-22 justo después de S-00 (opción A), aceptando que S-01 queda detrás.
3. ¿Driver `pg` o `postgres`? Default: `pg`.
4. ¿Cómo se crea la base mientras el esquema cambia y cómo se aplican las migraciones en producción? Default: `drizzle-kit push` solo en bases desechables y migrador de ejecución de `drizzle-orm` para producción.
5. ¿Aceptas que S-22 incluya las pruebas de caracterización de repositorios (no existen pruebas heredadas)? Default: sí.
6. ¿Autorizas el experimento previo con `PrismaPagoRepository`? Default: no se hace; la prueba de viabilidad queda dentro de S-22.

## Enmiendas posteriores (2026-11-12)
*Confirmadas por el propietario al aprobar S-22 («confirmo las dos desviaciones»). El texto anterior se conserva; donde choca, rige esta sección.*
- **§6 (montos):** S-22 conserva los importes como número, igual que antes; el mapeo de `numeric` a céntimos enteros lo hace S-03 (ADR-011).
- **§4 (migraciones al arrancar el contenedor):** no se fija en S-22; sin baseline no hay migraciones, y el mecanismo llega con S-15 y S-17. Mientras tanto el esquema se crea con `drizzle-kit push` solo en bases desechables.
- **Alcance medido:** el cambio toca 49 archivos con el patrón del ADR y 75 archivos de `web-admin` que mencionan Prisma (S-22 §0.4); la cifra «44» del texto original era un error de recuento.
