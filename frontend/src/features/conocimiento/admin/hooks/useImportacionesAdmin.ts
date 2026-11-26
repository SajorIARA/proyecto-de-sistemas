/**
 * Hooks del panel de fuentes sobre TanStack Query.
 *
 * Doble barrera, igual que el admin de destinos: `RoleRoute` en el router y
 * `enabled: esAdmin` aquí. La autoridad real es `IsAdmin` en el backend (403).
 *
 * El polling solo se activa mientras alguna importación tiene vectorización
 * pendiente; cuando Ollama falla, el estado `error` se deja visible y deja de
 * consultar. Nunca se muestra éxito RAG simulado.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../auth/context/AuthContext";
import { POLLING_VECTORIZACION_MS } from "../../../../config/conocimiento";
import type {
  CrearImportacionInput,
  ImportacionLugares,
  LugarCandidato,
} from "../../../../types/conocimiento";
import {
  aprobarCandidato,
  crearImportacion,
  importacionesAdminApi,
  ImportacionesAdminApiError,
  rechazarCandidato,
  vectorizarImportacion,
} from "../api/importacionesAdminApi";

export const KeysImportacionesAdmin = {
  lista: ["importaciones-admin", "lista"] as const,
  candidatos: (id: string) => ["importaciones-admin", "candidatos", id] as const,
};

const duracion = (error: unknown, porDefecto: string): string =>
  error instanceof Error ? error.message : porDefecto;

function useInvalidar() {
  const queryClient = useQueryClient();
  return (idImportacion?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["importaciones-admin"] });
    if (idImportacion) {
      void queryClient.invalidateQueries({
        queryKey: KeysImportacionesAdmin.candidatos(idImportacion),
      });
    }
  };
}

/** Listado de importaciones, con polling solo si falta vectorizar. */
export function useImportacionesAdmin() {
  const { esAdmin } = useAuth();

  return useQuery({
    queryKey: KeysImportacionesAdmin.lista,
    queryFn: ({ signal }) => importacionesAdminApi.listarImportaciones(signal),
    enabled: esAdmin,
    staleTime: 10 * 1000,
    refetchInterval: (consulta) =>
      consulta.state.data?.some(
        (importacion) =>
          importacion.estado_vectorizacion === "pendiente" ||
          importacion.estado === "pendiente",
      )
        ? POLLING_VECTORIZACION_MS
        : false,
  });
}

/** Candidatos de una importación seleccionada. Solo ADMIN. */
export function useCandidatosImportacion(idImportacion: string | null) {
  const { esAdmin } = useAuth();

  return useQuery({
    queryKey: KeysImportacionesAdmin.candidatos(idImportacion ?? ""),
    queryFn: ({ signal }) =>
      importacionesAdminApi.obtenerCandidatos(idImportacion ?? "", signal),
    enabled: esAdmin && Boolean(idImportacion),
    staleTime: 10 * 1000,
  });
}

export interface MutacionSimple {
  pendiente: boolean;
  error: string | null;
  limpiar: () => void;
}

export function useCrearImportacion() {
  const invalidar = useInvalidar();
  const mutacion = useMutation({
    mutationFn: crearImportacion,
    onSuccess: () => invalidar(),
  });
  const apiError =
    mutacion.error instanceof ImportacionesAdminApiError
      ? mutacion.error
      : null;

  return {
    crear: async (payload: CrearImportacionInput) => {
      try {
        return await mutacion.mutateAsync(payload);
      } catch {
        return null;
      }
    },
    pendiente: mutacion.isPending,
    error: mutacion.isError
      ? duracion(
          mutacion.error,
          "No pudimos iniciar la importación. Intentá de nuevo.",
        )
      : null,
    apiError,
    limpiar: mutacion.reset,
  };
}

export function useAprobarCandidato() {
  const invalidar = useInvalidar();
  const mutacion = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { categoria: string; duracion_minutos: number };
    }) => aprobarCandidato(id, payload),
    onSuccess: () => invalidar(),
  });
  const apiError =
    mutacion.error instanceof ImportacionesAdminApiError
      ? mutacion.error
      : null;

  return {
    aprobar: async (
      id: string,
      payload: { categoria: string; duracion_minutos: number },
    ) => {
      try {
        await mutacion.mutateAsync({ id, payload });
        return true;
      } catch {
        return false;
      }
    },
    pendiente: mutacion.isPending,
    error: mutacion.isError
      ? duracion(mutacion.error, "No pudimos aprobar el candidato.")
      : null,
    apiError,
    limpiar: mutacion.reset,
  };
}

export function useRechazarCandidato() {
  const invalidar = useInvalidar();
  const mutacion = useMutation({
    mutationFn: ({ id, notas }: { id: string; notas: string }) =>
      rechazarCandidato(id, notas),
    onSuccess: () => invalidar(),
  });

  return {
    rechazar: async (id: string, notas: string) => {
      try {
        await mutacion.mutateAsync({ id, notas });
        return true;
      } catch {
        return false;
      }
    },
    pendiente: mutacion.isPending,
    error: mutacion.isError
      ? duracion(mutacion.error, "No pudimos rechazar el candidato.")
      : null,
    limpiar: mutacion.reset,
  };
}

export function useVectorizarImportacion() {
  const invalidar = useInvalidar();
  const mutacion = useMutation({
    mutationFn: vectorizarImportacion,
    onSuccess: (_resultado, idImportacion) => invalidar(idImportacion),
  });

  return {
    vectorizar: async (idImportacion: string) => {
      try {
        await mutacion.mutateAsync(idImportacion);
        return true;
      } catch {
        return false;
      }
    },
    pendiente: mutacion.isPending,
    error: mutacion.isError
      ? duracion(mutacion.error, "No pudimos encolar la vectorización.")
      : null,
    limpiar: mutacion.reset,
  };
}

export type { ImportacionLugares, LugarCandidato };
