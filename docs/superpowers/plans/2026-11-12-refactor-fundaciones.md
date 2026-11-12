# Plan global de implementación de Adhara Fit (G6)

Fecha: 2026-11-12 (America/Lima). Estado: **propuesto por Claude; el propietario ordenó el 2026-11-12 «comienza con el desarrollo cuanto antes»**, por lo que la implementación arranca por la Ola 0 mientras se cierran S-20 y S-21.

Este plan no cambia ninguna spec: ordena su ejecución. Cada spec aprobada es el contrato de su propio trabajo (sección 5.1 de la spec: pasos, un commit por paso, pruebas primero, ADR-016).

## 1. Reglas de ejecución
- Una spec se empieza solo si el propietario la aprobó por escrito (cabecera de CLAUDE.md). Hoy están aprobadas S-00 a S-15, S-17, S-18, S-19, S-22 y S-23; S-20 y S-21 están en redacción y se implementan al final.
- Un commit por paso de la sección 5.1 de la spec, con `typecheck`, `lint` y pruebas en verde; nunca un commit que rompa el árbol.
- Pruebas primero. Cada spec cierra con sus herramientas de términos (`tools/verificar-*.mjs`) en verde y con sus exenciones vacías.
- Al terminar cada spec: actualizar `handoff.md`, ejecutar `node tools/spec-lint.mjs`, y empujar a `main` en avance rápido cuando el propietario lo pida (o al cerrar una ola).
- Los pasos manuales de una spec (los AC `manual`) los hace el propietario; el plan los lista al final de cada ola.
- Hasta que exista el baseline (S-15 paso 6) la base de desarrollo se crea con `drizzle-kit push` contra una base desechable (S-22).

## 2. Orden de implementación
El orden respeta el campo `depende_de` de cada spec (verificado con un orden topológico: sin ciclos).

| Ola | Specs | Qué deja listo | Tamaño | Riesgo |
|---|---|---|---|---|
| 0. Cimientos | S-00, S-22 | Código del Repo A importado sin historia ni datos ajenos, Docker, CI, gitleaks; acceso a datos con Drizzle y suites de contrato | L + L | Alto: toca todo el árbol (unos 75 archivos de `web-admin`) |
| 1. Fundamentos transversales | S-01, S-02, S-03 | Seguridad base, hora de Lima, dinero exacto en soles y métodos de pago | M + M + L | Medio |
| 2. Núcleo de cobro | S-04, S-05, S-06, S-07 | Pago único con `cobroId`, negocio y sede únicos, documento de identidad, cambio de plan | L + L + M + L | Alto: reescribe el cobro |
| 3. Simplificación del dominio | S-08, S-09, S-10, S-11, S-18, S-23 | Sin turnos ni arqueo, eliminar miembro, sin lo venezolano, productos, entrenadores, un solo rol | M cada una | Medio |
| 3b. Herramientas de datos | S-15 pasos 1 a 5 | Migrador `db:migrar`, seed, servicio `migrar` de Compose, `admin:restablecer` queda en S-17 | M | Bajo |
| 4. Marca y diseño | S-19 | Tokens, tipografías propias, componentes, marca y galería `/diseno` | L | Medio: migra 92 archivos de `@gym-app/ui` |
| 5. Funciones nuevas | S-12, S-13, S-14 | Tickets y comprobantes apagados, consentimiento y aviso legal, reportes | M + M + M | Medio |
| 6. Pantallas de TV | S-20, S-21 | Vitrina y check-in en TV (cuando estén aprobadas) | M + M | Medio |
| 7. Línea base y operación | S-15 paso 6 y 7, S-17 | Migración inicial generada del esquema final, CI de deriva, despliegue con TLS, respaldos y `/api/salud` | M + L | Medio |

Notas del orden:
- S-05 antecede a S-08, S-10 y S-11 por dependencia declarada; S-05 edita archivos que esas tres borran después. Es un costo conocido de unos pocos archivos, aceptado para no romper el grafo de dependencias.
- S-15 se parte en dos momentos (SUP-S15-009): sus herramientas llegan en la Ola 3b porque S-12 y S-13 dependen de ellas; la línea base se genera en la Ola 7, cuando ya no cambia el esquema.
- S-19 va antes de las funciones nuevas para que S-12, S-13 y S-14 nazcan con los componentes y los tokens finales.
- S-20 y S-21 consumen `tokens.json` de S-19 y limpian las exenciones de las apps de TV.

## 3. Dependencias externas del propietario
| Insumo | Lo necesita | Cuándo |
|---|---|---|
| PNG originales del kit de logotipo en el repositorio | S-19 | Antes de la Ola 4 |
| Texto de consentimiento, política de privacidad y aviso del Libro de Reclamaciones, revisados por un abogado | S-13 (publicación; no bloquea el desarrollo) | Antes de usar el sistema con miembros |
| Validación del contador sobre ticket y comprobantes | S-12 (encender interruptores) | Antes de encenderlos |
| VPS, dominio, bucket S3 con versionado, monitor externo, llave privada de age | S-17 | Antes de la Ola 7 |
| IP fija del gimnasio | S-17 (`IPS_PERMITIDAS`) | Opcional |
| Nombre y correo del primer administrador | S-15 | Al sembrar |
| Datos de cobro de Yape y de la cuenta del BCP | Carga manual tras el seed | Al desplegar |
| Pruebas manuales (AC `manual`) | Todas las olas | Al cerrar cada ola |

## 4. Riesgos del plan
1. **Ola 0 rompe el árbol entero.** Mitigación: pruebas de caracterización por HTTP antes de editar (S-05, S-22), un commit por paso y la base efímera de S-22.
2. **Reescribir el cobro (S-04, S-07) sin pruebas heredadas.** Mitigación: las pruebas de caracterización son el paso 1 de cada spec; el cobro tiene transacción, bloqueo y `cobroId`.
3. **Cambios simultáneos sobre los mismos archivos (S-05, S-08, S-10, S-11).** Mitigación: ejecución secuencial, sin ramas paralelas largas.
4. **El baseline al final puede no emitir algún CHECK.** Mitigación: plan B con SQL en la migración (S-15 paso 6) y la prueba de seis inserciones inválidas.
5. **Sin ejecutor de navegador, la regresión visual se detecta a ojo.** Mitigación: galería `/diseno`, revisión manual por superficie y las herramientas de tokens y contraste.
6. **El repositorio es público** (decisión del propietario, ADR-014): el diseño y los datos iniciales son visibles. Mitigación: ninguna credencial ni dato personal en el árbol (gitleaks desde S-00).
7. **Dependencias del propietario** (sección 3) pueden frenar la Ola 4 y la Ola 7. Mitigación: avisarlas al cerrar la Ola 3.
8. **La sesión de nube se reclama por inactividad.** Mitigación: empujar a `main` al cerrar cada ola y mantener `handoff.md` al día.

## 5. Puertas de cierre de cada ola
Cada ola termina con: todas sus herramientas `tools/verificar-*.mjs` en verde y sin exenciones vacías de sus specs; `typecheck`, `lint` y pruebas en verde; `node tools/spec-lint.mjs` limpio; `handoff.md` actualizado; empuje a `main` si el propietario lo pide; y la lista de pasos manuales entregada al propietario.

## 6. Primer paso
Ola 0, S-00: importar el Repo A sin historia con las exclusiones de S-00 (§0.2), agregar `LICENSE`, `.gitignore`, `.env.example`, `docker-compose.yml`, CI de calidad y gitleaks, y fijar versiones. El detalle está en la sección 5.1 de `docs/superpowers/specs/S-00-fundaciones-del-repo.md`.
