---
id: S-15
estado: en-revision
adrs: ADR-002, ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-10, S-11, S-18, S-22, S-23
aprobada_por:
fecha_aprobacion:
---
# S-15 — Línea base de la base de datos y datos iniciales de Adhara Fit

## 0. Contexto y alcance

### 0.1 Problema
Las specs S-01 a S-23 cambian el esquema y dejan a S-15 tres cosas: (1) la **línea base** (la primera migración versionada, que S-22 difirió porque aún no había esquema final y mientras tanto la base se crea con `drizzle-kit push`), (2) **cómo se aplican las migraciones** (S-22, SUP-S22-007) y (3) el **seed**: los datos con los que nace el sistema. El seed heredado crea una organización ajena, un administrador con la contraseña fija `admin1234`, un entrenador con otra contraseña fija, planes en dólares y miembros de prueba, y no es repetible (ADR-012 criterio 6 lo prohíbe). Adhara Fit necesita un seed que cree solo lo que el negocio ya sabe (la sede «Local», el negocio «Adhara Fit», tres planes, tres métodos de pago, cuatro entrenadores, la clave del kiosco y el primer administrador), sin contraseñas fijas, que se pueda ejecutar más de una vez sin pisar lo que el propietario cambió.

### 0.2 Dentro de alcance
- Migración inicial versionada (`packages/db/drizzle/`), generada con `drizzle-kit generate` desde el esquema final, con los CHECK, índices únicos e índices que otras specs declararon.
- Comando `db:migrar` (código en `packages/db/src/`), que aplica las migraciones pendientes con el migrador de `drizzle-orm` (no con el CLI de `drizzle-kit`) y un candado asesor.
- En Compose, un servicio de un solo uso `migrar` que ejecuta `db:migrar` y reemplaza al servicio `esquema` de S-22 (que usaba `drizzle-kit push`); `web-admin` espera a que termine bien. El `Dockerfile` y `docker-entrypoint.sh` no cambian.
- Paso de CI que falla si el esquema de TypeScript difiere de las migraciones versionadas, lo que S-22 dejó pendiente.
- Comando `db:sembrar` (código en `packages/infrastructure/seed/`), repetible y sin borrar ni actualizar nada.
- Variables `ADMIN_NOMBRE`, `ADMIN_CORREO` y `ADMIN_CONTRASENA_INICIAL` en `.env.example`.
- `tools/verificar-seed.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Datos de demostración y miembros de prueba: no hay seed de demostración (SUP-S15-007); las pruebas arman sus propios datos.
- Importar miembros existentes: descartado por el propietario (se cargan a mano).
- Cómo se aplican las migraciones en producción, la copia de seguridad previa, la restauración, TLS y el despliegue: S-17 (ejecutará el mismo `db:migrar`).
- Restablecer la contraseña de un administrador (SUP-S23-010): no hay requisito; queda sin dueño hasta que el propietario lo defina con S-17.
- Los datos de cobro de Yape y del BCP (teléfono, cuenta, CCI, titular): el propietario no los entregó; se cargan desde la administración.
- El README de arranque (S-00) y el logo y la tipografía (S-19).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-15 recibirá después de S-00 a S-11, S-18, S-22 y S-23; se recontarán al empezar.
- **Seed heredado:** `packages/db/prisma/seed.ts` (176 líneas) crea una organización, una sucursal «Sede Principal» con `tasaCambioUSD` (`:11-29`), un administrador con `bcrypt.hash("admin1234", 10)` y el correo `admin@gymdemo.com` (`:41-45`) que imprime junto con la contraseña (`:50`), un entrenador como `UsuarioAdmin` con `bcrypt.hash("entrenador1234", 10)` (`:55-59`), dos planes en dólares con `incluyeEntrenador` (`:72-90`) y tres miembros de prueba (`:101-162`); usa solo `create`, nunca `upsert` ni comprobaciones, y no crea fechas de calendario que S-02 deba normalizar (verificado con `grep -n` y `Read`).
- **Contraseñas fijas en otros archivos:** `admin1234` o `gymdemo` aparecen además en `clonarZipGym/correoEspejo.test.ts` y `apps/web-admin/scripts/verificar-autorizacion.ts` (verificado con `grep -rln`); S-00 excluye los scripts de `packages/db` y ya prohíbe esas cadenas (`S-00` §1), y S-23 retira el segundo archivo.
- **Métodos de pago:** el seed genérico no crea ninguno; solo `sembrarOrganizacionZipGym.ts` y `clonarSedePrincipalAZipGym.ts` crean `MetodoPago` (verificado con `grep -rl`).
- **Hasher de contraseñas:** `packages/infrastructure/auth/BcryptPasswordHasher.ts:1,4` usa `bcryptjs` con `SALT_ROUNDS = 10`; `bcryptjs` es hoy solo `devDependency` de `packages/db` (`packages/db/package.json:35`); `packages/infrastructure` importa `packages/db`, por lo que `packages/db` no puede importar el hasher sin un ciclo (verificado con `Read` y `grep -n`).
- **Migraciones y arranque:** `packages/db/prisma/migrations/` tiene 36 carpetas más `migration_lock.toml` (verificado con `ls`, de acuerdo con S-00 y ADR-022); `docker-entrypoint.sh:11` ejecuta `prisma migrate deploy` y luego `exec node apps/web-admin/server.js`; `packages/db/package.json:7-8` define `migrate:dev` y `db:seed` como `prisma db seed`; `Dockerfile.migrate:32` es destructivo y S-00 lo excluye (verificado con `Read`).
- **Interacción con specs aprobadas:** S-22 REQ-S22-016, SUP-S22-010, BEH-S22-008, AC-S22-014 y S-00 REQ-S00-017 crean el esquema en Compose con el servicio `esquema` y `drizzle-kit push`; REQ-S22-017, BEH-S22-017 y AC-S22-015 prohíben cualquier orden de generación o migración en el `Dockerfile` y en `docker-entrypoint.sh`; REQ-S22-029 limita `packages/db` a `package.json`, `drizzle.config.ts` y `src/`; REQ-S22-003 define `tools/comparar-esquemas.mjs`; S-00 define `tools/verificar-env.mjs`; S-22 difiere el baseline, `drizzle-kit check` y la aplicación de migraciones a S-15 (SUP-S22-007); S-05 exige exactamente una fila de `Sucursal` («Local») con su clave y una de `ConfiguracionNegocio` («Adhara Fit») con la clave mostrada una sola vez, y CHECK y únicos que S-15 declara con SQL si `drizzle-kit` no los emite; S-01 guarda la clave solo como hash SHA-256 y prefijo de 8 caracteres, limita la contraseña de entrada a 128 caracteres y deja sin verificar el comportamiento de `bcryptjs` con 128 caracteres; S-03 define el método de pago (nombre, tipo, banco, titular, teléfono, cuenta, CCI, QR, logo, orden, activo) con cinco tipos; S-07 fija los planes de 30, 60 y 90 días sin `frecuencia` ni `incluyeEntrenador`; S-18 crea la tabla `Entrenador` y S-23 permite uno o más administradores con contraseña mínima de 8 caracteres; S-06 y S-09 declaran CHECK de documento y de estado, S-04 el único de `cobroId` y S-11 el índice único del nombre de producto, sin fijar la expresión del índice (verificado con `grep -n` en las specs).
- No verificado: el estado de `docker-entrypoint.sh` y del `Dockerfile` tras S-00 y S-22; si el migrador de `drizzle-orm` aplica todas las migraciones pendientes en una sola transacción; el código de salida de `drizzle-kit generate` cuando hay cambios; si `drizzle-kit generate` emite los CHECK declarados con `check()`; y el comportamiento de `bcryptjs` con contraseñas de más de 72 bytes.

### 0.5 Supuestos
- SUP-S15-001: el seed crea la sede «Local» y el negocio «Adhara Fit» (SUP-S05-001), tres planes llamados «1 mes», «2 meses» y «3 meses» de 30, 60 y 90 días a 120.00, 200.00 y 280.00 (`docs/datos-iniciales.md`), tres métodos de pago activos —Yape, Transferencia BCP y Efectivo— en ese orden, y cuatro entrenadores: María Aguilera, José Montesino, Joa Bonillo y Jesús Bonillo. Default: esos datos; asumido, por validar.
- SUP-S15-002: cada bloque del seed (sede, configuración, planes, métodos, entrenadores, administrador) se crea solo si su tabla está vacía; nunca por coincidencia de nombre, para que una segunda ejecución no recree un dato que el propietario renombró o desactivó. Limitación aceptada: si el propietario borra todas las filas de una tabla, la siguiente ejecución del seed las recrea. Default: «solo si la tabla está vacía»; asumido, por validar.
- SUP-S15-003: el nombre y el correo del primer administrador vienen de las variables `ADMIN_NOMBRE` y `ADMIN_CORREO` del entorno de despliegue y no se escriben en el repositorio; una variable vacía se trata como ausente y solo se exigen cuando el seed va a crear el administrador. El correo se recorta, se pasa a minúsculas y tiene hasta 254 caracteres con la forma usuario@dominio.tld. Default: variables de entorno; asumido, por validar.
- SUP-S15-004: la contraseña inicial viene de `ADMIN_CONTRASENA_INICIAL` (de 8 a 128 caracteres) o, si está ausente o vacía, se genera de 20 caracteres con `crypto.randomBytes` y se imprime una sola vez en la salida estándar; solo se guarda su hash con el hasher de `packages/infrastructure/auth/BcryptPasswordHasher.ts`. El sistema no obliga a cambiarla en el primer inicio de sesión. Default: ese mecanismo; asumido, por validar (ADR-012 criterio 6).
- SUP-S15-005: el seed es un comando manual (`db:sembrar`) que el propietario ejecuta una vez; ni Compose ni el arranque del contenedor lo ejecutan, para que la contraseña y la clave nunca salgan en los registros de cada arranque. Default: manual; asumido, por validar.
- SUP-S15-006: las migraciones se aplican con un paso aparte antes de iniciar la aplicación, no en `docker-entrypoint.sh` (S-22 lo prohíbe en REQ-S22-017): en Compose lo hace el servicio de un solo uso `migrar`, y en producción lo hará el despliegue con el mismo comando (S-17). Default: ese reparto; asumido, por validar.
- SUP-S15-007: no hay seed de demostración ni miembros de prueba. Default: ninguno; asumido, por validar.
- SUP-S15-008: los datos de cobro de Yape y de la cuenta del BCP quedan vacíos en el seed y se completan desde la administración. Default: vacíos; asumido, por validar.
- SUP-S15-009: la línea base se genera al final, cuando todas las specs que cambian el esquema estén implementadas; mientras tanto la base se crea con `drizzle-kit push` (S-22). Default: ese orden, que el plan global (G6) fija; asumido, por validar.
- SUP-S15-010: ADR-012 §9 (los scripts que crean datos exigen `--confirm`, comprueban que no sea producción y registran lo hecho) no se aplica a `db:migrar` ni a `db:sembrar`: el migrador solo aplica migraciones hacia adelante, el seed solo inserta en tablas vacías y ambos imprimen un resumen de lo hecho sin secretos; ninguno borra ni actualiza. Default: sin `--confirm`; asumido, por validar.
- SUP-S15-011: el índice único del nombre de producto usa la expresión `lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g')))`, que S-11 deja sin fijar. Default: esa expresión; asumido, por validar.

## 1. Requisitos

### REQ-S15-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El repositorio deberá contener una migración inicial en SQL, versionada en packages/db/drizzle y generada con drizzle-kit generate desde el esquema final.

### REQ-S15-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: Aplicar la migración inicial a una base vacía deberá crear todas las tablas, enums, índices y restricciones del esquema de TypeScript.

### REQ-S15-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El CI deberá fallar cuando drizzle-kit check falle.

### REQ-S15-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El CI deberá fallar cuando drizzle-kit generate produzca cambios sobre el esquema.

### REQ-S15-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La migración inicial deberá hacer cumplir en la base de datos que solo exista una fila de Sucursal y una de ConfiguracionNegocio.

### REQ-S15-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La migración inicial deberá contener los CHECK de documento de identidad de S-06 y los CHECK de estado y baja del miembro de S-09.

### REQ-S15-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La migración inicial deberá contener la restricción única de Pago.cobroId de S-04 y el índice único del nombre de producto con la expresión lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g'))).

### REQ-S15-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El comando db:migrar deberá aplicar las migraciones pendientes en orden con el migrador de drizzle-orm.

### REQ-S15-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El comando db:migrar no deberá importar ni invocar el CLI de drizzle-kit.

### REQ-S15-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: Ejecutar db:migrar sin migraciones pendientes deberá terminar con código cero sin modificar ningún dato.

### REQ-S15-011
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos procesos ejecutan db:migrar a la vez entonces el segundo deberá esperar, con un candado asesor tomado en una conexión dedicada, hasta que el primero termine.

### REQ-S15-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: db:migrar deberá aplicar todas las migraciones pendientes dentro de una sola transacción.

### REQ-S15-013
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-022
- texto: Si una migración falla entonces db:migrar deberá terminar con código distinto de cero.

### REQ-S15-014
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-022
- texto: Si DATABASE_URL está ausente o vacía entonces db:migrar y db:sembrar deberán terminar con error antes de conectar.

### REQ-S15-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El código de db:migrar deberá vivir en packages/db/src y el de db:sembrar en packages/infrastructure/seed, de modo que packages/db no importe de packages/infrastructure.

### REQ-S15-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El docker-compose.yml deberá tener un servicio de un solo uso migrar que ejecute db:migrar y reemplace al servicio esquema, sin ejecutar drizzle-kit push.

### REQ-S15-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El servicio web-admin de Compose deberá iniciar solo después de que migrar termine con código cero.

### REQ-S15-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Ni Compose, ni el Dockerfile ni docker-entrypoint.sh deberán ejecutar db:sembrar.

### REQ-S15-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: db:sembrar deberá ejecutar todo su trabajo dentro de una sola transacción.

### REQ-S15-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: db:sembrar deberá tomar al inicio de su transacción un candado asesor de transacción.

### REQ-S15-021
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si la base no tiene el esquema migrado entonces db:sembrar deberá terminar con error sin escribir nada.

### REQ-S15-022
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-002
- texto: Si no existe ninguna sede entonces db:sembrar deberá crear la sede «Local» con una clave de API nueva.

### REQ-S15-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: db:sembrar deberá guardar la clave de API solo como hash SHA-256 y prefijo de 8 caracteres, con la misma función de generación que usa la rotación de S-01.

### REQ-S15-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: db:sembrar deberá imprimir la clave de API en claro una sola vez, en la salida estándar, y solo cuando la crea.

### REQ-S15-025
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-001
- texto: Si no existe la configuración del negocio entonces db:sembrar deberá crearla con el nombre «Adhara Fit».

### REQ-S15-026
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-001
- texto: Si la tabla Plan está vacía entonces db:sembrar deberá crear los planes «1 mes», «2 meses» y «3 meses» de 30, 60 y 90 días a 120.00, 200.00 y 280.00, activos.

### REQ-S15-027
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-001
- texto: Si la tabla MetodoPago está vacía entonces db:sembrar deberá crear Yape, Transferencia BCP y Efectivo, activos y con los órdenes 1, 2 y 3.

### REQ-S15-028
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-001
- texto: Si la tabla Entrenador está vacía entonces db:sembrar deberá crear a María Aguilera, José Montesino, Joa Bonillo y Jesús Bonillo, activos y sin credenciales.

### REQ-S15-029
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-003
- texto: Si no existe ningún administrador entonces db:sembrar deberá crear el primero con el nombre de ADMIN_NOMBRE y el correo de ADMIN_CORREO recortado y en minúsculas.

### REQ-S15-030
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-003
- texto: Si db:sembrar va a crear el primer administrador y ADMIN_NOMBRE o ADMIN_CORREO falta o está vacía, o el correo supera 254 caracteres o no tiene la forma usuario@dominio.tld, entonces deberá terminar con error sin escribir nada.

### REQ-S15-031
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-004
- texto: Si db:sembrar va a crear el primer administrador y ADMIN_CONTRASENA_INICIAL no está vacía y tiene menos de 8 o más de 128 caracteres entonces deberá terminar con error sin escribir nada.

### REQ-S15-032
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-003
- texto: Si ya existe un administrador entonces db:sembrar no deberá exigir ni leer ADMIN_NOMBRE, ADMIN_CORREO ni ADMIN_CONTRASENA_INICIAL.

### REQ-S15-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La contraseña del primer administrador deberá tomarse de ADMIN_CONTRASENA_INICIAL cuando no está vacía y, si no, generarse de 20 caracteres con crypto.randomBytes.

### REQ-S15-034
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: db:sembrar deberá imprimir una contraseña generada una sola vez.

### REQ-S15-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: db:sembrar no deberá imprimir nunca una contraseña tomada del entorno.

### REQ-S15-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: db:sembrar deberá guardar solo el hash de la contraseña, con el hasher de login de packages/infrastructure/auth.

### REQ-S15-037
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S15-002
- texto: db:sembrar no deberá borrar ni actualizar ninguna fila existente.

### REQ-S15-038
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S15-007
- texto: db:sembrar no deberá crear miembros, productos, pagos ni suscripciones.

### REQ-S15-039
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S15-010
- texto: db:sembrar deberá imprimir al terminar un resumen de los bloques creados y omitidos sin ningún secreto.

### REQ-S15-040
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El archivo .env.example deberá listar ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_CONTRASENA_INICIAL sin valores.

### REQ-S15-041
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Los archivos de packages/db, salvo node_modules y generated, no deberán contener los términos admin1234, entrenador1234, gymdemo ni Sede Principal.

### REQ-S15-042
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-seed.mjs encuentra alguno de los términos de REQ-S15-041, deberá terminar con código distinto de cero.

### REQ-S15-043
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-seed.mjs encuentra alguno de los términos de REQ-S15-041, deberá nombrar archivo, línea y término.

### REQ-S15-044
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-seed.mjs en cada pull request.

## 2. Comportamiento

### BEH-S15-001
- cubre: REQ-S15-001, REQ-S15-002
- categoria: feliz
- dado: el esquema final y una base efímera vacía
- cuando: se ejecuta db:migrar
- entonces: existe la carpeta de migraciones con un SQL inicial y la base resultante tiene las mismas tablas, enums, índices y restricciones que una base creada con el esquema de TypeScript

### BEH-S15-002
- cubre: REQ-S15-003, REQ-S15-004
- categoria: error
- dado: un esquema al que se agrega una columna sin generar su migración, y otro intacto
- cuando: corre el paso de CI de deriva
- entonces: el primero falla porque drizzle-kit generate produce archivos nuevos y el segundo pasa; y una carpeta de migraciones inconsistente hace fallar drizzle-kit check

### BEH-S15-003
- cubre: REQ-S15-005
- categoria: error
- dado: una base migrada con la sede y la configuración creadas
- cuando: se intenta insertar una segunda sede y una segunda configuración
- entonces: ambas inserciones fallan por la restricción de la base de datos

### BEH-S15-004
- cubre: REQ-S15-006
- categoria: error
- dado: una base migrada
- cuando: se inserta un miembro con un documento que incumple los CHECK de S-06 y otro con un estado de baja incoherente que incumple los de S-09
- entonces: ambas inserciones fallan por restricción

### BEH-S15-005
- cubre: REQ-S15-007
- categoria: error
- dado: una base migrada con un pago de cobroId K y un producto «Agua 600 ml»
- cuando: se inserta con SQL directo otro pago con cobroId K y otro producto con el nombre «  agua  600 ML  »
- entonces: ambas inserciones fallan por la restricción única

### BEH-S15-006
- cubre: REQ-S15-008, REQ-S15-009, REQ-S15-015
- categoria: feliz
- dado: el código de packages/db y de packages/infrastructure
- cuando: se buscan las importaciones y las invocaciones de drizzle-kit en db:migrar y sus dependencias directas, y las importaciones entre paquetes
- entonces: db:migrar usa el migrador de drizzle-orm, no hay ninguna referencia a drizzle-kit, y packages/db no importa de packages/infrastructure

### BEH-S15-007
- cubre: REQ-S15-010
- categoria: borde
- dado: una base ya migrada con datos
- cuando: se ejecuta db:migrar de nuevo
- entonces: termina con código cero, no modifica ninguna fila y la tabla de control de migraciones no cambia

### BEH-S15-008
- cubre: REQ-S15-011
- categoria: concurrencia
- dado: una base vacía y dos procesos db:migrar lanzados a la vez, con una barrera
- cuando: terminan los dos
- entonces: ambos terminan con código cero, el segundo esperó al primero, cada migración se aplicó una sola vez y el esquema queda completo

### BEH-S15-009
- cubre: REQ-S15-012, REQ-S15-013
- categoria: error
- dado: dos migraciones pendientes de prueba, la segunda con un comando que falla
- cuando: se ejecuta db:migrar
- entonces: termina con código distinto de cero y ni la segunda ni la primera dejaron tablas, columnas ni registro en la tabla de control

### BEH-S15-010
- cubre: REQ-S15-014, REQ-S15-021
- categoria: error
- dado: un entorno sin DATABASE_URL, otro con DATABASE_URL vacía y una base sin migrar
- cuando: se ejecutan db:migrar y db:sembrar
- entonces: los dos primeros terminan con error antes de conectar, y db:sembrar sobre la base sin migrar termina con error sin crear nada

### BEH-S15-011
- cubre: REQ-S15-016, REQ-S15-017, REQ-S15-018
- categoria: feliz
- dado: el docker-compose.yml, el Dockerfile y docker-entrypoint.sh
- cuando: se leen los servicios y los comandos
- entonces: existe el servicio migrar que ejecuta db:migrar, no existe el servicio esquema ni drizzle-kit push, web-admin depende de que migrar termine con código cero, y ninguno de los tres archivos ejecuta db:sembrar

### BEH-S15-012
- cubre: REQ-S15-019, REQ-S15-020, REQ-S15-022, REQ-S15-023, REQ-S15-024, REQ-S15-025
- categoria: feliz
- dado: una base migrada y vacía
- cuando: se ejecuta db:sembrar
- entonces: existe una sola sede «Local» con hash de 64 caracteres hexadecimales y prefijo de 8, creada con la función de generación de S-01, la configuración «Adhara Fit», todo en una transacción con candado, y la clave en claro aparece una vez en la salida y en ninguna tabla

### BEH-S15-013
- cubre: REQ-S15-026, REQ-S15-027, REQ-S15-028
- categoria: feliz
- dado: una base migrada y vacía
- cuando: se ejecuta db:sembrar
- entonces: hay 3 planes (30, 60, 90 días a «120.00», «200.00», «280.00», activos), 3 métodos activos con órdenes 1, 2 y 3 (Yape BILLETERA_DIGITAL, Transferencia BCP TRANSFERENCIA con banco BCP, Efectivo EFECTIVO) y 4 entrenadores activos

### BEH-S15-014
- cubre: REQ-S15-029, REQ-S15-033, REQ-S15-034, REQ-S15-036
- categoria: feliz
- dado: ADMIN_NOMBRE «Nombre Ejemplo», ADMIN_CORREO «  Socio@Ejemplo.PE  » y ADMIN_CONTRASENA_INICIAL vacía
- cuando: se ejecuta db:sembrar
- entonces: se crea el administrador con ese nombre y el correo «socio@ejemplo.pe», se imprime una contraseña de 20 caracteres una sola vez, solo se guarda su hash con el hasher de login y con esa contraseña se puede iniciar sesión

### BEH-S15-015
- cubre: REQ-S15-033, REQ-S15-035
- categoria: borde
- dado: ADMIN_CONTRASENA_INICIAL con 8 caracteres y otra con 128
- cuando: se ejecuta db:sembrar con cada una en una base vacía
- entonces: ambas se aceptan, se usan como contraseña y no se imprime ninguna

### BEH-S15-016
- cubre: REQ-S15-030, REQ-S15-031
- categoria: error
- dado: variables con ADMIN_NOMBRE ausente, ADMIN_CORREO ausente, ADMIN_CORREO vacía, correo «sin-arroba», correo de 255 caracteres, contraseña de 7 caracteres y contraseña de 129 caracteres
- cuando: se ejecuta db:sembrar con cada combinación en una base vacía
- entonces: todas terminan con error y ninguna tabla recibe filas

### BEH-S15-017
- cubre: REQ-S15-032, REQ-S15-037, REQ-S15-038, REQ-S15-039
- categoria: feliz
- dado: una base sembrada en la que el propietario renombró un plan, desactivó un entrenador, borró un método de pago y cambió el precio de otro plan, y un entorno sin las variables ADMIN_*
- cuando: se ejecuta db:sembrar otra vez
- entonces: termina sin error, no se crea, borra ni actualiza ninguna fila de planes, métodos ni entrenadores, ninguna otra tabla cambia, no hay miembros, productos, pagos ni suscripciones, y el resumen lista los bloques omitidos sin secretos

### BEH-S15-018
- cubre: REQ-S15-037
- categoria: borde
- dado: una base sembrada en la que el propietario borró todas las filas de métodos de pago, y otra con la sede creada pero sin configuración
- cuando: se ejecuta db:sembrar
- entonces: se recrean los tres métodos (limitación aceptada de SUP-S15-002) y se crea la configuración que faltaba, sin tocar la sede ni los demás bloques

### BEH-S15-019
- cubre: REQ-S15-019, REQ-S15-020, REQ-S15-037
- categoria: concurrencia
- dado: una base migrada y vacía y dos db:sembrar lanzados a la vez, con una barrera
- cuando: terminan los dos
- entonces: queda una sola sede, una configuración, 3 planes, 3 métodos, 4 entrenadores y un administrador, y la clave y la contraseña se imprimen una sola vez en total

### BEH-S15-020
- cubre: REQ-S15-040
- categoria: feliz
- dado: el archivo .env.example y el código
- cuando: se ejecuta tools/verificar-env.mjs
- entonces: pasa con ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_CONTRASENA_INICIAL listadas sin valor

### BEH-S15-021
- cubre: REQ-S15-041, REQ-S15-042, REQ-S15-043
- categoria: error
- dado: un archivo por cada uno de los cuatro términos de REQ-S15-041
- cuando: se ejecuta tools/verificar-seed.mjs
- entonces: termina con código distinto de cero y nombra archivo, línea y término de cada uno

### BEH-S15-022
- cubre: REQ-S15-044
- categoria: error
- dado: un pull request que agrega admin1234 en un archivo de packages/db
- cuando: corre el CI
- entonces: el paso de tools/verificar-seed.mjs falla y queda en rojo

## 3. Invariantes

### INV-S15-001
- propiedad: ejecutar db:sembrar dos veces deja la base igual que ejecutarla una
- mecanismo: test-propiedad
- deteccion: sobre 20 estados previos generados con un generador congruencial lineal de semilla fija (cada bloque vacío o con datos distintos a los del seed), una segunda ejecución sin variables ADMIN_* no cambia ninguna tabla y no imprime secretos
- protege: REQ-S15-022, REQ-S15-026, REQ-S15-027, REQ-S15-028, REQ-S15-029, REQ-S15-032, REQ-S15-037

### INV-S15-002
- propiedad: ninguna columna de ninguna tabla contiene la contraseña ni la clave de API en claro
- mecanismo: test-propiedad
- deteccion: tras sembrar con una contraseña conocida, la representación en texto de cada fila de cada tabla (to_jsonb) no contiene como subcadena la contraseña ni la clave impresa
- protege: REQ-S15-023, REQ-S15-024, REQ-S15-033, REQ-S15-036

### INV-S15-003
- propiedad: el esquema de TypeScript y las migraciones versionadas describen la misma base
- mecanismo: lint
- deteccion: el paso de CI falla si drizzle-kit check falla, si drizzle-kit generate escribe archivos en un directorio temporal o si tools/comparar-esquemas.mjs encuentra diferencias entre una base migrada y una creada con el esquema
- protege: REQ-S15-001, REQ-S15-002, REQ-S15-003, REQ-S15-004

### INV-S15-004
- propiedad: ninguna credencial fija ni dato de demostración heredado existe en packages/db
- mecanismo: lint
- deteccion: tools/verificar-seed.mjs termina con código distinto de cero y lista archivo:línea y término
- protege: REQ-S15-041, REQ-S15-042, REQ-S15-043

## 4. Criterios de aceptación

### AC-S15-001
- enlaza: REQ-S15-001, REQ-S15-002, BEH-S15-001, INV-S15-003
- metodo: integracion
- procedimiento: con dos bases efímeras vacías, ejecutar db:migrar en una y crear el esquema con drizzle-kit push en la otra (base desechable, REQ-S22-022), y comparar ambas con tools/comparar-esquemas.mjs
- esperado: la herramienta termina con código cero sin diferencias
- test: pendiente

### AC-S15-002
- enlaza: REQ-S15-003, REQ-S15-004, BEH-S15-002, INV-S15-003
- metodo: integracion
- procedimiento: ejecutar el paso de deriva con un esquema al que se agrega una columna sin migración, con una carpeta de migraciones inconsistente y con el esquema intacto; el paso ejecuta drizzle-kit check y drizzle-kit generate hacia un directorio temporal y falla si este contiene archivos
- esperado: falla con los dos primeros casos y pasa con el intacto
- test: pendiente

### AC-S15-003
- enlaza: REQ-S15-005, REQ-S15-006, REQ-S15-007, BEH-S15-003, BEH-S15-004, BEH-S15-005
- metodo: sql
- procedimiento: en una base migrada, ejecutar las seis inserciones inválidas de BEH-S15-003 a BEH-S15-005 (segunda sede, segunda configuración, documento inválido, baja incoherente, cobroId repetido, nombre de producto repetido con otras mayúsculas y espacios)
- esperado: las seis fallan por violación de restricción
- test: pendiente

### AC-S15-004
- enlaza: REQ-S15-008, REQ-S15-009, REQ-S15-015, BEH-S15-006
- metodo: unitario
- procedimiento: buscar con la API de typescript en packages/db y packages/infrastructure las importaciones de drizzle-kit y las llamadas a child_process con ese texto, y las importaciones de packages/db hacia packages/infrastructure
- esperado: db:migrar importa el migrador de drizzle-orm, no hay ninguna referencia a drizzle-kit y no hay importaciones de packages/db hacia packages/infrastructure
- test: pendiente

### AC-S15-005
- enlaza: REQ-S15-010, REQ-S15-012, REQ-S15-013, BEH-S15-007, BEH-S15-009
- metodo: integracion
- procedimiento: ejecutar db:migrar sobre una base ya migrada con datos, y sobre una base con dos migraciones de prueba cuya segunda falla
- esperado: la primera termina con código cero sin cambios y la segunda con código distinto de cero sin dejar nada de ninguna de las dos migraciones
- test: pendiente

### AC-S15-006
- enlaza: REQ-S15-011, BEH-S15-008
- metodo: integracion
- procedimiento: lanzar con Promise.all dos db:migrar sobre una base vacía con una barrera
- esperado: ambos terminan con código cero, el segundo espera al primero y cada migración queda registrada una sola vez
- test: pendiente

### AC-S15-007
- enlaza: REQ-S15-014, REQ-S15-021, BEH-S15-010
- metodo: integracion
- procedimiento: ejecutar db:migrar y db:sembrar sin DATABASE_URL y con DATABASE_URL vacía, y db:sembrar sobre una base sin migrar
- esperado: los dos primeros fallan antes de conectar y el tercero falla sin crear nada
- test: pendiente

### AC-S15-008
- enlaza: REQ-S15-016, REQ-S15-017, REQ-S15-018, BEH-S15-011
- metodo: unitario
- procedimiento: leer docker-compose.yml, Dockerfile y docker-entrypoint.sh con un analizador de YAML y búsqueda de cadenas
- esperado: el servicio migrar existe con db:migrar, no existe el servicio esquema ni la cadena drizzle-kit push, web-admin tiene depends_on migrar con condición service_completed_successfully, y ninguno de los tres archivos contiene db:sembrar
- test: pendiente

### AC-S15-009
- enlaza: REQ-S15-019, REQ-S15-020, REQ-S15-022, REQ-S15-023, REQ-S15-024, REQ-S15-025, REQ-S15-026, REQ-S15-027, REQ-S15-028, BEH-S15-012, BEH-S15-013, INV-S15-002
- metodo: integracion
- procedimiento: en una base migrada vacía, ejecutar db:sembrar capturando la salida, leer sede, configuración, planes, métodos y entrenadores, y buscar la clave impresa en todas las celdas con to_jsonb
- esperado: los datos son los de BEH-S15-012 y BEH-S15-013, la clave sale una vez en la salida y no aparece en ninguna celda
- test: pendiente

### AC-S15-010
- enlaza: REQ-S15-029, REQ-S15-033, REQ-S15-034, REQ-S15-035, REQ-S15-036, BEH-S15-014, BEH-S15-015, INV-S15-002
- metodo: integracion
- procedimiento: sembrar con ADMIN_CONTRASENA_INICIAL vacía, de 8 caracteres y de 128, y con la contraseña generada iniciar sesión por el caso de uso de inicio de sesión
- esperado: la generada mide 20 caracteres, se imprime una vez y permite iniciar sesión; las del entorno no se imprimen; el correo se guarda recortado y en minúsculas; ninguna contraseña aparece en claro en ninguna celda
- test: pendiente

### AC-S15-011
- enlaza: REQ-S15-030, REQ-S15-031, BEH-S15-016
- metodo: integracion
- procedimiento: ejecutar db:sembrar con las siete combinaciones inválidas de BEH-S15-016 contando las filas de todas las tablas
- esperado: todas terminan con error y las tablas quedan con 0 filas
- test: pendiente

### AC-S15-012
- enlaza: REQ-S15-032, REQ-S15-037, REQ-S15-038, REQ-S15-039, BEH-S15-017, BEH-S15-018, INV-S15-001
- metodo: integracion
- procedimiento: sembrar, modificar planes, entrenadores y métodos como en BEH-S15-017, sembrar otra vez sin las variables ADMIN_*, repetir sobre 20 estados previos generados con semilla fija, y vaciar la tabla de métodos y quitar la configuración como en BEH-S15-018
- esperado: ninguna tabla cambia en la segunda ejecución, no se imprimen secretos, el resumen lista los bloques omitidos y no hay miembros, productos, pagos ni suscripciones; con las tablas vaciadas se recrean solo los bloques vacíos
- test: pendiente

### AC-S15-013
- enlaza: REQ-S15-019, REQ-S15-020, REQ-S15-037, BEH-S15-019
- metodo: integracion
- procedimiento: lanzar con Promise.all dos db:sembrar sobre una base migrada vacía con una barrera
- esperado: queda una sola sede, una configuración, 3 planes, 3 métodos, 4 entrenadores y un administrador, y los secretos se imprimen una vez en total
- test: pendiente

### AC-S15-014
- enlaza: REQ-S15-040, BEH-S15-020
- metodo: unitario
- procedimiento: ejecutar tools/verificar-env.mjs de S-00 sobre .env.example y el código con las tres variables nuevas
- esperado: pasa y las tres variables no tienen valor
- test: pendiente

### AC-S15-015
- enlaza: REQ-S15-041, REQ-S15-042, REQ-S15-043, BEH-S15-021, INV-S15-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-seed.mjs con un árbol por cada uno de los cuatro términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los cuatro términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S15-016
- enlaza: REQ-S15-044, BEH-S15-022
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue admin1234 en un archivo de packages/db y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-seed.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas en rojo del migrador, del seed y de la deriva contra una base efímera; (2) `tools/verificar-seed.mjs` y sus pruebas, sobre un árbol que ya no tiene el seed heredado (S-00 lo excluyó); (3) migrador `db:migrar` en `packages/db/src/` con candado asesor en conexión dedicada, transacción única y sus pruebas de fallo y de concurrencia; (4) seed `db:sembrar` en `packages/infrastructure/seed/`, por bloques, cada uno con su prueba, en una sola transacción con candado asesor y con el hasher de login; (5) variables en `.env.example`; (6) **línea base**: `drizzle-kit generate` del esquema final, con los CHECK, únicos e índices de S-04, S-05, S-06, S-09 y S-11 y, si `drizzle-kit` no los emite, declarados con SQL en la propia migración (plan B de S-05 y S-06), y la prueba de comparación con `tools/comparar-esquemas.mjs`; (7) paso de CI de deriva (`drizzle-kit check` y `generate` hacia un directorio temporal sin archivos); (8) Compose: el servicio `migrar` reemplaza al servicio `esquema` y `web-admin` espera a que termine; (9) paso del CI de `verificar-seed`.
- El generador congruencial lineal de semilla fija se escribe en la propia prueba, la base es efímera y la barrera fija el orden de las transacciones; no hay dependencias nuevas (`bcryptjs` pasa a ser dependencia de `packages/infrastructure`, que ya contiene el hasher).
- Los comandos de `drizzle-kit` del CI (`generate`, `check`) no tocan ninguna base real; `drizzle-kit push` solo se usa contra la base desechable de la prueba de comparación (REQ-S22-022).
- AC-S15-016 es un paso manual del propietario.

### 5.2 Migración
- No hay datos que migrar: la línea base es la primera migración; las bases de desarrollo creadas con `drizzle-kit push` se recrean.
- **Enmiendas que se registran al aprobar S-15:**
  - S-22: REQ-S22-029 admite la carpeta `packages/db/drizzle/`; REQ-S22-016, SUP-S22-010, BEH-S22-008 y AC-S22-014 cambian el servicio `esquema` con `drizzle-kit push` por el servicio `migrar` con `db:migrar` una vez que existe el baseline (el `push` sigue para las pruebas efímeras); REQ-S22-017, BEH-S22-017 y AC-S22-015 se mantienen (el entrypoint no migra); SUP-S22-007 y la pregunta de `drizzle-kit check` en el CI quedan cumplidas; ADR-022 §3 y §4 se cumplen en esta spec.
  - S-00: REQ-S00-017 se lee con el servicio `migrar`; `.env.example` suma tres variables sin valor; `bcryptjs` se declara en `packages/infrastructure`.
  - S-11: SUP-S11-003 y el índice único del nombre de producto fijan la expresión `lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g')))`.
  - S-05 y S-06: el plan B de los CHECK con SQL en el baseline se aplica solo si `drizzle-kit` no los emite (plan, paso 6).
  - S-01: la clave del kiosco inicial la crea el seed con la misma función de generación de la rotación.
  - S-23: SUP-S23-010 y 5.3 quedan con la nota de que el seed crea el primer administrador y de que la recuperación manual de la contraseña sigue sin dueño.
  - `docs/datos-iniciales.md`, `docs/06-modelo-datos-cambios.md`, `COBERTURA-RF.md` y `BACKLOG-SPECS.md` (dependencias reales de S-15): nota de que S-15 sembró los datos.
- **Traspasos:** S-17 (aplicar las migraciones en producción con el mismo comando, copia de seguridad previa, restauración, TLS, despliegue y recuperación de la contraseña), S-19 (logo y marca en la configuración) y S-21 (el kiosco usa la clave impresa por el seed).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- El baseline solo es correcto si todas las specs de esquema están implementadas antes (SUP-S15-009); si se genera antes y luego cambia el esquema, habrá que añadir migraciones encima. Mitigación: el plan global (G6) coloca S-15 después de S-23, S-18, S-11, S-12, S-13 y las demás; el paso de deriva detecta cualquier olvido.
- Si `drizzle-kit generate` no emite los CHECK, hay que escribir SQL a mano en la migración y mantenerlo sincronizado con el esquema. Mitigación: la prueba de seis inserciones inválidas (AC-S15-003).
- La contraseña y la clave impresas solo se ven una vez; si el propietario no las anota, la clave se rota desde la pantalla del kiosco (S-23) y la contraseña no tiene restablecimiento (SUP-S23-010). Mitigación: el aviso de la salida y la recomendación de crear un segundo administrador.
- `bcryptjs` solo usa los primeros 72 bytes de una contraseña: una contraseña inicial más larga se acepta pero se trunca al verificar; S-01 lo dejó sin verificar. Mitigación: la contraseña generada mide 20 caracteres y la prueba de inicio de sesión del seed (AC-S15-010) usa la de 128.
- «Solo si la tabla está vacía» (SUP-S15-002) impide que un cambio futuro del seed (por ejemplo, un cuarto plan) llegue a una base ya sembrada, y recrea los datos si el propietario vacía una tabla. Mitigación: los datos nuevos se crean desde la administración o con una migración de datos propia de cada spec.
- Aplicar las migraciones con un servicio aparte puede dejar a producción sin migrar si el despliegue omite ese paso. Mitigación: `web-admin` en Compose depende de `migrar` y S-17 repite el paso en el despliegue; el sistema falla al arrancar si falta una tabla.
- Si el migrador de `drizzle-orm` no envuelve todo el lote en una transacción, `db:migrar` lo hará él mismo (REQ-S15-012); no verificado.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Quién es el primer administrador (nombre y correo)? Default: lo das tú al desplegar con `ADMIN_NOMBRE` y `ADMIN_CORREO`; no se guarda en el repositorio (SUP-S15-003).
- ¿Los planes se llaman «1 mes», «2 meses» y «3 meses»? Default: sí (SUP-S15-001).
- ¿La contraseña inicial se genera y se imprime una vez, salvo que la entregues por variable de entorno? Default: sí (SUP-S15-004).
- ¿El seed se ejecuta a mano una vez, no en cada arranque? Default: a mano (SUP-S15-005).
- ¿Las migraciones se aplican con un paso aparte (servicio `migrar`) y no en el arranque del contenedor? Default: sí (SUP-S15-006).
- ¿No hay datos de demostración ni miembros de prueba? Default: ninguno (SUP-S15-007).
- ¿Los datos de cobro de Yape y del BCP se completan después, desde la administración? Default: sí (SUP-S15-008).

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura, sin ejecutar `spec-lint`), 2026-11-12, sobre el primer borrador. Veredicto global: **REQUIERE CAMBIOS**. Resumen fiel:

> | # | Comprobación | Veredicto | Hallazgo principal |
> |---|---|---|---|
> | 1 | Cabecera y ADR | CUMPLE (2 observaciones) | orígenes `SUP-` fuera de la plantilla; `BACKLOG-SPECS` y `COBERTURA-RF` listaban otras dependencias para S-15 |
> | 2 | REQ | NO CUMPLE | REQ-003, 009, 010, 011, 012, 013, 020, 022 y 029 compuestos; «correo válido» sin criterio |
> | 3 | Cobertura | CUMPLE (formal) | INV-002 detectaba solo celdas «iguales» a la contraseña o clave |
> | 4 | AC | NO CUMPLE (menor) | AC-001 no nombraba herramienta; AC-002 mal clasificado y sin mecanismo; AC-006 solo buscaba importaciones; AC-012 sin nombrar `verificar-env` |
> | 5 | Hechos | NO CUMPLE | «37 carpetas» (son 36 más `migration_lock.toml`); miembros de prueba hasta `:162`; S-23 permite varios administradores; sin evidencia del catálogo «a mano»; faltaba el hasher de login y lo no verificado |
> | 6 | Alcance y conflictos | NO CUMPLE | `packages/db/drizzle/` contra REQ-S22-029; `db:migrar` en el entrypoint contra REQ-S22-017; el servicio `esquema` de Compose contra el baseline; ciclo entre `packages/db` y el hasher; paso 8 ya hecho por S-00 y S-22; README sin REQ; ADR-012 §9 sin tratar |
> | 7 | Escenarios | NO CUMPLE | variables vacías, repetibilidad sin `ADMIN_*`, borrado total de un bloque, expresión del índice de producto, `DATABASE_URL` ausente, base sin migrar, estado parcial, conexión del candado, normalización del correo |

### Conciliación del autor
Los hallazgos se verificaron contra el Repo A y las specs (`seed.ts`, `BcryptPasswordHasher.ts`, `docker-entrypoint.sh`, REQ-S22-016/017/029, REQ-S00-017) y resultaron ciertos; ninguno se rechazó. La spec pasó de 31 REQ a 44, de 20 BEH a 22, de 4 INV a 4 y de 14 AC a 16.

| Fila | Corrección |
|---|---|
| 1 | `depende_de` sin cambios; el backlog y `COBERTURA-RF` se sincronizan al aprobar; ADR-010 sale de `adrs` (REQ-026 cita `docs/datos-iniciales.md` por SUP-S15-001) |
| 2 | REQ divididos (003/004, 008/009, 010 a 013, 019/020, 022 a 024, 033 a 036, 042/043); el correo válido se define en SUP-S15-003 y REQ-030 |
| 3 | INV-002 usa `to_jsonb` y busca la subcadena en cada fila |
| 4 | AC-001 usa `tools/comparar-esquemas.mjs`; AC-002 pasa a integración con `drizzle-kit generate` hacia un directorio temporal; AC-004 busca importaciones, `child_process` y ciclos; AC-014 nombra `tools/verificar-env.mjs` |
| 5 | 0.4 corregido (36 carpetas más el lock, `:101-162`, S-23, hasher citado) y lo no verificado declarado (atomicidad del migrador, código de salida de `generate`, `check()`, `bcryptjs` con más de 72 bytes) |
| 6 | Decisión: Compose reemplaza `esquema` por `migrar` y el entrypoint no cambia (REQ-016 a REQ-018, SUP-S15-006); `db:migrar` en `packages/db/src/`, `db:sembrar` en `packages/infrastructure/seed/` (REQ-015); enmiendas a S-22 y S-00 en 5.2; paso 8 reescrito; README fuera de alcance; ADR-012 §9 en SUP-S15-010; fechas de S-02 declaradas en 0.4 |
| 7 | REQ-014 (`DATABASE_URL`), REQ-021 (base sin migrar), REQ-030 a REQ-032 (variables vacías y solo cuando se crea el administrador), BEH-016, BEH-017 (entorno sin `ADMIN_*`), BEH-018 (tabla vaciada y estado parcial), REQ-011 (conexión dedicada) y SUP-S15-011 (expresión del índice) |
