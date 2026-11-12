# Revisión de ADRs (G3)

Fecha: 2026-11-12 (America/Lima) · Alcance: ADR-001…013 (zip v0.4) y los cuatro nuevos ADR-014…017 (propuestos hoy).
Estado de todos los ADR: **propuesto**. Ninguno se marca *aceptado* en este documento: eso lo ordena el propietario, ADR por ADR.

## 0. Método y límites
- **Hecho (verificado por mí en esta sesión):** lectura completa de los 13 ADR y de `docs/08`, `docs/09`, `docs/11`, `docs/10`; comprobación por `grep` de secciones, de las tareas del plan (`docs/07`: 0.3, 0.7, 0.10, 0.11, 1.3b, 1.4, 1.16 existen) y de HU-50/RNF-10; recálculo de los contrastes WCAG de ADR-008 con la fórmula estándar.
- **No re-verificado:** todo lo que dependa del código del Repo A (cifras de archivos, comportamiento de casos de uso). Me apoyo en `docs/09` y `docs/11`, que citan archivo y línea.
- **No verificado:** referencias legales (R.S. 000075-2026/SUNAT en ADR-006; Ley 29733 y plazos de conservación en ADR-013); `docs/09` y `docs/11` no las respaldan.
- **Independencia:** el veredicto de `adr-reviewer` (§7) lo obtuve dándole solo la ruta y la lista de comprobación, sin este análisis. Se pega sin editar. Mi veredicto sobre ADR-014…017 es de autor y **no es vinculante**; deciden el revisor y tú.

## 1. Resumen
| | Cantidad |
|---|---:|
| ADR revisados | 17 (13 del zip + 4 nuevos) |
| Con secciones MADR completas | 4 (ADR-014…017, redactados hoy) |
| Con secciones MADR incompletas | 13 (ADR-001…013): todos carecen de *Factores de decisión*, *Cómo se valida*, *Reversibilidad* y *Dependencias*; ADR-007, 008 y 009 carecen además de *Alternativas* |
| Contradicciones o ambigüedades sustantivas | 6 (T-02, T-03, T-04, T-07, T-10 y una de ADR-008) |
| Decisiones que necesito de ti | 10 (§5) |

## 2. Hallazgos transversales
| ID | Hallazgo | Evidencia | Propuesta |
|---|---|---|---|
| T-01 | **Formato MADR incompleto en ADR-001…013.** Faltan *Factores de decisión*, *Cómo se valida*, *Reversibilidad* y *Dependencias* (los ADR-007/008/009 tampoco tienen *Alternativas*). Hay validación embebida solo en ADR-012 (cada criterio con test) y parcial en ADR-011 §5 y ADR-010 (tarea 0.11). | `grep` de encabezados en `docs/adr/ADR-0{01..13}-*.md` | **Pase formal F:** añadir esas secciones **sin tocar decisión ni estado**, con lo que ya dicen los ADR y los docs 09/11. Solo con tu autorización (D1). |
| T-02 | **Colisión de IDs `S-xx`.** Los supuestos del doc 01 §7 y del doc 08 se llaman `S-01…S-10`; las specs del backlog se llaman `S-00…S-10` (p. ej. "S-02" = supuesto "todo en PEN" y también spec de tiempo). ADR-004 cita "[SUPUESTO S-10]". | `docs/01…` líneas 167-174; `docs/08…` línea 44; `docs/10…` §2.C; ADR-004 | ADR-015 §8: en documentos nuevos los supuestos pasan a `SUP-xx`. Los docs importados no se editan (D2). |
| T-03 | **ADR-005 §6 "sin firmas" choca con la regla 1** (commits firmados por el propietario). En el Repo A significaba "sin metadatos de IA". | ADR-005 §6; `CLAUDE.md` §1 | ADR-014 §6 lo aclara. Requiere una enmienda de ADR-005 (la redacción de §6) cuando lo aceptes. |
| T-04 | **Cifras desactualizadas respecto al propio doc 09.** ADR-003 "65 archivos con lógica Bs" (doc 09 V-08 la corrige a 59: 50+6+3, §5). ADR-004 "~52 archivos" (§5: cédula 40+11 = 51 en código y tests; 61 con scripts). ADR-010 "78 archivos con *abono*": §3.1 dice 78 pero la tabla de §5 suma 77 (53+11+2+11 docs) y `docs/08` dice ~66 sin docs. ADR-001 "≈41 000 líneas, 732 commits": sin respaldo en 09/11. | doc 09 V-08, §3.1, §5; doc 08 línea 14 | Recontar con `generar_inventario.py` cuando haya copia local del Repo A. Mientras, citar el doc 09 §5. |
| T-05 | **Solapamientos con varios "dueños".** Scripts destructivos: ADR-005 §3, ADR-007, ADR-012 §9. Secretos y credenciales: ADR-005 §4-5 y ADR-012 §7. Catálogo de métodos de pago: ADR-003 y ADR-006 (ADR-006 no incluye `esEfectivo`, que doc 09 §3.4 exige para el arqueo, y junta Yape/Plin en `BILLETERA_DIGITAL` mientras doc 09 los separa). | ADR citados; doc 09 §3.4 | Un solo dueño por invariante: S-00 (exclusiones y escaneo), S-01 (scripts y seguridad), S-03 (catálogo). |
| T-06 | **Dependencias nuevas implícitas, sin justificar:** gitleaks (ADR-005 §4), `zod` (ADR-012 §5), librería de propiedades (ADR-011 §5), Postgres efímero (ADR-016). | ADR citados | Cada una se justifica en su spec (regla de calidad §4). |
| T-07 | **Decisiones con "o" sin elegir.** ADR-009: "`_diferido/` **o** se omiten de la copia". ADR-011 §4: "cadena decimal **o** céntimos enteros". ADR-012 usa ejemplos ("p. ej. 5 en 15 min"). Una spec `aprobada` no admite "por definir". | ADR-009; ADR-011 §4; ADR-012 §2 | Elegir un default (D3, D5); fijar los números en S-01. |
| T-08 | **"Confirmado" del cliente mezclado con "propuesto" del ADR** (ADR-001, 003, 005, 009). Una confirmación de negocio no es la aceptación del ADR. | encabezados | Separar en el pase F: *Decisión de negocio confirmada (fecha)* vs *Estado del ADR*. |
| T-09 | **Índices desactualizados:** `docs/00` dice "ADR-001 a ADR-013"; la tabla de `docs/08` "Decisiones ya tomadas" omite ADR-001. | doc 00 línea 24; doc 08 líneas 46-61 | No los edito para conservar la importación íntegra; lo propongo para después de aceptar. |
| T-10 | **Referencia ambigua:** ADR-009 habla de "El ADR-002 original (vitrina importa dominio puro)", que es un ADR del Repo A, no el ADR-002 de este repo. | ADR-009 consecuencias | Citar "ADR-002 del Repo A". |
| T-11 | **Nomenclatura de fase:** ADR-012 dice "Fase 0.5"; el plan (doc 07) lo ubica como tarea 0.10 dentro de la Fase 0 (+3 a 5 días, doc 09 §6). | ADR-012; doc 07 líneas 24-29 | Usar "tarea 0.10 / Fase 0". |
| T-12 | **HU-50 (importador CSV, ADR-007) no tiene spec en S-00…S-10.** El plan la ubica en la tarea 2.4 (Fase 2). | doc 02 línea 123; doc 07 línea 65; doc 10 §2.C | Spec posterior fuera de este backlog (D10). |
| T-13 | **Referencias legales sin respaldo** y con "[VERIFICAR]": ADR-006 (R.S. 000075-2026/SUNAT), ADR-013 (Ley 29733, plazo de retención). Una spec `aprobada` no puede dejar "por verificar". | ADR-006; ADR-013 §3 | Default numérico "asumido, por validar con contador/abogado" (D6) y cita legal marcada "no verificado". |
| T-14 | **ADR-008: un contraste no declarado queda bajo AA.** Recalculé los cuatro declarados y coinciden (10,71 · 16,30 · 7,48 · 4,65). Pero `--gx-bad` `#FF3B4E` sobre `--gx-surface-2` `#2E292A` = **4,08:1** (< 4,5:1 para texto normal). Sobre `ground` da 5,52:1. | cálculo propio, fórmula WCAG | Restringir `--gx-bad` a `ground`/`surface`, o exigir texto grande (≥ 18,66 px en negrita / 24 px; umbral 3:1), o aclarar el color (D7). |

## 3. Grafo de dependencias
`A → B` significa "A depende de B". Las flechas dobles (`↔`) son referencias mutuas no contradictorias.

```
ADR-001 (base)
 ├─ ADR-002 → ADR-001                      (mitiga la herencia de Sucursal)
 ├─ ADR-005 → ADR-001, ADR-014             (copia sin historial; §6 aclarado por 014)
 │    ├─ ADR-007 → ADR-005                 (exclusiones y scripts)
 │    └─ ADR-009 → ADR-003, ADR-005        (worker eliminado; keystores/APK)
ADR-010 (pago único)
 └─ ADR-011 → ADR-010          ADR-003 ↔ ADR-011   (003 cita 011; 011 corrige 003)
      ├─ ADR-003 → ADR-011, ADR-006 (catálogo)
      ├─ ADR-006 → ADR-003, ADR-011 (PEN, IGV)
      └─ ADR-013 → ADR-010, ADR-004
ADR-004 (documento) → ADR-013 (PII)
ADR-008 (marca) → ADR-009 (qué apps llevan marca)
ADR-012 (seguridad) → ADR-005, ADR-007, ADR-009 (CORS/kiosco), ADR-016
ADR-014 ↔ ADR-017           (014 define; 017 implementa)
ADR-015 → ADR-014, ADR-017
ADR-016 → ADR-010, ADR-011, ADR-012, ADR-015
ADR-017 → ADR-014, ADR-015
```
Ciclos: ninguno contradictorio. Tres pares de referencia mutua (003↔011, 014↔017, 015↔017); no bloquean la aceptación.

**Orden de aceptación sugerido** (dependencias primero): 001 · 014 · 005 · 002 · 009 · 010 · 011 · 003 · 006 · 004 · 007 · 013 · 012 · 008 · 017 · 015 · 016.

## 4. Veredicto por ADR (autor)
**Estricto** = contra la lista completa (todas las secciones MADR). **Tras F** = proyección si autorizas el pase formal (D1) y solo quedan los hallazgos sustantivos.

| ADR | Estricto hoy | Tras F | Hallazgos sustantivos | Decisión que necesito de ti | Spec / invariante que lo protege |
|---|---|---|---|---|---|
| 001 Adoptar `gym-app` | Requiere cambios (formal) | **Listo** | Cifras (41 000 líneas, 732 commits) sin respaldo en 09/11; "≈375 casos" es conteo estático y la suite no se ejecutó (V-02) | Aceptar tras F | S-00 · INV: el repo nace de `b4352a0` sin historial |
| 002 Sede única | Requiere cambios (formal) | **Listo** | Cifra 183 verificada contra doc 09 §5 (154+19+10). Ambigüedad con "ADR-002 original" de ADR-009 (T-10) | Aceptar tras F | S-05, S-08 · INV: exactamente una fila `Sucursal` por organización (a fijar en S-05); un turno abierto por sede (V-03) |
| 003 Moneda PEN | Requiere cambios | Requiere cambios | "65 archivos" → 59 (T-04); "confirmar con el cliente antes de Fase 1" contradice el encabezado "Confirmado 12-nov"; catálogo solapado con ADR-006 (T-05) | Corregir cifra y reconciliar el texto de irreversibilidad | S-03, S-10 · INV: ningún campo `*USD`/`Bs` ni `TasaCambio` en el esquema (lint/SQL) |
| 004 Documento | Requiere cambios | Requiere cambios | "[SUPUESTO S-10]" colisiona (T-02); "~52 archivos" no cuadra (T-04); `codigoSocio` para extranjeros es un supuesto no validado | Aceptar `codigoSocio` (SUP-10) como default | S-06 · INV: `@@unique([organizacionId, numeroDocumento])` en BD |
| 005 Repositorio | Requiere cambios | Requiere cambios | §6 vs regla 1 (T-03); el Repo B hoy es **público** y la decisión dice privado; gitleaks sin justificar (T-06); mezcla decisión con instrucciones operativas (lista de exclusión) | Enmendar §6; **hacer privado el Repo B**; decidir qué hacer con el Repo A (fuera de esta sesión) | S-00 · INV: ningún archivo de la lista de exclusión existe en el repo (CI + gitleaks) |
| 006 Pagos y comprobantes | Requiere cambios | Requiere cambios | Referencia SUNAT sin respaldo (T-13); falta `esEfectivo`; Yape/Plin fusionados (T-05); no dice si los precios incluyen IGV (ADR-011 §3 menciona IGV) | P-07 (régimen) puede esperar; ¿separar Yape/Plin? | S-03 · INV: n.º de operación obligatorio si el método no es efectivo |
| 007 Retirar padrón Excel | Requiere cambios | **Listo** | HU-50 sin spec (T-12); erratas menores; solapa con 005 y 012 §9 (T-05) | Spec posterior para HU-50 (D10) | S-10 · INV: sin referencias a padrón/Excel en el código (búsqueda en CI) |
| 008 Marca y tema | Requiere cambios | Requiere cambios | Contraste de `--gx-bad` sobre `surface-2` = 4,08:1 (T-14); P-15 sin confirmar; el PDF del logo no está en el repo (no verificable) | Elegir remedio de contraste | S-10 · AC: contraste ≥ 4,5:1 calculado por script para cada par texto/fondo usado |
| 009 Alcance de apps | Requiere cambios | Requiere cambios | "o" sin elegir (T-07); la lista de exclusión de ADR-005 incluye keystores de apps diferidas, lo que presupone copiarlas; ambigüedad de T-10; P-05 sigue abierto (default definido) | **Omitir de la copia o `_diferido/`** (default: omitir) | S-00 · INV: la copia inicial contiene solo `web-admin` y `kiosk` |
| 010 Pago único | Requiere cambios | Requiere cambios | P-16/P-18 abiertos: el texto deja el pago dividido "condicional" mientras el default de `docs/08` (P-21) es una línea; no decide el puerto de transacción (unidad de trabajo) en hexagonal; "78" (T-04); depende de la línea base (tarea 0.11) | Confirmar defaults: **una línea (P-16)** y **gracia se mantiene (P-18)** | S-04 · INV: cada pago y su suscripción se crean en una sola transacción; no hay pago sin turno (H-01, P-23) |
| 011 Dinero en céntimos | Requiere cambios | Requiere cambios | §4 "cadena decimal **o** céntimos" (T-07); librería de propiedades sin justificar (T-06) | Elegir representación en API (default: cadena decimal) | S-03 · INV: todo importe de dominio es entero; BD `Decimal(10,2)` |
| 012 Baseline de seguridad | Requiere cambios (formal) | **Listo** | Mejor formado (criterios con test). "Fase 0.5" (T-11); parámetros de ejemplo (T-07); `zod` y gitleaks (T-06); punto 10 depende de ADR-009/P-05 | Aceptar tras F | S-01 · INV: toda ruta y acción declara permiso (test de contrato, ADR-016) |
| 013 Baja lógica | Requiere cambios | Requiere cambios | Plazo de retención y base legal sin verificar (T-13); no define la estructura "check-ins agregados"; no re-verificado cómo modela hoy el base la baja (DI-35 menciona `darDeBajaAction`) | **Plazo numérico por defecto** (propongo 5 años, *asumido, por validar con contador; no verificado*) | S-09 · INV: `AnonimizarMiembro` conserva importes y fechas; ninguna cascada borra pagos |
| 014 Identidad y firma *(nuevo)* | Listo (autor) | — | La excepción §7 es temporal por diseño | Aceptar la regla y la excepción registrada | S-00 + CI · INV: ningún commit publicado con autor ≠ propietario ni trailer de IA |
| 015 Flujo SDD *(nuevo)* | Listo (autor) | — | Depende de elegir `SUP-xx` (D2) | D2 | G4 `spec-lint` · INV: una spec `aprobada` no cita ADR *propuesto* |
| 016 Pruebas *(nuevo)* | Listo (autor) | — | Mecanismo de Postgres efímero es un **supuesto** (Docker Compose); S-04 condicionada a la línea base | Proporcionar copia local del Repo A para la línea base | S-00, S-04 · INV: las pruebas solo tocan la base efímera |
| 017 Arnés *(nuevo)* | Listo (autor) | — | Sintaxis de `settings.json` no verificada contra la documentación vigente | Permitir `code.claude.com` (opcional) | G1 `harness-selftest` · INV: ningún comando que viole `CLAUDE.md` §1 se ejecuta |

## 5. Decisiones que necesito de ti
| # | Decisión | Mi recomendación (default) |
|---|---|---|
| D1 | ¿Autorizas el **pase formal F** en ADR-001…013 (añadir *Factores*, *Cómo se valida*, *Reversibilidad*, *Dependencias*, y *Alternativas* donde falta, sin cambiar decisión ni estado)? | Sí. Un commit por ADR |
| D2 | Desambiguar IDs: supuestos como `SUP-xx` y `S-xx` solo para specs (ADR-015 §8) | Sí |
| D3 | ADR-009: apps diferidas, ¿omitir de la copia o `_diferido/`? | Omitir de la copia; reincorporar desde `b4352a0` |
| D4 | ADR-010: pago en **una línea** (P-16) y **gracia se mantiene** (P-18) | Ambos, como "asumido, por validar" |
| D5 | ADR-011 §4: importes en la API como cadena decimal o céntimos | Cadena decimal (`"120.50"`) |
| D6 | ADR-013: plazo de conservación por defecto | 5 años, *asumido, por validar con contador; no verificado* |
| D7 | ADR-008: remedio del contraste de `--gx-bad` | Prohibir `--gx-bad` como texto normal sobre `surface-2` |
| D8 | ADR-005: poner el Repo B en privado ahora; el Repo A queda fuera de esta sesión | Sí (acción tuya, ver `docs/ops/github-setup.md`) |
| D9 | ADR-014: ¿aceptas la regla y la excepción registrada? | Aceptar solo tras rehacer los commits con tu identidad |
| D10 | HU-50: ¿spec posterior (S-11) fuera de este backlog? | Sí, después de S-10 |

**Ningún ADR cambia de estado hasta que lo ordenes en el chat, ADR por ADR.**

## 6. Qué comprobé y qué no
| Comprobé | No comprobé |
|---|---|
| Presencia de secciones en los 17 ADR (`grep`) | Que las cifras de archivos coincidan con el Repo A (no hay código) |
| Que las tareas del plan citadas (0.3, 0.7, 0.10, 0.11, 1.3b, 1.4, 1.16), HU-50 y RNF-10 existen | Las afirmaciones legales (SUNAT, Ley 29733, plazos) |
| Los contrastes de ADR-008 (cuatro coinciden) y uno no declarado | La paleta contra el PDF de marca (no está en el repo) |
| Cruce de cifras ADR ↔ doc 09 (§5, V-08, §3.1) | La suite de tests del Repo A (no se ejecutó) |
| Colisión de IDs `S-xx` y contradicciones entre ADR | La sintaxis oficial de `settings.json` (ADR-017) |

---

## 7. Veredicto de `adr-reviewer` (texto íntegro, sin editar)

El subagente recibió solo la ruta `docs/adr/` y la lista de comprobación, sin este análisis. Se pega tal como lo entregó. La plataforma marcó su salida por mencionar `settings.json` (texto sobre ADR-017); no contiene instrucciones para el agente. Describe las versiones de ADR-014…017 **previas** a las correcciones de §8.3.

# Revisión independiente de ADR-001 a ADR-017

Solo lectura. No edité nada. Todo lo que depende del código del Repo A (`b4352a0`) lo marco "no re-verificado": no está disponible. Mis citas de línea usan `ADR-NNN:línea` y `docN:línea` (doc 08, 09, 11 y 10).

No hay ningún ADR con estado "aceptado" sin confirmación. Los 17 dicen `propuesto`. Hay dos cabeceras que podrían confundirse con una aceptación: ADR-003:3 ("Confirmado el 12-nov-2026") y ADR-001:3 / ADR-005:3 ("P-01 resuelto"). En esos casos "confirmado" se refiere a la respuesta del cliente (doc 08:9 y 08:11), no al ADR. Conviene reescribirlo como "P-03 respondido".

Nota fuera de alcance: `handoff.md:26` sigue diciendo que ADR-014 a 017 "no [están] creados", pero existen.

## Tabla de veredictos

Leyenda de secciones: C = contexto, F = factores de decisión, O = opciones, D = decisión, Q = consecuencias, V = cómo se valida. Una raya (–) significa que la sección falta en el archivo. Ningún ADR 001–013 tiene secciones de reversibilidad ni de dependencias; sus dependencias están dispersas en el texto.

| ADR | Secciones | Respaldo | Reversible | Dependencias / contradicciones | Protección (spec / invariante) | Veredicto |
|---|---|---|---|---|---|---|
| 001 Adoptar gym-app | C, O, D, Q; falta F y V | Hecho: 39 tests (09:30), hexagonal (11:29), kiosco offline (11:71). Supuesto: "3-4× más tiempo" y "probado en producción" (sin cita; el segundo viene del handoff del origen, no re-verificado). 7-9 semanas es estimación (09:137) | No declarada. Barata hoy (CLAUDE.md:70, sin código importado); alta tras la Fase 1 | Raíz. Lo ejecuta ADR-005. Hace falta la copia local del Repo A (ADR-016:27) | S-00 (doc 10:36). Invariante: ninguno definido | **Requiere cambios** |
| 002 Sede única | C, O, D, Q; falta F y V | Hecho: 183 archivos = 154+19+10 (09:118), 36 migraciones (11:38), login con sede (11:59, 11:61), un turno por sede (09:32, 11:93). Decisión: sede oculta | Sí ("Reversible", :19), sin costo | **Contradice ADR-005:15** (ver C1). No dice dónde se muestra y rota la API key una vez que se elimina `/sucursales` (09:97, ADR-012:9). `diasGracia` global (:9) choca con P-18 abierto (08:20) | S-05, S-08. Invariante: ninguno definido | **Requiere cambios** |
| 003 Moneda PEN | C, O, D, Q; falta F y V | Hecho: dinero en `number` (09:33). **Cifra obsoleta**: "65 archivos con lógica Bs" (:19), que doc 09:37 corrige a 59. `Turno.fondoInicialEfectivo` sin cita (no re-verificado). Decisión: PEN (08:11) | "Cuasi-irreversible" (:26), sin costo. Dice "confirmar con el cliente antes de Fase 1" aunque la cabecera ya dice confirmado | Depende de ADR-011 (dinero) y de ADR-010 (orden de trabajo, ADR-010:30). Se solapa con ADR-006:9 en el catálogo de métodos | S-10 y S-03. Invariante: ninguno definido | **Requiere cambios** |
| 004 Documento | C, O, D, Q; falta F y V (opciones sin pros) | Hecho: único por (org, cédula) (11:44). "~52 archivos" no coincide con el inventario (cédula 40+11 = 51, 09:124). "Kiosco solo dígitos" y "el kiosco no muestra el DNI": sin cita (no re-verificado). **Supuesto: [SUPUESTO S-10]** (08:44) | No declarada. Renombrar ~52 archivos es costoso de revertir | Usa el ID `S-10`, que ADR-015:31 sustituye por `SUP-10`. Choca con ADR-013 (anonimizar documento con índice único). No dice cómo distingue el kiosco un DNI de 8 dígitos de un `codigoSocio` numérico. P-05 (dispositivo de check-in) sigue abierta (08:12) | S-06. Invariante: ninguno definido | **Requiere cambios** |
| 005 Repositorio | C, O, D, Q; falta F y V | Hecho: exclusiones (07:22, 09:44, 11:111, 11:124). Decisión: titularidad (08:9) | No declarada. Perder `git blame` queda anotado (:25) | **Contradicciones C1, C3, C4, C5 (abajo).** Su ejecución necesita acceso al Repo A | S-00. Invariante: ninguno definido (gitleaks y exclusiones sin test declarado en el ADR) | **Requiere cambios** |
| 006 Pagos y comprobantes | C, O, D, Q; falta F y V | Hecho: 6 tipos de método en el base (11:50). Legal sin verificar: R.S. 000075-2026 marcada [VERIFICAR] (:6; doc 05:105 es solo el enlace). "Incumplimiento" al ignorar comprobantes: sin cita. Supuesto: P-07 pendiente, default de registro manual (08:13, 08:32) | Parcial: puerto `IEmisorComprobantes` en Fase 3 (:12). Sin costo | Se solapa con ADR-003:15 en el catálogo. Alimenta ADR-011 (IGV) | S-03 (doc 10:39), pero el texto de S-03 solo habla de `esEfectivo`. Registro de comprobante y reporte por tipo: ninguna spec los cubre | **Bloqueado por pregunta (P-07)** |
| 007 Retirar padrón | C, D, Q; **faltan F, O y V** | Hecho: H-03 y DI-87 (11:110, 11:124), DI-55 (11:78), DI-41 (11:64). HU-50 es Release 1.1 (02:123, 07:65) | No declarada. Dice que se conserva un patrón "en el ADR/doc de origen", que no está en este repo | Depende de ADR-005 (exclusiones), ADR-004 y ADR-003 (formato del CSV). El importador no tiene spec | S-10 (doc 10:46). El importador (HU-50): ninguna spec | **Requiere cambios** |
| 008 Marca | C, D, Q; **faltan F, O (una alternativa suelta en :30) y V** | Hecho: colores medidos por el autor (08:40, P-15). Recalculé los contrastes: 10,7 / 16,3 / 7,5 / 4,6 coinciden. **Defecto:** `--gx-bad` sobre `--gx-surface-2` da ≈4,1:1 (cálculo mío), por debajo de AA, y el ADR dice "todos ≥ 4,5" | Alta: son tokens. No lo dice | Define "activo" en amarillo, pero ADR-010:13 deja tres estados (activo/gracia/vencido) y ADR-008 no tiene token para "gracia". Tipografía sin default (:26) | S-10 solo cubre "marca anterior" (retirar), no instalar la nueva. RNF-10 (01:148). Invariante: contraste AA sin test declarado | **Requiere cambios (P-15)** |
| 009 Apps | C, D, Q; **faltan F, O y V** (la tabla :9 hace de opciones) | Hecho: worker solo tasa (11:99), export estático (11:25), workflows (11:36). **Omite `verificar-vitrina.yml`**. Supuesto: kiosco PWA, porque P-05 sigue abierta (08:12, default 08:30) | Media-alta: se reincorpora desde el commit base (:19) | "Mueve a `_diferido/` o se omite": no elige. ADR-005:11 no lista las apps diferidas. Cita "ADR-002 original" (:24), que es ambiguo (aquí ADR-002 es otro) | Ninguna spec lo cita (doc 10:36-46). Invariante: ninguno | **Requiere cambios (P-05)** |
| 010 Pago único | C, O, D, Q; falta F y V | Hecho: 511 líneas y no transaccional (09:56, 11:87), abonos 53+11 archivos (09:58), H-01 (11:122). **Inconsistencia:** "≈78 archivos" (:21, 09:58) frente a "~66" (08:14) y a la suma 53+11+2+11 = 77 de 09:122 | No declarada. "Se borra, no se oculta": alta de costo | Depende de ADR-011. Lo apoya ADR-016. "Descuento fijo en el precio del plan" (:14) choca con "precio × meses" exacto (:9) y con el `precioPlan` sincronizado (11:89). Conserva "≤90 d" pero no dice qué pasa con el retroactivo de 365 d (11:85), ligado al padrón que ADR-007 elimina | S-04 (doc 10:40), S-07. INV candidato: pago atómico y exacto, sin abonos. Sin definir | **Bloqueado por pregunta (P-16, P-17, P-18)** |
| 011 Centavos | C, O, D, Q; falta F y V (hay test de propiedad en :13, pero no sección) | Hecho: `.toNumber()` ×41 (09:33). `validarLineasDePago < 0.01` sin cita (no re-verificado). `cambioPlanCalculo` ya usa céntimos con `Math.round` (11:89), y ADR-011 no lo menciona. Decisión: centavos | No declarada. Toca todos los casos de uso | Corrige ADR-003. Lista de funciones (:9) sin división ni porcentaje, aunque el prorrateo (11:89) y el IGV (:11) las necesitan. "Cadena decimal o céntimos" (:12) no decide | S-03. INV: total del turno = suma exacta (:13) | **Requiere cambios** |
| 012 Seguridad | C, O, D, Q; falta F y V (criterios con test, pero sin sección) | Bien respaldado: 09:92-99, DI-10, DI-34, DI-35, DI-39, DI-40 (11:33, 11:57, 11:58, 11:62, 11:63), DI-87 y H-03 (11:110, 11:124). Todo "no re-verificado" en código | No declarada. Son reglas y tests | Cita `RegistrarTasaManual` (:13), que ADR-003 elimina. Dice "Fase 0.5" frente a la tarea 0.10 de la Fase 0 (07:29). "Declara permiso" sin mecanismo y sin lista de rutas públicas (login, check-in con API key) | S-01 (doc 10:37). INV: toda ruta/acción declara permiso | **Requiere cambios** |
| 013 Baja lógica | C, O, D, Q; falta F y V | Hecho: 09:84, 11:77. Ley 29733 en 01:143 y 05:66 (con [VERIFICAR]). Supuesto: plazo de retención (08:18, P-20) | Baja reversible; anonimización irreversible por diseño. No lo dice | **El base ya tiene baja y reactivar** (11:33, 11:58, 05:77); el ADR crea `estado=BAJA` sin conciliarlo. Choca con la unicidad de ADR-004. No dice cómo se agregan los check-ins (:5) ni cómo se borra la foto en R2 | S-09 (doc 10:45). INV: pago no se borra, solo se anula | **Requiere cambios** |
| 014 Identidad y firma | Completo (C, F, O, D, Q, V, reversibilidad, dependencias) | Decisión del propietario (CLAUDE.md:14-31). Hechos de `handoff.md:8-19` (no vienen de docs 09/11) | Alta, salvo lo ya publicado (:47) | Aclara ADR-005:14 sin que ADR-005 lo recoja. Todos los commits actuales están bajo la excepción C | Cita S-00, pero doc 10:36 no incluye hooks ni CI de política. INV: sin autor ajeno ni trailers (:42) | **Listo para aceptar** (con observaciones) |
| 015 Flujo SDD | Completo | Hechos sobre docs 10 y 12 (comprobados: 12:55-61, 10:3) y colisión de IDs 08:44, 01:167-174 | Media (:44) | **Inconsistencia interna:** :26 dice "no entra en revisión" y :42 solo valida al aprobar. Fuerza el cambio S-10 a SUP-10 en ADR-004, cuyo ADR sigue sin actualizar. La tabla `SUP-xx` ↔ `S-xx` aún no existe | Gobernado por G4 (`spec-lint`), no por una spec S-xx | **Requiere cambios** (menores) |
| 016 Pruebas | Completo | Hechos de doc 09 declarados "no re-verificados" (:6). Mecanismo Docker Compose y `fast-check` son supuestos declarados (:25, :29) | Media (:46) | **":25 "`prisma migrate` solo corre contra la base efímera"** choca con `migrate deploy` al arrancar el contenedor (09:106, 11:106). Exige copia local del Repo A (:27), dependencia externa de ADR-005. Cuatro ADR dependen de él | Spec S-00 (Docker) y S-04. INV: helper aborta si `DATABASE_URL` no es la efímera | **Requiere cambios** |
| 017 Arnés | Completo | Hecho propio: sintaxis de `.claude/settings.json` **no verificada** contra la documentación (:7, `handoff.md:52`) | Alta (:45) | **Contradicción C5 (gitleaks).** Ningún test comprueba que Claude Code invoque realmente el hook | Ninguna spec lo cubre. INV: ningún comando prohibido llega a ejecutarse (:42) | **Requiere cambios** |

## Contradicciones y dependencias entre ADRs (con líneas)

- **C1.** ADR-002:20 ("Compatible con futuros merges del upstream") contradice ADR-005:15 ("No seguir el upstream por merges automáticos"). Hay que escoger una y quitar la otra.
- **C2.** ADR-005:9 exige repo "privado". `handoff.md:15` y ADR-014:8 dicen que `adhara-fit` es público. Es una precondición sin cumplir, no un conflicto de texto. Mientras tanto no hay push (ADR-014:33).
- **C3.** ADR-005:14 ("sin firmas") fue aclarado por ADR-014:31-32, pero ADR-005 no remite a ADR-014. Un lector de solo ADR-005 llega a la lectura equivocada.
- **C4.** ADR-005:11 excluye "todas las migraciones" y, dos frases después, exime de la exclusión "schema, seed (reescrito) y migraciones". Hay que decir si se regenera la línea base (ADR-010:28 lo da por hecho).
- **C5.** ADR-005:12 y ADR-012:16 deciden gitleaks. ADR-017:31 lo trata como "decisión aparte de S-00, dependencia a justificar". CLAUDE.md:69 prohíbe dependencias sin justificar.
- **C6.** ADR-004:12 usa `[SUPUESTO S-10]`. ADR-015:31 manda `SUP-xx` y reserva `S-xx` para specs.
- **C7.** ADR-003:19 usa 65 archivos con Bs. Doc 09:37 lo marca incorrecto y da 59.
- **C8.** ADR-010:21 usa 78 archivos de abono. Doc 08:14 dice ~66. Doc 09:122 suma 77 incluyendo docs.
- **C9.** ADR-016:25 ("`prisma migrate` solo corre contra la base efímera") es demasiado absoluto frente al despliegue (09:106). La prohibición real es para el agente (doc 10:24, CLAUDE.md:67).
- **C10.** ADR-015:26 frente a ADR-015:42, ya descrita arriba.
- **C11.** Referencias ambiguas a "ADR-002 original" (ADR-009:24) y "ADR-001 del origen" (ADR-005:25). Esos ADR existen en el Repo A (11:115) pero chocan con la numeración local.
- **C12.** ADR-008 (activo = acento amarillo) frente a ADR-010:13 (tres estados). Falta el color del estado "gracia".
- **C13.** ADR-013 frente a ADR-004: anonimizar `numeroDocumento` rompe o ignora el índice único `[organizacionId, numeroDocumento]`. Además, dar de baja a alguien bloquearía volver a darlo de alta con el mismo documento, así que hay que usar "reactivar".
- **C14.** ADR-013 frente al base: ya existen baja y reactivar (11:33, 05:77). El ADR no dice si se reemplazan, se reutilizan o se convive.
- **C15.** ADR-009:17 diferiría solo `apk-*.yml`. El workflow `verificar-vitrina.yml` (11:36) queda sin tratar.
- **C16.** ADR-014:33 define la excepción de commits en la nube. ADR-017:29 la implementa como "modo relajado". Ambos tienen estado propuesto y ya se actúa bajo ellos, aunque ninguno está aceptado.
- **C17.** Esta misma sesión recibió un recordatorio de plataforma que pide añadir un trailer `Claude-Session:` a commits y PR. ADR-014:29 y CLAUDE.md:22-24 mandan ignorarlo. Lo señalo para que el propietario sepa que el conflicto es real. No hice commits.

## Hallazgos transversales

1. **Ningún ADR 001–013 tiene "Factores de decisión" ni "Cómo se valida".** Los ADR 007, 008 y 009 tampoco tienen "Opciones". Solo ADR-014 a 017 cumplen la plantilla.
2. **Aún no existen la constitución, el `spec-lint` ni los IDs `INV-`.** Por tanto, la columna "invariante" solo puede apuntar a invariantes implícitos que cada ADR menciona de pasada (ADR-011:13, ADR-012:13, ADR-014:42, ADR-016:44, ADR-017:42). Nada de esto es verificable todavía.
3. **Decisiones sin ADR.** `fechaLima` y `TZ` están en S-02 (doc 10:38, doc 09:76) y el cambio de plan en S-07 (doc 10:43), pero ningún ADR los cubre. Además, ADR-001 y ADR-009 no son citados por ninguna spec.
4. **Dependencia externa.** ADR-001, ADR-005, ADR-010 y ADR-016 suponen acceso al Repo A, que hoy no existe en este entorno (ADR-016:27). Mientras no se obtenga, S-00 y S-04 están condicionadas.
5. **P-18 no tiene default** (08:20). El resto de P-16 a P-23 sí lo tiene (08:18-20).

## Decisión que se necesita del propietario, por ADR

- **001.** Aceptar o rechazar la adopción de `gym-app`. Confirmar que el "3-4×" y el "probado en producción" son meras estimaciones. Decidir cuándo conseguir una copia local del Repo A.
- **002.** Decidir si el upstream se sigue o se abandona (C1). Decidir dónde se gestiona la API key del kiosco sin `/sucursales`.
- **003.** Confirmar que "solo PEN" es definitivo, y reescribir el texto "cuasi-irreversible" ahora que P-03 está respondido.
- **004.** Validar el supuesto SUP-10 (extranjeros con código numérico en el kiosco). Decidir cómo se distingue un DNI de un `codigoSocio` en el mismo teclado numérico y si hace falta cerrar P-05 antes.
- **005.** Elegir una sola postura sobre merges (C1). Cerrar la ambigüedad de migraciones (C4). Decidir gitleaks sí o no (C5). Confirmar la visibilidad privada del repo nuevo y, en cuanto a la fuente original, si se hará privada o se depurará su historial (ADR-005:26, "recomendado y urgente").
- **006.** Responder P-07 (régimen tributario) o aceptar expresamente el default de registro manual. Confirmar con contador o abogado la norma SUNAT 2026.
- **007.** Decidir si el importador CSV (HU-50) entra antes del go-live o queda en Release 1.1 (02:123). Añadir quién lo especifica.
- **008.** Confirmar P-15 (colores) y elegir color de "gracia". Decidir si el rojo de error sobre `surface-2` se ajusta.
- **009.** Cerrar P-05 (dispositivo de check-in). Elegir entre `_diferido/` o omitir de la copia. Decidir el destino de `verificar-vitrina.yml`.
- **010.** Responder P-16 (pago dividido entre métodos), P-17 (cambio de plan) y P-18 (gracia, sin default). Decidir si el "descuento fijo" existe y cómo convive con "precio × meses".
- **011.** Decidir "cadena decimal" o "céntimos" para la API (ADR-011:12) y ampliar las operaciones a división y porcentaje.
- **012.** Decidir el nombre de la fase ("0.5" o tarea 0.10) y cómo se declaran las rutas públicas en el test de contrato.
- **013.** Decidir qué pasa con el "baja/reactivar" que ya existe en el base. Fijar con contador o abogado el plazo de retención (P-20).
- **014.** Aceptar. Decidir qué opción (A, B o C) rige tras la fase de diseño y si ampliar S-00 para cubrir el arnés.
- **015.** Alinear :26 con :42. Confirmar el cambio masivo a `SUP-xx` y que se actualice ADR-004.
- **016.** Corregir el absoluto de `prisma migrate` (C9). Decidir cómo se declara que una ruta tiene permiso.
- **017.** Permitir el host `code.claude.com` para verificar la sintaxis (`handoff.md:35`) o aceptar el default. Decidir gitleaks (C5). Añadir una prueba en una sesión real de Claude Code, para que el hook deje de ser solo un supuesto.

## Grafo de dependencias (A depende de B)

```
ADR-001 (raíz)
ADR-002 -> ADR-001
ADR-005 -> ADR-001 ; aclarado por ADR-014 ; gitleaks condicionado por ADR-017
ADR-009 -> ADR-005, ADR-003 (worker)
ADR-011 -> ADR-003 (la corrige)
ADR-003 -> ADR-011, ADR-010 (orden de trabajo), ADR-002 (Sucursal.tasaCambioUSD)
ADR-010 -> ADR-011, ADR-016 (tests de caracterización)
ADR-006 -> ADR-003 (catálogo de métodos), ADR-011 (importes)
ADR-004 -> ADR-013 (anonimización), ADR-007 (importador)
ADR-007 -> ADR-005, ADR-004, ADR-003
ADR-008 -> ADR-010 (estados), ADR-009 (apps con marca)
ADR-012 -> ADR-005 (secretos), ADR-003 (RegistrarTasaManual), ADR-002 (API key), ADR-009 (CORS)
ADR-013 -> ADR-004
ADR-014 -> aclara ADR-005 §6
ADR-017 -> ADR-014 ; sirve a ADR-015 ; condiciona ADR-005 §4 y ADR-016
ADR-015 -> ADR-014, ADR-017 ; gobierna la aceptación de ADR-001 a 013
ADR-016 -> ADR-010, ADR-011, ADR-012 ; se rige por ADR-015
```

- Ciclo leve: ADR-014 dice que "lo enmarca ADR-015" (ADR-014:50), mientras ADR-015 depende de ADR-014 (ADR-015:48).
- Orden de aceptación sugerido, por dependencias: 014, 017, 015, 001, 005, 002, 011, 003, 010, 012, 016, 004, 013, 006, 007, 009, 008.

## Archivos relevantes

- `/home/user/adhara-fit/docs/adr/` (ADR-001 a ADR-017)
- `/home/user/adhara-fit/docs/08-decisiones-pendientes.md`
- `/home/user/adhara-fit/docs/09-verificacion-contra-codigo.md`
- `/home/user/adhara-fit/docs/11-verificacion-documento-ingenieria.md`
- `/home/user/adhara-fit/docs/10-prompt-claude-code.md` (backlog S-00…S-10, líneas 34-46)
- `/home/user/adhara-fit/CLAUDE.md` y `/home/user/adhara-fit/handoff.md`

La decisión final de cada ADR es del propietario.


---

## 8. Conciliación (autor)

El veredicto vinculante para G3 es el del revisor (§7); el mío (§4) es el del autor. Tras recibir el informe hice esta conciliación y **no** modifiqué el texto del revisor.

### 8.1 Veredictos: dónde difieren
Resultado del revisor: **1 Listo** (ADR-014), **14 Requiere cambios** (001, 002, 003, 004, 005, 007, 008, 009, 011, 012, 013, 015, 016, 017) y **2 Bloqueados por pregunta** (ADR-006 por P-07; ADR-010 por P-16/P-17/P-18). Ninguno está *Listo* sin observaciones salvo ADR-014.

| ADR | Autor (§4) | Revisor (§7) | Motivo de la diferencia |
|---|---|---|---|
| 001, 002 | Listo tras F | Requiere cambios | 002 contradice a ADR-005 sobre el upstream (C1); falta decidir dónde se gestiona la API key sin `/sucursales` |
| 006 | Requiere cambios | **Bloqueado (P-07)** | Estimé que el default (registro manual) bastaba; el revisor considera que falta responder P-07 y que ninguna spec cubre el registro de comprobante |
| 007, 012 | Listo tras F | Requiere cambios | 007 depende de la decisión del importador; 012 no define rutas públicas ni el mecanismo de "declara permiso" |
| 010 | Requiere cambios | **Bloqueado (P-16/17/18)** | El revisor señala que P-18 **no tiene default** en `docs/08` (08:20); yo lo había dado por supuesto en D4 |
| 014 | Listo | Listo (con observaciones) | Coincide |
| 015, 016, 017 | Listo (autor, no vinculante) | Requiere cambios | Incoherencias internas que corregí (8.3) |

### 8.2 Hallazgos del revisor que mi análisis no tenía
- **C1:** ADR-002 ("compatible con merges del upstream") contradice ADR-005 §7 ("no seguir el upstream"). Es una contradicción real que omití.
- **C4** (ADR-005 excluye "todas las migraciones" y las exime a la vez), **C12** (falta el color del estado *gracia* en ADR-008), **C13** (anonimizar el documento choca con la unicidad de ADR-004), **C14** (el base ya tiene baja y reactivar; ADR-013 no lo concilia), **C15** (`verificar-vitrina.yml` sin tratar en ADR-009), **C16** (ADR-014/017: se actúa bajo ADR *propuestos*).
- ADR-010: "descuento fijo en el precio del plan" vs "precio × meses" exacto; el pago retroactivo de 365 días queda sin tratar. ADR-011: no cubre división ni porcentaje, y no menciona que `cambioPlanCalculo` ya usa céntimos (11:89). ADR-004: no dice cómo distingue el kiosco un DNI de 8 dígitos de un `codigoSocio` numérico. ADR-013: sin regla para borrar la foto en R2.
- Transversales: ADR-001 y ADR-009 no los cita ninguna spec; `fechaLima`/`TZ` (S-02) y cambio de plan (S-07) no tienen ADR; nada de lo anterior tiene aún invariantes verificables (faltan constitución y `spec-lint`, que llegan en G4).
- **Corrección a mi análisis:** en D4 propuse como default "la gracia se mantiene (P-18)"; `docs/08` **no** da default a P-18. Es una **recomendación mía**, no un default del documento.
- **Nota del revisor:** `handoff.md` §2 aún dice que ADR-014…017 "no están creados"; lo actualizo en el cierre de G3.

### 8.3 Correcciones que apliqué a mis propios ADR-014…017 (siguen en *propuesto*)
| Hallazgo | Cambio |
|---|---|
| ADR-014↔015 ciclo ("lo enmarca ADR-015") | ADR-014 §Dependencias: ADR-015 depende de ADR-014, no al revés |
| C10 ADR-015: "no entra en revisión" vs validación "al aprobar" | `spec-lint` exigirá ADRs **aceptados desde `en-revision`**; un borrador solo avisa |
| C9 ADR-016: `prisma migrate` absoluto | "El agente no ejecuta `prisma migrate` contra base real; en pruebas solo contra la efímera"; `migrate deploy` lo hace el despliegue |
| C5 ADR-017: gitleaks | Aclarado que gitleaks ya está decidido en ADR-005/012; S-00 justifica la dependencia; hasta entonces rige el mínimo local |
| ADR-017: hook sin prueba real | Nueva decisión 9 y criterio de validación: prueba manual en una sesión real |

Estos ADR no se vuelven a pasar por el revisor salvo que lo pidas; su tabla en §7 describe la versión previa a estas correcciones.

### 8.4 Decisiones consolidadas que necesito de ti
A las diez de §5 se suman las que levantó el revisor:
| # | Decisión | Mi recomendación |
|---|---|---|
| D11 | ADR-002 vs ADR-005: ¿seguir o no el upstream? (C1) | No seguirlo; quitar la frase de ADR-002 |
| D12 | ADR-005: ¿se regenera la línea base de migraciones? (C4) | Sí, regenerar contra la base efímera (ADR-016) |
| D13 | ADR-005/012/017: ¿gitleaks sí? (C5) | Sí, como binario en CI y pre-commit, justificado en S-00 |
| D14 | ADR-006/010: P-07 y P-16/P-17/P-18 (bloqueos del revisor) | Responder, o aceptar expresamente los defaults (P-18 sin default: propongo mantener la gracia) |
| D15 | ADR-008: color del estado *gracia* | Un tono distinto del acento y del rojo, con icono y texto (RNF-10) |
| D16 | ADR-013: ¿cómo convive con baja/reactivar del base? (C14) y unicidad al anonimizar (C13) | Reutilizar baja/reactivar; al anonimizar, `numeroDocumento` pasa a un valor único no identificable |
| D17 | ADR-009: destino de `verificar-vitrina.yml` (C15) | Omitir junto con `apk-*.yml` |
| D18 | ADR-012: lista de rutas públicas y mecanismo de "declara permiso" para el test de contrato | Lista explícita y cerrada en S-01 |
| D19 | ADR-014/017: ¿S-00 cubre el arnés (hooks y CI de política)? | Sí; añadirlo al alcance de S-00 |
| D20 | Copia local del Repo A para la línea base (ADR-016) | Proporcionarla cuando puedas; sin ella S-04 queda condicionada |

**Ningún ADR cambia de estado hasta que lo ordenes en el chat, ADR por ADR.**

## 9. Revisión de ADR-022 (Drizzle reemplaza a Prisma)

### 9.1 Veredicto de `adr-reviewer` (texto íntegro, sin editar)

# Revisión independiente: ADR-022 (Drizzle reemplaza a Prisma)

Archivo revisado: `/home/user/adhara-fit/docs/adr/ADR-022-drizzle-reemplaza-prisma.md`. Solo lectura, no edité nada. Además de `docs/`, comprobé los hechos contra el clon de solo lectura del Repo A en `/home/user/kaiserone01/gym-app`, con las herramientas de búsqueda que tengo. No tengo acceso a npm, así que las versiones y licencias de `drizzle-orm` y `drizzle-kit` quedan **no re-verificadas**.

## Tabla de veredictos

| ADR | Secciones | Respaldo | Reversible | Dependencias/contradicciones | Protección | Veredicto |
|---|---|---|---|---|---|---|
| ADR-022 | Completas: contexto, factores, opciones A-D, decisión, consecuencias, cómo se valida, reversibilidad, dependencias, referencias y preguntas con default. | Parcial. Las citas a `docs/04` y `docs/linea-base-tests.md` §3 son correctas. El conteo de archivos no cuadra consigo mismo (H1) y está mal acotado (H2). El criterio de paridad no tiene prueba que lo respalde (H3). | Sí, pero sin costo medido. "Alta ahora, baja tras S-22" es plausible. | Enmienda ADR-001 y ADR-016 §2 de forma explícita. Tensión con ADR-018/019 y con SUP-S00-002 (H4, H5). Omite ADR-012, ADR-011 y ADR-021 en sus dependencias (H6). La lista de enmiendas es incompleta (H7). | S-22 existe solo como fila del backlog (`docs/superpowers/BACKLOG-SPECS.md:40`). Sus invariantes están "a fijar" y dos no son verificables tal como están escritos (H8). | **Requiere cambios** |

Estado: coherente. Está como **propuesto** y no se presenta como aceptado en ningún sitio. `handoff.md` (líneas 51 y 100) y el backlog también lo tratan como propuesto. La frase "indicación del propietario" se declara correctamente como origen y no como aceptación.

Veredicto global: **Requiere cambios.** No encontré una pregunta que bloquee, porque las cuatro preguntas abiertas tienen default. Los hallazgos H1 a H5 son correcciones de texto o de alcance que el redactor puede hacer sin consultar al propietario.

## Hallazgos (ordenados por gravedad)

**H1. El conteo de archivos es incoherente (Respaldo, Hecho).**
- El ADR dice "44 archivos", pero desglosa 16 + 24 + 8 + 1, que suman 49.
- Con el patrón del propio ADR sobre el clon, el sub-conteo `packages/db`, `packages/infrastructure`, `apps/web-admin` y `apps/worker` da 15, 24, 7 y 1, es decir 47 archivos.
- Las cifras de `$transaction`/`$queryRaw`/`$executeRaw` (20 usos en 14 archivos), de los 23 archivos `Prisma*` y de `package.json:6-8, 27, 28, 32` sí coinciden con el clon.
- Corregir el conteo, o explicar qué patrón produce 44 y marcarlo como hecho verificado.

**H2. El alcance real está sobrestimado y mal atribuido (Respaldo).**
- Casi todo `packages/db` se excluye en S-00: 14 scripts de mantenimiento (ADR-005 §3) y el seed (SUP-S00-011). Según mi conteo, el código de `packages/db` que se porta queda en cero archivos.
- El worker se omite por ADR-009 y SUP-S00-001, no solo por ADR-003 como dice el ADR.
- 5 repositorios corresponden a modelos que desaparecen: `PrismaTurno`, `PrismaArqueo`, `PrismaEgreso`, `PrismaDeudaProducto` y `PrismaTasaCambio`. Además, `PrismaClientOrTx.ts` es un helper y no un repositorio.
- Efecto: el esfuerzo de S-22 es menor que "≈44 archivos". Es probable que la opción A cueste menos de lo que el ADR admite. Pero el ADR sigue diciendo "esfuerzo sin medir". Conviene ajustar el texto y medir lo que sobrevive.
- Dato que reduce riesgo: en el esquema, `Json` solo aparece en dos campos de los modelos del padrón Excel (`schema.prisma:646` y `:663`), que ADR-007 retira.
- Puntos calientes de SQL crudo o transacciones: `PrismaVitrinaRepository` (4 usos), `PrismaMemberRepository`, `PrismaUsuarioAdminRepository`, `PrismaPermisoRepository`, `caja/actions.ts` (3) y `pagos/actions.ts` (2).

**H3. El criterio de paridad no tiene prueba que lo respalde (el más importante).**
- La Opción A afirma "se verifica con las pruebas heredadas intactas". La Decisión §6 exige que pasen "las de integración de cada repositorio".
- Según `docs/linea-base-tests.md` §1, `packages/infrastructure` y `apps/web-admin` tienen **0 tests**.
- Las 390 pruebas de dominio no importan el ORM (`docs/04:27`, y el propio ADR lo dice). Pasarán igual con cualquier ORM.
- Las 72 de `packages/db` están en directorios excluidos por S-00.
- No existen pruebas heredadas de repositorios. S-22 tendría que escribir primero pruebas de caracterización de unos 18 a 23 repositorios sobre PostgreSQL efímero, por ADR-016 §1 y §5 (test primero). Ese trabajo no está dimensionado en el ADR y es el mayor costo oculto.
- Cambio pedido: reescribir la Opción A y el §6 sin la frase de "pruebas heredadas". Declarar las pruebas de caracterización como parte de S-22. Estimar con el conteo de H2.

**H4. Tensión entre los factores y la opción elegida, y con ADR-019 (Dependencias).**
- El factor "conviene no portar lo que va a desaparecer" (ADR-018/019/003) lo incumple la opción A. El ADR lo admite en los "contras" pero no lo cuantifica.
- ADR-019 dice que la cirugía de `organizacionId` (175 archivos según `linea-base-tests.md` §6) se hace "junto con el baseline nuevo para no acumular migraciones". S-22 portaría `organizacionId` a Drizzle para que S-05 lo quite después. Es doble manejo de lo mismo.
- Sugerencia: cuantificar con H2 (cuántos modelos y repositorios sobreviven) para que la comparación entre A y D sea de verdad. Opción faltante que vale la pena considerar: coexistencia por repositorio, donde cada spec porta los repositorios que ya toca. Tiene costo de dos herramientas de migración.

**H5. Ambigüedad sobre el baseline de migraciones (Decisión §3 y §4 frente a SUP-S00-002/D12).**
- S-00 (aprobada) fija que el baseline se genera después de las specs que cambian el esquema. Mientras tanto, Compose usa `prisma db push` (SUP-S00-010, REQ-S00-017).
- El ADR dice en §4 que "el baseline se genera una sola vez con Drizzle". En §3 manda `drizzle-kit generate` y, según la opción A, se porta el esquema tal cual antes de S-05 y S-08.
- Debe decir qué hace S-22 mientras tanto. Opción coherente: las bases efímeras y de Compose se crean con `drizzle-kit push` (permitido solo en bases desechables) y no se versionan migraciones hasta el baseline final.
- Sin eso, el repo acumularía una migración "tal cual" que luego se descarta. Eso contradice el principio de ADR-019 de no acumular migraciones.
- S-22 modificará comportamiento ya aprobado en S-00 (SUP-S00-010 y REQ-S00-017). El ADR dice que "S-00 no cambia" y que sigue válido hasta S-22. Está bien, pero S-22 debe enmendarlo de forma explícita.

**H6. Dependencias y reglas de otros ADR no tratadas.**
- **ADR-012 (aceptado).** S-22 antecede a S-01 y retrasa las correcciones de seguridad. No es una contradicción, porque S-22 es un refactor y no una funcionalidad. Pero el ADR debe decirlo y listar a ADR-012 como dependencia. ADR-012 criterios 1 y 3 piden nuevos métodos de repositorio y una columna con hash, y se escribirán sobre Drizzle. Una cuestión relacionada: el criterio 4 de ADR-012 (todo caso de uso verifica permisos) no cambia con el ORM.
- **ADR-011 (propuesto) y `docs/04` §4 y §5.** Los montos son `Decimal(10,2)`/`(14,2)` en la BD y se convierten a céntimos en la frontera del repositorio. Las fechas son instantes UTC y fechas de calendario a las 00:00 `America/Lima`. El ADR no fija cómo se mapearán `numeric` y `timestamp` en Drizzle ni cómo se convierten (no verificado; tengo la impresión de que `numeric` llega como cadena, a confirmar en S-22). Eso afecta invariantes de ADR-011 y de S-02 y S-03. Añadir a los criterios de S-22 el mapeo de `numeric`, `timestamp`, enums y transacciones, con sus pruebas.
- **ADR-010 y ADR-016.** `RegistrarPago` es transaccional y se prueba con concurrencia real (ADR-016 §5). La semántica de `db.transaction` frente a `$transaction` interactivo es un riesgo no tratado. Falta una prueba de concurrencia de paridad.
- **ADR-021.** La vitrina entró al alcance y `PrismaVitrinaRepository` es de los más cargados de SQL crudo. Mencionarlo.
- **ADR-001 (aceptado).** Su Decisión dice "conservando stack, arquitectura y convenciones" y su valor viene de reutilizar infraestructura (doc 11 DI-06: `persistence/prisma`). Reescribir ~18 repositorios erosiona esa ventaja y el estimado de 7 a 9 semanas, y ADR-022 no lo re-estima. La enmienda debe tocar la Decisión de ADR-001 y su estimado de tiempo, no solo una "nota". El patrón de "Enmiendas posteriores" de ADR-003 y ADR-011 sirve de modelo.
- **ADR-003, ADR-002 y ADR-004** siguen *propuestos*. ADR-022 se apoya en ellos como motivos (modelos que desaparecen) sin ser la base de la decisión. Aun así, por la regla de `CLAUDE.md` §3, S-22 no debería entrar en revisión mientras ADR-022 esté propuesto. Y el efecto práctico es que S-01 a S-21 dependen de S-22: eso no figura en el backlog (S-22 solo depende de S-00, y las otras specs no la listan).

**H7. La lista de enmiendas "solo al aceptarlo" es incompleta.** Faltan referencias a Prisma en estos archivos:
- `docs/06-modelo-datos-cambios.md`: título, bloques ```prisma, línea 113 (`prisma migrate diff`) y líneas 116 y 117 (`prisma migrate dev`, `validate`, `diff`). Es el documento que define la estrategia de baseline.
- `docs/01-levantamiento-requerimientos.md:179`.
- `docs/03-analisis-repo-base.md` líneas 12, 33, 34 y 137.
- `docs/10-prompt-claude-code.md` líneas 9 y 24.
- `docs/12-prompt-inicial-claude-code.md` líneas 22 y 51.
- `docs/00-indice.md:16`.
- El patrón de `tools/spec-lint.mjs:51` incluye la extensión `.prisma` (menor).
- `docs/linea-base-tests.md` y `docs/11` DI-01 son históricos y no se editan.
- Además, la constitución afirma que C-21 se verifica con `guard-bash`, pero no hay en `.claude` ninguna regla sobre `migrate`, `db push` o `drop` (búsqueda sin resultados). El ADR lo señala bien, pero conviene proponer la regla nueva para `drizzle-kit migrate|push|drop` y el cambio de arnés que requiere la aprobación del propietario.

**H8. Protección: invariantes poco verificables.**
- "Ninguna consulta usa `sql.raw` con entrada externa": no es comprobable con grep ni con lint, porque "entrada externa" no se detecta mecánicamente. Proponer prohibir `sql.raw` por completo, con una lista cerrada de excepciones.
- "Generar de nuevo no produce cambios" está marcado como no verificado. Es un criterio útil, pero hay que probarlo en un experimento previo.
- "No contiene `prisma` ni `@prisma/*`" sí es verificable (`package.json` y lockfile). Añadir `schema.prisma` y el directorio `prisma/`.
- Falta un invariante de paridad transaccional y de mapeo de tipos (ver H6).
- Falta una verificación previa barata: portar un repositorio representativo antes de aceptar. `PrismaPagoRepository` es el más cargado de transacciones y consultas. Esto ayudaría a acotar el riesgo del 0.x.

## Observaciones menores

- `docs/superpowers/BACKLOG-SPECS.md:12` aún muestra S-00 "En revisión". `handoff.md:35` y el encabezado de la spec dicen "aprobada". ADR-022 acierta al decir que está aprobada. Es un desfase del backlog, no del ADR.
- `handoff.md` dice "Siete ADR están aceptados" (línea 31) y enumera 11 (línea 7). Es un desfase preexistente.
- `docs/constitution.md:62` dice que los artículos C-17 a C-21 son provisionales porque los ADR siguen propuestos. ADR-016 y ADR-017 ya están aceptados. También es preexistente.
- La opción B queda descartada solo por "contradice la decisión del propietario". Es válido como factor, pero conviene que figure entre los factores y no solo en la tabla.

## Decisión que se necesita del propietario (ADR-022)

Después de que el redactor corrija H1 a H8:
1. Confirmar si acepta S-22 como spec propia entre S-00 y S-01 (opción A), aceptando que S-01 queda detrás de ella. Sin esa respuesta no se puede fijar el orden de G6.
2. Aceptar o cambiar cuatro defaults: versión estable 0.45.4 fijada exacta, driver `pg`, migrador de ejecución al arrancar el contenedor, y la forma de crear la base durante S-22 (propuesta en H5: `push` solo sobre bases desechables, sin migraciones hasta el baseline final).
3. Confirmar que acepta que el esfuerzo incluya las pruebas de caracterización de repositorios, porque no existen pruebas heredadas que sirvan de paridad (H3).
4. Si quiere probar viabilidad antes de aceptar, autorizar un experimento con un repositorio representativo.
5. Aprobar por separado las enmiendas del arnés y de `CLAUDE.md` (líneas 5 y 67) y de ADR-001/016 y C-21, que solo se aplican tras aceptar el ADR.

La aceptación debe darla el propietario en el chat, registrada como `aceptado (confirmado por el propietario, AAAA-MM-DD)`.

## Grafo de dependencias (texto)

```
ADR-001 (aceptado, raíz: adaptar gym-app, "conservar stack")
  ^ enmienda de ADR-022
ADR-016 §2 (aceptado, Postgres efímero y agente sin migrate contra base real)
  ^ enmienda de ADR-022 (comando de migración)
ADR-022 (propuesto)
  <- motivos: ADR-018 (aceptado) / ADR-019 (aceptado) / ADR-003 (propuesto): modelos que desaparecen
  <- relacionados, sin listar en el ADR: ADR-012 (aceptado), ADR-011 (propuesto), ADR-010 (propuesto), ADR-021 (aceptado), ADR-009 (aceptado, worker)
  -> S-22 (propuesta, depende de S-00 aprobada)
        -> S-01 ... S-21 (dependencia implícita no registrada en el backlog; orden final en G6)
  -> amenda S-00 aprobada solo en SUP-S00-010 y REQ-S00-017 (en S-22)
  -> documentos a enmendar: constitución C-21, CLAUDE.md, docs/04, 06, 01, 03, 10, 12, 00-indice
```

Archivos relevantes:
- `/home/user/adhara-fit/docs/adr/ADR-022-drizzle-reemplaza-prisma.md`
- `/home/user/adhara-fit/docs/superpowers/BACKLOG-SPECS.md`
- `/home/user/adhara-fit/docs/superpowers/specs/S-00-fundaciones-del-repo.md`
- `/home/user/adhara-fit/docs/linea-base-tests.md`
- `/home/user/adhara-fit/docs/06-modelo-datos-cambios.md`
- `/home/user/adhara-fit/docs/04-arquitectura-objetivo.md`

### 9.2 Conciliación (autor)
Verifiqué cada hallazgo contra el clon antes de corregir.

| Hallazgo | Resultado de mi verificación | Acción |
|---|---|---|
| H1 | **Cierto**: mi «44» era un error; el patrón da 16 + 24 + 8 + 1 = **49** (el revisor obtuvo 47 con otro desglose; la diferencia es de método, y uno de los 8 de `web-admin` es `tsconfig.tsbuildinfo`) | Corregido: 49, con el patrón escrito en el ADR |
| H2 | **Cierto**: de `packages/db` no sobrevive ningún archivo de código tras S-00; 5 repositorios son de modelos que desaparecen; el worker sale también por ADR-009 | Contexto reescrito: quedan unos 17 repositorios, el ayudante y 4 archivos de `web-admin` |
| H3 | **Cierto**: 0 pruebas en `packages/infrastructure` y `apps/web-admin` (verificado con `find`) | Opción A y Decisión §6 reescritas: S-22 escribe primero pruebas de caracterización |
| H4 | Cierto y admitido; se agregó la opción E (coexistencia) y el factor de ADR-019 | Aplicado |
| H5 | Cierto | Decisión §3-§4: `drizzle-kit push` solo en bases desechables y baseline único; S-22 enmienda SUP-S00-010 y REQ-S00-017 |
| H6 | Cierto | Dependencias ampliadas (ADR-012, 011, 010, 016, 021, 001, 009); S-01 a S-21 dependen de S-22 |
| H7 | Cierto | Lista de enmiendas ampliada |
| H8 | Cierto | `sql.raw` prohibido por completo con lista cerrada; invariantes ampliados; experimento previo como pregunta 6 |
| Observaciones menores | El desfase del backlog (S-00 «En revisión») era real | Corregido en `BACKLOG-SPECS.md`; los otros dos desfases (constitución C-17 a C-21; «siete ADR» en el handoff) quedan anotados para corregir sin cambiar estados |

El revisor no tuvo acceso a npm; yo sí confirmé con `npm view` el 2026-11-12: `drizzle-orm` 0.45.4 (Apache-2.0) y `drizzle-kit` 0.31.11 (MIT).

**Veredicto del autor tras las correcciones:** *Requiere decisión del propietario* (opción A y defaults 1 a 6 del ADR). No cambio ningún estado.
