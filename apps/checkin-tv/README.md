# Adhara Check-in para Android TV

## 1. Qué es

APK de Android TV (Capacitor 8, `appId` `pe.adharafit.checkin`, nombre "Adhara Check-in") con la interfaz de `apps/checkin` **empaquetada dentro** (export estático). No hay servicio web propio del check-in: en Easypanel solo corren `web-admin` y PostgreSQL. El APK habla con `web-admin` en `/api/checkin` (registrar la entrada) y `/api/checkin/estado` (sede y configuración del reposo), con la clave en el encabezado `X-Checkin-Api-Key`.

La URL de `web-admin` y la clave van en `checkin-config.json` dentro del bundle, que escribe `capacitor/scripts/preparar.mjs`. Es el mismo esquema de `apps/vitrina-tv`.

Código: `capacitor/` (proyecto Capacitor, deliberadamente **no** es un workspace de npm).

## 2. Requisitos del TV

- Android TV / Google TV.
- **Android System WebView 111 o superior.** Si es menor, el check-in muestra un aviso en pantalla.
- Numpad USB con **Num Lock encendido**.

## 3. Compilar

1. Exportar la interfaz: `npm run build --workspace checkin` (genera `apps/checkin/out`).
2. En `apps/checkin-tv/capacitor/`: `CHECKIN_API_URL=https://<web-admin> CHECKIN_CLAVE=<clave> npm run sync`. `CHECKIN_API_URL` debe ser https, sin barra final; `CHECKIN_CLAVE` es el valor de la variable `CHECKIN_CLAVE` de `web-admin` (mínimo 16 caracteres). Genera `www/` y `capacitor.config.json`, que están en `.gitignore`.
3. Compilar el APK con Gradle (`capacitor/android`, `./gradlew assembleDebug`, Java 21).

**Compilación en GitHub Actions (la forma normal).** Workflow `apk` (`.github/workflows/apk.yml`, Actions → apk → Run workflow): compila el APK del Check-in y el de la Vitrina y sube cada uno **cifrado** como artefacto (`adhara-checkin.apk.enc`, `adhara-vitrina.apk.enc`, 14 días). Necesita, en el repositorio: secrets `CHECKIN_CLAVE` y `APK_PASSPHRASE`, y la variable `CHECKIN_API_URL` (https, sin barra final). La vitrina usa la misma clave y URL. Para descifrar el artefacto descargado:

```
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:APK_PASSPHRASE -in adhara-checkin.apk.enc -out adhara-checkin.apk
```

(con `APK_PASSPHRASE` definida en la terminal; no pegarla en el comando ni en chats). Sin `CHECKIN_API_URL`, `CHECKIN_CLAVE` o `APK_PASSPHRASE` el workflow falla de inmediato.

Nunca pegar la clave en chats, issues, commits ni logs.

## 4. Instalar en el TV

Por USB: copiar el APK al TV, abrirlo con una app de archivos y permitir "instalar desde esta fuente".

Por red con adb: en el TV activar las opciones de desarrollador y la depuración por red; en la PC `adb connect <ip-del-tv>` y `adb install -r <apk>`. Al terminar, desactivar la depuración y ejecutar `adb disconnect`: el APK es de debug y guarda la clave, no debe quedar un canal adb abierto.

Abrir la app desde el launcher del TV como "Adhara Check-in".

## 5. Rotar la clave

Cambiar `CHECKIN_CLAVE` en Easypanel (esto invalida de inmediato al APK instalado), volver a compilar con la clave nueva (sección 3) e instalar con `adb install -r`. La vitrina usa la misma clave: recompilar también su APK.

## 6. Lista de verificación en el TV real

Pendiente de verificar (no probado en un TV físico):

- Abre a pantalla completa y la pantalla no se apaga.
- El numpad escribe (con Num Lock) y Enter registra.
- Sin red al arrancar, la interfaz abre desde el bundle y la entrada queda en la cola de pendientes hasta que vuelva la red.
- Escape/Backspace del numpad y el botón Atrás del mando no cierran la app.
- Con WebView viejo (< 111) aparece el aviso.
- La ficha de reposo y el flip se ven bien y el texto es legible. Si el TV reporta 960x540, ajustar `html { font-size }` en `apps/checkin/app/globals.css`.
- Las llamadas a `web-admin` funcionan desde el origen del WebView (CORS está abierto; ver `apps/web-admin/lib/checkin.ts`).
- Tras reiniciar el TV hay que abrir la app a mano: el arranque automático no está implementado (Android 10+ lo limita).

## 7. Cambiar frases, imagen y opacidad del reposo

No hace falta recompilar ni reinstalar: en el panel, menú **Check-in**, se editan las frases, la imagen del círculo y la opacidad del fondo de la ficha. El TV consulta el servidor cada ~30 s y aplica el cambio solo; sin red conserva la última configuración recibida.

## 8. Seguridad

El repositorio es **público**. El APK lleva la clave dentro: nunca publicarlo ni subirlo a un sitio sin acceso restringido. Con acceso físico al TV la clave podría extraerse del APK instalado (riesgo aceptado). El APK se firma con una llave de debug que el workflow genera en cada ejecución (`debug.keystore` no se versiona: `*.keystore` está en `.gitignore`). Como la llave cambia en cada compilación, **para actualizar un TV hay que desinstalar antes el APK anterior** (`adb uninstall pe.adharafit.checkin`); `adb install -r` fallaría por firma distinta. La firma no protege nada.

## Desarrollo

En `capacitor/`: `npm test` (pruebas de `scripts/`). `scripts/generar-iconos.ps1` regenera los íconos del launcher y el banner de TV a partir de `scripts/icono-checkin.jpg`. Para ver la interfaz en el navegador: crear `apps/checkin/public/checkin-config.json` (no se versiona) con `{"apiUrl": "http://localhost:3000", "clave": "<clave>"}` y ejecutar `npm run dev --workspace checkin`.
