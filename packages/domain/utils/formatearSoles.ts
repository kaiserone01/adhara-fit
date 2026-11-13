// Monto en soles: "S/ 1,234.50" (coma para los miles, punto decimal, signo menos delante de "S/").
const formato = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatearSoles(monto: number): string {
  const redondeado = Math.round(monto * 100) / 100;
  return `${redondeado < 0 ? "-" : ""}S/ ${formato.format(Math.abs(redondeado))}`;
}
