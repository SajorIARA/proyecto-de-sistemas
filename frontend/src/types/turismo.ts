/**
 * Contrato de datos del catálogo de destinos (app `turismo` de Django).
 *
 * Refleja `AtractivoSerializer`, `CategoriaSerializer`, `HorarioSerializer`
 * y `TarifaSerializer`. El backend es la fuente de verdad: estos tipos solo
 * describen lo que la API devuelve hoy, sin exigir ningún cambio en Django.
 */

/** Punto PostGIS serializado por el backend como {longitud, latitud}. */
export interface Coordenada {
  longitud: number;
  latitud: number;
}

/** Anillo del polígono `area`, o null si el destino no tiene área. */
export type Anillo = number[][];

export interface Atractivo {
  /** UUID del backend (viene de `id_atractivo`). */
  id: string;
  nombre: string;
  descripcion: string;
  direccion: string | null;
  /** Duración de la visita en minutos, o null si no está registrada. */
  duracion_minutos: number | null;
  ubicacion: Coordenada | null;
  area: Anillo | null;
  /** Nombres de las categorías activas del destino (puede venir vacío). */
  categorias: string[];
  fuente_origen: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

/**
 * Nombres de campo opcionales de imagen que el backend puede empezar a
 * enviar cuando integre Cloudinary. El frontend los consume si aparecen y,
 * mientras tanto, cae en un placeholder de marca.
 * Ver `features/turismo/utils/destinoImages`.
 */
export type ImagenCampo =
  | "imagen"
  | "imagen_url"
  | "imagenes"
  | "galeria"
  | "foto"
  | "foto_url"
  | "portada"
  | "cloudinary_id"
  | "public_id";

export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Horario {
  id_horario: number;
  /** UUID del atractivo. El backend no filtra por este campo (ver api). */
  atractivo: string | number | null;
  /** 1 = lunes … 7 = domingo. */
  dia_semana: number;
  hora_apertura: string | null;
  hora_cierre: string | null;
  cerrado: boolean;
  vigente_desde: string | null;
  vigente_hasta: string | null;
}

export interface Tarifa {
  id_tarifa: number;
  /** UUID del atractivo. El backend no filtra por este campo (ver api). */
  atractivo: string | number | null;
  tipo_tarifa: number;
  tipo_tarifa_nombre: string;
  /**
   * Decimal de Django. DRF lo serializa como string por defecto
   * (COERCE_DECIMAL_TO_STRING), pero algunos clientes lo delivers como
   * número: por eso el formateo de moneda tolera ambos.
   */
  monto: string | number;
  moneda: string;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  observacion: string | null;
}

/** Facetas del panel de filtros (`/atractivos/facetas/`). */
export interface Facetas {
  total_atractivos: number;
  categorias: { id_categoria: number; nombre: string; total: number }[];
  precios_bob: { min: number | null; max: number | null; promedio: number | null };
}

/** Envoltura de DRF PageNumberPagination. */
export interface Paginado<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Fila combinando un destino con sus datos derivados para la card. */
export interface DestinoCard {
  atractivo: Atractivo;
  categoriaPrincipal: string | null;
}
