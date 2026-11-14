# Prompt inicial para retomar el trabajo con las apps de Android TV

Pegar este texto al abrir la siguiente sesión:

---

Retomamos el trabajo de las aplicaciones de Android TV de Adhara Fit (Check-in y Vitrina). Antes de tocar nada:

1. Lee `handoff.md` (la entrada «Sesión 2026-11-14 (noche, 28)» y la anterior) y `docs/ops/apps-android-tv.md`, que documenta dónde está cada pieza, los dos buckets de R2 (`adhara-fit-app` para medios y `apk` para los APK y la carpeta `ota/`), los secrets de GitHub frente a las variables de Easypanel, el flujo de compilación y la autoactualización (OTA) de la interfaz. Consulta `docs/ops/apk.md` si necesitas el paso a paso de operación.
2. Respeta el `CLAUDE.md` del proyecto (modo ágil; commits en español, una línea, sin atribuciones; no tocar identidad ni credenciales; nunca generar llaves ni claves por mí; push a `main` y a la rama como avance rápido tras cada unidad verificada).

Contexto mínimo: el workflow `apk` ya se ejecutó con la llave de firma fija y los secrets cargados, y detecté **fallas** en las aplicaciones que todavía no están registradas. Te las voy a describir una por una (con capturas o registros). Para cada una: reproduce o localiza la causa en el código antes de proponer el arreglo, indica si se corrige con una actualización OTA de la interfaz (cambio en `apps/checkin`, `apps/vitrina` o `packages/ota`) o si exige un APK nuevo (cambio Android en `apps/*-tv/capacitor/android` o en la configuración), y verifica con typecheck, lint, pruebas existentes y build. Escribe pruebas nuevas solo donde un error sale caro.

Cosas que sé que están pendientes y quiero resolver o confirmar contigo:
- Regla de Cloudflare en `apk.adhara.fit` que bloquee todo lo que no sea `/ota/`.
- Probar de punta a punta la autoactualización (instalar el APK de la corrida N, publicar la N+1 con un cambio visible y comprobar que el TV la toma sola, y el rollback).
- Revisar las listas de verificación en TV real de los README de `apps/checkin-tv` y `apps/vitrina-tv`.
- Detalles de modificación de ambas apps (los iré indicando).

Empieza leyendo los documentos y dime en pocas líneas qué entendiste y qué te falta saber de las fallas; luego te las describo.

---
