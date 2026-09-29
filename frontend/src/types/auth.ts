export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id?: number | string;
  nombre?: string;
  email: string;
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
