import { useQuery } from "@tanstack/react-query";

import { obtenerClimaActual } from "../api/climaApi";

const CLIMA_STALE_MS = 15 * 60 * 1000;

/**
 * Consulta el tiempo actual de La Paz y lo conserva quince minutos para no
 * repetir llamadas al servicio externo durante la misma visita.
 */
export function useClimaActual() {
  return useQuery({
    queryKey: ["clima", "actual", "la-paz"],
    queryFn: ({ signal }) => obtenerClimaActual(signal),
    staleTime: CLIMA_STALE_MS,
    retry: false,
  });
}
