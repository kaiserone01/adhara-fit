---
id: S-05
estado: aprobada
adrs: ADR-002, ADR-004, ADR-012, ADR-016, ADR-018, ADR-019, ADR-021, ADR-022
depende_de: S-00, S-01, S-04, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
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
- Pruebas de caracterización previas y adaptación de las pruebas que usan `organizacionId` (18 en el Repo A; S-04 borra dos).

### 0.3 Fuera de alcance
- Renombrar `cedula` a `numeroDocumento`, el tipo de documento y el `codigoSocio`: S-06 (S-05 solo hace la unicidad global).
- Eliminar las tablas y los casos de uso de turnos y caja (S-08), del padrón y lo venezolano (S-10) y del fiado y ventas de producto (S-11): S-05 solo les quita `organizacionId`.
- Un solo rol de administrador y retiro de los permisos por módulo (S-23).
- Contenido y diseño de la vitrina y del kiosco (S-19, S-20 y S-21): S-05 solo cambia dónde se guarda su configuración.
- Datos iniciales de la sede y de la configuración: el seed (S-15).
- `Sucursal.tasaCambioUSD`, que retira S-10.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-05 recibirá después de S-00, S-22, S-01 y S-04 (S-04 retira unos 53 archivos de abono y dos de las pruebas con `organizacionId`; S-22 reescribe el esquema y los repositorios): se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Organización:** `model Organizacion` está en `packages/db/prisma/schema.prisma:15` y `TemaOrganizacion` en `:572`; hay 33 líneas con `organizacionId` en el esquema; las tablas que lo llevan son `Sucursal`, `UsuarioAdmin`, `Miembro`, `Plan`, `ReglaAbonoPorFrecuencia` (que retira S-04), `Producto`, `DeudaProducto`, `CambioPlanAuditoria`, `Turno`, `MetodoPago`, `TemaOrganizacion`, `MiembroReferencia` y `PadronHoja` (verificado con `awk '/^model /{m=$2} /organizacionId +String/{print m}'`); cuatro unicidades lo incluyen: `@@unique([organizacionId, cedula])` en `schema.prisma:177` y `:652`, `[organizacionId, frecuencia]` en `:241` y `[organizacionId, sucursalId]` en `:668`.
- **Alcance en código:** 154 archivos `.ts` y `.tsx` fuera de `packages/db` mencionan `organizacionId` (162 con él; 18 son pruebas); `docs/linea-base-tests.md:46` da 175 (144 de código fuente) con otro criterio de exclusión y S-05 usa la cifra de su propio comando y los puertos de `packages/domain/ports` lo tienen en 43 líneas (verificado con `grep -rIlE organizacionId apps packages --include=*.ts --include=*.tsx | grep -v '^packages/db'` y `grep -rIn organizacionId packages/domain/ports`). Además 59 archivos fuera de `packages/db` contienen «Organizacion» con mayúscula, sobre todo en nombres de métodos de puertos (`listarPorOrganizacion`, `buscarPorOrganizacionYCedula`, `buscarPorOrganizacionYFrecuencia`, `listarPorOrganizacionYSucursal`, `buscarPorIdSinOrganizacion`) y `apps/web-admin/scripts/verificar-autorizacion.ts` usa `prisma.organizacion` (verificado con `grep -rIlE Organizacion` y `grep -n organizacion`). `TemaOrganizacion` aparece en 1 archivo.
- **Sede:** `Sucursal` está en `schema.prisma:37` con `diasGracia` (que retira S-04), `tasaCambioUSD` (S-10), `apiKey` (S-01), `reposoFrases`, `reposoImagenUrl`, `reposoOpacidad`, `vitrinaDuracionSeg`, `vitrinaTransicion` y `vitrinaVersion`; `UsuarioSucursal` está en `:131`, `Miembro.sucursalId` es opcional y significa «Ambas» si es nulo (`:149`) y `Plan.multisede` está en `:205`. Los modelos que llevan `sucursalId` son `CheckIn`, `DeudaProducto`, `Miembro`, `MiembroReferencia`, `PadronHoja`, `Pago`, `Turno`, `UsuarioAdmin`, `UsuarioSucursal` y `VitrinaItem`.
- **Cuántos archivos tocan la sede:** `sucursalId` o `sucursalActivaId` en 124 archivos, `sucursalActivaId` en 42, `UsuarioSucursal` en 15, `multisede` en 15, `SUCURSALES` en 11, `ObtenerSucursalesVisibles` en 4 (con mayúsculas exactas), `MiembroFueraDeSucursal` en 15 y `sucursal_incorrecta` en 10 (mismo `grep`). (verificado con `grep -rIlE` sobre `apps` y `packages` por cada término)
- **Sesión y login:** `Sesion.sucursalActivaId` puede ser nulo en la entidad (`packages/domain/entities/Sesion.ts:10`) y `validarSesion` trata esas sesiones como inválidas (`ValidarSesion.ts:40-43`); el login tiene dos pasos, `auth/login` y `auth/login/sucursal` (`ls apps/web-admin/app/api/auth/login`).
- **Pantallas y casos de uso de sucursal:** `apps/web-admin/app/(panel)/sucursales` tiene `FormularioSucursal.tsx`, `[id]`, `actions.ts`, `layout.tsx`, `nuevo` y `page.tsx`; los casos de uso son `CrearSucursal`, `ActualizarSucursal`, `ListarSucursales`, `AsignarSucursalesAUsuario`, `ObtenerSucursalesVisiblesParaUsuario`, `ObtenerUltimoCierrePorSucursal` y `ValidarAccesoSucursalPorPlan` (verificado con `ls`). `MiembroFueraDeSucursalError` se declara en `ObtenerMiembro.ts:11`.
- **Configuración del kiosco y la vitrina:** `kiosko/actions.ts:29-32` guarda `reposo*` en «la sucursal activa» con `PrismaSucursalRepository.actualizar(usuario.organizacionId, …)` y `vitrina/actions.ts:133` usa `sesion.sucursalActivaId`.
- **Sin ruta de salud:** las 19 rutas `route.ts` de `apps/web-admin/app/api` no incluyen ninguna de salud y ningún `.yml`, `.yaml`, `.sh` ni `Dockerfile*` menciona `health` (verificado con `find` y `grep -rIl health`); S-00 comprueba web-admin por `/login` a nivel Compose (S-00 §5).
- **Contrato del kiosco, login y panel:** `apps/kiosk/lib/api.ts`, `lib/cara.ts`, `components/AccessCard.tsx` y `app/page.tsx`, además de `api/checkin/route.ts` y `api/kiosco/estado/route.ts`, usan `sucursalAsignadaNombre`, `sucursalAsignadaDireccion`, `sucursalNombre` y `sucursal_incorrecta` (14 líneas, verificado con `grep -n`); `api/kiosco/estado` expone `sucursalNombre`. `apps/web-admin/app/login/page.tsx:27,56-63` implementa el selector de sede en dos pasos, `(panel)/layout.tsx:23-27` muestra la sede activa y `lib/vitrinaEventos.ts:9-10` indexa el emisor de eventos de la vitrina por `sucursalId`. `lib/kiosco.ts:32` autentica solo con el encabezado `x-kiosk-api-key` y no lee ningún identificador de sede, y `api/pagos/route.ts` lee del cuerpo solo `miembroId`, `planId`, `monto` y `metodo` e ignora otros campos (verificado con `Read`).
- **Vitrina:** el incremento de `vitrinaVersion` ya es atómico, con `{ increment: 1 }` en `PrismaVitrinaRepository.ts:50` dentro de `$transaction` (`:74`, `:85`, `:95`, `:105`); `Sucursal.direccion` está en `schema.prisma:42` y `Sucursal.activo` en `:45`; `docs/06-modelo-datos-cambios.md:12` dice que `Sucursal` conserva `reposo*` y `vitrina*`, mientras ADR-002 solo manda `reposo*` y `diasGracia` a la configuración global (verificado con `grep -n`).
- **Ayudante inexistente:** `obtenerSedeUnica` no figura en ningún archivo del Repo A (0 coincidencias): ADR-002 y ADR-019 lo proponen y esta spec lo crea. (verificado con `grep -rIn obtenerSedeUnica apps packages`)
- **Decisiones heredadas:** ADR-002 (una fila «Local», `diasGracia` y `reposo*` a configuración global; el login elige la sede solo), ADR-019 (nombra `ConfiguracionOrganizacion`, que no existe en el esquema heredado (`grep -c ConfiguracionOrganizacion schema.prisma` da 0); aquí `ConfiguracionNegocio` es una tabla nueva de una sola fila; unicidades globales; terminología «el negocio»), ADR-004 (unicidad global del documento sin tipo) y las enmiendas de ADR-002 («sin selector confirmado»). (verificado con `grep -n` en `docs/adr/ADR-002`, `ADR-004` y `ADR-019`)
- **Interacción con specs aprobadas:** S-01 liga la rotación de la clave del kiosco a «crear una sucursal» y lista `auth/login/sucursal` entre las rutas públicas (REQ-S01-009, REQ-S01-015 y REQ-S01-002); S-04 dejó a S-05 `MiembroFueraDeSucursalError` y `sucursal_incorrecta` (`S-04` §0.3). (verificado con `grep -n` en `S-01` y `S-04`)
- No verificado: que ningún flujo dependa de tener más de una sede, el contenido exacto de las 18 pruebas que usan `organizacionId` y los APK de `vitrina-tv` que embeben la clave del kiosco.

### 0.5 Supuestos
- SUP-S05-001: la sede única se llama «Local» (ADR-002) y el negocio «Adhara Fit»; ambos nombres los crea el seed (S-15). Default: esos nombres; asumido, por validar.
- SUP-S05-002: `Pago.sucursalId`, `CheckIn.sucursalId` y `VitrinaItem.sucursalId` se conservan como clave foránea a la sede única (así lo decide ADR-002 para limitar el cambio), y se retira `sucursalId` de `Miembro`, `UsuarioAdmin` y `MiembroReferencia`; `DeudaProducto`, `PadronHoja` y `Turno` lo conservan hasta que S-11, S-10 y S-08 los retiren. Default: ese reparto; asumido, por validar.
- SUP-S05-003: `ConfiguracionNegocio` y `Sucursal` garantizan una sola fila con una columna `unica` booleana, con CHECK verdadero y restricción única; la presencia de la fila la asegura el seed y la comprobación de auth/login (SUP-S05-014). Default: ese mecanismo; asumido, por validar.
- SUP-S05-004: la clave de API del kiosco sigue en `Sucursal` (S-01); su creación inicial la hace el seed (S-15) y su rotación pasa a la pantalla de configuración del kiosco, que ya existe en `apps/web-admin/app/(panel)/kiosko`. Default: esa ubicación; asumido, por validar.
- SUP-S05-005: los archivos de las familias de S-08, S-10 y S-11 (por ejemplo `caja/actions.ts`, `FormularioAbrirTurno.tsx`, `FiarProducto.ts`, `pagos/actions.ts` y `configuraciones/excel/*`) también reciben la sede única, no solo pierden `organizacionId`, porque usan `sucursalActivaId`, `UsuarioSucursal`, `SUCURSALES` o `MiembroFueraDeSucursal`, y no tienen exenciones para esos términos. Default: edición mínima en esos archivos, sin otro cambio; asumido, por validar.
- SUP-S05-006: la unicidad global del documento se aplica a la columna actual `cedula` (`Miembro`) y la renombra S-06. Default: `@@unique([cedula])`; asumido, por validar.
- SUP-S05-007: no hay sesiones ni datos que migrar; las sesiones existentes dejan de valer. Default: sin migración; asumido, por validar.
- SUP-S05-008: si el plan global (G6) coloca S-08, S-10 y S-11 antes de S-05, S-05 se reduce porque esas tablas ya no existirán. Default: S-05 antes, como hoy; asumido, por validar.
- SUP-S05-010: `vitrina*` y `reposo*` van a `ConfiguracionNegocio`, aunque `docs/06:12` dejaba `vitrina*` en `Sucursal` y ADR-002 solo manda `reposo*`: con una sede única es mejor una sola ubicación para la configuración visual. Default: mover ambos grupos; asumido, por validar.
- SUP-S05-011: `obtenerSedeUnica` es una función de la capa de aplicación que usa el puerto `ISucursalRepository.listar()`, sin caché, porque el dominio no accede a la base; lanza `SedeUnicaInvalidaError` si el resultado no tiene exactamente una fila. Default: ese diseño; asumido, por validar.
- SUP-S05-012: el kiosco, el encabezado del panel y la TV muestran el nombre del negocio (`ConfiguracionNegocio.nombre`) donde hoy muestran el nombre de la sede; `sucursalAsignada*` y `sucursal_incorrecta` desaparecen del contrato. Default: ese contrato; asumido, por validar con S-21.
- SUP-S05-013: `Sucursal.direccion` y `Sucursal.activo` se conservan sin cambios; las unicidades `MiembroReferencia [cedula]` y `PadronHoja [sucursalId]` pasan a globales, y los `@@index` con `organizacionId` se eliminan. Default: ese destino; asumido, por validar.
- SUP-S05-014: la comprobación de que existen la sede y la configuración la hace `auth/login` (responde 503 si faltan) y no una ruta de salud nueva, porque REQ-025 deja solo dos rutas públicas y S-00 comprueba web-admin por `/login`. Default: ese mecanismo; asumido, por validar.
- SUP-S05-015: el método `buscarPorOrganizacionYCedula` pasa a `buscarPorCedula` en S-05 y S-06 lo renombra después a `buscarPorDocumento`. Default: dos pasos; asumido, por validar.
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
- texto: La función obtenerSedeUnica, sin parámetros, deberá devolver la única fila de Sucursal.
### REQ-S05-006
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-019
- texto: Si falta la fila de Sucursal o la de ConfiguracionNegocio entonces auth/login deberá responder 503 con el mensaje «Sede no configurada» sin crear la sesión.
### REQ-S05-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-004
- texto: El esquema deberá imponer que la cédula del miembro sea única en todo el sistema.

### REQ-S05-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: Las acciones y las rutas deberán llenar sucursalId en Pago, CheckIn, VitrinaItem, Turno, DeudaProducto y PadronHoja con la sede devuelta por obtenerSedeUnica, sin recibirla del cliente.
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
- texto: El código no deberá contener MiembroFueraDeSucursalError ni el estado sucursal_incorrecta.
### REQ-S05-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La carpeta de pantallas sucursales y su entrada del menú no deberán existir.
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
- texto: Cuando el socio rota la clave del kiosco desde la pantalla de configuración del kiosco, el sistema deberá mostrar la clave nueva una sola vez.
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
- origen: ADR-021
- texto: El incremento de vitrinaVersion deberá ser atómico, de modo que N cambios confirmados del contenido lo aumenten en N.
### REQ-S05-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Las pruebas de dominio, incluidas las que usaban organizacionId y sobreviven a S-04, deberán pasar sin ese parámetro.
### REQ-S05-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-019
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener la raíz organizacion (sin distinguir mayúsculas) ni los términos UsuarioSucursal, multisede, sucursalActivaId, SUCURSALES, sucursal_incorrecta y MiembroFueraDeSucursal.
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
- origen: ADR-012
- texto: La lista cerrada de rutas públicas de tools/contrato-permisos.mjs deberá contener solo auth/login y auth/logout.

### REQ-S05-026
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-002
- texto: Si la tabla Sucursal no tiene exactamente una fila entonces obtenerSedeUnica deberá lanzar SedeUnicaInvalidaError.

### REQ-S05-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: EstadoCheckIn deberá contener solo los valores activo y vencido.

### REQ-S05-028
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: Ningún formulario, incluida la página de login, deberá mostrar selector de sede ni la opción «Ambas».

### REQ-S05-029
- tipo: cuando
- prioridad: MUST
- origen: ADR-012
- texto: Cuando el socio rota la clave del kiosco, el sistema deberá dejar sin efecto la clave anterior.

### REQ-S05-030
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si quien rota la clave del kiosco no tiene el rol SOCIO entonces el sistema deberá rechazar la rotación sin cambiar la clave.

### REQ-S05-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Las pruebas de caracterización de miembro, plan, pago y check-in, a nivel de las rutas HTTP, deberán existir y pasar antes de la primera edición del código de producto.

### REQ-S05-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La respuesta de kiosco/estado deberá devolver negocioNombre con el nombre de ConfiguracionNegocio y no sucursalNombre.

### REQ-S05-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-002
- texto: La respuesta de checkin no deberá contener sucursalAsignadaNombre ni sucursalAsignadaDireccion.

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
- cubre: REQ-S05-005, REQ-S05-026
- categoria: error
- dado: una base con cero filas en Sucursal, otra con dos filas y otra con la fila única «Local» (con activo en verdadero o en falso)
- cuando: se llama a obtenerSedeUnica en cada una
- entonces: con cero y con dos filas lanza SedeUnicaInvalidaError, y con la fila única devuelve «Local» sin mirar activo
### BEH-S05-005
- cubre: REQ-S05-006
- categoria: error
- dado: web-admin con la base sin fila en Sucursal, luego sin fila en ConfiguracionNegocio y luego con ambas filas
- cuando: un usuario válido envía sus credenciales a auth/login
- entonces: responde 503 con «Sede no configurada» y sin cookie en los dos primeros casos, y crea la sesión en el tercero
### BEH-S05-006
- cubre: REQ-S05-007
- categoria: error
- dado: un miembro con cédula "12345678"
- cuando: se intenta guardar otro con la misma cédula
- entonces: la base rechaza la segunda inserción y el repositorio devuelve el error de documento duplicado

### BEH-S05-007
- cubre: REQ-S05-008
- categoria: feliz
- dado: un cobro, un check-in, un ítem de vitrina, la apertura de un turno, una venta fiada y una hoja de padrón creados desde la interfaz sin indicar sede
- cuando: se leen sus filas
- entonces: las seis tienen sucursalId igual al de la sede única
### BEH-S05-008
- cubre: REQ-S05-008
- categoria: borde
- dado: una petición a api/pagos que trae sucursalId de otra sede en el cuerpo
- cuando: se ejecuta
- entonces: el campo sucursalId se ignora y el pago queda con la sede única
### BEH-S05-009
- cubre: REQ-S05-009, REQ-S05-010
- categoria: feliz
- dado: el esquema final
- cuando: se consulta por UsuarioSucursal, multisede, las columnas sucursalId de Miembro, UsuarioAdmin y MiembroReferencia, y el enum de módulos
- entonces: no existen y ModuloPermiso no tiene SUCURSALES

### BEH-S05-010
- cubre: REQ-S05-011, REQ-S05-012, REQ-S05-027
- categoria: feliz
- dado: el código final
- cuando: se buscan los cinco casos de uso, MiembroFueraDeSucursalError y sucursal_incorrecta, y se leen los valores de EstadoCheckIn
- entonces: no existen y EstadoCheckIn solo tiene activo y vencido
### BEH-S05-011
- cubre: REQ-S05-013, REQ-S05-028
- categoria: feliz
- dado: el panel con un socio autenticado y la página de login
- cuando: abre el menú, /sucursales, el alta de un miembro, el alta de un plan y la página de login
- entonces: no hay entrada de Sucursales, /sucursales responde 404, ni los formularios ni el login tienen selector de sede ni «Ambas», y el encabezado del panel muestra el nombre del negocio
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
- cubre: REQ-S05-017, REQ-S05-029
- categoria: feliz
- dado: un socio en la pantalla de configuración del kiosco y la clave K1 en uso
- cuando: rota la clave
- entonces: la pantalla muestra la clave nueva K2 una sola vez, K1 deja de autenticar y una recarga solo muestra el prefijo de 8 caracteres
### BEH-S05-015
- cubre: REQ-S05-018
- categoria: borde
- dado: una petición de kiosco con la clave válida y un parámetro sucursalId de otra sede en la consulta, y otra con una clave inexistente
- cuando: se ejecutan
- entonces: la primera autentica contra la sede única y el parámetro se ignora, y la segunda responde 401
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
- cubre: REQ-S05-021, REQ-S05-031
- categoria: feliz
- dado: las pruebas de caracterización HTTP de miembro, plan, pago y check-in escritas antes de la cirugía
- cuando: se ejecutan antes y después de la cirugía
- entonces: pasan en ambos momentos con las mismas aserciones; solo cambia el ayudante de login de las pruebas, que pasa de dos pasos a uno
### BEH-S05-019
- cubre: REQ-S05-022, REQ-S05-023
- categoria: error
- dado: archivos de prueba con organizacionId, listarPorOrganizacion, UsuarioSucursal, multisede, sucursalActivaId, SUCURSALES, sucursal_incorrecta y MiembroFueraDeSucursal
- cuando: se ejecuta tools/verificar-negocio.mjs
- entonces: la herramienta falla y nombra archivo y línea de cada uno de los siete términos
### BEH-S05-020
- cubre: REQ-S05-024
- categoria: error
- dado: un pull request que agrega organizacionId en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-negocio.mjs falla y el pull request queda en rojo

### BEH-S05-021
- cubre: REQ-S05-025
- categoria: borde
- dado: tools/contrato-permisos.mjs con la lista pública nueva (auth/login y auth/logout) y un árbol que recrea la ruta auth/login/sucursal sin comprobación de sesión
- cuando: se ejecuta sobre el árbol final y sobre el árbol con la ruta recreada
- entonces: pasa sobre el árbol final y falla sobre el otro por una ruta pública que no está en la lista

### BEH-S05-022
- cubre: REQ-S05-004
- categoria: concurrencia
- dado: una base con la fila única de Sucursal y otra con la de ConfiguracionNegocio
- cuando: dos transacciones insertan a la vez una segunda fila en cada tabla
- entonces: ambas inserciones fallan por la restricción y cada tabla conserva una sola fila

### BEH-S05-023
- cubre: REQ-S05-007
- categoria: concurrencia
- dado: dos altas simultáneas de miembros con la cédula "12345678"
- cuando: terminan las dos transacciones
- entonces: una se confirma, la otra recibe el error de documento duplicado y la tabla tiene un solo miembro con esa cédula

### BEH-S05-024
- cubre: REQ-S05-030
- categoria: error
- dado: un usuario con rol GERENTE y la clave K1 en uso
- cuando: intenta rotar la clave del kiosco
- entonces: la acción rechaza con error de permiso y K1 sigue autenticando

### BEH-S05-025
- cubre: REQ-S05-032, REQ-S05-033
- categoria: feliz
- dado: la configuración con nombre «Adhara Fit» y un miembro vigente
- cuando: el kiosco llama a kiosco/estado y a checkin
- entonces: kiosco/estado devuelve negocioNombre «Adhara Fit» sin sucursalNombre, y checkin devuelve el acceso sin sucursalAsignadaNombre ni sucursalAsignadaDireccion
## 3. Invariantes

### INV-S05-001
- propiedad: la base nunca tiene más de una fila en Sucursal ni más de una en ConfiguracionNegocio
- mecanismo: restriccion-bd
- deteccion: restricción única sobre la columna unica, con CHECK verdadero, en ambas tablas; una segunda inserción falla (la existencia de la fila la comprueba auth/login, REQ-S05-006)
- protege: REQ-S05-004, REQ-S05-005, REQ-S05-006, REQ-S05-026
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
- propiedad: toda fila de Pago, CheckIn, VitrinaItem, Turno, DeudaProducto y PadronHoja apunta a una sede existente, que es la única
- mecanismo: restriccion-bd
- deteccion: sucursalId NOT NULL con clave foránea a Sucursal, que tiene una sola fila por INV-S05-001; la prueba de esquema lee las columnas y sus claves foráneas
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
- enlaza: REQ-S05-004, REQ-S05-005, REQ-S05-006, REQ-S05-026, BEH-S05-003, BEH-S05-004, BEH-S05-005, BEH-S05-022, INV-S05-001
- metodo: integracion
- procedimiento: con una base efímera, insertar una segunda fila en Sucursal y en ConfiguracionNegocio, también con dos transacciones simultáneas; llamar a obtenerSedeUnica con cero, una y dos filas; enviar credenciales válidas a auth/login sin fila de Sucursal, sin fila de ConfiguracionNegocio y con ambas
- esperado: las inserciones se rechazan y cada tabla conserva una fila; obtenerSedeUnica lanza SedeUnicaInvalidaError con cero y dos filas y devuelve «Local» con una; auth/login responde 503 «Sede no configurada» en los dos primeros casos y 200 en el tercero
- test: pendiente
### AC-S05-004
- enlaza: REQ-S05-007, BEH-S05-006, BEH-S05-023, INV-S05-003
- metodo: integracion
- procedimiento: guardar dos miembros con la cédula "12345678", uno tras otro y luego con Promise.all
- esperado: el segundo se rechaza en la base y el repositorio devuelve el error de documento duplicado; en la prueba simultánea una se confirma y la otra falla, y queda un solo miembro
- test: pendiente
### AC-S05-005
- enlaza: REQ-S05-008, BEH-S05-007, BEH-S05-008, INV-S05-004
- metodo: integracion
- procedimiento: crear un cobro, un check-in, un ítem de vitrina, la apertura de un turno, una venta fiada y una hoja de padrón sin indicar sede; enviar a api/pagos un cuerpo con sucursalId de otra sede; consultar con información de esquema las columnas sucursalId de las seis tablas
- esperado: las seis filas apuntan a la sede única, el pago con sucursalId ajeno queda en la sede única y las seis columnas son NOT NULL con clave foránea a Sucursal
- test: pendiente
### AC-S05-006
- enlaza: REQ-S05-009, REQ-S05-010, BEH-S05-009
- metodo: sql
- procedimiento: consultar el esquema final por UsuarioSucursal, multisede, las columnas sucursalId de Miembro, UsuarioAdmin y MiembroReferencia, y los valores del enum de módulos
- esperado: nada de eso existe y el enum no tiene SUCURSALES
- test: pendiente

### AC-S05-007
- enlaza: REQ-S05-011, REQ-S05-012, REQ-S05-027, BEH-S05-010
- metodo: unitario
- procedimiento: verificar con la API de typescript que no existen los cinco casos de uso, MiembroFueraDeSucursalError ni el valor sucursal_incorrecta, y leer los valores de EstadoCheckIn
- esperado: no existen y EstadoCheckIn solo contiene activo y vencido
- test: pendiente
### AC-S05-008
- enlaza: REQ-S05-013, REQ-S05-028, BEH-S05-011
- metodo: e2e
- procedimiento: como socio, abrir el menú, pedir /sucursales y abrir los formularios de alta de miembro y de plan; abrir la página de login
- esperado: no hay entrada de Sucursales, /sucursales responde 404, ni los formularios ni el login tienen selector de sede ni «Ambas», y el encabezado muestra «Adhara Fit»
- test: pendiente
### AC-S05-009
- enlaza: REQ-S05-014, REQ-S05-015, REQ-S05-016, BEH-S05-012, BEH-S05-013
- metodo: integracion
- procedimiento: enviar credenciales válidas a auth/login, pedir auth/login/sucursal y usar la cookie obtenida en una petición protegida
- esperado: una sola petición crea la sesión sin indicador de sede, auth/login/sucursal responde 404 y la petición protegida pasa
- test: pendiente

### AC-S05-010
- enlaza: REQ-S05-017, REQ-S05-018, REQ-S05-029, REQ-S05-030, BEH-S05-014, BEH-S05-015, BEH-S05-024
- metodo: integracion
- procedimiento: rotar la clave con un SOCIO desde la acción de la pantalla de configuración del kiosco; probar K1 y K2 en kiosco/estado; enviar K2 con sucursalId ajeno en la consulta y una clave inexistente; intentar la rotación con un GERENTE
- esperado: la respuesta de la rotación trae K2 una vez, K1 responde 401, K2 responde 200 contra la sede única, el parámetro ajeno se ignora, la clave inexistente responde 401 y el GERENTE recibe error de permiso y K1 sigue autenticando
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
- procedimiento: con vitrinaVersion en 5, lanzar con Promise.all 20 altas de ítems de la vitrina y contar las confirmadas
- esperado: vitrinaVersion es igual a 5 más el número de altas confirmadas y, si las 20 se confirman, vale 25
- test: pendiente
### AC-S05-013
- enlaza: REQ-S05-021, REQ-S05-031, BEH-S05-018
- metodo: integracion
- procedimiento: ejecutar las pruebas de caracterización HTTP de miembro, plan, pago y check-in antes de la cirugía y después de ella, y ejecutar todas las pruebas de dominio
- esperado: las de caracterización pasan en ambos momentos con las mismas aserciones y solo cambia el ayudante de login; todas las pruebas de dominio pasan sin organizacionId
- test: pendiente
### AC-S05-014
- enlaza: REQ-S05-022, REQ-S05-023, BEH-S05-019, INV-S05-002
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-negocio.mjs con un árbol por cada uno de los siete términos de REQ-S05-022 (la raíz organizacion también en minúscula y como parte de listarPorOrganizacion) y con otro limpio; después sobre el árbol final
- esperado: falla con los siete términos nombrando archivo y línea, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente
### AC-S05-015
- enlaza: REQ-S05-024, BEH-S05-020
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue organizacionId en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-negocio.mjs falla y su estado queda en rojo
- test: pendiente
### AC-S05-016
- enlaza: REQ-S05-025, BEH-S05-021
- metodo: unitario
- procedimiento: ejecutar tools/contrato-permisos.mjs con la lista pública nueva sobre el árbol final y sobre un árbol que recrea auth/login/sucursal sin comprobación de sesión
- esperado: pasa sobre el árbol final y falla sobre el otro por una ruta pública fuera de la lista
- test: pendiente

### AC-S05-017
- enlaza: REQ-S05-032, REQ-S05-033, BEH-S05-025
- metodo: integracion
- procedimiento: con la configuración «Adhara Fit», llamar a kiosco/estado y a checkin con la clave del kiosco y un miembro vigente
- esperado: kiosco/estado trae negocioNombre «Adhara Fit» y no sucursalNombre, y checkin no trae sucursalAsignadaNombre ni sucursalAsignadaDireccion
- test: pendiente
## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso, cada commit con typecheck y pruebas en verde): (1) pruebas de caracterización de miembro, plan, pago y check-in a nivel de las rutas HTTP (`api/miembros`, `api/planes`, `api/pagos`, `api/checkin`), con un ayudante de login de pruebas que luego pasa de dos pasos a uno; (2) cambio aditivo: tabla `ConfiguracionNegocio`, `obtenerSedeUnica` y `SedeUnicaInvalidaError` con sus pruebas, más la restricción de fila única verificada con `drizzle-kit push`; (3) `organizacionId` pasa a opcional en el esquema, las unicidades pasan a globales y los índices con `organizacionId` se eliminan, para que el resto compile; (4) puertos y repositorios sin `organizacionId`, de las tablas sin dependientes a las más acopladas, renombrando los métodos con «Organizacion» (`buscarPorOrganizacionYCedula` pasa a `buscarPorCedula`, SUP-S05-015); (5) casos de uso y pruebas de dominio; (6) rutas, acciones, sesión y `apps/web-admin/scripts/verificar-autorizacion.ts`, con `obtenerSedeUnica` en lugar de `sucursalActivaId`, login en un paso y respuesta 503 sin sede; (7) pantallas: login, encabezado del panel, menú, formularios y retiro de `/sucursales`; (8) contrato del kiosco (`negocioNombre`, sin `sucursalAsignada*` ni `sucursal_incorrecta`) en `apps/web-admin` y `apps/kiosk`, y emisor de la vitrina sin `sucursalId`; (9) rotación de la clave desde la pantalla del kiosco con `exigirSocio`; (10) traslado de `reposo*` y `vitrina*` a `ConfiguracionNegocio`; (11) se eliminan del esquema `Organizacion`, `TemaOrganizacion`, `UsuarioSucursal` y las columnas `organizacionId`, `multisede` y `sucursalId` retiradas; (12) `tools/verificar-negocio.mjs` con sus pruebas y el CI, y actualización de `docs/06` y del ejemplo `apps/vitrina/public/vitrina-config.ejemplo.json`.
- Las pruebas de caracterización son de nivel HTTP porque las firmas de los puertos cambian; las pruebas de contrato de S-22 y las de S-01 y S-04 con datos de organización o sede se adaptan en los pasos 4 a 6.
- La cirugía se hace repositorio por repositorio con el typecheck como guía; los 154 archivos son cambios mecánicos y no deben mezclarse con otros cambios (CLAUDE.md §4).
- `drizzle-kit push` debe crear la restricción CHECK y la única de la columna `unica`; el paso 2 lo comprueba antes de depender de ella y, si no la crea, se declara con SQL en el baseline de S-15.
- Las pruebas de concurrencia usan semillas fijas y no hay dependencias nuevas.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15, que debe crear exactamente una fila de `Sucursal` («Local») con su clave de API y una de `ConfiguracionNegocio` («Adhara Fit»), y mostrar la clave inicial una sola vez. Mientras tanto la base se crea con `drizzle-kit push` (S-22). Compose sigue comprobando web-admin por `/login` (S-00): no se agrega ruta de salud (SUP-S05-014).
- **Enmiendas que se registran al aprobar S-05** (no son un paso de implementación):
  - S-01: REQ-S01-002 y AC-S01-001 (una sola ruta de login); REQ-S01-008 (clave «de la sede única»); REQ-S01-009 a REQ-S01-011 (la creación inicial la hace el seed y desde el panel solo se rota); REQ-S01-015 y AC-S01-012 (rutas públicas `auth/login` y `auth/logout`); REQ-S01-016 y AC-S01-013 (de 11 a 10 rutas con entrada); REQ-S01-033; BEH-S01-001, BEH-S01-009, BEH-S01-011 (sin el permiso `SUCURSALES`; la rotación exige SOCIO), BEH-S01-013, BEH-S01-017 y BEH-S01-026; AC-S01-007 a AC-S01-010 y AC-S01-021; INV-S01-004; y el paso del panel de sucursales en 5.1. Cada uno se confirma con `grep -n sucursal` en S-01 al registrar la enmienda.
  - S-22: REQ-S22-007 y AC-S22-003 (de 21 repositorios y 16 suites a 20 y 15, sin el de `UsuarioSucursal`); recuentos de 25 a 23 tablas y de 14 a 15 enums según S-04; AC-S22-028; REQ-S22-004 (columnas con identificador generado); REQ-S22-030, BEH-S22-022 y AC-S22-022 (la unicidad que hace fallar la segunda activación pasa a `[cedula]`).
  - S-04: REQ-S04-023, BEH-S04-021 y SUP-S04-004 (el estado de acceso queda en `activo` y `vencido`, sin `sucursal_incorrecta`).
  - `docs/06-modelo-datos-cambios.md:12` (y `:32`) y `docs/04`: `reposo*` y `vitrina*` pasan a `ConfiguracionNegocio`.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- 154 archivos cambian a la vez: el riesgo es una regresión silenciosa en consultas que filtraban por organización. Mitigación: las pruebas de caracterización del paso 1, el typecheck y la herramienta de términos.
- Se editan archivos que S-08, S-10 y S-11 borran después; es trabajo que se pierde (SUP-S05-008). Mitigación: el plan global (G6) puede ordenar esas specs antes.
- Las cifras de 0.4 cambian cuando S-00, S-22, S-01 y S-04 modifiquen el árbol. Mitigación: se recuentan al empezar y la herramienta de términos es el criterio final.
- Contrato roto con `apps/kiosk`, `vitrina-tv` y los APK que embeben la clave: quitar `sucursalAsignada*` y `sucursalNombre` y rotar la clave deja kioscos sin conectar; los APK no están verificados. Mitigación: el paso 8 cambia ambos lados en el mismo commit y S-21 revisa el contrato.
- La rotación de la clave del kiosco pasa de la pantalla de sucursales a la del kiosco; si el seed no deja una clave inicial, el kiosco no podría conectarse. Mitigación: S-15 la crea y la muestra una vez.
- Contención en la fila única de `ConfiguracionNegocio`: todas las escrituras de la vitrina se serializan en una fila, y `mover` actualiza ítems en orden variable, lo que puede causar un bloqueo mutuo entre dos movimientos simultáneos. Mitigación: ordenar las actualizaciones por identificador (decisión de S-19/S-20; aquí solo se registra).
- Quitar `sucursalId` de `Miembro` y `UsuarioAdmin` elimina la posibilidad de volver a varias sedes sin rediseñar el modelo; es una decisión del propietario (ADR-019, reversibilidad baja).
- Las 42 apariciones de `sucursalActivaId` se reemplazan por `obtenerSedeUnica`; un olvido deja una pantalla sin sede. Mitigación: la herramienta de términos.
- La restricción de fila única depende de una columna `unica` auxiliar; si alguien la desactiva, la garantía se pierde. Mitigación: AC-S05-003 la prueba en el CI.
- Documentos desfasados: `docs/06`, `docs/04` y el ejemplo de la vitrina siguen hablando de Sucursales. Mitigación: se actualizan en el paso 12.

### 5.4 Preguntas abiertas
- ¿Se aceptan los nombres «Local» para la sede y «Adhara Fit» para el negocio? Default: sí (SUP-S05-001).
- ¿Conviene ordenar S-08, S-10 y S-11 antes que S-05 para reducir la cirugía? Default: no, S-05 va antes como hoy (SUP-S05-008); se decide en el plan global.
- ¿La rotación de la clave del kiosco debe quedar en la pantalla de configuración del kiosco? Default: sí (SUP-S05-004).
- ¿`vitrina*` va a `ConfiguracionNegocio` junto con `reposo*`? Default: sí (SUP-S05-010).
- ¿Se mantiene `/login` como señal de salud de Compose en lugar de una ruta de salud nueva? Default: sí (SUP-S05-014).

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de S-06. El texto anterior se conserva; donde choca, rige esta sección.*
- REQ-S05-007, BEH-S05-006, BEH-S05-023, INV-S05-003 y AC-S05-004: la «cédula» pasa a `numeroDocumento` (único global, sin incluir el tipo); SUP-S05-006 y SUP-S05-015 quedan cumplidos por S-06.
- REQ-S05-031 y las pruebas de caracterización de `api/checkin` y `api/miembros`: el cuerpo pasa de `cedula` a `identificador`, `tipoDocumento` y `numeroDocumento`.

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura), que recibió únicamente la ruta y la lista de comprobación. Veredicto tal como lo entregó, sobre la versión `a35fc3e`:

> Convención de evidencia: «S05:n» es la línea de la spec; las demás rutas son del Repo A, relativas al clon de solo lectura.
>
> **Resultado de la verificación de 0.4 contra el Repo A.** Confirmados: esquema (33 líneas con `organizacionId`, 13 tablas con la lista exacta, `@@unique` en `:177`, `:241`, `:652`, `:668`, `Organizacion:15`, `Sucursal:37`, `UsuarioSucursal:131`, `Miembro.sucursalId:149`, `Plan.multisede:205`, `TemaOrganizacion:572`, 25 modelos); 154 archivos con `organizacionId` solo si se excluye `packages/db` (162 con él); 18 pruebas; 43 líneas en `packages/domain/ports`; 124 con `sucursalId`/`sucursalActivaId`; `sucursalActivaId` en 42; `multisede` en 15; `SUCURSALES` en 11; `MiembroFueraDeSucursal` en 15; `sucursal_incorrecta` en 10; `TemaOrganizacion` en 1 archivo; `obtenerSedeUnica` con 0 coincidencias; `Sesion.ts:10`; `ObtenerMiembro.ts:11`; las 7 clases de casos de uso; las 6 entradas de `(panel)/sucursales`; `kiosko/actions.ts:29-33`; `vitrina/actions.ts:133`. No reproducidos: `UsuarioSucursal` en 16 (15 sin `packages/db`, 17 con él); `ObtenerSucursalesVisibles` en 8 (4 distinguiendo mayúsculas); `ValidarSesion.ts:33-40` (el `if` real está en `:40-43`); el comando citado para 154 incluye `packages/db` y da 162; no concilia con `docs/linea-base-tests.md:46` (175, 144 de código fuente).
>
> | # | Comprobación | Veredicto | Qué corregir (resumen del revisor) |
> |---|---|---|---|
> | 1 | Cabecera; ADRs existentes y aceptados | CUMPLE (con nota) | Añadir ADR-021 y ADR-018 a `adrs`. |
> | 2 | Cada REQ: una obligación, EARS, prioridad y origen | NO CUMPLE | Dividir REQ-005, 012, 013, 017 y 021; REQ-009/011 como lista cerrada; origen de REQ-020 a ADR-021 o ADR-016; ajustar el de REQ-006. |
> | 3 | Cobertura REQ→BEH→AC; INV; categorías | NO CUMPLE (menor) | Solo BEH-017 es de concurrencia; añadir concurrencia para segunda fila y cédula duplicada; borde de `obtenerSedeUnica` con 2 filas y con `activo=false`; INV-004 vacío (la garantía real es FK más INV-001); INV-001 dice «exactamente una» pero la BD solo impone ≤1. |
> | 4 | Cada AC es binario | NO CUMPLE | AC-013 y BEH-018 con «salvo lo dependiente de la sede»; «ocho términos» contra nueve; AC-015 depende de una acción del propietario; BEH-008 espera «campo desconocido» que S-01 no manda (`api/pagos/route.ts:66-73` ignora `sucursalId`); BEH-015 usa `X-Sucursal-Id`, que `lib/kiosco.ts:32` nunca lee; BEH-021/AC-016 esperan que la lista vieja falle, algo que S-01 no define. |
> | 5 | Hechos de 0.4 | NO CUMPLE | Anotar que los números son del Repo A original; corregir 16 y 8; reconciliar 154 con 144; no fijar «18» si S-04 borra dos. |
> | 6 | Hechos incompletos que afectan al diseño | NO CUMPLE | (a) no existe ruta de salud y REQ-006/BEH-005 la dan por hecha, y crearla contradice REQ-025; (b) contrato del kiosco con `sucursalAsignada*`, `sucursalNombre` y `sucursal_incorrecta`; (c) `app/login/page.tsx` implementa el selector; (d) `(panel)/layout.tsx` muestra la sede; (e) `lib/vitrinaEventos.ts` indexa por `sucursal.id`; (f) 96 apariciones de «Organizacion» en nombres de métodos de puertos; (g) `verificar-autorizacion.ts` usa `prisma.organizacion`; (h) destino de índices y únicos; (i) destino de `Sucursal.activo/direccion`; (j) seed y middleware. |
> | 7 | Supuestos y preguntas | NO CUMPLE (menor) | Faltan SUP para mover `vitrina*` (`docs/06:12` dice lo contrario), dónde vive `obtenerSedeUnica`, el nombre que muestran kiosco/layout/TV, la salud y el destino de `activo/direccion`; SUP-005 contradice REQ-022. |
> | 8 | Contradicciones con ADR y specs aprobadas | NO CUMPLE (menor) | Sin contradicción dura con ADR; desvío sin amparo: mover `vitrina*`. Enmiendas a S-01 (AC-S01-009, BEH-S01-011, REQ-S01-009, REQ-S01-016), S-22 (REQ-S22-007, AC-S22-003, AC-S22-028) y S-04 (REQ-S04-023). |
> | 9 | Alcance frente a otras specs | NO CUMPLE | S-05 y S-06 tocan el mismo puerto (`IMemberRepository.ts:4`); REQ-008 llena la sede solo en tres tablas, y `Turno`, `DeudaProducto` y `PadronHoja` conservan `sucursalId` sin dueño; la creación de la clave se asigna a S-15 aún inexistente; contrato de kiosco abierto para S-21; `vitrina*` sin decisión. |
> | 10 | Plan de pruebas, orden, fila única, rotación, incremento atómico | NO CUMPLE | El paso 3 (esquema) rompe la compilación de los pasos 3 a 6; la caracterización no declara nivel; el paso 10 choca con 5.2; falta verificar que `drizzle-kit push` crea el CHECK; la rotación no dice que use `exigirSocio` (`puedeEditarKiosko` deja entrar al gerente); el incremento ya es atómico (`PrismaVitrinaRepository.ts:50`), y `mover` puede causar bloqueo mutuo; AC-012 no fija la operación. |
> | 11 | Riesgos omitidos | NO CUMPLE | Contrato roto con `apps/kiosk`, `kiosk-tv` y `vitrina-tv` (APK con la clave embebida); contención en la fila única; commits que no compilan; cifras que cambian; el ejemplo de la vitrina apunta a «Configuraciones → Sucursales»; `docs/06` y `docs/04` desfasados; la ruta de salud; renombres que chocan con S-06. |
> | 12 | Enmiendas a S-01, S-04 y S-22 | NO CUMPLE | Faltan REQ-S01-008, -016, -033, varios BEH y AC y el paso del panel de sucursales; contradicción entre «crear la clave desde el kiosco» y «la crea el seed»; faltan REQ-S22-007, AC-S22-003, AC-S22-028, REQ-S22-004, REQ-S22-030, BEH-S22-022, AC-S22-022; en S-04, REQ-S04-023, BEH-S04-021 y SUP-S04-004. |
>
> Lint: no pudo ejecutarlo; por lectura no hay «TBD», «por definir», «etc.» ni adjetivos sin medida, y no se introducen dependencias nuevas.
>
> **VEREDICTO GLOBAL: REQUIERE CAMBIOS.**

### Conciliación del autor
Todos los hallazgos se verificaron contra el Repo A y resultaron ciertos; ninguno se rechazó.

- Fila 1: se añadieron ADR-018 y ADR-021 a `adrs`.
- Fila 2: REQ-005, 012, 013 y 017 se dividieron (nuevos REQ-026 a REQ-029) y REQ-021 se dividió (REQ-031); se agregaron REQ-030 (rotación solo por SOCIO), REQ-032 y REQ-033 (contrato del kiosco); el origen de REQ-020 pasa a ADR-021 y el de REQ-006 a ADR-019. REQ-009 y REQ-011 quedan como listas cerradas porque describen un conjunto fijo de retiros.
- Fila 3: nuevos BEH-022 y BEH-023 (concurrencia), BEH-024 (error de permiso) y BEH-025 (contrato); BEH-004 cubre cero, una y dos filas y `activo` falso. INV-001 se limita a «como máximo una fila» y la existencia la comprueba `auth/login` (REQ-006). INV-004 se reformuló sobre `NOT NULL` más clave foránea.
- Fila 4: «siete términos» en BEH-019 y AC-014; BEH-008 y BEH-015 describen el comportamiento real (se ignora el campo; clave inexistente da 401); BEH-021 y AC-016 se invirtieron (falla un árbol con la ruta recreada); AC-015 tiene un método alterno sin la protección de `main`; AC-013 fija el nivel HTTP y la única diferencia permitida (el ayudante de login).
- Fila 5: 0.4 aclara que las cifras son del Repo A original, usa 15 y 4, cita `ValidarSesion.ts:40-43`, concilia 154 con 175/144 y no fija «18».
- Fila 6: se agregaron a 0.4 la ausencia de ruta de salud, el contrato del kiosco, el login, el encabezado, el emisor de la vitrina, los 59 archivos con «Organizacion» y el script `verificar-autorizacion.ts`. REQ-006 ya no pide una ruta de salud: `auth/login` responde 503 (SUP-S05-014). REQ-022 prohíbe la raíz «organizacion» sin distinguir mayúsculas. Destino de índices, únicos, `activo` y `direccion` en SUP-S05-013.
- Fila 7: nuevos SUP-S05-010 a SUP-S05-015; SUP-S05-005 reescrito (esas familias también reciben la sede única).
- Fila 8 y fila 12: la lista completa de enmiendas quedó en 5.2, con los identificadores del revisor, que se confirman con `grep -n` al registrarlas. La contradicción creación/rotación se resolvió: el seed crea la clave y el panel solo la rota (SUP-S05-004).
- Fila 9: REQ-008 cubre ahora las seis tablas que conservan `sucursalId`; el renombre del puerto de miembros se coordina con S-06 (SUP-S05-015); el contrato del kiosco queda definido aquí (REQ-032, REQ-033) y S-21 lo revisa.
- Fila 10: el orden de 5.1 se rehízo en 12 pasos compilables (`organizacionId` pasa a opcional antes de tocar el código y las tablas se eliminan al final); la caracterización es HTTP; se verifica el CHECK con `drizzle-kit push`; la rotación exige SOCIO (REQ-030); AC-012 fija 20 altas y cuenta las confirmadas; 0.4 documenta el incremento atómico existente. El orden de actualización de `mover` queda como riesgo para S-19/S-20.
- Fila 11: se agregaron los riesgos de contrato con kiosco y APK, contención y bloqueo, cifras cambiantes y documentos desfasados.
- Lo que no se pudo verificar y queda marcado «no verificado»: los APK de `vitrina-tv`.
