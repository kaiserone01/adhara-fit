import type { Almacen } from "@/lib/almacen";
import type { VitrinaItem } from "@gym-app/domain/entities/Vitrina";
import { Medio } from "./Medio";

interface Props {
  item: VitrinaItem;
  almacen: Almacen;
  /** Diapositiva única: el video se repite en vez de avanzar. */
  bucle: boolean;
  alTerminarVideo: (fallo: boolean) => void;
}

// Una pieza gráfica a pantalla completa (16:9). 'contain': se ve entera, sin recortar, aunque no sea 16:9.
export function Cartel({ item, almacen, bucle, alTerminarVideo }: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--gx-ground)" }}>
      <Medio
        url={item.mediaUrl}
        tipo={item.mediaTipo}
        posterUrl={item.posterUrl}
        almacen={almacen}
        reproducir
        ajuste="contain"
        sonido={item.sonido}
        bucle={bucle}
        alTerminar={alTerminarVideo}
      />
    </div>
  );
}
