import { redirect } from "next/navigation";
import { obtenerUsuarioDeSesionActual } from "@/lib/sesion";

// Pantalla de aterrizaje: "En sala".
export default async function Home() {
  const sesion = await obtenerUsuarioDeSesionActual();
  if (!sesion) redirect("/login");
  redirect("/en-sala");
}
