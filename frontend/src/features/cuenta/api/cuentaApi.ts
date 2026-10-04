/**
 * Cliente HTTP de las secciones privadas (`/api/auth/...`).
 *
 * A diferencia del catálogo, aquí todas las peticiones exigen JWT: el
 * interceptor de `api/http.ts` adjunta el access token y refresca solo si
 * caduca, así que este módulo no tiene que volver a hacerlo.
 *
 * Los dos endpoints devuelven mensajes de validación **por campo** y en
 * español (`PasswordChangeSerializer` y los validadores de
 * `django.contrib.auth.password_validation`). Por eso `CuentaApiError` los
 * conserva separados en vez de aplastarlos en un único string: el formulario
 * pinta cada mensaje debajo de su input y marca el `aria-invalid`
 * correspondiente.
 */

import axios from "axios";
import { api } from "../../../api/http";
import { AUTH_ENDPOINTS, USUARIOS_PAGE_SIZE } from "../../../config/auth";
import type {
  PasswordChangePayload,
  UsuarioAdmin,
} from "../../../types/auth";
import type { Paginado } from "../../../types/turismo";

/** Campos de `PasswordChangeSerializer`. */
export type CampoPassword =
  | "current_password"
  | "new_password"
  | "new_password_confirm";

const CAMPOS_PASSWORD = [
  "current_password",
  "new_password",
  "new_password_confirm",
  "non_field_errors",
] as const;

type ClavePassword = (typeof CAMPOS_PASSWORD)[number];

/** `campo -> [mensajes]`, tal como los devuelve DRF. */
export type ErroresPorCampo = Partial<Record<ClavePassword, string[]>>;

const MENSAJE_POR_DEFECTO =
  "No pudimos completar la operación. Inténtalo de nuevo.";

/**
 * Error de negocio de la cuenta.
 *
 * `message` es el titular que se muestra arriba del formulario y
 * `mensajesDe(campo)` los mensajes concretos de cada input. Así un mismo
 * error ("La contraseña actual es incorrecta.") puede verse dos veces: como
 * resumen y junto al campo culpable.
 */
export class CuentaApiError extends Error {
  readonly status: number;

  readonly erroresPorCampo: ErroresPorCampo;

  constructor(
    message: string,
    status: number,
    erroresPorCampo: ErroresPorCampo = {},
  ) {
    super(message);

    this.name = "CuentaApiError";
    this.status = status;
    this.erroresPorCampo = erroresPorCampo;
  }

  /** Mensajes de un campo concreto. Vacío si el backend no mandó ninguno. */
  mensajesDe(campo: CampoPassword): string[] {
    return this.erroresPorCampo[campo] ?? [];
  }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * DRF manda los mensajes como `string[]`, pero algunos serializers (y el
 * `ValidationError` genérico) los mandan como `string` suelto o como una
 * lista de objetos. Solo conservamos lo que se puede pintar.
 */
function aMensajes(valor: unknown): string[] {
  if (typeof valor === "string") {
    return [valor];
  }

  if (Array.isArray(valor)) {
    return valor.filter((m): m is string => typeof m === "string");
  }

  return [];
}

function mensajePorStatus(status: number): string {
  if (status === 401) return "Tu sesión expiró. Vuelve a iniciar sesión.";

  if (status === 403) {
    return "Tu cuenta no tiene permisos para realizar esta acción.";
  }

  if (status === 429) {
    return "Demasiados intentos. Espera un momento antes de reintentar.";
  }

  if (status >= 500) {
    return "El servicio no está disponible en este momento.";
  }

  return MENSAJE_POR_DEFECTO;
}

/**
 * Traduce un error de axios a `CuentaApiError`.
 *
 * Idempotente: si ya es un `CuentaApiError` lo devuelve tal cual, para no
 * perder los mensajes por campo al atravesar dos capas.
 */
export function aCuentaApiError(error: unknown): CuentaApiError {
  if (error instanceof CuentaApiError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return new CuentaApiError(MENSAJE_POR_DEFECTO, 0);
  }

  const status = error.response?.status ?? 0;
  const cuerpo = error.response?.data;

  if (esObjeto(cuerpo)) {
    const erroresPorCampo: ErroresPorCampo = {};

    for (const clave of CAMPOS_PASSWORD) {
      const mensajes = aMensajes(cuerpo[clave]);

      if (mensajes.length > 0) {
        erroresPorCampo[clave] = mensajes;
      }
    }

    const global =
      aMensajes(cuerpo.detail)[0] ?? aMensajes(cuerpo.message)[0];

    if (global || Object.keys(erroresPorCampo).length > 0) {
      // `PasswordChangeSerializer` responde solo con errores por campo. Si no
      // hay `detail`, el primer mensaje hace de titular para que el bloque de
      // error global nunca quede vacío cuando sí hay algo que contar.
      const titular =
        global ??
        erroresPorCampo.non_field_errors?.[0] ??
        erroresPorCampo.current_password?.[0] ??
        MENSAJE_POR_DEFECTO;

      return new CuentaApiError(titular, status, erroresPorCampo);
    }
  }

  // 401 sin cuerpo utilizable, red caída, 500 con traceback: un texto corto y
  // accionable en vez del HTML del server.
  return new CuentaApiError(mensajePorStatus(status), status);
}

export const cuentaApi = {
  /**
   * Listado de cuentas de la plataforma (`UsuariosAdminView`, solo ADMIN).
   *
   * A diferencia del catálogo de destinos, aquí sí se manda `page_size`: la
   * paginación de usuarios declara `page_size_query_param`. La envoltura se
   * devuelve tal cual porque `UsuariosTabla` necesita `count` para calcular
   * las páginas.
   */
  async listarUsuarios(pagina = 1): Promise<Paginado<UsuarioAdmin>> {
    try {
      const { data } = await api.get<Paginado<UsuarioAdmin>>(
        AUTH_ENDPOINTS.usuariosAdmin,
        { params: { page: pagina, page_size: USUARIOS_PAGE_SIZE } },
      );

      return data;
    } catch (error) {
      throw aCuentaApiError(error);
    }
  },

  /**
   * Cambio de contraseña propia (`PasswordChangeView`).
   *
   * No devuelve cuerpo útil (el backend responde 204) y **no** invalida los
   * tokens emitidos, así que la sesión sigue viva sin pedir un login nuevo.
   */
  async cambiarPassword(payload: PasswordChangePayload): Promise<void> {
    try {
      await api.post(AUTH_ENDPOINTS.passwordChange, payload);
    } catch (error) {
      throw aCuentaApiError(error);
    }
  },
};