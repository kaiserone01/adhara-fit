---
id: S-23
estado: aprobada
adrs: ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-04, S-05, S-07, S-08, S-09, S-18, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-23 — Un solo rol: el socio o administrador, con acceso total y sin permisos por módulo

## 0. Contexto y alcance

### 0.1 Problema
El código heredado distingue cuatro roles (`SOCIO`, `GERENTE`, `RECEPCION` y `ENTRENADOR`) y una matriz de permisos por módulo y acción (`MIEMBROS`, `PAGOS`, `PLANES`, `CAJA`, `USUARIOS`, `SUCURSALES`, `EN_SALA` por `VER`, `CREAR`, `EDITAR` y `ELIMINAR`) que se consulta en decenas de casos de uso, rutas y páginas. Adhara Fit es un gimnasio pequeño sin empleados como figura: el propietario indicó el 2026-11-12 que inicia sesión solo el socio o administrador, con acceso total, y los entrenadores son personas sin acceso (S-18). S-23 quita los roles `GERENTE`, `RECEPCION` y `ENTRENADOR`, la matriz de permisos y todas sus consultas, y deja una sola regla: una sesión válida de un administrador activo da acceso a todo el panel. Esa regla reemplaza la verificación de permisos en los casos de uso que fijaron ADR-012 §3 y §4 y S-01 (REQ-S01-012); por eso se registra una enmienda a ADR-012 (5.2).

### 0.2 Dentro de alcance
- Retiro de `UsuarioAdmin.rol`, de los enums `RolUsuario`, `ModuloPermiso` y `AccionPermiso` y de la tabla `PermisoUsuario`.
- Retiro de `IPermisoRepository` y sus repositorios, `AuthorizationService`, `IAuthorizationService`, `ActualizarPermisosUsuario`, `PERMISOS_POR_ROL`, `puedeCrearUsuarioConRol`, `puedeEditarKiosko`, las guardas `exigirPermiso` y `exigirSocio` de S-01, `apps/web-admin/scripts/verificar-autorizacion.ts` y todas las consultas de permiso o rol en casos de uso, rutas, acciones y páginas.
- La guarda única pasa a ser `exigirSesion`; la tabla de contrato de rutas de S-01 distingue solo «sesión», «clave de kiosco» y «público».
- Pantalla «Administradores» (reemplaza a «Usuarios»): lista, alta, edición, desactivar y reactivar, y cambio de la contraseña propia; el caso de uso existente `actualizarUsuarioAdmin` pierde el rol y gana la protección del último administrador.
- Retiro del borrado de usuarios (`EliminarUsuarioAdmin` y el método `eliminar` del repositorio): un administrador se desactiva, no se borra.
- Textos y menús que mencionan gerente, recepción, permisos o «solo el socio».
- `tools/verificar-rol.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Las entidades de entrenadores: S-18.
- El primer administrador sembrado y la contraseña inicial sin claves fijas: S-15 y S-01.
- Límite de intentos y cierre de sesiones al desactivar: ya los define S-01 (REQ-S01-004 y los de inicio de sesión).
- Recuperar la contraseña de un administrador que la olvidó, restablecer la de otro administrador y un registro de «quién hizo qué» más allá de `registradoPorId` y `RegistroAuditoria`: no hay requisito.
- Roles futuros (por ejemplo, un recepcionista): no se prevén; si el propietario los pidiera sería una spec nueva.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-23 recibirá después de S-00 a S-10, S-18 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Roles y permisos en el esquema:** `enum RolUsuario` con `SOCIO`, `GERENTE`, `RECEPCION` y `ENTRENADOR` (`schema.prisma:68-73`), `UsuarioAdmin` con `rol` y `email @unique` (`:75-102`), `enum ModuloPermiso` con siete módulos (`:104-111`), `enum AccionPermiso` con cuatro acciones (`:114-119`) y `model PermisoUsuario` con `@@unique([usuarioId, modulo, accion])` (verificado con `Read`).
- **Matriz por rol:** `CrearUsuarioAdmin.ts:45-76` define `PERMISOS_POR_ROL` (SOCIO todo; GERENTE solo `SUCURSALES VER`; RECEPCION lectura, cobro y sala; ENTRENADOR vacío), con un comentario que avisa que la matriz está duplicada en `packages/db/backfillPermisosYSucursales.ts`; `PrismaPermisoRepository.ts:8-13` resuelve un permiso por búsqueda de fila, sin tratar al socio como excepción (verificado con `Read`).
- **Servicio de autorización:** `AuthorizationService.ts` ofrece `puedeCrearUsuarioConRol` (solo `SOCIO`) y `tienePermiso` (verificado con `Read`).
- **Desactivar hoy:** `ActualizarUsuarioAdmin.ts:23-45` exige `rolSolicitante === "SOCIO"`, impide desactivar la propia cuenta con `AutoDesactivacionError` (`:36-39`) y delega en el repositorio la actualización de `nombre`, `telefono`, `fotoUrl` y `activo` (`CambiosUsuarioAdmin`, `UsuarioAdmin.ts:15-20`); no hay protección del último administrador ni transacción; no existe una acción para cambiar la contraseña de otro usuario (solo `cambiar-password/` para la propia) (verificado con `Read`).
- **Borrar hoy:** `PrismaUsuarioAdminRepository.ts:81-86` borra en una transacción las sedes, los permisos y las sesiones del usuario y luego el usuario; el historial real (pagos) lo bloquea la clave foránea (verificado con `Read`).
- **Alcance en código:** 43 archivos mencionan `tienePermiso` (10 en `apps`, 33 en `packages`), 8 `ModuloPermiso`, 27 `PermisoUsuario`, `PermisoRepository` o `IPermisoRepository`, 18 `RolUsuario`, 9 `GERENTE` (8 de código y `apps/kiosk-tv/README.md`), 6 `RECEPCION`, 20 `ENTRENADOR` (unos 10 del rol y unos 10 del tipo de ítem de la vitrina), 4 `puedeCrearUsuarioConRol`, 36 `AuthorizationService` o `IAuthorizationService` y 48 usan `.rol` (verificado con `grep -rIlE`; los de `ModuloPermiso`, `PermisoUsuario`, `ENTRENADOR`, `AuthorizationService` y `.rol` no se re-verificaron en la revisión).
- **Comprobaciones de rol fuera del dominio:** `usuarios/actions.ts:96,167,203,236` rechaza con `SOLO_SOCIO` a quien no es `SOCIO`; `api/en-sala/historial/route.ts:13` exige `SOCIO`; `usuarios/[id]/page.tsx:35`, `usuarios/nuevo/page.tsx:18` y `usuarios/page.tsx:20` comparan el rol o consultan permisos; `lib/permisoKiosko.ts` deja editar el kiosco a `SOCIO` y `GERENTE` y lo usan `MasSheet.tsx:26`, `kiosko/actions.ts:26` y `kiosko/layout.tsx:12` (verificado con `grep -n`). Otras comprobaciones citadas por la revisión, no re-verificadas: `configuraciones/actions.ts:62,102,146`, `configuraciones/tabs.ts:17`, `planes/[id]/page.tsx:44`, `lib/permisoEnSala.ts:7`, `(panel)/layout.tsx:54` y `ActualizarFrecuenciaPlan.ts:52`.
- **Pruebas de autorización:** `apps/web-admin/scripts/verificar-autorizacion.ts` nombra `GERENTE` y `RECEPCION` (verificado con `grep -n`).
- **Rutas y pantallas:** `apps/web-admin/app/api/usuarios/route.ts`, las pantallas `usuarios/{nuevo,[id]}`, `FormularioPermisos.tsx`, `FormularioUsuario.tsx` y `TarjetaUsuario.tsx`, y `cambiar-password/` (verificado con `ls`).
- **Interacción con specs aprobadas:** S-01 define `exigirSesion`, `exigirPermiso`, `exigirSocio` y `exigirKiosco` (SUP-S01-009) y exige el rol `SOCIO` para rotar la clave del kiosco (REQ-S01-011); S-04 (REQ-S04-006 y REQ-S04-040), S-08 (REQ-S08-009 y REQ-S08-010, con sus BEH y AC de «permisos por defecto»), S-09 (REQ-S09-039) y S-07 (REQ-S07-013) nombran permisos; S-05 (REQ-S05-030) prueba que un `GERENTE` no puede rotar la clave, lo que contradice la regla nueva; S-18 usa `USUARIOS` y deja el enum a S-23 (verificado con `grep -n` en las specs).
- No verificado: el contenido de los 43 archivos con `tienePermiso` más allá de los citados, que `packages/db/backfillPermisosYSucursales.ts` no se importe (S-00 lo excluye) y las citas de `Pago.registradoPorId` y `RegistroAuditoria.usuarioId` de SUP-S23-004.

### 0.5 Supuestos
- SUP-S23-001: toda persona que inicia sesión es un «administrador» (el socio) con acceso total; el sistema no distingue entre administradores. Default: ese modelo; supuesto derivado de la indicación del propietario del 2026-11-12 (ítem aprobado en el backlog); asumido, por validar.
- SUP-S23-002: puede haber más de un administrador, todos con los mismos derechos; no hay un máximo. Default: sin máximo; asumido, por validar.
- SUP-S23-003: siempre debe quedar al menos un administrador activo y nadie puede desactivarse a sí mismo. Default: ambas reglas; asumido, por validar.
- SUP-S23-004: un administrador no se borra: se retira el borrado físico y se desactiva, porque sus pagos y registros apuntan a él (`Pago.registradoPorId`, `RegistroAuditoria.usuarioId`). Default: solo desactivar; asumido, por validar.
- SUP-S23-005: la clave de API del kiosco la rota cualquier administrador autenticado; REQ-S01-011 y REQ-S05-030 se leen como «cualquier sesión». Default: ese cambio; asumido, por validar.
- SUP-S23-006: la pantalla «Usuarios» pasa a llamarse «Administradores» y deja de ofrecer rol y permisos; el alta pide nombre, correo y contraseña. Default: ese nombre y esos campos; asumido, por validar.
- SUP-S23-007: no hay datos que migrar: el baseline se genera nuevo (S-00, S-15) y el seed crea el primer administrador. Default: sin migración; asumido, por validar.
- SUP-S23-008: la contraseña de un administrador tiene al menos 8 caracteres en el alta y en el cambio; cambiar la propia exige la actual. No se verificó la regla actual de `cambiar-password/`. Default: ese mínimo; asumido, por validar.
- SUP-S23-009: el caso de uso `actualizarUsuarioAdmin` se conserva (con su nombre) y es la única vía para desactivar y reactivar; se le quita el rol del solicitante, se le agrega el bloqueo transaccional y la protección del último administrador. Default: conservar y extender; asumido, por validar.
- SUP-S23-010: ningún administrador puede restablecer la contraseña de otro; quien la olvida depende de un procedimiento manual de la base de datos que no define esta spec. Default: sin restablecimiento; asumido, por validar.
- SUP-S23-011: ADR-012 §3 y §4 (permiso verificado en cada caso de uso, rotación con permiso de socio) se enmiendan para decir «sesión válida de un administrador activo», porque ya no hay permisos que verificar. Default: enmendar al aprobar S-23; asumido, por validar.

## 1. Requisitos

### REQ-S23-001
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: La tabla UsuarioAdmin no deberá tener la columna rol.

### REQ-S23-002
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: El esquema no deberá contener el enum RolUsuario.

### REQ-S23-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: El esquema no deberá contener la tabla PermisoUsuario.

### REQ-S23-004
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: El esquema no deberá contener los enums ModuloPermiso y AccionPermiso.

### REQ-S23-005
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: IPermisoRepository y todas sus implementaciones no deberán existir.

### REQ-S23-006
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: AuthorizationService, IAuthorizationService y puedeCrearUsuarioConRol no deberán existir.

### REQ-S23-007
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: ActualizarPermisosUsuario, FormularioPermisos y PERMISOS_POR_ROL no deberán existir.

### REQ-S23-008
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: Ningún caso de uso, ruta, acción ni página deberá leer un rol o un permiso del usuario, de modo que el typecheck falle ante cualquier acceso a .rol.

### REQ-S23-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: Una sesión válida de un administrador activo deberá dar acceso a todas las funciones del panel y de las rutas con sesión.

### REQ-S23-010
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S23-001
- texto: Si la petición no trae una sesión válida de un administrador activo entonces cada acción, ruta y página con sesión deberá rechazarla antes de leer o escribir datos.

### REQ-S23-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada acción del panel y cada ruta de api que no sea pública ni de kiosco deberá llamar a exigirSesion de S-01 antes de leer o escribir datos.

### REQ-S23-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El test de contrato de rutas de S-01 deberá clasificar cada ruta solo como pública, con clave de kiosco o con sesión.

### REQ-S23-013
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: Las guardas exigirPermiso y exigirSocio de S-01 no deberán existir.

### REQ-S23-014
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-005
- texto: La rotación de la clave del kiosco deberá estar disponible para cualquier administrador autenticado.

### REQ-S23-015
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-005
- texto: La configuración del kiosco deberá estar disponible para cualquier administrador autenticado.

### REQ-S23-016
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: La entidad UsuarioAdmin no deberá tener los campos rol ni permisos.

### REQ-S23-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: La sesión y las respuestas de la API no deberán contener rol ni permisos.

### REQ-S23-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-006
- texto: La pantalla «Administradores» deberá listar los administradores con su estado activo o inactivo.

### REQ-S23-019
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-006
- texto: El alta de un administrador deberá pedir solo nombre, correo y contraseña, sin ofrecer rol ni permisos.

### REQ-S23-020
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-006
- texto: La edición de un administrador deberá permitir cambiar su nombre, teléfono y foto.

### REQ-S23-021
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-009
- texto: actualizarUsuarioAdmin deberá desactivar y reactivar administradores sin recibir ni consultar el rol del solicitante.

### REQ-S23-022
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-008
- texto: Cada administrador deberá poder cambiar su propia contraseña indicando la actual y una nueva de al menos 8 caracteres.

### REQ-S23-023
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S23-008
- texto: Si la contraseña de un alta tiene menos de 8 caracteres, o la actual de un cambio es incorrecta, o la nueva tiene menos de 8 caracteres, entonces la operación deberá rechazarse con un error de validación sin escribir nada.

### REQ-S23-024
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S23-002
- texto: Si el correo del alta ya existe entonces el alta deberá rechazarse con CorreoDuplicadoError sin escribir nada.

### REQ-S23-025
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S23-003
- texto: Si un administrador intenta desactivarse a sí mismo entonces actualizarUsuarioAdmin deberá rechazarlo con AutoDesactivacionError sin escribir nada.

### REQ-S23-026
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S23-003
- texto: Si la desactivación dejaría al sistema sin administradores activos entonces actualizarUsuarioAdmin deberá rechazarla con UltimoAdministradorError sin escribir nada.

### REQ-S23-027
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S23-009
- texto: Si el administrador a desactivar o reactivar no existe entonces actualizarUsuarioAdmin deberá rechazar la operación con UsuarioNoEncontradoError sin escribir nada.

### REQ-S23-028
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-009
- texto: Desactivar a un administrador inactivo o reactivar a uno activo no deberá producir error ni escribir.

### REQ-S23-029
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando dos desactivaciones simultáneas dejarían al sistema sin administradores activos, actualizarUsuarioAdmin deberá confirmar una y devolver UltimoAdministradorError a la otra.

### REQ-S23-030
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-004
- texto: El caso de uso EliminarUsuarioAdmin y el método eliminar del repositorio de usuarios no deberán existir.

### REQ-S23-031
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-004
- texto: La acción de borrar administradores y su botón no deberán existir.

### REQ-S23-032
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: Los menús y la navegación no deberán ocultar ni condicionar ninguna entrada por rol o permiso.

### REQ-S23-033
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S23-001
- texto: Ningún texto de las pantallas ni de los mensajes deberá mencionar gerente, recepción, permisos o «solo el socio».

### REQ-S23-034
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos RolUsuario, ModuloPermiso, AccionPermiso, PermisoUsuario, IPermisoRepository, AuthorizationService, IAuthorizationService, tienePermiso, exigirPermiso, exigirSocio, ActualizarPermisosUsuario, puedeCrearUsuarioConRol, puedeEditarKiosko, PERMISOS_POR_ROL, SOLO_SOCIO ni EliminarUsuarioAdmin, ni, sin distinguir mayúsculas, gerente, recepción ni permisos.

### REQ-S23-035
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-rol.mjs encuentra alguno de los términos de REQ-S23-034, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S23-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-rol.mjs en cada pull request.

## 2. Comportamiento

### BEH-S23-001
- cubre: REQ-S23-001, REQ-S23-002, REQ-S23-003, REQ-S23-004
- categoria: feliz
- dado: el esquema final
- cuando: se consultan las columnas de UsuarioAdmin, los enums y las tablas
- entonces: UsuarioAdmin no tiene rol y no existen RolUsuario, ModuloPermiso, AccionPermiso ni PermisoUsuario

### BEH-S23-002
- cubre: REQ-S23-005, REQ-S23-006, REQ-S23-007, REQ-S23-013
- categoria: feliz
- dado: el código final
- cuando: se buscan los puertos, repositorios, servicios, guardas, casos de uso, formularios y constantes retirados
- entonces: no existe ninguno

### BEH-S23-003
- cubre: REQ-S23-008, REQ-S23-016, REQ-S23-017
- categoria: borde
- dado: un archivo de prueba que lee usuario.rol, otro que lee usuario.permisos y los tipos de la sesión y de las respuestas de la API
- cuando: se ejecuta el typecheck
- entonces: los dos archivos fallan por propiedad inexistente y los tipos de la sesión y de las respuestas no tienen rol ni permisos

### BEH-S23-004
- cubre: REQ-S23-009, REQ-S23-014, REQ-S23-015
- categoria: feliz
- dado: dos administradores activos
- cuando: el segundo recorre miembros, cobros, planes, entrenadores, kiosco, vitrina, administradores, la configuración del kiosco y la rotación de la clave del kiosco
- entonces: todas las funciones están disponibles sin ningún mensaje de falta de permiso

### BEH-S23-005
- cubre: REQ-S23-010, REQ-S23-011
- categoria: error
- dado: peticiones sin sesión, con una sesión vencida y con la sesión de un administrador desactivado
- cuando: llegan a cada acción, ruta y página con sesión
- entonces: todas se rechazan antes de leer o escribir datos

### BEH-S23-006
- cubre: REQ-S23-012
- categoria: borde
- dado: un árbol con una ruta nueva sin clasificar y otro con una ruta que llama a exigirPermiso
- cuando: se ejecuta tools/contrato-permisos.mjs
- entonces: falla con la ruta sin clasificar y con la que usa exigirPermiso, y pasa con el árbol final

### BEH-S23-007
- cubre: REQ-S23-018, REQ-S23-019, REQ-S23-020, REQ-S23-032, REQ-S23-033
- categoria: feliz
- dado: la pantalla «Administradores» con un administrador activo y otro inactivo, y el menú
- cuando: el administrador abre la lista, crea otro con nombre, correo y contraseña, edita nombre, teléfono y foto, y revisa el menú y los textos
- entonces: la lista muestra ambos con su estado, el alta no ofrece rol ni permisos, la edición se guarda, el menú muestra todas sus entradas y ningún texto menciona gerente, recepción ni permisos

### BEH-S23-008
- cubre: REQ-S23-021
- categoria: feliz
- dado: dos administradores activos
- cuando: el primero desactiva al segundo y luego lo reactiva
- entonces: el segundo queda inactivo y después activo, sin que el caso de uso reciba ni consulte ningún rol

### BEH-S23-009
- cubre: REQ-S23-028
- categoria: borde
- dado: un administrador inactivo y otro activo
- cuando: se desactiva al inactivo y se reactiva al activo
- entonces: ambas operaciones terminan sin error y sin escribir

### BEH-S23-010
- cubre: REQ-S23-022, REQ-S23-023
- categoria: error
- dado: un administrador con contraseña «clave-actual-1»
- cuando: cambia la contraseña con la actual incorrecta, con una nueva de 7 caracteres, con una nueva de 8 caracteres y la actual correcta, y se intenta un alta con una contraseña de 7 caracteres
- entonces: las dos primeras y el alta se rechazan con un error de validación sin escribir, y el cambio con 8 caracteres se acepta

### BEH-S23-011
- cubre: REQ-S23-024
- categoria: error
- dado: el administrador con el correo «socio@ejemplo.pe»
- cuando: se intenta un alta con el mismo correo
- entonces: se lanza CorreoDuplicadoError y no se escribe nada

### BEH-S23-012
- cubre: REQ-S23-025
- categoria: error
- dado: dos administradores activos
- cuando: uno intenta desactivarse a sí mismo
- entonces: se lanza AutoDesactivacionError y no se escribe nada

### BEH-S23-013
- cubre: REQ-S23-026
- categoria: error
- dado: un único administrador activo A y uno inactivo B
- cuando: se llama directamente al caso de uso con B como solicitante para desactivar a A
- entonces: se lanza UltimoAdministradorError y no se escribe nada

### BEH-S23-014
- cubre: REQ-S23-025, REQ-S23-026
- categoria: borde
- dado: un único administrador activo
- cuando: intenta desactivarse a sí mismo
- entonces: se lanza AutoDesactivacionError, que tiene precedencia sobre UltimoAdministradorError, y no se escribe nada

### BEH-S23-015
- cubre: REQ-S23-027
- categoria: error
- dado: un identificador de administrador inexistente
- cuando: se intenta desactivarlo y reactivarlo
- entonces: ambas operaciones lanzan UsuarioNoEncontradoError y no escriben nada

### BEH-S23-016
- cubre: REQ-S23-029
- categoria: concurrencia
- dado: dos administradores activos A y B y dos desactivaciones simultáneas, A desactivando a B y B desactivando a A, detenidas con una barrera antes de confirmar
- cuando: se liberan a la vez
- entonces: una se confirma y la otra lanza UltimoAdministradorError, y queda exactamente un administrador activo

### BEH-S23-017
- cubre: REQ-S23-030, REQ-S23-031
- categoria: feliz
- dado: el árbol final y un administrador con pagos registrados
- cuando: se buscan el caso de uso, el método del repositorio, la acción y el botón de borrar administradores
- entonces: no existen y el administrador con pagos solo se puede desactivar

### BEH-S23-018
- cubre: REQ-S23-034, REQ-S23-035
- categoria: error
- dado: un archivo por cada uno de los diecinueve términos de REQ-S23-034, tres de ellos con distinto uso de mayúsculas
- cuando: se ejecuta tools/verificar-rol.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S23-019
- cubre: REQ-S23-036
- categoria: error
- dado: un pull request que agrega tienePermiso en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-rol.mjs falla y queda en rojo

## 3. Invariantes

### INV-S23-001
- propiedad: el sistema siempre tiene al menos un administrador activo
- mecanismo: transaccion
- deteccion: 200 secuencias de altas, desactivaciones y reactivaciones generadas con un generador congruencial lineal de semilla fija escrito en la prueba, incluidas desactivaciones simultáneas con una barrera; tras cada paso la cantidad de administradores activos es mayor o igual que 1
- protege: REQ-S23-025, REQ-S23-026, REQ-S23-029

### INV-S23-002
- propiedad: ningún dato del esquema depende de un rol o de un permiso
- mecanismo: lint
- deteccion: tools/verificar-rol.mjs sobre el esquema y el código termina con código distinto de cero si encuentra RolUsuario, ModuloPermiso, AccionPermiso o PermisoUsuario
- protege: REQ-S23-001, REQ-S23-002, REQ-S23-003, REQ-S23-004

### INV-S23-003
- propiedad: toda ruta y acción con sesión rechaza a quien no tiene una sesión válida de un administrador activo
- mecanismo: test-propiedad
- deteccion: para cada ruta y acción registrada, una petición sin sesión, con sesión vencida y con sesión de un administrador inactivo recibe el rechazo, sobre 3 casos por ruta con el mismo generador de semilla fija
- protege: REQ-S23-010, REQ-S23-011

### INV-S23-004
- propiedad: los términos de roles y permisos no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-rol.mjs termina con código distinto de cero y lista archivo:línea y término de cada coincidencia
- protege: REQ-S23-033, REQ-S23-034, REQ-S23-035

## 4. Criterios de aceptación

### AC-S23-001
- enlaza: REQ-S23-001, REQ-S23-002, REQ-S23-003, REQ-S23-004, BEH-S23-001, INV-S23-002
- metodo: sql
- procedimiento: consultar el catálogo del esquema final por la columna UsuarioAdmin.rol, la tabla PermisoUsuario y los tipos RolUsuario, ModuloPermiso y AccionPermiso
- esperado: las cinco consultas devuelven 0 filas
- test: pendiente

### AC-S23-002
- enlaza: REQ-S23-008, REQ-S23-016, REQ-S23-017, BEH-S23-003
- metodo: unitario
- procedimiento: ejecutar el typecheck sobre dos archivos de prueba que leen usuario.rol y usuario.permisos, y comprobar con la API de typescript que los tipos de UsuarioAdmin, de la sesión y de las respuestas de api/usuarios y de sesión no declaran rol ni permisos
- esperado: los dos archivos fallan por propiedad inexistente y ningún tipo declara esos campos
- test: pendiente

### AC-S23-003
- enlaza: REQ-S23-005, REQ-S23-006, REQ-S23-007, REQ-S23-013, REQ-S23-030, REQ-S23-031, BEH-S23-002, BEH-S23-017
- metodo: unitario
- procedimiento: buscar con la API de typescript, en apps y packages, los símbolos IPermisoRepository, AuthorizationService, IAuthorizationService, puedeCrearUsuarioConRol, ActualizarPermisosUsuario, FormularioPermisos, PERMISOS_POR_ROL, exigirPermiso, exigirSocio, EliminarUsuarioAdmin y el método eliminar del repositorio de usuarios, y las acciones y componentes cuyo nombre empiece por eliminar o borrar y toquen administradores
- esperado: no existe ninguno
- test: pendiente

### AC-S23-004
- enlaza: REQ-S23-009, REQ-S23-010, REQ-S23-011, REQ-S23-014, REQ-S23-015, BEH-S23-004, BEH-S23-005, INV-S23-003
- metodo: integracion
- procedimiento: con una base efímera, recorrer con la sesión de un segundo administrador activo las funciones de BEH-S23-004 y la rotación de la clave del kiosco; y enviar a cada ruta y acción con sesión una petición sin sesión, con sesión vencida y con la sesión de un administrador inactivo
- esperado: las funciones del administrador funcionan sin mensajes de permiso y las otras tres peticiones se rechazan antes de leer o escribir
- test: pendiente

### AC-S23-005
- enlaza: REQ-S23-012, BEH-S23-006
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/contrato-permisos.mjs con una ruta nueva sin clasificar y con una que llama a exigirPermiso, y luego sobre el árbol final
- esperado: falla en los dos primeros casos y pasa con el árbol final
- test: pendiente

### AC-S23-006
- enlaza: REQ-S23-018, REQ-S23-019, REQ-S23-020, REQ-S23-032, REQ-S23-033, BEH-S23-007
- metodo: manual
- procedimiento: como administrador, abrir «Administradores», crear uno, editar nombre, teléfono y foto, contar las entradas declaradas en (panel)/layout.tsx y MasSheet.tsx y compararlas con las que muestra el menú, y buscar en la pantalla las palabras gerente, recepción y permisos
- esperado: la lista muestra ambos estados, el alta no ofrece rol ni permisos, la edición se guarda, el menú muestra el mismo número de entradas que declara el código y ninguna palabra aparece
- test: pendiente

### AC-S23-007
- enlaza: REQ-S23-021, REQ-S23-027, REQ-S23-028, BEH-S23-008, BEH-S23-009, BEH-S23-015
- metodo: integracion
- procedimiento: con una base efímera, ejecutar actualizarUsuarioAdmin para desactivar y reactivar entre dos administradores, repetir las operaciones sobre estados ya alcanzados y usar un identificador inexistente, contando las filas escritas
- esperado: el estado cambia como en BEH-S23-008, las repeticiones terminan sin error y con 0 escrituras, el inexistente lanza UsuarioNoEncontradoError sin escribir y la firma no recibe rol
- test: pendiente

### AC-S23-008
- enlaza: REQ-S23-022, REQ-S23-023, REQ-S23-024, BEH-S23-010, BEH-S23-011
- metodo: integracion
- procedimiento: ejecutar el cambio de contraseña con la actual incorrecta, con una nueva de 7 y una de 8 caracteres, y el alta con una contraseña de 7 caracteres y con un correo ya registrado
- esperado: los casos inválidos lanzan su error de validación o CorreoDuplicadoError sin escribir y el cambio con 8 caracteres se acepta
- test: pendiente

### AC-S23-009
- enlaza: REQ-S23-025, REQ-S23-026, BEH-S23-012, BEH-S23-013, BEH-S23-014
- metodo: integracion
- procedimiento: ejecutar actualizarUsuarioAdmin para desactivar con dos administradores (a sí mismo), con un único activo y un solicitante inactivo, y con un único activo que se desactiva a sí mismo
- esperado: los errores son AutoDesactivacionError, UltimoAdministradorError y AutoDesactivacionError respectivamente, sin escribir nada
- test: pendiente

### AC-S23-010
- enlaza: REQ-S23-029, BEH-S23-016, INV-S23-001
- metodo: integracion
- procedimiento: con una barrera, lanzar con Promise.all las dos desactivaciones cruzadas, y ejecutar las 200 secuencias con el generador congruencial de semilla fija
- esperado: una desactivación se confirma, la otra lanza UltimoAdministradorError, y la cantidad de administradores activos nunca baja de 1
- test: pendiente

### AC-S23-011
- enlaza: REQ-S23-034, REQ-S23-035, BEH-S23-018, INV-S23-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-rol.mjs con un árbol por cada uno de los diecinueve términos (tres con otro uso de mayúsculas) y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los diecinueve términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S23-012
- enlaza: REQ-S23-036, BEH-S23-019
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue tienePermiso en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-rol.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de las guardas de sesión y de `actualizarUsuarioAdmin`; (2) `tools/verificar-rol.mjs` y sus pruebas, con todos los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) `actualizarUsuarioAdmin` con `UltimoAdministradorError`, transacción con bloqueo de las filas de administradores activos (se relee la cantidad antes de validar) y sin rol del solicitante, con su único llamador (`usuarios/actions.ts`) migrado en el mismo commit; (4) la guarda única `exigirSesion` y la reclasificación de la tabla de rutas de S-01 y de `tools/contrato-permisos.mjs` a tres clases; (5) migrar los casos de uso, rutas, acciones y páginas que consultan permisos o roles, módulo por módulo, cada commit con sus pruebas (miembros, cobros y pagos, planes, entrenadores, en sala, kiosco y vitrina, configuraciones, administradores), quitando en cada uno la dependencia del servicio de autorización de sus firmas; (6) pantalla «Administradores»: alta sin rol ni permisos, cambio de contraseña, desactivar y reactivar, y retiro de `FormularioPermisos`; (7) retirar `EliminarUsuarioAdmin` y el método `eliminar`, `AuthorizationService`, `IAuthorizationService`, `IPermisoRepository` y sus repositorios, `ActualizarPermisosUsuario`, `PERMISOS_POR_ROL`, `puedeEditarKiosko`, `puedeCrearUsuarioConRol`, `exigirPermiso`, `exigirSocio` y `scripts/verificar-autorizacion.ts`; (8) esquema: retirar `UsuarioAdmin.rol` (con la restricción CHECK de S-18), `PermisoUsuario` y los tres enums, y los campos de rol de la entidad y la sesión, achicando las exenciones en el mismo commit; (9) paso del CI.
- Las pruebas de concurrencia y de propiedades usan un generador congruencial lineal de semilla fija escrito en la propia prueba, una base efímera y una barrera que fija el orden en que las transacciones toman el bloqueo; no hay dependencias nuevas (`typescript` ya es una dependencia de desarrollo, S-01).
- AC-S23-006 y AC-S23-012 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador, sin fuente que lo contradiga: no verificado en la nube).

### 5.2 Migración
- No hay datos que migrar (SUP-S23-007): el baseline se genera nuevo (S-00, S-15) y el seed crea el primer administrador.
- **Enmiendas que se registran al aprobar S-23:**
  - ADR-012: §3 (rotación con permiso de socio) y §4 (permiso verificado en el caso de uso) pasan a «sesión válida de un administrador activo» (SUP-S23-011); ADR-016 §3 (test de contrato de permisos) se lee con tres clases de ruta.
  - S-01: REQ-S01-011, REQ-S01-012, REQ-S01-014 y REQ-S01-029 se leen con esta spec; las guardas `exigirPermiso` y `exigirSocio` desaparecen (SUP-S01-009) y `tools/contrato-permisos.mjs` clasifica las rutas en tres clases; AC-S01-019 y SUP-S01-019 quedan cumplidos.
  - S-04: REQ-S04-006 y REQ-S04-040 se leen como «sesión válida».
  - S-05: REQ-S05-030, con su BEH y su AC (un `GERENTE` no puede rotar la clave), se leen como «cualquier administrador autenticado puede rotarla»; SUP-S05-009 y la retirada de `SUCURSALES` quedan cumplidas.
  - S-07: REQ-S07-013 (permiso `PAGOS CREAR`) se lee como «sesión válida».
  - S-08: REQ-S08-009 y REQ-S08-010, con sus BEH y AC de «permisos por defecto» y de «pantalla de permisos», y los permisos `PAGOS VER`, `CREAR` y `ELIMINAR` (REQ-S08-042) se leen como «sesión válida».
  - S-09: REQ-S09-005, REQ-S09-006, REQ-S09-023 y REQ-S09-039 (permiso `MIEMBROS ELIMINAR`) se leen como «sesión válida».
  - S-18: REQ-S18-019, REQ-S18-022, REQ-S18-030 y SUP-S18-005 (permisos `USUARIOS`) se leen como «sesión válida»; la restricción CHECK de REQ-S18-005 se retira con la columna.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 restan `PermisoUsuario` y tres enums (`RolUsuario`, `ModuloPermiso`, `AccionPermiso`); REQ-S22-007 y AC-S22-003 restan el repositorio de permisos y los 22 repositorios pasan a 21.
  - `docs/01-levantamiento-requerimientos.md` (RF-02 y RF-34), `docs/02` (HU-40), `docs/06-modelo-datos-cambios.md`, `docs/00-indice.md`, `docs/datos-iniciales.md` y `COBERTURA-RF.md`: nota de que S-23 dejó un solo rol.
- **Traspasos:** S-15 (el primer administrador y su contraseña inicial) y S-01 (cierre de sesiones al desactivar y límite de intentos).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Sin permisos por módulo, cualquier administrador puede hacer cualquier cosa, incluidas las acciones destructivas; la defensa es la anulación con motivo y autor, `RegistroAuditoria` y que solo el socio y sus socios tengan cuenta. Decisión del propietario (gimnasio pequeño).
- Quitar los permisos toca unos 43 archivos con `tienePermiso` y 48 con `.rol`; el riesgo es una comprobación que sobreviva y bloquee a todos o un acceso que quede sin guarda. Mitigación: el typecheck (REQ-S23-008), el test de contrato de rutas y la herramienta de términos.
- Si más adelante se contrata personal de recepción, habrá que reintroducir los roles con una spec nueva; la reversibilidad es baja.
- Un administrador que olvida su contraseña no tiene a quién pedirle ayuda dentro del sistema (SUP-S23-010): ninguna spec la resuelve hoy (S-17 trata respaldo, observabilidad y despliegue). Mitigación: un procedimiento manual en la base de datos, a definir por el propietario con S-15 o S-17; mientras tanto se recomienda dar de alta un segundo administrador.
- La clave de API del kiosco queda al alcance de cualquier administrador (SUP-S23-005).
- La enmienda a ADR-012 es una decisión de arquitectura que el propietario debe confirmar con la aprobación de S-23.
- Las cifras de 0.4 cambian cuando S-00 a S-10, S-18 y S-22 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Puede haber más de un administrador, todos con los mismos derechos? Default: sí (SUP-S23-002).
- ¿Siempre debe quedar al menos un administrador activo y nadie puede desactivarse a sí mismo? Default: sí (SUP-S23-003).
- ¿Un administrador no se borra, solo se desactiva? Default: sí (SUP-S23-004).
- ¿La pantalla «Usuarios» pasa a llamarse «Administradores»? Default: sí (SUP-S23-006).
- ¿Se enmienda ADR-012 §3 y §4 para decir «sesión válida de un administrador activo»? Default: sí (SUP-S23-011).
- ¿Ningún administrador puede restablecer la contraseña de otro? Default: no se puede (SUP-S23-010).

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de otras specs. El texto anterior se conserva; donde choca, rige esta sección.*
- Por la aprobación de S-15: el seed crea el primer administrador con la contraseña inicial generada o dada por variable de entorno; la recuperación manual de la contraseña (SUP-S23-010) sigue sin dueño y pasa a S-17.
- Por la aprobación de S-17: SUP-S23-010 y 5.3 se cumplen con `admin:restablecer` y `docs/ops/recuperar-acceso.md`.

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura, sin ejecutar `spec-lint`), 2026-11-12, sobre el primer borrador. Su definición trae 7 comprobaciones (subdivididas en 1b y 6b). Veredicto global: **REQUIERE CAMBIOS**. Resumen fiel:

> | # | Comprobación | Veredicto | Hallazgo principal |
> |---|---|---|---|
> | 1 | Cabecera y ADR | CUMPLE | S-23 enmienda S-04 y S-07 y no los listaba en `depende_de` |
> | 1b | Coherencia con ADR | NO CUMPLE | ADR-012 §3 y §4 (permiso en el caso de uso, rotación con permiso de socio) son lo que S-23 elimina y no hay enmienda registrada |
> | 2 | REQ | NO CUMPLE | REQ-001, 002, 003, 009, 010, 011, 015 y 016 agrupan varias obligaciones; REQ-011 («cambiar la contraseña propia») contradice 5.3 («otro administrador puede cambiarla»); REQ-015 prescribe implementación |
> | 3 | Cobertura | CUMPLE | INV-002 declarado `restriccion-bd` sin serlo |
> | 4 | AC | NO CUMPLE | «quince» términos eran 16; AC-002 y AC-005 sin criterio operativo; la herramienta no detecta `.rol` ni los textos «gerente», «Recepción», «permisos»; el generador de AC-006 sin definir |
> | 5 | Hechos | NO CUMPLE | líneas desviadas (`PERMISOS_POR_ROL` 45-76, `UsuarioAdmin` 75-102), 9 archivos con `GERENTE`; faltaban la desactivación actual, `EliminarUsuarioAdmin`, otras comprobaciones de rol y `verificar-autorizacion.ts`; la afirmación sobre S-17 no tenía sustento |
> | 6 | Vaguedad y alcance | CUMPLE | citar `typescript` como dependencia existente |
> | 6b | Enmiendas | NO CUMPLE | REQ-S07-011 era REQ-S07-013; faltaban REQ-S04-006/040, REQ-S08-009/010, REQ-S09-039 y REQ-S05-030 (contradice REQ-S23-009); `exigirSocio` sin retirar; faltaban RF-02, RF-34 y HU-40 |
> | 7 | Escenarios | NO CUMPLE | BEH-008 inalcanzable; sin precedencia entre errores; BEH-010 sin el error del perdedor; faltaban correo duplicado, id inexistente, estados repetidos, contraseñas |

### Conciliación del autor
Los hallazgos se verificaron contra el Repo A y las specs (`ActualizarUsuarioAdmin.ts:23-45`, `PrismaUsuarioAdminRepository.ts:81-86`, `CambiosUsuarioAdmin`, `cambiar-password/`, `exigirSocio` en S-01) y resultaron ciertos; ninguno se rechazó. La spec pasó de 21 REQ a 36, de 13 BEH a 19, de 4 INV a 4 y de 8 AC a 12.

| Fila | Corrección |
|---|---|
| 1 | `depende_de` incluye S-04 y S-07 |
| 1b | SUP-S23-011 y 5.2: enmienda a ADR-012 §3 y §4 (y lectura de ADR-016 §3) al aprobar S-23; pregunta abierta al propietario; los orígenes de los REQ de guarda dejan de citar ADR-012 |
| 2 | REQ divididos uno por obligación; la contraseña propia queda en REQ-022 y la afirmación sobre otro administrador se retira (SUP-S23-010, 0.3 y 5.3); REQ-029 expresa el resultado y no la técnica |
| 3 | INV-002 pasa a `lint` |
| 4 | 19 términos (16 más tres sin distinguir mayúsculas); el typecheck detecta `.rol` (REQ-008, AC-002); AC-006 cuenta las entradas del menú en el código; generador congruencial lineal con semilla fija (INV-001, AC-010) |
| 5 | 0.4 corregido (líneas, 9 `GERENTE`, desactivar hoy, borrar hoy, otras comprobaciones citadas como de la revisión, `verificar-autorizacion.ts`); SUP-S23-009 conserva y extiende `actualizarUsuarioAdmin`; la afirmación sobre S-17 se retira de 5.3 |
| 6b | Enmiendas completas en 5.2 con los IDs correctos; REQ-013 retira `exigirPermiso` y `exigirSocio`; RF-02, RF-34 y HU-40 anotados |
| 7 | BEH-013 (llamada directa con un solicitante inactivo), BEH-014 (precedencia: `AutoDesactivacionError` gana), BEH-016 (el perdedor recibe `UltimoAdministradorError`), BEH-009, BEH-010, BEH-011 y BEH-015 |
