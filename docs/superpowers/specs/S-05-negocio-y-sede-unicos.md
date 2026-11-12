---
id: S-05
estado: en-revision
adrs: ADR-002, ADR-004, ADR-012, ADR-016, ADR-019, ADR-022
depende_de: S-00, S-01, S-04, S-22
aprobada_por:
fecha_aprobacion:
---
# S-05 — Negocio y sede únicos: sin organización, con una sola sede oculta y una configuración global

## 0. Contexto y alcance

### 0.1 Problema
El código heredado está pensado para varias organizaciones con varias sedes cada una: `organizacionId` recorre el esquema, los puertos, los casos de uso y las pantallas, el usuario elige sede al iniciar sesión y cada miembro, plan y pago está atado a una sede. Adhara Fit es un solo negocio con un solo local. ADR-019 (aceptado) elimina `Organizacion` y `organizacionId` (opción B); ADR-002 (aceptado) mantiene la tabla `Sucursal` con exactamente una fila oculta y retira selectores, `UsuarioSucursal`, `multisede` y el permiso `SUCURSALES`, y manda `reposo*` a una configuración global; ADR-004 (aceptado) pasa las unicidades de documento a globales. S-05 ejecuta esa cirugía transversal, que ADR-019 declaró de alcance desconocido y que aquí se mide.

### 0.2 Dentro de alcance
- Eliminación de `Organizacion`, `TemaOrganizacion` y de `organizacionId` en todas las tablas, puertos, repositorios, casos de uso, rutas, acciones, sesión y pruebas, incluidas las tablas que otras specs retiran después (`Turno`, `DeudaProducto`, `PadronHoja`, `CambioPlanAuditoria` y `MiembroReferencia`), porque no pueden conservar una clave foránea a una tabla que ya no existe.
- Tabla `ConfiguracionNegocio` de una sola fila, con el nombre del negocio y los campos `reposo*` y `vitrina*` que hoy viven en `Sucursal`.
- `Sucursal` con exactamente una fila oculta y el ayudante `obtenerSedeUnica()` sin parámetros; `Pago.sucursalId`, `CheckIn.sucursalId` y `VitrinaItem.sucursalId` se llenan solos.
- Retiro de lo multisede: `UsuarioSucursal`, `Plan.multisede`, `Miembro.sucursalId`, `UsuarioAdmin.sucursalId`, la opción «Ambas», el permiso `SUCURSALES`, los casos de uso y las pantallas de sucursales y el estado `sucursal_incorrecta`.
- Inicio de sesión en un solo paso, sin ruta `auth/login/sucursal` y sin `Sesion.sucursalActivaId`.
- Rotación de la clave del kiosco desde la pantalla de configuración del kiosco (S-01 la ligaba a la pantalla de sucursales).
- Unicidad global del documento del miembro.
- `tools/verificar-negocio.mjs` con sus pruebas, ejecutada en el CI.
- Pruebas de caracterización previas y adaptación de las 18 pruebas que usan `organizacionId`.

### 0.3 Fuera de alcance
- Renombrar `cedula` a `numeroDocumento`, el tipo de documento y el `codigoSocio`: S-06 (S-05 solo hace la unicidad global).
- Eliminar las tablas y los casos de uso de turnos y caja (S-08), del padrón y lo venezolano (S-10) y del fiado y ventas de producto (S-11): S-05 solo les quita `organizacionId`.
- Un solo rol de administrador y retiro de los permisos por módulo (S-23).
- Contenido y diseño de la vitrina y del kiosco (S-19, S-20 y S-21): S-05 solo cambia dónde se guarda su configuración.
- Datos iniciales de la sede y de la configuración: el seed (S-15).
- `Sucursal.tasaCambioUSD`, que retira S-10.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Organización:** `model Organizacion` está en `packages/db/prisma/schema.prisma:15` y `TemaOrganizacion` en `:572`; hay 33 líneas con `organizacionId` en el esquema; las tablas que lo llevan son `Sucursal`, `UsuarioAdmin`, `Miembro`, `Plan`, `ReglaAbonoPorFrecuencia` (que retira S-04), `Producto`, `DeudaProducto`, `CambioPlanAuditoria`, `Turno`, `MetodoPago`, `TemaOrganizacion`, `MiembroReferencia` y `PadronHoja` (verificado con `awk '/^model /{m=$2} /organizacionId +String/{print m}'`); cuatro unicidades lo incluyen: `@@unique([organizacionId, cedula])` en `schema.prisma:177` y `:652`, `[organizacionId, frecuencia]` en `:241` y `[organizacionId, sucursalId]` en `:668`.
- **Alcance en código:** 154 archivos `.ts` y `.tsx` mencionan `organizacionId` (18 de ellos son pruebas) y los puertos de `packages/domain/ports` lo tienen en 43 líneas (verificado con `grep -rIlE organizacionId apps packages --include=*.ts --include=*.tsx` y `grep -rIn organizacionId packages/domain/ports`). `TemaOrganizacion` aparece en 1 archivo.
- **Sede:** `Sucursal` está en `schema.prisma:37` con `diasGracia` (que retira S-04), `tasaCambioUSD` (S-10), `apiKey` (S-01), `reposoFrases`, `reposoImagenUrl`, `reposoOpacidad`, `vitrinaDuracionSeg`, `vitrinaTransicion` y `vitrinaVersion`; `UsuarioSucursal` está en `:131`, `Miembro.sucursalId` es opcional y significa «Ambas» si es nulo (`:149`) y `Plan.multisede` está en `:205`. Los modelos que llevan `sucursalId` son `CheckIn`, `DeudaProducto`, `Miembro`, `MiembroReferencia`, `PadronHoja`, `Pago`, `Turno`, `UsuarioAdmin`, `UsuarioSucursal` y `VitrinaItem`.
- **Cuántos archivos tocan la sede:** `sucursalId` o `sucursalActivaId` en 124 archivos, `sucursalActivaId` en 42, `UsuarioSucursal` en 16, `multisede` en 15, `SUCURSALES` en 11, `ObtenerSucursalesVisibles` en 8, `MiembroFueraDeSucursal` en 15 y `sucursal_incorrecta` en 10 (mismo `grep`). (verificado con `grep -rIlE` sobre `apps` y `packages` por cada término)
- **Sesión y login:** `Sesion.sucursalActivaId` puede ser nulo en la entidad (`packages/domain/entities/Sesion.ts:10`) y `validarSesion` trata esas sesiones como inválidas (`ValidarSesion.ts:33-40`); el login tiene dos pasos, `auth/login` y `auth/login/sucursal` (`ls apps/web-admin/app/api/auth/login`).
- **Pantallas y casos de uso de sucursal:** `apps/web-admin/app/(panel)/sucursales` tiene `FormularioSucursal.tsx`, `[id]`, `actions.ts`, `layout.tsx`, `nuevo` y `page.tsx`; los casos de uso son `CrearSucursal`, `ActualizarSucursal`, `ListarSucursales`, `AsignarSucursalesAUsuario`, `ObtenerSucursalesVisiblesParaUsuario`, `ObtenerUltimoCierrePorSucursal` y `ValidarAccesoSucursalPorPlan` (verificado con `ls`). `MiembroFueraDeSucursalError` se declara en `ObtenerMiembro.ts:11`.
- **Configuración del kiosco y la vitrina:** `kiosko/actions.ts:29-32` guarda `reposo*` en «la sucursal activa» con `PrismaSucursalRepository.actualizar(usuario.organizacionId, …)` y `vitrina/actions.ts:133` usa `sesion.sucursalActivaId`.
- **Ayudante inexistente:** `obtenerSedeUnica` no figura en ningún archivo del Repo A (0 coincidencias): ADR-002 y ADR-019 lo proponen y esta spec lo crea. (verificado con `grep -rIn obtenerSedeUnica apps packages`)
- **Decisiones heredadas:** ADR-002 (una fila «Local», `diasGracia` y `reposo*` a configuración global; el login elige la sede solo), ADR-019 (nombra `ConfiguracionOrganizacion`, que no existe en el esquema heredado (`grep -c ConfiguracionOrganizacion schema.prisma` da 0); aquí `ConfiguracionNegocio` es una tabla nueva de una sola fila; unicidades globales; terminología «el negocio»), ADR-004 (unicidad global del documento sin tipo) y las enmiendas de ADR-002 («sin selector confirmado»). (verificado con `grep -n` en `docs/adr/ADR-002`, `ADR-004` y `ADR-019`)
- **Interacción con specs aprobadas:** S-01 liga la rotación de la clave del kiosco a «crear una sucursal» y lista `auth/login/sucursal` entre las rutas públicas (REQ-S01-009, REQ-S01-015 y REQ-S01-002); S-04 dejó a S-05 `MiembroFueraDeSucursalError` y `sucursal_incorrecta` (`S-04` §0.3). (verificado con `grep -n` en `S-01` y `S-04`)
- No verificado: que ningún flujo dependa de tener más de una sede, y el contenido exacto de las 18 pruebas que usan `organizacionId`.

### 0.5 Supuestos
- SUP-S05-001: la sede única se llama «Local» (ADR-002) y el negocio «Adhara Fit»; ambos nombres los crea el seed (S-15). Default: esos nombres; asumido, por validar.
- SUP-S05-002: `Pago.sucursalId`, `CheckIn.sucursalId` y `VitrinaItem.sucursalId` se conservan como clave foránea a la sede única (así lo decide ADR-002 para limitar el cambio), y se retira `sucursalId` de `Miembro`, `UsuarioAdmin` y `MiembroReferencia`; `DeudaProducto`, `PadronHoja` y `Turno` lo conservan hasta que S-11, S-10 y S-08 los retiren. Default: ese reparto; asumido, por validar.
- SUP-S05-003: `ConfiguracionNegocio` y `Sucursal` garantizan una sola fila con una columna `unica` booleana, con valor verdadero, restringida a ser verdadera y única; la presencia de la fila la asegura el seed y la comprobación de salud. Default: ese mecanismo; asumido, por validar.
- SUP-S05-004: la clave de API del kiosco sigue en `Sucursal` (S-01) y su rotación pasa a la pantalla de configuración del kiosco, que ya existe en `apps/web-admin/app/(panel)/kiosko`. Default: esa ubicación; asumido, por validar.
- SUP-S05-005: todos los archivos de las familias de S-08, S-10 y S-11 se editan aquí solo para quitar `organizacionId` y no tienen exenciones para los términos de organización, porque una clave foránea a una tabla inexistente no compila. Default: edición mecánica sin otro cambio; asumido, por validar.
- SUP-S05-006: la unicidad global del documento se aplica a la columna actual `cedula` (`Miembro`) y la renombra S-06. Default: `@@unique([cedula])`; asumido, por validar.
- SUP-S05-007: no hay sesiones ni datos que migrar; las sesiones existentes dejan de valer. Default: sin migración; asumido, por validar.
- SUP-S05-008: si el plan global (G6) coloca S-08, S-10 y S-11 antes de S-05, S-05 se reduce porque esas tablas ya no existirán. Default: S-05 antes, como hoy; asumido, por validar.
- SUP-S05-009: el permiso `SUCURSALES` desaparece de `ModuloPermiso` ahora y los permisos por módulo se simplifican después en S-23. Default: retirar solo ese valor; asumido, por validar.

## 1. Requisitos

### REQ-S05-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-019
- texto: El esquema no deberá contener la tabla Organizacion, la tabla TemaOrganizacion ni ninguna columna organizacionId.

### REQ-S05-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-019
- texto: Los puertos, repositorios, casos de uso, rutas, acciones, sesión y pruebas no deberán recibir, devolver ni filtrar por organizacionId.

### REQ-S05-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-019
- texto: La tabla ConfiguracionNegocio, y no Sucursal, deberá contener el nombre del negocio y los campos reposoFrases, reposoImagenUrl, reposoOpacidad, vitrinaDuracionSeg, vitrinaTransicion y vitrinaVersion.

### REQ-S05-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-019
- texto: La base de datos deberá admitir como máximo una fila en ConfiguracionNegocio y como máximo una fila en Sucursal.

### REQ-S05-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La función obtenerSedeUnica, sin parámetros, deberá devolver la única sucursal y lanzar un error si no existe exactamente una.

### REQ-S05-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La comprobación de salud de web-admin deberá fallar mientras no exista exactamente una fila en Sucursal y una en ConfiguracionNegocio.

### REQ-S05-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El esquema deberá imponer que la cédula del miembro sea única en todo el sistema.

### REQ-S05-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: Las acciones y las rutas deberán llenar Pago.sucursalId, CheckIn.sucursalId y VitrinaItem.sucursalId con la sede devuelta por obtenerSedeUnica, sin recibirla del cliente.

### REQ-S05-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: El esquema no deberá contener UsuarioSucursal, Plan.multisede, Miembro.sucursalId, UsuarioAdmin.sucursalId ni MiembroReferencia.sucursalId.

### REQ-S05-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: El enum ModuloPermiso no deberá contener el valor SUCURSALES.

### REQ-S05-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: Los casos de uso CrearSucursal, ActualizarSucursal, ListarSucursales, AsignarSucursalesAUsuario y ObtenerSucursalesVisiblesParaUsuario no deberán existir.

### REQ-S05-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: El código no deberá contener MiembroFueraDeSucursalError ni el estado sucursal_incorrecta, de modo que EstadoCheckIn tenga solo activo y vencido.

### REQ-S05-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La carpeta de pantallas sucursales, su entrada del menú y todo selector de sede u opción «Ambas» de los formularios no deberán existir.

### REQ-S05-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La ruta auth/login/sucursal y el campo Sesion.sucursalActivaId no deberán existir.

### REQ-S05-015
- tipo: cuando
- prioridad: MUST
- origen: ADR-002
- texto: Cuando las credenciales son válidas, auth/login deberá crear la sesión y la cookie en una sola petición, sin pedir elegir sede.

### REQ-S05-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: validarSesion no deberá exigir ni consultar una sede.

### REQ-S05-017
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando el socio rota la clave del kiosco desde la pantalla de configuración del kiosco, el sistema deberá mostrar la clave nueva una sola vez y dejar sin efecto la anterior.

### REQ-S05-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La clave de API del kiosco deberá autenticar contra la sede única, sin recibir ni aceptar un identificador de sede.

### REQ-S05-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-019
- texto: La configuración del kiosco y de la vitrina deberá leerse y guardarse en ConfiguracionNegocio.

### REQ-S05-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-019
- texto: El incremento de vitrinaVersion deberá ser atómico, de modo que N cambios simultáneos del contenido lo aumenten en N.

### REQ-S05-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Las pruebas de dominio y las 18 pruebas que usaban organizacionId deberán pasar sin ese parámetro, con pruebas de caracterización creadas antes de la cirugía.

### REQ-S05-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-019
- texto: Los archivos de apps y packages no deberán contener los términos organizacionId, Organizacion, TemaOrganizacion, UsuarioSucursal, multisede, sucursalActivaId, SUCURSALES, sucursal_incorrecta ni MiembroFueraDeSucursal.

### REQ-S05-023
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-negocio.mjs encuentra alguno de los términos de REQ-S05-022, deberá terminar con código distinto de cero y nombrar archivo y línea.

### REQ-S05-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-negocio.mjs en cada pull request.

### REQ-S05-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: tools/contrato-permisos.mjs deberá tener como únicas rutas públicas auth/login y auth/logout.

## 2. Comportamiento

### BEH-S05-001
- cubre: REQ-S05-001, REQ-S05-002
- categoria: feliz
- dado: el esquema y el código finales
- cuando: se consulta el esquema y se busca organizacionId en puertos, repositorios, casos de uso, rutas, acciones y pruebas
- entonces: no existe la tabla Organizacion ni TemaOrganizacion ni columna organizacionId, y no hay coincidencias en el código

### BEH-S05-002
- cubre: REQ-S05-003
- categoria: feliz
- dado: una base creada con el esquema final y la configuración con nombre «Adhara Fit»
- cuando: se leen la configuración y la fila de Sucursal
- entonces: ConfiguracionNegocio trae el nombre y los seis campos de reposo y vitrina, y Sucursal no tiene ninguno de ellos

### BEH-S05-003
- cubre: REQ-S05-004
- categoria: error
- dado: una base con una fila en Sucursal y una en ConfiguracionNegocio
- cuando: se intenta insertar una segunda fila en cada tabla
- entonces: la base rechaza ambas inserciones

### BEH-S05-004
- cubre: REQ-S05-005
- categoria: error
- dado: una base con cero filas en Sucursal y otra con la fila única
- cuando: se llama a obtenerSedeUnica en cada una
- entonces: la primera lanza el error de sede única inválida y la segunda devuelve la sede «Local»

### BEH-S05-005
- cubre: REQ-S05-006
- categoria: error
- dado: web-admin con la base sin fila en Sucursal y luego con ambas filas
- cuando: se consulta la comprobación de salud
- entonces: falla en el primer caso y pasa en el segundo

### BEH-S05-006
- cubre: REQ-S05-007
- categoria: error
- dado: un miembro con cédula "12345678"
- cuando: se intenta guardar otro con la misma cédula
- entonces: la base rechaza la segunda inserción y el repositorio devuelve el error de documento duplicado

### BEH-S05-007
- cubre: REQ-S05-008
- categoria: feliz
- dado: un cobro, un check-in y un ítem de vitrina creados desde la interfaz sin indicar sede
- cuando: se leen sus filas
- entonces: los tres tienen sucursalId igual al de la sede única

### BEH-S05-008
- cubre: REQ-S05-008
- categoria: borde
- dado: una petición a api/pagos que trae sucursalId de otra sede en el cuerpo
- cuando: se ejecuta
- entonces: el cuerpo con sucursalId se rechaza por campo desconocido y el pago no se crea

### BEH-S05-009
- cubre: REQ-S05-009, REQ-S05-010
- categoria: feliz
- dado: el esquema final
- cuando: se consulta por UsuarioSucursal, multisede, las columnas sucursalId de Miembro, UsuarioAdmin y MiembroReferencia, y el enum de módulos
- entonces: no existen y ModuloPermiso no tiene SUCURSALES

### BEH-S05-010
- cubre: REQ-S05-011, REQ-S05-012
- categoria: feliz
- dado: el código final
- cuando: se buscan los cinco casos de uso, MiembroFueraDeSucursalError y sucursal_incorrecta
- entonces: no existen y EstadoCheckIn solo tiene activo y vencido

### BEH-S05-011
- cubre: REQ-S05-013
- categoria: feliz
- dado: el panel con un socio autenticado
- cuando: abre el menú, /sucursales, el alta de un miembro y el alta de un plan
- entonces: no hay entrada de Sucursales, /sucursales responde 404 y los formularios no tienen selector de sede ni «Ambas»

### BEH-S05-012
- cubre: REQ-S05-014, REQ-S05-015
- categoria: feliz
- dado: un usuario con credenciales válidas
- cuando: envía una sola petición a auth/login
- entonces: la respuesta trae la cookie de sesión y ningún indicador de elección de sede, y auth/login/sucursal responde 404

### BEH-S05-013
- cubre: REQ-S05-016
- categoria: borde
- dado: una sesión vigente creada sin sede
- cuando: llega una petición protegida con su token
- entonces: validarSesion la acepta sin consultar ninguna sede

### BEH-S05-014
- cubre: REQ-S05-017
- categoria: feliz
- dado: un socio en la pantalla de configuración del kiosco y la clave K1 en uso
- cuando: rota la clave
- entonces: la pantalla muestra la clave nueva K2 una sola vez, K1 deja de autenticar y una recarga solo muestra el prefijo de 8 caracteres

### BEH-S05-015
- cubre: REQ-S05-018
- categoria: error
- dado: una petición de kiosco con una clave válida y un encabezado X-Sucursal-Id de otra sede
- cuando: se ejecuta
- entonces: la clave autentica contra la sede única y el encabezado se ignora

### BEH-S05-016
- cubre: REQ-S05-019
- categoria: feliz
- dado: un socio que cambia las frases de reposo y la duración de la vitrina
- cuando: guarda
- entonces: los valores quedan en ConfiguracionNegocio y el kiosco y la vitrina los leen de allí

### BEH-S05-017
- cubre: REQ-S05-020
- categoria: concurrencia
- dado: ConfiguracionNegocio con vitrinaVersion igual a 5 y 20 cambios de contenido simultáneos
- cuando: todos terminan
- entonces: vitrinaVersion vale 25

### BEH-S05-018
- cubre: REQ-S05-021
- categoria: feliz
- dado: el repositorio antes de la cirugía
- cuando: se ejecutan las pruebas de caracterización de los flujos de miembro, plan, pago y check-in contra la implementación heredada y la nueva
- entonces: pasan en ambas con el mismo resultado, salvo las partes que dependían de elegir sede

### BEH-S05-019
- cubre: REQ-S05-022, REQ-S05-023
- categoria: error
- dado: archivos de prueba con organizacionId, Organizacion, UsuarioSucursal, multisede, sucursalActivaId, SUCURSALES, sucursal_incorrecta y MiembroFueraDeSucursal
- cuando: se ejecuta tools/verificar-negocio.mjs
- entonces: la herramienta falla y nombra archivo y línea de cada uno

### BEH-S05-020
- cubre: REQ-S05-024
- categoria: error
- dado: un pull request que agrega organizacionId en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-negocio.mjs falla y el pull request queda en rojo

### BEH-S05-021
- cubre: REQ-S05-025
- categoria: borde
- dado: tools/contrato-permisos.mjs con la lista pública de S-01 (auth/login, auth/login/sucursal y auth/logout) y con la lista nueva
- cuando: se ejecuta sobre el árbol final
- entonces: con la lista vieja falla porque la ruta auth/login/sucursal no existe, y con la nueva pasa

## 3. Invariantes

### INV-S05-001
- propiedad: la base tiene exactamente una fila en Sucursal y una en ConfiguracionNegocio una vez sembrada, y nunca más de una
- mecanismo: restriccion-bd
- deteccion: restricción única sobre la columna unica de ambas tablas; la comprobación de salud cuenta las filas
- protege: REQ-S05-004, REQ-S05-005, REQ-S05-006

### INV-S05-002
- propiedad: ningún archivo de apps ni packages contiene términos de organización ni de sede múltiple
- mecanismo: lint
- deteccion: tools/verificar-negocio.mjs devuelve al menos un archivo
- protege: REQ-S05-001, REQ-S05-002, REQ-S05-022, REQ-S05-023

### INV-S05-003
- propiedad: dos miembros nunca comparten cédula
- mecanismo: restriccion-bd
- deteccion: restricción única sobre la cédula; una inserción duplicada falla
- protege: REQ-S05-007

### INV-S05-004
- propiedad: todo Pago, CheckIn y VitrinaItem apunta a la sede única
- mecanismo: asercion-dominio
- deteccion: consulta que une cada tabla con Sucursal y devuelve las filas cuya sucursalId difiere del id de la única sede
- protege: REQ-S05-008

### INV-S05-005
- propiedad: vitrinaVersion crece en exactamente el número de cambios confirmados
- mecanismo: transaccion
- deteccion: la prueba de concurrencia compara la versión final con la inicial más los cambios confirmados
- protege: REQ-S05-020

## 4. Criterios de aceptación

### AC-S05-001
- enlaza: REQ-S05-001, REQ-S05-002, BEH-S05-001, INV-S05-002
- metodo: sql
- procedimiento: consultar el esquema final por las tablas Organizacion y TemaOrganizacion y por las columnas organizacionId; ejecutar tools/verificar-negocio.mjs sobre el árbol final
- esperado: ninguna tabla ni columna existe y la herramienta no encuentra coincidencias
- test: pendiente

### AC-S05-002
- enlaza: REQ-S05-003, BEH-S05-002
- metodo: sql
- procedimiento: consultar las columnas de ConfiguracionNegocio y de Sucursal en la base creada por el esquema final
- esperado: ConfiguracionNegocio tiene nombre, reposoFrases, reposoImagenUrl, reposoOpacidad, vitrinaDuracionSeg, vitrinaTransicion y vitrinaVersion; Sucursal no tiene ninguna de esas columnas
- test: pendiente

### AC-S05-003
- enlaza: REQ-S05-004, REQ-S05-005, REQ-S05-006, BEH-S05-003, BEH-S05-004, BEH-S05-005, INV-S05-001
- metodo: integracion
- procedimiento: con una base efímera, insertar una segunda fila en Sucursal y en ConfiguracionNegocio; llamar a obtenerSedeUnica con cero filas y con una; consultar la comprobación de salud sin fila y con ambas filas
- esperado: las dos inserciones se rechazan; obtenerSedeUnica lanza error con cero filas y devuelve «Local» con una; la salud falla sin filas y pasa con ambas
- test: pendiente

### AC-S05-004
- enlaza: REQ-S05-007, BEH-S05-006, INV-S05-003
- metodo: integracion
- procedimiento: guardar dos miembros con la cédula "12345678"
- esperado: el segundo se rechaza en la base y el repositorio devuelve el error de documento duplicado
- test: pendiente

### AC-S05-005
- enlaza: REQ-S05-008, BEH-S05-007, BEH-S05-008, INV-S05-004
- metodo: integracion
- procedimiento: crear un cobro, un check-in y un ítem de vitrina sin indicar sede; enviar a api/pagos un cuerpo con sucursalId; ejecutar la consulta de INV-S05-004
- esperado: las tres filas apuntan a la sede única, el cuerpo con sucursalId se rechaza sin crear el pago y la consulta devuelve 0 filas
- test: pendiente

### AC-S05-006
- enlaza: REQ-S05-009, REQ-S05-010, BEH-S05-009
- metodo: sql
- procedimiento: consultar el esquema final por UsuarioSucursal, multisede, las columnas sucursalId de Miembro, UsuarioAdmin y MiembroReferencia, y los valores del enum de módulos
- esperado: nada de eso existe y el enum no tiene SUCURSALES
- test: pendiente

### AC-S05-007
- enlaza: REQ-S05-011, REQ-S05-012, BEH-S05-010
- metodo: unitario
- procedimiento: verificar con la API de typescript que no existen los cinco casos de uso, MiembroFueraDeSucursalError ni el valor sucursal_incorrecta, y leer los valores de EstadoCheckIn
- esperado: no existen y EstadoCheckIn solo contiene activo y vencido
- test: pendiente

### AC-S05-008
- enlaza: REQ-S05-013, BEH-S05-011
- metodo: e2e
- procedimiento: como socio, abrir el menú, pedir /sucursales y abrir los formularios de alta de miembro y de plan
- esperado: no hay entrada de Sucursales, /sucursales responde 404 y los formularios no tienen selector de sede ni «Ambas»
- test: pendiente

### AC-S05-009
- enlaza: REQ-S05-014, REQ-S05-015, REQ-S05-016, BEH-S05-012, BEH-S05-013
- metodo: integracion
- procedimiento: enviar credenciales válidas a auth/login, pedir auth/login/sucursal y usar la cookie obtenida en una petición protegida
- esperado: una sola petición crea la sesión sin indicador de sede, auth/login/sucursal responde 404 y la petición protegida pasa
- test: pendiente

### AC-S05-010
- enlaza: REQ-S05-017, REQ-S05-018, BEH-S05-014, BEH-S05-015
- metodo: integracion
- procedimiento: rotar la clave desde la acción de la pantalla de configuración del kiosco, probar K1 y K2 en kiosco/estado y enviar K2 con un encabezado X-Sucursal-Id ajeno
- esperado: la respuesta de la rotación trae K2 una vez, K1 responde 401, K2 responde 200 contra la sede única y el encabezado se ignora
- test: pendiente

### AC-S05-011
- enlaza: REQ-S05-019, BEH-S05-016
- metodo: integracion
- procedimiento: guardar frases de reposo y duración de vitrina desde las acciones, y leerlas por kiosco/estado y kiosco/vitrina
- esperado: los valores salen de ConfiguracionNegocio y coinciden con los guardados
- test: pendiente

### AC-S05-012
- enlaza: REQ-S05-020, BEH-S05-017, INV-S05-005
- metodo: integracion
- procedimiento: con vitrinaVersion en 5, lanzar con Promise.all 20 cambios de contenido de la vitrina y leer la versión
- esperado: vitrinaVersion vale 25
- test: pendiente

### AC-S05-013
- enlaza: REQ-S05-021, BEH-S05-018
- metodo: integracion
- procedimiento: ejecutar las pruebas de caracterización de miembro, plan, pago y check-in antes de la cirugía y las pruebas de dominio, incluidas las 18 adaptadas, después
- esperado: las de caracterización pasan antes y después con el mismo resultado salvo lo dependiente de la sede, y todas las pruebas de dominio pasan sin organizacionId
- test: pendiente

### AC-S05-014
- enlaza: REQ-S05-022, REQ-S05-023, BEH-S05-019, INV-S05-002
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-negocio.mjs con un árbol por cada término de REQ-S05-022 y con otro limpio; después sobre el árbol final
- esperado: falla con los ocho términos nombrando archivo y línea, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S05-015
- enlaza: REQ-S05-024, BEH-S05-020
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue organizacionId en un archivo y mirar el resultado del CI
- esperado: el paso de tools/verificar-negocio.mjs falla y el pull request no se puede fusionar mientras la protección de main esté activa
- test: pendiente

### AC-S05-016
- enlaza: REQ-S05-025, BEH-S05-021
- metodo: unitario
- procedimiento: ejecutar tools/contrato-permisos.mjs sobre el árbol final con la lista pública vieja y con la nueva
- esperado: con la vieja falla por la ruta inexistente y con la nueva pasa
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso): (1) pruebas de caracterización de miembro, plan, pago y check-in contra la implementación heredada, en verde; (2) pruebas nuevas de `obtenerSedeUnica`, de la configuración y del login en un paso, en rojo; (3) esquema: `ConfiguracionNegocio`, restricciones de fila única y retiro de tablas y columnas; (4) puertos y repositorios sin `organizacionId`, de menos a más acoplados (tablas sin dependientes primero); (5) casos de uso y pruebas; (6) rutas, acciones y sesión; (7) pantallas y menú; (8) rotación de la clave desde la pantalla del kiosco; (9) `tools/verificar-negocio.mjs` con sus pruebas y el CI; (10) enmiendas a S-01.
- La cirugía se hace repositorio por repositorio con el typecheck como guía; los 154 archivos son cambios mecánicos y no deben mezclarse con otros cambios (CLAUDE.md §4).
- Las pruebas de concurrencia usan generadores con semilla fija; no hay dependencias nuevas.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15, que debe crear exactamente una fila de `Sucursal` («Local») con su clave de API y una de `ConfiguracionNegocio` («Adhara Fit»). Mientras tanto la base se crea con `drizzle-kit push` (S-22).
- **Enmiendas que se registran al aprobar S-05:** en S-01, el contrato de rutas públicas pasa a `auth/login` y `auth/logout` (REQ-S01-015 y AC-S01-012), REQ-S01-002 y AC-S01-001 hablan de una sola ruta de login, y la creación y rotación de la clave del kiosco (REQ-S01-009 a REQ-S01-011) se hacen desde la pantalla de configuración del kiosco; en S-22 y S-01, los recuentos pasan de 25 a 23 tablas (se retiran `Organizacion`, `TemaOrganizacion` y `UsuarioSucursal` y se agrega `ConfiguracionNegocio`) y 15 enums; en S-04, el estado de acceso queda en `activo` y `vencido`.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- 154 archivos cambian a la vez: el riesgo es una regresión silenciosa en consultas que filtraban por organización. Mitigación: las pruebas de caracterización del paso 1, el typecheck y la herramienta de términos.
- Se editan archivos que S-08, S-10 y S-11 borran después; es trabajo que se pierde (SUP-S05-008). Mitigación: el plan global (G6) puede ordenar esas specs antes.
- La rotación de la clave del kiosco pasa de la pantalla de sucursales a la del kiosco; si el seed no deja una clave inicial, el kiosco no podría conectarse. Mitigación: S-15 la crea y la muestra una vez.
- Quitar `sucursalId` de `Miembro` y `UsuarioAdmin` elimina la posibilidad de volver a varias sedes sin rediseñar el modelo; es una decisión del propietario (ADR-019, reversibilidad baja).
- Las 42 apariciones de `sucursalActivaId` en la sesión se reemplazan por `obtenerSedeUnica`; un olvido deja una pantalla sin sede. Mitigación: la herramienta de términos.
- La restricción de fila única depende de una columna `unica` auxiliar; si alguien la desactiva, la garantía se pierde. Mitigación: la comprobación de salud.

### 5.4 Preguntas abiertas
- ¿Se aceptan los nombres «Local» para la sede y «Adhara Fit» para el negocio? Default: sí (SUP-S05-001).
- ¿Conviene ordenar S-08, S-10 y S-11 antes que S-05 para reducir la cirugía? Default: no, S-05 va antes como hoy (SUP-S05-008); se decide en el plan global.
- ¿La rotación de la clave del kiosco debe quedar en la pantalla de configuración del kiosco? Default: sí (SUP-S05-004).
