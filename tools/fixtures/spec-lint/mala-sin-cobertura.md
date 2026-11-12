---
id: S-97
estado: en-revision
adrs: ADR-001
depende_de: ninguna
aprobada_por:
fecha_aprobacion:
---
# S-97 — Spec en revisión sin cobertura (ejemplo de spec mala)

## 0. Contexto y alcance

### 0.1 Problema
El ejemplo carece de escenarios y de criterios de aceptación.

### 0.2 Dentro de alcance
- Un requisito sin cobertura.

### 0.3 Fuera de alcance
- Todo lo demás.

### 0.4 Comportamiento actual verificado
- No existe implementación previa: no verificado.

### 0.5 Supuestos
- SUP-S97-001: ninguno relevante. Default: sin cambios; asumido, por validar.

## 1. Requisitos

### REQ-S97-001
- tipo: cuando
- prioridad: MUST
- origen: ADR-001
- texto: Cuando llega un evento, el sistema deberá registrarlo.

## 2. Comportamiento

## 3. Invariantes

### INV-S97-001
- propiedad: los eventos no se pierden
- mecanismo: transaccion
- deteccion: una consulta que compara eventos recibidos y registrados debe dar 0 de diferencia
- protege: REQ-S97-001

## 4. Criterios de aceptación

## 5. Plan de pruebas, migración, riesgos y preguntas abiertas

### 5.1 Plan de pruebas
- Ninguno todavía.

### 5.2 Migración
- No aplica.

### 5.3 Riesgos
- Falta de cobertura.

### 5.4 Preguntas abiertas
- ¿Hay más eventos? Default: no.
