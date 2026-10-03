/**
 * Imagen de un destino con degradado de respaldo.
 *
 * Si el backend ya entrega una URL de Cloudinary (o un public_id), se
 * pinta con `<img loading="lazy">`. Si todavía no llega —hoy el modelo
 * `Atractivo` no tiene campo de imagen— se muestra un marcador con los
 * colores de la categoría, de modo que la cuadrícula nunca tenga huecos
 * ni imágenes rotas.
 */

import { useState } from "react";
import {
  anguloDe,
  gradienteDe,
  portadaDe,
} from "../utils/destinoImages";
import type { Atractivo } from "../../../types/turismo";

interface DestinoImagenProps {
  atractivo: Atractivo;
  /** Categorión que define el color del marcador de respaldo. */
  categoria: string | null;
  className?: string;
  /** `true` en la portada del detalle (prioridad de carga). */
  prioritaria?: boolean;
  sizes?: string;
}

export function DestinoImagen({
  atractivo,
  categoria,
  className = "",
  prioritaria = false,
  sizes,
}: DestinoImagenProps) {
  const [fallo, setFallo] = useState(false);
  const url = portadaDe(atractivo);
  const [desde, hasta] = gradienteDe(categoria);
  const angulo = anguloDe(atractivo.id);

  // Sin imagen del backend, o con error de carga → marcador de marca.
  if (!url || fallo) {
    return (
      <div
        className={`relative flex items-end overflow-hidden ${className}`}
        style={{
          backgroundImage: `linear-gradient(${angulo}deg, ${desde}, ${hasta})`,
        }}
        role="img"
        aria-label={`Imagen pendiente de ${atractivo.nombre}`}
        data-testid="destino-imagen-placeholder"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(255,255,255,.55) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(255,255,255,.55) 25%, transparent 25%)
            `,
            backgroundSize: "44px 44px",
          }}
        />

        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(2.5rem,9cqw,4.5rem)] font-black text-white/25"
          aria-hidden="true"
        >
          ⛰
        </span>

        <span className="relative z-10 w-full bg-gradient-to-t from-black/55 to-transparent px-5 pb-4 pt-14 text-[0.6rem] font-black uppercase tracking-[0.22em] text-white/75">
          Fotografía pendiente
        </span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={atractivo.nombre}
      className={`object-cover ${className}`}
      loading={prioritaria ? "eager" : "lazy"}
      decoding="async"
      {...(sizes ? { sizes } : {})}
      onError={() => setFallo(true)}
    />
  );
}
