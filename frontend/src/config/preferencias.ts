/**
 * Configuración del formulario de preferencias y restricciones del turista.
 *
 * `API_BASE_URL` ya apunta a `/api` (ver `config/auth.ts`), así que los
 * endpoints empiezan sin el prefijo `/api`:
 *
 * - `/api/preferences/` → `MisPreferenciasViewSet` (issue #22).
 * - `/api/recomendaciones/consultas/` → `ConsultaRecomendacionViewSet`.
 */

import type { PreferenciasFormValues, UnidadDuracion } from "../types/preferencias";

export const PREFERENCIAS_ENDPOINTS = {
  /** GET lista las preferencias propias; POST crea una. */
  misPreferencias: "/preferences/",
  /** PATCH/DELETE de una preferencia propia (`id` sintético). */
  preferenciaDetalle: (id: number) => `/preferences/${id}/`,
  /** POST de las restricciones duras del recorrido. */
  consultas: "/recomendaciones/consultas/",
} as const;

/**
 * Clave del borrador en `localStorage`.
 *
 * El formulario se guarda temporalmente aquí en cada cambio (con un pequeño
 * debounce) para que el turista no pierda lo escrito al recargar o navegar.
 * Al guardar en el backend o al descartar, la clave se elimina.
 */
export const PREFERENCIAS_DRAFT_KEY = "turismo_preferencias_borrador";

/** Retraso de la escritura en `localStorage` para no escribir por pulsación. */
export const PREFERENCIAS_STORAGE_DEBOUNCE_MS = 350;

/**
 * Presupuesto tope en bolivianos.
 *
 * `ConsultaRecomendacion.presupuesto_bob` es `max_digits=10`, así que el tope
 * del slider (Bs 5000) es una decisión de producto, no una restricción del
 * backend. El backend valida `>= 0`.
 */
export const PRESUPUESTO_BOB = {
  min: 0,
  max: 5000,
  paso: 50,
  porDefecto: 500,
  presets: [0, 100, 250, 500, 1000, 2000, 5000] as const,
} as const;

/**
 * Duración de la visita.
 *
 * `ConsultaRecomendacion.tiempo_horas` es `max_digits=4, decimal_places=2`
 * (máximo 99.99 h) y el backend exige `> 0`. El formulario permite expresar
 * el tiempo en horas o en días (1 día = 24 h), pero siempre se envía en horas.
 */
export const DURACION = {
  /** Tope del formulario en horas (mantiene 4 días con holgura). */
  maxHoras: 96,
  horas: {
    min: 1,
    max: 24,
    paso: 1,
    presets: [1, 2, 4, 6, 8, 12] as const,
  },
  dias: {
    min: 0.5,
    max: 4,
    paso: 0.5,
    presets: [0.5, 1, 2, 3, 4] as const,
  },
  porDefecto: { valor: 4, unidad: "horas" as UnidadDuracion },
} as const;

/**
 * Área geográfica de La Paz aceptada por el backend (El Alto–Mallasa).
 *
 * Replica exactamente el bbox de `recomendaciones/serializers.py` para avisar
 * en el cliente antes de enviar. La validación del servidor sigue siendo la
 * que manda: este límite solo da feedback inmediato.
 */
export const LA_PAZ_BBOX = {
  longitud: { min: -68.3, max: -67.9 },
  latitud: { min: -16.75, max: -16.3 },
} as const;

/** Estado inicial del formulario (antes de cualquier interacción). */
export const BORRADOR_INICIAL: PreferenciasFormValues = {
  categorias: [],
  presupuestoBob: PRESUPUESTO_BOB.porDefecto,
  duracionValor: DURACION.porDefecto.valor,
  duracionUnidad: DURACION.porDefecto.unidad,
  latitud: "",
  longitud: "",
};

/** Configuración del slider según la unidad activa. */
export function limitesDuracion(unidad: UnidadDuracion) {
  return unidad === "dias" ? DURACION.dias : DURACION.horas;
}
