---
id: S-11
estado: aprobada
adrs: ADR-011, ADR-016, ADR-018, ADR-022
depende_de: S-00, S-01, S-02, S-03, S-04, S-05, S-08, S-10, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-11 — Productos: catálogo y venta con cobro inmediato, sin fiado

## 0. Contexto y alcance

### 0.1 Problema
El gimnasio vende artículos (agua, bebidas, guantes) además de membresías. El código heredado tiene un catálogo (`Producto`) con precio en dólares, una venta que acepta carritos con varios productos y pagos repartidos entre métodos, ventas con fecha pasada con tasa del día, una pantalla de productos con equivalente en bolívares y la dependencia de un turno de caja. S-03 pasa el dinero a soles con cadenas exactas, S-04 fija que un cobro es un solo pago de un solo método con `cobroId`, S-08 quita turnos, fiado y deudas, y S-10 quita la tasa. Falta la spec que deja el catálogo y la venta de productos coherentes con todo eso: precios en soles, una venta es un solo pago inmediato (Efectivo, Yape o transferencia) que no se duplica, y ninguna dependencia de tasa, turno, deuda ni fecha pasada.

### 0.2 Dentro de alcance
- Catálogo: crear, editar, desactivar, reactivar y eliminar productos (nombre, descripción opcional, precio en soles, foto opcional), con límites de longitud y de precio, nombre único por su forma normalizada y validación de la foto (tipo, firma de bytes y 2 097 152 bytes).
- Venta: `venderProducto` de un producto y una cantidad, cobro inmediato en un solo pago de un solo método, con `cobroId` (S-04), transacción (S-04), bloqueo de la fila del producto y errores de dominio con nombre.
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
- **`contarVentas` solo cuenta pagos con `productoId`:** `PrismaProductoRepository.ts:51-53` usa `pago.count({ where: { productoId } })` sin filtrar por anulación; en un carrito de varios productos el pago no lleva `productoId` (`VenderProducto.ts:77,102-104`), por lo que un producto vendido solo en carritos mixtos se borraría físicamente (inferido de las dos citas; no probado).
- **Venta:** `venderProducto` exige `CAJA CREAR` (`VenderProducto.ts:55`, que S-08 cambia por `PAGOS CREAR`), resuelve los productos con `resolverItemsVenta` (cantidades enteras de 1 en adelante, producto existente y activo), calcula el total con el precio actual, valida las líneas de pago con `validarLineasDePago(..., "exacto", total)`, exige un turno abierto salvo fecha pasada y crea una fila `Pago` por línea (`VenderProducto.ts:50-107`; verificado con `Read`).
- **Fecha pasada:** `resolverCobroPasado` acepta una fecha hasta `MAX_DIAS_ATRAS_PAGO_FECHADO` = 90 días atrás (`Pago.ts:35`), deja el pago fuera de turno y usa la tasa BCV de ese día (`resolverCobroPasado.ts:11-33`); solo lo usan `RegistrarPago.ts`, `CobrarDeudasMiembro.ts` y `VenderProducto.ts` (verificado con `grep -rln resolverCobroPasado`).
- **Pantallas:** `productos/` tiene `page.tsx` (144 líneas), `actions.ts` (131), `FormularioProducto.tsx` (108), `BotonEliminarProducto.tsx` (42), `nuevo/page.tsx`, `[id]/page.tsx` y `tasaActual.ts`; `page.tsx` muestra `$costoUSD` y `equivalenteBs` (verificado con `wc -l` y `grep`); la venta vive en `caja/ModalVenderProducto.tsx` (391 líneas), `BotonVenderProducto.tsx` (50) y `venderProductoAction` en `caja/actions.ts:338-420`; el menú lo enlazan `(panel)/layout.tsx:50` y `MasSheet.tsx:25`.
- **Foto:** `guardarFoto` sube a R2 en la carpeta `productos` con un nombre aleatorio, la extensión del archivo y el `type` que declara el cliente (`productos/actions.ts:39-46`); no valida tipo ni tamaño (verificado con `Read`).
- **Interacción con specs aprobadas:** S-03 renombra `Producto.costoUSD` a `Producto.costo` con `numeric(12,2)` y ubica `VenderProducto*` y `ModalVenderProducto*` en la familia S-11 (`resolverCobroPasado*` pasó a esa familia por la enmienda de S-04, SUP-S04-014); S-04 define `Pago.cobroId` único (SUP-S04-009), `IUnidadDeTrabajo` y el rechazo de un `cobroId` de un cobro anulado; S-08 mueve `caja/` a `cobros/` y deja el catálogo y la venta a esta spec; S-10 quita la tasa y los bolívares de `VenderProducto.ts`, `productos/tasaActual.ts`, `FormularioProducto.tsx` y `productos/page.tsx`; S-05 quita `organizacionId`; S-22 pasa los repositorios a Drizzle (verificado con `grep -n` en las specs).
- No verificado: que el repositorio no tenga un ejecutor de pruebas de componentes (S-02 nombra herramientas de navegador que ninguna spec adopta), el contenido de `ModalVenderProducto.tsx` más allá de su tamaño, los carteles de producto de la vitrina (S-20), y cuántas ventas de carritos mixtos existen en datos reales (no hay datos que migrar).

### 0.5 Supuestos
- SUP-S11-001: el precio de venta se guarda en `Producto.costo` (nombre fijado por S-03); en este sistema significa «precio de venta al público» y no el costo de compra. Default: conservar el nombre; asumido, por validar.
- SUP-S11-002: una venta es un solo producto con una cantidad de 1 a 99 y un solo pago de un solo método; se retira el carrito de varios productos y las líneas de pago múltiples, porque un `Pago` guarda un solo producto y un carrito mixto perdería el detalle por producto (0.4). Vender dos productos distintos son dos ventas. Default: un producto por venta; asumido, por validar.
- SUP-S11-003: el nombre del producto es único por su forma normalizada (minúsculas, sin espacios en los extremos y con los espacios internos reducidos a uno), incluidos los desactivados; el nombre se guarda ya recortado y con los espacios internos reducidos. Default: único; asumido, por validar.
- SUP-S11-004: nombre de 2 a 80 caracteres, descripción de hasta 200, precio mayor que 0.00 y hasta 9999.99, cantidad de 1 a 99. Default: esos límites; asumido, por validar.
- SUP-S11-005: la venta se registra siempre con la fecha y hora actual de Lima; se retiran las ventas con fecha pasada y `resolverCobroPasado*`, porque solo existían para dejar la venta fuera del turno y calcular la tasa del día. Default: sin fecha pasada; asumido, por validar.
- SUP-S11-006: la venta no se asocia a un miembro (`Pago.miembroId` nulo), como hoy. Default: sin miembro; asumido, por validar.
- SUP-S11-007: «Eliminar» un producto sin ventas lo borra y con ventas lo desactiva, como hoy; un producto desactivado se puede reactivar y no se ofrece para vender. Default: ese comportamiento; asumido, por validar.
- SUP-S11-008: la foto del producto admite JPG, PNG o WebP de hasta 2 MB, entendidos como 2 097 152 bytes, validados por la firma de los primeros bytes del archivo y no por la extensión ni por el tipo que declara el cliente. Default: ese límite; asumido, por validar.
- SUP-S11-009: no hay datos que migrar: el baseline se genera nuevo (S-00, S-15) y los productos del gimnasio se cargan a mano. Default: sin migración; asumido, por validar.
- SUP-S11-010: los errores de dominio de la venta se llaman `CobroIdInvalidoError` (cobroId ausente o en conflicto) y `CobroAnuladoError` (cobroId de un pago anulado), alineados con el comportamiento que S-04 define para el cobro de membresía sin nombrar los errores. Default: esos nombres; asumido, por validar.

## 1. Requisitos

### REQ-S11-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La columna Producto.costo, que guarda el precio de venta, deberá ser numeric(12,2).

### REQ-S11-002
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-003
- texto: El nombre de un producto deberá ser único por su forma normalizada, por una restricción única de la base de datos.

### REQ-S11-003
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-004
- texto: crearProducto deberá aceptar un nombre de 2 a 80 caracteres tras recortar espacios y reducir los internos a uno.

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
- texto: actualizarProducto deberá permitir cambiar nombre, descripción, precio, foto y estado activo.

### REQ-S11-008
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-007
- texto: eliminarProducto deberá borrar el producto cuando no tiene ventas y desactivarlo cuando tiene al menos una.

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
- origen: SUP-S11-002
- texto: El pago de la venta deberá guardar el productoId, el nombre del producto y la cantidad, de modo que un cambio posterior de precio o de nombre no altere la venta.

### REQ-S11-012
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-018
- texto: Si el producto no existe, está desactivado o la cantidad no es un entero de 1 a 99 entonces venderProducto deberá rechazar la venta con ProductoNoEncontradoError, ProductoInactivoError o CantidadInvalidaError, respectivamente, sin escribir nada.

### REQ-S11-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: venderProducto no deberá consultar ni exigir un turno, una deuda ni una tasa de cambio.

### REQ-S11-014
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-018
- texto: Si el método de pago no es uno de los activos Efectivo, Yape o transferencia entonces venderProducto deberá rechazar la venta con un error de validación sin escribir nada.

### REQ-S11-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: venderProducto deberá exigir el número de operación según las reglas de S-03 para cada método.

### REQ-S11-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: venderProducto deberá exigir un cobroId y escribir el pago dentro de una transacción de IUnidadDeTrabajo de S-04.

### REQ-S11-017
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando venderProducto recibe un cobroId ya registrado con el mismo producto, cantidad, método y número de operación, deberá devolver el pago original sin crear otro.

### REQ-S11-018
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si venderProducto recibe un cobroId ausente, o ya registrado con otro producto, cantidad, método o número de operación, o por un cobro que no es una venta de producto, entonces deberá rechazarlo con CobroIdInvalidoError y no crear el pago.

### REQ-S11-019
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si venderProducto recibe el cobroId de un pago anulado entonces deberá rechazarlo con CobroAnuladoError y no devolver el pago anulado.

### REQ-S11-020
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-016
- texto: Si la base de datos rechaza el pago por la restricción única del cobroId entonces venderProducto deberá releer el pago original en una transacción nueva y aplicar REQ-S11-017, REQ-S11-018 o REQ-S11-019 en lugar de devolver el error crudo del motor.

### REQ-S11-021
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-005
- texto: La venta deberá registrar la fecha y la hora de Lima del momento del servidor.

### REQ-S11-022
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-005
- texto: Las acciones y rutas de venta no deberán aceptar una fecha de venta enviada por el cliente.

### REQ-S11-023
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-006
- texto: El pago de la venta deberá tener miembroId nulo.

### REQ-S11-024
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-006
- texto: El pago de la venta deberá guardar la sede única de S-05 y el usuario que la registró.

### REQ-S11-025
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: crearProducto, actualizarProducto y eliminarProducto deberán exigir los permisos PLANES CREAR, PLANES EDITAR y PLANES ELIMINAR, respectivamente.

### REQ-S11-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: venderProducto deberá exigir el permiso PAGOS CREAR.

### REQ-S11-027
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S11-007
- texto: Si el producto no existe entonces actualizarProducto y eliminarProducto deberán rechazar la operación con ProductoNoEncontradoError sin escribir nada.

### REQ-S11-028
- tipo: ubicuo
- prioridad: MUST
- origen: SUP-S11-003
- texto: actualizarProducto no deberá tratar como duplicado el nombre que el propio producto ya tiene.

### REQ-S11-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: venderProducto deberá tomar, dentro de su transacción, el bloqueo compartido de la fila del producto antes de validar que está activo.

### REQ-S11-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: eliminarProducto deberá contar las ventas y borrar o desactivar dentro de una transacción que toma el bloqueo exclusivo de la fila del producto.

### REQ-S11-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las pantallas de productos y de venta deberán mostrar los precios solo con formatearSoles.

### REQ-S11-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: El modal de venta deberá permitir elegir un producto activo, una cantidad y un método, y mostrar el total calculado.

### REQ-S11-033
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-018
- texto: El botón de registrar la venta deberá quedar deshabilitado mientras la venta se registra.

### REQ-S11-034
- tipo: si-entonces
- prioridad: MUST
- origen: SUP-S11-008
- texto: Si la foto de un producto no tiene la firma de bytes de un JPG, PNG o WebP, o pesa más de 2 097 152 bytes, entonces la acción de guardarla deberá rechazarla antes de subir ningún archivo y sin escribir nada.

### REQ-S11-035
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Los archivos de apps y packages, salvo node_modules, .next y generated, no deberán contener los términos costoUSD, tasaActual, resolverCobroPasado, resolverItemsVenta, ItemCarrito, SinTurnoAbiertoError ni fechaVenta.

### REQ-S11-036
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-producto.mjs encuentra alguno de los términos de REQ-S11-035, deberá terminar con código distinto de cero y nombrar archivo, línea y término.

### REQ-S11-037
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
- entonces: el producto queda activo con costo «2.50» como cadena de dos decimales, el tipo de la columna es numeric(12,2) y el nombre se guarda recortado

### BEH-S11-002
- cubre: REQ-S11-003, REQ-S11-004
- categoria: borde
- dado: nombres de 1 y de 81 caracteres, descripción de 201 y precios «0.00», «-1.00» y «10000.00»
- cuando: se intenta crear cada producto
- entonces: todos se rechazan con ProductoInvalidoError y no se escribe nada; el nombre de 2 y de 80 caracteres, la descripción de 200 y los precios «0.01» y «9999.99» se aceptan

### BEH-S11-003
- cubre: REQ-S11-002, REQ-S11-005
- categoria: error
- dado: el producto «Agua 600 ml»
- cuando: se crea otro llamado «  agua  600 ML  » y se renombra un tercero a ese nombre
- entonces: ambas operaciones fallan con ProductoDuplicadoError y no se escribe nada

### BEH-S11-004
- cubre: REQ-S11-006
- categoria: concurrencia
- dado: dos creaciones simultáneas con el nombre «Guantes» detenidas con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: una crea el producto y la otra devuelve ProductoDuplicadoError, y queda una sola fila

### BEH-S11-005
- cubre: REQ-S11-007, REQ-S11-011
- categoria: feliz
- dado: «Agua 600 ml» a «2.50» con una venta registrada de 2 unidades
- cuando: se cambia el precio a «3.00» y el nombre a «Agua 625 ml»
- entonces: el producto muestra los valores nuevos y la venta conserva «Agua 600 ml», cantidad 2, su productoId y monto «5.00»

### BEH-S11-006
- cubre: REQ-S11-008
- categoria: feliz
- dado: un producto sin ventas y otro con una venta
- cuando: se elimina cada uno
- entonces: el primero se borra y devuelve ELIMINADO; el segundo queda desactivado, devuelve DESACTIVADO y conserva la venta

### BEH-S11-007
- cubre: REQ-S11-009, REQ-S11-010, REQ-S11-023, REQ-S11-024
- categoria: feliz
- dado: «Agua 600 ml» a «2.50» y un administrador con sesión
- cuando: vende 3 unidades al contado con Efectivo
- entonces: se crea un solo pago de «7.50» con el nombre del producto, cantidad 3, su productoId, miembroId nulo, la sede única, el usuario y la hora de Lima

### BEH-S11-008
- cubre: REQ-S11-012
- categoria: error
- dado: un producto desactivado, un producto inexistente y las cantidades 0, 100, 1.5 y «dos»
- cuando: se intenta vender cada combinación
- entonces: el desactivado lanza ProductoInactivoError, el inexistente ProductoNoEncontradoError y las cantidades CantidadInvalidaError, sin escribir nada

### BEH-S11-009
- cubre: REQ-S11-013, REQ-S11-021, REQ-S11-022
- categoria: feliz
- dado: un administrador sin ningún turno ni tasa registrados, con una petición que trae el campo extra «fecha» con un día de hace 10 días
- cuando: vende un producto
- entonces: la venta se registra con la hora actual de Lima, el campo extra se ignora y no se consulta turno, deuda ni tasa

### BEH-S11-010
- cubre: REQ-S11-014, REQ-S11-015
- categoria: borde
- dado: los métodos activos Efectivo, Yape y transferencia al BCP, y un método inactivo
- cuando: se vende con Efectivo sin número de operación, con Yape con número «55123», con transferencia sin número y con el método inactivo
- entonces: las dos primeras se registran, la transferencia sin número se rechaza y el método inactivo se rechaza con un error de validación

### BEH-S11-011
- cubre: REQ-S11-016, REQ-S11-017
- categoria: feliz
- dado: una venta registrada con cobroId K
- cuando: llega el mismo envío con K, el mismo producto, cantidad, método y número de operación
- entonces: se devuelve el pago original y no se crea otro

### BEH-S11-012
- cubre: REQ-S11-018
- categoria: error
- dado: una venta registrada con cobroId K, un pago de membresía con cobroId M
- cuando: llegan envíos con cobroId ausente, con K y otra cantidad, con K y otro número de operación, y con M
- entonces: los cuatro se rechazan con CobroIdInvalidoError y no se crea ningún pago

### BEH-S11-013
- cubre: REQ-S11-019
- categoria: error
- dado: una venta con cobroId K que se anuló
- cuando: llega un envío con K
- entonces: se lanza CobroAnuladoError y no se devuelve el pago anulado

### BEH-S11-014
- cubre: REQ-S11-016, REQ-S11-017, REQ-S11-020
- categoria: concurrencia
- dado: dos envíos simultáneos del mismo cobroId con el mismo producto, cantidad y método, detenidos con una barrera antes de insertar
- cuando: se liberan a la vez
- entonces: se crea un solo pago, el que pierde la restricción única relee el pago original y devuelve el mismo pago, y ninguna respuesta es el error crudo del motor

### BEH-S11-015
- cubre: REQ-S11-025, REQ-S11-026
- categoria: error
- dado: peticiones sin sesión y de usuarios con un solo permiso: PLANES CREAR, PLANES EDITAR, PLANES ELIMINAR o PAGOS CREAR
- cuando: cada uno intenta crear, editar, eliminar un producto y vender
- entonces: cada usuario logra únicamente la operación de su permiso y las demás se rechazan por permiso sin escribir nada

### BEH-S11-016
- cubre: REQ-S11-027, REQ-S11-028
- categoria: borde
- dado: «Agua 600 ml» y un identificador de producto inexistente
- cuando: se renombra «Agua 600 ml» a su mismo nombre, y se edita y elimina el inexistente
- entonces: el renombrado se acepta sin ProductoDuplicadoError y las otras dos lanzan ProductoNoEncontradoError sin escribir

### BEH-S11-017
- cubre: REQ-S11-029, REQ-S11-030
- categoria: concurrencia
- dado: un producto activo sin ventas, y una venta y una eliminación de ese producto simultáneas con una barrera que fija quién toma primero el bloqueo
- cuando: terminan las dos transacciones, en cada orden
- entonces: si la venta toma primero el bloqueo, se registra y la eliminación desactiva el producto; si la eliminación toma primero, borra el producto y la venta lanza ProductoNoEncontradoError; en ningún orden aparece un error de clave foránea

### BEH-S11-018
- cubre: REQ-S11-031, REQ-S11-032, REQ-S11-033
- categoria: feliz
- dado: la pantalla de productos y el modal de venta
- cuando: el administrador abre la lista, elige «Agua 600 ml», cantidad 3 y Yape, y registra
- entonces: los precios aparecen como «S/ 2.50», el total como «S/ 7.50», sin tasa ni bolívares, y el botón queda deshabilitado mientras se registra

### BEH-S11-019
- cubre: REQ-S11-034
- categoria: borde
- dado: un PDF, un archivo con extensión .jpg pero contenido de texto, un JPG de 2 097 152 bytes, un JPG de 2 097 153 bytes y un PNG de 1 MB
- cuando: se intenta guardar cada uno como foto de un producto
- entonces: el PDF, el de contenido de texto y el de 2 097 153 bytes se rechazan sin subir nada ni escribir, y el de 2 097 152 bytes y el PNG se aceptan

### BEH-S11-020
- cubre: REQ-S11-035, REQ-S11-036
- categoria: error
- dado: un archivo por cada uno de los siete términos de REQ-S11-035
- cuando: se ejecuta tools/verificar-producto.mjs
- entonces: falla y nombra archivo, línea y término de cada uno

### BEH-S11-021
- cubre: REQ-S11-037
- categoria: error
- dado: un pull request que agrega fechaVenta en un archivo
- cuando: corre el CI
- entonces: el paso de tools/verificar-producto.mjs falla y queda en rojo

## 3. Invariantes

### INV-S11-001
- propiedad: el monto de toda venta es exactamente el precio por la cantidad
- mecanismo: test-propiedad
- deteccion: sobre 200 precios y cantidades generados con un generador congruencial lineal de semilla fija escrito en la prueba, el monto del pago es igual a multiplicarPorEntero(precio, cantidad) en cadena de dos decimales
- protege: REQ-S11-010, REQ-S11-011

### INV-S11-002
- propiedad: no hay dos productos con el mismo nombre normalizado
- mecanismo: restriccion-bd
- deteccion: índice único sobre el nombre normalizado; una inserción duplicada falla
- protege: REQ-S11-002, REQ-S11-005, REQ-S11-006

### INV-S11-003
- propiedad: un cobroId produce como máximo una venta
- mecanismo: restriccion-bd
- deteccion: la restricción única de Pago.cobroId de S-04; una inserción duplicada falla
- protege: REQ-S11-016, REQ-S11-017, REQ-S11-020

### INV-S11-004
- propiedad: los términos heredados de tasa, turno, carrito y fecha pasada no aparecen en apps ni packages
- mecanismo: lint
- deteccion: tools/verificar-producto.mjs termina con código distinto de cero y lista archivo:línea y término
- protege: REQ-S11-013, REQ-S11-022, REQ-S11-035, REQ-S11-036

## 4. Criterios de aceptación

### AC-S11-001
- enlaza: REQ-S11-001, REQ-S11-003, BEH-S11-001
- metodo: integracion
- procedimiento: con una base efímera, crear «Agua 600 ml» a «2.50» con espacios sobrantes en el nombre y leer la fila y el tipo de la columna
- esperado: costo «2.50» como cadena de dos decimales, tipo numeric(12,2) y nombre recortado
- test: pendiente

### AC-S11-002
- enlaza: REQ-S11-003, REQ-S11-004, BEH-S11-002
- metodo: integracion
- procedimiento: probar los límites de nombre, descripción y precio de BEH-S11-002
- esperado: los valores fuera de los límites se rechazan con ProductoInvalidoError sin escribir y los del borde se aceptan
- test: pendiente

### AC-S11-003
- enlaza: REQ-S11-002, REQ-S11-005, REQ-S11-006, BEH-S11-003, BEH-S11-004, INV-S11-002
- metodo: integracion
- procedimiento: crear «Agua 600 ml», intentar crear y renombrar con «  agua  600 ML  », y lanzar dos creaciones simultáneas de «Guantes» con una barrera
- esperado: los duplicados fallan con ProductoDuplicadoError y queda una sola fila «Guantes»
- test: pendiente

### AC-S11-004
- enlaza: REQ-S11-007, REQ-S11-008, REQ-S11-011, REQ-S11-027, REQ-S11-028, BEH-S11-005, BEH-S11-006, BEH-S11-016
- metodo: integracion
- procedimiento: editar el precio y el nombre de un producto con una venta, eliminar uno sin ventas y otro con una, renombrar un producto a su mismo nombre y editar y eliminar un identificador inexistente
- esperado: la venta conserva nombre, cantidad, productoId y monto, el primero se borra (ELIMINADO) y el segundo se desactiva (DESACTIVADO), el renombrado se acepta y los inexistentes lanzan ProductoNoEncontradoError
- test: pendiente

### AC-S11-005
- enlaza: REQ-S11-009, REQ-S11-010, REQ-S11-012, REQ-S11-023, REQ-S11-024, BEH-S11-007, BEH-S11-008, INV-S11-001
- metodo: integracion
- procedimiento: vender 3 unidades de «Agua 600 ml» a «2.50» con Efectivo, las combinaciones inválidas de BEH-S11-008, y 200 precios y cantidades con el generador de semilla fija
- esperado: se crea un pago de «7.50» con los campos de BEH-S11-007, cada inválida lanza su error sin escribir y el monto siempre es el precio por la cantidad
- test: pendiente

### AC-S11-006
- enlaza: REQ-S11-013, REQ-S11-014, REQ-S11-015, REQ-S11-021, REQ-S11-022, BEH-S11-009, BEH-S11-010
- metodo: integracion
- procedimiento: sin turno ni tasa, vender con un campo extra «fecha» de hace 10 días, y vender con Efectivo, Yape con número, transferencia sin número y un método inactivo
- esperado: el campo extra se ignora y se usa la hora de Lima del servidor, se aceptan Efectivo y Yape y se rechazan la transferencia sin número y el método inactivo
- test: pendiente

### AC-S11-007
- enlaza: REQ-S11-016, REQ-S11-017, REQ-S11-018, REQ-S11-019, REQ-S11-020, BEH-S11-011, BEH-S11-012, BEH-S11-013, BEH-S11-014, INV-S11-003
- metodo: integracion
- procedimiento: repetir un envío con el mismo cobroId, enviar cobroId ausente, K con otra cantidad, K con otro número de operación, el cobroId de una membresía y el de una venta anulada, y lanzar dos envíos simultáneos del mismo cobroId con una barrera
- esperado: el repetido devuelve el pago original, los rechazos lanzan CobroIdInvalidoError o CobroAnuladoError sin crear pago y el simultáneo crea un solo pago sin error crudo
- test: pendiente

### AC-S11-008
- enlaza: REQ-S11-025, REQ-S11-026, BEH-S11-015
- metodo: integracion
- procedimiento: enviar a las acciones de crear, editar, eliminar y vender peticiones sin sesión y con cuatro usuarios que tienen un solo permiso cada uno
- esperado: la petición sin sesión se rechaza y cada usuario logra solo la operación de su permiso
- test: pendiente

### AC-S11-009
- enlaza: REQ-S11-029, REQ-S11-030, BEH-S11-017
- metodo: integracion
- procedimiento: con una barrera que fija quién toma primero el bloqueo, lanzar con Promise.all una venta y la eliminación del mismo producto, en cada orden
- esperado: el resultado es el de BEH-S11-017 en cada orden y ninguno produce un error de clave foránea
- test: pendiente

### AC-S11-010
- enlaza: REQ-S11-031, REQ-S11-032, REQ-S11-033, BEH-S11-018
- metodo: manual
- procedimiento: abrir «Productos», elegir «Agua 600 ml», cantidad 3 y Yape en el modal de venta, y registrar
- esperado: los precios y el total se muestran con «S/ 2.50» y «S/ 7.50», sin tasa ni bolívares, y el botón queda deshabilitado mientras se registra
- test: pendiente

### AC-S11-011
- enlaza: REQ-S11-034, BEH-S11-019
- metodo: integracion
- procedimiento: llamar a la acción de guardar foto con los cinco archivos de BEH-S11-019 y un almacenamiento simulado que cuenta las subidas
- esperado: los tres rechazados no llaman al almacenamiento ni escriben y los dos aceptados se suben
- test: pendiente

### AC-S11-012
- enlaza: REQ-S11-035, REQ-S11-036, BEH-S11-020, INV-S11-004
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-producto.mjs con un árbol por cada uno de los siete términos y con otro limpio
- esperado: falla con los siete términos nombrando archivo, línea y término y pasa con el limpio
- test: pendiente

### AC-S11-013
- enlaza: REQ-S11-035, REQ-S11-036, INV-S11-004
- metodo: unitario
- procedimiento: ejecutar tools/verificar-producto.mjs sobre el árbol final
- esperado: termina con código cero y no encuentra ningún término
- test: pendiente

### AC-S11-014
- enlaza: REQ-S11-037, BEH-S11-021
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue fechaVenta en un archivo y mirar el resultado del CI; si la protección de main no está activa, mirar el estado del paso en la ejecución de la rama
- esperado: el paso de tools/verificar-producto.mjs falla y su estado queda en rojo
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso y cada commit con typecheck y pruebas en verde, agregando lo nuevo al lado de lo viejo, migrando los llamadores y retirando lo viejo al final): (1) pruebas de caracterización del catálogo y de la venta heredada, incluida la venta con un solo producto; (2) límites, nombre único (índice sobre el nombre normalizado) y `ProductoDuplicadoError` en `crearProducto` y `actualizarProducto`, y `ProductoNoEncontradoError`; (3) `venderProducto` nuevo de un producto, con `cobroId`, `IUnidadDeTrabajo`, un solo método, errores con nombre y bloqueo de la fila del producto, junto al viejo; con el bloqueo exclusivo en `eliminarProducto`; (4) migrar `venderProductoAction` y `ModalVenderProducto` (ya en `cobros/`, S-08) al caso de uso nuevo con el selector de un producto y la cantidad; (5) pantallas `productos/` sin bolívares ni tasa, y validación de la foto; (6) retirar `resolverCobroPasado*`, `resolverItemsVenta`, `ItemCarrito`, el carrito y la fecha de venta; (7) `tools/verificar-producto.mjs` y sus pruebas, sin lista de exenciones, en el mismo commit que deja el árbol limpio, y su paso del CI.
- Las pruebas de concurrencia y de propiedades usan un generador congruencial lineal de semilla fija escrito en la propia prueba, una base efímera y una barrera que fija el orden de las transacciones; no hay dependencias nuevas.
- AC-S11-010 y AC-S11-014 son pasos manuales del propietario (no se verificó que el repositorio pueda ejecutar pruebas de navegador: S-02 nombra herramientas que ninguna spec adopta).

### 5.2 Migración
- No hay datos que migrar (SUP-S11-009). El baseline de S-00 y S-15 crea `Producto` con `costo numeric(12,2)` y el índice único del nombre normalizado.
- **Enmiendas que se registran al aprobar S-11:**
  - S-03: `Producto.costo` se documenta como precio de venta; la familia S-11 queda como `VenderProducto*`, `ModalVenderProducto*` y `productos/*`, y `resolverCobroPasado*` se elimina.
  - S-04: SUP-S04-009 (`Pago.cobroId` «nula en los pagos de otras specs») se lee con que la venta de producto también la escribe; SUP-S04-014 y la nota de `resolverCobroPasado*` quedan cumplidas por su retiro.
  - S-08: el reporte de cobros trata cada venta como un solo producto (SUP-S08-010 y BEH-S08-008 siguen válidos); las ventas con varios productos o varias líneas ya no existen.
  - S-10: `productos/tasaActual.ts` se elimina entero y no solo la tasa.
  - S-22: `Producto` no cambia más de lo que ya retira S-08 (la relación con `DeudaProducto`).
  - `docs/06-modelo-datos-cambios.md`, `docs/datos-iniciales.md` y `COBERTURA-RF.md`: RF-37 queda cubierta por S-11.
- **Traspasos:** S-12 (ticket de la venta), S-14 (ventas por producto en los reportes), S-20 (carteles de producto de la vitrina) y S-23 (permisos de catálogo y venta).
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Quitar el carrito obliga a registrar dos ventas cuando se llevan dos productos, con dos tickets y dos cobroId. Mitigación: es la forma que conserva el detalle por producto; si el propietario prefiere el carrito, se agrega una tabla de líneas de venta (spec nueva).
- Sin stock, el sistema no avisa de agotados ni descuenta existencias. Mitigación: fuera de alcance (0.3).
- El nombre único puede bloquear nombres parecidos legítimos. Mitigación: incluir la medida en el nombre («Agua 600 ml»).
- Cambiar el precio no afecta las ventas ya hechas, pero sí las siguientes; no hay precios por fecha. Mitigación: el pago congela el monto (REQ-S11-010).
- `contarVentas` cuenta también los pagos anulados, por lo que un producto cuyas únicas ventas se anularon se desactiva en lugar de borrarse. Mitigación: es el comportamiento heredado y es seguro; no se cambia.
- La firma de bytes no impide un archivo malicioso con cabecera válida. Mitigación: la foto solo se sirve como imagen desde el almacenamiento; no se procesa en el servidor.
- Las cifras de 0.4 cambian cuando S-00 a S-10 y S-22 modifiquen el árbol. Mitigación: se recuentan al empezar.

### 5.4 Preguntas abiertas
- ¿Una venta es de un solo producto (con cantidad), de modo que dos productos distintos son dos ventas? Default: sí (SUP-S11-002).
- ¿Se retiran las ventas con fecha pasada? Default: sí (SUP-S11-005).
- ¿El nombre del producto debe ser único por su forma normalizada? Default: sí (SUP-S11-003).
- ¿El límite de foto es JPG, PNG o WebP de hasta 2 097 152 bytes, validado por su firma? Default: sí (SUP-S11-008).

## Enmiendas posteriores (2026-11-12)
*Derivadas de la aprobación de otras specs. El texto anterior se conserva; donde choca, rige esta sección.*
- Por la aprobación de S-15: SUP-S11-003 y el índice único del nombre de producto fijan la expresión `lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g')))`.
- Por la aprobación de S-14: el reporte de ventas por producto queda cumplido en `obtenerIngresosPorPeriodo`.

## Revisión independiente

Revisor: subagente `spec-reviewer` (solo lectura, sin ejecutar `spec-lint`), 2026-11-12, sobre el primer borrador. Su definición trae 7 comprobaciones. Veredicto global: **REQUIERE CAMBIOS**. Resumen fiel:

> | # | Comprobación | Veredicto | Hallazgo principal |
> |---|---|---|---|
> | 1 | Cabecera y ADR | CUMPLE | `depende_de` omitía S-02 (hora de Lima); ADR-022 no era origen de ningún REQ |
> | 2 | REQ | NO CUMPLE | REQ-001, 003, 007, 008, 011, 014, 018, 019, 020 y 023 agrupan varias obligaciones; origen de REQ-011 incorrecto; errores genéricos en REQ-012 y REQ-017 |
> | 3 | Cobertura | CUMPLE con observaciones | REQ-011 sin BEH que cambie el precio tras vender; REQ-014 sin BEH que rechace un método ajeno |
> | 4 | AC | NO CUMPLE | AC-005 y BEH-009 enviaban `fechaVenta`, término que REQ-024 prohíbe; AC-007 no probaba el reparto de permisos; AC-010 mezclaba tres comprobaciones |
> | 5 | Hechos | NO CUMPLE (menor) | citas imprecisas (`VenderProducto.ts:77,102-104`, `productos/actions.ts:39-46`, `resolverCobroPasado.ts:11-33`); S-03 no listaba `resolverCobroPasado*` (lo agregó S-04); la regla de `cobroId` es SUP-S04-009 y no REQ-S04-049; `contarVentas` no filtra anulados |
> | 6 | Vaguedad y alcance | NO CUMPLE (menor) | «2 MB» y «espacios sobrantes» sin definir; 0.2 no listaba límites, nombre único ni foto |
> | 7 | Escenarios | NO CUMPLE | faltaban cobroId anulado, cobroId de una membresía, otro número de operación, venta contra eliminación, renombrar al mismo nombre, id inexistente, borde de 2 MB, tipo falsificado y la violación de unicidad |
> | — | Plan | observación | la lista de exenciones de `verificar-producto` no tenía REQ ni AC |

### Conciliación del autor
Los hallazgos se verificaron contra el Repo A y las specs (`VenderProducto.ts`, `PrismaProductoRepository.ts`, `resolverCobroPasado.ts`, `productos/actions.ts`, S-03, S-04) y resultaron ciertos; ninguno se rechazó. La spec pasó de 26 REQ a 37, de 18 BEH a 21, de 4 INV a 4 y de 11 AC a 14.

| Fila | Corrección |
|---|---|
| 1 | `depende_de` incluye S-02; ADR-022 queda por el repositorio de productos |
| 2 | REQ divididos (permisos, fecha, miembro y sede, modal y botón, métodos y número de operación, cobroId); origen de REQ-011 a SUP-S11-002; errores con nombre (`ProductoNoEncontradoError`, `ProductoInactivoError`, `CantidadInvalidaError`, `CobroIdInvalidoError`, `CobroAnuladoError`, SUP-S11-010) |
| 3 | BEH-005 cubre REQ-011; BEH-010 incluye un método inactivo |
| 4 | Las pruebas envían un campo extra «fecha» y no `fechaVenta`; BEH-015 y AC-008 prueban un permiso por usuario; AC-012 y AC-013 separan las comprobaciones de la herramienta |
| 5 | Citas corregidas; 0.4 aclara el origen de la familia S-11 y que `contarVentas` cuenta anulados (riesgo en 5.3); 5.2 cita SUP-S04-009 |
| 6 | 2 097 152 bytes y normalización del nombre definidos (SUP-S11-003, SUP-S11-008); 0.2 alineado con los REQ |
| 7 | REQ-019 y REQ-020 (cobroId anulado y unicidad), REQ-027 y REQ-028 (inexistente y mismo nombre), REQ-029 y REQ-030 (bloqueos, BEH-017), REQ-034 (firma de bytes, BEH-019) |
| Plan | la herramienta se crea sin exenciones en el paso 7, en el mismo commit que deja el árbol limpio |
