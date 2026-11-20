import { beforeEach, describe, expect, it, vi } from "vitest";

import { ASISTENTE } from "../../../config/recomendaciones";
import type { ContextoAsistente } from "../../../types/recomendaciones";
import { obtenerRespuestaAsistente } from "./asistenteApi";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("../../../api/http", () => ({
  api: {
    post: (...args: unknown[]) => mocks.post(...args),
  },
}));

const contexto: ContextoAsistente = {
  recomendaciones: [
    {
      id_atractivo: "plaza-murillo",
      nombre: "Plaza Murillo",
      puntaje: 0.8,
      afinidad_categoria: 0.8,
      proximidad: 0.8,
      holgura_presupuesto: 1,
      holgura_tiempo: 1,
      distancia_km: 1,
      costo_bob: 0,
      duracion_horas: 1,
      factor_penalizacion: 1,
      viable: true,
      motivos: [],
      categorias: ["Cultura"],
      latitud: -16.49,
      longitud: -68.12,
    },
  ],
  perfil: {
    presupuestoBob: 100,
    duracionValor: 4,
    duracionUnidad: "horas",
    macrodistrito: "Centro",
    latitud: -16.49,
    longitud: -68.12,
    radioKm: 15,
    topK: 8,
  },
};

describe("obtenerRespuestaAsistente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta el RAG con el contrato del backend", async () => {
    mocks.post.mockResolvedValueOnce({
      data: { respuesta: "La Plaza Murillo es el centro histórico." },
    });

    await expect(
      obtenerRespuestaAsistente({
        pregunta: "¿Qué encontraré en la Plaza Murillo?",
        contexto,
      }),
    ).resolves.toBe("La Plaza Murillo es el centro histórico.");

    expect(mocks.post).toHaveBeenCalledWith(ASISTENTE.endpoint, {
      pregunta: "¿Qué encontraré en la Plaza Murillo?",
      top_k: ASISTENTE.topK,
    });
  });

  it("usa el asistente local si el RAG falla", async () => {
    mocks.post.mockRejectedValueOnce(new Error("RAG no disponible"));

    await expect(
      obtenerRespuestaAsistente({
        pregunta: "¿Cuál es la mejor opción?",
        contexto,
      }),
    ).resolves.toContain("Plaza Murillo");
  });
});
