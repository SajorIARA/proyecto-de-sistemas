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

/** Campos del formulario de registro que el backend puede rechazar. */
export type CampoRegistro =
  | "nombre"
  | "email"
  | "password"
  | "passwordConfirm";

export interface ErroresRegistro {
  /** Mensaje por campo, listo para pasar a `FormField`. */
  campos: Partial<Record<CampoRegistro, string>>;
  /** Error general (no asociado a un campo concreto). */
  general: string;
}

function primerMensaje(valor: unknown): string | undefined {
  if (typeof valor === "string") {
    return valor.trim() || undefined;
  }

  if (Array.isArray(valor)) {
    const mensajes = valor.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );

    return mensajes.length > 0 ? mensajes.join(" ") : undefined;
  }

  return undefined;
}

/**
 * Traduce la respuesta de error del registro (DRF) a mensajes por campo.
 *
 * DRF devuelve `{"email": ["Ya existe..."]}` o, en errores de validación
 * del serializer, `{"non_field_errors": ["..."]}`. Así el usuario ve el
 * problema junto al campo en lugar de un aviso genérico.
 */
export function getApiFieldErrors(error: unknown): ErroresRegistro {
  const campos: ErroresRegistro["campos"] = {};
  let general = "";

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const respuesta = data as Record<string, unknown>;

      campos.nombre = primerMensaje(respuesta.nombre);
      campos.email = primerMensaje(respuesta.email);
      campos.password = primerMensaje(respuesta.password);
      campos.passwordConfirm = primerMensaje(respuesta.password_confirm);

      general =
        primerMensaje(respuesta.detail) ??
        primerMensaje(respuesta.non_field_errors) ??
        "";

      (Object.keys(campos) as CampoRegistro[]).forEach((campo) => {
        if (!campos[campo]) delete campos[campo];
      });

      if (Object.keys(campos).length > 0) {
        return { campos, general };
      }
    }
  }

  general = getApiErrorMessage(error, "No se pudo crear la cuenta.");

  return { campos, general };
}
