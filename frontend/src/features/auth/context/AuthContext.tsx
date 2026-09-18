import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { authApi } from "../api/authApi";
import { tokenStorage } from "../../../lib/tokenStorage";
import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "../../../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    tokenStorage.getUser<AuthUser>(),
  );
  const [hasAccessToken, setHasAccessToken] = useState(
    () => Boolean(tokenStorage.getAccess()),
  );

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await authApi.login(payload);

    if (!result.tokens) {
      throw new Error(
        "Inicio de sesión válido, pero el backend no devolvió access y refresh.",
      );
    }

    tokenStorage.setTokens(result.tokens.access, result.tokens.refresh);
    setHasAccessToken(true);

    if (result.user) {
      tokenStorage.setUser(result.user);
      setUser(result.user);
    } else {
      const fallbackUser: AuthUser = { email: payload.email };
      tokenStorage.setUser(fallbackUser);
      setUser(fallbackUser);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await authApi.register(payload);

    if (result.tokens) {
      tokenStorage.setTokens(result.tokens.access, result.tokens.refresh);
      setHasAccessToken(true);

      const registeredUser =
        result.user ?? ({ nombre: payload.nombre, email: payload.email } as AuthUser);

      tokenStorage.setUser(registeredUser);
      setUser(registeredUser);
      return true;
    }

    return false;
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh();

    try {
      await authApi.logout(refresh);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        console.warn("El backend no pudo invalidar el refresh token.", error);
      }
    } finally {
      tokenStorage.clear();
      setUser(null);
      setHasAccessToken(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: hasAccessToken,
      login,
      register,
      logout,
    }),
    [user, hasAccessToken, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider.");
  }

  return context;
}
