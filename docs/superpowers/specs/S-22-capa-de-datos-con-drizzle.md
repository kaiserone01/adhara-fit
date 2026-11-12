---
id: S-22
estado: en-revision
adrs: ADR-001, ADR-016, ADR-022
depende_de: S-00
aprobada_por:
fecha_aprobacion:
---
# S-22 — Capa de datos con Drizzle: esquema, repositorios, transacciones y retiro de Prisma

## 0. Contexto y alcance

### 0.1 Problema
El propietario aceptó ADR-022 (2026-11-12): Drizzle ORM sobre `pg` reemplaza a Prisma, y la spec que lo ejecuta va después de S-00 y antes de S-01. Tras S-00 el árbol importado conserva 22 repositorios y el código de `web-admin` escritos contra Prisma, y **no existe ninguna prueba de esos repositorios** (hecho, 0.4), de modo que un porte directo no tendría contra qué compararse. S-22 cambia el ORM sin cambiar el comportamiento: primero fija el comportamiento actual con pruebas de contrato escritas contra Prisma, luego porta el esquema y los repositorios, comprueba la paridad y retira Prisma. No elimina modelos ni cambia reglas de negocio (eso corresponde a S-02 a S-11).

### 0.2 Dentro de alcance
- Pruebas de contrato de los 17 repositorios que sobreviven a los ADR de limpieza, ejecutables contra Prisma y contra Drizzle, y pruebas de humo de los 5 repositorios de modelos que esos ADR eliminan.
- Esquema Drizzle de los 25 modelos y 14 enums, con herramienta de comparación estructural contra el esquema de Prisma.
- Reescritura de los 22 repositorios y del ayudante `PrismaClientOrTx`, y de las partes de `web-admin` que usan el cliente (`lib/prisma.ts`, `lib/activacion.ts`, `caja/actions.ts`, `pagos/actions.ts`, `app/api/tasa-cambio/historial/route.ts` y los dos scripts de `web-admin/scripts`).
- Mapeo de montos (`numeric`), fechas e instantes, identificadores generados por la aplicación y campo `updatedAt`.
- Transacciones: los 3 usos de forma arreglo y los de forma interactiva pasan a `db.transaction`.
- Retiro de Prisma: dependencias, esquema `.prisma`, configuraciones, scripts, cliente generado, `Dockerfile`, `docker-entrypoint.sh` y comentarios.
- Enmienda de SUP-S00-010 y REQ-S00-017: Compose crea el esquema con `drizzle-kit push`.
- Regla de búsqueda que prohíbe `sql.raw` y protección de `drizzle-kit` contra bases no locales.

### 0.3 Fuera de alcance
- Eliminar modelos o repositorios (turno, arqueo, egreso, fiado, tasa de cambio, organización): S-05, S-08, S-10 y S-11. S-22 los porta tal cual.
- Dinero en céntimos enteros (S-03), zona horaria de Lima (S-02) y documentos de identidad (S-06): S-22 conserva los tipos actuales.
- Migraciones versionadas, baseline y seed: S-15 (propuesta). Mientras tanto no se versionan migraciones (ADR-022 §3).
- Mecanismo de migración en producción: S-15 y S-17. El arranque del contenedor no aplica migraciones hasta entonces (SUP-S22-007).
- Cambios de seguridad (ADR-012): S-01, que se escribe después sobre Drizzle.
- Rendimiento y optimización de consultas.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`, salvo lo marcado «no verificado». Los comandos `grep` excluyen `node_modules`, `.next` y `generated`.
- El cliente de Prisma se crea una sola vez y se reutiliza con `globalThis` en desarrollo: `apps/web-admin/lib/prisma.ts:6`, `:7`, `:19`, `:22` y `:25`.
- El tipo `PrismaClientOrTx = PrismaClient | Prisma.TransactionClient` permite construir un repositorio con el cliente global o con el `tx` de una transacción: `packages/infrastructure/persistence/prisma/PrismaClientOrTx.ts:10`.
- 49 archivos importan Prisma: 16 en `packages/db`, 24 en `packages/infrastructure`, 8 en `apps/web-admin` y 1 en `apps/worker` (verificado con `grep -rIl -E "@prisma/client|PrismaClient|prisma\."` sobre `apps` y `packages`). Tras las exclusiones de S-00 queda portar 22 repositorios, el ayudante, 4 archivos de `web-admin` con lógica, 1 ruta y 2 scripts (los 14 scripts de `packages/db` y el seed se excluyen).
- Los 22 repositorios son los de Miembro (`PrismaMemberRepository`), MiembroReferencia, CheckIn, Pago, MetodoPago, CambioPlanAuditoria, DeudaProducto, Arqueo, Permiso, Plan, Entrenador, TasaCambio, Egreso, Sesion, ReglaAbono, UsuarioSucursal, Producto, Turno, Vitrina, Suscripcion, Sucursal y UsuarioAdmin (verificado con `find packages/infrastructure -name 'Prisma*'`: 23 archivos, de los cuales `PrismaClientOrTx.ts` es el ayudante). Cinco corresponden a modelos que ADR-018 y ADR-003 eliminan: Turno, Arqueo, Egreso, DeudaProducto y TasaCambio.
- `packages/infrastructure` y `apps/web-admin` tienen 0 archivos de test (verificado con `find … -name '*.test.*'`; `docs/linea-base-tests.md` §1). Las 390 pruebas de dominio no importan el ORM; en `packages/domain` Prisma solo aparece en 6 comentarios (verificado con `grep -rIn -i prisma packages/domain`).
- El esquema tiene 25 modelos y 14 enums (`packages/db/prisma/schema.prisma`, 723 líneas); 23 identificadores con `@default(cuid())` y 1 clave con `@default(uuid())` (`schema.prisma:47`, `apiKey`), 19 con `@default(now())`, 1 con `@updatedAt` (`schema.prisma:720`, modelo `VitrinaItem`), 44 campos `DateTime`, 2 `@db.Date`, 23 `Decimal` (15 de `(10,2)`, 6 de `(14,2)`, 1 de `(12,2)` y 1 de `(12,4)`), 2 arreglos `String[]`, 7 `@@unique`, 10 `@@index`, 60 `@relation` y solo 2 con `onDelete` explícito (`:354` `SetNull`, `:687` `Cascade`) (verificado con `grep -cF` sobre `schema.prisma`).
- Los identificadores `cuid()` y `uuid()` y `@updatedAt` los genera el cliente de Prisma, no la base de datos; `@default(now())` sí es un valor predeterminado de la base (no verificado contra una base creada; el comparador de AC-S22-001 lo fija).
- Los repositorios convierten montos con `.toNumber()`: `PrismaPagoRepository.ts:11`, `:36`, `:40` y `:41`; hay 21 coincidencias de `Decimal|toNumber` en `packages/infrastructure` (verificado con `grep`).
- `$transaction` se usa en forma de arreglo en `PrismaPermisoRepository.ts:21`, `PrismaUsuarioSucursalRepository.ts:13` y `PrismaUsuarioAdminRepository.ts:83`, y en forma interactiva en `PrismaMemberRepository.ts:114`, `PrismaVitrinaRepository.ts:74`, `:85`, `:95` y `:105`, `caja/actions.ts:287`, `:447` y `:556`, `pagos/actions.ts:206` y `:326` y `lib/activacion.ts:14` (`PrismaTasaCambioRepository.ts:63` también usa `$transaction`, forma no verificada). Hay un solo `$queryRaw` fuera de scripts: `PrismaTurnoRepository.ts:108`.
- 10 repositorios usan `include` o `select` (verificado con `grep -c "include:|select:"`): MiembroReferencia, CheckIn, Pago (5), DeudaProducto, Entrenador, Turno, Vitrina (4), Sucursal, Member (5) y UsuarioAdmin.
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
- texto: El sistema deberá declarar en TypeScript, en packages/db/src/schema/, las 25 tablas y los 14 enums del esquema heredado con los mismos nombres de tabla, columna y enum.

### REQ-S22-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: La herramienta tools/comparar-esquemas.mjs deberá comparar dos bases PostgreSQL por tablas, columnas, tipos, nulabilidad, valores predeterminados de base, unicidades, índices, claves foráneas con sus acciones y valores de enums, y terminar con código distinto de cero si encuentra una diferencia.

### REQ-S22-004
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando se inserta una fila sin indicar su identificador o su apiKey, el sistema deberá asignar un valor textual único generado por la aplicación en las 24 columnas que hoy dependen de cuid() o uuid().

### REQ-S22-005
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando se actualiza una fila de VitrinaItem, el sistema deberá escribir la hora actual en su columna updatedAt.

### REQ-S22-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El sistema deberá exponer un tipo ClienteOTransaccion que permita construir cada repositorio con el cliente global o con el cliente de una transacción.

### REQ-S22-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El sistema deberá implementar los 22 repositorios en packages/infrastructure/persistence/drizzle/ contra los mismos puertos del dominio, sin modificar el código ejecutable de packages/domain.

### REQ-S22-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El sistema deberá incluir una suite de contrato por cada uno de los 17 repositorios que sobreviven, escrita contra el puerto del dominio, que se ejecute contra la implementación de Prisma o la de Drizzle según la variable ADHARA_ORM.

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
- texto: Cuando dos cobros del mismo miembro se confirman a la vez, el sistema deberá terminar en un estado final que pertenezca al conjunto de estados registrado en la prueba de concurrencia contra Prisma.

### REQ-S22-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El código fuente no deberá contener llamadas a sql.raw.

### REQ-S22-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: Los directorios apps y packages, el lockfile y los archivos de despliegue no deberán contener la cadena prisma, sin distinguir mayúsculas, al terminar la spec.

### REQ-S22-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-022
- texto: Cuando docker compose inicia con una base de datos vacía, el sistema deberá crear las 25 tablas con drizzle-kit push antes de arrancar web-admin.

### REQ-S22-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El Dockerfile y el docker-entrypoint.sh no deberán invocar ninguna orden de generación de cliente ni de migración.

### REQ-S22-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El comando tsc --noEmit de web-admin deberá terminar con un máximo de 1 error, el heredado de LayoutProps, sin ejecutar ningún paso de generación de cliente.

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
- dado: una columna numeric(10,2) y otra numeric(14,2)
- cuando: se escriben y leen los valores 0.00, 0.01, 1234.56 y 99999999.99
- entonces: el dominio recibe 0, 0.01, 1234.56 y 99999999.99 como números, sin cadenas ni pérdida de decimales

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
- dado: un miembro con suscripción vigente y 20 ejecuciones de dos cobros simultáneos, primero contra Prisma
- cuando: cada ejecución confirma los dos cobros en transacciones paralelas
- entonces: la prueba registra con Prisma el conjunto de estados finales (cantidad de pagos y fecha de vencimiento) y, contra Drizzle, todos los estados finales caen dentro de ese conjunto

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
- entonces: la base queda con 25 tablas antes de que web-admin responda a su comprobación de salud

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

## 3. Invariantes

### INV-S22-001
- propiedad: el esquema de Drizzle y el de Prisma producen la misma estructura de base de datos mientras ambos coexisten
- mecanismo: test-propiedad
- deteccion: tools/comparar-esquemas.mjs sobre una base de cada ORM termina con código distinto de cero
- protege: REQ-S22-002, REQ-S22-003

### INV-S22-002
- propiedad: ningún archivo de apps, packages, lockfile ni despliegue contiene la cadena prisma al terminar la spec
- mecanismo: lint
- deteccion: la búsqueda automatizada de REQ-S22-015 devuelve al menos un archivo
- protege: REQ-S22-015

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
- procedimiento: con dos bases efímeras vacías, crear la primera con prisma db push desde schema.prisma y la segunda con drizzle-kit push desde packages/db/src/schema/, y ejecutar tools/comparar-esquemas.mjs contra ambas
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
- procedimiento: ejecutar las suites de contrato de los 17 repositorios con ADHARA_ORM=prisma y luego con ADHARA_ORM=drizzle sobre una base efímera cada vez
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
- procedimiento: escribir y leer 0.00, 0.01, 1234.56 y 99999999.99 en una columna numeric(10,2) y 999999999999.99 en una numeric(14,2) con la implementación de Drizzle
- esperado: cada lectura es un number igual al valor escrito y ninguna es string
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
- procedimiento: abrir una transacción, insertar un pago y luego una suscripción con clave foránea inexistente; repetirlo para la forma de arreglo convertida en PermisoRepository
- esperado: tras el error no existe el pago en la base y el error llega al llamador, en los dos casos
- test: pendiente

### AC-S22-008
- enlaza: REQ-S22-013, BEH-S22-005
- metodo: integracion
- procedimiento: ejecutar 20 veces dos cobros simultáneos del mismo miembro contra Prisma y registrar el conjunto de estados finales; repetir 20 veces contra Drizzle
- esperado: los 20 estados finales de Drizzle pertenecen al conjunto registrado con Prisma
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
- procedimiento: insertar un VitrinaItem, leer updatedAt, actualizar el título y leer de nuevo
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
- metodo: sql
- procedimiento: ejecutar grep -rIil prisma apps packages package-lock.json Dockerfile docker-compose.yml docker-entrypoint.sh turbo.json .github sobre el árbol final
- esperado: 0 archivos; en el árbol de prueba de BEH-S22-014 la búsqueda reporta el archivo de apps y no el de docs
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
- procedimiento: partiendo de un volumen vacío, ejecutar docker compose up, esperar la comprobación de salud de web-admin y contar las tablas del esquema public
- esperado: la comprobación de salud pasa y existen 25 tablas
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

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden de trabajo, con un commit por paso (ADR-016 §1, pruebas primero): (1) suites de contrato y pruebas de humo contra Prisma, en verde, con el helper de base efímera de S-00 (REQ-S00-014 y REQ-S00-019); (2) esquema Drizzle y `tools/comparar-esquemas.mjs` con su paridad contra la base de Prisma; (3) repositorios de Drizzle, uno por commit, de menos a más SQL y transacciones, con su suite en verde bajo `ADHARA_ORM=drizzle`; (4) `web-admin` y la ruta y los scripts; (5) retiro de Prisma, `Dockerfile`, `docker-entrypoint.sh`, Compose y CI. El retiro es el último paso porque quita `ADHARA_ORM=prisma` y el comparador deja de ejecutarse contra Prisma.
- Las suites de contrato se escriben contra el puerto del dominio (no contra la clase concreta) y parten de una fábrica por implementación.
- La prueba de concurrencia (AC-S22-008) registra primero el conjunto de estados finales con Prisma y lo guarda como dato de la prueba; si ese conjunto resulta contener un estado incorrecto según las reglas, se anota y se corrige en S-04, no aquí.
- Dependencias nuevas, justificadas en 5.3: `drizzle-orm`, `drizzle-kit` (desarrollo), `pg` (de desarrollo, en S-00, pasa a dependencia de ejecución) y `@types/pg` (desarrollo, SUP-S22-008).
- Los criterios e2e (AC-S22-014) los ejecuta el propietario o el CI con Docker.

### 5.2 Migración
- No hay datos que migrar ni migraciones que traducir (SUP-S00-002). El baseline se genera una sola vez en S-15.
- Enmienda de S-00: SUP-S00-010 y REQ-S00-017 pasan de `prisma db push` a `drizzle-kit push`; S-00 permanece aprobada y la enmienda se registra al aprobar S-22.
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
- Dependencias nuevas y justificación: `drizzle-orm` y `drizzle-kit` son el ORM decidido en ADR-022; `pg` es el cliente que exige Drizzle sobre PostgreSQL; `@types/pg` es solo de tipos. Se retiran `@prisma/client`, `@prisma/adapter-pg` y `prisma`.

### 5.4 Preguntas abiertas
- ¿Se conservan los identificadores en formato cuid para no cambiar el aspecto de las URLs? Default: no; `crypto.randomUUID()` (SUP-S22-003).
- ¿Se agrega una regla de `guard-bash` para `drizzle-kit migrate|push|drop`? Default: no entra en S-22; es un cambio del arnés que aprueba el propietario por separado (ADR-022 §8).
- ¿Se activa `drizzle-kit check` en el CI? Default: no hasta que exista el baseline (S-15).
