---
id: S-10
estado: en-revision
adrs: ADR-003, ADR-007, ADR-011, ADR-016, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-22
aprobada_por:
fecha_aprobacion:
---
# S-10 — Retirar lo venezolano: tasa de cambio, padrón de Excel, bolívares, hora de Caracas y la marca anterior

## 0. Contexto y alcance

### 0.1 Problema
El código heredado nació para otro negocio, en Venezuela: convierte dólares a bolívares con una tasa del BCV que un proceso aparte (`worker`) actualiza, mantiene un espejo de un Excel del cliente anterior (padrón, `MiembroReferencia`, `PadronHoja`, menú «Excel»), marca a los miembros que vienen del Excel como «por regularizar», formatea importes en bolívares, calcula días en hora de Caracas y lleva el nombre, los colores y los logos de otro gimnasio. Adhara Fit es un solo negocio en Perú con una sola moneda (PEN): el propietario decidió «sacar lo venezolano», sin dólares ni bolívares, sin padrón y sin importador de miembros (ADR-003 y ADR-007, aceptados). S-00 ya deja fuera la copia de `worker`, `kiosk-host`, los scripts de `packages/db`, `migracion-excel/` y todo archivo `zipgym`; S-02 y S-03 dejaron en listas de exenciones los archivos que S-10 retira. S-10 elimina lo que queda dentro del código importado y comprueba que no vuelva.

### 0.2 Dentro de alcance
- Tasa de cambio: la tabla `TasaCambio`, `Pago.tasaCambio`, `Pago.montoBs`, `Sucursal.tasaCambioUSD`, los casos de uso, la entidad, el puerto y los repositorios de la tasa, `BcvApiAdapter`, `estadoTasa`, `ObtenerTasaVigente`, `SincronizarTasas`, `ListarHistoricoTasas`, `RegistrarTasaManual`, las rutas `api/tasa-cambio` y `api/tasa-cambio/historial`, `lib/tasaBcv.ts`, `tasaBcvFija.ts`, `productos/tasaActual.ts`, los tres scripts de `apps/web-admin/scripts` sobre la tasa, `ModalHistorialTasas`, `RelojYTasaConHistorial` y `RelojYTasa` (queda un reloj con hora de Lima, sin tasa).
- Padrón de Excel: las tablas `MiembroReferencia` y `PadronHoja`, `ActivarMiembroDesdePadron`, `EditarMiembroReferencia`, `filtrarFilasPadron`, `padronExcel`, `formatoCeldaPadron`, `saltoFila`, `lib/activacion.ts`, `miembros/ActivarDesdeExcel.tsx`, `activarDesdeExcelAction`, la carpeta `configuraciones/excel` y su pestaña, y sus puertos, entidades, repositorios y pruebas.
- Las columnas `Miembro.porRegularizar` y `Miembro.vieneDelExcel` y todas las ramas y avisos que las leen («Por regularizar»).
- Bolívares: `formatearBs`, `FichaReposo.tsx` y todo texto, ayuda o ejemplo en bolívares o con la tasa.
- Hora de Caracas: `fechaCaracas.ts` y su prueba, y toda referencia a `America/Caracas`.
- Marca anterior: el nombre «Adrenalina Xtreme Gym» en títulos, textos y alternativas de imagen, `temaAdrenalinaXtreme` (pasa a `temaAdhara`), los logos `logo-adrenalina-gym.jpg` y `escudo.png`, y los textos de ayuda que citen al cliente anterior. El nombre visible pasa a «Adhara Fit» con un rótulo de texto; los colores, la tipografía y el logo definitivo son de S-19.
- La dependencia `xlsx` de `packages/db/package.json` y cualquier otra de hojas de cálculo.
- `tools/verificar-venezuela.mjs` con su paso en el CI; vaciar las exenciones de la familia S-10 de las listas de S-02, S-03, S-04, S-07 y S-08.

### 0.3 Fuera de alcance
- La copia de `worker`, `kiosk-host`, los scripts de `packages/db`, `migracion-excel/` y los archivos `zipgym`: ya la excluye S-00.
- El importador de miembros: descartado por el propietario (S-16). Los miembros existentes se cargan a mano.
- Los métodos de pago venezolanos (pago móvil, BioPago, Zelle, Binance, Punto): ya los retira S-03; S-10 solo comprueba que no quede ninguno.
- Los colores, la tipografía, los componentes y el logo definitivo de Adhara Fit: S-19 (ADR-008 y ADR-020).
- El seed y el baseline: S-15.
- Las apps `vitrina-tv` y `kiosk-tv` más allá de los textos y alternativas de imagen: S-20 y S-21.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-10 recibirá después de S-00 a S-09 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next`, `packages/db`, `apps/worker` y `apps/kiosk-host`, salvo donde se indica.
- **Tasa de cambio:** 70 archivos `.ts`, `.tsx`, `.json`, `.mjs` y `.js` mencionan `TasaCambio`, `tasaCambio`, `orquestadorTasa`, `estadoTasa`, `BcvApi`, `ConvertirMontoUSDaVES`, `RegistrarTasaManual`, `ModalHistorialTasas`, `RelojYTasa`, `tasaBcvFija` o `tasa-cambio` (verificado con `grep -rIlE`); el esquema tiene `model TasaCambio` (`schema.prisma:528`), `Pago.tasaCambio` (`:285`), `Pago.montoBs` (`:286`) y `Sucursal.tasaCambioUSD` (`:44`, «fallback manual si la API BCV falla»); los archivos son `PrismaTasaCambioRepository.ts`, `TasaCambio.ts`, `ITasaCambioRepository.ts`, `ObtenerTasaVigente.ts`, `SincronizarTasas.ts`, `ListarHistoricoTasas.ts`, `RegistrarTasaManual.ts`, `estadoTasa.ts`, `exchange-rate/BcvApiAdapter.ts`, `ui/components/RelojYTasa.tsx`, `web-admin/lib/tasaBcv.ts`, `(panel)/tasaBcvFija.ts`, `(panel)/RelojYTasaConHistorial.tsx`, `(panel)/ModalHistorialTasas.tsx`, `(panel)/productos/tasaActual.ts`, `api/tasa-cambio/route.ts`, `api/tasa-cambio/historial/route.ts` y tres scripts `verificar-tasa-bcv.ts`, `verificar-historial-tasa-bcv.ts` y `poblar-historico-tasa-bcv.ts` (verificado con `find`).
- **Padrón de Excel:** 28 archivos mencionan `MiembroReferencia`, `PadronHoja`, `padron`, `padrón`, `ActivarMiembroDesdePadron`, `filtrarFilasPadron` o `activacion` (verificado con `grep -rIlE`); el esquema tiene `model MiembroReferencia` (`:613`) y `model PadronHoja` (`:657`); `configuraciones/excel/` tiene `ExcelGrid.tsx`, `FilaHoja.tsx`, `PanelFiltros.tsx`, `actions.ts`, `page.tsx` y `tiposGrid.ts`, además de `miembros/ActivarDesdeExcel.tsx`, `padronExcel.ts`, `formatoCeldaPadron.ts`, `filtrarFilasPadron.ts` y `ActivarMiembroDesdePadron.ts` con sus pruebas (verificado con `find`). `registrarCheckIn` ya no activa desde el padrón por S-06 (REQ-S06-029).
- **«Por regularizar»:** 24 archivos mencionan `porRegularizar`, `vieneDelExcel` o «Por regularizar» (verificado con `grep -rIlE`); `ActualizarMiembro.ts:80-90,123` tiene ramas `vieneDelExcel`.
- **Bolívares:** 58 archivos mencionan `formatearBs`, `Bs`, `montoBs`, `VES` o «bolívar» (verificado con `grep -rIlE`; incluye `\bBs\b` como palabra).
- **Hora de Caracas:** 25 archivos mencionan «Caracas», entre ellos `fechaCaracas.ts` (16 apariciones) y su prueba (19), `PrismaTurnoRepository.ts` (6, lo retira S-08), `cambioPlanCalculo.ts` (6, lo reescribe S-07) y `ListarEnSala.ts` (4) (verificado con `grep -rc Caracas`).
- **Marca anterior:** 9 archivos mencionan «Adrenalina», «ZipGym» o equivalentes: `kiosk/components/MarcoFicha.tsx:39`, `kiosk/app/layout.tsx:6,14,29`, `kiosk/lib/tonos.ts:3,12`, `web-admin/app/login/page.tsx:88`, `web-admin/app/(panel)/EncabezadoSidebar.tsx:9`, `web-admin/app/layout.tsx:4,7,12,30`, `vitrina/components/PantallaMarca.tsx:6`, `vitrina/app/layout.tsx:5,12,18` y `packages/theming/tokens.ts:24,28` (identificador `temaAdrenalinaXtreme`) (verificado con `grep -rnE`).
- **Dependencias:** `xlsx` figura en `packages/db/package.json:29` (S-00 §0.4); ningún `package.json` de `apps` ni de otros `packages` la declara (verificado con `grep -n "xlsx\|exceljs"`).
- **Interacción con specs aprobadas:** S-00 excluye `worker`, `kiosk-host`, los scripts de `packages/db`, `migracion-excel/` y los `zipgym` (SUP-S00-001, S-00 §0.2); S-01 deja la retirada de las rutas `tasa-cambio` y de `registrarTasaManualAction` a las specs de ADR-003 (S-01 §0.3); S-02 deja en exención `formatearBs.ts` y `FichaReposo.tsx` y conserva `medianocheLimaDeFechaUtc` para el padrón; S-03 define la familia S-10 como `*Tasa*`, `formatearBs*`, `ConvertirMontoUSDaVES*`, `padron*` y `ModalHistorialTasas*`; S-04 y S-05 dejan a S-10 las columnas de tasa y el aviso «Por regularizar» (verificado con `grep -n` en las specs).
- No verificado: que las apps `kiosk-tv` y `vitrina-tv` no contengan los términos fuera de los de la lista, el contenido de los 9 archivos de marca más allá de las líneas citadas y que ningún otro `package.json` de los workspaces importados declare librerías de Excel.

### 0.5 Supuestos
- SUP-S10-001: no se conserva ningún dato ni función de la tasa de cambio, ni siquiera como referencia: todos los importes son PEN (ADR-003, ADR-011). Default: eliminar todo; decisión del propietario; asumido, por validar.
- SUP-S10-002: el encabezado del panel conserva un reloj con la hora de Lima (12 horas, SUP-S02) y deja de mostrar la tasa y su historial. Default: reloj sin tasa; asumido, por validar.
- SUP-S10-003: los miembros existentes de Adhara se cargan a mano, uno por uno; no hay importador ni padrón (S-16 descartada). Default: sin importador; decisión del propietario; asumido, por validar su alcance.
- SUP-S10-004: `Miembro.porRegularizar` y `vieneDelExcel` se eliminan porque su única fuente era el Excel; un miembro inscrito antes de hoy se registra con su fecha de inscripción y su primer cobro puede llevar cualquier fecha pasada (S-04). Default: eliminar ambas; asumido, por validar.
- SUP-S10-005: el nombre visible es «Adhara Fit» como rótulo de texto en el título, el encabezado, el inicio de sesión, el kiosco y la vitrina, y no se usa ningún logo hasta que el propietario entregue el definitivo (S-19). Default: rótulo de texto; asumido, por validar.
- SUP-S10-006: `temaAdrenalinaXtreme` pasa a `temaAdhara` conservando sus valores de color actuales hasta S-19, que fija los colores `#231F20`, `#FFCB04` y `#FFFFFF` y los tokens `--gx-*` (ADR-008). Default: renombrar sin cambiar colores; asumido, por validar.
- SUP-S10-007: la ausencia de bolívares y de tasa se comprueba por una lista cerrada de términos y no por una búsqueda de la palabra «Bs»; la palabra aislada produciría falsos positivos con identificadores sin relación. Default: lista cerrada; asumido, por validar.
- SUP-S10-008: los archivos de `apps/web-admin/scripts` sobre la tasa se eliminan y el directorio `scripts` queda con `verificar-autorizacion.ts`, que S-05 y S-01 conservan. Default: ese resultado; asumido, por validar.

## 1. Requisitos

### REQ-S10-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: El esquema no deberá contener la tabla TasaCambio.

### REQ-S10-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: La tabla Pago no deberá tener las columnas tasaCambio ni montoBs.

### REQ-S10-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: La tabla Sucursal no deberá tener la columna tasaCambioUSD.

### REQ-S10-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: La entidad, el puerto y los repositorios de TasaCambio, BcvApiAdapter y los casos de uso ObtenerTasaVigente, SincronizarTasas, ListarHistoricoTasas, RegistrarTasaManual y ConvertirMontoUSDaVES, y la utilidad estadoTasa, no deberán existir.

### REQ-S10-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Las rutas api/tasa-cambio y api/tasa-cambio/historial y la acción registrarTasaManualAction no deberán existir.

### REQ-S10-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Los archivos tasaBcv, tasaBcvFija, tasaActual, ModalHistorialTasas, RelojYTasaConHistorial y RelojYTasa, y los tres scripts de la tasa en apps/web-admin/scripts, no deberán existir.

### REQ-S10-007
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-002
- texto: El encabezado del panel deberá mostrar un reloj con la hora de Lima en formato de 12 horas y ninguna tasa de cambio.

### REQ-S10-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: El esquema no deberá contener las tablas MiembroReferencia y PadronHoja.

### REQ-S10-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: Los archivos ActivarMiembroDesdePadron, EditarMiembroReferencia, filtrarFilasPadron, padronExcel, formatoCeldaPadron, saltoFila y lib/activacion y sus pruebas no deberán existir.

### REQ-S10-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: Las entidades, los puertos y los repositorios de MiembroReferencia y de PadronHoja no deberán existir.

### REQ-S10-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: La carpeta configuraciones/excel, su pestaña, el componente ActivarDesdeExcel y la acción activarDesdeExcelAction no deberán existir.

### REQ-S10-012
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-004
- texto: La tabla Miembro no deberá tener las columnas porRegularizar ni vieneDelExcel.

### REQ-S10-013
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-004
- texto: Ningún caso de uso, pantalla ni reporte deberá leer, escribir o mostrar porRegularizar, vieneDelExcel ni el aviso «Por regularizar».

### REQ-S10-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Los archivos formatearBs y su prueba no deberán existir.

### REQ-S10-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Ningún texto, ayuda, ejemplo ni mensaje de las pantallas deberá mencionar bolívares, la tasa de cambio, el BCV, dólares ni Venezuela.

### REQ-S10-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Los archivos fechaCaracas y su prueba no deberán existir.

### REQ-S10-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-005
- texto: El título de la aplicación, el encabezado del panel, el inicio de sesión, el kiosco y la vitrina deberán mostrar el nombre «Adhara Fit» como rótulo de texto.

### REQ-S10-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-005
- texto: Los logos logo-adrenalina-gym y escudo y todo texto alternativo o de ayuda que nombre al cliente anterior no deberán existir.

### REQ-S10-019
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-006
- texto: El identificador temaAdrenalinaXtreme deberá llamarse temaAdhara y conservar sus valores de color hasta S-19.

### REQ-S10-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: Ningún package.json de apps ni de packages deberá declarar la dependencia xlsx ni otra librería de hojas de cálculo.

### REQ-S10-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos TasaCambio, tasaCambio, tasaCambioUSD, montoBs, orquestadorTasa, estadoTasa, BcvApi, ConvertirMontoUSDaVES, RegistrarTasaManual, ModalHistorialTasas, RelojYTasa, tasaBcv, formatearBs, MiembroReferencia, PadronHoja, ActivarMiembroDesdePadron, filtrarFilasPadron, porRegularizar, vieneDelExcel, fechaCaracas, America/Caracas, Adrenalina ni temaAdrenalinaXtreme.

### REQ-S10-022
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-venezuela.mjs encuentra alguno de los términos de REQ-S10-021, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S10-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-venezuela.mjs en cada pull request.

### REQ-S10-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las listas de exenciones de verificar-dinero, verificar-fechas, verificar-pagos, verificar-plan y verificar-caja no deberán contener archivos de la familia S-10 al terminar la spec.


### REQ-S10-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: El archivo FichaReposo no deberá mostrar ni formatear bolívares.

### REQ-S10-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Ningún archivo de apps ni de packages deberá contener la zona America/Caracas.
## 2. Comportamiento
- no_aplica: concurrencia — S-10 solo retira código, columnas y texto; no agrega operaciones con estado compartido ni escrituras simultáneas.

### BEH-S10-001
- cubre: REQ-S10-001, REQ-S10-002, REQ-S10-003
- categoria: feliz
- dado: el esquema final
- cuando: se consultan las tablas y las columnas de Pago y de Sucursal
- entonces: no existe TasaCambio, Pago no tiene tasaCambio ni montoBs y Sucursal no tiene tasaCambioUSD

### BEH-S10-002
- cubre: REQ-S10-004, REQ-S10-005, REQ-S10-006
- categoria: feliz
- dado: el código final
- cuando: se buscan las entidades, puertos, repositorios, casos de uso, utilidades, rutas, acciones, archivos y scripts de la tasa
- entonces: no existe ninguno y api/tasa-cambio y api/tasa-cambio/historial responden 404

### BEH-S10-003
- cubre: REQ-S10-007
- categoria: feliz
- dado: el panel con un socio a las 15:30 de Lima
- cuando: se abre cualquier pantalla del panel
- entonces: el encabezado muestra «3:30 p. m.» y ninguna tasa ni historial de tasas

### BEH-S10-004
- cubre: REQ-S10-008, REQ-S10-010
- categoria: feliz
- dado: el esquema y el código finales
- cuando: se consultan las tablas, las entidades, los puertos y los repositorios del padrón
- entonces: no existen MiembroReferencia ni PadronHoja ni nada que los use

### BEH-S10-005
- cubre: REQ-S10-009, REQ-S10-011
- categoria: feliz
- dado: el árbol final
- cuando: se buscan los siete archivos del padrón con sus pruebas, la carpeta de Excel, la pestaña, el componente y la acción
- entonces: no existe ninguno y /configuraciones/excel responde 404

### BEH-S10-006
- cubre: REQ-S10-012, REQ-S10-013
- categoria: feliz
- dado: el esquema final y el panel con un miembro inscrito hace 3 meses
- cuando: se consultan las columnas de Miembro, se abre la ficha, la lista y el reporte, y se registra su primer cobro con fecha de hace 3 meses
- entonces: Miembro no tiene porRegularizar ni vieneDelExcel, ninguna pantalla muestra «Por regularizar» y el cobro se registra con las reglas de S-04

### BEH-S10-007
- cubre: REQ-S10-014, REQ-S10-015, REQ-S10-025
- categoria: feliz
- dado: el panel, el kiosco y la vitrina
- cuando: se revisan todos los textos, ayudas y mensajes y la pantalla de reposo
- entonces: ninguno menciona bolívares, la tasa, el BCV, dólares ni Venezuela, formatearBs y su prueba no existen y FichaReposo no formatea bolívares

### BEH-S10-008
- cubre: REQ-S10-016, REQ-S10-026
- categoria: feliz
- dado: el árbol final
- cuando: se busca fechaCaracas, su prueba y la zona America/Caracas
- entonces: los archivos no existen y la zona no aparece en ningún archivo

### BEH-S10-009
- cubre: REQ-S10-017, REQ-S10-018, REQ-S10-019
- categoria: feliz
- dado: el panel, el inicio de sesión, el kiosco y la vitrina
- cuando: se abren y se busca el nombre del cliente anterior, sus logos y el identificador del tema
- entonces: todas muestran «Adhara Fit» como rótulo de texto, los dos logos no existen, ningún texto alternativo nombra al cliente anterior y el tema se llama temaAdhara con los mismos colores que tenía

### BEH-S10-010
- cubre: REQ-S10-020
- categoria: feliz
- dado: los package.json de las apps y los packages importados
- cuando: se busca xlsx y librerías de hojas de cálculo
- entonces: ninguno las declara

### BEH-S10-011
- cubre: REQ-S10-021, REQ-S10-022
- categoria: error
- dado: un archivo por cada uno de los veintidós términos de REQ-S10-021 y un archivo con la palabra Bs sola y con el identificador absoluto
- cuando: se ejecuta tools/verificar-venezuela.mjs
- entonces: falla y nombra archivo, línea y término de cada uno de los veintidós, y no marca la palabra Bs sola ni absoluto

### BEH-S10-012
- cubre: REQ-S10-023
- categoria: error
- dado: un pull request que agrega tasaCambio en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-venezuela.mjs falla y queda en rojo

### BEH-S10-013
- cubre: REQ-S10-024
- categoria: feliz
- dado: las listas de exenciones de verificar-dinero, verificar-fechas, verificar-pagos, verificar-plan y verificar-caja
- cuando: se ejecutan sus pruebas de lista
- entonces: ninguna entrada nombra un archivo de la familia S-10 (`*Tasa*`, `formatearBs*`, `ConvertirMontoUSDaVES*`, `padron*`, `ModalHistorialTasas*`, `fechaCaracas*`)

### BEH-S10-014
- cubre: REQ-S10-006, REQ-S10-007
- categoria: borde
- dado: un navegador en la zona de Tokio y otro en la de Lima
- cuando: se abre el panel a las 00:10 de Lima
- entonces: ambos muestran «12:10 a. m.» con el día de Lima, porque el reloj usa la zona America/Lima y no la del navegador

## 3. Invariantes

### INV-S10-001
- propiedad: el sistema no contiene ninguna función, dato ni pantalla de conversión de moneda ni de tasa: todo importe es PEN
- mecanismo: restriccion-bd
- deteccion: el esquema no contiene TasaCambio, Pago.tasaCambio, Pago.montoBs ni Sucursal.tasaCambioUSD; la consulta de esquema devuelve 0 filas
- protege: REQ-S10-001, REQ-S10-002, REQ-S10-003

### INV-S10-002
- propiedad: ninguna operación del sistema depende de un Excel, de un padrón ni de una marca de «por regularizar»
- mecanismo: restriccion-bd
- deteccion: el esquema no contiene MiembroReferencia, PadronHoja, Miembro.porRegularizar ni Miembro.vieneDelExcel; la consulta de esquema devuelve 0 filas
- protege: REQ-S10-008, REQ-S10-012

### INV-S10-003
- propiedad: ningún archivo de apps ni packages contiene los términos de lo venezolano ni de la marca anterior
- mecanismo: lint
- deteccion: tools/verificar-venezuela.mjs termina con código distinto de cero y lista archivo:línea y término de cada coincidencia
- protege: REQ-S10-021, REQ-S10-022

### INV-S10-004
- propiedad: el reloj del panel muestra siempre la hora de Lima, igual con cualquier zona del navegador
- mecanismo: test-propiedad
- deteccion: 200 instantes generados con semilla fija alrededor de las 00:00 y las 12:00 de Lima, probados con TZ=UTC, America/Lima y Asia/Tokyo; el texto del reloj debe ser igual al formato de 12 horas de Lima del instante
- protege: REQ-S10-007

## 4. Criterios de aceptación

### AC-S10-001
- enlaza: REQ-S10-001, REQ-S10-002, REQ-S10-003, REQ-S10-008, REQ-S10-010, REQ-S10-012, BEH-S10-001, BEH-S10-004, INV-S10-001, INV-S10-002
- metodo: sql
- procedimiento: consultar el esquema final por las tablas TasaCambio, MiembroReferencia y PadronHoja y por las columnas Pago.tasaCambio, Pago.montoBs, Sucursal.tasaCambioUSD, Miembro.porRegularizar y Miembro.vieneDelExcel; buscar con la API de typescript las entidades, puertos y repositorios del padrón
- esperado: nada de eso existe
- test: pendiente

### AC-S10-002
- enlaza: REQ-S10-004, REQ-S10-005, REQ-S10-006, REQ-S10-009, REQ-S10-011, BEH-S10-002, BEH-S10-005
- metodo: integracion
- procedimiento: buscar los archivos, casos de uso, utilidades, acciones, componentes y scripts retirados, y pedir api/tasa-cambio, api/tasa-cambio/historial y /configuraciones/excel con la sesión de un socio
- esperado: no existe ninguno y las tres peticiones responden 404
- test: pendiente

### AC-S10-003
- enlaza: REQ-S10-007, BEH-S10-003, BEH-S10-014, INV-S10-004
- metodo: unitario
- procedimiento: probar el reloj del encabezado con las 15:30 y las 00:10 de Lima, con TZ=UTC, America/Lima y Asia/Tokyo, y con 200 instantes generados con semilla fija
- esperado: muestra «3:30 p. m.» y «12:10 a. m.», es igual en las tres zonas, coincide con el formato de 12 horas de Lima y no incluye tasa ni historial
- test: pendiente

### AC-S10-004
- enlaza: REQ-S10-013, BEH-S10-006
- metodo: integracion
- procedimiento: crear un miembro inscrito hace 3 meses, registrar su primer cobro con fecha de hace 3 meses, y leer la ficha, la lista y el reporte
- esperado: el cobro se registra con las reglas de S-04 y ninguna lectura contiene «Por regularizar»
- test: pendiente

### AC-S10-005
- enlaza: REQ-S10-014, REQ-S10-015, REQ-S10-016, REQ-S10-025, REQ-S10-026, REQ-S10-017, REQ-S10-018, REQ-S10-019, REQ-S10-020, BEH-S10-007, BEH-S10-008, BEH-S10-009, BEH-S10-010
- metodo: manual
- procedimiento: como socio, abrir el panel, el inicio de sesión, el kiosco y la vitrina y leer todos sus textos, ayudas y mensajes; buscar los dos logos, el identificador del tema, las dependencias de hojas de cálculo y la zona America/Caracas
- esperado: todo muestra «Adhara Fit» como rótulo de texto, ningún texto menciona bolívares, la tasa, el BCV, dólares, Venezuela ni al cliente anterior, los logos y las dependencias no existen y el tema se llama temaAdhara con los mismos colores
- test: pendiente

### AC-S10-006
- enlaza: REQ-S10-021, REQ-S10-022, BEH-S10-011, INV-S10-003
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-venezuela.mjs con un árbol por cada uno de los veintidós términos, otro con la palabra Bs sola y el identificador absoluto y otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los veintidós términos nombrando archivo, línea y término, no marca la palabra Bs sola ni absoluto, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S10-007
- enlaza: REQ-S10-023, BEH-S10-012
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue tasaCambio en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-venezuela.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S10-008
- enlaza: REQ-S10-024, BEH-S10-013
- metodo: unitario
- procedimiento: ejecutar las pruebas de las listas de exenciones de verificar-dinero, verificar-fechas, verificar-pagos, verificar-plan y verificar-caja
- esperado: ninguna entrada nombra un archivo de la familia S-10
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas del reloj con hora de Lima (`RelojLima`) y de los textos de marca, en rojo; (2) `tools/verificar-venezuela.mjs` y sus pruebas, con todos los archivos actuales en su lista de exenciones, que se achica en cada paso siguiente; (3) `RelojLima` y el rótulo «Adhara Fit», y el cambio de `temaAdrenalinaXtreme` a `temaAdhara` en un solo commit con todos sus usos; (4) retirar el padrón: `ActivarDesdeExcel`, la pestaña y la carpeta `configuraciones/excel`, `activarDesdeExcelAction`, los casos de uso y utilidades del padrón con sus pruebas, y los lectores de `porRegularizar` y `vieneDelExcel` (incluidas las ramas de `ActualizarMiembro` y los avisos), cada archivo retirado de las exenciones en el mismo commit; (5) retirar la tasa: las rutas, `RelojYTasaConHistorial`, `ModalHistorialTasas`, `tasaBcv*`, `tasaActual`, los tres scripts, los casos de uso, `BcvApiAdapter`, la entidad, el puerto y los repositorios, y los lectores de `tasaCambio` y `montoBs`; (6) quitar los textos, ayudas y ejemplos en bolívares y la hora de Caracas (`fechaCaracas` y su prueba); (7) esquema: retirar `TasaCambio`, `MiembroReferencia`, `PadronHoja`, `Pago.tasaCambio`, `Pago.montoBs`, `Sucursal.tasaCambioUSD`, `Miembro.porRegularizar` y `Miembro.vieneDelExcel`; (8) retirar los logos de la marca anterior y la dependencia `xlsx`; (9) vaciar las exenciones de la familia S-10 de las listas de S-02, S-03, S-04, S-07 y S-08.
- Las pruebas del reloj usan semillas fijas y los husos `TZ=UTC`, `America/Lima` y `Asia/Tokyo`; no hay dependencias nuevas.
- Los criterios AC-S10-005 y AC-S10-007 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).
- La herramienta busca cada término por separado y distingue mayúsculas; el término `absoluto` se verifica como no coincidente con `Bs`.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15); no existen tasas, padrón ni miembros por regularizar.
- **Enmiendas que se registran al aprobar S-10:**
  - S-02: la tabla de 5.1 pierde `medianocheLimaDeFechaUtc`; REQ-S02-020 y SUP-S02-004 pierden a S-10 como dueña de exenciones; `fechaCaracas.ts`, `formatearBs.ts` y `FichaReposo.tsx` salen de la lista de exenciones.
  - S-03: la familia S-10 de la tabla de familias queda vacía (REQ-S03-030) y el puente de dinero deja de nombrar archivos de S-10.
  - S-04: SUP-S04-011, 0.3 y 0.4 se leen como cumplidos (`Pago.tasaCambio`, `Pago.montoBs`, «Por regularizar»); REQ-S04-045 deja de admitir a S-10.
  - S-05: 0.3 deja de nombrar `Sucursal.tasaCambioUSD`; SUP-S05-005 y las menciones de la familia S-10 se leen como cumplidas.
  - S-06: SUP-S06-007 y la exención de la familia del padrón desaparecen (sus archivos se retiran).
  - S-07: REQ-S07-057 y REQ-S07-060 dejan de admitir a S-10.
  - S-08: la nota sobre `Pago.montoBs` y la tasa de 0.3 se leen como cumplidas.
  - S-00: el aviso sobre `xlsx` de 0.4 se lee como cumplido (REQ-S10-020).
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 restan tres tablas (`TasaCambio`, `MiembroReferencia`, `PadronHoja`); REQ-S22-007 y AC-S22-003 restan sus repositorios; REQ-S22-009 y AC-S22-004 los quitan de la prueba de humo.
  - `docs/00-indice.md`, `docs/06-modelo-datos-cambios.md`, `COBERTURA-RF.md` y `BACKLOG-SPECS.md`: nota de que S-10 retiró lo venezolano y de que S-16 queda descartada.
- **Traspasos:** S-19 (colores, tipografía, componentes y logo de Adhara Fit), S-20 y S-21 (vitrina y kiosco en TV) y S-15 (seed y baseline).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Son unos 150 archivos entre tasa, padrón, bolívares y marca; el riesgo es una referencia que sobreviva y rompa en ejecución. Mitigación: el typecheck y la herramienta de términos.
- Con la marca reducida a un rótulo de texto el kiosco y la vitrina se verán sobrios hasta S-19. Mitigación: S-19 está aprobada como ítem; el propietario debe entregar el logo definitivo.
- Eliminar el reloj-tasa cambia la cabecera del panel; los socios acostumbrados a ver la tasa notarán el cambio, aunque no aplica a Adhara.
- Al retirar `porRegularizar` y `vieneDelExcel` se pierde la marca de datos sin verificar; un miembro cargado a mano con datos erróneos queda sin ese aviso. Mitigación: los datos los captura el socio al registrar.
- El nombre «Adrenalina» o «ZipGym» pueden sobrevivir en archivos binarios (imágenes, íconos de las apps de TV) que `grep` no inspecciona. Mitigación: S-19 y S-20/S-21 revisan los recursos gráficos (no verificado).
- Las cifras de 0.4 cambian cuando S-00 a S-09 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿El encabezado del panel conserva un reloj con la hora de Lima, sin tasa? Default: sí (SUP-S10-002).
- ¿El nombre visible «Adhara Fit» como rótulo de texto hasta que entregues el logo definitivo? Default: sí (SUP-S10-005).
- ¿Se elimina `Miembro.porRegularizar` junto con el padrón? Default: sí (SUP-S10-004).
