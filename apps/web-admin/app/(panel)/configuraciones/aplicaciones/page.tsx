import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";
import { Card } from "@gym-app/ui/components/Card";
import { BotonCopiarEnlace } from "./BotonCopiarEnlace";

const APLICACIONES = [
  { archivo: "AF-checkin.apk", nombre: "Adhara Fit Check-in", detalle: "Pantalla de entrada del TV de la recepción." },
  { archivo: "AF-vitrina.apk", nombre: "Adhara Fit Vitrina", detalle: "Pantalla de promociones y entrenadores." },
];

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
