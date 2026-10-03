import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AuthProvider } from "./features/auth/context/AuthContext";

/**
 * Cliente de TanStack Query.
 *
 * Los `staleTime` se ajustan por hook según el costo de la petición (ver
 * `features/turismo/hooks/useTurismo.ts`). Aquí solo van los valores por
 * defecto, pensados para el límite de 100 req/hora del AnonRateThrottle
 * del backend:
 *
 * - `retry: 1` evita martillear la API ante un fallo transitorio.
 * - `refetchOnWindowFocus: false` porque el catálogo no cambia por
 *   segundos y así no gastamos cuota al cambiar de pestaña.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
