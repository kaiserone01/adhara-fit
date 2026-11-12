---
id: S-99
estado: aprobada
adrs: ADR-001
depende_de: ninguna
aprobada_por: propietario
fecha_aprobacion: 2026-01-15
---
# S-99 — Ejemplo de spec válida

## 0. Contexto y alcance

### 0.1 Problema
El contador de visitas del ejemplo no impide registrar visitas con fecha futura.

### 0.2 Dentro de alcance
- Registrar una visita y consultar el total del día.

### 0.3 Fuera de alcance
- Reportes históricos.

### 0.4 Comportamiento actual verificado
- `registrarVisita` no valida la fecha recibida (`packages/domain/visitas.ts:12`).
- El tiempo de respuesta de la consulta no se ha medido: no verificado.

### 0.5 Supuestos
- SUP-S99-001: el día se mide en America/Lima. Default: se usa la hora local de Lima; asumido, por validar.

## 1. Requisitos

### REQ-S99-001
- tipo: cuando
- prioridad: MUST
- origen: ADR-001
- texto: Cuando se registra una visita, el sistema deberá incrementar el total del día en 1.

### REQ-S99-002
- tipo: ubicuo
- prioridad: SHOULD
- origen: ADR-001
- texto: El sistema deberá responder la consulta del total en menos de 200 ms.

### REQ-S99-003
- tipo: si-entonces
- prioridad: MUST
- origen: ADR-001
- texto: Si el registro llega con una fecha futura entonces el sistema deberá rechazarlo con el error FECHA_FUTURA.

### REQ-S99-004
- tipo: mientras
- prioridad: SHOULD
- origen: ADR-001
- texto: Mientras el turno está cerrado, el sistema deberá mostrar el total en solo lectura.

### REQ-S99-005
- tipo: donde
- prioridad: SHOULD
- origen: ADR-001
- texto: Donde el gimnasio tenga habilitado el aforo, el sistema deberá mostrar el aforo actual.

## 2. Comportamiento

### BEH-S99-001
- cubre: REQ-S99-001, REQ-S99-002
- categoria: feliz
- dado: un total del día de 10 visitas
- cuando: se registra una visita válida
- entonces: el total del día es 11 y la consulta responde en menos de 200 ms

### BEH-S99-002
- cubre: REQ-S99-001
- categoria: borde
- dado: un día sin visitas a las 00:00 de Lima
- cuando: se registra la primera visita
- entonces: el total del día es 1

### BEH-S99-003
- cubre: REQ-S99-003
- categoria: error
- dado: la fecha de hoy
- cuando: se registra una visita con la fecha de mañana
- entonces: el registro se rechaza con FECHA_FUTURA y el total no cambia

### BEH-S99-004
- cubre: REQ-S99-001
- categoria: concurrencia
- dado: un total del día de 10 visitas
- cuando: dos visitas se registran al mismo tiempo
- entonces: el total del día es 12

### BEH-S99-005
- cubre: REQ-S99-004, REQ-S99-005
- categoria: feliz
- dado: un turno cerrado y el aforo habilitado
- cuando: se abre la pantalla del total
- entonces: se muestra el total en solo lectura y el aforo actual

## 3. Invariantes

### INV-S99-001
- propiedad: el total del día nunca es negativo
- mecanismo: restriccion-bd
- deteccion: una consulta SQL que cuenta las filas con total menor que 0 debe devolver 0
- protege: REQ-S99-001

## 4. Criterios de aceptación

### AC-S99-001
- enlaza: REQ-S99-001, BEH-S99-001, BEH-S99-002, BEH-S99-004
- metodo: integracion
- procedimiento: registrar visitas con la base efímera, incluida una carga de dos registros simultáneos
- esperado: los totales coinciden con los de los escenarios BEH-S99-001, BEH-S99-002 y BEH-S99-004
- test: visitas.integracion.test.ts

### AC-S99-002
- enlaza: REQ-S99-003, BEH-S99-003
- metodo: unitario
- procedimiento: llamar a registrarVisita con la fecha de mañana
- esperado: lanza FECHA_FUTURA y el total no cambia
- test: visitas.test.ts

### AC-S99-003
- enlaza: INV-S99-001
- metodo: sql
- procedimiento: ejecutar SELECT count(*) FROM total_dia WHERE total < 0 tras la suite de integración
- esperado: el resultado es 0

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Unitarias de dominio y una prueba de integración con la base efímera.

### 5.2 Migración
- No aplica: el ejemplo no modifica datos existentes.

### 5.3 Riesgos
- Zona horaria: un cálculo en UTC cambiaría el día a las 19:00 de Lima.

### 5.4 Preguntas abiertas
- ¿Se cuentan las visitas anuladas? Default: no se cuentan.

## Revisión independiente
El revisor devolvió CUMPLE en todas las comprobaciones. Observación de ejemplo: la consulta debería ser rápida, etc.
