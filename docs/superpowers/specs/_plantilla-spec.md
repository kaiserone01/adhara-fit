---
id: S-xx
estado: borrador
adrs: ADR-nnn
depende_de: ninguna
aprobada_por:
fecha_aprobacion:
---
# S-xx — <título breve de la spec>

> **Cómo usar esta plantilla.** Copia este archivo a `docs/superpowers/specs/S-NN-<slug>.md`, sustituye `S-xx`/`Sxx` por el número de la spec (p. ej. `S-04`/`S04`) y `ADR-nnn` por los ADRs de los que depende.
> Cada elemento es un encabezado `### REQ-Sxx-nnn` (o `BEH`, `INV`, `AC`) seguido de campos `- clave: valor`. Duplica el bloque tantas veces como haga falta; los IDs son estables: no se renumeran ni se reutilizan.
> Las líneas que empiezan con `>` son guía y se borran. Valida con `node tools/spec-lint.mjs`; genera la trazabilidad con `node tools/spec-lint.mjs --write`.
> **Cabecera:** `estado` ∈ `borrador | en-revision | aprobada`. `aprobada_por` y `fecha_aprobacion` quedan vacíos hasta que el propietario escriba «S-xx aprobada»; entonces se rellenan (`fecha_aprobacion: AAAA-MM-DD`). Una spec no entra en `en-revision` mientras algún ADR de `adrs` esté *propuesto*. `depende_de`: `S-NN, S-MM` o `ninguna`.
> **Estados y lint:** un `borrador` solo avisa; `en-revision` y `aprobada` fallan con código ≠ 0. En `aprobada` no se admiten «TBD», «por definir», «por determinar», «etc.» ni adjetivos sin medida («rápido», «fácil», «robusto»…) en una línea sin cifra, y se exige el bloque `## Revisión independiente`.

## 0. Contexto y alcance

### 0.1 Problema
<Qué problema resuelve esta spec y por qué ahora, en 2-5 líneas. Distingue hecho (verificado), decisión (ADR) y supuesto.>

### 0.2 Dentro de alcance
- <Lo que esta spec sí cambia.>

### 0.3 Fuera de alcance
- <Lo que esta spec no toca y dónde se trata (otra spec o backlog).>

### 0.4 Comportamiento actual verificado
> Cada punto cita `archivo:línea` del Repo A (p. ej. `RegistrarPago.ts:384`), o da la evidencia de un hecho de existencia o de conteo con «verificado con `comando`», o dice «no verificado» / «no re-verificado, ver doc 09 §…».
- <Comportamiento actual (`ruta/archivo.ts:123`).>
- <Lo que no se pudo comprobar: no verificado.>

### 0.5 Supuestos
> Cada supuesto lleva ID `SUP-Sxx-nnn`, su `Default:` y la marca «asumido, por validar».
- SUP-Sxx-001: <supuesto>. Default: <valor por defecto>; asumido, por validar.

## 1. Requisitos

> Una obligación por ID, en EARS, con exactamente un «deberá».
> `tipo` y plantilla: `ubicuo` → «El sistema deberá …» · `cuando` → «Cuando <evento>, el sistema deberá …» · `mientras` → «Mientras <estado>, el sistema deberá …» · `si-entonces` → «Si <condición no deseada> entonces el sistema deberá …» · `donde` → «Donde <característica>, el sistema deberá …».
> `prioridad`: `MUST` o `SHOULD`. `origen`: RF-nn, ADR-nnn, DI-nn, H-nn (los ADR citados deben figurar en `adrs`).

### REQ-Sxx-001
- tipo: cuando
- prioridad: MUST
- origen: ADR-nnn
- texto: Cuando <evento>, el sistema deberá <respuesta medible>.

## 2. Comportamiento

> Escenarios Dado / Cuando / Entonces. Cada BEH cubre al menos un REQ (`cubre`). Debe haber al menos un BEH de cada categoría: `feliz`, `borde`, `error`, `concurrencia`.
> Si una categoría no aplica, decláralo aquí con motivo en lugar de dejarla vacía: `- no_aplica: concurrencia — <motivo>`.

### BEH-Sxx-001
- cubre: REQ-Sxx-001
- categoria: feliz
- dado: <estado inicial>
- cuando: <acción>
- entonces: <resultado observable>

## 3. Invariantes

> Propiedad que debe cumplirse siempre. `mecanismo` ∈ `restriccion-bd | asercion-dominio | transaccion | test-propiedad | lint`. `deteccion`: cómo se descubre una violación (consulta, test, regla de lint). `protege`: los REQ a los que sirve. Todo INV necesita al menos un AC que lo enlace.

### INV-Sxx-001
- propiedad: <lo que siempre es verdad>
- mecanismo: restriccion-bd
- deteccion: <consulta SQL, test o regla que falla ante una violación>
- protege: REQ-Sxx-001

## 4. Criterios de aceptación

> Binarios y comprobables. `enlaza`: REQ, BEH e INV que verifica. `metodo` ∈ `unitario | integracion | e2e | sql | manual`. `test`: archivo o ID del test que lo implementa (opcional hasta implementar; aparece en `TRAZABILIDAD.md`).
> Todo REQ `MUST` necesita al menos un AC (directo o a través de un BEH que lo cubra).

### AC-Sxx-001
- enlaza: REQ-Sxx-001, BEH-Sxx-001, INV-Sxx-001
- metodo: integracion
- procedimiento: <pasos exactos, incluidos los datos de entrada>
- esperado: <resultado verificable: valor, estado o ausencia de filas>
- test: <ruta/del/test o pendiente>

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- <Qué niveles se usan (unitario, integración con Postgres efímero, e2e) y qué se escribe primero (ADR-016).>

### 5.2 Migración
- <Cambios de datos o de esquema y cómo se revierten; «No aplica» si no hay.>

### 5.3 Riesgos
- <Riesgo y mitigación.>

### 5.4 Preguntas abiertas
> Cada pregunta lleva su `Default:`; si no se responde, se aplica y se marca como asumido.
- <Pregunta>. Default: <valor>.

<!-- Al pasar a revisión independiente (E5), añade al final de la spec:

## Revisión independiente
<Veredicto de spec-reviewer pegado sin editar, y lo que se corrigió después.>
-->
