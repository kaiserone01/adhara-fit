# ADR-022: Drizzle ORM reemplaza a Prisma como capa de acceso a datos

Estado: **propuesto** · propuesto el 2026-11-12 · Origen: indicación del propietario en el chat del 2026-11-12 («vamos a cambiar el ORM de Prisma a Drizzle»). Pasa a *aceptado* solo cuando el propietario lo ordene en el chat. **Enmienda** a ADR-001 (base con Prisma 7) y a ADR-016 §2 (comando de migración de la base efímera).

## Contexto
El propietario decidió cambiar el ORM. La documentación v0.4 mantenía Prisma: «No migrar de stack en el MVP» (`docs/04-arquitectura-objetivo.md` línea 93) y ADR-001 adoptó la base «Next.js 16 + Prisma 7». Ningún ADR había decidido esto, de modo que esta decisión necesita su propio ADR y deja sin efecto esa frase de `docs/04`.

Hechos (verificados el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a0`, con `grep` por patrón y `npm view`):
- 44 archivos de código importan Prisma (`@prisma/client`, `PrismaClient` o `prisma.`): 16 en `packages/db`, 24 en `packages/infrastructure`, 8 en `apps/web-admin` y 1 en `apps/worker` (excluida por ADR-003). `packages/infrastructure` tiene 23 archivos `Prisma*` (repositorios).
- `packages/db/prisma/schema.prisma` tiene 25 modelos y 14 enums; la carpeta de migraciones tiene 37 entradas (36 migraciones y `migration_lock.toml`). Hay 20 usos de `$transaction`, `$queryRaw` o `$executeRaw`.
- Dependencias de Prisma: `@prisma/client`, `@prisma/adapter-pg` y `prisma`, todas `^7.10.0` (`packages/db/package.json:27`, `:28`, `:32`); scripts `generate`, `migrate:dev` y `db:seed` (`packages/db/package.json:6-8`).
- `docs/linea-base-tests.md` §3: `web-admin` no pasa `tsc` sin generar antes el cliente de Prisma (44 errores sin él, 1 con él).
- npm el 2026-11-12: `drizzle-orm` 0.45.4 (etiqueta `latest`, licencia Apache-2.0; etiqueta `beta` 1.0.0-beta.22), `drizzle-kit` 0.31.11 (MIT), con `pg` >=8 como dependencia par. La versión estable sigue siendo anterior a 1.0.
- `packages/domain` es hexagonal y no importa Prisma (`docs/04` línea 27, no re-verificado). Se espera que el cambio quede en los adaptadores.

Lo que **no** está verificado: cuánto de esos 44 archivos es CRUD simple y cuánto usa `include` anidados, tipos `Decimal`/`Json` o transacciones interactivas; el comportamiento exacto de `drizzle-kit` ante un esquema sin cambios; el esfuerzo total (no hay estimación medida).

## Factores de decisión
- Voluntad del propietario: cambiar a Drizzle.
- S-00 ya descarta las 36 migraciones y regenera el baseline (SUP-S00-002), de modo que no hay migraciones que traducir ni datos que conservar.
- ADR-018, ADR-019 y ADR-003 eliminan modelos (turno, arqueo, egreso, deuda, organización, tasa de cambio); conviene no portar lo que va a desaparecer.
- Cada spec posterior (S-01 a S-21) toca esquema y repositorios: hacer el cambio después las obligaría a hacerse dos veces.
- Drizzle no genera cliente: desaparece el paso `npm run generate` que hoy condiciona el typecheck de `web-admin`.
- Riesgo: `drizzle-orm` es 0.x y puede romper entre versiones menores.

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **A. Cambiar a Drizzle justo después de S-00 y antes de S-01, en una spec propia S-22 (propuesta)** | Las demás specs nacen sobre el ORM definitivo; el cambio se verifica con las pruebas heredadas intactas | Se porta el esquema tal cual, incluidos modelos que luego se eliminan; cuesta tiempo antes de la seguridad |
| B. Mantener Prisma 7 | Cero trabajo; stack documentado | Contradice la decisión del propietario |
| C. Cambiar al final (tras S-21) | Se porta solo lo que sobrevive | Cada spec reescribe repositorios dos veces; el baseline de migraciones se genera dos veces |
| D. Cambiar a mitad de camino, tras las specs que eliminan modelos (S-05, S-08, S-10) | Se porta un esquema más pequeño | S-01 y S-02 a S-04 se escriben sobre Prisma y se rehacen; la seguridad (S-01) queda detrás de refactors grandes |

## Decisión
*(Propuesta; vale cuando el propietario acepte.)*
1. La capa de acceso a datos pasa a **Drizzle ORM sobre el cliente `pg`** (node-postgres). `packages/domain` no cambia: solo se reescriben los adaptadores de `packages/infrastructure` y el esquema de `packages/db`. Los puertos del dominio se conservan.
2. **Versión:** la estable 0.x de `drizzle-orm` y de `drizzle-kit`, fijadas exactas sin `^` ni `latest` (hoy 0.45.4 y 0.31.11); no se usa la beta 1.0. Asumido, por validar.
3. **Esquema** en TypeScript (`packages/db/src/schema/`). **Migraciones** SQL versionadas generadas con `drizzle-kit generate`; `drizzle-kit push` solo contra bases desechables (sustituye a `prisma db push` de SUP-S00-010). Cómo se aplican al arrancar el contenedor se fija en S-22; default: el migrador de ejecución de `drizzle-orm`, para no llevar `drizzle-kit` a la imagen de producción. Asumido, por validar.
4. **Sin datos que migrar:** el baseline de migraciones se genera una sola vez (SUP-S00-002) con Drizzle; las 36 migraciones de Prisma siguen excluidas.
5. **Orden:** S-00 se conserva tal como está aprobada (importa sin adaptar, con Prisma). Se agrega la spec **S-22 «Capa de datos con Drizzle»** inmediatamente después de S-00 y antes de S-01. El orden definitivo lo fija el plan global (G6). Asumido, por validar.
6. **Paridad como criterio:** al terminar S-22 las pruebas de dominio heredadas (390) y las de integración de cada repositorio pasan contra PostgreSQL efímero (ADR-016 §2), y el repositorio no contiene `prisma` ni `@prisma/*` en ningún `package.json` ni en el lockfile.
7. **Consultas:** se prohíbe `sql.raw` con entrada externa; las consultas SQL propias usan la plantilla `sql` parametrizada. Se verifica con una regla de lint o una prueba de búsqueda.
8. **Entorno de pruebas y límites del agente:** el agente no ejecuta `drizzle-kit migrate`, `push` ni `drop` contra una base real (extiende la regla de ADR-016 §2 y de `CLAUDE.md` §5).

## Consecuencias
- (+) Sin paso de generación de cliente; tipos inferidos del esquema; SQL más cercano.
- (−) Reescritura de ≈44 archivos de código (esfuerzo sin medir) y de la documentación que nombra a Prisma; dependencia 0.x con riesgo de cambios incompatibles; sin migraciones «down» automáticas (no verificado).
- Dependencias nuevas, a justificar en S-22: `drizzle-orm`, `drizzle-kit` (desarrollo) y `pg` como dependencia directa de ejecución; se retiran `@prisma/client`, `@prisma/adapter-pg` y `prisma`. S-00 ya planea `pg` como dependencia de desarrollo del helper de base efímera (S-00 §5.1).
- Enmiendas necesarias **solo al aceptarlo**: ADR-001 (nota sobre Prisma), ADR-016 §2 y `docs/constitution.md` C-21 (sustituir `prisma migrate`), `CLAUDE.md` líneas 5 y 67, `docs/04` líneas 27, 44, 82 y 93, y el patrón de `guard-bash` (hoy no hay regla específica de `prisma migrate`; cualquier cambio del arnés lo aprueba el propietario). S-00 no cambia (SUP-S00-010 y REQ-S00-017 siguen válidos hasta S-22).
- Afecta al backlog: nueva S-22; S-15 (seed) y S-16 (importador) se escriben sobre Drizzle.

## Cómo se valida
- **Spec:** S-22 (propuesta).
- **Invariantes a fijar:** el repositorio no contiene `prisma` ni `@prisma/*` tras S-22; el esquema Drizzle y las migraciones generadas coinciden (generar de nuevo no produce cambios; el comportamiento exacto de `drizzle-kit` ante un esquema sin cambios es no verificado); ninguna consulta usa `sql.raw` con entrada externa.
- **Criterios a fijar:** pruebas de dominio e integración heredadas en verde contra PostgreSQL efímero; build y typecheck sin el paso `generate`.

## Reversibilidad
Alta mientras sea solo una decisión; baja tras S-22 (volver a Prisma exigiría reescribir de nuevo los repositorios y el baseline).

## Dependencias
- ADR-001 (base), ADR-016 §2 (base efímera), ADR-019 (esquema más pequeño), ADR-018 y ADR-003 (modelos que desaparecen); S-00 (SUP-S00-002, SUP-S00-010) y la nueva S-22.

## Referencias
`docs/04-arquitectura-objetivo.md` (líneas 27, 44, 82, 93) · `docs/linea-base-tests.md` §3 · `packages/db/package.json:6-8`, `:27-32` y `packages/db/prisma/schema.prisma` del Repo A en `b4352a0` · `docs/superpowers/specs/S-00-fundaciones-del-repo.md` (SUP-S00-002, SUP-S00-010, REQ-S00-017).

## Preguntas abiertas
Cada una con su default; si no respondes, se aplica y queda marcada como asumida.
1. ¿Versión estable 0.x o beta 1.0? Default: estable 0.45.4, fijada exacta.
2. ¿Cuándo se hace el cambio? Default: S-22 justo después de S-00 (opción A).
3. ¿Driver `pg` o `postgres`? Default: `pg` (ya está en el lockfile y en el plan de pruebas de S-00).
4. ¿Cómo se aplican las migraciones en producción? Default: migrador de ejecución de `drizzle-orm` en el arranque del contenedor.
