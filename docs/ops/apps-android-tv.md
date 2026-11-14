# Aplicaciones de Android TV (Check-in y Vitrina): mapa completo

Documento de referencia de todo lo que tiene que ver con las dos aplicaciones de TV: qué resuelven, dónde está cada pieza, cómo se compilan, publican, instalan y actualizan, y cómo se relacionan los buckets, los secrets y las variables. Complementa `docs/ops/apk.md` (operación paso a paso) y los README de `apps/checkin-tv` y `apps/vitrina-tv` (detalle de cada TV).

Última revisión: 2026-11-14 (sesión noche, 28).

## 1. Qué resuelve cada aplicación

| App | Nombre visible | `appId` | Qué hace | Habla con |
|---|---|---|---|---|
| Check-in | Adhara Fit Check-in | `pe.adharafit.checkin` | Pantalla del TV de la recepción. El socio escribe su DNI/CE con un numpad USB y la entrada queda registrada. Muestra saludo, foto y estado de la membresía; en reposo muestra frases e imagen configurables. Si no hay red guarda las entradas en una cola y las reenvía. | `POST /api/checkin` y `GET /api/checkin/estado` de web-admin, con la clave en el encabezado `X-Checkin-Api-Key`. |
| Vitrina | Adhara Fit Vitrina | `pe.adharafit.vitrina` | Pantalla de promociones, entrenadores y productos. Guarda el contenido en el disco del TV (funciona sin red) y se actualiza en vivo cuando el panel cambia algo. | `GET /api/vitrina` y `GET /api/vitrina/eventos` (SSE) de web-admin, con la clave de la sede. |

- Las dos son **solo para Android TV** (la pestaña Configuraciones → Aplicaciones del panel lo indica con una insignia «Android TV» y el ícono de cada app).
- Qué se edita desde el panel, sin tocar los TV: menú **Check-in** (frases, imagen del círculo, opacidad del fondo del reposo; el TV consulta cada ~30 s) y menú **Vitrina** (contenido).
- Fuera de alcance (decisión del propietario): `kiosk-host` (`.exe`), sitio público, WhatsApp, SUNAT. Dentro de alcance (ADR-021): vitrina de TV y check-in en smart-TV con teclado numérico USB. Hoja de ruta: tramo 5 «Kiosco y TV» de `docs/superpowers/plans/2026-11-13-ruta-agil.md` (S-20, S-21).

## 2. Dónde está cada cosa en el repositorio

| Ruta | Qué es |
|---|---|
| `apps/checkin/` | Interfaz web del check-in (Next, `output: "export"`: HTML/JS estático que se empaqueta en el APK). |
| `apps/vitrina/` | Interfaz web de la vitrina (igual). Tiene además un `Dockerfile` para ver una vista previa en el navegador (no es el APK). |
| `apps/checkin-tv/capacitor/`, `apps/vitrina-tv/capacitor/` | Cáscaras Android (Capacitor 8). **No son workspaces de npm**: tienen su propio `package.json` y `package-lock.json`. Contienen `android/` (proyecto Gradle), `scripts/configuracion.mjs` (variables de entorno → `capacitor.config.json` y `*-config.json`, con pruebas) y `scripts/preparar.mjs` (copia `apps/<app>/out` a `www/` y escribe la configuración). |
| `packages/ota/` | Autoactualización de la interfaz (`@gym-app/ota`): `manifiesto.ts` (validación pura, con pruebas), `autoactualizar.ts` (lógica del plugin), `respaldo.ts` (copia de la configuración en `localStorage`), `Actualizador.tsx` (componente que se monta en el layout de las dos apps). |
| `apps/web-admin/app/api/checkin/`, `apps/web-admin/app/api/vitrina/` | Endpoints que consumen las apps. |
| `apps/web-admin/app/(panel)/configuraciones/aplicaciones/` | Pestaña Aplicaciones: enlaces, QR e íconos de descarga (usa `R2_APK_PUBLIC_URL`). Íconos livianos en `apps/web-admin/public/aplicaciones/`. |
| `.github/workflows/apk.yml` | Workflow que compila los APK, los sube y publica la interfaz para la autoactualización. |
| `tools/generar-iconos-apk.mjs` | Regenera íconos, banner de TV y pantalla de arranque desde `docs/ADHARA_FIT_Logo_Kit/icon-checkin.png` e `icon-vitrina.png`. |
| `docs/ops/apk.md` | Operación: secrets, llave de firma, instalar, autoactualización. |

Marca: carbón `#231F20`, amarillo `#FFCB04`, blanco. Íconos: Check-in = pesa rusa verde con teclado; Vitrina = pesa rusa naranja con megáfono.

## 3. Los dos buckets de R2 y cómo se relacionan

R2 es el almacenamiento de Cloudflare. Las credenciales (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`) cubren **todos** los buckets de la cuenta.

| Bucket | Dominio público | Para qué | Quién escribe | Quién lee |
|---|---|---|---|---|
| `adhara-fit-app` | `https://media.adhara.fit` | Archivos de la aplicación web: fotos de socios y entrenadores, medios de la vitrina, logos. | web-admin (en Easypanel). | Navegadores y TV (fotos y medios). |
| `apk` | `https://apk.adhara.fit` | Todo lo de las apps de TV (ver abajo). | El workflow `apk` de GitHub. | Quien instala (APK) y los TV (carpeta `ota/`). |

Contenido del bucket `apk`:

| Archivo | Qué es | ¿Sensible? |
|---|---|---|
| `AF-checkin.apk`, `AF-vitrina.apk` | Los APK (el último; se sobrescriben). | **Sí: llevan dentro la clave del check-in.** |
| `AF-checkin.json`, `AF-vitrina.json` | `{app, versionCode, versionName, sha256, apk}` del APK. | No. |
| `ota/checkin/<N>.zip`, `ota/vitrina/<N>.zip` | La interfaz web exportada (sin configuración ni clave). `<N>` = número de corrida. | No. |
| `ota/checkin/latest.json`, `ota/vitrina/latest.json` | `{app, versionCode, versionName, zip, sha256}`: lo que el TV lee para saber si hay versión nueva (se sube con `no-store`). | No. |

**Protección acordada:** el bucket `apk` queda con el dominio público siempre activo (la autoactualización necesita leer `/ota/...` en cualquier momento), y una **regla de Cloudflare** en `apk.adhara.fit` (Seguridad → WAF → Reglas personalizadas) bloquea toda ruta que no empiece por `/ota/`. Para instalar un APK se desactiva la regla un momento y se vuelve a activar. **Pendiente de crear esa regla** (hasta que exista, los `.apk` son descargables por cualquiera que adivine el nombre).

Ojo con los nombres: en Easypanel `R2_BUCKET_NAME` es siempre `adhara-fit-app` (si se cambia a `apk`, las fotos nuevas irían al bucket equivocado). El bucket `apk` solo se nombra en GitHub con `R2_APK_BUCKET_NAME` (opcional; por defecto `apk`).

## 4. Secrets y variables: dónde va cada uno y cómo se relacionan

### GitHub (repositorio → Settings → Secrets and variables → Actions; el workflow los lee como variable o secret)

| Nombre | Valor | Para qué |
|---|---|---|
| `CHECKIN_API_URL` | `https://app.adhara.fit` | URL base de web-admin. El workflow la usa también como `VITRINA_API_URL`. Va dentro del APK (`*-config.json`). |
| `CHECKIN_CLAVE` | la clave única del gimnasio (mín. 16 caracteres) | **Debe ser idéntica** a la variable `CHECKIN_CLAVE` de web-admin en Easypanel. El workflow también la usa como `VITRINA_CLAVE`: check-in y vitrina comparten clave. Va dentro del APK. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | credenciales de R2 | Subida con `aws s3 cp` al endpoint de R2. |
| `R2_APK_PUBLIC_URL` | `https://apk.adhara.fit` | Activa la autoactualización: se convierte en `ACTUALIZACIONES_URL = <url>/ota/<app>`, que viaja dentro del APK. Sin ella el workflow compila pero avisa y el APK no se autoactualiza. |
| `APK_KEYSTORE_BASE64` | el archivo `adhara.keystore` en base64 | Llave de firma fija. Sin ella cada APK se firma con una llave nueva y no se puede instalar encima. Alias `androiddebugkey`, contraseña `android`. |
| `R2_APK_BUCKET_NAME` (opcional) | `apk` | Nombre del bucket de los APK si algún día cambia. |
| `APK_PASSPHRASE` | — | **Sobra** (era del cifrado `.enc` que se quitó). Borrar. |

### Easypanel (servicio de la app web-admin)

| Variable | Valor | Para qué |
|---|---|---|
| `CHECKIN_CLAVE` | la misma clave que el secret de GitHub | web-admin valida a los TV con ella. Si cambia, los APK instalados dejan de funcionar hasta recompilarlos. |
| `CHECKIN_API_URL` | `https://app.adhara.fit` | URL pública de la propia app. |
| `R2_BUCKET_NAME` | `adhara-fit-app` | Bucket de medios. **No** poner `apk`. |
| `R2_PUBLIC_URL` | `https://media.adhara.fit` | Dominio público de los medios. |
| `R2_APK_PUBLIC_URL` | `https://apk.adhara.fit` | Solo para la pestaña Aplicaciones (enlaces y QR). |
| claves R2 | las mismas credenciales | Subida de fotos y medios. |

Relaciones en una frase: la **clave** (`CHECKIN_CLAVE`) vive en tres sitios (Easypanel, secret de GitHub y dentro de cada APK) y los tres deben coincidir; las **credenciales R2** se usan en Easypanel (bucket de medios) y en GitHub (bucket `apk`); **`R2_APK_PUBLIC_URL`** va en GitHub (para los TV) y en Easypanel (para el panel).

## 5. Flujo completo: del código al TV

1. Se ejecuta el workflow `apk` (Actions → apk → **Run workflow**; «Re-run» de una corrida vieja repite el workflow viejo y no sirve). Corre dos veces en paralelo (matriz `checkin` / `vitrina`).
2. Por app: `npm ci` → `npm run build --workspace <app>` (export estático en `apps/<app>/out`) → `npm ci` en la cáscara Capacitor → `npm run sync` (copia la interfaz a `www/`, escribe `*-config.json` con `apiUrl`, `clave` y `actualizaciones {url, versionCode}`, y `capacitor.config.json` con el plugin de autoactualización) → prepara la llave de firma → `./gradlew assembleDebug` (Java 21).
3. Versión: `versionCode` = número de corrida de GitHub (sube solo, Android exige que suba para instalar encima); `versionName` = `1.0.<corrida>`.
4. Sube al bucket `apk`: `AF-<app>.apk` + `AF-<app>.json`.
5. Si hay `R2_APK_PUBLIC_URL`: zip de `apps/<app>/out` (el workflow aborta si contiene el archivo de configuración), lo sube como `ota/<app>/<corrida>.zip` y por último `ota/<app>/latest.json`.
6. **Instalación inicial (manual, una vez por TV):** abrir `https://apk.adhara.fit/AF-<app>.apk` en el TV (o escanear el QR del panel), permitir «Instalar apps desconocidas» y abrir. El primer APK con autoactualización siempre se instala a mano. Android no permite actualizar el APK completo en silencio.
7. **Autoactualización de la interfaz:** la app, a los 15 s de abrir y luego cada 30 min, pide `ota/<app>/latest.json`. Si `versionCode` es mayor que el que corre, descarga el zip, verifica el SHA-256 (plugin `@capgo/capacitor-updater` 8.54.2, modo manual, sin la nube de Capgo), espera a que nadie toque el TV 20 s y recarga la interfaz. Si la interfaz nueva no confirma el arranque en 10 s, el plugin vuelve a la anterior; cada versión se intenta como máximo 3 veces; los bundles viejos se borran.
8. La configuración (URL y clave) no viaja en el zip: se guarda una copia en `localStorage` del WebView (`respaldo.ts`) para que la interfaz actualizada la siga encontrando.

Qué se actualiza solo y qué no:

| Cambio | ¿Se actualiza solo? |
|---|---|
| Pantallas, textos, estilos, lógica de la interfaz web | Sí (unos minutos después de ejecutar el workflow). |
| Contenido de la vitrina y frases del check-in | Sí, y ya no necesitaba el workflow (se edita en el panel). |
| Código Android (permisos, plugins, ícono, nombre, versión de Capacitor) | No: requiere un APK nuevo instalado a mano. |
| Clave `CHECKIN_CLAVE` o URL de web-admin | No: van dentro del APK; hay que recompilar y reinstalar. |

Cómo comprobar la versión: log de la corrida (imprime `1.0.<N>` y SHA-256); `https://apk.adhara.fit/ota/<app>/latest.json` (interfaz publicada); Ajustes del TV → Aplicaciones → la app (versión del APK instalado; no cambia con una actualización OTA).

## 6. Validación de datos que tocan al check-in

- DNI: 8 dígitos. CE: asumido solo dígitos, 9 a 12 (**asumido, por validar** con el formato real). El teclado del check-in admite hasta 12 caracteres.
- El socio se busca por el documento normalizado. Los socios eliminados (borrado definitivo) ya no existen para el check-in.

## 7. Estado al cierre de la sesión (2026-11-14)

Hecho y verificado (typecheck, lint, pruebas, build): paquete `packages/ota` con pruebas, integración en ambas apps, configuración de las cáscaras con pruebas, workflow ampliado, pestaña Aplicaciones con íconos, documentación.

Hecho pero **no verificado en un TV real ni de punta a punta**: la ejecución del workflow en GitHub, la subida a R2, la instalación del APK, la autoactualización (`set` del bundle y recarga), el rollback. El propietario ya creó la llave de firma, cargó los secrets (incluido `R2_APK_PUBLIC_URL`) y lanzó el workflow; **detectó algunas fallas que aún no están registradas** (se detallan al retomar; ver el prompt en `docs/ops/prompt-retomar-apps.md`).

## 8. Pendientes y riesgos conocidos

1. Detallar y corregir las fallas detectadas por el propietario en ambas apps.
2. Crear la regla de Cloudflare que bloquea todo lo que no sea `/ota/` en `apk.adhara.fit`.
3. Borrar el secret `APK_PASSPHRASE` de GitHub.
4. Probar en un TV real: instalación, numpad con Num Lock, cola sin red, WebView ≥ 111, autoactualización y rollback (listas de verificación en cada README de `apps/*-tv`).
5. Comprobar que `CapacitorHttp.get` lee `latest.json` desde `apk.adhara.fit` (se usa la capa nativa para evitar CORS) y que el SHA-256 del zip coincide con el `checksum` que acepta el plugin.
6. La autoactualización aplica el bundle apenas hay inactividad de 20 s; en la vitrina (que nadie toca) se aplicará siempre justo tras descargar.
7. Nivel 2 (aviso en pantalla cuando haga falta un APK nuevo por cambios de código Android): no implementado.
8. Los APK son de **debug** y llevan la clave: no publicarlos; con acceso físico la clave se puede extraer (riesgo aceptado por el propietario).
9. Arranque automático de la app al encender el TV: la vitrina lo intenta (permiso «Mostrar sobre otras aplicaciones»); el check-in no lo tiene.
10. Guardar `adhara.keystore` en un lugar seguro (si se pierde, desinstalar y reinstalar en todos los TV).
11. CE: confirmar el formato real (ver sección 6).

## 9. Comandos útiles

```
# Pruebas de lo propio de las apps de TV
cd packages/ota && npx vitest run --no-file-parallelism
cd apps/checkin-tv/capacitor && npm test     # y lo mismo en apps/vitrina-tv/capacitor
cd apps/checkin && npx tsc --noEmit && npx eslint . && npm run build   # y en apps/vitrina

# Regenerar íconos de los APK
node tools/generar-iconos-apk.mjs
```

Notas de entorno (Windows): `keytool` no estaba en el PATH; se usó el de `C:\Program Files\Java\jre-1.8\bin\keytool.exe` con `-storetype PKCS12`. En PowerShell, `[IO.File]::ReadAllBytes` necesita ruta absoluta. Un archivo `actualizador.ts` chocó con `Actualizador.tsx` (Windows no distingue mayúsculas): la lógica está en `autoactualizar.ts`.
