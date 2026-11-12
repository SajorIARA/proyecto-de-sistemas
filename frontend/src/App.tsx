import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AuthProvider } from "./features/auth/context/AuthContext";
import { PreferenciasProvider } from "./features/preferencias/context/PreferenciasContext";

/**
 * Cliente de TanStack Query.
 *
 * Los `staleTime` se ajustan por hook según el costo de la petición (ver
 * `features/turismo/hooks/useTurismo.ts`). Aquí solo van los valores por
 * defecto, pensados para el límite de 100 req/hora del AnonRateThrottle
 * del backend:
 *
 * - `retry` sólo para fallos transitorios (red caída o 5xx). El 401 lo
 *   resuelve el interceptor de `http.ts` (refresh + reintento), y los
 *   403/429 no se repiten: `retry` numérico reintenta cualquier error,
 *   así que con `retry: 1` un límite de cuota se pagaba dos veces.
 * - `refetchOnWindowFocus: false` porque el catálogo no cambia por
 *   segundos y así no gastamos cuota al cambiar de pestaña.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as AxiosError)?.response?.status;
        const transitorio = status === undefined || status >= 500;
        return failureCount < 1 && transitorio;
      },
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferenciasProvider>
          <RouterProvider router={router} />
        </PreferenciasProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
