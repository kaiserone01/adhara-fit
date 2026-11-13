# Despliegue provisional en Easypanel

Guía para ver la aplicación en línea mientras avanza el desarrollo (S-17 define el despliegue definitivo).

## Servicios (proyecto `platforms`)
- `adhara-fit-bd`: PostgreSQL.
- `adhara-fit-app`: aplicación con origen en la rama `main` de este repositorio, construida con el `Dockerfile` de la raíz (contexto: la raíz del repositorio; puerto 3000).

## Variables de entorno de `adhara-fit-app`
Solo nombres; los valores van en Easypanel, nunca en el repositorio.

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Cadena de conexión del servicio `adhara-fit-bd` (host interno del proyecto) |
| `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Almacenamiento de archivos (Cloudflare R2) |
| `TZ` | `America/Lima` |
| `CHECKIN_CLAVE` | Clave única del Check-in Module (mínimo 16 caracteres). Sin ella, el check-in responde 401 |
| `ADMIN_NOMBRE`, `ADMIN_CORREO` | Nombre y correo del primer administrador. Solo se leen si la tabla de usuarios está vacía |
| `ADMIN_CONTRASENA_INICIAL` | Opcional, de 8 a 128 caracteres. Si falta, se genera una de 20 y se imprime una sola vez en el registro del arranque |

## Qué hace al arrancar
`docker-entrypoint.sh` ejecuta `prisma db push` y luego inicia el servidor: en una base vacía crea las 25 tablas; si un cambio de esquema perdiera datos, se niega y el contenedor no arranca (no usa `--accept-data-loss`). Es provisional: S-15 lo reemplaza por el servicio `migrar` con migraciones versionadas.

## Salud y respaldos
- **`GET /api/salud`** es público (sin sesión) y devuelve solo `estado`, `db`, `ultimoRespaldoHoras`, `ultimaRestauracionDias` y `version`. Responde 503 con `estado: "caido"` si la base no contesta en 2 segundos. Úsalo como comprobación de salud del servicio en Easypanel y como monitor externo.
- **Respaldos de la base:** configura los respaldos automáticos del servicio `adhara-fit-bd` hacia un bucket (en la pestaña de respaldos del servicio, si tu versión de Easypanel la trae) con frecuencia diaria. Guarda las credenciales del bucket solo en Easypanel.
- **Estado de respaldo en `/api/salud` (opcional):** si el trabajo de respaldo escribe un archivo JSON `{"ultimoRespaldo":"<ISO>","ultimaRestauracion":"<ISO>"}` y la variable `RESPALDO_ESTADO_ARCHIVO` apunta a él, `/api/salud` pasa a responder 503 si el último respaldo tiene más de 26 horas (o no hay ninguno tras 26 horas en marcha) y `degradado` si la última restauración de prueba tiene más de 35 días. Sin esa variable los controles de respaldo no se aplican (para que un respaldo sin configurar no tumbe el servicio). `APP_VERSION` (opcional) se muestra como `version`.
- **Prueba de restauración (cada mes):** restaurar el respaldo más reciente en una base temporal, comprobar que están las tablas y al menos un administrador, y borrar la base temporal. Nunca restaurar sobre la base real sin confirmación del propietario.

## Qué verás
- La pantalla de inicio de sesión responde en la URL pública; el primer administrador se crea al arrancar con `ADMIN_NOMBRE` y `ADMIN_CORREO` si la tabla de usuarios está vacía.
- El login se bloquea (429) tras 5 contraseñas fallidas en 15 minutos por correo e IP, y el check-in tras 5 fallos en 5 minutos.

## Antes de usarla con datos reales
- Rotar cualquier clave que se haya compartido por chat o por un canal que no sea el panel de Easypanel (base de datos y R2).
- El repositorio es público: no escribir credenciales en ningún archivo.
