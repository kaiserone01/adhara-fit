# ADR-004: Documento de identidad (DNI / CE / Pasaporte)

Estado: **propuesto** (2026-11-11)

## Contexto
El base usa `Miembro.cedula` (única por organización) y el kiosco acepta solo dígitos; hay normalización de cédulas alfanuméricas en el padrón. En Perú el documento principal es el **DNI** (8 dígitos); extranjeros usan **Carné de Extranjería** o **Pasaporte** (alfanuméricos).

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
