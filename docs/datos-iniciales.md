# Datos iniciales entregados por el propietario

Registrados el 2026-11-12 a partir de lo que el propietario escribió en el chat. Son datos de arranque del negocio: los consumirán la spec del seed (S-15, propuesta) y la de entrenadores (S-18, propuesta). No son una decisión de arquitectura.

## Quién usa el sistema
- Es un gimnasio pequeño y no hay empleados como figura. Inicia sesión **solo el socio o administrador**.
- Los entrenadores se registran como personas del gimnasio **sin credenciales de acceso** (interpretación mía de «solo el rol del socio o administrador, los entrenadores»; asumido, por validar).

## Planes (pago único, ADR-010 propuesto)
| Plan | Precio |
|---|---:|
| 1 mes | S/ 120.00 |
| 2 meses | S/ 200.00 |
| 3 meses | S/ 280.00 |

- Los precios se muestran siempre con 2 decimales y sin redondeo (por ejemplo S/ 120.00).
- El propietario no indicó planes de 4 a 6 meses. El sistema seguirá admitiendo de 1 a 6 meses (ADR-010), pero el seed crea solo estos 3.
- **Todos los planes incluyen entrenador.** No existe la distinción «con entrenador» y «sin entrenador» en los planes (a diferencia de la versión anterior). El entrenador se asigna solo al miembro, y la asignación es opcional (asumido, por validar).

## Entrenadores (4)
Escritos tal como los dio el propietario, con mayúsculas normalizadas por mí (ortografía por confirmar):
- María Aguilera
- José Montesino
- Joa Bonillo
- Jesús Bonillo

## Formato de montos
- Convención del propietario: **S/ 120.00** (formato habitual de Perú) en precios y en todos los registros transaccionales; sin conversión entre monedas.
- Reglas: prefijo `S/`, punto decimal, siempre 2 decimales, coma para miles (`S/ 1,200.00`), negativos `-S/ 50.25`, sin redondeo del monto cobrado.
- Detalle técnico, que el usuario no ve: la base guarda el valor exacto con 2 decimales y el cálculo interno puede usar enteros para evitar errores de coma flotante (ADR-011, propuesto).

