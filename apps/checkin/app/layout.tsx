import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Actualizador } from "@gym-app/ota/Actualizador";
import { EtiquetaVersion } from "@gym-app/ota/EtiquetaVersion";
import { GuardaWebView } from "../components/GuardaWebView";
import { ThemeStyleTag } from "@gym-app/theming/ThemeStyleTag";
import { temaAdhara } from "@gym-app/theming/tokens";

export const metadata: Metadata = {
  title: "Adhara Fit Check-in",
};

export const viewport: Viewport = {
  themeColor: temaAdhara.ground,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="marca-agua-pagina sin-logo min-h-full" style={{ background: "var(--gx-ground)", color: "var(--gx-ink)" }}>
        <ThemeStyleTag tema={temaAdhara} />
        <Actualizador rutaConfig="/checkin-config.json" />
        <EtiquetaVersion />
        <GuardaWebView>{children}</GuardaWebView>
      </body>
    </html>
  );
}
