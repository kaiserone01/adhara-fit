# APK de Android TV: compilación, descarga e instalación

Dos apps: **Adhara Fit Check-in** (`pe.adharafit.checkin`) y **Adhara Fit Vitrina** (`pe.adharafit.vitrina`). Se compilan en GitHub Actions y se publican en el bucket privado `apk` de R2.

## 1. Qué hace el workflow `apk`

Actions → apk → **Run workflow** (el botón de arriba a la derecha; «Re-run» de una corrida vieja repite el workflow viejo). Por cada app compila el APK y sube al bucket `apk`:

| Archivo | Contenido |
|---|---|
| `AF-checkin.apk` / `AF-vitrina.apk` | El APK (siempre el último; se sobrescribe). |
| `AF-checkin.json` / `AF-vitrina.json` | `{app, versionCode, versionName, sha256, apk}`: la versión y la huella. Es el canal que leerá la autoactualización. |

`versionCode` es el número de corrida de GitHub (sube solo); `versionName` es `1.0.<corrida>`.

## 2. Secrets del repositorio (Settings → Secrets and variables → Actions)

Van en el repositorio, **no** en un Environment.

| Nombre | Qué es |
|---|---|
| `CHECKIN_CLAVE` | La misma clave que `CHECKIN_CLAVE` de web-admin (mínimo 16 caracteres). |
| `CHECKIN_API_URL` | `https://app.adhara.fit` (variable o secret). |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Credenciales de R2 con escritura en el bucket `apk`. |
| `APK_KEYSTORE_BASE64` | Llave de firma fija (sección 3). Sin ella cada APK se firma con una llave nueva. |

Variable opcional: `R2_APK_BUCKET_NAME` (por defecto `apk`).

## 3. Llave de firma fija (necesaria para instalar encima sin desinstalar)

Android solo deja actualizar una app si el APK nuevo está firmado con la **misma llave** y tiene un `versionCode` mayor. Se crea una sola vez, en tu PC:

```
keytool -genkeypair -keystore adhara.keystore -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Adhara Fit,O=Adhara Fit,C=PE"
base64 -w0 adhara.keystore
```

Pega el resultado de `base64` como secret `APK_KEYSTORE_BASE64` y guarda `adhara.keystore` en un lugar seguro (si se pierde, habrá que desinstalar y reinstalar las apps en todos los TV). Nunca lo subas al repositorio ni lo pegues en chats.

## 4. Descargar e instalar

1. En Cloudflare, abrir el acceso público del bucket `apk` (dominio `apk.adhara.fit`).
2. En el TV, abrir `https://apk.adhara.fit/AF-checkin.apk` o `.../AF-vitrina.apk` (o escanear el QR de Configuraciones → Aplicaciones) y permitir «Instalar apps desconocidas» a esa app.
3. Al terminar de instalar, **cerrar** de nuevo el acceso público: el APK lleva la clave del check-in dentro.

Si se filtra el enlace mientras estuvo abierto: cambiar `CHECKIN_CLAVE` (web-admin y el secret de GitHub), volver a ejecutar el workflow y reinstalar.

## 5. Íconos y nombres

`node tools/generar-iconos-apk.mjs` regenera íconos, banner y pantalla de arranque de ambos APK desde `docs/ADHARA_FIT_Logo_Kit/icon-checkin.png` e `icon-vitrina.png`. Los nombres visibles son «Adhara Fit Check-in» y «Adhara Fit Vitrina».
