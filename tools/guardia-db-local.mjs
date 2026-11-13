#!/usr/bin/env node
// Guarda de S-22 (REQ-S22-022): aborta antes de que drizzle-kit conecte si DATABASE_URL falta o no es local.
import { validarDatabaseUrl, ErrorBaseEfimera } from "./base-efimera.mjs";

try {
  validarDatabaseUrl(process.env.DATABASE_URL);
} catch (e) {
  console.error(`guardia-db-local: ${e instanceof ErrorBaseEfimera ? e.message : String(e)}`);
  process.exit(1);
}
