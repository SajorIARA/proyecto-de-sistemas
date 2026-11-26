import { describe, expect, it } from "vitest";
import { formatearUbicacion } from "./formato";

describe("formatearUbicacion", () => {
  it("prefiere la dirección registrada", () => {
    expect(
      formatearUbicacion("  Calle Jaén  ", {
        longitud: -68.1375,
        latitud: -16.4961,
      }),
    ).toBe("Calle Jaén");
  });

  it("usa las coordenadas cuando solo existe el punto PostGIS", () => {
    expect(
      formatearUbicacion(null, {
        longitud: -68.1375,
        latitud: -16.4961,
      }),
    ).toBe("Coord. -16.49610, -68.13750");
  });

  it("avisa cuando no hay ningún dato de ubicación", () => {
    expect(formatearUbicacion("   ", null)).toBe("Ubicación no registrada");
  });
});
