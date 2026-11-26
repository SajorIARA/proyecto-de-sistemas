export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";

export const AUTH_ENDPOINTS = {
  login: import.meta.env.VITE_AUTH_LOGIN_PATH || "/auth/login/",
  register: import.meta.env.VITE_AUTH_REGISTER_PATH || "/auth/register/",
  refresh: import.meta.env.VITE_AUTH_REFRESH_PATH || "/auth/token/refresh/",
  logout: import.meta.env.VITE_AUTH_LOGOUT_PATH || "/auth/logout/",
  /** Cambio de contraseña autenticado (`PasswordChangeView`). */
  passwordChange:
    import.meta.env.VITE_AUTH_PASSWORD_CHANGE_PATH || "/auth/password/change/",
  /** Listado de usuarios, restringido al rol ADMIN (`UsuariosAdminView`). */
  usuariosAdmin:
    import.meta.env.VITE_AUTH_USUARIOS_ADMIN_PATH || "/auth/usuarios/",
  /** Exportación de datos personales (`MisDatosView`). */
  misDatos: import.meta.env.VITE_AUTH_MIS_DATOS_PATH || "/auth/mis-datos/",
  /** Baja con anonimización (`AnonimizarMisDatosView`). */
  anonimizarMisDatos:
    import.meta.env.VITE_AUTH_ANONIMIZAR_PATH || "/auth/mis-datos/anonimizar/",
} as const;

/**
 * Tamaño de página del listado de usuarios.
 *
 * A diferencia del catálogo de `turismo`, aquí SÍ funciona: la
 * `UsuarioAdminPagination` del backend declara `page_size_query_param` y
 * `max_page_size = 100` (`backend/usuarios/views_admin.py`).
 */
export const USUARIOS_PAGE_SIZE = 25;
