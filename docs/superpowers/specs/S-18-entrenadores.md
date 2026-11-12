---
id: S-18
estado: aprobada
adrs: ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-05, S-06, S-07, S-08, S-09, S-10, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-18 — Entrenadores: personas del gimnasio sin credenciales, asignadas solo al miembro

## 0. Contexto y alcance

### 0.1 Problema
En el código heredado un entrenador es un `UsuarioAdmin` con rol `ENTRENADOR`, un correo inventado (`entrenador-<uuid>@sinacceso.interno`) y una contraseña aleatoria que se descarta, solo para cumplir el esquema. Es una cuenta de acceso que no debería existir: sería un inicio de sesión potencial si un hueco de `activo` o la falta de límite de intentos lo permitiera (hallazgo H-07, P-22). Además cada plan decidía si «incluía entrenador». El propietario decidió que todos los planes incluyen entrenador y que el entrenador se asigna solo al miembro, y que solo inicia sesión el socio o administrador; los cuatro entrenadores (María Aguilera, José Montesino, Joa Bonillo y Jesús Bonillo) son personas del gimnasio (`docs/datos-iniciales.md`). S-07 ya retiró `Plan.incluyeEntrenador`; S-18 crea el registro propio del entrenador, cambia a dónde apunta `Miembro.entrenadorId` y quita a los entrenadores de las cuentas de acceso.

### 0.2 Dentro de alcance
- Tabla `Entrenador` (nombre, teléfono, foto, activo) sin correo ni contraseña, y `Miembro.entrenadorId` apuntando a ella en lugar de a `UsuarioAdmin`.
- Casos de uso `crearEntrenador`, `actualizarEntrenador`, `desactivarEntrenador`, `reactivarEntrenador` y `listarEntrenadores` (sin parámetro de sede), su puerto `IEntrenadorRepository` y su repositorio, que reemplazan al puerto y al repositorio actuales.
- Validación del entrenador al crear y editar un miembro, con transacción y bloqueo de la fila del entrenador.
- Pantalla «Entrenadores» del panel (lista, alta, edición, desactivar y reactivar), el selector opcional de entrenador del formulario del miembro, el nombre del entrenador en la ficha y en la respuesta del check-in, y el selector de nombres del cartel de entrenador de la vitrina.
- Que `crearUsuarioAdmin`, la ruta `api/usuarios` y la pantalla de usuarios rechacen el rol `ENTRENADOR`, una restricción CHECK en `UsuarioAdmin.rol`, y el retiro del correo `@sinacceso.interno` y de la contraseña aleatoria.
- Retiro de la lista de entrenadores que cargan los formularios de cobro y de cambio de plan.
- `tools/verificar-entrenador.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Quitar el enum `RolUsuario`, los roles `GERENTE` y `RECEPCION`, los permisos por módulo, la clave `ENTRENADOR` de la matriz `PERMISOS_POR_ROL`, la rama `ENTRENADOR` de `ActualizarPermisosUsuario` y `RolSinPermisosError`: S-23 (S-18 solo impide crear usuarios con ese rol).
- Los entrenadores sembrados (los cuatro nombres): S-15.
- Los carteles de entrenador de la vitrina (tipo `ENTRENADOR` del ítem de vitrina): S-20; S-18 solo cambia de dónde sale la lista de nombres del formulario.
- El horario, la agenda, las comisiones o la cartera de miembros de un entrenador: no hay requisito.
- Que un entrenador inicie sesión o vea su cartera: no tiene acceso.
- Un registro de auditoría de quién desactivó a un entrenador: no hay requisito.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-18 recibirá después de S-00 a S-10 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica; el alcance de cada `grep` son `apps` y `packages`.
- **Entrenador como usuario:** `enum RolUsuario` incluye `ENTRENADOR` (`schema.prisma:68-73`); `UsuarioAdmin` tiene `rol` (`:84`), `email @unique` (`:85`), `passwordHash` (`:86`) y la relación `miembrosEntrenados` (`:97`); `Miembro.entrenadorId` apunta a `UsuarioAdmin` con la relación `EntrenadorDeMiembro` (`:157-158`) (verificado con `Read`).
- **Cuenta inutilizable:** `usuarios/actions.ts:100-111` genera `entrenador-${randomUUID()}@sinacceso.interno` y una contraseña `randomUUID()` hasheada y descartada cuando el rol es `ENTRENADOR`; `ActualizarPermisosUsuario.ts:37` rechaza dar permisos a un entrenador (con `RolSinPermisosError`, `:18`); `CrearUsuarioAdmin.ts:75` le da una lista vacía en `PERMISOS_POR_ROL`, que es un `Record<RolUsuario, Permiso[]>` (`:48`) y por eso exige la clave mientras exista el valor del enum (verificado con `Read`).
- **Puerta de entrada que acepta cualquier rol:** `api/usuarios/route.ts:44` lee `rol` del cuerpo y solo exige que no esté vacío; `usuarios/page.tsx:34-35` separa «personal» y «entrenadores» filtrando por `rol` (verificado con `Read`).
- **Lectura:** `ListarEntrenadores.ts:5-10` llama a `IEntrenadorRepository.listarPorOrganizacionYSucursal` sin comprobar ningún permiso; `PrismaEntrenadorRepository.ts:8-19` consulta `usuarioAdmin` con `rol: "ENTRENADOR"`, `activo: true` y la sede, ordenado por `nombre asc`; `EntrenadorResumen` tiene `id` y `nombre`; `PrismaMemberRepository.ts:15-16,39-40` resuelve `entrenadorNombre` (con `include: { entrenador: true }` en `:59,70,80,91,107`); el check-in lo devuelve como `entrenador` (`api/checkin/route.ts:47`) (verificado con `Read`; los `include` por cita de la revisión).
- **Quién usa el puerto:** `listarEntrenadores` o `PrismaEntrenadorRepository` aparecen en `caja/page.tsx`, `miembros/obtenerEntrenadoresPorSucursal.ts` (que usan `miembros/nuevo/page.tsx` y `miembros/[id]/page.tsx`), `vitrina/[tipo]/nuevo/page.tsx:20` y el propio caso de uso (verificado con `grep -rln`). `caja/page.tsx` y `ModalRegistrarPagoCaja.tsx:35,166,184,254` pasan `entrenadores` y `EntrenadorParaCambio` al formulario de cambio de plan (verificado con `grep -n`); S-07 prohíbe que el cambio de plan reciba `entrenadorId` (AC-S07-011), de modo que esos datos quedan sin uso.
- **Vitrina, kiosco y scripts (citas de la revisión, no re-verificadas):** `FormularioVitrinaItem.tsx:31-39,90-92` copia el nombre de un entrenador de la lista; `apps/kiosk/components/AccessCard.tsx:160-163` y `apps/kiosk/lib/api.ts:9` consumen `entrenador`; los scripts de `packages/db` (`sembrarOrganizacionZipGym.ts`, `quitarPermisosEntrenadores.ts`, `clonarSedePrincipalAZipGym.ts`, `sembrarMiembrosPrueba.ts`, `backfillPermisosYSucursales.ts`, `prisma/seed.ts`, `clonarZipGym/correoEspejo.ts`) crean `rol: "ENTRENADOR"` o usan `@sinacceso.interno`; S-00 los excluye al importar.
- **Miembros:** ni `CrearMiembro.ts` ni `ActualizarMiembro.ts` validan hoy el entrenador (`grep -in entrenador` sin resultados en ambos): se acepta cualquier cadena y solo la clave foránea la rechaza; `FormularioMiembro.tsx:92,112,176` usa `entrenadoresPorSucursal` y `entrenadorId` y envía el `entrenadorId` también al editar (`:767`, cita de la revisión); `:204` muestra «(entrenador actual)» si el entrenador no está en la lista; S-07 lo hizo opcional e independiente del plan (REQ-S07-041).
- **Foto:** `guardarFoto` está repetida en `usuarios/actions.ts:77-85`, `miembros/actions.ts:95` y `productos/actions.ts:40-48`; sube a R2 con la extensión del nombre del archivo, sin validar tipo ni tamaño, y en `miembros/actions.ts:147` sube antes de validar el resto (citas de la revisión salvo `productos/actions.ts`, verificado con `Read`).
- **Alcance en código:** 20 archivos mencionan `ENTRENADOR`, de los cuales unos 10 son el tipo de ítem de la vitrina (`Vitrina.ts:1`, `vitrinaItem.ts:23`, `secuenciaVitrina.ts`, `FormularioVitrinaItem.tsx`, `SelectorMedio.tsx`, `slugs.ts` y dos pruebas) y unos 10 el rol de usuario; 14 archivos mencionan `entrenadorId`, 6 `listarEntrenadores`, `ListarEntrenadores` o `EntrenadorParaCambio` y 18 `RolUsuario` (verificado con `grep -rIlE` en `apps` y `packages`; con `docs/` y `handoff.md` los conteos serían 38, 23, 7 y 31).
- **Datos iniciales:** son cuatro entrenadores y la asignación al miembro es opcional (`docs/datos-iniciales.md`, asumido, por validar) (verificado con `Read`).
- **Interacción con specs aprobadas:** S-01 limita el login pero no impide que una cuenta de entrenador sea un candidato (H-07) y su AC-S01-019 crea un usuario de cada rol, incluido `ENTRENADOR`; S-05 quita las sedes y `UsuarioSucursal` (que usa la consulta actual del repositorio) pero no nombra `ListarEntrenadores` ni `IEntrenadorRepository` (0 apariciones, verificado con `grep`); S-06 no toca entrenadores; S-07 deja a S-18 el entrenador como persona y dice que `Miembro.entrenadorId` queda como está; S-22 cuenta `PrismaEntrenadorRepository` entre sus 22 repositorios (`S-22` §0.4) (verificado con `grep -n` en las specs).
- No verificado: que ningún reporte o pantalla del heredado use `miembrosEntrenados`, y el contenido de los 20 archivos más allá de lo citado.

### 0.5 Supuestos
- SUP-S18-001: el entrenador es una persona del gimnasio con nombre, teléfono opcional, foto opcional y estado activo, sin correo, contraseña, rol ni permisos; no es un `UsuarioAdmin`. Default: ese modelo; supuesto derivado de `docs/datos-iniciales.md` (interpretación, no decisión escrita del propietario); asumido, por validar.
- SUP-S18-002: la asignación de entrenador al miembro es opcional; un miembro sin entrenador es válido. Todos los planes incluyen entrenador (decisión del propietario) sin que el sistema lo exija. Default: opcional; asumido, por validar.
- SUP-S18-003: un entrenador no se borra; se desactiva. Un entrenador inactivo no aparece en el selector, pero sigue visible, con su estado, en la ficha de los miembros que ya lo tienen asignado, y esos miembros pueden editarse sin cambiarlo. Default: desactivar sin borrar ni desasignar; asumido, por validar.
- SUP-S18-004: el nombre del entrenador es obligatorio, se recorta y tiene entre 2 y 80 caracteres; no se exige que sea único. Default: ese criterio; asumido, por validar.
- SUP-S18-005: gestionar entrenadores exige `USUARIOS CREAR` (crear) y `USUARIOS EDITAR` (editar, desactivar y reactivar), y abrir la pantalla «Entrenadores» exige `USUARIOS VER`, mientras existan permisos por módulo; `listarEntrenadores` no exige permiso propio porque lo usan los formularios de miembro (quien tiene `MIEMBROS`), de vitrina y la pantalla; S-23 lo reemplaza por el acceso total del socio. Default: esos permisos; asumido, por validar.
- SUP-S18-006: no hay datos que migrar: el baseline se genera nuevo (S-00, S-15) y los entrenadores se cargan en el seed o desde la pantalla. Default: sin migración; asumido, por validar.
- SUP-S18-007: la foto del entrenador admite JPG, PNG o WebP de hasta 2 MB, se valida antes de subirla al almacenamiento de fotos existente y no se borra al desactivar. Default: ese tratamiento; asumido, por validar.
- SUP-S18-008: el identificador del entrenador es un `cuid` generado por la base, como el de las demás tablas, y la lista se ordena por nombre ascendente. Default: ese identificador y ese orden; asumido, por validar.
- SUP-S18-009: el teléfono es opcional, de hasta 20 caracteres con dígitos, espacios, `+`, `-` y paréntesis. Default: ese formato; asumido, por validar.
- SUP-S18-010: desactivar a un entrenador ya inactivo o reactivar a uno ya activo no es un error: el resultado queda igual y no escribe. Default: operación idempotente; asumido, por validar.
- SUP-S18-011: la sección «Entrenadores» de la pantalla de usuarios desaparece, porque los entrenadores dejan de ser usuarios. Default: se retira; asumido, por validar.
- SUP-S18-012: el cambio de destino de `Miembro.entrenadorId` se hace en un solo commit que migra a la vez la clave foránea y los 14 archivos que la usan, sin una segunda columna temporal, porque no hay datos que conservar y una segunda columna del mismo tipo no la detectaría el typecheck. Default: cambio atómico; asumido, por validar.

## 1. Requisitos

### REQ-S18-001
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: El esquema deberá tener la tabla Entrenador con identificador, nombre obligatorio, teléfono opcional, foto opcional y estado activo con valor por defecto verdadero.

### REQ-S18-002
- tipo: ubicuo
- prioridad: MUST
- origen: H-07
- texto: La tabla Entrenador no deberá tener columnas de correo, contraseña, rol ni permisos.

### REQ-S18-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: La columna Miembro.entrenadorId deberá apuntar a Entrenador, ser opcional y no tener borrado en cascada.

### REQ-S18-004
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: La tabla UsuarioAdmin no deberá tener la relación miembrosEntrenados.

### REQ-S18-005
- tipo: ubicuo
- prioridad: MUST
- origen: H-07
- texto: La columna UsuarioAdmin.rol deberá tener una restricción CHECK que rechace el valor ENTRENADOR hasta que S-23 retire el enum.

### REQ-S18-006
- tipo: si-entonces
- prioridad: MUST
- origen: H-07
- texto: Si crearUsuarioAdmin recibe el rol ENTRENADOR entonces deberá rechazar la creación con un error sin escribir nada.

### REQ-S18-007
- tipo: si-entonces
- prioridad: MUST
- origen: H-07
- texto: Si la ruta api/usuarios o la acción de crear usuarios reciben el rol ENTRENADOR entonces deberán rechazar la petición con un error de validación sin escribir nada.

### REQ-S18-008
- tipo: ubicuo
- prioridad: MUST
- origen: H-07
- texto: Ningún código del sistema deberá generar correos con el dominio sinacceso.interno.

### REQ-S18-009
- tipo: ubicuo
- prioridad: MUST
- origen: H-07
- texto: La acción y la ruta de crear usuarios no deberán crear un UsuarioAdmin con un correo o una contraseña que no hayan recibido de la persona.

### REQ-S18-010
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-011
- texto: La pantalla de usuarios no deberá ofrecer el rol ENTRENADOR ni mostrar una sección de entrenadores.

### REQ-S18-011
- tipo: cuando
- prioridad: MUST
- origen: SUP-S18-004
- texto: Cuando se crea un entrenador con datos válidos, crearEntrenador deberá guardarlo activo y devolverlo.

### REQ-S18-012
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-004
- texto: Si el nombre del entrenador recortado tiene menos de 2 o más de 80 caracteres entonces crearEntrenador y actualizarEntrenador deberán rechazarlo con un error de validación sin escribir nada.

### REQ-S18-013
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-009
- texto: Si el teléfono no queda vacío y tiene más de 20 caracteres o caracteres distintos de dígitos, espacios, más, guion y paréntesis entonces crearEntrenador y actualizarEntrenador deberán rechazarlo con TelefonoInvalidoError sin escribir nada.

### REQ-S18-014
- tipo: cuando
- prioridad: MUST
- origen: SUP-S18-003
- texto: Cuando se desactiva un entrenador, desactivarEntrenador deberá dejarlo inactivo sin modificar los miembros que lo tienen asignado.

### REQ-S18-015
- tipo: cuando
- prioridad: MUST
- origen: SUP-S18-003
- texto: Cuando se reactiva un entrenador inactivo, reactivarEntrenador deberá dejarlo activo.

### REQ-S18-016
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-010
- texto: Desactivar a un entrenador inactivo o reactivar a uno activo no deberá producir error ni escribir.

### REQ-S18-017
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-003
- texto: Si el entrenador no existe entonces actualizarEntrenador, desactivarEntrenador y reactivarEntrenador deberán rechazar la operación con EntrenadorNoEncontradoError sin escribir nada.

### REQ-S18-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-003
- texto: El sistema no deberá borrar entrenadores.

### REQ-S18-019
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-005
- texto: Si el usuario no tiene el permiso USUARIOS CREAR para crear o USUARIOS EDITAR para editar, desactivar o reactivar entonces los casos de uso de entrenadores deberán rechazar la operación sin leer ni escribir datos.

### REQ-S18-020
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-008
- texto: La función listarEntrenadores, sin parámetro de sede, deberá devolver los entrenadores activos ordenados por nombre ascendente.

### REQ-S18-021
- tipo: cuando
- prioridad: MUST
- origen: SUP-S18-003
- texto: Cuando listarEntrenadores recibe incluirInactivos verdadero, deberá devolver también los entrenadores inactivos con su estado.

### REQ-S18-022
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-005
- texto: La función listarEntrenadores no deberá exigir el permiso USUARIOS.

### REQ-S18-023
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-002
- texto: Crear o editar un miembro sin entrenador deberá ser válido.

### REQ-S18-024
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-003
- texto: Si crearMiembro o actualizarMiembro reciben un entrenador distinto del actual que no existe o está inactivo entonces deberán rechazar la operación con EntrenadorNoDisponibleError sin escribir nada.

### REQ-S18-025
- tipo: cuando
- prioridad: MUST
- origen: SUP-S18-003
- texto: Cuando actualizarMiembro recibe el mismo entrenador que el miembro ya tiene, aunque esté inactivo, deberá aceptarlo sin error.

### REQ-S18-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Al asignar un entrenador a un miembro, crearMiembro y actualizarMiembro deberán validar y escribir dentro de una transacción que bloquea la fila del entrenador en modo compartido.

### REQ-S18-039
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: desactivarEntrenador deberá tomar el bloqueo exclusivo de la fila del entrenador dentro de su transacción.

### REQ-S18-027
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: La ficha del miembro deberá mostrar el nombre del entrenador asignado leído de la tabla Entrenador, con la marca «inactivo» si lo está.

### REQ-S18-028
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: La respuesta del check-in deberá incluir solo el nombre del entrenador asignado, sin su identificador ni su teléfono.

### REQ-S18-029
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: El panel deberá tener la pantalla «Entrenadores» con lista, alta, edición, desactivación y reactivación.

### REQ-S18-030
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-005
- texto: Si el usuario no tiene el permiso USUARIOS VER entonces la pantalla «Entrenadores» deberá rechazar la visita sin mostrar datos.

### REQ-S18-031
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-002
- texto: El formulario del miembro deberá ofrecer un selector opcional con los entrenadores activos.

### REQ-S18-032
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-003
- texto: El selector del formulario del miembro deberá mostrar al entrenador actual aunque esté inactivo, con la marca «inactivo».

### REQ-S18-033
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: El formulario de cartel de entrenador de la vitrina deberá obtener sus nombres de listarEntrenadores.

### REQ-S18-034
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: Los formularios de cobro y de cambio de plan no deberán recibir ni cargar la lista de entrenadores.

### REQ-S18-035
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-007
- texto: Si la foto de un entrenador no es JPG, PNG o WebP o pesa más de 2 MB entonces la acción de guardarla deberá rechazarla antes de subir ningún archivo y sin escribir nada.

### REQ-S18-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos sinacceso.interno, miembrosEntrenados, EntrenadorDeMiembro, EntrenadorParaCambio, obtenerEntrenadoresPorSucursal, listarPorOrganizacionYSucursal, rol === "ENTRENADOR", rol !== "ENTRENADOR" ni rol: "ENTRENADOR".

### REQ-S18-037
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-entrenador.mjs encuentra alguno de los términos de REQ-S18-036, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S18-038
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-entrenador.mjs en cada pull request.

## 2. Comportamiento

### BEH-S18-001
- cubre: REQ-S18-001, REQ-S18-002, REQ-S18-003, REQ-S18-004, REQ-S18-005
- categoria: feliz
- dado: una base con el esquema final
- cuando: se consultan las columnas de Entrenador, Miembro y UsuarioAdmin y se intenta insertar un UsuarioAdmin con rol ENTRENADOR
- entonces: Entrenador tiene identificador, nombre, teléfono, foto y activo (verdadero por defecto) y ninguna columna de correo, contraseña, rol ni permisos; Miembro.entrenadorId apunta a Entrenador, es opcional y sin cascada; UsuarioAdmin no tiene miembrosEntrenados y la inserción con rol ENTRENADOR falla por la restricción CHECK

### BEH-S18-002
- cubre: REQ-S18-006, REQ-S18-007, REQ-S18-008, REQ-S18-009
- categoria: error
- dado: un socio que usa el formulario de usuarios, la ruta api/usuarios y crearUsuarioAdmin
- cuando: envía el rol ENTRENADOR por cada vía, y envía un alta sin contraseña
- entonces: las tres vías rechazan el rol ENTRENADOR sin escribir, el alta sin contraseña se rechaza sin crear el usuario y no se genera ningún correo @sinacceso.interno

### BEH-S18-003
- cubre: REQ-S18-010
- categoria: feliz
- dado: un socio
- cuando: abre la pantalla de usuarios y el formulario de alta de usuario
- entonces: el formulario no ofrece el rol ENTRENADOR y la pantalla no muestra una sección de entrenadores

### BEH-S18-004
- cubre: REQ-S18-011, REQ-S18-023
- categoria: feliz
- dado: un socio
- cuando: crea al entrenador «María Aguilera» con teléfono «+51 987 654 321» y sin foto, y luego crea un miembro sin entrenador
- entonces: el entrenador queda activo con un identificador generado, el miembro se crea sin entrenador y ambos aparecen en sus listas

### BEH-S18-005
- cubre: REQ-S18-012
- categoria: borde
- dado: nombres de entrenador de 1 carácter, de solo espacios, de 2, de 80 y de 81 caracteres
- cuando: se ejecuta crearEntrenador y actualizarEntrenador con cada uno
- entonces: se rechazan los de 1, solo espacios y 81 caracteres con un error de validación sin escribir, y se aceptan los de 2 y 80 recortados

### BEH-S18-006
- cubre: REQ-S18-013
- categoria: borde
- dado: teléfonos vacío, «987654321», de 20 caracteres, de 21 caracteres y «98x-654»
- cuando: se ejecuta crearEntrenador con cada uno
- entonces: se aceptan el vacío (queda sin teléfono), el de 9 dígitos y el de 20 caracteres; se rechazan el de 21 caracteres y el de «98x-654» con TelefonoInvalidoError sin escribir

### BEH-S18-007
- cubre: REQ-S18-014, REQ-S18-025, REQ-S18-027
- categoria: feliz
- dado: el entrenador «José Montesino» asignado a 5 miembros
- cuando: el socio lo desactiva, edita el nombre de uno de esos miembros sin cambiar el entrenador y abre su ficha
- entonces: los 5 miembros siguen asignados, la edición no da error y la ficha muestra «José Montesino (inactivo)»

### BEH-S18-008
- cubre: REQ-S18-015, REQ-S18-016
- categoria: borde
- dado: un entrenador inactivo y uno activo
- cuando: se reactiva al inactivo, se reactiva al activo y se desactiva dos veces seguidas al mismo
- entonces: el inactivo queda activo; las operaciones repetidas terminan sin error y sin escribir una segunda vez

### BEH-S18-009
- cubre: REQ-S18-017
- categoria: error
- dado: un identificador de entrenador inexistente
- cuando: se ejecuta actualizarEntrenador, desactivarEntrenador y reactivarEntrenador con él
- entonces: las tres lanzan EntrenadorNoEncontradoError sin escribir nada

### BEH-S18-010
- cubre: REQ-S18-018
- categoria: feliz
- dado: el árbol final
- cuando: se buscan casos de uso, rutas, acciones y botones que borren un entrenador
- entonces: no existe ninguno

### BEH-S18-011
- cubre: REQ-S18-019, REQ-S18-022
- categoria: error
- dado: un usuario con USUARIOS VER pero sin USUARIOS CREAR ni USUARIOS EDITAR, y otro sin ningún permiso USUARIOS pero con MIEMBROS EDITAR
- cuando: el primero intenta crear, editar, desactivar y reactivar entrenadores y el segundo llama a listarEntrenadores
- entonces: las cuatro operaciones del primero se rechazan sin leer ni escribir datos y la lista del segundo se devuelve

### BEH-S18-012
- cubre: REQ-S18-020, REQ-S18-021, REQ-S18-031, REQ-S18-032
- categoria: feliz
- dado: dos entrenadores activos «Ana» y «Beto» y uno inactivo «Carlos»
- cuando: se llama a listarEntrenadores sin y con incluirInactivos y se abre el selector de un miembro sin entrenador y de otro asignado a «Carlos»
- entonces: sin incluir inactivos devuelve «Ana» y «Beto» en ese orden y con ellos los tres; el primer selector ofrece los 2 activos y una opción vacía; el segundo muestra «Carlos (inactivo)» como entrenador actual

### BEH-S18-013
- cubre: REQ-S18-024
- categoria: error
- dado: un entrenador inexistente, uno inactivo y un miembro asignado a otro entrenador
- cuando: se crea un miembro asignándolos y se edita el miembro cambiándolo a cada uno
- entonces: las cuatro operaciones lanzan EntrenadorNoDisponibleError sin escribir nada

### BEH-S18-014
- cubre: REQ-S18-026, REQ-S18-039
- categoria: concurrencia
- dado: un entrenador activo, una desactivación y la asignación de ese entrenador a un miembro nuevo simultáneas, con una barrera que fija quién toma primero el bloqueo
- cuando: terminan las dos transacciones, en cada orden
- entonces: si la asignación toma el bloqueo primero se confirma y el miembro queda asignado a un entrenador que luego queda inactivo, sin error; si la desactivación lo toma primero, la asignación lanza EntrenadorNoDisponibleError y no escribe; en ningún orden queda un miembro con un entrenador inexistente

### BEH-S18-015
- cubre: REQ-S18-028
- categoria: feliz
- dado: un miembro con entrenador «Joa Bonillo» vigente
- cuando: el kiosco registra su check-in
- entonces: la respuesta trae el entrenador «Joa Bonillo» y no trae su identificador interno ni su teléfono

### BEH-S18-016
- cubre: REQ-S18-029, REQ-S18-030
- categoria: feliz
- dado: el panel con un socio con USUARIOS VER, CREAR y EDITAR, y otro usuario sin USUARIOS VER
- cuando: el socio abre la pantalla «Entrenadores» y el otro intenta abrirla
- entonces: el socio ve la lista con sus estados, puede dar de alta, editar, desactivar y reactivar y no ve opción de borrar; el otro es rechazado sin ver datos

### BEH-S18-017
- cubre: REQ-S18-033, REQ-S18-034
- categoria: feliz
- dado: el formulario de cartel de entrenador de la vitrina, el formulario de cobro y el de cambio de plan
- cuando: se abren
- entonces: el de vitrina ofrece los nombres de los entrenadores activos y los otros dos no cargan ni reciben ninguna lista de entrenadores

### BEH-S18-018
- cubre: REQ-S18-035
- categoria: error
- dado: un PDF, un JPG de 3 MB y un PNG de 1 MB
- cuando: se intenta guardar cada uno como foto de un entrenador
- entonces: el PDF y el JPG de 3 MB se rechazan sin subir nada ni escribir, y el PNG se acepta

### BEH-S18-019
- cubre: REQ-S18-036, REQ-S18-037
- categoria: error
- dado: un archivo por cada uno de los nueve términos de REQ-S18-036
- cuando: se ejecuta tools/verificar-entrenador.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S18-020
- cubre: REQ-S18-038
- categoria: error
- dado: un pull request que agrega sinacceso.interno en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-entrenador.mjs falla y queda en rojo

## 3. Invariantes

### INV-S18-001
- propiedad: todo miembro con entrenador apunta a un entrenador que existe en la tabla Entrenador
- mecanismo: restriccion-bd
- deteccion: clave foránea de Miembro.entrenadorId a Entrenador sin cascada; una asignación a un identificador inexistente falla
- protege: REQ-S18-003, REQ-S18-024

### INV-S18-002
- propiedad: ninguna persona del gimnasio sin acceso tiene credenciales de inicio de sesión
- mecanismo: restriccion-bd
- deteccion: la tabla Entrenador no tiene columnas de acceso y la restricción CHECK de UsuarioAdmin.rol rechaza ENTRENADOR; una inserción con ese rol falla
- protege: REQ-S18-002, REQ-S18-005, REQ-S18-006, REQ-S18-007

### INV-S18-003
- propiedad: una asignación nueva solo se confirma si el entrenador está activo en el momento de confirmar
- mecanismo: transaccion
- deteccion: prueba de dos transacciones con una barrera que fija quién toma primero el bloqueo, repetida en cada orden sobre 20 casos con semilla fija; ninguna asignación confirmada después de una desactivación confirmada
- protege: REQ-S18-024, REQ-S18-026, REQ-S18-039

### INV-S18-004
- propiedad: los términos retirados no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-entrenador.mjs termina con código distinto de cero y lista archivo:línea y término de cada coincidencia
- protege: REQ-S18-008, REQ-S18-034, REQ-S18-036, REQ-S18-037

## 4. Criterios de aceptación

### AC-S18-001
- enlaza: REQ-S18-001, REQ-S18-002, REQ-S18-003, REQ-S18-004, REQ-S18-005, BEH-S18-001, INV-S18-001, INV-S18-002
- metodo: sql
- procedimiento: consultar las columnas de Entrenador, Miembro y UsuarioAdmin en la base creada con el esquema final, asignar un entrenador inexistente a un miembro e intentar insertar un UsuarioAdmin con rol ENTRENADOR
- esperado: las columnas son las de BEH-S18-001, la asignación a un identificador inexistente falla y la inserción con rol ENTRENADOR falla por la restricción CHECK
- test: pendiente

### AC-S18-002
- enlaza: REQ-S18-006, REQ-S18-007, REQ-S18-008, REQ-S18-009, BEH-S18-002
- metodo: integracion
- procedimiento: llamar a crearUsuarioAdmin, a la acción de crear usuarios y a la ruta api/usuarios con el rol ENTRENADOR y con un alta sin contraseña, contando las filas escritas
- esperado: las tres vías rechazan el rol ENTRENADOR y el alta sin contraseña con 0 filas escritas, y ningún correo del dominio sinacceso.interno se genera
- test: pendiente

### AC-S18-003
- enlaza: REQ-S18-010, BEH-S18-003
- metodo: manual
- procedimiento: como socio, abrir la pantalla de usuarios y el formulario de alta de usuario y leer las opciones de rol y las secciones
- esperado: el formulario no ofrece ENTRENADOR y la pantalla no tiene sección de entrenadores
- test: pendiente

### AC-S18-004
- enlaza: REQ-S18-011, REQ-S18-012, REQ-S18-013, REQ-S18-014, REQ-S18-015, REQ-S18-016, REQ-S18-017, REQ-S18-018, REQ-S18-023, BEH-S18-004, BEH-S18-005, BEH-S18-006, BEH-S18-007, BEH-S18-008, BEH-S18-009, BEH-S18-010
- metodo: integracion
- procedimiento: ejecutar los casos de uso de entrenadores contra una base efímera con los datos de esos comportamientos y, con la API de typescript, buscar en apps y packages las funciones exportadas cuyo nombre empiece por eliminar o borrar y los usos de delete sobre la tabla Entrenador
- esperado: los estados, los miembros asignados, los errores de validación, las operaciones repetidas y los identificadores inexistentes coinciden con los comportamientos, y la búsqueda no encuentra ninguna operación que borre entrenadores
- test: pendiente

### AC-S18-005
- enlaza: REQ-S18-019, REQ-S18-022, BEH-S18-011
- metodo: integracion
- procedimiento: llamar a cada caso de uso de gestión con un usuario con solo USUARIOS VER contando las filas leídas y escritas, y a listarEntrenadores con un usuario sin permisos USUARIOS
- esperado: las cuatro operaciones se rechazan con 0 lecturas y 0 escrituras y la lista se devuelve
- test: pendiente

### AC-S18-006
- enlaza: REQ-S18-020, REQ-S18-021, REQ-S18-024, REQ-S18-025, REQ-S18-027, REQ-S18-028, BEH-S18-012, BEH-S18-013, BEH-S18-015
- metodo: integracion
- procedimiento: llamar a listarEntrenadores sin y con inactivos, crear y editar miembros con entrenadores válidos, inexistentes, inactivos y el mismo ya asignado, leer los datos de la ficha y registrar un check-in de un miembro con entrenador
- esperado: las listas, el orden, los errores, el nombre con su estado en la ficha y el nombre sin identificador ni teléfono en el check-in coinciden con los comportamientos
- test: pendiente

### AC-S18-007
- enlaza: REQ-S18-029, REQ-S18-030, REQ-S18-031, REQ-S18-032, REQ-S18-033, BEH-S18-012, BEH-S18-016, BEH-S18-017
- metodo: manual
- procedimiento: como socio, abrir la pantalla «Entrenadores», dar de alta, editar, desactivar y reactivar a un entrenador, abrir el formulario de un miembro y el de un cartel de entrenador de la vitrina, y abrir la pantalla con un usuario sin USUARIOS VER
- esperado: todas las acciones funcionan, no hay opción de borrar, los selectores muestran lo de BEH-S18-012 y BEH-S18-017, y el usuario sin permiso es rechazado
- test: pendiente

### AC-S18-008
- enlaza: REQ-S18-026, REQ-S18-039, BEH-S18-014, INV-S18-003
- metodo: integracion
- procedimiento: con una barrera que fija qué transacción toma el bloqueo primero, lanzar con Promise.all una desactivación y la asignación del entrenador a un miembro nuevo, en cada orden y sobre 20 casos con semilla fija
- esperado: el resultado es el de BEH-S18-014 en cada orden y nunca queda un miembro con un entrenador inexistente
- test: pendiente

### AC-S18-009
- enlaza: REQ-S18-035, BEH-S18-018
- metodo: integracion
- procedimiento: llamar a la acción de guardar la foto con un PDF, un JPG de 3 MB y un PNG de 1 MB con un almacenamiento simulado que cuenta las subidas
- esperado: el PDF y el JPG se rechazan con 0 subidas y 0 escrituras y el PNG se sube una vez
- test: pendiente

### AC-S18-010
- enlaza: REQ-S18-034, REQ-S18-036, REQ-S18-037, BEH-S18-017, BEH-S18-019, INV-S18-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-entrenador.mjs con un árbol por cada uno de los nueve términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los nueve términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S18-011
- enlaza: REQ-S18-038, BEH-S18-020
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue sinacceso.interno en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-entrenador.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de la asignación de entrenador al miembro, de la ficha, del check-in y del selector del formulario; (2) `tools/verificar-entrenador.mjs` y sus pruebas, con todos los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) esquema aditivo: tabla `Entrenador`; (4) puerto y repositorio nuevos de la tabla `Entrenador` junto al repositorio viejo (que sigue sirviendo a los lectores), con la suite de contrato que ya existe para el repositorio de entrenadores (S-22) ampliada, y los casos de uso `crearEntrenador`, `actualizarEntrenador`, `desactivarEntrenador`, `reactivarEntrenador` y `listarEntrenadores` con sus pruebas; (5) **cambio atómico** de `Miembro.entrenadorId` hacia `Entrenador`, con `crearMiembro` y `actualizarMiembro` validando y bloqueando dentro de la transacción, la ficha, `registrarCheckIn`, el formulario del miembro con su selector, el selector de la vitrina y el retiro de la lista de entrenadores de los formularios de cobro y de cambio de plan, en un solo commit con las pruebas del paso 1 adaptadas (SUP-S18-012); (6) pantalla «Entrenadores», su entrada de menú y la validación de la foto; (7) rechazo del rol `ENTRENADOR` en `crearUsuarioAdmin`, `api/usuarios` y la pantalla de usuarios (con una constante `ROL_SIN_ACCESO` en lugar de comparar con el literal), retiro del correo interno y de la contraseña descartada, y de la sección de entrenadores de la pantalla de usuarios; la clave `ENTRENADOR` de la matriz de permisos y la rama de `ActualizarPermisosUsuario` se conservan hasta S-23; (8) restricción CHECK de `UsuarioAdmin.rol`, retiro de la relación `miembrosEntrenados`, del repositorio viejo y de los términos retirados, achicando las exenciones en el mismo commit; (9) paso del CI.
- Las pruebas de concurrencia usan semillas fijas, una base efímera y una barrera que fija el orden en que las transacciones toman el bloqueo; no hay dependencias nuevas.
- Los criterios AC-S18-003, AC-S18-007 y AC-S18-011 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar (SUP-S18-006): el baseline se genera nuevo (S-00, S-15) y los cuatro entrenadores se cargan en el seed (S-15) o desde la pantalla.
- **Enmiendas que se registran al aprobar S-18:**
  - S-07: la nota de 0.3 («`Miembro.entrenadorId` queda como está») cambia de destino de la clave (de `UsuarioAdmin` a `Entrenador`); REQ-S07-041 (entrenador opcional e independiente del plan) se aplica sobre `Entrenador`.
  - S-01: AC-S01-019 deja de crear un usuario de rol `ENTRENADOR`; REQ-S01-029, REQ-S01-031 y la tabla de contrato de permisos agregan los casos de uso y las acciones de entrenadores (`USUARIOS CREAR`, `USUARIOS EDITAR` y `USUARIOS VER`) a las listas cerradas; H-07 queda cerrado para los entrenadores.
  - S-05: no hay nada que enmendar; S-18 reemplaza `ListarEntrenadores` y `IEntrenadorRepository` con su filtro de sede (S-05 no los nombra).
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 suman una tabla (`Entrenador`); el repositorio de entrenadores ya está entre los 22 (REQ-S22-007 y AC-S22-003 no cambian de cuenta): solo cambia su implementación y el contenido de su suite de contrato; `UsuarioAdmin` pierde la relación `miembrosEntrenados`.
  - S-08: `cobros/` deja de cargar la lista de entrenadores (REQ-S18-034).
  - `docs/06-modelo-datos-cambios.md` (fila de `Entrenador`), `docs/datos-iniciales.md`, `COBERTURA-RF.md` (P-22) y `BACKLOG-SPECS.md` (dependencias de S-18): nota de que S-18 creó el registro de entrenadores.
- **Traspasos:** S-15 (los cuatro entrenadores sembrados), S-20 (carteles de entrenador de la vitrina, que usan `listarEntrenadores`) y S-23 (retira el permiso `USUARIOS` de entrenadores, el valor `ENTRENADOR` del enum, su clave en `PERMISOS_POR_ROL`, la rama de `ActualizarPermisosUsuario` y `RolSinPermisosError`; su 0.4 debe separar los 10 archivos del tipo de ítem de vitrina de los 10 del rol).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Mientras S-23 no esté implementada sigue existiendo el valor `ENTRENADOR` en el enum de roles; S-18 solo impide crear usuarios con él. Mitigación: la restricción CHECK, REQ-S18-006 y REQ-S18-007, y la herramienta de términos.
- El paso 5 cambia en un solo commit la clave foránea y 14 archivos; como `UsuarioAdmin.id` y `Entrenador.id` son ambos cadenas, el typecheck no detecta un lector que siga suponiendo que el entrenador es un usuario. Mitigación: las pruebas de caracterización del paso 1 adaptadas, la herramienta de términos y que el paso es un único commit revertible.
- Un entrenador desactivado sigue asignado a sus miembros: el personal puede olvidar reasignarlos. Mitigación: la ficha y el selector lo muestran con la marca «inactivo».
- El nombre del entrenador no es único: dos personas con el mismo nombre se distinguen solo por el teléfono. Mitigación: es poco probable en un solo local (SUP-S18-004).
- Ninguna validación de la foto existe hoy y la subida ocurre antes de validar el resto en el alta de miembros; si se rechaza la operación, la foto queda huérfana en el almacenamiento. Mitigación: REQ-S18-035 la valida antes de subirla para el entrenador; la del miembro queda fuera de alcance.
- Mientras existan permisos por módulo, quien tiene `MIEMBROS` pero no `USUARIOS` (el rol `RECEPCION`) no puede gestionar entrenadores pero sí ver el selector (SUP-S18-005). Mitigación: S-23 elimina la distinción.
- Ninguna desactivación deja rastro de auditoría. Mitigación: fuera de alcance (0.3).
- S-05 no nombra el repositorio de entrenadores, pero retira `UsuarioSucursal` de la que depende su consulta actual. Mitigación: no verificado qué hace S-05 con ese archivo; el orden entre S-05 y S-18 se fija en G6.
- Las cifras de 0.4 cambian cuando S-00 a S-10 y S-22 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Gestionar entrenadores exige USUARIOS CREAR y EDITAR, ver la pantalla USUARIOS VER y el selector del miembro queda sin permiso propio? Default: sí (SUP-S18-005).
- ¿Las listas de entrenadores se ordenan por nombre ascendente? Default: sí (SUP-S18-008).
- ¿La foto del entrenador admite JPG, PNG o WebP de hasta 2 MB? Default: sí (SUP-S18-007).
- ¿Desactivar a un inactivo o reactivar a un activo no es un error? Default: no es un error (SUP-S18-010).

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de otras specs. El texto anterior se conserva; donde choca, rige esta sección.*
- Por la aprobación de S-23: REQ-S18-019, REQ-S18-022, REQ-S18-030 y SUP-S18-005 (permisos `USUARIOS`) se leen como «sesión válida de un administrador activo»; la restricción CHECK de REQ-S18-005 se retira junto con la columna `UsuarioAdmin.rol`.

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura, sin ejecutar `spec-lint`), 2026-11-12, sobre el primer borrador. Veredicto global del revisor: **REQUIERE CAMBIOS**. Resumen fiel de sus 12 filas:

> | # | Comprobación | Veredicto | Hallazgo principal |
> |---|---|---|---|
> | 1 | Cabecera y ADR | CUMPLE con reparos | `depende_de` omitía S-08, S-09 y S-10; ADR-022 no era origen de ningún REQ |
> | 2 | REQ: una obligación, EARS, origen | NO CUMPLE | orígenes incoherentes (ADR-012 no trata entrenadores); REQ compuestos (006, 009, 014, 015, 018, 019, 020, 021); REQ-017 sin forma EARS y en choque con REQ-015 |
> | 3 | Cobertura | CUMPLE con reparos | faltaban bordes (desactivar un inactivo, id inexistente, teléfono) y un INV de «solo entrenador activo» |
> | 4 | AC binarios | NO CUMPLE | INV-002/AC-001 `restriccion-bd` sin CHECK; AC-003 y AC-002 sin criterio operativo; REQ-006 sin prueba; AC-007 supone un bloqueo que ningún REQ exige |
> | 5 | Hechos de 0.4 | CUMPLE con reparos | conteos válidos solo para `apps` y `packages`; los 20 archivos `ENTRENADOR` mezclan vitrina y rol; faltaba el `include: { entrenador: true }` |
> | 6 | Hechos incompletos | NO CUMPLE | faltaban vitrina, cobros/caja, pantalla de usuarios, kiosco, `api/usuarios`, que `CrearMiembro` no valida el entrenador, `guardarFoto`, scripts de `packages/db`, «(entrenador actual)» y `RolSinPermisosError` |
> | 7 | Supuestos | NO CUMPLE | «decisión del propietario» donde solo era interpretación; faltaban supuestos implícitos (identificador, orden, idempotencia, auditoría, teléfono, foto) |
> | 8 | Contradicciones | NO CUMPLE | `USUARIOS` para listar rompe el selector de `RECEPCION`; REQ-015 contra REQ-017; AC-S01-019 crea un `ENTRENADOR`; contrato de permisos de S-01; S-05 no nombra `ListarEntrenadores` |
> | 9 | Alcance | NO CUMPLE | vitrina sin traspaso a S-20; S-18 retiraba ramas de `ENTRENADOR` que son de S-23; faltaba decidir la sección «Entrenadores» de usuarios |
> | 10 | Viabilidad | NO CUMPLE | el paso 4 (dos columnas) no detecta lectores sin migrar; el paso 7 no compila por `PERMISOS_POR_ROL: Record<RolUsuario, …>`; el paso 3 duplica a S-22; sin REQ de transacción y bloqueo; términos incompletos |
> | 11 | Riesgos | NO CUMPLE | foto sin validar y huérfana, regresión de `RECEPCION`, ruptura de vitrina y cobros, `api/usuarios` abierto, sin auditoría |
> | 12 | Enmiendas | NO CUMPLE | S-22 no «suma» el repositorio (ya contado); faltaban AC-S01-019, REQ-S01-029/031, S-07 (destino de la clave), S-08, S-20, docs/06 |

### Conciliación del autor
Todos los hallazgos se verificaron contra el Repo A y las specs (`grep` y `Read` sobre `CrearUsuarioAdmin.ts:48`, `api/usuarios/route.ts:44`, `usuarios/page.tsx:34-35`, `ListarEntrenadores.ts`, `PrismaEntrenadorRepository.ts`, `caja/page.tsx`, `ModalRegistrarPagoCaja.tsx`, `CrearMiembro.ts` y `ActualizarMiembro.ts`) y resultaron ciertos; ninguno se rechazó. Las citas que no pude re-verificar quedan marcadas como «cita de la revisión» en 0.4. Correcciones: la spec pasó de 23 REQ a 39, de 14 BEH a 20, de 3 INV a 4 y de 9 AC a 11.

| Fila | Corrección |
|---|---|
| 1 | `depende_de` incluye S-08, S-09 y S-10; ADR-022 queda en `adrs` por su suite de contrato (plan, paso 4) |
| 2 | Orígenes a H-07 y SUP; REQ divididos (006 a 010, 011 a 013, 014 a 018, 020 a 022, 027 a 028, 029 a 030, 031 a 032, 036 a 038); REQ-025 en forma EARS y REQ-024 limitado a «un entrenador distinto del actual» |
| 3 | Bordes nuevos: BEH-006 (teléfono), BEH-008 (operaciones repetidas), BEH-009 (id inexistente); INV-003 de «solo entrenador activo» |
| 4 | CHECK en `UsuarioAdmin.rol` (REQ-005) para que INV-002 sea `restriccion-bd`; AC-004 define la búsqueda de operaciones de borrado; la comprobación de formularios pasa a AC manual (AC-003, AC-007); REQ-009 exige credenciales recibidas de la persona; REQ-026 y REQ-039 fijan la transacción y el bloqueo |
| 5 y 6 | 0.4 separa los conteos por alcance y distingue vitrina y rol; agrega vitrina, cobros, `api/usuarios`, pantalla de usuarios, kiosco, scripts, `CrearMiembro` sin validación, `guardarFoto` y `RolSinPermisosError` |
| 7 | SUP-001 reformulado como interpretación; SUP-008 a SUP-012 nuevos; preguntas abiertas sustituidas por las que faltan |
| 8 | `listarEntrenadores` sin permiso propio y gestión con `USUARIOS CREAR/EDITAR` (REQ-019, REQ-022); REQ-024/025; enmiendas a AC-S01-019 y al contrato de permisos; `ListarEntrenadores` es cambio propio de S-18 |
| 9 | Vitrina: REQ-033 y traspaso a S-20; ramas de `ENTRENADOR` y `RolSinPermisosError` pasan a S-23; la sección de usuarios se retira (SUP-011, REQ-010) |
| 10 | Cambio atómico de `Miembro.entrenadorId` sin columna temporal (SUP-012); la matriz de permisos conserva la clave `ENTRENADOR` hasta S-23; el paso 4 adapta la suite de S-22; nueve términos en la herramienta |
| 11 | Riesgos agregados en 5.3 |
| 12 | 5.2 reescrita: S-22 (tabla sí, repositorio ya contado), S-01 (AC-S01-019, REQ-S01-029/031), S-07, S-08, S-20, S-23 y docs |
