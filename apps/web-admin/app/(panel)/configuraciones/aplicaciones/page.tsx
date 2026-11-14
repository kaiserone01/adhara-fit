import Image from "next/image";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { Card } from "@gym-app/ui/components/Card";
import { BotonCopiarEnlace } from "./BotonCopiarEnlace";

const APLICACIONES = [
  { archivo: "AF-checkin.apk", icono: "/aplicaciones/checkin.png", nombre: "Adhara Fit Check-in", detalle: "Aplicación para Android TV: pantalla de entrada de la recepción." },
  { archivo: "AF-vitrina.apk", icono: "/aplicaciones/vitrina.png", nombre: "Adhara Fit Vitrina", detalle: "Aplicación para Android TV: pantalla de promociones y entrenadores." },
];

// Pastilla «Android TV»: las dos aplicaciones son solo para Android TV.
function InsigniaAndroidTv() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ borderColor: "var(--gx-edge)", color: "var(--gx-muted)" }}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="4" width="19" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
      Android TV
    </span>
  );
}

export default async function PaginaAplicaciones() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");

  const base = (process.env.R2_APK_PUBLIC_URL ?? "").replace(/\/+$/, "");

  if (!base) {
    return (
      <Card>
        <p style={{ color: "var(--gx-muted)" }}>
          Falta la variable <strong>R2_APK_PUBLIC_URL</strong> (por ejemplo https://apk.adhara.fit) en el entorno de la aplicación.
        </p>
      </Card>
    );
  }

  const tarjetas = await Promise.all(
    APLICACIONES.map(async (app) => {
      const enlace = `${base}/${app.archivo}`;
      // QR en SVG, de módulos negros sobre blanco y con margen: se escanea bien también en pantallas oscuras.
      const qr = await QRCode.toString(enlace, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
      return { ...app, enlace, qr };
    })
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {tarjetas.map((app) => (
          <Card key={app.archivo}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div
                className="size-40 shrink-0 self-center overflow-hidden rounded-lg bg-white sm:self-start [&>svg]:h-full [&>svg]:w-full"
                role="img"
                aria-label={`Código QR para descargar ${app.nombre}`}
                dangerouslySetInnerHTML={{ __html: app.qr }}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h2 className="text-lg font-semibold" style={{ color: "var(--gx-ink)" }}>
                  {app.nombre}
                </h2>
                <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
                  {app.detalle}
                </p>
                <a
                  href={app.enlace}
                  className="break-all text-sm underline"
                  style={{ color: "var(--gx-accent)" }}
                  target="_blank"
                  rel="noreferrer"
                >
                  {app.enlace}
                </a>
                <div>
                  <BotonCopiarEnlace enlace={app.enlace} />
                </div>
              </div>
              {/* Esquina: el ícono de la aplicación y, debajo, que es una app de Android TV. */}
              <div className="order-first flex shrink-0 flex-row items-center gap-3 self-end sm:order-none sm:flex-col sm:gap-2 sm:self-start">
                <Image src={app.icono} alt={`Ícono de ${app.nombre}`} width={72} height={72} unoptimized className="size-[72px] rounded-2xl" />
                <InsigniaAndroidTv />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-sm" style={{ color: "var(--gx-muted)" }}>
        Los enlaces solo descargan mientras el acceso público del bucket «apk» esté abierto en Cloudflare. Ábrelo para instalar y ciérralo al
        terminar. No compartas estos enlaces: el APK lleva dentro la clave del check-in.
      </p>
    </div>
  );
}
