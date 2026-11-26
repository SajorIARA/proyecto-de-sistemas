import { describe, expect, it } from "vitest";
import {
  conPuntoPartida,
  crearPuntoPartida,
  etiquetaPuntoPartida,
  formatearCoordenadas,
  leerPuntoPartida,
} from "./puntoPartida";

describe("puntoPartida", () => {
  it("acepta coordenadas dentro del área de La Paz y las normaliza", () => {
    expect(
      crearPuntoPartida(-16.4956789, -68.1341234, "gps"),
    ).toEqual({
      latitud: -16.495679,
      longitud: -68.134123,
      tipo: "gps",
    });
  });

  it("rechaza coordenadas fuera del área o no finitas", () => {
    expect(crearPuntoPartida(-16.2, -68.13, "mapa")).toBeNull();
    expect(crearPuntoPartida(-16.5, -69, "mapa")).toBeNull();
    expect(crearPuntoPartida(Number.NaN, -68.13, "mapa")).toBeNull();
  });

  it("lee el origen de la URL sin confundir valores ausentes con cero", () => {
    expect(
      leerPuntoPartida(
        new URLSearchParams(
          "origen_lat=-16.5&origen_lon=-68.13&origen_tipo=mapa&vista=armar",
        ),
      ),
    ).toEqual({ latitud: -16.5, longitud: -68.13, tipo: "mapa" });

    expect(leerPuntoPartida(new URLSearchParams("origen_tipo=gps"))).toBeNull();
    expect(
      leerPuntoPartida(
        new URLSearchParams("origen_lat=&origen_lon=&origen_tipo=gps"),
      ),
    ).toBeNull();
    expect(
      leerPuntoPartida(
        new URLSearchParams("origen_lat=-16.5&origen_lon=-68.13&origen_tipo=otro"),
      ),
    ).toBeNull();
  });

  it("escribe y limpia el origen conservando los demás filtros de la URL", () => {
    const punto = { latitud: -16.5, longitud: -68.13, tipo: "gps" as const };
    const conOrigen = conPuntoPartida(
      new URLSearchParams("vista=armar&categoria=Cultura"),
      punto,
    );

    expect(conOrigen.get("origen_lat")).toBe("-16.5");
    expect(conOrigen.get("origen_tipo")).toBe("gps");
    expect(conOrigen.get("categoria")).toBe("Cultura");

    const sinOrigen = conPuntoPartida(conOrigen, null);
    expect(sinOrigen.has("origen_lat")).toBe(false);
    expect(sinOrigen.has("origen_tipo")).toBe(false);
    expect(sinOrigen.get("categoria")).toBe("Cultura");
  });

  it("etiqueta el tipo de origen y muestra sus coordenadas", () => {
    const punto = { latitud: -16.495, longitud: -68.134, tipo: "mapa" as const };
    expect(etiquetaPuntoPartida(punto)).toBe("Punto en el mapa");
    expect(formatearCoordenadas(punto)).toBe("-16.4950, -68.1340");
  });
});
