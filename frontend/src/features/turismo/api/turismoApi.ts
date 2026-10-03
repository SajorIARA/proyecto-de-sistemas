/**
 * Cliente del catálogo de destinos sobre el `api` de axios ya configurado
 * (interceptor de JWT + refresh en `src/api/http.ts`).
 *
 * Dos detalles del backend condicionan este módulo:
 *
 * 1. `AtractivoViewSet` pagina con PageNumberPagination (PAGE_SIZE=20) y
 *    devuelve `{count, next, previous, results}`. Los endpoints de
 *    `horarios` y `tarifas` también heredan la paginación global.
 * 2. El proyecto NO define `DEFAULT_FILTER_BACKENDS` en
 *    `config/settings.py`, así que `?atractivo=<uuid>` en `/horarios/` y
 *    `/tarifas/` se IGNORA y llega la lista completa. Por eso
 *    `listarHorariosDe` / `listarTarifasDe` traen todas las páginas y
 *    filtran en el cliente. Esto no requiere ningún cambio en Django.
 */

import { api } from "../../../api/http";
import {
  CATALOGO_PAGE_SIZE,
  TURISMO_ENDPOINTS,
} from "../../../config/turismo";
import type {
  Atractivo,
  Categoria,
  Facetas,
  Horario,
  Paginado,
  Tarifa,
} from "../../../types/turismo";

/**
 * Tope de páginas seguidas al recorrer `next`. Es una red de seguridad
 * contra un bucle infinito si el backend devolviera un `next` que
 * apunta a la misma página; con el dataset actual (8 destinos) bastan
 * unas pocas páginas.
 */
const MAX_PAGINAS = 25;

/** Error de la API con el status HTTP disponible. */
export class TurismoApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TurismoApiError";
    this.status = status;
  }

  /** El destino no existe (o fue dado de baja). */
  get esNoEncontrado(): boolean {
    return this.status === 404;
  }
}

function mensajeDesdeError(error: unknown, porDefecto: string): TurismoApiError {
  if (error && typeof error === "object" && "response" in error) {
    const respuesta = (error as { response?: { status?: number; data?: unknown } })
      .response;
    const status = respuesta?.status ?? 0;

    const detalle = respuesta?.data as
      | { detail?: string }
      | string
      | undefined;

    const texto =
      typeof detalle === "string"
        ? detalle
        : typeof detalle?.detail === "string"
          ? detalle.detail
          : porDefecto;

    return new TurismoApiError(texto, status);
  }

  return new TurismoApiError(
    error instanceof Error ? error.message : porDefecto,
    0,
  );
}

/** Normaliza la respuesta paginada de DRF (y tolera un array plano). */
function normalizarPagina<T>(data: unknown): Paginado<T> {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }

  const objeto = (data ?? {}) as Partial<Paginado<T>>;

  return {
    count: typeof objeto.count === "number" ? objeto.count : 0,
    next: objeto.next ?? null,
    previous: objeto.previous ?? null,
    results: Array.isArray(objeto.results) ? objeto.results : [],
  };
}

/**
 * Siguiente número de página según la URL `next` que devuelve DRF.
 * Se parsea la URL en lugar de usar `page + 1` para respetar lo que el
 * backend realmente ofrece.
 */
export function paginaSiguiente(next: string | null): number | undefined {
  if (!next) {
    return undefined;
  }

  try {
    const url = new URL(next, window.location.origin);
    const pagina = url.searchParams.get("page");

    return pagina ? Number(pagina) : undefined;
  } catch {
    return undefined;
  }
}

/** Normaliza un Atractivo para tolerar ids numéricos o ausentes. */
function normalizarAtractivo(atractivo: Atractivo): Atractivo {
  return {
    ...atractivo,
    id: String(atractivo.id ?? ""),
    nombre: atractivo.nombre ?? "Destino sin nombre",
    descripcion: atractivo.descripcion ?? "",
    direccion: atractivo.direccion ?? null,
    duracion_minutos:
      typeof atractivo.duracion_minutos === "number"
        ? atractivo.duracion_minutos
        : Number(atractivo.duracion_minutos ?? 0) || null,
    categorias: Array.isArray(atractivo.categorias) ? atractivo.categorias : [],
    ubicacion: atractivo.ubicacion ?? null,
    area: Array.isArray(atractivo.area) ? atractivo.area : null,
  };
}

export interface ListarAtractivosParams {
  page?: number;
  pageSize?: number;
  /** Nombre o id de categoría. `null`/vacío = sin filtro (Todos). */
  categoria?: string | null;
  /** Búsqueda de texto libre (la API la soporta con `q`). */
  q?: string;
}

/** GET /api/turismo/atractivos/ */
export async function listarAtractivos({
  page = 1,
  pageSize = CATALOGO_PAGE_SIZE,
  categoria = null,
  q = "",
}: ListarAtractivosParams = {}): Promise<Paginado<Atractivo>> {
  try {
    const { data } = await api.get(TURISMO_ENDPOINTS.atractivoList, {
      params: {
        page,
        page_size: pageSize,
        ...(categoria ? { categoria } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      },
    });

    const pagina = normalizarPagina<Atractivo>(data);

    return { ...pagina, results: pagina.results.map(normalizarAtractivo) };
  } catch (error) {
    throw mensajeDesdeError(error, "No pudimos cargar el catálogo de destinos.");
  }
}

/** GET /api/turismo/atractivos/:id/ → 404 si no existe. */
export async function obtenerAtractivo(id: string): Promise<Atractivo> {
  try {
    const { data } = await api.get(TURISMO_ENDPOINTS.atractivoDetalle(id));

    return normalizarAtractivo(data as Atractivo);
  } catch (error) {
    const apiError = mensajeDesdeError(
      error,
      "No pudimos cargar la información de este destino.",
    );

    if (apiError.esNoEncontrado) {
      throw new TurismoApiError(
        "Este destino turístico no existe o ya no está disponible.",
        404,
      );
    }

    throw apiError;
  }
}

/** Recorre todas las páginas de un endpoint paginado. */
async function listarTodo<T>(url: string): Promise<T[]> {
  const acumulado: T[] = [];
  let urlSiguiente: string | null = url;
  let paginas = 0;

  while (urlSiguiente && paginas < MAX_PAGINAS) {
    const respuesta: { data: T[] | Paginado<T> } = await api.get(urlSiguiente, {
      params: urlSiguiente.includes("?") ? undefined : { page_size: 100 },
    });

    const pagina: Paginado<T> = normalizarPagina<T>(respuesta.data);

    acumulado.push(...pagina.results);
    urlSiguiente = pagina.next;
    paginas += 1;
  }

  return acumulado;
}

/** GET /api/turismo/categorias/ (solo las activas: `activo=true`). */
export async function listarCategorias(): Promise<Categoria[]> {
  try {
    const categorias = await listarTodo<Categoria>(
      TURISMO_ENDPOINTS.categorias,
    );

    return categorias.filter((categoria) => categoria.activo !== false);
  } catch (error) {
    throw mensajeDesdeError(error, "No pudimos cargar las categorías.");
  }
}

/**
 * Horarios de un destino. El backend no filtra por `atractivo`, así que
 * se traen todas las páginas y se filtra en el cliente.
 */
export async function listarHorariosDe(id: string): Promise<Horario[]> {
  try {
    const horarios = await listarTodo<Horario>(TURISMO_ENDPOINTS.horarios);

    return horarios.filter((horario) => String(horario.atractivo) === id);
  } catch (error) {
    throw mensajeDesdeError(error, "No pudimos cargar el horario de atención.");
  }
}

/**
 * Tarifas de un destino. Misma limitación que los horarios: sin filtro
 * server-side, se filtra en el cliente.
 */
export async function listarTarifasDe(id: string): Promise<Tarifa[]> {
  try {
    const tarifas = await listarTodo<Tarifa>(TURISMO_ENDPOINTS.tarifas);

    return tarifas.filter((tarifa) => String(tarifa.atractivo) === id);
  } catch (error) {
    throw mensajeDesdeError(error, "No pudimos cargar las tarifas del destino.");
  }
}

/**
 * Facetas del panel de filtros. Tolera que el backend no lo exponga
 * todavía: devuelve `null` en lugar de romper el catálogo.
 */
export async function listarFacetas(): Promise<Facetas | null> {
  try {
    const { data } = await api.get(TURISMO_ENDPOINTS.facetas);

    return data as Facetas;
  } catch {
    return null;
  }
}

export const turismoApi = {
  listarAtractivos,
  obtenerAtractivo,
  listarCategorias,
  listarHorariosDe,
  listarTarifasDe,
  listarFacetas,
};
