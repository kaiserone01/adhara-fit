# Convenciones de pantalla para las apps de TV (Check-in y Vitrina)

Reglas de distribución y proporciones. Se aplican a todo lo que se dibuje en `apps/checkin` y `apps/vitrina`. Contexto de las apps: `docs/ops/apps-android-tv.md`.

## 1. El televisor de referencia

Las dos apps corren en el mismo modelo: **TCL 50V6C** (Serie V6C).

| Dato | Valor |
|---|---|
| Sistema | Google TV (Android 12), Chromecast integrado, Play Store |
| Pantalla | 50 pulgadas, panel HVA Direct LED, ángulo de visión > 178° |
| Resolución | 4K UHD 3840×2160 a 60 Hz (relación **16:9**) |
| Memoria | 2 GB de RAM y 16 GB de almacenamiento (unos 9–10 GB libres) |
| Conectividad | Wi-Fi de doble banda 802.11ac, Bluetooth 5.4, Ethernet RJ-45 |
| Puertos | 3× HDMI 2.1, 1–2× USB, salida óptica, antena/cable |
| Otras | Dolby Vision / HDR10+, 2 altavoces (16–20 W), VESA 200×200, 111,1 × 64,4 cm sin base |

Consecuencias de diseño: siempre **horizontal 16:9**; poca RAM (2 GB), por eso los videos se limitan a 1080p H.264 aunque la pantalla sea 4K; la app se usa a varios metros, así que el texto debe ser grande.

## 2. Lienzo y unidades

- Lienzo de diseño: **1920×1080 px CSS** (el WebView de Google TV de un panel 4K suele reportar 1920×1080 con factor de escala 2).
- Todo se mide en **`rem`**: `1rem = 16 px` a 1920×1080. El tamaño base está en `globals.css` de cada app: `html { font-size: clamp(3px, min(0.8333vw, <1.5|1.3>vh), 32px) }`, de modo que toda la interfaz crece o se encoge con la pantalla y siempre cabe completa (limita por ancho **y** por alto).
- Regla: no usar `px` fijos para tamaños de la interfaz; usar `rem`, porcentajes o `vw`/`vh`. Todo elemento nuevo se prueba a 1920×1080 y a 960×540.
- **Celular (solo para probar):** el mínimo de `3px` deja que un celular pequeño muestre la pantalla completa, por proporción. Es una aproximación: la prioridad es el TV. No se añade ningún ajuste que dañe la vista del TV para favorecer al celular.

## 3. Cartelera (Vitrina)

- **Una pieza por diapositiva, estrictamente.** No hay columnas, franjas de entrenadores ni sobreimpresos de la app: el diseño (texto, precios, fotos) va dentro de la pieza gráfica.
- Una sola pestaña en el panel (Configuraciones → Vitrina): lista de piezas en orden + ajustes (duración general y transición). Marco de previsualización 16:9.
- **Pieza gráfica recomendada: 1920×1080 (16:9).** Se muestra entera (`contain`); si no es 16:9, queda con franjas del color de fondo, nunca recortada.
- Imagen: JPG, PNG o WebP hasta 8 MB (el navegador la comprime a WebP de máximo 1920 px). Video: **MP4 H.264**, máximo 1920×1080 (sin 4K ni HEVC), hasta 100 MB; con sonido solo si se activa. Un video avanza a la siguiente pieza al terminar.
- Duración por defecto de cada diapositiva: 12 s (rango 3–300 s, ajustable por pieza). Las piezas pueden programarse con «Mostrar desde / hasta».
- Márgenes seguros dentro de la pieza: dejar el contenido importante a por lo menos 5 % de cada borde (96 px a los lados, 54 px arriba y abajo) porque algunos televisores recortan los bordes. Texto dentro de la pieza: mínimo 48 px a 1080p para leerlo a 3 m.
- Los ítems antiguos (entrenadores, promos, productos de la versión anterior) siguen existiendo: se muestran como cualquier otra pieza, solo con su imagen o video, sin textos ni precios sobrepuestos.

## 4. Check-in

- Ficha del socio completa y centrada en 16:9, con tamaños en `rem`; teclado numérico USB con Num Lock. Reposo con frases e imagen configurables desde el panel (menú Check-in).
- Misma regla de `rem`: la ficha debe caber entera a 1920×1080 y a 960×540.
- Imagen: negro y amarillo Adhara (`#ffcb04`) sobre el video de fondo con velo oscuro. Reposo: titular, campo del documento, ficha con avatar, frase, Hora y Fecha, y píldora «Presiona Enter para ingresar». Sin sede ni datos inventados. Efectos solo con CSS (transform/opacity), sin WebGL, y apagados con `prefers-reduced-motion`. Código: `apps/checkin/components/{FondoAmbiental,CampoIdentificador,IndicadorIngreso,FichaReposo}.tsx`.

## 5. Versión visible

Las dos apps muestran, en la esquina inferior derecha y muy discreta (`v1.0.N`, 12 px a 1080p, 40 % de opacidad, sin interacción), la **versión de la interfaz que se está mostrando**. La fija el build con `NEXT_PUBLIC_APP_VERSION` (el workflow la pone igual a `versionName`); tras una autoactualización OTA muestra la del bundle nuevo, aunque el APK instalado sea más viejo. En local muestra `vdev`. Código: `packages/ota/EtiquetaVersion.tsx`.
