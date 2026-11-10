/**
 * Pruebas de los interceptores de `api` (http.ts):
 *
 * - Bearer automático con el access token guardado.
 * - 401 -> refresh, persistir el access nuevo y reintentar una vez.
 * - Deduplicación del refresh ante 401 concurrentes (refreshPromise).
 * - Guardas: no refrescar por 4xx distintos del 401, no encadenar el
 *   refresh sobre sí mismo, y cierre de sesión + redirección si el
 *   refresh definitivamente falla.
 *
 * El adapter de axios se sustituye ANTES de que http.ts cree sus clientes
 * (copian `axios.defaults` al crearse), así que `api` y `refreshClient`
 * quedan en memoria: cero red.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { AUTH_ENDPOINTS } from "../config/auth";
import { tokenStorage } from "../lib/tokenStorage";

const net = vi.hoisted(() => {
  const state: {
    handler:
      | ((config: InternalAxiosRequestConfig) => AxiosResponse | Promise<AxiosResponse>)
      | null;
    requests: InternalAxiosRequestConfig[];
  } = { handler: null, requests: [] };

  return {
    state,
    adapter: async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      state.requests.push(config);
      if (!state.handler) {
        throw new Error("http.test: falta definir net.state.handler");
      }
      return await state.handler(config);
    },
  };
});

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  // Los clientes de http.ts copian axios.defaults al crearse: instalar el
  // adapter aquí cubre api y refreshClient sin tocar la red.
  actual.default.defaults.adapter = net.adapter;
  return actual;
});

import { api } from "./http";

function ok(
  config: InternalAxiosRequestConfig,
  data: unknown = {},
  status = 200,
): AxiosResponse {
  return {
    data,
    status,
    statusText: "OK",
    headers: {},
    config,
  } as AxiosResponse;
}

/** Reproduce el comportamiento del adapter real: status >= 400 rechaza. */
function fallo(config: InternalAxiosRequestConfig, status: number): never {
  const respuesta = {
    data: {},
    status,
    statusText: "",
    headers: {},
    config,
  } as AxiosResponse;
  const error = Object.assign(
    new Error(`Request failed with status code ${status}`),
    { isAxiosError: true, config, response: respuesta, toJSON: () => ({}) },
  );
  throw error;
}

/** Lee una cabecera sea AxiosHeaders (`get`) o un objeto plano. */
function header(config: InternalAxiosRequestConfig, nombre: string): unknown {
  const h = config.headers as unknown as {
    get?: (n: string) => unknown;
  } & Record<string, unknown>;

  if (h && typeof h.get === "function") {
    const valor = h.get(nombre);
    if (valor !== undefined) return valor;
  }

  return h?.[nombre] ?? h?.[nombre.toLowerCase()];
}

function pedidosA(url: string): InternalAxiosRequestConfig[] {
  // Coincidencia exacta: el filtro por `includes` contaba también las
  // peticiones cuya URL contiene el fragmento (p. ej. el refresh, cuya ruta
  // incluye "/api" y "/auth", colisionando con "/a").
  return net.state.requests.filter((c) => String(c.url) === url);
}

describe("interceptores de api (http.ts)", () => {
  beforeEach(() => {
    localStorage.clear();
    net.state.requests.length = 0;
    net.state.handler = (config) => ok(config);
    // El redirect a /login solo debe ocurrir si no estamos ya en /login.
    window.history.replaceState(null, "", "/");
  });

  it("adjunta Authorization: Bearer cuando hay access token", async () => {
    tokenStorage.setTokens("acc-1", "ref-1");

    await api.get("/datos");

    expect(header(net.state.requests[0], "Authorization")).toBe(
      "Bearer acc-1",
    );
  });

  it("no envía Authorization sin token guardado", async () => {
    await api.get("/datos");

    expect(header(net.state.requests[0], "Authorization")).toBeUndefined();
  });

  it("ante un 401 refresca el token, lo persiste y reintenta con el nuevo", async () => {
    tokenStorage.setTokens("acc-viejo", "ref-1");
    const primerGolpe = new Set<string>();
    net.state.handler = (config) => {
      const url = String(config.url);
      if (url.includes(AUTH_ENDPOINTS.refresh)) {
        return ok(config, { access: "acc-nuevo" });
      }
      if (!primerGolpe.has(url)) {
        primerGolpe.add(url);
        return fallo(config, 401);
      }
      return ok(config, { mensaje: "hola" });
    };

    const respuesta = await api.get("/datos");

    expect(respuesta.data).toEqual({ mensaje: "hola" });
    // Secuencia: 1) original 401, 2) refresh, 3) reintento.
    expect(net.state.requests).toHaveLength(3);
    expect(String(pedidosA(AUTH_ENDPOINTS.refresh)[0].data)).toContain("ref-1");
    expect(header(net.state.requests[2], "Authorization")).toBe(
      "Bearer acc-nuevo",
    );
    expect(tokenStorage.getAccess()).toBe("acc-nuevo");
  });

  it("deduplica el refresh ante 401 concurrentes", async () => {
    tokenStorage.setTokens("acc-viejo", "ref-1");
    const golpes = new Map<string, number>();
    let abrirRefresh = () => {};
    const refreshAbierto = new Promise<void>((resolver) => {
      abrirRefresh = resolver;
    });
    net.state.handler = (config) => {
      const url = String(config.url);
      if (url.includes(AUTH_ENDPOINTS.refresh)) {
        return refreshAbierto.then(() => ok(config, { access: "acc-nuevo" }));
      }
      const intento = (golpes.get(url) ?? 0) + 1;
      golpes.set(url, intento);
      return intento === 1 ? fallo(config, 401) : ok(config, { url });
    };

    const p1 = api.get("/a");
    const p2 = api.get("/b");

    // Ambos 401 y ambos interceptores en marcha antes de abrir el refresh.
    await vi.waitFor(() => {
      expect(pedidosA(AUTH_ENDPOINTS.refresh)).toHaveLength(1);
      expect(golpes.size).toBe(2);
    });
    await new Promise((resolver) => setTimeout(resolver, 10));
    abrirRefresh();

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.data).toEqual({ url: "/a" });
    expect(r2.data).toEqual({ url: "/b" });
    // Un solo refresh para las dos peticiones; ambas se reintentan.
    expect(pedidosA(AUTH_ENDPOINTS.refresh)).toHaveLength(1);
    expect(pedidosA("/a")).toHaveLength(2);
    expect(pedidosA("/b")).toHaveLength(2);
  });

  it("no reintenta un segundo 401 (un solo refresh, sin bucle)", async () => {
    tokenStorage.setTokens("acc-viejo", "ref-1");
    net.state.handler = (config) => {
      if (String(config.url).includes(AUTH_ENDPOINTS.refresh)) {
        return ok(config, { access: "acc-nuevo" });
      }
      return fallo(config, 401);
    };

    await expect(api.get("/datos")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(net.state.requests).toHaveLength(3);
    expect(pedidosA(AUTH_ENDPOINTS.refresh)).toHaveLength(1);
  });

  it("si el refresh falla limpia la sesión y redirige a /login", async () => {
    tokenStorage.setTokens("acc-viejo", "ref-1");
    tokenStorage.setUser({ email: "ana@turismo.bo" });
    net.state.handler = (config) => fallo(config, 401);
    const asignar = vi.fn();
    const locationOriginal = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/", assign: asignar },
    });

    await expect(api.get("/datos")).rejects.toThrow();

    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
    expect(tokenStorage.getUser()).toBeNull();
    expect(asignar).toHaveBeenCalledWith("/login?session=expired");
    expect(pedidosA(AUTH_ENDPOINTS.refresh)).toHaveLength(1);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: locationOriginal,
    });
  });

  it("un 401 del propio refresh no encadena otro refresh", async () => {
    tokenStorage.setTokens("acc-viejo", "ref-1");
    net.state.handler = (config) => fallo(config, 401);

    await expect(
      api.post(AUTH_ENDPOINTS.refresh, { refresh: "ref-1" }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    // Solo la petición original: el interceptor no debe refrescar el refresh.
    expect(net.state.requests).toHaveLength(1);
    expect(tokenStorage.getAccess()).toBe("acc-viejo");
  });

  it("un 403 no dispara el refresh (solo lo hace el 401)", async () => {
    tokenStorage.setTokens("acc-1", "ref-1");
    net.state.handler = (config) => fallo(config, 403);

    await expect(api.get("/admin")).rejects.toMatchObject({
      response: { status: 403 },
    });

    expect(net.state.requests).toHaveLength(1);
  });
});
