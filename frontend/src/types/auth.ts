export interface AuthTokens {
  access: string;
  refresh: string;
}

/**
 * Códigos de rol que el backend expone (`Rol.codigo`, tabla `rol`).
 *
 * El RBAC del backend evalúa permisos con `HasRole`/`IsAdmin` comparando
 * exactamente estos códigos, así que el frontend no puede inventar otros.
 */
export const ROLES = ["ADMIN", "TOURIST"] as const;

export type RolCodigo = (typeof ROLES)[number];

/** Etiqueta y color de cada rol, para los badges de la interfaz. */
export const ROL_ETIQUETAS: Record<RolCodigo, string> = {
  ADMIN: "Administrador",
  TOURIST: "Turista",
};

/**
 * Filtra un valor desconocido a un código de rol válido.
 *
 * Necesario porque los roles llegan desde `localStorage` (JSON persistido) y
 * desde el backend: un rol desconocido se ignora en lugar de conceder acceso.
 */
export function esRolCodigo(valor: unknown): valor is RolCodigo {
  return (
    typeof valor === "string" && (ROLES as readonly string[]).includes(valor)
  );
}

export interface AuthUser {
  id?: number | string;
  nombre?: string;
  email: string;
  /** Códigos de rol tal cual los devuelve el backend. Sin filtrar. */
  roles?: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface AuthResponse {
  access?: string;
  refresh?: string;
  tokens?: AuthTokens;
  user?: AuthUser;
  detail?: string;
  message?: string;
}

/**
 * Fila de `GET /api/auth/usuarios/` (endpoint solo ADMIN).
 *
 * Refleja `UsuarioListSerializer`. Ojo: el identificador se llama
 * `id_usuario`, NO `id` como en el resto de modelos de la API.
 */
export interface UsuarioAdmin {
  id_usuario: string;
  email: string;
  nombre: string;
  activo: boolean;
  fecha_creacion: string;
  roles: string[];
}

/** Body de `POST /api/auth/password/change/`. */
export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}
