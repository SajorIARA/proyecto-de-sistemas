/**
 * Configuración del catálogo de destinos.
 *
 * `API_BASE_URL` ya apunta a `/api`, así que las rutas empiezan en
 * `/turismo/...` y resuelven contra `/api/turismo/...` en el proxy de
 * nginx (ver `proxy/nginx.conf.template`).
 */

export const TURISMO_ENDPOINTS = {
  atractivoList: "/turismo/atractivos/",
  atractivoDetalle: (id: string) => `/turismo/atractivos/${id}/`,
  facetas: "/turismo/atractivos/facetas/",
  categorias: "/turismo/categorias/",
  horarios: "/turismo/horarios/",
  tarifas: "/turismo/tarifas/",
} as const;

/**
 * Tamaño de página del catálogo.
 *
 * El backend usa `PageNumberPagination` con `PAGE_SIZE = 20`
 * (`config/settings.py`) y NO tiene `page_size_query_param`, así que hoy
 * ignora cualquier `?page_size=` que le mandemos y devuelve siempre 20.
 * Dejamos el valor en 20 para que los skeletons y la cuadrícula coincidan
 * con lo que llega, y el `page_size` se sigue enviando por si el backend
 * activa el parámetro en el futuro.
 */
export const CATALOGO_PAGE_SIZE = 20;

/**
 * Las 6 categorías oficiales definidas por el Product Owner, en el orden
 * exacto en que deben aparecer en los filtros. "Todos" es el estado
 * inicial y NO viaja como parámetro (equivale a no filtrar).
 */
export const CATEGORIAS_OFICIALES = [
  "Aventura",
  "Gastronomía",
  "Cultura",
  "Miradores",
  "Naturaleza",
  "Arqueología",
] as const;

export type CategoriaOficial = (typeof CATEGORIAS_OFICIALES)[number];

/** Etiqueta del chip que muestra todos los destinos. */
export const CATEGORIA_TODOS = "Todos";

/**
 * Verifica si un valor es una de las 6 categorías oficiales. Se usa para
 * validar el parámetro `?categoria=` de la URL antes de mandarlo al
 * backend, de modo que un valor inventado no genere un filtro inválido.
 */
export function esCategoriaOficial(valor: string | null): valor is CategoriaOficial {
  return (
    valor !== null &&
    (CATEGORIAS_OFICIALES as readonly string[]).includes(valor)
  );
}

/**
 * Cloudinary: nombre del cloud usado para armar URLs de entrega cuando el
 * backend manda un public_id suelto. Si el backend manda una URL absoluta
 * (ya firmada o con transformaciones) se respeta tal cual y esto no se usa.
 */
export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() || "";

/** Anchos generados por Cloudinary para cards y galería. */
export const CLOUDINARY_TRANSFORM = {
  card: "f_auto,q_auto,w_800,h_600,c_fill,g_auto",
  detalle: "f_auto,q_auto,w_1600,h_1000,c_fill,g_auto",
  miniatura: "f_auto,q_auto,w_320,h_240,c_fill,g_auto",
} as const;

/**
 * Días de la semana en el formato de `Horario.dia_semana`
 * (1 = lunes … 7 = domingo, validado por `ck_horario_dia`).
 */
export const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const NOMBRE_DIA = (dia: number): string =>
  DIAS_SEMANA[dia - 1] ?? `Día ${dia}`;
