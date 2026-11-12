---
id: S-19
estado: aprobada
adrs: ADR-008, ADR-012, ADR-016, ADR-020, ADR-021
depende_de: S-00, S-01, S-02, S-05, S-06, S-10, S-23
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-19 — Sistema de diseño y marca de Adhara Fit

## 0. Contexto y alcance

### 0.1 Problema
ADR-008 fijó la paleta de Adhara Fit (carbón `#231F20`, amarillo `#FFCB04`, blanco `#FFFFFF`) y ADR-020 decidió que el propietario quiere un sistema de diseño profesional y completo, con rebranding total y la misma identidad en el panel, el kiosco, el kiosco en TV y la vitrina. Hoy el código tiene un tema verde del cliente anterior en `packages/theming/tokens.ts` (que S-10 renombra a `temaAdhara` sin cambiar los colores), 50 colores escritos a mano en 12 archivos, tres fuentes cargadas desde Google Fonts en tiempo de ejecución (inaceptable para un kiosco que debe funcionar sin internet, RNF-03), un paquete `design-system` vacío y 16 componentes dispersos en `packages/ui`. S-19 instala la marca y el sistema: tokens como única fuente (color, tipografía, espaciado, radios, sombras, movimiento, capas y quiebres, con variantes por superficie), un catálogo de componentes con sus estados, la marca (logotipo, isotipo, favicon e íconos) en todas las apps, tipografías autoalojadas, y herramientas que hacen verificable la persistencia visual y el contraste.

### 0.2 Dentro de alcance
- Tema `temaAdhara` con los valores de ADR-008 y los tokens derivados, generados a CSS (`--gx-*`) y JSON desde una sola fuente en `packages/theming`.
- Escalas de tipografía, espaciado, radios, sombras, movimiento, capas y puntos de quiebre, con variantes para `panel`, `kiosco` y `tv`.
- Tipografías `Barlow` y `Barlow Condensed` autoalojadas (archivos `woff2` y licencia en el repositorio), sin Google Fonts.
- Componentes en `packages/design-system` (los de `packages/ui` más los que faltan), con estados normal, foco, deshabilitado, error, vacío y cargando, y una galería `/diseno` en el panel.
- La marca: logotipo, isotipo, favicon e íconos del kit del propietario en las apps, el manifiesto del kiosco y el nombre «Adhara Fit».
- Retiro del fondo de imagen y video del kiosco y de Bebas Neue (los demás recursos del cliente anterior los retira S-10, REQ-S10-022).
- Reubicación del formateador único de fechas de `packages/ui/formato/fechaHora.ts` a `packages/design-system/formato/`.
- Selección de la superficie `tv` en la app `kiosk` con el parámetro `?superficie=tv`.
- Ajustes de `Dockerfile`, `globals.css`, `next.config.ts` y `package.json` por el paquete nuevo.
- `tools/contraste.mjs` (contraste AA de los pares declarados), `tools/verificar-diseno.mjs` (sin colores ni fuentes sueltos) y `tools/sincronizar-marca.mjs`, con sus pasos en el CI.
- Accesibilidad: foco visible, estado no solo por color, contraste AA, movimiento reducido y tamaños táctiles.
- Diseño del reloj del panel (tokens y posición).
- Actualización de la CSP de S-01 y del service worker del kiosco por las fuentes propias.

### 0.3 Fuera de alcance
- Contenido y diseño de los carteles de la vitrina y de la pantalla de check-in en TV: S-20 y S-21 (consumen los tokens de S-19).
- Las apps Android de TV (`kiosk-tv`, `vitrina-tv`: identificadores, lanzadores, íconos nativos): S-20 y S-21; S-19 solo entrega `tokens.json`.
- Vectorizar o redibujar el logotipo y el isotipo como SVG: ADR-020 §8 lo asigna a S-19, pero el kit recibido no es vectorial y rehacerlo es un trabajo de diseño que depende del propietario; S-19 se aparta de ese punto (SUP-S19-015) y usa los PNG hasta que el propietario entregue vectores.
- Un tema claro o un cambio de tema por el usuario: el tema es fijo y oscuro (ADR-008).
- Catálogo con Storybook u otras herramientas de terceros (SUP-S19-008).
- Texto de marketing, ilustraciones y fotografías.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-19 recibirá después de S-00 a S-18, S-22 y S-23; se recontarán al empezar.
- **Tema actual:** `packages/theming/tokens.ts` (49 líneas) define la interfaz `Tema` con 20 claves (`ground`, `surface`, `surface2`, `surfaceElevada`, `edge`, `fieldBg`, `fieldEdge`, `fieldEdgeHover`, `ink`, `muted`, `mutedDim`, `accent`, `accentInk`, `good`, `goodInk`, `warn`, `warnInk`, `bad`, `badInk`, `scrim`) y un tema verde `temaAdrenalinaXtreme` (acento `#93e83a`); `ThemeStyleTag.tsx` lo emite como variables CSS; 6 archivos importan `@gym-app/theming` (verificado con `Read` y `grep -rIl`).
- **Paquetes de UI:** `packages/design-system` solo tiene `package.json`; `packages/ui` tiene 16 componentes (`Avatar`, `Badge`, `BottomTabBar`, `Button`, `Card`, `CurrencyInput`, `FeedbackDesdeUrl`, `FeedbackOverlay`, `Input`, `InputFecha`, `LogoBadge`, `PageHeader`, `RelojYTasa`, `SelectorRangoFechas`, `Sheet`, `Sidebar`), estilos (`campos.css`, `marca-agua.css`, `selector-fecha.css`) y animaciones `lottie/ok.json` y `error.json`; 92 archivos `.ts`, `.tsx` y `.css` importan `@gym-app/ui` y 5 `package.json` o `next.config.ts` lo nombran, 97 en total con la cadena (verificado con `ls` y `grep -rIlE "from ['\"]@gym-app/ui"`); `Dockerfile:21`, `apps/kiosk/Dockerfile:23,33`, `apps/vitrina/Dockerfile:21`, `apps/web-admin/app/globals.css:2-5`, `apps/kiosk/app/globals.css:2-4` y los `transpilePackages` de ambos `next.config.ts` nombran `packages/ui`, y el `Dockerfile` solo copia de `design-system` su `package.json` (`:18`) (citas de la revisión). S-10 reemplaza `RelojYTasa` por `RelojLima` (S-10 §0.2), con lo que `packages/ui` sigue con 16 componentes. S-02 fija el formateador único en `packages/ui/formato/fechaHora.ts` (SUP-S02-005) y S-12 lo exige.
- **Colores sueltos:** 50 colores hexadecimales en 12 archivos `.ts`, `.tsx` y `.css` de `apps` y `packages`, sin contar `packages/db` (verificado con `grep -rIoh --include=*.ts --include=*.tsx --include=*.css`); 19 están en `tokens.ts` y la mayoría del resto en `configuraciones/excel/` (11 en `FilaHoja.tsx` y 3 en `ExcelGrid.tsx`), que S-10 borra, y 4 en `web-admin/app/globals.css`; además hay 29 clases de la paleta de Tailwind (`text-white`, `bg-black`, `text-red-*` y similares) en 5 archivos, y colores en los XML, scripts y páginas de las apps de TV.
- **Tipografías:** `Bebas Neue`, `Barlow` y `Barlow Condensed` se cargan en tiempo de ejecución desde `https://fonts.googleapis.com` en `apps/web-admin/app/layout.tsx:25` y `apps/kiosk/app/layout.tsx:24`, y con `next/font/google` en `apps/vitrina/app/layout.tsx:2-9`; aparecen en 18 archivos `.ts`, `.tsx`, `.css`, `.html` y `.mjs`, incluidas las apps de TV (`apps/vitrina-tv/prueba/index.html:8` y `apps/kiosk-tv/capacitor/scripts/preparar.mjs:16`); el build de `vitrina` falla sin acceso a Google (S-00 §5.3); la CSP de S-01 (SUP-S01-007) permite `fonts.googleapis.com` y `fonts.gstatic.com` (verificado con `grep -rIn` y en las specs).
- **Marca anterior:** `apps/kiosk/public/branding/` tiene `adrenalina-gym-bg.png`, `logo-adrenalina-gym.jpg`, `backgound.jpg`, `backgound1.mp4` y `placeholder-profile.jpg`; `FondoVideo.tsx:50,54` usa `backgound.jpg` y `backgound1.mp4`, `kiosk/app/page.tsx:179` y `MarcoFicha.tsx:34` los referencian y `sw.js:6-15` guarda en caché `backgound.jpg` y `adrenalina-gym-bg.png` bajo `kiosco-shell-v6` (citas de la revisión y `Read` de `FondoVideo.tsx` y `sw.js`); `apps/kiosk/public/manifest.json` dice «Check-in Gym» con fondo y tema `#000000` y los íconos `icon-192.png` e `icon-512.png`; `apps/web-admin/public/branding` y `apps/vitrina/public/branding` existen (verificado con `ls` y `Read`).
- **Kit del propietario:** `docs/design/origen-logotipo/` contiene `LEEME-kit-logotipo.txt` y `favicon-adhara-fit.ico`; el LEEME lista logotipo horizontal en color, negativo y monocromo, isotipo en color, positivo y negativo, íconos de 1024, 512, 256, 128, 64 y 32 píxeles y logotipos de 2400, 1200 y 600 píxeles, con los colores `#231F20`, `#FFCB04` y `#FFFFFF`; los PNG no están en este repositorio (verificado con `ls` y `Read`); el original no es vectorial (ADR-020).
- **Decisiones previas:** ADR-008 fija la paleta, el contraste medido (`#231F20` sobre `#FFCB04` 10,7:1; blanco sobre `#231F20` 16,3:1; `#B5AEAF` sobre `#231F20` 7,5:1; `#FF3B4E` sobre `#231F20` 4,6:1), el estado «activo» en amarillo con ícono y texto, y el tema fijo; ADR-020 pide tokens como única fuente, componentes con estados, variantes por superficie, verificación de persistencia por lint o CI y deja la tipografía por validar; S-10 renombra el tema a `temaAdhara` sin cambiar colores, muestra el nombre del negocio como texto sin logo y deja a S-19 el diseño del reloj; S-00 deja a S-19 autoalojar las fuentes; S-01 fija la CSP con `style-src` y `font-src` que incluyen Google (verificado con `Read` y `grep -n`).
- **Kiosco en TV:** `apps/kiosk-tv/capacitor/scripts/preparar.mjs:30` carga la app `kiosk` por URL, de modo que el check-in en TV es la misma app web (no verificado: cita de la revisión).
- **Contrastes calculados a mano (fórmula WCAG 2.x):** `#231F20` sobre `#FFCB04` 10,71; blanco sobre `#231F20` 16,30; `#B5AEAF` sobre `#231F20` 7,48; `#FF3B4E` sobre `#231F20` 4,65; blanco sobre `#FF3B4E` 3,51; `#FF3B4E` sobre `surface2` 4,08 y sobre `surfaceElevada` 3,79 (no pasan 4,5); `mutedDim` sobre `surface` 4,70, sobre `surface2` 4,13 y sobre `surfaceElevada` 3,83; `fieldEdge` sobre `fieldBg` 4,87 y sobre `surface` 4,35 (verificado con `python3` aplicando la fórmula WCAG 2.x; `tools/contraste.mjs` aún no existe).
- No verificado: el contenido y los colores de las animaciones Lottie, el contenido de `backgound.jpg` y `backgound1.mp4`, el tamaño de los archivos del logotipo negativo del kit (el LEEME solo da tamaños para el horizontal en color) y los contrastes hasta que `tools/contraste.mjs` los calcule.

### 0.5 Supuestos
- SUP-S19-001: el tema se llama `temaAdhara`, conserva las 20 claves de `Tema` y sus nombres CSS `--gx-*` para no tocar los archivos que los usan, y cambia sus valores a: `ground` `#0F0D0E`, `surface` `#231F20`, `surface2` `#2E292A`, `surfaceElevada` `#342E2F`, `edge` `#3D3738`, `fieldBg` `#181415`, `fieldEdge` `#8A8283`, `fieldEdgeHover` `#B5AEAF`, `ink` `#FFFFFF`, `muted` `#B5AEAF`, `mutedDim` `#8F8889`, `accent` `#FFCB04`, `accentInk` `#231F20`, `good` `#FFCB04`, `goodInk` `#231F20`, `warn` `#FF9F1C`, `warnInk` `#231F20`, `bad` `#FF3B4E`, `badInk` `#231F20` y `scrim` `rgba(15, 13, 14, 0.7)`. Los valores de `ground` a `bad` de ADR-008 son los medidos; los demás son propuestas que `tools/contraste.mjs` valida y, si no llegan al mínimo, se ajustan hasta pasar. `bad` como texto solo se usa sobre `ground` y `surface` (sobre `surface2` y `surfaceElevada` da 4,08 y 3,79) y `mutedDim` solo sobre `ground` y `surface` (sobre `surface2` y `surfaceElevada` da 4,13 y 3,83); sobre las otras superficies se usa `ink` o `muted`. Default: esos valores y esa restricción; asumido, por validar.
- SUP-S19-002: el estado «activo» usa `good`, que vale lo mismo que el acento amarillo, con el ícono ✓ y el texto «Activo»; «por vencer» usa `warn` con ⚠ y el texto; «vencido» usa `bad` con ✕ y el texto; «eliminado» usa `muted` con el texto (ADR-008 y RNF-10). Default: esos estados; asumido, por validar.
- SUP-S19-003: la tipografía de texto es `Barlow` (400, 500, 600 y 700) y la de títulos y rótulos del kiosco y la TV es `Barlow Condensed` (600 y 700), ambas con licencia OFL, subconjunto latino, formato `woff2`, `font-display: swap` y como respaldo `system-ui, sans-serif`; `Bebas Neue` se retira. Es la tipografía del base menos Bebas Neue: se aparta de ADR-020 §6, que mantiene la tipografía del base completa hasta que el propietario la valide, porque Bebas Neue es una fuente de display que sirve a la marca anterior y su retiro simplifica el autoalojamiento; el logotipo usa una sans humanista en negrita aún sin identificar. Default: esas familias; asumido, por validar, con pregunta al propietario.
- SUP-S19-004: los tamaños de texto en píxeles son: `panel` 12, 14, 16, 18, 20, 24 y 32 (base 16); `kiosco` base 28, grande 36, extragrande 48, estado 64 y nombre 96; `tv` base 36, grande 48, extragrande 64 y título 96. Los de kiosco y TV son valores iniciales para leerse a 2 y 3 metros que se confirman en el dispositivo real. Default: esas escalas; asumido, por validar.
- SUP-S19-005: espaciado en múltiplos de 4 píxeles (0, 4, 8, 12, 16, 24, 32, 48 y 64), radios de 4, 8, 12 y 9999, tres sombras, movimiento de 120, 200 y 320 ms con la curva `cubic-bezier(0.2, 0, 0, 1)`, capas 0, 10, 20, 30, 40 y 50 (base, desplegable, fija, superposición, modal y aviso) y puntos de quiebre de 640, 768, 1024 y 1280 píxeles. Default: esos valores; asumido, por validar.
- SUP-S19-006: las superficies se seleccionan con el atributo `data-superficie` (`panel`, `kiosco` o `tv`) en la etiqueta `html`, que cambia la escala de texto, el tamaño mínimo táctil y la densidad; la app `kiosk` usa `kiosco` por defecto y `tv` cuando se abre con `?superficie=tv` (la URL que carga `kiosk-tv`, S-21); `vitrina` usa `tv`. Los tamaños táctiles mínimos son 44 píxeles en `panel` y 64 en `kiosco` y `tv`. Default: ese mecanismo; asumido, por validar.
- SUP-S19-007: con la preferencia de movimiento reducido del sistema, las duraciones valen 1 ms y no hay animaciones de entrada. Default: respetar la preferencia; asumido, por validar.
- SUP-S19-008: no se agregan dependencias de terceros para el catálogo ni para las primitivas: los componentes son propios, el catálogo es una galería en la ruta `/diseno` del panel que muestra cada componente en todos sus estados, y la accesibilidad se verifica con el contraste calculado, la revisión manual y la navegación por teclado. Default: sin dependencias; asumido, por validar (ADR-020 §9).
- SUP-S19-009: la marca se guarda una sola vez en `packages/design-system/marca/` con los nombres `logo-horizontal-color.png`, `logo-horizontal-negativo.png`, `logo-monocromo-negativo.png`, `isotipo-color.png`, `icon-512.png`, `icon-256.png` y `favicon.ico`, y `tools/sincronizar-marca.mjs` los copia a `public/branding` de cada app; el propietario entrega los PNG del kit antes de implementar. El logotipo sobre fondo oscuro es el horizontal negativo, tomado en el tamaño original del archivo del kit (el LEEME solo da versiones de 2400, 1200 y 600 píxeles del horizontal en color, que sirven de respaldo). Default: esa organización; asumido, por validar.
- SUP-S19-010: el manifiesto del kiosco dice `name` «Adhara Fit — Acceso» y `short_name` «Adhara Fit», con `background_color` y `theme_color` iguales a `ground`, y usa los íconos de 256 y 512 píxeles del kit. Default: esos valores; asumido, por validar.
- SUP-S19-011: el fondo del kiosco deja de usar imágenes y video de fondo del cliente anterior y pasa a ser el color `ground` con la marca de agua del isotipo (`marca-agua.css`); si el propietario quiere un fondo propio, se agrega después como contenido de la vitrina. Default: fondo por tokens; asumido, por validar.
- SUP-S19-012: el reloj del panel se muestra arriba a la derecha del encabezado, con la fuente de texto en cifras tabulares, el tamaño base de la superficie y el color `muted`, con la hora de S-10 y el formateador de S-02. Default: ese diseño; asumido, por validar.
- SUP-S19-013: las animaciones Lottie `ok` y `error` se recolorean con los colores `good` y `bad` del tema; sus colores son arreglos RGBA de 0 a 1 que la prueba convierte a hexadecimal redondeando cada canal a 0-255. Default: recolorearlas; asumido, por validar.
- SUP-S19-014: `pares-contraste.json` declara estos pares (texto/fondo), todos con mínimo 4,5 salvo los marcados con 3: `ink` sobre `ground`, `surface`, `surface2`, `surfaceElevada` y `fieldBg`; `muted` sobre `ground`, `surface`, `surface2` y `surfaceElevada`; `mutedDim` sobre `ground` y `surface`; `accent` sobre `ground`, `surface`, `surface2` y `surfaceElevada`; `accentInk` sobre `accent`; `goodInk` sobre `good`; `warn` sobre `ground`, `surface`, `surface2` y `surfaceElevada`; `warnInk` sobre `warn`; `bad` sobre `ground` y `surface`; `badInk` sobre `bad`; y con mínimo 3: `fieldEdge` sobre `fieldBg` y sobre `surface`, `accent` sobre `ground` (anillo de foco) y `good`, `warn` y `bad` sobre `surface` (íconos de estado). Default: esa lista; asumido, por validar.
- SUP-S19-015: S-19 se aparta de ADR-020 §8: no rehace el logotipo ni el isotipo como SVG porque exige diseño gráfico y los originales vectoriales dependen del propietario; los PNG del kit se usan hasta que se entreguen vectores y el cambio no requiere tocar código. Default: usar los PNG; asumido, por validar, con pregunta al propietario.
- SUP-S19-016: las fuentes se sirven desde rutas estables `/fuentes/barlow-400.woff2`, `/fuentes/barlow-500.woff2`, `/fuentes/barlow-600.woff2`, `/fuentes/barlow-700.woff2`, `/fuentes/barlow-condensed-600.woff2` y `/fuentes/barlow-condensed-700.woff2` de cada app, y el service worker del kiosco las guarda en su caché. Default: esas rutas; asumido, por validar.
- SUP-S19-017: `LogoMarca` muestra el nombre del negocio como texto cuando la imagen no carga o el logotipo no existe, y trunca con puntos suspensivos en una línea los nombres de más de 40 caracteres conservando el texto completo en el atributo de título. Default: ese comportamiento; asumido, por validar.
- SUP-S19-018: `Sheet` y `Modal` usan `role="dialog"` y `aria-modal`, atrapan el foco, se cierran con Escape y devuelven el foco al elemento que los abrió; `Field` asocia su etiqueta con el control y enlaza el mensaje de error con `aria-describedby` y `aria-invalid`; `Tabla` usa `th` con `scope` y un `caption`; `EstadoVacio` usa `role="status"` y `Cargando` `aria-busy`. Default: esos comportamientos; asumido, por validar.
- SUP-S19-019: la verificación de diseño recorre los archivos `.ts`, `.tsx`, `.css`, `.html` y `.mjs` y excluye `.json`, `.xml` y binarios; detecta además las clases de paleta de Tailwind (`text-white`, `bg-black`, `text-red-500` y similares, las 22 familias de color por defecto), con exenciones temporales por archivo y tope que deben quedar vacías al terminar S-19 salvo las de las apps de TV. Los colores del manifiesto del kiosco, que es JSON, se comprueban con una prueba contra `tokens.json`. Default: ese alcance; asumido, por validar.


## 1. Requisitos

### REQ-S19-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: packages/theming deberá definir el tema temaAdhara como única fuente de los colores del sistema.

### REQ-S19-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: temaAdhara deberá tener las 20 claves de la interfaz Tema con los valores de SUP-S19-001.

### REQ-S19-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El paquete theming deberá generar un archivo tokens.css con una variable --gx-* por cada token de color, tipografía, espaciado, radio, sombra, movimiento, capa y punto de quiebre.

### REQ-S19-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El paquete theming deberá generar un archivo tokens.json con los mismos tokens para las apps que no usan CSS.

### REQ-S19-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: tokens.css y tokens.json deberán regenerarse a partir de la fuente con el generador.

### REQ-S19-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El CI deberá fallar cuando tokens.css o tokens.json difieran de lo que genera la fuente.

### REQ-S19-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los tokens de tipografía deberán definir las familias y los pesos de SUP-S19-003.

### REQ-S19-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los tokens de espaciado, radio, sombra, movimiento, capa y punto de quiebre deberán tener los valores de SUP-S19-005.

### REQ-S19-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El atributo data-superficie de la etiqueta html con el valor panel, kiosco o tv deberá seleccionar la escala de texto de esa superficie.

### REQ-S19-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: Cada app web deberá fijar su data-superficie: web-admin en panel, kiosk en kiosco y vitrina en tv.

### REQ-S19-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: El tema deberá ser fijo y oscuro, sin cambio de tema ni lectura de la preferencia de color del sistema.

### REQ-S19-012
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-03
- texto: Las tipografías Barlow y Barlow Condensed deberán estar en el repositorio como archivos woff2 del subconjunto latino.

### REQ-S19-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Las apps deberán cargar las tipografías de archivos propios con @font-face y font-display swap.

### REQ-S19-014
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-03
- texto: Ninguna app deberá cargar tipografías, hojas de estilo ni scripts de fonts.googleapis.com, fonts.gstatic.com ni next/font/google.

### REQ-S19-015
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-03
- texto: La política de contenido de S-01 no deberá permitir fonts.googleapis.com ni fonts.gstatic.com.

### REQ-S19-016
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-03
- texto: El service worker del kiosco deberá guardar en su caché los archivos de tipografía.

### REQ-S19-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S19-003
- texto: La tipografía Bebas Neue no deberá usarse en ninguna app.

### REQ-S19-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: packages/design-system deberá exportar los componentes Button, Input, Select, Textarea, Checkbox, Field, InputFecha, MontoInput, Card, EstadoBadge, PageHeader, Sidebar, BottomTabBar, Sheet, Modal, Aviso, Tabla, EstadoVacio, Cargando, Avatar, LogoMarca y Reloj, además de FeedbackDesdeUrl, FeedbackOverlay y SelectorRangoFechas.

### REQ-S19-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Cada componente de formulario deberá implementar los estados normal, foco, deshabilitado y error.

### REQ-S19-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Cada componente de datos deberá implementar los estados vacío y cargando.

### REQ-S19-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los componentes deberán obtener todos sus colores, tamaños de texto, espaciados, radios, sombras y duraciones de las variables --gx-* y no de valores escritos en el componente.

### REQ-S19-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: La galería /diseno del panel deberá mostrar cada componente en cada uno de sus estados.

### REQ-S19-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La galería /diseno deberá figurar como ruta con sesión en el test de contrato de S-01 y llamar a exigirSesion antes de mostrar nada.

### REQ-S19-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: EstadoBadge deberá mostrar para activo el ícono ✓ y el texto «Activo» con el color good.

### REQ-S19-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: EstadoBadge deberá mostrar para por vencer el ícono ⚠ y el texto «Por vencer» con el color warn.

### REQ-S19-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: EstadoBadge deberá mostrar para vencido el ícono ✕ y el texto «Vencido» con el color bad.

### REQ-S19-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: EstadoBadge deberá mostrar para eliminado el texto «Eliminado» con el color muted.

### REQ-S19-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: Todo estado deberá llevar texto además de su color.

### REQ-S19-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Todo elemento interactivo deberá mostrar un anillo de foco de 2 píxeles con el color accent y separación de 2 píxeles al recibir foco por teclado.

### REQ-S19-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Todo elemento interactivo deberá tener un área táctil mínima de 44 píxeles en panel y de 64 píxeles en kiosco y tv.

### REQ-S19-031
- tipo: mientras
- prioridad: MUST
- origen: ADR-020
- texto: Mientras el sistema operativo indique movimiento reducido, las animaciones de transición deberán durar 1 ms.

### REQ-S19-057
- tipo: mientras
- prioridad: MUST
- origen: ADR-020
- texto: Mientras el sistema operativo indique movimiento reducido, las animaciones de entrada no deberán ejecutarse.

### REQ-S19-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: tools/contraste.mjs deberá calcular el contraste WCAG de cada par de packages/theming/pares-contraste.json con los colores de temaAdhara.

### REQ-S19-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: pares-contraste.json deberá declarar cada par de texto y fondo usado por los componentes con su mínimo: 4,5 para texto normal y 3 para texto grande y bordes de campos.

### REQ-S19-034
- tipo: cuando
- prioridad: MUST
- origen: ADR-020
- texto: Cuando algún par de pares-contraste.json queda por debajo de su mínimo, tools/contraste.mjs deberá terminar con código distinto de cero y nombrar el par y su contraste.

### REQ-S19-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El CI deberá ejecutar tools/contraste.mjs en cada pull request.

### REQ-S19-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los archivos .ts, .tsx, .css, .html y .mjs de apps y packages, salvo packages/theming, node_modules, .next, out, generated, las pruebas y las exenciones cerradas, no deberán contener colores hexadecimales, rgb(, rgba(, hsl(, valores arbitrarios de color de Tailwind ni clases de la paleta por defecto de Tailwind.

### REQ-S19-037
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los archivos de apps y packages, salvo packages/theming, node_modules, .next, out, generated, las pruebas y las exenciones cerradas, no deberán contener font-family ni fontFamily con nombres de fuente escritos.

### REQ-S19-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los archivos de apps y packages no deberán contener los términos Bebas, fonts.googleapis.com, fonts.gstatic.com ni next/font/google.

### REQ-S19-039
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-diseno.mjs encuentra alguna de las coincidencias de REQ-S19-036 a REQ-S19-038, deberá terminar con código distinto de cero.

### REQ-S19-040
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-diseno.mjs encuentra alguna de las coincidencias de REQ-S19-036 a REQ-S19-038, deberá nombrar archivo, línea y coincidencia.

### REQ-S19-041
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada entrada de tools/verificar-diseno.exenciones.json deberá nombrar un archivo existente, la spec que lo limpia (S-19, S-20 o S-21) y un tope de coincidencias.

### REQ-S19-042
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-diseno.mjs en cada pull request.

### REQ-S19-043
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: packages/design-system/marca deberá contener los archivos de marca de SUP-S19-009.

### REQ-S19-044
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: tools/sincronizar-marca.mjs deberá copiar los archivos de marca a public/branding de web-admin, kiosk y vitrina.

### REQ-S19-045
- tipo: cuando
- prioridad: MUST
- origen: ADR-020
- texto: Cuando algún archivo de public/branding difiere en su suma SHA-256 del de packages/design-system/marca, tools/sincronizar-marca.mjs en modo verificación deberá terminar con código distinto de cero y nombrar el archivo.

### REQ-S19-046
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El CI deberá ejecutar tools/sincronizar-marca.mjs en modo verificación en cada pull request.

### REQ-S19-047
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: LogoMarca deberá mostrar el logotipo horizontal negativo con el nombre de ConfiguracionNegocio como texto alternativo.

### REQ-S19-048
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: La pantalla de inicio de sesión, el encabezado del panel, la pantalla del kiosco y la vitrina deberán mostrar LogoMarca.

### REQ-S19-049
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El favicon y los íconos de web-admin, kiosk y vitrina deberán ser los del kit de Adhara Fit.

### REQ-S19-050
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S19-010
- texto: El manifiesto del kiosco deberá tener el nombre «Adhara Fit — Acceso» y el nombre corto «Adhara Fit».

### REQ-S19-051
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los archivos backgound.jpg y backgound1.mp4 no deberán existir en el repositorio ni figurar en el código ni en el service worker.

### REQ-S19-052
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S19-011
- texto: El fondo del kiosco deberá usar el color ground y la marca de agua del isotipo, sin imágenes ni video de fondo.

### REQ-S19-053
- tipo: ubicuo
- prioridad: SHOULD
- origen: SUP-S19-012
- texto: El componente Reloj deberá mostrarse arriba a la derecha del encabezado del panel.

### REQ-S19-054
- tipo: ubicuo
- prioridad: SHOULD
- origen: SUP-S19-013
- texto: Las animaciones ok.json y error.json deberán usar solo los colores good y bad del tema.

### REQ-S19-055
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Todas las apps web deberán declarar el idioma es-PE en la etiqueta html.

### REQ-S19-056
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los 16 componentes que tenga packages/ui tras S-10 (con RelojLima en lugar de RelojYTasa) deberán migrarse a packages/design-system, y Badge, CurrencyInput, LogoBadge y RelojLima pasarán a llamarse EstadoBadge, MontoInput, LogoMarca y Reloj.

### REQ-S19-058
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El paquete packages/ui no deberá existir al terminar la migración.

### REQ-S19-059
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los tokens de tipografía deberán definir las escalas de tamaño de SUP-S19-004 para cada superficie.

### REQ-S19-060
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El atributo data-superficie deberá seleccionar el tamaño táctil mínimo de esa superficie.

### REQ-S19-061
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-03
- texto: El repositorio deberá incluir la licencia OFL de Barlow y Barlow Condensed junto a sus archivos.

### REQ-S19-062
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-03
- texto: El service worker del kiosco deberá subir el nombre de su caché a la versión siguiente a la que deje S-10.

### REQ-S19-063
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Al terminar S-19, tools/verificar-diseno.exenciones.json no deberá contener ninguna entrada cuya spec sea S-19.

### REQ-S19-064
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S19-010
- texto: El manifiesto del kiosco deberá tener background_color y theme_color iguales al valor de ground de tokens.json.

### REQ-S19-065
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S19-010
- texto: El manifiesto del kiosco deberá usar los íconos de 256 y 512 píxeles del kit.

### REQ-S19-066
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El formateador único de fechas y horas deberá estar en packages/design-system/formato/fechaHora.ts con las mismas exportaciones que tenía en packages/ui/formato.

### REQ-S19-067
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: La app kiosk deberá fijar data-superficie en tv cuando se abre con el parámetro superficie=tv y en kiosco en cualquier otro caso.

### REQ-S19-068
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: LogoMarca deberá mostrar el nombre del negocio como texto cuando la imagen del logotipo no carga o no existe.

### REQ-S19-069
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: LogoMarca deberá truncar con puntos suspensivos en una línea los nombres de más de 40 caracteres y conservar el nombre completo en el atributo de título.

### REQ-S19-070
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Sheet y Modal deberán usar role dialog con aria-modal, atrapar el foco dentro, cerrarse con Escape y devolver el foco al elemento que los abrió.

### REQ-S19-071
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Field deberá asociar su etiqueta con el control y enlazar su mensaje de error con aria-describedby y aria-invalid.

### REQ-S19-072
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Tabla deberá usar encabezados th con scope y un caption, EstadoVacio role status y Cargando aria-busy.

### REQ-S19-073
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: Todo mensaje de error de Field y de Aviso deberá llevar texto además de su color o ícono.

### REQ-S19-074
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El Dockerfile, los Dockerfile de kiosk y vitrina, los globals.css, los next.config.ts y los package.json deberán referirse a packages/design-system y no a packages/ui.

### REQ-S19-075
- tipo: ubicuo
- prioridad: MUST
- origen: RNF-03
- texto: La declaración de tipografía de cada app deberá terminar con la pila de respaldo system-ui y sans-serif.

### REQ-S19-076
- tipo: ubicuo
- prioridad: SHOULD
- origen: SUP-S19-012
- texto: El componente Reloj deberá mostrar cifras tabulares con el tamaño base de la superficie y el color muted.

## 2. Comportamiento

- no_aplica: concurrencia — el sistema de diseño no tiene estado compartido ni escrituras: son tokens, archivos estáticos y componentes de presentación.

### BEH-S19-001
- cubre: REQ-S19-001, REQ-S19-002, REQ-S19-011
- categoria: feliz
- dado: el paquete theming final
- cuando: se importa temaAdhara y se buscan temas alternativos, selectores de tema y lecturas de prefers-color-scheme
- entonces: temaAdhara tiene las 20 claves con los valores de SUP-S19-001, no existe otro tema ni selector de tema y ningún archivo lee la preferencia de color

### BEH-S19-002
- cubre: REQ-S19-003, REQ-S19-004, REQ-S19-005
- categoria: feliz
- dado: la fuente de tokens
- cuando: se ejecuta el generador
- entonces: tokens.css trae una variable --gx-* por cada token (por ejemplo --gx-accent: #FFCB04), tokens.json trae los mismos tokens y ambos archivos llevan la marca «Generado, no editar a mano»

### BEH-S19-003
- cubre: REQ-S19-006
- categoria: error
- dado: un cambio manual en tokens.css y otro en la fuente sin regenerar
- cuando: corre el paso de CI de tokens
- entonces: ambos casos fallan y el árbol regenerado pasa

### BEH-S19-004
- cubre: REQ-S19-007, REQ-S19-059, REQ-S19-008
- categoria: feliz
- dado: los tokens generados
- cuando: se leen las escalas de tipografía, espaciado, radio, sombra, movimiento, capa y quiebre
- entonces: coinciden con SUP-S19-003, SUP-S19-004 y SUP-S19-005, incluidos 16 px de base en panel, 28 en kiosco y 36 en tv

### BEH-S19-005
- cubre: REQ-S19-009, REQ-S19-060, REQ-S19-010, REQ-S19-067
- categoria: feliz
- dado: web-admin, kiosk y vitrina arrancados, y kiosk abierto además con ?superficie=tv
- cuando: se lee el atributo data-superficie de la etiqueta html de cada app
- entonces: web-admin trae panel, kiosk trae kiosco (y tv con el parámetro) y vitrina trae tv, y con cada valor la variable --gx-texto-base vale 16, 28 y 36 píxeles y --gx-tactil-minimo vale 44, 64 y 64

### BEH-S19-006
- cubre: REQ-S19-012, REQ-S19-061, REQ-S19-013, REQ-S19-075
- categoria: feliz
- dado: el repositorio y el CSS generado
- cuando: se listan los archivos de tipografía y las reglas @font-face
- entonces: existen los woff2 de Barlow (400, 500, 600, 700) y Barlow Condensed (600, 700) con su licencia OFL, cada regla apunta a un archivo propio de la ruta /fuentes con font-display swap y cada declaración de tipografía termina con system-ui, sans-serif

### BEH-S19-007
- cubre: REQ-S19-014, REQ-S19-015, REQ-S19-017
- categoria: error
- dado: el árbol, la CSP de S-01 y los diseños de las apps
- cuando: se buscan fonts.googleapis.com, fonts.gstatic.com, next/font/google y Bebas, y se leen style-src y font-src
- entonces: no hay ninguna coincidencia y style-src y font-src no mencionan Google

### BEH-S19-008
- cubre: REQ-S19-016, REQ-S19-062
- categoria: feliz
- dado: el service worker del kiosco
- cuando: se leen su nombre de caché y su lista de archivos
- entonces: el nombre de caché es la versión N+1, con N la que deja S-10, la lista incluye los woff2 y el logotipo y no incluye backgound.jpg ni adrenalina-gym-bg.png

### BEH-S19-009
- cubre: REQ-S19-018, REQ-S19-056, REQ-S19-058, REQ-S19-066, REQ-S19-074
- categoria: feliz
- dado: packages/design-system y packages/ui
- cuando: se listan los componentes, se busca el paquete ui y sus importaciones y se buscan las referencias en Dockerfile, globals.css, next.config.ts y package.json
- entonces: design-system exporta los 22 componentes de REQ-S19-018 y los 3 de feedback y selector de fechas, el formateador está en design-system/formato, packages/ui no existe y ningún archivo ni configuración nombra @gym-app/ui

### BEH-S19-010
- cubre: REQ-S19-019, REQ-S19-020, REQ-S19-021
- categoria: borde
- dado: Input, Select, Textarea, Checkbox, Tabla y EstadoVacio
- cuando: se lee su código fuente y su CSS
- entonces: Input, Select, Textarea y Checkbox definen los estados normal, foco, deshabilitado y error; Tabla y EstadoVacio definen vacío y cargando; y ningún componente contiene colores, tamaños de texto, espaciados, radios, sombras ni duraciones escritos a mano

### BEH-S19-011
- cubre: REQ-S19-022, REQ-S19-023
- categoria: feliz
- dado: un administrador con sesión y otra petición sin sesión
- cuando: se abre /diseno
- entonces: el administrador ve cada componente en cada estado y la petición sin sesión se rechaza

### BEH-S19-012
- cubre: REQ-S19-024, REQ-S19-025, REQ-S19-026, REQ-S19-027, REQ-S19-028, REQ-S19-073
- categoria: feliz
- dado: EstadoBadge con activo, por vencer, vencido y eliminado, y la pantalla con los colores en escala de grises
- cuando: se renderizan los cuatro estados
- entonces: muestran «✓ Activo» con good, «⚠ Por vencer» con warn, «✕ Vencido» con bad y «Eliminado» con muted, y en escala de grises los cuatro siguen distinguiéndose por su texto

### BEH-S19-013
- cubre: REQ-S19-029, REQ-S19-030
- categoria: feliz
- dado: la galería con navegación solo por teclado en cada superficie
- cuando: se recorren los elementos interactivos con Tab
- entonces: cada uno muestra un anillo de 2 píxeles con accent separado 2 píxeles y mide al menos 44 píxeles en panel y 64 en kiosco y tv

### BEH-S19-014
- cubre: REQ-S19-031, REQ-S19-057
- categoria: borde
- dado: un sistema con movimiento reducido activado y otro sin él
- cuando: se abre un Sheet y un Modal
- entonces: con movimiento reducido las transiciones duran 1 ms y no hay animación de entrada; sin él duran el valor del token de duración base (200 ms)

### BEH-S19-015
- cubre: REQ-S19-032, REQ-S19-033, REQ-S19-034, REQ-S19-035
- categoria: error
- dado: pares-contraste.json con los pares de SUP-S19-001, otro con un par que baja de su mínimo (texto 4,0 sobre fondo) y otro con un color inexistente
- cuando: se ejecuta tools/contraste.mjs
- entonces: el primero pasa mostrando cada contraste; el segundo termina con código distinto de cero nombrando el par y su contraste; el tercero falla nombrando el color inexistente

### BEH-S19-016
- cubre: REQ-S19-032
- categoria: borde
- dado: los pares conocidos de ADR-008: `#231F20` sobre `#FFCB04`, blanco sobre `#231F20`, `#B5AEAF` sobre `#231F20` y `#FF3B4E` sobre `#231F20`
- cuando: tools/contraste.mjs los calcula
- entonces: obtiene 10,7, 16,3, 7,5 y 4,6 redondeados a un decimal, y blanco sobre `#FF3B4E` da 3,5

### BEH-S19-017
- cubre: REQ-S19-036, REQ-S19-037, REQ-S19-038, REQ-S19-039, REQ-S19-040
- categoria: error
- dado: un archivo por cada tipo de coincidencia —un hexadecimal, un rgb(, un hsl(, un valor arbitrario de Tailwind, un font-family escrito, Bebas, fonts.googleapis.com y next/font/google—
- cuando: se ejecuta tools/verificar-diseno.mjs
- entonces: termina con código distinto de cero y nombra archivo, línea y coincidencia de cada uno

### BEH-S19-018
- cubre: REQ-S19-041, REQ-S19-063
- categoria: error
- dado: una exención que nombra un archivo inexistente, otra con una spec distinta de S-19, S-20 y S-21, otra sin spec y otra sin tope, y el árbol final con una exención de spec S-19
- cuando: se ejecuta tools/verificar-diseno.mjs
- entonces: rechaza las cuatro exenciones inválidas nombrando el motivo y falla por la exención S-19 que no debe quedar al terminar

### BEH-S19-019
- cubre: REQ-S19-042
- categoria: error
- dado: un pull request que agrega un color hexadecimal en un componente de web-admin
- cuando: corre el CI
- entonces: el paso de tools/verificar-diseno.mjs falla y queda en rojo

### BEH-S19-020
- cubre: REQ-S19-043, REQ-S19-044, REQ-S19-045, REQ-S19-046
- categoria: error
- dado: la carpeta de marca con sus siete archivos, public/branding de las tres apps sincronizado, y luego un archivo de public/branding alterado y otro ausente
- cuando: se ejecuta tools/sincronizar-marca.mjs en modo copia y en modo verificación
- entonces: el modo copia deja las tres carpetas iguales a la fuente; la verificación pasa con ellas iguales y falla nombrando el archivo alterado y el ausente

### BEH-S19-021
- cubre: REQ-S19-047, REQ-S19-048
- categoria: feliz
- dado: la configuración del negocio con el nombre «Adhara Fit»
- cuando: se abren el inicio de sesión, el panel, el kiosco y la vitrina
- entonces: cada pantalla muestra el logotipo horizontal negativo con el texto alternativo «Adhara Fit»

### BEH-S19-022
- cubre: REQ-S19-049, REQ-S19-050, REQ-S19-064, REQ-S19-065
- categoria: feliz
- dado: web-admin, kiosk y vitrina y el manifiesto del kiosco
- cuando: se leen sus favicon, íconos y manifiesto
- entonces: usan los archivos del kit, y el manifiesto dice «Adhara Fit — Acceso», «Adhara Fit», colores iguales al ground del tema y los íconos de 256 y 512 píxeles

### BEH-S19-023
- cubre: REQ-S19-051, REQ-S19-052
- categoria: feliz
- dado: el repositorio, el código del kiosco y su service worker
- cuando: se buscan backgound.jpg y backgound1.mp4 (archivos y referencias, como FondoVideo, la página principal, MarcoFicha y el service worker) y se mira el fondo
- entonces: ninguno existe ni se referencia y el fondo es el color ground con la marca de agua del isotipo, sin imágenes ni video

### BEH-S19-024
- cubre: REQ-S19-053
- categoria: feliz
- dado: el encabezado del panel en la superficie panel
- cuando: se renderiza el componente Reloj
- entonces: aparece arriba a la derecha del encabezado

### BEH-S19-025
- cubre: REQ-S19-054
- categoria: feliz
- dado: los archivos ok.json y error.json
- cuando: se extraen todos los colores de las animaciones
- entonces: solo aparecen los valores de good y bad del tema

### BEH-S19-026
- cubre: REQ-S19-055
- categoria: feliz
- dado: los diseños raíz de web-admin, kiosk y vitrina
- cuando: se lee la etiqueta html
- entonces: las tres declaran lang es-PE

### BEH-S19-028
- cubre: REQ-S19-013, REQ-S19-014, REQ-S19-016
- categoria: error
- dado: el kiosco instalado con su service worker y la red desconectada, y otra carga con las rutas /fuentes bloqueadas
- cuando: se abre la pantalla del kiosco y se muestran textos y el nombre de un miembro
- entonces: con la red desconectada los textos se ven con Barlow y Barlow Condensed desde la caché sin ninguna petición a un host externo; con las fuentes bloqueadas los textos se ven con system-ui y no se pierden ni se desbordan

### BEH-S19-029
- cubre: REQ-S19-068, REQ-S19-069
- categoria: borde
- dado: LogoMarca con la imagen ausente, con la imagen rota, con el nombre «Adhara Fit» y con un nombre de 41 y de 80 caracteres
- cuando: se renderiza en el encabezado del panel
- entonces: sin imagen o con la imagen rota muestra el nombre como texto; el nombre de hasta 40 caracteres se ve completo; los de 41 y 80 se truncan con puntos suspensivos en una línea y el atributo de título trae el nombre completo

### BEH-S19-030
- cubre: REQ-S19-070
- categoria: borde
- dado: un Modal y un Sheet abiertos desde un botón, con navegación solo por teclado
- cuando: se pulsa Tab repetidamente, Mayús+Tab desde el primer control y Escape
- entonces: el foco no sale del cuadro, Tab pasa del último control al primero, Escape lo cierra y el foco vuelve al botón que lo abrió; el elemento tiene role dialog y aria-modal verdadero

### BEH-S19-031
- cubre: REQ-S19-071, REQ-S19-072, REQ-S19-073
- categoria: error
- dado: un Field con error, una Tabla con datos, una Tabla vacía, una Tabla cargando y un Aviso de error
- cuando: se lee su marcado
- entonces: el control del Field tiene su etiqueta asociada, aria-invalid verdadero y aria-describedby que apunta al mensaje de error con texto; la Tabla tiene th con scope y caption; la vacía muestra EstadoVacio con role status; la que carga tiene aria-busy; el Aviso de error trae texto además de su color

### BEH-S19-032
- cubre: REQ-S19-076, REQ-S19-053
- categoria: feliz
- dado: el componente Reloj en el encabezado del panel
- cuando: se leen su clase y su CSS
- entonces: usa cifras tabulares, la variable del tamaño base y la variable muted, y está posicionado arriba a la derecha

### BEH-S19-033
- cubre: REQ-S19-054
- categoria: borde
- dado: los archivos ok.json y error.json con colores como arreglos RGBA de 0 a 1
- cuando: se convierten a hexadecimal redondeando cada canal a 0-255
- entonces: los colores resultantes son solo los de good y bad y ninguno es verde del cliente anterior

## 3. Invariantes

### INV-S19-001
- propiedad: todo par de texto y fondo declarado cumple su contraste mínimo
- mecanismo: lint
- deteccion: tools/contraste.mjs termina con código distinto de cero si algún par queda por debajo de su mínimo
- protege: REQ-S19-032, REQ-S19-033, REQ-S19-034

### INV-S19-002
- propiedad: ningún color ni fuente escritos a mano existen fuera de packages/theming
- mecanismo: lint
- deteccion: tools/verificar-diseno.mjs termina con código distinto de cero y lista archivo:línea y coincidencia
- protege: REQ-S19-036, REQ-S19-037, REQ-S19-038, REQ-S19-039, REQ-S19-040

### INV-S19-003
- propiedad: los tokens generados son siempre iguales a la fuente
- mecanismo: test-propiedad
- deteccion: sobre 50 temas generados con un generador congruencial lineal de semilla fija escrito en la prueba (20 colores válidos cada uno), el CSS y el JSON generados contienen exactamente los mismos valores que el tema y una segunda generación produce archivos idénticos byte a byte
- protege: REQ-S19-003, REQ-S19-004, REQ-S19-005, REQ-S19-006

### INV-S19-004
- propiedad: los archivos de marca de cada app son idénticos a la fuente
- mecanismo: lint
- deteccion: tools/sincronizar-marca.mjs en modo verificación termina con código distinto de cero si alguna suma SHA-256 difiere
- protege: REQ-S19-043, REQ-S19-044, REQ-S19-045, REQ-S19-046

### INV-S19-005
- propiedad: ningún estado ni error se comunica solo con color
- mecanismo: asercion-dominio
- deteccion: EstadoBadge, Field y Aviso no admiten un estado o un error sin texto; una prueba intenta crearlos con el texto vacío y falla, y comprueba que los cuatro estados de EstadoBadge tienen texto distinto
- protege: REQ-S19-024, REQ-S19-025, REQ-S19-026, REQ-S19-027, REQ-S19-028, REQ-S19-073

## 4. Criterios de aceptación

### AC-S19-001
- enlaza: REQ-S19-001, REQ-S19-002, REQ-S19-011, BEH-S19-001
- metodo: unitario
- procedimiento: importar temaAdhara y comparar sus 20 claves con la tabla de SUP-S19-001, y buscar con la API de typescript otros objetos de tipo Tema, lecturas de prefers-color-scheme y componentes de cambio de tema
- esperado: las 20 claves coinciden y no existe otro tema, lectura ni selector
- test: pendiente

### AC-S19-002
- enlaza: REQ-S19-003, REQ-S19-004, REQ-S19-005, REQ-S19-006, BEH-S19-002, BEH-S19-003, INV-S19-003
- metodo: unitario
- procedimiento: ejecutar el generador sobre temaAdhara y comprobar variables, valores y marca; alterar tokens.css a mano y alterar la fuente sin regenerar y ejecutar la comprobación del CI; repetir la generación sobre 50 temas con semilla fija
- esperado: las variables y valores coinciden, los dos casos alterados fallan, y los 50 temas generan archivos idénticos al repetirse
- test: pendiente

### AC-S19-003
- enlaza: REQ-S19-007, REQ-S19-059, REQ-S19-008, REQ-S19-009, REQ-S19-060, REQ-S19-010, REQ-S19-067, BEH-S19-004, BEH-S19-005
- metodo: unitario
- procedimiento: leer tokens.json y tokens.css y comparar las escalas con SUP-S19-003 a SUP-S19-006, buscar con la API de typescript el atributo data-superficie en el diseño raíz de web-admin, kiosk y vitrina, y renderizar el diseño raíz de kiosk con y sin el parámetro superficie=tv
- esperado: las escalas coinciden con los supuestos, cada app fija su superficie y kiosk elige tv solo con el parámetro
- test: pendiente

### AC-S19-004
- enlaza: REQ-S19-012, REQ-S19-061, REQ-S19-013, REQ-S19-075, REQ-S19-014, REQ-S19-015, REQ-S19-017, BEH-S19-006, BEH-S19-007
- metodo: unitario
- procedimiento: comprobar que existen los seis woff2 y la licencia, leer las reglas @font-face y las declaraciones de familia, buscar en el árbol los cuatro términos de Google y Bebas, y leer style-src y font-src de la CSP de S-01
- esperado: los archivos existen, las reglas apuntan a /fuentes con font-display swap, cada familia termina en system-ui y sans-serif, no hay coincidencias y la CSP no menciona Google
- test: pendiente

### AC-S19-005
- enlaza: REQ-S19-016, REQ-S19-062, BEH-S19-008
- metodo: unitario
- procedimiento: leer public/sw.js del kiosco, comparar su nombre de caché con la versión N que deja S-10 y comprobar su lista de archivos
- esperado: el nombre es la versión N+1, la lista incluye los woff2 y el logotipo y no incluye backgound.jpg ni adrenalina-gym-bg.png
- test: pendiente

### AC-S19-006
- enlaza: REQ-S19-018, REQ-S19-056, REQ-S19-058, REQ-S19-066, REQ-S19-074, BEH-S19-009
- metodo: unitario
- procedimiento: listar las exportaciones de packages/design-system y del formateador de formato, comprobar que packages/ui no existe, y buscar con la API de typescript y con búsqueda de texto @gym-app/ui y packages/ui en archivos de código, Dockerfile, globals.css, next.config.ts y package.json
- esperado: están los 25 componentes y el formateador con sus exportaciones, la carpeta ui no existe y no queda ninguna referencia
- test: pendiente

### AC-S19-007
- enlaza: REQ-S19-019, REQ-S19-020, REQ-S19-021, BEH-S19-010
- metodo: unitario
- procedimiento: buscar en el código de cada componente los nombres de estado (normal, foco, deshabilitado, error, vacío, cargando) y los literales de color, tamaño, espaciado, radio, sombra y duración
- esperado: cada componente de formulario define sus cuatro estados, los de datos sus dos, y no hay literales fuera de las variables --gx-*
- test: pendiente

### AC-S19-008
- enlaza: REQ-S19-022, REQ-S19-023, BEH-S19-011
- metodo: manual
- procedimiento: como administrador abrir /diseno en cada superficie, comprobar que están los 25 componentes en todos sus estados, abrir /diseno sin sesión y ejecutar el test de contrato de rutas de S-01
- esperado: se ven todos los componentes y estados, sin sesión se rechaza y /diseno figura como ruta con sesión que llama a exigirSesion
- test: pendiente

### AC-S19-009
- enlaza: REQ-S19-024, REQ-S19-025, REQ-S19-026, REQ-S19-027, REQ-S19-028, REQ-S19-073, BEH-S19-012, INV-S19-005
- metodo: unitario
- procedimiento: renderizar a texto estático con react-dom/server EstadoBadge con los cuatro estados, Field con error y Aviso de error, y leer ícono, texto y variable de color de su marcado; e intentar crear cada uno con el texto vacío
- esperado: los textos y variables de color son los de BEH-S19-012, los estados y errores sin texto fallan
- test: pendiente

### AC-S19-010
- enlaza: REQ-S19-029, REQ-S19-030, REQ-S19-031, REQ-S19-057, BEH-S19-013, BEH-S19-014
- metodo: manual
- procedimiento: en la galería de cada superficie recorrer los elementos con Tab midiendo el anillo y el área táctil con las herramientas del navegador, y abrir un Sheet y un Modal con movimiento reducido activado y sin activar
- esperado: el anillo es de 2 píxeles con accent y separación de 2, las áreas miden al menos 44 o 64 píxeles y las transiciones duran 1 ms con movimiento reducido y 200 ms sin él
- test: pendiente

### AC-S19-011
- enlaza: REQ-S19-032, REQ-S19-033, REQ-S19-034, REQ-S19-035, BEH-S19-015, BEH-S19-016, INV-S19-001
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/contraste.mjs con los pares de SUP-S19-014, con un par por debajo de su mínimo, con un color inexistente y con los cuatro pares conocidos de ADR-008
- esperado: los pares de SUP-S19-014 pasan (a 4,5 o a 3 según su mínimo), los dos inválidos fallan nombrando el motivo y los pares conocidos dan 10,7, 16,3, 7,5 y 4,6 (y 3,5 para blanco sobre rojo)
- test: pendiente

### AC-S19-012
- enlaza: REQ-S19-036, REQ-S19-037, REQ-S19-038, REQ-S19-039, REQ-S19-040, BEH-S19-017, INV-S19-002
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-diseno.mjs con un árbol por cada tipo de coincidencia y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con cada tipo nombrando archivo, línea y coincidencia, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S19-013
- enlaza: REQ-S19-041, REQ-S19-063, BEH-S19-018
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-diseno.mjs con las cuatro exenciones inválidas de BEH-S19-018 y con el árbol final que conserva una exención de spec S-19
- esperado: las cuatro se rechazan nombrando el motivo y la exención de S-19 hace fallar el árbol final
- test: pendiente

### AC-S19-014
- enlaza: REQ-S19-035, REQ-S19-042, REQ-S19-046, BEH-S19-019
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue un color hexadecimal en un componente de web-admin y mirar el resultado del CI; si la protección de main no está activa, mirar el estado de los pasos en la ejecución de la rama
- esperado: el paso de tools/verificar-diseno.mjs falla y su estado queda en rojo, y los pasos de contraste y de marca existen
- test: pendiente

### AC-S19-015
- enlaza: REQ-S19-043, REQ-S19-044, REQ-S19-045, REQ-S19-046, BEH-S19-020, INV-S19-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/sincronizar-marca.mjs en modo copia y en modo verificación con carpetas iguales, con un archivo alterado y con un archivo ausente
- esperado: la copia deja las carpetas iguales, y la verificación pasa con carpetas iguales y falla nombrando el archivo alterado y el ausente
- test: pendiente

### AC-S19-016
- enlaza: REQ-S19-047, REQ-S19-048, REQ-S19-049, BEH-S19-021, BEH-S19-022
- metodo: manual
- procedimiento: abrir el inicio de sesión, el panel, el kiosco y la vitrina y mirar el logotipo, el favicon y el texto alternativo con las herramientas del navegador
- esperado: cada pantalla muestra el logotipo horizontal negativo con el texto alternativo «Adhara Fit» y las apps usan el favicon y los íconos del kit
- test: pendiente

### AC-S19-017
- enlaza: REQ-S19-050, REQ-S19-064, REQ-S19-065, REQ-S19-051, REQ-S19-052, BEH-S19-022, BEH-S19-023
- metodo: unitario
- procedimiento: leer apps/kiosk/public/manifest.json y compararlo con tokens.json y con la lista de íconos del kit, comprobar que backgound.jpg y backgound1.mp4 no existen y buscar sus nombres en el código y en el service worker, e inspeccionar los estilos del kiosco en busca de imágenes y video de fondo
- esperado: el manifiesto tiene nombre, nombre corto, colores iguales al ground de tokens.json e íconos de 256 y 512; los dos archivos no existen ni se nombran; el fondo se define solo con tokens y la marca de agua
- test: pendiente

### AC-S19-018
- enlaza: REQ-S19-053, REQ-S19-076, REQ-S19-054, REQ-S19-055, BEH-S19-024, BEH-S19-025, BEH-S19-032, BEH-S19-033, BEH-S19-026
- metodo: unitario
- procedimiento: renderizar Reloj con react-dom/server y leer su clase, y leer su CSS para posición, cifras tabulares, variable de tamaño y variable de color; convertir los colores RGBA de 0 a 1 de ok.json y error.json a hexadecimal redondeando cada canal a 0-255; y leer el atributo lang del diseño raíz de las tres apps
- esperado: el reloj cumple lo indicado, los colores de las animaciones son solo good y bad y las tres apps declaran es-PE
- test: pendiente

### AC-S19-019
- enlaza: REQ-S19-013, REQ-S19-014, REQ-S19-016, BEH-S19-028
- metodo: manual
- procedimiento: instalar el kiosco, cargar la pantalla una vez con red, desconectar la red y recargar; después bloquear la ruta /fuentes con las herramientas del navegador y recargar
- esperado: sin red los textos se ven con Barlow desde la caché y sin peticiones externas; con las fuentes bloqueadas se ven con system-ui sin pérdida ni desborde
- test: pendiente

### AC-S19-020
- enlaza: REQ-S19-068, REQ-S19-069, BEH-S19-029
- metodo: unitario
- procedimiento: renderizar LogoMarca con react-dom/server con imagen ausente, imagen rota simulada y nombres de 8, 40, 41 y 80 caracteres, y leer el texto, el atributo de título y la clase de truncado
- esperado: sin imagen aparece el nombre como texto, los nombres de hasta 40 caracteres van completos y los de 41 y 80 llevan la clase de truncado con el título completo
- test: pendiente

### AC-S19-021
- enlaza: REQ-S19-070, BEH-S19-030
- metodo: manual
- procedimiento: en la galería abrir un Modal y un Sheet con el teclado y recorrer Tab, Mayús+Tab y Escape, y leer role y aria-modal con las herramientas del navegador
- esperado: el foco queda atrapado, Escape cierra, el foco vuelve al botón de origen y el elemento tiene role dialog y aria-modal verdadero
- test: pendiente

### AC-S19-022
- enlaza: REQ-S19-071, REQ-S19-072, BEH-S19-031
- metodo: unitario
- procedimiento: renderizar con react-dom/server Field con error, Tabla con datos, vacía y cargando, y Aviso de error, y leer el marcado
- esperado: etiqueta asociada, aria-invalid, aria-describedby al mensaje, th con scope, caption, role status y aria-busy según BEH-S19-031
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas en rojo del generador de tokens, del contraste, de la verificación de diseño y de la sincronización de marca; (2) `tools/contraste.mjs` y `tools/verificar-diseno.mjs` con `tools/verificar-diseno.exenciones.json` que lista los 12 archivos con colores escritos, los 5 con clases de paleta de Tailwind y los archivos con tipografías, con spec S-19 (o S-20 y S-21 para las apps de TV) y tope por archivo, que se achica en cada paso; (3) generador de `tokens.css` y `tokens.json`, `temaAdhara` con sus valores y `pares-contraste.json`, ajustando los tokens hasta que el contraste pase; (4) tipografías propias, reglas `@font-face`, CSP de S-01 y service worker del kiosco (cambio atómico de las tres apps); (5) `packages/design-system` con los componentes de `packages/ui` copiados y re-exportados desde `packages/ui`, sin cambiar los llamadores, y el formateador de fechas movido a `packages/design-system/formato/` con re-exportación desde la ruta anterior; (6) migrar las importaciones de `@gym-app/ui` a `@gym-app/design-system` por carpeta (92 archivos, un commit por app o paquete), junto con `Dockerfile`, los `Dockerfile` de `kiosk` y `vitrina`, los `globals.css`, los `next.config.ts` y los `package.json` (coordinar con S-17, dueño del despliegue), y retirar `packages/ui`; (7) componentes nuevos (`Select`, `Textarea`, `Checkbox`, `Field`, `Modal`, `Aviso`, `Tabla`, `EstadoVacio`, `Cargando`, `EstadoBadge`, `LogoMarca`) con sus estados y la galería `/diseno`; (8) recolorear Lottie, reemplazar los colores escritos por tokens archivo por archivo achicando las exenciones; (9) marca: carpeta `marca`, `tools/sincronizar-marca.mjs`, `LogoMarca` en inicio de sesión, panel, kiosco y vitrina, favicon, íconos y manifiesto; retiro de los archivos del cliente anterior y del fondo del kiosco; (10) `Reloj`; (11) pasos del CI.
- Las pruebas de propiedades usan un generador congruencial lineal de semilla fija escrito en la propia prueba; el contraste se calcula con la fórmula WCAG en TypeScript; no hay dependencias nuevas (SUP-S19-008). Las fuentes `Barlow` y `Barlow Condensed` se descargan una vez de su repositorio oficial con licencia OFL y se guardan en el repositorio.
- Las pruebas de marcado usan `react-dom/server` (ya incluido con React) para renderizar a texto estático; no calculan CSS, así que lo visual lo cubren los pasos manuales. AC-S19-008, AC-S19-010, AC-S19-014, AC-S19-016, AC-S19-019 y AC-S19-021 son pasos manuales del propietario o del operador (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar. Las bases y los kioscos instalados reciben la versión nueva del service worker con la caché nueva.
- **Enmiendas que se registran al aprobar S-19:**
  - S-01: SUP-S01-007 y su tabla de cabeceras quitan `https://fonts.googleapis.com` de `style-src` y `https://fonts.gstatic.com` de `font-src`.
  - S-10: SUP-S10-006 y REQ-S10 sobre `temaAdhara` quedan cumplidas: el tema cambia de valores; el nombre visible como texto pasa a `LogoMarca` con el nombre de la configuración.
  - S-00: el fallo de línea base de `vitrina` por Google Fonts queda resuelto; `.gitignore` y la lista de archivos obligatorios no cambian.
  - S-06 y S-10: el nombre de la caché del service worker del kiosco sube a la versión siguiente a la que deje S-10 (REQ-S19-062); S-10 REQ-S10-022 retira los archivos de marca anteriores y REQ-S19-051 solo agrega `backgound.jpg` y `backgound1.mp4`.
  - S-02 y S-12: el formateador único pasa de `packages/ui/formato/fechaHora.ts` a `packages/design-system/formato/fechaHora.ts` con las mismas exportaciones (REQ-S19-066).
  - S-17: el `Dockerfile`, los `Dockerfile` de `kiosk` y `vitrina` y los `next.config.ts` pasan de `packages/ui` a `packages/design-system`.
  - S-21: `kiosk-tv` abre la app `kiosk` con `?superficie=tv`.
  - S-05: `ConfiguracionNegocio.nombre` es el texto alternativo del logotipo.
  - `docs/00-indice.md`, `docs/08-decisiones-pendientes.md` (P-15 y la tipografía), `docs/design/README.md`, `COBERTURA-RF.md` (RNF-10) y `BACKLOG-SPECS.md`: nota de que S-19 instaló el sistema y la marca.
- **Traspasos:** S-20 y S-21 (consumen `tokens.json` y los tokens `tv`, y limpian sus exenciones), el propietario (PNG originales del kit, vectores, tipografía definitiva del logotipo) y una spec futura si cambia la tipografía.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Los PNG del kit no están en el repositorio y no son vectoriales: el logotipo puede verse borroso en pantallas grandes (TV). Mitigación: el kit incluye 2400 px; el propietario entrega los originales antes de implementar y los vectores cuando existan (ADR-020 §8).
- `warn`, `mutedDim` y `fieldEdge` son valores propuestos; si no pasan el contraste hay que ajustarlos. Mitigación: `tools/contraste.mjs` en el CI.
- Migrar 97 archivos de `@gym-app/ui` a `@gym-app/design-system` es un cambio amplio. Mitigación: re-exportación primero, commit por carpeta y typecheck en cada paso.
- Sin pruebas de navegador, la regresión visual solo se detecta a ojo. Mitigación: la galería `/diseno` y las revisiones manuales por superficie (AC-S19-008 y AC-S19-010).
- Los tamaños de texto de kiosco y TV son valores iniciales para 2 y 3 metros; el dispositivo real puede pedir otros. Mitigación: SUP-S19-004 los marca por validar y están en tokens, no en componentes.
- Quitar el fondo de imagen y video del kiosco cambia su aspecto. Mitigación: SUP-S19-011 y el contenido de la vitrina puede reponerlo.
- Que el estado «activo» sea amarillo y no verde es menos intuitivo (ADR-008 alternativa C). Mitigación: ícono ✓ y texto «Activo».
- Las apps de TV Android conservan colores y fuentes propios hasta S-20 y S-21. Mitigación: exención cerrada con tope.
- Las cifras de 0.4 cambian cuando las specs anteriores modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Aceptas los valores de color propuestos para los tokens nuevos (`warn` naranja `#FF9F1C`, `mutedDim`, `fieldEdge`), con la restricción de que el rojo y el gris atenuado solo se usen como texto sobre las dos superficies más oscuras? Default: sí (SUP-S19-001).
- ¿Aceptas que S-19 no redibuje el logotipo como SVG (te pedirá vectores) y que use los PNG del kit mientras tanto? Default: sí (SUP-S19-015).
- ¿Usamos `Barlow` y `Barlow Condensed` autoalojadas y quitamos `Bebas Neue` (aunque ADR-020 §6 decía mantener la tipografía del base) mientras no me des la tipografía del logotipo? Default: sí (SUP-S19-003).
- ¿Los tamaños de texto de kiosco y TV de la propuesta sirven para empezar y se afinan en el dispositivo real? Default: sí (SUP-S19-004).
- ¿Las apps no suman librerías de terceros para los componentes ni el catálogo, y el catálogo es la página `/diseno`? Default: sí (SUP-S19-008).
- ¿El fondo del kiosco pasa a ser el color de la marca con el isotipo de marca de agua, sin imágenes ni video? Default: sí (SUP-S19-011).
- ¿Me entregas los PNG originales del kit de logotipo en el repositorio antes de implementar? Default: sí; hasta entonces se usan los de 2400 px.
## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura, sin ejecutar `spec-lint`), 2026-11-12, sobre el primer borrador. Veredicto global: **REQUIERE CAMBIOS**. Resumen fiel:

> | # | Comprobación | Veredicto | Hallazgo principal |
> |---|---|---|---|
> | 1 | Cabecera y ADR | CUMPLE | `depende_de` omitía S-06 y S-23 |
> | 2 | REQ | NO CUMPLE (menor) | REQ-007, 009, 012, 016, 050 y 053 compuestos; orígenes dudosos de 014, 015 y 017 (la tipografía sin Bebas se aparta de ADR-020 §6); REQ-010 incluía las apps de TV; REQ-053 y 054 no eran esenciales |
> | 3 | Cobertura | CUMPLE con reparos | INV-002 prometía más de lo que detecta la herramienta; REQ-023 solo manual |
> | 4 | AC | NO CUMPLE | AC «unitarios» que leían CSS calculado; AC-005 ambiguo con la versión del service worker; la cifra de 200 ms sin REQ; los pares de contraste sin enumerar; Lottie sin conversión |
> | 5 | Hechos | NO CUMPLE (menor) | 97 contaba también `package.json` y `next.config.ts` (92 importan); conteos sin patrón; usos reales de los recursos retirados sin citar |
> | 6 | Vaguedad, dependencias y alcance | NO CUMPLE | desviación de ADR-020 §8 sin declarar; el formateador de S-02 vive en `packages/ui`; `RelojLima` de S-10; REQ-051 repetía a REQ-S10-022 |
> | 7 | Escenarios | NO CUMPLE | fuentes sin conexión, rutas estables, logotipo ausente, nombre largo, fuente no cargada, actualización del service worker, teclado en Modal y Sheet, accesibilidad de Field y Tabla |
> | 8 | Lint | NO VERIFICABLE | revisión manual sin hallazgos |
> | 9 | Contrastes | CUMPLE en ADR-008; NO CUMPLE en pares derivados | `bad` y `mutedDim` no llegan a 4,5 sobre `surface2` y `surfaceElevada`; `pares-contraste.json` sin enumerar |
> | 10 | Contraste con ADR y specs | NO CUMPLE | exenciones limitadas a las apps de TV frente a su uso en el plan; manifiesto con hexadecimales; `kiosk-tv` es la misma app `kiosk`; `Dockerfile`, `globals.css`, `next.config.ts` y `package.json` sin pasos; clases de paleta de Tailwind sin detectar; respaldo del logotipo negativo |

### Conciliación del autor
Los hallazgos se verificaron contra el Repo A, las specs y un cálculo propio de contraste con `python3` (`FondoVideo.tsx:50,54`, `sw.js:6-15`, 92 importaciones reales, 50 colores en `.ts`, `.tsx` y `.css`, 29 clases de paleta en 5 archivos, y los contrastes de ADR-008 y de SUP-S19-001) y resultaron ciertos; ninguno se rechazó. La cifra de «50 colores en 12 archivos» sí se reproduce con el alcance `.ts`, `.tsx` y `.css`; la del revisor (46) usaba otro alcance. La spec pasó de 58 REQ a 76, de 26 BEH a 33, de 5 INV a 5 y de 18 AC a 22.

| Fila | Corrección |
|---|---|
| 1 | `depende_de` suma S-06 y S-23 |
| 2 | REQ divididos (007/059, 009/060, 012/061, 016/062, 050/064/065, 053/076); orígenes a RNF-03 y SUP-S19-003 (desviación de ADR-020 §6 declarada y con pregunta); REQ-010 solo para las tres apps web y REQ-067 para `?superficie=tv`; REQ-053, 054 y 076 pasan a SHOULD |
| 3 | INV-002 acotado a colores y fuentes (REQ-021 se comprueba por AC-007); REQ-023 clasifica `/diseno` en el test de contrato; INV-005 amplía a Field y Aviso |
| 4 | AC de marcado con `react-dom/server` y pasos manuales para lo visual; AC-005 «versión N+1»; los 200 ms ligados al token de duración base; SUP-S19-014 enumera los pares de contraste; SUP-S19-013 define la conversión de Lottie |
| 5 | 0.4: 92 importaciones, patrón de cada conteo, usos reales de los recursos retirados y de las referencias a `packages/ui` |
| 6 | SUP-S19-015 declara la desviación de ADR-020 §8 con pregunta; REQ-066 y 5.2 reubican el formateador y enmiendan S-02 y S-12; REQ-056 parte del árbol posterior a S-10 (`RelojLima`); REQ-051 solo agrega `backgound.jpg` y `backgound1.mp4` |
| 7 | BEH-028 a BEH-033 y AC-019 a AC-022: fuentes sin conexión, respaldo `system-ui`, logotipo ausente y nombre largo, teclado en Modal y Sheet, `aria` en Field y Tabla; SUP-S19-016 a SUP-S19-018 |
| 9 | SUP-S19-001 restringe `bad` y `mutedDim` como texto a `ground` y `surface`; SUP-S19-014 incluye el anillo de foco y los íconos de estado |
| 10 | REQ-041 y REQ-063 permiten exenciones temporales de spec S-19 que deben quedar vacías; SUP-S19-019 fija extensiones, clases de paleta y comprobación del manifiesto contra `tokens.json`; REQ-074 y el paso 6 cubren `Dockerfile`, `globals.css`, `next.config.ts` y `package.json` con S-17; REQ-067 resuelve la superficie `tv` en `kiosk`; SUP-S19-009 aclara el respaldo del logotipo negativo |
