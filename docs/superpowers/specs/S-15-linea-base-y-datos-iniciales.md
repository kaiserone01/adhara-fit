---
id: S-15
estado: en-revision
adrs: ADR-002, ADR-010, ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-10, S-11, S-18, S-22, S-23
aprobada_por:
fecha_aprobacion:
---
# S-15 — Línea base de la base de datos y datos iniciales de Adhara Fit

## 0. Contexto y alcance

### 0.1 Problema
Las specs S-01 a S-23 cambian el esquema y dejan a S-15 tres cosas: (1) la **línea base** (la primera migración versionada, que S-22 difirió porque aún no había esquema final y mientras tanto la base se crea con `drizzle-kit push`), (2) la **aplicación de las migraciones al arrancar** el contenedor (S-22, SUP-S22-007) y (3) el **seed**: los datos con los que nace el sistema. El seed heredado crea una organización ajena, un administrador con la contraseña fija `admin1234`, un entrenador con otra contraseña fija, planes en dólares y miembros de prueba, y no es repetible (ADR-012 criterio 6 lo prohíbe). Adhara Fit necesita un seed que cree solo lo que el negocio ya sabe (la sede «Local», el negocio «Adhara Fit», tres planes, tres métodos de pago, cuatro entrenadores, la clave del kiosco y el primer administrador), sin contraseñas fijas, que se pueda ejecutar más de una vez sin pisar lo que el propietario cambió.

### 0.2 Dentro de alcance
- Migración inicial versionada (`packages/db/drizzle/`), generada con `drizzle-kit generate` desde el esquema final, con los CHECK, índices únicos e índices que otras specs declararon.
- Comando `db:migrar`, que aplica las migraciones pendientes con el migrador de `drizzle-orm` (no con el CLI de `drizzle-kit`), con candado asesor, y su uso en el arranque del contenedor.
- Paso de CI que falla si el esquema de TypeScript difiere de las migraciones versionadas (`drizzle-kit check` y `drizzle-kit generate` sin cambios), con lo que S-22 dejó pendiente.
- Comando `db:sembrar`, repetible y sin borrar ni actualizar nada.
- Variables `ADMIN_NOMBRE`, `ADMIN_CORREO` y `ADMIN_CONTRASENA_INICIAL` en `.env.example`.
- `tools/verificar-seed.mjs` con su paso en el CI.
- README de arranque: orden de comandos en un clon nuevo.

### 0.3 Fuera de alcance
- Datos de demostración y miembros de prueba: no hay seed de demostración (SUP-S15-007); las pruebas arman sus propios datos.
- Importar miembros existentes: descartado por el propietario (se cargan a mano).
- Restricción por IP, copia de seguridad, restauración, TLS y despliegue en producción: S-17.
- Restablecer la contraseña de un administrador (SUP-S23-010): no hay requisito.
- Los datos de cobro de Yape y del BCP (teléfono, cuenta, CCI, titular): el propietario no los entregó; se cargan desde la administración.
- El logo y la tipografía: S-19.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-15 recibirá después de S-00 a S-11, S-18, S-22 y S-23; se recontarán al empezar.
- **Seed heredado:** `packages/db/prisma/seed.ts` (176 líneas) crea una organización, una sucursal «Sede Principal» con `tasaCambioUSD` (`:11-29`), un administrador con `bcrypt.hash("admin1234", 10)` y el correo `admin@gymdemo.com` (`:41-45`) que imprime junto con la contraseña (`:50`), un entrenador como `UsuarioAdmin` con `bcrypt.hash("entrenador1234", 10)` (`:55-59`), dos planes en dólares con `incluyeEntrenador` (`:72-90`) y tres miembros de prueba (`:101-154`); usa solo `create`, nunca `upsert` ni comprobaciones (verificado con `grep -n` y `Read`).
- **Contraseñas fijas en otros archivos:** `admin1234` o `gymdemo` aparecen además en `clonarZipGym/correoEspejo.test.ts` y `apps/web-admin/scripts/verificar-autorizacion.ts` (verificado con `grep -rln`); S-00 excluye los scripts de `packages/db` y S-23 retira el segundo.
- **Métodos de pago:** el seed genérico no crea ninguno; solo los scripts `sembrarOrganizacionZipGym.ts` y `clonarSedePrincipalAZipGym.ts` crean `MetodoPago` (verificado con `grep -rl`); el catálogo se cargaba a mano desde la administración.
- **Migraciones y arranque:** `packages/db/prisma/migrations/` tiene 37 carpetas (verificado con `ls | wc -l`); `docker-entrypoint.sh:11` ejecuta `prisma migrate deploy` y luego `exec node apps/web-admin/server.js`; `packages/db/package.json` define `db:seed` como `prisma db seed` y `migrate:dev` como `prisma migrate dev`; `Dockerfile.migrate` es destructivo y S-00 lo excluye (verificado con `Read`).
- **Interacción con specs aprobadas:** S-22 difiere el baseline, la aplicación al arrancar (SUP-S22-007) y `drizzle-kit check` a S-15; S-05 exige exactamente una fila de `Sucursal` («Local») con su clave y una de `ConfiguracionNegocio` («Adhara Fit»), con la clave mostrada una sola vez y CHECK y únicos que S-15 declara con SQL si `drizzle-kit push` no los crea; S-01 guarda la clave solo como hash SHA-256 y prefijo de 8 caracteres y limita la contraseña de entrada a 128 caracteres; S-03 define el método de pago (nombre, tipo, banco, titular, teléfono, cuenta, CCI, QR, logo, orden, activo) con cinco tipos; S-07 fija los planes de 30, 60 y 90 días sin `frecuencia` ni `incluyeEntrenador`; S-18 crea la tabla `Entrenador` y S-23 el administrador único con contraseña mínima de 8 caracteres; S-06 y S-09 declaran CHECK de documento y de estado, S-04 el único de `cobroId` y S-11 el índice único del nombre de producto (verificado con `grep -n` en las specs).
- No verificado: el estado de `docker-entrypoint.sh` y del `Dockerfile` tras S-00 y S-22, y que `drizzle-kit generate` produzca los CHECK declarados con `check()` del esquema en la versión fijada por S-22.

### 0.5 Supuestos
- SUP-S15-001: el seed crea la sede «Local» y el negocio «Adhara Fit» (SUP-S05-001), tres planes llamados «1 mes», «2 meses» y «3 meses» de 30, 60 y 90 días a 120.00, 200.00 y 280.00 (`docs/datos-iniciales.md`), tres métodos de pago activos —Yape, Transferencia BCP y Efectivo— en ese orden, y cuatro entrenadores: María Aguilera, José Montesino, Joa Bonillo y Jesús Bonillo. Default: esos datos; asumido, por validar.
- SUP-S15-002: cada bloque del seed (sede, configuración, planes, métodos, entrenadores, administrador) se crea solo si su tabla está vacía; nunca por coincidencia de nombre, para que una segunda ejecución no recree un dato que el propietario renombró, desactivó o borró. Default: «solo si la tabla está vacía»; asumido, por validar.
- SUP-S15-003: el nombre y el correo del primer administrador vienen de las variables `ADMIN_NOMBRE` y `ADMIN_CORREO` del entorno de despliegue y no se escriben en el repositorio; si falta alguna, el seed falla sin escribir nada. Default: variables de entorno; asumido, por validar.
- SUP-S15-004: la contraseña inicial viene de `ADMIN_CONTRASENA_INICIAL` (de 8 a 128 caracteres) o, si no existe, se genera de 20 caracteres con `crypto.randomBytes` y se imprime una sola vez en la salida estándar; solo se guarda su hash (ADR-012 criterio 6). El sistema no obliga a cambiarla en el primer inicio de sesión. Default: ese mecanismo; asumido, por validar.
- SUP-S15-005: el seed es un comando manual (`db:sembrar`) que el propietario ejecuta una vez; el arranque del contenedor aplica migraciones pero no siembra, para que la contraseña y la clave nunca salgan en los registros de cada arranque. Default: manual; asumido, por validar.
- SUP-S15-006: las migraciones se aplican al arrancar el contenedor con el migrador de `drizzle-orm` y un candado asesor; el contenedor no arranca la aplicación si la migración falla. Default: ese arranque; asumido, por validar (S-17 define la copia de seguridad previa en producción).
- SUP-S15-007: no hay seed de demostración ni miembros de prueba. Default: ninguno; asumido, por validar.
- SUP-S15-008: los datos de cobro de Yape y de la cuenta del BCP quedan vacíos en el seed y se completan desde la administración. Default: vacíos; asumido, por validar.
- SUP-S15-009: la línea base se genera al final, cuando todas las specs que cambian el esquema estén implementadas; mientras tanto la base se crea con `drizzle-kit push` (S-22). Default: ese orden, que el plan global (G6) fija; asumido, por validar.

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
- texto: El CI deberá fallar cuando drizzle-kit check falle o cuando drizzle-kit generate produzca cambios sobre el esquema.

### REQ-S15-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La migración inicial deberá hacer cumplir en la base de datos que solo exista una fila de Sucursal y una de ConfiguracionNegocio.

### REQ-S15-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La migración inicial deberá contener los CHECK de documento de identidad de S-06 y los CHECK de estado y baja del miembro de S-09.

### REQ-S15-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La migración inicial deberá contener la restricción única de Pago.cobroId de S-04 y el índice único del nombre normalizado de Producto de S-11.

### REQ-S15-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El comando db:migrar deberá aplicar las migraciones pendientes en orden con el migrador de drizzle-orm.

### REQ-S15-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El comando db:migrar no deberá importar ni invocar el CLI de drizzle-kit.

### REQ-S15-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: Ejecutar db:migrar sin migraciones pendientes deberá terminar con código cero sin modificar ningún dato.

### REQ-S15-009
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos procesos ejecutan db:migrar a la vez entonces el segundo deberá esperar un candado asesor y no repetir las migraciones aplicadas por el primero.

### REQ-S15-010
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-022
- texto: Si una migración falla entonces db:migrar deberá terminar con código distinto de cero y dejar la base como estaba antes de esa migración.

### REQ-S15-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El arranque del contenedor de web-admin deberá ejecutar db:migrar antes de iniciar la aplicación y no iniciarla si db:migrar falla.

### REQ-S15-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El comando db:sembrar deberá ejecutar todo su trabajo dentro de una sola transacción protegida por un candado asesor.

### REQ-S15-013
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-002
- texto: Si no existe ninguna sede entonces db:sembrar deberá crear la sede «Local» con una clave de API guardada solo como hash SHA-256 y prefijo de 8 caracteres.

### REQ-S15-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: db:sembrar deberá imprimir la clave de API en claro una sola vez, en la salida estándar, y solo cuando la crea.

### REQ-S15-015
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-001
- texto: Si no existe la configuración del negocio entonces db:sembrar deberá crearla con el nombre «Adhara Fit».

### REQ-S15-016
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-010
- texto: Si la tabla Plan está vacía entonces db:sembrar deberá crear los planes «1 mes», «2 meses» y «3 meses» de 30, 60 y 90 días a 120.00, 200.00 y 280.00, activos.

### REQ-S15-017
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-001
- texto: Si la tabla MetodoPago está vacía entonces db:sembrar deberá crear Yape, Transferencia BCP y Efectivo, activos y con los órdenes 1, 2 y 3.

### REQ-S15-018
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-001
- texto: Si la tabla Entrenador está vacía entonces db:sembrar deberá crear a María Aguilera, José Montesino, Joa Bonillo y Jesús Bonillo, activos y sin credenciales.

### REQ-S15-019
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-003
- texto: Si no existe ningún administrador entonces db:sembrar deberá crear el primero con el nombre y el correo de ADMIN_NOMBRE y ADMIN_CORREO.

### REQ-S15-020
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S15-003
- texto: Si falta ADMIN_NOMBRE o ADMIN_CORREO, o el correo no es válido, o ADMIN_CONTRASENA_INICIAL tiene menos de 8 o más de 128 caracteres, entonces db:sembrar deberá terminar con error sin escribir nada.

### REQ-S15-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La contraseña del primer administrador deberá tomarse de ADMIN_CONTRASENA_INICIAL o, si no existe, generarse de 20 caracteres con crypto.randomBytes.

### REQ-S15-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: db:sembrar deberá imprimir la contraseña generada una sola vez y no imprimir nunca una contraseña tomada del entorno.

### REQ-S15-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: db:sembrar deberá guardar solo el hash de la contraseña, con el mismo algoritmo con el que inicia sesión el administrador.

### REQ-S15-024
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S15-002
- texto: db:sembrar no deberá borrar ni actualizar ninguna fila existente.

### REQ-S15-025
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S15-007
- texto: db:sembrar no deberá crear miembros, productos, pagos ni suscripciones.

### REQ-S15-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El arranque del contenedor no deberá ejecutar db:sembrar.

### REQ-S15-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El archivo .env.example deberá listar ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_CONTRASENA_INICIAL sin valores.

### REQ-S15-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Los archivos de packages/db, salvo node_modules y generated, no deberán contener los términos admin1234, entrenador1234, gymdemo ni Sede Principal.

### REQ-S15-029
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-seed.mjs encuentra alguno de los términos de REQ-S15-028, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S15-030
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
- entonces: existe la carpeta de migraciones con un SQL inicial y la base resultante tiene las mismas tablas, enums, índices y restricciones que el esquema de TypeScript

### BEH-S15-002
- cubre: REQ-S15-003
- categoria: error
- dado: un esquema al que se agrega una columna sin generar su migración, y otro intacto
- cuando: corre el paso de CI de deriva
- entonces: el primero falla porque drizzle-kit generate produce cambios y el segundo pasa

### BEH-S15-003
- cubre: REQ-S15-004
- categoria: error
- dado: una base migrada con la sede y la configuración creadas
- cuando: se intenta insertar una segunda sede y una segunda configuración
- entonces: ambas inserciones fallan por la restricción de la base de datos

### BEH-S15-004
- cubre: REQ-S15-005
- categoria: error
- dado: una base migrada
- cuando: se inserta un miembro con un documento que incumple los CHECK de S-06 y otro con un estado de baja incoherente que incumple los de S-09
- entonces: ambas inserciones fallan por restricción

### BEH-S15-005
- cubre: REQ-S15-006
- categoria: error
- dado: una base migrada con un pago de cobroId K y un producto «Agua 600 ml»
- cuando: se inserta otro pago con cobroId K y otro producto «  agua  600 ML  »
- entonces: ambas inserciones fallan por la restricción única

### BEH-S15-006
- cubre: REQ-S15-007, REQ-S15-008
- categoria: borde
- dado: una base ya migrada con datos
- cuando: se ejecuta db:migrar de nuevo
- entonces: termina con código cero, no modifica ninguna fila y la tabla de control de migraciones no cambia

### BEH-S15-020
- cubre: REQ-S15-031
- categoria: feliz
- dado: el código de packages/db
- cuando: se buscan las importaciones y las invocaciones de drizzle-kit en el comando db:migrar y en sus dependencias directas
- entonces: no hay ninguna

### BEH-S15-007
- cubre: REQ-S15-009
- categoria: concurrencia
- dado: una base vacía y dos procesos db:migrar lanzados a la vez, con una barrera
- cuando: terminan los dos
- entonces: ambos terminan con código cero, cada migración se aplica una sola vez y el esquema queda completo

### BEH-S15-008
- cubre: REQ-S15-010
- categoria: error
- dado: una migración de prueba cuyo segundo comando falla
- cuando: se ejecuta db:migrar
- entonces: termina con código distinto de cero y ninguna tabla ni columna de esa migración queda creada

### BEH-S15-009
- cubre: REQ-S15-011, REQ-S15-026
- categoria: error
- dado: el script de arranque del contenedor con un db:migrar que falla y otro que funciona
- cuando: se ejecuta cada uno
- entonces: con el fallo no se inicia la aplicación y termina con código distinto de cero; con el éxito se inicia la aplicación; en ningún caso se ejecuta db:sembrar

### BEH-S15-010
- cubre: REQ-S15-012, REQ-S15-013, REQ-S15-014, REQ-S15-015
- categoria: feliz
- dado: una base migrada y vacía
- cuando: se ejecuta db:sembrar
- entonces: existe una sola sede «Local» con hash de 64 caracteres hexadecimales y prefijo de 8, la configuración «Adhara Fit», y la clave en claro aparece una vez en la salida y en ninguna tabla

### BEH-S15-011
- cubre: REQ-S15-016, REQ-S15-017, REQ-S15-018
- categoria: feliz
- dado: una base migrada y vacía
- cuando: se ejecuta db:sembrar
- entonces: hay 3 planes (30, 60, 90 días a «120.00», «200.00», «280.00», activos), 3 métodos activos con órdenes 1, 2 y 3 (Yape BILLETERA_DIGITAL, Transferencia BCP TRANSFERENCIA con banco BCP, Efectivo EFECTIVO) y 4 entrenadores activos

### BEH-S15-012
- cubre: REQ-S15-019, REQ-S15-021, REQ-S15-022, REQ-S15-023
- categoria: feliz
- dado: ADMIN_NOMBRE «Nombre Ejemplo», ADMIN_CORREO «socio@ejemplo.pe» y ADMIN_CONTRASENA_INICIAL sin definir
- cuando: se ejecuta db:sembrar
- entonces: se crea el administrador con ese nombre y correo, se imprime una contraseña de 20 caracteres una sola vez, solo se guarda su hash y con esa contraseña se puede iniciar sesión

### BEH-S15-013
- cubre: REQ-S15-021, REQ-S15-022
- categoria: borde
- dado: ADMIN_CONTRASENA_INICIAL con 8 caracteres y otra con 128
- cuando: se ejecuta db:sembrar con cada una en una base vacía
- entonces: ambas se aceptan, se usan como contraseña y no se imprime ninguna

### BEH-S15-014
- cubre: REQ-S15-020
- categoria: error
- dado: variables con ADMIN_NOMBRE ausente, ADMIN_CORREO ausente, correo «sin-arroba», contraseña de 7 caracteres y contraseña de 129 caracteres
- cuando: se ejecuta db:sembrar con cada combinación en una base vacía
- entonces: todas terminan con error y ninguna tabla recibe filas

### BEH-S15-015
- cubre: REQ-S15-024, REQ-S15-025
- categoria: feliz
- dado: una base sembrada en la que el propietario renombró un plan, desactivó un entrenador, borró un método de pago y cambió el precio de otro plan
- cuando: se ejecuta db:sembrar otra vez
- entonces: no se crea, borra ni actualiza ninguna fila de planes, métodos ni entrenadores, ninguna otra tabla cambia, y no hay miembros, productos, pagos ni suscripciones

### BEH-S15-016
- cubre: REQ-S15-012, REQ-S15-024
- categoria: concurrencia
- dado: una base migrada y vacía y dos db:sembrar lanzados a la vez, con una barrera
- cuando: terminan los dos
- entonces: queda una sola sede, una configuración, 3 planes, 3 métodos, 4 entrenadores y un administrador, y la clave y la contraseña se imprimen una sola vez en total

### BEH-S15-017
- cubre: REQ-S15-027
- categoria: feliz
- dado: el archivo .env.example y el código
- cuando: se comparan las variables leídas con las listadas
- entonces: ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_CONTRASENA_INICIAL están listadas sin valor

### BEH-S15-018
- cubre: REQ-S15-028, REQ-S15-029
- categoria: error
- dado: un archivo por cada uno de los cuatro términos de REQ-S15-028
- cuando: se ejecuta tools/verificar-seed.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S15-019
- cubre: REQ-S15-030
- categoria: error
- dado: un pull request que agrega admin1234 en un archivo de packages/db
- cuando: corre el CI
- entonces: el paso de tools/verificar-seed.mjs falla y queda en rojo

## 3. Invariantes

### INV-S15-001
- propiedad: ejecutar db:sembrar dos veces deja la base igual que ejecutarla una
- mecanismo: test-propiedad
- deteccion: sobre 20 estados previos generados con un generador congruencial lineal de semilla fija (cada bloque vacío o con datos distintos a los del seed), una segunda ejecución no cambia ninguna tabla y no imprime secretos
- protege: REQ-S15-013, REQ-S15-016, REQ-S15-017, REQ-S15-018, REQ-S15-019, REQ-S15-024

### INV-S15-002
- propiedad: ninguna columna de ninguna tabla contiene la contraseña ni la clave de API en claro
- mecanismo: test-propiedad
- deteccion: tras sembrar con una contraseña conocida, ninguna celda de ninguna tabla es igual a la contraseña ni a la clave impresa
- protege: REQ-S15-013, REQ-S15-014, REQ-S15-021, REQ-S15-023

### INV-S15-003
- propiedad: el esquema de TypeScript y las migraciones versionadas describen la misma base
- mecanismo: lint
- deteccion: el paso de CI falla si drizzle-kit check falla o drizzle-kit generate produce cambios
- protege: REQ-S15-001, REQ-S15-002, REQ-S15-003

### INV-S15-004
- propiedad: ninguna credencial fija ni dato de demostración heredado existe en packages/db
- mecanismo: lint
- deteccion: tools/verificar-seed.mjs termina con código distinto de cero y lista archivo:línea y término
- protege: REQ-S15-028, REQ-S15-029

## 4. Criterios de aceptación

### AC-S15-001
- enlaza: REQ-S15-001, REQ-S15-002, BEH-S15-001, INV-S15-003
- metodo: integracion
- procedimiento: con una base efímera vacía, ejecutar db:migrar y comparar el catálogo resultante (tablas, enums, índices y restricciones) con el que declara el esquema de TypeScript según drizzle-kit
- esperado: no hay ninguna diferencia
- test: pendiente

### AC-S15-002
- enlaza: REQ-S15-003, BEH-S15-002, INV-S15-003
- metodo: unitario
- procedimiento: ejecutar las pruebas del paso de deriva con un esquema al que se agrega una columna sin migración y con el esquema intacto
- esperado: el paso falla con el primero y pasa con el segundo
- test: pendiente

### AC-S15-003
- enlaza: REQ-S15-004, REQ-S15-005, REQ-S15-006, BEH-S15-003, BEH-S15-004, BEH-S15-005
- metodo: sql
- procedimiento: en una base migrada, ejecutar las seis inserciones inválidas de BEH-S15-003 a BEH-S15-005 (segunda sede, segunda configuración, documento inválido, baja incoherente, cobroId repetido, nombre de producto repetido)
- esperado: las seis fallan por violación de restricción
- test: pendiente

### AC-S15-004
- enlaza: REQ-S15-007, REQ-S15-008, REQ-S15-010, BEH-S15-006, BEH-S15-008
- metodo: integracion
- procedimiento: ejecutar db:migrar sobre una base ya migrada con datos, y sobre una base con una migración de prueba cuyo segundo comando falla
- esperado: la primera termina con código cero sin cambios y la segunda con código distinto de cero sin dejar nada de esa migración
- test: pendiente

### AC-S15-005
- enlaza: REQ-S15-009, BEH-S15-007
- metodo: integracion
- procedimiento: lanzar con Promise.all dos db:migrar sobre una base vacía con una barrera
- esperado: ambos terminan con código cero y cada migración queda registrada una sola vez
- test: pendiente

### AC-S15-006
- enlaza: REQ-S15-007, REQ-S15-011, REQ-S15-026, REQ-S15-031, BEH-S15-009, BEH-S15-020
- metodo: unitario
- procedimiento: buscar con la API de typescript en packages/db que db:migrar importe el migrador de drizzle-orm y no drizzle-kit, y ejecutar el script de arranque con un db:migrar simulado que falla y otro que funciona
- esperado: el migrador es el de drizzle-orm, con el fallo no se inicia la aplicación y en ningún caso se llama a db:sembrar
- test: pendiente

### AC-S15-007
- enlaza: REQ-S15-012, REQ-S15-013, REQ-S15-014, REQ-S15-015, REQ-S15-016, REQ-S15-017, REQ-S15-018, BEH-S15-010, BEH-S15-011, INV-S15-002
- metodo: integracion
- procedimiento: en una base migrada vacía, ejecutar db:sembrar capturando la salida y leer sede, configuración, planes, métodos y entrenadores
- esperado: los datos son los de BEH-S15-010 y BEH-S15-011, la clave sale una vez en la salida y no aparece en claro en ninguna celda
- test: pendiente

### AC-S15-008
- enlaza: REQ-S15-019, REQ-S15-021, REQ-S15-022, REQ-S15-023, BEH-S15-012, BEH-S15-013, INV-S15-002
- metodo: integracion
- procedimiento: sembrar con ADMIN_CONTRASENA_INICIAL ausente, de 8 caracteres y de 128, y con la contraseña generada iniciar sesión por el caso de uso de inicio de sesión
- esperado: la generada mide 20 caracteres, se imprime una vez y permite iniciar sesión; las del entorno no se imprimen; ninguna se guarda en claro
- test: pendiente

### AC-S15-009
- enlaza: REQ-S15-020, BEH-S15-014
- metodo: integracion
- procedimiento: ejecutar db:sembrar con las cinco combinaciones inválidas de BEH-S15-014 contando las filas de todas las tablas
- esperado: todas terminan con error y las tablas quedan con 0 filas
- test: pendiente

### AC-S15-010
- enlaza: REQ-S15-024, REQ-S15-025, BEH-S15-015, INV-S15-001
- metodo: integracion
- procedimiento: sembrar, modificar planes, entrenadores y métodos como en BEH-S15-015, sembrar otra vez y repetir sobre 20 estados previos generados con semilla fija
- esperado: ninguna tabla cambia en la segunda ejecución, no se imprimen secretos y no hay miembros, productos, pagos ni suscripciones
- test: pendiente

### AC-S15-011
- enlaza: REQ-S15-012, REQ-S15-024, BEH-S15-016
- metodo: integracion
- procedimiento: lanzar con Promise.all dos db:sembrar sobre una base migrada vacía con una barrera
- esperado: queda una sola sede, una configuración, 3 planes, 3 métodos, 4 entrenadores y un administrador, y los secretos se imprimen una vez en total
- test: pendiente

### AC-S15-012
- enlaza: REQ-S15-027, BEH-S15-017
- metodo: unitario
- procedimiento: ejecutar la comparación de variables de entorno de S-00 sobre .env.example y el código con las tres variables nuevas
- esperado: la comparación pasa y las tres variables no tienen valor
- test: pendiente

### AC-S15-013
- enlaza: REQ-S15-028, REQ-S15-029, BEH-S15-018, INV-S15-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-seed.mjs con un árbol por cada uno de los cuatro términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los cuatro términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S15-014
- enlaza: REQ-S15-030, BEH-S15-019
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue admin1234 en un archivo de packages/db y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-seed.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas en rojo del migrador, del seed y de la deriva contra una base efímera; (2) `tools/verificar-seed.mjs` y sus pruebas, sobre un árbol que ya no tiene el seed heredado (S-00 lo excluyó); (3) migrador `db:migrar` con candado asesor y su prueba de fallo y de concurrencia; (4) seed `db:sembrar` por bloques, cada uno con su prueba, en una sola transacción con candado asesor; (5) variables en `.env.example`; (6) **línea base**: `drizzle-kit generate` del esquema final, con los CHECK, únicos e índices de S-04, S-05, S-06, S-09 y S-11 y, si `drizzle-kit` no los emite, declarados con SQL en la propia migración (plan B de S-05 y S-06), y la prueba de comparación del catálogo; (7) paso de CI de deriva (`drizzle-kit check` y `generate` sin cambios), que S-22 dejó desactivado; (8) arranque del contenedor con `db:migrar` y README de arranque, y retiro de `prisma migrate deploy`, de `Dockerfile.migrate` y de `db:seed`; (9) paso del CI de `verificar-seed`.
- El generador congruencial lineal de semilla fija se escribe en la propia prueba, la base es efímera y la barrera fija el orden de las transacciones; no hay dependencias nuevas.
- Las pruebas del migrador y del seed usan el cliente y el migrador de `drizzle-orm` ya fijados por S-22; los comandos de `drizzle-kit` del CI (`generate`, `check`) no tocan ninguna base de datos real.
- AC-S15-014 es un paso manual del propietario.

### 5.2 Migración
- No hay datos que migrar: la línea base es la primera migración; las bases de desarrollo creadas con `drizzle-kit push` se recrean.
- **Enmiendas que se registran al aprobar S-15:**
  - S-22: SUP-S22-007 (migración al arrancar) y la pregunta de `drizzle-kit check` en el CI quedan cumplidas; ADR-022 §3 y §4 (baseline y aplicación al arrancar) se cumplen en esta spec.
  - S-05 y S-06: el plan B de los CHECK con SQL en el baseline se aplica solo si `drizzle-kit` no los emite (plan, paso 6).
  - S-01: la clave del kiosco inicial la crea el seed (REQ-S15-013 y REQ-S15-014), con la misma función de generación de la rotación.
  - S-23: SUP-S23-010 se acompaña de la nota de que el seed crea el primer administrador y que la recuperación manual de la contraseña sigue sin definir.
  - S-00: `.env.example` suma tres variables sin valor.
  - `docs/datos-iniciales.md`, `docs/06-modelo-datos-cambios.md` y `BACKLOG-SPECS.md`: nota de que S-15 sembró los datos.
- **Traspasos:** S-17 (copia de seguridad previa a migrar en producción, restauración, TLS y despliegue), S-19 (logo y marca en la configuración) y S-21 (el kiosco usa la clave impresa por el seed).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- El baseline solo es correcto si todas las specs de esquema están implementadas antes (SUP-S15-009); si se genera antes y luego cambia el esquema, habrá que añadir migraciones encima. Mitigación: el plan global (G6) coloca S-15 después de S-23, S-18, S-11 y las demás; el paso de deriva detecta cualquier olvido.
- Si `drizzle-kit generate` no emite los CHECK, hay que escribir SQL a mano en la migración y mantenerlo sincronizado con el esquema. Mitigación: la prueba de seis inserciones inválidas (AC-S15-003).
- La contraseña y la clave impresas solo se ven una vez; si el propietario no las anota, la clave se rota desde la pantalla del kiosco (S-23) y la contraseña no tiene restablecimiento (SUP-S23-010). Mitigación: el aviso de la salida y la recomendación de crear un segundo administrador.
- «Solo si la tabla está vacía» (SUP-S15-002) impide que un cambio futuro del seed (por ejemplo, un cuarto plan) llegue a una base ya sembrada. Mitigación: los datos nuevos se crean desde la administración o con una migración de datos propia de cada spec.
- Un arranque que migra automáticamente puede aplicar una migración defectuosa a producción. Mitigación: cada migración corre en una transacción, S-17 define la copia de seguridad previa y el contenedor no arranca la aplicación si falla.
- El estado de `docker-entrypoint.sh` y del `Dockerfile` tras S-00 y S-22 no está verificado. Mitigación: se leen al empezar el paso 8.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Quién es el primer administrador (nombre y correo)? Default: lo da el propietario al desplegar con `ADMIN_NOMBRE` y `ADMIN_CORREO`; no se guarda en el repositorio (SUP-S15-003).
- ¿Los planes se llaman «1 mes», «2 meses» y «3 meses»? Default: sí (SUP-S15-001).
- ¿La contraseña inicial se genera y se imprime una vez, salvo que el propietario la entregue por variable de entorno? Default: sí (SUP-S15-004).
- ¿El seed se ejecuta a mano una vez, no en cada arranque? Default: a mano (SUP-S15-005).
- ¿No hay datos de demostración ni miembros de prueba? Default: ninguno (SUP-S15-007).
- ¿Los datos de cobro de Yape y del BCP se completan después, desde la administración? Default: sí (SUP-S15-008).
