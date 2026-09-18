import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL, AUTH_ENDPOINTS } from "../config/auth";
import { tokenStorage } from "../lib/tokenStorage";

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh();

  if (!refresh) {
    throw new Error("No hay refresh token disponible.");
  }

  const response = await refreshClient.post(AUTH_ENDPOINTS.refresh, { refresh });
  const access = response.data?.access as string | undefined;

  if (!access) {
    throw new Error("El backend no devolvió un access token.");
  }

  tokenStorage.setAccess(access);
  return access;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = tokenStorage.getAccess();

  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes(AUTH_ENDPOINTS.refresh)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const access = await refreshPromise;
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${access}`,
      };

      return api(originalRequest);
    } catch (refreshError) {
      tokenStorage.clear();

      if (window.location.pathname !== "/login") {
        window.location.assign("/login?session=expired");
      }

      return Promise.reject(refreshError);
    }
  },
);
