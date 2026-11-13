import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { asegurarAdministrador, clientePg, generarContrasena, leerVariablesAdmin } from "./crear-administrador.mjs";

function clienteFalso(administradores = 0) {
  const creados = { organizaciones: [], sucursales: [], usuarios: [] };
  let total = administradores;
  const tx = {
    contarAdministradores: async () => total,
    primeraOrganizacion: async () => (creados.organizaciones.length ? { id: "o1" } : null),
    crearOrganizacion: async (d) => (creados.organizaciones.push(d), { id: "o1" }),
    primeraSucursal: async () => (creados.sucursales.length ? { id: "s1" } : null),
    crearSucursal: async (d) => (creados.sucursales.push(d), { id: "s1" }),
    crearAdministrador: async (d) => (creados.usuarios.push(d), (total += 1), { id: "u1" }),
  };
  return { cliente: { transaccion: (fn) => fn(tx) }, creados };
}

const ok = { ADMIN_NOMBRE: "N", ADMIN_CORREO: "a@b.pe" };

test("leerVariablesAdmin recorta el nombre y pasa el correo a minúsculas", () => {
  const v = leerVariablesAdmin({ ADMIN_NOMBRE: " Nombre Ejemplo ", ADMIN_CORREO: "  Socio@Ejemplo.PE  " });
  assert.equal(v.nombre, "Nombre Ejemplo");
  assert.equal(v.correo, "socio@ejemplo.pe");
  assert.equal(v.contrasena, undefined);
});

const invalidas = {
  "sin nombre": { ADMIN_CORREO: "a@b.pe" },
  "nombre vacío": { ADMIN_NOMBRE: "  ", ADMIN_CORREO: "a@b.pe" },
  "sin correo": { ADMIN_NOMBRE: "N" },
  "correo vacío": { ADMIN_NOMBRE: "N", ADMIN_CORREO: "" },
  "correo sin arroba": { ADMIN_NOMBRE: "N", ADMIN_CORREO: "sin-arroba" },
  "correo de 255 caracteres": { ADMIN_NOMBRE: "N", ADMIN_CORREO: `${"a".repeat(244)}@ejemplo.pe` },
  "contraseña de 7": { ...ok, ADMIN_CONTRASENA_INICIAL: "1234567" },
  "contraseña de 129": { ...ok, ADMIN_CONTRASENA_INICIAL: "x".repeat(129) },
};
for (const [caso, env] of Object.entries(invalidas)) {
  test(`leerVariablesAdmin rechaza ${caso}`, () => assert.throws(() => leerVariablesAdmin(env)));
}

test("leerVariablesAdmin acepta contraseñas de 8 y de 128 caracteres y trata la vacía como ausente", () => {
  for (const largo of [8, 128]) {
    assert.equal(leerVariablesAdmin({ ...ok, ADMIN_CONTRASENA_INICIAL: "x".repeat(largo) }).contrasena.length, largo);
  }
  assert.equal(leerVariablesAdmin({ ...ok, ADMIN_CONTRASENA_INICIAL: "" }).contrasena, undefined);
});

test("generarContrasena produce 20 caracteres distintos en cada llamada", () => {
  const a = generarContrasena();
  assert.equal(a.length, 20);
  assert.notEqual(a, generarContrasena());
});

test("asegurarAdministrador crea organización, sede y administrador SOCIO con la contraseña generada", async () => {
  const { cliente, creados } = clienteFalso();
  const r = await asegurarAdministrador(cliente, { ADMIN_NOMBRE: "Nombre Ejemplo", ADMIN_CORREO: "Socio@Ejemplo.PE" });
  assert.equal(r.creado, true);
  assert.equal(r.contrasenaGenerada.length, 20);
  assert.equal(creados.organizaciones.length, 1);
  assert.equal(creados.sucursales.length, 1);
  const u = creados.usuarios[0];
  assert.deepEqual([u.email, u.nombre, u.rol, u.organizacionId, u.sucursalId], ["socio@ejemplo.pe", "Nombre Ejemplo", "SOCIO", "o1", "s1"]);
  assert.equal(await bcrypt.compare(r.contrasenaGenerada, u.passwordHash), true);
});

test("asegurarAdministrador usa la contraseña de la variable y no la devuelve", async () => {
  const { cliente, creados } = clienteFalso();
  const r = await asegurarAdministrador(cliente, { ...ok, ADMIN_CONTRASENA_INICIAL: "una-clave-larga" });
  assert.equal(r.contrasenaGenerada, undefined);
  assert.equal(await bcrypt.compare("una-clave-larga", creados.usuarios[0].passwordHash), true);
});

test("asegurarAdministrador no hace nada ni lee las variables si ya existe un administrador", async () => {
  const { cliente, creados } = clienteFalso(1);
  assert.deepEqual(await asegurarAdministrador(cliente, {}), { creado: false });
  assert.equal(creados.usuarios.length, 0);
});

test("asegurarAdministrador no escribe nada si las variables son inválidas", async () => {
  const { cliente, creados } = clienteFalso();
  await assert.rejects(asegurarAdministrador(cliente, { ADMIN_NOMBRE: "N" }));
  assert.equal(creados.organizaciones.length + creados.usuarios.length, 0);
});

test("clientePg hace BEGIN/COMMIT y ROLLBACK ante un error", async () => {
  const consultas = [];
  const conexion = { query: async (sql) => (consultas.push(sql.split(" ")[0]), { rows: [] }), release: () => consultas.push("release") };
  const cliente = clientePg({ connect: async () => conexion });
  await cliente.transaccion(async () => 1);
  assert.deepEqual(consultas, ["BEGIN", "COMMIT", "release"]);
  consultas.length = 0;
  await assert.rejects(cliente.transaccion(async () => { throw new Error("falla"); }), /falla/);
  assert.deepEqual(consultas, ["BEGIN", "ROLLBACK", "release"]);
});
