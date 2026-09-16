import { api } from "../../../api/http";
import { AUTH_ENDPOINTS } from "../../../config/auth";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from "../../../types/auth";

function normalizeTokens(data: AuthResponse) {
  if (data.tokens?.access && data.tokens?.refresh) {
    return data.tokens;
  }

  if (data.access && data.refresh) {
    return {
      access: data.access,
      refresh: data.refresh,
    };
  }

  return null;
}

export const authApi = {
  async login(payload: LoginPayload) {
    const { data } = await api.post<AuthResponse>(AUTH_ENDPOINTS.login, payload);
    return {
      raw: data,
      tokens: normalizeTokens(data),
      user: data.user ?? null,
    };
  },

  async register(payload: RegisterPayload) {
    const { data } = await api.post<AuthResponse>(
      AUTH_ENDPOINTS.register,
      payload,
    );

    return {
      raw: data,
      tokens: normalizeTokens(data),
      user: data.user ?? null,
    };
  },

  async logout(refresh: string | null) {
    if (!refresh) return;

    await api.post(AUTH_ENDPOINTS.logout, { refresh });
  },
};
