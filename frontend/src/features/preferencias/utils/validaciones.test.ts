import { describe, expect, it } from "vitest";

import {
  borradorInicial,
  dentroDelAreaLaPaz,
  duracionAHoras,
  formatearBob,
  formatearDuracion,
  limitar,
  parsearCoordenada,
  redondearAPaso,
  validarPreferencias,
} from "./validaciones";
import type { PreferenciasFormValues } from "../../../types/preferencias";

function valores(cambios: Partial<PreferenciasFormValues> = {}): PreferenciasFormValues {
  return { ...borradorInicial(), categorias: [1], ...cambios };
}

describe("duración", () => {
  it("convierte días a horas", () => {
    expect(duracionAHoras(2, "dias")).toBe(48);
    expect(duracionAHoras(4, "horas")).toBe(4);
  });

  it("formatea horas y días", () => {
    expect(formatearDuracion(1, "horas")).toBe("1 hora");
    expect(formatearDuracion(6, "horas")).toBe("6 horas");
    expect(formatearDuracion(1, "dias")).toBe("1 día");
    expect(formatearDuracion(3, "dias")).toBe("3 días");
  });
});

describe("formato y helpers numéricos", () => {
  it("formatea bolivianos con separador de miles", () => {
    expect(formatearBob(1500)).toBe("Bs 1.500");
    expect(formatearBob(0)).toBe("Bs 0");
  });

  it("parsea coordenadas tolerando coma decimal y espacios", () => {
    expect(parsearCoordenada(" -16,5 ")).toBe(-16.5);
    expect(parsearCoordenada("")).toBeNull();
    expect(parsearCoordenada("abc")).toBeNull();
  });

  it("limita y redondea al paso", () => {
    expect(limitar(120, 0, 100)).toBe(100);
    expect(redondearAPaso(0.1666, 0.5)).toBe(0);
    expect(redondearAPaso(1.4, 0.5)).toBe(1.5);
  });
});

describe("área de La Paz", () => {
  it("acepta un punto paceño", () => {
    expect(dentroDelAreaLaPaz(-68.1486, -16.4966)).toBe(true);
  });

  it("rechaza puntos fuera del bbox", () => {
    expect(dentroDelAreaLaPaz(-3.7038, 40.4168)).toBe(false);
    expect(dentroDelAreaLaPaz(0, 0)).toBe(false);
  });
});

describe("validarPreferencias", () => {
  it("no marca errores con un borrador válido y sin punto de partida", () => {
    expect(validarPreferencias(valores())).toEqual({});
  });

  it("exige al menos una categoría", () => {
    const errores = validarPreferencias(valores({ categorias: [] }));

    expect(errores.categorias).toMatch(/al menos una categoría/i);
  });

  it("rechaza presupuestos negativos o por encima del tope", () => {
    expect(validarPreferencias(valores({ presupuestoBob: -1 })).presupuesto).toMatch(
      /negativo/i,
    );
    expect(
      validarPreferencias(valores({ presupuestoBob: 999999 })).presupuesto,
    ).toMatch(/máximo/i);
  });

  it("rechaza duraciones fuera de rango", () => {
    expect(
      validarPreferencias(valores({ duracionValor: 0, duracionUnidad: "horas" }))
        .duracion,
    ).toMatch(/mayor a 0/i);
    expect(
      validarPreferencias(valores({ duracionValor: 5, duracionUnidad: "dias" }))
        .duracion,
    ).toMatch(/máxima/i);
  });

  it("valida el punto de partida solo si está a medias o fuera de La Paz", () => {
    // Opcional: vacío en ambos campos no es error.
    expect(validarPreferencias(valores()).puntoPartida).toBeUndefined();

    // A medias es error.
    expect(
      validarPreferencias(valores({ latitud: "-16.5" })).puntoPartida,
    ).toMatch(/completa latitud y longitud/i);

    // Fuera del área es error.
    expect(
      validarPreferencias(
        valores({ latitud: "40.4168", longitud: "-3.7038" }),
      ).puntoPartida,
    ).toMatch(/dentro de La Paz/i);

    // Dentro del área es válido.
    expect(
      validarPreferencias(
        valores({ latitud: "-16.4966", longitud: "-68.1486" }),
      ).puntoPartida,
    ).toBeUndefined();
  });
});
