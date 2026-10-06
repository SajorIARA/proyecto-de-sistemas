/**
 * Hooks de las secciones privadas sobre TanStack Query.
 *
 * A diferencia del catálogo, estos endpoints exigen JWT, así que la cuota del
 * `AnonRateThrottle` (100 req/hora) no aplica: el límite relevante es el
 * `AuthRateThrottle` del login. Aun así se cachean para no repintar la tabla
 * de usuarios en cada montaje.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/context/AuthContext";
import { cuentaApi, CuentaApiError } from "../api/cuentaApi";
import type { PasswordChangePayload } from "../../../types/auth";

/** Claves centralizadas para invalidar sin repetir strings. */
export const KeysCuenta = {
  usuarios: (pagina: number) => ["cuenta", "usuarios", pagina] as const,
};

const USUARIOS_STALE_MS = 2 * 60 * 1000;

/**
 * Listado de usuarios de la plataforma (solo ADMIN).
 *
 * `enabled: esAdmin` es una segunda barrera más allá del `RoleRoute`: si un
 * turista llegara al componente por cualquier motivo (un estado de React
 * desincronizado, un test, una futura ruta mal anidada), la petición ni
 * siquiera se lanza y el backend nunca recibe un intento de más.
 */
export function useUsuariosAdmin(pagina = 1) {
  const { esAdmin } = useAuth();

  return useQuery({
    queryKey: KeysCuenta.usuarios(pagina),
    queryFn: () => cuentaApi.listarUsuarios(pagina),
    enabled: esAdmin && pagina > 0,
    staleTime: USUARIOS_STALE_MS,
  });
}

export interface UseCambiarPasswordResultado {
  /** `true` si el backend aceptó el cambio. No lanza excepciones. */
  cambiar: (payload: PasswordChangePayload) => Promise<boolean>;
  exito: boolean;
  /** Mensaje global del backend, o `null` si no hay error. */
  error: string | null;
  /** Error tipado, para leer los mensajes por campo. */
  apiError: CuentaApiError | null;
  pendiente: boolean;
  limpiar: () => void;
}

/**
 * Cambio de contraseña.
 *
 * No hay nada que invalidar en caché: `PasswordChangeView` no invalida los
 * tokens emitidos, así que la sesión sigue activa con el mismo JWT. Cambiar
 * la contraseña propia no altera la tabla de usuarios.
 */
export function useCambiarPassword(): UseCambiarPasswordResultado {
  const mutacion = useMutation({
    mutationFn: (payload: PasswordChangePayload) =>
      cuentaApi.cambiarPassword(payload),
  });

  const apiError =
    mutacion.error instanceof CuentaApiError ? mutacion.error : null;

  return {
    // `mutateAsync` (y no una llamada directa a la API) para que el estado de
    // la mutación refleje realmente la petición en curso.
    cambiar: async (payload) => {
      try {
        await mutacion.mutateAsync(payload);
        return true;
      } catch {
        return false;
      }
    },
    exito: mutacion.isSuccess,
    error: mutacion.isError
      ? (apiError?.message ?? "No pudimos cambiar la contraseña.")
      : null,
    apiError,
    pendiente: mutacion.isPending,
    limpiar: mutacion.reset,
  };
}