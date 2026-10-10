/**
 * Resolución de imágenes de destino con soporte para Cloudinary.
 *
 * `AtractivoSerializer` ya expone `imagenes`: la lista ordenada de
 * `public_id` de las fotos del destino. Cada valor se normaliza desde
 * `IMAGEN_CAMPOS` (una URL absoluta de Cloudinary o un public_id) y la
 * card y la galería las muestran. Si no hay ninguna se pinta un
 * placeholder de marca, nunca una imagen rota.
 *
 * Construir la URL de entrega requiere `VITE_CLOUDINARY_CLOUD_NAME`
 * (ver `config/turismo.ts`); sin ella `urlCloudinary` devuelve `null`.
 */

import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_TRANSFORM,
} from "../../../config/turismo";
import type { Atractivo, ImagenCampo } from "../../../types/turismo";

/**
 * Nombres de campo que el backend puede usar para entregar imágenes.
 * Se prueban en orden: los de lista (galería) primero, luego los de
 * portada. Ajustar esta lista es el único punto de contacto necesario
 * cuando se cierre el contrato de Cloudinary.
 */
export const IMAGEN_CAMPOS: ImagenCampo[] = [
  "imagenes",
  "galeria",
  "imagen",
  "imagen_url",
  "foto",
  "foto_url",
  "portada",
  "cloudinary_id",
  "public_id",
];

const ES_URL = /^https?:\/\//i;

function esPublicId(valor: string): boolean {
  // Un public_id de Cloudinary no trae protocolo ni extensión de formato
  // (las transformaciones las pone `image/upload`). Rechazamos rutas
  // absolutas y Data URLs para no romperlos.
  return !ES_URL.test(valor) && !valor.startsWith("data:");
}

/** Construye una URL de entrega de Cloudinary con transformaciones. */
export function urlCloudinary(
  publicId: string,
  transform: string = CLOUDINARY_TRANSFORM.detalle,
): string | null {
  if (!CLOUDINARY_CLOUD_NAME || !esPublicId(publicId)) {
    return null;
  }

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${publicId}`;
}

/**
 * Normaliza un valor de imagen del backend a una URL utilizable.
 * Acepta: URL absoluta, objeto `{ secure_url | url }`, o public_id.
 */
function normalizar(valor: unknown, transform: string): string | null {
  if (typeof valor === "string" && valor.trim()) {
    const limpio = valor.trim();
    return ES_URL.test(limpio) ? limpio : urlCloudinary(limpio, transform);
  }

  if (valor && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    const candidato =
      objeto.secure_url ?? objeto.url ?? objeto.public_id ?? objeto.src;

    if (typeof candidato === "string" && candidato.trim()) {
      return normalizar(candidato, transform);
    }
  }

  return null;
}

function leerCampo(atractivo: Atractivo, campo: ImagenCampo): unknown {
  return (atractivo as unknown as Record<string, unknown>)[campo];
}

/**
 * Devuelve todas las imágenes disponibles del destino (galería completa),
 * ya normalizadas a URLs. VACÍO si el backend aún no manda imágenes.
 */
export function imagenesDe(atractivo: Atractivo): string[] {
  for (const campo of IMAGEN_CAMPOS) {
    const valor = leerCampo(atractivo, campo);

    if (Array.isArray(valor)) {
      const lista = valor
        .map((item) => normalizar(item, CLOUDINARY_TRANSFORM.detalle))
        .filter((url): url is string => Boolean(url));

      if (lista.length > 0) {
        return Array.from(new Set(lista));
      }

      continue;
    }

    const url = normalizar(valor, CLOUDINARY_TRANSFORM.detalle);

    if (url) {
      return [url];
    }
  }

  return [];
}

/** Imagen de portada para la card del catálogo. `null` si no hay. */
export function portadaDe(atractivo: Atractivo): string | null {
  return imagenesDe(atractivo)[0] ?? null;
}

/**
 * Paleta de marcador por categoría. No introduce colores nuevos: reusa
 * las variables de `index.css` (naturaleza andina, tierra y cultura).
 */
export const PLACEHOLDER_POR_CATEGORIA: Record<string, [string, string]> = {
  Aventura: ["#2f4b3b", "#6f8064"],
  "Gastronomía": ["#9a5b3c", "#c6923b"],
  Cultura: ["#5b3a29", "#9a5b3c"],
  Miradores: ["#233128", "#2f4b3b"],
  Naturaleza: ["#6f8064", "#c6923b"],
  Arqueología: ["#8d4f32", "#5b3a29"],
};

const PLACEHOLDER_GENERICO: [string, string] = ["#2f4b3b", "#9a5b3c"];

/** Paradas del gradiente determinista para un destino sin imagen. */
export function gradienteDe(categoria: string | null): [string, string] {
  if (categoria && categoria in PLACEHOLDER_POR_CATEGORIA) {
    return PLACEHOLDER_POR_CATEGORIA[categoria];
  }

  return PLACEHOLDER_GENERICO;
}

/**
 * Hash estable del id → número. Permite que cada destino sin imagen
 * tenga un matiz distinto en lugar de repetir siempre el mismo bloque.
 */
export function hashEstable(valor: string): number {
  let hash = 0;

  for (let i = 0; i < valor.length; i += 1) {
    hash = (hash << 5) - hash + valor.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

/** Ángulo (en grados) derivado del id, para que el placeholder varíe. */
export function anguloDe(valor: string): number {
  return hashEstable(valor) % 360;
}
