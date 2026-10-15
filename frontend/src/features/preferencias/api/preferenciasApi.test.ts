/**
 * Pruebas del contrato HTTP de preferencias y restricciones.
 *
 * Verifican la sincronización por diff contra `/api/preferences/` (una fila
 * por categoría) y el envío de las restricciones duras a
 * `/api/recomendaciones/consultas/`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../../../api/http", () => ({
  api: {
    get: (...args: unknown[]) => mocks.get(...args),
    post: (...args: unknown[]) => mocks.post(...args),
    delete: (...args: unknown[]) => mocks.delete(...args),
  },
}));

import { guardarPerfil, listarMisPreferencias, sincronizarPreferencias } from "./preferenciasApi";

function pagina(results: unknown[]) {
  return { data: { count: results.length, next: null, previous: null, results } };
}

describe("listarMisPreferencias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normaliza ids numéricos y tolera un array plano", async () => {
    mocks.get.mockResolvedValue({
      data: [{ id: "7", categoria: "2", nivel_interes: "1.00" }],
    });

    const preferencias = await listarMisPreferencias();

    expect(preferencias).toHaveLength(1);
    expect(preferencias[0]).toMatchObject({ id: 7, categoria: 2 });
  });
});

describe("sincronizarPreferencias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea las nuevas, borra las quitadas y conserva las que siguen", async () => {
    // Primera lectura: la BD tiene las categorías 1 y 2.
    mocks.get.mockResolvedValueOnce(
      pagina([
        { id: 10, categoria: 1, nivel_interes: "0.50" },
        { id: 11, categoria: 2, nivel_interes: "1.00" },
      ]),
    );
    // Segunda lectura (estado final): 1 y 3.
    mocks.get.mockResolvedValueOnce(
      pagina([
        { id: 10, categoria: 1, nivel_interes: "0.50" },
        { id: 12, categoria: 3, nivel_interes: "1.00" },
      ]),
    );
    mocks.delete.mockResolvedValue({ data: null });
    mocks.post.mockResolvedValue({
      data: { id: 12, categoria: 3, nivel_interes: "1.00" },
    });

    const resultado = await sincronizarPreferencias([1, 3]);

    // La 2 se elimina; la 3 se crea; la 1 no se toca.
    expect(mocks.delete).toHaveBeenCalledWith("/preferences/11/");
    expect(mocks.post).toHaveBeenCalledWith("/preferences/", {
      categoria: 3,
      nivel_interes: "1.00",
    });
    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(resultado.map((p) => p.categoria)).toEqual([1, 3]);
  });
});

describe("guardarPerfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guarda solo las preferencias si no hay punto de partida", async () => {
    mocks.get.mockResolvedValue(pagina([]));
    mocks.post.mockResolvedValue({ data: { id: 1, categoria: 1 } });

    const resultado = await guardarPerfil({
      categorias: [1],
      consulta: null,
    });

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith("/preferences/", {
      categoria: 1,
      nivel_interes: "1.00",
    });
    expect(resultado.consulta).toBeNull();
  });

  it("envía las restricciones duras en horas y GeoJSON", async () => {
    mocks.get.mockResolvedValue(pagina([]));
    mocks.post.mockResolvedValueOnce({ data: { id: 1, categoria: 1 } });
    mocks.post.mockResolvedValueOnce({
      data: {
        id_consulta: "11111111-1111-1111-1111-111111111111",
        presupuesto_bob: "250.00",
        tiempo_horas: "8.00",
        punto_partida: "SRID=4326;POINT (-68.1486 -16.4966)",
        macrodistrito: null,
        fecha_consulta: "2026-01-01T00:00:00Z",
      },
    });

    const resultado = await guardarPerfil({
      categorias: [1],
      consulta: {
        presupuesto_bob: 250,
        tiempo_horas: 8,
        punto_partida: { coordinates: [-68.1486, -16.4966] },
      },
    });

    expect(mocks.post).toHaveBeenLastCalledWith(
      "/recomendaciones/consultas/",
      {
        presupuesto_bob: 250,
        tiempo_horas: 8,
        punto_partida: { coordinates: [-68.1486, -16.4966] },
      },
    );
    expect(resultado.consulta?.id_consulta).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });
});
