// app/api/usuarios/route.ts
// Lista y crea administradores — protegido por sesión (cualquier administrador activo puede).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioDeSesion } from "@/lib/sesion";
import { PrismaUsuarioAdminRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaUsuarioAdminRepository";
import { BcryptPasswordHasher } from "@gym-app/infrastructure/auth/BcryptPasswordHasher";
import { crearUsuarioAdmin, CorreoDuplicadoError } from "@gym-app/domain/use-cases/CrearUsuarioAdmin";
import { listarUsuariosAdmin } from "@gym-app/domain/use-cases/ListarUsuariosAdmin";

const LARGO_MINIMO_CLAVE = 8;

export async function GET(req: NextRequest) {
  const sesion = await obtenerUsuarioDeSesion(req);
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const usuarios = await listarUsuariosAdmin(
    { usuarios: new PrismaUsuarioAdminRepository(prisma) },
    sesion.usuario.organizacionId
  );

  return NextResponse.json({ usuarios });
}

export async function POST(req: NextRequest) {
  try {
    const sesion = await obtenerUsuarioDeSesion(req);

    if (!sesion) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { nombre, email, password: clave } = await req.json();

    if (!nombre || !email || !clave) {
      return NextResponse.json({ error: "nombre, email y password son requeridos." }, { status: 400 });
    }
    if (String(clave).length < LARGO_MINIMO_CLAVE) {
      return NextResponse.json({ error: "La contraseña debe tener al menos " + LARGO_MINIMO_CLAVE + " caracteres." }, { status: 400 });
    }

    const passwordHash = await new BcryptPasswordHasher().hash(clave);

    const creado = await crearUsuarioAdmin(
      { usuarios: new PrismaUsuarioAdminRepository(prisma) },
      {
        organizacionId: sesion.usuario.organizacionId,
        sucursalId: null,
        nombre,
        email: String(email).trim().toLowerCase(),
        passwordHash,
      }
    );

    return NextResponse.json({ id: creado.id, nombre: creado.nombre, email: creado.email }, { status: 201 });
  } catch (error) {
    if (error instanceof CorreoDuplicadoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error al crear administrador:", error);
    return NextResponse.json({ error: "Error interno al crear el administrador." }, { status: 500 });
  }
}
