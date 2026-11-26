import { describe, expect, it } from "vitest";

import { condicionDesdeCodigoMeteorologico } from "./climaApi";

describe("condicionDesdeCodigoMeteorologico", () => {
  it("traduce los códigos WMO que muestra Open-Meteo", () => {
    expect(condicionDesdeCodigoMeteorologico(0)).toBe("Despejado");
    expect(condicionDesdeCodigoMeteorologico(63)).toBe("Lluvia moderada");
    expect(condicionDesdeCodigoMeteorologico(95)).toBe("Tormenta");
  });

  it("usa una condición segura ante un código desconocido", () => {
    expect(condicionDesdeCodigoMeteorologico(999)).toBe(
      "Condiciones variables",
    );
  });
});
