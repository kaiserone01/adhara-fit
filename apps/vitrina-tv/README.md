# Adhara Fit Vitrina para Android TV

## 1. Qué es

APK Capacitor 8 (`appId` `pe.adharafit.vitrina`, nombre "Adhara Fit Vitrina") con la app web de la vitrina empaquetada dentro. No usa `server.url` (salvo `VITRINA_DEV_URL` en desarrollo). El proyecto Capacitor está en `apps/vitrina-tv/capacitor/` (no es workspace npm); `apps/vitrina-tv/prueba/` es una página descartable para probar el TV real.

## 2. Requisitos del TV

- Android TV oficial.
- Android System WebView 111 o superior. **WebView ≥ 111; un cambio de diseño o de lógica de la app exige un APK nuevo, un cambio de contenido no.**

## 3. Compilar

GitHub Actions, workflow `apk` (`.github/workflows/apk.yml`, Actions → apk → Run workflow): compila los dos APK y sube `AF-vitrina.apk` al bucket `apk` de R2 (`https://apk.adhara.fit/AF-vitrina.apk`). La vitrina usa la misma URL de web-admin y la misma clave que el check-in (`CHECKIN_API_URL` y `CHECKIN_CLAVE` del repositorio). Secrets, llave de firma, apertura del bucket y autoactualización: `docs/ops/apk.md` y `docs/ops/apps-android-tv.md`.

Pruebas del APK de la vitrina con una página de rendimiento (`apps/vitrina-tv/prueba/`): solo en local, el workflow actual no la compila.

## 4. Instalar

Abrir `https://apk.adhara.fit/AF-vitrina.apk` en el TV (navegador o app Downloader) o escanear el QR de Configuraciones → Aplicaciones, permitir «Instalar apps desconocidas» a esa app y abrirlo. **El APK lleva la clave de la sede dentro** (también sirve para registrar check-ins): el acceso a los APK en `apk.adhara.fit` se cierra (regla de Cloudflare) salvo mientras se instala.

Por USB, o por red: `adb connect <ip>` y luego `adb install -r AF-vitrina.apk`. Como la llave de firma es fija (`APK_KEYSTORE_BASE64`), se instala encima sin desinstalar.

## 5. Arranque automático (la instalación es por enlace, sin adb)

Android 10+ solo deja abrir una app al encender el TV si tiene el permiso "Mostrar sobre otras aplicaciones". Con instalación por enlace no hay adb, así que la app lo pide sola al abrirse: muestra un aviso y abre la pantalla de ese permiso del sistema (activar "Adhara Fit Vitrina"). Si ese TV no trae la pantalla, queda el ajuste de "autoinicio" del fabricante, o fijar la app como launcher; anótalo aquí al probar cada modelo.

Con adb (solo para depurar, opcional):

```text
adb shell appops set pe.adharafit.vitrina SYSTEM_ALERT_WINDOW allow
adb shell appops set pe.adharafit.vitrina RUN_IN_BACKGROUND allow
adb shell dumpsys deviceidle whitelist +pe.adharafit.vitrina
adb shell appops get pe.adharafit.vitrina SYSTEM_ALERT_WINDOW
```

## 6. Al terminar

Desactivar la depuración USB/por red en Opciones de desarrollador y ejecutar `adb disconnect`: el APK es de debug y lleva la clave de la sede.

## 7. Rotar la clave

Cambiar `CHECKIN_CLAVE` en web-admin y en el secret `CHECKIN_CLAVE` de GitHub, ejecutar el workflow `apk` y reinstalar el APK (la clave va en el APK, no se actualiza por OTA).

## 8. Desarrollar en el TV

Para ver cambios sin recompilar el APK, preparar el proyecto con `VITRINA_DEV_URL=http://<ip-del-PC>:3002` (servidor `npm run dev` de `apps/vitrina`) antes de `npm run sync`; así el APK carga esa URL en vez del contenido empaquetado. Nunca publicar un APK compilado con `VITRINA_DEV_URL`.

## 9. Lista de verificación en el TV real

Con el panel y la vitrina apuntando al mismo web-admin (producción):

1. Acceso: el APK está en el bucket `apk`, bloqueado por Cloudflare salvo `/ota/` mientras no se instala; no hay `.apk` como artefacto de GitHub.
2. Ícono y nombre: el launcher muestra "Adhara Fit Vitrina" con el escudo; también el banner de Android TV.
3. Contenido: promo, franja de 3 entrenadores y producto con oferta + Bs se ven bien a 1080p; el video de la franja reproduce de a uno.
4. Cambios en vivo: activar, ordenar o eliminar en el panel se refleja en segundos; sustituir una pieza descarga solo la nueva y borra el archivo viejo.
5. Sin red: sin internet, apagar y encender el TV: abre solo, muestra el último contenido y respeta `inicio`/`fin`.
6. Reloj tras un corte de luz: enchufar el TV sin internet: un ítem vencido no reaparece y la tasa no cambia de estado por la hora.
7. Arranque automático: apagar y encender: la app abre sola.
8. Actualización encima: otra corrida del workflow, `adb install -r`: se conservan archivos descargados y permisos. Autoactualización de la interfaz: ver `docs/ops/apps-android-tv.md` (pendiente de probar en un TV).
9. Tasa desactualizada: con la tasa de ayer desaparece el equivalente en Bs y se mantiene el USD.
10. Depuración apagada: desactivar la depuración USB/por red y `adb disconnect`.
