#!/bin/sh
# Crea o actualiza el esquema de la base ANTES de arrancar el servidor (S-00, SUP-S00-010).
# Provisional: mientras no haya migraciones (el baseline llega con S-15), `prisma db push` crea las tablas
# en una base vacía y se niega a aplicar cambios que pierdan datos (no usa --accept-data-loss).
# S-15 lo reemplaza por el servicio `migrar` y S-22 por drizzle-kit.
# Usa el CLI ya instalado en ./migrate-toolkit (ver Dockerfile): nada se descarga al arrancar.
set -e

(cd migrate-toolkit/packages/db && ../../node_modules/.bin/prisma db push --config prisma7.config.ts)

exec node apps/web-admin/server.js
