/**
 * Hooks de fotos del panel de administración sobre TanStack Query.
 *
 * Tras subir o borrar una foto hay que invalidar el catálogo público: la
 * imagen de portada de las cards sale de `Atractivo.imagenes`, así que un
 * cambio en las fotos se nota ahí. También se invalida el detalle del
 * destino para que la galería pública se refresque.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../auth/context/AuthContext";
import { KeysTurismo } from "../../hooks/useTurismo";
import type { Foto } from "../../../../types/turismo";
import {
  eliminarFoto,
  FotosAdminApiError,
  listarFotosDe,
  subirFotoDestino,
} from "../api/fotosAdminApi";
import { KeysDestinosAdmin } from "./useDestinosAdmin";

/** Claves del panel de fotos. */
export const KeysFotosAdmin = {
  lista: (atractivoId: string) =>
    ["fotos-admin", "lista", atractivoId] as const,
};

const FOTOS_STALE_MS = 15 * 1000;

function useInvalidarFotos(atractivoId: string) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: KeysFotosAdmin.lista(atractivoId),
    });
    void queryClient.invalidateQueries({
      queryKey: KeysDestinosAdmin.detalle(atractivoId),
    });
    void queryClient.invalidateQueries({
      queryKey: KeysTurismo.atractivo(atractivoId),
    });
    void queryClient.invalidateQueries({ queryKey: ["turismo", "atractivos"] });
  };
}

/** Fotos de un destino. Solo ADMIN. */
export function useFotosDe(atractivoId: string) {
  const { esAdmin } = useAuth();

  return useQuery({
    queryKey: KeysFotosAdmin.lista(atractivoId),
    queryFn: () => listarFotosDe(atractivoId),
    enabled: esAdmin && Boolean(atractivoId),
    staleTime: FOTOS_STALE_MS,
  });
}

export interface SubirFotoVariables {
  archivo: File;
  orden?: number;
  /** Callback de progreso 0–100, opcional. */
  onProgress?: (porcentaje: number) => void;
}

export interface UseSubirFotoResultado {
  subir: (variables: SubirFotoVariables) => Promise<Foto | null>;
  error: string | null;
  apiError: FotosAdminApiError | null;
  /** `true` mientras alguna subida está en curso. */
  pendiente: boolean;
}

/**
 * Sube una foto (imagen directa o video por Celery).
 *
 * El progreso viaja con la variable de la mutación porque es efímero y de un
 * solo consumidor; guardarlo en la caché de React Query no aporta.
 */
export function useSubirFoto(atractivoId: string): UseSubirFotoResultado {
  const invalidar = useInvalidarFotos(atractivoId);

  const mutacion = useMutation({
    mutationFn: ({ archivo, orden, onProgress }: SubirFotoVariables) =>
      subirFotoDestino({ atractivo: atractivoId, archivo, orden }, onProgress),
    onSuccess: () => invalidar(),
  });

  const apiError =
    mutacion.error instanceof FotosAdminApiError ? mutacion.error : null;

  return {
    subir: async (variables) => {
      try {
        return await mutacion.mutateAsync(variables);
      } catch {
        return null;
      }
    },
    error: mutacion.isError
      ? (apiError?.message ?? "No pudimos subir el archivo. Intentá de nuevo.")
      : null,
    apiError,
    pendiente: mutacion.isPending,
  };
}

export interface UseEliminarFotoResultado {
  eliminar: (id: number) => Promise<boolean>;
  error: string | null;
  pendiente: boolean;
  /** Id de la foto en proceso, para desactivar su botón. */
  idEnCurso: number | null;
}

/** Elimina una foto (registro; el asset sigue en Cloudinary). */
export function useEliminarFoto(atractivoId: string): UseEliminarFotoResultado {
  const invalidar = useInvalidarFotos(atractivoId);

  const mutacion = useMutation({
    mutationFn: (id: number) => eliminarFoto(id),
    onSuccess: () => invalidar(),
  });

  return {
    eliminar: async (id) => {
      try {
        await mutacion.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    error: mutacion.isError
      ? (() => {
          const error = mutacion.error;
          return error instanceof Error
            ? error.message
            : "No pudimos eliminar la foto. Intentá de nuevo.";
        })()
      : null,
    pendiente: mutacion.isPending,
    idEnCurso: mutacion.isPending ? (mutacion.variables ?? null) : null,
  };
}
