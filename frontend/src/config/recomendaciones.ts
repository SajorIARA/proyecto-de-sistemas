/**
 * Configuración de la pantalla de recomendaciones y del asistente.
 *
 * `API_BASE_URL` ya apunta a `/api` (ver `config/auth.ts`), así que el
 * endpoint empieza sin el prefijo `/api` y resuelve contra
 * `/api/recomendaciones/recomendar/` en el proxy de nginx.
 *
 * El chat todavía no tiene endpoint propio en el backend (issue #28). La
 * capa del cliente puede apuntar a uno futuro con `VITE_ASISTENTE_CHAT_URL`;
 * mientras no exista, responde un motor local determinista con el contexto
 * del ranking y del perfil.
 */

export const RECOMENDACIONES_ENDPOINTS = {
  /** POST del motor multicriterio (issue #27). */
  recomendar: "/recomendaciones/recomendar/",
} as const;

/** Valores por defecto del panel de búsqueda. */
export const RECOMENDACIONES_POR_DEFECTO = {
  radioKm: 15,
  topK: 8,
  radiosKm: [5, 10, 15, 25, 40] as const,
  topKs: [5, 8, 10, 15] as const,
} as const;

/**
 * Estimación de traslado urbano.
 *
 * El backend solo entrega `distancia_km`; para que el turista vea un total
 * realista se estima un viaje de ida y vuelta con una tarifa referencial de
 * taxi/transporte. No pretende ser una tarifa oficial: la pantalla lo rotula
 * como estimación.
 */
export const TRASLADO = {
  tarifaPorKmBob: 3,
  tarifaMinimaBob: 5,
  velocidadPromedioKmH: 18,
  minutosBase: 5,
} as const;

/**
 * Ritmo de la respuesta progresiva del asistente.
 *
 * `pausaPensandoMs` simula el estado de carga mientras se arma la respuesta;
 * luego el texto aparece por lotes para dar la sensación de escritura sin
 * bloquear la interfaz.
 */
export const ASISTENTE = {
  /** Endpoint opcional del RAG cuando el backend lo exponga. */
  endpoint: import.meta.env.VITE_ASISTENTE_CHAT_URL?.trim() || "",
  pausaPensandoMs: 620,
  velocidadReveladoMs: 16,
  caracteresPorPaso: 3,
} as const;
