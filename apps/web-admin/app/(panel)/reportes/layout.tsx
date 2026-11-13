import Link from "next/link";

const PESTANAS = [
  { href: "/reportes/morosos", etiqueta: "Morosos" },
  { href: "/reportes/por-vencer", etiqueta: "Por vencer" },
  { href: "/reportes/ingresos", etiqueta: "Ingresos" },
  { href: "/pagos", etiqueta: "Histórico de pagos" },
];

export default function LayoutReportes({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="flex flex-wrap gap-2 px-6 pt-6 lg:px-8 print:hidden">
        {PESTANAS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: "var(--gx-edge)", color: "var(--gx-ink)" }}
          >
            {p.etiqueta}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
