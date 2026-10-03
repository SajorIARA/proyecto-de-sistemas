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

  /**
   * CRUD de destinos (`AtractivoAdminViewSet`, `IsAdmin`). Es un
   * `ModelViewSet`, así que expone POST, GET, PUT/PATCH y DELETE. El
   * DELETE es una **baja lógica** (`activo = false`), no borra la fila.
   *
   * El listado no admite filtros ni búsqueda en el backend
   * (`AtractivoAdminViewSet` no define `filter_backends` ni `get_queryset`),
   * así que el buscador del panel se resuelve en el cliente.
   */
  atractivoAdminList: "/turismo/admin/atractivos/",
  atractivoAdminDetalle: (id: string) => `/turismo/admin/atractivos/${id}/`,
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
 * Tamaño de página del panel de administración de destinos.
 *
 * `AtractivoAdminViewSet` hereda la paginación global del proyecto
 * (`PAGE_SIZE = 20`) y tampoco declara `page_size_query_param`, así que el
 * valor es el tamaño real de página, no una preferencia.
 */
export const ADMIN_DESTINOS_PAGE_SIZE = 20;

/**
 * Límites de la coordenada que el backend valida en `UbicacionField`
 * (`longitud` ±180, `latitud` ±90). Se replican aquí para avisar antes de
 * enviar la petición, sin dejar de mandarla al backend: la validación del
 * servidor es la que manda.
 */
export const RANGO_COORDENADA = {
  longitud: { min: -180, max: 180 },
  latitud: { min: -90, max: 90 },
} as const;

/** `Atractivo.nombre` es `CharField(max_length=200)`. */
export const NOMBRE_MAX = 200;

/** `Atractivo.direccion` es `CharField(max_length=300)`. */
export const DIRECCION_MAX = 300;

/** `Atractivo.fuente_origen` es `CharField(max_length=100)`. */
export const FUENTE_ORIGEN_MAX = 100;

/**
 * `Atractivo.duracion_minutos` está protegido por el CHECK de base de datos
 * `duracion_minutos > 0 OR NULL`, pero `AtractivoAdminSerializer` **no**
 * replica ese CHECK con un `min_value` (a diferencia de `Tarifa.monto`).
 *
 * Consecuencia real, verificada en vivo: mandar `0` hace que Postgres rechace
 * el INSERT/UPDATE y Django devuelva un **500** con el traceback completo, en
 * vez de un 400 con un mensaje de validación. Por eso el formulario trata
 * cualquier valor `<= 0` como "sin duración" y envía `null` en su lugar.
 */
export const DURACION_MIN_MINUTOS = 1;

/** Valor por defecto de `fuente_origen` en el modelo. */
export const FUENTE_ORIGEN_POR_DEFECTO = "INSTITUCIONAL";

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
