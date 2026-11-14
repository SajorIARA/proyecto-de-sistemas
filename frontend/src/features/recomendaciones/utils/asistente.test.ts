import { describe, expect, it } from "vitest";
import type {
  ContextoAsistente,
  Recomendacion,
} from "../../../types/recomendaciones";
import { responderAsistente } from "./asistente";

function recomendacion(
  cambios: Partial<Recomendacion> & Pick<Recomendacion, "id_atractivo" | "nombre">,
): Recomendacion {
  return {
    puntaje: 0.5,
    afinidad_categoria: 0.5,
    proximidad: 0.5,
    holgura_presupuesto: 0.5,
    holgura_tiempo: 0.5,
    distancia_km: 3,
    factor_penalizacion: 1,
    viable: true,
    motivos: [],
    categorias: [],
    costo_bob: 15,
    duracion_horas: 1.5,
    latitud: -16.5,
    longitud: -68.13,
    ...cambios,
  };
}

const MEJOR = recomendacion({
  id_atractivo: "a-1",
  nombre: "Mirador Killi Killi",
  puntaje: 0.9,
  distancia_km: 2,
  costo_bob: 10,
  categorias: ["Miradores"],
});

const MUSE0 = recomendacion({
  id_atractivo: "a-2",
  nombre: "Museo Costumbrista",
  puntaje: 0.55,
  distancia_km: 5,
  costo_bob: 20,
  categorias: ["Cultura"],
});

const CONTEXTO: ContextoAsistente = {
  recomendaciones: [MEJOR, MUSE0],
  perfil: {
    presupuestoBob: 500,
    duracionValor: 4,
    duracionUnidad: "horas",
    macrodistrito: "Centro",
    latitud: -16.495,
    longitud: -68.134,
    radioKm: 15,
    topK: 8,
  },
};

describe("responderAsistente", () => {
  it("se presenta y resume el perfil", () => {
    const respuesta = responderAsistente("", CONTEXTO);

    expect(respuesta).toContain("Hola, soy tu asistente de viaje");
    expect(respuesta).toContain("Bs 500");
    expect(respuesta).toContain("Centro");
  });

  it("recomienda el destino con mayor afinidad", () => {
    const respuesta = responderAsistente("¿cuál es la mejor opción?", CONTEXTO);

    expect(respuesta).toContain("Mirador Killi Killi");
    expect(respuesta).toContain("90 %");
    expect(respuesta).toContain("Museo Costumbrista");
  });

  it("compara el costo total con traslado incluido", () => {
    const respuesta = responderAsistente("¿cuánto gastaré en total?", CONTEXTO);

    // Mirador: Bs 10 de entrada + Bs 12 de traslado = Bs 22.
    expect(respuesta).toContain("Mirador Killi Killi");
    expect(respuesta).toContain("Bs 22");
    expect(respuesta).toContain("Bs 500");
  });

  it("encuentra el destino más cercano", () => {
    const respuesta = responderAsistente("¿qué está más cerca?", CONTEXTO);

    expect(respuesta).toContain("Mirador Killi Killi");
    expect(respuesta).toContain("2 km");
    expect(respuesta).toContain("ida y vuelta");
  });

  it("filtra por categoría dentro del Top-K", () => {
    const respuesta = responderAsistente("quiero algo de cultura", CONTEXTO);

    expect(respuesta).toContain("1 opción de cultura");
    expect(respuesta).toContain("Museo Costumbrista");
  });

  it("estima el traslado cuando se pregunta cómo llegar", () => {
    const respuesta = responderAsistente("¿cómo llego al destino?", CONTEXTO);

    expect(respuesta).toMatch(/ida y vuelta/i);
    expect(respuesta).toContain("transporte urbano");
  });

  it("no inventa destinos cuando todavía no hay ranking", () => {
    const respuesta = responderAsistente("¿qué me recomiendas?", {
      ...CONTEXTO,
      recomendaciones: [],
    });

    expect(respuesta).toContain("Todavía no tengo un ranking calculado");
    expect(respuesta).not.toContain("Mirador Killi Killi");
  });
});
