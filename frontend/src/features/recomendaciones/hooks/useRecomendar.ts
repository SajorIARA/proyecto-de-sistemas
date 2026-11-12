/**
 * Hook del motor de recomendación sobre TanStack Query.
 *
 * `useMutation` encaja mejor que `useQuery`: el ranking se recalcula cuando
 * el turista cambia su perfil, no en cada montaje. El resultado se conserva
 * en estado propio para que siga visible mientras llega el siguiente cálculo
 * (el botón «Actualizar ranking» no debe vaciar la pantalla).
 */

import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  aRecomendacionesApiError,
  recomendarPerfil,
} from "../api/recomendacionesApi";
import type {
  RecomendacionInput,
  RespuestaRecomendaciones,
} from "../../../types/recomendaciones";

export interface UseRecomendarResultado {
  /** Dispara el cálculo sin lanzar promesas rechazadas al llamador. */
  recomendar: (entrada: RecomendacionInput) => void;
  /** Variante con promesa, útil cuando el llamador necesita esperar. */
  recomendarAsync: (entrada: RecomendacionInput) => Promise<RespuestaRecomendaciones>;
  /** Último ranking válido; se conserva durante el recálculo. */
  resultado: RespuestaRecomendaciones | null;
  pendiente: boolean;
  /** Mensaje global listo para pintar, o `null`. */
  error: string | null;
  apiError: ReturnType<typeof aRecomendacionesApiError> | null;
  /** Limpia el ranking y el error (por ejemplo al cambiar de perfil). */
  limpiar: () => void;
}

const ERROR_POR_DEFECTO =
  "No pudimos calcular tus recomendaciones. Inténtalo de nuevo.";

export function useRecomendar(): UseRecomendarResultado {
  const [resultado, setResultado] = useState<RespuestaRecomendaciones | null>(
    null,
  );

  const mutacion = useMutation({
    mutationFn: (entrada: RecomendacionInput) => recomendarPerfil(entrada),
    onSuccess: (data) => setResultado(data),
  });

  const { reset } = mutacion;

  const limpiar = useCallback(() => {
    setResultado(null);
    reset();
  }, [reset]);

  const apiError = mutacion.isError
    ? aRecomendacionesApiError(mutacion.error)
    : null;

  return {
    recomendar: mutacion.mutate,
    recomendarAsync: mutacion.mutateAsync,
    resultado,
    pendiente: mutacion.isPending,
    error: apiError?.message ?? (mutacion.isError ? ERROR_POR_DEFECTO : null),
    apiError,
    limpiar,
  };
}
