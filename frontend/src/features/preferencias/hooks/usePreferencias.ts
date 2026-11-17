/**
 * Hooks del perfil de preferencias sobre TanStack Query.
 *
 * Los endpoints exigen JWT, así que el límite relevante es el
 * `UserRateThrottle` (1000 req/hora) y no el anónimo. Aun así se cachea la
 * lectura para no volver a pedir el perfil en cada montaje.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  guardarPerfil,
  listarConsultas,
  listarMisPreferencias,
  PreferenciasApiError,
  type GuardarPerfilInput,
} from "../api/preferenciasApi";
import type { PreferenciaUsuario } from "../../../types/preferencias";

/** Claves centralizadas para invalidar sin repetir strings. */
export const KeysPreferencias = {
  misPreferencias: () => ["preferencias", "mias"] as const,
  ultimaConsulta: () => ["preferencias", "ultimaConsulta"] as const,
};

const PREFERENCIAS_STALE_MS = 2 * 60 * 1000;

/** Lee las preferencias guardadas del usuario en sesión. */
export function useMisPreferencias() {
  return useQuery({
    queryKey: KeysPreferencias.misPreferencias(),
    queryFn: listarMisPreferencias,
    staleTime: PREFERENCIAS_STALE_MS,
  });
}

/**
 * Última consulta de recorrido guardada por el usuario.
 *
 * Se usa para precargar presupuesto, duración y punto de partida en la
 * pantalla de recomendaciones. Devuelve `null` si todavía no hay ninguna.
 */
export function useUltimaConsulta() {
  return useQuery({
    queryKey: KeysPreferencias.ultimaConsulta(),
    queryFn: listarConsultas,
    select: (consultas) => consultas[0] ?? null,
    staleTime: PREFERENCIAS_STALE_MS,
  });
}

export interface UseGuardarPerfilResultado {
  /** `true` si el backend aceptó el guardado. No lanza excepciones. */
  guardar: (entrada: GuardarPerfilInput) => Promise<boolean>;
  exito: boolean;
  /** Mensaje global del backend, o `null` si no hay error. */
  error: string | null;
  /** Error tipado, para leer los mensajes por campo. */
  apiError: PreferenciasApiError | null;
  pendiente: boolean;
  limpiar: () => void;
}

/** Guarda preferencias + restricciones y refresca la caché del perfil. */
export function useGuardarPerfil(): UseGuardarPerfilResultado {
  const queryClient = useQueryClient();

  const mutacion = useMutation({
    mutationFn: (entrada: GuardarPerfilInput) => guardarPerfil(entrada),
    onSuccess: (resultado: { preferencias: PreferenciaUsuario[] }) => {
      // El backend puede haber creado/borrado filas: la caché local pasa a
      // reflejar exactamente lo que quedó guardado.
      queryClient.setQueryData(
        KeysPreferencias.misPreferencias(),
        resultado.preferencias,
      );

      // Cada guardado puede crear una consulta nueva: la pantalla de
      // recomendaciones debe verla como «última consulta».
      void queryClient.invalidateQueries({
        queryKey: KeysPreferencias.ultimaConsulta(),
      });
    },
  });

  const apiError =
    mutacion.error instanceof PreferenciasApiError ? mutacion.error : null;

  return {
    guardar: async (entrada) => {
      try {
        await mutacion.mutateAsync(entrada);
        return true;
      } catch {
        return false;
      }
    },
    exito: mutacion.isSuccess,
    error: mutacion.isError
      ? (apiError?.message ?? "No pudimos guardar tus preferencias.")
      : null,
    apiError,
    pendiente: mutacion.isPending,
    limpiar: mutacion.reset,
  };
}
