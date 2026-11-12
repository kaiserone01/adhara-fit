---
id: S-09
estado: borrador
adrs: ADR-004, ADR-010, ADR-013, ADR-016, ADR-022
depende_de: S-00, S-01, S-04, S-05, S-06, S-07, S-08, S-22
aprobada_por:
fecha_aprobacion:
---
# S-09 — Eliminar miembro: la baja lógica que oculta al miembro y conserva sus pagos

## 0. Contexto y alcance

### 0.1 Problema
El código heredado tiene dos formas de sacar a un miembro: un interruptor «Dar de baja»/«Reactivar» (`Miembro.activo`) que ni siquiera impide el check-in y que cualquiera con sesión puede usar, y «Quitar del sistema» (`eliminarConHistorial`), que borra en una transacción los check-ins, la auditoría de cambios de plan, las deudas, los pagos, las suscripciones y el miembro, con lo que los pagos desaparecen de los reportes. ADR-013 (aceptado, con la denominación «Eliminar» en pantalla) decide una baja lógica que conserva los pagos. S-09 ejecuta esa decisión y cierra los huecos que dejaron S-06, S-07 y S-08 (documento que sigue ocupado, cobros a un miembro eliminado, listados). El propietario descartó la anonimización de datos personales que ADR-013 preveía a pedido (2026-11-12): no se implementa.

### 0.2 Dentro de alcance
- `Miembro.estado` (`ACTIVO` o `BAJA`, «Eliminado» en pantalla) con `bajaEn`, `bajaPorId` y `bajaMotivo`, que reemplaza a `Miembro.activo`.
- Casos de uso `eliminarMiembro` y `restaurarMiembro`, con permiso `MIEMBROS ELIMINAR`, bloqueo del miembro (S-04) y registro en `RegistroAuditoria`.
- Retiro de `eliminarConHistorial`, `EliminarMiembro` (el borrado), `BotonQuitarMiembro`, `EstadoToggle`, `darDeBajaAction`, `reactivarAction` y el campo `activo` del `PATCH` de miembros.
- Efecto de «Eliminado» en el resto del sistema: listados y selectores, kiosco, cobros y cambio de plan, alta con un documento ocupado, reportes.
- Pantallas: botón «Eliminar» con su confirmación, filtro «Eliminados» y «Restaurar».
- `tools/verificar-miembro.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- La anonimización de los datos personales a pedido (ADR-013 Decisión 2) y la conservación de los check-ins solo agregados (Decisión 5): el propietario las descartó el 2026-11-12. Un miembro eliminado conserva todos sus datos.
- El borrado físico por una tarea de retención programada tras el plazo que fije el contador o el abogado (ADR-013 Decisión 3, P-20 sin responder): no se implementa y ningún caso de uso borra pagos.
- Consentimiento y aviso legal: S-13.
- Permisos por módulo y rol único: S-23.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del Repo A original, no del árbol que S-09 recibirá después de S-00 a S-08 y S-22; se recontarán al empezar. Los `grep` excluyen `node_modules`, `generated`, `.next` y `packages/db`, salvo donde se indica.
- **Dos mecanismos:** `Miembro.activo` es una baja lógica con comentario «baja lógica del miembro» (`schema.prisma:164`), la alterna `EstadoToggle.tsx` con `darDeBajaAction` y `reactivarAction` (`miembros/actions.ts:367,386`) y la usan `ListaMiembros.tsx:263,313,381` («Activo»/«Inactivo»); y `eliminarMiembro` (`EliminarMiembro.ts:15-34`) llama a `eliminarConHistorial`, que borra check-ins, auditoría de cambios de plan, deudas, pagos, suscripciones y el miembro en una transacción (`PrismaMemberRepository.ts:113-123`); la pantalla lo ofrece como «Quitar del sistema» con el aviso de que los pagos «dejarán de contar en las cajas y reportes» (`BotonQuitarMiembro.tsx:15-18`) (verificado con `Read`).
- **Sin permiso en la baja:** `darDeBajaAction` y `reactivarAction` llaman a `actualizarMiembro` sin comprobar permiso alguno (`miembros/actions.ts:367-404`); solo `eliminarMiembro` exige `MIEMBROS ELIMINAR` (`EliminarMiembro.ts:19`) (verificado con `Read`).
- **El estado no se aplica:** `RegistrarCheckIn.ts` no lee `activo` (`grep -n activo` sin resultados), de modo que un miembro dado de baja puede registrar acceso; filtran por `activo` solo `caja/page.tsx:118`, `caja/ModalVenderProducto.tsx:317` y `pagos/nuevo/page.tsx:26`; el `PATCH` de miembros acepta `activo` (`api/miembros/[id]/route.ts:81`) (verificado con `grep -n`).
- **Conteos:** `eliminarConHistorial` en 5 archivos, `EliminarMiembro` en 2, `eliminarMiembro` en 4, `BotonQuitar` y `EstadoToggle` en `miembros/` y `reactivar` en 5 (verificado con `grep -rIlF`).
- **Auditoría sin uso:** `RegistroAuditoria` (`schema.prisma:582-593`) tiene `entidad`, `entidadId`, `campo`, `valorAnterior`, `valorNuevo`, `motivo` (obligatorio), `usuarioId` y `createdAt`, y ningún archivo del código la usa (verificado con `grep -rIl RegistroAuditoria`).
- **Interacción con specs aprobadas:** S-06 dejó el documento de un miembro eliminado ocupado a S-09 (SUP-S06-011); S-07 admite cambio de plan de un miembro dado de baja hasta que S-09 lo defina (SUP-S07-016); S-04 usa `bloquearPorId` y `IUnidadDeTrabajo`; S-08 incluye los pagos de miembros eliminados en el reporte y listó el riesgo de ADR-013; S-01 protege las acciones por permiso (verificado con `grep -n` en las specs).
- No verificado: que `ListarEnSala` y los reportes del heredado ignoren el estado del miembro.

### 0.5 Supuestos
- SUP-S09-001: el estado técnico es `BAJA` y en pantalla se llama «Eliminado» (ADR-013, confirmado por el propietario); «dar de baja» deja de usarse. Default: ese nombre; decisión del propietario; asumido, por validar el nombre técnico.
- SUP-S09-002: un miembro eliminado se puede restaurar (la baja lógica es reversible, ADR-013). Default: restaurar permitido; asumido, por validar.
- SUP-S09-003: eliminar y restaurar toman el bloqueo del miembro (S-04) y releen su estado antes de validar; los cobros, el cambio de plan y el check-in rechazan a un miembro eliminado según el estado leído tras el bloqueo. Default: ese mecanismo; asumido, por validar.
- SUP-S09-004: el motivo de la eliminación es opcional; `RegistroAuditoria.motivo` guarda el texto o «sin motivo». Default: opcional; asumido, por validar.
- SUP-S09-005: anular un pago de un miembro eliminado sigue permitido (es una corrección contable); cobrar o cambiar de plan no. Default: ese reparto; asumido, por validar.
- SUP-S09-006: un documento ocupado por un miembro eliminado produce el error de documento duplicado con un mensaje que indica que existe un miembro eliminado con ese documento y que se puede restaurar; el documento no se reutiliza. Default: ese comportamiento; asumido, por validar.
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
- texto: La base deberá rechazar un miembro en estado BAJA sin bajaEn y un miembro ACTIVO con bajaEn.

### REQ-S09-004
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-013
- texto: Si el usuario no tiene el permiso MIEMBROS ELIMINAR entonces eliminarMiembro y restaurarMiembro deberán rechazar la operación sin leer ni escribir datos del miembro.

### REQ-S09-005
- tipo: cuando
- prioridad: MUST
- origen: ADR-013
- texto: Cuando se elimina un miembro ACTIVO, eliminarMiembro deberá dejarlo en estado BAJA con la fecha, el usuario y el motivo de la eliminación.

### REQ-S09-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: Eliminar y restaurar un miembro no deberán borrar ninguna fila de Pago, Suscripcion, CheckIn ni CambioPlanAuditoria, ni modificar sus datos personales.

### REQ-S09-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Cada eliminación y cada restauración deberá registrar una fila de RegistroAuditoria con el miembro, el estado anterior y el nuevo, el motivo, el usuario y la fecha, en la misma transacción.

### REQ-S09-008
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-013
- texto: Si el miembro ya está eliminado entonces eliminarMiembro deberá rechazar la operación con MiembroYaEliminadoError sin escribir nada.

### REQ-S09-009
- tipo: cuando
- prioridad: MUST
- origen: SUP-S09-002
- texto: Cuando se restaura un miembro eliminado, restaurarMiembro deberá dejarlo en estado ACTIVO y vaciar bajaEn, bajaPorId y bajaMotivo.

### REQ-S09-010
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S09-002
- texto: Si el miembro está en estado ACTIVO entonces restaurarMiembro deberá rechazar la operación con MiembroNoEliminadoError sin escribir nada.

### REQ-S09-011
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S09-003
- texto: Los casos de uso eliminarMiembro y restaurarMiembro deberán abrir su transacción y bloquear la fila del miembro mediante IUnidadDeTrabajo y bloquearPorId, y releer el estado del miembro después de tomar el bloqueo.

### REQ-S09-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Los listados de miembros, los selectores de miembro de cobros y de venta de producto, y la lista de en sala deberán excluir a los miembros eliminados.

### REQ-S09-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: La página /miembros deberá ofrecer el filtro «Eliminados» que lista solo los miembros eliminados.

### REQ-S09-014
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-013
- texto: Si el miembro identificado en un check-in está eliminado entonces registrarCheckIn deberá lanzar MiembroNoEncontradoError y no registrar acceso.

### REQ-S09-015
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S09-005
- texto: Si el miembro está eliminado entonces registrarPago y cambiarPlan deberán rechazar la operación con MiembroEliminadoError sin escribir nada.

### REQ-S09-016
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S09-005
- texto: La función anularPago deberá permitir anular los pagos de un miembro eliminado.

### REQ-S09-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-010
- texto: El reporte de cobros de S-08 deberá seguir incluyendo los pagos de los miembros eliminados.

### REQ-S09-018
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S09-006
- texto: Si el documento de un miembro nuevo coincide con el de un miembro eliminado entonces crearMiembro deberá lanzar DocumentoDuplicadoError con un mensaje que indique que existe un miembro eliminado con ese documento y que puede restaurarse.

### REQ-S09-019
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Los símbolos eliminarConHistorial, el borrado de EliminarMiembro, BotonQuitarMiembro, EstadoToggle, darDeBajaAction y reactivarAction no deberán existir.

### REQ-S09-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: El PATCH de api/miembros/[id] no deberá aceptar el campo activo ni el campo estado.

### REQ-S09-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: La ficha del miembro deberá ofrecer la acción «Eliminar» con una confirmación que diga que el miembro deja de aparecer y que sus pagos se conservan, y con un campo opcional de motivo.

### REQ-S09-022
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S09-002
- texto: La ficha de un miembro eliminado deberá ofrecer la acción «Restaurar».

### REQ-S09-023
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S09-001
- texto: Las pantallas deberán llamar «Eliminado» al estado BAJA en lugar de «dar de baja», «inactivo» o «quitar del sistema».

### REQ-S09-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-013
- texto: Las acciones del panel de eliminar y restaurar deberán exigir el permiso MIEMBROS ELIMINAR en su caso de uso y no en la pantalla.

### REQ-S09-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos eliminarConHistorial, BotonQuitarMiembro, darDeBajaAction, reactivarAction, EstadoToggle, «Quitar del sistema», «dado de baja» ni «Miembro reactivado».

### REQ-S09-026
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-miembro.mjs encuentra alguno de los términos de REQ-S09-025, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S09-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-miembro.mjs en cada pull request.

## 2. Comportamiento

### BEH-S09-001
- cubre: REQ-S09-001, REQ-S09-002, REQ-S09-003
- categoria: feliz
- dado: una base con el esquema final
- cuando: se consultan las columnas de Miembro y se insertan un miembro BAJA sin bajaEn y un ACTIVO con bajaEn
- entonces: existen estado (ACTIVO por defecto), bajaEn, bajaPorId y bajaMotivo, no existe activo, y la base rechaza las dos inserciones

### BEH-S09-002
- cubre: REQ-S09-004, REQ-S09-024
- categoria: error
- dado: un usuario sin el permiso MIEMBROS ELIMINAR y un miembro
- cuando: intenta eliminar y restaurar, también desde la acción del panel
- entonces: ambas se rechazan sin leer ni escribir datos del miembro

### BEH-S09-003
- cubre: REQ-S09-005, REQ-S09-006, REQ-S09-007
- categoria: feliz
- dado: un miembro con 3 pagos, 2 suscripciones, 10 check-ins, 1 cambio de plan, nombre, celular y foto
- cuando: el socio lo elimina con el motivo «se mudó»
- entonces: queda en BAJA con bajaEn, bajaPorId y bajaMotivo, conserva las mismas 3 + 2 + 10 + 1 filas y sus datos personales intactos, y existe una fila de RegistroAuditoria con estado ACTIVO a BAJA, el motivo, el usuario y la fecha

### BEH-S09-004
- cubre: REQ-S09-005, REQ-S09-007
- categoria: borde
- dado: un miembro ACTIVO
- cuando: el socio lo elimina sin escribir motivo
- entonces: se elimina y la auditoría guarda «sin motivo»

### BEH-S09-005
- cubre: REQ-S09-008
- categoria: error
- dado: un miembro ya eliminado
- cuando: el socio intenta eliminarlo de nuevo
- entonces: se lanza MiembroYaEliminadoError y no se escribe nada

### BEH-S09-006
- cubre: REQ-S09-009, REQ-S09-007
- categoria: feliz
- dado: un miembro eliminado el día anterior
- cuando: el socio lo restaura
- entonces: queda ACTIVO con bajaEn, bajaPorId y bajaMotivo vacíos, vuelve a los listados y al kiosco, y la auditoría registra el cambio de BAJA a ACTIVO

### BEH-S09-007
- cubre: REQ-S09-010
- categoria: error
- dado: un miembro ACTIVO
- cuando: el socio intenta restaurarlo
- entonces: se lanza MiembroNoEliminadoError y no se escribe nada

### BEH-S09-008
- cubre: REQ-S09-011
- categoria: concurrencia
- dado: un miembro ACTIVO y dos eliminaciones simultáneas
- cuando: terminan las dos transacciones
- entonces: una se confirma y la otra lanza MiembroYaEliminadoError; hay una sola fila de auditoría

### BEH-S09-009
- cubre: REQ-S09-011, REQ-S09-015
- categoria: concurrencia
- dado: un miembro ACTIVO, una eliminación y un registrarPago simultáneos, con una barrera que fija quién toma el bloqueo primero
- cuando: se ejecutan una vez con cada orden
- entonces: si el cobro va primero se registra y luego se elimina; si la eliminación va primero el cobro lanza MiembroEliminadoError; en ambos órdenes no queda un cobro sobre un miembro ya eliminado

### BEH-S09-010
- cubre: REQ-S09-011
- categoria: concurrencia
- dado: un miembro eliminado, una restauración y una eliminación simultáneas
- cuando: terminan las dos transacciones
- entonces: se procesan una tras otra: si restaura primero, eliminar tiene éxito después; si elimina primero, la restauración falla solo si el miembro ya estaba ACTIVO; en ambos casos el estado final coincide con el de la última operación confirmada

### BEH-S09-011
- cubre: REQ-S09-012, REQ-S09-013
- categoria: feliz
- dado: un miembro ACTIVO y uno eliminado
- cuando: se abren /miembros, el selector de cobros, la venta de producto y en sala, y /miembros con el filtro «Eliminados»
- entonces: el eliminado no aparece en las cuatro primeras y es el único que aparece con el filtro

### BEH-S09-012
- cubre: REQ-S09-014
- categoria: error
- dado: un miembro eliminado con DNI 12345678 y un miembro eliminado con código de socio 0007
- cuando: el kiosco registra un check-in con "12345678" y con "0007"
- entonces: ambos lanzan MiembroNoEncontradoError y no se registra acceso

### BEH-S09-013
- cubre: REQ-S09-015
- categoria: error
- dado: un miembro eliminado con un vencimiento vigente
- cuando: se ejecuta registrarPago y cambiarPlan
- entonces: ambos lanzan MiembroEliminadoError y no escriben nada

### BEH-S09-014
- cubre: REQ-S09-016, REQ-S09-017
- categoria: feliz
- dado: un miembro eliminado cuyo último pago de 120.00 es del día de hoy
- cuando: el socio anula ese pago y se pide el reporte del día
- entonces: la anulación se permite y el reporte incluye el pago, anulado, con el nombre del miembro

### BEH-S09-015
- cubre: REQ-S09-018
- categoria: error
- dado: un miembro eliminado con DNI 12345678
- cuando: el socio da de alta a un miembro nuevo con ese DNI
- entonces: se lanza DocumentoDuplicadoError con el mensaje de que existe un miembro eliminado con ese documento y que puede restaurarse

### BEH-S09-016
- cubre: REQ-S09-019, REQ-S09-020
- categoria: feliz
- dado: el árbol final
- cuando: se buscan los símbolos retirados y se llama al PATCH de api/miembros/[id] con los campos activo y estado
- entonces: los símbolos no existen y el PATCH responde 400 a ambos campos sin modificar el miembro

### BEH-S09-017
- cubre: REQ-S09-021, REQ-S09-022, REQ-S09-023
- categoria: feliz
- dado: la ficha de un miembro ACTIVO y la de uno eliminado
- cuando: el socio las abre y pulsa «Eliminar» y «Restaurar»
- entonces: la primera ofrece «Eliminar» con una confirmación que dice que el miembro deja de aparecer y que sus pagos se conservan, con campo de motivo opcional; la segunda ofrece «Restaurar»; el estado se llama «Eliminado» y ninguna pantalla dice «dar de baja», «inactivo» ni «quitar del sistema»

### BEH-S09-018
- cubre: REQ-S09-025, REQ-S09-026
- categoria: error
- dado: un archivo por cada uno de los ocho términos de REQ-S09-025
- cuando: se ejecuta tools/verificar-miembro.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S09-019
- cubre: REQ-S09-027
- categoria: error
- dado: un pull request que agrega eliminarConHistorial en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-miembro.mjs falla y queda en rojo

## 3. Invariantes

### INV-S09-001
- propiedad: ningún caso de uso borra filas de Pago, Suscripcion, CheckIn ni CambioPlanAuditoria de un miembro, y los importes, las fechas y los datos personales son iguales antes y después de eliminar y restaurar
- mecanismo: test-propiedad
- deteccion: 200 secuencias de eliminar, restaurar y cobros generadas con semilla fija; tras cada paso el conteo de filas de esas cuatro tablas, los importes por pago y los datos personales deben ser iguales o crecer solo por cobros nuevos
- protege: REQ-S09-006

### INV-S09-002
- propiedad: el estado y la fecha de baja son coherentes: BAJA exactamente cuando hay bajaEn
- mecanismo: restriccion-bd
- deteccion: CHECK sobre estado y bajaEn; las dos inserciones inválidas de BEH-S09-001 fallan
- protege: REQ-S09-003

### INV-S09-003
- propiedad: un miembro eliminado nunca registra un check-in ni recibe un cobro nuevo
- mecanismo: transaccion
- deteccion: la prueba de concurrencia de BEH-S09-009 y los rechazos de BEH-S09-012 y BEH-S09-013 comprueban que, tras eliminar, el número de check-ins y de pagos del miembro no aumenta
- protege: REQ-S09-011, REQ-S09-014, REQ-S09-015

### INV-S09-004
- propiedad: los términos retirados no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-miembro.mjs termina con código distinto de cero y lista archivo:línea y término de cada coincidencia
- protege: REQ-S09-025, REQ-S09-026

## 4. Criterios de aceptación

### AC-S09-001
- enlaza: REQ-S09-001, REQ-S09-002, REQ-S09-003, BEH-S09-001, INV-S09-002
- metodo: sql
- procedimiento: consultar las columnas de Miembro en la base creada con el esquema final e insertar un miembro BAJA sin bajaEn y un ACTIVO con bajaEn
- esperado: existen estado con valor por defecto ACTIVO y las columnas de baja, no existe activo, y las dos inserciones se rechazan
- test: pendiente

### AC-S09-002
- enlaza: REQ-S09-004, REQ-S09-024, BEH-S09-002
- metodo: integracion
- procedimiento: con un usuario sin MIEMBROS ELIMINAR, llamar a los dos casos de uso y a las dos acciones del panel contando las filas leídas y escritas
- esperado: se rechazan sin leer ni escribir datos del miembro
- test: pendiente

### AC-S09-003
- enlaza: REQ-S09-005, REQ-S09-006, REQ-S09-007, REQ-S09-008, REQ-S09-009, REQ-S09-010, BEH-S09-003, BEH-S09-004, BEH-S09-005, BEH-S09-006, BEH-S09-007, INV-S09-001
- metodo: integracion
- procedimiento: ejecutar eliminar y restaurar contra una base efímera con el miembro de BEH-S09-003 y los casos de error, y las 200 secuencias generadas con semilla fija
- esperado: los estados, las filas conservadas, los datos personales intactos, la auditoría con «sin motivo» y los errores coinciden con los comportamientos, y el conteo de filas e importes se conserva en las secuencias
- test: pendiente

### AC-S09-004
- enlaza: REQ-S09-011, REQ-S09-015, BEH-S09-008, BEH-S09-009, BEH-S09-010, INV-S09-003
- metodo: integracion
- procedimiento: con una barrera que fija qué transacción toma el bloqueo primero, lanzar con Promise.all dos eliminaciones, una eliminación con un registrarPago en cada orden, y una restauración con una eliminación
- esperado: los resultados son los de esos comportamientos, con una sola fila de auditoría por operación confirmada y sin cobros sobre un miembro ya eliminado
- test: pendiente

### AC-S09-005
- enlaza: REQ-S09-012, REQ-S09-013, REQ-S09-014, REQ-S09-015, REQ-S09-016, REQ-S09-017, REQ-S09-018, BEH-S09-011, BEH-S09-012, BEH-S09-013, BEH-S09-014, BEH-S09-015, INV-S09-003
- metodo: integracion
- procedimiento: con un miembro ACTIVO y uno eliminado, pedir los listados y selectores y el filtro «Eliminados», registrar check-ins por documento y por código, ejecutar registrarPago y cambiarPlan, anular el último pago del eliminado, pedir el reporte del día y dar de alta un miembro con el documento del eliminado
- esperado: los resultados son los de esos comportamientos y los conteos de check-ins y de pagos del eliminado no aumentan
- test: pendiente

### AC-S09-006
- enlaza: REQ-S09-019, REQ-S09-020, BEH-S09-016
- metodo: integracion
- procedimiento: buscar con la API de typescript los símbolos retirados y llamar al PATCH de api/miembros/[id] con activo, con estado y con campos válidos
- esperado: los símbolos no existen, los dos primeros responden 400 sin modificar el miembro y el tercero se procesa
- test: pendiente

### AC-S09-007
- enlaza: REQ-S09-021, REQ-S09-022, REQ-S09-023, BEH-S09-017
- metodo: manual
- procedimiento: como socio, abrir la ficha de un miembro ACTIVO y pulsar «Eliminar» con y sin motivo; abrir la de uno eliminado y pulsar «Restaurar»; revisar los textos de las pantallas de miembros
- esperado: la confirmación dice que el miembro deja de aparecer y que sus pagos se conservan, «Restaurar» devuelve al miembro, y no aparece «dar de baja», «inactivo» ni «quitar del sistema»
- test: pendiente

### AC-S09-008
- enlaza: REQ-S09-025, REQ-S09-026, BEH-S09-018, INV-S09-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-miembro.mjs con un árbol por cada uno de los ocho términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los ocho términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S09-009
- enlaza: REQ-S09-027, BEH-S09-019
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue eliminarConHistorial en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-miembro.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización de lo que se conserva (listar, editar y cobrar un miembro) y del borrado actual en lo que se reemplaza (se retiran en el paso 7); (2) `tools/verificar-miembro.mjs` y sus pruebas, con todos los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) pruebas de los dos casos de uso nuevos (estados, auditoría, bloqueo, concurrencia) y de la propiedad de INV-S09-001, y su implementación junto al borrado viejo; (4) esquema aditivo: `Miembro.estado`, columnas de baja y su CHECK, manteniendo `activo` (con verificación de que `drizzle-kit push` crea el CHECK; SQL de respaldo en S-15 si no); (5) migrar los lectores: listados, selectores, en sala, `registrarCheckIn`, `registrarPago`, `cambiarPlan` y `crearMiembro` al estado y al mensaje de documento ocupado, en el mismo commit que sus pruebas; (6) acciones y pantallas: «Eliminar», «Restaurar», filtro «Eliminados» y `PATCH` sin `activo`; (7) retirar `eliminarConHistorial`, el borrado de `EliminarMiembro`, `BotonQuitarMiembro`, `EstadoToggle`, `darDeBajaAction`, `reactivarAction` y la columna `activo`, achicando las exenciones en el mismo commit.
- Las pruebas de concurrencia usan semillas fijas, una base efímera y una barrera que fija el orden en que las transacciones toman el bloqueo; no hay dependencias nuevas.
- Los criterios AC-S09-007 y AC-S09-009 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera nuevo (S-00, S-15); no existen miembros con `activo` en falso.
- **Enmiendas que se registran al aprobar S-09:**
  - ADR-013: la Decisión 2 (anonimización a pedido) y la Decisión 5 quedan sin efecto por orden del propietario (2026-11-12); `docs/00-indice.md`, `docs/06-modelo-datos-cambios.md` y `docs/superpowers/BACKLOG-SPECS.md` (S-09 se llama «Eliminar miembro»).
  - S-06: SUP-S06-011 queda cumplido por REQ-S09-018; el documento de un eliminado sigue ocupado hasta restaurarlo.
  - S-07: SUP-S07-016 deja de admitir cambio de plan de un miembro eliminado (REQ-S09-015).
  - S-04: `registrarPago` rechaza a un miembro eliminado (REQ-S09-015); `anularPago` lo permite (REQ-S09-016).
  - S-08: el riesgo sobre ADR-013 queda resuelto (los pagos se conservan) y el selector de miembro de `/cobros` excluye a los eliminados (REQ-S09-012).
  - S-01: la tabla de permisos de 5.1 agrega las acciones de eliminar y restaurar con `MIEMBROS ELIMINAR`, y el `PATCH` de miembros deja de aceptar `activo`.
  - S-22: REQ-S22-016 suma un enum (`EstadoMiembro`) y REQ-S22-004 las columnas de baja y el CHECK de `Miembro`.
- **Traspasos:** S-13 (consentimiento y derechos sobre los datos), S-15 (CHECK de respaldo), S-23 (permiso y rol único) y la retención programada (P-20) a una spec futura si el propietario fija el plazo.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Sin anonimización no se puede atender una solicitud de supresión de datos personales (derecho de cancelación de la Ley 29733): los datos de un miembro eliminado se conservan indefinidamente. Es una decisión del propietario (2026-11-12); queda como riesgo legal aceptado hasta que S-13 o el abogado lo revisen.
- Sin plazo de retención (P-20) todo se conserva sin límite. Mitigación: SUP-S09-007 y la pregunta abierta.
- Un miembro eliminado conserva su documento, de modo que quien vuelve no puede darse de alta como nuevo: debe restaurarse (REQ-S09-018). Mitigación: el mensaje lo indica.
- `RegistroAuditoria` no tiene uso en el heredado; el riesgo es que su diseño (campo de texto y motivo obligatorio) no sea suficiente para auditar. Mitigación: guarda estado anterior y nuevo y el motivo.
- Las cifras de 0.4 cambian cuando S-00 a S-08 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Un miembro eliminado se puede restaurar? Default: sí (SUP-S09-002).
- ¿Cobrar o cambiar el plan de un miembro eliminado se rechaza, pero anular sus pagos sí se permite? Default: sí (SUP-S09-005).
- ¿Qué plazo de retención fijan el contador o el abogado para borrar físicamente (P-20)? Default: sin plazo hasta que se defina (SUP-S09-007).
