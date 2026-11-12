---
id: S-20
estado: en-revision
adrs: ADR-011, ADR-012, ADR-016, ADR-020, ADR-021, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-05, S-10, S-11, S-18, S-19, S-23
aprobada_por:
fecha_aprobacion:
---
# S-20 — Vitrina de TV: carteles en soles, administración, SSE y APK

## 0. Contexto y alcance

### 0.1 Problema
ADR-021 incluyó en el alcance la vitrina: una pantalla de TV que reproduce una secuencia de carteles (entrenadores, promociones y productos) con imagen o video, administrada desde el panel y sincronizada por un manifiesto y por eventos (SSE). La vitrina del Repo A tiene tres problemas que otras specs dejaron a S-20: (1) los precios son dólares con equivalente en bolívares calculado con una tasa (`precioUSD`, `ofertaUSD`, `mostrarEquivalenteBs`, `tasaBcv`), que S-03 y S-10 retiran; (2) la app de la vitrina importa funciones de dominio en tiempo de ejecución (`formatearBs`, `vitrinaBadges`), contra el principio «kiosco sin lógica» de ADR-021; (3) el APK `vitrina-tv` trae la marca anterior (`com.adrenalina.vitrina`, «Vitrina AX»), una página de prueba con hora de Caracas y bolívares, una dependencia de un `debug.keystore` versionado y un CI que emite solo advertencias si falta la clave. Además S-05 mueve los ajustes de la vitrina a `ConfiguracionNegocio` y advierte de un posible bloqueo mutuo al reordenar, S-11 crea el catálogo de productos y S-18 la tabla de entrenadores. S-20 deja la vitrina funcionando con esas decisiones.

### 0.2 Dentro de alcance
- Precios de los carteles en soles: columnas `precio` y `oferta`, texto de precio, oferta y descuento armado en el servidor, y retiro de la tasa y de los bolívares.
- La app `vitrina` sin importaciones de dominio en tiempo de ejecución.
- Formulario de cartel de producto con elección opcional de un producto del catálogo.
- Reordenar la secuencia sin bloqueos mutuos y versión de la vitrina atómica.
- Validación de imágenes por firma de bytes y conservación de los límites de contenido existentes.
- Conservación de las reglas de reproducción en la TV (omitir tras fallos, límite de atasco, sondeo, reintentos, reloj) con sus pruebas.
- Origen CORS del APK empaquetado para las rutas de la vitrina.
- APK `vitrina-tv`: identificador, nombre, sin URL por defecto, íconos del kit, firma por secretos, workflows y README propios.
- `tools/verificar-vitrina.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- El check-in en TV y su APK: S-21.
- El sistema de diseño, los tokens, la tipografía y la marca: S-19 (S-20 los consume).
- Contratar o producir contenido (fotos, videos y textos de los carteles): lo carga el propietario desde el panel.
- Varias réplicas de `web-admin`: el emisor SSE vive en memoria y exige un solo contenedor (DI-78).
- El host de Windows `kiosk-host` y el worker de la tasa: fuera del proyecto.
- Cambiar el formato de video aceptado (H.264 hasta 1920×1080).

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-20 recibirá tras S-00 a S-19; se recontarán al empezar.
- **Modelo:** `VitrinaItem` (`schema.prisma:684`) tiene `sucursalId`, `tipo`, `orden`, `activo`, `duracionSeg`, `inicio` y `fin`, el medio (`mediaUrl`, `mediaTipo`, `posterUrl`, `sonido`), los campos de precio `precioUSD`, `ofertaUSD`, `descuentoPct`, `etiqueta` con sus banderas `mostrar*` y `mostrarEquivalenteBs`, y los de entrenador (`nombre`, `especialidad`, `frase` con banderas) (verificado con `Read`).
- **Entidad y manifiesto:** `packages/domain/entities/Vitrina.ts` define los tipos `ENTRENADOR`, `PROMO` y `PRODUCTO`, `ItemManifiesto` y `ManifiestoVitrina` (con `version`, `servidorAhora`, `duracionSeg` y la tasa); `GET api/kiosco/vitrina/route.ts` arma el manifiesto con `armarManifiesto` e incluye `tasaBcvParaKiosco()`, y `api/kiosco/vitrina/eventos/route.ts` emite SSE con latido de 25 000 ms y un emisor en memoria (`lib/vitrinaEventos.ts`, `globalThis`) (verificado con `Read` y DI-78).
- **La app importa dominio:** `apps/vitrina/package.json:15` depende de `@gym-app/domain`; `components/Badges.tsx:3-4` importa `formatearBs`, `descuentoMostrado` y `equivalenteBs` en tiempo de ejecución y formatea con `` `$${monto.toFixed(2)}` `` (`:6`); `lib/api.ts:1` y `lib/reproduccion.ts:1` importan tipos; `next.config.ts:8` transpila `@gym-app/domain` y `@gym-app/theming` (verificado con `grep -n` y `Read`).
- **Reglas de reproducción:** omitir una pieza tras 3 fallos, atasco de 20 s, tope de 10 min, sondeo de 10 min, reintento de 60 s, reconexión SSE de 2 a 60 s y reloj de 15 s (DI-79, `lib/sincronizar.ts`, `reproduccion.ts`, `useVitrina.ts`); hay pruebas en `lib/*.test.ts` (verificado con `ls` y `docs/11`).
- **Límites de contenido:** nombre y especialidad 60 caracteres, frase 120, etiqueta 20, duración de 3 a 300 s, video H.264 hasta 100 MB y 1920×1080, imagen hasta 8 MB (reposo 5 MB) y franjas de 3 (DI-77, `docs/11`; no verificado en el código del Repo A, se contrastará al empezar).
- **Administración:** el panel tiene `vitrina/` (`page.tsx`, `FormularioVitrinaItem.tsx`, `SelectorMedio.tsx`, `actions.ts`, `secuencia/`, `ajustes/`, `[tipo]/`) y `kiosko/` (verificado con `ls`); el formulario copia el nombre de un entrenador de la lista que S-18 cambia (S-18 REQ-S18-033).
- **APK de la vitrina:** `apps/vitrina-tv` trae `README.md` (con `com.adrenalina.vitrina`, «Vitrina AX», la API key en el APK, secretos `VITRINA_CLAVE_<SEDE>`, WebView ≥ 111), `prueba/index.html` (con Caracas y bolívares, S-02 §0.3), `capacitor/` con `assets`, `android` y `scripts`; la app web va empaquetada sin `server.url`; los workflows `apk-vitrina.yml` (solo `workflow_dispatch`) y `verificar-vitrina.yml` no se importaron (S-00 §0.2) (verificado con `ls` y `Read`).
- **Interacción con specs aprobadas:** S-03 renombra las columnas de dinero a `numeric(12,2)` y deja los precios de la vitrina a S-20; S-10 quita la tasa y los bolívares de la vitrina y deja los identificadores de las apps de TV a S-20 y S-21; S-05 mueve `vitrinaDuracionSeg`, `vitrinaTransicion` y `vitrinaVersion` a `ConfiguracionNegocio` y deja a S-20 el orden de las actualizaciones al reordenar (S-05 §5.3); S-11 crea `Producto` con `costo` como precio de venta; S-18 crea `Entrenador` y su selector; S-19 define la superficie `tv` y el formateador; S-01 guarda la clave del kiosco como hash y limita el CORS con `CORS_ORIGENES`; S-02 fija los días de Lima en instantes de las 05:00Z (verificado con `grep -n` en las specs).
- No verificado: el origen que presenta el WebView del APK empaquetado (se espera `https://localhost`), el comportamiento de los videos en el televisor real, y el contenido de `apps/vitrina-tv/capacitor/scripts`.

### 0.5 Supuestos
- SUP-S20-001: `VitrinaItem.precio` y `VitrinaItem.oferta` son `numeric(12,2)` en soles (cadenas decimales en el dominio, S-03), opcionales; si hay oferta debe ser menor que el precio y el precio mayor que 0.00 y hasta 9999.99. Default: ese rango; asumido, por validar.
- SUP-S20-002: el servidor arma en el manifiesto `precioTexto`, `ofertaTexto` y `descuentoTexto` (por ejemplo «S/ 12.00», «S/ 9.00» y «-25 %»), con `formatearSoles` de S-03; el descuento mostrado es el `descuentoPct` guardado si existe y, si no, el entero calculado hacia abajo con `dinero.ts` a partir del precio y la oferta. La TV solo pinta esos textos. Default: ese contrato; asumido, por validar.
- SUP-S20-003: la app `vitrina` solo puede importar de `@gym-app/domain` tipos con `import type` y solo del archivo `entities/Vitrina`; no importa funciones, servicios ni utilidades de dominio ni de base de datos. Default: esa regla; asumido, por validar.
- SUP-S20-004: un cartel de producto puede crearse eligiendo un producto activo del catálogo de S-11, lo que copia su nombre y su precio de venta al cartel; después son independientes (no hay vínculo vivo) y se pueden editar. Default: copiar sin vínculo; asumido, por validar.
- SUP-S20-005: reordenar o activar carteles toma el bloqueo exclusivo de la fila única de `ConfiguracionNegocio`, actualiza los carteles en orden de identificador y suma 1 a `vitrinaVersion` en la misma transacción; el evento SSE se emite después de confirmar. Default: ese mecanismo; asumido, por validar (S-05 §5.3).
- SUP-S20-006: las imágenes de los carteles se validan por la firma de sus bytes (JPG, PNG o WebP) además del tamaño; los videos conservan la validación actual de H.264, tamaño y resolución. Default: ese criterio; asumido, por validar.
- SUP-S20-007: las fechas de vigencia `inicio` y `fin` de un cartel son días de calendario de Lima guardados a las 05:00Z (S-02); la vigencia incluye ambos días. Default: inclusivo; asumido, por validar.
- SUP-S20-008: el APK de la vitrina sigue empaquetando la app web (sin `server.url`), por lo que su origen en el WebView es `https://localhost`; ese origen se acepta solo en las rutas `api/kiosco/vitrina` y `api/kiosco/vitrina/eventos` mediante una variable propia, `CORS_ORIGENES_VITRINA`, y la autenticación sigue siendo la clave del kiosco en cabecera. Default: esa separación; asumido, por validar.
- SUP-S20-009: el APK `vitrina-tv` tiene el identificador `pe.adharafit.vitrina` y el nombre «Adhara Fit Vitrina»; `VITRINA_API_URL` y `VITRINA_CLAVE` no tienen valor por defecto. Se firma y se cifra con los mismos secretos que S-21 (SUP-S21-007) y su workflow se dispara a mano. Default: esos nombres; asumido, por validar.
- SUP-S20-010: `verificar-vitrina.yml` se reinstala como un workflow de verificación que ejecuta las pruebas y el tipado de `apps/vitrina` en cada pull request que toque esa carpeta, sin secretos. Default: ese workflow; asumido, por validar.
- SUP-S20-011: `web-admin` se ejecuta con una sola réplica en producción porque el emisor SSE vive en memoria; `docker-compose.prod.yml` de S-17 no define réplicas. Default: una réplica; asumido, por validar.

## 1. Requisitos

### REQ-S20-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: VitrinaItem deberá tener las columnas precio y oferta como numeric(12,2) opcionales, sin las columnas precioUSD, ofertaUSD ni mostrarEquivalenteBs.

### REQ-S20-002
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si el precio no es mayor que 0.00 ni menor o igual que 9999.99, o la oferta no es menor que el precio, entonces guardar un cartel deberá rechazarlo con PrecioInvalidoError sin escribir nada.

### REQ-S20-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El manifiesto de la vitrina deberá traer precioTexto, ofertaTexto y descuentoTexto armados en el servidor con formatearSoles de S-03.

### REQ-S20-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El descuento mostrado deberá ser el descuentoPct guardado o, si no existe, el entero hacia abajo calculado con dinero.ts a partir del precio y la oferta.

### REQ-S20-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El manifiesto no deberá traer tasa de cambio ni equivalentes en bolívares.

### REQ-S20-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: Los carteles de la TV deberán pintar los textos de precio, oferta y descuento del manifiesto sin calcular ni formatear importes.

### REQ-S20-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La app vitrina solo deberá importar de @gym-app/domain tipos con import type del archivo entities/Vitrina.

### REQ-S20-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La app vitrina no deberá importar paquetes de base de datos ni de infraestructura.

### REQ-S20-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Los archivos de la vitrina no deberán contener formatearBs, equivalenteBs, vitrinaBadges, tasaBcv ni el símbolo de dólar en sus formatos de precio.

### REQ-S20-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El formulario de cartel de producto deberá permitir elegir un producto activo del catálogo.

### REQ-S20-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Elegir un producto deberá copiar su nombre y su precio de venta al cartel sin crear un vínculo con el producto.

### REQ-S20-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Reordenar, activar o desactivar carteles deberá tomar el bloqueo exclusivo de la fila de ConfiguracionNegocio dentro de una transacción.

### REQ-S20-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Reordenar carteles deberá actualizar sus filas en orden ascendente de identificador.

### REQ-S20-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada cambio de la secuencia deberá sumar 1 a vitrinaVersion en la misma transacción.

### REQ-S20-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El evento SSE de cambio de versión deberá emitirse solo después de confirmar la transacción.

### REQ-S20-016
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si la transacción de un cambio de secuencia falla entonces no deberá emitirse ningún evento ni cambiar vitrinaVersion.

### REQ-S20-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las imágenes de los carteles deberán validarse por la firma de sus bytes como JPG, PNG o WebP antes de subirse.

### REQ-S20-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La vitrina deberá conservar los límites de nombre y especialidad de 60 caracteres, frase de 120, etiqueta de 20, duración de 3 a 300 segundos, imagen de 8 MB y de 5 MB en reposo, video H.264 de 100 MB y 1920 por 1080, y franjas de 3.

### REQ-S20-019
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si un cartel excede alguno de los límites de contenido entonces guardarlo deberá rechazarse con un error de validación que nombre el límite y sin subir archivos.

### REQ-S20-020
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S20-007
- texto: La vigencia de un cartel deberá incluir los días de Lima de inicio y de fin, guardados a las 05:00:00.000Z.

### REQ-S20-021
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S20-007
- texto: Si la fecha de fin es anterior a la de inicio entonces guardar el cartel deberá rechazarlo con VigenciaInvalidaError sin escribir nada.

### REQ-S20-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La TV deberá omitir una pieza tras 3 fallos de carga, considerarla atascada a los 20 segundos y limitar cada pieza a 10 minutos.

### REQ-S20-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La TV deberá sondear el manifiesto cada 10 minutos, reintentar tras 60 segundos si falla y reconectar el SSE con esperas de 2 a 60 segundos.

### REQ-S20-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El reloj de la TV deberá actualizarse cada 15 segundos con la hora de Lima del manifiesto.

### REQ-S20-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El emisor SSE deberá enviar un latido cada 25 segundos.

### REQ-S20-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las rutas api/kiosco/vitrina y api/kiosco/vitrina/eventos deberán exigir la clave del kiosco.

### REQ-S20-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las rutas de la vitrina deberán aceptar los orígenes de la variable CORS_ORIGENES_VITRINA además de los de CORS_ORIGENES.

### REQ-S20-028
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si CORS_ORIGENES_VITRINA está vacía entonces las rutas de la vitrina deberán rechazar los orígenes cruzados que no estén en CORS_ORIGENES.

### REQ-S20-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El Compose de producción no deberá definir más de una réplica de web-admin.

### REQ-S20-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Las pantallas de la vitrina deberán obtener colores, tamaños de texto, tipografías, espaciados y duraciones de los tokens de S-19 con la superficie tv.

### REQ-S20-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: La pantalla de marca de la vitrina deberá mostrar LogoMarca de S-19 con el nombre del negocio.

### REQ-S20-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El APK de vitrina-tv deberá tener el identificador pe.adharafit.vitrina y el nombre «Adhara Fit Vitrina».

### REQ-S20-033
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si falta VITRINA_API_URL o VITRINA_CLAVE entonces la preparación del APK deberá terminar con error sin generar archivos.

### REQ-S20-034
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La preparación del APK no deberá imprimir la clave de la vitrina ni dejarla en archivos versionados.

### REQ-S20-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El APK de vitrina-tv deberá usar los íconos del kit de Adhara Fit y los colores de tokens.json.

### REQ-S20-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: build.gradle de vitrina-tv deberá leer el keystore, el alias y las claves de variables de entorno, con el repositorio libre de archivos keystore y jks.

### REQ-S20-037
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si falta alguno de los secretos de firma o APK_CLAVE entonces el workflow apk-vitrina.yml deberá fallar antes de compilar.

### REQ-S20-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El workflow apk-vitrina.yml deberá dispararse solo a mano y cifrar el APK con APK_CLAVE antes de subirlo.

### REQ-S20-039
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El workflow verificar-vitrina.yml deberá ejecutar el tipado y las pruebas de apps/vitrina en cada pull request que modifique esa carpeta, sin usar secretos.

### REQ-S20-040
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: El README de apps/vitrina-tv deberá describir el APK de Adhara Fit sin nombres, URLs ni secretos del cliente anterior.

### REQ-S20-041
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: apps/vitrina-tv no deberá contener la página prueba/index.html heredada.

### REQ-S20-042
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Las rutas, acciones y pantallas de administración de la vitrina deberán llamar a exigirSesion de S-01 antes de leer o escribir datos.

### REQ-S20-043
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next, out, generated y las pruebas, no deberán contener los términos precioUSD, ofertaUSD, mostrarEquivalenteBs, equivalenteBs, com.adrenalina ni Vitrina AX.

### REQ-S20-044
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-vitrina.mjs encuentra alguno de los términos de REQ-S20-043 o de REQ-S20-009, deberá terminar con código distinto de cero.

### REQ-S20-045
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-vitrina.mjs encuentra alguno de esos términos, deberá nombrar archivo, línea y término.

### REQ-S20-046
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-vitrina.mjs en cada pull request.

## 2. Comportamiento

### BEH-S20-001
- cubre: REQ-S20-001, REQ-S20-002
- categoria: borde
- dado: una base migrada y carteles con precio «0.00», «0.01», «9999.99», «10000.00» y oferta igual al precio, mayor y menor
- cuando: se guarda cada cartel
- entonces: se aceptan «0.01» y «9999.99» con oferta menor; se rechazan «0.00», «10000.00» y las ofertas iguales o mayores con PrecioInvalidoError sin escribir; las columnas son precio y oferta de numeric(12,2) y no existen las columnas anteriores

### BEH-S20-002
- cubre: REQ-S20-003, REQ-S20-004, REQ-S20-005
- categoria: feliz
- dado: un cartel de precio «12.00» y oferta «9.00» sin descuentoPct, y otro con descuentoPct 30
- cuando: se arma el manifiesto
- entonces: el primero trae «S/ 12.00», «S/ 9.00» y «-25 %» (25 calculado hacia abajo), el segundo «-30 %», y el manifiesto no trae tasa ni bolívares

### BEH-S20-003
- cubre: REQ-S20-006, REQ-S20-009
- categoria: feliz
- dado: los componentes de la vitrina y un manifiesto con los textos del servidor
- cuando: se renderizan Badges y los demás componentes
- entonces: se pintan los textos tal cual, no hay cálculo ni formato de importes, y no existe el símbolo de dólar ni funciones de bolívares

### BEH-S20-004
- cubre: REQ-S20-007, REQ-S20-008
- categoria: error
- dado: un archivo de apps/vitrina con import de una función de dominio, otro con import type de otro archivo de dominio, otro con import de infraestructura y otro con import type de entities/Vitrina
- cuando: se ejecuta tools/verificar-vitrina.mjs
- entonces: falla con los tres primeros nombrando archivo y línea y acepta el último

### BEH-S20-005
- cubre: REQ-S20-010, REQ-S20-011
- categoria: feliz
- dado: el producto activo «Agua 600 ml» a «2.50» y un producto desactivado
- cuando: el administrador crea un cartel de producto y elige el producto, y luego cambia el precio del producto a «3.00»
- entonces: solo el activo se ofrece; el cartel copia «Agua 600 ml» y «2.50» y conserva «2.50» tras el cambio del producto

### BEH-S20-006
- cubre: REQ-S20-012, REQ-S20-013, REQ-S20-014, REQ-S20-015
- categoria: feliz
- dado: cinco carteles y vitrinaVersion 7
- cuando: el administrador mueve un cartel del puesto 4 al 1
- entonces: la transacción toma el bloqueo de ConfiguracionNegocio, actualiza las filas en orden de identificador, vitrinaVersion queda en 8 y el evento SSE sale después de confirmar con la versión 8

### BEH-S20-007
- cubre: REQ-S20-012, REQ-S20-013, REQ-S20-014
- categoria: concurrencia
- dado: dos movimientos simultáneos que reordenan los mismos carteles en sentidos opuestos, detenidos con una barrera
- cuando: se liberan a la vez
- entonces: ninguno termina en bloqueo mutuo, ambos se confirman en serie, vitrinaVersion sube exactamente 2 y el orden final es consistente con el último

### BEH-S20-008
- cubre: REQ-S20-016
- categoria: error
- dado: un cambio de secuencia cuya transacción falla a la mitad
- cuando: termina
- entonces: no se emite ningún evento, vitrinaVersion no cambia y la secuencia queda como estaba

### BEH-S20-009
- cubre: REQ-S20-017, REQ-S20-018, REQ-S20-019
- categoria: error
- dado: un PDF con extensión .jpg, una imagen de 8 MB, otra de 8 MB más un byte, una imagen de reposo de 5 MB y otra de 5 MB más un byte, y un nombre de 61 caracteres
- cuando: se guarda cada cartel
- entonces: el PDF y los excesos se rechazan con un error que nombra el límite y sin subir archivos, y las imágenes en el límite exacto y el nombre de 60 caracteres se aceptan

### BEH-S20-010
- cubre: REQ-S20-020, REQ-S20-021
- categoria: borde
- dado: un cartel con inicio el 2026-11-12 y fin el 2026-11-14 y otro con fin anterior al inicio
- cuando: se piden los carteles vigentes el 2026-11-11, 11-12, 11-14 y 11-15 (Lima), y se guarda el segundo
- entonces: el primero está vigente solo del 12 al 14 inclusive y las fechas se guardan a las 05:00:00.000Z; el segundo se rechaza con VigenciaInvalidaError

### BEH-S20-011
- cubre: REQ-S20-022, REQ-S20-023, REQ-S20-024, REQ-S20-025
- categoria: feliz
- dado: las pruebas existentes de sincronizar, reproducción, SSE y reloj de apps/vitrina y el emisor SSE
- cuando: se ejecutan con temporizadores simulados
- entonces: se omite una pieza tras 3 fallos, se detecta el atasco a los 20 segundos, el tope es de 10 minutos, el sondeo es cada 10 minutos, el reintento a los 60 segundos, el SSE reconecta de 2 a 60 segundos, el reloj se actualiza cada 15 segundos y el latido sale cada 25 segundos

### BEH-S20-012
- cubre: REQ-S20-026
- categoria: error
- dado: peticiones a las rutas de la vitrina sin clave, con una clave inválida y con una válida
- cuando: se envía cada una
- entonces: las dos primeras responden 401 sin datos y la válida recibe el manifiesto y el flujo SSE

### BEH-S20-013
- cubre: REQ-S20-027, REQ-S20-028
- categoria: borde
- dado: CORS_ORIGENES con el origen del kiosco y CORS_ORIGENES_VITRINA con https://localhost, y luego esta última vacía
- cuando: se pide el manifiesto con el origen https://localhost y con el del kiosco
- entonces: con la variable llena se acepta https://localhost solo en las rutas de la vitrina y no en api/checkin; con la variable vacía se rechaza https://localhost

### BEH-S20-014
- cubre: REQ-S20-029
- categoria: feliz
- dado: docker-compose.prod.yml
- cuando: se leen las réplicas del servicio web-admin
- entonces: no hay réplicas definidas o es una sola

### BEH-S20-015
- cubre: REQ-S20-030, REQ-S20-031
- categoria: feliz
- dado: la app vitrina abierta
- cuando: se leen su superficie, sus estilos y su pantalla de marca
- entonces: el atributo data-superficie es tv, los valores salen de variables --gx-* sin colores, fuentes ni tamaños escritos, y la pantalla de marca muestra LogoMarca con el nombre del negocio

### BEH-S20-016
- cubre: REQ-S20-032, REQ-S20-033, REQ-S20-034
- categoria: error
- dado: preparar sin VITRINA_API_URL, sin VITRINA_CLAVE y con ambas
- cuando: se ejecuta cada una capturando la salida y los archivos
- entonces: los dos primeros terminan con error sin archivos; con ambas, capacitor.config.json trae pe.adharafit.vitrina y «Adhara Fit Vitrina», y la clave no sale en la salida ni en archivos versionados

### BEH-S20-017
- cubre: REQ-S20-035, REQ-S20-040, REQ-S20-041
- categoria: feliz
- dado: la carpeta apps/vitrina-tv
- cuando: se leen sus íconos, sus colores, su README y su lista de archivos
- entonces: usa los íconos del kit y los colores de tokens.json, el README solo habla de Adhara Fit y no existe prueba/index.html

### BEH-S20-018
- cubre: REQ-S20-036, REQ-S20-037, REQ-S20-038
- categoria: error
- dado: el repositorio, build.gradle y apk-vitrina.yml analizado con un lector de YAML
- cuando: se buscan keystores y se revisan los disparadores y los pasos
- entonces: no hay keystores ni jks, la firma sale de variables de entorno, el workflow solo se dispara a mano, verifica los secretos antes de compilar y cifra el APK antes de subirlo

### BEH-S20-019
- cubre: REQ-S20-039
- categoria: feliz
- dado: verificar-vitrina.yml analizado con un lector de YAML
- cuando: se revisan sus disparadores, sus pasos y sus secretos
- entonces: se dispara en pull requests que modifican apps/vitrina, ejecuta el tipado y las pruebas y no usa secretos

### BEH-S20-020
- cubre: REQ-S20-042
- categoria: error
- dado: peticiones sin sesión, con sesión vencida y de un administrador desactivado
- cuando: llegan a las rutas, acciones y páginas de administración de la vitrina
- entonces: todas se rechazan antes de leer o escribir datos

### BEH-S20-021
- cubre: REQ-S20-043, REQ-S20-044, REQ-S20-045
- categoria: error
- dado: un archivo por cada uno de los seis términos de REQ-S20-043 y de los cinco de REQ-S20-009
- cuando: se ejecuta tools/verificar-vitrina.mjs
- entonces: termina con código distinto de cero y nombra archivo, línea y término de cada uno

### BEH-S20-022
- cubre: REQ-S20-046
- categoria: error
- dado: un pull request que agrega precioUSD en un archivo de apps/vitrina
- cuando: corre el CI
- entonces: el paso de tools/verificar-vitrina.mjs falla y queda en rojo

## 3. Invariantes

### INV-S20-001
- propiedad: el manifiesto nunca trae importes sin formatear ni bolívares, y todo texto de precio empieza con «S/ »
- mecanismo: test-propiedad
- deteccion: sobre 100 carteles generados con un generador congruencial lineal de semilla fija escrito en la prueba (precios, ofertas y descuentos válidos), el manifiesto no contiene claves de tasa ni «Bs» y cada precioTexto y ofertaTexto coincide con formatearSoles del valor
- protege: REQ-S20-003, REQ-S20-004, REQ-S20-005, REQ-S20-006

### INV-S20-002
- propiedad: vitrinaVersion crece en 1 por cada cambio de secuencia confirmado y solo por ellos
- mecanismo: transaccion
- deteccion: sobre 50 secuencias de cambios correctos, fallidos y simultáneos con barrera generadas con semilla fija, la versión final es igual a la inicial más la cantidad de cambios confirmados y nunca hay bloqueo mutuo
- protege: REQ-S20-012, REQ-S20-013, REQ-S20-014, REQ-S20-015, REQ-S20-016

### INV-S20-003
- propiedad: la app vitrina no ejecuta código de dominio ni de base de datos
- mecanismo: lint
- deteccion: tools/verificar-vitrina.mjs termina con código distinto de cero si encuentra una importación de valores de dominio, base de datos o infraestructura en apps/vitrina
- protege: REQ-S20-007, REQ-S20-008, REQ-S20-009

### INV-S20-004
- propiedad: los términos del cliente anterior y de los dólares no aparecen y no hay claves de firma versionadas
- mecanismo: lint
- deteccion: tools/verificar-vitrina.mjs termina con código distinto de cero y lista archivo:línea y término, y falla si encuentra un archivo keystore o jks
- protege: REQ-S20-036, REQ-S20-043, REQ-S20-044, REQ-S20-045

## 4. Criterios de aceptación

### AC-S20-001
- enlaza: REQ-S20-001, REQ-S20-002, BEH-S20-001
- metodo: integracion
- procedimiento: con una base efímera, guardar los carteles de BEH-S20-001 y leer las columnas de VitrinaItem
- esperado: se aceptan y rechazan exactamente los casos indicados, sin escribir en los rechazos, y las columnas son las nuevas
- test: pendiente

### AC-S20-002
- enlaza: REQ-S20-003, REQ-S20-004, REQ-S20-005, BEH-S20-002, INV-S20-001
- metodo: integracion
- procedimiento: armar el manifiesto con los carteles de BEH-S20-002 y repetir sobre 100 carteles con semilla fija comparando cada texto con formatearSoles
- esperado: los textos son los indicados, no hay tasa ni «Bs» y los 100 textos coinciden
- test: pendiente

### AC-S20-003
- enlaza: REQ-S20-006, REQ-S20-009, BEH-S20-003
- metodo: unitario
- procedimiento: renderizar con react-dom/server los componentes de la vitrina con un manifiesto de textos y buscar en su código cálculos de importes, el símbolo de dólar y las funciones de bolívares
- esperado: los textos del servidor aparecen sin cambios y no hay cálculos ni símbolos
- test: pendiente

### AC-S20-004
- enlaza: REQ-S20-007, REQ-S20-008, BEH-S20-004, INV-S20-003
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-vitrina.mjs con los cuatro archivos de BEH-S20-004
- esperado: falla con los tres primeros y acepta el último nombrando archivo y línea
- test: pendiente

### AC-S20-005
- enlaza: REQ-S20-010, REQ-S20-011, BEH-S20-005
- metodo: integracion
- procedimiento: con un catálogo con un producto activo y otro desactivado, crear el cartel eligiendo el producto, cambiar el precio del producto y leer el cartel
- esperado: solo se ofrece el activo, el cartel copia nombre y precio y no cambia con el producto
- test: pendiente

### AC-S20-006
- enlaza: REQ-S20-012, REQ-S20-013, REQ-S20-014, REQ-S20-015, REQ-S20-016, BEH-S20-006, BEH-S20-008, INV-S20-002
- metodo: integracion
- procedimiento: mover un cartel con un emisor SSE simulado que registra el orden de sus llamadas, forzar un fallo a mitad de otro cambio y leer vitrinaVersion y los eventos
- esperado: la versión sube en 1, el evento sale después de confirmar con esa versión, y el cambio fallido no emite nada ni cambia la versión
- test: pendiente

### AC-S20-007
- enlaza: REQ-S20-012, REQ-S20-013, REQ-S20-014, BEH-S20-007, INV-S20-002
- metodo: integracion
- procedimiento: lanzar con Promise.all dos reordenamientos opuestos con una barrera, y repetir 50 secuencias con semilla fija
- esperado: ninguno termina en bloqueo mutuo, la versión sube exactamente en los confirmados y el orden es consistente
- test: pendiente

### AC-S20-008
- enlaza: REQ-S20-017, REQ-S20-018, REQ-S20-019, BEH-S20-009
- metodo: integracion
- procedimiento: guardar los carteles de BEH-S20-009 con un almacenamiento simulado que cuenta las subidas
- esperado: los casos inválidos se rechazan nombrando el límite con 0 subidas y los casos en el límite exacto se aceptan
- test: pendiente

### AC-S20-009
- enlaza: REQ-S20-020, REQ-S20-021, BEH-S20-010
- metodo: integracion
- procedimiento: guardar los dos carteles de BEH-S20-010 y pedir los vigentes en las cuatro fechas con un reloj simulado
- esperado: la vigencia incluye ambos extremos, las fechas se guardan a las 05:00:00.000Z y el rango inverso se rechaza
- test: pendiente

### AC-S20-010
- enlaza: REQ-S20-022, REQ-S20-023, REQ-S20-024, REQ-S20-025, BEH-S20-011
- metodo: unitario
- procedimiento: ejecutar las pruebas existentes de apps/vitrina (sincronizar, reproducción, SSE y reloj) y la del latido del emisor con temporizadores simulados
- esperado: todas pasan sin cambiar sus constantes
- test: pendiente

### AC-S20-011
- enlaza: REQ-S20-026, REQ-S20-042, BEH-S20-012, BEH-S20-020
- metodo: integracion
- procedimiento: enviar a las rutas de la vitrina peticiones sin clave, con clave inválida y válida, y a las de administración peticiones sin sesión, con sesión vencida y de un administrador desactivado, con un contador de lecturas
- esperado: las rechazadas responden 401 o equivalente con 0 lecturas y la válida recibe el manifiesto y el flujo
- test: pendiente

### AC-S20-012
- enlaza: REQ-S20-027, REQ-S20-028, BEH-S20-013
- metodo: integracion
- procedimiento: pedir el manifiesto y api/checkin con los orígenes de BEH-S20-013 y las dos configuraciones de CORS_ORIGENES_VITRINA
- esperado: https://localhost se acepta solo en las rutas de la vitrina y solo con la variable llena
- test: pendiente

### AC-S20-013
- enlaza: REQ-S20-029, BEH-S20-014
- metodo: unitario
- procedimiento: leer docker-compose.prod.yml con el lector de YAML de las pruebas y buscar réplicas de web-admin
- esperado: no hay réplicas o es una sola
- test: pendiente

### AC-S20-014
- enlaza: REQ-S20-030, REQ-S20-031, REQ-S20-035, BEH-S20-015, BEH-S20-017
- metodo: unitario
- procedimiento: renderizar el diseño raíz y la pantalla de marca de la vitrina con react-dom/server, ejecutar tools/verificar-diseno.mjs de S-19 sobre apps/vitrina y apps/vitrina-tv y comparar los colores del APK con tokens.json
- esperado: la superficie es tv, hay LogoMarca con el nombre, no quedan colores ni fuentes escritos y los colores coinciden con tokens.json
- test: pendiente

### AC-S20-015
- enlaza: REQ-S20-032, REQ-S20-033, REQ-S20-034, BEH-S20-016
- metodo: unitario
- procedimiento: ejecutar la preparación del APK con las tres combinaciones de variables capturando salida y archivos
- esperado: los dos primeros fallan sin archivos y con ambas variables se genera la configuración y la clave no sale en claro
- test: pendiente

### AC-S20-016
- enlaza: REQ-S20-036, REQ-S20-037, REQ-S20-038, REQ-S20-039, BEH-S20-018, BEH-S20-019
- metodo: unitario
- procedimiento: buscar keystores, leer build.gradle y analizar apk-vitrina.yml y verificar-vitrina.yml con el lector de YAML
- esperado: no hay keystores, la firma sale de variables de entorno y los workflows cumplen BEH-S20-018 y BEH-S20-019
- test: pendiente

### AC-S20-017
- enlaza: REQ-S20-040, REQ-S20-041, BEH-S20-017
- metodo: unitario
- procedimiento: buscar en el README de apps/vitrina-tv nombres, URLs y secretos del cliente anterior y comprobar que prueba/index.html no existe
- esperado: no hay coincidencias y el archivo no existe
- test: pendiente

### AC-S20-018
- enlaza: REQ-S20-043, REQ-S20-044, REQ-S20-045, BEH-S20-021, INV-S20-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-vitrina.mjs con un árbol por cada término y con un keystore de prueba y uno limpio; después ejecutarla sobre el árbol final
- esperado: falla con cada término y con el keystore nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S20-019
- enlaza: REQ-S20-046, BEH-S20-022
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue precioUSD en un archivo de apps/vitrina y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-vitrina.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S20-020
- enlaza: REQ-S20-006, REQ-S20-022, REQ-S20-023, REQ-S20-030
- metodo: manual
- procedimiento: instalar el APK firmado en el televisor del gimnasio, cargar un cartel de entrenador, uno de promoción con oferta y uno de producto con video, y mirar la secuencia durante 15 minutos con y sin red
- esperado: los carteles se ven con precios en soles, el video se reproduce, una pieza que falla se omite, la secuencia sigue sin red y vuelve a sincronizar al regresar la red, y se lee a 3 metros
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero; un commit por paso con typecheck y pruebas en verde): (1) pruebas de caracterización de `armarManifiesto`, de las rutas de la vitrina y de las reglas de reproducción de `apps/vitrina`; (2) `tools/verificar-vitrina.mjs` y sus pruebas, con los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) esquema: `precio` y `oferta` junto a las columnas viejas y retiro de `mostrarEquivalenteBs`; (4) manifiesto con los textos del servidor y sin tasa; (5) la app `vitrina` pinta los textos y se retiran sus importaciones de valores de dominio (cambio atómico con el paso 4); (6) retiro de `precioUSD` y `ofertaUSD`; (7) elección de producto del catálogo en el formulario; (8) reordenar con bloqueo, orden de identificador y versión atómica; (9) validación por firma de bytes y de fechas; (10) CORS de la vitrina; (11) superficie `tv`, tokens y `LogoMarca`; (12) APK: identificador, nombre, variables obligatorias, íconos, firma por variables de entorno, `README` y retiro de `prueba/index.html`; (13) workflows `apk-vitrina.yml` y `verificar-vitrina.yml`; (14) paso del CI.
- Las pruebas de propiedades y de concurrencia usan un generador congruencial lineal de semilla fija escrito en la propia prueba, una base efímera y una barrera; no hay dependencias nuevas, y los workflows se leen con el lector de YAML de las pruebas de S-17.
- AC-S20-019 y AC-S20-020 son pasos manuales del propietario (requieren el CI y el televisor real).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15) con las columnas nuevas. Un APK de vitrina instalado se reemplaza por el nuevo (otro identificador y firma): se desinstala el anterior.
- **Enmiendas que se registran al aprobar S-20:**
  - S-01: `CORS_ORIGENES_VITRINA` se suma a las variables de producción y a la validación de orígenes.
  - S-00: `.env.example` suma `CORS_ORIGENES_VITRINA` sin valor.
  - S-03: la familia S-20 (`Vitrina*`, `vitrina*` y `Reproductor*`) vacía sus exenciones de `verificar-dinero`; las columnas `VitrinaItem.precio` y `oferta` son `numeric(12,2)`.
  - S-05: el orden de actualización al reordenar y el bloqueo de la fila única quedan fijados (SUP-S20-005); `vitrinaVersion` se incrementa en la misma transacción.
  - S-10: el retiro de la tasa y los bolívares de la vitrina queda cumplido; los identificadores de las apps de TV de la vitrina quedan cumplidos.
  - S-11: el formulario de cartel de producto puede copiar un producto del catálogo.
  - S-18: el selector de nombres del cartel de entrenador usa `listarEntrenadores` (REQ-S18-033, ya cumplido).
  - S-19 y S-02: las exenciones de `apps/vitrina` y `apps/vitrina-tv` se vacían.
  - S-15: el baseline incluye `precio` y `oferta`.
  - S-17: `docker-compose.prod.yml` no define réplicas de `web-admin` (REQ-S20-029).
  - S-21: el origen de `kiosk-tv` sigue limitado a `CORS_ORIGENES`; el de la vitrina va aparte.
  - `docs/06-modelo-datos-cambios.md`, `COBERTURA-RF.md` y `BACKLOG-SPECS.md`: nota de que S-20 cubre la vitrina.
- **Traspasos:** el propietario (televisor, contenido de los carteles, secretos de firma y keystore) y una spec futura si se quisieran varias réplicas (SSE por base de datos o cola).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Aceptar `https://localhost` como origen en las rutas de la vitrina abre el manifiesto a cualquier página local; la clave del kiosco sigue siendo obligatoria. Mitigación: variable separada, solo dos rutas y rotación de la clave desde el panel (S-23).
- La clave de la vitrina viaja dentro del APK empaquetado. Mitigación: el artefacto se cifra, la clave se rota desde el panel y los carteles no tienen datos personales.
- El emisor SSE en memoria se pierde al reiniciar el contenedor y no escala a varias réplicas. Mitigación: la TV reconecta con espera creciente, sondea cada 10 minutos y `web-admin` corre con una sola réplica.
- Un video con códec distinto de H.264 no se reproducirá en el televisor. Mitigación: validación de H.264 al subirlo y límite de resolución.
- Copiar el precio del producto al cartel deja precios desactualizados si el producto cambia. Mitigación: no hay vínculo vivo y el cartel muestra su propio precio editable; el cambio de precios se revisa al editar el producto.
- Perder el keystore impide actualizar el APK instalado. Mitigación: el propietario lo guarda en dos lugares fuera del repositorio.
- Sin ejecutor de navegador, el aspecto de los carteles solo se revisa a ojo. Mitigación: AC-S20-020 en el televisor real y las herramientas de tokens y contraste de S-19.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Los carteles muestran precios en soles con el texto armado por el servidor («S/ 12.00»)? Default: sí (SUP-S20-002).
- ¿Un cartel de producto se puede crear copiando un producto del catálogo, sin vínculo posterior? Default: sí (SUP-S20-004).
- ¿La vitrina sigue empaquetada dentro del APK, con una variable aparte para su origen? Default: sí (SUP-S20-008).
- ¿El APK se llama «Adhara Fit Vitrina» con identificador `pe.adharafit.vitrina`? Default: sí (SUP-S20-009).
- ¿La firma del APK sale de los mismos secretos del repositorio que el APK del kiosco? Default: sí (SUP-S20-009).
- ¿La vigencia de un cartel incluye el día de inicio y el de fin? Default: sí (SUP-S20-007).
