# Mapa de specs de Adhara Fit (lenguaje simple)

Actualizado: 2026-11-12. Una **spec** es la descripción de una parte del sistema que tú apruebas **antes** de que se escriba código. Se hacen de una en una.

**Estados:** *aprobada* (tú la aprobaste) · *en revisión* (un revisor independiente la lee) · *borrador* · *por redactar* · *propuesta* (la propuse yo, tú decides si entra).

## A. Las 11 del refactor (S-00 a S-10)
Vienen del documento 10 (§2.C). Convierten el código heredado en el sistema de Adhara Fit.

| Spec | Qué es, en simple | Estado |
|---|---|---|
| **S-00 Fundaciones** | Traer el código del Repo A **sin su historia, sin datos de otro negocio, sin claves**; dejar listo Docker, la verificación automática (CI) y el control de secretos. Es la primera: sin ella no hay código. | **Aprobada** (2026-11-12) |
| S-01 Seguridad base | Las cuentas desactivadas no entran; límite de intentos de login; la clave del kiosco se guarda cifrada y se puede cambiar; cada operación comprueba permisos; ningún script destructivo. | **Aprobada** (2026-11-12) |
| S-02 Hora de Lima | Hoy el sistema usa la hora de Caracas (UTC-4). Pasa a la de Lima (UTC-5) en todas partes y a formato peruano. | **Aprobada** (2026-11-12) |
| S-03 Dinero y métodos de pago | Todo en soles con 2 decimales exactos (`S/ 120.00`), sin errores de coma flotante y sin redondeo salvo regla explícita; el redondeo de efectivo del BCRP queda preparado y apagado. Métodos de Perú: efectivo, Yape/Plin, tarjeta, transferencia, depósito. Sin dólares ni bolívares. | **Aprobada** (2026-11-12) |
| S-04 Pago único de membresías | Reescribir el cobro: un solo pago, de 1 a 6 meses; sin abonos; se puede anular con motivo; **una sola** fecha de vencimiento confiable. Cobrar nunca exige turno. Sin pagos repartidos entre métodos y sin días de gracia (decisiones del propietario). | **Aprobada** (2026-11-12) |
| S-05 Negocio y sede únicos | Quitar el concepto de organización y de sucursales: Adhara Fit es un solo negocio con un solo local (ADR-019, ADR-002). | **Aprobada** (2026-11-12) |
| S-06 Documento de identidad | DNI, carné de extranjería o pasaporte; código numérico corto para quien no tiene DNI. | **Aprobada** (2026-11-12) |
| S-07 Cambio de plan | Unificar las tres formas de cambiar de plan; sin saldo a favor; ya no distingue planes con y sin entrenador. | Por redactar |
| S-08 Registro continuo de cobros | **Reformulada por tu decisión:** sin turnos ni arqueo. Registra cada cobro (quién, cuándo, método) y da el reporte diario por método y usuario. | Por redactar |
| S-09 Eliminar miembro y anonimización | «Eliminar» a un miembro (en pantalla se llama así; por dentro conserva sus pagos) sin borrar sus pagos; anonimizar sus datos si lo pide. | Por redactar |
| S-10 Retirar lo venezolano | Quitar tasa BCV, el worker, el padrón Excel, los scripts del otro cliente y su marca. | Por redactar |

## B. Las que propuse yo (S-11 a S-23)
No estaban en los documentos 01 a 12: las agregué tras cruzar **todos los requisitos** contra las specs (`COBERTURA-RF.md`). Cada una cubre algo del PRD que ninguna otra spec cubría.

| Spec | Qué es, en simple | Por qué la propongo | De qué depende | Estado |
|---|---|---|---|---|
| **S-11 Productos (sin fiado)** | Vender productos (agua, guantes…) con cobro inmediato; **se elimina el fiado**; permisos propios; precios en soles. | RF-37 está en el MVP y no tenía spec. Decidiste: productos sí, fiado no. | S-01, S-03, S-08 | Propuesta |
| **S-12 Tickets y comprobantes de pago** | **Todo desarrollado y apagado** hasta que confirmes habilitarlo: ticket digital no fiscal por correo, ticket impreso no fiscal en ticketera y registro de comprobante tributario (boleta, factura). No emite a SUNAT. | RF-39, obligatorio en el MVP (ADR-006). | S-03, S-04 | Propuesta |
| **S-13 Consentimiento y aviso legal** | Registrar que el miembro aceptó el tratamiento de sus datos (fecha y versión del texto), mostrar la política de privacidad y el aviso del Libro de Reclamaciones. | RF-15, RF-71 y RF-72: obligatorios en el MVP. Los textos legales los debe revisar un abogado. | S-06, S-09 | Propuesta |
| **S-14 Reportes** | Morosos, por vencer (7 días), histórico de pagos imprimible, ingresos por método y período. | RF-62 y RF-36; reemplaza el arqueo como control. | S-04, S-12 | Propuesta |
| **S-15 Base de datos inicial y seed** | Crear la base de datos nueva desde cero y un usuario inicial **sin contraseñas fijas**. | Tarea 1.10 del plan, sin dueño; S-00 la deja «para después». | S-03, S-05, S-06, S-09 | Propuesta |
| **S-16 Importador de miembros** | Cargar los miembros que ya tiene Adhara desde un CSV, con prueba previa y confirmación. | HU-50; sin esto empiezan con la base vacía. | S-06, S-15 | **Descartada** (propietario, 2026-11-12: son pocos miembros y se cargan a mano) |
| **S-17 Operación** | Copia de seguridad diaria (14 días) y prueba de restauración; alertas; salida a producción con dominio y TLS; restricción por IP para autorizar solo los dispositivos que correspondan (idea del propietario, en desarrollo no se aplica). | RNF-07, RNF-08, RNF-09 y RF-70. | S-00, S-01 | Propuesta |
| **S-18 Entrenadores** | Hoy un entrenador es un usuario con correo falso y clave aleatoria. Pasa a ser un registro **sin credenciales** que se asigna **solo al miembro**; se elimina la distinción «plan con entrenador» y «plan sin entrenador» (todos los planes incluyen entrenador). | P-22 y hallazgo H-07 (riesgo de seguridad). | S-01, S-06 | Propuesta |
| **S-19 Sistema de diseño y rebranding** | Identidad completa de Adhara Fit: colores, tipografía, componentes, estados y patrones, iguales en panel, kiosco, kiosco en TV y vitrina. | Tu decisión (ADR-020). **Aprobada como ítem**; su contenido aún no. | S-10 | **Ítem aprobado** |
| **S-20 Vitrina de TV** | Heredar lo que resuelve la vitrina actual: carteles de entrenador, promoción y producto, con imagen o video, vigencia, orden y precios; adaptada a soles y a la marca nueva. | Entra al alcance por tu decisión (ADR-021). | S-03, S-19 | Propuesta |
| **S-21 Check-in en smart-TV** | El kiosco funcionando en un Android TV, con **teclado numérico USB** conectado. | Entra al alcance por tu decisión (ADR-021). | S-05, S-06, S-19 | Propuesta |
| **S-22 Capa de datos con Drizzle** | Reemplazar Prisma por Drizzle en el acceso a la base de datos, sin cambiar el comportamiento; se hace justo después de S-00 y antes de S-01. | Tu indicación del 2026-11-12; ADR-022 (aceptado el 2026-11-12: va después de S-00 y antes de S-01). Incluye pruebas de los repositorios, que hoy no existen, y el cambio de unos 75 archivos de `web-admin`. S-01 a S-21 dependerían de ella. | S-00 | **Aprobada** (2026-11-12) |
| **S-23 Un solo rol: socio o administrador** | Dejar como única persona que inicia sesión al socio o administrador, con acceso total; quitar los roles GERENTE y RECEPCION y los permisos por módulo; los entrenadores pasan a ser un registro sin acceso. | Tu respuesta del 2026-11-12: gimnasio pequeño, sin empleados. | S-01, S-18 | **Ítem aprobado** (propietario, 2026-11-12) |

## C. Qué decides tú
1. Si entran todas las de la sección B (o cuáles).
2. «S-00 aprobada» cuando el revisor y yo terminemos.
3. El orden y las dependencias definitivas se fijan en el **plan global** (G6), que cierra esta sesión de diseño.

## D. Fuera del proyecto
SUNAT (emisión electrónica), WhatsApp, sitio público, multi-sede visible y `kiosk-host` (el programa `.exe` para el numpad en PC, confirmado por ti).
