/**
 * Fotografías de la portada pública y del panel de acceso.
 *
 * Todas son fotografías reales de Bolivia con licencia libre (CC0,
 * CC BY o CC BY-SA), descargadas de Wikimedia Commons y servidas desde
 * `frontend/public/images/`. Al auto-hospedarlas no dependemos de hosts
 * externos y la CSP solo necesita `img-src 'self'`
 * (ver `frontend/security-headers.conf`).
 *
 * La autoría y la licencia de cada archivo están en
 * `frontend/public/images/CREDITOS.md`. Si una foto cambia, este archivo
 * y ese documento son los únicos puntos a tocar.
 *
 * No hay video en la portada: el hero rota entre estas fotografías.
 */

export interface FotoSitio {
  /** Ruta pública servida por Vite/nginx. */
  src: string;
  /** Texto alternativo descriptivo y específico de la escena. */
  alt: string;
}

function foto(src: string, alt: string): FotoSitio {
  return { src, alt };
}

const RUTA = "/images";

/** Imágenes listas para usar, con su texto alternativo. */
export const IMAGENES_SITIO = {
  hero: {
    aventura: foto(
      `${RUTA}/hero-aventura.jpg`,
      "Huayna Potosí nevado al atardecer, en la Cordillera Real de Bolivia",
    ),
    cultura: foto(
      `${RUTA}/hero-cultura.jpg`,
      "Plaza San Francisco y su basílica en el centro histórico de La Paz",
    ),
    naturaleza: foto(
      `${RUTA}/hero-naturaleza.jpg`,
      "Formaciones de arcilla del Valle de la Luna, cerca de La Paz",
    ),
    gastronomia: foto(
      `${RUTA}/hero-gastronomia.jpg`,
      "Plato paceño con choclo, habas, papa, queso frito y llajua",
    ),
  },
  categorias: {
    Aventura: foto(
      `${RUTA}/cat-aventura.jpg`,
      "Nevado Huayna Potosí, destino de montaña en La Paz",
    ),
    Gastronomía: foto(
      `${RUTA}/cat-gastronomia.jpg`,
      "Salteña boliviana recién horneada, abierta sobre un plato",
    ),
    Cultura: foto(
      `${RUTA}/cat-cultura.jpg`,
      "Fachada de la Basílica de San Francisco en La Paz",
    ),
    Miradores: foto(
      `${RUTA}/cat-miradores.jpg`,
      "Vista de la hoyada de La Paz desde el mirador Killi Killi",
    ),
    Naturaleza: foto(
      `${RUTA}/cat-naturaleza.jpg`,
      "Arcillas erosionadas del Valle de la Luna en el altiplano",
    ),
    Arqueología: foto(
      `${RUTA}/cat-arqueologia.jpg`,
      "Puerta del Sol del templo de Kalasasaya en Tiwanaku",
    ),
  },
  gastronomia: foto(
    `${RUTA}/banner-gastronomia.jpg`,
    "Comedor popular del Mercado Rodríguez en La Paz",
  ),
  cierre: foto(
    `${RUTA}/cierre-atardecer.jpg`,
    "Ciudad de La Paz iluminada al atardecer",
  ),
} as const;

/** Foto del panel lateral de login y registro. */
export const FOTO_ACCESO = foto(
  `${RUTA}/auth-illimani.jpg`,
  "El Illimani con luna llena sobre La Paz",
);
