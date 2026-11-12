# ADR-016: Estrategia de pruebas

Estado: **propuesto** (2026-11-12)

## Contexto
Hechos (doc 09, **no re-verificados** por falta del código del Repo A): el dominio del base tiene 39 archivos de test (≈375 casos, **sin ejecutar**); `web-admin` tiene 0 tests (V-01, V-02); el runner es Vitest (DI-01); `RegistrarPago` no es transaccional y concentra reglas críticas (§3.1, DI-64); `RegistrarPago` no exige turno abierto (H-01); la dependencia de zona horaria es triple (§3.3). No se ejecutó ni la suite ni la app (§1).

El propietario exige test primero, Postgres efímero, un test de contrato de permisos y una línea base de tests.

## Factores de decisión
- La caja y los pagos dependen de transacciones y concurrencia reales de PostgreSQL.
- Toda regla de negocio debe poder comprobarse (ningún AC sin método).
- La suite no puede apoyarse en una base compartida ni en producción.
- Sin dependencias nuevas sin justificar.

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **A. Unitarias de dominio puras + integración sobre PostgreSQL efímero + e2e mínimo (elegida)** | Prueba la semántica real de transacciones | Requiere Docker en local y en CI |
| B. Repositorios simulados en memoria | Rápida | No detecta fallos de transacción, concurrencia ni de migración |
| C. SQLite como sustituto | Sin Docker | Semántica distinta de PostgreSQL (tipos, bloqueo, `Decimal`) |

## Decisión
1. **Test primero:** cada `AC-` de una spec tiene su test (o consulta SQL / pasos manuales declarados) escrito antes del código que lo satisface.
2. **Postgres efímero:** las pruebas de integración crean su base por ejecución y la destruyen al terminar; nunca comparten base ni usan una real. **`prisma migrate` solo corre contra la base efímera.** El mecanismo (servicio de Docker Compose) es un **supuesto, por validar** en S-00; usar una librería tipo Testcontainers sería una dependencia nueva a justificar.
3. **Test de contrato de permisos:** recorre `app/api/**` y las server actions y falla si alguna no declara permiso (ADR-012 §4; tarea 0.10 del doc 07).
4. **Línea base antes de tocar código** (doc 07 tarea 0.7; doc 10 §2.A): `npm ci`, `tsc`, lint y suite completa; se registra nº real de tests por workspace, fallos preexistentes y archivos de `web-admin` con tests. Requiere una copia local del Repo A: **S-04 queda condicionada** hasta tenerla.
5. **Tests de caracterización** del flujo de cobro sobre Postgres efímero **antes** de reescribir `RegistrarPago` (tarea 0.11).
6. **Dinero:** casos de borde (S/ 0.01, 0.005, 99.995) y test de propiedad (ADR-011 §5). La librería de propiedades (p. ej. `fast-check`) es un **supuesto**, a justificar en S-03.
7. **Tiempo:** pruebas de borde 23:59/00:00 en `America/Lima` (doc 09 §3.3, S-02).
8. **Herramientas del repo** (hooks, `spec-lint`, `check-handoff`): `node:test`, sin dependencias.
9. Prohibido borrar tests para que pase la suite o desactivar reglas de lint; `any` no es atajo.
10. Cada `AC-` queda enlazado a su test en `TRAZABILIDAD.md`.

## Consecuencias
- (+) Los fallos de caja y concurrencia aparecen antes de producción.
- (−) CI más lenta y dependencia de Docker.
- (−) `web-admin` parte de 0 tests: la cobertura de UI se construye por spec, no de golpe.
- Dependencia nueva potencial: librería de propiedades; se decide en S-03.

## Cómo se valida
- Job de CI con PostgreSQL efímero; el test de contrato falla si una ruta o acción no declara permiso.
- `docs/linea-base-tests.md` (cuando se proporcione el Repo A) con los números reales.
- Invariante: ninguna prueba toca una base que no sea la efímera (el helper de pruebas aborta si `DATABASE_URL` no apunta a ella).

## Reversibilidad
Media: cambiar de mecanismo de base efímera es barato; abandonar el test primero no lo es sin perder la trazabilidad.

## Dependencias
- Apoya **ADR-010** (reescritura transaccional), **ADR-011** (propiedades de dinero), **ADR-012** (contrato de permisos). Se rige por **ADR-015** (AC con método).

## Referencias
`docs/09-verificacion-contra-codigo.md` §1, §3.1, §3.3, V-01/V-02 · `docs/11-verificacion-documento-ingenieria.md` DI-01, DI-64, H-01 · `docs/07-plan-implementacion-roadmap.md` tareas 0.7, 0.10, 0.11 · `docs/10-prompt-claude-code.md` §2.A.
