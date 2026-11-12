---
id: S-09
estado: en-revision
adrs: ADR-004, ADR-010, ADR-012, ADR-013, ADR-016, ADR-022
depende_de: S-00, S-01, S-02, S-04, S-05, S-06, S-07, S-08, S-22
aprobada_por:
fecha_aprobacion:
---
# S-09 — Eliminar miembro: la baja lógica que oculta al miembro y conserva sus pagos

## 0. Contexto y alcance

### 0.1 Problema
El código heredado tiene dos formas de sacar a un miembro: un interruptor «Dar de baja»/«Reactivar» (`Miembro.activo`) que ni siquiera impide el check-in y que cualquiera con sesión puede usar, y «Quitar del sistema» (`eliminarConHistorial`), que borra en una transacción los check-ins, la auditoría de cambios de plan, las deudas, los pagos, las suscripciones y el miembro, con lo que los pagos desaparecen de los reportes. ADR-013 (aceptado, con la denominación «Eliminar» en pantalla) decide una baja lógica que conserva los pagos. S-09 ejecuta esa decisión y cierra los huecos que dejaron S-06, S-07 y S-08 (documento que sigue ocupado, cobros a un miembro eliminado, listados). El propietario descartó la anonimización de datos personales que ADR-013 preveía a pedido (2026-11-12): no se implementa.

### 0.2 Dentro de alcance
- `Miembro.estado` (`ACTIVO` o `BAJA`, «Eliminado» en pantalla) con `bajaEn`, `bajaPorId` y `bajaMotivo`, que reemplaza a `Miembro.activo`.
- Casos de uso `eliminarMiembro` y `restaurarMiembro`, con permiso `MIEMBROS ELIMINAR`, bloqueo del miembro (S-04) y registro en `RegistroAuditoria` mediante un puerto de auditoría que `IUnidadDeTrabajo` expone.
- Retiro de `eliminarConHistorial`, `EliminarMiembro` (el borrado), `BotonQuitarMiembro`, `EstadoToggle`, `darDeBajaAction`, `reactivarAction` y el campo `activo` del `PATCH` de miembros.
- Efecto de «Eliminado» en el resto del sistema: `listarMiembros` (con un parámetro de estado), la lista de en sala y su historial, el selector de `/cobros`, el kiosco, los cobros y el cambio de plan, la edición de la ficha, el alta con un documento ocupado y el reporte de cobros de S-08.
- Pantallas: botón «Eliminar» con su confirmación, filtro «Eliminados», ficha de solo lectura para un eliminado y «Restaurar».
- `tools/verificar-miembro.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- La anonimización de los datos personales a pedido (ADR-013 Decisión 2) y la conservación de los check-ins solo agregados (Decisión 5): el propietario las descartó el 2026-11-12. Un miembro eliminado conserva todos sus datos.
- El borrado físico por una tarea de retención programada tras el plazo que fije el contador o el abogado (ADR-013 Decisión 3, P-20 sin responder): no se implementa y ningún caso de uso borra pagos.
- Consentimiento y aviso legal: S-13.
- Permisos por módulo y rol único: S-23.
- Los reportes de morosos, por vencer e ingresos por período: S-14, que deberá excluir a los eliminados de los morosos y por vencer e incluir sus pagos en los ingresos.
- El texto del mensaje que ve un miembro eliminado en el kiosco: S-21 (aquí el check-in lo rechaza como «no encontrado»).
- El padrón de Excel y su alta retroactiva: S-10 los retira.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-09 recibirá después de S-00 a S-08 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Dos mecanismos:** `Miembro.activo` es una baja lógica con comentario «baja lógica del miembro» (`schema.prisma:165`), la alterna `EstadoToggle.tsx` con `darDeBajaAction` y `reactivarAction` (`miembros/actions.ts:367,386`) y la usan `ListaMiembros.tsx:263,313,381` («Activo»/«Inactivo»); y `eliminarMiembro` (`EliminarMiembro.ts:15-34`) llama a `eliminarConHistorial`, que borra check-ins, auditoría de cambios de plan, deudas, pagos, suscripciones y el miembro en una transacción (`PrismaMemberRepository.ts:113-122`); la pantalla lo ofrece como «Quitar del sistema» con el aviso de que los pagos «dejarán de contar en las cajas y reportes» (`BotonQuitarMiembro.tsx:13-16`) (verificado con `Read`).
- **Sin permiso en la baja:** `darDeBajaAction` y `reactivarAction` llaman a `actualizarMiembro` sin comprobar permiso alguno (`miembros/actions.ts:367-404`); solo `eliminarMiembro` exige `MIEMBROS ELIMINAR` (`EliminarMiembro.ts:19`) (verificado con `Read`).
- **El estado no se aplica:** `RegistrarCheckIn.ts` no lee `activo` (`grep -n activo` sin resultados), de modo que un miembro dado de baja puede registrar acceso; filtran por `activo` solo `caja/page.tsx:118`, `caja/ModalVenderProducto.tsx:317` y `pagos/nuevo/page.tsx:26`; el `PATCH` de miembros acepta `activo` (`api/miembros/[id]/route.ts:81`) (verificado con `grep -n`).
- **Conteos (sobre `apps` y `packages`, sin `packages/db`):** `eliminarConHistorial` en 5 archivos, `EliminarMiembro` en 2, `eliminarMiembro` en 4, `BotonQuitar` en 2 y `reactivar` en 5 (3 son ajenos: sucursales y `kiosk/AccessCard.tsx:135`); `EstadoToggle` está en `miembros/` y en comentarios de `planes/BotonEliminarPlan.tsx:14` y `usuarios/TarjetaUsuario.tsx:26` (verificado con `grep -rIlF`).
- **Auditoría sin uso:** `RegistroAuditoria` (`schema.prisma:582-593`) tiene `entidad`, `entidadId`, `campo`, `valorAnterior`, `valorNuevo`, `motivo` (obligatorio), `usuarioId` y `createdAt`, y ningún archivo de `apps` ni `packages` la usa; solo la mencionan scripts de `packages/db` que S-00 excluye (`clonarSedePrincipalAZipGym.ts:244,319`) (verificado con `grep -rIl RegistroAuditoria`).
- **Quién lee a los miembros:** `listarMiembros` (`ListarMiembros.ts:9-10`) alimenta `miembros/page.tsx:26`, `pagos/nuevo/page.tsx:20`, `caja/page.tsx:97` y `GET api/miembros` (`api/miembros/route.ts:18`); `ListarEnSala.ts` tiene `listarEnSala` (`:41`) y `listarHistorialSala` (`:56`, ruta `en-sala/historial`), que leen `PrismaCheckInRepository.ts:55` con el miembro incluido y sin filtro de estado; `ModalVenderProducto.tsx:317` es el buscador del fiado (`miembroFiado`, `:71,:121`), que S-08 elimina (verificado con `grep -n` y `Read`).
- **Errores de dominio:** `miembros/actions.ts:222-232`, `pagos/actions.ts:215,356` y `api/pagos/route.ts:128` traducen los errores de dominio conocidos a mensajes; los errores nuevos no traducidos se pierden (comentario en `miembros/actions.ts:426`) (verificado con `Read`).
- **Check-in:** `RegistrarCheckIn.ts:65-75` no abre transacción ni bloquea al miembro, tiene un respaldo `activarDesdePadron` (`:70-71`, que S-06 retira) y una ventana de idempotencia que devuelve el resultado previo (`:99-121`) (verificado con `Read`).
- **Clave foránea de usuario:** `Pago.registradoPorId` apunta a `UsuarioAdmin` sin borrado en cascada (`schema.prisma:278`) y `RegistroAuditoria.usuarioId` es obligatorio (`:590-591`) (verificado con `Read`).
- **Interacción con specs aprobadas:** S-06 dejó el documento de un miembro eliminado ocupado y el reingreso a S-09 (SUP-S06-011); S-07 admite cambio de plan de un miembro dado de baja hasta que S-09 lo defina (SUP-S07-016) y fija un orden de validación (REQ-S07-016); S-04 define la transacción, el bloqueo y los plazos de 20 y 5 segundos (REQ-S04-032, REQ-S04-044) y los errores de `registrarPago` (REQ-S04-005); S-08 lista el riesgo de ADR-013 en 5.3 y excluye el fiado; S-01 exige una guarda de sesión o de permiso en cada acción (REQ-S01-014) y permisos en los casos de uso (REQ-S01-012) (verificado con `grep -n` en las specs).
- **Textos que nombran la anonimización:** `docs/constitution.md` C-19, `docs/07-plan-implementacion-roadmap.md` tarea 1.15, `docs/10-prompt-claude-code.md:45`, `docs/08-decisiones-pendientes.md:61`, `docs/adr/ADR-004:42`, `docs/superpowers/COBERTURA-RF.md` (RF-04) y `S-06` (0.3, 5.2) (verificado con `grep -n anonimiz`).
- No verificado: que los scripts de `packages/db` que leen `activo` (`clonarSedePrincipalAZipGym.ts:569-570`, `resetVencimientosPrueba.ts:64`, `sembrarMiembrosPrueba.ts:82`) no se importen (S-00 los excluye; S-15 crea el seed).

### 0.5 Supuestos
- SUP-S09-001: el estado técnico es `BAJA` y en pantalla se llama «Eliminado» (ADR-013, confirmado por el propietario); «dar de baja» deja de usarse. Default: ese nombre; decisión del propietario; asumido, por validar el nombre técnico.
- SUP-S09-002: un miembro eliminado se puede restaurar, con el mismo permiso `MIEMBROS ELIMINAR`, porque la baja lógica es reversible (ADR-013); el propietario no nombró un permiso aparte. Default: restaurar permitido con ese permiso; asumido, por validar.
- SUP-S09-003: eliminar y restaurar toman el bloqueo del miembro (S-04) y releen su estado antes de validar; los cobros, el cambio de plan y el check-in rechazan a un miembro eliminado según el estado leído tras el bloqueo. Default: ese mecanismo; asumido, por validar.
- SUP-S09-004: el motivo de la eliminación y el de la restauración son opcionales, se recortan y tienen como máximo 200 caracteres; `RegistroAuditoria.motivo` guarda el texto o «sin motivo». Default: opcional con ese límite; asumido, por validar.
- SUP-S09-005: anular un pago de un miembro eliminado sigue permitido (es una corrección contable); cobrar o cambiar de plan no. Default: ese reparto; asumido, por validar.
- SUP-S09-006: un documento ocupado por un miembro eliminado produce el error de documento duplicado con un mensaje que indica que existe un miembro eliminado con ese documento y que se puede restaurar; el documento no se reutiliza. Default: ese comportamiento; asumido, por validar.
- SUP-S09-008: eliminar no modifica la suscripción, el vencimiento, los check-ins abiertos ni el entrenador del miembro; restaurar a un miembro con vencimiento ya vencido lo deja ACTIVO y vencido. Default: ese comportamiento; asumido, por validar.
- SUP-S09-009: `bajaEn` es un instante (no la fecha 05:00Z de las fechas de calendario de S-02), `bajaPorId` apunta a `UsuarioAdmin` sin borrado en cascada y el filtro «Eliminados» exige `MIEMBROS VER`. Default: ese diseño; asumido, por validar.
- SUP-S09-010: la carrera entre un check-in y una eliminación se acepta: un check-in simultáneo puede registrarse justo antes de que se confirme la eliminación; el check-in no es una operación de dinero y `registrarCheckIn` no bloquea al miembro. Default: aceptar la carrera; asumido, por validar.
- SUP-S09-011: el rechazo `MiembroEliminadoError` de `registrarPago` y de `cambiarPlan` se evalúa después de resolver un `cobroId` ya registrado y antes de validar el plan, el monto y el método; el mismo `cobroId` repetido tras eliminar devuelve el resultado original. Default: ese orden; asumido, por validar.
- SUP-S09-007: no hay anonimización ni retención programada: el propietario descartó la primera (2026-11-12) y P-20 está sin responder; los datos de un miembro eliminado, incluidos los personales, se conservan sin plazo. Default: sin anonimización ni plazo; decisión del propietario sobre la anonimización; asumido, por validar su efecto sobre la Ley 29733.

## 1. Requisitos

### REQ-S09-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: La tabla Miembro deberá tener la columna estado con los valores ACTIVO y BAJA, obligatoria y con valor por defecto ACTIVO, en lugar de la columna activo.

### REQ-S09-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: La tabla Miembro deberá tener las columnas bajaEn, bajaPorId y bajaMotivo.

### REQ-S09-003
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: La base deberá rechazar un miembro ACTIVO con bajaEn, bajaPorId o bajaMotivo y un miembro BAJA sin bajaEn o sin bajaPorId.

### REQ-S09-004
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S09-009
- texto: La columna bajaPorId deberá apuntar a UsuarioAdmin sin borrado en cascada.

### REQ-S09-005
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-013
- texto: Si el usuario no tiene el permiso MIEMBROS ELIMINAR entonces eliminarMiembro deberá rechazar la operación sin leer ni escribir datos del miembro.

### REQ-S09-006
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S09-002
- texto: Si el usuario no tiene el permiso MIEMBROS ELIMINAR entonces restaurarMiembro deberá rechazar la operación sin leer ni escribir datos del miembro.

### REQ-S09-007
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-013
- texto: Si el miembro no existe entonces eliminarMiembro y restaurarMiembro deberán lanzar MiembroNoEncontradoError sin escribir nada.

### REQ-S09-008
- tipo: cuando
- prioridad: MUST
- origen: ADR-013
- texto: Cuando se elimina un miembro ACTIVO, eliminarMiembro deberá dejarlo en estado BAJA con el instante, el usuario y el motivo de la eliminación.

### REQ-S09-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S09-004
- texto: El motivo de eliminar y de restaurar deberá ser opcional, recortarse y tener como máximo 200 caracteres, con un error de validación para uno más largo.

### REQ-S09-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Eliminar y restaurar un miembro no deberán borrar ninguna fila de Pago, Suscripcion, CheckIn ni CambioPlanAuditoria.

### REQ-S09-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Eliminar y restaurar un miembro no deberán modificar sus datos personales, su plan, su precio acordado, su entrenador, sus fechas de pago y de vencimiento ni sus suscripciones.

### REQ-S09-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Cada eliminación y cada restauración deberá registrar una fila de RegistroAuditoria con entidad Miembro, campo estado, el estado anterior y el nuevo, el motivo, el usuario y la fecha.

### REQ-S09-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: La fila de RegistroAuditoria y el cambio de estado del miembro deberán escribirse en la misma transacción.

### REQ-S09-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: IUnidadDeTrabajo deberá exponer un puerto de auditoría para escribir filas de RegistroAuditoria dentro de la transacción.

### REQ-S09-015
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-013
- texto: Si el miembro ya está eliminado entonces eliminarMiembro deberá rechazar la operación con MiembroYaEliminadoError sin escribir nada.

### REQ-S09-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-013
- texto: Cuando se restaura un miembro eliminado, restaurarMiembro deberá dejarlo en estado ACTIVO y vaciar bajaEn, bajaPorId y bajaMotivo.

### REQ-S09-017
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-013
- texto: Si el miembro está en estado ACTIVO entonces restaurarMiembro deberá rechazar la operación con MiembroNoEliminadoError sin escribir nada.

### REQ-S09-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los casos de uso eliminarMiembro y restaurarMiembro deberán abrir su transacción y bloquear la fila del miembro mediante IUnidadDeTrabajo y bloquearPorId, y releer el estado del miembro después de tomar el bloqueo.

### REQ-S09-019
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si la transacción de eliminar o restaurar supera los 20 segundos o la espera del bloqueo supera los 5 segundos entonces el caso de uso deberá cancelarla y revertirla.

### REQ-S09-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: La función listarMiembros deberá recibir un estado, ACTIVO por defecto, y devolver solo los miembros de ese estado.

### REQ-S09-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Las páginas de miembros y de nuevo cobro, el selector de miembro de /cobros y GET api/miembros deberán usar el estado ACTIVO de listarMiembros salvo que pidan «Eliminados».

### REQ-S09-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Las funciones listarEnSala y listarHistorialSala deberán excluir a los miembros eliminados.

### REQ-S09-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: La página /miembros deberá ofrecer el filtro «Eliminados» que lista solo los miembros eliminados a quien tiene el permiso MIEMBROS VER.

### REQ-S09-024
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-013
- texto: Si el miembro identificado en un check-in está eliminado entonces registrarCheckIn deberá lanzar MiembroNoEncontradoError y no registrar acceso.

### REQ-S09-025
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S09-005
- texto: Si el miembro está eliminado entonces registrarPago deberá rechazar la operación con MiembroEliminadoError sin escribir nada.

### REQ-S09-026
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S09-005
- texto: Si el miembro está eliminado entonces cambiarPlan deberá rechazar la operación con MiembroEliminadoError sin escribir nada.

### REQ-S09-027
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S09-011
- texto: El rechazo por miembro eliminado de registrarPago y de cambiarPlan deberá evaluarse después de resolver un cobroId ya registrado y antes de validar el plan, el monto y el método.

### REQ-S09-028
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S09-005
- texto: Si el miembro está eliminado entonces actualizarMiembro y la edición del PATCH de api/miembros/[id] deberán rechazar la edición con MiembroEliminadoError sin escribir nada.

### REQ-S09-029
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S09-005
- texto: La función anularPago deberá permitir anular los pagos de un miembro eliminado.

### REQ-S09-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El reporte de cobros de S-08 deberá seguir incluyendo los pagos de los miembros eliminados.

### REQ-S09-031
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S09-006
- texto: Si el documento de un miembro nuevo coincide con el de un miembro eliminado entonces crearMiembro deberá lanzar DocumentoDuplicadoError con un mensaje que indique que existe un miembro eliminado con ese documento y que puede restaurarse.

### REQ-S09-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Los errores MiembroYaEliminadoError, MiembroNoEliminadoError y MiembroEliminadoError deberán traducirse en api/miembros y en las acciones del panel a un 409 y a un mensaje en español.

### REQ-S09-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: El método eliminarConHistorial de IMemberRepository y de sus repositorios, y los archivos BotonQuitarMiembro, EstadoToggle, darDeBajaAction y reactivarAction, no deberán existir.

### REQ-S09-034
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Ningún caso de uso ni repositorio deberá borrar filas de Pago, Suscripcion, CheckIn, CambioPlanAuditoria ni Miembro.

### REQ-S09-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: El PATCH de api/miembros/[id] deberá rechazar con 400 todo campo fuera de su lista de campos editables, incluidos activo y estado.

### REQ-S09-036
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: La ficha del miembro deberá ofrecer la acción «Eliminar» con una confirmación que diga que el miembro deja de aparecer y que sus pagos se conservan, y con un campo opcional de motivo.

### REQ-S09-037
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: La ficha de un miembro eliminado deberá mostrarse de solo lectura, con la acción «Restaurar» y sin acciones de edición, de cobro ni de cambio de plan.

### REQ-S09-038
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S09-001
- texto: Las pantallas de miembros deberán llamar «Eliminado» al estado BAJA en lugar de «dar de baja», «inactivo» o «quitar del sistema».

### REQ-S09-039
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Las acciones del panel de eliminar y restaurar deberán llamar a la guarda de permiso de S-01 antes de ejecutar el caso de uso.

### REQ-S09-040
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos eliminarConHistorial, BotonQuitarMiembro, darDeBajaAction, reactivarAction, EstadoToggle, «Quitar del sistema», «Miembro dado de baja» ni «Miembro reactivado».

### REQ-S09-041
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-miembro.mjs encuentra alguno de los términos de REQ-S09-040, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S09-042
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-miembro.mjs en cada pull request.

## 2. Comportamiento

### BEH-S09-001
- cubre: REQ-S09-001, REQ-S09-002, REQ-S09-003, REQ-S09-004
- categoria: feliz
- dado: una base con el esquema final
- cuando: se consultan las columnas y claves de Miembro y se insertan un ACTIVO con bajaEn, un ACTIVO con bajaMotivo, un BAJA sin bajaEn y un BAJA sin bajaPorId
- entonces: existen estado (ACTIVO por defecto), bajaEn, bajaPorId y bajaMotivo, no existe activo, bajaPorId apunta a UsuarioAdmin sin cascada, y la base rechaza las cuatro inserciones

### BEH-S09-002
- cubre: REQ-S09-005, REQ-S09-006, REQ-S09-039
- categoria: error
- dado: un usuario sin el permiso MIEMBROS ELIMINAR y un miembro
- cuando: intenta eliminar y restaurar, también desde la acción del panel
- entonces: ambas se rechazan sin leer ni escribir datos del miembro y la acción llama primero a la guarda de permiso

### BEH-S09-003
- cubre: REQ-S09-007
- categoria: error
- dado: un identificador de miembro inexistente
- cuando: se ejecuta eliminarMiembro y restaurarMiembro
- entonces: ambos lanzan MiembroNoEncontradoError y no escriben nada

### BEH-S09-004
- cubre: REQ-S09-008, REQ-S09-010, REQ-S09-011, REQ-S09-012, REQ-S09-013
- categoria: feliz
- dado: un miembro con 3 pagos, 2 suscripciones, 10 check-ins, 1 cambio de plan, nombre, celular, foto, plan, entrenador y vencimiento vigente
- cuando: el socio lo elimina con el motivo «se mudó»
- entonces: queda en BAJA con bajaEn, bajaPorId y bajaMotivo, conserva las mismas 3 + 2 + 10 + 1 filas, sus datos personales, su plan, su entrenador, su vencimiento y sus suscripciones intactos, y existe una fila de RegistroAuditoria con entidad Miembro, campo estado, ACTIVO a BAJA, el motivo, el usuario y la fecha, escrita en la misma transacción

### BEH-S09-005
- cubre: REQ-S09-009
- categoria: borde
- dado: un miembro ACTIVO
- cuando: el socio lo elimina sin motivo, con un motivo de solo espacios, con un motivo de 200 caracteres y con uno de 201
- entonces: los tres primeros se eliminan (la auditoría guarda «sin motivo» en los dos primeros y el texto recortado en el tercero) y el de 201 se rechaza con un error de validación sin escribir nada

### BEH-S09-006
- cubre: REQ-S09-015
- categoria: error
- dado: un miembro ya eliminado
- cuando: el socio intenta eliminarlo de nuevo
- entonces: se lanza MiembroYaEliminadoError y no se escribe nada

### BEH-S09-007
- cubre: REQ-S09-016, REQ-S09-012, REQ-S09-011
- categoria: feliz
- dado: un miembro eliminado el día anterior con un vencimiento que ya pasó
- cuando: el socio lo restaura con el motivo «volvió»
- entonces: queda ACTIVO con bajaEn, bajaPorId y bajaMotivo vacíos, vuelve a los listados y al kiosco, sigue vencido, y la auditoría registra BAJA a ACTIVO con el motivo

### BEH-S09-008
- cubre: REQ-S09-017
- categoria: error
- dado: un miembro ACTIVO
- cuando: el socio intenta restaurarlo
- entonces: se lanza MiembroNoEliminadoError y no se escribe nada

### BEH-S09-009
- cubre: REQ-S09-018
- categoria: concurrencia
- dado: un miembro ACTIVO y dos eliminaciones simultáneas
- cuando: terminan las dos transacciones
- entonces: una se confirma y la otra lanza MiembroYaEliminadoError; hay una sola fila de auditoría

### BEH-S09-010
- cubre: REQ-S09-018, REQ-S09-025
- categoria: concurrencia
- dado: un miembro ACTIVO, una eliminación y un registrarPago simultáneos, con una barrera que fija quién toma el bloqueo primero
- cuando: se ejecutan una vez con cada orden
- entonces: si el cobro va primero, el pago queda con creadoEn anterior a bajaEn y el miembro termina en BAJA; si la eliminación va primero, el cobro lanza MiembroEliminadoError y no existe ningún pago con creadoEn posterior a bajaEn

### BEH-S09-011
- cubre: REQ-S09-018, REQ-S09-026
- categoria: concurrencia
- dado: un miembro ACTIVO con un vencimiento vigente, una eliminación y un cambiarPlan simultáneos, con una barrera que fija quién toma el bloqueo primero
- cuando: se ejecutan una vez con cada orden
- entonces: si el cambio va primero se confirma con su pago anterior a bajaEn y luego el miembro queda en BAJA; si la eliminación va primero, cambiarPlan lanza MiembroEliminadoError y no escribe nada

### BEH-S09-012
- cubre: REQ-S09-018
- categoria: concurrencia
- dado: un miembro eliminado, una restauración y una eliminación simultáneas, con una barrera que fija quién toma el bloqueo primero
- cuando: se ejecutan una vez con cada orden
- entonces: si restaura primero, el miembro queda ACTIVO y luego la eliminación tiene éxito, con estado final BAJA; si elimina primero, la eliminación lanza MiembroYaEliminadoError y la restauración tiene éxito, con estado final ACTIVO

### BEH-S09-013
- cubre: REQ-S09-019
- categoria: error
- dado: una transacción de eliminar que espera el bloqueo del miembro más de 5 segundos y otra que se prolonga más de 20 segundos, con el tiempo simulado
- cuando: vencen los plazos
- entonces: ambas se cancelan y revierten sin cambiar el miembro ni escribir auditoría

### BEH-S09-014
- cubre: REQ-S09-020, REQ-S09-021, REQ-S09-022, REQ-S09-023
- categoria: feliz
- dado: un miembro ACTIVO y uno eliminado, y ambos con un check-in de hoy
- cuando: se piden listarMiembros sin estado y con estado BAJA, GET api/miembros, el selector de /cobros, listarEnSala, listarHistorialSala y /miembros con y sin el filtro «Eliminados», con un usuario con MIEMBROS VER y otro sin él
- entonces: sin estado y en el selector, la API y /miembros solo aparece el ACTIVO; con estado BAJA y con el filtro solo aparece el eliminado, y solo para quien tiene MIEMBROS VER; en sala y su historial excluyen al eliminado

### BEH-S09-015
- cubre: REQ-S09-024
- categoria: error
- dado: un miembro eliminado con DNI 12345678 y un miembro eliminado con código de socio 0007
- cuando: el kiosco registra un check-in con "12345678" y con "0007"
- entonces: ambos lanzan MiembroNoEncontradoError y no se registra acceso

### BEH-S09-016
- cubre: REQ-S09-025, REQ-S09-026, REQ-S09-027
- categoria: error
- dado: un miembro eliminado con un vencimiento vigente, y un cobro previo con el cobroId C1 hecho antes de eliminarlo
- cuando: se ejecuta registrarPago y cambiarPlan con el miembro eliminado y un cobroId nuevo, y se repite el cobro con C1
- entonces: los dos primeros lanzan MiembroEliminadoError sin escribir nada y la repetición con C1 devuelve el resultado original sin crear otro pago

### BEH-S09-017
- cubre: REQ-S09-028
- categoria: error
- dado: un miembro eliminado
- cuando: se llama a actualizarMiembro y al PATCH de api/miembros/[id] con un cambio de nombre
- entonces: ambos lanzan MiembroEliminadoError (409 en la ruta) y no escriben nada

### BEH-S09-018
- cubre: REQ-S09-029, REQ-S09-030
- categoria: feliz
- dado: un miembro eliminado cuyo último pago de 120.00 es del día de hoy
- cuando: el socio anula ese pago y se pide el reporte del día
- entonces: la anulación se permite y el reporte incluye el pago, anulado, con el nombre del miembro

### BEH-S09-019
- cubre: REQ-S09-031
- categoria: error
- dado: un miembro eliminado con DNI 12345678
- cuando: el socio da de alta a un miembro nuevo con ese DNI
- entonces: se lanza DocumentoDuplicadoError con el mensaje de que existe un miembro eliminado con ese documento y que puede restaurarse

### BEH-S09-020
- cubre: REQ-S09-032
- categoria: error
- dado: un miembro eliminado, un ACTIVO y un miembro inexistente
- cuando: se provocan MiembroYaEliminadoError, MiembroNoEliminadoError y MiembroEliminadoError desde api/miembros y desde las acciones del panel
- entonces: la ruta responde 409 con el mensaje en español y las acciones devuelven ese mensaje; ninguno cae en un error 500 ni se pierde

### BEH-S09-021
- cubre: REQ-S09-033, REQ-S09-034
- categoria: feliz
- dado: el árbol final
- cuando: se buscan el método y los archivos retirados y las llamadas de borrado (`delete` y `deleteMany`) sobre pago, suscripción, check-in, cambio de plan y miembro en los casos de uso y los repositorios
- entonces: no existe ninguno

### BEH-S09-022
- cubre: REQ-S09-035
- categoria: error
- dado: peticiones al PATCH de api/miembros/[id] con el campo activo, con estado, con un campo desconocido y con campos válidos
- cuando: se ejecutan como socio
- entonces: las tres primeras responden 400 sin modificar el miembro y la última se procesa

### BEH-S09-023
- cubre: REQ-S09-036, REQ-S09-037, REQ-S09-038
- categoria: feliz
- dado: la ficha de un miembro ACTIVO y la de uno eliminado
- cuando: el socio las abre y pulsa «Eliminar» y «Restaurar»
- entonces: la primera ofrece «Eliminar» con una confirmación que dice que el miembro deja de aparecer y que sus pagos se conservan, con campo de motivo opcional; la segunda se muestra de solo lectura, con «Restaurar» y sin acciones de edición, de cobro ni de cambio de plan; las pantallas de miembros llaman «Eliminado» al estado y no dicen «dar de baja», «inactivo» ni «quitar del sistema»

### BEH-S09-024
- cubre: REQ-S09-040, REQ-S09-041
- categoria: error
- dado: un archivo por cada uno de los ocho términos de REQ-S09-040
- cuando: se ejecuta tools/verificar-miembro.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S09-025
- cubre: REQ-S09-042
- categoria: error
- dado: un pull request que agrega eliminarConHistorial en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-miembro.mjs falla y queda en rojo

### BEH-S09-026
- cubre: REQ-S09-014
- categoria: feliz
- dado: una unidad de trabajo con un repositorio de auditoría de prueba
- cuando: eliminarMiembro escribe la fila de auditoría y una falla inyectada ocurre justo después
- entonces: el puerto de auditoría de IUnidadDeTrabajo recibe la fila y, al fallar, no quedan ni la fila de auditoría ni el cambio de estado

## 3. Invariantes

### INV-S09-001
- propiedad: ningún caso de uso borra filas de Pago, Suscripcion, CheckIn, CambioPlanAuditoria ni Miembro, y los importes, las fechas, los datos personales, el plan, el entrenador y las suscripciones son iguales antes y después de eliminar y restaurar
- mecanismo: test-propiedad
- deteccion: 200 secuencias de eliminar, restaurar y cobros generadas con semilla fija; tras cada paso el conteo de filas de esas cinco tablas, los importes por pago y los datos del miembro deben ser iguales o crecer solo por cobros nuevos
- protege: REQ-S09-010, REQ-S09-011, REQ-S09-034

### INV-S09-002
- propiedad: el estado y los datos de baja son coherentes: BAJA exactamente cuando hay bajaEn y bajaPorId, y un ACTIVO no tiene datos de baja
- mecanismo: restriccion-bd
- deteccion: CHECK sobre estado, bajaEn, bajaPorId y bajaMotivo; las cuatro inserciones inválidas de BEH-S09-001 fallan
- protege: REQ-S09-003

### INV-S09-003
- propiedad: un miembro eliminado nunca recibe un cobro ni un cambio de plan posteriores a su eliminación
- mecanismo: transaccion
- deteccion: las pruebas de concurrencia de BEH-S09-010 y BEH-S09-011 y los rechazos de BEH-S09-016 comprueban que, tras bajaEn, no existe ningún pago con creadoEn posterior para el miembro
- protege: REQ-S09-018, REQ-S09-025, REQ-S09-026

### INV-S09-004
- propiedad: los términos retirados no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-miembro.mjs termina con código distinto de cero y lista archivo:línea y término de cada coincidencia
- protege: REQ-S09-040, REQ-S09-041

## 4. Criterios de aceptación

### AC-S09-001
- enlaza: REQ-S09-001, REQ-S09-002, REQ-S09-003, REQ-S09-004, BEH-S09-001, INV-S09-002
- metodo: sql
- procedimiento: consultar las columnas y claves de Miembro en la base creada con el esquema final e insertar un ACTIVO con bajaEn, un ACTIVO con bajaMotivo, un BAJA sin bajaEn y un BAJA sin bajaPorId
- esperado: existen estado con valor por defecto ACTIVO y las columnas de baja, no existe activo, bajaPorId apunta a UsuarioAdmin sin cascada y las cuatro inserciones se rechazan
- test: pendiente

### AC-S09-002
- enlaza: REQ-S09-005, REQ-S09-006, REQ-S09-007, REQ-S09-039, BEH-S09-002, BEH-S09-003
- metodo: integracion
- procedimiento: con un repositorio que cuenta sus lecturas y escrituras, llamar a los dos casos de uso y a las dos acciones del panel con un usuario sin MIEMBROS ELIMINAR y, con permiso, con un identificador inexistente
- esperado: sin permiso se rechazan con 0 lecturas y 0 escrituras del miembro y la acción llama primero a la guarda; el identificador inexistente lanza MiembroNoEncontradoError sin escribir
- test: pendiente

### AC-S09-003
- enlaza: REQ-S09-008, REQ-S09-009, REQ-S09-010, REQ-S09-011, REQ-S09-012, REQ-S09-013, REQ-S09-015, REQ-S09-016, REQ-S09-017, BEH-S09-004, BEH-S09-005, BEH-S09-006, BEH-S09-007, BEH-S09-008, INV-S09-001
- metodo: integracion
- procedimiento: ejecutar eliminar y restaurar contra una base efímera con el miembro de BEH-S09-004, los motivos de BEH-S09-005 y los casos de error, y las 200 secuencias generadas con semilla fija
- esperado: los estados, las filas conservadas, los datos intactos, la auditoría (entidad, campo, valores, motivo, usuario y fecha en la misma transacción), la validación del motivo y los errores coinciden con los valores de esos comportamientos, y el conteo de filas e importes se conserva en las secuencias
- test: pendiente

### AC-S09-004
- enlaza: REQ-S09-014, BEH-S09-026
- metodo: integracion
- procedimiento: ejecutar eliminarMiembro con una unidad de trabajo cuyo puerto de auditoría es un doble que registra las filas y con una falla inyectada tras escribir la auditoría
- esperado: el doble recibe la fila y, con la falla, no queda ni la fila de auditoría ni el cambio de estado
- test: pendiente

### AC-S09-005
- enlaza: REQ-S09-018, REQ-S09-019, REQ-S09-025, REQ-S09-026, BEH-S09-009, BEH-S09-010, BEH-S09-011, BEH-S09-012, BEH-S09-013, INV-S09-003
- metodo: integracion
- procedimiento: con una barrera que fija qué transacción toma el bloqueo primero, lanzar con Promise.all dos eliminaciones, una eliminación con un registrarPago y con un cambiarPlan en cada orden, y una restauración con una eliminación en cada orden; simular el tiempo para los plazos de 5 y 20 segundos
- esperado: los resultados, los estados finales y las comparaciones de creadoEn con bajaEn son los de esos comportamientos, con una sola fila de auditoría por operación confirmada y sin pagos posteriores a bajaEn; las transacciones vencidas se revierten
- test: pendiente

### AC-S09-006
- enlaza: REQ-S09-020, REQ-S09-021, REQ-S09-022, REQ-S09-023, REQ-S09-024, BEH-S09-014, BEH-S09-015
- metodo: integracion
- procedimiento: con un miembro ACTIVO y uno eliminado con check-ins de hoy, llamar a listarMiembros sin estado y con BAJA, a GET api/miembros, a la consulta del selector de /cobros, a listarEnSala, a listarHistorialSala y a registrarCheckIn por documento y por código, con un usuario con MIEMBROS VER y otro sin él
- esperado: las consultas devuelven los miembros indicados en BEH-S09-014 desde el servidor, el filtro de eliminados exige MIEMBROS VER y los dos check-ins lanzan MiembroNoEncontradoError sin registrar acceso
- test: pendiente

### AC-S09-007
- enlaza: REQ-S09-025, REQ-S09-026, REQ-S09-027, REQ-S09-028, REQ-S09-029, REQ-S09-030, REQ-S09-031, BEH-S09-016, BEH-S09-017, BEH-S09-018, BEH-S09-019, INV-S09-003
- metodo: integracion
- procedimiento: con un miembro eliminado, ejecutar registrarPago y cambiarPlan con un cobroId nuevo y repetir un cobro previo, llamar a actualizarMiembro y al PATCH con un cambio de nombre, anular el último pago, pedir el reporte del día y dar de alta un miembro con el documento del eliminado
- esperado: los resultados, mensajes y conteos son los de esos comportamientos y los conteos de check-ins y de pagos del eliminado no aumentan
- test: pendiente

### AC-S09-008
- enlaza: REQ-S09-032, BEH-S09-020
- metodo: integracion
- procedimiento: provocar los tres errores de miembro desde api/miembros y desde las acciones del panel
- esperado: la ruta responde 409 con el mensaje en español, las acciones devuelven el mismo mensaje y ningún caso termina en un error 500
- test: pendiente

### AC-S09-009
- enlaza: REQ-S09-033, REQ-S09-034, REQ-S09-035, BEH-S09-021, BEH-S09-022
- metodo: integracion
- procedimiento: buscar con la API de typescript el método y los archivos retirados, buscar las llamadas de borrado sobre las cinco tablas en los casos de uso y los repositorios, y llamar al PATCH de api/miembros/[id] con activo, con estado, con un campo desconocido y con campos válidos
- esperado: nada de lo retirado existe, no hay llamadas de borrado, las tres primeras peticiones responden 400 sin modificar el miembro y la última se procesa
- test: pendiente

### AC-S09-010
- enlaza: REQ-S09-036, REQ-S09-037, REQ-S09-038, BEH-S09-023
- metodo: manual
- procedimiento: como socio, abrir la ficha de un miembro ACTIVO y pulsar «Eliminar» con y sin motivo; abrir la de uno eliminado y comprobar que es de solo lectura y pulsar «Restaurar»; revisar los textos de las pantallas de miembros
- esperado: la confirmación dice que el miembro deja de aparecer y que sus pagos se conservan, la ficha del eliminado no ofrece edición, cobro ni cambio de plan, «Restaurar» devuelve al miembro y no aparece «dar de baja», «inactivo» ni «quitar del sistema» en las pantallas de miembros
- test: pendiente

### AC-S09-011
- enlaza: REQ-S09-040, REQ-S09-041, BEH-S09-024, INV-S09-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-miembro.mjs con un árbol por cada uno de los ocho términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los ocho términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S09-012
- enlaza: REQ-S09-042, BEH-S09-025
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue eliminarConHistorial en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-miembro.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de lo que se conserva (listar, editar y cobrar un miembro); (2) `tools/verificar-miembro.mjs` y sus pruebas, con todos los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) esquema aditivo: `Miembro.estado`, `bajaEn`, `bajaPorId` con su clave foránea sin cascada, `bajaMotivo` y su CHECK, manteniendo `activo` (con verificación de que `drizzle-kit push` crea el CHECK; SQL de respaldo en S-15 si no); (4) el puerto de auditoría de `IUnidadDeTrabajo` y su repositorio, con su suite de contrato; (5) pruebas de integración y de concurrencia de `eliminarMiembro` y `restaurarMiembro` y de la propiedad de INV-S09-001, y su implementación junto al borrado viejo; (6) migrar los lectores en el mismo commit que sus pruebas: `listarMiembros` con estado, `listarEnSala`, `listarHistorialSala`, `registrarCheckIn`, `registrarPago`, `cambiarPlan`, `actualizarMiembro`, `crearMiembro` y el `PATCH`, con la traducción de errores a 409; (7) acciones y pantallas: «Eliminar», «Restaurar», filtro «Eliminados» y ficha de solo lectura; (8) retirar `eliminarConHistorial`, el borrado de `EliminarMiembro`, `BotonQuitarMiembro`, `EstadoToggle`, `darDeBajaAction`, `reactivarAction` y la columna `activo`, con las pruebas del borrado viejo (se retiran porque el comportamiento que prueban se elimina por orden del propietario, ADR-013), achicando las exenciones en el mismo commit. Entre los pasos 3 y 8 `activo` y `estado` conviven: los lectores migrados en el paso 6 leen `estado` y la acción vieja `darDeBajaAction` se retira recién en el paso 8, de modo que no queda un camino que escriba solo `activo` después de ese paso.
- Las pruebas de concurrencia usan semillas fijas, una base efímera y una barrera que fija el orden en que las transacciones toman el bloqueo; no hay dependencias nuevas.
- El criterio AC-S09-010 y AC-S09-012 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador); los filtros de listados se prueban en los casos de uso y los repositorios, no en el navegador.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15); no existen miembros con `activo` en falso.
- **Enmiendas que se registran al aprobar S-09:**
  - ADR-013: la Decisión 2 y la Decisión 5 quedan sin efecto (ya anotado), y también los textos de «Cómo se valida», «Reversibilidad» y «Dependencias» que nombran la anonimización; ADR-004:42 pierde la dependencia por «anonimización del documento».
  - `docs/constitution.md` C-19, `docs/07-plan-implementacion-roadmap.md` tarea 1.15, `docs/10-prompt-claude-code.md:45`, `docs/08-decisiones-pendientes.md:61` y `docs/superpowers/COBERTURA-RF.md` (RF-04, RF-12, RNF-05): nota de que la anonimización se descartó y de que S-09 es «Eliminar miembro».
  - S-06: SUP-S06-011 queda cumplido por REQ-S09-031, y 0.3 y 5.2 (el «valor anonimizado») dejan de aplicar.
  - S-07: SUP-S07-016 deja de admitir cambio de plan de un miembro eliminado; REQ-S07-016 (orden de validación) y REQ-S07-021 (errores) suman `MiembroEliminadoError` (REQ-S09-026, REQ-S09-027).
  - S-04: REQ-S04-005 suma `MiembroEliminadoError`; la secuencia de `registrarPago` de 5.1 sitúa su rechazo (REQ-S09-027); REQ-S04-032 y `IUnidadDeTrabajo` exponen el puerto de auditoría (REQ-S09-014); `anularPago` permite a un eliminado (REQ-S09-029).
  - S-08: el riesgo sobre ADR-013 de 5.3 queda resuelto (los pagos se conservan) y el selector de miembro de `/cobros` excluye a los eliminados (REQ-S09-021).
  - S-01: REQ-S01-012 (permisos en los casos de uso), REQ-S01-029 (la tabla de permisos) y REQ-S01-014 (guarda en cada acción) suman eliminar y restaurar con `MIEMBROS ELIMINAR`, y REQ-S01-016 exige que el `PATCH` rechace campos extra.
  - S-22: REQ-S22-016, BEH-S22-008 y AC-S22-014 suman un enum (`EstadoMiembro`); REQ-S22-007 y AC-S22-003 suman el repositorio de auditoría y su suite de contrato.
  - `docs/06-modelo-datos-cambios.md` (línea de `Miembro`): nota del estado y las columnas de baja.
- **Traspasos:** S-13 (consentimiento y derechos sobre los datos), S-14 (los reportes de morosos, por vencer e ingresos deben contar a los eliminados como se indica), S-15 (CHECK de respaldo), S-21 (mensaje del kiosco), S-23 (permiso y rol único) y la retención programada (P-20) a una spec futura si el propietario fija el plazo.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Sin anonimización no se puede atender una solicitud de supresión de datos personales (derecho de cancelación de la Ley 29733): los datos de un miembro eliminado se conservan indefinidamente. Es una decisión del propietario (2026-11-12); riesgo legal aceptado hasta que S-13 o el abogado lo revisen.
- Sin plazo de retención (P-20) todo se conserva sin límite. Mitigación: SUP-S09-007 y la pregunta abierta.
- Un documento mal digitado en un eliminado queda ocupado: solo se libera restaurando y editando; el código de socio «mayor más uno» (S-06) tampoco se reutiliza, así que el espacio de 4 dígitos se consume. Mitigación: es un uso poco frecuente en un solo local.
- Un check-in simultáneo a la eliminación puede registrarse justo antes de que se confirme (SUP-S09-010).
- Una página abierta con el formulario de cobro cuando se elimina al miembro mostrará el error de miembro eliminado al enviar (REQ-S09-025, REQ-S09-032).
- La palabra «Eliminar» para algo reversible puede confundir al personal; la confirmación explica que los pagos se conservan y existe «Restaurar».
- `RegistroAuditoria` no tiene uso en el heredado; el riesgo es que su diseño (campo de texto y motivo obligatorio) no alcance para auditar. Mitigación: guarda entidad, campo, estado anterior y nuevo y motivo.
- El texto de `docs/constitution.md` C-19 contradice a S-09 hasta que se enmiende (5.2).
- Las cifras de 0.4 cambian cuando S-00 a S-08 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Un miembro eliminado se puede restaurar, con el mismo permiso que eliminar? Default: sí (SUP-S09-002).
- ¿Cobrar o cambiar el plan de un miembro eliminado se rechaza, pero anular sus pagos sí se permite? Default: sí (SUP-S09-005).
- ¿El motivo de eliminar y restaurar es opcional, con máximo de 200 caracteres? Default: sí (SUP-S09-004).
- ¿Qué plazo de retención fijan el contador o el abogado para borrar físicamente (P-20)? Default: sin plazo hasta que se defina (SUP-S09-007).

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura), que recibió únicamente la ruta y la lista de comprobación. Veredicto sobre la versión `a8506df` (la segunda: la primera, con anonimización, se descartó por orden del propietario antes de su revisión); cada fila se resume y el veredicto global se conserva tal como lo entregó. El revisor usó `Read`, `Grep` y `Glob`, reprodujo los conteos de 0.4 y no encontró «TBD», «por definir» ni «etc.».

> | # | Comprobación | Veredicto | Qué corregir (resumen del revisor) |
> |---|---|---|---|
> | 1 | Cabecera y ADRs | CUMPLE (con sugerencias) | Sumar ADR-012 y S-02. |
> | 2 | REQ: una obligación, EARS, origen | NO CUMPLE (menor) | Partir REQ-003, 004, 006, 007, 011, 012, 015, 021, 024; REQ-019 nombra un símbolo que no existe; REQ-023 sin acotar (existen «Inactivo» en planes, productos y métodos de pago); orígenes de restaurar y de REQ-006; el CHECK no cubre `bajaPorId` y `bajaMotivo`; faltan los valores de `entidad` y `campo`; faltan REQ para miembro inexistente, motivo, edición y cobro desde la ficha de un eliminado. |
> | 3 | Cobertura | NO CUMPLE | BEH-010 mal formulado y tautológico; BEH-009 sin criterio medible; INV-003 sobreafirma sin mecanismo para el check-in; falta concurrencia con `cambiarPlan`; faltan bordes y errores (inexistente, motivo en blanco o largo, suscripción vigente, en sala, restaurar vencido). |
> | 4 | AC binarios; lo esperado existe | NO CUMPLE (menor) | AC-003 a AC-005 no son autocontenidos; los filtros están en el cliente y no se pueden probar sin navegador; AC-006 busca un símbolo inexistente; AC-007 falla contra «inactivo» legítimo; no hay puerto de auditoría ni en el Repo A ni en S-04. |
> | 5 | Hechos de 0.4 | NO CUMPLE (menor) | `schema.prisma:164` es `fechaVencimiento` (`activo` está en `:165`); `BotonQuitarMiembro.tsx:13-16`; `PrismaMemberRepository.ts:113-122`; `EstadoToggle` también en comentarios; S-08 no incluye por sí sola a los eliminados en el reporte; falta declarar el alcance de los conteos y `clonarSedePrincipalAZipGym.ts` para `RegistroAuditoria`. |
> | 6 | Hechos incompletos que afectan al diseño | NO CUMPLE | `listarMiembros` alimenta cuatro consumidores; `listarEnSala` y `listarHistorialSala`; el selector de venta de producto es el del fiado que S-08 elimina; el respaldo y la idempotencia de `registrarCheckIn`; traducción de errores; edición y ficha de un eliminado; `ListarPagos`; los scripts de `packages/db`; la entidad y los dobles de `IMemberRepository`. |
> | 7 | Supuestos y preguntas | NO CUMPLE (menor) | Faltan supuestos implícitos: permiso de restaurar, qué no toca eliminar, motivo de restauración y su longitud, tipo de `bajaEn`, quién ve «Eliminados», `cobroId` repetido tras eliminar. |
> | 8 | Contradicciones con ADR y specs | NO CUMPLE | Textos que aún nombran la anonimización (`constitution.md` C-19, `docs/07`, `docs/10`, `docs/08`, ADR-004:42, COBERTURA-RF); falta el orden de validación frente a `cobroId`, los plazos de 20 y 5 segundos, `zod` estricto en el PATCH y las guardas de S-01 en las acciones; S-06 espera un «valor anonimizado»; REQ-S22-004 es un ID incorrecto. |
> | 9 | Alcance | NO CUMPLE (menor) | Faltan traspasos a S-14 (morosos, por vencer e ingresos), S-10 y S-21 (mensaje del kiosco). |
> | 10 | Viabilidad | NO CUMPLE | El paso 3 del plan necesita el esquema del paso 4; faltan los plazos; el borrado de pruebas del borrado viejo no se declara; conviven `activo` y `estado` entre pasos; el check-in no se cubre. |
> | 11 | Riesgos omitidos | NO CUMPLE (menor) | Carrera check-in contra eliminación, documento mal digitado ocupado y código de socio consumido, errores sin traducir, `cobroId` repetido tras eliminar, formularios abiertos, motivo sin límite, clave foránea de `bajaPorId`, la etiqueta «Eliminar» para algo reversible y C-19. |
> | 12 | Enmiendas a specs aprobadas | NO CUMPLE | Sin IDs de requisito y tres inexactas; sumar ADR-013 (varias secciones), ADR-004:42, C-19, `docs/07`, `docs/10`, `docs/08` y COBERTURA-RF; S-06 (`S06:29,701,711,720`); S-07 (REQ-S07-016, REQ-S07-021); S-04 (REQ-S04-005, secuencia 5.1, `IUnidadDeTrabajo`); S-08 (`S08:785`); S-01 (REQ-S01-012, REQ-S01-029, REQ-S01-014); S-22 (REQ-S22-016, REQ-S22-007 en lugar de REQ-S22-004). |
>
> **VEREDICTO GLOBAL: REQUIERE CAMBIOS.**

### Conciliación del autor
Todos los hallazgos se verificaron contra el Repo A y las specs y resultaron ciertos; ninguno se rechazó. Verificados con `grep` y `Read`: `Miembro.activo` en `schema.prisma:165`, la ausencia de `activo` en `RegistrarCheckIn`, los consumidores de `listarMiembros`, los dos métodos de `ListarEnSala`, que `ModalVenderProducto.tsx:317` es el buscador del fiado, la mención de la anonimización en `constitution.md` C-19, `docs/07`, `docs/10`, `docs/08`, ADR-004:42 y COBERTURA-RF, y los IDs REQ-S04-005, REQ-S04-032, REQ-S04-044, REQ-S01-012 y REQ-S01-014.

- Fila 1 y 2: `adrs` suma ADR-012 y `depende_de` suma S-02; los REQ se rehicieron (42 en total) con una obligación cada uno: permisos de eliminar y restaurar separados, `MiembroNoEncontradoError`, el CHECK que cubre las tres columnas de baja, la clave foránea sin cascada, los valores de la auditoría, el motivo y su límite, el filtro de `listarMiembros`, el rechazo en `registrarPago`, `cambiarPlan` y `actualizarMiembro`, y la ficha de solo lectura. REQ-S09-033 y REQ-S09-034 usan símbolos reales y la prohibición de borrar filas; REQ-S09-038 se acota a las pantallas de miembros.
- Fila 3: BEH-S09-012 reescrito con los dos órdenes y sus estados finales; BEH-S09-010 y BEH-S09-011 miden `creadoEn` contra `bajaEn`; INV-S09-003 se acota a cobros y cambio de plan, y la carrera con el check-in se acepta en SUP-S09-010; nuevos BEH de miembro inexistente, motivos en blanco y de 200 y 201 caracteres, restaurar con vencimiento ya vencido, plazos de 20 y 5 segundos y concurrencia con `cambiarPlan`.
- Fila 4: cada AC enumera sus valores; los filtros se prueban en los casos de uso y repositorios; se declara el puerto de auditoría (REQ-S09-014, BEH-S09-026, AC-S09-004); las lecturas se cuentan con un repositorio que cuenta.
- Fila 5 y 6: 0.4 corrige las citas y suma los consumidores de `listarMiembros`, `listarEnSala` y su historial, el buscador del fiado, la traducción de errores, el check-in, la clave foránea y los textos que nombran la anonimización; el selector de venta de producto sale de los requisitos porque S-08 elimina el fiado.
- Fila 7: nuevos SUP-S09-008 a SUP-S09-011 (qué no toca eliminar, tipo de `bajaEn` y quién ve «Eliminados», carrera con el check-in y orden frente a `cobroId`); el permiso de restaurar y el motivo se explicitan en SUP-S09-002 y SUP-S09-004.
- Fila 8, 9, 11 y 12: 5.2 lista las enmiendas con IDs verificados, entre ellas REQ-S22-016 y REQ-S22-007 en lugar de REQ-S22-004; 0.3 y 5.2 agregan los traspasos a S-14, S-10 y S-21; 5.3 suma los riesgos omitidos.
- Fila 10: el plan se rehízo en ocho pasos con el esquema antes de las pruebas de integración, el puerto de auditoría aparte, los plazos heredados (REQ-S09-019) y la justificación de retirar las pruebas del borrado viejo.
- Lo que no se pudo verificar y queda marcado «no verificado»: que los scripts de `packages/db` que leen `activo` no se importen (S-00 los excluye).
