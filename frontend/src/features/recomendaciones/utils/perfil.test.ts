import { describe, expect, it } from "vitest";
import { BORRADOR_INICIAL } from "../../../config/preferencias";
import type { ConsultaRecomendacion } from "../../../types/preferencias";
import type { PerfilBusqueda } from "../../../types/recomendaciones";
import {
  ampliarRadio,
  conMacrodistrito,
  construirRecomendacionInput,
  etiquetaPuntoPartida,
  macrodistritoMasCercano,
  parsearPuntoWkt,
  perfilInicial,
} from "./perfil";

const CONSULTA: ConsultaRecomendacion = {
  id_consulta: "consulta-1",
  presupuesto_bob: "1200.00",
  tiempo_horas: "30.00",
  punto_partida: "SRID=4326;POINT (-68.15 -16.51)",
  macrodistrito: "Sopocachi",
  fecha_consulta: "2026-01-01T10:00:00-04:00",
};

const PERFIL: PerfilBusqueda = {
  presupuestoBob: 500,
  duracionValor: 2,
  duracionUnidad: "dias",
  macrodistrito: "Sur",
  latitud: -16.54,
  longitud: -68.09,
  radioKm: 15,
  topK: 8,
};

describe("parsearPuntoWkt", () => {
  it("lee longitud y latitud del WKT de PostGIS", () => {
    expect(parsearPuntoWkt("SRID=4326;POINT (-68.15 -16.51)")).toEqual([
      -68.15, -16.51,
    ]);
  });

  it("tolera valores vacíos o mal formados", () => {
    expect(parsearPuntoWkt(null)).toBeNull();
    expect(parsearPuntoWkt("")).toBeNull();
    expect(parsearPuntoWkt("POINT (hola)")).toBeNull();
  });
});

describe("perfilInicial", () => {
  it("prioriza la última consulta guardada", () => {
    const perfil = perfilInicial(CONSULTA, BORRADOR_INICIAL);

    expect(perfil.presupuestoBob).toBe(1200);
    expect(perfil.duracionUnidad).toBe("dias");
    expect(perfil.duracionValor).toBe(1.5);
    expect(perfil.macrodistrito).toBe("Sopocachi");
    expect(perfil.longitud).toBe(-68.15);
    expect(perfil.latitud).toBe(-16.51);
  });

  it("cae al borrador local cuando no hay consulta", () => {
    const perfil = perfilInicial(null, {
      ...BORRADOR_INICIAL,
      presupuestoBob: 750,
      duracionValor: 6,
      duracionUnidad: "horas",
    });

    expect(perfil.presupuestoBob).toBe(750);
    expect(perfil.duracionValor).toBe(6);
    expect(perfil.duracionUnidad).toBe("horas");
    expect(perfil.macrodistrito).toBe("Centro");
  });
});

describe("construirRecomendacionInput", () => {
  it("envía horas, GeoJSON [lon, lat], radio y Top-K", () => {
    expect(construirRecomendacionInput(PERFIL)).toEqual({
      presupuesto_bob: 500,
      tiempo_horas: 48,
      punto_partida: { coordinates: [-68.09, -16.54] },
      radio_km: 15,
      top_k: 8,
      macrodistrito: "Sur",
    });
  });

  it("omite el macrodistrito si el punto es guardado", () => {
    const entrada = construirRecomendacionInput({
      ...PERFIL,
      macrodistrito: "",
    });

    expect(entrada).not.toHaveProperty("macrodistrito");
  });
});

describe("macrodistrito y radio", () => {
  it("reconoce el macrodistrito más cercano a una coordenada", () => {
    expect(macrodistritoMasCercano(-16.495, -68.134)).toBe("Centro");
    expect(macrodistritoMasCercano(-16.7, -68.25)).toBe("");
  });

  it("mueve el punto de partida al centroide elegido", () => {
    const perfil = conMacrodistrito(PERFIL, "Mallasa");

    expect(perfil.macrodistrito).toBe("Mallasa");
    expect(perfil.latitud).toBe(-16.56);
    expect(perfil.longitud).toBe(-68.09);
  });

  it("etiqueta el punto de partida", () => {
    expect(etiquetaPuntoPartida(PERFIL)).toBe("Sur");
    expect(etiquetaPuntoPartida({ ...PERFIL, macrodistrito: "" })).toBe(
      "Punto guardado",
    );
  });

  it("amplía el radio al siguiente valor y respeta el tope de 50 km", () => {
    expect(ampliarRadio(5)).toBe(10);
    expect(ampliarRadio(15)).toBe(25);
    expect(ampliarRadio(40)).toBe(50);
    expect(ampliarRadio(50)).toBe(50);
    expect(ampliarRadio(12)).toBe(15);
  });
});
