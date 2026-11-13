# Despliegue provisional en Easypanel

Guía para ver la aplicación en línea mientras avanza el desarrollo (S-17 define el despliegue definitivo con Caddy, respaldos y `/api/salud`).

## Servicios (proyecto `platforms`)
- `adhara-fit-bd`: PostgreSQL.
- `adhara-fit-app`: aplicación con origen en la rama `main` de este repositorio, construida con el `Dockerfile` de la raíz (contexto: la raíz del repositorio; puerto 3000).

## Variables de entorno de `adhara-fit-app`
Solo nombres; los valores van en Easypanel, nunca en el repositorio.

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Cadena de conexión del servicio `adhara-fit-bd` (host interno del proyecto) |
| `NEXT_PUBLIC_API_URL` | URL pública de la aplicación |
| `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Almacenamiento de archivos (Cloudflare R2) |
| `TZ` | `America/Lima` |
| `CHECKIN_CLAVE` | Clave única del Check-in Module (mínimo 16 caracteres). Sin ella, el check-in responde 401 |
| `ADMIN_NOMBRE`, `ADMIN_CORREO` | Nombre y correo del primer administrador. Solo se leen si la tabla de usuarios está vacía |
| `ADMIN_CONTRASENA_INICIAL` | Opcional, de 8 a 128 caracteres. Si falta, se genera una de 20 y se imprime una sola vez en el registro del arranque |

## Qué hace al arrancar
`docker-entrypoint.sh` ejecuta `prisma db push` y luego inicia el servidor: en una base vacía crea las 25 tablas; si un cambio de esquema perdiera datos, se niega y el contenedor no arranca (no usa `--accept-data-loss`). Es provisional: S-15 lo reemplaza por el servicio `migrar` con migraciones versionadas.

## Qué verás y qué falta
- La pantalla de inicio de sesión responde en la URL pública.
- **Todavía no hay usuario inicial**: el seed del Repo A se excluyó a propósito (traía contraseñas fijas) y el alta del primer administrador llega con S-15 y S-17.
- Mientras tanto la aplicación conserva el comportamiento heredado (dólares, bolívares, turnos, organizaciones); cada spec posterior lo retira.

## Antes de usarla con datos reales
- Rotar cualquier clave que se haya compartido por chat o por un canal que no sea el panel de Easypanel.
- El repositorio es público: no escribir credenciales en ningún archivo.
