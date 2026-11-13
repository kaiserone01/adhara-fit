#!/usr/bin/env node
// S-23 (un solo rol): falla si en apps/ o packages/ reaparece algo de roles o permisos por módulo.
// Uso: node tools/verificar-rol.mjs
// Se excluyen packages/db (el esquema conserva la columna rol y la tabla PermisoUsuario hasta S-15) y el código generado.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const IGNORADOS = new Set(["node_modules", ".next", ".turbo", "coverage", "dist", "out", ".git", "generated", "android"]);
const EXCLUIDOS = ["packages/db/"];

export const TERMINOS = [
  "RolUsuario",
  "ModuloPermiso",
  "AccionPermiso",
  "PermisoUsuario",
  "IPermisoRepository",
  "AuthorizationService",
  "IAuthorizationService",
  "tienePermiso",
  "exigirPermiso",
  "exigirSocio",
  "ActualizarPermisosUsuario",
  "puedeCrearUsuarioConRol",
  "puedeEditarKiosko",
  "PERMISOS_POR_ROL",
  "SOLO_SOCIO",
  "EliminarUsuarioAdmin",
  "gerente", // "recepción" no se vigila: en el check-in es el mostrador físico, no un rol
];

function recorrer(dir, salida = []) {
  if (!existsSync(dir)) return salida;
  for (const n of readdirSync(dir)) {
    if (IGNORADOS.has(n)) continue;
    const r = join(dir, n);
    if (statSync(r).isDirectory()) recorrer(r, salida);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(r)) salida.push(r);
  }
  return salida;
}

/** Devuelve "archivo:línea término" por cada coincidencia (sin distinguir mayúsculas). */
export function verificarRol(raiz) {
  const errores = [];
  for (const base of ["apps", "packages"]) {
    for (const archivo of recorrer(join(raiz, base))) {
      const ruta = relative(raiz, archivo).split("\\").join("/");
      if (EXCLUIDOS.some((e) => ruta.startsWith(e))) continue;
      readFileSync(archivo, "utf8")
        .split("\n")
        .forEach((linea, i) => {
          const minusculas = linea.toLowerCase();
          // Un solo aviso por línea (algunos términos contienen a otros, p. ej. IAuthorizationService).
          const termino = TERMINOS.find((t) => minusculas.includes(t.toLowerCase()));
          if (termino) errores.push(`${ruta}:${i + 1} ${termino}`);
        });
    }
  }
  return errores;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errores = verificarRol(resolve(fileURLToPath(import.meta.url), "..", ".."));
  if (errores.length > 0) {
    console.error("verificar-rol: quedan términos de roles o permisos (S-23):\n" + errores.map((e) => "  " + e).join("\n"));
    process.exit(1);
  }
  console.log("verificar-rol: OK");
}
