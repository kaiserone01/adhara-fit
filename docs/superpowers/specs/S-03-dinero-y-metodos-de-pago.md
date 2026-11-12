---
id: S-03
estado: en-revision
adrs: ADR-003, ADR-006, ADR-011, ADR-016, ADR-022
depende_de: S-00, S-01, S-22
aprobada_por:
fecha_aprobacion:
---
# S-03 — Dinero en soles con dos decimales exactos y catálogo de métodos de pago de Perú

## 0. Contexto y alcance

### 0.1 Problema
El código heredado maneja el dinero como `number` de JavaScript, con redondeos dispersos (`Math.round(x * 100) / 100`) y comparaciones con tolerancia (`< 0.01`), y está pensado para dólares y bolívares: los precios se llaman `precioUSD`, hay un catálogo de métodos venezolanos (pago móvil, BioPago, punto de venta, cripto) y el campo de dinero de la interfaz usa el formato latino (`1.234,56`). ADR-003 (solo soles), ADR-011 (política monetaria: PEN con dos decimales, aritmética exacta y redondeo solo por regla) y ADR-006 (métodos de pago peruanos) están aceptados. S-03 construye el módulo de dinero, el formateador de soles, la representación en base de datos y en la API, y el catálogo de métodos; no reescribe el cobro (S-04), el cambio de plan (S-07), la caja (S-08) ni retira la tasa de cambio (S-10).

### 0.2 Dentro de alcance
- Módulo `packages/domain/utils/dinero.ts` con las operaciones de la tabla de 5.1, sin coma flotante binaria.
- Política de redondeo de efectivo preparada y apagada, con la política `ninguna`.
- Formateador `formatearSoles` en `packages/ui/formato/soles.ts` y campo de dinero (`CurrencyInput`) con el formato de Perú.
- Columnas de dinero que sobreviven, renombradas sin el sufijo `USD` y con `numeric(12,2)`: `Plan.precio`, `Miembro.precioPlan`, `Pago.monto`, `Producto.costo` y `MiembroReferencia.precioPlan`. Los repositorios entregan los montos al dominio como cadena decimal.
- Representación de montos en la API: cadena decimal con el código `PEN`.
- Catálogo de métodos de pago de Perú: tipos, campos de configuración, número de operación obligatorio fuera del efectivo y validación del CCI.
- `tools/verificar-dinero.mjs` con sus pruebas y `tools/verificar-dinero.exenciones.json`, ejecutada en el CI.

### 0.3 Fuera de alcance
- Cobro con pago único, fin de los abonos y del saldo a favor, y reglas de abono: S-04. Sus archivos (`RegistrarPago.ts`, `CobrarAbonoPendiente.ts`, `ListarAbonosPendientes.ts` y `ReglaAbono.ts`) entran en la lista de exenciones.
- Cambio de plan (`CambiarPlanConPago.ts` y `cambioPlanCalculo.ts`): S-07, exentos.
- Turnos, arqueo, egresos y fiado: S-08 y ADR-018, exentos.
- Tasa de cambio, conversión a bolívares, `Pago.tasaCambio`, `Pago.montoBs` y `formatearBs.ts`: S-10, exentos.
- Precios y ofertas de la vitrina (`VitrinaItem`): S-20, exentos.
- Tickets por correo e impresión y registro de comprobantes: S-12, apagados.
- Impuestos (IGV) y transacciones fiscales: fuera de alcance por decisión del propietario; solo queda la función genérica de porcentaje.
- Activar el redondeo de efectivo del BCRP: pendiente de validar su texto vigente.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los `grep` excluyen `node_modules`, `generated` y `.next`.
- **Columnas de dinero:** hay 23 columnas `Decimal` en `packages/db/prisma/schema.prisma` (verificado con `awk` sobre `schema.prisma`): `Sucursal.tasaCambioUSD`, `Miembro.precioPlan` y `saldoAFavorUSD`, `Plan.precioUSD` y `minimoAbonoValor`, `ReglaAbonoPorFrecuencia.minimoAbonoValor`, `Pago.monto`, `tasaCambio` y `montoBs`, `Producto.costoUSD`, `DeudaProducto.precioUnitarioUSD`, `Turno.fondoInicialEfectivoUSD` y `fondoInicialEfectivoBs`, `Egreso.monto`, `tasaCambio` y `montoUSD`, `ArqueoLinea.montoEsperado`, `montoContado` y `diferencia`, `TasaCambio.valor`, `MiembroReferencia.precioPlanUSD` y `VitrinaItem.precioUSD` y `ofertaUSD`. Las que sobreviven al resto de las specs son `Plan`, `Miembro.precioPlan`, `Pago.monto`, `Producto.costo` y `MiembroReferencia`; la `Pago.monto` es `Decimal(10,2)` (`schema.prisma:268`).
- **Aritmética flotante:** el dominio suma y compara con `number`: `validarLineasDePago` compara con `Math.abs(suma - montoObjetivo) >= 0.01` (`packages/domain/entities/Pago.ts:134`), `repartirLineasPago` convierte con `Math.round(monto * 100)` (`Pago.ts:148`, `:155`) y hay `Math.round(x * 100) / 100` y `toFixed(2)` en `ListarAbonosPendientes.ts:66`, `CobrarAbonoPendiente.ts:20`, `:58`, `RegistrarPago.ts:80`, `:149`, `:154`, `:368`, `:482`, `ConvertirMontoUSDaVES.ts:26` y `CambiarPlanConPago.ts:243-245`; 128 líneas con `.toFixed(` o `Math.round(` en `apps` y `packages` (verificado con `grep -rIn`, algunas no son de dinero).
- **Acoplamiento a USD y Bs:** 80 archivos no de prueba mencionan `USD`, 48 `Bs`, 28 `tasaCambio` y 4 los valores venezolanos de `TipoMetodoPago` (`PAGO_MOVIL`, `PUNTO_VENTA`, `BIOPAGO`, `CRIPTO`) (verificado con `grep -rIlE`).
- **Catálogo de métodos:** `enum TipoMetodoPago` tiene `EFECTIVO`, `PAGO_MOVIL`, `TRANSFERENCIA`, `PUNTO_VENTA`, `BIOPAGO` y `CRIPTO` (`schema.prisma:537`); `MetodoPago` (`:546`) lleva `moneda` («USD» o «BS»), `codigoBanco`, `rif`, `numeroCuenta`, `beneficiario`, `qrUrl`, `walletDireccion` y `walletUsuario`; la interfaz de administración está en `apps/web-admin/app/(panel)/configuraciones/metodos-pago` y 23 archivos mencionan `TipoMetodoPago` o `metodoPago`.
- **Número de operación:** `Pago.numeroOperacion` es opcional (`schema.prisma:284`) y ninguna regla del dominio lo exige (`grep -rn numeroOperacion packages/domain` sin reglas de obligatoriedad).
- **Interfaz:** `packages/ui/components/CurrencyInput.tsx` usa el formato latino, punto para miles y coma decimal, con `Intl.NumberFormat("es-VE")` (`:9-18`), y envía el valor plano en un `input` oculto; lo usan 13 archivos. `packages/domain/utils/formatearBs.ts:2` formatea con `es-VE`.
- **API:** `api/pagos/route.ts:68-70` y `api/planes/route.ts:48-71` reciben `monto` y `precioUSD` sin validar su formato ni sus decimales.
- **Drizzle (S-22):** `numeric` entrega `string` por defecto y S-22 lo declara en modo `number` para conservar el dominio (`docs/superpowers/specs/S-22-capa-de-datos-con-drizzle.md`, REQ-S22-010; verificado con `grep -n REQ-S22-010 docs/superpowers/specs/S-22-capa-de-datos-con-drizzle.md`).
- Hechos de política tomados de ADR-011 (aceptado; verificado con `grep -n "Decisión" -A9 docs/adr/ADR-011-politica-monetaria-pen.md`): PEN con dos decimales; API con cadena decimal; un formateador `S/ 120.00`; enteros escalados en el cálculo; sin redondeo global.
- No verificado: que el CCI de Perú tenga siempre 20 dígitos y qué formato exacto usan los números de operación de Yape y Plin.

### 0.5 Supuestos
- SUP-S03-001: el módulo de dinero opera por dentro con enteros escalados (céntimos para importes definitivos y una escala mayor para valores intermedios) y expone cadenas decimales de dos decimales. Default: esa representación; asumido, por validar.
- SUP-S03-002: `numeric(12,2)` basta para todos los importes del negocio (máximo 9,999,999,999.99). Default: `numeric(12,2)`; asumido, por validar.
- SUP-S03-003: una cadena de monto válida son dígitos con hasta dos decimales y sin separador de miles, y se normaliza a dos decimales; se rechazan tres o más decimales, el signo negativo en importes de cobro, la notación exponencial y los espacios. Default: ese formato; asumido, por validar.
- SUP-S03-004: la política `bcrp` de redondeo de efectivo no se implementa hasta validar el texto vigente de la norma; S-03 entrega la política `ninguna` y la interfaz para inyectar otra. Default: solo `ninguna` activa; asumido, por validar.
- SUP-S03-005: el propietario indicó el 2026-11-12 que los métodos de pago conformados son **Yape y transferencias al BCP**; el seed (S-15) crea esos dos como activos y deja el catálogo abierto (Efectivo, Plin, Tarjeta y Depósito se pueden agregar desde la administración). Default: esos dos activos; asumido, por validar (falta confirmar si el efectivo se cobra en el local).
- SUP-S03-006: el CCI se valida solo como 20 dígitos numéricos, sin comprobar el banco. Default: 20 dígitos; asumido, por validar.
- SUP-S03-007: las columnas que otras specs retiran (`saldoAFavorUSD`, `tasaCambio`, `montoBs`, las de turno, egreso, arqueo y fiado, y los mínimos de abono) no se tocan aquí; la lista de exenciones de `tools/verificar-dinero.mjs` se genera al implementar y la revisa el propietario. Default: ese reparto entre S-04, S-07, S-08, S-10 y S-20; asumido, por validar.
- SUP-S03-008: S-03 enmienda REQ-S22-010: tras S-03 los repositorios entregan `numeric` como cadena (modo `string` de Drizzle) y no como `number`. Default: esa enmienda; asumido, por validar.

## 1. Requisitos

### REQ-S03-001
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El módulo packages/domain/utils/dinero.ts deberá exportar las operaciones de la tabla de 5.1 con montos como cadenas decimales de dos decimales.

### REQ-S03-002
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El módulo de dinero no deberá usar aritmética de coma flotante binaria para sumar, restar, multiplicar, repartir ni calcular porcentajes.

### REQ-S03-003
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si una cadena de monto no cumple el formato de SUP-S03-003 o supera los 10 dígitos enteros entonces montoDeTexto deberá lanzar un error que nombre el valor recibido.

### REQ-S03-004
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El módulo de dinero deberá repartir un total entre N partes de modo que la suma de las partes sea exactamente el total y las diferencias de un céntimo se asignen a las primeras partes.

### REQ-S03-005
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función de porcentaje deberá conservar la precisión intermedia y redondear una sola vez, al céntimo, con el modo indicado por quien la llama, que por defecto es half-up.

### REQ-S03-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función redondearEfectivo deberá devolver el importe original, el monto a cobrar y el ajuste, con monto a cobrar igual al importe original más el ajuste.

### REQ-S03-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La política de redondeo de efectivo ninguna deberá devolver el importe original como monto a cobrar y un ajuste de 0.00.

### REQ-S03-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Ninguna pantalla, API ni cobro deberá aplicar un redondeo de efectivo mientras la política activa sea ninguna.

### REQ-S03-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El formateador formatearSoles de packages/ui/formato/soles.ts deberá mostrar los montos como S/ 120.00, con coma para los miles y signo menos delante de S/ en los negativos.

### REQ-S03-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El campo de dinero de la interfaz deberá mostrar y aceptar el formato de Perú, con coma para los miles y punto decimal, y enviar el valor plano con punto decimal.

### REQ-S03-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las columnas Plan.precio, Miembro.precioPlan, Pago.monto, Producto.costo y MiembroReferencia.precioPlan deberán ser numeric(12,2).

### REQ-S03-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: Los repositorios deberán entregar los montos al dominio como cadenas decimales de dos decimales y no como number.

### REQ-S03-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las respuestas JSON de la API deberán entregar cada monto como cadena decimal de dos decimales junto con el código de moneda PEN.

### REQ-S03-014
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si el cuerpo de una petición trae un monto que no es una cadena válida según SUP-S03-003 entonces la ruta deberá responder 400 sin ejecutar el caso de uso.

### REQ-S03-015
- tipo: cuando
- prioridad: MUST
- origen: ADR-011
- texto: Cuando se cobra con varios métodos en un mismo cobro, el sistema deberá exigir que la suma de las líneas sea exactamente igual al monto objetivo, sin tolerancia.

### REQ-S03-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: El catálogo TipoMetodoPago deberá contener solo los valores EFECTIVO, BILLETERA_DIGITAL, TARJETA, TRANSFERENCIA y DEPOSITO.

### REQ-S03-017
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: El método de pago deberá tener nombre, tipo, banco, titular, teléfono, número de cuenta, CCI, URL del QR, URL del logo, orden y estado activo.

### REQ-S03-018
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si una línea de pago usa un método distinto de EFECTIVO y no trae número de operación entonces el sistema deberá rechazarla.

### REQ-S03-019
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si un CCI no tiene exactamente 20 dígitos numéricos entonces el sistema deberá rechazar el método de pago.

### REQ-S03-020
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Los archivos de apps y packages que no figuran en la lista de exenciones no deberán contener identificadores con el sufijo USD, ni las cadenas Bs o tasaCambio, ni los valores PAGO_MOVIL, PUNTO_VENTA, BIOPAGO o CRIPTO.

### REQ-S03-021
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-dinero.mjs encuentra en un archivo no exento alguno de los patrones de la tabla de 5.1, deberá terminar con código distinto de cero y nombrar archivo y línea.

### REQ-S03-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-dinero.mjs en cada pull request.

### REQ-S03-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada entrada de tools/verificar-dinero.exenciones.json deberá nombrar un archivo existente y la spec que lo reescribe o retira, que será S-04, S-07, S-08, S-10 o S-20.

### REQ-S03-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: El método de pago no deberá tener moneda ni los campos de pago móvil, RIF ni billetera de criptomonedas.

## 2. Comportamiento

- no_aplica: concurrencia — las operaciones de dinero son funciones puras y sin estado compartido

### BEH-S03-001
- cubre: REQ-S03-001, REQ-S03-002
- categoria: feliz
- dado: los montos "15.43" y "29.99"
- cuando: se suman, se resta el segundo del total y se multiplica "29.99" por 3
- entonces: la suma es "45.42", la resta devuelve "15.43" y el producto es "89.97", con cadenas de dos decimales

### BEH-S03-002
- cubre: REQ-S03-003
- categoria: error
- dado: las cadenas "1,200.00", "12.345", "-5", "1e3", "", " 120.00 " y "12345678901.00"
- cuando: se llama a montoDeTexto con cada una
- entonces: cada llamada lanza un error que nombra el valor recibido

### BEH-S03-003
- cubre: REQ-S03-003
- categoria: borde
- dado: las cadenas "120", "120.5", "0.01", "0", "9999999999.99" y "0.00"
- cuando: se llama a montoDeTexto con cada una
- entonces: devuelve "120.00", "120.50", "0.01", "0.00", "9999999999.99" y "0.00"

### BEH-S03-004
- cubre: REQ-S03-004
- categoria: borde
- dado: un total de "100.00" repartido en 3 partes y un total de "0.02" repartido en 3 partes
- cuando: se ejecuta repartir
- entonces: las partes son "33.34", "33.33" y "33.33" para el primero, y "0.01", "0.01" y "0.00" para el segundo, y en ambos la suma es el total

### BEH-S03-005
- cubre: REQ-S03-005
- categoria: borde
- dado: porcentaje de "99.95" al 10, de "0.05" al 10 y de "100.00" al 18
- cuando: se calcula con half-up y con redondeo hacia abajo
- entonces: half-up da "10.00", "0.01" y "18.00", y hacia abajo da "9.99", "0.00" y "18.00"

### BEH-S03-006
- cubre: REQ-S03-006, REQ-S03-007, REQ-S03-008
- categoria: feliz
- dado: el importe "15.43" y la política ninguna
- cuando: se ejecuta redondearEfectivo
- entonces: devuelve original "15.43", a cobrar "15.43" y ajuste "0.00", y el cobro registra el importe original sin ajuste

### BEH-S03-007
- cubre: REQ-S03-006
- categoria: borde
- dado: una política de prueba que baja el total al múltiplo de 0.10 inferior (solo para pruebas, no es la regla del BCRP) y los importes "15.43" y "15.40"
- cuando: se ejecuta redondearEfectivo con esa política
- entonces: el primero devuelve original "15.43", a cobrar "15.40" y ajuste "-0.03"; el segundo devuelve a cobrar "15.40" y ajuste "0.00"; en ambos el original no cambia

### BEH-S03-008
- cubre: REQ-S03-009
- categoria: feliz
- dado: los montos "120.00", "1200.00", "-50.25" y "0.00"
- cuando: se formatean con formatearSoles
- entonces: se ve S/ 120.00, S/ 1,200.00, -S/ 50.25 y S/ 0.00, con espacios normales

### BEH-S03-009
- cubre: REQ-S03-010
- categoria: borde
- dado: el campo de dinero y una persona que escribe 1,234.5
- cuando: sale del campo
- entonces: el campo muestra 1,234.50 y el valor oculto enviado es "1234.50"; si escribe 1.234,56 el campo lo rechaza o lo interpreta como 1.23 sin miles según SUP-S03-003 y muestra un aviso

### BEH-S03-010
- cubre: REQ-S03-011, REQ-S03-012
- categoria: feliz
- dado: un pago guardado con monto 15.43
- cuando: el repositorio lo lee
- entonces: el dominio recibe la cadena "15.43", no el number 15.43

### BEH-S03-011
- cubre: REQ-S03-013, REQ-S03-014
- categoria: error
- dado: una petición POST a api/pagos con monto 120.5 como número, otra con "12.345" y otra con "120.50"
- cuando: se envían
- entonces: las dos primeras responden 400 sin ejecutar el caso de uso y la tercera pasa; las respuestas traen "monto": "120.50" y "moneda": "PEN"

### BEH-S03-012
- cubre: REQ-S03-015
- categoria: error
- dado: un cobro de "100.00" con dos líneas de "50.00" y "49.99"
- cuando: se valida
- entonces: la validación lo rechaza porque la suma es "99.99" y no hay tolerancia

### BEH-S03-013
- cubre: REQ-S03-016, REQ-S03-017, REQ-S03-024
- categoria: feliz
- dado: el esquema final
- cuando: se lee el catálogo y el modelo de método de pago
- entonces: TipoMetodoPago tiene exactamente los 5 valores y el método tiene nombre, banco, titular, teléfono, número de cuenta, CCI, QR, logo, orden y activo, sin moneda ni campos venezolanos

### BEH-S03-014
- cubre: REQ-S03-018
- categoria: error
- dado: una línea de pago con método Yape y sin número de operación, y otra con método Efectivo y sin número
- cuando: se valida cada una
- entonces: la primera se rechaza y la segunda se acepta

### BEH-S03-015
- cubre: REQ-S03-019
- categoria: error
- dado: CCI de 19 dígitos, de 21 dígitos, con letras y de 20 dígitos
- cuando: se guarda un método con cada uno
- entonces: se rechazan los tres primeros y se acepta el de 20 dígitos

### BEH-S03-016
- cubre: REQ-S03-020, REQ-S03-021
- categoria: error
- dado: archivos de prueba con precioUSD, montoBs, PAGO_MOVIL, Math.round(x * 100) / 100 y toFixed(2) sobre un monto
- cuando: se ejecuta tools/verificar-dinero.mjs
- entonces: la herramienta falla y nombra archivo y línea de cada uno

### BEH-S03-017
- cubre: REQ-S03-022
- categoria: error
- dado: un pull request que agrega precioUSD en un archivo no exento
- cuando: corre el CI
- entonces: el paso de tools/verificar-dinero.mjs falla y el pull request queda en rojo

### BEH-S03-018
- cubre: REQ-S03-023
- categoria: borde
- dado: una exención que nombra un archivo que ya no existe y otra sin la spec responsable
- cuando: se ejecuta tools/verificar-dinero.mjs
- entonces: la herramienta falla pidiendo quitar la primera y completar la segunda

## 3. Invariantes

### INV-S03-001
- propiedad: para cualquier par de montos válidos, sumar(a, b) menos b es a y la suma de las partes de repartir(total, n) es el total
- mecanismo: test-propiedad
- deteccion: la prueba de propiedad genera 1000 pares y totales con semilla fija entre 0.00 y 9999999999.99 y falla ante la primera violación
- protege: REQ-S03-001, REQ-S03-002, REQ-S03-004

### INV-S03-002
- propiedad: para cualquier importe y política, a cobrar es igual al importe original más el ajuste, y el importe original no cambia
- mecanismo: test-propiedad
- deteccion: la prueba de propiedad genera 1000 importes y falla si original más ajuste difiere del monto a cobrar o si el original cambió
- protege: REQ-S03-006, REQ-S03-007, REQ-S03-008

### INV-S03-003
- propiedad: ningún monto guardado tiene más de dos decimales
- mecanismo: restriccion-bd
- deteccion: las columnas son numeric(12,2); una inserción con tres decimales se redondea o falla según el motor, y la prueba comprueba que el repositorio rechaza antes de insertar
- protege: REQ-S03-011, REQ-S03-012

### INV-S03-004
- propiedad: todo pago con método distinto de efectivo tiene número de operación no vacío
- mecanismo: asercion-dominio
- deteccion: el caso de uso de cobro lanza un error ante una línea sin número; la consulta de la base devuelve 0 filas de Pago con método no efectivo y número vacío
- protege: REQ-S03-018

### INV-S03-005
- propiedad: ningún archivo no exento de apps ni packages contiene un identificador con USD, la cadena Bs, un redondeo manual de dinero o un valor venezolano de método de pago
- mecanismo: lint
- deteccion: tools/verificar-dinero.mjs devuelve al menos un archivo
- protege: REQ-S03-002, REQ-S03-020, REQ-S03-021

### INV-S03-006
- propiedad: toda entrada de la lista de exenciones apunta a un archivo existente y a una spec responsable
- mecanismo: lint
- deteccion: tools/verificar-dinero.mjs falla ante una entrada obsoleta o incompleta
- protege: REQ-S03-023

## 4. Criterios de aceptación

### AC-S03-001
- enlaza: REQ-S03-001, REQ-S03-002, BEH-S03-001, INV-S03-001
- metodo: unitario
- procedimiento: ejecutar las pruebas del módulo de dinero con "15.43", "29.99" y 3, y la prueba de propiedad de 1000 pares
- esperado: la suma es "45.42", la resta "15.43" y el producto "89.97", y la propiedad pasa
- test: pendiente

### AC-S03-002
- enlaza: REQ-S03-003, BEH-S03-002, BEH-S03-003
- metodo: unitario
- procedimiento: llamar a montoDeTexto con "1,200.00", "12.345", "-5", "1e3", "", " 120.00 ", "12345678901.00", "120", "120.5", "0.01", "0", "9999999999.99" y "0.00"
- esperado: los siete primeros lanzan un error con el valor recibido y los seis últimos devuelven "120.00", "120.50", "0.01", "0.00", "9999999999.99" y "0.00"
- test: pendiente

### AC-S03-003
- enlaza: REQ-S03-004, BEH-S03-004, INV-S03-001
- metodo: unitario
- procedimiento: repartir "100.00" y "0.02" en 3 partes y ejecutar la propiedad
- esperado: ["33.34","33.33","33.33"] y ["0.01","0.01","0.00"], y la suma de las partes es el total
- test: pendiente

### AC-S03-004
- enlaza: REQ-S03-005, BEH-S03-005
- metodo: unitario
- procedimiento: calcular el 10 por ciento de "99.95" y "0.05", y el 18 por ciento de "100.00", con half-up y con redondeo hacia abajo
- esperado: half-up "10.00", "0.01" y "18.00"; hacia abajo "9.99", "0.00" y "18.00"
- test: pendiente

### AC-S03-005
- enlaza: REQ-S03-006, REQ-S03-007, REQ-S03-008, BEH-S03-006, BEH-S03-007, INV-S03-002
- metodo: unitario
- procedimiento: ejecutar redondearEfectivo con la política ninguna y con la política de prueba sobre "15.43" y "15.40", la propiedad de 1000 importes, y registrar un cobro de efectivo de "15.43" con la política ninguna
- esperado: ninguna devuelve a cobrar "15.43" y ajuste "0.00"; la política de prueba devuelve "15.40" y "-0.03" para el primero y "15.40" y "0.00" para el segundo; el cobro guarda "15.43" sin ajuste
- test: pendiente

### AC-S03-006
- enlaza: REQ-S03-009, BEH-S03-008
- metodo: unitario
- procedimiento: formatear "120.00", "1200.00", "-50.25" y "0.00" con formatearSoles y comprobar que la salida no contiene U+00A0 ni U+202F
- esperado: S/ 120.00, S/ 1,200.00, -S/ 50.25 y S/ 0.00, solo con espacios normales
- test: pendiente

### AC-S03-007
- enlaza: REQ-S03-010, BEH-S03-009
- metodo: unitario
- procedimiento: ejecutar las funciones puras de formato y lectura del campo de dinero con "1234.5", "1,234.5" y "1.234,56"
- esperado: "1,234.50" y "1234.50" para las dos primeras; la tercera se rechaza con el aviso definido
- test: pendiente

### AC-S03-008
- enlaza: REQ-S03-011, REQ-S03-012, BEH-S03-010, INV-S03-003
- metodo: integracion
- procedimiento: con una base efímera, guardar un pago de "15.43", leerlo con el repositorio, intentar guardar "15.439" y consultar el tipo de las cinco columnas
- esperado: el repositorio devuelve la cadena "15.43", rechaza "15.439" antes de insertar y las cinco columnas son numeric(12,2)
- test: pendiente

### AC-S03-009
- enlaza: REQ-S03-013, REQ-S03-014, BEH-S03-011
- metodo: integracion
- procedimiento: enviar a api/pagos monto 120.5 como número, "12.345" y "120.50", y leer las respuestas de api/pagos, api/planes y api/miembros
- esperado: las dos primeras responden 400 sin ejecutar el caso de uso; la tercera pasa; todas las respuestas traen cada monto como cadena de dos decimales con "moneda": "PEN"
- test: pendiente

### AC-S03-010
- enlaza: REQ-S03-015, BEH-S03-012
- metodo: unitario
- procedimiento: validar un cobro de "100.00" con líneas "50.00" y "49.99", y otro con "50.00" y "50.00"
- esperado: el primero se rechaza y el segundo se acepta
- test: pendiente

### AC-S03-011
- enlaza: REQ-S03-016, REQ-S03-017, REQ-S03-024, BEH-S03-013
- metodo: sql
- procedimiento: consultar el enum TipoMetodoPago y las columnas de MetodoPago en la base creada por el esquema final
- esperado: el enum tiene EFECTIVO, BILLETERA_DIGITAL, TARJETA, TRANSFERENCIA y DEPOSITO, y la tabla tiene las columnas de REQ-S03-017 y ninguna llamada moneda, rif, codigoBanco, walletDireccion ni walletUsuario
- test: pendiente

### AC-S03-012
- enlaza: REQ-S03-018, BEH-S03-014, INV-S03-004
- metodo: integracion
- procedimiento: cobrar con Yape sin número de operación, con Yape con número "123456" y con Efectivo sin número, y consultar los Pago con método no efectivo y número vacío
- esperado: el primero se rechaza, los otros dos se aceptan y la consulta devuelve 0 filas
- test: pendiente

### AC-S03-013
- enlaza: REQ-S03-019, BEH-S03-015
- metodo: unitario
- procedimiento: validar CCI de 19 dígitos, de 21 dígitos, con letras y "00219300123456789012"
- esperado: se rechazan los tres primeros y se acepta el último
- test: pendiente

### AC-S03-014
- enlaza: REQ-S03-020, REQ-S03-021, BEH-S03-016, INV-S03-005
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-dinero.mjs con árboles de prueba que contienen precioUSD, montoBs, PAGO_MOVIL, Math.round(x * 100) / 100 y toFixed(2) sobre un monto, y otro con formatearSoles y sumar; después ejecutarla sobre el árbol final
- esperado: falla con los cinco primeros nombrando archivo y línea, pasa con el último y no encuentra nada en el árbol final fuera de las exenciones
- test: pendiente

### AC-S03-015
- enlaza: REQ-S03-022, BEH-S03-017
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue precioUSD en un archivo no exento y mirar el resultado del CI
- esperado: el paso de tools/verificar-dinero.mjs falla y el pull request no se puede fusionar mientras la protección de main esté activa
- test: pendiente

### AC-S03-016
- enlaza: REQ-S03-023, BEH-S03-018, INV-S03-006
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-dinero.mjs con una exención que nombra un archivo inexistente y otra sin spec responsable; después sobre el árbol final
- esperado: falla en los dos casos de prueba nombrando el problema y pasa sobre el árbol final con todas las exenciones asignadas a S-04, S-07, S-08, S-10 o S-20
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso): (1) pruebas del módulo de dinero, de `formatearSoles` y de la validación de métodos, en rojo; (2) `dinero.ts` y `soles.ts`; (3) `tools/verificar-dinero.mjs` con sus pruebas, que usa la API de `typescript` (declarada por S-01) y detecta los patrones de abajo; (4) lista de exenciones generada con la herramienta y revisada; (5) esquema y repositorios (columnas renombradas, `numeric(12,2)`, catálogo de métodos, entrega como cadena, enmienda a S-22); (6) rutas con esquemas `zod` de monto (S-01) y respuestas con `PEN`; (7) `CurrencyInput` y el reemplazo de los usos de `USD`, `Bs` y de los redondeos manuales en los archivos no exentos; (8) paso del CI. Las pruebas de propiedad usan un generador con semilla fija; no hay dependencias nuevas.
- **Tabla de operaciones de `dinero.ts`** (entrada y salida como cadenas decimales):

| Función | Firma | Resultado |
|---|---|---|
| `montoDeTexto` | `(texto: string) => string` | monto normalizado a dos decimales o error (SUP-S03-003) |
| `sumar`, `restar` | `(a: string, b: string) => string` | resultado exacto |
| `multiplicarPorEntero` | `(a: string, n: number) => string` | producto exacto |
| `repartir` | `(total: string, n: number) => string[]` | N partes que suman el total (REQ-S03-004) |
| `porcentaje` | `(monto: string, tasa: string, modo?: "half-up" \| "abajo" \| "arriba") => string` | porcentaje redondeado una vez al céntimo (REQ-S03-005) |
| `comparar` | `(a: string, b: string) => -1 \| 0 \| 1` | comparación exacta |
| `redondearEfectivo` | `(importe: string, politica: PoliticaRedondeo) => { original: string; cobrar: string; ajuste: string }` | REQ-S03-006 y REQ-S03-007 |

- **Patrones que `verificar-dinero` rechaza** fuera de las exenciones: identificadores con el sufijo `USD`; las cadenas `Bs` y `tasaCambio`; los valores `PAGO_MOVIL`, `PUNTO_VENTA`, `BIOPAGO` y `CRIPTO`; `Math.round(` con `* 100` o `/ 100`; `.toFixed(` sobre un monto; `Math.abs(` contra `0.01`; `toLocaleString("es-VE"`; y sumar montos con `reduce` sobre `number`. Las llamadas de fecha no se revisan (S-02).

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15. Mientras tanto la base se crea con `drizzle-kit push` (S-22).
- Enmienda a S-22 (que permanece aprobada): REQ-S22-010 y SUP-S22-011 pasan de entregar `number` a entregar cadena con el modo `string` de `numeric`; se registra en «Enmiendas posteriores» de S-22 al aprobarse S-03.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Cambiar los montos de `number` a cadena toca todos los casos de uso y pantallas que hoy suman o comparan montos. Mitigación: los archivos que S-04, S-07, S-08, S-10 y S-20 reescriben quedan exentos hasta entonces, y la herramienta impide que reaparezca la aritmética manual en el resto.
- Las columnas renombradas rompen cualquier consulta o formulario que use `precioUSD`. Mitigación: el typecheck y la herramienta; el seed se escribe después (S-15).
- Los archivos exentos conservan los montos como `number` y quedan incoherentes con la API hasta que sus specs terminen; en ese lapso conviven los dos formatos. Mitigación: la API convierte en la frontera.
- `CurrencyInput` cambia de formato (de `1.234,56` a `1,234.56`): un administrador acostumbrado al formato anterior puede equivocarse. Mitigación: aviso en el campo y rechazo del formato anterior.
- La política `bcrp` no se activa; si el propietario la activa más adelante, hay que validar el texto vigente de la norma con su contador (ADR-011).
- No se verificó que el CCI tenga 20 dígitos ni el formato del número de operación de Yape y Plin (SUP-S03-006).

### 5.4 Preguntas abiertas
- ¿Se cobra en efectivo en el local? Default: no está en el seed; se agrega desde la administración si hace falta (SUP-S03-005).
- ¿Hay un importe máximo razonable para el negocio, menor que S/ 9,999,999,999.99? Default: ese máximo técnico (SUP-S03-002).
- ¿Se permite un cobro de S/ 0.00 como cortesía? Default: lo decide S-04 (la regla actual de `validarLineasDePago` lo admite).
