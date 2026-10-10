/**
 * Galería de imágenes del destino.
 *
 * Si el backend ya entrega imágenes de Cloudinary se muestran en
 * cuadrícula. Hoy el modelo `Atractivo` no tiene campo de imagen, así que
 * se reserva el espacio con un marcador y se indica que la galería está
 * pendiente de carga, sin romper el layout.
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
      <div className="relative overflow-hidden rounded-[2rem] border border-[#5B3A29]/10">
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
    <div className="grid gap-3 sm:grid-cols-4 sm:grid-rows-2">
      <figure className="overflow-hidden rounded-[1.85rem] sm:col-span-3 sm:row-span-2">
        <CarruselImagenes
          imagenes={imagenes}
          alt={atractivo.nombre}
          prioritaria
          sizes="(min-width: 640px) 60vw, 100vw"
          className="h-full min-h-[16rem] w-full"
        />
      </figure>

      {secundarias.slice(0, 3).map((url, indice) => (
        <figure
          key={url}
          className="hidden overflow-hidden rounded-[1.6rem] sm:block"
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
            className="hidden rounded-[1.6rem] sm:block"
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
