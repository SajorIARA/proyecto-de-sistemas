import { beforeEach, describe, expect, it, vi } from "vitest";

import { ASISTENTE } from "../../../config/recomendaciones";
import type {
  ContextoAsistente,
  RespuestaAsistente,
} from "../../../types/recomendaciones";
import type { Atractivo } from "../../../types/turismo";
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

const destinos: Atractivo[] = [
  {
    id: "plaza-murillo",
    nombre: "Plaza Murillo",
    descripcion: "Plaza histórica del centro de La Paz.",
    direccion: "Calle Comercio y Ayacucho",
    duracion_minutos: 60,
    ubicacion: { longitud: -68.12, latitud: -16.49 },
    area: null,
    categorias: ["Cultura", "Patrimonio"],
    fuente_origen: "ZZTEST",
    activo: true,
    fecha_creacion: "2026-01-01T00:00:00Z",
    fecha_actualizacion: "2026-01-01T00:00:00Z",
  },
];

function fallo503(): Error {
  return Object.assign(new Error("503"), { response: { status: 503 } });
}

describe("obtenerRespuestaAsistente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta el RAG con el contrato del backend", async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        origen: "rag",
        respuesta: "La Plaza Murillo es el centro histórico.",
        citas: [],
      },
    });

    const respuesta: RespuestaAsistente = await obtenerRespuestaAsistente({
      pregunta: "¿Qué encontraré en la Plaza Murillo?",
      contexto,
    });

    expect(respuesta).toMatchObject({
      texto: "La Plaza Murillo es el centro histórico.",
      origen: "rag",
      citas: [],
    });

    expect(mocks.post).toHaveBeenCalledWith(ASISTENTE.endpoint, {
      pregunta: "¿Qué encontraré en la Plaza Murillo?",
      top_k: ASISTENTE.topK,
    });
  });

  it("mapea las citas documentales de una respuesta RAG", async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        origen: "rag",
        respuesta: "La entrada cuesta 25 BOB.",
        citas: [
          {
            id_fragmento: 7,
            id_fuente: "11111111-1111-4111-8111-111111111111",
            titulo: "Guía de tarifas",
            url: "https://ejemplo.invalid/tarifas",
            numero_fragmento: 2,
            distancia: 0.12,
          },
        ],
      },
    });

    await expect(
      obtenerRespuestaAsistente({
        pregunta: "¿Cuánto cuesta?",
        contexto,
      }),
    ).resolves.toMatchObject({
      origen: "rag",
      citas: [
        {
          titulo: "Guía de tarifas",
          url: "https://ejemplo.invalid/tarifas",
          id_fragmento: 7,
          numero_fragmento: 2,
        },
      ],
    });
  });

  it("degrada al catálogo con aviso si el RAG devuelve 503", async () => {
    mocks.post.mockRejectedValueOnce(fallo503());

    await expect(
      obtenerRespuestaAsistente({
        pregunta: "¿Qué puedo visitar en Plaza Murillo?",
        contexto,
        destinos,
      }),
    ).resolves.toMatchObject({
      texto: expect.stringContaining("En el catálogo encontré Plaza Murillo."),
      origen: "catalogo",
      citas: [],
      aviso: expect.stringContaining("asistente documental no está disponible"),
    });
  });

  it("usa el asistente local con aviso si el RAG falla y no hay destinos", async () => {
    mocks.post.mockRejectedValueOnce(fallo503());

    await expect(
      obtenerRespuestaAsistente({
        pregunta: "¿Cuál es la mejor opción?",
        contexto,
      }),
    ).resolves.toMatchObject({
      texto: expect.stringContaining("Plaza Murillo"),
      origen: "local",
      citas: [],
      aviso: expect.stringContaining("asistente documental no está disponible"),
    });
  });
});
