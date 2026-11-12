# Informe de importación del Repo A

Fecha: 2026-11-12. Origen: `b4352a0` del Repo A, exportado con `git archive` (sin historia).
Estado: **listo para el commit de importación**.

## 1. Exclusiones aplicadas
- app o workspace omitido: 3
- colisiona con este repositorio: prevalece el propio: 6
- directorio de agentes del Repo A: 142
- credencial de firma: 2
- cookies.txt: 1
- packages/db fuera de la lista de permitidos: 75
- archivo del cliente anterior (zipgym): 2
- packages/db/migracion-excel/: 8
- migration_lock.toml: 1
- seed del Repo A: 1
- log de reset de vencimientos: 1
- skills-lock.json: 1

## 2. Archivos de datos conservados (el propietario revisa esta lista)
- ninguno

## 3. Lista de permitidos de packages/db
- packages/db/package.json
- packages/db/prisma/schema.prisma
- packages/db/prisma7.config.ts
- packages/db/prisma7.local.config.ts

## 4. Cambios de configuración
- package.json raíz: se renombra a adhara-fit, se quita actualizar-tasa y se añaden typecheck y test
- turbo.json: tarea typecheck
- apps/web-admin/package.json: script typecheck (tsc --noEmit)
- apps/kiosk/package.json: script typecheck (tsc --noEmit)
- apps/vitrina/package.json: script typecheck (tsc --noEmit)
- packages/db/package.json: se quita db:seed y test pasa a vitest run --passWithNoTests
- packages/db/prisma7.config.ts: se quita la referencia a prisma/seed.ts
- packages/db/package.json: se quita el script db:limpiar-miembros (apuntaba a limpiarMiembros.ts)
- packages/db/package.json: se quita el script db:sembrar-prueba (apuntaba a sembrarMiembrosPrueba.ts)
- packages/db/package.json: se quita el script db:sembrar-productos-prueba (apuntaba a sembrarProductosPrueba.ts)
- packages/db/package.json: se quita el script db:sembrar-productos-prueba:confirm (apuntaba a sembrarProductosPrueba.ts)
- packages/db/package.json: se quita el script db:quitar-permisos-entrenadores (apuntaba a quitarPermisosEntrenadores.ts)
- packages/db/package.json: se quita el script db:backfill-permisos-en-sala (apuntaba a backfillPermisosEnSala.ts)
- packages/db/package.json: se quita el script db:importar-padron (apuntaba a importarPadronExcel.ts)
- packages/db/package.json: se quita el script db:importar-padron:confirm (apuntaba a importarPadronExcel.ts)
- packages/db/package.json: se quita el script db:marcar-ajustar-fecha (apuntaba a marcarAjustarFecha.ts)
- packages/db/package.json: se quita el script db:limpiar-organizacion (apuntaba a limpiarOrganizacionParaMigracion.ts)
- packages/db/package.json: se quita el script db:sembrar-zip-gym (apuntaba a sembrarOrganizacionZipGym.ts)
- packages/db/package.json: se quita el script db:clonar-zipgym (apuntaba a clonarSedePrincipalAZipGym.ts)
- packages/db/package.json: se quita el script db:clonar-zipgym:confirm (apuntaba a clonarSedePrincipalAZipGym.ts)
- packages/db/package.json: se quita el script db:clonar-zipgym:verificar (apuntaba a clonarSedePrincipalAZipGym.ts)

## 5. Cambios al lockfile
- Paquetes quitados: 2
- Paquetes agregados: 0
- quitado: apps/worker/node_modules/@types/node
- quitado: node_modules/worker

## 6. gitleaks
omitido por --omitir-gitleaks

## 7. Verificación de construcción
- OK — npm ci
- OK — prisma generate
- OK — tsc --noEmit (web-admin) — 1 errores (línea base 1)
- OK — tsc --noEmit (kiosk) — 0 errores (línea base 0)
- OK — tsc --noEmit (vitrina) — 0 errores (línea base 0)
- OK — build (web-admin)
- OK — build (kiosk)
