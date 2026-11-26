import { describe, expect, it } from "vitest";

import home from "../../home.css?raw";
import indice from "./index.css?raw";
import semantico from "./semantic.css?raw";
import tema from "./tema-oscuro.css?raw";

const codigo = Object.entries(
  import.meta.glob("/src/**/*.{ts,tsx,js,jsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>,
).map(([ruta, texto]) => ({ ruta, texto }));

describe("tema oscuro Chukiyapu", () => {
  it("define los colores semánticos una sola vez", () => {
    const expected: Record<string, string> = {
      canvas: "#061c29",
      surface: "#102f3d",
      text: "#f5f8fa",
      brand: "#49e6d7",
      action: "#ffd05c",
      "route-strong": "#0b666b",
      danger: "#ff9b9b",
      success: "#5ee0c8",
    };
    for (const [token, valor] of Object.entries(expected)) {
      expect(tema).toContain(`--color-${token}: ${valor}`);
    }

    expect(semantico).not.toMatch(/--color-[\w-]+\s*:/);
    expect(home).not.toMatch(/--color-[\w-]+\s*:/);
  });

  it("importa el tema después de las primitives y los componentes", () => {
    expect(indice.indexOf("./tema-oscuro.css")).toBeGreaterThan(
      indice.indexOf("./components.css"),
    );
    expect(semantico).not.toContain("color-scheme: light");
  });

  it("no reintroduce colores arbitrarios ni islas claras en el JSX", () => {
    const arbitrario =
      /(?:bg|text|border|ring|from|via|to)-\[#[0-9a-fA-F]{3,6}\]/;
    const blanco = /\bbg-white(?![\w/-])/;
    const claro =
      /bg-\[var\(--lp-(?:yellow|red|teal|blue)-100\)\]/;

    // Los tests pueden citar clases antiguas en aserciones de regresión.
    const fallos = codigo.flatMap(({ ruta, texto }) =>
      /\.(test|spec)\./.test(ruta)
        ? []
        : [arbitrario, blanco, claro]
            .filter((patron) => patron.test(texto))
            .map((patron) => `${ruta}: ${patron.source}`),
    );
    expect(fallos).toEqual([]);
  });
});
