/**
 * Galería de imágenes del destino.
 *
 * Si el backend ya entrega imágenes de Cloudinary se muestran en una
 * lámina principal con dos recortes secundarios. Hoy el modelo
 * `Atractivo` no tiene campo de imagen, así que se reserva el espacio con
 * un marcador de marca, sin romper el layout.
 */

import type { Atractivo } from "../../../types/turismo";
import { anguloDe, gradienteDe, imagenesDe } from "../utils/destinoImages";
import { CarruselImagenes } from "./CarruselImagenes";
import { DestinoImagen } from "./DestinoImagen";

interface GaleriaDestinoProps {
  atractivo: Atractivo;
}

export function GaleriaDestino({ atractivo }: GaleriaDestinoProps) {
  const imagenes = imagenesDe(atractivo);
  const categoria = atractivo.categorias[0] ?? null;

  // Sin imágenes: se mantiene una sola figura protagonista con el
  // marcador de `DestinoImagen` (que ya pinta el degradado de marca).
  if (imagenes.length === 0) {
    return (
      <div className="border border-[#5B3A29]/15 bg-[#FFFDF8] p-2 sm:p-3">
        <DestinoImagen
          atractivo={atractivo}
          categoria={categoria}
          prioritaria
          sizes="100vw"
          className="aspect-[16/9] w-full"
        />
      </div>
    );
  }

  const secundarias = imagenes.slice(1);
  const [desde, hasta] = gradienteDe(categoria);
  const angulo = anguloDe(atractivo.id);

  return (
    <div className="grid gap-2 sm:h-[28rem] sm:grid-cols-4 sm:grid-rows-2 lg:h-[34rem]">
      <figure className="relative overflow-hidden border border-[#5B3A29]/15 bg-[#233128] sm:col-span-3 sm:row-span-2">
        <CarruselImagenes
          imagenes={imagenes}
          alt={atractivo.nombre}
          prioritaria
          sizes="(min-width: 640px) 60vw, 100vw"
          className="h-full min-h-[16rem] w-full"
        />

        <figcaption className="pointer-events-none absolute left-3 top-3 bg-[#101710]/70 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[#F3EBDD] backdrop-blur-sm">
          Galería / {String(imagenes.length).padStart(2, "0")} tomas
        </figcaption>
      </figure>

      {secundarias.slice(0, 3).map((url, indice) => (
        <figure
          key={url}
          className="hidden overflow-hidden border border-[#5B3A29]/15 bg-[#233128] sm:block"
        >
          <img
            src={url}
            alt={`${atractivo.nombre} — vista ${indice + 2}`}
            loading="lazy"
            decoding="async"
            className="h-full min-h-[7.5rem] w-full object-cover"
          />
        </figure>
      ))}

      {/* Relleno visual si hay menos de 4 fotos */}
      {Array.from({ length: Math.max(0, 3 - secundarias.length) }).map(
        (_, indice) => (
          <div
            key={`hueco-${indice}`}
            className="hidden border border-[#5B3A29]/15 sm:block"
            style={{
              backgroundImage: `linear-gradient(${(angulo + indice * 40) % 360}deg, ${desde}, ${hasta})`,
            }}
            aria-hidden="true"
          />
        ),
      )}
    </div>
  );
}
