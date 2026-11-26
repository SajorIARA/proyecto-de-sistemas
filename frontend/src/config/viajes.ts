/**
 * Rutas de la API de viajes persistidos (`backend/viajes/`).
 *
 * `API_BASE_URL` ya apunta a `/api` (ver `config/auth.ts`), así que las rutas
 * empiezan sin ese prefijo.
 */

export const VIAJES_ENDPOINTS = {
  listar: "/viajes/",
  detalle: (id: string) => `/viajes/${encodeURIComponent(id)}/`,
  iniciar: (id: string) => `${VIAJES_ENDPOINTS.detalle(id)}iniciar/`,
  finalizar: (id: string) => `${VIAJES_ENDPOINTS.detalle(id)}finalizar/`,
  visitada: (id: string, paradaId: number) =>
    `${VIAJES_ENDPOINTS.detalle(id)}paradas/${paradaId}/visitada/`,
} as const;

/** Tope de páginas al recorrer el listado paginado de viajes. */
export const VIAJES_MAX_PAGINAS = 25;
