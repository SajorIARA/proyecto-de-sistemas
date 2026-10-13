/**
 * Pruebas del contrato HTTP del catálogo.
 *
 * Verifican que el panel y el backend "hablan el mismo idioma": cada filtro
 * del frontend se traduce al query param exacto de `AtractivoViewSet`
 * (`q`, `categoria`, `zona`, `precio_min`, `precio_max`) y los filtros vacíos
 * no viajan.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../../../api/http", () => ({
  api: {
    get: (...args: unknown[]) => mocks.get(...args),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { listarAtractivos } from "./turismoApi";

describe("listarAtractivos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({
      data: { count: 0, next: null, previous: null, results: [] },
    });
  });

  it("envía los filtros combinados como query params del backend", async () => {
    await listarAtractivos({
      categoria: "Miradores",
      q: "  museo  ",
      zona: "Centro",
      precioMin: 20,
      precioMax: 50,
    });

    expect(mocks.get).toHaveBeenCalledWith("/turismo/atractivos/", {
      params: {
        page: 1,
        page_size: 20,
        categoria: "Miradores",
        q: "museo",
        zona: "Centro",
        precio_min: 20,
        precio_max: 50,
      },
    });
  });

  it("omite los filtros vacíos y los precios nulos", async () => {
    await listarAtractivos({ categoria: null, q: "   ", zona: null });

    expect(mocks.get).toHaveBeenCalledWith("/turismo/atractivos/", {
      params: { page: 1, page_size: 20 },
    });
  });

  it("respeta el límite inferior 0 del rango gratuito", async () => {
    await listarAtractivos({ precioMin: 0, precioMax: 0 });

    expect(mocks.get).toHaveBeenCalledWith(
      "/turismo/atractivos/",
      expect.objectContaining({
        params: expect.objectContaining({ precio_min: 0, precio_max: 0 }),
      }),
    );
  });
});
