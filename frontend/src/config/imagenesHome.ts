/**
 * Colección visual de la portada servida desde Cloudinary.
 *
 * Las fotografías se suben con `python manage.py importar_branding_home`
 * bajo `branding/home/` y conservan autoría, licencia y fuente en el
 * contexto del recurso de Cloudinary. La entrega usa `f_auto` para dar
 * AVIF/WebP según el navegador y `q_auto` para no penalizar el peso.
 *
 * El nombre del cloud es público; si el build no define la variable de
 * entorno se usa el valor del entorno de producción conocido.
 */

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "turismopro";
const BASE = `https://res.cloudinary.com/${CLOUD}/image/upload`;

function foto(publicId: string, ancho: number): string {
  return `${BASE}/f_auto,q_auto,w_${ancho}/${publicId}`;
}

export const FOTOS_HOME = {
  hero: foto("branding/home/hero-teleferico-rojo", 1920),
  panorama: foto("branding/home/panorama-la-paz", 1600),
  valle: foto("branding/home/valle-de-la-luna", 1200),
  tiwanaku: foto("branding/home/tiwanaku-puerta-del-sol", 1200),
  copacabana: foto("branding/home/copacabana-titicaca", 1200),
  coroico: foto("branding/home/cascada-coroico", 1200),
  cholitas: foto("branding/home/cultura-cholitas", 1000),
  saltenas: foto("branding/home/gastronomia-saltenas", 1000),
  llama: foto("branding/home/llama-altiplano", 1000),
  teleferico: foto("branding/home/teleferico-vertical", 1000),
} as const;
