---
id: S-18
estado: en-revision
adrs: ADR-012, ADR-016, ADR-022
depende_de: S-00, S-01, S-05, S-06, S-07, S-22
aprobada_por:
fecha_aprobacion:
---
# S-18 — Entrenadores: personas del gimnasio sin credenciales, asignadas solo al miembro

## 0. Contexto y alcance

### 0.1 Problema
En el código heredado un entrenador es un `UsuarioAdmin` con rol `ENTRENADOR`, un correo inventado (`entrenador-<uuid>@sinacceso.interno`) y una contraseña aleatoria que se descarta, solo para cumplir el esquema. Es una cuenta de acceso que no debería existir: con un hueco de `activo` o sin límite de intentos sería un inicio de sesión potencial (hallazgo H-07, P-22). Además cada plan decidía si «incluía entrenador». El propietario decidió que en Adhara solo inicia sesión el socio o administrador, que los entrenadores (María Aguilera, José Montesino, Joa Bonillo y Jesús Bonillo) son personas del gimnasio sin acceso, que todos los planes incluyen entrenador y que el entrenador se asigna solo al miembro (`docs/datos-iniciales.md`). S-07 ya retiró `Plan.incluyeEntrenador`; S-18 crea el registro propio del entrenador y quita a los entrenadores de las cuentas de acceso.

### 0.2 Dentro de alcance
- Tabla `Entrenador` (nombre, teléfono, foto, activo) sin correo ni contraseña, y `Miembro.entrenadorId` apuntando a ella en lugar de a `UsuarioAdmin`.
- Casos de uso `crearEntrenador`, `actualizarEntrenador`, `desactivarEntrenador`, `reactivarEntrenador` y `listarEntrenadores` (sin parámetro de sede) con sus puertos y repositorios.
- Pantalla «Entrenadores» del panel (lista, alta, edición, desactivar y reactivar), el selector opcional de entrenador del formulario del miembro y el nombre del entrenador en la ficha y en la respuesta del check-in.
- Que `crearUsuarioAdmin` y la pantalla de usuarios rechacen el rol `ENTRENADOR`, retiro del correo `@sinacceso.interno` y de la contraseña aleatoria, y retiro de las ramas de `ENTRENADOR` en los permisos.
- `tools/verificar-entrenador.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Quitar el enum `RolUsuario`, los roles `GERENTE` y `RECEPCION` y los permisos por módulo: S-23 (S-18 solo impide crear usuarios con rol `ENTRENADOR`).
- Los entrenadores sembrados (los cuatro nombres): S-15.
- El horario, la agenda, las comisiones o la cartera de miembros de un entrenador: no hay requisito.
- Que un entrenador inicie sesión o vea su cartera: el propietario decidió que no tiene acceso.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-18 recibirá después de S-00 a S-10 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Entrenador como usuario:** `enum RolUsuario` incluye `ENTRENADOR` (`schema.prisma:68-73`); `UsuarioAdmin` tiene `email @unique`, `passwordHash` y `rol` (`:75-95`) y la relación `miembrosEntrenados` (`:97`); `Miembro.entrenadorId` apunta a `UsuarioAdmin` con la relación `EntrenadorDeMiembro` (`:157-158`) (verificado con `Read`).
- **Cuenta inutilizable:** `usuarios/actions.ts:100-111` genera `entrenador-${randomUUID()}@sinacceso.interno` y una contraseña `randomUUID()` hasheada y descartada cuando el rol es `ENTRENADOR`; `ActualizarPermisosUsuario.ts:37` rechaza dar permisos a un entrenador; `CrearUsuarioAdmin.ts:75` le da una lista vacía de permisos (verificado con `Read`).
- **Lectura:** `ListarEntrenadores.ts` pide organización y sede a `IEntrenadorRepository.listarPorOrganizacionYSucursal`; `EntrenadorResumen` tiene `id` y `nombre`; `PrismaMemberRepository.ts:15-16,39-40` resuelve `entrenadorNombre`; el check-in lo devuelve como `entrenador` (`api/checkin/route.ts:47`) (verificado con `Read`).
- **Alcance en código:** 20 archivos mencionan `ENTRENADOR`, 14 `entrenadorId`, 6 `listarEntrenadores`, `ListarEntrenadores` o `EntrenadorParaCambio`, y 18 `RolUsuario` (verificado con `grep -rIlE`).
- **Formulario del miembro:** `FormularioMiembro.tsx:92,112,176` usa `entrenadoresPorSucursal` y `entrenadorId`; S-07 lo hizo opcional e independiente del plan (REQ-S07-041) (verificado con `grep -n`).
- **Datos iniciales:** son cuatro entrenadores (María Aguilera, José Montesino, Joa Bonillo y Jesús Bonillo) y la asignación al miembro es opcional (`docs/datos-iniciales.md`, asumido, por validar) (verificado con `Read` de `docs/datos-iniciales.md`).
- **Interacción con specs aprobadas:** S-01 limita el login pero no impide que una cuenta de entrenador sea un candidato (hallazgo H-07); S-05 quita las sedes múltiples (`ListarEntrenadores` pierde `sucursalId`); S-06 no toca entrenadores; S-07 deja a S-18 el entrenador como persona (`S-07` §0.3) y la relación `Miembro.entrenadorId` (verificado con `grep -n` en las specs).
- No verificado: que ningún reporte o pantalla del heredado use `miembrosEntrenados`, y el contenido de los 20 archivos más allá de lo citado.

### 0.5 Supuestos
- SUP-S18-001: el entrenador es una persona del gimnasio con nombre, teléfono opcional, foto opcional y estado activo, sin correo, contraseña, rol ni permisos; no es un `UsuarioAdmin`. Default: ese modelo; decisión del propietario (`docs/datos-iniciales.md`); asumido, por validar.
- SUP-S18-002: la asignación de entrenador al miembro es opcional; un miembro sin entrenador es válido y todos los planes incluyen entrenador sin que el sistema lo exija. Default: opcional; asumido, por validar.
- SUP-S18-003: un entrenador no se borra; se desactiva. Un entrenador inactivo no aparece en el selector, pero sigue visible en la ficha de los miembros que ya lo tienen asignado. Default: desactivar sin borrar ni desasignar; asumido, por validar.
- SUP-S18-004: el nombre del entrenador es obligatorio, se recorta y tiene entre 2 y 80 caracteres; no se exige que sea único. Default: ese criterio; asumido, por validar.
- SUP-S18-005: gestionar entrenadores exige el permiso `USUARIOS` (ver, crear, editar) mientras existan permisos por módulo; S-23 lo reemplaza por el acceso total del socio. Default: ese permiso; asumido, por validar.
- SUP-S18-006: no hay datos que migrar: el baseline se genera nuevo (S-00, S-15) y los entrenadores se cargan en el seed o desde la pantalla. Default: sin migración; asumido, por validar.
- SUP-S18-007: la foto del entrenador se guarda en el almacenamiento de fotos existente igual que la del miembro; no se borra al desactivar. Default: ese tratamiento; asumido, por validar.

## 1. Requisitos

### REQ-S18-001
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: El esquema deberá tener la tabla Entrenador con identificador, nombre obligatorio, teléfono opcional, foto opcional y estado activo con valor por defecto verdadero.

### REQ-S18-002
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
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
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-012
- texto: Si crearUsuarioAdmin recibe el rol ENTRENADOR entonces deberá rechazar la creación con un error sin escribir nada.

### REQ-S18-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: El sistema no deberá generar correos @sinacceso.interno ni contraseñas aleatorias descartadas para ninguna persona.

### REQ-S18-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-012
- texto: La pantalla de usuarios no deberá ofrecer el rol ENTRENADOR.

### REQ-S18-008
- tipo: cuando
- prioridad: MUST
- origen: SUP-S18-004
- texto: Cuando se crea un entrenador con un nombre válido, crearEntrenador deberá guardarlo activo y devolverlo.

### REQ-S18-009
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-004
- texto: Si el nombre del entrenador recortado tiene menos de 2 o más de 80 caracteres entonces crearEntrenador y actualizarEntrenador deberán rechazarlo con un error de validación sin escribir nada.

### REQ-S18-010
- tipo: cuando
- prioridad: MUST
- origen: SUP-S18-003
- texto: Cuando se desactiva un entrenador, desactivarEntrenador deberá dejarlo inactivo sin modificar los miembros que lo tienen asignado.

### REQ-S18-011
- tipo: cuando
- prioridad: MUST
- origen: SUP-S18-003
- texto: Cuando se reactiva un entrenador inactivo, reactivarEntrenador deberá dejarlo activo.

### REQ-S18-012
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-003
- texto: El sistema no deberá borrar entrenadores.

### REQ-S18-013
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-005
- texto: Si el usuario no tiene el permiso USUARIOS para la acción pedida entonces los casos de uso de entrenadores deberán rechazar la operación sin leer ni escribir datos.

### REQ-S18-014
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-003
- texto: La función listarEntrenadores, sin parámetro de sede, deberá devolver los entrenadores activos y, si se pide, también los inactivos.

### REQ-S18-015
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S18-003
- texto: Si crearMiembro o actualizarMiembro reciben un entrenador inexistente o inactivo entonces deberán rechazar la operación con EntrenadorNoDisponibleError sin escribir nada.

### REQ-S18-016
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-002
- texto: Crear o editar un miembro sin entrenador deberá ser válido.

### REQ-S18-017
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-003
- texto: Actualizar un miembro cuyo entrenador asignado está inactivo sin cambiar el entrenador no deberá producir error.

### REQ-S18-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: El nombre del entrenador asignado deberá resolverse desde la tabla Entrenador en la ficha del miembro y en la respuesta del check-in.

### REQ-S18-019
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-001
- texto: El panel deberá tener la pantalla «Entrenadores» con lista, alta, edición, desactivación y reactivación.

### REQ-S18-020
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S18-002
- texto: El formulario del miembro deberá ofrecer un selector opcional con los entrenadores activos y mostrar el entrenador actual aunque esté inactivo.

### REQ-S18-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos sinacceso.interno, miembrosEntrenados, EntrenadorDeMiembro ni rol === "ENTRENADOR".

### REQ-S18-022
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-entrenador.mjs encuentra alguno de los términos de REQ-S18-021, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S18-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-entrenador.mjs en cada pull request.

## 2. Comportamiento

### BEH-S18-001
- cubre: REQ-S18-001, REQ-S18-002, REQ-S18-003, REQ-S18-004
- categoria: feliz
- dado: una base con el esquema final
- cuando: se consultan las columnas de Entrenador, Miembro y UsuarioAdmin
- entonces: Entrenador tiene identificador, nombre, teléfono, foto y activo (verdadero por defecto) y ninguna columna de correo, contraseña, rol ni permisos; Miembro.entrenadorId apunta a Entrenador, es opcional y sin cascada; UsuarioAdmin no tiene miembrosEntrenados

### BEH-S18-002
- cubre: REQ-S18-005, REQ-S18-006, REQ-S18-007
- categoria: error
- dado: un socio en la pantalla de usuarios
- cuando: intenta crear un usuario con rol ENTRENADOR y busca el rol en el formulario
- entonces: el formulario no ofrece ese rol, crearUsuarioAdmin lanza un error si recibe ENTRENADOR y no se genera ningún correo @sinacceso.interno ni contraseña descartada

### BEH-S18-003
- cubre: REQ-S18-008, REQ-S18-016
- categoria: feliz
- dado: un socio
- cuando: crea al entrenador «María Aguilera» con teléfono y sin foto, y luego crea un miembro sin entrenador
- entonces: el entrenador queda activo, el miembro se crea sin entrenador y ambos aparecen en sus listas

### BEH-S18-004
- cubre: REQ-S18-009
- categoria: borde
- dado: nombres de entrenador de 1 carácter, de solo espacios, de 2, de 80 y de 81 caracteres
- cuando: se ejecuta crearEntrenador y actualizarEntrenador con cada uno
- entonces: se rechazan los de 1, solo espacios y 81 caracteres con un error de validación sin escribir, y se aceptan los de 2 y 80 recortados

### BEH-S18-005
- cubre: REQ-S18-010, REQ-S18-017, REQ-S18-018
- categoria: feliz
- dado: el entrenador «José Montesino» asignado a 5 miembros
- cuando: el socio lo desactiva y luego edita el nombre de uno de esos miembros sin cambiar el entrenador y abre su ficha
- entonces: los 5 miembros siguen asignados, la edición no da error y la ficha muestra «José Montesino» como entrenador

### BEH-S18-006
- cubre: REQ-S18-011, REQ-S18-014, REQ-S18-020
- categoria: feliz
- dado: dos entrenadores activos y uno inactivo
- cuando: se llama a listarEntrenadores sin y con incluir inactivos, se abre el selector del formulario de un miembro sin entrenador y de otro asignado al inactivo, y se reactiva al inactivo
- entonces: sin incluir inactivos devuelve 2 y con incluirlos 3, sin parámetro de sede; el primer selector ofrece los 2 activos; el segundo muestra al inactivo como entrenador actual; tras reactivar, el selector ofrece 3

### BEH-S18-007
- cubre: REQ-S18-012
- categoria: feliz
- dado: el árbol final
- cuando: se buscan casos de uso, rutas, acciones y botones que borren un entrenador
- entonces: no existe ninguno

### BEH-S18-008
- cubre: REQ-S18-013
- categoria: error
- dado: un usuario sin el permiso USUARIOS
- cuando: intenta crear, editar, desactivar, reactivar y listar los entrenadores
- entonces: todas se rechazan sin leer ni escribir datos

### BEH-S18-009
- cubre: REQ-S18-015
- categoria: error
- dado: un entrenador inexistente y uno inactivo
- cuando: se crea y se edita un miembro asignándolos
- entonces: ambas operaciones lanzan EntrenadorNoDisponibleError sin escribir nada

### BEH-S18-010
- cubre: REQ-S18-018
- categoria: feliz
- dado: un miembro con entrenador «Joa Bonillo» vigente
- cuando: el kiosco registra su check-in
- entonces: la respuesta trae entrenador «Joa Bonillo» y no trae el identificador interno ni el teléfono

### BEH-S18-011
- cubre: REQ-S18-019
- categoria: feliz
- dado: el panel con un socio
- cuando: abre la pantalla «Entrenadores»
- entonces: ve la lista con sus estados, puede dar de alta, editar, desactivar y reactivar, y no ve ninguna opción de borrar

### BEH-S18-012
- cubre: REQ-S18-021, REQ-S18-022
- categoria: error
- dado: un archivo por cada uno de los cuatro términos de REQ-S18-021
- cuando: se ejecuta tools/verificar-entrenador.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S18-013
- cubre: REQ-S18-023
- categoria: error
- dado: un pull request que agrega sinacceso.interno en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-entrenador.mjs falla y queda en rojo

### BEH-S18-014
- cubre: REQ-S18-010
- categoria: concurrencia
- dado: un entrenador activo, una desactivación y la asignación de ese entrenador a un miembro nuevo simultáneas
- cuando: terminan las dos transacciones
- entonces: o la asignación se confirma antes de la desactivación (el miembro queda asignado a un entrenador ahora inactivo, sin error) o la asignación lanza EntrenadorNoDisponibleError; no queda un miembro con un entrenador inexistente

## 3. Invariantes

### INV-S18-001
- propiedad: todo miembro con entrenador apunta a un entrenador que existe en la tabla Entrenador
- mecanismo: restriccion-bd
- deteccion: clave foránea de Miembro.entrenadorId a Entrenador sin cascada; una asignación a un identificador inexistente falla
- protege: REQ-S18-003, REQ-S18-015

### INV-S18-002
- propiedad: ninguna persona del gimnasio sin acceso tiene credenciales de inicio de sesión
- mecanismo: restriccion-bd
- deteccion: la consulta del esquema final devuelve 0 columnas de correo, contraseña, rol o permisos en Entrenador, y ninguna fila de UsuarioAdmin con rol ENTRENADOR existe
- protege: REQ-S18-002, REQ-S18-005, REQ-S18-006

### INV-S18-003
- propiedad: los términos retirados no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-entrenador.mjs termina con código distinto de cero y lista archivo:línea y término de cada coincidencia
- protege: REQ-S18-021, REQ-S18-022

## 4. Criterios de aceptación

### AC-S18-001
- enlaza: REQ-S18-001, REQ-S18-002, REQ-S18-003, REQ-S18-004, BEH-S18-001, INV-S18-001, INV-S18-002
- metodo: sql
- procedimiento: consultar las columnas de Entrenador, Miembro y UsuarioAdmin en la base creada con el esquema final, asignar un entrenador inexistente a un miembro e intentar insertar un UsuarioAdmin con rol ENTRENADOR
- esperado: las columnas son las de BEH-S18-001, no hay columnas de acceso en Entrenador, la asignación a un identificador inexistente falla y ninguna fila de UsuarioAdmin tiene rol ENTRENADOR
- test: pendiente

### AC-S18-002
- enlaza: REQ-S18-005, REQ-S18-006, REQ-S18-007, BEH-S18-002
- metodo: integracion
- procedimiento: llamar a crearUsuarioAdmin con el rol ENTRENADOR, enviar el formulario de usuarios con ese rol y leer las opciones del formulario; buscar @sinacceso.interno en el código
- esperado: la creación lanza un error sin escribir, el formulario no ofrece el rol y el término no existe
- test: pendiente

### AC-S18-003
- enlaza: REQ-S18-008, REQ-S18-009, REQ-S18-010, REQ-S18-011, REQ-S18-012, REQ-S18-016, REQ-S18-017, BEH-S18-003, BEH-S18-004, BEH-S18-005, BEH-S18-007
- metodo: integracion
- procedimiento: ejecutar los casos de uso de entrenadores contra una base efímera con los datos de esos comportamientos y buscar con la API de typescript cualquier operación que borre entrenadores
- esperado: los estados, los miembros asignados, los errores de validación y la ausencia de borrado coinciden con los comportamientos
- test: pendiente

### AC-S18-004
- enlaza: REQ-S18-013, BEH-S18-008
- metodo: integracion
- procedimiento: llamar a cada caso de uso de entrenadores con un usuario sin el permiso USUARIOS contando las filas leídas y escritas
- esperado: se rechazan con 0 lecturas y 0 escrituras
- test: pendiente

### AC-S18-005
- enlaza: REQ-S18-014, REQ-S18-015, REQ-S18-018, REQ-S18-020, BEH-S18-006, BEH-S18-009, BEH-S18-010
- metodo: integracion
- procedimiento: llamar a listarEntrenadores sin y con inactivos, crear y editar miembros con entrenadores válidos, inexistentes e inactivos, registrar un check-in de un miembro con entrenador y leer los datos que alimentan el selector del formulario
- esperado: las listas, los errores, el nombre en el check-in sin identificador ni teléfono y las opciones del selector coinciden con los comportamientos
- test: pendiente

### AC-S18-006
- enlaza: REQ-S18-019, BEH-S18-011
- metodo: manual
- procedimiento: como socio, abrir la pantalla «Entrenadores», dar de alta, editar, desactivar y reactivar a un entrenador
- esperado: todas las acciones funcionan y no hay opción de borrar
- test: pendiente

### AC-S18-007
- enlaza: REQ-S18-010, BEH-S18-014
- metodo: integracion
- procedimiento: con una barrera que fija qué transacción toma el bloqueo primero, lanzar con Promise.all una desactivación y la creación de un miembro asignado a ese entrenador, en cada orden
- esperado: el resultado es el de BEH-S18-014 en cada orden y nunca queda un miembro con un entrenador inexistente
- test: pendiente

### AC-S18-008
- enlaza: REQ-S18-021, REQ-S18-022, BEH-S18-012, INV-S18-003
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-entrenador.mjs con un árbol por cada uno de los cuatro términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los cuatro términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S18-009
- enlaza: REQ-S18-023, BEH-S18-013
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue sinacceso.interno en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-entrenador.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de la asignación de entrenador al miembro y del check-in; (2) `tools/verificar-entrenador.mjs` y sus pruebas, con todos los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) esquema aditivo: tabla `Entrenador` y suite de contrato de su repositorio (S-22); (4) casos de uso, puertos y repositorio de entrenadores con sus pruebas, y `Miembro.entrenadorId` adicional hacia `Entrenador` conviviendo con el viejo (`entrenadorUsuarioId`); (5) migrar lectores y escritores: `crearMiembro`, `actualizarMiembro`, ficha, `registrarCheckIn`, formulario del miembro con su selector y la respuesta del check-in; (6) pantalla «Entrenadores» y su entrada de menú; (7) rechazo del rol `ENTRENADOR` en `crearUsuarioAdmin` y en la pantalla de usuarios, retiro del correo interno y de la contraseña descartada, y de las ramas de `ENTRENADOR` en `ActualizarPermisosUsuario` y `CrearUsuarioAdmin`; (8) retirar la columna vieja, la relación `miembrosEntrenados` y los términos retirados, achicando las exenciones en el mismo commit.
- Las pruebas de concurrencia usan semillas fijas, una base efímera y una barrera que fija el orden en que las transacciones toman el bloqueo; no hay dependencias nuevas.
- Los criterios AC-S18-006 y AC-S18-009 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar (SUP-S18-006): el baseline se genera nuevo (S-00, S-15) y los cuatro entrenadores se cargan en el seed (S-15) o desde la pantalla.
- **Enmiendas que se registran al aprobar S-18:**
  - S-07: la nota de 0.3 sobre S-18 (entrenador como persona) queda cumplida; REQ-S07-041 (entrenador opcional e independiente del plan) se aplica sobre `Entrenador`.
  - S-01: la tabla de permisos de 5.1 agrega los casos de uso de entrenadores con el permiso `USUARIOS`; el hallazgo H-07 queda cerrado para los entrenadores.
  - S-05: `ListarEntrenadores` deja el parámetro de sede (ya sin sedes).
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 suman una tabla (`Entrenador`); REQ-S22-007 y AC-S22-003 suman su repositorio y su suite de contrato; `UsuarioAdmin` pierde la relación `miembrosEntrenados`.
  - `docs/06-modelo-datos-cambios.md`, `docs/datos-iniciales.md` y `COBERTURA-RF.md` (P-22): nota de que S-18 creó el registro de entrenadores.
- **Traspasos:** S-15 (los cuatro entrenadores sembrados), S-23 (reemplaza el permiso `USUARIOS` de entrenadores por el acceso total del socio y retira el rol `ENTRENADOR` del enum).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Mientras S-23 no esté implementada sigue existiendo el valor `ENTRENADOR` en el enum de roles; S-18 solo impide crear usuarios con él. Mitigación: REQ-S18-005 y la herramienta de términos.
- Entre los pasos 4 y 8 conviven dos columnas hacia entrenadores; un lector no migrado puede leer la vieja. Mitigación: el typecheck y que el paso 8 las retira juntas.
- Un entrenador desactivado sigue asignado a sus miembros: el personal puede olvidar reasignarlos. Mitigación: la ficha lo muestra con su estado.
- El nombre del entrenador no es único: dos personas con el mismo nombre se distinguen solo por el teléfono. Mitigación: es poco probable en un solo local (SUP-S18-004).
- Las cifras de 0.4 cambian cuando S-00 a S-10 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿El entrenador es una persona con nombre, teléfono y foto, sin correo ni acceso? Default: sí (SUP-S18-001, decisión del propietario).
- ¿La asignación de entrenador al miembro es opcional? Default: sí (SUP-S18-002).
- ¿Un entrenador no se borra, se desactiva, y sigue visible en sus miembros? Default: sí (SUP-S18-003).
