---
id: S-23
estado: en-revision
adrs: ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-05, S-08, S-09, S-18, S-22
aprobada_por:
fecha_aprobacion:
---
# S-23 — Un solo rol: el socio o administrador, con acceso total y sin permisos por módulo

## 0. Contexto y alcance

### 0.1 Problema
El código heredado distingue cuatro roles (`SOCIO`, `GERENTE`, `RECEPCION` y `ENTRENADOR`) y una matriz de permisos por módulo y acción (`MIEMBROS`, `PAGOS`, `PLANES`, `CAJA`, `USUARIOS`, `SUCURSALES`, `EN_SALA` por `VER`, `CREAR`, `EDITAR` y `ELIMINAR`) que se consulta en decenas de casos de uso, rutas y páginas. Adhara Fit es un gimnasio pequeño sin empleados como figura: el propietario indicó el 2026-11-12 que inicia sesión solo el socio o administrador, con acceso total, y que los entrenadores son personas sin acceso (S-18). S-23 quita los roles `GERENTE`, `RECEPCION` y `ENTRENADOR`, la matriz de permisos y todas sus consultas, y deja una sola cosa: una sesión válida de una persona activa da acceso a todo el panel.

### 0.2 Dentro de alcance
- Retiro de `UsuarioAdmin.rol`, del enum `RolUsuario`, de los enums `ModuloPermiso` y `AccionPermiso`, y de la tabla `PermisoUsuario`.
- Retiro de `IPermisoRepository` y sus repositorios, `AuthorizationService`, `IAuthorizationService`, `ActualizarPermisosUsuario`, `PERMISOS_POR_ROL`, `puedeCrearUsuarioConRol`, `puedeEditarKiosko` y todas las llamadas a `tienePermiso` y las comprobaciones de rol en casos de uso, rutas, acciones y páginas.
- La guarda única de S-01 pasa a ser la de sesión (`exigirSesion`); la tabla de permisos por ruta distingue solo «sesión», «clave de kiosco» y «público».
- Pantalla «Administradores» (reemplaza a «Usuarios»): lista, alta, edición, desactivar y reactivar, y cambio de contraseña; siempre queda al menos un administrador activo.
- Retiro del borrado de usuarios (`EliminarUsuarioAdmin`): un administrador se desactiva, no se borra.
- Textos y menús que mencionan gerente, recepción, permisos o «solo el socio».
- `tools/verificar-rol.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Las entidades de entrenadores: S-18.
- El primer administrador sembrado y el flujo de contraseña inicial sin claves fijas: S-15 y S-01.
- Límite de intentos y cierre de sesiones al desactivar: ya los define S-01 (REQ-S01-004 y los de inicio de sesión).
- Un registro de «quién hizo qué» más allá de `registradoPorId` y `RegistroAuditoria`: no hay requisito.
- Roles futuros (por ejemplo, un recepcionista): no se prevén; si el propietario los pidiera, sería una spec nueva.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-23 recibirá después de S-00 a S-10, S-18 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Roles y permisos en el esquema:** `enum RolUsuario` con `SOCIO`, `GERENTE`, `RECEPCION` y `ENTRENADOR` (`schema.prisma:68-73`), `UsuarioAdmin.rol` (`:75-95`), `enum ModuloPermiso` con siete módulos (`:104-111`), `enum AccionPermiso` con cuatro acciones (`:114-119`) y `model PermisoUsuario` con `@@unique([usuarioId, modulo, accion])` (verificado con `Read`).
- **Matriz por rol:** `CrearUsuarioAdmin.ts:46-77` define `PERMISOS_POR_ROL` (SOCIO todo; GERENTE casi todo; RECEPCION lectura y cobro; ENTRENADOR vacío), y su comentario avisa que la matriz está duplicada en `packages/db/backfillPermisosYSucursales.ts`; `PrismaPermisoRepository.ts:8-13` resuelve un permiso por búsqueda de fila, sin tratar al socio como excepción (verificado con `Read`).
- **Servicio de autorización:** `AuthorizationService.ts` ofrece `puedeCrearUsuarioConRol` (solo `SOCIO`) y `tienePermiso` (verificado con `Read`).
- **Alcance en código:** 43 archivos mencionan `tienePermiso`, 8 `ModuloPermiso`, 27 `PermisoUsuario`, `PermisoRepository` o `IPermisoRepository`, 18 `RolUsuario`, 8 `GERENTE`, 6 `RECEPCION`, 20 `ENTRENADOR`, 4 `puedeCrearUsuarioConRol`, 36 `AuthorizationService` o `IAuthorizationService` y 48 usan `.rol` (verificado con `grep -rIlE`).
- **Comprobaciones de rol fuera del dominio:** `usuarios/actions.ts:96,167,203,236` rechaza con `SOLO_SOCIO` a quien no es `SOCIO`; `api/en-sala/historial/route.ts:13` exige `SOCIO`; `sucursales/` y `usuarios/` páginas comparan `usuario.rol === "SOCIO"` o consultan `permisos.tiene` (`usuarios/[id]/page.tsx:35`, `usuarios/nuevo/page.tsx:18`, `usuarios/page.tsx:20`); `lib/permisoKiosko.ts` deja editar el kiosco a `SOCIO` y `GERENTE` y lo usan `MasSheet.tsx:26`, `kiosko/actions.ts:26` y `kiosko/layout.tsx:12` (verificado con `grep -n`).
- **Rutas:** `apps/web-admin/app/api/usuarios/route.ts` y las pantallas `usuarios/{nuevo,[id]}`, `FormularioPermisos.tsx`, `FormularioUsuario.tsx` y `TarjetaUsuario.tsx` gestionan usuarios y permisos; existe `cambiar-password` (verificado con `ls`).
- **Interacción con specs aprobadas:** S-01 define `exigirPermiso` y una tabla de permisos por ruta (REQ-S01-012, REQ-S01-014, REQ-S01-029), exige el rol `SOCIO` para rotar la clave del kiosco (REQ-S01-011) y cierra las sesiones al desactivar (REQ-S01-004); S-05 retira `SUCURSALES`; S-08 retira `CAJA` y fija `PAGOS VER`, `CREAR`, `ELIMINAR`; S-09 usa `MIEMBROS ELIMINAR`; S-18 usa `USUARIOS` para entrenadores y deja el enum a S-23 (verificado con `grep -n` en las specs).
- No verificado: el contenido de los 43 archivos con `tienePermiso` más allá de los citados, y que `packages/db/backfillPermisosYSucursales.ts` no se importe (S-00 lo excluye).

### 0.5 Supuestos
- SUP-S23-001: toda persona que inicia sesión es un «administrador» (el socio) con acceso total; el sistema no distingue entre administradores. Default: ese modelo; decisión del propietario (2026-11-12); asumido, por validar.
- SUP-S23-002: puede haber más de un administrador (por ejemplo, el propietario y un socio), todos con los mismos derechos; el propietario no pidió un máximo. Default: sin máximo; asumido, por validar.
- SUP-S23-003: siempre debe quedar al menos un administrador activo, y nadie puede desactivarse a sí mismo. Default: ambas reglas; asumido, por validar.
- SUP-S23-004: un administrador no se borra: el borrado físico se retira y se desactiva, porque sus pagos y registros apuntan a él (`Pago.registradoPorId`, `RegistroAuditoria.usuarioId`). Default: solo desactivar; asumido, por validar.
- SUP-S23-005: la clave de API del kiosco (S-01) la rota cualquier administrador autenticado; la regla «solo SOCIO» de REQ-S01-011 se lee como «cualquier sesión». Default: ese cambio; asumido, por validar.
- SUP-S23-006: la pantalla «Usuarios» pasa a llamarse «Administradores» y deja de ofrecer rol y permisos; el alta pide nombre, correo y contraseña. Default: ese nombre y esos campos; asumido, por validar.
- SUP-S23-007: no hay datos que migrar: el baseline se genera nuevo (S-00, S-15) y el seed crea el primer administrador. Default: sin migración; asumido, por validar.

## 1. Requisitos

### REQ-S23-001
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: La tabla UsuarioAdmin no deberá tener la columna rol ni existir el enum RolUsuario.

### REQ-S23-002
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: El esquema no deberá contener la tabla PermisoUsuario ni los enums ModuloPermiso y AccionPermiso.

### REQ-S23-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: IPermisoRepository, sus repositorios, AuthorizationService, IAuthorizationService y ActualizarPermisosUsuario no deberán existir.

### REQ-S23-004
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: Ningún caso de uso, ruta, acción ni página deberá consultar un permiso o un rol del usuario.

### REQ-S23-005
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: Una sesión válida de un administrador activo deberá dar acceso a todas las funciones del panel y de las rutas con sesión.

### REQ-S23-006
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si la petición no trae una sesión válida de un administrador activo entonces cada acción, ruta y página con sesión deberá rechazarla antes de leer o escribir datos.

### REQ-S23-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: Cada acción del panel y cada ruta de api que no sea pública ni de kiosco deberá llamar a exigirSesion de S-01 antes de leer o escribir datos.

### REQ-S23-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El test de contrato de rutas de S-01 deberá clasificar cada ruta solo como pública, con clave de kiosco o con sesión.

### REQ-S23-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-005
- texto: La rotación de la clave del kiosco y la configuración del kiosco deberán estar disponibles para cualquier administrador autenticado.

### REQ-S23-010
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: La entidad UsuarioAdmin, la sesión y las respuestas de la API no deberán contener rol ni permisos.

### REQ-S23-011
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-006
- texto: La pantalla «Administradores» deberá permitir listar, crear, editar, desactivar y reactivar administradores y cambiar la contraseña propia.

### REQ-S23-012
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-006
- texto: El alta de un administrador deberá pedir solo nombre, correo y contraseña, sin ofrecer rol ni permisos.

### REQ-S23-013
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S23-003
- texto: Si la desactivación dejaría al sistema sin administradores activos entonces desactivarUsuarioAdmin deberá rechazarla con UltimoAdministradorError sin escribir nada.

### REQ-S23-014
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S23-003
- texto: Si un administrador intenta desactivarse a sí mismo entonces desactivarUsuarioAdmin deberá rechazarlo con NoPuedeDesactivarseError sin escribir nada.

### REQ-S23-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La desactivación de un administrador deberá abrir su transacción, bloquear las filas de los administradores activos y releer su cantidad antes de validar.

### REQ-S23-016
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-004
- texto: El caso de uso EliminarUsuarioAdmin, su acción y su botón no deberán existir.

### REQ-S23-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: Los menús y la navegación no deberán ocultar ni condicionar ninguna entrada por rol o permiso.

### REQ-S23-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: Ningún texto de las pantallas ni de los mensajes deberá mencionar gerente, recepción, permisos o «solo el socio».

### REQ-S23-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos RolUsuario, ModuloPermiso, AccionPermiso, PermisoUsuario, IPermisoRepository, AuthorizationService, IAuthorizationService, tienePermiso, exigirPermiso, ActualizarPermisosUsuario, puedeCrearUsuarioConRol, puedeEditarKiosko, PERMISOS_POR_ROL, SOLO_SOCIO, GERENTE ni RECEPCION.

### REQ-S23-020
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-rol.mjs encuentra alguno de los términos de REQ-S23-019, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S23-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-rol.mjs en cada pull request.

## 2. Comportamiento

### BEH-S23-001
- cubre: REQ-S23-001, REQ-S23-002, REQ-S23-010
- categoria: feliz
- dado: el esquema final
- cuando: se consultan las columnas de UsuarioAdmin, los enums y las tablas, y las respuestas de la API de sesión y de usuarios
- entonces: UsuarioAdmin no tiene rol, no existen RolUsuario, ModuloPermiso, AccionPermiso ni PermisoUsuario, y ninguna respuesta contiene rol ni permisos

### BEH-S23-002
- cubre: REQ-S23-003, REQ-S23-004
- categoria: feliz
- dado: el código final
- cuando: se buscan los puertos, repositorios, servicios, casos de uso y las llamadas que consultan permisos o roles
- entonces: no existe ninguno

### BEH-S23-003
- cubre: REQ-S23-005
- categoria: feliz
- dado: un administrador activo con sesión válida
- cuando: recorre miembros, cobros, planes, entrenadores, kiosco, vitrina, administradores y la rotación de la clave del kiosco
- entonces: todas las funciones están disponibles sin ningún mensaje de falta de permiso

### BEH-S23-004
- cubre: REQ-S23-006, REQ-S23-007
- categoria: error
- dado: peticiones sin sesión, con una sesión vencida y con la sesión de un administrador desactivado
- cuando: llegan a cada acción, ruta y página con sesión
- entonces: todas se rechazan antes de leer o escribir datos

### BEH-S23-005
- cubre: REQ-S23-008
- categoria: borde
- dado: un árbol con una ruta nueva sin clasificar y otro con una ruta que llama a una guarda de permisos
- cuando: se ejecuta tools/contrato-permisos.mjs
- entonces: falla con la ruta sin clasificar y con la que usa permisos, y pasa con el árbol final

### BEH-S23-006
- cubre: REQ-S23-009
- categoria: feliz
- dado: dos administradores
- cuando: el segundo rota la clave del kiosco y abre la configuración del kiosco
- entonces: ambas operaciones funcionan para cualquier administrador

### BEH-S23-007
- cubre: REQ-S23-011, REQ-S23-012, REQ-S23-017, REQ-S23-018
- categoria: feliz
- dado: la pantalla «Administradores» y el menú
- cuando: el administrador lista, crea, edita, desactiva, reactiva y cambia su contraseña
- entonces: todas las acciones funcionan, el alta pide nombre, correo y contraseña sin rol ni permisos, el menú muestra todas sus entradas y ningún texto menciona gerente, recepción ni permisos

### BEH-S23-008
- cubre: REQ-S23-013
- categoria: error
- dado: un único administrador activo y un segundo administrador inactivo
- cuando: otro administrador intenta desactivar al único activo
- entonces: se lanza UltimoAdministradorError y no se escribe nada

### BEH-S23-009
- cubre: REQ-S23-014
- categoria: error
- dado: dos administradores activos
- cuando: uno intenta desactivarse a sí mismo
- entonces: se lanza NoPuedeDesactivarseError y no se escribe nada

### BEH-S23-010
- cubre: REQ-S23-015
- categoria: concurrencia
- dado: dos administradores activos A y B y dos desactivaciones simultáneas, A desactivando a B y B desactivando a A
- cuando: terminan las dos transacciones
- entonces: una se confirma y la otra falla, de modo que queda exactamente un administrador activo

### BEH-S23-011
- cubre: REQ-S23-016
- categoria: feliz
- dado: el árbol final
- cuando: se buscan el caso de uso, la acción y el botón de borrar administradores
- entonces: no existen y un administrador con pagos registrados solo se puede desactivar

### BEH-S23-012
- cubre: REQ-S23-019, REQ-S23-020
- categoria: error
- dado: un archivo por cada uno de los quince términos de REQ-S23-019
- cuando: se ejecuta tools/verificar-rol.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S23-013
- cubre: REQ-S23-021
- categoria: error
- dado: un pull request que agrega tienePermiso en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-rol.mjs falla y queda en rojo

## 3. Invariantes

### INV-S23-001
- propiedad: el sistema siempre tiene al menos un administrador activo
- mecanismo: transaccion
- deteccion: 200 secuencias de altas, desactivaciones y reactivaciones generadas con semilla fija, incluidas desactivaciones simultáneas con una barrera; tras cada paso la cantidad de administradores activos es mayor o igual que 1
- protege: REQ-S23-013, REQ-S23-014, REQ-S23-015

### INV-S23-002
- propiedad: ningún dato ni consulta del sistema depende de un rol o de un permiso
- mecanismo: restriccion-bd
- deteccion: la consulta del esquema final por UsuarioAdmin.rol, PermisoUsuario y los enums de rol y permiso devuelve 0 filas
- protege: REQ-S23-001, REQ-S23-002

### INV-S23-003
- propiedad: toda ruta y acción con sesión rechaza a quien no tiene una sesión válida de un administrador activo
- mecanismo: test-propiedad
- deteccion: para cada ruta y acción registrada, una petición sin sesión, con sesión vencida y con sesión de un administrador inactivo recibe el rechazo, sobre 3 casos por ruta generados con semilla fija
- protege: REQ-S23-006, REQ-S23-007

### INV-S23-004
- propiedad: los términos de roles y permisos no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-rol.mjs termina con código distinto de cero y lista archivo:línea y término de cada coincidencia
- protege: REQ-S23-019, REQ-S23-020

## 4. Criterios de aceptación

### AC-S23-001
- enlaza: REQ-S23-001, REQ-S23-002, REQ-S23-010, BEH-S23-001, INV-S23-002
- metodo: sql
- procedimiento: consultar el esquema final por UsuarioAdmin.rol, PermisoUsuario, RolUsuario, ModuloPermiso y AccionPermiso, y leer las respuestas de las rutas de sesión y de administradores
- esperado: nada de eso existe y ninguna respuesta trae rol ni permisos
- test: pendiente

### AC-S23-002
- enlaza: REQ-S23-003, REQ-S23-004, REQ-S23-016, BEH-S23-002, BEH-S23-011
- metodo: unitario
- procedimiento: buscar con la API de typescript los puertos, repositorios, servicios, casos de uso, acciones y botones retirados y las llamadas que consultan permisos o roles
- esperado: no existe ninguno
- test: pendiente

### AC-S23-003
- enlaza: REQ-S23-005, REQ-S23-006, REQ-S23-007, REQ-S23-009, BEH-S23-003, BEH-S23-004, BEH-S23-006, INV-S23-003
- metodo: integracion
- procedimiento: con una base efímera, recorrer con la sesión de un administrador activo las funciones de BEH-S23-003 y la rotación de la clave del kiosco con un segundo administrador; y enviar a cada ruta y acción con sesión una petición sin sesión, con sesión vencida y con la sesión de un administrador inactivo
- esperado: las funciones del administrador activo funcionan sin mensajes de permiso y las otras tres peticiones se rechazan antes de leer o escribir
- test: pendiente

### AC-S23-004
- enlaza: REQ-S23-008, BEH-S23-005
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/contrato-permisos.mjs con una ruta nueva sin clasificar y con una que llama a una guarda de permisos, y luego sobre el árbol final
- esperado: falla en los dos primeros casos y pasa con el árbol final
- test: pendiente

### AC-S23-005
- enlaza: REQ-S23-011, REQ-S23-012, REQ-S23-017, REQ-S23-018, BEH-S23-007
- metodo: manual
- procedimiento: como administrador, abrir «Administradores», crear, editar, desactivar, reactivar y cambiar la contraseña, y revisar el menú y los textos
- esperado: todas las acciones funcionan, el alta no ofrece rol ni permisos, el menú muestra todas sus entradas y ningún texto menciona gerente, recepción ni permisos
- test: pendiente

### AC-S23-006
- enlaza: REQ-S23-013, REQ-S23-014, REQ-S23-015, BEH-S23-008, BEH-S23-009, BEH-S23-010, INV-S23-001
- metodo: integracion
- procedimiento: ejecutar desactivarUsuarioAdmin con un único administrador activo, con uno que se desactiva a sí mismo y, con una barrera, con dos desactivaciones cruzadas; y las 200 secuencias generadas con semilla fija
- esperado: los errores y los resultados son los de esos comportamientos y la cantidad de administradores activos nunca baja de 1
- test: pendiente

### AC-S23-007
- enlaza: REQ-S23-019, REQ-S23-020, BEH-S23-012, INV-S23-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-rol.mjs con un árbol por cada uno de los quince términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los quince términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S23-008
- enlaza: REQ-S23-021, BEH-S23-013
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue tienePermiso en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-rol.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de las guardas de sesión y de la desactivación de administradores; (2) `tools/verificar-rol.mjs` y sus pruebas, con todos los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) pruebas del `desactivarUsuarioAdmin` nuevo (último administrador, a sí mismo, concurrencia) y su implementación junto al borrado viejo; (4) la guarda única `exigirSesion` y la reclasificación de la tabla de rutas de S-01 y de `tools/contrato-permisos.mjs`; (5) migrar los casos de uso, rutas, acciones y páginas que consultan permisos o roles, módulo por módulo, cada commit con sus pruebas (miembros, pagos y cobros, planes, entrenadores, en sala, kiosco y vitrina, administradores); (6) pantalla «Administradores»: alta sin rol ni permisos, desactivar y reactivar, y retiro de `FormularioPermisos`; (7) retirar `EliminarUsuarioAdmin`, `AuthorizationService`, `IAuthorizationService`, `IPermisoRepository` y sus repositorios, `ActualizarPermisosUsuario`, `PERMISOS_POR_ROL`, `puedeEditarKiosko` y `puedeCrearUsuarioConRol`; (8) esquema: retirar `UsuarioAdmin.rol`, `PermisoUsuario` y los tres enums, y los campos de rol de la entidad y la sesión, achicando las exenciones en el mismo commit.
- Las pruebas de concurrencia usan semillas fijas, una base efímera y una barrera que fija el orden en que las transacciones toman el bloqueo; no hay dependencias nuevas.
- El criterio AC-S23-005 y AC-S23-008 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar (SUP-S23-007): el baseline se genera nuevo (S-00, S-15) y el seed crea el primer administrador.
- **Enmiendas que se registran al aprobar S-23:**
  - S-01: REQ-S01-012 (permisos en los casos de uso), REQ-S01-014 (guarda en cada acción: solo `exigirSesion`), REQ-S01-029 (la tabla de permisos por ruta pasa a «sesión», «clave de kiosco» o «público») y REQ-S01-011 (la rotación de la clave del kiosco no exige el rol `SOCIO`) se leen con esta spec; `tools/contrato-permisos.mjs` clasifica las rutas en tres clases.
  - S-05: SUP-S05-009 y la retirada de `SUCURSALES` quedan cumplidas por el retiro de todos los permisos.
  - S-08, S-09 y S-18: los permisos `PAGOS VER`, `PAGOS CREAR`, `PAGOS ELIMINAR`, `MIEMBROS ELIMINAR`, `MIEMBROS VER` y `USUARIOS` que nombran (REQ-S08-042, REQ-S09-005, REQ-S09-006, REQ-S09-023, REQ-S18-013) se leen como «sesión válida de un administrador activo».
  - S-07: REQ-S07-011 (permiso `PAGOS CREAR`) se lee como «sesión válida».
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 restan dos tablas (`PermisoUsuario` y la de roles si existe) y tres enums (`RolUsuario`, `ModuloPermiso`, `AccionPermiso`); REQ-S22-007 y AC-S22-003 restan el repositorio de permisos.
  - S-18: la nota de 0.3 («S-23 retira el enum de roles») queda cumplida.
  - `docs/06-modelo-datos-cambios.md`, `docs/00-indice.md`, `docs/datos-iniciales.md` y `COBERTURA-RF.md`: nota de que S-23 dejó un solo rol.
- **Traspasos:** S-15 (el primer administrador y su contraseña inicial) y S-01 (cierre de sesiones al desactivar y límite de intentos).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Sin permisos por módulo, cualquier administrador puede hacer cualquier cosa, incluidas las acciones destructivas; la defensa es la anulación con motivo y autor, la auditoría y que solo el socio y sus socios tengan cuenta. Es una decisión del propietario (gimnasio pequeño).
- Quitar los permisos toca unos 43 archivos con `tienePermiso` y 48 con `.rol`; el riesgo es una comprobación que sobreviva y bloquee a todos o un acceso que quede sin guarda. Mitigación: el typecheck, el test de contrato de rutas y la herramienta de términos.
- Si más adelante se contrata personal de recepción, habrá que reintroducir los roles con una spec nueva; la reversibilidad es baja.
- El administrador único que pierde su contraseña no tiene a quién pedirle ayuda dentro del sistema. Mitigación: S-17 (operación) define la recuperación; mientras tanto, otro administrador puede cambiarla.
- La clave de API del kiosco queda al alcance de cualquier administrador (SUP-S23-005).
- Las cifras de 0.4 cambian cuando S-00 a S-10, S-18 y S-22 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Puede haber más de un administrador, todos con los mismos derechos? Default: sí (SUP-S23-002).
- ¿Siempre debe quedar al menos un administrador activo y nadie puede desactivarse a sí mismo? Default: sí (SUP-S23-003).
- ¿Un administrador no se borra, solo se desactiva? Default: sí (SUP-S23-004).
- ¿La pantalla «Usuarios» pasa a llamarse «Administradores»? Default: sí (SUP-S23-006).
