---
id: S-10
estado: aprobada
adrs: ADR-003, ADR-007, ADR-008, ADR-011, ADR-016, ADR-020, ADR-021
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-10 — Retirar lo venezolano: tasa de cambio, padrón de Excel, bolívares y la marca anterior

## 0. Contexto y alcance

### 0.1 Problema
El código heredado nació para otro negocio, en Venezuela: convierte dólares a bolívares con una tasa del BCV que un proceso aparte (`worker`) actualiza, muestra esa tasa y los precios en bolívares en el panel, el kiosco y la vitrina, mantiene un espejo de un Excel del cliente anterior (padrón, `MiembroReferencia`, `PadronHoja`, menú «Excel»), marca a los miembros que vienen del Excel como «por regularizar», y lleva el nombre, los colores, los logos y los identificadores de otro gimnasio. Adhara Fit es un solo negocio en Perú con una sola moneda (PEN): el propietario decidió «sacar lo venezolano», sin dólares ni bolívares, sin padrón y sin importador de miembros (ADR-003, ADR-007 y ADR-020, aceptados). S-00 ya deja fuera la copia de `worker`, `kiosk-host`, los scripts de `packages/db`, `migracion-excel/` y todo archivo `zipgym`; S-02 elimina `fechaCaracas.ts`. S-10 elimina lo que queda dentro del código importado de las apps web (`web-admin`, `kiosk`, `vitrina`) y de `packages`, y comprueba que no vuelva; las apps de TV (`kiosk-tv`, `vitrina-tv`) se limpian en S-20 y S-21.

### 0.2 Dentro de alcance
- Tasa de cambio: la tabla `TasaCambio`, `Pago.tasaCambio`, `Pago.montoBs`, `Sucursal.tasaCambioUSD`, `VitrinaItem.mostrarEquivalenteBs`, los casos de uso, la entidad, el puerto y los repositorios de la tasa, `BcvApiAdapter`, `estadoTasa`, `ObtenerTasaVigente`, `SincronizarTasas`, `ListarHistoricoTasas`, `RegistrarTasaManual`, las rutas `api/tasa-cambio` y `api/tasa-cambio/historial`, `lib/tasaBcv.ts`, `tasaBcvFija.ts`, `productos/tasaActual.ts`, los tres scripts de `apps/web-admin/scripts` sobre la tasa, `ModalHistorialTasas`, `RelojYTasaConHistorial` y `RelojYTasa`, que se reemplazan por un reloj de Lima sin tasa (`RelojLima`) que el propietario pidió conservar para controlar la hora de las transacciones.
- Bolívares y tasa en el contrato y en las pantallas de kiosco y vitrina: `kiosco/estado` y el manifiesto de `kiosco/vitrina` (`tasaBcvParaKiosco`, `tasaBcv`), `Badges.tsx`, `Reproductor.tsx`, `Cartel.tsx`, `vitrinaBadges.ts` (`equivalenteBs`), `FichaReposo.tsx`, `kiosk/lib/api.ts` y `kiosk/app/page.tsx`; y los textos y ayudas de bolívares, tasa y BCV del panel, entre ellos `caja/`, `productos/`, `miembros/[id]/pagos` y `FormularioMiembro.tsx`.
- Padrón de Excel: las tablas `MiembroReferencia` y `PadronHoja`, `ActivarMiembroDesdePadron`, `EditarMiembroReferencia`, `filtrarFilasPadron`, `padronExcel`, `formatoCeldaPadron`, `saltoFila`, `lib/activacion.ts`, `miembros/ActivarDesdeExcel.tsx`, `activarDesdeExcelAction`, la carpeta `configuraciones/excel` y su pestaña, y sus puertos, entidades, repositorios, mapeadores, datos de prueba y pruebas.
- Las columnas `Miembro.porRegularizar` y `Miembro.vieneDelExcel` y todas las ramas y avisos que las leen («Por regularizar»), conservando el comportamiento de un miembro con `vieneDelExcel` falso.
- `formatearBs` y su prueba, y las funciones `medianocheLimaDeFechaUtc` y `diaCalendarioLima` de `fechaLima.ts`, cuyos únicos consumidores son archivos de esta spec.
- Marca anterior en las apps web: el nombre «Adrenalina Xtreme Gym» (también en mayúsculas), `temaAdrenalinaXtreme` (pasa a `temaAdhara`), los recursos gráficos `logo-adrenalina-gym.jpg`, `adrenalina-gym-bg.png`, `adrenalina-icono.png`, `adrenalina-favicon.jfif` y `escudo.png` y su README de `branding`, la referencia de `marca-agua.css`, el precaché del service worker del kiosco, el `slug` de `verificar-autorizacion.ts` y los comentarios. El nombre visible sale de `ConfiguracionNegocio.nombre` (S-05).
- La dependencia `xlsx` en `packages/db/package.json` y `package-lock.json`.
- `tools/verificar-venezuela.mjs` con su lista de exenciones de las apps de TV y su paso en el CI; vaciar las exenciones de la familia S-10 de las listas de `verificar-fechas`, `verificar-dinero` y `verificar-documento`.

### 0.3 Fuera de alcance
- La copia de `worker`, `kiosk-host`, los scripts de `packages/db`, `migracion-excel/` y los archivos `zipgym`: ya la excluye S-00. La eliminación de `fechaCaracas.ts` y su prueba: S-02 (REQ-S02-018).
- Las apps `kiosk-tv` y `vitrina-tv` (identificadores `com.adrenalina.*`, nombres de lanzador «AX», íconos Android, README, `prueba/index.html` y los textos de tasa y bolívares de su README): S-20 y S-21, con una exención cerrada en la herramienta de S-10.
- Los productos: S-11 rehace el catálogo y la venta; S-10 solo quita la tasa y los bolívares de `VenderProducto.ts`, `productos/tasaActual.ts`, `FormularioProducto.tsx` y `productos/page.tsx`.
- El importador de miembros: descartado por el propietario (S-16); ADR-007 se enmienda en 5.2.
- Los métodos de pago venezolanos (pago móvil, BioPago, Zelle, Binance, Punto): ya los retira S-03.
- Los colores, la tipografía, los componentes y el logo definitivo de Adhara Fit: S-19 (ADR-008 y ADR-020). Hasta entonces el tema `temaAdhara` conserva la paleta verde anterior.
- El seed y el baseline: S-15.
- El diseño visual del reloj (tamaño, color, posición exacta): S-19; S-10 fija su contenido y su fuente de hora.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-10 recibirá después de S-00 a S-09 y S-22; se recontarán al empezar. Los `grep` recorren `apps` y `packages` y excluyen `node_modules`, `generated`, `.next`, `out`, `packages/db`, `apps/worker` y `apps/kiosk-host`, salvo donde se indica.
- **Tasa de cambio:** 70 archivos mencionan `TasaCambio`, `tasaCambio`, `orquestadorTasa`, `estadoTasa`, `BcvApi`, `ConvertirMontoUSDaVES`, `RegistrarTasaManual`, `ModalHistorialTasas`, `RelojYTasa`, `tasaBcvFija` o `tasa-cambio` (verificado con `grep -rIlE` sobre `*.ts`, `*.tsx`, `*.json`, `*.mjs` y `*.js`); el esquema tiene `model TasaCambio` (`schema.prisma:528`), `Pago.tasaCambio` (`:285`), `Pago.montoBs` (`:286`), `Sucursal.tasaCambioUSD` (`:44`) y `VitrinaItem.mostrarEquivalenteBs` (`:709`); los archivos son `PrismaTasaCambioRepository.ts`, `TasaCambio.ts`, `ITasaCambioRepository.ts`, `ObtenerTasaVigente.ts`, `SincronizarTasas.ts`, `ListarHistoricoTasas.ts`, `RegistrarTasaManual.ts`, `estadoTasa.ts`, `exchange-rate/BcvApiAdapter.ts` (que llama a `ve.dolarapi.com`, `:3`), `ui/components/RelojYTasa.tsx`, `web-admin/lib/tasaBcv.ts`, `(panel)/tasaBcvFija.ts`, `(panel)/RelojYTasaConHistorial.tsx`, `(panel)/ModalHistorialTasas.tsx`, `(panel)/productos/tasaActual.ts`, `api/tasa-cambio/route.ts`, `api/tasa-cambio/historial/route.ts` y los scripts `verificar-tasa-bcv.ts`, `verificar-historial-tasa-bcv.ts` y `poblar-historico-tasa-bcv.ts` (verificado con `find`). No hay variables de entorno de tasa (verificado con `grep -rhoE "process.env.*(BCV|TASA)"`).
- **Reloj:** `RelojYTasa.tsx:30,73` muestra fecha y segundos con `es-VE` junto a la tasa y `layout.tsx:9,39,59` reserva espacio (`pt-16`); ADR-003 elimina «el reloj/tasa del layout» (`ADR-003:17`), y el propietario decidió el 2026-11-12 conservar un reloj para controlar la hora de las transacciones (verificado con `Read`).
- **Bolívares en kiosco y vitrina:** `vitrina/components/Badges.tsx:2-4,18,57` (`Bs. {formatearBs(bs)}`), `Reproductor.tsx:8,33-35` (`manifiesto.tasaBcv`), `Cartel.tsx:3,10,30`, `packages/domain/utils/vitrinaBadges.ts:20-25` (`equivalenteBs`), `web-admin/lib/kiosco.ts:41-48` (`tasaBcvParaKiosco`), `api/kiosco/estado/route.ts`, `api/kiosco/vitrina/route.ts`, `kiosk/lib/api.ts:74`, `kiosk/app/page.tsx:221`, `kiosk/components/FichaReposo.tsx:4-6,30` («Tasa BCV») y `vitrina/lib/sincronizar.test.ts:35,111`; ADR-021 asigna a S-10 retirar los bolívares de la vitrina (`ADR-021:38`) (verificado con `grep -n` y `Read`).
- **Padrón de Excel:** 28 archivos mencionan `MiembroReferencia`, `PadronHoja`, `padron`, `padrón`, `ActivarMiembroDesdePadron`, `filtrarFilasPadron` o `activacion` (verificado con `grep -rIlE`); el esquema tiene `model MiembroReferencia` (`:613`) y `model PadronHoja` (`:657`); `configuraciones/excel/` tiene seis archivos (`ExcelGrid.tsx`, `FilaHoja.tsx`, `PanelFiltros.tsx`, `actions.ts`, `page.tsx`, `tiposGrid.ts`) y su pestaña está en `configuraciones/tabs.ts:10`, además de `miembros/ActivarDesdeExcel.tsx`, `padronExcel.ts`, `formatoCeldaPadron.ts`, `filtrarFilasPadron.ts`, `saltoFila.ts` y `ActivarMiembroDesdePadron.ts` con sus pruebas (verificado con `find`). `registrarCheckIn` ya no activa desde el padrón por S-06 (REQ-S06-029).
- **«Por regularizar»:** 24 archivos mencionan `porRegularizar`, `vieneDelExcel` o «Por regularizar» (verificado con `grep -rIlE`); `ActualizarMiembro.ts:73,80-90,123` tiene ramas `porRegularizar` y `vieneDelExcel`, y `FormularioMiembro.tsx` las usa para `puedeCambiarPlanGratis` (verificado con `grep -n`).
- **Bolívares en texto y código:** 58 archivos contienen la palabra `Bs` aislada o `formatearBs`, `montoBs`, `VES` o «bolívar» (patrón `\bBs\b|formatearBs|montoBs|\bVES\b|bol[ií]var`, verificado con `grep -rIlE`); con la subcadena `Bs` sin límite de palabra salen 66, porque coincide con palabras como «absoluto».
- **Hora de Caracas:** 25 archivos `.ts` y `.tsx` mencionan «Caracas» (`fechaCaracas.ts` 16 y su prueba 19, `PrismaTurnoRepository.ts` 6, `cambioPlanCalculo.ts` 6, `ListarEnSala.ts` 4) y además `Dockerfile:42`, `apps/kiosk/Dockerfile:49`, `apps/vitrina/Dockerfile:37` y `apps/vitrina-tv/prueba/index.html:27,52` (verificado con `grep -rc Caracas`); S-02 asigna a sí misma `fechaCaracas.ts` (REQ-S02-018) y las Dockerfile (REQ-S02-012).
- **Marca anterior:** además de los 9 archivos con «Adrenalina» que citó la primera lectura (`kiosk/components/MarcoFicha.tsx:34,39`, `kiosk/app/layout.tsx:6,14,29`, `kiosk/lib/tonos.ts:3,12`, `web-admin/app/login/page.tsx:88,91`, `(panel)/EncabezadoSidebar.tsx:9,12`, `web-admin/app/layout.tsx:4,7,12,30`, `vitrina/components/PantallaMarca.tsx:6`, `vitrina/app/layout.tsx:5,12,18`, `packages/theming/tokens.ts:24,28`), aparecen `ADRENALINA XTREME` en mayúsculas (`EncabezadoSidebar.tsx:12`, `login/page.tsx:91`), `kiosk/app/page.tsx:179`, `kiosk/public/sw.js:15` (precachea `adrenalina-gym-bg.png`), `packages/ui/styles/marca-agua.css:1,15`, `packages/ui/components/ThemeStyleTag.tsx:28`, los recursos de `web-admin/public/branding/` (`adrenalina-favicon.jfif`, `adrenalina-icono.png`, `adrenalina-gym-bg.png`, `logo-adrenalina-gym.jpg`, `README.md:1,8-9`, y `mancuerna.jpg`), `kiosk/public/branding/` y el `slug` «adrenalina-xtreme-gym» de `web-admin/scripts/verificar-autorizacion.ts:14,16`; en las apps de TV hay `com.adrenalina.vitrina` y `com.adrenalina.kiosco` (`build.gradle:4,7`, `strings.xml:5-6`, `MainActivity.java:1`, `configuracion.mjs:14`, `preparar.mjs:27`), lanzadores «Kiosco AX» y «Vitrina AX» (`vitrina-tv/README.md:67`), `ZIPGYM` (`vitrina-tv/README.md:20`), `kiosco.zipnegocios.com` (`kiosk-tv/README.md:5`) y `escudo.png` en `vitrina-tv/capacitor/assets/` (lo lee `generar-iconos.mjs:9`); `docs/09-verificacion-contra-codigo.md:125` da 29 archivos más 3 pruebas, 22 en las apps de kiosco y vitrina (verificado con `grep -rnEi adrenalina`, `ls` y `Read`).
- **Dependencias:** `xlsx` figura en `packages/db/package.json:29` (S-00 §0.4) y ningún otro `package.json` de `apps` o `packages` la declara (verificado con `grep -n "xlsx\|exceljs"`).
- **Interacción con specs aprobadas:** S-00 excluye `worker`, `kiosk-host`, los scripts de `packages/db`, `migracion-excel/` y los `zipgym` (SUP-S00-001); S-01 deja la retirada de las rutas `tasa-cambio` a las specs de ADR-003 (S-01 §0.3); S-02 deja `medianocheLimaDeFechaUtc` para el padrón y `diaCalendarioLima` para consumidores de S-10 (tabla de 5.1), exime archivos de S-20 y borra `fechaCaracas.ts` (REQ-S02-018); S-03 define la familia S-10 como `*Tasa*`, `formatearBs*`, `ConvertirMontoUSDaVES*`, `padron*` y `ModalHistorialTasas*`; S-04 y S-05 dejan a S-10 las columnas de tasa y el aviso «Por regularizar»; S-05 fija que el encabezado, el kiosco y la TV muestran `ConfiguracionNegocio.nombre` (SUP-S05-012); S-06 admite una exención cerrada de S-10 con tope en `verificar-documento`; S-07 deja a S-10 las ramas `vieneDelExcel` de `ActualizarMiembro`; S-08 y S-09 no nombran a S-10 salvo como traspaso (verificado con `grep -n` en las specs).
- No verificado: que los archivos binarios (imágenes, íconos) no contengan el nombre del cliente anterior, y el contenido exacto de las 66 coincidencias de la subcadena `Bs`.

### 0.5 Supuestos
- SUP-S10-001: no se conserva ningún dato ni función de la tasa de cambio, ni siquiera como referencia: todos los importes son PEN (ADR-003, ADR-011). Default: eliminar todo; decisión del propietario (ADR-003); asumido, por validar.
- SUP-S10-002: el encabezado del panel conserva un reloj con la fecha y la hora de Lima (formato `dd/mm/aaaa` y 12 horas con segundos, por ejemplo «12/11/2026 3:30:05 p. m.») y sin tasa, para que el socio controle la hora con la que se marcan las transacciones; esto enmienda ADR-003:17. El reloj parte de la hora del servidor, que es la que se guarda en cada transacción, y avanza con el reloj del navegador. Default: ese reloj; decisión del propietario (2026-11-12); asumido, por validar el formato.
- SUP-S10-003: los miembros existentes de Adhara se cargan a mano, uno por uno; no hay importador ni padrón. Default: sin importador; decisión del propietario (S-16 descartada); asumido, por validar su alcance.
- SUP-S10-004: `Miembro.porRegularizar` y `vieneDelExcel` se eliminan (ADR-007) y se conserva el comportamiento de un miembro con `vieneDelExcel` falso: el cambio de plan prorratea (S-07) y el aviso no existe. Un miembro inscrito antes de hoy se registra con su fecha de inscripción y su primer cobro puede llevar cualquier fecha pasada (S-04). Default: ese comportamiento; asumido, por validar.
- SUP-S10-005: el nombre visible (título de la aplicación, encabezado, inicio de sesión, kiosco y vitrina) es `ConfiguracionNegocio.nombre` (S-05, SUP-S05-012), sembrado como «Adhara Fit», y se muestra como rótulo de texto sin logo hasta que el propietario entregue el definitivo (S-19). Default: ese origen del nombre; asumido, por validar.
- SUP-S10-006: `temaAdrenalinaXtreme` pasa a `temaAdhara` conservando sus valores de color (una paleta verde del cliente anterior, ADR-008) hasta S-19, que fija `#231F20`, `#FFCB04` y `#FFFFFF` y los tokens `--gx-*`. Default: renombrar sin cambiar colores; asumido, por validar.
- SUP-S10-007: la ausencia de bolívares, tasa y marca se comprueba con una lista cerrada de identificadores (distingue mayúsculas) y siete patrones (no distinguen mayúsculas), y no con la subcadena `Bs`, que daría falsos positivos con palabras como «absoluto». Default: esa combinación; asumido, por validar.
- SUP-S10-008: los archivos de `apps/web-admin/scripts` sobre la tasa se eliminan y el directorio queda con `verificar-autorizacion.ts`, que S-01 y S-05 conservan (S-10 solo le quita el `slug` de la marca anterior). Default: ese resultado; asumido, por validar.
- SUP-S10-009: las apps `kiosk-tv` y `vitrina-tv` quedan con una exención cerrada con tope por archivo hasta S-20 y S-21, que cambian sus identificadores, lanzadores, íconos y textos; sus `appId` no cambian en S-10 para no invalidar los APK instalados. Default: ese reparto; asumido, por validar.
- SUP-S10-010: el contrato de `kiosco/estado` y del manifiesto de la vitrina pierde `tasaBcv` y el equivalente en bolívares; el código actual tolera un `tasaBcv` nulo (`Reproductor.tsx:34`), de modo que un kiosco o una TV con una versión anterior sigue funcionando sin mostrar bolívares. Default: quitar los campos; asumido, por validar.
- SUP-S10-011: se retiran las pruebas de `formatearBs`, `estadoTasa`, `padronExcel`, `formatoCeldaPadron`, `filtrarFilasPadron`, `saltoFila`, `ActivarMiembroDesdePadron`, `EditarMiembroReferencia`, `fechaCaracas` (la de S-02), las ramas de `ActualizarMiembro.test.ts` sobre `vieneDelExcel` y las de bolívares de `sincronizar.test.ts`, porque prueban comportamientos que se eliminan por decisión del propietario; su cifra se declara al empezar. Default: retirarlas; asumido, por validar.
- SUP-S10-012: los volúmenes de desarrollo creados antes de S-10 se recrean (`drizzle-kit push` no es una migración limpia al quitar tablas y columnas, S-22). Default: recrear el volumen; asumido, por validar.

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
- origen: ADR-021
- texto: La tabla VitrinaItem no deberá tener la columna mostrarEquivalenteBs.

### REQ-S10-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: La entidad, el puerto y los repositorios de TasaCambio, BcvApiAdapter y los casos de uso ObtenerTasaVigente, SincronizarTasas, ListarHistoricoTasas, RegistrarTasaManual y ConvertirMontoUSDaVES, y la utilidad estadoTasa, no deberán existir.

### REQ-S10-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Las rutas api/tasa-cambio y api/tasa-cambio/historial y la acción registrarTasaManualAction no deberán existir.

### REQ-S10-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Los archivos tasaBcv, tasaBcvFija, tasaActual, ModalHistorialTasas, RelojYTasaConHistorial y RelojYTasa, y los tres scripts de la tasa en apps/web-admin/scripts, no deberán existir.
### REQ-S10-008
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-002
- texto: El encabezado del panel deberá mostrar un reloj con la fecha y la hora de Lima y ninguna tasa de cambio.
### REQ-S10-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: Las respuestas de kiosco/estado y del manifiesto de kiosco/vitrina no deberán contener tasaBcv ni ningún equivalente en bolívares.

### REQ-S10-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-021
- texto: Las pantallas del kiosco y de la vitrina, incluidas FichaReposo, Badges, Cartel y Reproductor, no deberán mostrar bolívares ni la tasa.

### REQ-S10-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: El esquema no deberá contener las tablas MiembroReferencia y PadronHoja.

### REQ-S10-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: Los archivos ActivarMiembroDesdePadron, EditarMiembroReferencia, filtrarFilasPadron, padronExcel, formatoCeldaPadron, saltoFila y lib/activacion y sus pruebas no deberán existir.

### REQ-S10-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: Las entidades, los puertos, los repositorios, los mapeadores y los datos de prueba de MiembroReferencia y de PadronHoja no deberán existir.

### REQ-S10-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: La carpeta configuraciones/excel, su pestaña, el componente ActivarDesdeExcel y la acción activarDesdeExcelAction no deberán existir.

### REQ-S10-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: La tabla Miembro no deberá tener las columnas porRegularizar ni vieneDelExcel.

### REQ-S10-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: Ningún caso de uso, repositorio, entidad ni pantalla deberá leer, escribir o mostrar porRegularizar, vieneDelExcel ni el aviso «Por regularizar».

### REQ-S10-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-004
- texto: El cambio de plan y la edición de un miembro deberán comportarse como lo hacían con vieneDelExcel falso.

### REQ-S10-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Los archivos formatearBs y su prueba no deberán existir.

### REQ-S10-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Ningún texto, ayuda, ejemplo ni mensaje de las pantallas deberá mencionar bolívares, la tasa de cambio, el BCV, dólares ni Venezuela.

### REQ-S10-020
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-004
- texto: El módulo fechaLima no deberá exportar medianocheLimaDeFechaUtc ni diaCalendarioLima.

### REQ-S10-021
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-005
- texto: El título de la aplicación, el encabezado del panel, el inicio de sesión, el kiosco y la vitrina deberán mostrar como nombre el valor de ConfiguracionNegocio.nombre.

### REQ-S10-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Los recursos gráficos de la marca anterior, entre ellos logo-adrenalina-gym, adrenalina-gym-bg, adrenalina-icono, adrenalina-favicon y escudo, y el README de branding que los describe, no deberán existir en web-admin, kiosk ni vitrina.

### REQ-S10-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: Ningún texto alternativo, comentario, ayuda ni referencia de estilos de web-admin, kiosk, vitrina o packages deberá nombrar al cliente anterior.

### REQ-S10-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-008
- texto: El identificador temaAdrenalinaXtreme deberá llamarse temaAdhara y conservar sus valores de color hasta S-19.

### REQ-S10-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-020
- texto: El service worker del kiosco deberá subir su versión de caché y no precachear recursos retirados.

### REQ-S10-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-007
- texto: Ningún package.json ni package-lock.json de apps o packages deberá declarar la dependencia xlsx ni otra librería de hojas de cálculo.

### REQ-S10-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de texto de apps y packages, salvo node_modules, .next, generated, out y las exenciones cerradas de las apps de TV, no deberán contener, distinguiendo mayúsculas, los identificadores TasaCambio, tasaCambio, tasaCambioUSD, montoBs, orquestadorTasa, estadoTasa, BcvApi, ConvertirMontoUSDaVES, RegistrarTasaManual, registrarTasaManualAction, ModalHistorialTasas, RelojYTasa, tasaBcv, tasa-cambio, formatearBs, MiembroReferencia, PadronHoja, ActivarMiembroDesdePadron, filtrarFilasPadron, porRegularizar, vieneDelExcel, «Por regularizar», fechaCaracas, America/Caracas, mostrarEquivalenteBs, equivalenteBs ni temaAdrenalinaXtreme.

### REQ-S10-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de texto de apps y packages, salvo node_modules, .next, generated, out y las exenciones cerradas de las apps de TV, no deberán contener, sin distinguir mayúsculas, adrenalina, zipgym, zip-gym, zipnegocios, BCV, bolívar, bolivar ni venezuela, ni, distinguiendo mayúsculas, la secuencia «Bs.» ni la palabra VES.

### REQ-S10-029
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-venezuela.mjs encuentra alguno de los términos de REQ-S10-027 o de REQ-S10-028, deberá terminar con código distinto de cero y nombrar archivo, línea y cada término encontrado.

### REQ-S10-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada entrada de tools/verificar-venezuela.exenciones.json deberá nombrar un archivo existente de apps/kiosk-tv o de apps/vitrina-tv, la spec que lo limpia (S-20 o S-21) y un tope de líneas.

### REQ-S10-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-venezuela.mjs en cada pull request.

### REQ-S10-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Las listas de exenciones de verificar-fechas, verificar-dinero y verificar-documento no deberán contener archivos de la familia S-10 al terminar la spec.


### REQ-S10-033
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-002
- texto: El reloj deberá formatearse con el formateador de fecha y hora de S-02 como dd/mm/aaaa y 12 horas con segundos, igual con cualquier zona horaria del navegador y del proceso.

### REQ-S10-034
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S10-002
- texto: El reloj deberá partir de la hora del servidor y avanzar con el reloj del navegador, de modo que muestre la hora que el servidor guarda en las transacciones.
## 2. Comportamiento
- no_aplica: concurrencia — S-10 solo retira código, columnas y texto; no agrega operaciones con estado compartido ni escrituras simultáneas.

### BEH-S10-001
- cubre: REQ-S10-001, REQ-S10-002, REQ-S10-003, REQ-S10-004
- categoria: feliz
- dado: el esquema final
- cuando: se consultan las tablas y las columnas de Pago, Sucursal y VitrinaItem
- entonces: no existe TasaCambio, Pago no tiene tasaCambio ni montoBs, Sucursal no tiene tasaCambioUSD y VitrinaItem no tiene mostrarEquivalenteBs

### BEH-S10-002
- cubre: REQ-S10-005, REQ-S10-006, REQ-S10-007
- categoria: feliz
- dado: el código final
- cuando: se buscan las entidades, puertos, repositorios, casos de uso, utilidades, rutas, acciones, archivos y scripts de la tasa
- entonces: no existe ninguno y api/tasa-cambio y api/tasa-cambio/historial responden 404

### BEH-S10-003
- cubre: REQ-S10-008, REQ-S10-033
- categoria: feliz
- dado: el panel con un socio a las 15:30:05 de Lima del 12 de noviembre de 2026
- cuando: se abre cualquier pantalla del panel
- entonces: el encabezado muestra «12/11/2026 3:30:05 p. m.» y ninguna tasa ni historial de tasas
### BEH-S10-004
- cubre: REQ-S10-009
- categoria: feliz
- dado: un kiosco y una TV con la configuración vigente
- cuando: se piden kiosco/estado y el manifiesto de kiosco/vitrina
- entonces: ninguna respuesta contiene tasaBcv ni un equivalente en bolívares

### BEH-S10-005
- cubre: REQ-S10-010
- categoria: feliz
- dado: un ítem de vitrina con precio, la pantalla de reposo y la ficha del kiosco
- cuando: se muestran
- entonces: ninguna pantalla muestra bolívares ni la tasa, y los precios aparecen solo en PEN

### BEH-S10-006
- cubre: REQ-S10-009, REQ-S10-010
- categoria: borde
- dado: un kiosco o una TV con una versión anterior que espera tasaBcv
- cuando: recibe una respuesta sin tasaBcv
- entonces: sigue funcionando y no muestra bolívares

### BEH-S10-007
- cubre: REQ-S10-011, REQ-S10-013
- categoria: feliz
- dado: el esquema y el código finales
- cuando: se consultan las tablas, las entidades, los puertos, los repositorios, los mapeadores y los datos de prueba del padrón
- entonces: no existen MiembroReferencia ni PadronHoja ni nada que los use

### BEH-S10-008
- cubre: REQ-S10-012, REQ-S10-014
- categoria: feliz
- dado: el árbol final
- cuando: se buscan los siete archivos del padrón con sus pruebas, la carpeta de Excel, la pestaña, el componente y la acción
- entonces: no existe ninguno y /configuraciones/excel responde 404

### BEH-S10-009
- cubre: REQ-S10-015, REQ-S10-016
- categoria: feliz
- dado: el esquema final y el código final
- cuando: se consultan las columnas de Miembro y se busca la lectura o escritura de porRegularizar y vieneDelExcel y el aviso «Por regularizar»
- entonces: Miembro no tiene ninguna de las dos columnas y ningún archivo las lee, las escribe o las muestra

### BEH-S10-010
- cubre: REQ-S10-017
- categoria: feliz
- dado: un miembro con plan de 1 mes, 15 días restantes, y un cambio de plan al de 3 meses
- cuando: se calcula y se confirma el cambio y se edita la ficha
- entonces: el cambio da el mismo resultado que con vieneDelExcel falso en las pruebas de caracterización de S-07 y la ficha no ofrece ninguna opción especial de cambio gratis

### BEH-S10-011
- cubre: REQ-S10-018, REQ-S10-020
- categoria: feliz
- dado: el árbol final
- cuando: se buscan formatearBs y su prueba y se leen las exportaciones de fechaLima
- entonces: los archivos no existen y fechaLima no exporta medianocheLimaDeFechaUtc ni diaCalendarioLima

### BEH-S10-012
- cubre: REQ-S10-019
- categoria: feliz
- dado: el panel, el kiosco y la vitrina
- cuando: se leen todos sus textos, ayudas, ejemplos y mensajes
- entonces: ninguno menciona bolívares, la tasa, el BCV, dólares ni Venezuela

### BEH-S10-013
- cubre: REQ-S10-021
- categoria: feliz
- dado: ConfiguracionNegocio.nombre igual a «Adhara Fit» y luego a «Adhara Fit Norte»
- cuando: se abren el título de la aplicación, el panel, el inicio de sesión, el kiosco y la vitrina
- entonces: todos muestran el nombre vigente como rótulo de texto

### BEH-S10-014
- cubre: REQ-S10-022, REQ-S10-023, REQ-S10-024
- categoria: feliz
- dado: el árbol final de web-admin, kiosk, vitrina y packages
- cuando: se buscan los recursos gráficos y el README de la marca anterior, el nombre del cliente anterior en textos, comentarios y estilos, y el identificador del tema
- entonces: los recursos no existen, ningún texto nombra al cliente anterior y el tema se llama temaAdhara con los mismos colores que tenía

### BEH-S10-015
- cubre: REQ-S10-025
- categoria: borde
- dado: un kiosco con el service worker de la versión anterior
- cuando: se instala el service worker nuevo
- entonces: la caché usa una versión nueva, no precachea ningún recurso retirado y el kiosco carga sin errores de precaché

### BEH-S10-016
- cubre: REQ-S10-026
- categoria: feliz
- dado: los package.json y package-lock.json de las apps y los packages
- cuando: se busca xlsx y librerías de hojas de cálculo
- entonces: ninguno las declara

### BEH-S10-017
- cubre: REQ-S10-027, REQ-S10-029
- categoria: error
- dado: un archivo por cada uno de los veintisiete identificadores de REQ-S10-027, uno con TasaCambio y tasaCambioUSD en la misma línea, y uno con la palabra absoluto
- cuando: se ejecuta tools/verificar-venezuela.mjs
- entonces: falla y nombra archivo, línea y término de cada uno de los veintisiete, lista tasaCambio y tasaCambioUSD cuando coinciden en una línea, y no marca la palabra absoluto

### BEH-S10-018
- cubre: REQ-S10-028, REQ-S10-029
- categoria: error
- dado: un archivo por cada uno de los patrones de REQ-S10-028, con «ADRENALINA», «Adrenalina» y «adrenalina», con un comentario y con texto de un archivo markdown
- cuando: se ejecuta tools/verificar-venezuela.mjs
- entonces: falla y nombra archivo, línea y patrón de cada uno, incluidas las variantes de mayúsculas y los comentarios

### BEH-S10-019
- cubre: REQ-S10-030
- categoria: error
- dado: una exención que nombra un archivo inexistente, otra fuera de kiosk-tv y vitrina-tv, otra sin spec y otra sin tope
- cuando: se ejecutan las pruebas de la lista
- entonces: las cuatro fallan, y una entrada válida de apps/kiosk-tv con spec S-21 y tope pasa

### BEH-S10-020
- cubre: REQ-S10-031
- categoria: error
- dado: un pull request que agrega tasaCambio en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-venezuela.mjs falla y queda en rojo

### BEH-S10-021
- cubre: REQ-S10-032
- categoria: feliz
- dado: las listas de exenciones de verificar-fechas, verificar-dinero y verificar-documento
- cuando: se ejecutan sus pruebas de lista
- entonces: ninguna entrada nombra un archivo de la familia S-10 (`*Tasa*`, `formatearBs*`, `ConvertirMontoUSDaVES*`, `padron*`, `ModalHistorialTasas*`, `tasaBcv*`, `BcvApi*`, `*MiembroReferencia*`, `saltoFila*`, `activacion*`, `configuraciones/excel/*` ni `FichaReposo.tsx`)


### BEH-S10-022
- cubre: REQ-S10-033
- categoria: borde
- dado: un navegador en la zona de Tokio y otro en la de Lima, y los instantes 2026-11-12T23:59:59 y 2026-11-13T00:00:00 de Lima
- cuando: el reloj los muestra
- entonces: ambos muestran «12/11/2026 11:59:59 p. m.» y «13/11/2026 12:00:00 a. m.», porque el reloj usa America/Lima y no la zona del navegador

### BEH-S10-023
- cubre: REQ-S10-034
- categoria: borde
- dado: un navegador con el reloj atrasado dos horas y un servidor que responde 15:30:05 de Lima
- cuando: se carga el panel y pasan 10 segundos
- entonces: el reloj muestra «3:30:05 p. m.» al cargar y «3:30:15 p. m.» después, y no «1:30:05 p. m.», porque parte de la hora del servidor
## 3. Invariantes

### INV-S10-001
- propiedad: el sistema no contiene ninguna tabla, columna ni pantalla de conversión de moneda ni de tasa: todo importe es PEN
- mecanismo: restriccion-bd
- deteccion: la consulta del esquema final por TasaCambio, Pago.tasaCambio, Pago.montoBs, Sucursal.tasaCambioUSD y VitrinaItem.mostrarEquivalenteBs devuelve 0 filas
- protege: REQ-S10-001, REQ-S10-002, REQ-S10-003, REQ-S10-004

### INV-S10-002
- propiedad: ninguna operación del sistema depende de un Excel, de un padrón ni de una marca de «por regularizar»
- mecanismo: restriccion-bd
- deteccion: la consulta del esquema final por MiembroReferencia, PadronHoja, Miembro.porRegularizar y Miembro.vieneDelExcel devuelve 0 filas
- protege: REQ-S10-011, REQ-S10-015

### INV-S10-003
- propiedad: ningún archivo de texto de apps ni packages fuera de las exenciones de TV contiene los términos de lo venezolano ni de la marca anterior
- mecanismo: lint
- deteccion: tools/verificar-venezuela.mjs termina con código distinto de cero y lista archivo:línea y término de cada coincidencia
- protege: REQ-S10-027, REQ-S10-028, REQ-S10-029

### INV-S10-004
- propiedad: el nombre del negocio que se muestra es siempre el de ConfiguracionNegocio
- mecanismo: asercion-dominio
- deteccion: una prueba cambia ConfiguracionNegocio.nombre a un valor aleatorio generado con semilla fija y comprueba que el título, el encabezado, el inicio de sesión, el kiosco y la vitrina muestran ese valor y que ninguno contiene un literal propio
- protege: REQ-S10-021


### INV-S10-005
- propiedad: el reloj muestra siempre la hora de Lima en el formato definido, igual con cualquier zona del navegador
- mecanismo: test-propiedad
- deteccion: 200 instantes generados con semilla fija alrededor de las 00:00 y las 12:00 de Lima, probados con TZ=UTC, America/Lima y Asia/Tokyo; el texto del reloj debe ser igual al formato dd/mm/aaaa y 12 horas con segundos del instante en Lima
- protege: REQ-S10-033
## 4. Criterios de aceptación

### AC-S10-001
- enlaza: REQ-S10-001, REQ-S10-002, REQ-S10-003, REQ-S10-004, REQ-S10-011, REQ-S10-015, BEH-S10-001, BEH-S10-007, BEH-S10-009, INV-S10-001, INV-S10-002
- metodo: sql
- procedimiento: consultar el esquema final por las tablas TasaCambio, MiembroReferencia y PadronHoja y por las columnas Pago.tasaCambio, Pago.montoBs, Sucursal.tasaCambioUSD, VitrinaItem.mostrarEquivalenteBs, Miembro.porRegularizar y Miembro.vieneDelExcel
- esperado: nada de eso existe
- test: pendiente

### AC-S10-002
- enlaza: REQ-S10-005, REQ-S10-006, REQ-S10-007, REQ-S10-012, REQ-S10-013, REQ-S10-014, REQ-S10-018, REQ-S10-020, REQ-S10-026, BEH-S10-002, BEH-S10-008, BEH-S10-011, BEH-S10-016
- metodo: unitario
- procedimiento: con la API de typescript y el sistema de archivos, buscar las entidades, puertos, repositorios, mapeadores, datos de prueba, casos de uso, utilidades, acciones, componentes, scripts y archivos retirados, leer las exportaciones de fechaLima y buscar xlsx en los package.json y package-lock.json
- esperado: nada de lo retirado existe, fechaLima no exporta las dos funciones y ninguna dependencia de hojas de cálculo figura
- test: pendiente

### AC-S10-003
- enlaza: REQ-S10-006, REQ-S10-009, BEH-S10-002, BEH-S10-004, BEH-S10-006
- metodo: integracion
- procedimiento: con la sesión de un socio, pedir api/tasa-cambio, api/tasa-cambio/historial, /configuraciones/excel, kiosco/estado y el manifiesto de kiosco/vitrina, y simular un cliente que acepta un tasaBcv nulo
- esperado: las tres primeras responden 404, ninguna respuesta de kiosco contiene tasaBcv ni equivalente en bolívares, el cliente sin tasa sigue funcionando
- test: pendiente

### AC-S10-004
- enlaza: REQ-S10-016, REQ-S10-017, BEH-S10-009, BEH-S10-010
- metodo: integracion
- procedimiento: ejecutar las pruebas de caracterización de S-07 sobre el cambio de plan y la edición de la ficha de un miembro, con el repositorio sin porRegularizar ni vieneDelExcel, y buscar «Por regularizar» y las dos columnas en los archivos de producción
- esperado: los resultados de caracterización coinciden con los de vieneDelExcel falso, la ficha no ofrece opciones especiales y la búsqueda no encuentra nada
- test: pendiente

### AC-S10-005
- enlaza: REQ-S10-010, REQ-S10-019, REQ-S10-021, BEH-S10-005, BEH-S10-012, BEH-S10-013, INV-S10-004
- metodo: integracion
- procedimiento: con una base efímera, cambiar ConfiguracionNegocio.nombre a un valor generado con semilla fija y leer el título, el encabezado, el inicio de sesión, el kiosco y la vitrina; leer los textos, ayudas y mensajes de las pantallas del panel, del kiosco y de la vitrina
- esperado: cada superficie muestra el nombre vigente sin literal propio y ningún texto menciona bolívares, la tasa, el BCV, dólares ni Venezuela
- test: pendiente

### AC-S10-006
- enlaza: REQ-S10-022, REQ-S10-023, REQ-S10-024, REQ-S10-025, BEH-S10-014, BEH-S10-015
- metodo: unitario
- procedimiento: buscar con el sistema de archivos los recursos de la marca anterior y su README, buscar el nombre del cliente anterior en textos, comentarios y estilos, leer el identificador del tema y sus valores, y probar con un doble que el service worker nuevo usa una versión de caché distinta y no lista recursos retirados
- esperado: los recursos no existen, no hay menciones al cliente anterior, el tema se llama temaAdhara con los mismos colores y el service worker cumple lo indicado
- test: pendiente

### AC-S10-007
- enlaza: REQ-S10-027, REQ-S10-028, REQ-S10-029, BEH-S10-017, BEH-S10-018, INV-S10-003
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-venezuela.mjs con un árbol por cada uno de los veintisiete identificadores y de los patrones, con variantes de mayúsculas, un comentario, un archivo markdown, un término solapado y la palabra absoluto, y otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con todos los casos nombrando archivo, línea y término, lista los términos solapados, no marca absoluto, pasa con el limpio y en el árbol final solo aparecen archivos exentos de TV dentro de su tope
- test: pendiente

### AC-S10-008
- enlaza: REQ-S10-030, BEH-S10-019
- metodo: unitario
- procedimiento: ejecutar las pruebas de la lista de exenciones de verificar-venezuela con las cuatro entradas inválidas y una válida
- esperado: las cuatro inválidas fallan y la válida pasa
- test: pendiente

### AC-S10-009
- enlaza: REQ-S10-031, BEH-S10-020
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue tasaCambio en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-venezuela.mjs falla y su estado queda en rojo
- test: pendiente

### AC-S10-010
- enlaza: REQ-S10-032, BEH-S10-021
- metodo: unitario
- procedimiento: ejecutar las pruebas de las listas de exenciones de verificar-fechas, verificar-dinero y verificar-documento
- esperado: ninguna entrada nombra un archivo de la familia S-10
- test: pendiente


### AC-S10-011
- enlaza: REQ-S10-008, REQ-S10-033, REQ-S10-034, BEH-S10-003, BEH-S10-022, BEH-S10-023, INV-S10-005
- metodo: unitario
- procedimiento: probar la función pura que da el texto del reloj con los instantes de BEH-S10-003 y BEH-S10-022 y con 200 instantes generados con semilla fija, con TZ=UTC, America/Lima y Asia/Tokyo en procesos hijos; probar el estado del reloj con un reloj simulado que parte de la hora del servidor, avanza 10 segundos y tiene el reloj del navegador desfasado; y buscar la tasa en el encabezado
- esperado: los textos son los de los comportamientos, iguales en las tres zonas y con el formato de Lima, el reloj avanza desde la hora del servidor sin usar la hora local del navegador como origen y el encabezado no contiene tasa
- test: pendiente
## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final; la entrada de exención de cada archivo se retira en el mismo commit que lo borra): (1) pruebas del nombre desde `ConfiguracionNegocio` (INV-S10-004), que pasan contra lo existente porque cubren lo que se conserva, y pruebas de caracterización de `ActualizarMiembro` y del cambio de plan con `vieneDelExcel` falso; (2) `tools/verificar-venezuela.mjs` y sus pruebas, con una lista de exenciones inicial que incluye todos los archivos actuales (con tope por archivo) y que se achica en cada paso; (3) rótulo desde `ConfiguracionNegocio.nombre` y renombre de `temaAdrenalinaXtreme` a `temaAdhara` en un solo commit con todos sus usos, y reemplazo de `RelojYTasa` y de la tasa del encabezado por `RelojLima` (función pura del texto y componente con la hora del servidor) migrando `layout.tsx`; (4) retirar el padrón: `ActivarDesdeExcel`, la pestaña y la carpeta `configuraciones/excel`, `activarDesdeExcelAction`, los casos de uso y utilidades con sus pruebas, las entidades, los puertos, los repositorios, los mapeadores y los datos de prueba, y los lectores de `porRegularizar` y `vieneDelExcel` (incluidas las ramas de `ActualizarMiembro` y `FormularioMiembro`), junto con `medianocheLimaDeFechaUtc`; (5) retirar la tasa: las rutas, `RelojYTasa*`, `ModalHistorialTasas`, `tasaBcv*`, `tasaActual`, los tres scripts, los casos de uso, `BcvApiAdapter`, la entidad, el puerto, los repositorios, y los lectores y mapeadores de `tasaCambio`, `montoBs` y `tasaCambioUSD`; (6) quitar los bolívares y la tasa de kiosco, vitrina y `FichaReposo` (contrato de `kiosco/estado` y del manifiesto, `Badges`, `Cartel`, `Reproductor`, `vitrinaBadges`, `kiosk/lib/api.ts`, `kiosk/app/page.tsx` y `mostrarEquivalenteBs`), `formatearBs` y `diaCalendarioLima`, y los textos y ayudas de bolívares y tasa; (7) esquema: retirar `TasaCambio`, `MiembroReferencia`, `PadronHoja`, `Pago.tasaCambio`, `Pago.montoBs`, `Sucursal.tasaCambioUSD`, `VitrinaItem.mostrarEquivalenteBs`, `Miembro.porRegularizar` y `Miembro.vieneDelExcel`; (8) retirar los recursos gráficos de la marca anterior, la referencia de `marca-agua.css`, el `slug` de `verificar-autorizacion.ts` y los comentarios, subir la versión de caché del service worker del kiosco, y quitar `xlsx` de `package.json` y regenerar `package-lock.json`; (9) vaciar las exenciones de la familia S-10 de las listas de `verificar-fechas`, `verificar-dinero` y `verificar-documento`.
- Las pruebas usan semillas fijas; no hay dependencias nuevas.
- El criterio AC-S10-009 es un paso manual del propietario (el repositorio no tiene un ejecutor de navegador); la lectura de pantallas se prueba sobre los textos y los datos que las alimentan.
- La herramienta recorre los archivos con extensión `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, `.css`, `.md`, `.html`, `.java`, `.xml`, `.gradle` y `.yml`, salta los binarios y busca cada término por separado, de modo que los términos solapados se listan todos.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15); no existen tasas, padrón ni miembros por regularizar. Los volúmenes de desarrollo creados antes de S-10 se recrean (SUP-S10-012).
- **Enmiendas que se registran al aprobar S-10:**
  - ADR-007: la Decisión (el importador CSV genérico) y la mención de ADR-004:42 quedan sin efecto por orden del propietario (S-16 descartada); ADR-003:17 se lee conservando un reloj de Lima sin tasa en el encabezado (decisión del propietario, 2026-11-12).
  - S-02: REQ-S02-001 y la tabla de 5.1 retiran `medianocheLimaDeFechaUtc` y `diaCalendarioLima`; AC-S02-012, REQ-S02-020 y SUP-S02-004 pierden a S-10 como dueña de exenciones; 0.3 deja las apps de TV a S-20 y S-21.
  - S-03: la tabla de familias (5.1) y su REQ de exenciones (REQ-S03-030), los comportamientos y criterios que las prueban (BEH-S03 y AC-S03 de exenciones) y SUP-S03-010 dejan a S-10 con una familia vacía; el puente de dinero deja de nombrar archivos de S-10.
  - S-04: SUP-S04-011, 0.3 y 0.4 se leen como cumplidos (`Pago.tasaCambio`, `Pago.montoBs`, «Por regularizar»).
  - S-05: SUP-S05-002, SUP-S05-005 y 0.3 dejan de nombrar `Sucursal.tasaCambioUSD` y la familia S-10.
  - S-06: REQ-S06-030 y las exenciones de `verificar-documento` de la familia del padrón desaparecen (sus archivos se retiran); SUP-S06-007 queda cumplido.
  - S-07: las ramas `vieneDelExcel` de `ActualizarMiembro` que dejó a S-10 (0.3) quedan retiradas.
  - S-08: la nota sobre `Pago.montoBs` y la tasa de 0.3 se lee como cumplida.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 restan tres tablas (`TasaCambio`, `MiembroReferencia`, `PadronHoja`); REQ-S22-007 y AC-S22-003 restan sus repositorios; REQ-S22-009 y AC-S22-004 quitan `TasaCambio` de la prueba de humo; REQ-S22-028, BEH-S22-026 y AC-S22-026 restan la suite de `MiembroReferencia`; AC-S22-028 resta `TasaCambio`; REQ-S22-030, BEH-S22-022, AC-S22-021 y AC-S22-022 dejan de usar `lib/activacion.ts`; REQ-S22-019 baja la cifra de pruebas de dominio retiradas (SUP-S10-011).
  - S-00: el aviso sobre `xlsx` de 0.4 se lee como cumplido (REQ-S10-026).
  - `docs/superpowers/BACKLOG-SPECS.md` (S-15 pasa a depender también de S-08 y S-10; S-10 «Aprobada» al aprobarse), `docs/00-indice.md`, `docs/06-modelo-datos-cambios.md` (línea del importador), `COBERTURA-RF.md` (S-16 descartada) y `docs/09-verificacion-contra-codigo.md`: notas de que S-10 retiró lo venezolano.
- **Traspasos:** S-19 (colores, tipografía, componentes, diseño del reloj y logo de Adhara Fit), S-20 y S-21 (identificadores `com.adrenalina.*`, lanzadores «AX», íconos Android, README, `prueba/index.html` y textos de tasa de las apps de TV, con la exención cerrada), S-11 (catálogo y venta de productos) y S-15 (seed y baseline).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Son unos ciento cincuenta archivos entre tasa, padrón, bolívares y marca (las cifras de 0.4 suman familias que se solapan); el riesgo es una referencia que sobreviva y rompa en ejecución. Mitigación: el typecheck y la herramienta de términos.
- Cambia el contrato de `kiosco/estado` y del manifiesto de la vitrina mientras puede haber kioscos y APK de TV ya instalados. Mitigación: el cliente actual tolera `tasaBcv` nulo (`Reproductor.tsx:34`) y el servidor y las apps se despliegan juntos (SUP-S10-010).
- El service worker del kiosco precachea `adrenalina-gym-bg.png` (`sw.js:15`): si se retira el archivo sin subir la versión de caché, el precaché falla o muestra la marca anterior. Mitigación: REQ-S10-025.
- Con la marca reducida a un rótulo de texto y el tema verde del cliente anterior bajo el nombre `temaAdhara`, el kiosco, la vitrina y el panel quedan sobrios y con colores heredados hasta S-19. Mitigación: S-19 depende de S-10; el propietario debe entregar el logo definitivo.
- Las apps de TV conservan la marca anterior (íconos, lanzadores «AX», `appId`) hasta S-20 y S-21; la exención de la herramienta es cerrada y con tope. Mitigación: SUP-S10-009.
- `escudo.png` retirado de `vitrina/` y de `vitrina-tv/capacitor/assets/` rompe `generar-iconos.mjs:9`; el segundo lo trata S-20.
- El reloj depende de que el navegador avance de forma estable desde la hora del servidor; un navegador en suspensión puede quedar desfasado hasta recargar. Mitigación: se recalcula al volver a primer plano.
- Al retirar `porRegularizar` y `vieneDelExcel` se pierde la marca de datos sin verificar; un miembro cargado a mano con datos erróneos queda sin ese aviso. Mitigación: los datos los captura el socio al registrar.
- Se pierden pruebas y baja la cobertura (ADR-016, S-22 REQ-S22-019); se declara la lista en SUP-S10-011.
- El nombre del cliente anterior puede sobrevivir en archivos binarios que `grep` no inspecciona. Mitigación: S-19, S-20 y S-21 revisan los recursos gráficos (no verificado).
- Los volúmenes de desarrollo previos deben recrearse (SUP-S10-012).
- Las cifras de 0.4 cambian cuando S-00 a S-09 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿El encabezado conserva un reloj con la fecha y la hora de Lima, sin tasa, para controlar la hora de las transacciones? Default: sí (SUP-S10-002); confirmado por el propietario el 2026-11-12.
- ¿El nombre visible sale de la configuración del negocio («Adhara Fit») y se muestra como texto hasta que entregues el logo definitivo? Default: sí (SUP-S10-005).
- ¿Se elimina `Miembro.porRegularizar` junto con el padrón y se conserva el comportamiento normal del cambio de plan? Default: sí (SUP-S10-004).
- ¿Las apps de TV conservan su marca anterior hasta S-20 y S-21? Default: sí, con una exención cerrada (SUP-S10-009).
- ¿Se retiran las pruebas de lo que se elimina (tasa, padrón, bolívares)? Default: sí (SUP-S10-011).

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de otras specs. El texto anterior se conserva; donde choca, rige esta sección.*
- Por la aprobación de S-11: `productos/tasaActual.ts` se elimina entero y no solo la tasa.

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura), que recibió únicamente la ruta y la lista de comprobación. Veredicto sobre la versión `22cfc6f`; cada fila se resume y el veredicto global se conserva tal como lo entregó. El revisor usó `Read`, `Grep` y `Glob`, reprodujo los conteos de 0.4 (70 de tasa, 28 de padrón, 24 de «Por regularizar», 25 de Caracas) y comprobó que los demás archivos citados existen.

> | # | Comprobación | Veredicto | Qué corregir (resumen del revisor) |
> |---|---|---|---|
> | 1 | Cabecera y ADRs | CUMPLE (con observaciones) | Sumar ADR-008, ADR-020 y ADR-021 y S-09; quitar ADR-022 (ningún REQ lo usa). |
> | 2 | REQ: una obligación, EARS, origen | NO CUMPLE (menor) | Orígenes dudosos (REQ-016 y REQ-026 citan ADR-003 para la hora de Caracas; REQ-012 y REQ-013 deben citar ADR-007; REQ-021 a REQ-023 y REQ-024); compuestos (REQ-013, REQ-015, REQ-017, REQ-018); redundantes (REQ-025 y REQ-026); confirmar que conservar un reloj no contradice ADR-003. |
> | 3 | Cobertura | NO CUMPLE (menor) | REQ-021 lista 23 términos y BEH-011 y AC-006 dicen «veintidós»; términos solapados sin salida definida; BEH-014 pide «el día de Lima» sin REQ; INV-001 e INV-002 con mecanismo `restriccion-bd` para una tabla ausente; faltan bordes y errores de la herramienta. |
> | 4 | AC binarios | NO CUMPLE | AC-004 pasa antes y después (un miembro nuevo nunca tuvo la marca); AC-005 manual junta 9 REQ; AC-003 prueba un componente React sin DOM de pruebas; AC-008 pasa en vacío porque las listas de `verificar-pagos`, `verificar-plan` y `verificar-caja` no contienen archivos de S-10 y falta `verificar-documento`. |
> | 5 | Hechos de 0.4 | CUMPLE (con 3 salvedades) | Escribir el patrón exacto de cada conteo; `porRegularizar` también en `ActualizarMiembro.ts:73`; «Caracas» omite tres Dockerfile y un HTML; «unos 150» sin cálculo. |
> | 6 | Hechos incompletos que afectan al diseño | NO CUMPLE | Bolívares y tasa en vitrina y kiosco (`Badges`, `Reproductor`, `Cartel`, `vitrinaBadges`, `kiosco.ts`, `kiosco/estado`, `kiosco/vitrina`, `FichaReposo`, `mostrarEquivalenteBs`); marca anterior mucho mayor que 9 archivos (mayúsculas, imágenes, `appId`, README, `slug`, lanzadores «AX»); el reloj actual muestra fecha y segundos. |
> | 7 | Supuestos y preguntas | NO CUMPLE (menor) | SUP-001 y SUP-003 se dicen «decisión» y «asumido»; implícitos sin declarar: nombre desde `ConfiguracionNegocio`, reloj, rama de `vieneDelExcel`, `appId`, pruebas borradas; faltan preguntas. |
> | 8 | Contradicciones | NO CUMPLE | REQ-016, BEH-008 y el paso 6 duplican a S-02 (que ya borra `fechaCaracas`) y ningún REQ borra `medianocheLimaDeFechaUtc` ni `diaCalendarioLima`; enmiendas falsas en S-04 (REQ-S04-045) y S-07 (REQ-S07-057, REQ-S07-060); falta la enmienda a ADR-007 (importador); ADR-003:17 elimina el reloj y SUP-S10-002 lo conserva; la familia S-10 de S-03 no cubre varios archivos; las exenciones de `verificar-documento` de S-06; declarar las pruebas que se borran. |
> | 9 | Alcance | NO CUMPLE | Huecos: bolívares de la vitrina, marca residual en TV; solapes con S-20 y con archivos de S-11; falta S-10 en la dependencia de S-15. |
> | 10 | Viabilidad | NO CUMPLE | La herramienta distingue mayúsculas y no ve «ADRENALINA», `registrarTasaManualAction`, «Bs.», «BCV» ni los `appId`; la prueba de `absoluto` es vacía; `RelojLima` sin ruta ni función pura; el paso 1 deja pruebas en rojo; entradas de exención colgantes entre commits; entidades y mapeadores sin migrar antes de quitar columnas; el lockfile no se regenera. |
> | 11 | Riesgos omitidos | NO CUMPLE | Contrato `kiosco/estado` con clientes instalados, precaché del service worker, volúmenes previos con `drizzle-kit push`, pérdida de pruebas, `escudo.png` y `generar-iconos.mjs`, tema verde bajo el nombre Adhara, exenciones colgantes, `ve.dolarapi.com`. |
> | 12 | Enmiendas a specs aprobadas | NO CUMPLE | Correctas: S-03 REQ-S03-030, S-22 REQ-S22-016/007/009; incorrectas: S-04 y S-07; incompletas: S-02 (AC-S02-012), S-03, S-06, S-05, S-08, S-22 (REQ-S22-028, AC-S22-028, REQ-S22-030, REQ-S22-019); faltan ADR-007, ADR-004:42, BACKLOG, `docs/00-indice.md`, `docs/06:117` y COBERTURA-RF. |
> | 13 | Forma | NO VERIFICABLE | No ejecutó el lint; «sobrios» y «unos 150» imprecisos; pegar la revisión. |
>
> **VEREDICTO GLOBAL: REQUIERE CAMBIOS.**

### Conciliación del autor
Todos los hallazgos se verificaron contra el Repo A, las specs y los ADR y resultaron ciertos; ninguno se rechazó. Verificados con `grep` y `ls`: los recursos `adrenalina-*` y `logo-adrenalina-gym.jpg` en `web-admin/public/branding`, `ADR-003:17` («el reloj/tasa del layout»), las tablas de `fechaLima` de S-02 y los archivos con `tasaBcv`, `equivalenteBs` y `mostrarEquivalenteBs`.

- Fila 1 y 2: `adrs` suma ADR-008, ADR-020 y ADR-021 y quita ADR-022; `depende_de` suma S-09; los REQ se rehicieron (32): una obligación cada uno, con orígenes en ADR-003, ADR-007, ADR-020 y ADR-021; REQ-S10-016 y REQ-S10-017 separan retirar las columnas de conservar el comportamiento normal.
- Fila 3: «veintisiete identificadores» más siete patrones y definición de la salida con términos solapados (REQ-S10-029); INV-001 e INV-002 se prueban con una consulta de esquema y INV-004 prueba el nombre; BEH-S10-017 y BEH-S10-018 cubren mayúsculas, comentarios, markdown y solapes.
- Fila 4: AC-004 pasa a pruebas de caracterización de S-07 y búsqueda estática; AC-002 y AC-006 son automáticos y la lectura de pantallas se prueba sobre los datos que las alimentan (AC-005); AC-008 se reescribe sobre las listas reales (`verificar-fechas`, `verificar-dinero`, `verificar-documento`) y la lista propia de TV (AC-S10-008).
- Fila 5 y 6: 0.4 escribe el patrón de cada conteo, suma `ActualizarMiembro.ts:73`, los Dockerfile, el bloque de bolívares en kiosco y vitrina con su contrato, la lista completa de la marca anterior (mayúsculas, imágenes, `appId`, README, `slug`, lanzadores) y el comportamiento del reloj; «unos 150» se explica como suma de familias que se solapan.
- Fila 7: nuevos SUP-S10-009 a SUP-S10-012 (apps de TV con exención, contrato sin `tasaBcv`, pruebas que se retiran, volúmenes previos) y SUP-S10-005 declara que el nombre sale de `ConfiguracionNegocio.nombre`.
- Fila 8: S-10 deja `fechaCaracas.ts` a S-02 y retira de `fechaLima` solo `medianocheLimaDeFechaUtc` y `diaCalendarioLima` (REQ-S10-020); el reloj se elimina como pide ADR-003 (SUP-S10-002, decisión que se pregunta al propietario); las exenciones de TV son cerradas y con tope (REQ-S10-030); 5.2 quita las enmiendas falsas de S-04 y S-07.
- Fila 9: los bolívares de la vitrina entran (REQ-S10-004, REQ-S10-009, REQ-S10-010); la marca de las apps de TV se traspasa a S-20 y S-21; los archivos de productos se editan solo para quitar la tasa; S-15 pasa a depender de S-10 y S-08.
- Fila 10: la herramienta distingue mayúsculas para identificadores y no para marca y Venezuela, fija las extensiones que recorre y excluye binarios, `out` y `.turbo`; se quita el reloj nuevo; el plan se rehizo en nueve pasos con las exenciones retiradas en el mismo commit que cada archivo, las entidades y mapeadores antes de las columnas y el lockfile regenerado (REQ-S10-026).
- Fila 11 y 12: 5.3 suma los riesgos omitidos y 5.2 lista las enmiendas con los IDs del revisor (S-02, S-03, S-05, S-06, S-08, S-22, ADR-007 y documentos).
- Lo que no se pudo verificar y queda marcado «no verificado»: los archivos binarios y el contenido de las 66 coincidencias de la subcadena `Bs`.
- Cambio posterior a la conciliación, por orden del propietario (2026-11-12): se conserva un reloj con la fecha y la hora de Lima, sin tasa, para controlar la hora de las transacciones (SUP-S10-002, REQ-S10-008, REQ-S10-033, REQ-S10-034, INV-S10-005 y AC-S10-011); ADR-003:17 se enmienda.
- Aprobación: el propietario escribió «S-10 aprobada» el 2026-11-12 sobre este texto, con el veredicto pegado; aceptó los valores por defecto de las demás preguntas de 5.4 (nombre desde la configuración del negocio, sin marca «por regularizar», apps de TV con su marca hasta S-20 y S-21 y pruebas retiradas).
