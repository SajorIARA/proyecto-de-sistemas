export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";

export const AUTH_ENDPOINTS = {
  login: import.meta.env.VITE_AUTH_LOGIN_PATH || "/auth/login/",
  register: import.meta.env.VITE_AUTH_REGISTER_PATH || "/auth/register/",
  refresh: import.meta.env.VITE_AUTH_REFRESH_PATH || "/auth/token/refresh/",
  logout: import.meta.env.VITE_AUTH_LOGOUT_PATH || "/auth/logout/",
} as const;
