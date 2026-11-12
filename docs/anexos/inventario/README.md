# Inventario de acoplamiento (gym-app @ b4352a0)

Generado con `generar_inventario.py <ruta-al-clon> <carpeta-salida>` (Python 3, solo stdlib). Cada `*.txt` lista `líneas<TAB>tipo<TAB>archivo` ordenado por densidad.

**Criterio de conteo:** un archivo cuenta si al menos una línea coincide con la expresión del término (ver `TERMS` en el script). Extensiones: ts, tsx, prisma, sql, mjs, js, json, md, yml, cs, xml, kt, java, gradle. Se excluyen `node_modules`, `.git`, `generated`, `.next`, `out`, `.agents`, `.windsurf`, `.claude`, `handoff.md` y `cookies.txt`. Tipos: `src`, `test`, `db-script` (todo `packages/db`), `doc`, `migracion`.

**Límites:** es un `grep` por patrón, no análisis semántico. Sobrecuenta (p. ej. `sucursal` aparece en comentarios) y subcuenta (acoplamientos sin la palabra, como lógica que asume "dos monedas" sin nombrarlas). Sirve para dimensionar y para priorizar la lectura, no para decidir por sí solo. Los números de las tareas de cada spec deben recontarse con el código de ese momento.
