# Handoff — Adhara Fit

Bitácora de sesiones: la más reciente arriba, solo se añaden entradas. El historial del diseño (puertas G0–G6, estado de cada ADR y spec, intentos fallidos) está en `docs/historial/handoff-diseno.md`.

## Estado resumido
- **Qué es:** sistema web interno de un gimnasio en Perú (PEN, un local). Base: código del Repo A importado (S-00). Modo ágil desde 2026-11-13: ver `CLAUDE.md` y `docs/superpowers/plans/2026-11-13-ruta-agil.md`.
- **Referencia de qué construir:** ADR-001 a 022 (decisiones de arquitectura) y specs S-00 a S-15, S-17, S-18, S-19, S-22 y S-23 aprobadas. S-20 (vitrina de TV) y S-21 (check-in en smart-TV) siguen en revisión; sus hallazgos están en `docs/superpowers/revisiones-pendientes/`.
- **Desplegado:** provisional en Easypanel (`docs/ops/easypanel.md`): imagen del `Dockerfile`, esquema con `prisma db push` al arrancar, alta del primer administrador con `tools/crear-administrador.mjs`.
- **Preferencia del propietario:** cada código (ADR-nnn, S-nn, REQ…) que se mencione lleva al lado una descripción simple.

## Sesión 2026-11-13 (local, Windows) — paso al modo ágil
**Qué se hizo**
- Se retomó en local: `npm ci` completo, cliente de Prisma generado, 390 pruebas de dominio, 45 de kiosco y 65 de vitrina en verde.
- `tools/auditar-npm.mjs`: arreglado en Windows (`ejecutarAuditoria`, con 6 pruebas nuevas).
- `tools/verificar-env.mjs`: ahora también lee `tools/crear-administrador.mjs`.
- `tools/crear-administrador.mjs` (+16 pruebas): alta provisional del primer administrador (organización, sede y usuario SOCIO) con `pg`; variables `ADMIN_NOMBRE`, `ADMIN_CORREO` y `ADMIN_CONTRASENA_INICIAL` en `.env.example`, Compose, `docker-entrypoint.sh`, `Dockerfile` y `docs/ops/easypanel.md`. Solo actúa si no hay ningún administrador.
- **Cambio de reglas** (orden del propietario): `CLAUDE.md` reescrito en modo ágil; el `pre-commit` ya no corre `spec-lint`; el `pre-push` solo avisa si falta el handoff; el CI y `politica.yml` pierden `verificar-repo`, `spec-lint`, el autotest del arnés y la exigencia de handoff. El handoff anterior pasó a `docs/historial/handoff-diseno.md`.
- Agentes: S-21 conciliada con el revisor (70 REQ, 26 BEH, 4 INV, 16 AC; sigue `en-revision`); S-20 en curso al cerrar esta entrada.

**Qué funcionó**
- Mover el alta del administrador a `tools/` con SQL directo: cumple las reglas de carpetas de S-00 y no depende del ORM (sirve también si se cambia de Prisma).

**Qué no funcionó / no repetir**
- `packages/db` solo admitía cuatro archivos (lista cerrada de S-00, `verificar-repo`): el primer intento del alta en TypeScript ahí fue rechazado. Esa verificación ya no bloquea.
- `npm ci` lanzado antes de tiempo dejó `node_modules` sin `.bin`; hay que dejar terminar `npm ci` antes de `prisma generate`.
- `verificar-env` solo reconoce `process.env.X`; pasar `process.env` entero a una función lo hace creer que las variables no se leen.
- El sistema denegó volcar los nombres de las variables de entorno (`printenv`): no insistir.

**Pendiente / sin verificar**
- El SQL de `crear-administrador.mjs` (ids y `apiKey` generados en el script; el resto de columnas se asume con valor por defecto en la base) **no se ha probado contra una base real**. Se probará en el primer arranque desplegado o con una `DATABASE_URL` local.
- Decisión del propietario sobre Drizzle (ADR-022 / S-22): pospuesto o descartado. Mientras tanto se sigue con Prisma.
- Rotar las claves de base y R2 que se compartieron por chat (el repositorio es público).
- Insumos: PNG originales del logotipo, textos legales, datos de cobro de Yape y BCP, marca y modelo del televisor, VPS y dominio definitivos.

**Siguiente**
1. Empujar a `main` (avance rápido) para que Easypanel reconstruya, y anotar aquí los errores del primer despliegue.
2. Tramo 1 de la hoja de ruta: solo PEN, hora de Lima, sin tasa ni bolívares ni marca anterior.
3. Seguir los tramos 2 a 6 de `docs/superpowers/plans/2026-11-13-ruta-agil.md`.
