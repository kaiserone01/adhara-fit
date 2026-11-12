---
id: S-19
estado: en-revision
adrs: ADR-008, ADR-012, ADR-016, ADR-020, ADR-021
depende_de: S-00, S-01, S-02, S-05, S-10
aprobada_por:
fecha_aprobacion:
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
- Retiro de los recursos gráficos del cliente anterior y de Bebas Neue.
- `tools/contraste.mjs` (contraste AA de los pares declarados), `tools/verificar-diseno.mjs` (sin colores ni fuentes sueltos) y `tools/sincronizar-marca.mjs`, con sus pasos en el CI.
- Accesibilidad: foco visible, estado no solo por color, contraste AA, movimiento reducido y tamaños táctiles.
- Diseño del reloj del panel (tokens y posición).
- Actualización de la CSP de S-01 y del service worker del kiosco por las fuentes propias.

### 0.3 Fuera de alcance
- Contenido y diseño de los carteles de la vitrina y de la pantalla de check-in en TV: S-20 y S-21 (consumen los tokens de S-19).
- Las apps Android de TV (`kiosk-tv`, `vitrina-tv`: identificadores, lanzadores, íconos nativos): S-20 y S-21; S-19 solo entrega `tokens.json`.
- Vectorizar el logotipo: el kit recibido no es vectorial (ADR-020 §8); mientras el propietario no entregue vectores se usan los PNG.
- Un tema claro o un cambio de tema por el usuario: el tema es fijo y oscuro (ADR-008).
- Catálogo con Storybook u otras herramientas de terceros (SUP-S19-008).
- Texto de marketing, ilustraciones y fotografías.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-19 recibirá después de S-00 a S-18, S-22 y S-23; se recontarán al empezar.
- **Tema actual:** `packages/theming/tokens.ts` (49 líneas) define la interfaz `Tema` con 20 claves (`ground`, `surface`, `surface2`, `surfaceElevada`, `edge`, `fieldBg`, `fieldEdge`, `fieldEdgeHover`, `ink`, `muted`, `mutedDim`, `accent`, `accentInk`, `good`, `goodInk`, `warn`, `warnInk`, `bad`, `badInk`, `scrim`) y un tema verde `temaAdrenalinaXtreme` (acento `#93e83a`); `ThemeStyleTag.tsx` lo emite como variables CSS; 6 archivos importan `@gym-app/theming` (verificado con `Read` y `grep -rIl`).
- **Paquetes de UI:** `packages/design-system` solo tiene `package.json`; `packages/ui` tiene 16 componentes (`Avatar`, `Badge`, `BottomTabBar`, `Button`, `Card`, `CurrencyInput`, `FeedbackDesdeUrl`, `FeedbackOverlay`, `Input`, `InputFecha`, `LogoBadge`, `PageHeader`, `RelojYTasa`, `SelectorRangoFechas`, `Sheet`, `Sidebar`), estilos (`campos.css`, `marca-agua.css`, `selector-fecha.css`) y animaciones `lottie/ok.json` y `error.json`; 97 archivos importan `@gym-app/ui` (verificado con `ls` y `grep -rIl`).
- **Colores sueltos:** 50 colores hexadecimales en 12 archivos de `apps` y `packages`, sin contar `packages/db` (verificado con `grep -rIoh`).
- **Tipografías:** `Bebas Neue`, `Barlow` y `Barlow Condensed` se cargan en tiempo de ejecución desde `https://fonts.googleapis.com` en `apps/web-admin/app/layout.tsx:25` y `apps/kiosk/app/layout.tsx:24`, y con `next/font/google` en `apps/vitrina/app/layout.tsx:2-9`; aparecen en 12 archivos; el build de `vitrina` falla sin acceso a Google (S-00 §5.3); la CSP de S-01 (SUP-S01-007) permite `fonts.googleapis.com` y `fonts.gstatic.com` (verificado con `grep -rIn` y en las specs).
- **Marca anterior:** `apps/kiosk/public/branding/` tiene `adrenalina-gym-bg.png`, `logo-adrenalina-gym.jpg`, `backgound.jpg`, `backgound1.mp4` y `placeholder-profile.jpg`; `apps/kiosk/public/manifest.json` dice «Check-in Gym» con fondo y tema `#000000` y los íconos `icon-192.png` e `icon-512.png`; `apps/web-admin/public/branding` y `apps/vitrina/public/branding` existen (verificado con `ls` y `Read`).
- **Kit del propietario:** `docs/design/origen-logotipo/` contiene `LEEME-kit-logotipo.txt` y `favicon-adhara-fit.ico`; el LEEME lista logotipo horizontal en color, negativo y monocromo, isotipo en color, positivo y negativo, íconos de 1024, 512, 256, 128, 64 y 32 píxeles y logotipos de 2400, 1200 y 600 píxeles, con los colores `#231F20`, `#FFCB04` y `#FFFFFF`; los PNG no están en este repositorio (verificado con `ls` y `Read`); el original no es vectorial (ADR-020).
- **Decisiones previas:** ADR-008 fija la paleta, el contraste medido (`#231F20` sobre `#FFCB04` 10,7:1; blanco sobre `#231F20` 16,3:1; `#B5AEAF` sobre `#231F20` 7,5:1; `#FF3B4E` sobre `#231F20` 4,6:1), el estado «activo» en amarillo con ícono y texto, y el tema fijo; ADR-020 pide tokens como única fuente, componentes con estados, variantes por superficie, verificación de persistencia por lint o CI y deja la tipografía por validar; S-10 renombra el tema a `temaAdhara` sin cambiar colores, muestra el nombre del negocio como texto sin logo y deja a S-19 el diseño del reloj; S-00 deja a S-19 autoalojar las fuentes; S-01 fija la CSP con `style-src` y `font-src` que incluyen Google (verificado con `Read` y `grep -n`).
- No verificado: el contenido y los colores de las animaciones Lottie, el contenido de `backgound.jpg` y `backgound1.mp4`, y el contraste de los pares nuevos (`warn`, `mutedDim`, `fieldEdge`) hasta que `tools/contraste.mjs` los calcule.

### 0.5 Supuestos
- SUP-S19-001: el tema se llama `temaAdhara`, conserva las 20 claves de `Tema` y sus nombres CSS `--gx-*` para no tocar los archivos que los usan, y cambia sus valores a: `ground` `#0F0D0E`, `surface` `#231F20`, `surface2` `#2E292A`, `surfaceElevada` `#342E2F`, `edge` `#3D3738`, `fieldBg` `#181415`, `fieldEdge` `#8A8283`, `fieldEdgeHover` `#B5AEAF`, `ink` `#FFFFFF`, `muted` `#B5AEAF`, `mutedDim` `#8F8889`, `accent` `#FFCB04`, `accentInk` `#231F20`, `good` `#FFCB04`, `goodInk` `#231F20`, `warn` `#FF9F1C`, `warnInk` `#231F20`, `bad` `#FF3B4E`, `badInk` `#231F20` y `scrim` `rgba(15, 13, 14, 0.7)`. Los valores de `ground` a `bad` de ADR-008 son los medidos; los demás son propuestas que `tools/contraste.mjs` valida y, si no llegan al mínimo, se ajustan hasta pasar. Default: esos valores; asumido, por validar.
- SUP-S19-002: el estado «activo» usa `good`, que vale lo mismo que el acento amarillo, con el ícono ✓ y el texto «Activo»; «por vencer» usa `warn` con ⚠ y el texto; «vencido» usa `bad` con ✕ y el texto; «eliminado» usa `muted` con el texto (ADR-008 y RNF-10). Default: esos estados; asumido, por validar.
- SUP-S19-003: la tipografía de texto es `Barlow` (400, 500, 600 y 700) y la de títulos y rótulos del kiosco y la TV es `Barlow Condensed` (600 y 700), ambas con licencia OFL, subconjunto latino, formato `woff2`, `font-display: swap` y como respaldo `system-ui, sans-serif`; `Bebas Neue` se retira. Es la tipografía del base menos Bebas Neue, que ADR-020 §6 mantiene hasta que el propietario la valide; el logotipo usa una sans humanista en negrita aún sin identificar. Default: esas familias; asumido, por validar.
- SUP-S19-004: los tamaños de texto en píxeles son: `panel` 12, 14, 16, 18, 20, 24 y 32 (base 16); `kiosco` base 28, grande 36, extragrande 48, estado 64 y nombre 96; `tv` base 36, grande 48, extragrande 64 y título 96. Los de kiosco y TV son valores iniciales para leerse a 2 y 3 metros que se confirman en el dispositivo real. Default: esas escalas; asumido, por validar.
- SUP-S19-005: espaciado en múltiplos de 4 píxeles (0, 4, 8, 12, 16, 24, 32, 48 y 64), radios de 4, 8, 12 y 9999, tres sombras, movimiento de 120, 200 y 320 ms con la curva `cubic-bezier(0.2, 0, 0, 1)`, capas 0, 10, 20, 30, 40 y 50 (base, desplegable, fija, superposición, modal y aviso) y puntos de quiebre de 640, 768, 1024 y 1280 píxeles. Default: esos valores; asumido, por validar.
- SUP-S19-006: las superficies se seleccionan con el atributo `data-superficie` (`panel`, `kiosco` o `tv`) en la etiqueta `html`, que cambia la escala de texto, el tamaño mínimo táctil y la densidad. Los tamaños táctiles mínimos son 44 píxeles en `panel` y 64 en `kiosco` y `tv`. Default: ese mecanismo; asumido, por validar.
- SUP-S19-007: con la preferencia de movimiento reducido del sistema, las duraciones valen 1 ms y no hay animaciones de entrada. Default: respetar la preferencia; asumido, por validar.
- SUP-S19-008: no se agregan dependencias de terceros para el catálogo ni para las primitivas: los componentes son propios, el catálogo es una galería en la ruta `/diseno` del panel que muestra cada componente en todos sus estados, y la accesibilidad se verifica con el contraste calculado, la revisión manual y la navegación por teclado. Default: sin dependencias; asumido, por validar (ADR-020 §9).
- SUP-S19-009: la marca se guarda una sola vez en `packages/design-system/marca/` con los nombres `logo-horizontal-color.png`, `logo-horizontal-negativo.png`, `logo-monocromo-negativo.png`, `isotipo-color.png`, `icon-512.png`, `icon-256.png` y `favicon.ico`, y `tools/sincronizar-marca.mjs` los copia a `public/branding` de cada app; el propietario entrega los PNG del kit antes de implementar. El logotipo sobre fondo oscuro es el horizontal negativo. Default: esa organización; asumido, por validar.
- SUP-S19-010: el manifiesto del kiosco dice `name` «Adhara Fit — Acceso» y `short_name` «Adhara Fit», con `background_color` y `theme_color` iguales a `ground`, y usa los íconos de 256 y 512 píxeles del kit. Default: esos valores; asumido, por validar.
- SUP-S19-011: el fondo del kiosco deja de usar imágenes y video de fondo del cliente anterior y pasa a ser el color `ground` con la marca de agua del isotipo (`marca-agua.css`); si el propietario quiere un fondo propio, se agrega después como contenido de la vitrina. Default: fondo por tokens; asumido, por validar.
- SUP-S19-012: el reloj del panel se muestra arriba a la derecha del encabezado, con la fuente de texto en cifras tabulares, el tamaño base de la superficie y el color `muted`, con la hora de S-10 y el formateador de S-02. Default: ese diseño; asumido, por validar.
- SUP-S19-013: las animaciones Lottie `ok` y `error` se recolorean con los colores `good` y `bad` del tema. Default: recolorearlas; asumido, por validar.

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
- texto: Los tokens de tipografía deberán definir las familias, los pesos y las escalas de tamaño de SUP-S19-003 y SUP-S19-004 para cada superficie.

### REQ-S19-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los tokens de espaciado, radio, sombra, movimiento, capa y punto de quiebre deberán tener los valores de SUP-S19-005.

### REQ-S19-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El atributo data-superficie de la etiqueta html con el valor panel, kiosco o tv deberá seleccionar la escala de texto y el tamaño táctil mínimo de esa superficie.

### REQ-S19-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: Cada app deberá fijar su data-superficie: web-admin en panel, kiosk en kiosco, y vitrina y las apps de TV en tv.

### REQ-S19-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: El tema deberá ser fijo y oscuro, sin cambio de tema ni lectura de la preferencia de color del sistema.

### REQ-S19-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Las tipografías Barlow y Barlow Condensed deberán estar en el repositorio como archivos woff2 del subconjunto latino junto con su licencia OFL.

### REQ-S19-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Las apps deberán cargar las tipografías de archivos propios con @font-face y font-display swap.

### REQ-S19-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Ninguna app deberá cargar tipografías, hojas de estilo ni scripts de fonts.googleapis.com, fonts.gstatic.com ni next/font/google.

### REQ-S19-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La política de contenido de S-01 no deberá permitir fonts.googleapis.com ni fonts.gstatic.com.

### REQ-S19-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El service worker del kiosco deberá guardar en su caché los archivos de tipografía y subir el nombre de su caché de versión.

### REQ-S19-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: La tipografía Bebas Neue no deberá usarse en ninguna app.

### REQ-S19-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: packages/design-system deberá contener los componentes Button, Input, Select, Textarea, Checkbox, Field, InputFecha, MontoInput, Card, EstadoBadge, PageHeader, Sidebar, BottomTabBar, Sheet, Modal, Aviso, Tabla, EstadoVacio, Cargando, Avatar, LogoMarca y Reloj.

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
- origen: ADR-020
- texto: La galería /diseno deberá exigir una sesión válida de un administrador activo.

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
- texto: Los archivos de apps y packages, salvo packages/theming, node_modules, .next, out, generated, las pruebas y las exenciones cerradas, no deberán contener colores hexadecimales, rgb(, rgba(, hsl( ni valores arbitrarios de color de Tailwind.

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
- texto: Cada entrada de tools/verificar-diseno.exenciones.json deberá nombrar un archivo existente de las apps de TV, la spec que lo limpia (S-20 o S-21) y un tope de coincidencias.

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
- texto: El manifiesto del kiosco deberá tener el nombre «Adhara Fit — Acceso», el nombre corto «Adhara Fit», background_color y theme_color iguales al ground del tema y los íconos de 256 y 512 píxeles del kit.

### REQ-S19-051
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los archivos adrenalina-gym-bg.png, logo-adrenalina-gym.jpg, backgound.jpg y backgound1.mp4 no deberán existir en el repositorio.

### REQ-S19-052
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S19-011
- texto: El fondo del kiosco deberá usar el color ground y la marca de agua del isotipo, sin imágenes ni video de fondo.

### REQ-S19-053
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S19-012
- texto: El componente Reloj deberá mostrarse arriba a la derecha del encabezado del panel con cifras tabulares, el tamaño base de la superficie y el color muted.

### REQ-S19-054
- tipo: ubicuo
- prioridad: MUST
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
- texto: Los 16 componentes de packages/ui deberán migrarse a packages/design-system.

### REQ-S19-058
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El paquete packages/ui no deberá existir al terminar la migración.

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
- cubre: REQ-S19-007, REQ-S19-008
- categoria: feliz
- dado: los tokens generados
- cuando: se leen las escalas de tipografía, espaciado, radio, sombra, movimiento, capa y quiebre
- entonces: coinciden con SUP-S19-003, SUP-S19-004 y SUP-S19-005, incluidos 16 px de base en panel, 28 en kiosco y 36 en tv

### BEH-S19-005
- cubre: REQ-S19-009, REQ-S19-010
- categoria: feliz
- dado: web-admin, kiosk y vitrina arrancados
- cuando: se lee el atributo data-superficie de la etiqueta html de cada app
- entonces: web-admin trae panel, kiosk trae kiosco y vitrina trae tv, y con cada valor la variable --gx-texto-base vale 16, 28 y 36 píxeles y --gx-tactil-minimo vale 44, 64 y 64

### BEH-S19-006
- cubre: REQ-S19-012, REQ-S19-013
- categoria: feliz
- dado: el repositorio y el CSS generado
- cuando: se listan los archivos de tipografía y las reglas @font-face
- entonces: existen los woff2 de Barlow (400, 500, 600, 700) y Barlow Condensed (600, 700) con su licencia OFL, y cada regla apunta a un archivo propio con font-display swap

### BEH-S19-007
- cubre: REQ-S19-014, REQ-S19-015, REQ-S19-017
- categoria: error
- dado: el árbol, la CSP de S-01 y los diseños de las apps
- cuando: se buscan fonts.googleapis.com, fonts.gstatic.com, next/font/google y Bebas, y se leen style-src y font-src
- entonces: no hay ninguna coincidencia y style-src y font-src no mencionan Google

### BEH-S19-008
- cubre: REQ-S19-016
- categoria: feliz
- dado: el service worker del kiosco
- cuando: se leen su nombre de caché y su lista de archivos
- entonces: el nombre de caché es posterior a kiosco-shell-v6 y la lista incluye los woff2 y el logotipo

### BEH-S19-009
- cubre: REQ-S19-018, REQ-S19-056, REQ-S19-058
- categoria: feliz
- dado: packages/design-system y packages/ui
- cuando: se listan los componentes y se busca el paquete ui y sus importaciones
- entonces: design-system exporta los 22 componentes de REQ-S19-018, packages/ui no existe y ningún archivo importa @gym-app/ui

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
- cubre: REQ-S19-024, REQ-S19-025, REQ-S19-026, REQ-S19-027, REQ-S19-028
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
- entonces: con movimiento reducido las transiciones duran 1 ms y no hay animación de entrada; sin él duran 200 ms

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
- cubre: REQ-S19-041
- categoria: error
- dado: una exención que nombra un archivo inexistente, otra fuera de las apps de TV, otra sin spec y otra sin tope
- cuando: se ejecuta tools/verificar-diseno.mjs
- entonces: rechaza las cuatro exenciones inválidas nombrando el motivo

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
- cubre: REQ-S19-049, REQ-S19-050
- categoria: feliz
- dado: web-admin, kiosk y vitrina y el manifiesto del kiosco
- cuando: se leen sus favicon, íconos y manifiesto
- entonces: usan los archivos del kit, y el manifiesto dice «Adhara Fit — Acceso», «Adhara Fit», colores iguales al ground del tema y los íconos de 256 y 512 píxeles

### BEH-S19-023
- cubre: REQ-S19-051, REQ-S19-052
- categoria: feliz
- dado: el repositorio y la pantalla del kiosco
- cuando: se buscan los cuatro archivos del cliente anterior y se mira el fondo
- entonces: ninguno existe y el fondo es el color ground con la marca de agua del isotipo, sin imágenes ni video

### BEH-S19-024
- cubre: REQ-S19-053
- categoria: feliz
- dado: el encabezado del panel en las superficies panel
- cuando: se renderiza el componente Reloj
- entonces: aparece arriba a la derecha con cifras tabulares, tamaño base de 16 píxeles y color muted

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
- protege: REQ-S19-021, REQ-S19-036, REQ-S19-037, REQ-S19-038, REQ-S19-039, REQ-S19-040

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
- propiedad: ningún estado se comunica solo con color
- mecanismo: asercion-dominio
- deteccion: EstadoBadge no admite un estado sin texto; una prueba intenta crear cada estado con el texto vacío y falla, y comprueba que los cuatro estados tienen texto distinto
- protege: REQ-S19-024, REQ-S19-025, REQ-S19-026, REQ-S19-027, REQ-S19-028

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
- enlaza: REQ-S19-007, REQ-S19-008, REQ-S19-009, REQ-S19-010, BEH-S19-004, BEH-S19-005
- metodo: unitario
- procedimiento: leer tokens.json y tokens.css y comparar las escalas con SUP-S19-003 a SUP-S19-006, y buscar con la API de typescript el atributo data-superficie en el diseño raíz de cada app
- esperado: las escalas coinciden con los supuestos y cada app fija su superficie
- test: pendiente

### AC-S19-004
- enlaza: REQ-S19-012, REQ-S19-013, REQ-S19-014, REQ-S19-015, REQ-S19-017, BEH-S19-006, BEH-S19-007
- metodo: unitario
- procedimiento: comprobar que existen los seis woff2 y la licencia, leer las reglas @font-face, buscar en el árbol los cuatro términos de Google y Bebas, y leer style-src y font-src de la CSP de S-01
- esperado: los archivos existen, las reglas apuntan a archivos propios con font-display swap, no hay coincidencias y la CSP no menciona Google
- test: pendiente

### AC-S19-005
- enlaza: REQ-S19-016, BEH-S19-008
- metodo: unitario
- procedimiento: leer public/sw.js del kiosco y comparar su nombre de caché con kiosco-shell-v6 y su lista de archivos con los woff2 y el logotipo
- esperado: el nombre es posterior y la lista incluye los archivos
- test: pendiente

### AC-S19-006
- enlaza: REQ-S19-018, REQ-S19-056, REQ-S19-058, BEH-S19-009
- metodo: unitario
- procedimiento: listar las exportaciones de packages/design-system, comprobar que packages/ui no existe y buscar importaciones de @gym-app/ui con la API de typescript
- esperado: están los 22 componentes, la carpeta ui no existe y no hay importaciones
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
- procedimiento: como administrador abrir /diseno en cada superficie, comprobar que están los 22 componentes en todos sus estados, y abrir /diseno sin sesión
- esperado: se ven todos los componentes y estados, y sin sesión se rechaza
- test: pendiente

### AC-S19-009
- enlaza: REQ-S19-024, REQ-S19-025, REQ-S19-026, REQ-S19-027, REQ-S19-028, BEH-S19-012, INV-S19-005
- metodo: unitario
- procedimiento: renderizar EstadoBadge con los cuatro estados y leer ícono, texto y color, e intentar crear cada estado con el texto vacío; además, en el navegador con escala de grises, mirar los cuatro estados
- esperado: los textos y colores son los de BEH-S19-012, los estados sin texto fallan y en grises se distinguen
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
- procedimiento: ejecutar las pruebas de tools/contraste.mjs con el manifiesto real, con un par por debajo de su mínimo, con un color inexistente y con los cuatro pares conocidos de ADR-008
- esperado: el real pasa, los dos inválidos fallan nombrando el motivo y los pares conocidos dan 10,7, 16,3, 7,5 y 4,6 (y 3,5 para blanco sobre rojo)
- test: pendiente

### AC-S19-012
- enlaza: REQ-S19-036, REQ-S19-037, REQ-S19-038, REQ-S19-039, REQ-S19-040, BEH-S19-017, INV-S19-002
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-diseno.mjs con un árbol por cada tipo de coincidencia y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con cada tipo nombrando archivo, línea y coincidencia, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S19-013
- enlaza: REQ-S19-041, BEH-S19-018
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-diseno.mjs con las cuatro exenciones inválidas de BEH-S19-018
- esperado: las cuatro se rechazan nombrando el motivo
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
- enlaza: REQ-S19-050, REQ-S19-051, REQ-S19-052, BEH-S19-022, BEH-S19-023
- metodo: unitario
- procedimiento: leer apps/kiosk/public/manifest.json, comprobar que los cuatro archivos del cliente anterior no existen y buscar imágenes y video de fondo en los estilos y componentes del kiosco
- esperado: el manifiesto tiene los valores de REQ-S19-050, los archivos no existen y el fondo se define solo con tokens y la marca de agua
- test: pendiente

### AC-S19-018
- enlaza: REQ-S19-053, REQ-S19-054, REQ-S19-055, BEH-S19-024, BEH-S19-025, BEH-S19-026
- metodo: unitario
- procedimiento: renderizar Reloj en la superficie panel y leer su posición, fuente, tamaño y color; extraer los colores de ok.json y error.json; y leer el atributo lang del diseño raíz de las tres apps
- esperado: el reloj cumple lo indicado, los colores de las animaciones son good y bad y las tres apps declaran es-PE
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas en rojo del generador de tokens, del contraste, de la verificación de diseño y de la sincronización de marca; (2) `tools/contraste.mjs` y `tools/verificar-diseno.mjs` con `tools/verificar-diseno.exenciones.json` que lista los 12 archivos con colores escritos y los 12 con tipografías, tope por archivo, que se achica en cada paso; (3) generador de `tokens.css` y `tokens.json`, `temaAdhara` con sus valores y `pares-contraste.json`, ajustando los tokens hasta que el contraste pase; (4) tipografías propias, reglas `@font-face`, CSP de S-01 y service worker del kiosco (cambio atómico de las tres apps); (5) `packages/design-system` con los componentes de `packages/ui` copiados y re-exportados desde `packages/ui`, sin cambiar los llamadores; (6) migrar las importaciones de `@gym-app/ui` a `@gym-app/design-system` por carpeta (97 archivos, un commit por app o paquete) y retirar `packages/ui`; (7) componentes nuevos (`Select`, `Textarea`, `Checkbox`, `Field`, `Modal`, `Aviso`, `Tabla`, `EstadoVacio`, `Cargando`, `EstadoBadge`, `LogoMarca`) con sus estados y la galería `/diseno`; (8) recolorear Lottie, reemplazar los colores escritos por tokens archivo por archivo achicando las exenciones; (9) marca: carpeta `marca`, `tools/sincronizar-marca.mjs`, `LogoMarca` en inicio de sesión, panel, kiosco y vitrina, favicon, íconos y manifiesto; retiro de los archivos del cliente anterior y del fondo del kiosco; (10) `Reloj`; (11) pasos del CI.
- Las pruebas de propiedades usan un generador congruencial lineal de semilla fija escrito en la propia prueba; el contraste se calcula con la fórmula WCAG en TypeScript; no hay dependencias nuevas (SUP-S19-008). Las fuentes `Barlow` y `Barlow Condensed` se descargan una vez de su repositorio oficial con licencia OFL y se guardan en el repositorio.
- AC-S19-008, AC-S19-010, AC-S19-014 y AC-S19-016 son pasos manuales del propietario o del operador (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar. Las bases y los kioscos instalados reciben la versión nueva del service worker con la caché nueva.
- **Enmiendas que se registran al aprobar S-19:**
  - S-01: SUP-S01-007 y su tabla de cabeceras quitan `https://fonts.googleapis.com` de `style-src` y `https://fonts.gstatic.com` de `font-src`.
  - S-10: SUP-S10-006 y REQ-S10 sobre `temaAdhara` quedan cumplidas: el tema cambia de valores; el nombre visible como texto pasa a `LogoMarca` con el nombre de la configuración.
  - S-00: el fallo de línea base de `vitrina` por Google Fonts queda resuelto; `.gitignore` y la lista de archivos obligatorios no cambian.
  - S-06: `kiosco-shell-v6` sube de versión (REQ-S19-016).
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
- ¿Aceptas los valores de color propuestos para los tokens nuevos (`warn` naranja `#FF9F1C`, `mutedDim`, `fieldEdge`), sujetos a que pasen el contraste? Default: sí (SUP-S19-001).
- ¿Usamos `Barlow` y `Barlow Condensed` autoalojadas y quitamos `Bebas Neue` mientras no me des la tipografía del logotipo? Default: sí (SUP-S19-003).
- ¿Los tamaños de texto de kiosco y TV de la propuesta sirven para empezar y se afinan en el dispositivo real? Default: sí (SUP-S19-004).
- ¿Las apps no suman librerías de terceros para los componentes ni el catálogo, y el catálogo es la página `/diseno`? Default: sí (SUP-S19-008).
- ¿El fondo del kiosco pasa a ser el color de la marca con el isotipo de marca de agua, sin imágenes ni video? Default: sí (SUP-S19-011).
- ¿Me entregas los PNG originales del kit de logotipo en el repositorio antes de implementar? Default: sí; hasta entonces se usan los de 2400 px.
