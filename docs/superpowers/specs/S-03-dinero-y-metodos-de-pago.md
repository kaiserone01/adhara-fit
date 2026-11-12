---
id: S-03
estado: aprobada
adrs: ADR-003, ADR-006, ADR-010, ADR-011, ADR-016, ADR-022
depende_de: S-00, S-01, S-22
aprobada_por: propietario
fecha_aprobacion: 2026-11-12
---
# S-03 — Dinero en soles con dos decimales exactos y catálogo de métodos de pago de Perú

## 0. Contexto y alcance

### 0.1 Problema
El código heredado maneja el dinero como `number` de JavaScript, con redondeos dispersos (`Math.round(x * 100) / 100`) y comparaciones con tolerancia (`< 0.01`), y está pensado para dólares y bolívares: los precios se llaman `precioUSD`, hay un catálogo de métodos venezolanos (pago móvil, BioPago, punto de venta, cripto) y el campo de dinero de la interfaz usa el formato latino (`1.234,56`). ADR-003 (solo soles), ADR-006 (métodos de pago peruanos), ADR-010 (pago exacto) y ADR-011 (política monetaria: PEN con dos decimales, aritmética exacta y redondeo solo por regla) están aceptados. S-03 construye el módulo de dinero, el formateador de soles, la representación en base de datos y en la API, el campo de dinero y el catálogo de métodos. No reescribe el cobro (S-04), el cambio de plan (S-07), la caja (S-08), las ventas de producto (S-11) ni la vitrina (S-20), ni retira la tasa de cambio (S-10): sus archivos quedan en una lista de exenciones y conviven con el resto mediante un puente explícito y temporal (REQ-S03-032).

### 0.2 Dentro de alcance
- Módulo `packages/domain/utils/dinero.ts`, con las operaciones de la tabla de 5.1, que calcula solo con enteros `bigint`.
- Política de redondeo de efectivo preparada, con la política `ninguna` y sin conexión a ningún flujo.
- Formateador `formatearSoles` en `packages/ui/formato/soles.ts` y campo de dinero (`CurrencyInput`) con el formato de Perú.
- Columnas de dinero que sobreviven, renombradas sin el sufijo `USD` y con `numeric(12,2)`: `Plan.precio`, `Miembro.precioPlan`, `Pago.monto`, `Producto.costo` y `MiembroReferencia.precioPlan`; los 5 repositorios que las leen entregan cadenas.
- En `packages/domain/entities/Pago.ts` solo se tocan `DatosLineaPago` (monto como cadena y el tipo del método), `validarLineasDePago` (sin tolerancia y con la regla del número de operación) y `repartirLineasPago` (con `dinero.ts`).
- Las 5 rutas que reciben o entregan dinero (`api/pagos`, `api/planes`, `api/planes/[id]`, `api/miembros` y `api/miembros/[id]`): esquemas de monto y respuestas con `PEN`.
- Catálogo de métodos de pago de Perú: tipos, campos de configuración, validación del CCI, del número de operación y adaptación del formulario de administración y del selector de método.
- Puente temporal `packages/domain/utils/dineroPuente.ts`, solo para archivos exentos.
- `tools/verificar-dinero.mjs` con sus pruebas y `tools/verificar-dinero.exenciones.json`, ejecutada en el CI.

### 0.3 Fuera de alcance
- Cobro con pago único, fin de los abonos y del saldo a favor, reglas de abono y `toleranciaDiferenciaPagoUSD` (`Pago.ts:43`): S-04.
- Cambio de plan: S-07. Turnos, arqueo y egresos: S-08. Ventas de producto, fiado y cobro de deudas: S-11 y S-08 (ADR-018). Tasa de cambio, conversión a bolívares, `Pago.tasaCambio`, `Pago.montoBs` y `formatearBs.ts`: S-10. Precios y ofertas de la vitrina: S-20.
- Tickets por correo e impresión y registro de comprobantes: S-12, apagados.
- Impuestos (IGV) y transacciones fiscales, fuera de alcance por decisión del propietario; solo queda la función genérica de porcentaje.
- Activar el redondeo de efectivo del BCRP: pendiente de validar su texto vigente.
- Cobro de S/ 0.00 como cortesía (`esCortesia`, `Pago.ts:124`): lo decide S-04.

### 0.4 Comportamiento actual verificado
> Verificado el 2026-11-12 sobre el clon de solo lectura del Repo A en `b4352a03`. Los `grep` excluyen `node_modules`, `generated` y `.next`. Las citas de la revisión independiente se re-verificaron con los comandos indicados.
- **Columnas de dinero:** hay 23 columnas `Decimal` en `packages/db/prisma/schema.prisma` (verificado con `awk '/^model /{m=$2} /Decimal/'`): `Sucursal.tasaCambioUSD`, `Miembro.precioPlan` y `saldoAFavorUSD`, `Plan.precioUSD` y `minimoAbonoValor`, `ReglaAbonoPorFrecuencia.minimoAbonoValor`, `Pago.monto`, `tasaCambio` y `montoBs`, `Producto.costoUSD`, `DeudaProducto.precioUnitarioUSD`, `Turno.fondoInicialEfectivoUSD` y `fondoInicialEfectivoBs`, `Egreso.monto`, `tasaCambio` y `montoUSD`, `ArqueoLinea.montoEsperado`, `montoContado` y `diferencia`, `TasaCambio.valor`, `MiembroReferencia.precioPlanUSD` y `VitrinaItem.precioUSD` y `ofertaUSD`. `Pago` empieza en `schema.prisma:268` y su `monto` es `Decimal(10,2)` en `:280`.
- **Aritmética flotante:** `validarLineasDePago` compara con `Math.abs(suma - montoObjetivo) >= 0.01` (`packages/domain/entities/Pago.ts:134`), `aCentavos` usa `Math.round(monto * 100)` (`Pago.ts:148`) y `repartirLineasPago` empieza en `:155`; hay redondeos manuales y `toFixed(2)` en `ListarAbonosPendientes.ts:66`, `CobrarAbonoPendiente.ts:20` y `:58`, `RegistrarPago.ts:80`, `:149`, `:154`, `:368` y `:482`, `ConvertirMontoUSDaVES.ts:26` y `CambiarPlanConPago.ts:243-245`; 128 líneas con `.toFixed(` o `Math.round(` en archivos no de prueba de `apps` y `packages` (verificado con `grep -rIn -E "\.toFixed\(|Math\.round\(" apps packages`, algunas no son de dinero).
- **Acoplamiento a USD y Bs:** 80 archivos no de prueba mencionan `USD` (subcadena), 41 la palabra `Bs` (`\bBs\b`), 28 `tasaCambio` y 4 los valores venezolanos de `TipoMetodoPago` (verificado con `grep -rIlE` sobre `.ts` y `.tsx`, sin pruebas ni `packages/db`).
- **Catálogo de métodos:** `enum TipoMetodoPago` tiene `EFECTIVO`, `PAGO_MOVIL`, `TRANSFERENCIA`, `PUNTO_VENTA`, `BIOPAGO` y `CRIPTO` (`schema.prisma:537`). `MetodoPago` (`:546`) no tiene `nombre`, solo `nombreBanco` (`:551`), y lleva `moneda` (`:553`, que decide si aplica la tasa BCV), `codigoBanco`, `rif`, `numeroCuenta`, `beneficiario`, `qrUrl`, `walletDireccion` y `walletUsuario`. `TIPOS_QUE_PUEDEN_SER_EN_BS` usa los tipos venezolanos (`packages/domain/entities/MetodoPago.ts:7`). La administración está en `apps/web-admin/app/(panel)/configuraciones/metodos-pago` y 23 archivos mencionan `TipoMetodoPago` o `metodoPago`.
- **Número de operación:** `Pago.numeroOperacion` es opcional (`schema.prisma:284`) y `DatosLineaPago` (`Pago.ts:81-87`) no lleva el tipo del método. La interfaz sí exige el número fuera del efectivo (`apps/web-admin/app/(panel)/pagos/SelectorMetodoPago.tsx:181` y `:343`) y valida un formato de cuatro dígitos en `caja/ModalCobrarDeudas.tsx:163` y `caja/ModalVenderProducto.tsx:120`, convención del pago móvil venezolano (verificado con `grep -rn "d{4}" apps --include=*.tsx`).
- **Interfaz de dinero:** `packages/ui/components/CurrencyInput.tsx` usa el formato latino, punto para miles y coma decimal, con `Intl.NumberFormat("es-VE")` (`formatearVisual` en `:11`, `aValorNumerico` en `:23`), y envía el valor plano en un `input` oculto; lo mencionan 13 archivos, incluido el propio componente (verificado con `grep -rIl CurrencyInput apps packages`). `packages/domain/utils/formatearBs.ts:2` formatea con `es-VE`.
- **API:** reciben o entregan dinero 5 rutas: `api/pagos`, `api/planes`, `api/planes/[id]`, `api/miembros` y `api/miembros/[id]` (verificado con `grep -lE "monto|precio|costo"` sobre `apps/web-admin/app/api`); `api/pagos/route.ts:68-70` y `api/planes/route.ts:48-71` no validan formato ni decimales.
- **Quien llama a `validarLineasDePago`:** `RegistrarPago.ts:219`, `CambiarPlanConPago.ts:190`, `VenderProducto.ts:63` y `CobrarDeudasMiembro.ts:78` (cita de la revisión, no re-verificada línea por línea).
- **Drizzle (S-22):** `numeric` entrega `string` por defecto y S-22 lo declara en modo `number` en REQ-S22-010 (verificado con `grep -n REQ-S22-010 docs/superpowers/specs/S-22-capa-de-datos-con-drizzle.md`); SUP-S22-014 conserva los montos como número hasta S-03, y BEH-S22-002, AC-S22-005 y las suites de contrato de REQ-S22-008 y REQ-S22-028 afirman «number, no string».
- **Política:** ADR-011 (aceptado) fija PEN con dos decimales, API con cadena decimal, un formateador `S/ 120.00`, enteros escalados con 6 decimales para valores intermedios y sin redondeo global (verificado con `grep -n "Decisión" -A9 docs/adr/ADR-011-politica-monetaria-pen.md`).
- No verificado: que el CCI de Perú tenga siempre 20 dígitos ni el formato de los números de operación de Yape y de las transferencias al BCP.

### 0.5 Supuestos
- SUP-S03-001: `dinero.ts` calcula con enteros `bigint` y expone cadenas decimales; los importes definitivos tienen 2 decimales y los valores intermedios de `porcentaje` usan 6 decimales, como fija ADR-011. Default: esa representación; asumido, por validar.
- SUP-S03-002: `numeric(12,2)` basta para todos los importes del negocio (máximo 9,999,999,999.99). Default: `numeric(12,2)`; asumido, por validar.
- SUP-S03-003: una cadena de monto de entrada son dígitos con hasta dos decimales, con punto decimal y sin separador de miles, sin signo, sin espacios y sin notación exponencial; se normaliza a dos decimales. Default: ese formato; asumido, por validar.
- SUP-S03-004: el campo de dinero de la interfaz acepta además comas de miles solo en grupos de exactamente tres dígitos (`1,234.56`); una coma seguida de un número distinto de tres dígitos (`120,50`) se rechaza, para que nadie escriba `120,50` y obtenga `12050.00`. Default: esa gramática; asumido, por validar.
- SUP-S03-005: los métodos de pago conformados por el propietario el 2026-11-12 son Yape, transferencias al BCP y Efectivo (confirmó que los cobros en efectivo también son una opción); el seed (S-15) crea esos tres como activos y el catálogo queda abierto para agregar Plin, Tarjeta o Depósito desde la administración. Default: esos tres activos; asumido, por validar (confirmados por el propietario).
- SUP-S03-006: el CCI es opcional; si se informa, se valida como exactamente 20 dígitos numéricos, sin espacios ni guiones. Default: ese criterio; asumido, por validar.
- SUP-S03-007: el número de operación es un texto no vacío tras quitar espacios, de 1 a 40 caracteres; la validación de cuatro dígitos del Repo A es una convención del pago móvil venezolano y se retira. Default: ese criterio; asumido, por validar.
- SUP-S03-008: la política `bcrp` de redondeo de efectivo no se implementa hasta validar el texto vigente de la norma; S-03 entrega la política `ninguna` y la interfaz para inyectar otra. Default: solo `ninguna`; asumido, por validar.
- SUP-S03-009: `porcentaje` recibe la tasa como porcentaje (por ejemplo `"10"` para 10 por ciento), entre `"0"` y `"100"` y con hasta 4 decimales, y un monto no negativo; el modo `half-up` redondea la mitad alejándose de cero. Default: ese contrato; asumido, por validar.
- SUP-S03-010: la lista de exenciones se divide por familias de archivos (tabla de 5.1) y no por el resultado de la herramienta; la spec responsable de un archivo puede diferir entre esta lista y la de S-02. Default: ese reparto; asumido, por validar.
- SUP-S03-011: S-03 enmienda en S-22 REQ-S22-010, SUP-S22-014, BEH-S22-002, AC-S22-005 y las aserciones de montos de las suites de contrato: los repositorios entregan `numeric` como cadena (modo `string` de Drizzle). Default: esa enmienda; asumido, por validar.
- SUP-S03-012: `fast-check` y otras librerías de pruebas de propiedad se descartan; las pruebas usan un generador pseudoaleatorio con semilla fija. Default: sin dependencias nuevas; asumido, por validar.

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
- texto: El módulo dinero.ts deberá calcular solo con enteros bigint, sin number, parseFloat, Number(, Math. ni toFixed.

### REQ-S03-003
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si una cadena de monto no cumple el formato de SUP-S03-003 o supera los 10 dígitos enteros entonces montoDeTexto deberá lanzar un error que nombre el valor recibido.

### REQ-S03-004
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si el resultado de sumar, restar o multiplicarPorEntero queda fuera del rango de -9999999999.99 a 9999999999.99 entonces la función deberá lanzar un error de rango.

### REQ-S03-005
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si repartir recibe un número de partes no entero o menor que 1, multiplicarPorEntero un factor no entero o negativo, o porcentaje una tasa fuera de SUP-S03-009 o un monto negativo entonces la función deberá lanzar un error que nombre el valor recibido.

### REQ-S03-006
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función repartir deberá devolver partes cuya suma sea exactamente el total.

### REQ-S03-007
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función repartir deberá asignar las diferencias de un céntimo a las primeras partes.

### REQ-S03-008
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función porcentaje deberá conservar la precisión intermedia y redondear una sola vez, al céntimo, con el modo indicado por quien la llama, que por defecto es half-up.

### REQ-S03-009
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La función redondearEfectivo deberá devolver el importe original, el monto a cobrar y el ajuste, con monto a cobrar igual al importe original más el ajuste.

### REQ-S03-010
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: La política de redondeo de efectivo ninguna deberá devolver el importe original como monto a cobrar y un ajuste de 0.00.

### REQ-S03-011
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Ningún archivo de producción deberá importar ni llamar a redondearEfectivo mientras la política activa sea ninguna.

### REQ-S03-012
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El formateador formatearSoles de packages/ui/formato/soles.ts deberá mostrar los montos como S/ 120.00, con coma para los miles, signo menos delante de S/ en los negativos y solo espacios normales.

### REQ-S03-013
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El campo de dinero de la interfaz deberá mostrar el valor con coma para los miles y punto decimal y enviar en el campo oculto el valor plano con punto decimal y dos decimales.

### REQ-S03-014
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si el texto del campo de dinero no cumple la gramática de SUP-S03-004 entonces el campo deberá rechazarlo y mostrar el aviso «Escribe el monto con punto decimal, por ejemplo 1,234.56.»

### REQ-S03-015
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las columnas Plan.precio, Miembro.precioPlan, Pago.monto, Producto.costo y MiembroReferencia.precioPlan deberán ser numeric(12,2).

### REQ-S03-016
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-022
- texto: Los repositorios de Plan, Miembro, Pago, Producto y MiembroReferencia deberán entregar los montos al dominio como cadenas decimales de dos decimales y no como number.

### REQ-S03-017
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si un repositorio recibe un monto con más de dos decimales entonces deberá rechazarlo antes de insertarlo.

### REQ-S03-018
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Las respuestas JSON de las 5 rutas con dinero deberán entregar cada monto como cadena decimal de dos decimales y un campo moneda con el valor PEN en la raíz de la respuesta.

### REQ-S03-019
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-011
- texto: Si el cuerpo de una de las 5 rutas con dinero trae un monto que no es una cadena válida según SUP-S03-003 entonces la ruta deberá responder 400 sin ejecutar el caso de uso.

### REQ-S03-020
- tipo: cuando
- prioridad: MUST
- origen: ADR-010
- texto: Cuando se cobra con varios métodos en un mismo cobro, validarLineasDePago deberá exigir que la suma de las líneas sea exactamente igual al monto objetivo, sin tolerancia.

### REQ-S03-021
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si una línea de pago usa un método distinto de EFECTIVO y su número de operación está ausente o en blanco, o supera los 40 caracteres, entonces validarLineasDePago deberá rechazarla.

### REQ-S03-022
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: El catálogo TipoMetodoPago deberá contener solo los valores EFECTIVO, BILLETERA_DIGITAL, TARJETA, TRANSFERENCIA y DEPOSITO.

### REQ-S03-023
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: El método de pago deberá tener nombre, tipo, banco, titular, teléfono, número de cuenta, CCI, URL del QR, URL del logo, orden y estado activo.

### REQ-S03-024
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: El método de pago no deberá tener moneda ni los campos de pago móvil, RIF ni billetera de criptomonedas.

### REQ-S03-025
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-006
- texto: Si un método de pago informa un CCI que no tiene exactamente 20 dígitos numéricos entonces el sistema deberá rechazarlo.

### REQ-S03-026
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-003
- texto: Los archivos de apps y packages que no figuran en la lista de exenciones no deberán contener identificadores con el sufijo USD, las cadenas Bs y tasaCambio, ni los valores PAGO_MOVIL, PUNTO_VENTA, BIOPAGO o CRIPTO.

### REQ-S03-027
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: Los archivos de apps y packages que no figuran en la lista de exenciones no deberán contener Math.round con multiplicación o división por 100, toFixed ni Math.abs contra 0.01.

### REQ-S03-028
- tipo: cuando
- prioridad: MUST
- origen: ADR-016
- texto: Cuando tools/verificar-dinero.mjs encuentra en un archivo no exento alguno de los patrones de la lista de 5.1, deberá terminar con código distinto de cero y nombrar archivo y línea.

### REQ-S03-029
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: El CI deberá ejecutar tools/verificar-dinero.mjs en cada pull request.

### REQ-S03-030
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-016
- texto: Cada entrada de tools/verificar-dinero.exenciones.json deberá nombrar un archivo existente que coincida con una familia de la tabla de 5.1 y la spec de esa familia, que será S-04, S-07, S-08, S-10, S-11 o S-20.

### REQ-S03-031
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-011
- texto: El puente packages/domain/utils/dineroPuente.ts deberá convertir entre cadenas decimales y number con las funciones numeroDeMonto y montoDeNumero, y solo los archivos exentos podrán usarlo.

### REQ-S03-032
- tipo: ubicuo
- prioridad: MUST
- origen: ADR-006
- texto: El CCI de un método de pago deberá ser opcional.

## 2. Comportamiento

- no_aplica: concurrencia — las operaciones de dinero son funciones puras y sin estado compartido, y ninguna escritura concurrente depende de S-03: los pagos simultáneos son materia de S-04

### BEH-S03-001
- cubre: REQ-S03-001
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
- dado: los montos "9999999999.99" y "0.01", y "0.00" y "0.01"
- cuando: se suman los dos primeros y se resta el segundo par
- entonces: la suma lanza un error de rango y la resta devuelve "-0.01"

### BEH-S03-005
- cubre: REQ-S03-005
- categoria: error
- dado: repartir con 0 partes y con 2.5 partes, multiplicarPorEntero con -1 y con 1.5, y porcentaje con tasa "abc", "101" y "-1" y con monto "-5.00"
- cuando: se ejecuta cada llamada
- entonces: cada llamada lanza un error que nombra el valor recibido

### BEH-S03-006
- cubre: REQ-S03-006, REQ-S03-007
- categoria: borde
- dado: un total de "100.00" repartido en 3 partes y un total de "0.02" repartido en 3 partes
- cuando: se ejecuta repartir
- entonces: las partes son "33.34", "33.33" y "33.33" para el primero, y "0.01", "0.01" y "0.00" para el segundo, y en ambos la suma es el total

### BEH-S03-007
- cubre: REQ-S03-008
- categoria: borde
- dado: porcentaje del 10 de "99.95" y de "0.05", del 18 de "100.00" y del 1 de "9999.50"
- cuando: se calcula con half-up y con redondeo hacia abajo
- entonces: half-up da "10.00", "0.01", "18.00" y "100.00" (99.995 redondeado); hacia abajo da "9.99", "0.00", "18.00" y "99.99"

### BEH-S03-008
- cubre: REQ-S03-009, REQ-S03-010
- categoria: feliz
- dado: el importe "15.43" y la política ninguna
- cuando: se ejecuta redondearEfectivo
- entonces: devuelve original "15.43", a cobrar "15.43" y ajuste "0.00"

### BEH-S03-009
- cubre: REQ-S03-009
- categoria: borde
- dado: una política de prueba que baja el total al múltiplo de 0.10 inferior (solo para pruebas, no es la regla del BCRP) y los importes "15.43" y "15.40"
- cuando: se ejecuta redondearEfectivo con esa política
- entonces: el primero devuelve original "15.43", a cobrar "15.40" y ajuste "-0.03"; el segundo devuelve a cobrar "15.40" y ajuste "0.00"; en ambos el original no cambia

### BEH-S03-010
- cubre: REQ-S03-011, REQ-S03-028
- categoria: error
- dado: un archivo de producción que importa redondearEfectivo
- cuando: se ejecuta tools/verificar-dinero.mjs
- entonces: la herramienta falla y nombra archivo y línea; no falla si el import está en un archivo de prueba

### BEH-S03-011
- cubre: REQ-S03-012
- categoria: feliz
- dado: los montos "120.00", "1200.00", "-50.25" y "0.00"
- cuando: se formatean con formatearSoles
- entonces: se ve S/ 120.00, S/ 1,200.00, -S/ 50.25 y S/ 0.00, solo con espacios normales

### BEH-S03-012
- cubre: REQ-S03-013
- categoria: feliz
- dado: el campo de dinero y una persona que escribe 1,234.5
- cuando: sale del campo
- entonces: el campo muestra 1,234.50 y el valor oculto enviado es "1234.50"

### BEH-S03-013
- cubre: REQ-S03-014
- categoria: error
- dado: el campo de dinero y una persona que escribe 120,50 o 1.234,56
- cuando: sale del campo
- entonces: el campo rechaza el texto y muestra «Escribe el monto con punto decimal, por ejemplo 1,234.56.» sin enviar un valor

### BEH-S03-014
- cubre: REQ-S03-015, REQ-S03-016
- categoria: feliz
- dado: un pago, un plan, un miembro, un producto y una referencia con montos de 15.43
- cuando: cada repositorio los lee
- entonces: el dominio recibe la cadena "15.43" y las cinco columnas son numeric(12,2)

### BEH-S03-015
- cubre: REQ-S03-017
- categoria: error
- dado: un monto "15.439" entregado a cada uno de los cinco repositorios
- cuando: se intenta insertarlo
- entonces: cada repositorio lo rechaza antes de insertar y la fila no se crea

### BEH-S03-016
- cubre: REQ-S03-019
- categoria: error
- dado: una petición a cada una de las 5 rutas con un monto 120.5 como número, otra con "12.345" y otra con "120.50"
- cuando: se envían
- entonces: las dos primeras responden 400 sin ejecutar el caso de uso y la tercera pasa

### BEH-S03-017
- cubre: REQ-S03-018
- categoria: feliz
- dado: una lista de pagos y un plan con montos
- cuando: se consulta api/pagos y api/planes/[id]
- entonces: las respuestas tienen la forma `{ "moneda": "PEN", "pagos": [ { "monto": "120.50" } ] }` y `{ "moneda": "PEN", "plan": { "precio": "120.00" } }`

### BEH-S03-018
- cubre: REQ-S03-020
- categoria: error
- dado: un cobro de "100.00" con dos líneas de "50.00" y "49.99"
- cuando: se valida con validarLineasDePago
- entonces: la validación lo rechaza porque la suma es "99.99" y no hay tolerancia

### BEH-S03-019
- cubre: REQ-S03-021
- categoria: error
- dado: una línea con método Yape sin número de operación, otra con solo espacios, otra con 41 caracteres, otra con "98765" y otra con método Efectivo sin número
- cuando: se valida cada una con validarLineasDePago
- entonces: las tres primeras se rechazan y las dos últimas se aceptan

### BEH-S03-020
- cubre: REQ-S03-022, REQ-S03-023, REQ-S03-024
- categoria: feliz
- dado: el esquema final
- cuando: se lee el catálogo y el modelo de método de pago
- entonces: TipoMetodoPago tiene exactamente los 5 valores, el método tiene los campos de REQ-S03-023 y ninguno de moneda, RIF, código de banco ni billetera

### BEH-S03-021
- cubre: REQ-S03-025, REQ-S03-032
- categoria: error
- dado: CCI de 19 dígitos, de 21 dígitos, con letras, con guiones, de 20 dígitos y ausente
- cuando: se guarda un método con cada uno
- entonces: se rechazan los cuatro primeros y se aceptan el de 20 dígitos y el ausente

### BEH-S03-022
- cubre: REQ-S03-002, REQ-S03-026, REQ-S03-027, REQ-S03-028
- categoria: error
- dado: archivos de prueba con precioUSD, montoBs, PAGO_MOVIL, Math.round(x * 100) / 100, toFixed(2), Math.abs(a - b) < 0.01, y un dinero.ts con Number( y con Math.floor
- cuando: se ejecuta tools/verificar-dinero.mjs
- entonces: la herramienta falla y nombra archivo y línea de cada uno

### BEH-S03-023
- cubre: REQ-S03-029
- categoria: error
- dado: un pull request que agrega precioUSD en un archivo no exento
- cuando: corre el CI
- entonces: el paso de tools/verificar-dinero.mjs falla y el pull request queda en rojo

### BEH-S03-024
- cubre: REQ-S03-030
- categoria: borde
- dado: una exención que nombra un archivo inexistente, otra sin spec, otra que asigna Turno.ts a S-10 y otra que asigna Turno.ts a S-08
- cuando: se ejecuta tools/verificar-dinero.mjs
- entonces: la herramienta falla en las tres primeras (inexistente, sin spec y familia que no corresponde) y acepta la cuarta

### BEH-S03-025
- cubre: REQ-S03-031
- categoria: borde
- dado: un archivo exento que usa numeroDeMonto y un archivo no exento que lo usa
- cuando: se ejecuta tools/verificar-dinero.mjs
- entonces: la herramienta acepta el primero y falla en el segundo

## 3. Invariantes

### INV-S03-001
- propiedad: para cualquier par de montos válidos cuyo resultado esté en rango, restar(sumar(a, b), b) es a, y la suma de las partes de repartir(total, n) es el total
- mecanismo: test-propiedad
- deteccion: la prueba de propiedad genera 1000 pares y totales con semilla fija entre 0.00 y 9999999999.99 y falla ante la primera violación
- protege: REQ-S03-001, REQ-S03-006, REQ-S03-007

### INV-S03-002
- propiedad: para cualquier importe y política, a cobrar es igual al importe original más el ajuste, y el importe original no cambia
- mecanismo: test-propiedad
- deteccion: la prueba de propiedad genera 1000 importes y falla si original más ajuste difiere del monto a cobrar o si el original cambió
- protege: REQ-S03-009, REQ-S03-010

### INV-S03-003
- propiedad: ningún monto guardado tiene más de dos decimales
- mecanismo: asercion-dominio
- deteccion: el repositorio lanza un error antes de insertar un monto con más de dos decimales; la prueba comprueba cada repositorio y la consulta de la base no devuelve filas con escala mayor que 2
- protege: REQ-S03-015, REQ-S03-017

### INV-S03-004
- propiedad: ninguna línea de pago con método distinto de efectivo pasa la validación con número de operación ausente, en blanco o de más de 40 caracteres
- mecanismo: asercion-dominio
- deteccion: validarLineasDePago lanza un error ante esa línea; la prueba cubre ausente, en blanco y 41 caracteres
- protege: REQ-S03-021

### INV-S03-005
- propiedad: ningún archivo no exento de apps ni packages contiene un identificador con USD, la cadena Bs, un redondeo manual de dinero o un valor venezolano de método, y dinero.ts no contiene aritmética de number
- mecanismo: lint
- deteccion: tools/verificar-dinero.mjs devuelve al menos un archivo
- protege: REQ-S03-002, REQ-S03-011, REQ-S03-026, REQ-S03-027, REQ-S03-028

### INV-S03-006
- propiedad: toda entrada de la lista de exenciones apunta a un archivo existente, de una familia de la tabla de 5.1 y con su spec responsable, y el puente solo se usa en archivos exentos
- mecanismo: lint
- deteccion: tools/verificar-dinero.mjs falla ante una entrada obsoleta, incompleta o de otra familia, o ante un uso del puente fuera de las exenciones
- protege: REQ-S03-030, REQ-S03-031

## 4. Criterios de aceptación

### AC-S03-001
- enlaza: REQ-S03-001, BEH-S03-001, INV-S03-001
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
- enlaza: REQ-S03-004, REQ-S03-005, BEH-S03-004, BEH-S03-005
- metodo: unitario
- procedimiento: sumar "9999999999.99" y "0.01"; restar "0.01" de "0.00"; repartir con 0 y 2.5 partes; multiplicarPorEntero con -1 y 1.5; porcentaje con tasa "abc", "101" y "-1" y con monto "-5.00"
- esperado: la suma lanza error de rango, la resta devuelve "-0.01" y las otras siete llamadas lanzan un error que nombra el valor recibido
- test: pendiente

### AC-S03-004
- enlaza: REQ-S03-006, REQ-S03-007, BEH-S03-006, INV-S03-001
- metodo: unitario
- procedimiento: repartir "100.00" y "0.02" en 3 partes y ejecutar la propiedad
- esperado: ["33.34","33.33","33.33"] y ["0.01","0.01","0.00"], y la suma de las partes es el total
- test: pendiente

### AC-S03-005
- enlaza: REQ-S03-008, BEH-S03-007
- metodo: unitario
- procedimiento: calcular el 10 por ciento de "99.95" y "0.05", el 18 por ciento de "100.00" y el 1 por ciento de "9999.50", con half-up y con redondeo hacia abajo
- esperado: half-up "10.00", "0.01", "18.00" y "100.00"; hacia abajo "9.99", "0.00", "18.00" y "99.99"
- test: pendiente

### AC-S03-006
- enlaza: REQ-S03-009, REQ-S03-010, BEH-S03-008, BEH-S03-009, INV-S03-002
- metodo: unitario
- procedimiento: ejecutar redondearEfectivo con la política ninguna y con la política de prueba sobre "15.43" y "15.40", y la propiedad de 1000 importes
- esperado: ninguna devuelve a cobrar "15.43" y ajuste "0.00"; la política de prueba devuelve "15.40" y "-0.03" para el primero y "15.40" y "0.00" para el segundo; la propiedad pasa
- test: pendiente

### AC-S03-007
- enlaza: REQ-S03-011, REQ-S03-028, BEH-S03-010
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-dinero.mjs con un archivo de producción que importa redondearEfectivo y con un archivo de prueba que lo importa; después sobre el árbol final
- esperado: falla con el primero nombrando archivo y línea, pasa con el segundo y no encuentra importaciones de producción en el árbol final
- test: pendiente

### AC-S03-008
- enlaza: REQ-S03-012, BEH-S03-011
- metodo: unitario
- procedimiento: formatear "120.00", "1200.00", "-50.25" y "0.00" con formatearSoles y comprobar que la salida no contiene U+00A0 ni U+202F
- esperado: S/ 120.00, S/ 1,200.00, -S/ 50.25 y S/ 0.00, solo con espacios normales
- test: pendiente

### AC-S03-009
- enlaza: REQ-S03-013, REQ-S03-014, BEH-S03-012, BEH-S03-013
- metodo: unitario
- procedimiento: ejecutar las funciones puras de formato y lectura del campo de dinero con "1234.5", "1,234.5", "120,50" y "1.234,56"
- esperado: "1,234.50" con valor "1234.50" para las dos primeras; las dos últimas se rechazan con el aviso «Escribe el monto con punto decimal, por ejemplo 1,234.56.»
- test: pendiente

### AC-S03-010
- enlaza: REQ-S03-015, REQ-S03-016, BEH-S03-014, INV-S03-003
- metodo: integracion
- procedimiento: con una base efímera, guardar y leer con cada uno de los cinco repositorios un monto de "15.43" y consultar el tipo de las cinco columnas
- esperado: cada repositorio devuelve la cadena "15.43" y las cinco columnas son numeric(12,2)
- test: pendiente

### AC-S03-011
- enlaza: REQ-S03-017, BEH-S03-015, INV-S03-003
- metodo: integracion
- procedimiento: intentar guardar "15.439" con cada uno de los cinco repositorios y contar las filas nuevas
- esperado: los cinco lo rechazan antes de insertar y no se crea ninguna fila
- test: pendiente

### AC-S03-012
- enlaza: REQ-S03-018, REQ-S03-019, BEH-S03-016, BEH-S03-017
- metodo: integracion
- procedimiento: enviar a cada una de las 5 rutas un monto 120.5 como número, "12.345" y "120.50", y leer las respuestas de api/pagos y api/planes/[id]
- esperado: las dos primeras responden 400 sin ejecutar el caso de uso en las 5 rutas; la tercera pasa; las respuestas tienen la forma de BEH-S03-017, con "moneda": "PEN" en la raíz y los montos como cadenas de dos decimales
- test: pendiente

### AC-S03-013
- enlaza: REQ-S03-020, BEH-S03-018
- metodo: unitario
- procedimiento: validar con validarLineasDePago un cobro de "100.00" con líneas "50.00" y "49.99", y otro con "50.00" y "50.00"
- esperado: el primero se rechaza y el segundo se acepta
- test: pendiente

### AC-S03-014
- enlaza: REQ-S03-021, BEH-S03-019, INV-S03-004
- metodo: unitario
- procedimiento: validar con validarLineasDePago líneas Yape sin número, con solo espacios, con 41 caracteres y con "98765", y una de Efectivo sin número
- esperado: las tres primeras se rechazan y las dos últimas se aceptan
- test: pendiente

### AC-S03-015
- enlaza: REQ-S03-022, REQ-S03-023, REQ-S03-024, BEH-S03-020
- metodo: sql
- procedimiento: consultar el enum TipoMetodoPago y las columnas de MetodoPago en la base creada por el esquema final
- esperado: el enum tiene EFECTIVO, BILLETERA_DIGITAL, TARJETA, TRANSFERENCIA y DEPOSITO, y la tabla tiene las columnas de REQ-S03-023 y ninguna llamada moneda, rif, codigoBanco, walletDireccion ni walletUsuario
- test: pendiente

### AC-S03-016
- enlaza: REQ-S03-025, REQ-S03-032, BEH-S03-021
- metodo: unitario
- procedimiento: validar CCI de 19 dígitos, de 21 dígitos, con letras, con guiones, "00219300123456789012" y ausente
- esperado: se rechazan los cuatro primeros y se aceptan el de 20 dígitos y el ausente
- test: pendiente

### AC-S03-017
- enlaza: REQ-S03-002, REQ-S03-026, REQ-S03-027, REQ-S03-028, BEH-S03-022, INV-S03-005
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-dinero.mjs con árboles de prueba que contienen precioUSD, montoBs, PAGO_MOVIL, Math.round(x * 100) / 100, toFixed(2), Math.abs(a - b) < 0.01, un dinero.ts con Number( y con Math.floor, y otro árbol con formatearSoles y sumar; después ejecutarla sobre el árbol final
- esperado: falla con los ocho primeros nombrando archivo y línea, pasa con el último y no encuentra nada en el árbol final fuera de las exenciones
- test: pendiente

### AC-S03-018
- enlaza: REQ-S03-029, BEH-S03-023
- metodo: manual
- procedimiento: abrir un pull request de prueba que agregue precioUSD en un archivo no exento y mirar el resultado del CI
- esperado: el paso de tools/verificar-dinero.mjs falla y el pull request no se puede fusionar mientras la protección de main esté activa
- test: pendiente

### AC-S03-019
- enlaza: REQ-S03-030, REQ-S03-031, BEH-S03-024, BEH-S03-025, INV-S03-006
- metodo: unitario
- procedimiento: ejecutar las pruebas de tools/verificar-dinero.mjs con una exención de archivo inexistente, otra sin spec, una que asigna Turno.ts a S-10 y otra que lo asigna a S-08, y con el puente usado en un archivo exento y en uno no exento; después sobre el árbol final
- esperado: falla en los tres primeros casos y en el uso del puente fuera de las exenciones, acepta la asignación de Turno.ts a S-08 y el uso en un archivo exento, y pasa sobre el árbol final con todas las exenciones en su familia
- test: pendiente

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Orden (ADR-016 §1, pruebas primero, un commit por paso): (1) pruebas del módulo de dinero, de `formatearSoles`, de `validarLineasDePago` y de la validación de métodos, en rojo; (2) `dinero.ts`, `dineroPuente.ts` y `soles.ts`; (3) `tools/verificar-dinero.mjs` con sus pruebas, que usa la API de `typescript` (declarada por S-01) y revisa también `dinero.ts`; (4) lista de exenciones generada con la herramienta y revisada contra la tabla de familias; (5) esquema y repositorios (columnas renombradas, `numeric(12,2)`, catálogo de métodos, entrega como cadena, enmienda a S-22); (6) `Pago.ts` (solo lo que fija 0.2); (7) rutas con esquemas `zod` de monto (S-01) y respuestas con `PEN`; (8) `CurrencyInput`, selector y formulario de métodos, y reemplazo de `USD`, `Bs` y redondeos manuales en los archivos no exentos; (9) archivos exentos: solo se agregan llamadas al puente para que compilen; (10) paso del CI. Las pruebas de propiedad usan un generador con semilla fija (SUP-S03-012).
- **Tabla de operaciones de `dinero.ts`** (entrada y salida como cadenas decimales; internamente `bigint`):

| Función | Firma | Resultado |
|---|---|---|
| `montoDeTexto` | `(texto: string) => string` | monto normalizado a dos decimales o error (SUP-S03-003) |
| `sumar`, `restar` | `(a: string, b: string) => string` | resultado exacto, con error de rango fuera de ±9999999999.99 |
| `multiplicarPorEntero` | `(a: string, n: number) => string` | producto exacto; `n` entero no negativo |
| `repartir` | `(total: string, n: number) => string[]` | N partes que suman el total (REQ-S03-006 y REQ-S03-007) |
| `porcentaje` | `(monto: string, tasa: string, modo?: "half-up" \| "abajo" \| "arriba") => string` | porcentaje redondeado una vez al céntimo (SUP-S03-009) |
| `comparar` | `(a: string, b: string) => -1 \| 0 \| 1` | comparación exacta |
| `redondearEfectivo` | `(importe: string, politica: PoliticaRedondeo) => { original: string; cobrar: string; ajuste: string }` | REQ-S03-009 y REQ-S03-010 |

- **Puente temporal** (`dineroPuente.ts`): `numeroDeMonto(m: string): number` y `montoDeNumero(n: number): string`, con la conversión del comportamiento actual (redondeo a céntimos). Solo lo usan archivos exentos para seguir compilando mientras S-04, S-07, S-08, S-10, S-11 y S-20 adoptan `dinero.ts`; cada una de esas specs debe quitar sus usos, y la herramienta cuenta los usos restantes.
- **Familias de archivos y su spec** (la herramienta acepta una exención solo si el archivo coincide con la familia de su spec):

| Spec | Familia de archivos |
|---|---|
| S-04 | `RegistrarPago*`, `CobrarAbono*`, `ListarAbonos*`, `ReglaAbono*` y archivos de abono |
| S-07 | `CambiarPlan*`, `cambioPlan*` y `FormularioCambiarPlan*` |
| S-08 | `Turno*`, `Arqueo*`, `Egreso*`, `ObtenerReporteCaja*`, `ObtenerResumenTurno*` y la carpeta `caja/` |
| S-10 | `*Tasa*`, `formatearBs*`, `ConvertirMontoUSDaVES*`, `padron*` y `ModalHistorialTasas*` |
| S-11 | `VenderProducto*`, `FiarProducto*`, `CobrarDeudas*`, `RegistrarPagoConDeudas*`, `ModalVenderProducto*` y `ListarDeudas*` |
| S-20 | `Vitrina*`, `vitrina*` y `Reproductor*` |

- **Patrones que `verificar-dinero` rechaza** fuera de las exenciones: identificadores con el sufijo `USD`; las cadenas `Bs` y `tasaCambio`; los valores `PAGO_MOVIL`, `PUNTO_VENTA`, `BIOPAGO` y `CRIPTO`; `Math.round(` con `* 100` o `/ 100`; `.toFixed(` fuera de `packages/ui/formato/`; `Math.abs(` contra `0.01`; `toLocaleString("es-VE"`; la importación de `redondearEfectivo` fuera de pruebas; el uso de `numeroDeMonto` o `montoDeNumero` fuera de archivos exentos; y, dentro de `dinero.ts`, `Number(`, `parseFloat`, `Math.` y `toFixed`. Las llamadas de fecha no se revisan (S-02).
- Los pagos y los cobros no se prueban aquí: `RegistrarPago.ts`, `CambiarPlanConPago.ts`, `VenderProducto.ts` y `CobrarDeudasMiembro.ts` son de S-04, S-07 y S-11, y solo llaman a `validarLineasDePago` con la nueva firma.

### 5.2 Migración
- No hay datos que migrar: el baseline se genera en S-15. Mientras tanto la base se crea con `drizzle-kit push` (S-22).
- **Enmienda a S-22** (que permanece aprobada): REQ-S22-010, SUP-S22-014, BEH-S22-002, AC-S22-005 y las aserciones de montos de las suites de contrato (REQ-S22-008 y REQ-S22-028) pasan de «number» a «cadena decimal de dos decimales», con el modo `string` de `numeric`; se registra en «Enmiendas posteriores» de S-22 al aprobarse S-03.
- Reversión: antes del primer push, `git reset` del propietario; después, cada paso del plan es un commit independiente.

### 5.3 Riesgos
- Cambiar los montos de `number` a cadena obliga a tocar los archivos exentos solo para que compilen (paso 9); el riesgo es introducir un error de conversión en código que otra spec reescribirá. Mitigación: el puente es mecánico, está contado por la herramienta y sus pruebas cubren el redondeo al céntimo del comportamiento actual.
- Las columnas renombradas rompen cualquier consulta o formulario que use `precioUSD`. Mitigación: el typecheck y la herramienta; el seed se escribe después (S-15).
- `CurrencyInput` cambia de formato (de `1.234,56` a `1,234.56`): un administrador acostumbrado al formato anterior puede equivocarse; la gramática de SUP-S03-004 rechaza `120,50` en lugar de interpretarlo.
- La regla del número de operación vive en `validarLineasDePago`, compartida con cuatro casos de uso de otras specs; un cambio mal hecho afecta a los cobros. Mitigación: pruebas unitarias directas de la función y alcance limitado a lo que fija 0.2.
- La lista de exenciones se organiza por familias, pero la asignación de un archivo a una spec es una propuesta mía y puede cambiarse en el plan global (G6).
- La política `bcrp` no se activa; si el propietario la activa más adelante, hay que validar el texto vigente de la norma con su contador (ADR-011).
- No se verificó que el CCI tenga 20 dígitos ni el formato del número de operación de Yape y de las transferencias al BCP (SUP-S03-006 y SUP-S03-007).

### 5.4 Preguntas abiertas
- ¿Se cobra en efectivo en el local? Default: sí, el efectivo está en el seed como método activo, según la respuesta del propietario del 2026-11-12 (SUP-S03-005).
- ¿Hay un importe máximo menor que S/ 9,999,999,999.99 para el negocio? Default: ese máximo técnico (SUP-S03-002).
- ¿El número de operación tiene un formato fijo (por ejemplo solo dígitos)? Default: texto de 1 a 40 caracteres (SUP-S03-007).

## Revisión independiente

### Veredicto de `spec-reviewer` (texto íntegro, sin editar; sobre la primera versión en revisión)

REVISIÓN INDEPENDIENTE — S-03 (`/home/user/adhara-fit/docs/superpowers/specs/S-03-dinero-y-metodos-de-pago.md`), solo lectura.

Límites: solo tuve Read, Grep y Glob. No ejecuté `spec-lint` ni comandos de shell. Los conteos del Repo A (`/home/user/kaiserone01/gym-app`) los saqué con Grep sobre `apps` y `packages`. Leí la spec, ADR-003, 006, 010, 011, 016, 018 y 022, y las specs S-00, S-01, S-02 y S-22. No leí S-04 a S-21: no existen en `docs/superpowers/specs/`.

Los cálculos aritméticos de los ejemplos son correctos (fila 9). Los hallazgos graves son las filas 3, 4, 6, 7 y 14.

| # | Comprobación | Veredicto | Evidencia (archivo:línea) | Qué corregir |
|---|---|---|---|---|
| 1 | Cabecera completa y ADRs existentes y aceptados | CUMPLE (con una nota) | Cabecera `S-03:1-8`, con `aprobada_por` y `fecha_aprobacion` vacíos, correcto en `en-revision`. ADR-003 (`ADR-003:3`), 006 (`ADR-006:3`), 011 (`ADR-011:3`), 016 (`ADR-016:3`) y 022 (`ADR-022:3`) figuran como aceptados. S-00, S-01 y S-22 están `aprobada`. | REQ-S03-015 ("sin tolerancia") viene de ADR-010 (pago exacto, aceptado), y ADR-010 no figura en `adrs`. Agregarlo y cambiar el `origen` de REQ-015. |
| 2 | Cada REQ es una obligación, en EARS, con prioridad y origen | NO CUMPLE (menor) | Los 24 REQ tienen tipo, MUST y origen. Compuestos: REQ-010 (mostrar, aceptar y enviar), REQ-004 (suma exacta y reparto a las primeras partes), REQ-020 (tres prohibiciones). Orígenes flojos: REQ-012 cita ADR-022 y ADR-022 no menciona cadenas (`ADR-022` enmienda §6 remite a S-03); REQ-021 a 023 citan ADR-016, que no pide esa herramienta; REQ-014 cita ADR-011 cuando la validación con zod es de ADR-012 (no está en `adrs`). Además REQ-020 omite los redondeos manuales, `Math.round` y `toFixed`, que sí protege INV-S03-005 (`S-03:361`) y prueba BEH-016. REQ-021 habla de "la tabla de 5.1" (`S-03:184`), pero los patrones son una viñeta (`S-03:502`). REQ-009 no exige espacios normales y AC-006 sí lo comprueba. | Partir REQ-010, 004 y 020. Añadir al REQ-020, o a un REQ nuevo, la prohibición de redondeo manual de dinero. Corregir orígenes. Decir "lista de 5.1". Añadir "con espacios normales" a REQ-009. |
| 3 | Cobertura REQ→BEH→AC e INV enlazados; hay BEH feliz, borde, error y concurrencia (o `no_aplica`) | NO CUMPLE | Cobertura formal completa: los 24 REQ tienen BEH y AC, los 6 INV tienen mecanismo, detección y AC. Hay feliz, borde y error, y `no_aplica` de concurrencia con motivo (`S-03:206`), aceptable. Fallos de fondo: (a) REQ-014 dice "la ruta", pero AC-009 solo prueba POST `api/pagos`; en el Repo A reciben dinero 5 rutas (`api/pagos`, `api/planes`, `api/planes/[id]`, `api/miembros`, `api/miembros/[id]`, verificado con `grep -c "monto\|precio\|costo"` sobre `apps/web-admin/app/api`). (b) REQ-012 dice "los repositorios", pero AC-008 prueba solo el de Pago. (c) REQ-002 no se puede refutar con pruebas: con 12 cifras significativas la aritmética de `number` sobre céntimos también pasa la propiedad de 1000 pares, y ningún patrón de 5.1 vigila `dinero.ts` (`S-03:502`). (d) INV-S03-003 declara `restriccion-bd` (`S-03:350`), pero `numeric(12,2)` redondea al insertar; quien protege es el repositorio, es decir una aserción de dominio. | AC-009 sobre las 5 rutas. AC-008 sobre los 5 repositorios. Añadir a `verificar-dinero` una regla sobre `dinero.ts` (`parseFloat`, `Number(`, `Math.*`, `toFixed`) o exigir `bigint`. Cambiar el mecanismo de INV-003 a `asercion-dominio` y añadir un REQ para la comprobación del repositorio. |
| 4 | Comportamiento actual (0.4) con archivo:línea o "verificado con comando" o "no verificado", contrastado con el Repo A | NO CUMPLE | **Confirmado:** 23 `Decimal`, y la lista de columnas coincide con `schema.prisma:44,161,162,204,217,239,280,285,286,325,357,466,467,489,493,496,507-509,531,634,701,702`. `numeroOperacion` en `:284`, `enum TipoMetodoPago` en `:537` y `MetodoPago` en `:546` con `moneda`, `codigoBanco`, `rif`, `walletDireccion` y `walletUsuario` (`:553-565`). `Pago.ts:134` y `:148`. Las 11 citas de `ListarAbonosPendientes.ts:66`, `CobrarAbonoPendiente.ts:20,58`, `RegistrarPago.ts:80,149,154,368,482`, `ConvertirMontoUSDaVES.ts:26` y `CambiarPlanConPago.ts:243-245`. `api/pagos/route.ts:68-70` y `api/planes/route.ts:48-71` sin validar formato. `formatearBs.ts:2`. 80 archivos con `USD` y 28 con `tasaCambio`, ambos reproducidos excluyendo pruebas y `packages/db`. 4 archivos con valores venezolanos de método. 23 archivos con `TipoMetodoPago` o `metodoPago` (mismo criterio). **Erróneo o no reproducible:** (1) `Pago.monto` está en `schema.prisma:280`, no en `:268`, que es `model Pago {`. (2) `Math.round(monto * 100)` está en `Pago.ts:148` (`aCentavos`); `:155` es la firma de `repartirLineasPago`. (3) `CurrencyInput` lo usan **11** archivos (12 con el propio), no 13; y `formatearVisual` está en `CurrencyInput.tsx:11-19`, no `:9-18`. (4) "48 archivos con `Bs`": obtengo 55 con subcadena (sin pruebas, sin lockfiles, sin `packages/db`) y 41 con `\bBs\b`. La spec no da el patrón, y `montoBs` y `mostrarEquivalenteBs` solo coinciden por subcadena. (5) "128 líneas con `.toFixed(`/`Math.round(`": obtengo 132 con `.ts`, `.tsx`, `.mjs` y `.js`, incluidas pruebas. **Omisiones:** la interfaz ya exige número de operación fuera del efectivo (`SelectorMetodoPago.tsx:181`, `metodo.tipo !== "EFECTIVO"`) y valida `^\d{4}$` (`ModalCobrarDeudas.tsx:163`); 0.4 dice que "ninguna regla" lo exige y solo mira el dominio (`S-03:41`). `DatosLineaPago` no lleva el tipo del método (`Pago.ts:81-87`). `moneda` decide si aplica la tasa BCV (`schema.prisma:553`) y `TIPOS_QUE_PUEDEN_SER_EN_BS` la usa (`MetodoPago.ts:7`). `MetodoPago` no tiene `nombre`, solo `nombreBanco` (`schema.prisma:551`). | Corregir las citas y los conteos con el patrón y el glob exactos. Añadir a 0.4 las reglas de la interfaz, la ausencia de `tipo` en la línea de pago y el uso de `moneda`. |
| 5 | Supuestos con default y "asumido, por validar" | CUMPLE (con huecos) | SUP-S03-001 a 008 llevan `Default:` y la marca. | SUP-001 dice "escala mayor" y ADR-011 §5 fija 6 decimales (`ADR-011:30`); dar la cifra. Falta el supuesto sobre el formato del número de operación y su conflicto con `^\d{4}$`. Falta decir si el CCI es opcional. Falta la gramática del campo de dinero. |
| 6 | Contradicciones con ADR aceptados y con S-00, S-01, S-02 y S-22 | NO CUMPLE | **Con S-22:** 5.2 (`S-03:506`) cita "SUP-S22-011" como la regla de `number`; esa SUP trata `date()` y `timestamp` (`S-22:68`). Los montos como número están en SUP-S22-014 (`S-22:71`), REQ-S22-010 (`S-22:130-134`), BEH-S22-002, AC-S22-005 y las 17 suites de contrato que S-22 deja permanentes (REQ-S22-028). Las pruebas de S-22 afirman "number, no string" y fallarían tras S-03. La enmienda no las nombra. **Con ADR-011:** §8 pide funciones "sin conectarlas a ningún flujo"; BEH-006 y AC-005 hablan de "el cobro registra el importe original sin ajuste" (`S-03:248,405`). **Con ADR-010 y ADR-018:** `validarLineasDePago(..., "conAbono")`, la tolerancia y `toleranciaDiferenciaPagoUSD` (`Pago.ts:43,119,134`) son de S-04, pero S-03 cambia `Pago.ts` y REQ-015 pide "sin tolerancia" sobre el mismo código. **Con ADR-003:** coherente, porque `formatearBs.ts` queda exento. Con S-01 (zod y `typescript` en la raíz, `S-01:22,76`) coherente. | Reescribir la enmienda a S-22 citando SUP-S22-014, REQ-S22-010, BEH-S22-002, AC-S22-005 y las suites de contrato (indicar cuáles cambian a `string`). Aclarar que BEH-006 no conecta la política al flujo. Delimitar qué partes de `Pago.ts` tocan S-03 y S-04. |
| 7 | Regla de exenciones comparada con la de S-02 | NO CUMPLE | S-02 acepta solo S-04, S-08, S-10 o S-20 (REQ-S02-020, `S-02:171`); S-03 agrega S-07 (REQ-S03-023, `S-03:196`). Los dos mecanismos son independientes (`verificar-dinero.exenciones.json` y `verificar-fechas.exenciones.json`) y nada dice cómo se concilian. Ejemplo: `cambioPlanCalculo.ts` y `CambiarPlanConPago.ts` tienen `Caracas`, `USD` y `Math.round`; S-02 los puede asignar a S-04 o S-08 mientras S-03 los asigna a S-07. La lista de S-03 se "genera al implementar" con la propia herramienta (SUP-S03-007), de modo que todo hallazgo se vuelve exención; no hay criterio de pertenencia ni tope. La lista cerrada deja fuera a S-11, que ADR-018 y S-22 (`S-22:27`) nombran para ventas, y en el Repo A `VenderProducto.ts`, `CobrarDeudasMiembro.ts`, `FiarProducto.ts` y `ModalVenderProducto.tsx` contienen `USD`, `Bs` o `tasaCambio`. | Definir el criterio de exención por categoría (archivo del conjunto "reescribe S-xx" con su motivo), no por resultado de la herramienta. Incluir S-11 o decir quién cubre ventas, fiado y producto. Declarar que la spec responsable puede diferir entre las dos listas. |
| 8 | Alcance: ¿hace algo de S-04, S-07, S-08, S-10, S-12 o S-20? | NO CUMPLE | REQ-012 pide que **todos** los repositorios entreguen cadenas, mientras 5.3 dice que los archivos exentos "conservan los montos como `number`" (`S-03:512`). Los mismos repositorios alimentan a `RegistrarPago`, `CambiarPlanConPago`, `VenderProducto` y `CobrarDeudasMiembro`, que suman con `number` (`Pago.ts:77-79`, `RegistrarPago.ts:149`); `validarLineasDePago` se llama desde esos cuatro (`RegistrarPago.ts:219`, `CambiarPlanConPago.ts:190`, `VenderProducto.ts:63`, `CobrarDeudasMiembro.ts:78`). Pasar a cadena rompe el typecheck de esos archivos y la frase "la API convierte en la frontera" no cubre el dominio. REQ-018, INV-004 y AC-012 exigen que "el caso de uso de cobro" lance el error: ese caso es `RegistrarPago.ts`, exento y reescrito por S-04. Quitar `moneda` y los campos venezolanos toca `MetodoPago.ts`, `SelectorMetodoPago.tsx`, `FormularioMetodoPago.tsx` y `metodosPagoUI.ts` (con `Bs` y `tasaCambio`), que dependen de S-10, y REQ-019 supone un formulario o caso de uso de alta de método que 0.2 no lista. Tickets (S-12), caja (S-08) y vitrina (S-20) quedan bien delimitados. | Escribir un puente explícito para el período de convivencia: dónde se convierte y quién tipa los montos de los casos de uso exentos. Decidir dónde vive la regla del número de operación (por ejemplo `validarLineasDePago` con `tipoMetodo` en `DatosLineaPago`), o mover REQ-018, INV-004 y AC-012 a S-04. Listar los archivos del catálogo que S-03 sí modifica. |
| 9 | Valores aritméticos de los ejemplos | CUMPLE | BEH-001: 15.43+29.99=45.42; 45.42−29.99=15.43; 29.99×3=89.97. BEH-004: 10000 céntimos/3 = 3333 resto 1 → 33.34, 33.33, 33.33 (suma 100.00); 2 céntimos/3 → 0.01, 0.01, 0.00 (suma 0.02). BEH-005: 10 % de 99.95 = 9.995 → half-up 10.00, abajo 9.99; 10 % de 0.05 = 0.005 → 0.01 y 0.00; 18 % de 100.00 = 18.00. BEH-006/007: 15.43 − 0.03 = 15.40; 15.40 + 0.00. BEH-008: formatos de ADR-011 (`ADR-011:29`). El CCI de prueba `00219300123456789012` tiene 20 dígitos. Los límites de `montoDeTexto` (10 enteros: "9999999999.99" válido, "12345678901.00" inválido) coinciden con `numeric(12,2)`. | Nada en los cálculos. Observación: ADR-016 §6 pide casos 0.01, 0.005 y 99.995; 99.995 no figura (se cubre 0.005 vía 0.05 al 10 %). |
| 10 | AC binarios y comprobables | NO CUMPLE | AC-007 y BEH-009: "rechaza o interpreta como 1.23" no es binario, y "1.234,56" no daría 1.23 (quitando miles quedaría 1.23456). Habla de un "aviso definido" que nunca se define. AC-005 mezcla método `unitario` con "registrar un cobro de efectivo", que exige `RegistrarPago`, exento. AC-009 pide "cada monto como cadena con `"moneda": "PEN"`" sin definir la forma (REQ-013 y `S-03:283`): ¿un campo `moneda` por respuesta o por objeto, y dentro de listas como `{ pagos: [...] }` (`api/pagos/route.ts:47`)? AC-014: "`toFixed(2)` sobre un monto" no es decidible por análisis estático sin una regla. AC-016 pasa sobre un árbol cuyas exenciones se generan con la propia herramienta, así que no discrimina. AC-015 es manual, con precedente en S-02 (AC-S02-011). | Reescribir BEH-009 y AC-007 con un solo resultado y texto exacto del aviso. Separar el cobro de AC-005 o moverlo a S-04. Definir el formato JSON con un ejemplo. Fijar la regla de "sobre un monto" (nombres de identificador). Añadir al AC-016 el criterio de pertenencia. |
| 11 | Seguridad y exactitud (parseo, rango, API) | NO CUMPLE | (a) En el campo de dinero, la coma pasa a ser separador de miles: un administrador acostumbrado a escribir "120,50" podría obtener 12050.00 si el parseo solo quita comas. La spec solo rechaza el formato antiguo "1.234,56" (`S-03:513`). Debe exigir grupos de exactamente tres dígitos tras cada coma. (b) El resultado de `sumar`, `multiplicarPorEntero` o `porcentaje` puede superar los 10 enteros y `restar` puede dar negativos, pero `montoDeTexto` rechaza el signo menos y no hay REQ para desborde ni para signo. (c) Sin definir: `repartir` con n ≤ 0 o no entero, `multiplicarPorEntero` con n negativo o fraccionario, gramática y escala de `tasa` en `porcentaje` (¿"10" o "0.10"?), modo `"arriba"` sin prueba, redondeo half-up de negativos, entrada de `formatearSoles` (acepta "-50.25" aunque `montoDeTexto` lo rechaza). (d) Número de operación: no se define "vacío" (solo espacios), longitud, ni el choque con `^\d{4}$`; AC-012 usa "123456". (e) CCI: no dice si es opcional (Efectivo y Yape no lo tienen), ni qué pasa con espacios o guiones. (f) Representar montos como cadenas es sólido (ADR-011:28), el rechazo de números JSON en la API es acertado, y `numeric(12,2)` sin desbordes silenciosos (PostgreSQL falla con ≥ 10^10). | Añadir REQ y BEH de error para desborde, signo, n inválido, tasa mal formada, CCI nulo y número de operación en blanco. Definir la gramática del campo. Decidir y documentar el conflicto con `^\d{4}$`. |
| 12 | Dependencias nuevas y riesgos | CUMPLE | "No hay dependencias nuevas" (`S-03:489`). La herramienta usa `typescript`, ya planeada por S-01 (`S-01:22,720`), y los esquemas usan `zod` 4.6.4, también de S-01 (`S-01:76,188`). Riesgos de 5.3 razonables (formato del campo, convivencia de formatos, `bcrp`). | Decir expresamente que `fast-check` se descarta, porque ADR-016 §6 delega su justificación a S-03. Añadir el riesgo de que el typecheck falle en archivos exentos (fila 8) y el de las rutas sin esquema. |
| 13 | Sin "TBD", "etc." ni adjetivos sin medida; sin nada fuera de alcance | NO VERIFICABLE | Grep sin "TBD", "por definir", "etc.", "rápido", "fácil" ni "robusto". Aparece "razonable" una vez (`S-03:519`), en una pregunta con cifra. No ejecuté `node tools/spec-lint.mjs`. | Ejecutar `node tools/spec-lint.mjs` y pegar la salida. |
| 14 | Escenarios de bordes, errores y concurrencia | CUMPLE (con observación) | Hay BEH de borde (002/003, 004, 005, 007, 009, 018), error (002, 011, 012, 014, 015, 016, 017) y `no_aplica` de concurrencia con motivo (operaciones puras, `S-03:206`). El motivo cubre solo `dinero.ts`; la spec también toca columnas, rutas y un catálogo. | Ampliar el motivo: ninguna escritura concurrente depende de S-03. Opcional: BEH de número de operación repetido. |

Preguntas abiertas de 5.4: razonables con default; no bloquean. La pregunta del cobro de S/ 0.00 enlaza con `esCortesia` (`Pago.ts:124`); decidirla antes de fijar REQ-015, porque la validación actual admite una línea única de monto ≤ 0.

VEREDICTO GLOBAL: Requiere cambios (no es "Bloqueada por pregunta"; ningún cambio depende de una respuesta del propietario). Prioridad: (1) fila 8, el puente entre repositorios con cadena y archivos exentos con `number`, y dónde vive la regla del número de operación; (2) fila 6, la enmienda a S-22 mal citada (SUP-S22-011) y sin nombrar las pruebas de S-22 que cambian; (3) fila 7, el criterio de exención frente a S-02 y la falta de S-11; (4) fila 4, las citas y conteos erróneos de 0.4 y las reglas de interfaz omitidas; (5) filas 10 y 11, criterios no binarios y bordes de parseo y desborde sin definir. La decisión final es del propietario.

### Conciliación del autor
Verifiqué cada hallazgo contra el Repo A antes de corregir. **Todos eran ciertos**; ninguno se rechazó. Una diferencia de método: el revisor cuenta 11 archivos que usan `CurrencyInput` (12 con el propio) y yo cuento 13 con el propio componente y otros nombres coincidentes (`grep -rIl CurrencyInput apps packages`); la spec cita mi cifra con su comando. El revisor no pudo ejecutar `spec-lint`; yo sí, con 0 errores y 0 avisos tras las correcciones.

| Hallazgo | Corrección |
|---|---|
| Fila 1 (ADR-010) | Agregado a `adrs`; el origen de REQ-020 pasa a ADR-010 |
| Fila 2 (REQ compuestos y orígenes) | REQ divididos (006 y 007, 022 a 024 y 032, 026 y 027); orígenes corregidos; «lista de 5.1»; REQ-012 exige espacios normales |
| Fila 3 (cobertura) | AC sobre las 5 rutas y los 5 repositorios (AC-010 a AC-012); REQ-002 exige `bigint` y la herramienta vigila `dinero.ts`; INV-003 pasa a `asercion-dominio` con REQ-017 |
| Fila 4 (hechos de 0.4) | `Pago.monto` en `:280`, `aCentavos` en `:148`, `formatearVisual` en `:11`, patrón de `Bs` (41 archivos con `\bBs\b`); agregados `DatosLineaPago` sin tipo, las reglas de la interfaz, `moneda` y `nombreBanco` |
| Fila 5 (supuestos) | SUP-001 con 6 decimales; SUP-004 (gramática del campo), SUP-006 (CCI opcional), SUP-007 (número de operación), SUP-009 (porcentaje) y SUP-012 (sin `fast-check`) |
| Fila 6 (S-22, ADR-011, `Pago.ts`) | Enmienda a S-22 citando REQ-S22-010, SUP-S22-014, BEH-S22-002, AC-S22-005 y las suites de contrato; REQ-011 impide llamar a `redondearEfectivo` desde producción; 0.2 delimita qué toca S-03 en `Pago.ts` |
| Fila 7 (exenciones) | Tabla de familias de archivos por spec (incluida S-11); la herramienta acepta una exención solo si el archivo coincide con la familia de su spec (REQ-030 y AC-019); SUP-010 declara que las listas de S-02 y S-03 pueden diferir |
| Fila 8 (puente y alcance) | Puente temporal `dineroPuente.ts` solo para archivos exentos (REQ-031); la regla del número de operación vive en `validarLineasDePago` con el tipo del método; el cobro sale de los AC |
| Fila 9 (99.995) | Agregado el 1 por ciento de «9999.50», que da 99.995 |
| Fila 10 (AC no binarios) | BEH y AC del campo con aviso exacto y un solo resultado; forma JSON con ejemplo; reglas concretas para `toFixed` y `Math.abs`; pertenencia por familias |
| Fila 11 (parseo y rangos) | REQ-004 (rango), REQ-005 (argumentos inválidos), REQ-014 (gramática de la coma), REQ-021 (número de operación en blanco o largo) y REQ-032 (CCI opcional) |
| Fila 12 (dependencias) | Sin `fast-check` y riesgo de typecheck en archivos exentos |
| Fila 13 (lint) | Ejecuté `node tools/spec-lint.mjs`: 0 errores y 0 avisos |
| Fila 14 (concurrencia) | Motivo ampliado |

Tras las correcciones S-03 pasó de 24 a 32 REQ, de 18 a 25 BEH y de 16 a 19 AC (6 INV). El propietario escribió «S-03 aprobada» el 2026-11-12 sobre este texto corregido y confirmó el efectivo como método de cobro; la spec pasó a `aprobada`.
