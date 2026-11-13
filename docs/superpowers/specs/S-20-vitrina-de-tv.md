---
id: S-20
estado: en-revision
adrs: ADR-011, ADR-012, ADR-016, ADR-020, ADR-021, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-05, S-10, S-11, S-15, S-17, S-18, S-19, S-21, S-22, S-23
aprobada_por:
fecha_aprobacion:
---
# S-20 — Vitrina de TV: carteles en soles, administración, SSE y APK

## 0. Contexto y alcance

### 0.1 Problema
ADR-021 (alcance de la vitrina y del check-in en TV) incluyó en el alcance la vitrina: una pantalla de TV que reproduce una secuencia de carteles (entrenadores, promociones y productos) con imagen o video, administrada desde el panel y sincronizada por un manifiesto (la lista de carteles que pide la TV) y por eventos SSE (avisos que el servidor empuja a la TV). La vitrina heredada del Repo A (el repositorio base, solo de lectura) tiene cinco problemas que otras specs dejaron a S-20:
1. **Dólares y bolívares:** los precios son dólares con equivalente en bolívares calculado con una tasa (`precioUSD`, `ofertaUSD`, `mostrarEquivalenteBs`, `tasaBcv`); S-03 (dinero) y S-10 (retirar lo venezolano) retiran los dólares y los bolívares y dejan a S-20 las columnas de precio y el texto del precio.
2. **La TV ejecuta dominio:** la app `apps/vitrina` importa funciones de `@gym-app/domain` en tiempo de ejecución (formato de bolívares, insignias de precio, construcción de la secuencia por fechas y franjas, lectura del manifiesto y reloj efectivo), contra el principio «kiosco sin lógica» de ADR-021. La secuencia por fechas y franjas debe seguir funcionando sin red, así que no puede pasar al servidor sin un cambio de diseño (pregunta abierta 1).
3. **Reglas de vigencia y de bloqueo sin fijar:** S-02 (hora de Lima) guarda las fechas de calendario a las 05:00Z y hoy el `fin` de un cartel se guarda como el último milisegundo del día; y S-05 (negocio y sede únicos) mueve `vitrinaVersion` a `ConfiguracionNegocio` y advierte de un posible bloqueo mutuo (dos transacciones que se esperan entre sí) al reordenar, porque las escrituras actuales toman sus bloqueos en órdenes distintos.
4. **Subidas y límites:** las imágenes se validan por su tipo MIME declarado y no por sus bytes, los límites de contenido están repartidos entre el navegador y el servidor, y varias reglas (franjas, tiempos de la TV, latido) no tienen prueba.
5. **APK `vitrina-tv`:** trae la marca anterior (`com.adrenalina.vitrina`, «Vitrina AX»), una página de prueba con hora de Caracas, un `README` con bolívares y secretos por sede, un modo de desarrollo que relaja las reglas, y una firma que depende de un `debug.keystore` versionado en el Repo A; el CI de APK y de verificación no se importó.

S-20 deja la vitrina funcionando con las decisiones de S-03, S-05, S-10, S-11 (productos), S-18 (entrenadores), S-19 (diseño y marca) y S-23 (un solo rol administrador).

### 0.2 Dentro de alcance
- Precios de los carteles en soles: columnas `precio` y `oferta`, textos de precio, oferta y descuento armados en el servidor, y retiro de las columnas en dólares y del archivo `vitrinaBadges.ts`.
- La app `vitrina` sin importaciones de valores del dominio: sus propias copias de la secuencia, del manifiesto y del reloj efectivo, con una prueba de paridad contra el dominio.
- Formulario de cartel de producto con elección opcional de un producto activo del catálogo.
- Protocolo de bloqueo de todas las escrituras de contenido de la vitrina y versión atómica.
- Validación de imágenes por firma de bytes, límites de contenido repartidos por punto de control y fecha de fin inclusiva.
- Reglas de reproducción en la TV con constantes exportadas y pruebas.
- Origen CORS propio para las rutas de la vitrina (el WebView del APK).
- APK `vitrina-tv`: identificador, nombre, sin valores por defecto, íconos del kit, firma por secretos, workflows y README propios.
- `tools/verificar-vitrina.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- El check-in en TV y su APK: S-21 (check-in en smart-TV).
- El sistema de diseño, los tokens, la tipografía y la marca: S-19 (S-20 los consume).
- La tasa, los bolívares y los términos de la marca anterior en el resto del código: S-10 (S-20 solo vacía las exenciones de las apps de TV).
- Contratar o producir contenido (fotos, videos y textos de los carteles): lo carga el propietario desde el panel.
- Varias réplicas de `web-admin`: el emisor SSE vive en memoria y exige un solo contenedor (DI-78, SSE en memoria).
- El host de Windows `kiosk-host` y el worker de la tasa: fuera del proyecto.
- Cambiar el formato de video aceptado (H.264, lado mayor de a lo sumo 1920 y lado menor de a lo sumo 1080 píxeles).
- El límite de 5 MB de la imagen de reposo del kiosco: es del menú «Kiosko» y no de la vitrina (`apps/web-admin/app/(panel)/kiosko/actions.ts:68`).
- Borrar de R2 (el almacenamiento de objetos de Cloudflare) los archivos que quedan sin cartel tras una validación fallida.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el árbol importado de este repositorio (copia del Repo A sin adaptar, S-00 fundaciones del repositorio). Las líneas se recontarán al empezar, porque S-02, S-03, S-05, S-10, S-19, S-22 y S-23 tocan estos archivos antes que S-20.
- **Modelo:** `VitrinaItem` está en `packages/db/prisma/schema.prisma:684`; `precioUSD` y `ofertaUSD` son `Decimal(10,2)` en `:701-702`, `descuentoPct` es `Int?` en `:703`, las banderas `mostrar*` están en `:705-709` y `mostrarEquivalenteBs` en `:709` (verificado con `Read`). S-22 (capa de datos con Drizzle) reemplaza ese esquema.
- **Entidad y manifiesto:** `packages/domain/entities/Vitrina.ts:23-24` define `precioUSD` y `ofertaUSD`, `:31` `mostrarEquivalenteBs`, `:52-55` `ItemManifiesto` y `:57-64` `ManifiestoVitrina` (con `tasaBcv` en `:62`); `packages/domain/services/manifiestoVitrina.ts:6-24` define `armarManifiesto` (recibe `tasaBcv` en `:9` y excluye inactivos y vencidos en `:13`), `:26-32` `itemsDeManifiesto` y `:35-42` `urlsDeManifiesto`; la ruta `apps/web-admin/app/api/kiosco/vitrina/route.ts:25-28` pide la tasa y arma el manifiesto con `armarManifiesto`.
- **Emisor SSE:** `apps/web-admin/app/api/kiosco/vitrina/eventos/route.ts:9` fija `LATIDO_MS = 25_000`, `:34` programa el latido y `:33` envía como dato del evento `Date.now()` y no la versión; `apps/web-admin/lib/vitrinaEventos.ts:5-6` guarda el emisor en `globalThis` (un solo proceso) y `apps/web-admin/app/(panel)/vitrina/actions.ts:182` avisa a la TV después de que el repositorio resolvió.
- **La app importa dominio en ejecución:** `apps/vitrina/components/Badges.tsx:3-4` importa `formatearBs`, `descuentoMostrado` y `equivalenteBs` y `:6` formatea con una plantilla `$` más `toFixed(2)`; `apps/vitrina/components/Reproductor.tsx:6-9` importa `construirSecuencia`, `itemsDeManifiesto`, `estadoDeTasa` y `diaCalendarioCaracas`; `apps/vitrina/lib/sincronizar.ts:2` importa `urlsDeManifiesto`; `apps/vitrina/lib/useVitrina.ts:5` importa `instanteEfectivo`; `apps/vitrina/app/layout.tsx:4-5` importa `@gym-app/theming` (tema y etiqueta de estilos, sin reglas de negocio); `apps/vitrina/package.json:16-17` depende de `@gym-app/domain` y `@gym-app/theming`; `apps/vitrina/next.config.ts:8` los transpila; `apps/vitrina/eslint.config.mjs:11-13` solo prohíbe `@gym-app/infrastructure` y `@gym-app/db`. Los demás archivos importan solo tipos (`components/Cartel.tsx:2-3`, `components/Franja.tsx:6`, `components/Medio.tsx:6`, `lib/api.ts:1`, `lib/reproduccion.ts:1`).
- **Visibilidad y vigencia:** `packages/domain/services/secuenciaVitrina.ts:9-11` define `estaVencido` (vencido si `fin` es anterior a `ahora`) y `:13-16` `estaVisible`; el panel guarda `fin` con `rangoDiaCaracas(fin).fin` y `inicio` con `rangoDiaCaracas(inicio).inicio` (`apps/web-admin/app/(panel)/vitrina/actions.ts:59-60`), que es el último milisegundo y el primero del día de Caracas (`packages/domain/utils/fechaCaracas.ts:22-25`); el formulario muestra el día con `diaCalendarioCaracas` (`apps/web-admin/app/(panel)/vitrina/FormularioVitrinaItem.tsx:9,13`).
- **Franjas:** `packages/domain/services/secuenciaVitrina.ts:3` fija `MAX_ENTRENADORES_POR_FRANJA = 3`, `:29-35` define `repartirFranjas` (4 entrenadores son 2 y 2, 5 son 3 y 2, nunca una franja de 1 salvo con un solo entrenador) y `:39-70` define `construirSecuencia`; el panel usa `construirSecuencia`, `numeroDeDiapositiva` y `estadoVisibilidad` (`apps/web-admin/app/(panel)/vitrina/secuencia/page.tsx:8,22` y `FilaVitrina.tsx:6`).
- **Insignias de precio:** `packages/domain/utils/vitrinaBadges.ts:11-18` calcula el descuento con `Math.round` (`:15`) y respeta `mostrarDescuento` (`:12`); `apps/vitrina/components/Badges.tsx:15` pinta el descuento solo si es finito y mayor que 0 y `:55-59` pinta «Bs.» con el equivalente.
- **Reglas de reproducción:** `apps/vitrina/lib/sincronizar.ts:6` (omitir tras 3 fallos), `apps/vitrina/lib/reproduccion.ts:4-5` (atasco de 20 s y tope de 10 min por video), `apps/vitrina/lib/useVitrina.ts:15-20` (sondeo de 10 min, reintento de 60 s, espera de reconexión de 2 a 60 s y reloj de 15 s, todas constantes sin exportar), `:17` y `:126` (la espera vuelve a 2 s si la conexión vivió 10 s) y `apps/vitrina/lib/api.ts:5` (60 s de silencio cortan la conexión SSE) (DI-79, reglas de reproducción en TV).
- **Pruebas existentes de la app:** `apps/vitrina/lib` tiene 7 archivos de prueba: `config`, `posicionarDiapositiva`, `reproduccion`, `reproducibles`, `serializar`, `sincronizar` y `sse` (verificado con `ls apps/vitrina/lib`); ninguna prueba nombra `SONDEO_MS`, `REINTENTO_MS`, `ESPERA_MAX_MS`, `RELOJ_MS` ni `LATIDO_MS` (verificado con `grep -rn "SONDEO_MS\|LATIDO_MS\|RELOJ_MS" apps packages --include=*.test.ts`).
- **Límites de contenido:** nombre y especialidad de 60 caracteres, frase de 120 y etiqueta de 20 (`packages/domain/utils/vitrinaItem.ts:25-30`), duración entera de 3 a 300 s (`:3-4,48-50`), precio hasta 99999999.99 en dólares (`:5,35-41`), oferta no mayor que el precio (`:45-47`), fin no anterior al inicio (`:51`) y mensajes de texto, no errores con nombre (`:21-53`); imagen de la vitrina de hasta 8 MB (`packages/domain/utils/imagenSubida.ts:4`) por tipo MIME declarado y no por bytes (`:15-18`); video de hasta 100 MB, lado mayor de a lo sumo 1920 y lado menor de a lo sumo 1080 (`packages/domain/utils/videoVitrina.ts:3-5,18-21`); `PrecioInvalidoError` y `VigenciaInvalidaError` no existen (verificado con `grep -rn "PrecioInvalidoError\|VigenciaInvalidaError" apps packages`).
- **Puntos de control de la subida:** la imagen se valida y sube en `subirImagenVitrinaAction` (`apps/web-admin/app/(panel)/vitrina/actions.ts:111-128`, tipo y tamaño en `:117-118`); el video se sube directo a R2 con una URL prefirmada tras comprobar solo su tamaño declarado (`:101-108`, tope en `:104`); H.264 y dimensiones se validan en el navegador con `validarVideo` (`apps/web-admin/app/(panel)/vitrina/SelectorMedio.tsx:8,64`) y el servidor solo comprueba al guardar el tamaño real y que el tipo sea `video/mp4`, borrando el video si falla (`apps/web-admin/app/(panel)/vitrina/actions.ts:145-158`); el servidor valida el texto y la duración al guardar (`:139-140`), cuando las imágenes y el video ya están en R2; el límite de 5 MB de reposo es del kiosco (`apps/web-admin/app/(panel)/kiosko/actions.ts:68`).
- **Escrituras y bloqueos:** `packages/infrastructure/persistence/prisma/PrismaVitrinaRepository.ts:50` suma la versión con `{ increment: 1 }`; `crear` inserta el cartel y luego actualiza `Sucursal` (`:73-82`), `actualizar` y `eliminar` leen el cartel y luego actualizan `Sucursal` (`:84-102`), `mover` reescribe el orden de varios carteles y luego actualiza `Sucursal` (`:104-126`) y `guardarAjustes` solo actualiza `Sucursal` (`:140-151`); ninguna toma un orden común de bloqueos (verificado con `Read`).
- **Administración y permisos:** el panel tiene `vitrina/` con `page.tsx`, `FormularioVitrinaItem.tsx`, `SelectorMedio.tsx`, `actions.ts`, `secuencia/`, `ajustes/` y `[tipo]/`; `actions.ts:8,30-34` llama a `puedeEditarKiosko` (rol SOCIO o GERENTE, `apps/web-admin/lib/permisoKiosko.ts:2-4`), que S-23 retira; el formulario trae `precioUSD`, `ofertaUSD` y `mostrarEquivalenteBs` (`FormularioVitrinaItem.tsx:133,134,144`) y obtiene los nombres de entrenadores de `PrismaEntrenadorRepository` (`apps/web-admin/app/(panel)/vitrina/[tipo]/nuevo/page.tsx:5,20`), que S-18 reemplaza por `listarEntrenadores` (REQ-S18-033, el formulario de entrenador lee sus nombres de la lista).
- **Rutas y CORS:** `apps/web-admin/lib/kiosco.ts:15-19` responde `Access-Control-Allow-Origin: *`, `:31-39` autentica con la cabecera `X-Kiosk-Api-Key` y las dos rutas de la vitrina exportan `OPTIONS` (`apps/web-admin/app/api/kiosco/vitrina/route.ts:12-14` y `eventos/route.ts:11-13`); S-01 (baseline de seguridad) reemplaza ese CORS por la lista `KIOSCO_ORIGENES_PERMITIDOS` y la guarda `exigirKiosco`.
- **APK de la vitrina:** `apps/vitrina-tv/capacitor/scripts/configuracion.mjs:14-15` fija `com.adrenalina.vitrina` y «Vitrina AX», `:7` exige `VITRINA_API_URL` salvo con `VITRINA_DEV_URL` (`:6,21`), `:9-11` exige `https://` y `:5` deja la clave opcional; `apps/vitrina-tv/capacitor/scripts/preparar.mjs:30` no imprime la clave (muestra `***`); `apps/vitrina-tv/capacitor/scripts/configuracion.test.mjs:5-7` ya prueba que sin `VITRINA_API_URL` falla; `apps/vitrina-tv/capacitor/android/app/build.gradle:4,7` repite `com.adrenalina.vitrina`, `:19-30` firma con `debug.keystore` y contraseña fija, y `strings.xml:3-6` y `MainActivity.java:1,41` repiten el nombre y el paquete; `apps/vitrina-tv/capacitor/scripts/generar-iconos.mjs:9,12` genera los íconos desde `assets/escudo.png` con un fondo verde oscuro y `:50-56` también escribe íconos y `escudo.png` en `apps/vitrina`; `apps/vitrina-tv/prueba/index.html:27,52` muestra la hora de Caracas; `apps/vitrina-tv/README.md:1,5,20,44-47,67,68,74` trae «Vitrina AX», los secretos `VITRINA_CLAVE_<SEDE>`, `prueba/`, bolívares y tasa; `apps/vitrina-tv/capacitor/.gitignore:2-3` ya excluye `www/` y `capacitor.config.json` (verificado con `Read`).
- **CI y keystores:** `.github/workflows` solo tiene `ci.yml` y `politica.yml` (verificado con `ls .github/workflows`), porque S-00 no importó `apk-vitrina.yml` ni `verificar-vitrina.yml` (S-00 §0.2); `.gitignore:2-3` excluye `*.keystore` y `*.jks` y no hay ningún archivo keystore ni jks en `apps/vitrina-tv` (verificado con `Glob` de `apps/vitrina-tv/**/*.{keystore,jks}`).
- **Interacción con specs aprobadas:** S-03 (dinero) renombra las columnas de dinero a `numeric(12,2)`, define `dinero.ts` (`restar`, `porcentaje` con modos `half-up`, `abajo` y `arriba`, y `comparar`) y `formatearSoles` en `packages/ui/formato/soles.ts` y deja los precios de la vitrina a S-20 (S-03:19,135,613-624); S-10 retira la tasa, los bolívares y la columna `mostrarEquivalenteBs` de la vitrina (REQ-S10-004, REQ-S10-009 y REQ-S10-010) y el nombre visible sale de `ConfiguracionNegocio.nombre` (REQ-S10-021); S-05 mueve `vitrinaDuracionSeg`, `vitrinaTransicion` y `vitrinaVersion` a `ConfiguracionNegocio` (REQ-S05-020 exige el incremento atómico) y deja a S-20 el orden de las escrituras (S-05 §5.3); S-11 crea `Producto` con `costo` como precio de venta (SUP-S11-001) y `listarProductos` entrega todos los productos (S-11:38); S-19 fija `data-superficie` en `tv` para `vitrina` (REQ-S19-010), `LogoMarca` en la vitrina (REQ-S19-048) y `tokens.json`; S-01 guarda la clave del kiosco como hash, nombra las guardas `exigirSesion` y `exigirKiosco` (SUP-S01-009) y limita el CORS con `KIOSCO_ORIGENES_PERMITIDOS` (REQ-S01-021 y REQ-S01-022); S-02 fija las fechas de calendario a las 05:00:00.000Z (REQ-S02-005) y el día de Lima de 24 horas desde 1995 (REQ-S02-004); S-17 fija `IPS_PERMITIDAS` y que el kiosco y el televisor comparten la IP del gimnasio (SUP-S17-003); S-23 retira `puedeEditarKiosko` y deja `exigirSesion` como guarda única (verificado con `grep -n` en las specs).
- No verificado: el origen que presenta el WebView del APK empaquetado (se espera `https://localhost`), el comportamiento de los videos en el televisor real, los workflows `apk-vitrina.yml` y `verificar-vitrina.yml` del Repo A (no están en este árbol; solo los describe `apps/vitrina-tv/README.md:14-29`) y la API de bloqueo de filas de Drizzle (`drizzle-orm` aún no está instalado en `node_modules`).

### 0.5 Supuestos
- SUP-S20-001: `VitrinaItem.precio` y `VitrinaItem.oferta` son `numeric(12,2)` en soles (cadenas decimales en el dominio, S-03), ambos opcionales; el precio va de 0.01 a 9999.99; si hay precio y oferta, la oferta es menor que el precio (puede ser 0.00); una oferta sin precio es válida (se pinta sola). Default: ese rango; asumido, por validar.
- SUP-S20-002: el servidor arma en el manifiesto `precioTexto`, `ofertaTexto` y `descuentoTexto` (por ejemplo «S/ 12.00», «S/ 9.00» y «-25 %»); la ruta `api/kiosco/vitrina` llama a `armarManifiesto` del dominio con `formatearSoles` (S-03, hoy en `packages/ui/formato/soles.ts`, que S-19 puede mover a `packages/design-system/formato/`) como función recibida, para que el dominio no importe la interfaz; el texto es nulo si la bandera `mostrar*` correspondiente es falsa o el dato no existe; el descuento es el `descuentoPct` guardado y, si no existe, el mayor entero `p` de 0 a 100 tal que `comparar(porcentaje(precio, p, "arriba"), restar(precio, oferta))` no sea 1 (con `porcentaje` redondeando hacia arriba al céntimo, `p` por ciento del precio no supera la diferencia exacta); el descuento se redondea hacia abajo y ya no al más cercano como hoy (`vitrinaBadges.ts:15`), de modo que 87.5 por ciento se muestra «-87 %». Default: ese contrato y esa forma de calcular con las operaciones existentes de S-03, sin pedirle una operación nueva; asumido, por validar.
- SUP-S20-003: la app `vitrina` no importa del dominio nada que se ejecute: solo tipos, con `import type` y solo del archivo `entities/Vitrina`; las reglas de secuencia por fechas y franjas, de lectura del manifiesto y del reloj efectivo que la TV necesita sin red se copian a `apps/vitrina/lib/` (`secuencia.ts`, `manifiesto.ts` y `relojEfectivo.ts`), `itemsDeManifiesto`, `urlsDeManifiesto` e `instanteEfectivo` se retiran del dominio (solo las usa la TV) y la secuencia queda duplicada en el panel (`packages/domain`) y en la TV, con una prueba de paridad que sí puede importar el dominio; `@gym-app/theming` y `@gym-app/design-system` (tokens y componentes visuales, sin reglas de negocio) pueden importarse. Default: copiar a `apps/vitrina/lib`; asumido, por validar (pregunta abierta 1).
- SUP-S20-004: un cartel de producto puede crearse eligiendo un producto activo del catálogo de S-11, lo que copia su nombre y su precio de venta (`Producto.costo`) a los campos del formulario; después el cartel es independiente (no hay columna ni vínculo vivo) y se puede editar; un nombre de más de 60 caracteres no se recorta, se rechaza al guardar. Default: copiar sin vínculo ni recorte; asumido, por validar.
- SUP-S20-005: toda escritura de contenido (crear, actualizar, activar o desactivar, mover, eliminar y guardar ajustes) toma primero el bloqueo exclusivo de la fila única de `ConfiguracionNegocio` (`SELECT ... FOR UPDATE`), luego los bloqueos de las filas de `VitrinaItem` en orden ascendente de identificador, y suma 1 a `vitrinaVersion` en la misma transacción; el evento SSE se emite después de confirmar; como el evento solo lleva la hora de emisión, la TV pide el manifiesto y de él lee la versión. Default: ese protocolo; asumido, por validar (la API de Drizzle para bloquear la fila no está verificada, S-05 §5.3).
- SUP-S20-006: las imágenes se validan por la firma de sus primeros bytes (JPG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF` seguido de 4 bytes y `WEBP`) en `subirImagenVitrinaAction`, antes de subirlas a R2, además del tamaño; los videos conservan la validación del navegador (H.264 y dimensiones) y el servidor solo revisa el tamaño y el tipo `video/mp4`; los archivos ya subidos que quedan sin cartel tras una validación fallida no se borran, para que el formulario pueda reintentar. Default: ese criterio; asumido, por validar.
- SUP-S20-007: las fechas de vigencia `inicio` y `fin` de un cartel son días de calendario de Lima guardados a las 05:00:00.000Z (S-02); la vigencia incluye ambos días, de modo que un cartel está vencido desde `fin` más 24 horas (el día de Lima dura 24 horas desde 1995, S-02); hoy `fin` se guarda como el último milisegundo del día y ese cambio exige reescribir `estaVencido` en el dominio y en la copia de la TV. Default: inclusivo; asumido, por validar.
- SUP-S20-008: el APK de la vitrina sigue empaquetando la app web (sin `server.url`), por lo que su origen en el WebView se espera `https://localhost`; ese origen se acepta solo en las rutas `api/kiosco/vitrina` y `api/kiosco/vitrina/eventos` mediante la variable `VITRINA_ORIGENES_PERMITIDOS` (con el mismo formato y regla de falla cerrada que `KIOSCO_ORIGENES_PERMITIDOS` de S-01) y la autenticación sigue siendo la clave del kiosco en cabecera; S-21 (check-in en TV, en revisión) nombra la variable de S-01 `CORS_ORIGENES`, nombre por conciliar. Default: esa separación; asumido, por validar.
- SUP-S20-009: el APK `vitrina-tv` tiene el identificador `pe.adharafit.vitrina` y el nombre «Adhara Fit Vitrina»; `VITRINA_API_URL` y `VITRINA_CLAVE` no tienen valor por defecto y la preparación falla si falta alguna, salvo con `VITRINA_DEV_URL` (modo de desarrollo local que el workflow nunca define); se compila `assembleRelease` firmado con los secretos `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_CLAVE`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_CLAVE`, el mismo esquema que S-21 (SUP-S21-007), y se cifra con `APK_CLAVE` porque trae la clave; la clave de la vitrina es el secreto `VITRINA_CLAVE` (una sola sede) y el workflow se dispara a mano. Default: esos nombres y esa firma; asumido, por validar.
- SUP-S20-010: `verificar-vitrina.yml` se reinstala como un workflow de verificación que ejecuta las pruebas y el tipado de `apps/vitrina` en cada pull request que toque esa carpeta, sin secretos (`ci.yml` ya tipa `vitrina` en todo pull request, pero no corre la herramienta ni se filtra por carpeta). Default: ese workflow; asumido, por validar.
- SUP-S20-011: `web-admin` se ejecuta con una sola réplica en producción porque el emisor SSE vive en memoria; `docker-compose.prod.yml` de S-17 (operación y despliegue) no define réplicas. Default: una réplica; asumido, por validar.
- SUP-S20-012: el manifiesto trae `negocioNombre` (el nombre de `ConfiguracionNegocio`, S-05) y la TV lo conserva con el último manifiesto; en el primer arranque sin red no hay nombre y la pantalla de marca muestra solo el logotipo con nombre vacío; los ítems del manifiesto no traen `precio` ni `oferta` sin formatear. Default: ese contrato; asumido, por validar.
- SUP-S20-013: `tools/verificar-vitrina.mjs` aplica seis reglas sobre `apps/vitrina` y `apps/vitrina-tv` (salvo `node_modules`, `.next`, `out`, `generated` y las pruebas, que son los archivos `*.test.ts`, `*.test.tsx` y `*.test.mjs`): (a) importaciones de valores de `@gym-app/domain` o de otro archivo que no sea `entities/Vitrina`; (b) importaciones de `@gym-app/db` o `@gym-app/infrastructure`; (c) los términos `vitrinaBadges`, `Vitrina AX` y `debug.keystore`; (d) una plantilla de texto que antepone el símbolo de dólar a un importe (`$` seguido de `${`); (e) tamaños de texto escritos en clases (`text-[` con un número y una unidad); (f) archivos `.keystore` o `.jks` en `apps/vitrina-tv`; lee las importaciones con la API de `typescript` que S-01 declara en la raíz (sin dependencias nuevas); los demás términos (`precioUSD`, `ofertaUSD`, `mostrarEquivalenteBs`, `equivalenteBs`, `formatearBs`, `tasaBcv`, `adrenalina`) los vigilan `verificar-dinero` de S-03 y `verificar-venezuela` de S-10, de modo que S-20 no los repite. Default: esas reglas; asumido, por validar.
- SUP-S20-014: la IP pública del gimnasio, compartida por el kiosco y el televisor de la vitrina, está en `IPS_PERMITIDAS` de S-17; si la lista está activa y no la incluye, Caddy responde 403 a la TV. Default: la IP está en la lista; asumido, por validar.


## 1. Requisitos

> En esta sección un identificador `REQ-S20-nnn` se explica en su propia línea `texto`; el campo `origen` repite cada código con su descripción.

### REQ-S20-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011 (política monetaria en soles)
- texto: La tabla VitrinaItem deberá tener las columnas precio y oferta de tipo numeric(12,2), ambas opcionales, y ninguna de las columnas precioUSD y ofertaUSD.

### REQ-S20-002
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011 (política monetaria en soles)
- texto: Si el precio no es mayor que 0.00 o es mayor que 9999.99 entonces guardar un cartel deberá rechazarlo con PrecioInvalidoError sin escribir nada.

### REQ-S20-047
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011 (política monetaria en soles)
- texto: Si un cartel trae precio y la oferta no es menor que el precio entonces guardarlo deberá rechazarlo con PrecioInvalidoError sin escribir nada.

### REQ-S20-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011 (política monetaria en soles)
- texto: La ruta api/kiosco/vitrina deberá entregar en cada cartel los textos precioTexto y ofertaTexto armados con formatearSoles de S-03 (dinero) y el texto descuentoTexto con el formato «-N %».

### REQ-S20-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011 (política monetaria en soles)
- texto: El descuento de descuentoTexto deberá ser el descuentoPct guardado y, si no existe, el mayor entero de 0 a 100 cuyo porcentaje del precio, calculado con restar, porcentaje y comparar de dinero.ts, no supera la diferencia entre precio y oferta.

### REQ-S20-048
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El texto descuentoTexto deberá ser nulo cuando mostrarDescuento es falso o cuando el descuento resultante no es mayor que 0.

### REQ-S20-049
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El texto precioTexto deberá ser nulo cuando mostrarPrecio es falso o cuando el cartel no tiene precio.

### REQ-S20-050
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El texto ofertaTexto deberá ser nulo cuando mostrarOferta es falso o cuando el cartel no tiene oferta.

### REQ-S20-051
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: Los ítems del manifiesto de la vitrina no deberán traer los valores precio ni oferta sin formatear.

### REQ-S20-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: Los carteles de la TV deberán pintar los textos precioTexto, ofertaTexto y descuentoTexto del manifiesto tal como llegan, sin calcular ni formatear importes.

### REQ-S20-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: Los archivos de apps/vitrina, salvo las pruebas, deberán importar de @gym-app/domain solo con import type y solo del archivo entities/Vitrina.

### REQ-S20-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: Los archivos de apps/vitrina, salvo las pruebas, no deberán importar @gym-app/db ni @gym-app/infrastructure.

### REQ-S20-052
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El archivo apps/vitrina/lib/secuencia.ts deberá definir estaVisible, estaVencido, repartirFranjas y construirSecuencia sin importarlas de @gym-app/domain.

### REQ-S20-053
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: La construcción de la secuencia de apps/vitrina/lib/secuencia.ts deberá dar el mismo resultado que la de packages/domain/services/secuenciaVitrina.ts para los mismos carteles y el mismo instante.

### REQ-S20-054
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El archivo apps/vitrina/lib/manifiesto.ts deberá definir itemsDeManifiesto y urlsDeManifiesto, que se retiran de packages/domain/services/manifiestoVitrina.ts.

### REQ-S20-055
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El archivo apps/vitrina/lib/relojEfectivo.ts deberá definir instanteEfectivo, que se retira de packages/domain/utils/relojEfectivo.ts.

### REQ-S20-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011 (política monetaria en soles)
- texto: El archivo packages/domain/utils/vitrinaBadges.ts no deberá existir.

### REQ-S20-056
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011 (política monetaria en soles)
- texto: Los archivos de apps/vitrina no deberán contener una plantilla de texto que anteponga el símbolo de dólar a un importe.

### REQ-S20-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El formulario de cartel de producto deberá ofrecer solo los productos con activo verdadero que entrega listarProductos de S-11 (productos).

### REQ-S20-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: Elegir un producto en el formulario de cartel deberá copiar su nombre y su precio de venta (Producto.costo) a los campos del cartel.

### REQ-S20-058
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: La tabla VitrinaItem no deberá tener ninguna columna que referencie a Producto.

### REQ-S20-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: Toda escritura de contenido de la vitrina (crear, actualizar, activar o desactivar, mover, eliminar y guardar ajustes) deberá tomar como primer bloqueo el de la fila de ConfiguracionNegocio dentro de su transacción.

### REQ-S20-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: Toda escritura de contenido que modifique varias filas de VitrinaItem deberá tomar sus bloqueos en orden ascendente de identificador, después del bloqueo de ConfiguracionNegocio.

### REQ-S20-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: Toda escritura de contenido de la vitrina deberá sumar 1 a vitrinaVersion en la misma transacción que escribe el contenido.

### REQ-S20-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: Las acciones de administración de la vitrina deberán emitir el evento SSE vitrina:cambio solo después de confirmarse la transacción de la escritura.

### REQ-S20-016
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: Si la transacción de una escritura de contenido falla entonces el sistema deberá dejar vitrinaVersion y los carteles como estaban y no emitir ningún evento.

### REQ-S20-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: La acción subirImagenVitrinaAction deberá rechazar, antes de subirlo a R2, un archivo cuyos primeros bytes no sean la firma de JPG, PNG o WebP.

### REQ-S20-018
- tipo: ubicuo
- prioridad: MUST
- origen: DI-77 (límites de contenido de la vitrina)
- texto: El guardado de un cartel deberá rechazar un nombre o una especialidad de más de 60 caracteres.

### REQ-S20-059
- tipo: ubicuo
- prioridad: MUST
- origen: DI-77 (límites de contenido de la vitrina)
- texto: El guardado de un cartel deberá rechazar una frase de más de 120 caracteres.

### REQ-S20-060
- tipo: ubicuo
- prioridad: MUST
- origen: DI-77 (límites de contenido de la vitrina)
- texto: El guardado de un cartel deberá rechazar una etiqueta de más de 20 caracteres.

### REQ-S20-061
- tipo: ubicuo
- prioridad: MUST
- origen: DI-77 (límites de contenido de la vitrina)
- texto: El guardado de un cartel deberá rechazar una duración que no sea un entero de 3 a 300 segundos.

### REQ-S20-019
- tipo: si-entonces
- prioridad: MUST
- origen: DI-77 (límites de contenido de la vitrina)
- texto: Si un cartel excede el límite de texto o de duración entonces guardarItemAction deberá rechazarlo con un mensaje que nombre el límite y sin escribir en la base de datos.

### REQ-S20-062
- tipo: ubicuo
- prioridad: MUST
- origen: DI-77 (límites de contenido de la vitrina)
- texto: La acción subirImagenVitrinaAction deberá rechazar una imagen de más de 8 MB (8 388 608 bytes) con un mensaje que nombre el límite antes de subirla a R2.

### REQ-S20-063
- tipo: ubicuo
- prioridad: MUST
- origen: DI-77 (límites de contenido de la vitrina)
- texto: El sistema deberá rechazar con un mensaje que nombre el límite un video de más de 100 MB (104 857 600 bytes), tanto al preparar su subida como al guardar el cartel con el tamaño real del archivo.

### REQ-S20-064
- tipo: ubicuo
- prioridad: MUST
- origen: DI-77 (límites de contenido de la vitrina)
- texto: El navegador del panel deberá validar cada video con validarVideo: códec H.264, lado mayor de a lo sumo 1920 píxeles y lado menor de a lo sumo 1080 píxeles.

### REQ-S20-065
- tipo: ubicuo
- prioridad: MUST
- origen: DI-77 (límites de contenido de la vitrina)
- texto: La función construirSecuencia deberá agrupar los entrenadores visibles consecutivos en franjas de a lo sumo 3.

### REQ-S20-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina: hereda la vigencia por fechas) y S-02 (hora de Lima)
- texto: Las fechas de inicio y de fin de un cartel deberán guardarse como fecha de calendario de Lima, es decir el instante 05:00:00.000Z de ese día.

### REQ-S20-066
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina: hereda la vigencia por fechas) y S-02 (hora de Lima)
- texto: La función estaVencido del dominio deberá considerar vencido un cartel desde el instante de su fecha de fin más 24 horas, de modo que la vigencia incluya el día de fin completo.

### REQ-S20-021
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina: hereda la vigencia por fechas) y S-02 (hora de Lima)
- texto: Si la fecha de fin es anterior a la de inicio entonces guardar el cartel deberá rechazarlo con VigenciaInvalidaError sin escribir nada.

### REQ-S20-022
- tipo: ubicuo
- prioridad: MUST
- origen: DI-79 (reglas de reproducción en TV)
- texto: La TV deberá omitir una pieza con 3 fallos de descarga seguidos y adoptar el manifiesto sin ella.

### REQ-S20-067
- tipo: ubicuo
- prioridad: MUST
- origen: DI-79 (reglas de reproducción en TV)
- texto: La TV deberá saltar un video cuyo tiempo de reproducción no avanza durante 20 segundos.

### REQ-S20-068
- tipo: ubicuo
- prioridad: MUST
- origen: DI-79 (reglas de reproducción en TV)
- texto: La TV deberá limitar cada video a 10 minutos de reproducción.

### REQ-S20-023
- tipo: ubicuo
- prioridad: MUST
- origen: DI-79 (reglas de reproducción en TV)
- texto: La TV deberá volver a pedir el manifiesto completo cada 10 minutos.

### REQ-S20-069
- tipo: ubicuo
- prioridad: MUST
- origen: DI-79 (reglas de reproducción en TV)
- texto: La TV deberá reintentar la sincronización 60 segundos después de una sincronización incompleta o fallida.

### REQ-S20-070
- tipo: ubicuo
- prioridad: MUST
- origen: DI-79 (reglas de reproducción en TV)
- texto: La TV deberá reconectar el flujo SSE con una espera que se duplica desde 2 segundos hasta un tope de 60 segundos.

### REQ-S20-024
- tipo: ubicuo
- prioridad: MUST
- origen: DI-79 (reglas de reproducción en TV)
- texto: La TV deberá recalcular su instante efectivo cada 15 segundos como el mayor entre el reloj del dispositivo y el último servidorAhora recibido.

### REQ-S20-025
- tipo: ubicuo
- prioridad: MUST
- origen: DI-78 (SSE con latido de 25 s y emisor en memoria)
- texto: El emisor SSE deberá enviar un latido cada 25 segundos.

### REQ-S20-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: Las rutas api/kiosco/vitrina y api/kiosco/vitrina/eventos deberán llamar a exigirKiosco de S-01 (guarda de la clave del kiosco) antes de leer datos.

### REQ-S20-027
- tipo: cuando
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: Cuando una petición a las rutas de la vitrina trae un Origin que figura en VITRINA_ORIGENES_PERMITIDOS, el sistema deberá responder con Access-Control-Allow-Origin igual a ese Origin y con Vary: Origin.

### REQ-S20-028
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: Si el Origin de una petición a las rutas de la vitrina no figura en VITRINA_ORIGENES_PERMITIDOS ni en KIOSCO_ORIGENES_PERMITIDOS entonces el sistema deberá omitir todas las cabeceras Access-Control-*.

### REQ-S20-071
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: Los orígenes de VITRINA_ORIGENES_PERMITIDOS no deberán aceptarse en las rutas api/checkin ni api/kiosco/estado.

### REQ-S20-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El archivo docker-compose.prod.yml de S-17 (operación y despliegue) no deberá definir deploy.replicas mayor que 1 ni scale para el servicio web-admin.

### REQ-S20-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020 (sistema de diseño y rebranding)
- texto: Los componentes de apps/vitrina deberán tomar los tamaños de texto de los tokens de tipografía de la superficie tv de S-19 (diseño y marca) y no de clases con tamaños escritos.

### REQ-S20-057
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020 (sistema de diseño y rebranding)
- texto: El manifiesto de la vitrina deberá traer negocioNombre con el nombre de ConfiguracionNegocio.

### REQ-S20-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020 (sistema de diseño y rebranding)
- texto: La pantalla de marca de la vitrina deberá pasar a LogoMarca de S-19 el negocioNombre del último manifiesto recibido.

### REQ-S20-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El APK vitrina-tv deberá tener el identificador pe.adharafit.vitrina como appId de Capacitor, como applicationId, como namespace de Gradle y como paquete de sus clases Java.

### REQ-S20-072
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El APK vitrina-tv deberá mostrar el nombre «Adhara Fit Vitrina» en capacitor.config.json, en strings.xml y en el aviso de MainActivity.

### REQ-S20-033
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: Si falta VITRINA_API_URL y no hay VITRINA_DEV_URL entonces la preparación del APK deberá terminar con error sin generar archivos.

### REQ-S20-073
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: Si falta VITRINA_CLAVE y no hay VITRINA_DEV_URL entonces la preparación del APK deberá terminar con error sin generar archivos.

### REQ-S20-034
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: La preparación del APK no deberá imprimir la clave de la vitrina.

### REQ-S20-074
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: El archivo www/vitrina-config.json, que contiene la clave de la vitrina, deberá estar excluido de Git por el .gitignore de apps/vitrina-tv/capacitor.

### REQ-S20-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020 (sistema de diseño y rebranding)
- texto: El script generar-iconos.mjs deberá generar los íconos y la pantalla de arranque del APK desde el isotipo de packages/design-system/marca (el kit de Adhara Fit de S-19).

### REQ-S20-075
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020 (sistema de diseño y rebranding)
- texto: El fondo de los íconos y de la pantalla de arranque del APK deberá ser el color ground de tokens.json.

### REQ-S20-076
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020 (sistema de diseño y rebranding)
- texto: El archivo apps/vitrina-tv/capacitor/assets/escudo.png no deberá existir.

### REQ-S20-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: El archivo build.gradle de vitrina-tv deberá leer el archivo del keystore, su contraseña, el alias y la clave del alias de variables de entorno.

### REQ-S20-077
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: La carpeta apps/vitrina-tv no deberá contener ningún archivo con extensión keystore ni jks.

### REQ-S20-037
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: Si falta alguno de los secretos ANDROID_KEYSTORE_B64, ANDROID_KEYSTORE_CLAVE, ANDROID_KEY_ALIAS, ANDROID_KEY_CLAVE, APK_CLAVE o VITRINA_CLAVE entonces el workflow apk-vitrina.yml deberá fallar antes de compilar.

### REQ-S20-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: El workflow apk-vitrina.yml deberá dispararse solo con workflow_dispatch.

### REQ-S20-078
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: El workflow apk-vitrina.yml deberá cifrar el APK con APK_CLAVE antes de subirlo como artefacto.

### REQ-S20-079
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: El workflow apk-vitrina.yml no deberá aceptar la clave de la vitrina como entrada de workflow_dispatch.

### REQ-S20-080
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: El workflow apk-vitrina.yml no deberá definir la variable VITRINA_DEV_URL.

### REQ-S20-081
- tipo: si-entonces
- prioridad: MUST
- origen: DI-81 (APK cifrado y verificado en el workflow)
- texto: Si el applicationId del APK compilado no es pe.adharafit.vitrina entonces el workflow apk-vitrina.yml deberá fallar antes de cifrar el APK.

### REQ-S20-039
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: El workflow verificar-vitrina.yml deberá ejecutar el tipado y las pruebas de apps/vitrina en cada pull request que modifique esa carpeta, sin usar secretos.

### REQ-S20-040
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El README de apps/vitrina-tv deberá describir el APK «Adhara Fit Vitrina», sus secretos de firma, APK_CLAVE, VITRINA_CLAVE y su instalación.

### REQ-S20-082
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: El README de apps/vitrina-tv no deberá contener los términos Vitrina AX, VITRINA_CLAVE_, prueba/index.html, Bs ni Tasa.

### REQ-S20-041
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021 (alcance de la vitrina y del check-in en TV)
- texto: La carpeta apps/vitrina-tv no deberá contener el archivo prueba/index.html.

### REQ-S20-042
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012 (baseline de seguridad)
- texto: Las acciones y las páginas de administración de la vitrina deberán llamar a exigirSesion de S-01 (guarda de sesión, que S-23 deja como guarda única) antes de leer o escribir datos.

### REQ-S20-043
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: Los archivos de apps y packages, salvo node_modules, .next, out, generated y las pruebas, no deberán contener los términos vitrinaBadges, Vitrina AX ni debug.keystore.

### REQ-S20-044
- tipo: cuando
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: Cuando tools/verificar-vitrina.mjs encuentra una coincidencia de alguna de sus seis reglas, deberá terminar con código distinto de cero.

### REQ-S20-045
- tipo: cuando
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: Cuando tools/verificar-vitrina.mjs encuentra una coincidencia, deberá nombrar el archivo, la línea y la regla o el término.

### REQ-S20-046
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: El CI deberá ejecutar tools/verificar-vitrina.mjs en cada pull request.

### REQ-S20-083
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016 (estrategia de pruebas)
- texto: Al terminar S-20, las listas de exenciones de verificar-fechas (S-02), verificar-dinero (S-03), verificar-venezuela (S-10) y verificar-diseno (S-19) no deberán contener ninguna entrada de apps/vitrina ni de apps/vitrina-tv.

## 2. Comportamiento

### BEH-S20-001
- cubre: REQ-S20-001, REQ-S20-002, REQ-S20-047
- categoria: borde
- dado: una base migrada y carteles con precio «0.00», «0.01», «9999.99» y «10000.00», y carteles con precio «10.00» y oferta «10.00», «10.01», «9.99» y «0.00»
- cuando: se guarda cada cartel
- entonces: se aceptan los precios «0.01» y «9999.99» y las ofertas «9.99» y «0.00»; se rechazan los precios «0.00» y «10000.00» y las ofertas «10.00» y «10.01» con PrecioInvalidoError sin escribir; las columnas son precio y oferta de numeric(12,2) y no existen precioUSD ni ofertaUSD

### BEH-S20-002
- cubre: REQ-S20-003, REQ-S20-004, REQ-S20-048, REQ-S20-049, REQ-S20-050, REQ-S20-051
- categoria: feliz
- dado: un cartel A con precio «12.00» y oferta «9.00» sin descuentoPct, uno B con precio «8.00» y oferta «1.00», uno C con precio «12.00», oferta «9.00» y descuentoPct 30, uno D con descuentoPct 0 y sin oferta, y otros tres con mostrarPrecio falso, mostrarOferta falso y mostrarDescuento falso respectivamente
- cuando: se arma el manifiesto con formatearSoles
- entonces: A trae «S/ 12.00», «S/ 9.00» y «-25 %»; B trae «-87 %» (87.5 redondeado hacia abajo, y el redondeo anterior daba 88); C trae «-30 %»; D trae descuentoTexto nulo; precioTexto, ofertaTexto y descuentoTexto son nulos en los tres con la bandera falsa; ningún ítem trae precio ni oferta sin formatear

### BEH-S20-003
- cubre: REQ-S20-006, REQ-S20-009
- categoria: feliz
- dado: Cartel y Badges con un ítem de precioTexto «S/ 12.00», ofertaTexto «S/ 9.00», descuentoTexto «-25 %» y etiqueta «NUEVO»
- cuando: se renderizan con react-dom/server y se buscan cálculos de importes en apps/vitrina/components
- entonces: el resultado trae los cuatro textos sin cambios, ningún archivo de components contiene toFixed, Math.round, Math.floor, Intl.NumberFormat ni formatearSoles, y packages/domain/utils/vitrinaBadges.ts no existe

### BEH-S20-004
- cubre: REQ-S20-007, REQ-S20-008, REQ-S20-056
- categoria: error
- dado: seis archivos de apps/vitrina: uno con import de una función de dominio, uno con import type de entities/Vitrina, uno con import type de utils/estadoTasa, uno con import de @gym-app/infrastructure, uno con una plantilla de dólar con toFixed y una prueba con import de una función de dominio
- cuando: se ejecuta tools/verificar-vitrina.mjs
- entonces: falla con el primero, el tercero, el cuarto y el quinto nombrando archivo y línea, y acepta el segundo y la prueba

### BEH-S20-005
- cubre: REQ-S20-052, REQ-S20-053, REQ-S20-054, REQ-S20-055, REQ-S20-065
- categoria: feliz
- dado: 100 conjuntos de carteles generados con semilla fija (activos e inactivos, con y sin inicio y fin, de entrenador, promoción y producto) y un instante por conjunto, y 1, 2, 3, 4, 5 y 7 entrenadores consecutivos
- cuando: se construye la secuencia con apps/vitrina/lib/secuencia.ts y con packages/domain/services/secuenciaVitrina.ts
- entonces: ambas devuelven las mismas diapositivas (clave, tipo y duración), las franjas son de 1 a 3 entrenadores (4 son 2 y 2, 5 son 3 y 2, 7 son 3, 2 y 2), y itemsDeManifiesto, urlsDeManifiesto e instanteEfectivo de apps/vitrina/lib dan los mismos resultados que las pruebas heredadas del dominio

### BEH-S20-006
- cubre: REQ-S20-010, REQ-S20-011, REQ-S20-058
- categoria: feliz
- dado: el producto activo «Agua 600 ml» con precio de venta «2.50» y un producto desactivado
- cuando: el administrador crea un cartel de producto, elige el producto, guarda, y luego el precio del producto cambia a «3.00»
- entonces: solo el producto activo se ofrece; el formulario copia «Agua 600 ml» y «2.50»; el cartel guardado conserva «2.50» tras el cambio del producto y VitrinaItem no tiene ninguna columna que referencie a Producto

### BEH-S20-007
- cubre: REQ-S20-011, REQ-S20-018, REQ-S20-019
- categoria: error
- dado: un producto activo cuyo nombre tiene 61 caracteres
- cuando: el administrador elige el producto y guarda el cartel sin editar el nombre
- entonces: el formulario muestra el nombre completo sin recortarlo, guardar se rechaza con un mensaje que nombra el límite de 60 caracteres sin escribir en la base de datos y, tras recortarlo a 60 caracteres, se guarda

### BEH-S20-008
- cubre: REQ-S20-012, REQ-S20-013, REQ-S20-014, REQ-S20-015
- categoria: feliz
- dado: cinco carteles y vitrinaVersion 7, con un registro de las sentencias de la transacción y de las llamadas del emisor SSE
- cuando: el administrador sube un cartel del puesto 4 al 3
- entonces: la transacción toma primero el bloqueo de ConfiguracionNegocio y luego los de los carteles afectados en orden ascendente de identificador, vitrinaVersion queda en 8, el evento vitrina:cambio sale después de confirmar y el manifiesto pedido tras el evento trae version 8 y el nuevo orden

### BEH-S20-009
- cubre: REQ-S20-012, REQ-S20-013, REQ-S20-014
- categoria: concurrencia
- dado: tres pares de escrituras detenidas en una barrera: dos movimientos que reordenan los mismos carteles en sentidos opuestos, un movimiento y una edición del mismo cartel, y un alta y un movimiento
- cuando: se liberan a la vez
- entonces: ninguna escritura termina en bloqueo mutuo (error de deadlock), todas se confirman en serie, vitrinaVersion sube exactamente en el número de escrituras confirmadas y el orden final es consistente con la última

### BEH-S20-010
- cubre: REQ-S20-016
- categoria: error
- dado: una escritura de contenido cuya transacción falla en su segunda sentencia (un cliente de base de datos de prueba que lanza un error en esa sentencia) y un emisor SSE de prueba
- cuando: termina
- entonces: no se llama al emisor, vitrinaVersion no cambia y los carteles quedan como estaban

### BEH-S20-011
- cubre: REQ-S20-017, REQ-S20-062, REQ-S20-063, REQ-S20-064
- categoria: error
- dado: un PDF con extensión .jpg, imágenes JPG, PNG y WebP válidas, una imagen válida de 8 388 608 bytes y otra de 8 388 609 bytes, un video declarado de 104 857 600 bytes y otro de 104 857 601, un video guardado que al inspeccionarse pesa más de 100 MB, y videos de 1920x1080, 1921x1080 y 1920x1081 y uno HEVC, con un almacenamiento R2 de prueba que cuenta las subidas
- cuando: se sube cada imagen, se prepara cada video y se valida cada video en el navegador
- entonces: el PDF y los excesos se rechazan con un mensaje que nombra el límite y con 0 subidas a R2, las imágenes con firma válida y los tamaños en el límite exacto se aceptan, el video guardado que excede se rechaza y se borra si ningún cartel lo usa, y validarVideo acepta 1920x1080 y rechaza 1921x1080, 1920x1081 y el HEVC

### BEH-S20-012
- cubre: REQ-S20-018, REQ-S20-059, REQ-S20-060, REQ-S20-061, REQ-S20-019
- categoria: borde
- dado: carteles con nombre y especialidad de 60 y 61 caracteres, frase de 120 y 121, etiqueta de 20 y 21 y duración de 2, 3, 300 y 301 segundos
- cuando: se guarda cada cartel
- entonces: se aceptan los de 60, 120 y 20 caracteres y las duraciones de 3 y 300; se rechazan los de 61, 121 y 21 y las duraciones de 2 y 301 con un mensaje que nombra el límite y sin escribir

### BEH-S20-013
- cubre: REQ-S20-020, REQ-S20-066, REQ-S20-021
- categoria: borde
- dado: un cartel con inicio el 2026-11-12 y fin el 2026-11-14 guardados como fecha de calendario de Lima, y otro con fin anterior al inicio
- cuando: se evalúa si está vencido y se arma el manifiesto en 2026-11-12T04:59:59.999Z, 2026-11-12T05:00:00.000Z, 2026-11-15T04:59:59.999Z y 2026-11-15T05:00:00.000Z, y se guarda el segundo
- entonces: las fechas se guardan a las 05:00:00.000Z, el primero aún no está visible en la primera hora, visible en la segunda y la tercera y vencido y fuera del manifiesto en la cuarta, y el segundo se rechaza con VigenciaInvalidaError sin escribir

### BEH-S20-014
- cubre: REQ-S20-022, REQ-S20-067, REQ-S20-068
- categoria: feliz
- dado: una pieza que falla en 3 sincronizaciones seguidas, un video cuyo tiempo no avanza y un video que sigue avanzando, con temporizadores simulados
- cuando: se ejecutan las pruebas de sincronizar y de reproduccion con las constantes exportadas
- entonces: tras el tercer fallo el manifiesto se adopta sin la pieza, el video sin avance se salta a los 20 segundos (a los 19 999 ms sigue) y el video que avanza se corta a los 10 minutos

### BEH-S20-015
- cubre: REQ-S20-023, REQ-S20-069, REQ-S20-070
- categoria: feliz
- dado: las constantes de tiempo exportadas de apps/vitrina/lib/tiempos.ts y la función siguienteEspera, con temporizadores simulados
- cuando: se leen los intervalos y se calculan las esperas de reconexión sucesivas
- entonces: el sondeo es de 600 000 ms, el reintento de 60 000 ms y las esperas son 2, 4, 8, 16, 32 y 60 segundos y siguen en 60 segundos

### BEH-S20-016
- cubre: REQ-S20-024
- categoria: borde
- dado: un reloj de dispositivo atrasado a 2020-01-01T00:00:00Z y un servidorAhora guardado de 2026-11-12T15:00:00Z, con temporizadores simulados
- cuando: pasan 15 segundos
- entonces: el instante efectivo se recalcula a los 15 segundos y nunca es anterior al servidorAhora guardado

### BEH-S20-017
- cubre: REQ-S20-025
- categoria: feliz
- dado: una conexión abierta al flujo SSE de la vitrina con temporizadores simulados
- cuando: pasan 24 999 y 25 000 milisegundos
- entonces: el latido «: latido» llega a los 25 000 y no a los 24 999

### BEH-S20-018
- cubre: REQ-S20-026
- categoria: error
- dado: peticiones a api/kiosco/vitrina y a api/kiosco/vitrina/eventos sin clave, con una clave inválida y con una válida, y un contador de lecturas de la base de datos
- cuando: se envía cada una
- entonces: sin clave responde 401 con «Falta el header X-Kiosk-Api-Key.» y con clave inválida 401 con «API key de sucursal inválida.», las dos con 0 lecturas de datos, y la válida recibe el manifiesto y el flujo SSE

### BEH-S20-019
- cubre: REQ-S20-027, REQ-S20-028, REQ-S20-071
- categoria: borde
- dado: KIOSCO_ORIGENES_PERMITIDOS con el origen del kiosco y VITRINA_ORIGENES_PERMITIDOS con https://localhost, y luego esta última vacía
- cuando: se piden GET y OPTIONS del manifiesto y de los eventos, y api/checkin y api/kiosco/estado, con el origen https://localhost, con el del kiosco y con otro origen
- entonces: con la variable llena https://localhost recibe su Origin en Access-Control-Allow-Origin y Vary: Origin solo en las dos rutas de la vitrina; en api/checkin y api/kiosco/estado no recibe cabeceras Access-Control-*; con la variable vacía no las recibe en ninguna ruta; el origen del kiosco las recibe en todas y otro origen en ninguna

### BEH-S20-020
- cubre: REQ-S20-029
- categoria: feliz
- dado: docker-compose.prod.yml
- cuando: se leen deploy.replicas y scale del servicio web-admin
- entonces: no hay ninguno de los dos o deploy.replicas vale 1

### BEH-S20-021
- cubre: REQ-S20-030, REQ-S20-057, REQ-S20-031
- categoria: feliz
- dado: ConfiguracionNegocio.nombre «Adhara Fit», el manifiesto de la vitrina y la pantalla de marca renderizada con y sin manifiesto
- cuando: se pide el manifiesto, se renderiza la pantalla de marca y se busca texto de tamaño escrito en los componentes
- entonces: el manifiesto trae negocioNombre «Adhara Fit», LogoMarca recibe «Adhara Fit» con manifiesto y un nombre vacío sin él, ningún componente trae clases text-[ con tamaño escrito y tools/verificar-diseno.mjs de S-19 no encuentra colores ni fuentes escritos en apps/vitrina

### BEH-S20-022
- cubre: REQ-S20-033, REQ-S20-073, REQ-S20-034, REQ-S20-074
- categoria: error
- dado: la preparación del APK sin VITRINA_API_URL, sin VITRINA_CLAVE, con ambas y con VITRINA_DEV_URL
- cuando: se ejecuta cada una capturando la salida y los archivos
- entonces: las dos primeras terminan con error sin generar archivos, con ambas se genera la configuración y la clave no sale en la salida, con VITRINA_DEV_URL no se exige la clave, y apps/vitrina-tv/capacitor/.gitignore excluye www/

### BEH-S20-023
- cubre: REQ-S20-032, REQ-S20-072, REQ-S20-035, REQ-S20-075, REQ-S20-076, REQ-S20-041, REQ-S20-040, REQ-S20-082
- categoria: feliz
- dado: la carpeta apps/vitrina-tv con la preparación hecha con ambas variables
- cuando: se leen capacitor.config.json, strings.xml, build.gradle, los paquetes Java, generar-iconos.mjs, el color de fondo de los íconos, el README y la lista de archivos
- entonces: el appId, el applicationId, el namespace y el paquete son pe.adharafit.vitrina, el nombre es «Adhara Fit Vitrina», los íconos salen del isotipo del kit, el fondo coincide con el color ground de tokens.json, no existen assets/escudo.png ni prueba/index.html y el README describe el APK, los secretos y la instalación sin Vitrina AX, VITRINA_CLAVE_, prueba/index.html, Bs ni Tasa

### BEH-S20-024
- cubre: REQ-S20-036, REQ-S20-077
- categoria: error
- dado: el repositorio y build.gradle de vitrina-tv, con y sin las variables de firma
- cuando: se buscan archivos keystore y jks y se compila la lectura de la firma
- entonces: no hay ningún keystore ni jks en apps/vitrina-tv y build.gradle lee archivo, contraseña, alias y clave de variables de entorno y falla si faltan

### BEH-S20-025
- cubre: REQ-S20-037, REQ-S20-038, REQ-S20-078, REQ-S20-079, REQ-S20-080, REQ-S20-081
- categoria: error
- dado: apk-vitrina.yml analizado con un lector de YAML
- cuando: se revisan los disparadores, las entradas, las variables y los pasos
- entonces: solo se dispara con workflow_dispatch, no tiene una entrada para la clave ni define VITRINA_DEV_URL, verifica los seis secretos antes de compilar, falla si el applicationId del APK no es pe.adharafit.vitrina y cifra el APK con APK_CLAVE antes de subirlo

### BEH-S20-026
- cubre: REQ-S20-039
- categoria: feliz
- dado: verificar-vitrina.yml analizado con un lector de YAML
- cuando: se revisan sus disparadores, sus pasos y sus secretos
- entonces: se dispara en pull requests que modifican apps/vitrina, ejecuta el tipado y las pruebas y no usa secretos

### BEH-S20-027
- cubre: REQ-S20-042
- categoria: error
- dado: peticiones sin sesión, con sesión vencida y de un administrador desactivado
- cuando: llegan a cada acción y a cada página de administración de la vitrina, con un contador de lecturas
- entonces: todas se rechazan antes de leer o escribir datos, con 0 lecturas

### BEH-S20-028
- cubre: REQ-S20-043, REQ-S20-044, REQ-S20-045
- categoria: error
- dado: un archivo de prueba por cada término vitrinaBadges, Vitrina AX y debug.keystore, y otro por cada una de las otras tres reglas
- cuando: se ejecuta tools/verificar-vitrina.mjs
- entonces: termina con código distinto de cero y nombra archivo, línea y regla o término de cada una, y con un árbol limpio termina con código 0

### BEH-S20-029
- cubre: REQ-S20-046
- categoria: error
- dado: un pull request que agrega vitrinaBadges en un archivo de apps/vitrina
- cuando: corre el CI
- entonces: el paso de tools/verificar-vitrina.mjs falla y queda en rojo

### BEH-S20-030
- cubre: REQ-S20-083
- categoria: feliz
- dado: las listas de exenciones de verificar-fechas, verificar-dinero, verificar-venezuela y verificar-diseno en el árbol final
- cuando: se buscan entradas de apps/vitrina y de apps/vitrina-tv
- entonces: no hay ninguna

## 3. Invariantes

### INV-S20-001
- propiedad: el manifiesto nunca trae importes sin formatear ni bolívares, y todo texto de precio u oferta empieza con «S/ »
- mecanismo: test-propiedad
- deteccion: sobre 100 carteles generados con un generador congruencial lineal de semilla fija escrito en la prueba (precios, ofertas y descuentos válidos), el manifiesto no contiene las claves precio, oferta ni tasa ni «Bs» y cada precioTexto y ofertaTexto coincide con formatearSoles del valor
- protege: REQ-S20-003, REQ-S20-004, REQ-S20-048, REQ-S20-049, REQ-S20-050, REQ-S20-051

### INV-S20-002
- propiedad: vitrinaVersion crece en 1 por cada escritura de contenido confirmada (crear, actualizar, activar o desactivar, mover, eliminar y guardar ajustes) y solo por ellas, sin bloqueo mutuo
- mecanismo: transaccion
- deteccion: sobre 50 secuencias de escrituras correctas, fallidas y simultáneas con barrera generadas con semilla fija, la versión final es igual a la inicial más la cantidad de escrituras confirmadas y ninguna termina en error de bloqueo mutuo
- protege: REQ-S20-012, REQ-S20-013, REQ-S20-014, REQ-S20-015, REQ-S20-016

### INV-S20-003
- propiedad: la app vitrina no ejecuta código de dominio ni de base de datos
- mecanismo: lint
- deteccion: tools/verificar-vitrina.mjs termina con código distinto de cero si encuentra en apps/vitrina una importación de valores de dominio, o de un archivo de dominio distinto de entities/Vitrina, o de base de datos o infraestructura
- protege: REQ-S20-007, REQ-S20-008, REQ-S20-052, REQ-S20-054, REQ-S20-055

### INV-S20-004
- propiedad: los términos del cliente anterior y de los dólares en la vitrina no aparecen y no hay claves de firma versionadas
- mecanismo: lint
- deteccion: tools/verificar-vitrina.mjs termina con código distinto de cero y lista archivo:línea y término, y falla si encuentra un archivo keystore o jks en apps/vitrina-tv
- protege: REQ-S20-043, REQ-S20-044, REQ-S20-045, REQ-S20-077

### INV-S20-005
- propiedad: la secuencia y la vigencia de la TV son las mismas que las del dominio para cualquier conjunto de carteles
- mecanismo: test-propiedad
- deteccion: sobre 100 conjuntos de carteles y de instantes generados con semilla fija, incluidos los bordes 04:59:59.999Z y 05:00:00.000Z de cada fecha, apps/vitrina/lib/secuencia.ts y packages/domain/services/secuenciaVitrina.ts devuelven las mismas diapositivas y la misma respuesta de estaVencido
- protege: REQ-S20-053, REQ-S20-065, REQ-S20-066

## 4. Criterios de aceptación

### AC-S20-001
- enlaza: REQ-S20-001, REQ-S20-002, REQ-S20-047, BEH-S20-001
- metodo: integracion
- procedimiento: con una base efímera, guardar los carteles del escenario enlazado y leer las columnas de VitrinaItem
- esperado: se aceptan y rechazan exactamente los casos indicados, sin escribir en los rechazos, y las columnas son precio y oferta de numeric(12,2) sin precioUSD ni ofertaUSD
- test: pendiente

### AC-S20-002
- enlaza: REQ-S20-003, REQ-S20-004, REQ-S20-048, REQ-S20-049, REQ-S20-050, REQ-S20-051, BEH-S20-002, INV-S20-001
- metodo: integracion
- procedimiento: llamar a la ruta api/kiosco/vitrina con los carteles del escenario enlazado y repetir sobre 100 carteles con semilla fija comparando cada texto con formatearSoles
- esperado: los textos son los indicados, ningún ítem trae precio ni oferta sin formatear ni tasa ni «Bs», y los 100 textos coinciden
- test: pendiente

### AC-S20-003
- enlaza: REQ-S20-006, REQ-S20-009, BEH-S20-003
- metodo: unitario
- procedimiento: renderizar con react-dom/server Cartel y Badges con el ítem del escenario, buscar con grep en apps/vitrina/components las cadenas toFixed, Math.round, Math.floor, Intl.NumberFormat y formatearSoles, y comprobar que packages/domain/utils/vitrinaBadges.ts no existe
- esperado: el resultado contiene «S/ 12.00», «S/ 9.00», «-25 %» y «NUEVO», el grep da 0 coincidencias y el archivo no existe
- test: pendiente

### AC-S20-004
- enlaza: REQ-S20-007, REQ-S20-008, REQ-S20-056, BEH-S20-004, INV-S20-003
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-vitrina.mjs con los seis archivos del escenario enlazado
- esperado: falla con el primero, el tercero, el cuarto y el quinto nombrando archivo y línea y acepta el segundo y la prueba
- test: pendiente

### AC-S20-005
- enlaza: REQ-S20-052, REQ-S20-053, REQ-S20-054, REQ-S20-055, REQ-S20-065, BEH-S20-005, INV-S20-005
- metodo: unitario
- procedimiento: ejecutar la prueba de paridad de apps/vitrina (que puede importar el dominio) con 100 conjuntos de carteles generados con semilla fija y los tamaños de grupo del escenario, y las pruebas movidas de itemsDeManifiesto, urlsDeManifiesto e instanteEfectivo
- esperado: las diapositivas y la respuesta de estaVencido coinciden en los 100 casos, las franjas respetan los tamaños indicados y las pruebas movidas pasan
- test: pendiente

### AC-S20-006
- enlaza: REQ-S20-010, REQ-S20-011, REQ-S20-058, BEH-S20-006, BEH-S20-007
- metodo: integracion
- procedimiento: con un catálogo con un producto activo, uno desactivado y uno de nombre de 61 caracteres, listar las opciones del formulario, elegir cada producto, guardar, cambiar el precio del producto y leer el cartel y el esquema de VitrinaItem
- esperado: solo se ofrecen los activos, el cartel copia nombre y precio y no cambia con el producto, el nombre de 61 caracteres no se recorta y se rechaza al guardar nombrando el límite, y no hay ninguna columna que referencie a Producto
- test: pendiente

### AC-S20-007
- enlaza: REQ-S20-012, REQ-S20-013, REQ-S20-014, REQ-S20-015, REQ-S20-016, BEH-S20-008, BEH-S20-010, INV-S20-002
- metodo: integracion
- procedimiento: mover un cartel con un registro de las sentencias y un emisor SSE de prueba que anota el orden de sus llamadas, y repetir con un cliente de base de datos de prueba que lanza un error en la segunda sentencia
- esperado: el primer bloqueo es el de ConfiguracionNegocio y los de los carteles van en orden ascendente de identificador, la versión sube en 1, el emisor se llama después de confirmar, y en la escritura fallida el emisor no se llama y la versión no cambia
- test: pendiente

### AC-S20-008
- enlaza: REQ-S20-012, REQ-S20-013, REQ-S20-014, BEH-S20-009, INV-S20-002
- metodo: integracion
- procedimiento: lanzar con Promise.all los tres pares de escrituras del escenario enlazado con una barrera y repetir 50 secuencias con semilla fija
- esperado: ninguna termina en bloqueo mutuo, la versión sube exactamente en las confirmadas y el orden es consistente
- test: pendiente

### AC-S20-009
- enlaza: REQ-S20-017, REQ-S20-062, REQ-S20-063, REQ-S20-064, BEH-S20-011
- metodo: integracion
- procedimiento: ejecutar subirImagenVitrinaAction, prepararSubidaVideoAction y guardarItemAction con los archivos del escenario enlazado y un almacenamiento R2 de prueba que cuenta las subidas, y validarVideo con los cuatro tamaños de video
- esperado: los casos inválidos se rechazan nombrando el límite con 0 subidas, los casos en el límite exacto se aceptan, el video guardado que excede se borra si nadie lo usa y validarVideo acepta y rechaza según lo indicado
- test: pendiente

### AC-S20-010
- enlaza: REQ-S20-018, REQ-S20-059, REQ-S20-060, REQ-S20-061, REQ-S20-019, BEH-S20-012
- metodo: integracion
- procedimiento: guardar con guardarItemAction los carteles del escenario enlazado
- esperado: se aceptan los casos en el límite exacto y se rechazan los demás con un mensaje que nombra el límite y sin escribir en la base de datos
- test: pendiente

### AC-S20-011
- enlaza: REQ-S20-020, REQ-S20-066, REQ-S20-021, BEH-S20-013
- metodo: integracion
- procedimiento: guardar los dos carteles del escenario enlazado y armar el manifiesto en los cuatro instantes con un reloj simulado
- esperado: las fechas se guardan a las 05:00:00.000Z, la vigencia incluye ambos extremos y el rango inverso se rechaza con VigenciaInvalidaError
- test: pendiente

### AC-S20-012
- enlaza: REQ-S20-022, REQ-S20-067, REQ-S20-068, REQ-S20-023, REQ-S20-069, REQ-S20-070, REQ-S20-024, BEH-S20-014, BEH-S20-015, BEH-S20-016
- metodo: unitario
- procedimiento: ejecutar las pruebas de apps/vitrina (sincronizar, reproduccion y las nuevas de tiempos y de relojEfectivo) con temporizadores simulados, que importan las constantes exportadas de lib/tiempos.ts, sincronizar.ts y reproduccion.ts
- esperado: todas pasan con 3 fallos, 20 000 ms, 600 000 ms, 600 000 ms de sondeo, 60 000 ms de reintento, esperas de 2 a 60 segundos y recálculo cada 15 000 ms
- test: pendiente

### AC-S20-013
- enlaza: REQ-S20-025, BEH-S20-017
- metodo: unitario
- procedimiento: abrir el flujo SSE de la ruta de eventos con temporizadores simulados, con la constante LATIDO_MS exportada de apps/web-admin/lib/vitrinaEventos.ts, y avanzar 24 999 y 25 000 milisegundos
- esperado: el latido llega a los 25 000 y no a los 24 999
- test: pendiente

### AC-S20-014
- enlaza: REQ-S20-026, BEH-S20-018
- metodo: integracion
- procedimiento: enviar a las dos rutas de la vitrina peticiones sin clave, con clave inválida y con clave válida, con un contador de lecturas
- esperado: sin clave y con clave inválida responden 401 con los mensajes de S-01 y 0 lecturas, y la válida recibe el manifiesto y el flujo
- test: pendiente

### AC-S20-015
- enlaza: REQ-S20-042, BEH-S20-027
- metodo: integracion
- procedimiento: llamar a cada acción y a cada página de administración de la vitrina sin sesión, con sesión vencida y con un administrador desactivado, con un contador de lecturas
- esperado: todas se rechazan o redirigen al inicio de sesión con 0 lecturas y 0 escrituras
- test: pendiente

### AC-S20-016
- enlaza: REQ-S20-027, REQ-S20-028, REQ-S20-071, BEH-S20-019
- metodo: integracion
- procedimiento: pedir con GET y OPTIONS el manifiesto, los eventos, api/checkin y api/kiosco/estado con los orígenes del escenario enlazado y las dos configuraciones de VITRINA_ORIGENES_PERMITIDOS
- esperado: https://localhost se acepta solo en las dos rutas de la vitrina y solo con la variable llena, y el resto sigue el escenario
- test: pendiente

### AC-S20-017
- enlaza: REQ-S20-029, BEH-S20-020
- metodo: unitario
- procedimiento: leer docker-compose.prod.yml con el lector de YAML de las pruebas de S-17 y buscar deploy.replicas y scale del servicio web-admin
- esperado: no hay ninguno de los dos o deploy.replicas vale 1
- test: pendiente

### AC-S20-018
- enlaza: REQ-S20-030, REQ-S20-057, REQ-S20-031, BEH-S20-021
- metodo: unitario
- procedimiento: pedir el manifiesto, renderizar la pantalla de marca con y sin manifiesto con react-dom/server, buscar con grep clases text-[ con tamaño escrito en apps/vitrina/components y ejecutar tools/verificar-diseno.mjs de S-19 sobre apps/vitrina
- esperado: negocioNombre es «Adhara Fit», LogoMarca recibe ese nombre con manifiesto y uno vacío sin él, el grep da 0 coincidencias y la herramienta no encuentra colores ni fuentes escritos
- test: pendiente

### AC-S20-019
- enlaza: REQ-S20-033, REQ-S20-073, REQ-S20-034, REQ-S20-074, BEH-S20-022
- metodo: unitario
- procedimiento: ejecutar la preparación del APK (configuracion.mjs y preparar.mjs, con sus pruebas) con las cuatro combinaciones de variables capturando salida y archivos y leer apps/vitrina-tv/capacitor/.gitignore
- esperado: las dos primeras fallan sin archivos, con ambas variables se genera la configuración y la clave no sale en la salida, con VITRINA_DEV_URL no se exige la clave y el .gitignore excluye www/
- test: pendiente

### AC-S20-020
- enlaza: REQ-S20-032, REQ-S20-072, REQ-S20-035, REQ-S20-075, REQ-S20-076, REQ-S20-041, REQ-S20-040, REQ-S20-082, BEH-S20-023
- metodo: unitario
- procedimiento: leer capacitor.config.json generado, strings.xml, build.gradle, las rutas de los archivos Java, generar-iconos.mjs, el color de fondo de los íconos y el README, y comprobar con la lista de archivos que no existen assets/escudo.png ni prueba/index.html
- esperado: todos los identificadores y nombres son los del escenario, los íconos salen del kit, el color coincide con ground de tokens.json, los dos archivos no existen y el README no contiene los cinco términos prohibidos
- test: pendiente

### AC-S20-021
- enlaza: REQ-S20-036, REQ-S20-077, REQ-S20-037, REQ-S20-038, REQ-S20-078, REQ-S20-079, REQ-S20-080, REQ-S20-081, REQ-S20-039, BEH-S20-024, BEH-S20-025, BEH-S20-026
- metodo: unitario
- procedimiento: buscar keystores en apps/vitrina-tv, leer build.gradle y analizar apk-vitrina.yml y verificar-vitrina.yml con el lector de YAML
- esperado: no hay keystores, la firma sale de variables de entorno, apk-vitrina.yml cumple el escenario de su BEH y verificar-vitrina.yml cumple el suyo
- test: pendiente

### AC-S20-022
- enlaza: REQ-S20-043, REQ-S20-044, REQ-S20-045, REQ-S20-077, BEH-S20-028, INV-S20-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-vitrina.mjs con un árbol por cada término, uno por cada otra regla, un keystore de prueba y un árbol limpio; después ejecutarla sobre el árbol final
- esperado: falla con cada término, regla y keystore nombrando archivo, línea y término, pasa con el árbol limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S20-023
- enlaza: REQ-S20-046, BEH-S20-029
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue vitrinaBadges en un archivo de apps/vitrina y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-vitrina.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S20-024
- enlaza: REQ-S20-083, BEH-S20-030
- metodo: unitario
- procedimiento: leer las listas de exenciones de las cuatro herramientas en el árbol final y buscar rutas que empiecen con apps/vitrina
- esperado: 0 entradas
- test: pendiente

### AC-S20-025
- enlaza: REQ-S20-006, REQ-S20-022, REQ-S20-023, REQ-S20-030, REQ-S20-026
- metodo: manual
- procedimiento: con la IP del gimnasio en IPS_PERMITIDAS, instalar el APK firmado en el televisor del gimnasio, cargar un cartel de entrenador, uno de promoción con oferta y uno de producto con video, y mirar la secuencia durante 15 minutos con y sin red
- esperado: los carteles se ven con precios en soles, el video se reproduce, una pieza que falla se omite, la secuencia sigue sin red y vuelve a sincronizar al regresar la red, y se lee a 3 metros
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016, estrategia de pruebas: pruebas primero; un commit por paso con typecheck y pruebas en verde): (1) pruebas de caracterización de `armarManifiesto`, de las rutas de la vitrina y de las reglas de reproducción de `apps/vitrina`, con las constantes de `useVitrina.ts` movidas a `lib/tiempos.ts`, `siguienteEspera` y `LATIDO_MS` exportados y sus pruebas; (2) `tools/verificar-vitrina.mjs` y sus pruebas, con los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) esquema: `precio` y `oferta` junto a las columnas viejas; (4) `PrecioInvalidoError` y `VigenciaInvalidaError`, fechas a las 05:00Z y `estaVencido` con 24 horas; (5) manifiesto con los textos del servidor, `negocioNombre` y sin tasa ni importes crudos, junto con la app `vitrina` que pinta los textos, sus copias `lib/secuencia.ts`, `lib/manifiesto.ts` y `lib/relojEfectivo.ts` con la prueba de paridad y el retiro de sus importaciones de valores de dominio (cambio atómico: el contrato y su consumidor cambian en el mismo commit); (6) retiro de `precioUSD`, `ofertaUSD` y `vitrinaBadges.ts`; (7) elección de producto del catálogo en el formulario; (8) protocolo de bloqueo de las seis escrituras, orden de identificador y versión atómica, con las pruebas de concurrencia; (9) validación por firma de bytes y límites repartidos por punto de control; (10) CORS de la vitrina; (11) superficie `tv`, tokens, tamaños de texto y `LogoMarca`; (12) APK: identificador, nombre, variables obligatorias, íconos, firma por variables de entorno, `README` y retiro de `prueba/index.html` y de `assets/escudo.png`; (13) workflows `apk-vitrina.yml` y `verificar-vitrina.yml`; (14) paso del CI; (15) vaciar las exenciones de las otras herramientas.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la propia prueba, una base efímera y una barrera; no hay dependencias nuevas, y los workflows se leen con el lector de YAML de las pruebas de S-17 (operación y despliegue). Los fallos de transacción se provocan con un cliente de base de datos de prueba que se inyecta en el repositorio y el emisor SSE se recibe como parámetro de las acciones, con el emisor real como valor por defecto.
- AC-S20-023 y AC-S20-025 son pasos manuales del propietario (requieren el CI y el televisor real).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, fundaciones del repositorio, y S-15, línea base y datos iniciales) con las columnas nuevas. Un APK de vitrina instalado se reemplaza por el nuevo (otro identificador y firma): se desinstala el anterior.
- **Enmiendas que se registran al aprobar S-20:**
  - S-01 (seguridad): `VITRINA_ORIGENES_PERMITIDOS` se suma a las variables de producción y a la validación de orígenes de las dos rutas de la vitrina, con la regla de falla cerrada y `Vary: Origin` de S-01.
  - S-00 (fundaciones del repositorio): `.env.example` suma `VITRINA_ORIGENES_PERMITIDOS` sin valor.
  - S-03 (dinero): la familia S-20 (`Vitrina*`, `vitrina*` y `Reproductor*`) vacía sus exenciones de `verificar-dinero`; las columnas `VitrinaItem.precio` y `oferta` son `numeric(12,2)`; el descuento se calcula con `restar`, `porcentaje` (modo `arriba`) y `comparar`, sin pedir una operación nueva; el puente temporal (`numeroDeMonto` y `montoDeNumero`) no se usa en la vitrina.
  - S-05 (negocio y sede únicos): el orden de las escrituras y el bloqueo de la fila única de `ConfiguracionNegocio` quedan fijados (SUP-S20-005, protocolo de bloqueo); `vitrinaVersion` se incrementa en la misma transacción que escribe.
  - S-10 (retirar lo venezolano): el retiro de la tasa y los bolívares de la vitrina y los identificadores de las apps de TV quedan cumplidos, y las exenciones de `apps/vitrina` y `apps/vitrina-tv` se vacían.
  - S-11 (productos): el formulario de cartel de producto puede copiar un producto activo del catálogo (nombre y `costo`); `listarProductos` no cambia.
  - S-18 (entrenadores): el selector de nombres del cartel de entrenador usa `listarEntrenadores` (REQ-S18-033, el formulario de entrenador lee sus nombres de esa lista, ya cumplido).
  - S-19 (diseño y marca) y S-02 (hora de Lima): las exenciones de `apps/vitrina` y `apps/vitrina-tv` se vacían; `data-superficie` y `LogoMarca` de la vitrina los cumple S-19.
  - S-15 (línea base y datos iniciales): el baseline incluye `precio` y `oferta`.
  - S-17 (operación y despliegue): `docker-compose.prod.yml` no define réplicas de `web-admin` (REQ-S20-029) y la IP del gimnasio va en `IPS_PERMITIDAS`; el `Dockerfile` de `vitrina` ya no necesita transpilar `@gym-app/domain`.
  - S-21 (check-in en TV, en revisión): el origen de `kiosk-tv` sigue limitado a `KIOSCO_ORIGENES_PERMITIDOS` (S-21 lo nombra `CORS_ORIGENES`, por conciliar) y el de la vitrina va aparte; los secretos de firma son los mismos y las reglas de keystore de `kiosk-tv` las cubre S-21.
  - S-22 (capa de datos con Drizzle): `VitrinaItem.precio` y `oferta` entran al esquema de Drizzle y el repositorio de la vitrina aplica el protocolo de bloqueo con la API de Drizzle.
  - S-23 (un solo rol administrador): las acciones y páginas de la vitrina llaman a `exigirSesion` y `puedeEditarKiosko` desaparece.
  - `docs/06-modelo-datos-cambios.md`, `COBERTURA-RF.md` y `BACKLOG-SPECS.md`: nota de que S-20 cubre la vitrina.
- **Traspasos:** el propietario (televisor, contenido de los carteles, secretos de firma y keystore) y una spec futura si se quisieran varias réplicas (SSE por base de datos o cola).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Aceptar `https://localhost` como origen en las rutas de la vitrina abre el manifiesto a cualquier página local; la clave del kiosco sigue siendo obligatoria. Mitigación: variable separada, solo dos rutas, prohibición de ese origen en `api/checkin` y `api/kiosco/estado` y rotación de la clave desde el panel (S-23).
- La clave de la vitrina viaja dentro del APK empaquetado. Mitigación: el artefacto se cifra con `APK_CLAVE`, la clave se rota desde el panel y los carteles no tienen datos personales.
- El emisor SSE en memoria se pierde al reiniciar el contenedor y no escala a varias réplicas. Mitigación: la TV reconecta con espera creciente, sondea cada 10 minutos y `web-admin` corre con una sola réplica.
- Un video con códec distinto de H.264 no se reproducirá en el televisor, y el servidor no lo revalida (solo el navegador). Mitigación: validación en el navegador al subirlo, tamaño y tipo revisados en el servidor y límite de resolución; no verificado qué pasa si se sube con una herramienta que se salte el navegador.
- Copiar el precio del producto al cartel deja precios desactualizados si el producto cambia. Mitigación: no hay vínculo vivo y el cartel muestra su propio precio editable.
- La secuencia por fechas y franjas queda en dos sitios (dominio y TV) y puede divergir. Mitigación: la prueba de paridad de AC-S20-005 corre en cada pull request.
- Pasar `fin` a las 05:00Z y la vigencia a `fin` más 24 horas cambia una regla existente; si se olvida una de las dos copias de `estaVencido` el último día se corta o se alarga. Mitigación: borde 04:59:59.999Z y 05:00:00.000Z en la prueba de paridad.
- El descuento calculado se redondea hacia abajo y antes se redondeaba al más cercano: un cartel existente puede mostrar un punto menos. Mitigación: es una decisión por validar (pregunta abierta 3) y `descuentoPct` guardado manda siempre.
- Archivos que quedan en R2 sin cartel tras una validación fallida (SUP-S20-006, ya subidos antes de guardar). Mitigación: se aceptan por ahora para no obligar a resubir; la limpieza queda fuera de alcance.
- Perder el keystore impide actualizar el APK instalado. Mitigación: el propietario lo guarda en dos lugares fuera del repositorio.
- Si `IPS_PERMITIDAS` está activa y no incluye la IP del gimnasio, Caddy responde 403 a la TV y a la vista previa. Mitigación: SUP-S20-014 y AC-S20-025 con la lista activa; la vista previa en navegador necesita además su origen en `KIOSCO_ORIGENES_PERMITIDOS` (asumido).
- Sin ejecutor de navegador, el aspecto de los carteles solo se revisa a ojo. Mitigación: AC-S20-025 en el televisor real y las herramientas de tokens y contraste de S-19.
- Las líneas de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿La TV conserva sus propias copias de las reglas de secuencia, de lectura del manifiesto y de reloj (sin importar dominio), o prefieres que el servidor entregue la secuencia ya resuelta (la TV perdería la agenda por fechas sin red) o que se permita un módulo puro compartido de `@gym-app/domain` (contra el principio «kiosco sin lógica» de ADR-021)? Default: copias en `apps/vitrina/lib` con prueba de paridad (SUP-S20-003).
- ¿Los carteles muestran precios en soles con el texto armado por el servidor («S/ 12.00»)? Default: sí (SUP-S20-002).
- ¿El descuento calculado se redondea hacia abajo (87.5 por ciento se muestra «-87 %») en vez de al más cercano? Default: hacia abajo (SUP-S20-002).
- ¿Un cartel de producto se puede crear copiando un producto del catálogo, sin vínculo posterior ni recorte del nombre? Default: sí (SUP-S20-004).
- ¿La vitrina sigue empaquetada dentro del APK, con una variable aparte (`VITRINA_ORIGENES_PERMITIDOS`) para su origen? Default: sí (SUP-S20-008).
- ¿El APK se llama «Adhara Fit Vitrina» con identificador `pe.adharafit.vitrina`? Default: sí (SUP-S20-009).
- ¿La firma del APK sale de los mismos secretos del repositorio que el APK del kiosco y se compila `assembleRelease` firmado en vez de un APK de depuración? Default: sí (SUP-S20-009).
- ¿La vigencia de un cartel incluye el día de inicio y el de fin, con `fin` guardado a las 05:00Z y vencido 24 horas después? Default: sí (SUP-S20-007).
- ¿Una oferta de 0.00 es válida (cartel gratis, «-100 %»), y una oferta sin precio es válida? Default: sí a ambas (SUP-S20-001).
- ¿La IP pública del gimnasio ya está en `IPS_PERMITIDAS`? Default: sí (SUP-S20-014).

## Revisión independiente

Veredicto íntegro del revisor independiente (spec-reviewer): REQUIERE CAMBIOS. Texto copiado de `docs/superpowers/revisiones-pendientes/S-20.md`.

> # Hallazgos del spec-reviewer sobre S-20 (pendientes de conciliar; REQUIERE CAMBIOS)
> H-01 CRITICO: la app vitrina importa más dominio en runtime: lib/sincronizar.ts:2 urlsDeManifiesto; components/Reproductor.tsx:6-9 construirSecuencia, itemsDeManifiesto, estadoDeTasa, diaCalendarioCaracas; lib/useVitrina.ts:5 instanteEfectivo; app/layout.tsx:4-5 theming/temaAdrenalinaXtreme; secuenciaVitrina.ts:3,9,29,39 (construirSecuencia, estaVencido, repartirFranjas = reglas horario/franjas de 3, corren en la TV sin red). Decidir: copiar a apps/vitrina/lib, o servidor entrega secuencia resuelta, o permitir módulo puro. REQ-007 no exime pruebas (REQ-043 sí).
> H-02 CRITICO: fin hoy = final del día (rangoDiaCaracas(fin).fin, actions.ts:59-60; secuenciaVitrina.ts:9); la spec lo cambia a 05:00Z y exige reescribir estaVencido; añadir borde 04:59:59.999Z/05:00:00.000Z y documentar el hecho actual.
> H-03 CRITICO: orden de bloqueos: hoy actualizar/eliminar bloquean fila cartel y luego Sucursal (PrismaVitrinaRepository.ts:84-101), crear inserta y luego actualiza config (:73-82), mover :104-126. Extender protocolo a TODA escritura (crear, actualizar, eliminar, ajustes): config primero, luego carteles por id; BEH/AC concurrencia editar vs mover; definir "cambio de secuencia" en INV-002.
> H-04 MAYOR: formatearSoles vive en packages/ui/formato/soles.ts (S-03:135), S-19 lo mueve a design-system; armarManifiesto en packages/domain/services/manifiestoVitrina.ts:6-24; ruta web-admin route.ts:28. Fijar dónde se arman los textos (ruta de web-admin) o pedir a S-03 exponerlo en dominio.
> H-05 MAYOR: S-03 (:615-623) no tiene operación de razón; REQ-004: pedir operación nueva (enmienda) o describir con existentes; Math.round actual (vitrinaBadges.ts:15) -> abajo; faltan banderas mostrarDescuento y descuentoPct<=0 (Badges.tsx:15, vitrinaBadges.ts:12).
> H-06 MAYOR: REQ-018 agrupa límites; "5 MB reposo" es del kiosco (imagenSubida.ts:2; kiosko/actions.ts:68) no del cartel (quitar de BEH-009); "franjas de 3" es regla de secuencia (secuenciaVitrina.ts:3); video: lado mayor <=1920 (MAX_LADO_MAYOR_VIDEO, videoVitrina.ts:4,21), no 1920x1080; origen DI-77 no ADR-016.
> H-07 MAYOR: REQ-019 "sin subir archivos" inviable: imágenes se suben antes (subirImagenVitrinaAction actions.ts:111-128), video a R2 prefirmado (:101-108); servidor rechaza tras subir y borra video (:154-157). Validar en subirImagenVitrinaAction (bytes) y prepararSubidaVideoAction (tamaño); huérfanos. Validación de imagen hoy por MIME (imagenSubida.ts:15-18). H.264 y resolución solo cliente (videoVitrina.ts, mp4.ts); servidor solo bytes y video/mp4 (actions.ts:154).
> H-08: REQ-002 lógica errónea (corregir a "no mayor que 0.00 o mayor que 9999.99"); declarar PrecioInvalidoError/VigenciaInvalidaError (no existen).
> H-09: dividir REQ-022, 023, 032, 035, 036, 038, 016, 030.
> H-10: AC-010/BEH-011: pruebas existentes reales: serializar, sse, reproduccion, sincronizar, posicionarDiapositiva, reproducibles, config; constantes sondeo 10 min/reintento 60 s/espera 2-60 s/reloj 15 s sin exportar y sin prueba (useVitrina.ts:15-20); latido 25 s (eventos/route.ts:9) sin prueba; hay que exportar constantes y escribir pruebas.
> H-11: AC-003 (no binario), AC-011 ("401 o equivalente"; mezcla clave kiosco y sesión; S-01 SUP-S01-009), AC-006 (cómo forzar fallo: inyección), "evento con versión 8" pero evento lleva Date.now() (eventos/route.ts:33).
> H-12: no hay reloj visible; lo que se actualiza cada 15 s es `ahora` (useVitrina.ts:20,146); reformular REQ-024.
> H-13: hechos 38, 40, 41, 45 sin línea: sincronizar.ts:6, reproduccion.ts:4-5, useVitrina.ts:15-20, route.ts:28, eventos/route.ts:9, vitrinaItem.ts:26-29, imagenSubida.ts:4; capacitor/scripts sí verificable: configuracion.mjs:7-10,14-15,21 lanza error sin VITRINA_API_URL; VITRINA_CLAVE opcional (preparar.mjs:5); modo desarrollo VITRINA_DEV_URL (configuracion.mjs:6,21) choca con REQ-033/SUP-008; faltan capacitor/assets/escudo.png y scripts/generar-iconos.mjs.
> H-14: patrón del símbolo de dólar (usar plantilla con toFixed), "Bs" da falsos positivos (S-10 SUP-S10-007 :57); REQ-043 no incluye debug.keystore; INV-004 exige keystore pero REQ-044/045 no.
> H-15: duplicación con S-10 (:88,116,122), S-05 (:182 vitrinaVersion atómico), S-19 (:134,368 data-superficie, LogoMarca): remitir en vez de duplicar.
> H-16: puedeEditarKiosko (actions.ts:8,33) lo retira S-23 (:18); citar S-23/S-01 y tools/contrato-permisos.mjs; REQ-026 nombrar exigirKiosco.
> H-17 origen SUP-S20-007 no válido (usar DI/RF). H-18 IPS_PERMITIDAS (S-17 SUP-S17-003): la TV debe estar en la lista. H-19 duplicidad de términos com.adrenalina con verificar-kiosco-tv (S-21:300). H-20 REQ-010: listarProductos entrega todos (S-11:38), falta filtro activos, Producto.costo. H-21 nombre >60 al copiar producto.
> depende_de debe sumar S-15, S-17, S-21(?), S-22.

### Conciliación del autor

Cada fila nombra el hallazgo del revisor y lo que cambió en esta spec. «Pregunta» significa que la decisión es del propietario y la spec lleva un Default asumido, por validar (sección 5.4).

| Hallazgo | Qué cambió |
|---|---|
| H-01 (crítico, la app vitrina importa dominio en ejecución) | Se documentó en 0.4 con archivo:línea. REQ-S20-007 y REQ-S20-008 limitan la app a `import type` de `entities/Vitrina`; REQ-S20-052 a REQ-S20-055 definen las copias `lib/secuencia.ts`, `lib/manifiesto.ts` y `lib/relojEfectivo.ts`; REQ-S20-053 e INV-S20-005 exigen paridad con el dominio; el tema pasa a S-19 (REQ-S20-030). Las pruebas quedan eximidas (BEH-S20-004). Pregunta 1 (SUP-S20-003). |
| H-02 (crítico, `fin` a 05:00Z) | Se documentó el hecho actual (`rangoDiaCaracas(fin).fin`) en 0.4. REQ-S20-020, REQ-S20-066 y REQ-S20-021 fijan el guardado a 05:00Z y `estaVencido` con fin más 24 h; BEH-S20-013 añade los bordes 04:59:59.999Z y 05:00:00.000Z. Pregunta 8 (SUP-S20-007). |
| H-03 (crítico, orden de bloqueos) | Se documentó el orden actual en 0.4. REQ-S20-012 a REQ-S20-016 extienden el protocolo a toda escritura (crear, actualizar, activar o desactivar, mover, eliminar, ajustes): primero ConfiguracionNegocio, luego carteles por identificador ascendente. BEH-S20-009 e INV-S20-002 cubren la concurrencia (editar contra mover) y definen la escritura de contenido. |
| H-04 (mayor, dónde vive `formatearSoles`) | SUP-S20-002 y REQ-S20-003 fijan que los textos se arman en la ruta de web-admin con `formatearSoles` de S-03 (dinero); la TV solo pinta (REQ-S20-006). No se pide nada nuevo a S-03. |
| H-05 (mayor, operación de razón, redondeo, banderas) | REQ-S20-004 describe el descuento con `restar`, `porcentaje` y `comparar` de S-03, sin operación nueva; redondeo hacia abajo (pregunta 3); REQ-S20-048 a REQ-S20-050 añaden las banderas mostrarDescuento, mostrarPrecio y mostrarOferta y el descuento menor o igual a 0. |
| H-06 (mayor, límites agrupados y mal atribuidos) | REQ-S20-018 a REQ-S20-019 y REQ-S20-059 a REQ-S20-065 separan cada límite; se quitó el «5 MB en reposo» (es del kiosco); «franjas de 3» pasa a REQ-S20-065 como regla de secuencia; el video se valida por lado mayor de a lo sumo 1920 y lado menor de a lo sumo 1080; el origen es DI-77 (límites de contenido de la vitrina). |
| H-07 (mayor, «sin subir archivos» inviable) | REQ-S20-017, REQ-S20-062 y REQ-S20-063 validan en `subirImagenVitrinaAction` (firma de bytes y tamaño) y al preparar la subida del video, y comprueban el tamaño real al guardar; el video guardado que excede se borra si nadie lo usa; los huérfanos de R2 quedan como riesgo aceptado (SUP-S20-006, 5.3). H.264 y resolución se validan solo en el navegador (REQ-S20-064; servidor «no verificado»). |
| H-08 (REQ-002 y errores sin declarar) | REQ-S20-002 corregido a «no mayor que 0.00 o mayor que 9999.99»; REQ-S20-047 agrega la oferta; `PrecioInvalidoError` y `VigenciaInvalidaError` se declaran como nuevos en REQ-S20-002, REQ-S20-047 y REQ-S20-021. |
| H-09 (REQ compuestos) | Se dividieron los requisitos compuestos: cada REQ tiene exactamente un «deberá» (por ejemplo REQ-S20-022 con REQ-S20-067 y REQ-S20-068; REQ-S20-032 con REQ-S20-072; REQ-S20-035 con REQ-S20-075 y REQ-S20-076; REQ-S20-036 con REQ-S20-077; REQ-S20-038 con REQ-S20-078 a REQ-S20-081; REQ-S20-016 y REQ-S20-030 aparte). |
| H-10 (pruebas existentes y constantes sin exportar) | 0.4 lista las pruebas reales; el paso 1 del plan 5.1 exporta las constantes de `useVitrina.ts` a `lib/tiempos.ts`, `siguienteEspera` y `LATIDO_MS` y las prueba; AC-S20-012 y AC-S20-013 las usan. |
| H-11 (AC no binarios) | Se reescribieron los AC con esperados exactos: 401 con los mensajes de S-01 (AC-S20-014), sesión aparte (AC-S20-015), fallo de transacción por cliente de base de datos de prueba inyectado y emisor SSE como parámetro (5.1, AC-S20-007), y el evento ya no se afirma con versión (el evento lleva la hora, así que se comprueba el manifiesto pedido después). |
| H-12 (no hay reloj visible) | REQ-S20-024 reformulado: lo que se recalcula cada 15 segundos es el instante efectivo (`ahora`), mayor entre el reloj del dispositivo y el último `servidorAhora`; BEH-S20-016. |
| H-13 (hechos sin línea, capacitor) | 0.4 trae archivo:línea en cada hecho (`sincronizar.ts:6`, `reproduccion.ts:4-5`, `useVitrina.ts:15-20`, `route.ts:28`, `eventos/route.ts:9`, `vitrinaItem.ts`, `imagenSubida.ts:4`, `configuracion.mjs`, `preparar.mjs`); REQ-S20-033 y REQ-S20-073 consideran VITRINA_DEV_URL; REQ-S20-035 y REQ-S20-076 cubren `generar-iconos.mjs` y `assets/escudo.png`. |
| H-14 (patrones del lint) | SUP-S20-012 y REQ-S20-056 cambian el patrón del dólar a una plantilla con `toFixed`, sin buscar «Bs» suelto (falsos positivos, S-10); REQ-S20-043 incluye `debug.keystore` y REQ-S20-077 e INV-S20-004 alinean el keystore con las reglas. |
| H-15 (duplicación con otras specs) | REQ-S20-057 y REQ-S20-031 remiten a S-10 (nombre desde ConfiguracionNegocio) y S-19 (superficie tv y LogoMarca); la versión atómica se remite a S-05; 5.2 lista las enmiendas en vez de duplicar. |
| H-16 (`puedeEditarKiosko`) | REQ-S20-042 usa `exigirSesion` de S-01 (guarda única por S-23, que retira `puedeEditarKiosko`); REQ-S20-026 nombra `exigirKiosco`; 5.2 anota la enmienda de S-23. `tools/contrato-permisos.mjs` no se verificó: «no verificado». |
| H-17 (origen de SUP-S20-007) | Los orígenes se reasignaron a ADR, DI y S-nn con descripción; SUP-S20-007 se justifica como supuesto propio. |
| H-18 (`IPS_PERMITIDAS`) | SUP-S20-014, REQ de riesgo y AC-S20-025: la IP del gimnasio debe estar en la lista; pregunta 10. |
| H-19 (términos com.adrenalina) | REQ-S20-043 y SUP-S20-012 acotan los términos de S-20 y 5.2 deja los de `kiosk-tv` a S-21; sin duplicarlos. |
| H-20 (REQ-010 y `Producto.costo`) | REQ-S20-010 filtra los activos de `listarProductos` (S-11 lo entrega todo) y REQ-S20-011 copia `Producto.costo` (precio de venta). |
| H-21 (nombre de más de 60 al copiar producto) | REQ-S20-011 y BEH-S20-007: no se recorta, se rechaza al guardar nombrando el límite. |
| `depende_de` | Se sumaron S-15, S-17, S-21, S-22 y S-23 (además de los previos); S-21 es una dependencia a confirmar («S-21(?)» del revisor). No se tocó S-21; queda la discrepancia de nombre `KIOSCO_ORIGENES_PERMITIDOS` frente a `CORS_ORIGENES`, anotada en 5.2. |
