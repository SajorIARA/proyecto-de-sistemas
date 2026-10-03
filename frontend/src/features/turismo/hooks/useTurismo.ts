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

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  listarAtractivos,
  listarHorariosDe,
  listarTarifasDe,
  obtenerAtractivo,
  TurismoApiError,
} from "../api/turismoApi";
import type { Atractivo } from "../../../types/turismo";

/** Claves centralizadas para invalidar sin repetir strings. */
export const KeysTurismo = {
  catalogo: (categoria: string | null, q: string) =>
    ["turismo", "atractivos", { categoria, q }] as const,
  atractivo: (id: string) => ["turismo", "atractivo", id] as const,
  horarios: (id: string) => ["turismo", "horarios", id] as const,
  tarifas: (id: string) => ["turismo", "tarifas", id] as const,
  categorias: () => ["turismo", "categorias"] as const,
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

export interface UseCatalogoParams {
  /** `null` = chip "Todos" (sin filtro). */
  categoria?: string | null;
  /** Búsqueda de texto libre (el backend la soporta con `q`). */
  q?: string;
}

/**
 * Catálogo paginado con scroll infinito.
 *
 * Devuelve las páginas aplanadas más el estado de paginación, para que la
 * página controle el IntersectionObserver y el botón "Cargar más".
 */
export function useCatalogo({ categoria = null, q = "" }: UseCatalogoParams = {}) {
  const consulta = useInfiniteQuery({
    queryKey: KeysTurismo.catalogo(categoria, q),
    queryFn: ({ pageParam }) =>
      listarAtractivos({ page: pageParam, categoria, q }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => paginaDesdeNext(ultima.next),
    staleTime: CATALOGO_STALE_MS,
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
