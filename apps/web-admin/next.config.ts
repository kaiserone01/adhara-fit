import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un server.js autocontenido (apps/web-admin/.next/standalone)
  // con solo las dependencias de producción realmente usadas — necesario
  // para una imagen Docker liviana en un monorepo npm workspaces.
  output: "standalone",
  // @gym-app/domain y @gym-app/infrastructure son paquetes internos sin
  // build propio (solo .ts fuente) — Next.js necesita transpilarlos
  // explícitamente, a diferencia de @gym-app/db (ya es JS compilado por
  // `prisma generate`).
  transpilePackages: ["@gym-app/domain", "@gym-app/infrastructure", "@gym-app/ui", "@gym-app/theming"],
  // Cabeceras de seguridad en todas las respuestas (S-01). Sin CSP por ahora: se añade cuando se pruebe contra las pantallas.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  experimental: {
    // El límite por defecto de Server Actions es 1mb — muy poco para una
    // foto de celular sin comprimir (la de Nuevo Miembro se manda como
    // FormData a través de una Server Action, ver miembros/actions.ts).
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
