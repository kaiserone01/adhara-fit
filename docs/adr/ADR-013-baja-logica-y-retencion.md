# ADR-013: Baja lógica de miembros y retención de datos

Estado: **propuesto** (2026-11-12) · Origen: `EliminarMiembro` borra pagos e historial (doc 09 §3.5)

## Contexto
`eliminarConHistorial` borra en una transacción check-ins, auditoría de cambios de plan, deudas, pagos, suscripciones y el miembro. Los pagos borrados desaparecen de caja y reportes. Esto contradice la regla de que un pago se anula con motivo y autor, destruye evidencia contable y no distingue entre dar de baja a un socio y atender una solicitud de supresión de datos personales (derechos ARCO, Ley 29733).

## Decisión
1. **Baja lógica:** el miembro pasa a `estado = BAJA` con `bajaEn`, `bajaPorId`, `bajaMotivo`; deja de aparecer en listados y kiosco, pero conserva pagos y suscripciones.
2. **Supresión a pedido (ARCO):** caso de uso `AnonimizarMiembro` que reemplaza nombre, documento, teléfono, correo, foto y fecha de nacimiento por valores no identificables, conservando importes y fechas para cuadrar caja y contabilidad. Queda registro de auditoría de quién y cuándo.
3. **Borrado físico** solo por una tarea de retención programada, tras el plazo que fije el contador/abogado **[VERIFICAR]** (referencia a validar: conservación de comprobantes y libros contables por el plazo tributario).
4. Se elimina la opción "eliminar con historial" de la UI y del caso de uso; `ELIMINAR` en `MIEMBROS` pasa a significar "dar de baja".
5. Los check-ins se conservan agregados (conteo por día) cuando se anonimiza.

## Alternativas
- Mantener el borrado físico con confirmación doble: irreversible y sin traza.
- Borrado en cascada solo de datos personales manteniendo pagos huérfanos: rompe integridad referencial y reportes.

## Consecuencias
- (+) Contabilidad íntegra y cumplimiento de supresión; (−) nuevo estado en el modelo y filtros en todas las consultas de miembros (tarea en Fase 1).
