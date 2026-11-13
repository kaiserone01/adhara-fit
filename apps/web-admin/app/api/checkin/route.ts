// app/api/checkin/route.ts
// Endpoint de check-in: el checkin se autentica con su apiKey de Sucursal (ver lib/checkin.ts). Este
// handler solo valida entrada/salida HTTP; toda la lógica de negocio vive en el caso de uso
// RegistrarCheckIn (packages/domain).
//
// S-21: los envíos fallidos (identificador inválido, socio inexistente o eliminado, o vencido) se cuentan por
// sede; con 5 fallos en 5 minutos el check-in responde 429 con Retry-After. El conteo y el registro van en una
// transacción con candado asesor, para que envíos simultáneos no se salten el límite.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CORS_HEADERS, jsonCheckin, opcionesCheckin, sucursalDeCheckin } from "@/lib/checkin";
import { PrismaMemberRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaMemberRepository";
import { PrismaCheckInRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaCheckInRepository";
import { PrismaSucursalRepository } from "@gym-app/infrastructure/persistence/prisma/PrismaSucursalRepository";
import {
  registrarCheckIn,
  MiembroNoEncontradoError,
  type RegistrarCheckInResultado,
} from "@gym-app/domain/use-cases/RegistrarCheckIn";
import { evaluarBloqueoCheckin, VENTANA_FALLOS_CHECKIN_MS } from "@gym-app/domain/utils/bloqueoCheckin";

const MENSAJE_NO_ENCONTRADO = "No te encontramos. Consulta en recepción.";
const RETENCION_INTENTOS_MS = 24 * 60 * 60 * 1000;

type Salida =
  | { tipo: "bloqueado"; reintentarEnSegundos: number }
  | { tipo: "invalido" }
  | { tipo: "noEncontrado" }
  | { tipo: "ok"; resultado: RegistrarCheckInResultado };

export async function OPTIONS() {
  return opcionesCheckin();
}

export async function POST(req: NextRequest) {
  try {
    const sucursal = await sucursalDeCheckin(req);
    if (sucursal instanceof NextResponse) return sucursal;

    // El cuerpo es solo { identificador }: texto no vacío de hasta 20 caracteres (código de socio o documento).
    const cuerpo: unknown = await req.json().catch(() => null);
    const claves = cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo) ? Object.keys(cuerpo) : [];
    const candidato = claves.length === 1 && claves[0] === "identificador" ? (cuerpo as { identificador: unknown }).identificador : null;
    const identificador =
      typeof candidato === "string" && candidato.trim().length > 0 && candidato.length <= 20 ? candidato : null;

    const salida = await prisma.$transaction(
      async (tx): Promise<Salida> => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkin:${sucursal.id}`}))`;

        const ahora = new Date();
        await tx.intentoCheckin.deleteMany({ where: { creadoEn: { lt: new Date(ahora.getTime() - RETENCION_INTENTOS_MS) } } });
        const recientes = await tx.intentoCheckin.findMany({
          where: {
            sucursalId: sucursal.id,
            resultado: "FALLO",
            creadoEn: { gt: new Date(ahora.getTime() - VENTANA_FALLOS_CHECKIN_MS) },
          },
          select: { creadoEn: true },
        });
        const bloqueo = evaluarBloqueoCheckin(
          recientes.map((r) => r.creadoEn),
          ahora
        );
        // Los envíos bloqueados no cuentan como fallos.
        if (bloqueo.bloqueado) return { tipo: "bloqueado", reintentarEnSegundos: bloqueo.reintentarEnSegundos };

        const registrar = (resultado: "EXITO" | "FALLO") =>
          tx.intentoCheckin.create({ data: { sucursalId: sucursal.id, resultado } });

        if (identificador === null) {
          await registrar("FALLO");
          return { tipo: "invalido" };
        }

        try {
          const resultado = await registrarCheckIn(
            {
              miembros: new PrismaMemberRepository(tx),
              checkIns: new PrismaCheckInRepository(tx),
              sucursales: new PrismaSucursalRepository(tx),
            },
            { organizacionId: sucursal.organizacionId, sucursalId: sucursal.id, identificador }
          );
          // Un vencido cuenta como fallo: la pantalla revela su nombre y se podría enumerar con ella.
          await registrar(resultado.estado === "activo" ? "EXITO" : "FALLO");
          return { tipo: "ok", resultado };
        } catch (error) {
          if (!(error instanceof MiembroNoEncontradoError)) throw error;
          await registrar("FALLO");
          return { tipo: "noEncontrado" };
        }
      },
      { timeout: 20_000, maxWait: 5_000 }
    );

    switch (salida.tipo) {
      case "bloqueado":
        return NextResponse.json(
          { error: `Demasiados intentos. Espera ${salida.reintentarEnSegundos} segundos.` },
          { status: 429, headers: { ...CORS_HEADERS, "Retry-After": String(salida.reintentarEnSegundos) } }
        );
      case "invalido":
        return jsonCheckin({ error: "Identificador es requerido (documento o código de socio, hasta 20 caracteres)." }, 400);
      case "noEncontrado":
        return jsonCheckin({ error: MENSAJE_NO_ENCONTRADO }, 404);
      case "ok":
        break;
    }

    const r = salida.resultado;
    // Un vencido solo ve su primer nombre y que debe pasar por recepción: sin foto, entrenador ni vencimiento.
    if (r.estado === "vencido") {
      return jsonCheckin(
        {
          nombre: r.nombre.trim().split(/\s+/)[0] ?? "",
          fotoUrl: null,
          entrenador: null,
          fechaVencimiento: null,
          estado: r.estado,
          sucursalAsignadaNombre: "",
          sucursalAsignadaDireccion: null,
          esCumpleanos: false,
        },
        200
      );
    }

    return jsonCheckin(
      {
        nombre: r.nombre,
        fotoUrl: r.fotoUrl,
        entrenador: r.entrenadorNombre,
        fechaVencimiento: r.fechaVencimiento,
        estado: r.estado,
        sucursalAsignadaNombre: r.sucursalAsignadaNombre,
        sucursalAsignadaDireccion: r.sucursalAsignadaDireccion,
        esCumpleanos: r.esCumpleanos,
      },
      200
    );
  } catch (error) {
    // Solo el tipo de error: el mensaje podría arrastrar datos del socio (el documento no se registra).
    console.error("Error en check-in:", error instanceof Error ? error.name : "desconocido");
    return jsonCheckin({ error: "Error interno al procesar el check-in." }, 500);
  }
}
