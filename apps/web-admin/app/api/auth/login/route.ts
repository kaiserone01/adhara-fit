import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NOMBRE_COOKIE_SESION } from "@/lib/sesion";
import { PrismaUsuarioAdminRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaUsuarioAdminRepository";
import { PrismaSesionRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSesionRepository";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { BcryptPasswordHasher } from "@gym-app/infrastructure/auth/BcryptPasswordHasher";
import { iniciarSesion, CredencialesInvalidasError } from "@gym-app/domain/use-cases/IniciarSesion";
import { obtenerSucursalesVisiblesParaUsuario } from "@gym-app/domain/use-cases/ObtenerSucursalesVisiblesParaUsuario";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos." },
        { status: 400 }
      );
    }

    const hasher = new BcryptPasswordHasher();
    const usuarios = new PrismaUsuarioAdminRepository(prisma);

    // Se validan las credenciales acá para poder tomar la sede única antes de abrir la sesión.
    const credenciales = await usuarios.buscarCredencialesPorEmail(email);
    if (!credenciales || !credenciales.usuario.activo || !(await hasher.comparar(password, credenciales.passwordHash))) {
      return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
    }

    const sucursalesVisibles = await obtenerSucursalesVisiblesParaUsuario(
      { sucursales: new PrismaSucursalRepository(prisma) },
      credenciales.usuario
    );

    // La sede única es oculta: el usuario no la elige. Sin ninguna sede configurada no hay con qué abrir sesión.
    if (sucursalesVisibles.length === 0) {
      return NextResponse.json(
        { error: "El negocio no tiene una sede configurada. Contacta a soporte." },
        { status: 403 }
      );
    }

    const resultado = await iniciarSesion(
      { usuarios, hasher, sesiones: new PrismaSesionRepository(prisma) },
      { email, password, sucursalActivaId: sucursalesVisibles[0].id }
    );

    const response = NextResponse.json({ ok: true });
    response.cookies.set(NOMBRE_COOKIE_SESION, resultado.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: resultado.expiraEn,
    });
    return response;
  } catch (error) {
    if (error instanceof CredencialesInvalidasError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno al iniciar sesión." },
      { status: 500 }
    );
  }
}
