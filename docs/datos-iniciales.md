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
- **Todos los planes incluyen entrenador.** No existe la distinción «con entrenador» y «sin entrenador» en los planes (a diferencia de la versión anterior). El entrenador se asigna solo al miembro, y la asignación es opcional (asumido, por validar). *Aprobado en S-07 (2026-11-12): el entrenador del miembro es opcional (supuesto); la duración del plan se fija al crearlo.*

## Entrenadores (4)
Escritos tal como los dio el propietario, con mayúsculas normalizadas por mí (ortografía por confirmar):
- María Aguilera
- José Montesino
- Joa Bonillo
- Jesús Bonillo

## Formato y política de montos
- Política del propietario (2026-11-12), registrada como ADR-011 versión 2 (propuesto): PEN con 2 decimales; base con valor exacto; API con cadena `"120.00"` y código `PEN`; un solo formateador `S/ 120.00` (`S/ 1,200.00`, `-S/ 50.25`); sin coma flotante; sin redondeo global, solo por regla explícita; redondeo de efectivo del BCRP preparado como política intercambiable y apagada, sin alterar nunca el importe original.
- Solo registros contables; el cálculo tributario y las transacciones fiscales están fuera de alcance.

## Métodos de pago
- Conformados por el propietario (2026-11-12): **Yape**, **transferencias al BCP** y **Efectivo** (los cobros en efectivo también son una opción). El catálogo queda abierto para agregar Plin, Tarjeta o Depósito desde la administración. El redondeo de efectivo del BCRP sigue apagado (ADR-011).

## Dinero y cobros (aclaración del propietario, 2026-11-12)
- Efectivo sigue siendo un método de pago permitido (junto con Yape y transferencias al BCP).
- No existen turnos, fiado ni deudas; el sistema registra el cobro de membresías (también las de miembros vencidos) y la venta de productos con cobro inmediato.
