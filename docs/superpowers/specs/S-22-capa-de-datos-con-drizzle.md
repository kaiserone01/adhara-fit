---
id: S-22
estado: aprobada
adrs: ADR-001, ADR-016, ADR-022
depende_de: S-00
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-22 — Capa de datos con Drizzle: esquema, repositorios, transacciones y retiro de Prisma

## 0. Contexto y alcance

### 0.1 Problema
El propietario aceptó ADR-022 (2026-11-12): Drizzle ORM sobre `pg` reemplaza a Prisma, y la spec que lo ejecuta va después de S-00 y antes de S-01. Tras S-00 el árbol importado conserva 22 repositorios y el código de `web-admin` escritos contra Prisma, y **no existe ninguna prueba de esos repositorios** (hecho, 0.4), de modo que un porte directo no tendría contra qué compararse. S-22 cambia el ORM sin cambiar el comportamiento: primero fija el comportamiento actual con pruebas de contrato escritas contra Prisma, luego porta el esquema y los repositorios, comprueba la paridad y retira Prisma. No elimina modelos ni cambia reglas de negocio (eso corresponde a S-02 a S-11).

### 0.2 Dentro de alcance
- Pruebas de contrato de los 17 repositorios que sobreviven a los ADR de limpieza, ejecutables contra Prisma y contra Drizzle, y pruebas de humo de los 5 repositorios de modelos que esos ADR eliminan.
- Esquema Drizzle de los 25 modelos y 14 enums, con herramienta de comparación estructural contra el esquema de Prisma.
- Reescritura de los 22 repositorios, del ayudante `PrismaClientOrTx` y de `packages/infrastructure/auth/KioskTokenValidator.ts` (recibe un `PrismaClient`), y de los **75 archivos de `web-admin`** que mencionan Prisma: 71 importan `@/lib/prisma` y 71 importan alguna `PrismaXRepository`, en buena parte los mismos (`lib/prisma.ts`, `lib/activacion.ts`, acciones, rutas, páginas y los dos scripts de `web-admin/scripts`). En las páginas el cambio es el renombrado de importaciones y constructores, que comprueba el typecheck.
- Mapeo de montos (`numeric`), fechas e instantes, identificadores generados por la aplicación y campo `updatedAt`.
- Transacciones: los 4 usos de forma arreglo y los de forma interactiva pasan a `db.transaction`, y los dos límites de tiempo de transacción (20 s y 15 s) se conservan con un envoltorio propio.
- Retiro de Prisma: dependencias (`apps/web-admin/package.json:17` y `packages/db/package.json`), esquema `.prisma`, configuraciones, scripts, cliente generado, `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore`, `.gitignore` y los comentarios que nombran Prisma en `packages/domain`, `apps/web-admin/next.config.ts` y `apps/kiosk/next.config.ts`.
- Enmienda de S-00 (detalle en 5.2): la creación del esquema en Compose pasa a un servicio de un solo uso con `drizzle-kit push` y las listas de permitidos de `packages/db` pasan a `package.json`, `drizzle.config.ts` y `src/`.
- `tools/verificar-drizzle.mjs` (con su archivo de pruebas), que reúne las comprobaciones automáticas de `sql.raw`, de la cadena `prisma`, del lockfile, de las versiones fijadas y de las importaciones prohibidas en el dominio, y la protección de `drizzle-kit` contra bases no locales.

### 0.3 Fuera de alcance
- Eliminar modelos o repositorios (turno, arqueo, egreso, fiado, tasa de cambio, organización): S-05, S-08, S-10 y S-11. S-22 los porta tal cual.
- Dinero en céntimos enteros (S-03), zona horaria de Lima (S-02) y documentos de identidad (S-06): S-22 conserva los tipos actuales.
- Migraciones versionadas, baseline y seed: S-15 (propuesta). Mientras tanto no se versionan migraciones (ADR-022 §3).
- Mecanismo de migración en producción: S-15 y S-17. El arranque del contenedor no aplica migraciones hasta entonces (SUP-S22-007).
- Cambios de seguridad (ADR-012): S-01, que se escribe después sobre Drizzle.
- Rendimiento y optimización de consultas.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`, salvo lo marcado «no verificado». Los comandos `grep` excluyen `node_modules`, `.next` y `generated`.
- El cliente de Prisma se crea una sola vez y se reutiliza con `globalThis` en desarrollo: `apps/web-admin/lib/prisma.ts:6`, `:7`, `:15`, `:19`, `:22` y `:25`.
- El tipo `PrismaClientOrTx = PrismaClient | Prisma.TransactionClient` permite construir un repositorio con el cliente global o con el `tx` de una transacción: `packages/infrastructure/persistence/prisma/PrismaClientOrTx.ts:10`.
- 49 archivos importan Prisma: 16 en `packages/db`, 24 en `packages/infrastructure` (23 `Prisma*` más `auth/KioskTokenValidator.ts:1`, `:6` y `:9`, que recibe un `PrismaClient`), 8 en `apps/web-admin` y 1 en `apps/worker` (verificado con `grep -rIl -E "@prisma/client|PrismaClient|prisma\."` sobre `apps` y `packages`). Ese patrón subestima `web-admin`: sin distinguir mayúsculas y sin `tsconfig.tsbuildinfo`, **75 archivos de `web-admin` mencionan `prisma`**, y 71 importan `@/lib/prisma` y 71 importan alguna `PrismaXRepository` (verificado con `grep -rIil prisma`, `grep -rIl "@/lib/prisma"` y `grep -rIl "persistence/prisma/Prisma"` sobre `apps/web-admin`, excluyendo `node_modules`, `generated` y `.next`). Los 14 scripts de `packages/db` y el seed salen del árbol por S-00.
- Los 22 repositorios son los de Miembro (`PrismaMemberRepository`), MiembroReferencia, CheckIn, Pago, MetodoPago, CambioPlanAuditoria, DeudaProducto, Arqueo, Permiso, Plan, Entrenador, TasaCambio, Egreso, Sesion, ReglaAbono, UsuarioSucursal, Producto, Turno, Vitrina, Suscripcion, Sucursal y UsuarioAdmin (verificado con `find packages/infrastructure -name 'Prisma*'`: 23 archivos, de los cuales `PrismaClientOrTx.ts` es el ayudante). Cinco corresponden a modelos que ADR-018 y ADR-003 eliminan: Turno, Arqueo, Egreso, DeudaProducto y TasaCambio.
- `packages/infrastructure` y `apps/web-admin` tienen 0 archivos de test (verificado con `find … -name '*.test.*'`; `docs/linea-base-tests.md` §1). Las 390 pruebas de dominio no importan el ORM; en `packages/domain` Prisma solo aparece en 6 comentarios (verificado con `grep -rIn -i prisma packages/domain`).
- El esquema tiene 25 modelos y 14 enums (`packages/db/prisma/schema.prisma`, 723 líneas); 23 identificadores con `@default(cuid())` y 1 clave con `@default(uuid())` (`schema.prisma:47`, `apiKey`), 19 con `@default(now())`, 1 con `@updatedAt` (`schema.prisma:720`, modelo `VitrinaItem`), 44 campos `DateTime`, 2 `@db.Date`, 23 `Decimal` (15 de `(10,2)`, 6 de `(14,2)`, 1 de `(12,2)` y 1 de `(12,4)`), 2 arreglos `String[]`, 6 `@@unique` (`schema.prisma:128`, `:177`, `:241`, `:512`, `:652` y `:668`), 10 `@@index`, 60 `@relation` y solo 2 con `onDelete` explícito (`:354` `SetNull`, `:687` `Cascade`) (verificado con `grep -cF` sobre `schema.prisma`).
- Los identificadores `cuid()` y `uuid()` y `@updatedAt` los genera el cliente de Prisma, no la base de datos; `@default(now())` sí es un valor predeterminado de la base (no verificado contra una base creada; el comparador de AC-S22-001 lo fija).
- Los repositorios convierten montos con `.toNumber()`: `PrismaPagoRepository.ts:11`, `:36`, `:40` y `:41`; hay 41 líneas con `Decimal` o `toNumber` en 11 archivos de `packages/infrastructure` (verificado con `grep -rIn -E "Decimal|toNumber" packages/infrastructure`).
- `$transaction` se usa en forma de **arreglo** en 4 sitios, `PrismaPermisoRepository.ts:21`, `PrismaUsuarioSucursalRepository.ts:13`, `PrismaUsuarioAdminRepository.ts:83` y `PrismaTasaCambioRepository.ts:63` (`tasas.map(… upsert)`), y en forma interactiva en `PrismaMemberRepository.ts:114`, `PrismaVitrinaRepository.ts:74`, `:85`, `:95` y `:105`, `caja/actions.ts:287`, `:447` y `:556`, `pagos/actions.ts:206` y `:326` y `lib/activacion.ts:14`. Hay un solo `$queryRaw` fuera de scripts: `PrismaTurnoRepository.ts:108`.
- Dos transacciones llevan límite de tiempo de Prisma: `timeout: 20000` en `pagos/actions.ts:207` y `timeout: 15000` en `lib/activacion.ts:25`. La configuración de `db.transaction` de Drizzle admite `isolationLevel`, `accessMode` y `deferrable`, pero no un tiempo límite (verificado con `grep` en `pg-core/session.d.ts`).
- `lib/activacion.ts:9-11` y `:27-31`: si dos peticiones activan la misma cédula a la vez, la unicidad `(organizacionId, cedula)` hace fallar a la segunda, que se captura, se relee el miembro existente y se devuelve ese. La rama sin deudas de `pagos/actions.ts:209` llama a `registrarPago` sin transacción.
- 10 repositorios usan `include` o `select` (verificado con `grep -c "include:|select:"`): MiembroReferencia, CheckIn, Pago (5), DeudaProducto, Entrenador, Turno, Vitrina (4), Sucursal, Member (5) y UsuarioAdmin.
- El esquema tiene 2 campos `Json` (`schema.prisma:646` y `:663`) y 2 arreglos `String[]` con `@default([])` (`:48` y `:638`); el comparador y el esquema de Drizzle deben mapearlos a `jsonb` y a arreglos de texto con valor predeterminado vacío.
- Más menciones de `prisma` fuera de los repositorios: `apps/web-admin/package.json:17` (`@prisma/adapter-pg`), comentarios en `apps/web-admin/next.config.ts:11` y `apps/kiosk/next.config.ts:7`, 6 comentarios en `packages/domain` (incluido `CambiarPlanConPago.test.ts:18`), `.dockerignore:10` y `.gitignore:47-48` (verificado con `grep -n -i prisma`).
- `drizzle-orm@0.45.4` declara `@prisma/client` y `prisma` como `peerDependencies` opcionales (verificado con `npm view drizzle-orm@0.45.4 peerDependencies peerDependenciesMeta`); al instalarlo en un directorio aparte, el `package-lock.json` resultante contiene la cadena `prisma` 3 veces (verificado con `grep -ci prisma package-lock.json`) aunque ningún paquete de Prisma se instala.
- Ningún archivo del Repo A captura códigos de error de Prisma (`P2002`, `P2025`, `PrismaClientKnownRequestError`): verificado con `grep -rIn -E "P2002|P2025|P2003|PrismaClientKnownRequestError" apps packages` (0 resultados fuera de los scripts de `packages/db`).
- `Dockerfile:32` ejecuta `npx prisma generate`; `Dockerfile:63-64` copia `node_modules` y `packages/db` a `migrate-toolkit`; `docker-entrypoint.sh:11` ejecuta `prisma migrate deploy`; `packages/db/package.json:6-8` define `generate`, `migrate:dev` y `db:seed`; `packages/db/prisma7.config.ts:13` referencia el seed.
- `.github/workflows/verificar-vitrina.yml:27-28` genera el cliente de Prisma; S-00 excluye ese workflow.
- Hechos sobre las versiones fijadas de Drizzle (verificado con `grep` sobre los `.d.ts` y `.js` de `drizzle-orm@0.45.4`, `drizzle-kit@0.31.11` y `pg@8.23.0`, instalados el 2026-11-12 en un directorio aparte): la columna `numeric` entrega `string` por defecto y ofrece los modos `number` y `bigint`; `date()` entrega `string` por defecto y `Date` con el modo `date`; `timestamp()` entrega `Date` por defecto; `db.transaction` recibe solo una función asíncrona (no admite la forma de arreglo) y acepta `isolationLevel`; `drizzle-kit` ofrece `generate`, `migrate`, `push`, `check`, `drop`, `studio` y `up`; el adaptador de `node-postgres` trae `migrator`.
- Cómo se comporta `db.transaction` frente a `$transaction` ante errores y concurrencia real, y cómo se comportan las claves foráneas por defecto de `drizzle-kit push` frente a las de Prisma: no verificado (lo fijan las pruebas de esta spec).

### 0.5 Supuestos
- SUP-S22-001: las tablas, columnas y enums conservan exactamente los nombres de `schema.prisma`, para poder comparar las dos bases. Default: nombres idénticos (S-05, S-08 y S-10 los cambian después); asumido, por validar.
- SUP-S22-002: los 5 repositorios de modelos condenados llevan solo pruebas de humo, no suite de contrato, porque desaparecen en las specs siguientes. Default: solo humo; asumido, por validar.
- SUP-S22-003: los identificadores `cuid()` y `uuid()` pasan a generarse en la aplicación con `crypto.randomUUID()` (sin dependencia nueva); el formato del identificador cambia y no hay datos que conservar. Ninguna parte del código depende del formato (no verificado). Default: `crypto.randomUUID()`; asumido, por validar.
- SUP-S22-004: no se fija nivel de aislamiento: se usa el predeterminado de PostgreSQL, que es el que se supone que usaba Prisma (no verificado). Default: predeterminado; asumido, por validar.
- SUP-S22-005: las consultas con `include` o `select` se reescriben con la API relacional de Drizzle o con uniones, a elección en cada repositorio; el contrato valida el resultado. Default: la opción que deje menos código; asumido, por validar.
- SUP-S22-006: los dos scripts de `web-admin/scripts` y la ruta `tasa-cambio/historial` se portan aunque S-10 los retire después, para que ningún archivo del árbol importe Prisma. Default: se portan; asumido, por validar.
- SUP-S22-007: mientras no exista baseline (S-15), `docker-entrypoint.sh` no aplica migraciones y la creación del esquema ocurre solo en Compose y en las pruebas, con `drizzle-kit push`. Default: ese arranque; asumido, por validar.
- SUP-S22-008: `@types/pg` pasa a dependencia de desarrollo con la versión que ya figura en el lockfile (hoy transitiva). Default: esa versión exacta; asumido, por validar.
- SUP-S22-009: la comparación estructural mira tablas, columnas, tipos, nulabilidad, valores predeterminados de base, unicidades, índices, claves foráneas con sus acciones y valores de enums; no compara los nombres de las restricciones. Default: ese conjunto; asumido, por validar.
- SUP-S22-010: la creación del esquema en Compose la hace un servicio de un solo uso (`esquema`) que corre `drizzle-kit push` en una imagen de Node con el repositorio montado, y `web-admin` espera a que termine; la imagen `runner` no lleva `drizzle-kit`. Default: ese servicio; asumido, por validar.
- SUP-S22-011: `date()` se declara en modo `date` (entrega `Date`, como Prisma para `@db.Date`) y `timestamp` con precisión 3 y sin zona, como el `timestamp(3)` de Prisma (no verificado contra una base creada). Default: esos modos; asumido, por validar.
- SUP-S22-012: el `Pool` usa los valores por defecto de `pg` (`max` 10) y el SSL que indique `DATABASE_URL`, igual que el adaptador de Prisma (no verificado). Default: esos valores; asumido, por validar.
- SUP-S22-013: ADR-003 sigue *propuesto*; el repositorio de TasaCambio se trata como condenado. Si ADR-003 no se acepta, TasaCambio sobrevive y S-22 se enmienda para darle suite de contrato completa. Default: tratarlo como condenado; asumido, por validar.
- SUP-S22-014: S-22 se aparta de dos puntos de ADR-022: conserva los montos como número (ADR-022 §6 habla de céntimos; eso es S-03) y no define la aplicación de migraciones al arrancar el contenedor (ADR-022 §4 la fijaba en S-22; sin baseline no hay migraciones y se difiere a S-15 y S-17). Default: las dos desviaciones; asumido, por validar, pendiente de confirmación del propietario.
- SUP-S22-015: `pg` y `@types/pg` pasan a dependencias de desarrollo exactas del `package.json` de la raíz para que las herramientas de `tools/` (comparador y pruebas) lo resuelvan; es una excepción a «herramientas sin dependencias» de ADR-016 §8, justificada en 5.3. Default: esa excepción; asumido, por validar.

## 1. Requisitos

### REQ-S22-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El sistema deberá acceder a PostgreSQL únicamente con Drizzle ORM sobre el cliente pg en todo el código de aplicación y de infraestructura.

### REQ-S22-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El sistema deberá declarar en TypeScript, en packages/db/src/schema/, las 25 tablas y los 14 enums del esquema heredado con los mismos nombres y tipos, incluidos jsonb y los arreglos de texto con valor predeterminado vacío.

### REQ-S22-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: La herramienta tools/comparar-esquemas.mjs deberá terminar con código distinto de cero cuando dos bases PostgreSQL difieren en tablas, columnas, tipos, nulabilidad, valores predeterminados de base, unicidades, índices, claves foráneas con sus acciones o valores de enums.

### REQ-S22-004
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando se inserta una fila sin indicar su identificador o su apiKey, el sistema deberá asignar un valor textual único generado por la aplicación en las 24 columnas que hoy dependen de cuid() o uuid().

### REQ-S22-005
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando se inserta o se actualiza una fila de VitrinaItem, el sistema deberá escribir la hora actual en su columna updatedAt.

### REQ-S22-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El sistema deberá exponer un tipo ClienteOTransaccion que permita construir cada repositorio con el cliente global o con el cliente de una transacción.

### REQ-S22-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El sistema deberá implementar con Drizzle los 22 repositorios, en packages/infrastructure/persistence/drizzle/, y KioskTokenValidator, contra los mismos puertos del dominio.

### REQ-S22-008
- tipo: mientras
- prioridad: MUST
- origen: ADR-016
- texto: Mientras la implementación de Prisma siga en el árbol, durante los pasos 1 a 4 del plan 5.1, el sistema deberá ejecutar cada suite de contrato contra la implementación de Prisma o la de Drizzle según la variable ADHARA_ORM.

### REQ-S22-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El sistema deberá incluir una prueba de humo que cree y lea una fila por cada uno de los 5 repositorios de Turno, Arqueo, Egreso, DeudaProducto y TasaCambio.

### REQ-S22-010
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando un repositorio lee una de las 23 columnas numeric, el sistema deberá entregar al dominio el mismo número que entregaba toNumber() de Prisma.

### REQ-S22-011
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando un repositorio escribe y vuelve a leer un instante o una fecha de calendario, el sistema deberá devolver el mismo valor al milisegundo con TZ=UTC y con TZ=America/Lima.

### REQ-S22-012
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando falla cualquier paso dentro de una transacción, el sistema deberá dejar la base sin ninguna de las escrituras de esa transacción.

### REQ-S22-013
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando dos cobros del mismo miembro se confirman a la vez, el sistema deberá terminar en un estado final de la clase A, B o C definida en BEH-S22-005.

### REQ-S22-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El código fuente no deberá contener llamadas a sql.raw.

### REQ-S22-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: Los directorios apps y packages, los package.json, el Dockerfile, docker-compose.yml, docker-entrypoint.sh, turbo.json, .dockerignore, .gitignore y el directorio .github no deberán contener la cadena prisma, sin distinguir mayúsculas, excluidos node_modules, .next y tsconfig.tsbuildinfo, al terminar la spec.

### REQ-S22-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando docker compose inicia con una base de datos vacía, el servicio de un solo uso esquema deberá crear las 25 tablas con drizzle-kit push antes de que arranque web-admin.

### REQ-S22-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El Dockerfile y el docker-entrypoint.sh no deberán invocar ninguna orden de generación de cliente ni de migración.

### REQ-S22-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El comando tsc --noEmit de web-admin deberá terminar con un máximo de 1 error, el heredado de LayoutProps.

### REQ-S22-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El sistema deberá conservar las 390 pruebas de dominio, las 45 de kiosk y las 65 de vitrina en verde, igual que la línea base.

### REQ-S22-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El sistema deberá reutilizar un único Pool de pg por proceso, también con recarga en caliente en desarrollo.

### REQ-S22-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El sistema deberá fijar drizzle-orm en 0.45.4, drizzle-kit en 0.31.11 y pg en 8.23.0 sin prefijo de rango.

### REQ-S22-022
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si DATABASE_URL está ausente o su host no es localhost, 127.0.0.1 ni el servicio postgres, entonces los scripts que invocan drizzle-kit deberán abortar antes de conectar.

### REQ-S22-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-001
- texto: El código de packages/domain no deberá importar drizzle-orm, pg ni @gym-app/db.

### REQ-S22-024
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando una transacción supera su tiempo límite, que es de 20 segundos en el cobro con deudas y de 15 segundos en la activación de miembros, el sistema deberá cancelarla y revertir sus escrituras.

### REQ-S22-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-001
- texto: Los cambios de S-22 en packages/domain no deberán alterar código ejecutable, solo comentarios.

### REQ-S22-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El sistema deberá completar npm ci, la compilación y la comprobación de tipos desde un clon limpio sin ejecutar ningún paso de generación de cliente.

### REQ-S22-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El lockfile no deberá contener ningún paquete cuya ruta incluya prisma.

### REQ-S22-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Al terminar la spec, las suites de contrato deberán ejecutarse únicamente contra Drizzle y permanecer en el CI.

### REQ-S22-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El script tools/verificar-repo.mjs deberá fallar si packages/db contiene un archivo distinto de package.json, drizzle.config.ts o los de src/.

### REQ-S22-030
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando dos activaciones del mismo documento se ejecutan a la vez, el sistema deberá devolver el mismo miembro a ambas y dejar una sola fila.

## 2. Comportamiento

### BEH-S22-001
- cubre: REQ-S22-007, REQ-S22-008
- categoria: feliz
- dado: una base efímera vacía con el esquema creado y la implementación elegida con ADHARA_ORM
- cuando: la suite de contrato del repositorio de miembros crea un miembro con su suscripción, lo busca por documento y lista los miembros activos
- entonces: el repositorio devuelve las mismas entidades de dominio, campo por campo, con ADHARA_ORM=prisma y con ADHARA_ORM=drizzle

### BEH-S22-002
- cubre: REQ-S22-010
- categoria: borde
- dado: columnas numeric(10,2), numeric(14,2) y numeric(12,4), una de ellas anulable
- cuando: se escriben y leen 0.00, 0.01, 1234.56 y 99999999.99 en (10,2), 999999999999.99 y -50.25 en (14,2), 1234.5678 en (12,4) y null en la columna anulable
- entonces: el dominio recibe cada valor como number idéntico (null como null), sin cadenas ni pérdida de decimales

### BEH-S22-003
- cubre: REQ-S22-011
- categoria: borde
- dado: un instante 2026-11-12T03:30:00.123Z, una fecha de calendario 2028-02-29 y el proceso con TZ=America/Lima y luego con TZ=UTC
- cuando: cada valor se escribe y se lee
- entonces: el instante vuelve idéntico al milisegundo y la fecha vuelve como 2028-02-29 en ambas zonas, sin desplazarse un día

### BEH-S22-004
- cubre: REQ-S22-012
- categoria: error
- dado: una transacción que inserta un pago válido y después una suscripción con una clave foránea inexistente
- cuando: la segunda inserción falla
- entonces: la transacción se revierte, el pago no existe en la base y el error llega al llamador

### BEH-S22-005
- cubre: REQ-S22-013
- categoria: concurrencia
- dado: un miembro con suscripción vigente y 200 ejecuciones de dos cobros simultáneos del mismo plan
- cuando: cada ejecución confirma los dos cobros en paralelo y se clasifica el estado final
- entonces: todo estado final cae en la clase A (2 pagos y vencimiento base más los dos períodos), B (2 pagos y vencimiento base más un período) o C (1 pago y el otro cobro rechazado con error); cualquier otro estado es un fallo

### BEH-S22-006
- cubre: REQ-S22-004
- categoria: concurrencia
- dado: una tabla con identificador generado por la aplicación y 200 inserciones lanzadas en paralelo
- cuando: todas terminan
- entonces: hay 200 filas con 200 identificadores distintos y ninguna falla por clave duplicada

### BEH-S22-007
- cubre: REQ-S22-005
- categoria: feliz
- dado: una fila de VitrinaItem con updatedAt registrado
- cuando: se actualiza su título
- entonces: updatedAt es posterior al valor anterior y createdAt no cambia

### BEH-S22-008
- cubre: REQ-S22-016
- categoria: feliz
- dado: un volumen de PostgreSQL vacío
- cuando: una persona ejecuta docker compose up
- entonces: el servicio esquema termina con éxito, la base queda con 25 tablas y solo entonces web-admin responde a su comprobación de salud

### BEH-S22-009
- cubre: REQ-S22-022
- categoria: error
- dado: DATABASE_URL con un host ajeno al local
- cuando: se ejecuta el script que invoca drizzle-kit push
- entonces: el script aborta con un error explícito antes de abrir conexión

### BEH-S22-010
- cubre: REQ-S22-014
- categoria: error
- dado: un archivo de prueba con una llamada a sql.raw
- cuando: se ejecuta la búsqueda automatizada
- entonces: la búsqueda falla y nombra el archivo y la línea

### BEH-S22-011
- cubre: REQ-S22-003
- categoria: error
- dado: dos bases que difieren solo en que una columna es nullable en una y no en la otra
- cuando: se ejecuta tools/comparar-esquemas.mjs
- entonces: la herramienta termina con código distinto de cero e imprime tabla, columna y la diferencia

### BEH-S22-012
- cubre: REQ-S22-002, REQ-S22-003
- categoria: feliz
- dado: una base creada con prisma db push y otra con drizzle-kit push desde el esquema nuevo
- cuando: se ejecuta tools/comparar-esquemas.mjs
- entonces: la herramienta termina con código 0 y declara 0 diferencias en 25 tablas y 14 enums

### BEH-S22-013
- cubre: REQ-S22-018, REQ-S22-019
- categoria: feliz
- dado: el árbol sin Prisma y sin cliente generado
- cuando: se ejecutan el typecheck de web-admin y las pruebas de dominio, kiosk y vitrina
- entonces: web-admin reporta como máximo 1 error y las 390, 45 y 65 pruebas pasan

### BEH-S22-014
- cubre: REQ-S22-015
- categoria: borde
- dado: un archivo en apps con la palabra PRISMA en mayúsculas dentro de un comentario y otro en docs con la palabra prisma
- cuando: se ejecuta la búsqueda de REQ-S22-015
- entonces: la búsqueda reporta solo el archivo de apps y no el de docs

### BEH-S22-015
- cubre: REQ-S22-020
- categoria: feliz
- dado: un módulo que crea el Pool y se importa 3 veces con recarga en caliente simulada
- cuando: se piden 3 clientes
- entonces: los 3 comparten la misma instancia del Pool

### BEH-S22-016
- cubre: REQ-S22-009
- categoria: feliz
- dado: una base efímera con el esquema creado
- cuando: la prueba de humo de cada uno de los 5 repositorios crea una fila y la lee
- entonces: la fila leída coincide con la creada

### BEH-S22-017
- cubre: REQ-S22-017
- categoria: feliz
- dado: la imagen del contenedor construida desde el Dockerfile final y una base ya creada
- cuando: el contenedor arranca con docker-entrypoint.sh
- entonces: web-admin inicia sin ejecutar ninguna orden de generación ni de migración

### BEH-S22-018
- cubre: REQ-S22-021
- categoria: error
- dado: un package.json que declara drizzle-orm con el rango ^0.45.4
- cuando: se ejecuta la comprobación de versiones fijadas
- entonces: la comprobación falla y nombra el archivo y la dependencia

### BEH-S22-019
- cubre: REQ-S22-023
- categoria: error
- dado: un archivo de packages/domain que importa drizzle-orm
- cuando: se ejecuta la búsqueda de importaciones prohibidas
- entonces: la búsqueda falla y nombra el archivo y la línea

### BEH-S22-020
- cubre: REQ-S22-001, REQ-S22-006
- categoria: feliz
- dado: un repositorio construido con el cliente global y otro con el cliente de una transacción abierta
- cuando: ambos ejecutan una escritura y una lectura
- entonces: los dos usan el mismo código de repositorio y el acceso a PostgreSQL pasa solo por Drizzle sobre pg

### BEH-S22-021
- cubre: REQ-S22-024
- categoria: error
- dado: una transacción que escribe una fila y luego ejecuta una espera de 2 segundos, con un límite de 500 ms
- cuando: se supera el límite
- entonces: el envoltorio lanza un error de tiempo límite y la fila escrita no existe en la base

### BEH-S22-022
- cubre: REQ-S22-030
- categoria: concurrencia
- dado: una cédula sin miembro y 2 activaciones simultáneas de esa cédula
- cuando: ambas terminan
- entonces: existe una sola fila de miembro y las dos llamadas devuelven el mismo miembro

### BEH-S22-023
- cubre: REQ-S22-029
- categoria: error
- dado: un árbol con la carpeta packages/db/prisma
- cuando: se ejecuta tools/verificar-repo.mjs
- entonces: la verificación falla y nombra la ruta

### BEH-S22-024
- cubre: REQ-S22-027
- categoria: borde
- dado: un lockfile cuya entrada de drizzle-orm declara prisma solo en sus peerDependencies opcionales, y otro con la entrada node_modules/prisma
- cuando: se ejecuta la comprobación del lockfile
- entonces: pasa con el primero y falla con el segundo

### BEH-S22-025
- cubre: REQ-S22-025
- categoria: borde
- dado: un diff de packages/domain que solo cambia líneas de comentario y otro que cambia una línea ejecutable
- cuando: se ejecuta la comprobación de código ejecutable
- entonces: pasa con el primero y falla con el segundo

### BEH-S22-026
- cubre: REQ-S22-028
- categoria: feliz
- dado: el árbol final sin la implementación de Prisma
- cuando: el CI ejecuta las suites de contrato
- entonces: las 17 suites corren contra Drizzle sin leer ADHARA_ORM y pasan

### BEH-S22-027
- cubre: REQ-S22-026
- categoria: feliz
- dado: un clon limpio del árbol final
- cuando: se ejecutan npm ci, la compilación de web-admin y tsc --noEmit
- entonces: los tres terminan sin ejecutar ninguna orden de generación de cliente

## 3. Invariantes

### INV-S22-001
- propiedad: el esquema de Drizzle y el de Prisma producen la misma estructura de base de datos mientras ambos coexisten
- mecanismo: test-propiedad
- deteccion: tools/comparar-esquemas.mjs sobre una base de cada ORM termina con código distinto de cero
- protege: REQ-S22-002, REQ-S22-003

### INV-S22-002
- propiedad: ningún archivo de los listados en REQ-S22-015 ni ningún paquete del lockfile contiene prisma al terminar la spec
- mecanismo: lint
- deteccion: tools/verificar-drizzle.mjs devuelve al menos un archivo o una ruta de lockfile con prisma
- protege: REQ-S22-015, REQ-S22-027

### INV-S22-003
- propiedad: ninguna llamada a sql.raw existe en el código fuente
- mecanismo: lint
- deteccion: la búsqueda automatizada de sql.raw devuelve al menos una coincidencia
- protege: REQ-S22-014

### INV-S22-004
- propiedad: una transacción confirma todas sus escrituras o ninguna
- mecanismo: transaccion
- deteccion: la prueba de reversión deja filas en la base tras forzar un fallo a mitad de la transacción
- protege: REQ-S22-012

### INV-S22-005
- propiedad: packages/domain no depende de drizzle-orm, pg ni @gym-app/db
- mecanismo: lint
- deteccion: la búsqueda de importaciones prohibidas en packages/domain devuelve una coincidencia
- protege: REQ-S22-023

### INV-S22-006
- propiedad: toda fila tiene identificador no nulo y único
- mecanismo: restriccion-bd
- deteccion: una inserción duplicada o sin identificador falla con violación de la clave primaria
- protege: REQ-S22-004

## 4. Criterios de aceptación

### AC-S22-001
- enlaza: REQ-S22-001, REQ-S22-002, REQ-S22-003, BEH-S22-012, INV-S22-001
- metodo: integracion
- procedimiento: (válido hasta el paso 4 de 5.1) con dos bases efímeras vacías, crear la primera con prisma db push desde schema.prisma y la segunda con drizzle-kit push desde packages/db/src/schema/, y ejecutar tools/comparar-esquemas.mjs contra ambas
- esperado: código de salida 0 y el informe declara 0 diferencias en 25 tablas y 14 enums
- test: pendiente

### AC-S22-002
- enlaza: REQ-S22-003, BEH-S22-011
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/comparar-esquemas.mjs con un cliente simulado que devuelve dos catálogos que difieren en la nulabilidad de una columna, en un valor de enum, en una acción de clave foránea y en un índice
- esperado: la herramienta termina con código distinto de cero en los cuatro casos y nombra la tabla y la diferencia; con catálogos iguales termina con código 0
- test: pendiente

### AC-S22-003
- enlaza: REQ-S22-007, REQ-S22-008, BEH-S22-001
- metodo: integracion
- procedimiento: (válido hasta el paso 4 de 5.1) ejecutar las suites de contrato de los 17 repositorios con ADHARA_ORM=prisma y luego con ADHARA_ORM=drizzle sobre una base efímera cada vez
- esperado: las dos ejecuciones pasan con el mismo número de pruebas y ninguna se omite
- test: pendiente

### AC-S22-004
- enlaza: REQ-S22-009, BEH-S22-016
- metodo: integracion
- procedimiento: ejecutar las 5 pruebas de humo contra la implementación de Drizzle sobre una base efímera
- esperado: las 5 pasan
- test: pendiente

### AC-S22-005
- enlaza: REQ-S22-010, BEH-S22-002
- metodo: integracion
- procedimiento: escribir y leer con la implementación de Drizzle 0.00, 0.01, 1234.56 y 99999999.99 en numeric(10,2), 999999999999.99 y -50.25 en numeric(14,2), 1234.5678 en numeric(12,4) y null en una columna anulable
- esperado: cada lectura es un number igual al valor escrito (null como null) y ninguna es string
- test: pendiente

### AC-S22-006
- enlaza: REQ-S22-011, BEH-S22-003
- metodo: integracion
- procedimiento: ejecutar la prueba de instantes y fechas dos veces, con TZ=UTC y con TZ=America/Lima, con 2026-11-12T03:30:00.123Z y 2028-02-29
- esperado: en las dos ejecuciones el instante vuelve idéntico al milisegundo y la fecha vuelve como 2028-02-29
- test: pendiente

### AC-S22-007
- enlaza: REQ-S22-012, BEH-S22-004, INV-S22-004
- metodo: integracion
- procedimiento: abrir una transacción con db.transaction, insertar un pago y luego una suscripción con clave foránea inexistente
- esperado: tras el error no existe el pago en la base y el error llega al llamador
- test: pendiente

### AC-S22-028
- enlaza: REQ-S22-012, INV-S22-004
- metodo: integracion
- procedimiento: para cada uno de los cuatro repositorios con transacción de forma arreglo convertida (Permiso, UsuarioSucursal, UsuarioAdmin y TasaCambio), ejecutar la operación con un último paso que viola una restricción
- esperado: en los cuatro casos no queda ninguna escritura de la operación y el error llega al llamador
- test: pendiente

### AC-S22-008
- enlaza: REQ-S22-013, BEH-S22-005
- metodo: integracion
- procedimiento: (válido hasta el paso 4 de 5.1) ejecutar 200 veces dos cobros simultáneos del mismo miembro y plan contra Prisma y 200 veces contra Drizzle, y clasificar cada estado final en la clase A, B, C u otra según BEH-S22-005
- esperado: las 200 ejecuciones de Drizzle caen en las clases A, B o C; las de Prisma también (si alguna cae en otra, se registra como hallazgo para S-04 y no bloquea esta spec)
- test: pendiente

### AC-S22-009
- enlaza: REQ-S22-004, BEH-S22-006, INV-S22-006
- metodo: integracion
- procedimiento: lanzar 200 inserciones paralelas en una tabla con identificador generado por la aplicación y contar las filas y los identificadores distintos; intentar insertar una fila con identificador repetido
- esperado: 200 filas con 200 identificadores distintos y la inserción repetida falla por clave primaria
- test: pendiente

### AC-S22-010
- enlaza: REQ-S22-005, BEH-S22-007
- metodo: integracion
- procedimiento: insertar un VitrinaItem y comprobar que updatedAt no es nulo, leerlo, esperar 10 ms, actualizar el título y leer de nuevo
- esperado: el nuevo updatedAt es posterior al anterior y createdAt es igual
- test: pendiente

### AC-S22-011
- enlaza: REQ-S22-014, BEH-S22-010, INV-S22-003
- metodo: unitario
- procedimiento: ejecutar la búsqueda automatizada sobre dos árboles de prueba, uno limpio y otro con una llamada a sql.raw en un archivo
- esperado: sale con código 0 en el limpio y con código distinto de cero en el otro, nombrando archivo y línea
- test: pendiente

### AC-S22-012
- enlaza: REQ-S22-015, BEH-S22-014, INV-S22-002
- metodo: unitario
- procedimiento: ejecutar la comprobación de la cadena prisma de tools/verificar-drizzle.mjs sobre el árbol final y sobre el árbol de prueba de BEH-S22-014
- esperado: 0 archivos en el árbol final; en el árbol de prueba reporta el archivo de apps y no el de docs
- test: pendiente

### AC-S22-013
- enlaza: REQ-S22-023, BEH-S22-019, INV-S22-005
- metodo: unitario
- procedimiento: ejecutar la búsqueda de importaciones prohibidas sobre packages/domain en un árbol limpio y en otro con import desde drizzle-orm
- esperado: código 0 en el limpio y código distinto de cero con el nombre del archivo en el otro
- test: pendiente

### AC-S22-014
- enlaza: REQ-S22-016, BEH-S22-008
- metodo: e2e
- procedimiento: partiendo de un volumen vacío, ejecutar docker compose up, esperar a que el servicio esquema termine, esperar la comprobación de salud de web-admin y contar las tablas del esquema public
- esperado: esquema termina con código 0, la comprobación de salud pasa y existen 25 tablas
- test: pendiente

### AC-S22-015
- enlaza: REQ-S22-017, BEH-S22-017
- metodo: unitario
- procedimiento: buscar en Dockerfile y docker-entrypoint.sh las cadenas generate, migrate, prisma y drizzle-kit
- esperado: 0 coincidencias
- test: pendiente

### AC-S22-016
- enlaza: REQ-S22-018, REQ-S22-019, BEH-S22-013
- metodo: integracion
- procedimiento: con el árbol final y sin ejecutar ningún paso de generación, ejecutar tsc --noEmit en web-admin y las pruebas de packages/domain, apps/kiosk y apps/vitrina
- esperado: web-admin informa como máximo 1 error, el de LayoutProps, y pasan 390, 45 y 65 pruebas
- test: pendiente

### AC-S22-017
- enlaza: REQ-S22-020, BEH-S22-015
- metodo: unitario
- procedimiento: importar 3 veces el módulo que crea el Pool con recarga en caliente simulada y comparar las instancias
- esperado: las 3 referencias son idénticas
- test: pendiente

### AC-S22-018
- enlaza: REQ-S22-021, BEH-S22-018
- metodo: unitario
- procedimiento: leer los package.json y el lockfile y comprobar las versiones de drizzle-orm, drizzle-kit y pg
- esperado: 0.45.4, 0.31.11 y 8.23.0 sin prefijo ^ ni ~
- test: pendiente

### AC-S22-019
- enlaza: REQ-S22-022, BEH-S22-009
- metodo: unitario
- procedimiento: invocar el script de drizzle-kit con DATABASE_URL ausente, vacía y con un host ajeno, y con un host válido y un cliente simulado
- esperado: aborta antes de conectar en los tres primeros casos y continúa en el último
- test: pendiente

### AC-S22-020
- enlaza: REQ-S22-001, REQ-S22-006, REQ-S22-007, BEH-S22-020
- metodo: integracion
- procedimiento: construir cada repositorio con el cliente global y con el cliente de una transacción abierta, ejecutar una escritura y una lectura en cada forma
- esperado: ambas formas funcionan con el mismo código de repositorio y la escritura de la transacción es visible solo tras confirmar
- test: pendiente

### AC-S22-021
- enlaza: REQ-S22-024, BEH-S22-021
- metodo: integracion
- procedimiento: ejecutar una transacción con el envoltorio, límite de 500 ms, una escritura y una espera de 2 segundos; además comprobar con una prueba unitaria que las constantes de cobro con deudas y de activación valen 20000 y 15000 ms
- esperado: error de tiempo límite, la fila escrita no existe y las constantes valen 20000 y 15000
- test: pendiente

### AC-S22-022
- enlaza: REQ-S22-030, BEH-S22-022
- metodo: integracion
- procedimiento: lanzar con Promise.all dos activaciones de la misma cédula sobre una base efímera
- esperado: una sola fila de miembro y las dos llamadas devuelven el mismo identificador
- test: pendiente

### AC-S22-023
- enlaza: REQ-S22-029, BEH-S22-023
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-repo.mjs con un árbol que contiene packages/db/prisma y otro que solo contiene package.json, drizzle.config.ts y src/
- esperado: el primero falla nombrando packages/db/prisma y el segundo pasa
- test: pendiente

### AC-S22-024
- enlaza: REQ-S22-027, BEH-S22-024, INV-S22-002
- metodo: unitario
- procedimiento: ejecutar la comprobación del lockfile de tools/verificar-drizzle.mjs con un lockfile que declara prisma solo en peerDependencies de drizzle-orm y con otro que contiene la entrada node_modules/prisma
- esperado: pasa con el primero y falla con el segundo nombrando la ruta
- test: pendiente

### AC-S22-025
- enlaza: REQ-S22-025, BEH-S22-025
- metodo: unitario
- procedimiento: ejecutar la comprobación de código ejecutable de tools/verificar-drizzle.mjs sobre un diff de packages/domain que cambia solo comentarios y sobre otro que cambia una línea ejecutable; después ejecutarla sobre el diff real de la spec
- esperado: pasa con el primero, falla con el segundo y pasa con el diff real
- test: pendiente

### AC-S22-026
- enlaza: REQ-S22-028, BEH-S22-026
- metodo: integracion
- procedimiento: con el árbol final, ejecutar en el CI las 17 suites de contrato sin definir ADHARA_ORM
- esperado: las 17 suites pasan contra Drizzle y ninguna lee la variable
- test: pendiente

### AC-S22-027
- enlaza: REQ-S22-026, BEH-S22-027
- metodo: integracion
- procedimiento: desde un clon limpio ejecutar npm ci, la compilación de web-admin y tsc --noEmit, y buscar en los package.json un script generate
- esperado: los tres comandos terminan sin ejecutar ninguna generación de cliente y no existe ningún script generate
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden de trabajo, con un commit por paso (ADR-016 §1, pruebas primero): (0) `tools/verificar-drizzle.mjs` y la ampliación de `tools/verificar-repo.mjs`, con sus pruebas; (1) suites de contrato y pruebas de humo contra Prisma, en verde, con el helper de base efímera de S-00 (REQ-S00-014 y REQ-S00-019); (2) esquema Drizzle y `tools/comparar-esquemas.mjs` con su paridad contra la base de Prisma; (3) repositorios de Drizzle, uno por commit, de menos a más SQL y transacciones, con su suite en verde bajo `ADHARA_ORM=drizzle`; (4) `web-admin`: `lib/`, acciones, rutas, páginas y scripts, y `KioskTokenValidator`; (5) retiro de Prisma, `Dockerfile`, `docker-entrypoint.sh`, Compose y CI. Las suites de contrato se conservan en el CI solo contra Drizzle (REQ-S22-028). El retiro es el último paso porque quita `ADHARA_ORM=prisma` y el comparador deja de ejecutarse contra Prisma.
- Las suites de contrato se escriben contra el puerto del dominio (no contra la clase concreta) y parten de una fábrica por implementación.
- La prueba de concurrencia (AC-S22-008) clasifica cada estado final en tres clases definidas por regla (BEH-S22-005), no por muestreo; si Prisma produce un estado fuera de esas clases o una actualización perdida (clase B), se anota como hallazgo para S-04 y no se corrige aquí.
- Dependencias nuevas, justificadas en 5.3: `drizzle-orm`, `drizzle-kit` (desarrollo), `pg` (de desarrollo, en S-00, pasa a dependencia de ejecución) y `@types/pg` (desarrollo, SUP-S22-008).
- Los criterios e2e (AC-S22-014) los ejecuta el propietario o el CI con Docker.

### 5.2 Migración
- No hay datos que migrar ni migraciones que traducir (SUP-S00-002). El baseline se genera una sola vez en S-15.
- Enmienda de S-00, que permanece aprobada y la registra al aprobarse S-22: (a) SUP-S00-002 y SUP-S00-010 y REQ-S00-017 pasan de `prisma db push` a `drizzle-kit push` en un servicio `esquema` de Compose; (b) AC-S00-008 y AC-S00-022, que asumen esa creación del esquema, se ejecutan con el servicio nuevo; (c) la lista de permitidos de `packages/db` de S-00 §0.2 (`package.json`, `prisma/schema.prisma`, `prisma7.config.ts`, `prisma7.local.config.ts`), la regla de REQ-S00-003 y la lista del informe de importación (REQ-S00-028) pasan a `package.json`, `drizzle.config.ts` y `src/`; `tools/verificar-repo.mjs` lo implementa (REQ-S22-029).
- Reversión: antes del primer push la rama se descarta con `git reset` del propietario; después, cada paso del plan 5.1 es un commit independiente que se puede revertir en orden inverso.

### 5.3 Riesgos
- Los 22 repositorios se reescriben con pruebas nuevas; las suites de contrato pueden fijar como correcto un comportamiento erróneo de Prisma. Mitigación: la spec no corrige comportamiento; los hallazgos se anotan en la spec dueña del área.
- Las claves foráneas por defecto de `drizzle-kit push` pueden diferir de las de Prisma (solo 2 de 60 relaciones tienen `onDelete` explícito). Mitigación: el comparador compara acciones de clave foránea (REQ-S22-003).
- `pg` interpreta `timestamp` sin zona en la zona del proceso; Drizzle lo reconvierte en su adaptador (verificado en `drizzle-orm/node-postgres/session.js`), pero el efecto real se fija con REQ-S22-011 y no con la lectura del código.
- `numeric` llega como `string` por defecto: el esquema declara el modo `number` para conservar el contrato del dominio (REQ-S22-010); S-03 pasa después a céntimos.
- La forma de arreglo de `$transaction` no existe en Drizzle: se convierte a `db.transaction` (3 usos). Mitigación: AC-S22-007.
- `drizzle-orm` es 0.x y puede cambiar entre menores: versiones exactas (REQ-S22-021) y revisión de la versión al arrancar cada spec.
- Cambio del formato del identificador (SUP-S22-003): si algún código lo supone, falla una prueba de contrato.
- Se portan modelos que luego se eliminan; el costo está acotado a pruebas de humo (SUP-S22-002) y al esquema.
- **Alcance:** el cambio toca unos 75 archivos de `web-admin` además de los repositorios; se acota con el renombrado mecánico y el typecheck (REQ-S22-018) y con la búsqueda de REQ-S22-015.
- Límites de tiempo de transacción: `db.transaction` no los tiene; el envoltorio propio puede dejar consultas en vuelo tras el límite. Mitigación: AC-S22-021 y que el envoltorio revierta al lanzar.
- `drizzle-kit push` sobre una base con datos puede borrar columnas: REQ-S22-022 limita el uso a bases locales y el servicio `esquema` solo se usa con volúmenes desechables.
- `drizzle-orm` declara `@prisma/client` y `prisma` como peerDependencies opcionales y npm los escribe en el lockfile: por eso REQ-S22-027 mira las rutas de paquetes y no el texto.
- Dependencias nuevas y justificación: `drizzle-orm` y `drizzle-kit` son el ORM decidido en ADR-022; `pg` es el cliente que exige Drizzle sobre PostgreSQL; `@types/pg` es solo de tipos; los dos últimos son además dependencias de desarrollo del `package.json` de la raíz para que las herramientas de `tools/` los resuelvan (excepción de SUP-S22-015 a ADR-016 §8). Se retiran `@prisma/client`, `@prisma/adapter-pg` y `prisma`.

### 5.4 Preguntas abiertas
- ¿Se conservan los identificadores en formato cuid para no cambiar el aspecto de las URLs? Default: no; `crypto.randomUUID()` (SUP-S22-003).
- ¿Se agrega una regla de `guard-bash` para `drizzle-kit migrate|push|drop`? Default: no entra en S-22; es un cambio del arnés que aprueba el propietario por separado (ADR-022 §8).
- ¿Confirmas las dos desviaciones de ADR-022 de SUP-S22-014 (montos como número hasta S-03; migración al arranque diferida a S-15 y S-17)? Default: sí; si no, se enmienda ADR-022.
- ¿Se acepta ADR-003? Si no, el repositorio de TasaCambio sobrevive y S-22 se enmienda (SUP-S22-013). Default: se trata como condenado.
- ¿Se activa `drizzle-kit check` en el CI? Default: no hasta que exista el baseline (S-15).

## Revisión independiente

### Veredicto de `spec-reviewer` (texto íntegro, sin editar; sobre la primera versión en revisión)

REVISIÓN INDEPENDIENTE — S-22 `/home/user/adhara-fit/docs/superpowers/specs/S-22-capa-de-datos-con-drizzle.md` (solo lectura)

Alcance de mi revisión: leí la spec, la plantilla, ADR-001/003/011/012/016/018/019/022, S-00 (sus 423 primeras líneas más búsquedas dirigidas del resto) y `docs/linea-base-tests.md`. Contrasté la sección 0.4 con el clon de solo lectura del Repo A (`/home/user/kaiserone01/gym-app`) mediante lecturas y búsquedas. No pude ejecutar `node tools/spec-lint.mjs` ni ningún comando: esta sesión no tiene Bash. Tampoco pude comprobar nada sobre `drizzle-orm` instalado (no existe en el entorno).

| # | Comprobación | Veredicto | Evidencia | Qué corregir |
|---|---|---|---|---|
| 1 | Cabecera completa; ADRs citados existentes y aceptados | CUMPLE (con una nota) | Cabecera de la spec líneas 1-8, con `aprobada_por` y `fecha_aprobacion` vacíos, correcto para `en-revision`. ADR-001, 016 y 022 figuran como aceptados (ADR-001:3, ADR-016:3, ADR-022:3). ADR-012, 018 y 019 también aceptados. ADR-003 sigue **propuesto** (ADR-003:3). | La spec depende de ADR-003 sin citarlo en `adrs` (spec:39, SUP-S22-002, REQ-S22-009). Si ADR-003 no se acepta, TasaCambio sobrevive y necesitaría suite de contrato completa, no solo humo. Declarar esa dependencia en 0.5 o en 5.4. |
| 2 | Cada REQ: una obligación, EARS, prioridad y origen | NO CUMPLE | Todos tienen tipo, MUST y origen. Compuestos: REQ-S22-007 (spec:105: implementar 22 repositorios y no tocar el dominio), REQ-S22-018 (spec:171: tope de errores y sin paso de generación), REQ-S22-003 (spec:81: comparar y terminar con código ≠ 0). REQ-S22-015 (spec:153) dice «archivos de despliegue» sin lista. | Dividir 007, 018 y 003. Enumerar en REQ-015 los archivos exactos. **Contradicción interna:** REQ-S22-008 exige que la suite corra contra Prisma con `ADHARA_ORM` y REQ-S22-015 exige 0 apariciones de «prisma» al terminar. Ambos son MUST sin marca temporal. Marcar REQ-008, AC-001, AC-003 y AC-008 como válidos «hasta el paso 4 del plan 5.1». |
| 3 | Cobertura REQ→BEH→AC, INV enlazados, categorías BEH | CUMPLE | Los 23 REQ tienen ≥1 BEH y ≥1 AC. Los 6 INV tienen mecanismo, detección y AC (AC-001, 012, 011, 007, 013, 009). Hay BEH feliz, borde, error y concurrencia (BEH-005 y BEH-006). | Observación: la única concurrencia de dominio es el doble cobro. Falta cubrir `activacion.ts` (ver fila 5), cuyo comentario (`apps/web-admin/lib/activacion.ts:9-11`) depende de que la segunda activación falle por la unicidad `(organizacionId, cedula)`. Añadir un BEH de concurrencia para eso. |
| 4 | AC binarios, con método y resultado | NO CUMPLE | AC-S22-008 (spec:434-439), AC-012 (:462-467), AC-007 (:427-432), AC-010 (:448-453). | (a) AC-008: «conjunto de estados registrado con Prisma» sale de 20 corridas de una carrera no determinista (`pagos/actions.ts:209` llama a `registrarPago` sin transacción). Con 20 muestras, Drizzle puede producir un estado válido no visto y fallar sin ser un defecto. Definir el conjunto de estados admisibles por reglas (ADR-010), no por muestreo. (b) AC-012: el `grep -rIil prisma apps packages …` no excluye `node_modules`, `.next` ni `tsconfig.tsbuildinfo` (ADR-022:9 dice que uno de los 8 archivos es un artefacto de compilación), mientras que 0.4 sí los excluye. Además, `.dockerignore` y `.gitignore` del Repo A contienen «prisma» (`.dockerignore:10`, `.gitignore:47-48`) y no están en la lista. Además `metodo: sql` para un grep no es exacto. (c) AC-007: «repetirlo para la forma de arreglo en PermisoRepository» no tiene sentido con «insertar un pago y una suscripción»; falta un procedimiento por cada conversión (hay 4, ver fila 5). (d) AC-010: «posterior» puede fallar si ambas escrituras caen en el mismo milisegundo; exigir una espera mínima. (e) AC-005 usa 999999999999.99 en (14,2), que BEH-002 no tiene; alinearlos, y añadir null, negativos (`diferencia`, `schema.prisma:509`) y `(12,4)` (`:531`). |
| 5 | 0.4: archivo:línea, «verificado con comando» o «no verificado» | NO CUMPLE (hay hechos correctos y discrepancias) | **Confirmados:** 25 modelos, 14 enums (`schema.prisma`), 23 `cuid` + 1 `uuid` (`:47`), 19 `now()`, `@updatedAt` en `:720`, 44 `DateTime`, 2 `@db.Date` (`:416-417`), 23 `Decimal` (6 de (14,2)), 2 `String[]`, 10 `@@index`, 60 `@relation`. Cliente en `lib/prisma.ts`. `PrismaClientOrTx.ts:10`. `toNumber` en `PrismaPagoRepository.ts:11,36,40,41`. `Dockerfile:32` y `:63-64`. `docker-entrypoint.sh:11`. `packages/db/package.json:6-8`. 23 archivos `Prisma*`. 10 repositorios con `include/select`. 0 capturas de `P2002/P2025`. `@types/pg` 8.23.1 y `pg` 8.23.0 en el lockfile. **Discrepancias:** | Corregir: (1) `PrismaTasaCambioRepository.ts:63` es forma de **arreglo** (`$transaction(tasas.map(...upsert))`, `:63-72`); los usos de arreglo son **4**, no 3 (spec:44, REQ/AC-007, 5.3). Quitar «forma no verificada». (2) **`packages/infrastructure/auth/KioskTokenValidator.ts:1,6,9`** importa `PrismaClient` y no está en el alcance (24 archivos de infraestructura = 23 `Prisma*` + este); sin portarlo, REQ-015 falla. (3) Alcance subestimado: `grep -ric prisma apps` da ~75 archivos de `web-admin` (páginas, rutas y acciones que hacen `import { prisma } from "@/lib/prisma"` o importan `…/persistence/prisma/PrismaXRepository`, p. ej. `planes/page.tsx:5`). La spec lista solo 4 archivos, 1 ruta y 2 scripts (0.2, 0.4). Hay que reescribir esos imports para cumplir REQ-007 y REQ-015; ajustar 0.2 y el plan 5.1. (4) Además hay «prisma» en `apps/web-admin/package.json:17` (`@prisma/adapter-pg`), `apps/web-admin/next.config.ts:11` y `apps/kiosk/next.config.ts:7` (comentarios), y en 6 comentarios de `packages/domain` más `CambiarPlanConPago.test.ts`. REQ-007 dice «sin modificar el código ejecutable del dominio»: precisar que los comentarios y ese test sí se editan. (5) «21 coincidencias de `Decimal\|toNumber`» (spec:43): al reproducir el patrón sobre `packages/infrastructure` obtengo 41 líneas en 11 archivos. (6) «7 `@@unique`»: hay **6** declaraciones (`:128, 177, 241, 512, 652, 668`); el séptimo `grep -cF` es el comentario de `:152`. (7) `globalThis` está en `lib/prisma.ts:15-16`, no en las líneas citadas. (8) Hay dos columnas `Json` (`schema.prisma:646, 663`) y arreglos con `@default([])` que la spec no menciona y que `REQ-S22-002` y el comparador deben mapear (`jsonb`). (9) `$transaction` con opciones `{ timeout: 20000 }` (`pagos/actions.ts:206-208`) y `{ timeout: 15000 }` (`activacion.ts:25`): `db.transaction` no tiene ese parámetro. No figura en 0.4, REQ ni riesgos. |
| 6 | Supuestos con default y «asumido, por validar» | CUMPLE (con huecos) | SUP-S22-001 a 009 llevan «Default:» y la marca. | Añadir supuestos que hoy están implícitos: modo de `date()` (`Date` frente a `string`; REQ-011 dice «la fecha vuelve como 2028-02-29» sin tipo), precisión de `timestamp` (Prisma usa `timestamp(3)`; Drizzle por defecto 6), parámetros del `Pool` (`max`, `ssl`; REQ-020 solo exige una instancia), y qué pasa con el tiempo límite de transacciones (fila 5, punto 9). Registrar que `updatedAt` es NOT NULL sin default de base: REQ-S22-005 solo cubre la actualización; falta exigirlo también en la inserción. |
| 7 | Contradicciones con ADR aceptados (001, 016, 022, 018, 019, 012) | NO CUMPLE (menor) | ADR-001: sin conflicto (REQ-023). ADR-016: sin conflicto (REQ-022 y suite contra base efímera). ADR-018/019: el porte «tal cual» de Turno, Arqueo, Egreso, DeudaProducto, TasaCambio y Organizacion es coherente con dejar su eliminación a S-05/08/10/11. ADR-012: se aplaza a S-01, coherente con ADR-022 §5. **ADR-022 §6** (ADR-022:45) pide mapear `numeric` «a céntimos»; S-22 lo deja en número (0.3 y 5.3). **ADR-022 §4** (:43) dice que «cómo se aplican las migraciones al arrancar el contenedor se fija en S-22»; S-22 lo difiere a S-15/S-17 (SUP-S22-007). | Declarar ambas como desviaciones de ADR-022 (con su motivo) y pedir confirmación al propietario, o enmendar el ADR. No hay contradicción dura con ADR-001/016/018/019/012. |
| 8 | Contradicciones con S-00 aprobada y enmienda | NO CUMPLE | S-00 `0.2` línea 29: lista cerrada «en `packages/db`, todo archivo salvo `package.json`, `prisma/schema.prisma`, `prisma7.config.ts` y `prisma7.local.config.ts`» y REQ-S00-003 hace que el CI falle ante cualquier archivo que coincida con esa lista. El informe de importación de S-00 también registra «la lista de permitidos de packages/db» (REQ-S00-028). La enmienda de S-22 (5.2) solo toca SUP-S00-010 y REQ-S00-017. | Ampliar la enmienda: S-22 añade `packages/db/src/schema/` y `drizzle.config.ts` y retira `prisma/` y `prisma7*.config.ts`. Hay que indicar cómo se reescribe esa regla en `tools/verificar-repo.mjs` (que aún no existe en `tools/`). También los AC de S-00 que asumen `prisma db push` (AC-S00 de Compose, líneas 552 y 650). El cliente `pg` como dependencia de ejecución sí es coherente con S-00 §5.1 (:668). |
| 9 | Alcance: ¿hace algo de otra spec? | CUMPLE con reservas | 0.3 delega bien a S-02/03/05/06/08/10/11/15/17 y S-01. El comparador y `tools/comparar-esquemas.mjs` necesitan `pg` en `tools/`, y ADR-016 §8 fija que las herramientas del repo usan `node:test` «sin dependencias». | (a) Aclarar cómo el comparador resuelve `pg` (raíz del monorepo) o enmendar la excepción de ADR-016 §8. (b) No se nombra el script/CI que implementa las búsquedas de REQ-014, 015, 021 y 023 («búsqueda automatizada», «comprobación de versiones fijadas»): ponerles nombre y ruta y añadirlos a 0.2. (c) REQ-016 exige crear tablas con `drizzle-kit push` antes de arrancar `web-admin`, pero REQ-017 prohíbe `drizzle-kit` en `Dockerfile` y `docker-entrypoint.sh`, y la imagen `runner` no lo contiene (`Dockerfile:36-66`). Falta definir qué servicio o etapa de Compose ejecuta el push y con qué imagen. |
| 10 | Riesgos y dependencias nuevas justificadas | CUMPLE con un riesgo no verificado | 5.3 justifica `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg` y el retiro de las de Prisma; `@types/pg` 8.23.1 ya está en el lockfile. | **No verificado:** `drizzle-orm` declara `@prisma/client` y `prisma` como `peerDependencies` opcionales, y npm las copia al `package-lock.json`. Si es así, REQ-015/AC-012/INV-002 (0 apariciones de «prisma» en el lockfile) son inalcanzables. Comprobar con `npm view drizzle-orm@0.45.4 peerDependencies` antes de aprobar y, si procede, exceptuar esas líneas. Añadir al 5.3 el riesgo de que el timeout de transacción desaparezca (fila 5, punto 9) y el de `drizzle-kit push` sobre bases con datos. |
| 11 | Lint de la spec (`TBD`, «etc.», adjetivos sin medida) | NO VERIFICABLE | No ejecuté `spec-lint`. A simple lectura no veo «TBD», «por definir» ni «etc.». Hay `test: pendiente` en todos los AC (admisible en `en-revision`). | Ejecutar `node tools/spec-lint.mjs` y pegar la salida. |

Pregunta para el propietario (no bloquea la revisión, pero condiciona la fila 7): ¿confirma las dos desviaciones de ADR-022 (montos como número hasta S-03 y migración al arranque diferida a S-15/S-17)?

VEREDICTO GLOBAL: Requiere cambios (no Bloqueada). Prioridad de correcciones: (1) filas 5 y 9, el alcance real (KioskTokenValidator, ~75 archivos de web-admin, 4 usos de arreglo, timeouts de transacción); (2) fila 4, AC-008 y AC-012 no son binarios ni reproducibles; (3) fila 2, la contradicción REQ-008 frente a REQ-015; (4) fila 8, la enmienda de S-00 incompleta; (5) fila 10, la comprobación de peerDependencies de drizzle-orm en el lockfile.

### Conciliación del autor
Verifiqué cada hallazgo contra el clon (y contra los paquetes de Drizzle instalados aparte) antes de corregir. **Todos los hechos eran ciertos**; ninguno se rechazó.

| Hallazgo | Resultado de mi verificación | Corrección |
|---|---|---|
| Fila 1 (ADR-003) | Cierto | SUP-S22-013 y pregunta en 5.4 |
| Fila 2 (REQ compuestos; REQ-008 frente a REQ-015) | Cierto | REQ-003, 007, 008 (ahora «mientras», pasos 1 a 4), 015 (lista de archivos) y 018 reescritos; REQ-025, 026 y 028 nuevos; AC-001, 003 y 008 válidos hasta el paso 4 |
| Fila 3 (concurrencia de `activacion.ts`) | Cierto (`activacion.ts:9-11`) | REQ-030, BEH-022, AC-022 |
| Fila 4 (AC) | Cierto en (a) a (e) | AC-008 por clases A, B y C con 200 ejecuciones; AC-012 como comprobación de `tools/verificar-drizzle.mjs`; AC-007 más AC-028 para las 4 conversiones; AC-010 con espera de 10 ms; AC-005 alineado con BEH-002 |
| Fila 5 (hechos) | Cierto: 4 usos de arreglo; `KioskTokenValidator`; **75 archivos de `web-admin`** (71 con `@/lib/prisma` y 71 con `PrismaXRepository`); 41 líneas en 11 archivos; 6 `@@unique`; `globalThis` en `:15`; `Json` y arreglos; timeouts de 20 s y 15 s | 0.2, 0.4, REQ-002, REQ-007, REQ-024, 5.1 y 5.3 reescritos |
| Fila 6 (supuestos) | Cierto | SUP-S22-010 a 012; REQ-005 cubre inserción y actualización |
| Fila 7 (desviaciones de ADR-022) | Cierto | SUP-S22-014 y pregunta al propietario en 5.4 |
| Fila 8 (enmienda de S-00) | Cierto | 5.2 ampliado; REQ-029 y AC-023 |
| Fila 9 (alcance) | Cierto | `tools/verificar-drizzle.mjs` nombrado en 0.2; servicio `esquema` de Compose (SUP-S22-010); excepción de `pg` en `tools/` (SUP-S22-015) |
| Fila 10 (`peerDependencies`) | **Cierto y bloqueante**: `drizzle-orm@0.45.4` declara `@prisma/client` y `prisma` como opcionales y el lockfile contiene la cadena 3 veces sin instalar ningún paquete de Prisma | REQ-027, BEH-024 y AC-024: el lockfile se comprueba por rutas de paquete, no por texto |
| Fila 11 (lint) | Ejecuté `node tools/spec-lint.mjs --write` tras las correcciones: 0 errores, 0 avisos | — |

Tras las correcciones S-22 pasó de 23 a 30 REQ, de 20 a 27 BEH y de 20 a 28 AC (6 INV). El propietario aprobó el texto corregido el 2026-11-12 («S-22 aprobada con el texto corregido, confirmo las dos desviaciones») y confirmó las dos desviaciones de ADR-022 (SUP-S22-014); la spec pasó a `aprobada`.

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de S-01. El texto anterior se conserva; donde choca, rige esta sección.*
- REQ-S22-016, BEH-S22-008 y AC-S22-014 (25 tablas y 14 enums) valen al terminar S-22; tras S-01 son 26 tablas y 15 enums (`IntentoLogin` y el enum de su resultado).
- REQ-S22-004: la columna `apiKey` con valor generado por la aplicación se reemplaza por `apiKeyHash` y `apiKeyPrefijo` (S-01, REQ-S01-008).
- Por la aprobación de S-03: REQ-S22-010, SUP-S22-014, BEH-S22-002, AC-S22-005 y las aserciones de montos de las suites de contrato (REQ-S22-008 y REQ-S22-028) pasan de «number» a «cadena decimal de dos decimales», con el modo `string` de `numeric` de Drizzle; `docs/superpowers/specs/S-03-dinero-y-metodos-de-pago.md` §5.2 y SUP-S03-011.
- Recuentos: S-04 retira la tabla `ReglaAbonoPorFrecuencia` con su puerto y su repositorio; tras S-04 quedan 25 tablas, 15 enums, 21 repositorios y 16 suites de contrato. Se retira `Sucursal.diasGracia` y se agregan `Pago.vencimientoAnterior` y `Pago.cobroId` (única).
- Por la aprobación de S-05 (negocio y sede únicos): el esquema final tiene 23 tablas y 15 enums (se retiran `Organizacion`, `TemaOrganizacion` y `UsuarioSucursal` y se agrega `ConfiguracionNegocio`, de fila única), y quedan 20 repositorios y 15 suites de contrato sin `PrismaUsuarioSucursalRepository`. Afecta a REQ-S22-004, REQ-S22-007, REQ-S22-016, BEH-S22-008, AC-S22-003, AC-S22-014 y AC-S22-028 (que ya no incluye el repositorio de `UsuarioSucursal`).
- Por S-05: la unicidad `(organizacionId, cedula)` de `Miembro` pasa a `(cedula)` global; el hecho de `lib/activacion.ts` de 0.4 y la prueba que hace fallar la segunda activación simultánea usan esa unicidad. S-05 agrega la columna `unica` con restricción CHECK a `Sucursal` y a `ConfiguracionNegocio`, que `drizzle-kit push` debe crear (S-05 5.1, paso 2).
- Por la aprobación de S-06 (documento de identidad): REQ-S22-016, BEH-S22-008 y AC-S22-014 suman un enum, `TipoDocumento` (16 enums tras S-05 y S-06; el total final depende del orden de S-08, S-09, S-10 y S-18). `Miembro` cambia `cedula` por `tipoDocumento`, `numeroDocumento` (único global) y `codigoSocio` (opcional, único y de 4 dígitos), con CHECK de formato y restricciones con nombre explícito (`miembro_numero_documento_key`, `miembro_codigo_socio_key`).
- Por S-06: REQ-S22-030, BEH-S22-022, AC-S22-022 y el hecho de `lib/activacion.ts` de 0.4 hablan de la unicidad `(cedula)`; pasa a `numeroDocumento`, y el repositorio convierte su violación en `DocumentoDuplicadoError`.
- Por la aprobación de S-07 (cambio de plan): REQ-S22-016, BEH-S22-008 y AC-S22-014 restan tres enums (`FrecuenciaPago`, `ModoCambioPlanAuditoria`, `OrigenCambioPlanAuditoria`) respecto de los valores vigentes al implementar S-07 (16 tras S-06; el total final depende del orden de S-08 a S-10 y S-18). `Plan` pierde `frecuencia` e `incluyeEntrenador` y gana CHECK de `precio` y `diasCiclo`; `Pago` gana `creadoEn`; `CambioPlanAuditoria` pierde `modo` y `origen` y usa importes `numeric(12,2)` e instantes 05:00Z. REQ-S22-028: `PrismaPlanRepository` pierde `actualizarFrecuenciaYEntrenador` y `contarSuscripcionesActivasVigentes`.
- Por la aprobación de S-08: REQ-S22-002, BEH-S22-012 y AC-S22-001 restan tres enums (`EstadoTurno`, `MonedaEgreso` y `EstadoDeuda`); REQ-S22-016, BEH-S22-008 y AC-S22-014 restan cuatro tablas (`Turno`, `Egreso`, `ArqueoLinea` y `DeudaProducto`); REQ-S22-007 y AC-S22-003 restan los repositorios de turno, egreso, arqueo y deuda; REQ-S22-009 y AC-S22-004 quitan esos repositorios de la prueba de humo. `Pago` pierde `turnoId`.
