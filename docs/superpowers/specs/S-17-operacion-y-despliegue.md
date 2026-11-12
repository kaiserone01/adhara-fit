---
id: S-17
estado: en-revision
adrs: ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-02, S-05, S-06, S-09, S-15, S-22, S-23
aprobada_por:
fecha_aprobacion:
---
# S-17 — Operación y despliegue: producción con TLS, respaldos, restauración, monitoreo y recuperación de acceso

## 0. Contexto y alcance

### 0.1 Problema
El PRD pide desplegar en un subdominio propio con HTTPS (RF-70), respaldo diario de la base con retención de al menos 14 días y prueba de restauración mensual (RNF-07), registros estructurados y alerta ante fallos (RNF-08), y contenedores con migraciones al arrancar (RNF-09). Las specs anteriores dejaron a S-17 cuatro cosas concretas: aplicar las migraciones en producción con el mismo comando de S-15, fijar el proxy de confianza que S-01 necesita para la IP del cliente, la restricción por IP que pidió el propietario y la recuperación de la contraseña de un administrador (S-23). El Repo A solo trae Dockerfiles y un `docker-entrypoint.sh`; no hay configuración de producción, respaldo ni monitoreo. S-17 define un despliegue en un VPS con Docker Compose, con Caddy para el TLS, un contenedor de respaldos cifrados con copia fuera del servidor, una ruta de salud para un monitor externo, registros en JSON y un procedimiento de despliegue y de recuperación documentado. El hosting y el dominio los elige el propietario (P-12).

### 0.2 Dentro de alcance
- `docker-compose.prod.yml` con PostgreSQL, el servicio de un solo uso `migrar`, `web-admin`, Caddy y el contenedor de respaldos.
- TLS automático con Caddy para el dominio del propietario, redirección de HTTP a HTTPS y proxy de confianza para S-01.
- Restricción opcional por IP (`IPS_PERMITIDAS`).
- Respaldo diario cifrado con `age` y copia a un bucket S3 compatible, con retención, y restauración probada con un script.
- Ruta pública `/api/salud` para un monitor externo.
- Registros estructurados en JSON con un módulo propio, sin datos personales, y rotación de los registros de Docker.
- `scripts/desplegar.sh` (respaldo previo, migración, arranque y verificación) y reversión documentada.
- Comando `admin:restablecer` para restablecer la contraseña de un administrador desde el servidor.
- Runbooks en `docs/ops/`.
- `tools/verificar-operacion.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Elegir el proveedor del VPS, comprar el dominio y crear las cuentas del bucket y del monitor: el propietario (P-12).
- Alertas enviadas por el servidor (correo, WhatsApp o SMS): las envía un monitor externo (SUP-S17-005); tampoco hay alerta específica por fallos de check-in (RNF-08): esos errores quedan en los registros JSON y se tratan como riesgo (5.3).
- Agregación de registros, métricas y tableros más allá del JSON en la salida del contenedor.
- Respaldo de las fotos de R2, que ya están en un servicio administrado, y de la configuración de Caddy fuera del repositorio.
- Alta disponibilidad, balanceo y réplicas: un solo servidor.
- Endurecimiento del sistema operativo del VPS: solo una lista de comprobación en el runbook.
- Escaneo de vulnerabilidades de las imágenes: lo cubren `npm audit` y gitleaks (S-00).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-17 recibirá después de S-00 a S-15, S-22 y S-23; se recontarán al empezar.
- **Despliegue heredado:** el Repo A tiene `Dockerfile` (con `TZ=America/Caracas` en `:42`, que S-02 cambia), `docker-entrypoint.sh` (que ejecuta `prisma migrate deploy` y luego `node apps/web-admin/server.js`, `:11-13`), `apps/kiosk/Dockerfile`, `apps/vitrina/Dockerfile`, `packages/db/Dockerfile.migrate` (destructivo, excluido por S-00) y `.dockerignore`; no tiene `docker-compose.yml` ni configuración de proxy, respaldo o monitoreo (verificado con `ls`, `find` y `Read`); S-00 agrega el Compose de desarrollo y S-22 elimina `migrate-toolkit`.
- **Registros:** hay 35 llamadas a `console.log`, `console.error`, `console.warn` o `console.info` en 23 archivos de `apps` y `packages`, sin contar pruebas, `packages/db`, `scripts` ni las apps de TV: 25 en 18 archivos de `web-admin`, 1 en `kiosk`, 5 en 3 archivos de `vitrina` y 4 en `apps/worker/src/actualizar-tasa.ts`, que S-00 no copia, de modo que quedan 31 llamadas en 22 archivos (verificado con `grep -rIn`); `console.error(error)` aparece en `api/checkin/route.ts:62`, `api/miembros/route.ts:67` y `lib/activacion.ts:28` (S-06 §0.4).
- **Auditoría y sesiones:** `RegistroAuditoria` exige `usuarioId` (clave foránea a `UsuarioAdmin`) y tiene `entidad`, `entidadId`, `campo`, `valorAnterior`, `valorNuevo`, `motivo` y `createdAt` (`schema.prisma:582-593`); `Sesion` está en `schema.prisma:595-609`; el hasher de contraseñas es `packages/infrastructure/auth/BcryptPasswordHasher.ts:1,4` (verificado con `Read`).
- **Fotos:** `storageR2.ts` lee `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` y `R2_PUBLIC_URL` (`:4-8`) (verificado con `Read`).
- **Interacción con specs aprobadas:** S-01 toma como IP del cliente el último valor de `X-Forwarded-For`, exige un solo proxy de confianza que lo añada y deja ese despliegue a S-17 (SUP-S01-003), envía HSTS con `NODE_ENV=production` y `noindex`, define como rutas públicas `auth/login` y `auth/logout` en su test de contrato (REQ-S01-015) y limita los intentos de login por clave de correo e IP; S-05 dejó solo esas rutas públicas y descartó una ruta de salud (REQ-S05-025 y SUP-S05-014); S-15 define `db:migrar` (código en `packages/db/src/`), el servicio `migrar`, el seed manual, `bcryptjs` en `packages/infrastructure` y la excepción a ADR-012 §9 (SUP-S15-010), y deja a S-17 aplicar las migraciones en producción, la copia previa y la recuperación de la contraseña; S-22 prohíbe órdenes de migración en `Dockerfile` y `docker-entrypoint.sh` (REQ-S22-017); S-23 deja la recuperación manual de la contraseña (SUP-S23-010) sin dueño; S-00 compara las variables de `process.env` con `.env.example` salvo su sección «Solo Compose» (REQ-S00-006); S-09 define `RegistroAuditoria` como el registro de acciones sobre miembros; S-12 aporta las variables SMTP, que S-17 no usa (verificado con `grep -n` en las specs).
- **Pendiente del PRD:** P-12 (dominio, hosting y cuentas) sin respuesta, con el valor por defecto «VPS con Docker» (`docs/08:37`); RF-70 dice que todo requiere sesión salvo login y kiosco (`docs/01:131`); RNF-02 pide un listado fluido con 2 000 miembros o más; RNF-07 a RNF-09 (`docs/01:140,145-147`) (verificado con `Read`).
- No verificado: el comportamiento de Caddy con certificados reales en el servidor del propietario, las versiones de `age`, `rclone`, PostgreSQL y MinIO de las imágenes que se fijen, que el VPS elegido permita puertos 80 y 443, y cómo quedan el `Dockerfile` y el entorno de ejecución de los comandos `db:migrar` y `admin:restablecer` tras S-22 (S-15 §0.4).

### 0.5 Supuestos
- SUP-S17-001: el despliegue es un único VPS con Docker Compose (P-12, default «VPS con Docker»), con PostgreSQL en un contenedor con volumen nombrado y sin puerto publicado, y `web-admin` sin puerto publicado: solo Caddy escucha, en los puertos 80 y 443 por TCP, con HTTP/3 desactivado. Default: ese despliegue; asumido, por validar.
- SUP-S17-002: Caddy obtiene y renueva los certificados de Let's Encrypt para el dominio indicado en `DOMINIO` y fija el valor de `X-Forwarded-For` a la IP real de la conexión, con lo que S-01 lee la IP correcta (SUP-S01-003). Default: Caddy; asumido, por validar.
- SUP-S17-003: `IPS_PERMITIDAS` es una lista de IPv4, IPv6 o CIDR separada por comas, con espacios alrededor ignorados y valores repetidos fusionados; si está vacía no hay restricción; si tiene valores, Caddy responde 403 a cualquier otra IP en todas las rutas salvo `/api/salud`. El kiosco y el televisor de la vitrina comparten la IP pública del gimnasio, que va en la lista. Default: vacía; asumido, por validar (idea del propietario).
- SUP-S17-004: el respaldo es `pg_dump` en formato personalizado canalizado directamente a `age` (sin archivo en claro) para la clave pública `RESPALDO_AGE_PUBLICA`, subido a un bucket S3 compatible (`RESPALDO_S3_*`, distinto del de las fotos) con el nombre `adharafit-AAAAMMDD-HHMMSS.dump.age` (hora de Lima); la clave privada la guarda el propietario fuera del servidor. Se conservan los 14 respaldos diarios más recientes y, aparte, los 5 respaldos previos a un despliegue más recientes (`adharafit-previo-…`), de modo que varios despliegues en un día no reducen los 14 días. El respaldo corre a las 03:00 de Lima. Default: ese esquema; asumido, por validar.
- SUP-S17-005: la alerta la da un monitor externo gratuito con comprobación de palabra clave que consulta `/api/salud` cada 5 minutos y avisa al propietario cuando no recibe respuesta, recibe 503 o la respuesta no contiene `"estado":"ok"` (con lo que también avisa un estado `degradado`, por ejemplo una restauración de prueba vencida); el servidor no envía alertas por su cuenta. Default: monitor externo con palabra clave; asumido, por validar.
- SUP-S17-006: `/api/salud` es pública, responde en JSON con `estado` (`ok`, `degradado` o `caido`), `db`, `ultimoRespaldoHoras`, `ultimaRestauracionDias` y `version`, sin nombres, conteos ni datos del negocio. `ultimoRespaldoHoras` y `ultimaRestauracionDias` son enteros redondeados hacia abajo o `null` si no existen o el archivo de estado está ausente, ilegible o corrupto. Responde 503 cuando la base no responde en 2 segundos a una consulta de prueba, o el último respaldo tiene más de 1 560 minutos (26 horas), o no existe y el proceso lleva más de 26 horas en marcha; responde 200 con `degradado` cuando la última restauración de prueba tiene más de 35 días o no existe. Default: ese contrato; asumido, por validar.
- SUP-S17-007: la restauración de prueba la ejecuta el propietario una vez al mes con `restaurar.sh`, entregando la clave privada con `--clave ARCHIVO` o por la entrada estándar; el script la lee sin copiarla y el propietario borra su copia del servidor al terminar; restaura en una base temporal, comprueba tablas y datos mínimos y la borra. Default: mensual y manual; asumido, por validar.
- SUP-S17-008: el despliegue lo ejecuta una persona con acceso al VPS con `scripts/desplegar.sh`, que hace un respaldo previo (salvo en el primer despliegue, cuando aún no existe base), aplica las migraciones con `db:migrar`, arranca la versión nueva y verifica `/api/salud`; las migraciones solo avanzan, y volver a una versión anterior del esquema se hace restaurando el respaldo previo. Default: ese procedimiento; asumido, por validar.
- SUP-S17-009: los registros son líneas JSON en la salida estándar con `nivel`, `mensaje`, `fecha` (instante UTC), `ruta` y `codigo`, producidos por un módulo propio de un solo archivo sin dependencias de terceros; nunca incluyen cuerpos de petición, cabeceras, contraseñas, claves, documentos ni correos. Los comandos de línea (`db:migrar`, `db:sembrar`, `admin:restablecer`) escriben su salida con `process.stdout.write`. Docker rota los registros a 5 archivos de 10 MB por contenedor. Default: ese formato; asumido, por validar.
- SUP-S17-010: `admin:restablecer` genera una contraseña de 20 caracteres, la imprime una vez, guarda solo su hash, cierra las sesiones y borra los intentos fallidos de login del administrador, y deja una fila de `RegistroAuditoria` con `usuarioId` y `entidadId` del administrador, `entidad` «UsuarioAdmin», `campo` «contraseña», `valorAnterior` y `valorNuevo` nulos y `motivo` «Restablecimiento desde el servidor»; exige `--confirm` y el correo, y solo se puede ejecutar con acceso al servidor y a `DATABASE_URL`. Default: ese mecanismo; asumido, por validar.
- SUP-S17-011: `admin:restablecer` y `restaurar.sh --produccion` actúan sobre producción por diseño, por lo que ADR-012 §9 se aplica con `--confirm` obligatorio y el registro de lo hecho, sin la comprobación de «no producción»; el respaldo y el despliegue no son scripts destructivos. Default: esa aplicación; asumido, por validar.
- SUP-S17-012: las pruebas de los scripts usan la herramienta de pruebas del repositorio invocando los scripts con `child_process`, un bucket S3 real de prueba con una imagen de MinIO fijada por versión en el CI, y un lector de YAML (`yaml`) como dependencia de desarrollo con versión exacta, solo para leer el Compose en las pruebas. Default: esas herramientas; asumido, por validar.
- SUP-S17-013: los respaldos del bucket pueden borrarse con las credenciales del servidor; el propietario activa en el bucket el versionado o el bloqueo de objetos para que un servidor comprometido no destruya los respaldos. Default: recomendación en el runbook; asumido, por validar.

## 1. Requisitos

### REQ-S17-001
- tipo: ubicuo
- prioridad: MUST
- origen: RF-70
- texto: El repositorio deberá contener docker-compose.prod.yml con los servicios postgres, migrar, web-admin, caddy y respaldo.

### REQ-S17-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: En docker-compose.prod.yml solo el servicio caddy deberá publicar puertos.

### REQ-S17-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El servicio caddy deberá publicar únicamente los puertos 80 y 443 por TCP, con HTTP/3 desactivado.

### REQ-S17-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El servicio migrar de docker-compose.prod.yml deberá ejecutar db:migrar.

### REQ-S17-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El servicio web-admin de docker-compose.prod.yml deberá iniciar solo después de que migrar termine con código cero.

### REQ-S17-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El servicio web-admin de producción deberá ejecutarse con NODE_ENV production.

### REQ-S17-007
- tipo: ubicuo
- prioridad: MUST
- origen: RF-70
- texto: Caddy deberá obtener y renovar el certificado TLS del dominio de la variable DOMINIO.

### REQ-S17-008
- tipo: ubicuo
- prioridad: MUST
- origen: RF-70
- texto: Caddy deberá redirigir las peticiones HTTP a HTTPS.

### REQ-S17-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Caddy deberá reemplazar el valor de X-Forwarded-For por la IP real de la conexión antes de enviar la petición a web-admin.

### REQ-S17-010
- tipo: mientras
- prioridad: MUST
- origen: ADR-012
- texto: Mientras IPS_PERMITIDAS tenga valores, Caddy deberá responder 403 a las peticiones cuya IP no esté en la lista, salvo a /api/salud.

### REQ-S17-011
- tipo: mientras
- prioridad: MUST
- origen: ADR-012
- texto: Mientras IPS_PERMITIDAS esté vacía, Caddy no deberá restringir por IP.

### REQ-S17-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La lista IPS_PERMITIDAS deberá aceptar IPv4, IPv6 y CIDR separados por comas, ignorar los espacios alrededor de cada valor y fusionar los repetidos.

### REQ-S17-013
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si IPS_PERMITIDAS contiene un valor que no es una IP ni un CIDR válido entonces el contenedor de Caddy deberá negarse a arrancar.

### REQ-S17-014
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si el contenedor de Caddy se niega a arrancar por IPS_PERMITIDAS entonces deberá imprimir el valor inválido.

### REQ-S17-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El archivo .env.example deberá listar sin valores, en una sección de despliegue, las variables DOMINIO, IPS_PERMITIDAS, POSTGRES_PASSWORD, RESPALDO_AGE_PUBLICA, RESPALDO_S3_ENDPOINT, RESPALDO_S3_BUCKET, RESPALDO_S3_ACCESO y RESPALDO_S3_SECRETO.

### REQ-S17-016
- tipo: ubicuo
- prioridad: MUST
- origen: RF-70
- texto: La ruta /api/salud deberá responder sin sesión con un JSON que contenga estado, db, ultimoRespaldoHoras, ultimaRestauracionDias y version.

### REQ-S17-017
- tipo: ubicuo
- prioridad: MUST
- origen: RF-70
- texto: La respuesta de /api/salud no deberá contener ningún dato distinto de los cinco campos de REQ-S17-016.

### REQ-S17-018
- tipo: si-entonces
- prioridad: MUST
- origen: RF-70
- texto: Si la base de datos no responde en 2 segundos a una consulta de prueba entonces /api/salud deberá responder 503 con estado caido.

### REQ-S17-019
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-07
- texto: Si el último respaldo tiene más de 1 560 minutos entonces /api/salud deberá responder 503 con estado caido.

### REQ-S17-020
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-07
- texto: Si no existe ningún respaldo y el proceso lleva más de 26 horas en marcha entonces /api/salud deberá responder 503 con estado caido.

### REQ-S17-021
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-07
- texto: Si la última restauración de prueba tiene más de 35 días o no existe, y la base y el respaldo están bien, entonces /api/salud deberá responder 200 con estado degradado.

### REQ-S17-022
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-08
- texto: Si el archivo de estado está ausente, ilegible o corrupto entonces /api/salud deberá tratar el respaldo y la restauración como inexistentes, devolver null en sus campos y no lanzar una excepción.

### REQ-S17-023
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: ultimoRespaldoHoras y ultimaRestauracionDias deberán ser enteros redondeados hacia abajo o null.

### REQ-S17-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La ruta /api/salud deberá figurar como pública en el test de contrato de rutas de S-01.

### REQ-S17-025
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El contenedor de respaldo deberá ejecutar el trabajo de respaldo todos los días a las 03:00 de la zona America/Lima con una tabla de cron propia.

### REQ-S17-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El trabajo de respaldo deberá canalizar la salida de pg_dump en formato personalizado directamente a age, sin escribirla en claro en el disco.

### REQ-S17-027
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El trabajo de respaldo deberá cifrar cada respaldo para la clave pública de RESPALDO_AGE_PUBLICA.

### REQ-S17-028
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El trabajo de respaldo deberá subir cada respaldo al bucket de RESPALDO_S3_BUCKET con el nombre adharafit-AAAAMMDD-HHMMSS.dump.age en hora de Lima.

### REQ-S17-029
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: Tras una subida correcta, el trabajo de respaldo deberá conservar en el bucket solo los 14 respaldos adharafit- diarios más recientes.

### REQ-S17-030
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: Tras una subida correcta, el trabajo de respaldo deberá conservar solo los 5 respaldos adharafit-previo- más recientes, sin contarlos entre los 14 diarios.

### REQ-S17-031
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-07
- texto: Si el respaldo, el cifrado o la subida fallan entonces el trabajo de respaldo no deberá borrar ningún respaldo anterior.

### REQ-S17-032
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-07
- texto: Si el respaldo, el cifrado o la subida fallan entonces el trabajo de respaldo no deberá actualizar el archivo de estado.

### REQ-S17-078
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-07
- texto: Si el respaldo, el cifrado o la subida fallan entonces el trabajo de respaldo deberá terminar con código distinto de cero.

### REQ-S17-033
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: Tras una subida correcta, el trabajo de respaldo deberá escribir la fecha del respaldo en el archivo de estado compartido con web-admin en solo lectura.

### REQ-S17-034
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos ejecuciones del trabajo de respaldo coinciden entonces la segunda deberá esperar con un candado de archivo a que termine la primera.

### REQ-S17-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Ningún archivo de respaldo en claro deberá permanecer en el disco del servidor al terminar el trabajo de respaldo, con éxito o con error.

### REQ-S17-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La clave privada de age no deberá estar en el repositorio, en las imágenes, en docker-compose.prod.yml ni en .env.example.

### REQ-S17-037
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá descargar el respaldo indicado o el más reciente del bucket.

### REQ-S17-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El script restaurar.sh deberá leer la clave privada de age del archivo de --clave o de la entrada estándar y no copiarla a ningún otro lugar.

### REQ-S17-039
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá restaurar el respaldo descifrado en una base temporal.

### REQ-S17-040
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá comprobar en la base temporal que existen todas las tablas del esquema.

### REQ-S17-041
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá comprobar en la base temporal que la tabla de control de migraciones está al día.

### REQ-S17-042
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá comprobar en la base temporal que hay al menos un administrador.

### REQ-S17-043
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá imprimir PASS o FAIL con el motivo.

### REQ-S17-044
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá terminar con código cero tras PASS y con código distinto de cero tras FAIL.

### REQ-S17-045
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá borrar la base temporal y los archivos descifrados al terminar, con éxito o con error.

### REQ-S17-046
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El script restaurar.sh no deberá escribir en la base de producción salvo que se ejecute con --produccion y --confirm.

### REQ-S17-047
- tipo: cuando
- prioridad: MUST
- origen: RNF-07
- texto: Cuando restaurar.sh termina con PASS, deberá registrar la fecha de la restauración de prueba en el archivo de estado compartido.

### REQ-S17-048
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: Los registros del sistema deberán ser líneas JSON con nivel, mensaje, fecha en UTC, ruta y código, escritas por un módulo propio de un solo archivo sin dependencias de terceros.

### REQ-S17-049
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: Los registros no deberán incluir cuerpos de petición, cabeceras, contraseñas, claves, documentos de identidad ni correos.

### REQ-S17-050
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: Las rutas, acciones y casos de uso deberán registrar sus errores inesperados con el módulo de registros y no con console.

### REQ-S17-051
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: Los comandos db:migrar, db:sembrar y admin:restablecer deberán escribir su salida con process.stdout.write.

### REQ-S17-052
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: Docker deberá rotar los registros de cada contenedor de producción a 5 archivos de 10 MB.

### REQ-S17-053
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: Cada contenedor de producción deberá reiniciarse automáticamente salvo que se detenga a mano.

### REQ-S17-054
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: scripts/desplegar.sh deberá negarse a ejecutarse con cambios sin confirmar en el árbol de trabajo.

### REQ-S17-055
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si ya hay otro scripts/desplegar.sh en ejecución entonces el segundo deberá negarse con un candado de archivo.

### REQ-S17-056
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: scripts/desplegar.sh deberá ejecutar un respaldo previo con el prefijo adharafit-previo- antes de aplicar las migraciones.

### REQ-S17-057
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-09
- texto: Si el respaldo previo falla entonces scripts/desplegar.sh deberá detenerse con error antes de aplicar ninguna migración.

### REQ-S17-058
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-09
- texto: Si todavía no existe la base de datos de producción entonces scripts/desplegar.sh deberá omitir el respaldo previo e imprimir que es el primer despliegue.

### REQ-S17-059
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: scripts/desplegar.sh deberá etiquetar la imagen nueva con el hash corto del commit.

### REQ-S17-060
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: scripts/desplegar.sh deberá conservar la etiqueta de la imagen de la versión anterior.

### REQ-S17-061
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: scripts/desplegar.sh deberá esperar hasta 120 segundos a que /api/salud responda 200.

### REQ-S17-062
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-09
- texto: Si /api/salud no responde 200 en 120 segundos entonces scripts/desplegar.sh deberá imprimir las instrucciones de reversión y terminar con código distinto de cero.

### REQ-S17-063
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si falta el correo del administrador o la opción --confirm entonces admin:restablecer deberá terminar con error sin escribir nada.

### REQ-S17-064
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: admin:restablecer deberá generar una contraseña de 20 caracteres con crypto.randomBytes e imprimirla una sola vez.

### REQ-S17-065
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: admin:restablecer deberá guardar solo el hash de la contraseña con el hasher de login.

### REQ-S17-066
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: admin:restablecer deberá cerrar todas las sesiones del administrador.

### REQ-S17-067
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: admin:restablecer deberá borrar los intentos fallidos de login registrados para el correo del administrador.

### REQ-S17-068
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: admin:restablecer deberá registrar una fila de RegistroAuditoria con los datos de SUP-S17-010 y sin la contraseña.

### REQ-S17-069
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si no existe un administrador activo con el correo indicado entonces admin:restablecer deberá terminar con el mismo mensaje de error, sin escribir nada y sin revelar si el correo existe desactivado.

### REQ-S17-070
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: El repositorio deberá contener docs/ops/despliegue.md, docs/ops/respaldo-y-restauracion.md y docs/ops/recuperar-acceso.md.

### REQ-S17-071
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: docs/ops/despliegue.md deberá incluir la lista de comprobación del servidor con firewall solo para los puertos 22, 80 y 443, acceso SSH con llaves y actualizaciones de seguridad automáticas.

### REQ-S17-072
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: docs/ops/respaldo-y-restauracion.md deberá indicar dónde guardar la clave privada de age, activar el versionado o el bloqueo de objetos del bucket y configurar el monitor con comprobación de palabra clave sobre /api/salud.

### REQ-S17-073
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next, generated, las pruebas y las exenciones cerradas, no deberán contener console.log, console.error, console.warn ni console.info.

### REQ-S17-074
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-operacion.mjs encuentra alguno de los términos de REQ-S17-073, deberá terminar con código distinto de cero.

### REQ-S17-075
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-operacion.mjs encuentra alguno de los términos de REQ-S17-073, deberá nombrar archivo, línea y término.

### REQ-S17-076
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada entrada de tools/verificar-operacion.exenciones.json deberá nombrar un archivo existente, el motivo y un tope de líneas con console.

### REQ-S17-077
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-operacion.mjs en cada pull request.

## 2. Comportamiento

### BEH-S17-001
- cubre: REQ-S17-001, REQ-S17-002, REQ-S17-003, REQ-S17-004, REQ-S17-005, REQ-S17-006, REQ-S17-053
- categoria: feliz
- dado: el archivo docker-compose.prod.yml
- cuando: se analiza con el lector de YAML
- entonces: tiene los cinco servicios, solo caddy publica puertos y son el 80/tcp y el 443/tcp con HTTP/3 desactivado, migrar ejecuta db:migrar, web-admin depende de que migrar termine con código cero y corre con NODE_ENV production, y todos reinician salvo que se detengan a mano

### BEH-S17-002
- cubre: REQ-S17-007, REQ-S17-008
- categoria: feliz
- dado: un servidor de prueba con el dominio del propietario apuntando a él
- cuando: se piden https://DOMINIO/login y http://DOMINIO/login
- entonces: la primera responde con un certificado válido y la segunda redirige a HTTPS

### BEH-S17-003
- cubre: REQ-S17-009
- categoria: feliz
- dado: una petición a /login con la cabecera X-Forwarded-For: 1.2.3.4 enviada por el cliente
- cuando: Caddy la reenvía a web-admin
- entonces: web-admin recibe como último valor de X-Forwarded-For la IP real de la conexión y el valor 1.2.3.4 no cuenta como IP del cliente

### BEH-S17-004
- cubre: REQ-S17-010, REQ-S17-011
- categoria: feliz
- dado: IPS_PERMITIDAS con la IP del gimnasio, y luego vacía
- cuando: se piden /login y /api/salud desde la IP del gimnasio y desde otra
- entonces: con la lista, la IP del gimnasio recibe 200 en las dos rutas y la otra IP recibe 403 en /login y 200 en /api/salud; con la lista vacía todas reciben 200

### BEH-S17-005
- cubre: REQ-S17-012
- categoria: borde
- dado: IPS_PERMITIDAS con «203.0.113.5 , 198.51.100.0/24,203.0.113.5, 2001:db8::/32» (espacios y un repetido)
- cuando: se interpreta la lista
- entonces: queda con tres valores distintos —203.0.113.5, 198.51.100.0/24 y 2001:db8::/32— y una petición desde 2001:db8::1 pasa

### BEH-S17-006
- cubre: REQ-S17-013, REQ-S17-014
- categoria: error
- dado: IPS_PERMITIDAS con «203.0.113.5, no-es-ip» y con «10.0.0.0/33» y con «999.1.1.1»
- cuando: arranca el contenedor de Caddy con cada valor
- entonces: los tres se niegan a arrancar con código distinto de cero e imprimen el valor inválido

### BEH-S17-007
- cubre: REQ-S17-015
- categoria: feliz
- dado: el archivo .env.example y la herramienta tools/verificar-env.mjs de S-00 ya enmendada
- cuando: se ejecuta la herramienta
- entonces: las ocho variables de despliegue están listadas sin valor en una sección de despliegue y la herramienta pasa sin exigir que el código las lea con process.env

### BEH-S17-008
- cubre: REQ-S17-016, REQ-S17-017, REQ-S17-023, REQ-S17-024
- categoria: feliz
- dado: un sistema con la base y el respaldo al día (hace 25 h 59 min) y la restauración de prueba de hace 10 días
- cuando: se pide /api/salud sin sesión
- entonces: responde 200 con un JSON que contiene exactamente estado «ok», db «ok», ultimoRespaldoHoras 25, ultimaRestauracionDias 10 y version, sin ningún otro dato, y la ruta figura como pública en el test de contrato

### BEH-S17-009
- cubre: REQ-S17-018
- categoria: error
- dado: una base de datos detenida y otra que tarda 3 segundos en responder
- cuando: se pide /api/salud
- entonces: ambas responden 503 con estado «caido» y db «caida», la primera sin lanzar una excepción sin controlar y la segunda a los 2 segundos

### BEH-S17-010
- cubre: REQ-S17-019, REQ-S17-020
- categoria: borde
- dado: último respaldo hace 1 559 minutos, hace 1 561 minutos, sin respaldo con el proceso arrancado hace 10 h y sin respaldo con el proceso arrancado hace 27 h
- cuando: se pide /api/salud en cada caso
- entonces: el primero y el tercero responden 200, y el segundo y el cuarto responden 503 con estado «caido»

### BEH-S17-011
- cubre: REQ-S17-021
- categoria: borde
- dado: restauración de prueba hace 35 días, hace 36 días y sin restauración, con la base y el respaldo bien
- cuando: se pide /api/salud en cada caso
- entonces: el primero responde 200 con «ok» y los otros dos responden 200 con «degradado»

### BEH-S17-012
- cubre: REQ-S17-022
- categoria: borde
- dado: un archivo de estado ausente, uno vacío, uno con JSON inválido y uno con una fecha futura
- cuando: se pide /api/salud en cada caso
- entonces: ninguno lanza una excepción; los tres primeros devuelven ultimoRespaldoHoras y ultimaRestauracionDias en null; el de fecha futura devuelve 0 y no un número negativo

### BEH-S17-013
- cubre: REQ-S17-025
- categoria: borde
- dado: el archivo de tabla de cron del contenedor de respaldo y su zona America/Lima
- cuando: se leen la expresión y la zona y se convierte 03:00 de Lima a UTC
- entonces: la expresión es «0 3 * * *», la zona es America/Lima y 03:00 de Lima es 08:00 UTC

### BEH-S17-014
- cubre: REQ-S17-026, REQ-S17-027, REQ-S17-028, REQ-S17-033, REQ-S17-035
- categoria: feliz
- dado: una base efímera con datos, un bucket MinIO de prueba y un par de claves de age de prueba
- cuando: se ejecuta el trabajo de respaldo
- entonces: aparece en el bucket un objeto adharafit-AAAAMMDD-HHMMSS.dump.age con la hora de Lima, que solo se descifra con la clave privada de prueba, el archivo de estado trae la fecha del respaldo y no queda ningún archivo en claro en el disco, sin que pg_dump haya escrito nunca un archivo en claro

### BEH-S17-015
- cubre: REQ-S17-029, REQ-S17-030
- categoria: borde
- dado: un bucket con 14 respaldos diarios y 5 previos, otro con 15 diarios y 6 previos, y otro con 3 diarios, y un respaldo diario correcto en cada caso
- cuando: se ejecuta el trabajo de respaldo
- entonces: los dos primeros quedan con los 14 diarios y los 5 previos más recientes y se borran los más antiguos; el tercero no borra ninguno; los previos nunca restan de los 14 diarios

### BEH-S17-016
- cubre: REQ-S17-031, REQ-S17-032, REQ-S17-078, REQ-S17-035
- categoria: error
- dado: un bucket con 14 respaldos y fallos simulados en pg_dump, en el cifrado y en la subida
- cuando: se ejecuta el trabajo de respaldo en cada caso
- entonces: termina con código distinto de cero, no se borra ningún respaldo anterior, el archivo de estado conserva la fecha anterior y no queda ningún archivo en claro en el disco

### BEH-S17-017
- cubre: REQ-S17-034
- categoria: concurrencia
- dado: dos ejecuciones del trabajo de respaldo lanzadas a la vez, con una barrera
- cuando: terminan las dos
- entonces: la segunda esperó a la primera, los nombres de los dos objetos son distintos, no se borra un respaldo recién subido y el bucket queda con los 14 diarios más recientes

### BEH-S17-018
- cubre: REQ-S17-036
- categoria: feliz
- dado: el repositorio, las imágenes construidas, el Compose de producción y .env.example
- cuando: se busca una clave privada de age (el prefijo AGE-SECRET-KEY-) y variables con la clave privada
- entonces: no existe ninguna

### BEH-S17-019
- cubre: REQ-S17-037, REQ-S17-038, REQ-S17-039, REQ-S17-040, REQ-S17-041, REQ-S17-042, REQ-S17-043, REQ-S17-044, REQ-S17-045, REQ-S17-046, REQ-S17-047
- categoria: feliz
- dado: un respaldo cifrado generado por BEH-S17-014 y la clave privada entregada por --clave y, en otra ejecución, por la entrada estándar
- cuando: se ejecuta restaurar.sh sin indicar un respaldo (el más reciente) y con uno indicado
- entonces: restaura en una base temporal, comprueba tablas, migraciones y administrador, imprime PASS, termina con código cero, escribe la fecha de la restauración en el estado, borra la base temporal y los archivos descifrados, no copia la clave privada a ningún archivo y no escribe en la base de producción

### BEH-S17-020
- cubre: REQ-S17-043, REQ-S17-044, REQ-S17-045
- categoria: error
- dado: un respaldo corrupto, una clave privada equivocada y un respaldo al que le falta una tabla
- cuando: se ejecuta restaurar.sh con cada uno
- entonces: imprime FAIL con el motivo y termina con código distinto de cero en los tres casos, borra la base temporal y los archivos descifrados, y no actualiza la fecha de la restauración

### BEH-S17-021
- cubre: REQ-S17-046
- categoria: error
- dado: restaurar.sh ejecutado con --produccion sin --confirm, y con --confirm sin --produccion
- cuando: se intenta cada uno
- entonces: ambos terminan con error sin escribir en la base de producción

### BEH-S17-022
- cubre: REQ-S17-048, REQ-S17-049, REQ-S17-050
- categoria: feliz
- dado: una petición a api/checkin que falla con una excepción cuyo mensaje trae el documento «12345678» y una petición con contraseña y cabeceras
- cuando: se capturan las líneas de registro
- entonces: cada línea es JSON con nivel, mensaje, fecha UTC, ruta y código, y ninguna contiene el documento, la contraseña, cabeceras, cuerpos, claves ni correos

### BEH-S17-023
- cubre: REQ-S17-051
- categoria: feliz
- dado: el código de los comandos db:migrar, db:sembrar y admin:restablecer
- cuando: se buscan sus escrituras de salida
- entonces: todas usan process.stdout.write o process.stderr.write y ninguna usa console

### BEH-S17-024
- cubre: REQ-S17-052
- categoria: feliz
- dado: el archivo docker-compose.prod.yml
- cuando: se leen las opciones de registro de cada servicio
- entonces: cada uno usa el controlador json-file con max-size 10m y max-file 5

### BEH-S17-025
- cubre: REQ-S17-054, REQ-S17-056, REQ-S17-059, REQ-S17-060, REQ-S17-061
- categoria: feliz
- dado: un repositorio limpio y un entorno de prueba con Docker y comandos simulados
- cuando: se ejecuta scripts/desplegar.sh
- entonces: se hace el respaldo previo con el prefijo adharafit-previo-, se migra, se etiqueta la imagen con el hash corto del commit conservando la anterior, se arranca y se espera hasta 120 segundos a /api/salud con 200

### BEH-S17-026
- cubre: REQ-S17-054, REQ-S17-057, REQ-S17-062
- categoria: error
- dado: un árbol con cambios sin confirmar, un respaldo previo que falla y un arranque que nunca llega a 200
- cuando: se ejecuta scripts/desplegar.sh en cada caso
- entonces: el primero se niega sin hacer nada; el segundo se detiene con error antes de migrar; el tercero imprime las instrucciones de reversión tras 120 segundos y termina con código distinto de cero

### BEH-S17-027
- cubre: REQ-S17-058
- categoria: borde
- dado: un servidor nuevo sin base de datos de producción
- cuando: se ejecuta scripts/desplegar.sh por primera vez
- entonces: omite el respaldo previo, imprime que es el primer despliegue, migra y arranca

### BEH-S17-028
- cubre: REQ-S17-055
- categoria: concurrencia
- dado: dos ejecuciones de scripts/desplegar.sh lanzadas a la vez, con una barrera
- cuando: terminan las dos
- entonces: una completa el despliegue y la otra se niega con un mensaje de candado sin ejecutar ningún paso

### BEH-S17-029
- cubre: REQ-S17-063, REQ-S17-064, REQ-S17-065, REQ-S17-066, REQ-S17-067, REQ-S17-068
- categoria: feliz
- dado: un administrador activo con dos sesiones abiertas y 5 intentos fallidos de login registrados
- cuando: se ejecuta admin:restablecer con su correo y --confirm
- entonces: se imprime una contraseña de 20 caracteres una sola vez, solo se guarda su hash, las dos sesiones se cierran, los intentos fallidos se borran, existe una fila de RegistroAuditoria con los datos de SUP-S17-010 y sin la contraseña, y con la nueva contraseña se puede iniciar sesión de inmediato

### BEH-S17-030
- cubre: REQ-S17-063, REQ-S17-069
- categoria: error
- dado: el comando sin --confirm, sin correo, con un correo inexistente y con el correo de un administrador desactivado
- cuando: se ejecuta cada uno
- entonces: todos terminan con error sin escribir nada, y el mensaje del inexistente y del desactivado es el mismo y no revela cuál es cuál

### BEH-S17-031
- cubre: REQ-S17-070, REQ-S17-071, REQ-S17-072
- categoria: feliz
- dado: la carpeta docs/ops
- cuando: se listan los archivos y se lee su contenido
- entonces: existen despliegue.md, respaldo-y-restauracion.md y recuperar-acceso.md; despliegue.md contiene la lista de comprobación con los puertos 22, 80 y 443, SSH con llaves y actualizaciones automáticas; respaldo-y-restauracion.md indica dónde guardar la clave privada, el versionado o bloqueo del bucket y el monitor con palabra clave

### BEH-S17-032
- cubre: REQ-S17-073, REQ-S17-074, REQ-S17-075, REQ-S17-076
- categoria: error
- dado: un archivo por cada uno de los cuatro términos de REQ-S17-073, una exención que nombra un archivo inexistente, otra sin motivo y otra sin tope de líneas
- cuando: se ejecuta tools/verificar-operacion.mjs
- entonces: falla y nombra archivo, línea y término de cada término, y rechaza las tres exenciones inválidas

### BEH-S17-033
- cubre: REQ-S17-077
- categoria: error
- dado: un pull request que agrega console.log en un archivo de apps/web-admin
- cuando: corre el CI
- entonces: el paso de tools/verificar-operacion.mjs falla y queda en rojo

## 3. Invariantes

### INV-S17-001
- propiedad: el bucket nunca queda con menos respaldos de los que había antes de un trabajo fallido, ni con más de 14 diarios y 5 previos tras uno correcto
- mecanismo: test-propiedad
- deteccion: sobre 50 secuencias de trabajos diarios, previos, correctos y fallidos generadas con un generador congruencial lineal de semilla fija escrito en la prueba, con un bucket MinIO de prueba, tras cada trabajo las cantidades de cada prefijo son mayores o iguales que antes si falló y mínimo(previa + 1, tope) si fue correcto
- protege: REQ-S17-029, REQ-S17-030, REQ-S17-031

### INV-S17-002
- propiedad: ningún dato personal ni secreto sale en los registros
- mecanismo: test-propiedad
- deteccion: sobre 50 casos de error generados con semilla fija cuyos mensajes y objetos incluyen documentos, correos, contraseñas y claves, ninguna línea de registro contiene esos valores
- protege: REQ-S17-048, REQ-S17-049

### INV-S17-003
- propiedad: ningún respaldo sale del servidor sin cifrar ni queda en claro en el disco
- mecanismo: asercion-dominio
- deteccion: el trabajo de respaldo canaliza pg_dump a age y solo sube objetos .dump.age; una prueba intenta subir un volcado sin cifrar y falla antes de subir, y tras cada caso de BEH-S17-014 y BEH-S17-016 el directorio de trabajo no contiene archivos de volcado
- protege: REQ-S17-026, REQ-S17-027, REQ-S17-035, REQ-S17-036

### INV-S17-004
- propiedad: ningún console.* queda en el código de aplicación
- mecanismo: lint
- deteccion: tools/verificar-operacion.mjs termina con código distinto de cero y lista archivo:línea y término
- protege: REQ-S17-050, REQ-S17-073, REQ-S17-074, REQ-S17-075

### INV-S17-005
- propiedad: un despliegue no deja la base migrada sin un respaldo previo salvo en el primer despliegue
- mecanismo: asercion-dominio
- deteccion: scripts/desplegar.sh termina antes de ejecutar db:migrar si el respaldo previo falla, y una prueba con comandos simulados verifica el orden de los pasos en cada escenario de BEH-S17-025 a BEH-S17-027
- protege: REQ-S17-056, REQ-S17-057, REQ-S17-058

## 4. Criterios de aceptación

### AC-S17-001
- enlaza: REQ-S17-001, REQ-S17-002, REQ-S17-003, REQ-S17-004, REQ-S17-005, REQ-S17-006, BEH-S17-001
- metodo: unitario
- procedimiento: leer docker-compose.prod.yml con el lector de YAML de las pruebas y comprobar los servicios, los puertos publicados y su protocolo, el comando de migrar, depends_on con service_completed_successfully y NODE_ENV
- esperado: se cumple exactamente lo descrito en BEH-S17-001
- test: pendiente

### AC-S17-002
- enlaza: REQ-S17-052, REQ-S17-053, BEH-S17-001, BEH-S17-024
- metodo: unitario
- procedimiento: leer docker-compose.prod.yml y comprobar la política de reinicio y las opciones de registro de cada servicio
- esperado: cada servicio reinicia salvo que se detenga a mano y usa json-file con max-size 10m y max-file 5
- test: pendiente

### AC-S17-003
- enlaza: REQ-S17-007, REQ-S17-008, REQ-S17-009, REQ-S17-010, REQ-S17-011, BEH-S17-002, BEH-S17-003, BEH-S17-004
- metodo: manual
- procedimiento: en un VPS de prueba con el dominio del propietario, pedir https y http, enviar una petición con X-Forwarded-For falso y probar IPS_PERMITIDAS con la IP del gimnasio, con otra y vacía
- esperado: certificado válido, redirección a HTTPS, el último X-Forwarded-For es la IP real, y las respuestas de BEH-S17-004
- test: pendiente

### AC-S17-004
- enlaza: REQ-S17-012, REQ-S17-013, REQ-S17-014, BEH-S17-005, BEH-S17-006
- metodo: integracion
- procedimiento: arrancar el contenedor de Caddy en Docker con el valor de BEH-S17-005 y con los tres inválidos de BEH-S17-006, y pedir desde una IPv6 de la lista
- esperado: el primero arranca con tres valores distintos y deja pasar la IPv6, y los otros tres terminan con código distinto de cero imprimiendo el valor inválido
- test: pendiente

### AC-S17-005
- enlaza: REQ-S17-015, BEH-S17-007
- metodo: unitario
- procedimiento: ejecutar tools/verificar-env.mjs sobre .env.example y el código con la sección de despliegue
- esperado: pasa y las ocho variables están en su sección sin valor
- test: pendiente

### AC-S17-006
- enlaza: REQ-S17-016, REQ-S17-017, REQ-S17-023, REQ-S17-024, BEH-S17-008
- metodo: integracion
- procedimiento: pedir /api/salud sin sesión con la base y los archivos de estado al día, comparar las claves del JSON con la lista exacta de cinco campos, y ejecutar el test de contrato de rutas
- esperado: 200 con exactamente los cinco campos y enteros hacia abajo, y la ruta figura como pública
- test: pendiente

### AC-S17-007
- enlaza: REQ-S17-018, BEH-S17-009
- metodo: integracion
- procedimiento: pedir /api/salud con la base detenida y con una base que responde en 3 segundos, midiendo el tiempo
- esperado: ambas dan 503 «caido» sin excepción y la lenta a los 2 segundos
- test: pendiente

### AC-S17-008
- enlaza: REQ-S17-019, REQ-S17-020, REQ-S17-021, REQ-S17-022, BEH-S17-010, BEH-S17-011, BEH-S17-012
- metodo: integracion
- procedimiento: con un reloj simulado y archivos de estado fabricados (al día, antiguo, ausente, vacío, inválido y con fecha futura), pedir /api/salud en los casos de BEH-S17-010 a BEH-S17-012
- esperado: los códigos, estados y valores null o 0 coinciden con esos comportamientos y ninguno lanza una excepción
- test: pendiente

### AC-S17-009
- enlaza: REQ-S17-025, BEH-S17-013
- metodo: unitario
- procedimiento: leer el archivo de tabla de cron del contenedor de respaldo y comprobar su expresión y su zona, y convertir 03:00 de America/Lima a UTC con Intl
- esperado: la expresión es «0 3 * * *», la zona es America/Lima y la conversión da 08:00 UTC
- test: pendiente

### AC-S17-010
- enlaza: REQ-S17-026, REQ-S17-027, REQ-S17-028, REQ-S17-033, REQ-S17-035, BEH-S17-014, INV-S17-003
- metodo: integracion
- procedimiento: con una base efímera con datos, un bucket MinIO de prueba y un par de claves de age de prueba, ejecutar el trabajo de respaldo vigilando el directorio de trabajo, descifrar el objeto con la clave privada de prueba e intentar subir un volcado sin cifrar
- esperado: el objeto existe con el nombre indicado, se descifra con la clave de prueba, el estado trae la fecha, el directorio nunca contiene un volcado en claro y la subida sin cifrar falla antes de subir
- test: pendiente

### AC-S17-011
- enlaza: REQ-S17-029, REQ-S17-030, REQ-S17-031, REQ-S17-032, REQ-S17-078, REQ-S17-035, BEH-S17-015, BEH-S17-016, INV-S17-001
- metodo: integracion
- procedimiento: con un bucket MinIO, ejecutar el trabajo con las cantidades previas de BEH-S17-015 y con fallos simulados en pg_dump, cifrado y subida, y repetir 50 secuencias con semilla fija
- esperado: las cantidades finales, los códigos de salida, el estado sin cambios y la ausencia de archivos en claro coinciden con los comportamientos, y la invariante se cumple en las 50 secuencias
- test: pendiente

### AC-S17-012
- enlaza: REQ-S17-034, BEH-S17-017
- metodo: integracion
- procedimiento: lanzar con Promise.all dos ejecuciones del trabajo de respaldo con una barrera y un bucket MinIO
- esperado: la segunda espera a la primera, los nombres difieren, no se pierde ningún respaldo recién subido y el bucket queda con los 14 diarios más recientes
- test: pendiente

### AC-S17-013
- enlaza: REQ-S17-036, BEH-S17-018
- metodo: unitario
- procedimiento: buscar en el repositorio, en .env.example, en docker-compose.prod.yml y en las capas de las imágenes construidas el prefijo AGE-SECRET-KEY- y variables cuyo nombre contenga PRIVADA
- esperado: no hay ninguna coincidencia
- test: pendiente

### AC-S17-014
- enlaza: REQ-S17-037, REQ-S17-038, REQ-S17-039, REQ-S17-040, REQ-S17-041, REQ-S17-042, REQ-S17-043, REQ-S17-044, REQ-S17-045, REQ-S17-047, BEH-S17-019
- metodo: integracion
- procedimiento: ejecutar restaurar.sh con el respaldo de AC-S17-010, con el más reciente por omisión y con uno indicado, entregando la clave por --clave y por la entrada estándar, y buscar copias de la clave y bases o archivos temporales al terminar
- esperado: PASS con código cero y fecha registrada, sin copias de la clave y sin bases ni archivos temporales
- test: pendiente

### AC-S17-015
- enlaza: REQ-S17-043, REQ-S17-044, REQ-S17-045, REQ-S17-047, BEH-S17-020
- metodo: integracion
- procedimiento: ejecutar restaurar.sh con un respaldo corrupto, una clave equivocada y un respaldo al que se le quitó una tabla, y contar bases y archivos temporales al terminar
- esperado: FAIL con motivo y código distinto de cero en los tres, sin fecha registrada y sin bases ni archivos temporales
- test: pendiente

### AC-S17-016
- enlaza: REQ-S17-046, BEH-S17-021
- metodo: integracion
- procedimiento: ejecutar restaurar.sh con --produccion sin --confirm y con --confirm sin --produccion contra una base que cuenta escrituras
- esperado: ambos terminan con error y la base no recibe escrituras
- test: pendiente

### AC-S17-017
- enlaza: REQ-S17-048, REQ-S17-049, REQ-S17-050, BEH-S17-022, INV-S17-002
- metodo: integracion
- procedimiento: provocar los dos errores de BEH-S17-022, capturar la salida estándar del módulo de registros y repetir sobre 50 casos con semilla fija
- esperado: cada línea es JSON con los cinco campos y ninguna contiene los valores sensibles
- test: pendiente

### AC-S17-018
- enlaza: REQ-S17-051, BEH-S17-023
- metodo: unitario
- procedimiento: buscar con la API de typescript las escrituras de salida de los tres comandos y los usos de console en sus archivos
- esperado: todas las salidas usan process.stdout.write o process.stderr.write y no hay console
- test: pendiente

### AC-S17-019
- enlaza: REQ-S17-054, REQ-S17-056, REQ-S17-057, REQ-S17-058, REQ-S17-059, REQ-S17-060, REQ-S17-061, REQ-S17-062, BEH-S17-025, BEH-S17-026, BEH-S17-027, INV-S17-005
- metodo: integracion
- procedimiento: ejecutar scripts/desplegar.sh con Docker y comandos simulados que registran su orden en los escenarios de BEH-S17-025 a BEH-S17-027
- esperado: el orden de pasos, las etiquetas, las esperas, los errores y el salto del respaldo previo en el primer despliegue coinciden con esos comportamientos
- test: pendiente

### AC-S17-020
- enlaza: REQ-S17-055, BEH-S17-028
- metodo: integracion
- procedimiento: lanzar con Promise.all dos scripts/desplegar.sh con una barrera y comandos simulados
- esperado: uno completa y el otro se niega con el mensaje de candado sin ejecutar ningún paso
- test: pendiente

### AC-S17-021
- enlaza: REQ-S17-063, REQ-S17-064, REQ-S17-065, REQ-S17-066, REQ-S17-067, REQ-S17-068, REQ-S17-069, BEH-S17-029, BEH-S17-030
- metodo: integracion
- procedimiento: con una base efímera, ejecutar admin:restablecer en los casos de BEH-S17-029 y BEH-S17-030 y leer sesiones, intentos fallidos, auditoría y hash, e iniciar sesión con la contraseña nueva
- esperado: el éxito deja los efectos de BEH-S17-029 y los demás terminan con error sin escribir y con el mismo mensaje para inexistente y desactivado
- test: pendiente

### AC-S17-022
- enlaza: REQ-S17-070, REQ-S17-071, REQ-S17-072, BEH-S17-031
- metodo: unitario
- procedimiento: comprobar que existen los tres archivos de docs/ops y buscar en cada uno las frases exigidas: en despliegue.md «22», «80», «443», «llaves» y «actualizaciones automáticas»; en respaldo-y-restauracion.md «clave privada», «versionado», «bloqueo de objetos» y «palabra clave»
- esperado: los tres archivos existen y contienen todas las frases
- test: pendiente

### AC-S17-023
- enlaza: REQ-S17-073, REQ-S17-074, REQ-S17-075, REQ-S17-076, BEH-S17-032, INV-S17-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-operacion.mjs con un árbol por cada uno de los cuatro términos, con las tres exenciones inválidas y con un árbol limpio; después ejecutarla sobre el árbol final
- esperado: falla con los cuatro términos nombrando archivo, línea y término, rechaza las exenciones inválidas, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S17-024
- enlaza: REQ-S17-077, BEH-S17-033
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue console.log en un archivo de apps/web-admin y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-operacion.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero; un commit por paso con typecheck y pruebas en verde; el orden de agregar lo nuevo, migrar los llamadores y retirar lo viejo es la práctica de las specs aprobadas): (1) pruebas en rojo de los registros, de `/api/salud`, del respaldo, de la restauración, del despliegue y de `admin:restablecer`; (2) `tools/verificar-operacion.mjs` y sus pruebas, con los 22 archivos actuales con `console` en su lista de exenciones, que se achica en cada paso; (3) módulo de registros JSON y migración de las llamadas a `console` archivo por archivo, cada commit con sus pruebas, achicando las exenciones; (4) `/api/salud` y su lectura de los archivos de estado, con la enmienda a S-05, S-01 y al PRD (ruta pública); (5) scripts de respaldo y restauración y su imagen (PostgreSQL, `age`, `rclone` y `crond` de Alpine, fijados por versión), con pruebas contra una base efímera y un MinIO de prueba; (6) `admin:restablecer` en `packages/infrastructure/seed/`; (7) `docker-compose.prod.yml`, `Caddyfile` y la validación de `IPS_PERMITIDAS`; (8) `scripts/desplegar.sh`; (9) runbooks de `docs/ops/`; (10) variables de despliegue en `.env.example`, ajuste de `tools/verificar-env.mjs` y paso del CI.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la propia prueba, una base efímera y una barrera; los scripts de shell se prueban invocándolos desde pruebas de TypeScript con `child_process` (SUP-S17-012).
- **Herramientas nuevas fuera de producción:** Caddy, `age`, `rclone`, `crond` y PostgreSQL como imágenes o paquetes de Docker con versión fijada, y MinIO solo en el CI; no entran en el `package.json` de producción. **Dependencia de desarrollo nueva:** `yaml` (SUP-S17-012), con versión exacta.
- AC-S17-003 y AC-S17-024 son pasos manuales del propietario o del operador (requieren un VPS con dominio y el CI).

### 5.2 Migración
- No hay datos que migrar: producción nace con el baseline de S-15.
- **Enmiendas que se registran al aprobar S-17:**
  - `docs/01-levantamiento-requerimientos.md` (RF-70): «todo requiere sesión salvo login y kiosco» se lee con la excepción de `/api/salud`, pública y sin datos del negocio.
  - S-05: REQ-S05-025 y SUP-S05-014 se leen con una ruta pública más, `/api/salud`.
  - S-01: el test de contrato de rutas (REQ-S01-015) suma `/api/salud` a las rutas públicas; SUP-S01-003 queda cumplido por Caddy (REQ-S17-009).
  - S-00: REQ-S00-006 y `tools/verificar-env.mjs` excluyen de la comparación con `process.env` la sección «Despliegue» de `.env.example` (variables que leen Compose, Caddy y los scripts); `.env.example` suma las ocho variables.
  - S-15: el despliegue en producción ejecuta `db:migrar` con el servicio `migrar` de `docker-compose.prod.yml` y una copia previa; el traspaso queda cumplido.
  - S-23: SUP-S23-010 y 5.3 se cumplen con `admin:restablecer` y `docs/ops/recuperar-acceso.md`.
  - S-06: los `console.error` de `api/checkin`, `api/miembros` y `lib/activacion.ts` pasan al módulo de registros.
  - S-02: la zona de los contenedores de producción es America/Lima (el `Dockerfile` heredado fija Caracas).
  - S-22: REQ-S22-017 se mantiene (el entrypoint no migra); la imagen de `web-admin` no cambia.
  - `docs/00-indice.md`, `docs/08-decisiones-pendientes.md` (P-12 con el despliegue por defecto), `COBERTURA-RF.md` (RF-70, RNF-07 a RNF-09) y `BACKLOG-SPECS.md`: nota de que S-17 cubre la operación.
- **Traspasos:** el propietario (VPS, dominio, bucket con versionado, monitor externo con palabra clave y llave privada de age), S-21 (los televisores comparten la IP del gimnasio que va en `IPS_PERMITIDAS`) y una spec futura para agregación de registros, métricas y alertas por canal propio o por fallos de check-in si hicieran falta.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente. La reversión de un despliegue está en REQ-S17-062 y el runbook.

### 5.3 Riesgos
- Perder la llave privada de age hace inútiles todos los respaldos. Mitigación: el runbook obliga a guardarla en dos lugares fuera del servidor y a probar la restauración cada mes.
- Una restricción por IP mal escrita deja al propietario fuera del panel, y la IP pública del gimnasio puede cambiar. Mitigación: la lista vacía quita la restricción, `/api/salud` queda exceptuada, el runbook explica cómo editar el archivo por SSH y se recomienda IP fija.
- La alerta depende de un monitor externo que el propietario debe configurar con comprobación de palabra clave; sin él nadie se entera de una caída ni de una restauración vencida. Mitigación: el runbook lo pone como paso obligatorio del despliegue.
- No hay alerta específica por fallos de check-in (RNF-08): solo quedan en los registros JSON y la caída de la base se detecta por `/api/salud`. Mitigación: el kiosco sigue operando sin internet con su cola (RNF-03) y una spec futura puede agregar el canal.
- Un solo VPS es un punto único de falla; la recuperación es restaurar el respaldo en un servidor nuevo (RPO de 24 horas). Mitigación: la prueba mensual y el despliegue por script reducen el tiempo de recuperación.
- Aplicar migraciones al desplegar puede dejar la base en un esquema que la versión anterior no entiende. Mitigación: respaldo previo obligatorio y reversión por restauración.
- Un servidor comprometido con las credenciales del bucket puede borrar los respaldos. Mitigación: versionado o bloqueo de objetos en el bucket (SUP-S17-013) y copia independiente de la llave.
- `/api/salud` pública revela que el sistema existe y el estado de sus respaldos. Mitigación: solo cinco datos operativos, sin nombres ni conteos.
- El respaldo cifrado en un bucket de otro proveedor sigue siendo dato personal fuera del servidor (Ley 29733). Mitigación: cifrado con `age` antes de salir y bucket distinto del de fotos.
- Las fotos de R2 no entran en el respaldo. Mitigación: R2 es un servicio administrado; si se perdieran, solo se pierden las fotos.
- No verificado el comportamiento de Caddy y de Let's Encrypt con el dominio real ni el entorno de ejecución de los comandos de línea tras S-22. Mitigación: la prueba manual AC-S17-003 en un VPS de prueba antes de producción y la lectura del `Dockerfile` al empezar el paso 5.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿El despliegue es un VPS único con Docker Compose y Caddy? Default: sí (SUP-S17-001); necesito que elijas el proveedor y el dominio (P-12).
- ¿La restricción por IP queda vacía hasta que me des la IP fija del gimnasio? Default: sí (SUP-S17-003).
- ¿Los respaldos se cifran con `age` y se suben a un bucket S3 distinto al de las fotos, conservando 14 diarios y 5 previos a un despliegue? Default: sí (SUP-S17-004).
- ¿La alerta la envía un monitor externo gratuito con palabra clave que tú configuras sobre `/api/salud`? Default: sí (SUP-S17-005).
- ¿La prueba de restauración la haces tú una vez al mes con el script? Default: sí (SUP-S17-007).
- ¿El restablecimiento de contraseña se hace por línea de comandos en el servidor, con `--confirm`? Default: sí (SUP-S17-010).
- ¿Activas el versionado o el bloqueo de objetos en el bucket de respaldos? Default: sí (SUP-S17-013).

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura, sin ejecutar `spec-lint`), 2026-11-12, sobre el primer borrador. Veredicto global: **REQUIERE CAMBIOS**. Resumen fiel:

> | # | Comprobación | Veredicto | Hallazgo principal |
> |---|---|---|---|
> | 1 | Cabecera y ADR | CUMPLE | `depende_de` omitía S-02 y S-09 |
> | 2 | REQ | NO CUMPLE | REQ-010, 021, 025, 026, 028, 038, 039, 043, 044 y 040 compuestos; tipos de REQ-020, 022 y 040; origen `SUP-S23-010` |
> | 3 | Cobertura | CUMPLE (salvedades) | el candado de archivo de BEH-028 sin REQ; REQ-024 (clave privada «en el servidor») sin forma de comprobarse |
> | 4 | AC | NO CUMPLE (menor) | AC-008 sin planificador definido; AC-016 solo comprobaba títulos; AC-001 y AC-002 mezclaban comprobaciones; lector de YAML sin justificar |
> | 5 | Hechos | NO CUMPLE (menor) | «solo un Dockerfile» era falso (hay otros tres y `.dockerignore`); el recuento incluía `apps/worker`; faltaban `RegistroAuditoria`, `Sesion`, el hasher y `TZ=America/Caracas` |
> | 6 | Vaguedad y dependencias | NO CUMPLE (menor) | «unas pocas líneas»; unidad de `ultimoRespaldoHoras`; runner de shell, simulador de S3 y lector de YAML sin elegir |
> | 7 | Escenarios | NO CUMPLE (parcial) | primer despliegue; archivo de estado ausente o corrupto; tiempo límite de la base; colisión de nombres; IPv6, espacios y repetidos; volcado en claro; concurrencia de despliegues; bloqueo de login tras restablecer; HTTP/3 |
> | 8 | Contraste con ADR, PRD y specs | NO CUMPLE | `/api/salud` pública contra RF-70; `/login` no es una ruta pública del test de contrato; RNF-08 y check-in sin declarar; una restauración vencida nunca alertaba; los respaldos previos a un despliegue reducían la retención; ADR-012 §9 sin tratar; `verificar-env` contra las variables de despliegue; `process.stdout`; riesgo de borrado de respaldos; entrega de la clave privada |

### Conciliación del autor
Los hallazgos se verificaron contra el Repo A y las specs (`find` de Dockerfiles, `Dockerfile:42`, `schema.prisma:582-609`, `BcryptPasswordHasher.ts`, `docs/01:131`, REQ-S01-015, REQ-S05-025, REQ-S00-006, SUP-S15-010) y resultaron ciertos; ninguno se rechazó. La spec pasó de 53 REQ a 78, de 28 BEH a 33, de 4 INV a 5 y de 19 AC a 24.

| Fila | Corrección |
|---|---|
| 1 | `depende_de` suma S-02 y S-09 |
| 2 | REQ divididos (013/014, 026/027, 029/030, 031/032/078, 037 a 047, 056 a 062, 063 a 069); tipos corregidos; orígenes ADR-012 y RNF |
| 3 | REQ-034 (candado de archivo) y REQ-036 limitado a lo comprobable; el resguardo de la clave en el servidor pasa al runbook (REQ-072) |
| 4 | AC-009 sobre la tabla de cron y Intl; AC-022 busca las frases del contenido; AC-001 y AC-002 separados; `yaml` justificado como dependencia de desarrollo (SUP-S17-012); MinIO real en el CI |
| 5 | 0.4 corregido (Dockerfiles, 31 llamadas en 22 archivos sin `apps/worker`, auditoría, sesiones, hasher, `TZ`); `RegistroAuditoria` definida en SUP-S17-010; lo no verificado declarado |
| 6 | Módulo de registros de un solo archivo; enteros hacia abajo (REQ-023); herramientas elegidas |
| 7 | BEH-009 (límite de 2 s), BEH-010, BEH-012 (estado corrupto), BEH-027 (primer despliegue), BEH-028 (concurrencia de despliegues), BEH-005 (IPv6, espacios, repetidos), nombre con segundos (REQ-028), HTTP/3 desactivado (REQ-003), intentos fallidos borrados (REQ-067), volcado nunca en claro (REQ-026) |
| 8 | 5.2 enmienda `docs/01` RF-70, S-05, S-01 (ruta pública) y S-00 (`verificar-env`); SUP-S17-005 con palabra clave para alertar también `degradado`; retención separada de 14 diarios y 5 previos (REQ-029, REQ-030); SUP-S17-011 (excepción a ADR-012 §9); REQ-051 (`process.stdout.write`); SUP-S17-013 y riesgo de borrado de respaldos; entrega de la clave privada en SUP-S17-007 y REQ-038; RNF-08 acotado en 0.3 y 5.3 |
