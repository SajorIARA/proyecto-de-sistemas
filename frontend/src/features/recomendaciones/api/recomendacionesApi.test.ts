import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  aRecomendacionesApiError,
  normalizarRecomendacion,
  RecomendacionesApiError,
  recomendarPerfil,
} from "./recomendacionesApi";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("../../../api/http", () => ({
  api: {
    post: (...args: unknown[]) => mocks.post(...args),
  },
}));

function item(cambios: Record<string, unknown>) {
  return {
    id_atractivo: "id",
    nombre: "Destino",
    puntaje: 0.5,
    afinidad_categoria: 0.5,
    proximidad: 0.5,
    holgura_presupuesto: 0.5,
    holgura_tiempo: 0.5,
    distancia_km: 10,
    factor_penalizacion: 1,
    viable: true,
    motivos: [],
    categorias: ["Cultura"],
    costo_bob: "10.00",
    duracion_horas: "2.00",
    latitud: -16.5,
    longitud: -68.13,
    ...cambios,
  };
}

describe("recomendarPerfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normaliza decimales y ordena por puntaje y cercanía", async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        id_consulta: "consulta-1",
        generado_en: "2026-02-01T10:00:00Z",
        total_activos: 30,
        total_evaluados: 12,
        total_recomendaciones: 3,
        radio_km: 15,
        top_k: 8,
        recomendaciones: [
          item({ id_atractivo: "b", nombre: "Lejano", puntaje: 0.4 }),
          item({ id_atractivo: "a", nombre: "Cercano", puntaje: 0.9 }),
          item({
            id_atractivo: "c",
            nombre: "Muy cercano",
            puntaje: 0.9,
            distancia_km: 1,
            costo_bob: "35.50",
            viable: false,
            motivos: ["presupuesto_excedido"],
          }),
        ],
      },
    });

    const respuesta = await recomendarPerfil({
      presupuesto_bob: 500,
      tiempo_horas: 4,
      punto_partida: { coordinates: [-68.13, -16.49] },
      radio_km: 15,
      top_k: 8,
    });

    expect(mocks.post).toHaveBeenCalledWith("/recomendaciones/recomendar/", {
      presupuesto_bob: 500,
      tiempo_horas: 4,
      punto_partida: { coordinates: [-68.13, -16.49] },
      radio_km: 15,
      top_k: 8,
    });

    expect(respuesta.recomendaciones.map((r) => r.id_atractivo)).toEqual([
      "c",
      "a",
      "b",
    ]);
    expect(respuesta.recomendaciones[0].costo_bob).toBe(35.5);
    expect(respuesta.recomendaciones[0].viable).toBe(false);
    expect(respuesta.recomendaciones[0].motivos).toEqual([
      "presupuesto_excedido",
    ]);
    expect(respuesta.total_recomendaciones).toBe(3);
    expect(respuesta.total_evaluados).toBe(12);
  });

  it("tolera una respuesta sin recomendaciones", async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        generado_en: "2026-02-01T10:00:00Z",
        radio_km: 15,
        top_k: 8,
      },
    });

    const respuesta = await recomendarPerfil({
      presupuesto_bob: 0,
      tiempo_horas: 2,
      punto_partida: { coordinates: [-68.13, -16.49] },
    });

    expect(respuesta.recomendaciones).toEqual([]);
    expect(respuesta.total_recomendaciones).toBe(0);
    expect(respuesta.id_consulta).toBeNull();
    expect(respuesta.radio_km).toBe(15);
  });
});

describe("normalizarRecomendacion", () => {
  it("convierte textos numéricos y protege campos faltantes", () => {
    const normalizada = normalizarRecomendacion(
      item({
        id_atractivo: undefined,
        nombre: undefined,
        puntaje: "0.75",
        factor_penalizacion: undefined,
        motivos: ["tiempo_excedido", 3],
        categorias: ["Cultura", null],
      }) as never,
    );

    expect(normalizada.id_atractivo).toBe("");
    expect(normalizada.nombre).toBe("Destino sin nombre");
    expect(normalizada.puntaje).toBe(0.75);
    expect(normalizada.factor_penalizacion).toBe(1);
    expect(normalizada.motivos).toEqual(["tiempo_excedido"]);
    expect(normalizada.categorias).toEqual(["Cultura"]);
  });
});

describe("aRecomendacionesApiError", () => {
  it("es idempotente con los errores ya tipados", () => {
    const original = new RecomendacionesApiError("Fallo", 400);

    expect(aRecomendacionesApiError(original)).toBe(original);
  });

  it("envuelve errores desconocidos con un mensaje genérico", () => {
    const error = aRecomendacionesApiError(new Error("boom"));

    expect(error.status).toBe(0);
    expect(error.message).toBe(
      "No pudimos calcular tus recomendaciones. Inténtalo de nuevo.",
    );
  });
});
