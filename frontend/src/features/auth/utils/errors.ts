import axios from "axios";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error. Intenta nuevamente.",
): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const data = error.response?.data as
    | Record<string, unknown>
    | string
    | undefined;

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    for (const key of ["detail", "message", "error", "email", "password"]) {
      const value = data[key];

      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0];
      }
    }
  }

  if (error.code === "ERR_NETWORK") {
    return "No se pudo conectar con el backend.";
  }

  return fallback;
}
