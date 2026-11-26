/**
 * Endpoints del panel de fuentes del dominio de conocimiento.
 *
 * `API_BASE_URL` ya apunta a `/api`: la UI **nunca** llama a Overpass,
 * Wikidata ni Google. Todo pasa por el backend, que aplica `IsAdmin`.
 */

export const CONOCIMIENTO_ENDPOINTS = {
  importaciones: "/conocimiento/admin/importaciones/",
  importacion: (id: string) => `/conocimiento/admin/importaciones/${id}/`,
  candidatos: (id: string) =>
    `/conocimiento/admin/importaciones/${id}/candidatos/`,
  vectorizar: (id: string) =>
    `/conocimiento/admin/importaciones/${id}/vectorizar/`,
  aprobar: (id: string) => `/conocimiento/admin/candidatos/${id}/aprobar/`,
  rechazar: (id: string) => `/conocimiento/admin/candidatos/${id}/rechazar/`,
} as const;

/** Fuentes abiertas permitidas por el backend (sin Google Maps). */
export const FUENTES_ABIERTAS = [
  { id: "overpass", etiqueta: "OpenStreetMap / Overpass" },
  { id: "wikidata", etiqueta: "Wikidata" },
] as const;

export type FuenteAbierta = (typeof FUENTES_ABIERTAS)[number]["id"];

/** El backend solo conoce estos bounding boxes (ver `fuentes_abiertas.py`). */
export const CIUDADES_IMPORTACION = ["La Paz", "El Alto"] as const;

export const LIMITE_IMPORTACION = { min: 1, max: 50, defecto: 20 } as const;

/** El backend devuelve un array plano de las últimas 50 importaciones. */
export const IMPORTACIONES_PAGE_SIZE = 5;

/** Poll suave mientras haya una vectorización pendiente. */
export const POLLING_VECTORIZACION_MS = 4000;
