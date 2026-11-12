# ADR-013: Baja lógica de miembros y retención de datos

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-12 · Aceptado con la denominación «Eliminar» en pantalla

## Contexto
`eliminarConHistorial` borra en una transacción check-ins, auditoría de cambios de plan, deudas, pagos, suscripciones y el miembro. Los pagos borrados desaparecen de caja y reportes. Esto contradice la regla de que un pago se anula con motivo y autor, destruye evidencia contable y no distingue entre dar de baja a un socio y atender una solicitud de supresión de datos personales (derechos ARCO, Ley 29733).

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- `EliminarMiembro` destruye evidencia contable (doc 09 §3.5, doc 11 DI-54).
- Un pago se anula con motivo y autor; no se borra.
- Atender solicitudes de supresión de datos personales (derechos ARCO) sin romper la contabilidad.
- Plazo de conservación a validar con contador/abogado (P-20).

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

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-09 (baja lógica y anonimización).
- **Invariantes a fijar:** ninguna operación borra pagos; `AnonimizarMiembro` conserva importes y fechas y deja registro de auditoría; ya no existe "eliminar con historial".

## Reversibilidad
*(Pase formal F.)* La baja lógica es reversible; la anonimización es irreversible por diseño.

## Dependencias
*(Pase formal F.)* ADR-004 (unicidad al anonimizar el documento), ADR-010 (pagos conservados). Pendiente P-20 (plazo de retención). Hallazgos abiertos de la revisión G3 (C13, C14): ver `REVISION-ADR.md` §4, §7 y §8.4.

## Enmiendas posteriores (2026-11-12)
*Derivadas de decisiones aceptadas por el propietario (ADR-018, ADR-019, ADR-020). El texto anterior se conserva; donde choca, rige esta sección.*
- La entidad `DeudaProducto`, que `eliminarConHistorial` borraba, se elimina (ADR-018). La decisión de baja lógica y anonimización no cambia.

## Notas del propietario (2026-11-12)
- Respuesta en el chat: «Baja de miembros: Aceptado, solo que la denominación será "Eliminar"; dar de baja no es el término correcto. Requiere confirmar». Confirmado el 2026-11-12: «ADR-013 aceptado con "Eliminar" (conserva los pagos y oculta al miembro)».

## Enmiendas posteriores (2026-11-12)
*Confirmadas por el propietario. El texto anterior se conserva; donde choca, rige esta sección.*
- **Denominación:** en pantalla la acción se llama **«Eliminar»** y el estado «Eliminado»; «dar de baja» deja de usarse. Por dentro el comportamiento es el de la Decisión 1: el miembro deja de aparecer en listados y kiosco y **conserva sus pagos y suscripciones**; el nombre técnico del estado puede seguir siendo `BAJA`. La confirmación de la pantalla debe decir que los pagos se conservan.
- La Decisión 4 sigue válida: el permiso `ELIMINAR` de `MIEMBROS` es el que autoriza esta acción.
- La anonimización a pedido (Decisión 2) sigue siendo el único modo de quitar los datos personales.

## Enmiendas posteriores (2026-11-12, orden del propietario)
- **Anonimización descartada:** el propietario indicó que no se necesita anonimizar datos. La Decisión 2 (`AnonimizarMiembro`) y la Decisión 5 (check-ins solo agregados al anonimizar) quedan sin efecto; un miembro eliminado conserva todos sus datos, incluidos los personales. Siguen vigentes la baja lógica con la denominación «Eliminar», la conservación de pagos y suscripciones, el permiso `ELIMINAR` de `MIEMBROS` y la restauración. El borrado físico por retención (Decisión 3) sigue pendiente de P-20 y no se implementa.
