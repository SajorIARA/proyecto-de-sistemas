/**
 * Hooks del panel de administración de destinos sobre TanStack Query.
 *
 * Lo más importante de este módulo es la **invalidación cruzada**: una alta,
 * una edición o una baja cambia lo que ve el público, así que además de
 * refrescar el listado admin hay que tirar a la basura el catálogo
 * (`KeysTurismo.catalogo`), el detalle del destino tocado y sus horarios y
 * tarifas. Sin eso, el turista vería la versión vieja hasta que expire el
 * `staleTime` de 2 minutos.
 *
 * `enabled: esAdmin` replica la barrera de `useUsuariosAdmin`: si el
 * componente llegara a montarse sin rol ADMIN, la petición no sale. La
 * autorización real igual la aplica Django (`IsAdmin` → 403).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../auth/context/AuthContext";
import { KeysTurismo } from "../../hooks/useTurismo";
import type { AtractivoAdmin, AtractivoAdminInput } from "../../../../types/turismo";
import {
  actualizarDestino,
  crearDestino,
  darDeBajaDestino,
  DestinosAdminApiError,
  listarDestinos,
  obtenerDestino,
  reactivarDestino,
} from "../api/destinosAdminApi";

/** Claves del panel admin, separadas de las públicas para invalidar fino. */
export const KeysDestinosAdmin = {
  lista: (pagina: number) => ["destinos-admin", "lista", pagina] as const,
  detalle: (id: string) => ["destinos-admin", "detalle", id] as const,
};

const ADMIN_STALE_MS = 30 * 1000;

/**
 * Invalida todo lo que depende del estado de un destino.
 *
 * Se llama tras cualquier escritura para que el catálogo público, el detalle
 * y los datos asociados (horarios y tarifas) se vuelvan a pedir.
 */
function useInvalidarDestinos() {
  const queryClient = useQueryClient();

  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["destinos-admin"] });
    void queryClient.invalidateQueries({ queryKey: ["turismo", "atractivos"] });

    if (!id) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: KeysTurismo.atractivo(id) });
    void queryClient.invalidateQueries({ queryKey: KeysTurismo.horarios(id) });
    void queryClient.invalidateQueries({ queryKey: KeysTurismo.tarifas(id) });
  };
}

/** Listado admin paginado. Solo ADMIN. */
export function useDestinosAdmin(pagina = 1) {
  const { esAdmin } = useAuth();

  return useQuery({
    queryKey: KeysDestinosAdmin.lista(pagina),
    queryFn: () => listarDestinos(pagina),
    enabled: esAdmin && pagina > 0,
    staleTime: ADMIN_STALE_MS,
  });
}

/** Un destino puntual para el formulario de edición. Solo ADMIN. */
export function useDestinoAdmin(id: string) {
  const { esAdmin } = useAuth();

  return useQuery({
    queryKey: KeysDestinosAdmin.detalle(id),
    queryFn: () => obtenerDestino(id),
    enabled: esAdmin && Boolean(id),
    staleTime: ADMIN_STALE_MS,
    // Un 404 no se reintenta: el destino no existe.
    retry: (intentos, error) =>
      !(error instanceof DestinosAdminApiError && error.status === 404) &&
      intentos < 1,
  });
}

export interface UseGuardarDestinoResultado {
  guardar: (payload: AtractivoAdminInput, id?: string) => Promise<AtractivoAdmin | null>;
  exito: boolean;
  /** Error tipado, para leer los mensajes por campo. */
  apiError: DestinosAdminApiError | null;
  error: string | null;
  pendiente: boolean;
  limpiar: () => void;
}

/**
 * Alta (`id` ausente) o edición (`id` presente) de un destino.
 *
 * Una sola mutación para los dos casos porque el backend los trata igual salvo
 * por la URL: el serializer es el mismo y `PATCH` acepta el cuerpo completo.
 */
export function useGuardarDestino(): UseGuardarDestinoResultado {
  const invalidar = useInvalidarDestinos();
  const mutacion = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id?: string;
      payload: AtractivoAdminInput;
    }) => (id ? actualizarDestino(id, payload) : crearDestino(payload)),
    onSuccess: (_destino, variables) => invalidar(variables.id),
  });

  const apiError =
    mutacion.error instanceof DestinosAdminApiError ? mutacion.error : null;

  return {
    guardar: async (payload, id) => {
      try {
        return await mutacion.mutateAsync({ id, payload });
      } catch {
        return null;
      }
    },
    exito: mutacion.isSuccess,
    apiError,
    error: mutacion.isError
      ? (apiError?.message ??
        "No pudimos guardar el destino. Intentá de nuevo.")
      : null,
    pendiente: mutacion.isPending,
    limpiar: mutacion.reset,
  };
}

export interface UseBajaDestinoResultado {
  /** Da de baja (DELETE) o reactiva (PATCH `activo:true`) un destino. */
  cambiarEstado: (destino: AtractivoAdmin, activar: boolean) => Promise<boolean>;
  exito: boolean;
  error: string | null;
  pendiente: boolean;
  /** Id del destino que se está procesando, para desactivar su botón. */
  idEnCurso: string | null;
  limpiar: () => void;
}

/**
 * Baja lógica y reactivación.
 *
 * El DELETE del backend NO borra la fila: marca `activo = false` y conserva
 * horarios, tarifas e historial. Por eso la misma mutación cubre el alta de
 * nuevo con un `PATCH {"activo": true}`, en vez de dejar un destino dado de
 * baja como un callejón sin salida.
 */
export function useCambiarEstadoDestino(): UseBajaDestinoResultado {
  const invalidar = useInvalidarDestinos();
  const mutacion = useMutation({
    mutationFn: async ({
      id,
      activar,
    }: {
      id: string;
      activar: boolean;
    }): Promise<void> => {
      // El retorno se descarta a propósito: el DELETE responde 204 sin cuerpo
      // y la reactivación devuelve el destino, pero a quien le interesa es a
      // la vista, y esa se refresca invalidando caché, no leyendo el
      // resultado. Unificar en `void` evita que la firma de la mutación tenga
      // que ser `Promise<void> | Promise<AtractivoAdmin>`.
      if (activar) {
        await reactivarDestino(id);
      } else {
        await darDeBajaDestino(id);
      }
    },
    onSuccess: (_resultado, variables) => invalidar(variables.id),
  });

  return {
    cambiarEstado: async (destino, activar) => {
      try {
        await mutacion.mutateAsync({
          id: destino.id_atractivo,
          activar,
        });

        return true;
      } catch {
        return false;
      }
    },
    exito: mutacion.isSuccess,
    error: mutacion.isError
      ? ((mutacion.error instanceof Error
          ? mutacion.error.message
          : null) ??
        "No pudimos cambiar el estado del destino. Intentá de nuevo.")
      : null,
    pendiente: mutacion.isPending,
    idEnCurso: mutacion.isPending ? (mutacion.variables?.id ?? null) : null,
    limpiar: mutacion.reset,
  };
}