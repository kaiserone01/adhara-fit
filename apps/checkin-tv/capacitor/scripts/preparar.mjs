// Prepara lo que Capacitor necesita (nada de esto se versiona):
//   www/                    → copia del export estático de apps/checkin (`npm run build --workspace checkin`)
//   www/checkin-config.json → { apiUrl, clave }
//   capacitor.config.json
// Variables: CHECKIN_API_URL (URL base de web-admin), CHECKIN_CLAVE (la de web-admin) y CHECKIN_WEB_DIR
// (por defecto ../../checkin/out, relativa a esta carpeta).
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { construirConfiguracion } from "./configuracion.mjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const { capacitor, checkin } = construirConfiguracion(process.env);
const webDir = resolve(raiz, process.env.CHECKIN_WEB_DIR || "../../checkin/out");

if (!existsSync(webDir)) throw new Error(`No existe la carpeta de la app web: ${webDir}. Compila apps/checkin primero.`);

rmSync(join(raiz, "www"), { recursive: true, force: true });
mkdirSync(join(raiz, "www"), { recursive: true });
cpSync(webDir, join(raiz, "www"), { recursive: true });

writeFileSync(join(raiz, "www", "checkin-config.json"), `${JSON.stringify(checkin)}\n`);
writeFileSync(join(raiz, "capacitor.config.json"), `${JSON.stringify(capacitor, null, 2)}\n`);

console.log("Preparado. API:", checkin.apiUrl, "| clave: ***");
