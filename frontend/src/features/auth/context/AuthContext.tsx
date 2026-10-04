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
  RolCodigo,
} from "../../../types/auth";
import { esRolCodigo } from "../../../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Códigos de rol válidos del usuario en sesión (puede estar vacío). */
  roles: RolCodigo[];
  /** `true` solo con rol ADMIN. Base de las rutas y acciones restringidas. */
  esAdmin: boolean;
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

  /**
   * Roles derivados del usuario persistido.
   *
   * Se filtran con `esRolCodigo` porque vienen de `localStorage` (JSON que
   * el usuario podría editar a mano) y porque el backend podría añadir
   * códigos nuevos: un valor desconocido se descarta en vez de abrir la
   * puerta a una sección restringida.
   *
   * Limitación conocida: el JWT no incluye roles y no existe endpoint
   * `/auth/me/`, así que los roles solo se actualizan al volver a iniciar
   * sesión. Si a un usuario lo promueven en la BD, el frontend lo refleja
   * recién en el próximo login.
   */
  const roles = useMemo<RolCodigo[]>(
    () => (user?.roles ?? []).filter(esRolCodigo),
    [user],
  );

  const esAdmin = roles.includes("ADMIN");

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: hasAccessToken,
      roles,
      esAdmin,
      login,
      register,
      logout,
    }),
    [user, hasAccessToken, roles, esAdmin, login, register, logout],
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
