import { afterEach, describe, expect, it, vi } from "vitest";
import api, { HttpError, NetworkError } from "./client";

function jsonResponse(body, { ok = true, status = 200, statusText = "OK" } = {}) {
  return {
    ok,
    status,
    statusText,
    text: () => Promise.resolve(body === null ? "" : JSON.stringify(body)),
  };
}

describe("client de API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("GET devuelve el cuerpo parseado", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ status: "ok" }));
    const data = await api.get("/health/");
    expect(data).toEqual({ status: "ok" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("GET con cuerpo vacío devuelve null", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(null));
    await expect(api.get("/sin-contenido/")).resolves.toBeNull();
  });

  it("respuesta !ok lanza HttpError con el estado", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(null, { ok: false, status: 404, statusText: "Not Found" }));
    await expect(api.get("/no-existe/")).rejects.toBeInstanceOf(HttpError);
    await expect(api.get("/no-existe/")).rejects.toMatchObject({ status: 404 });
  });

  it("fallo de red lanza NetworkError", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await api.get("/health/").catch((e) => e);
    expect(error).toBeInstanceOf(NetworkError);
  });

  it("timeout aborta la petición y lanza NetworkError", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    const peticion = api.get("/health/", { timeout: 8000 }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(8000);
    const error = await peticion;
    expect(error).toBeInstanceOf(NetworkError);
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it("JSON inválido lanza NetworkError", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ...jsonResponse(null), text: () => Promise.resolve("no json") });
    const error = await api.get("/health/").catch((e) => e);
    expect(error).toBeInstanceOf(NetworkError);
  });
});