---
id: S-17
estado: en-revision
adrs: ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-05, S-06, S-15, S-22, S-23
aprobada_por:
fecha_aprobacion:
---
# S-17 — Operación y despliegue: producción con TLS, respaldos, restauración, monitoreo y recuperación de acceso

## 0. Contexto y alcance

### 0.1 Problema
El PRD pide desplegar en un subdominio propio con HTTPS (RF-70), respaldo diario de la base con retención de al menos 14 días y prueba de restauración mensual (RNF-07), registros estructurados y alerta ante fallos (RNF-08), y contenedores con migraciones al arrancar (RNF-09). Las specs anteriores dejaron a S-17 cuatro cosas concretas: aplicar las migraciones en producción con el mismo comando de S-15, fijar el proxy de confianza que S-01 necesita para la IP del cliente, la restricción por IP que pidió el propietario y la recuperación de la contraseña de un administrador (S-23). El Repo A solo trae un `Dockerfile` y un `docker-entrypoint.sh`; no hay configuración de producción, respaldo ni monitoreo. S-17 define un despliegue en un VPS con Docker Compose, con Caddy para el TLS, un contenedor de respaldos cifrados con copia fuera del servidor, una ruta de salud para un monitor externo, registros en JSON y un procedimiento de despliegue y de recuperación documentado. El hosting y el dominio los elige el propietario (P-12).

### 0.2 Dentro de alcance
- `docker-compose.prod.yml` con PostgreSQL, el servicio de un solo uso `migrar`, `web-admin`, Caddy y el contenedor de respaldos.
- TLS automático con Caddy para el dominio del propietario, redirección de HTTP a HTTPS y proxy de confianza para S-01.
- Restricción opcional por IP (`IPS_PERMITIDAS`).
- Respaldo diario cifrado con `age` y copia a un bucket S3 compatible, retención de 14 respaldos, y restauración probada con un script.
- Ruta pública `/api/salud` para un monitor externo.
- Registros estructurados en JSON con un módulo propio, sin datos personales, y rotación de los registros de Docker.
- `scripts/desplegar.sh` (respaldo previo, migración, arranque y verificación) y reversión documentada.
- Comando `admin:restablecer` para restablecer la contraseña de un administrador desde el servidor.
- Runbooks en `docs/ops/`.
- `tools/verificar-operacion.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Elegir el proveedor del VPS, comprar el dominio y crear las cuentas del bucket y del monitor: el propietario (P-12).
- Alertas por WhatsApp, SMS o correo enviadas desde el servidor: las alertas las envía un monitor externo (SUP-S17-005).
- Agregación de registros, métricas y tableros (más allá de JSON en la salida del contenedor).
- Respaldo de las fotos de R2, que ya están en un servicio administrado, y de la configuración de Caddy fuera del repositorio.
- Alta disponibilidad, balanceo y réplicas: un solo servidor.
- Endurecimiento del sistema operativo del VPS: solo una lista de comprobación en el runbook.
- Escaneo de vulnerabilidades de las imágenes: lo cubre `npm audit` y gitleaks (S-00).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-17 recibirá después de S-00 a S-15, S-22 y S-23; se recontarán al empezar.
- **Despliegue heredado:** el Repo A tiene un `Dockerfile` y `docker-entrypoint.sh` (que ejecuta `prisma migrate deploy` y luego `node apps/web-admin/server.js`, `docker-entrypoint.sh:11-13`) y no tiene `docker-compose.yml` ni configuración de proxy, respaldo o monitoreo (verificado con `ls` y `Read`); S-00 agrega el Compose de desarrollo.
- **Registros:** hay 35 llamadas a `console.log`, `console.error`, `console.warn` o `console.info` en 23 archivos de `apps` y `packages`, sin contar pruebas, `packages/db`, `scripts` ni las apps de TV (verificado con `grep -rIn`); `console.error(error)` aparece en `api/checkin/route.ts:62`, `api/miembros/route.ts:67` y `lib/activacion.ts:28` (S-06 §0.4).
- **Fotos:** `storageR2.ts` lee `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` y `R2_PUBLIC_URL` (`:4-8`) (verificado con `Read`).
- **Interacción con specs aprobadas:** S-01 toma como IP del cliente el último valor de `X-Forwarded-For`, exige que haya un solo proxy de confianza que lo añada y deja ese despliegue a S-17 (SUP-S01-003), envía HSTS con `NODE_ENV=production` y `noindex`, y define las rutas públicas y su test de contrato; S-05 dejó solo dos rutas públicas y descartó una ruta de salud (REQ-S05-025 y SUP-S05-014); S-15 define `db:migrar` (código en `packages/db/src/`), el servicio `migrar`, el seed manual y deja a S-17 aplicar las migraciones en producción con el mismo comando, la copia previa y la recuperación de la contraseña; S-22 prohíbe órdenes de migración en `Dockerfile` y `docker-entrypoint.sh` (REQ-S22-017); S-23 deja la recuperación manual de la contraseña (SUP-S23-010) sin dueño; S-12 aporta las variables SMTP, que S-17 no usa (verificado con `grep -n` en las specs).
- **Pendiente del PRD:** P-12 (dominio, hosting y cuentas) sin respuesta, con el valor por defecto «VPS con Docker» (`docs/08:37`); RNF-02 pide un listado fluido con 2 000 miembros o más; RNF-07 a RNF-09 (`docs/01:140,145-147`) (verificado con `Read`).
- No verificado: el comportamiento de Caddy con certificados reales en el servidor del propietario, la versión de `age`, `rclone` y PostgreSQL de las imágenes que se fijen, y que el VPS elegido permita puertos 80 y 443.

### 0.5 Supuestos
- SUP-S17-001: el despliegue es un único VPS con Docker Compose (P-12, default «VPS con Docker»), con PostgreSQL en un contenedor con volumen nombrado y sin puerto publicado, y `web-admin` sin puerto publicado: solo Caddy escucha en los puertos 80 y 443. Default: ese despliegue; asumido, por validar.
- SUP-S17-002: Caddy obtiene y renueva los certificados de Let's Encrypt para el dominio indicado en `DOMINIO` y fija el valor de `X-Forwarded-For` a la IP real de la conexión, con lo que S-01 lee la IP correcta (SUP-S01-003). Default: Caddy; asumido, por validar.
- SUP-S17-003: `IPS_PERMITIDAS` es una lista de IP o CIDR separada por comas; si está vacía no hay restricción; si tiene valores, Caddy responde 403 a cualquier otra IP en todas las rutas salvo `/api/salud`. El kiosco y el televisor de la vitrina comparten la IP pública del gimnasio, que va en la lista. Default: vacía; asumido, por validar (idea del propietario).
- SUP-S17-004: el respaldo es `pg_dump` en formato personalizado, cifrado con `age` para la clave pública `RESPALDO_AGE_PUBLICA`, subido a un bucket S3 compatible (`RESPALDO_S3_*`, distinto de las fotos) con el nombre `adharafit-AAAAMMDD-HHMM.dump.age`; la clave privada la guarda el propietario fuera del servidor. Se conservan los 14 respaldos más recientes. El respaldo corre a las 03:00 de Lima. Default: ese esquema; asumido, por validar.
- SUP-S17-005: la alerta la da un monitor externo gratuito que consulta `/api/salud` cada 5 minutos y avisa al propietario cuando recibe 503 o no recibe respuesta; el servidor no envía alertas por su cuenta. Default: monitor externo; asumido, por validar.
- SUP-S17-006: `/api/salud` es pública, responde en JSON con `estado` (`ok`, `degradado` o `caido`), `db`, `ultimoRespaldoHoras`, `ultimaRestauracionDias` y `version`, sin nombres, conteos ni datos del negocio. Responde 503 cuando la base no responde o el último respaldo tiene más de 26 horas (o no existe tras 26 horas de arranque), y 200 con `degradado` cuando la última restauración de prueba tiene más de 35 días. Default: ese contrato; asumido, por validar.
- SUP-S17-007: la restauración de prueba la ejecuta el propietario una vez al mes con el script `restaurar.sh`, entregándole temporalmente la clave privada; restaura en una base temporal, comprueba tablas y datos mínimos y la borra. Default: mensual y manual; asumido, por validar.
- SUP-S17-008: el despliegue lo ejecuta una persona con acceso al VPS con `scripts/desplegar.sh`, que hace un respaldo previo, aplica las migraciones con `db:migrar`, arranca la versión nueva y verifica `/api/salud`; las migraciones solo avanzan, y volver a una versión anterior del esquema se hace restaurando el respaldo previo. Default: ese procedimiento; asumido, por validar.
- SUP-S17-009: los registros son líneas JSON en la salida estándar con `nivel`, `mensaje`, `fecha` (instante UTC), `ruta` y `codigo`, producidos por un módulo propio de unas pocas líneas sin dependencias nuevas; nunca incluyen cuerpos de petición, cabeceras, contraseñas, claves, documentos ni correos. Docker rota los registros a 5 archivos de 10 MB por contenedor. Default: ese formato; asumido, por validar.
- SUP-S17-010: `admin:restablecer` genera una contraseña de 20 caracteres, la imprime una vez, guarda solo su hash, cierra las sesiones del administrador y deja una fila en `RegistroAuditoria`; exige `--confirm` y el correo del administrador, y solo se puede ejecutar con acceso al servidor y a `DATABASE_URL`. Default: ese mecanismo; asumido, por validar.

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
- origen: ADR-022
- texto: El servicio migrar de docker-compose.prod.yml deberá ejecutar db:migrar.

### REQ-S17-052
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El servicio caddy deberá publicar únicamente los puertos 80 y 443.

### REQ-S17-053
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: El servicio web-admin de docker-compose.prod.yml deberá iniciar solo después de que migrar termine con código cero.

### REQ-S17-004
- tipo: ubicuo
- prioridad: MUST
- origen: RF-70
- texto: Caddy deberá obtener y renovar el certificado TLS del dominio de la variable DOMINIO.

### REQ-S17-005
- tipo: ubicuo
- prioridad: MUST
- origen: RF-70
- texto: Caddy deberá redirigir las peticiones HTTP a HTTPS.

### REQ-S17-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Caddy deberá reemplazar el valor de X-Forwarded-For por la IP real de la conexión antes de enviar la petición a web-admin.

### REQ-S17-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El servicio web-admin de producción deberá ejecutarse con NODE_ENV production.

### REQ-S17-008
- tipo: mientras
- prioridad: MUST
- origen: ADR-012
- texto: Mientras IPS_PERMITIDAS tenga valores, Caddy deberá responder 403 a las peticiones cuya IP no esté en la lista, salvo a /api/salud.

### REQ-S17-009
- tipo: mientras
- prioridad: MUST
- origen: ADR-012
- texto: Mientras IPS_PERMITIDAS esté vacía, Caddy no deberá restringir por IP.

### REQ-S17-010
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si IPS_PERMITIDAS contiene un valor que no es una IP ni un CIDR válido entonces el contenedor de Caddy deberá negarse a arrancar y nombrar el valor inválido.

### REQ-S17-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El archivo .env.example deberá listar sin valores las variables DOMINIO, IPS_PERMITIDAS, RESPALDO_AGE_PUBLICA, RESPALDO_S3_ENDPOINT, RESPALDO_S3_BUCKET, RESPALDO_S3_ACCESO y RESPALDO_S3_SECRETO en una sección de despliegue.

### REQ-S17-012
- tipo: ubicuo
- prioridad: MUST
- origen: RF-70
- texto: La ruta /api/salud deberá responder sin sesión con un JSON que contenga estado, db, ultimoRespaldoHoras, ultimaRestauracionDias y version, y ningún otro dato.

### REQ-S17-013
- tipo: si-entonces
- prioridad: MUST
- origen: RF-70
- texto: Si la base de datos no responde a una consulta de prueba entonces /api/salud deberá responder 503 con estado caido.

### REQ-S17-014
- tipo: si-entonces
- prioridad: MUST
- origen: RF-70
- texto: Si el último respaldo tiene más de 26 horas, o no existe y el proceso lleva más de 26 horas en marcha, entonces /api/salud deberá responder 503 con estado caido.

### REQ-S17-015
- tipo: si-entonces
- prioridad: MUST
- origen: RF-70
- texto: Si la última restauración de prueba tiene más de 35 días o no existe entonces /api/salud deberá responder 200 con estado degradado, siempre que la base y el respaldo estén bien.

### REQ-S17-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La ruta /api/salud deberá figurar como pública en el test de contrato de rutas de S-01.

### REQ-S17-017
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El contenedor de respaldo deberá crear un respaldo de la base con pg_dump en formato personalizado todos los días a las 03:00 de Lima.

### REQ-S17-018
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El contenedor de respaldo deberá cifrar cada respaldo con age para la clave pública de RESPALDO_AGE_PUBLICA antes de sacarlo del servidor.

### REQ-S17-019
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El contenedor de respaldo deberá subir cada respaldo cifrado al bucket de RESPALDO_S3_BUCKET con el nombre adharafit-AAAAMMDD-HHMM.dump.age.

### REQ-S17-020
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: Tras cada subida correcta, el contenedor de respaldo deberá conservar en el bucket solo los 14 respaldos más recientes y borrar los demás.

### REQ-S17-021
- tipo: si-entonces
- prioridad: MUST
- origen: RNF-07
- texto: Si el respaldo, el cifrado o la subida fallan entonces el contenedor de respaldo no deberá borrar ningún respaldo anterior ni actualizar el estado del último respaldo.

### REQ-S17-022
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: Tras una subida correcta el contenedor de respaldo deberá escribir la fecha del respaldo en el archivo de estado compartido con web-admin en solo lectura.

### REQ-S17-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Ningún archivo de respaldo sin cifrar deberá permanecer en el disco del servidor después de terminar el trabajo de respaldo.

### REQ-S17-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La clave privada de age no deberá almacenarse en el servidor, en el repositorio ni en las variables de entorno de producción.

### REQ-S17-025
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá descargar el respaldo indicado o el más reciente, descifrarlo con la clave privada entregada en ese momento y restaurarlo en una base temporal.

### REQ-S17-026
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá comprobar en la base temporal que existen todas las tablas del esquema, que la tabla de control de migraciones está al día y que hay al menos un administrador.

### REQ-S17-027
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá imprimir PASS o FAIL con el motivo y terminar con código cero o distinto de cero, respectivamente.

### REQ-S17-028
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-07
- texto: El script restaurar.sh deberá borrar la base temporal y los archivos descifrados al terminar, con éxito o con error.

### REQ-S17-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El script restaurar.sh no deberá escribir en la base de producción salvo que se ejecute con --produccion y --confirm.

### REQ-S17-030
- tipo: cuando
- prioridad: MUST
- origen: RNF-07
- texto: Cuando restaurar.sh termina con PASS, deberá registrar la fecha de la restauración de prueba en el archivo de estado compartido.

### REQ-S17-031
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: Los registros del sistema deberán ser líneas JSON con nivel, mensaje, fecha en UTC, ruta y código, escritas por un módulo propio sin dependencias nuevas.

### REQ-S17-032
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: Los registros no deberán incluir cuerpos de petición, cabeceras, contraseñas, claves, documentos de identidad ni correos.

### REQ-S17-033
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: Las rutas, acciones y casos de uso deberán registrar sus errores inesperados con el módulo de registros y no con console.

### REQ-S17-034
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-08
- texto: Docker deberá rotar los registros de cada contenedor de producción a 5 archivos de 10 MB.

### REQ-S17-035
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: Cada contenedor de producción deberá reiniciarse automáticamente salvo que se detenga a mano.

### REQ-S17-036
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: scripts/desplegar.sh deberá negarse a ejecutarse con cambios sin confirmar en el árbol de trabajo.

### REQ-S17-037
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: scripts/desplegar.sh deberá ejecutar un respaldo previo y detenerse con error si falla antes de aplicar ninguna migración.

### REQ-S17-038
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: scripts/desplegar.sh deberá etiquetar la imagen nueva con el hash corto del commit y conservar la etiqueta de la versión anterior.

### REQ-S17-039
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: scripts/desplegar.sh deberá esperar hasta 120 segundos a que /api/salud responda 200 e imprimir las instrucciones de reversión si no lo hace.

### REQ-S17-040
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-010
- texto: El comando admin:restablecer deberá exigir el correo del administrador y la opción --confirm y terminar con error sin escribir si falta alguno.

### REQ-S17-041
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-010
- texto: admin:restablecer deberá generar una contraseña de 20 caracteres con crypto.randomBytes e imprimirla una sola vez.

### REQ-S17-042
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: admin:restablecer deberá guardar solo el hash de la contraseña con el hasher de login.

### REQ-S17-043
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: admin:restablecer deberá cerrar todas las sesiones del administrador y registrar una fila en RegistroAuditoria con la fecha de Lima, sin la contraseña.

### REQ-S17-044
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S23-010
- texto: Si no existe un administrador con el correo indicado entonces admin:restablecer deberá terminar con error sin escribir nada ni revelar si el correo existe en otro estado.

### REQ-S17-045
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: El repositorio deberá contener docs/ops/despliegue.md, docs/ops/respaldo-y-restauracion.md y docs/ops/recuperar-acceso.md.

### REQ-S17-046
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-09
- texto: docs/ops/despliegue.md deberá incluir la lista de comprobación del servidor con firewall solo para 22, 80 y 443, acceso SSH con llaves y actualizaciones de seguridad automáticas.

### REQ-S17-047
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next, generated, las pruebas y las exenciones cerradas, no deberán contener console.log, console.error, console.warn ni console.info.

### REQ-S17-048
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-operacion.mjs encuentra alguno de los términos de REQ-S17-047, deberá terminar con código distinto de cero.

### REQ-S17-049
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-operacion.mjs encuentra alguno de los términos de REQ-S17-047, deberá nombrar archivo, línea y término.

### REQ-S17-050
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada entrada de tools/verificar-operacion.exenciones.json deberá nombrar un archivo existente, el motivo y un tope de líneas con console.

### REQ-S17-051
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-operacion.mjs en cada pull request.

## 2. Comportamiento

### BEH-S17-001
- cubre: REQ-S17-001, REQ-S17-002, REQ-S17-052, REQ-S17-003, REQ-S17-053, REQ-S17-007, REQ-S17-035
- categoria: feliz
- dado: el archivo docker-compose.prod.yml
- cuando: se analiza con un lector de YAML
- entonces: tiene los cinco servicios, solo caddy publica los puertos 80 y 443, migrar ejecuta db:migrar, web-admin depende de que migrar termine con código cero y corre con NODE_ENV production, y todos reinician salvo que se detengan a mano

### BEH-S17-002
- cubre: REQ-S17-004, REQ-S17-005
- categoria: feliz
- dado: un servidor de prueba con el dominio del propietario apuntando a él
- cuando: se piden https://DOMINIO/login y http://DOMINIO/login
- entonces: la primera responde con un certificado válido y la segunda redirige a HTTPS

### BEH-S17-003
- cubre: REQ-S17-006
- categoria: feliz
- dado: una petición a /login con la cabecera X-Forwarded-For: 1.2.3.4 enviada por el cliente
- cuando: Caddy la reenvía a web-admin
- entonces: web-admin recibe como último valor de X-Forwarded-For la IP real de la conexión y el valor 1.2.3.4 no cuenta como IP del cliente

### BEH-S17-004
- cubre: REQ-S17-008, REQ-S17-009
- categoria: feliz
- dado: IPS_PERMITIDAS con la IP del gimnasio, y luego vacía
- cuando: se piden /login y /api/salud desde la IP del gimnasio y desde otra
- entonces: con la lista, la IP del gimnasio recibe 200 en las dos rutas y la otra IP recibe 403 en /login y 200 en /api/salud; con la lista vacía todas reciben 200

### BEH-S17-005
- cubre: REQ-S17-010
- categoria: error
- dado: IPS_PERMITIDAS con «203.0.113.5, 198.51.100.0/24» y luego con «203.0.113.5, no-es-ip» y con «10.0.0.0/33»
- cuando: arranca el contenedor de Caddy con cada valor
- entonces: el primero arranca; los otros dos se niegan a arrancar y nombran el valor inválido

### BEH-S17-006
- cubre: REQ-S17-011
- categoria: feliz
- dado: el archivo .env.example y la herramienta tools/verificar-env.mjs de S-00
- cuando: se ejecuta la herramienta
- entonces: las siete variables de despliegue están listadas sin valor en una sección de despliegue y la herramienta pasa

### BEH-S17-007
- cubre: REQ-S17-012, REQ-S17-016
- categoria: feliz
- dado: un sistema con la base y el respaldo al día y la restauración de prueba de hace 10 días
- cuando: se pide /api/salud sin sesión
- entonces: responde 200 con un JSON que contiene solo estado «ok», db «ok», ultimoRespaldoHoras, ultimaRestauracionDias y version, y la ruta figura como pública en el test de contrato

### BEH-S17-008
- cubre: REQ-S17-013
- categoria: error
- dado: una base de datos detenida
- cuando: se pide /api/salud
- entonces: responde 503 con estado «caido» y db «caida» sin lanzar una excepción sin controlar

### BEH-S17-009
- cubre: REQ-S17-014
- categoria: borde
- dado: último respaldo hace 25 h 59 min, hace 26 h 1 min, sin respaldo con el proceso arrancado hace 10 h y sin respaldo con el proceso arrancado hace 27 h
- cuando: se pide /api/salud en cada caso
- entonces: el primero y el tercero responden 200, y el segundo y el cuarto responden 503 con estado «caido»

### BEH-S17-010
- cubre: REQ-S17-015
- categoria: borde
- dado: restauración de prueba hace 35 días, hace 36 días y sin restauración, con la base y el respaldo bien
- cuando: se pide /api/salud en cada caso
- entonces: el primero responde 200 con «ok» y los otros dos responden 200 con «degradado»

### BEH-S17-011
- cubre: REQ-S17-017, REQ-S17-018, REQ-S17-019, REQ-S17-022, REQ-S17-023
- categoria: feliz
- dado: una base efímera con datos, un bucket S3 simulado y una clave pública de age
- cuando: se ejecuta el trabajo de respaldo
- entonces: aparece en el bucket un objeto adharafit-AAAAMMDD-HHMM.dump.age que solo se descifra con la clave privada, el archivo de estado trae la fecha del respaldo y no queda ningún archivo sin cifrar en el disco

### BEH-S17-012
- cubre: REQ-S17-017
- categoria: borde
- dado: el planificador del contenedor de respaldo con la zona America/Lima
- cuando: se calcula la próxima ejecución a las 23:59 de Lima del 2026-11-12 y a las 03:00 del 2026-11-13
- entonces: la próxima ejecución es el 2026-11-13 a las 03:00 de Lima (08:00 UTC) en ambos casos

### BEH-S17-013
- cubre: REQ-S17-020
- categoria: borde
- dado: un bucket con 14 respaldos y otro con 15, y un respaldo nuevo correcto en cada caso
- cuando: se ejecuta el trabajo de respaldo
- entonces: cada bucket queda con los 14 más recientes y se borran los más antiguos; con 3 respaldos previos no se borra ninguno

### BEH-S17-014
- cubre: REQ-S17-021
- categoria: error
- dado: un bucket con 14 respaldos y fallos simulados en pg_dump, en el cifrado y en la subida
- cuando: se ejecuta el trabajo de respaldo en cada caso
- entonces: termina con código distinto de cero, no se borra ningún respaldo anterior y el archivo de estado conserva la fecha anterior

### BEH-S17-015
- cubre: REQ-S17-024
- categoria: feliz
- dado: el repositorio, las imágenes, el Compose de producción y .env.example
- cuando: se busca una clave privada de age (el prefijo AGE-SECRET-KEY-) y variables con la clave privada
- entonces: no existe ninguna

### BEH-S17-016
- cubre: REQ-S17-025, REQ-S17-026, REQ-S17-027, REQ-S17-028, REQ-S17-030
- categoria: feliz
- dado: un respaldo cifrado generado por BEH-S17-011 y la clave privada
- cuando: se ejecuta restaurar.sh
- entonces: restaura en una base temporal, comprueba tablas, migraciones y administrador, imprime PASS, termina con código cero, escribe la fecha de la restauración en el estado, borra la base temporal y los archivos descifrados, y no escribe en la base de producción

### BEH-S17-017
- cubre: REQ-S17-027, REQ-S17-028
- categoria: error
- dado: un respaldo corrupto, una clave privada equivocada y un respaldo al que le falta una tabla
- cuando: se ejecuta restaurar.sh con cada uno
- entonces: imprime FAIL con el motivo y termina con código distinto de cero en los tres casos, borra la base temporal y los archivos descifrados, y no actualiza la fecha de la restauración

### BEH-S17-018
- cubre: REQ-S17-029
- categoria: error
- dado: restaurar.sh ejecutado con --produccion sin --confirm, y con --confirm sin --produccion
- cuando: se intenta cada uno
- entonces: ambos terminan con error sin escribir en la base de producción

### BEH-S17-019
- cubre: REQ-S17-031, REQ-S17-032, REQ-S17-033
- categoria: feliz
- dado: una petición a api/checkin que falla con una excepción cuyo mensaje trae el documento «12345678» y una petición con contraseña y cabeceras
- cuando: se capturan las líneas de registro
- entonces: cada línea es JSON con nivel, mensaje, fecha UTC, ruta y código, y ninguna contiene el documento, la contraseña, cabeceras, cuerpos, claves ni correos

### BEH-S17-020
- cubre: REQ-S17-034
- categoria: feliz
- dado: el archivo docker-compose.prod.yml
- cuando: se leen las opciones de registro de cada servicio
- entonces: cada uno usa el controlador json-file con max-size 10m y max-file 5

### BEH-S17-021
- cubre: REQ-S17-036, REQ-S17-037, REQ-S17-038, REQ-S17-039
- categoria: feliz
- dado: un repositorio limpio y un entorno de prueba con Docker y comandos simulados
- cuando: se ejecuta scripts/desplegar.sh
- entonces: se hace el respaldo previo, se migra, se etiqueta la imagen con el hash corto del commit conservando la anterior, se arranca y se espera hasta 120 segundos a /api/salud con 200

### BEH-S17-022
- cubre: REQ-S17-036, REQ-S17-037, REQ-S17-039
- categoria: error
- dado: un árbol con cambios sin confirmar, un respaldo previo que falla y un arranque que nunca llega a 200
- cuando: se ejecuta scripts/desplegar.sh en cada caso
- entonces: el primero se niega sin hacer nada; el segundo se detiene con error antes de migrar; el tercero imprime las instrucciones de reversión tras 120 segundos y termina con código distinto de cero

### BEH-S17-023
- cubre: REQ-S17-040, REQ-S17-041, REQ-S17-042, REQ-S17-043
- categoria: feliz
- dado: un administrador activo con dos sesiones abiertas
- cuando: se ejecuta admin:restablecer con su correo y --confirm
- entonces: se imprime una contraseña de 20 caracteres una sola vez, solo se guarda su hash, las dos sesiones se cierran, existe una fila de RegistroAuditoria con la fecha de Lima y sin la contraseña, y con la nueva contraseña se puede iniciar sesión

### BEH-S17-024
- cubre: REQ-S17-040, REQ-S17-044
- categoria: error
- dado: el comando sin --confirm, sin correo, con un correo inexistente y con el correo de un administrador desactivado
- cuando: se ejecuta cada uno
- entonces: todos terminan con error sin escribir nada, y el mensaje del inexistente y del desactivado es el mismo y no revela cuál es cuál

### BEH-S17-025
- cubre: REQ-S17-045, REQ-S17-046
- categoria: feliz
- dado: la carpeta docs/ops
- cuando: se listan los archivos y se leen sus encabezados
- entonces: existen despliegue.md, respaldo-y-restauracion.md y recuperar-acceso.md, y despliegue.md contiene la lista de comprobación con firewall 22/80/443, SSH con llaves y actualizaciones automáticas

### BEH-S17-026
- cubre: REQ-S17-047, REQ-S17-048, REQ-S17-049, REQ-S17-050
- categoria: error
- dado: un archivo por cada uno de los cuatro términos de REQ-S17-047, una exención que nombra un archivo inexistente, otra sin motivo y otra sin tope de líneas
- cuando: se ejecuta tools/verificar-operacion.mjs
- entonces: falla y nombra archivo, línea y término de cada término, y rechaza las tres exenciones inválidas

### BEH-S17-027
- cubre: REQ-S17-051
- categoria: error
- dado: un pull request que agrega console.log en un archivo de apps/web-admin
- cuando: corre el CI
- entonces: el paso de tools/verificar-operacion.mjs falla y queda en rojo

### BEH-S17-028
- cubre: REQ-S17-017, REQ-S17-020
- categoria: concurrencia
- dado: dos ejecuciones del trabajo de respaldo lanzadas a la vez, con una barrera
- cuando: terminan las dos
- entonces: la segunda espera a la primera con un candado de archivo, no se mezclan los nombres ni se borra un respaldo recién subido, y el bucket queda con los 14 más recientes

## 3. Invariantes

### INV-S17-001
- propiedad: el bucket nunca queda con menos respaldos de los que había antes de un trabajo fallido, ni con más de 14 tras uno correcto
- mecanismo: test-propiedad
- deteccion: sobre 50 secuencias de trabajos correctos y fallidos generadas con un generador congruencial lineal de semilla fija escrito en la prueba, con un bucket simulado, tras cada trabajo la cantidad es mayor o igual que antes si falló y mínimo(previa + 1, 14) si fue correcto
- protege: REQ-S17-020, REQ-S17-021

### INV-S17-002
- propiedad: ningún dato personal ni secreto sale en los registros
- mecanismo: test-propiedad
- deteccion: sobre 50 casos de error generados con semilla fija cuyos mensajes y objetos incluyen documentos, correos, contraseñas y claves, ninguna línea de registro contiene esos valores
- protege: REQ-S17-031, REQ-S17-032

### INV-S17-003
- propiedad: ningún respaldo sale del servidor sin cifrar
- mecanismo: asercion-dominio
- deteccion: el trabajo de respaldo solo sube objetos con la extensión .dump.age que descifra age; una prueba intenta subir un volcado sin cifrar y el trabajo falla antes de subir
- protege: REQ-S17-018, REQ-S17-023, REQ-S17-024

### INV-S17-004
- propiedad: ningún console.* queda en el código de aplicación
- mecanismo: lint
- deteccion: tools/verificar-operacion.mjs termina con código distinto de cero y lista archivo:línea y término
- protege: REQ-S17-033, REQ-S17-047, REQ-S17-048, REQ-S17-049

## 4. Criterios de aceptación

### AC-S17-001
- enlaza: REQ-S17-001, REQ-S17-002, REQ-S17-052, REQ-S17-003, REQ-S17-053, REQ-S17-007, REQ-S17-034, REQ-S17-035, BEH-S17-001, BEH-S17-020
- metodo: unitario
- procedimiento: leer docker-compose.prod.yml con un analizador de YAML y comprobar los servicios, los puertos publicados, el comando de migrar, depends_on con service_completed_successfully, NODE_ENV, restart y las opciones de registro
- esperado: se cumple exactamente lo descrito en BEH-S17-001 y BEH-S17-020
- test: pendiente

### AC-S17-002
- enlaza: REQ-S17-004, REQ-S17-005, REQ-S17-006, REQ-S17-008, REQ-S17-009, BEH-S17-002, BEH-S17-003, BEH-S17-004
- metodo: manual
- procedimiento: en un VPS de prueba con el dominio del propietario, pedir https y http, enviar una petición con X-Forwarded-For falso y probar IPS_PERMITIDAS con la IP del gimnasio, con otra y vacía
- esperado: certificado válido, redirección a HTTPS, el último X-Forwarded-For es la IP real, y las respuestas de BEH-S17-004
- test: pendiente

### AC-S17-003
- enlaza: REQ-S17-010, BEH-S17-005
- metodo: integracion
- procedimiento: arrancar el contenedor de Caddy en Docker con los tres valores de IPS_PERMITIDAS de BEH-S17-005
- esperado: el primero arranca y los otros dos terminan con código distinto de cero nombrando el valor inválido
- test: pendiente

### AC-S17-004
- enlaza: REQ-S17-011, BEH-S17-006
- metodo: unitario
- procedimiento: ejecutar tools/verificar-env.mjs sobre .env.example y el código
- esperado: pasa y las siete variables de despliegue están en su sección sin valor
- test: pendiente

### AC-S17-005
- enlaza: REQ-S17-012, REQ-S17-013, REQ-S17-016, BEH-S17-007, BEH-S17-008
- metodo: integracion
- procedimiento: pedir /api/salud sin sesión con la base y los archivos de estado al día, con la base detenida, y ejecutar el test de contrato de rutas
- esperado: 200 con solo los cinco campos, 503 «caido» con la base detenida sin excepción, y la ruta figura como pública
- test: pendiente

### AC-S17-006
- enlaza: REQ-S17-014, REQ-S17-015, BEH-S17-009, BEH-S17-010
- metodo: integracion
- procedimiento: con un reloj simulado y archivos de estado fabricados, pedir /api/salud en los cuatro casos de BEH-S17-009 y los tres de BEH-S17-010
- esperado: los códigos y estados coinciden con esos comportamientos
- test: pendiente

### AC-S17-007
- enlaza: REQ-S17-017, REQ-S17-018, REQ-S17-019, REQ-S17-022, REQ-S17-023, BEH-S17-011, INV-S17-003
- metodo: integracion
- procedimiento: con una base efímera con datos, un bucket S3 simulado y un par de claves de age de prueba, ejecutar el trabajo de respaldo, descifrar el objeto con la clave privada de prueba y buscar archivos sin cifrar en el directorio de trabajo; después intentar subir un volcado sin cifrar
- esperado: el objeto existe con el nombre indicado, se descifra con la clave de prueba, el estado trae la fecha, no queda nada sin cifrar y la subida sin cifrar falla antes de subir
- test: pendiente

### AC-S17-008
- enlaza: REQ-S17-017, BEH-S17-012
- metodo: unitario
- procedimiento: calcular la próxima ejecución del planificador con TZ America/Lima para las 23:59 de Lima del 2026-11-12 y las 03:00 del 2026-11-13
- esperado: la próxima ejecución es el 2026-11-13 03:00 de Lima en ambos casos
- test: pendiente

### AC-S17-009
- enlaza: REQ-S17-020, REQ-S17-021, BEH-S17-013, BEH-S17-014, INV-S17-001
- metodo: integracion
- procedimiento: con un bucket simulado, ejecutar el trabajo con 3, 14 y 15 respaldos previos y con fallos simulados en pg_dump, cifrado y subida, y repetir 50 secuencias con semilla fija
- esperado: las cantidades finales y el estado coinciden con BEH-S17-013 y BEH-S17-014, y la invariante se cumple en las 50 secuencias
- test: pendiente

### AC-S17-010
- enlaza: REQ-S17-024, BEH-S17-015
- metodo: unitario
- procedimiento: buscar en el repositorio, en .env.example y en docker-compose.prod.yml el prefijo AGE-SECRET-KEY- y variables cuyo nombre contenga PRIVADA
- esperado: no hay ninguna coincidencia
- test: pendiente

### AC-S17-011
- enlaza: REQ-S17-025, REQ-S17-026, REQ-S17-027, REQ-S17-028, REQ-S17-030, BEH-S17-016, BEH-S17-017
- metodo: integracion
- procedimiento: ejecutar restaurar.sh con el respaldo de AC-S17-007 y su clave, y con un respaldo corrupto, una clave equivocada y un respaldo al que se le quitó una tabla, y contar bases y archivos temporales al terminar
- esperado: PASS con código cero y fecha registrada en el primero; FAIL con código distinto de cero y sin fecha en los otros tres; no quedan bases ni archivos temporales
- test: pendiente

### AC-S17-012
- enlaza: REQ-S17-029, BEH-S17-018
- metodo: integracion
- procedimiento: ejecutar restaurar.sh con --produccion sin --confirm y con --confirm sin --produccion contra una base que cuenta escrituras
- esperado: ambos terminan con error y la base no recibe escrituras
- test: pendiente

### AC-S17-013
- enlaza: REQ-S17-031, REQ-S17-032, REQ-S17-033, BEH-S17-019, INV-S17-002
- metodo: integracion
- procedimiento: provocar los dos errores de BEH-S17-019, capturar la salida estándar del módulo de registros y repetir sobre 50 casos con semilla fija
- esperado: cada línea es JSON con los cinco campos y ninguna contiene los valores sensibles
- test: pendiente

### AC-S17-014
- enlaza: REQ-S17-036, REQ-S17-037, REQ-S17-038, REQ-S17-039, BEH-S17-021, BEH-S17-022
- metodo: integracion
- procedimiento: ejecutar scripts/desplegar.sh con Docker y comandos simulados en los cuatro escenarios de BEH-S17-021 y BEH-S17-022
- esperado: el orden de pasos, las etiquetas, las esperas y los errores coinciden con esos comportamientos
- test: pendiente

### AC-S17-015
- enlaza: REQ-S17-040, REQ-S17-041, REQ-S17-042, REQ-S17-043, REQ-S17-044, BEH-S17-023, BEH-S17-024
- metodo: integracion
- procedimiento: con una base efímera, ejecutar admin:restablecer en los cinco casos de BEH-S17-023 y BEH-S17-024 y leer sesiones, auditoría y hash
- esperado: el éxito deja los efectos de BEH-S17-023 y los demás terminan con error sin escribir y con el mismo mensaje para inexistente y desactivado
- test: pendiente

### AC-S17-016
- enlaza: REQ-S17-045, REQ-S17-046, BEH-S17-025
- metodo: unitario
- procedimiento: comprobar que existen los tres archivos de docs/ops y que despliegue.md contiene los títulos «Firewall», «SSH» y «Actualizaciones»
- esperado: los tres archivos existen y los títulos están presentes
- test: pendiente

### AC-S17-017
- enlaza: REQ-S17-047, REQ-S17-048, REQ-S17-049, REQ-S17-050, BEH-S17-026, INV-S17-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-operacion.mjs con un árbol por cada uno de los cuatro términos, con las tres exenciones inválidas y con un árbol limpio; después ejecutarla sobre el árbol final
- esperado: falla con los cuatro términos nombrando archivo, línea y término, rechaza las exenciones inválidas, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S17-018
- enlaza: REQ-S17-051, BEH-S17-027
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue console.log en un archivo de apps/web-admin y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-operacion.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S17-019
- enlaza: REQ-S17-017, REQ-S17-020, BEH-S17-028
- metodo: integracion
- procedimiento: lanzar con Promise.all dos ejecuciones del trabajo de respaldo con una barrera y un bucket simulado
- esperado: la segunda espera a la primera, no se pierde ningún respaldo recién subido y el bucket queda con los 14 más recientes
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas en rojo de los registros, de `/api/salud`, del respaldo, de la restauración y de `admin:restablecer`; (2) `tools/verificar-operacion.mjs` y sus pruebas, con los 23 archivos actuales con `console` en su lista de exenciones, que se achica en cada paso; (3) módulo de registros JSON y migración de las llamadas a `console` archivo por archivo, cada commit con sus pruebas, achicando las exenciones; (4) `/api/salud` y su lectura de los archivos de estado, con la enmienda a S-05 y S-01 (ruta pública); (5) scripts de respaldo y restauración y su imagen (PostgreSQL, `age`, `rclone` y `cron` fijados por versión), con pruebas contra una base efímera y un bucket simulado; (6) `admin:restablecer` en `packages/infrastructure/seed/`; (7) `docker-compose.prod.yml`, `Caddyfile` y la validación de `IPS_PERMITIDAS`; (8) `scripts/desplegar.sh`; (9) runbooks de `docs/ops/`; (10) variables de despliegue en `.env.example` y paso del CI.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la propia prueba, una base efímera y una barrera; los scripts de shell se prueban con `bats` o con una prueba en TypeScript que los invoca (se elige al implementar sin agregar dependencias de producción).
- **Herramientas nuevas fuera de npm:** Caddy, `age`, `rclone` y PostgreSQL como imágenes o paquetes de Docker con versión fijada; no entran en el `package.json` y se justifican por ser el estándar de TLS automático, de cifrado de archivos y de copia a S3.
- AC-S17-002 y AC-S17-018 son pasos manuales del propietario o del operador (requieren un VPS con dominio y el CI).

### 5.2 Migración
- No hay datos que migrar: producción nace con el baseline de S-15.
- **Enmiendas que se registran al aprobar S-17:**
  - S-05: REQ-S05-025 y SUP-S05-014 se leen con tres rutas públicas (`/login`, la ruta del kiosco y `/api/salud`).
  - S-01: el test de contrato de rutas suma `/api/salud` como ruta pública; SUP-S01-003 queda cumplido por Caddy (REQ-S17-006).
  - S-15: el despliegue en producción ejecuta `db:migrar` con el servicio `migrar` de `docker-compose.prod.yml` y una copia previa; el traspaso queda cumplido.
  - S-23: SUP-S23-010 y 5.3 se cumplen con `admin:restablecer` y `docs/ops/recuperar-acceso.md`.
  - S-06: los `console.error` de `api/checkin`, `api/miembros` y `lib/activacion.ts` pasan al módulo de registros.
  - S-22: REQ-S22-017 se mantiene (el entrypoint no migra); la imagen de `web-admin` no cambia.
  - S-00: `.env.example` suma las siete variables de despliegue y la sección correspondiente.
  - `docs/00-indice.md`, `docs/08-decisiones-pendientes.md` (P-12 con el despliegue por defecto), `COBERTURA-RF.md` (RF-70, RNF-07 a RNF-09) y `BACKLOG-SPECS.md`: nota de que S-17 cubre la operación.
- **Traspasos:** el propietario (VPS, dominio, bucket, monitor externo y llave privada de age), S-21 (los televisores comparten la IP del gimnasio que va en `IPS_PERMITIDAS`) y una spec futura para agregación de registros, métricas y alertas por canal propio si hicieran falta.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente. La reversión de un despliegue está en REQ-S17-039 y el runbook.

### 5.3 Riesgos
- Perder la llave privada de age hace inútiles todos los respaldos. Mitigación: el runbook obliga a guardarla en dos lugares fuera del servidor y a probar la restauración cada mes.
- Una restricción por IP mal escrita deja al propietario fuera del panel, y la IP pública del gimnasio puede cambiar. Mitigación: la lista vacía quita la restricción, `/api/salud` queda exceptuada, el runbook explica cómo editar el archivo por SSH y se recomienda IP fija.
- La alerta depende de un monitor externo que el propietario debe configurar; sin él nadie se entera de una caída. Mitigación: el runbook lo pone como paso obligatorio del despliegue.
- Un solo VPS es un punto único de falla; la recuperación es restaurar el respaldo en un servidor nuevo (RPO de 24 horas). Mitigación: la prueba mensual y el despliegue por script reducen el tiempo de recuperación.
- Aplicar migraciones al desplegar puede dejar la base en un esquema que la versión anterior no entiende. Mitigación: respaldo previo obligatorio y reversión por restauración.
- `/api/salud` pública revela que el sistema existe y el estado de sus respaldos. Mitigación: solo tres datos operativos, sin nombres ni conteos.
- El respaldo cifrado en un bucket de otro proveedor sigue siendo dato personal fuera del servidor (Ley 29733). Mitigación: cifrado con `age` antes de salir y bucket distinto del de fotos.
- Las fotos de R2 no entran en el respaldo. Mitigación: R2 es un servicio administrado; si se perdieran, solo se pierden las fotos.
- No verificado el comportamiento de Caddy y de Let's Encrypt con el dominio real. Mitigación: la prueba manual AC-S17-002 en un VPS de prueba antes de producción.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿El despliegue es un VPS único con Docker Compose y Caddy? Default: sí (SUP-S17-001); necesito que elijas el proveedor y el dominio (P-12).
- ¿La restricción por IP queda vacía hasta que me des la IP fija del gimnasio? Default: sí (SUP-S17-003).
- ¿Los respaldos se cifran con `age` y se suben a un bucket S3 distinto al de las fotos, conservando 14? Default: sí (SUP-S17-004).
- ¿La alerta la envía un monitor externo gratuito que tú configuras sobre `/api/salud`? Default: sí (SUP-S17-005).
- ¿La prueba de restauración la haces tú una vez al mes con el script? Default: sí (SUP-S17-007).
- ¿El restablecimiento de contraseña se hace por línea de comandos en el servidor, con `--confirm`? Default: sí (SUP-S17-010).
