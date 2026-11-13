import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NOMBRE_COOKIE_SESION } from "@/lib/sesion";
import { PrismaUsuarioAdminRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaUsuarioAdminRepository";
import { PrismaSesionRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSesionRepository";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import { BcryptPasswordHasher } from "@gym-app/infrastructure/auth/BcryptPasswordHasher";
import { iniciarSesion, CredencialesInvalidasError } from "@gym-app/domain/use-cases/IniciarSesion";
import { obtenerSucursalesVisiblesParaUsuario } from "@gym-app/domain/use-cases/ObtenerSucursalesVisiblesParaUsuario";
import { claveIntentoLogin, evaluarBloqueoLogin, VENTANA_FALLOS_LOGIN_MS } from "@gym-app/domain/utils/bloqueoLogin";
import type { UsuarioAdmin } from "@gym-app/domain/entities/UsuarioAdmin";

const RETENCION_INTENTOS_MS = 24 * 60 * 60 * 1000;

// Detrás del proxy, la IP de quien se conecta es la última de X-Forwarded-For (las anteriores las puede escribir el
// propio cliente). Sin la cabecera se usa un valor fijo: el límite sigue valiendo por correo.
function ipDelCliente(req: NextRequest): string {
  const reenviada = req.headers.get("x-forwarded-for");
  const ultima = reenviada?.split(",").at(-1)?.trim();
  return ultima || req.headers.get("x-real-ip")?.trim() || "desconocida";
}

type Verificacion =
  | { tipo: "bloqueado"; reintentarEnSegundos: number }
  | { tipo: "invalido" }
  | { tipo: "ok"; usuario: UsuarioAdmin };

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos." },
        { status: 400 }
      );
    }

    const hasher = new BcryptPasswordHasher();
    const usuarios = new PrismaUsuarioAdminRepository(prisma);
    const clave = claveIntentoLogin(email, ipDelCliente(req));

    // El conteo, la verificación de la contraseña y el registro del intento van bajo un candado por clave:
    // intentos simultáneos no pueden saltarse el límite (S-01).
    const verificacion = await prisma.$transaction(
      async (tx): Promise<Verificacion> => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`login:${clave}`}))`;

        const ahora = new Date();
        await tx.intentoLogin.deleteMany({ where: { creadoEn: { lt: new Date(ahora.getTime() - RETENCION_INTENTOS_MS) } } });
        const recientes = await tx.intentoLogin.findMany({
          where: { clave, resultado: "FALLO", creadoEn: { gt: new Date(ahora.getTime() - VENTANA_FALLOS_LOGIN_MS) } },
          select: { creadoEn: true },
        });
        const bloqueo = evaluarBloqueoLogin(
          recientes.map((r) => r.creadoEn),
          ahora
        );
        // Bloqueado: no se verifica la contraseña y el intento no cuenta como fallo.
        if (bloqueo.bloqueado) return { tipo: "bloqueado", reintentarEnSegundos: bloqueo.reintentarEnSegundos };

        // Un administrador desactivado recibe el mismo resultado que una contraseña incorrecta.
        const credenciales = await usuarios.buscarCredencialesPorEmail(email);
        const valido =
          !!credenciales && credenciales.usuario.activo && (await hasher.comparar(password, credenciales.passwordHash));

        await tx.intentoLogin.create({ data: { clave, resultado: valido ? "EXITO" : "FALLO" } });
        return valido && credenciales ? { tipo: "ok", usuario: credenciales.usuario } : { tipo: "invalido" };
      },
      { timeout: 20_000, maxWait: 5_000 }
    );

    if (verificacion.tipo === "bloqueado") {
      return NextResponse.json(
        { error: `Demasiados intentos. Vuelve a intentarlo en ${Math.ceil(verificacion.reintentarEnSegundos / 60)} minuto(s).` },
        { status: 429, headers: { "Retry-After": String(verificacion.reintentarEnSegundos) } }
      );
    }
    if (verificacion.tipo === "invalido") {
      return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
    }

    const sucursalesVisibles = await obtenerSucursalesVisiblesParaUsuario(
      { sucursales: new PrismaSucursalRepository(prisma) },
      verificacion.usuario
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
    console.error("Error en login:", error instanceof Error ? error.name : "desconocido");
    return NextResponse.json(
      { error: "Error interno al iniciar sesión." },
      { status: 500 }
    );
  }
}
