/**
 * Hooks del catálogo de destinos sobre TanStack Query.
 *
 * Decisiones de caché motivadas por el `AnonRateThrottle` del backend
 * (100 req/hora para visitantes anónimos, `config/settings.py`):
 *
 * - `useCatalogo` pagina de 9 en 9 y cachea 2 minutos.
 * - `useHorariosDestino` / `useTarifasDestino` cachean 10 minutos porque
 *   cada visita al detalle puede recorrer varias páginas del endpoint
 *   (el backend no filtra por `atractivo`, ver `turismoApi`).
 * - `staleTime` alto + `retry` acotado evitan ráfagas de peticiones.
 */

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  listarAtractivos,
  listarAtractivosCercanos,
  listarCategorias,
  listarFacetas,
  listarHorariosDe,
  listarTarifasDe,
  obtenerAtractivo,
  TurismoApiError,
} from "../api/turismoApi";
import type { Atractivo, FiltrosCatalogo } from "../../../types/turismo";

/** Claves centralizadas para invalidar sin repetir strings. */
export const KeysTurismo = {
  catalogo: (filtros: FiltrosCatalogo) =>
    ["turismo", "atractivos", filtros] as const,
  cercanos: (lat: number, lon: number, radio: number) =>
    ["turismo", "atractivos", "cercanos", lat, lon, radio] as const,
  atractivo: (id: string) => ["turismo", "atractivo", id] as const,
  horarios: (id: string) => ["turismo", "horarios", id] as const,
  tarifas: (id: string) => ["turismo", "tarifas", id] as const,
  categorias: () => ["turismo", "categorias"] as const,
  facetas: () => ["turismo", "facetas"] as const,
};

const CATALOGO_STALE_MS = 2 * 60 * 1000;
const RELACIONADO_STALE_MS = 10 * 60 * 1000;

/** Número de página siguiente según la URL `next` que devuelve DRF. */
function paginaDesdeNext(next: string | null): number | undefined {
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

export interface UseCatalogoParams extends Partial<FiltrosCatalogo> {}

/**
 * Catálogo paginado con scroll infinito.
 *
 * Recibe los filtros combinados del panel (categoría, texto, zona y rango de
 * precio en BOB) y los pasa tal cual al cliente HTTP, que los traduce a los
 * query params de Django REST. `placeholderData: keepPreviousData` mantiene la
 * cuadrícula anterior visible mientras llega el nuevo resultado, en vez de
 * parpadear a esqueletos en cada cambio de filtro.
 *
 * Devuelve las páginas aplanadas más el estado de paginación, para que la
 * página controle el IntersectionObserver y el botón "Cargar más".
 */
export function useCatalogo({
  categoria = null,
  q = "",
  zona = null,
  precioMin = null,
  precioMax = null,
}: UseCatalogoParams = {}) {
  const filtros: FiltrosCatalogo = {
    categoria,
    q,
    zona,
    precioMin,
    precioMax,
  };

  const consulta = useInfiniteQuery({
    queryKey: KeysTurismo.catalogo(filtros),
    queryFn: ({ pageParam }) =>
      listarAtractivos({ page: pageParam, ...filtros }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => paginaDesdeNext(ultima.next),
    staleTime: CATALOGO_STALE_MS,
    placeholderData: keepPreviousData,
  });

  const destinos: Atractivo[] =
    consulta.data?.pages.flatMap((pagina) => pagina.results) ?? [];

  // `count` del backend es el total real; si aún no hay páginas, 0.
  let total = 0;

  if (consulta.data && consulta.data.pages.length > 0) {
    total = consulta.data.pages[0].count;
  }

  return {
    ...consulta,
    destinos,
    total,
    hayMas: consulta.hasNextPage,
    cargandoMas: consulta.isFetchingNextPage,
    recargar: consulta.refetch,
  };
}

/** Detalle de un destino. Lanza `TurismoApiError` con status 404. */
export function useDestino(id: string) {
  return useQuery({
    queryKey: KeysTurismo.atractivo(id),
    queryFn: () => obtenerAtractivo(id),
    enabled: Boolean(id),
    staleTime: CATALOGO_STALE_MS,
    // Un 404 no se reintenta: el destino no va a aparecer.
    retry: (intentos, error) =>
      !(error instanceof TurismoApiError && error.esNoEncontrado) && intentos < 1,
  });
}

/** Horarios de atención del destino. */
export function useHorariosDestino(id: string) {
  return useQuery({
    queryKey: KeysTurismo.horarios(id),
    queryFn: () => listarHorariosDe(id),
    enabled: Boolean(id),
    staleTime: RELACIONADO_STALE_MS,
  });
}

/** Tarifas oficiales del destino. */
export function useTarifasDestino(id: string) {
  return useQuery({
    queryKey: KeysTurismo.tarifas(id),
    queryFn: () => listarTarifasDe(id),
    enabled: Boolean(id),
    staleTime: RELACIONADO_STALE_MS,
  });
}

/**
 * Categorías activas del catálogo.
 *
 * El catálogo público las obtiene de `/atractivos/facetas/`, pero el panel de
 * administración necesita los **ids** (`AtractivoAdminSerializer.categorias`
 * viaja como `number[]`) y las facetas los traen en un formato distinto. Esta
 * consulta va directo a `/turismo/categorias/`, que además pagina, por eso el
 * `staleTime` largo: cambiaron muy pocas veces en la vida del proyecto.
 */
export function useCategorias() {
  return useQuery({
    queryKey: KeysTurismo.categorias(),
    queryFn: listarCategorias,
    staleTime: RELACIONADO_STALE_MS,
  });
}

/**
 * Facetas del panel de filtros (`/atractivos/facetas/`): conteo por categoría y
 * rango de precios BOB del catálogo. Alimenta los contadores de los chips y la
 * pista de precios, no la consulta del catálogo en sí. Si el endpoint falla,
 * `listarFacetas` devuelve `null` y el panel sigue funcionando sin facetas.
 */
export function useFacetas() {
  return useQuery({
    queryKey: KeysTurismo.facetas(),
    queryFn: listarFacetas,
    staleTime: RELACIONADO_STALE_MS,
  });
}

/**
 * Atractivos cercanos a una ubicación geográfica.
 */
export function useAtractivosCercanos({
  lat,
  lon,
  radio = 2000,
  enabled = true,
}: {
  lat: number | null;
  lon: number | null;
  radio?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: KeysTurismo.cercanos(lat ?? 0, lon ?? 0, radio),
    queryFn: () => listarAtractivosCercanos({ lat: lat!, lon: lon!, radio }),
    enabled: enabled && lat !== null && lon !== null,
    staleTime: CATALOGO_STALE_MS,
  });
}
