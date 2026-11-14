# APK de Android TV: compilación, descarga e instalación

Mapa completo (qué hace cada app, buckets, secrets, estado y pendientes): `docs/ops/apps-android-tv.md`.

Dos apps: **Adhara Fit Check-in** (`pe.adharafit.checkin`) y **Adhara Fit Vitrina** (`pe.adharafit.vitrina`). Se compilan en GitHub Actions y se publican en el bucket privado `apk` de R2.

## 1. Qué hace el workflow `apk`

Actions → apk → **Run workflow** (el botón de arriba a la derecha; «Re-run» de una corrida vieja repite el workflow viejo). Por cada app compila el APK y sube al bucket `apk`:

| Archivo | Contenido |
|---|---|
| `AF-checkin.apk` / `AF-vitrina.apk` | El APK (siempre el último; se sobrescribe). |
| `AF-checkin.json` / `AF-vitrina.json` | `{app, versionCode, versionName, sha256, apk}`: la versión y la huella del APK. |

Además, si existe `R2_APK_PUBLIC_URL`, publica la interfaz para la autoactualización (sección 6) en el mismo bucket `apk`: `ota/<app>/<versionCode>.zip` y `ota/<app>/latest.json`.

`versionCode` es el número de corrida de GitHub (sube solo); `versionName` es `1.0.<corrida>`.

## 2. Secrets del repositorio (Settings → Secrets and variables → Actions)

Van en el repositorio, **no** en un Environment.

| Nombre | Qué es |
|---|---|
| `CHECKIN_CLAVE` | La misma clave que `CHECKIN_CLAVE` de web-admin (mínimo 16 caracteres). |
| `CHECKIN_API_URL` | `https://app.adhara.fit` (variable o secret). |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Credenciales de R2 con escritura en el bucket `apk`. |
| `R2_APK_PUBLIC_URL` | `https://apk.adhara.fit`, variable o secret. Activa la autoactualización. |
| `APK_KEYSTORE_BASE64` | Llave de firma fija (sección 3). Sin ella cada APK se firma con una llave nueva. |

Variable opcional: `R2_APK_BUCKET_NAME` (por defecto `apk`).

## 3. Llave de firma fija (necesaria para instalar encima sin desinstalar)

Android solo deja actualizar una app si el APK nuevo está firmado con la **misma llave** y tiene un `versionCode` mayor. Se crea una sola vez, en tu PC (necesita Java/JDK instalado para `keytool`). En **PowerShell**:

```
keytool -genkeypair -keystore adhara.keystore -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Adhara Fit,O=Adhara Fit,C=PE"
[Convert]::ToBase64String([IO.File]::ReadAllBytes("adhara.keystore")) | Set-Clipboard
```

El último comando deja el texto base64 en el portapapeles. (En Git Bash el equivalente es `base64 -w0 adhara.keystore`.) Pega ese texto como secret `APK_KEYSTORE_BASE64` y guarda `adhara.keystore` en un lugar seguro (si se pierde, habrá que desinstalar y reinstalar las apps en todos los TV). Nunca lo subas al repositorio ni lo pegues en chats.

## 4. Descargar e instalar

1. En Cloudflare, abrir el acceso público del bucket `apk` (dominio `apk.adhara.fit`).
2. En el TV, abrir `https://apk.adhara.fit/AF-checkin.apk` o `.../AF-vitrina.apk` (o escanear el QR de Configuraciones → Aplicaciones) y permitir «Instalar apps desconocidas» a esa app.
3. Al terminar de instalar, **cerrar** de nuevo el acceso a los APK: llevan la clave del check-in dentro.

Como la autoactualización (sección 6) necesita que `https://apk.adhara.fit/ota/...` esté siempre accesible, el bucket queda con el dominio público y el cierre se hace con una **regla de Cloudflare** (Seguridad → WAF → Reglas personalizadas) sobre `apk.adhara.fit`: *si la ruta no empieza por `/ota/` → Bloquear*. Para instalar un APK se desactiva esa regla y al terminar se vuelve a activar. La carpeta `ota/` solo contiene la interfaz web, sin clave.

Si se filtra el enlace mientras estuvo abierto: cambiar `CHECKIN_CLAVE` (web-admin y el secret de GitHub), volver a ejecutar el workflow y reinstalar.

## 5. Íconos y nombres

`node tools/generar-iconos-apk.mjs` regenera íconos, banner y pantalla de arranque de ambos APK desde `docs/ADHARA_FIT_Logo_Kit/icon-checkin.png` e `icon-vitrina.png`. Los nombres visibles son «Adhara Fit Check-in» y «Adhara Fit Vitrina».

## 6. Autoactualización de la interfaz (sin reinstalar)

Cada APK revisa `latest.json` al arrancar (a los 15 s) y cada 30 minutos. Si hay una versión mayor, descarga el zip, verifica el SHA-256 y recarga la interfaz cuando nadie toca el TV hace 20 s. El plugin es `@capgo/capacitor-updater` en modo manual y sin la nube de Capgo; la lógica está en `packages/ota`.

- **Qué se actualiza:** la interfaz web (pantallas, textos, estilos, lógica de las apps de check-in y vitrina). Un cambio llega a los TV unos minutos después de ejecutar el workflow `apk`, sin tocar los TV.
- **Qué no se actualiza:** el código Android (permisos, plugins, ícono, nombre, versión de Capacitor). Eso exige un APK nuevo, instalado a mano como en la sección 4 (Android no permite instalar APK en silencio).
- **Seguridad:** el zip nunca lleva la URL ni la clave (el workflow aborta si detecta el archivo de configuración); la configuración vive dentro del APK y se guarda una copia en el TV para seguir funcionando tras actualizar. Si la interfaz nueva no arranca en 10 s, el plugin vuelve sola a la anterior; cada versión se intenta como máximo 3 veces.
- **Primera vez:** el primer APK con esta función hay que instalarlo a mano; desde ahí, las interfaces se actualizan solas. Necesita `R2_APK_PUBLIC_URL` configurado al compilar (si falta, el workflow lo avisa).
- **Comprobar:** abrir `https://apk.adhara.fit/ota/checkin/latest.json` y ver el `versionName`.
