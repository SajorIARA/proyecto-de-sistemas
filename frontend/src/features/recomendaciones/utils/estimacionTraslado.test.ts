import { describe, expect, it } from "vitest";
import {
  estimarTraslado,
  formatearDistancia,
  formatearMinutos,
} from "./estimacionTraslado";

describe("estimarTraslado", () => {
  it("calcula ida y vuelta con la tarifa referencial", () => {
    // 4 km × 2 = 8 km → Bs 24; 8 km / 18 km/h ≈ 27 min.
    expect(estimarTraslado(4)).toEqual({
      kilometros: 8,
      costoBob: 24,
      minutos: 27,
    });
  });

  it("aplica la tarifa mínima en trayectos cortos", () => {
    expect(estimarTraslado(0.5)).toEqual({
      kilometros: 1,
      costoBob: 5,
      minutos: 5,
    });
  });

  it("devuelve cero si la distancia no es válida", () => {
    expect(estimarTraslado(0)).toEqual({
      kilometros: 0,
      costoBob: 0,
      minutos: 0,
    });
    expect(estimarTraslado(-3)).toEqual({
      kilometros: 0,
      costoBob: 0,
      minutos: 0,
    });
    expect(estimarTraslado(Number.NaN)).toEqual({
      kilometros: 0,
      costoBob: 0,
      minutos: 0,
    });
  });
});

describe("formatearDistancia", () => {
  it("usa metros por debajo de un kilómetro", () => {
    expect(formatearDistancia(0.8)).toBe("800 m");
    expect(formatearDistancia(0)).toBe("0 m");
  });

  it("usa kilómetros con un decimal", () => {
    expect(formatearDistancia(2.44)).toBe("2,4 km");
  });
});

describe("formatearMinutos", () => {
  it("resume minutos y horas", () => {
    expect(formatearMinutos(45)).toBe("45 min");
    expect(formatearMinutos(60)).toBe("1 h");
    expect(formatearMinutos(80)).toBe("1 h 20 min");
    expect(formatearMinutos(0)).toBe("0 min");
  });
});
