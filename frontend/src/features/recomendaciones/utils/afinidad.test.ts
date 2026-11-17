import { describe, expect, it } from "vitest";
import {
  describirMotivo,
  nivelAfinidad,
  porcentajeAfinidad,
} from "./afinidad";

describe("porcentajeAfinidad", () => {
  it("convierte el puntaje 0–1 al porcentaje entero visible", () => {
    expect(porcentajeAfinidad(0.906)).toBe(91);
    expect(porcentajeAfinidad(0)).toBe(0);
    expect(porcentajeAfinidad(1)).toBe(100);
  });

  it("acota valores fuera de rango y tolera NaN", () => {
    expect(porcentajeAfinidad(1.4)).toBe(100);
    expect(porcentajeAfinidad(-0.3)).toBe(0);
    expect(porcentajeAfinidad(Number.NaN)).toBe(0);
  });
});

describe("nivelAfinidad", () => {
  it("etiqueta los tramos de coincidencia", () => {
    expect(nivelAfinidad(100).etiqueta).toBe("Coincidencia muy alta");
    expect(nivelAfinidad(80).etiqueta).toBe("Coincidencia muy alta");
    expect(nivelAfinidad(60).etiqueta).toBe("Coincidencia alta");
    expect(nivelAfinidad(40).etiqueta).toBe("Coincidencia media");
    expect(nivelAfinidad(20).etiqueta).toBe("Coincidencia baja");
    expect(nivelAfinidad(0).etiqueta).toBe("Para explorar");
  });
});

describe("describirMotivo", () => {
  it("traduce los motivos conocidos del motor", () => {
    expect(describirMotivo("presupuesto_excedido")).toBe(
      "Supera el presupuesto del recorrido",
    );
    expect(describirMotivo("tiempo_excedido")).toBe(
      "Excede el tiempo disponible",
    );
  });

  it("humaniza motivos futuros sin romper la tarjeta", () => {
    expect(describirMotivo("clima_adverso")).toBe("Clima adverso");
  });
});
