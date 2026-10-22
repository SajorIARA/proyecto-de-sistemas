/**
 * Contrato de datos de las preferencias y restricciones del turista
 * (issue #22 en backend, issue #23 en el cliente).
 *
 * Refleja tres serializers de Django REST:
 *
 * 1. `UsuarioPreferenciaSerializer` / `MiPreferenciaSerializer`
 *    (`/api/preferences/`): una fila por categoría de interés.
 * 2. `ConsultaRecomendacionSerializer` (`/api/recomendaciones/consultas/`):
 *    las restricciones duras de un recorrido (presupuesto, tiempo y punto de
 *    partida espacial).
 *
 * El backend es la fuente de verdad: aquí solo se describe lo que la API
 * devuelve hoy, sin exigir cambios en Django.
 */

/** Unidad con la que el turista expresa la duración de su visita. */
export type UnidadDuracion = "horas" | "dias";

/**
 * Fila de `UsuarioPreferencia`.
 *
 * La PK compuesta (usuario, categoría) se representa con un `id` sintético:
 * `DELETE /api/preferences/:id/` borra esa combinación.
 */
export interface PreferenciaUsuario {
  id: number;
  /** UUID del usuario dueño. El backend lo asigna desde el JWT. */
  usuario?: string;
  /** `Categoria.id_categoria`. */
  categoria: number;
  /** Nombre de la categoría, ya resuelto por el serializer (solo lectura). */
  categoria_nombre?: string;
  /** Nivel de interés entre 0.00 y 1.00 (DecimalField serializado). */
  nivel_interes: string | number;
  fecha_registro?: string;
}

/**
 * Cuerpo aceptado por `POST /api/preferences/`.
 * `usuario` es de solo lectura: lo impone el backend con el JWT.
 */
export interface PreferenciaInput {
  categoria: number;
  /** 0.00–1.00. Las categorías elegidas viajan con 1.00. */
  nivel_interes?: string | number;
}

/**
 * Fila de `ConsultaRecomendacion`.
 *
 * En lectura `punto_partida` llega como WKT (`SRID=4326;POINT (lon lat)`);
 * en escritura se manda como GeoJSON `{coordinates: [lon, lat]}`.
 */
export interface ConsultaRecomendacion {
  id_consulta: string;
  presupuesto_bob: string | number;
  tiempo_horas: string | number;
  punto_partida: string;
  macrodistrito: string | null;
  fecha_consulta: string;
}

/** Cuerpo aceptado por `POST /api/recomendaciones/consultas/`. */
export interface ConsultaInput {
  /** Tope en bolivianos. El backend rechaza negativos. */
  presupuesto_bob: number;
  /** Tiempo en horas. El backend rechaza `<= 0`. */
  tiempo_horas: number;
  /** [longitud, latitud] dentro del área de La Paz (bbox del backend). */
  punto_partida: { coordinates: [number, number] };
  macrodistrito?: string;
}

/**
 * Estado del formulario de preferencias.
 *
 * Los campos de texto de la ubicación se guardan como **texto** para que el
 * turista pueda escribir una coordenada a medio completar sin que el `number`
 * intermedio se convierta en `NaN`. La conversión a número se hace solo al
 * validar y al construir el payload.
 */
export interface PreferenciasFormValues {
  /** `id_categoria` seleccionados. */
  categorias: number[];
  /** Presupuesto tope en bolivianos. */
  presupuestoBob: number;
  /** Cantidad de horas o días según `duracionUnidad`. */
  duracionValor: number;
  duracionUnidad: UnidadDuracion;
  /** Latitud / longitud de partida en texto (pueden estar vacías). */
  latitud: string;
  longitud: string;
  /** Macrodistrito seleccionado manualmente (opcional). */
  macrodistrito: string;
}
