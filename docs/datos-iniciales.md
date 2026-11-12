# Datos iniciales entregados por el propietario

Registrados el 2026-11-12 a partir de lo que el propietario escribió en el chat. Son datos de arranque del negocio: los consumirán la spec del seed (S-15, propuesta) y la de entrenadores (S-18, propuesta). No son una decisión de arquitectura.

## Quién usa el sistema
- Es un gimnasio pequeño y no hay empleados como figura. Inicia sesión **solo el socio o administrador**.
- Los entrenadores se registran como personas del gimnasio **sin credenciales de acceso** (interpretación mía de «solo el rol del socio o administrador, los entrenadores»; asumido, por validar).

## Planes (pago único, ADR-010 propuesto)
| Plan | Duración | Precio | En céntimos |
|---|---:|---:|---:|
| 1 mes | 1 mes | S/ 120.00 | 12000 |
| 2 meses | 2 meses | S/ 200.00 | 20000 |
| 3 meses | 3 meses | S/ 280.00 | 28000 |

- El propietario no indicó planes de 4 a 6 meses. El sistema seguirá admitiendo de 1 a 6 meses (ADR-010), pero el seed crea solo estos 3.

## Entrenadores (4)
Escritos tal como los dio el propietario, con mayúsculas normalizadas por mí (ortografía por confirmar):
- María Aguilera
- José Montesino
- Joa Bonillo
- Jesús Bonillo
