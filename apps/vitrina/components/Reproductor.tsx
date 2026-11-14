"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Almacen } from "@/lib/almacen";
import type { ManifiestoVitrina } from "@gym-app/domain/entities/Vitrina";
import { construirSecuencia } from "@gym-app/domain/services/secuenciaVitrina";
import { itemsDeManifiesto } from "@gym-app/domain/services/manifiestoVitrina";
import { itemsReproducibles } from "@/lib/reproducibles";
import { posicionarIndice } from "@/lib/posicionarDiapositiva";
import { msParaAvanzar, techoDiapositivaMs } from "@/lib/reproduccion";
import { Cartel } from "./Cartel";
import { PantallaMarca } from "./PantallaMarca";

export function Reproductor({ manifiesto, almacen, ahora }: { manifiesto: ManifiestoVitrina; almacen: Almacen; ahora: Date }) {
  // La secuencia se recalcula cada minuto (y al cambiar el manifiesto): así un ítem programado entra, o uno que
  // vence sale, aunque la TV no tenga red.
  const minuto = Math.floor(ahora.getTime() / 60_000);
  const secuencia = useMemo(
    () =>
      construirSecuencia(
        // Las piezas omitidas (no descargadas tras varios intentos) quedan fuera; reaparecen al adoptarse el manifiesto
        // que las trae, que es cuando cambia `manifiesto`.
        itemsReproducibles(itemsDeManifiesto(manifiesto), (url) => almacen.rutaLocal(url) !== null),
        new Date(minuto * 60_000),
        manifiesto.duracionSeg
      ),
    [manifiesto, minuto, almacen]
  );

  const [indice, setIndice] = useState(0);
  const [ciclo, setCiclo] = useState(0); // solo avanza al pasar de diapositiva: reposicionar no reinicia el temporizador
  const [secuenciaPrevia, setSecuenciaPrevia] = useState(secuencia);
  if (secuenciaPrevia !== secuencia) {
    // Si la secuencia cambió, la TV sigue en la misma diapositiva (por clave) en vez de saltar o repetir.
    const previa = secuenciaPrevia.length > 0 ? secuenciaPrevia[indice % secuenciaPrevia.length].clave : null;
    setSecuenciaPrevia(secuencia);
    setIndice(posicionarIndice(indice % Math.max(secuenciaPrevia.length, 1), previa, secuencia));
  }
  const actual = secuencia.length > 0 ? secuencia[indice % secuencia.length] : null;
  const claveActual = actual?.clave;
  const duracionActual = actual?.duracionSeg;

  // Con una sola diapositiva el video se repite y el temporizador solo la mantiene viva.
  const unica = secuencia.length === 1;
  const conVideo = !unica && actual?.item.mediaTipo === "VIDEO";
  // Identifica cada paso por la diapositiva (`ciclo` distingue vueltas de la misma): reposicionar no lo cambia.
  const turno = claveActual === undefined ? null : `${claveActual}#${ciclo}`;
  const [videosListos, setVideosListos] = useState<{ turno: string; fallo: boolean } | null>(null);
  const terminados = videosListos !== null && videosListos.turno === turno;
  const inicioTurnoMs = useRef(0); // lo fija el efecto de abajo al empezar cada turno (Date.now() no se llama en el render)

  useEffect(() => {
    inicioTurnoMs.current = Date.now();
  }, [turno]);

  useEffect(() => {
    if (duracionActual === undefined) return;
    const restante = msParaAvanzar({
      conVideo,
      videosTerminados: terminados,
      huboFallo: terminados && (videosListos?.fallo ?? false),
      transcurridoMs: Date.now() - inicioTurnoMs.current,
      duracionSeg: duracionActual,
    });
    // Espera al evento de fin del último video, pero con un techo absoluto para que la TV nunca quede pegada.
    const espera = restante ?? Math.max(0, techoDiapositivaMs(duracionActual) - (Date.now() - inicioTurnoMs.current));
    const id = setTimeout(() => {
      setIndice((i) => i + 1);
      setCiclo((c) => c + 1);
    }, espera);
    return () => clearTimeout(id);
  }, [turno, duracionActual, conVideo, terminados, videosListos]);

  if (!actual) return <PantallaMarca />;

  const alTerminarVideos = (fallo: boolean) => turno !== null && setVideosListos({ turno, fallo });

  // La clave es la de la diapositiva: si la secuencia cambia pero la actual sigue, no se vuelve a montar (el video no
  // se corta); con una sola diapositiva tampoco se repite la transición.
  return (
    <main key={actual.clave} className={`h-full w-full ${manifiesto.transicion === "DESLIZAR" ? "trans-deslizar" : "trans-fundido"}`}>
      <Cartel item={actual.item} almacen={almacen} bucle={unica} alTerminarVideo={alTerminarVideos} />
    </main>
  );
}
