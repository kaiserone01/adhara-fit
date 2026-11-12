# ADR-004: Documento de identidad (DNI / CE / Pasaporte)

Estado: **propuesto** (2026-11-11)

## Contexto
El base usa `Miembro.cedula` (única por organización) y el kiosco acepta solo dígitos; hay normalización de cédulas alfanuméricas en el padrón. En Perú el documento principal es el **DNI** (8 dígitos); extranjeros usan **Carné de Extranjería** o **Pasaporte** (alfanuméricos).

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- En Perú el documento principal es el DNI (8 dígitos); extranjeros usan CE o pasaporte (alfanuméricos).
- Impedir el mismo número con distinto tipo.
- El kiosco ingresa solo dígitos.
- El DNI es dato personal.

## Decisión
- Campos `tipoDocumento` (enum `DNI | CE | PASAPORTE`, por defecto `DNI`) y `numeroDocumento`.
- Unicidad `@@unique([organizacionId, numeroDocumento])` **sin incluir el tipo**, para impedir el mismo número con distinto tipo.
- Validadores en `packages/domain/utils/documento.ts`: DNI `^\d{8}$`; CE y pasaporte alfanuméricos en mayúsculas con longitud configurable. No se valida dígito verificador del DNI.
- Kiosco: ingreso numérico. Para documentos alfanuméricos se asigna un **`codigoSocio`** numérico corto (único por organización) que el miembro digita **[SUPUESTO S-10]**.
- Renombrar el puerto `buscarPorCedula` → `buscarPorDocumento` y casos de uso asociados.

## Alternativas
- Mantener `cedula` con texto libre: confuso y sin validación.
- Unicidad por `(tipo, número)`: permite duplicados cruzados entre tipos.
- Pedir siempre DNI: excluye a extranjeros.

## Consecuencias
- (+) Validación correcta y UX local.
- (−) Migración de nombres en ~52 archivos; tests de `CrearMiembro`, `RegistrarCheckIn`, `ActualizarMiembro`.
- (−) El código de socio añade un identificador más que explicar al personal.
- Datos personales: el DNI es dato personal; no se muestra completo en pantallas públicas (el kiosco no lo muestra).

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-06 (documento de identidad y `codigoSocio`).
- **Invariantes a fijar:** `@@unique([organizacionId, numeroDocumento])` en la BD; validadores DNI `^\d{8}$` con tests; el kiosco no muestra el documento.

## Reversibilidad
*(Pase formal F.)* Media-baja: renombrar ~52 archivos (cifra por recontar, ver `REVISION-ADR.md` T-04) es costoso de revertir.

## Dependencias
*(Pase formal F.)* ADR-013 (anonimización del documento y unicidad), ADR-007 (importador), supuesto SUP-10 / "[SUPUESTO S-10]" (`codigoSocio`), P-05 (dispositivo de check-in, abierta). Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.
