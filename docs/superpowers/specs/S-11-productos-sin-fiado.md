---
id: S-11
estado: en-revision
adrs: ADR-011, ADR-016, ADR-018, ADR-022
depende_de: S-00, S-01, S-03, S-04, S-05, S-08, S-10, S-22
aprobada_por:
fecha_aprobacion:
---
# S-11 — Productos: catálogo y venta con cobro inmediato, sin fiado

## 0. Contexto y alcance

### 0.1 Problema
El gimnasio vende artículos (agua, bebidas, guantes) además de membresías. El código heredado tiene un catálogo (`Producto`) con precio en dólares, una venta que acepta carritos con varios productos y pagos repartidos entre métodos, ventas con fecha pasada con tasa del día, una pantalla de productos con equivalente en bolívares y la dependencia de un turno de caja. S-03 pasa el dinero a soles con cadenas exactas, S-04 fija que un cobro es un solo pago de un solo método con `cobroId`, S-08 quita turnos, fiado y deudas, y S-10 quita la tasa. Falta la spec que deja el catálogo y la venta de productos coherentes con todo eso: precios en soles, una venta es un solo pago inmediato (Efectivo, Yape o transferencia) que no se duplica, y ninguna dependencia de tasa, turno, deuda ni fecha pasada.

### 0.2 Dentro de alcance
- Catálogo: crear, editar, desactivar, reactivar y eliminar productos (nombre, descripción opcional, precio en soles, foto opcional), con nombre único.
- Venta: `venderProducto` de un producto y una cantidad, cobro inmediato en un solo pago de un solo método, con `cobroId` (S-04) y transacción (S-04).
- Pantallas `productos/` (lista, alta, edición) sin equivalente en bolívares ni tasa, y el modal de venta en `cobros/` (S-08) con Efectivo, Yape y transferencia.
- Retiro de las ventas con fecha pasada, de `resolverCobroPasado*`, del carrito de varios productos y de las líneas de pago múltiples en la venta.
- Precio congelado en el pago de cada venta.
- `tools/verificar-producto.mjs` con su paso en el CI.

### 0.3 Fuera de alcance
- Fiado, deudas y cobro de deudas: los eliminó S-08.
- Inventario y stock: no existe en el Repo A (el esquema dice «sin control de stock») y el propietario no lo pidió.
- Anulación de pagos: la define S-04 y la lista S-08; la venta usa esa misma anulación.
- Reporte de ventas por producto: S-14.
- Ticket y comprobante de la venta: S-12.
- Permisos por módulo: S-23 los retira; hasta entonces el catálogo conserva los permisos de planes.
- Carteles de producto de la vitrina de TV: S-20.
- El monto en bolívares y la tasa: S-10.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los números son del árbol original, no del que recibirá S-11 tras S-00 a S-10 y S-22.
- **Catálogo en el esquema:** `model Producto` con `organizacionId`, `nombre`, `descripcion`, `costoUSD Decimal(10,2)`, `fotoUrl`, `activo`, `createdAt` y relaciones a `Pago[]` y `DeudaProducto[]` (`schema.prisma:319-333`); no tiene restricción de nombre único ni stock (verificado con `Read`).
- **Venta en el esquema:** una venta es una o varias filas `Pago` sin miembro, con `productoId`, `productoNombre` (copia) y `cantidad`, «sin control de stock» (`schema.prisma:299-305`); con varias líneas de pago se correlacionan por `grupoPagoId` (verificado con `Read`).
- **Casos de uso:** `crearProducto` y `actualizarProducto` exigen `PLANES CREAR` y `PLANES EDITAR`, el nombre no vacío y `costoUSD > 0` (`CrearProducto.ts:20-27`, `ActualizarProducto.ts:20-30`); `eliminarProducto` exige `PLANES ELIMINAR` y desactiva si `contarVentas(id) > 0` o borra si no (`EliminarProducto.ts:15-30`); `listarProductos` entrega todos los productos de la organización (verificado con `Read`).
- **`contarVentas` solo cuenta pagos con `productoId`:** `PrismaProductoRepository.ts:51-53` usa `pago.count({ where: { productoId } })`; en un carrito de varios productos el pago no lleva `productoId` (`VenderProducto.ts:70-83`), por lo que un producto vendido solo en carritos mixtos se borraría físicamente (inferido de las dos citas; no probado).
- **Venta:** `venderProducto` exige `CAJA CREAR` (`VenderProducto.ts:55`, que S-08 cambia por `PAGOS CREAR`), resuelve los productos con `resolverItemsVenta` (cantidades enteras de 1 en adelante, producto existente y activo), calcula el total con el precio actual, valida las líneas de pago con `validarLineasDePago(..., "exacto", total)`, exige un turno abierto salvo fecha pasada y crea una fila `Pago` por línea (`VenderProducto.ts:50-107`; verificado con `Read`).
- **Fecha pasada:** `resolverCobroPasado` acepta una fecha hasta `MAX_DIAS_ATRAS_PAGO_FECHADO` = 90 días atrás, deja el pago fuera de turno y usa la tasa BCV de ese día (`resolverCobroPasado.ts:12-34`); solo lo usan `RegistrarPago.ts`, `CobrarDeudasMiembro.ts` y `VenderProducto.ts` (verificado con `grep -rln resolverCobroPasado`).
- **Pantallas:** `productos/` tiene `page.tsx` (144 líneas), `actions.ts` (131), `FormularioProducto.tsx` (108), `BotonEliminarProducto.tsx` (42), `nuevo/page.tsx`, `[id]/page.tsx` y `tasaActual.ts`; `page.tsx` muestra `$costoUSD` y `equivalenteBs` (verificado con `wc -l` y `grep`); la venta vive en `caja/ModalVenderProducto.tsx` (391 líneas), `BotonVenderProducto.tsx` (50) y `venderProductoAction` en `caja/actions.ts:338-420`; el menú lo enlazan `(panel)/layout.tsx:50` y `MasSheet.tsx:25`.
- **Foto:** `guardarFoto` sube a R2 en la carpeta `productos` con un nombre aleatorio y la extensión del archivo (`productos/actions.ts:40-48`); no valida tipo ni tamaño (verificado con `Read`).
- **Interacción con specs aprobadas:** S-03 renombra `Producto.costoUSD` a `Producto.costo` con `numeric(12,2)` y ubica `VenderProducto*`, `ModalVenderProducto*` y `resolverCobroPasado*` en la familia S-11; S-04 define `Pago.cobroId` único y `IUnidadDeTrabajo`; S-08 mueve `caja/` a `cobros/` y deja el catálogo y la venta a esta spec; S-10 quita la tasa y los bolívares de `VenderProducto.ts`, `productos/tasaActual.ts`, `FormularioProducto.tsx` y `productos/page.tsx`; S-05 quita `organizacionId`; S-22 pasa los repositorios a Drizzle (verificado con `grep -n` en las specs).
- No verificado: el contenido de `ModalVenderProducto.tsx` más allá de su tamaño, los carteles de producto de la vitrina (S-20), y cuántas ventas de carritos mixtos existen en datos reales (no hay datos que migrar).

### 0.5 Supuestos
- SUP-S11-001: el precio de venta se guarda en `Producto.costo` (nombre fijado por S-03); en este sistema significa «precio de venta al público» y no el costo de compra. Default: conservar el nombre; asumido, por validar.
- SUP-S11-002: una venta es un solo producto con una cantidad de 1 a 99 y un solo pago de un solo método; se retira el carrito de varios productos y las líneas de pago múltiples, porque un `Pago` guarda un solo producto y un carrito mixto perdería el detalle por producto (0.4). Vender dos productos distintos son dos ventas. Default: un producto por venta; asumido, por validar.
- SUP-S11-003: el nombre del producto es único sin distinguir mayúsculas ni espacios sobrantes, incluidos los desactivados. Default: único; asumido, por validar.
- SUP-S11-004: nombre de 2 a 80 caracteres, descripción de hasta 200, precio mayor que 0.00 y hasta 9999.99, cantidad de 1 a 99. Default: esos límites; asumido, por validar.
- SUP-S11-005: la venta se registra siempre con la fecha y hora actual de Lima; se retiran las ventas con fecha pasada y `resolverCobroPasado*`, porque solo existían para dejar la venta fuera del turno y calcular la tasa del día. Default: sin fecha pasada; asumido, por validar.
- SUP-S11-006: la venta no se asocia a un miembro (`Pago.miembroId` nulo), como hoy. Default: sin miembro; asumido, por validar.
- SUP-S11-007: «Eliminar» un producto sin ventas lo borra y con ventas lo desactiva, como hoy; un producto desactivado se puede reactivar y no se ofrece para vender. Default: ese comportamiento; asumido, por validar.
- SUP-S11-008: la foto del producto admite JPG, PNG o WebP de hasta 2 MB. Default: ese límite; asumido, por validar.
- SUP-S11-009: no hay datos que migrar: el baseline se genera nuevo (S-00, S-15) y los productos del gimnasio se cargan a mano. Default: sin migración; asumido, por validar.

## 1. Requisitos

### REQ-S11-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La tabla Producto deberá guardar el precio de venta en la columna costo con numeric(12,2) y entregarlo al dominio como cadena decimal de dos decimales.

### REQ-S11-002
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-003
- texto: El nombre de un producto deberá ser único sin distinguir mayúsculas ni espacios sobrantes, por una restricción única de la base de datos.

### REQ-S11-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-004
- texto: crearProducto deberá aceptar un nombre de 2 a 80 caracteres tras recortar espacios, una descripción de hasta 200 y un precio mayor que 0.00 y hasta 9999.99.

### REQ-S11-004
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S11-004
- texto: Si el nombre, la descripción o el precio no cumplen los límites entonces crearProducto y actualizarProducto deberán rechazarlos con ProductoInvalidoError sin escribir nada.

### REQ-S11-005
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S11-003
- texto: Si el nombre ya existe en otro producto entonces crearProducto y actualizarProducto deberán rechazarlo con ProductoDuplicadoError sin escribir nada.

### REQ-S11-006
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si dos creaciones o ediciones simultáneas usan el mismo nombre entonces la que pierde la restricción única deberá devolver ProductoDuplicadoError y no el error crudo del motor.

### REQ-S11-007
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-007
- texto: actualizarProducto deberá permitir cambiar nombre, descripción, precio, foto y estado activo, sin modificar las ventas ya registradas.

### REQ-S11-008
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-007
- texto: eliminarProducto deberá borrar el producto cuando no tiene ventas y desactivarlo cuando tiene al menos una, y devolver cuál de las dos cosas hizo.

### REQ-S11-009
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-002
- texto: venderProducto deberá registrar una venta de un solo producto activo con una cantidad entera de 1 a 99 como un solo pago de un solo método.

### REQ-S11-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: venderProducto deberá calcular el monto del pago como el precio vigente del producto multiplicado por la cantidad con aritmética de dinero.ts, sin aceptar un monto del cliente.

### REQ-S11-011
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-001
- texto: El pago de la venta deberá guardar el nombre del producto, la cantidad, el productoId y el monto del momento, de modo que un cambio posterior de precio o de nombre no altere la venta.

### REQ-S11-012
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-018
- texto: Si el producto no existe, está desactivado o la cantidad no es un entero de 1 a 99 entonces venderProducto deberá rechazar la venta con un error de dominio sin escribir nada.

### REQ-S11-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: venderProducto no deberá consultar ni exigir un turno, una deuda ni una tasa de cambio.

### REQ-S11-014
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: La venta deberá aceptar solo los métodos de pago activos Efectivo, Yape o transferencia, y exigir el número de operación según las reglas de S-03.

### REQ-S11-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: venderProducto deberá exigir un cobroId y escribir el pago dentro de una transacción de IUnidadDeTrabajo de S-04.

### REQ-S11-016
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando venderProducto recibe un cobroId ya registrado con el mismo producto, cantidad y método, deberá devolver el pago original sin crear otro.

### REQ-S11-017
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si venderProducto recibe un cobroId ausente, o ya registrado con otro producto, cantidad o método, entonces deberá rechazarlo con un error de conflicto y no crear el pago.

### REQ-S11-018
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-005
- texto: La venta deberá registrar la fecha y la hora de Lima del momento del servidor, sin aceptar una fecha del cliente.

### REQ-S11-019
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-006
- texto: El pago de la venta deberá tener miembroId nulo, la sede única de S-05 y el usuario que la registró.

### REQ-S11-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: Los casos de uso del catálogo y de la venta deberán exigir los permisos PLANES CREAR, PLANES EDITAR, PLANES ELIMINAR y PAGOS CREAR según su operación.

### REQ-S11-021
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las pantallas de productos y de venta deberán mostrar los precios solo con formatearSoles.

### REQ-S11-022
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-008
- texto: La acción de guardar la foto de un producto deberá aceptar solo JPG, PNG o WebP de hasta 2 MB y rechazar cualquier otro archivo sin subirlo.

### REQ-S11-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: El modal de venta deberá elegir un producto activo, una cantidad y un método, mostrar el total calculado y deshabilitar el botón mientras se registra.

### REQ-S11-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos costoUSD, tasaActual, resolverCobroPasado, resolverItemsVenta, ItemCarrito, SinTurnoAbiertoError ni fechaVenta.

### REQ-S11-025
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-producto.mjs encuentra alguno de los términos de REQ-S11-024, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S11-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-producto.mjs en cada pull request.

## 2. Comportamiento

### BEH-S11-001
- cubre: REQ-S11-001, REQ-S11-003
- categoria: feliz
- dado: el catálogo vacío
- cuando: el administrador crea «Agua 600 ml» con precio «2.50», descripción «Sin gas» y sin foto
- entonces: el producto queda activo con costo «2.50» como cadena de dos decimales y numeric(12,2) en la base

### BEH-S11-002
- cubre: REQ-S11-003, REQ-S11-004
- categoria: borde
- dado: nombres de 1 y de 81 caracteres, descripción de 201, y precios «0.00», «-1.00» y «10000.00»
- cuando: se intenta crear cada producto
- entonces: todos se rechazan con ProductoInvalidoError y no se escribe nada; los límites 2 y 80 caracteres, 200 de descripción y precios «0.01» y «9999.99» se aceptan

### BEH-S11-003
- cubre: REQ-S11-002, REQ-S11-005
- categoria: error
- dado: el producto «Agua 600 ml»
- cuando: se crea otro llamado «  agua 600 ML  » y se renombra un tercero a ese nombre
- entonces: ambas operaciones fallan con ProductoDuplicadoError y no se escribe nada

### BEH-S11-004
- cubre: REQ-S11-006
- categoria: concurrencia
- dado: dos creaciones simultáneas con el nombre «Guantes» detenidas con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: una crea el producto y la otra devuelve ProductoDuplicadoError, y queda una sola fila

### BEH-S11-005
- cubre: REQ-S11-007
- categoria: feliz
- dado: «Agua 600 ml» a «2.50» con una venta registrada de 2 unidades
- cuando: se cambia el precio a «3.00» y el nombre a «Agua 625 ml»
- entonces: el producto muestra los valores nuevos y la venta conserva «Agua 600 ml», cantidad 2 y monto «5.00»

### BEH-S11-006
- cubre: REQ-S11-008
- categoria: feliz
- dado: un producto sin ventas y otro con una venta
- cuando: se elimina cada uno
- entonces: el primero se borra y devuelve ELIMINADO; el segundo queda desactivado, devuelve DESACTIVADO y conserva la venta

### BEH-S11-007
- cubre: REQ-S11-009, REQ-S11-010, REQ-S11-011, REQ-S11-019
- categoria: feliz
- dado: «Agua 600 ml» a «2.50» y un administrador con sesión
- cuando: vende 3 unidades al contado con Efectivo
- entonces: se crea un solo pago de «7.50» con el nombre del producto, cantidad 3, su productoId, miembroId nulo, la sede única, el usuario y la hora de Lima

### BEH-S11-008
- cubre: REQ-S11-012
- categoria: error
- dado: un producto desactivado, un producto inexistente y cantidades 0, 100, 1.5 y «dos»
- cuando: se intenta vender cada combinación
- entonces: todas se rechazan con su error de dominio y no se escribe nada

### BEH-S11-009
- cubre: REQ-S11-013, REQ-S11-018
- categoria: feliz
- dado: un administrador sin ningún turno ni tasa registrados, con un cliente que envía una fecha de venta de hace 10 días
- cuando: vende un producto
- entonces: la venta se registra con la hora actual de Lima, ignorando la fecha enviada, sin consultar turno, deuda ni tasa

### BEH-S11-010
- cubre: REQ-S11-014
- categoria: feliz
- dado: los métodos activos Efectivo, Yape y transferencia al BCP
- cuando: se vende con Efectivo sin número de operación, con Yape con número «55123» y con transferencia sin número
- entonces: las dos primeras se registran y la tercera se rechaza por falta del número de operación

### BEH-S11-011
- cubre: REQ-S11-015, REQ-S11-016
- categoria: feliz
- dado: una venta registrada con cobroId K
- cuando: llega el mismo envío con K, el mismo producto, cantidad y método
- entonces: se devuelve el pago original y no se crea otro

### BEH-S11-012
- cubre: REQ-S11-017
- categoria: error
- dado: una venta registrada con cobroId K
- cuando: llegan envíos con cobroId ausente y con K pero otra cantidad
- entonces: ambos se rechazan con error de conflicto y no se crea ningún pago

### BEH-S11-013
- cubre: REQ-S11-015, REQ-S11-016
- categoria: concurrencia
- dado: dos envíos simultáneos del mismo cobroId con el mismo producto, cantidad y método, detenidos con una barrera
- cuando: se liberan a la vez
- entonces: se crea un solo pago, ambas respuestas son el mismo pago y la restricción única del cobroId no deja pasar un duplicado

### BEH-S11-014
- cubre: REQ-S11-020
- categoria: error
- dado: peticiones sin sesión y de un usuario sin los permisos PLANES o PAGOS CREAR
- cuando: intentan crear, editar, eliminar un producto o vender
- entonces: se rechazan por permiso sin escribir nada

### BEH-S11-015
- cubre: REQ-S11-021, REQ-S11-023
- categoria: feliz
- dado: la pantalla de productos y el modal de venta
- cuando: el administrador abre la lista, elige «Agua 600 ml», cantidad 3 y Yape
- entonces: los precios aparecen como «S/ 2.50» y el total como «S/ 7.50», sin tasa ni bolívares, y el botón queda deshabilitado mientras se registra

### BEH-S11-016
- cubre: REQ-S11-022
- categoria: error
- dado: un PDF, un JPG de 3 MB y un PNG de 1 MB
- cuando: se intenta guardar cada uno como foto de un producto
- entonces: el PDF y el JPG de 3 MB se rechazan sin subir nada y el PNG se acepta

### BEH-S11-017
- cubre: REQ-S11-024, REQ-S11-025
- categoria: error
- dado: un archivo por cada uno de los siete términos de REQ-S11-024
- cuando: se ejecuta tools/verificar-producto.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S11-018
- cubre: REQ-S11-026
- categoria: error
- dado: un pull request que agrega fechaVenta en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-producto.mjs falla y queda en rojo

## 3. Invariantes

### INV-S11-001
- propiedad: el monto de toda venta es exactamente el precio por la cantidad
- mecanismo: test-propiedad
- deteccion: sobre 200 precios y cantidades generados con semilla fija, el monto del pago es igual a multiplicarPorEntero(precio, cantidad) en cadena de dos decimales
- protege: REQ-S11-010, REQ-S11-011

### INV-S11-002
- propiedad: no hay dos productos con el mismo nombre normalizado
- mecanismo: restriccion-bd
- deteccion: índice único sobre el nombre en minúsculas y recortado; una inserción duplicada falla
- protege: REQ-S11-002, REQ-S11-005, REQ-S11-006

### INV-S11-003
- propiedad: un cobroId produce como máximo una venta
- mecanismo: restriccion-bd
- deteccion: la restricción única de Pago.cobroId de S-04; una inserción duplicada falla
- protege: REQ-S11-015, REQ-S11-016

### INV-S11-004
- propiedad: los términos heredados de tasa, turno, carrito y fecha pasada no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-producto.mjs termina con código distinto de cero y lista archivo:línea y término
- protege: REQ-S11-013, REQ-S11-018, REQ-S11-024, REQ-S11-025

## 4. Criterios de aceptación

### AC-S11-001
- enlaza: REQ-S11-001, REQ-S11-003, REQ-S11-004, BEH-S11-001, BEH-S11-002
- metodo: integracion
- procedimiento: con una base efímera, crear «Agua 600 ml» a «2.50», leer la columna y el tipo, y probar los límites de nombre, descripción y precio
- esperado: el producto se crea con costo «2.50» en numeric(12,2) y los valores fuera de los límites se rechazan sin escribir
- test: pendiente

### AC-S11-002
- enlaza: REQ-S11-002, REQ-S11-005, REQ-S11-006, BEH-S11-003, BEH-S11-004, INV-S11-002
- metodo: integracion
- procedimiento: crear «Agua 600 ml», intentar crear y renombrar con «  agua 600 ML  », y lanzar dos creaciones simultáneas de «Guantes» con una barrera
- esperado: los duplicados fallan con ProductoDuplicadoError y queda una sola fila «Guantes»
- test: pendiente

### AC-S11-003
- enlaza: REQ-S11-007, REQ-S11-008, BEH-S11-005, BEH-S11-006
- metodo: integracion
- procedimiento: editar el precio y el nombre de un producto con una venta, y eliminar uno sin ventas y otro con una
- esperado: la venta conserva nombre, cantidad y monto, el primero se borra (ELIMINADO) y el segundo queda desactivado (DESACTIVADO)
- test: pendiente

### AC-S11-004
- enlaza: REQ-S11-009, REQ-S11-010, REQ-S11-011, REQ-S11-012, REQ-S11-019, BEH-S11-007, BEH-S11-008, INV-S11-001
- metodo: integracion
- procedimiento: vender 3 unidades de «Agua 600 ml» a «2.50» con Efectivo, las combinaciones inválidas de BEH-S11-008, y 200 precios y cantidades con semilla fija
- esperado: se crea un pago de «7.50» con los campos de BEH-S11-007, las inválidas se rechazan sin escribir y el monto siempre es el precio por la cantidad
- test: pendiente

### AC-S11-005
- enlaza: REQ-S11-013, REQ-S11-014, REQ-S11-018, BEH-S11-009, BEH-S11-010
- metodo: integracion
- procedimiento: sin turno ni tasa, vender con una fecha enviada de hace 10 días, y vender con Efectivo, Yape con número y transferencia sin número
- esperado: la fecha enviada se ignora y se usa la hora de Lima del servidor, y se aceptan Efectivo y Yape y se rechaza la transferencia sin número
- test: pendiente

### AC-S11-006
- enlaza: REQ-S11-015, REQ-S11-016, REQ-S11-017, BEH-S11-011, BEH-S11-012, BEH-S11-013, INV-S11-003
- metodo: integracion
- procedimiento: repetir un envío con el mismo cobroId, enviar cobroId ausente y K con otra cantidad, y lanzar dos envíos simultáneos del mismo cobroId con una barrera
- esperado: el repetido devuelve el pago original, los otros dos se rechazan con conflicto y el simultáneo crea un solo pago
- test: pendiente

### AC-S11-007
- enlaza: REQ-S11-020, BEH-S11-014
- metodo: integracion
- procedimiento: enviar a las acciones de crear, editar, eliminar y vender peticiones sin sesión y con un usuario sin permisos
- esperado: todas se rechazan antes de escribir
- test: pendiente

### AC-S11-008
- enlaza: REQ-S11-021, REQ-S11-023, BEH-S11-015
- metodo: manual
- procedimiento: abrir «Productos», elegir «Agua 600 ml», cantidad 3 y Yape en el modal de venta, y registrar
- esperado: los precios y el total se muestran con «S/ 2.50» y «S/ 7.50», sin tasa ni bolívares, y el botón queda deshabilitado mientras se registra
- test: pendiente

### AC-S11-009
- enlaza: REQ-S11-022, BEH-S11-016
- metodo: integracion
- procedimiento: llamar a la acción de guardar foto con un PDF, un JPG de 3 MB y un PNG de 1 MB con un almacenamiento simulado
- esperado: el PDF y el JPG se rechazan sin llamar al almacenamiento y el PNG se sube
- test: pendiente

### AC-S11-010
- enlaza: REQ-S11-024, REQ-S11-025, BEH-S11-017, INV-S11-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-producto.mjs con un árbol por cada uno de los siete términos y con otro limpio; después ejecutarla sobre el árbol final
- esperado: falla con los siete términos nombrando archivo, línea y término, pasa con el limpio y no encuentra nada en el árbol final
- test: pendiente

### AC-S11-011
- enlaza: REQ-S11-026, BEH-S11-018
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue fechaVenta en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-producto.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización del catálogo y de la venta heredada, incluida la venta con un solo producto; (2) `tools/verificar-producto.mjs` y sus pruebas, con los archivos actuales en su lista de exenciones, que se achica en cada paso; (3) límites, nombre único (índice único sobre el nombre normalizado) y `ProductoDuplicadoError` en `crearProducto` y `actualizarProducto`; (4) `venderProducto` nuevo de un producto, con `cobroId`, `IUnidadDeTrabajo` y un solo método, junto al viejo; (5) migrar `venderProductoAction` y `ModalVenderProducto` (ya en `cobros/`, S-08) al caso de uso nuevo con el selector de un producto y la cantidad; (6) pantallas `productos/` sin bolívares ni tasa y validación de la foto; (7) retirar `resolverCobroPasado*`, `resolverItemsVenta`, `ItemCarrito`, el carrito y la fecha de venta, y las exenciones de la familia S-11; (8) paso del CI.
- Las pruebas de concurrencia usan semillas fijas, una base efímera y una barrera que fija el orden de las transacciones; no hay dependencias nuevas.
- AC-S11-008 y AC-S11-011 son pasos manuales del propietario (el repositorio no tiene un ejecutor de navegador).

### 5.2 Migración
- No hay datos que migrar (SUP-S11-009). El baseline de S-00 y S-15 crea `Producto` con `costo numeric(12,2)` y el índice único del nombre.
- **Enmiendas que se registran al aprobar S-11:**
  - S-03: la familia S-11 queda como `VenderProducto*`, `ModalVenderProducto*`, `productos/*` y se retira `resolverCobroPasado*` (se elimina); `Producto.costo` se documenta como precio de venta.
  - S-04: `Pago.cobroId` también lo escribe la venta de producto (REQ-S04-049 y SUP-S04-009 dejan de decir «nula en los pagos de otras specs» para las ventas); SUP-S04-014 y la nota de `resolverCobroPasado*` quedan cumplidas por su retiro.
  - S-08: el reporte de cobros trata cada venta como un solo producto (SUP-S08-010 y BEH-S08-008 siguen válidos); las ventas con varios productos o varias líneas ya no existen.
  - S-10: `productos/tasaActual.ts` se elimina entero y no solo la tasa.
  - S-22: `Producto` pierde la relación con `DeudaProducto` (ya retirada por S-08) y no cambia más.
  - `docs/06-modelo-datos-cambios.md`, `docs/datos-iniciales.md` y `COBERTURA-RF.md`: RF-37 queda cubierta por S-11.
- **Traspasos:** S-12 (ticket de la venta), S-14 (ventas por producto en los reportes), S-20 (carteles de producto de la vitrina) y S-23 (permisos de catálogo y venta).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Quitar el carrito obliga a registrar dos ventas cuando se llevan dos productos, con dos tickets y dos cobroId. Mitigación: es la forma que conserva el detalle por producto; si el propietario prefiere el carrito, se agrega una tabla de líneas de venta (spec nueva).
- Sin stock, el sistema no avisa de agotados ni descuenta existencias; la venta de un producto que no existe en la repisa no se detecta. Mitigación: fuera de alcance (0.3).
- El nombre único puede bloquear nombres parecidos legítimos («Agua 600 ml» y «Agua 625 ml» son distintos, pero «Agua» dos veces no). Mitigación: se recomienda incluir la medida en el nombre.
- Cambiar el precio no afecta las ventas ya hechas, pero sí las siguientes; no hay precios por fecha. Mitigación: el pago congela el monto (REQ-S11-011).
- Las cifras de 0.4 cambian cuando S-00 a S-10 y S-22 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Una venta es de un solo producto (con cantidad), de modo que dos productos distintos son dos ventas? Default: sí (SUP-S11-002).
- ¿Se retiran las ventas con fecha pasada? Default: sí (SUP-S11-005).
- ¿El nombre del producto debe ser único? Default: sí (SUP-S11-003).
- ¿El límite de foto es JPG, PNG o WebP de hasta 2 MB? Default: sí (SUP-S11-008).
