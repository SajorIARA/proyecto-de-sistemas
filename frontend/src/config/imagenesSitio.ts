/**
 * Fotografías de la portada pública.
 *
 * Todas viven en `images.unsplash.com`, el único host de imágenes
 * externo que la CSP del despliegue permite junto a Cloudinary
 * (ver `frontend/security-headers.conf`). Se piden por ancho y con
 * `auto=format` para que el navegador reciba WebP/AVIF cuando puede.
 *
 * No hay video en la portada: el hero rota entre estas fotografías.
 * Si una imagen cambiara de URL, este archivo es el único punto a
 * tocar.
 */

const ANCHO_HERO = 1800;
const ANCHO_SECCION = 1200;
const ANCHO_TARJETA = 900;

/** Construye una URL de entrega de Unsplash con el ancho indicado. */
export function urlUnsplash(id: string, ancho: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${ancho}&q=78`;
}

/**
 * Identificadores de las fotos usadas. Se exponen por si alguna
 * sección necesita variar el recorte o el ancho.
 */
export const FOTOS = {
  ciudadMirador: "1596395819057-e37f55a8516b",
  ciudadCalle: "1587595431973-160d0d94add1",
  montanasNieve: "1464822759023-fed622ff2c3b",
  montanasNeblina: "1506905925346-21bda4d32df4",
  bosqueNeblina: "1470071459604-3b5ec3a7fe05",
  lagoMontanas: "1501785888041-af3ef285b470",
  mesaSabores: "1504674900247-0877df9cc836",
  restauranteCalido: "1414235077428-338989a2e8c0",
  ruinasAndinas: "1526392060635-9d6019884377",
} as const;

/** Imágenes listas para usar, ya con el ancho de cada contexto. */
export const IMAGENES_SITIO = {
  hero: {
    aventura: urlUnsplash(FOTOS.montanasNieve, ANCHO_HERO),
    cultura: urlUnsplash(FOTOS.ciudadCalle, ANCHO_HERO),
    naturaleza: urlUnsplash(FOTOS.lagoMontanas, ANCHO_HERO),
    gastronomia: urlUnsplash(FOTOS.mesaSabores, ANCHO_HERO),
  },
  categorias: {
    Aventura: urlUnsplash(FOTOS.montanasNieve, ANCHO_TARJETA),
    Gastronomía: urlUnsplash(FOTOS.mesaSabores, ANCHO_TARJETA),
    Cultura: urlUnsplash(FOTOS.ciudadCalle, ANCHO_TARJETA),
    Miradores: urlUnsplash(FOTOS.ciudadMirador, ANCHO_TARJETA),
    Naturaleza: urlUnsplash(FOTOS.bosqueNeblina, ANCHO_TARJETA),
    Arqueología: urlUnsplash(FOTOS.ruinasAndinas, ANCHO_TARJETA),
  },
  gastronomia: urlUnsplash(FOTOS.restauranteCalido, ANCHO_SECCION),
  cierre: urlUnsplash(FOTOS.montanasNeblina, ANCHO_SECCION),
} as const;
