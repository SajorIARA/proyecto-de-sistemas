/**
 * Contrato del motor de recomendación y del asistente de viaje.
 *
 * Refleja `RecomendacionRequestSerializer` y `RecomendacionResponseSerializer`
 * de `backend/recomendaciones/serializers.py`. El backend es la fuente de
 * verdad: aquí solo se describe lo que la API devuelve hoy.
 *
 * El porcentaje de afinidad que ve el turista se deriva de `puntaje` (0–1);
 * el desglose de dinero suma el costo de entrada (`costo_bob`) más una
 * estimación de traslado calculada en el cliente, porque el motor solo
 * entrega `distancia_km`.
 */

import type { UnidadDuracion } from "./preferencias";

/** Punto de partida en GeoJSON: `[longitud, latitud]`. */
export interface PuntoPartidaGeo {
  coordinates: [number, number];
}

/** Cuerpo aceptado por `POST /api/recomendaciones/recomendar/`. */
export interface RecomendacionInput {
  /** Tope en bolivianos. El backend exige `>= 0`. */
  presupuesto_bob: number;
  /** Tiempo disponible en horas. El backend exige `> 0`. */
  tiempo_horas: number;
  /** Debe caer dentro del bbox de La Paz (El Alto–Mallasa). */
  punto_partida: PuntoPartidaGeo;
  /** Radio de búsqueda en km (0.1–50). Por defecto 15. */
  radio_km?: number;
  /** Tamaño del Top-K (1–50). Por defecto 10 en el backend. */
  top_k?: number;
  /**
   * Mapa `{ "Cultura": 0.9 }`. Si se omite, el backend usa las preferencias
   * guardadas del usuario autenticado.
   */
  preferencias?: Record<string, number>;
  macrodistrito?: string;
}

/**
 * Motivos de penalización que hoy emite el motor (issue #26).
 *
 * Se deja abierto a `string` para no romper la pantalla si el backend
 * agrega nuevos motivos.
 */
export type MotivoRecomendacion =
  | "presupuesto_excedido"
  | "tiempo_excedido"
  | (string & {});

/** Un destino del Top-K con su puntaje explicable. */
export interface Recomendacion {
  /** UUID del atractivo (`Atractivo.id_atractivo`). */
  id_atractivo: string;
  nombre: string;
  /** Puntaje final 0–1 ya penalizado por el motor. */
  puntaje: number;
  /** Coincidencia con las categorías de interés, 0–1. */
  afinidad_categoria: number;
  /** Cercanía al punto de partida, 0–1. */
  proximidad: number;
  /** Holgura de presupuesto, 0–1. */
  holgura_presupuesto: number;
  /** Holgura de tiempo, 0–1. */
  holgura_tiempo: number;
  /** Distancia esférica desde el punto de partida, en km. */
  distancia_km: number;
  /** Producto de las penalizaciones aplicadas (1 si no hay ninguna). */
  factor_penalizacion: number;
  /** `false` si excede presupuesto o tiempo. */
  viable: boolean;
  motivos: MotivoRecomendacion[];
  categorias: string[];
  /** Tarifa mínima vigente en BOB (0 si el destino es gratuito). */
  costo_bob: number;
  /** Duración estimada de la visita, en horas. */
  duracion_horas: number;
  latitud: number;
  longitud: number;
}

/** Respuesta de `POST /api/recomendaciones/recomendar/`. */
export interface RespuestaRecomendaciones {
  id_consulta: string | null;
  generado_en: string;
  total_activos: number;
  total_evaluados: number;
  total_recomendaciones: number;
  radio_km: number;
  top_k: number;
  recomendaciones: Recomendacion[];
}

/** Estado editable del perfil con el que se pide el ranking. */
export interface PerfilBusqueda {
  presupuestoBob: number;
  duracionValor: number;
  duracionUnidad: UnidadDuracion;
  /** Nombre del macrodistrito elegido; vacío si es un punto guardado. */
  macrodistrito: string;
  latitud: number;
  longitud: number;
  radioKm: number;
  topK: number;
}

/** Rol de un mensaje en la ventana del asistente. */
export type RolMensaje = "usuario" | "asistente";

/** Mensaje de la conversación local con el asistente. */
export interface MensajeAsistente {
  id: string;
  rol: RolMensaje;
  texto: string;
  /** `true` mientras el texto se revela de forma progresiva. */
  escribiendo?: boolean;
}

/** Contexto que recibe el generador de respuestas del asistente. */
export interface ContextoAsistente {
  recomendaciones: Recomendacion[];
  perfil: PerfilBusqueda;
}
