/**
 * Imagen de marca (`branding/encabezado` en Cloudinary) que acompaña al
 * gran titular en el header de las páginas (excepto el inicio).
 *
 * Es solo la imagen: el tamaño y la posición los decide cada header vía
 * `className`. Si no hay cloud configurado
 * (`VITE_CLOUDINARY_CLOUD_NAME`) no se renderiza nada.
 */

import { CLOUDINARY_CLOUD_NAME } from "../config/turismo";

/** Imagen de marca (`branding/encabezado`) subida a Cloudinary. */
const ENCABEZADO_PUBLIC_ID = "branding/encabezado";
const ENCABEZADO_TRANSFORM = "f_auto,q_auto,w_720";

interface EncabezadoImagenProps {
  className?: string;
  alt?: string;
  /** `true` cuando es visible al entrar (header): carga con prioridad. */
  prioritaria?: boolean;
}

export function EncabezadoImagen({
  className = "",
  alt = "Turismo La Paz",
  prioritaria = false,
}: EncabezadoImagenProps) {
  if (!CLOUDINARY_CLOUD_NAME) {
    return null;
  }

  const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${ENCABEZADO_TRANSFORM}/${ENCABEZADO_PUBLIC_ID}`;

  return (
    <img
      src={url}
      alt={alt}
      loading={prioritaria ? "eager" : "lazy"}
      decoding="async"
      className={`rounded-2xl object-cover shadow-lg ring-1 ring-black/10 ${className}`}
      data-testid="encabezado-imagen"
    />
  );
}
